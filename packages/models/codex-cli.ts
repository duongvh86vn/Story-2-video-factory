import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ZodType, ZodTypeDef } from 'zod';
import type { ModelSettings } from '../core/config.js';
import { execute, mediaEnvironment, ProcessTimeoutError, type ProcessResult } from '../render/process.js';
import { ModelError, encodeImages, encodedImageHash, object, requestText, structuredRequest, tokenCount, validateStructured,
  type AdapterOptions, type EncodedImage, type ModelAdapter, type ModelRequest, type ModelResponse, type VisionRequest } from './adapter.js';
import { appendLog, hash } from '../core/utils.js';
import { codexDiagnostics, codexFailureMessage } from './codex-diagnostics.js';

// Per-invocation switches, never changes the user's CLI configuration.
export const CODEX_DISABLED_FEATURES=['shell_tool','unified_exec','apps','plugins','hooks','multi_agent','multi_agent_v2',
  'code_mode','code_mode_host','browser_use','browser_use_external','computer_use','in_app_browser','view_image',
  'image_generation','skill_search','skill_mcp_dependency_install','workspace_dependencies','memories','goals','sleep_tool'];

async function defaultCommand():Promise<string>{
  if(process.platform==='win32'&&process.env.APPDATA){
    const target=process.arch==='arm64'?'aarch64-pc-windows-msvc':'x86_64-pc-windows-msvc';
    const pkg=process.arch==='arm64'?'codex-win32-arm64':'codex-win32-x64';
    const base=path.join(process.env.APPDATA,'npm/node_modules/@openai/codex');
    for(const candidate of [path.join(base,'node_modules/@openai',pkg,'vendor',target,'bin/codex.exe'),path.join(base,'vendor',target,'bin/codex.exe')]){
      try{if((await fs.stat(candidate)).isFile())return candidate;}catch{/* Explicit command or native PATH install remains available. */}
    }
  }
  return 'codex';
}

