import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ZodType, ZodTypeDef } from 'zod';
import type { ModelSettings } from '../core/config.js';
import { execute, mediaEnvironment, ProcessTimeoutError } from '../render/process.js';
import { ModelError, object, requestText, structuredRequest, tokenCount, validateStructured,
  type AdapterOptions, type ModelAdapter, type ModelRequest, type ModelResponse, type VisionRequest } from './adapter.js';

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

/** Restricted CLI generation in an empty read-only workspace; application validates the returned data. */
export class CodexCliAdapter implements ModelAdapter {
  lastResponse?:ModelResponse;
  constructor(private readonly settings:ModelSettings,private readonly options:AdapterOptions={},private readonly run:typeof execute=execute){}
  async generateText(input:ModelRequest):Promise<ModelResponse>{return this.request(input);}
  async generateStructured<T>(input:ModelRequest,schema:ZodType<T,ZodTypeDef,any>):Promise<T>{
    return validateStructured(await this.request(structuredRequest(input,schema)),schema);
  }
  async analyzeImages(_input:VisionRequest):Promise<ModelResponse>{
    throw new ModelError('vision_unsupported','The restricted Codex CLI provider does not provide image review; configure a vision API provider.');
  }
  private async request(input:ModelRequest):Promise<ModelResponse>{
    this.lastResponse=undefined;
    const command=this.settings.command??await defaultCommand();
    if(/\.(?:cmd|bat|ps1)$/i.test(command)||command.includes('\0'))throw new ModelError('configuration','Codex CLI requires a native executable. On Windows set command to codex.exe.');
    if(this.settings.model==='mock')throw new ModelError('configuration','Set an available Codex model, or default to use the CLI default.');
    if(this.settings.max_call_cost_usd!==undefined)throw new ModelError('configuration','Codex CLI does not report or enforce a dollar cost cap; use account limits or a priced API provider.');
    const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'story-video-model-'));
    const args=['exec','--json','--ephemeral','--ignore-user-config','--skip-git-repo-check','--sandbox','read-only',
      '-c','approval_policy="never"','-c','project_doc_max_bytes=0','-c','web_search="disabled"','-c','mcp_servers={}',
      ...CODEX_DISABLED_FEATURES.flatMap(feature=>['--disable',feature])];
    if(this.settings.model!=='default')args.push('--model',this.settings.model);
    args.push('-');
    const env=mediaEnvironment();
    for(const name of ['CODEX_HOME','OPENAI_API_KEY','HTTP_PROXY','HTTPS_PROXY','NO_PROXY','NODE_EXTRA_CA_CERTS']){
      if(process.env[name])env[name]=process.env[name];
    }
    try{
      let result;
      try{result=await this.run(command,args,{cwd,logFile:path.join(this.options.projectRoot??process.cwd(),'logs/model-cli.jsonl'),
        input:`Generate only the requested response. Do not use tools or inspect files.\n\nAPPLICATION INSTRUCTIONS:\n${input.system}\n\nREQUEST:\n${requestText(input)}`,
        env,timeoutMs:this.settings.timeout_ms,allowFailure:true,maxOutputBytes:8*1024*1024,logOutput:false});}
      catch(error){if(error instanceof ProcessTimeoutError)throw new ModelError('timeout','Codex CLI exceeded the configured timeout.',true);throw new ModelError('cli_start','Could not complete Codex CLI. Check executable, sign-in, installed CLI version and local journal storage outside the production job.');}
      if(result.timedOut)throw new ModelError('timeout','Codex CLI exceeded the configured timeout.',true);
      if(result.truncated)throw new ModelError('truncated','Codex CLI response exceeded the output limit.');
      let events:Record<string,unknown>[];
      try{events=result.stdout.trim().split(/\r?\n/).filter(Boolean).map(line=>object(JSON.parse(line)));}
      catch{throw new ModelError('response_json','Codex CLI did not return complete JSON events.');}
      const completed=events.filter(e=>e.type==='turn.completed').at(-1);
      // CLI can emit a nonfatal startup diagnostic when code mode fails closed.
      // It is not a tool operation; a failed turn or nonzero exit still rejects the response.
      const forbidden=events.some(e=>(e.type==='item.started'||e.type==='item.completed')&&!['agent_message','reasoning','error'].includes(String(object(e.item).type)));
      if(forbidden)throw new ModelError('cli_tool_use','Codex CLI attempted an unsupported tool operation; its output was rejected.');
      const messages=events.filter(e=>e.type==='item.completed'&&object(e.item).type==='agent_message');
      const text=String(object(messages.at(-1)?.item).text??'');
      const usage=object(completed?.usage);
      this.lastResponse={text,usage:{inputTokens:tokenCount(usage.input_tokens),outputTokens:tokenCount(usage.output_tokens)}};
      if(result.code!==0||!completed||events.some(e=>e.type==='turn.failed'||e.type==='error'))throw new ModelError('cli_provider','Codex CLI did not complete generation. Check sign-in, model access and account limits.');
      if(!text.trim())throw new ModelError('empty_response','Codex CLI returned no generated content.',true);
      return this.lastResponse;
    }finally{
      // Only remove our empty scratch directory; unexpected files remain for diagnosis.
      await fs.rmdir(cwd).catch(()=>{});
    }
  }
}