/** Restricted CLI generation/review in an empty read-only workspace; attached images are immutable data. */
export class CodexCliAdapter implements ModelAdapter {
  lastResponse?:ModelResponse;
  constructor(private readonly settings:ModelSettings,private readonly options:AdapterOptions={},private readonly run:typeof execute=execute){}
  async generateText(input:ModelRequest):Promise<ModelResponse>{return this.request(input);}
  async generateStructured<T>(input:ModelRequest,schema:ZodType<T,ZodTypeDef,any>):Promise<T>{
    return validateStructured(await this.request(structuredRequest(input,schema)),schema);
  }
  async analyzeImages(input:VisionRequest):Promise<ModelResponse>{
    this.lastResponse=undefined;
    if(!this.settings.vision)throw new ModelError('vision_unsupported','Enable vision for the configured Codex CLI review role before submitting images.');
    const images=await encodeImages(input,this.options.projectRoot);
    const imageEvidence=images.map((image,index)=>({attachment:index+1,mimeType:image.mimeType,hash:encodedImageHash(image)}));
    return this.request({...input,context:{reviewContext:input.context,imageEvidence},
      prompt:input.prompt+'\nInspect the attached images as source data. Attachment order matches imageEvidence. Do not call tools or read files; return only the requested review response.'},images);
  }
  private async request(input:ModelRequest,images:EncodedImage[]=[]):Promise<ModelResponse>{
    this.lastResponse=undefined;
    const command=this.settings.command??await defaultCommand();
    if(/\.(?:cmd|bat|ps1)$/i.test(command)||command.includes('\0'))throw new ModelError('configuration','Codex CLI requires a native executable. On Windows set command to codex.exe.');
    if(this.settings.model==='mock')throw new ModelError('configuration','Set an available Codex model, or default to use the CLI default.');
    if(this.settings.max_call_cost_usd!==undefined)throw new ModelError('configuration','Codex CLI does not report or enforce a dollar cost cap; use account limits or a priced API provider.');
    const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'story-video-model-'));
    let imageDir:string|undefined;const ownedImagePaths:string[]=[];
    const args=['exec','--json','--ephemeral','--ignore-user-config','--skip-git-repo-check','--sandbox','read-only',
      '-c','approval_policy="never"','-c','project_doc_max_bytes=0','-c','web_search="disabled"','-c','mcp_servers={}',
      ...CODEX_DISABLED_FEATURES.flatMap(feature=>['--disable',feature])];
    if(this.settings.model!=='default')args.push('--model',this.settings.model);
    const env=mediaEnvironment();
    for(const name of ['CODEX_HOME','OPENAI_API_KEY','HTTP_PROXY','HTTPS_PROXY','NO_PROXY','NODE_EXTRA_CA_CERTS']){
      if(process.env[name])env[name]=process.env[name];
    }
    try{
      if(images.length){
        try{
          imageDir=await fs.mkdtemp(path.join(os.tmpdir(),'story-video-review-images-'));
          const suffix:Record<string,string>={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/gif':'.gif'};
          for(const [index,image] of images.entries()){
            const file=path.join(imageDir,`frame-${String(index+1).padStart(3,'0')}${suffix[image.mimeType]}`);
            const handle=await fs.open(file,'wx',0o600);ownedImagePaths.push(file);
            try{await handle.writeFile(Buffer.from(image.data,'base64'));}finally{await handle.close();}
            args.push('--image',file);
          }
        }catch{throw new ModelError('images','Could not stage the review image attachments.');}
      }
      args.push('-');
      let result;
      try{result=await this.run(command,args,{cwd,logFile:path.join(this.options.projectRoot??process.cwd(),'logs/model-cli.jsonl'),
        input:`Generate only the requested response. Do not use tools or inspect files.\n\nAPPLICATION INSTRUCTIONS:\n${input.system}\n\nREQUEST:\n${requestText(input)}`,
        env,timeoutMs:this.settings.timeout_ms,allowFailure:true,maxOutputBytes:8*1024*1024,logOutput:false});}
      catch(error){
        if(error instanceof ProcessTimeoutError){
          if(error.result)throw await this.failure(error.result,input,'timeout');
          throw new ModelError('timeout','Codex CLI exceeded the configured timeout.',true);
        }
        throw new ModelError('cli_start','Could not complete Codex CLI. Check executable, sign-in, installed CLI version and local journal storage outside the production job.');
      }
      if(result.timedOut)throw await this.failure(result,input,'timeout');
      if(result.truncated)throw await this.failure(result,input,'truncated');
      let events:Record<string,unknown>[];
      try{events=result.stdout.trim().split(/\r?\n/).filter(Boolean).map(line=>object(JSON.parse(line)));}
      catch{throw await this.failure(result,input,'response_json');}
      const completed=events.filter(e=>e.type==='turn.completed').at(-1);
      // CLI can emit a nonfatal startup diagnostic when code mode fails closed.
      // It is not a tool operation; a failed turn or nonzero exit still rejects the response.
      const forbidden=events.some(e=>(e.type==='item.started'||e.type==='item.completed')&&!['agent_message','reasoning','error'].includes(String(object(e.item).type)));
      if(forbidden)throw new ModelError('cli_tool_use','Codex CLI attempted an unsupported tool operation; its output was rejected.');
      const messages=events.filter(e=>e.type==='item.completed'&&object(e.item).type==='agent_message');
      const text=String(object(messages.at(-1)?.item).text??'');
      const usage=object(completed?.usage);
      this.lastResponse={text,usage:{inputTokens:tokenCount(usage.input_tokens),outputTokens:tokenCount(usage.output_tokens)}};
      if(result.code!==0||!completed||events.some(e=>e.type==='turn.failed'||e.type==='error'))throw await this.failure(result,input,'cli_provider');
      if(!text.trim())throw new ModelError('empty_response','Codex CLI returned no generated content.',true);
      return this.lastResponse;
    }finally{
      // Remove only attachment files created by this invocation, never the source
      // images or an unexpected file. The model workspace stays empty.
      for(const file of ownedImagePaths)await fs.unlink(file).catch(()=>{});
      if(imageDir)await fs.rmdir(imageDir).catch(()=>{});
      // Only remove our empty scratch directory; unexpected files remain for diagnosis.
      await fs.rmdir(cwd).catch(()=>{});
    }
  }
  private async failure(result:ProcessResult,input:ModelRequest,defaultCode:'timeout'|'cli_provider'|'truncated'|'response_json'):Promise<ModelError>{
    const diagnostics=codexDiagnostics(result);
    try{
      await appendLog(path.join(this.options.projectRoot??process.cwd(),'logs/model-cli-diagnostics.jsonl'),{
        timestamp:new Date().toISOString(),requestHash:hash(input),provider:'codex-cli',model:this.settings.model,
        timeoutMs:this.settings.timeout_ms,...diagnostics,
      });
    }catch{throw new ModelError('cli_diagnostics','Could not persist the local Codex CLI diagnostics journal.');}
    const code=diagnostics.category==='unknown'?defaultCode:`cli_${diagnostics.category.replaceAll('-','_')}`;
    const message=diagnostics.category==='unknown'&&defaultCode==='truncated'?'Codex CLI response exceeded the output limit.'
      :diagnostics.category==='unknown'&&defaultCode==='response_json'?'Codex CLI did not return complete JSON events.'
      :codexFailureMessage(diagnostics);
    return new ModelError(code,message,code==='timeout'||code==='cli_network');
  }
}
