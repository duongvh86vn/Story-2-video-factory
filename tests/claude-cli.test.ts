import assert from 'node:assert/strict';
import test from 'node:test';
import { ModelSettingsSchema } from '../packages/core/config.js';
import { createAdapter } from '../packages/models/registry.js';
import path from 'node:path';
import { execute } from '../packages/render/process.js';
import { temporary } from './support.js';
import { promises as fs } from 'node:fs';
import { z } from 'zod';
import { ClaudeCliAdapter } from '../packages/models/claude-cli.js';
import { ModelError, StructuredOutputError } from '../packages/models/adapter.js';
import { ProcessTimeoutError, redact, type ProcessResult } from '../packages/render/process.js';

const request={system:'Private system $(not-a-command)',prompt:'Lời kể `private`',context:{cue:'Hơi nước'}};
const success=(extra:Record<string,unknown>={}):ProcessResult=>({code:0,timedOut:false,truncated:false,stderr:'',stdout:JSON.stringify({type:'result',subtype:'success',result:'answer',usage:{input_tokens:2,cache_creation_input_tokens:3,cache_read_input_tokens:5,output_tokens:7},total_cost_usd:.25,modelUsage:{'actual-model':{}},...extra})});
const settings=()=>ModelSettingsSchema.parse({provider:'claude-cli',model:'opus',command:'claude.exe',timeout_ms:150});
const isCode=(code:string,retryable?:boolean)=>(error:unknown)=>error instanceof ModelError&&error.code===code&&(retryable===undefined||error.retryable===retryable);

test('Claude invocation keeps application instructions and context out of arguments and preserves usage',async t=>{
  const root=await temporary(t);
  const runner:typeof execute=async(command,args,options)=>{
    assert.equal(command,'claude.exe');assert.equal(options.cwd,root);
    assert.equal(args[args.indexOf('--tools')+1],'');assert.ok(args.includes('--safe-mode'));
    for(const text of [request.system,request.prompt,'Hơi nước'])assert.ok(!args.some(arg=>arg.includes(text)));
    assert.ok(options.input?.includes(request.system));assert.ok(options.input?.includes(request.prompt));assert.ok(options.input?.includes('Hơi nước'));
    assert.equal(options.logOutput,false);assert.equal(options.allowFailure,true);assert.equal(options.timeoutMs,150);
    return success();
  };
  const response=await new ClaudeCliAdapter(settings(),{projectRoot:root},runner).generateText(request);
  assert.deepEqual(response,{text:'answer',usage:{inputTokens:10,outputTokens:7},costUsd:.25,model:'actual-model'});
});

test('Claude structured output is locally validated and invalid output retains billed usage',async t=>{
  const root=await temporary(t);let count=0;
  const runner:typeof execute=async(_command,args,options)=>{
    assert.ok(args.includes('--json-schema'));assert.ok(options.input?.includes('OUTPUT JSON SCHEMA'));
    return success({structured_output:{count:count++===0?3:'wrong'}});
  };
  const adapter=new ClaudeCliAdapter(settings(),{projectRoot:root},runner),schema=z.object({count:z.number()}).strict();
  assert.deepEqual(await adapter.generateStructured(request,schema),{count:3});
  await assert.rejects(adapter.generateStructured(request,schema),StructuredOutputError);
  assert.equal(adapter.lastResponse?.costUsd,.25);assert.deepEqual(adapter.lastResponse?.usage,{inputTokens:10,outputTokens:7});
});

test('Claude failures reject fatal, truncated and malformed output and clear a prior response',async t=>{
  const root=await temporary(t);
  for(const [result,code,retryable] of [
    [{...success(),code:1},'cli_provider',false],
    [success({is_error:true}),'cli_provider',false],
    [{...success(),truncated:true},'truncated',false],
    [{...success(),stdout:'not JSON'},'response_json',true],
    [success({result:''}),'empty_response',true],
  ] as const){
    let calls=0;const adapter=new ClaudeCliAdapter(settings(),{projectRoot:root},async()=>calls++===0?success():result);
    await adapter.generateText(request);await assert.rejects(adapter.generateText(request),isCode(code,retryable));
    if(code==='truncated'||code==='response_json')assert.equal(adapter.lastResponse,undefined);
    else assert.equal(adapter.lastResponse?.usage?.outputTokens,7);
  }
  let calls=0;const adapter=new ClaudeCliAdapter(settings(),{projectRoot:root},async()=>{if(calls++===0)return success();throw new Error('private launch diagnostic');});
  await adapter.generateText(request);await assert.rejects(adapter.generateText(request),isCode('cli_start',false));assert.equal(adapter.lastResponse,undefined);
});

test('real harmless child timeouts stay typed and map to a retryable Claude timeout',async t=>{
  const root=await temporary(t),runner:typeof execute=async(_command,_args,options)=>execute(process.execPath,['-e','setInterval(()=>{},1000)'],{...options,cwd:root,timeoutMs:150});
  await assert.rejects(execute(process.execPath,['-e','setInterval(()=>{},1000)'],{cwd:root,logFile:path.join(root,'typed.log'),timeoutMs:150,allowFailure:true}),ProcessTimeoutError);
  await assert.rejects(new ClaudeCliAdapter(settings(),{projectRoot:root},runner).generateText(request),isCode('timeout',true));
  const journal=await fs.readFile(path.join(root,'logs/model-cli.jsonl'),'utf8');assert.equal(JSON.parse(journal.trim()).timedOut,true);
});

test('JSON credentials are removed from persisted arguments and diagnostics while returned output stays exact',async t=>{
  const root=await temporary(t),secret='synthetic-only-NOT-A-CREDENTIAL',json=JSON.stringify({api_key:secret,token:secret,password:secret});
  assert.ok(!redact(json).includes(secret));
  const result=await execute(process.execPath,['-e','process.stdout.write(process.argv[1]);process.stderr.write(process.argv[1]);',json],{cwd:root,logFile:path.join(root,'privacy.log')});
  assert.equal(result.stdout,json);assert.equal(result.stderr,json);assert.ok(!(await fs.readFile(path.join(root,'privacy.log'),'utf8')).includes(secret));
  const capped=await execute(process.execPath,['-e','process.stdout.write("0123456789")'],{cwd:root,logFile:path.join(root,'cap.log'),maxOutputBytes:4});
  assert.equal(capped.stdout,'6789');assert.equal(capped.truncated,true);
});

test('Claude rejects shell wrappers before any invocation',async t=>{
  let calls=0;const root=await temporary(t);
  for(const command of ['claude.cmd','claude.bat','claude.ps1'])await assert.rejects(new ClaudeCliAdapter({...settings(),command},{projectRoot:root},async()=>{calls++;return success();}).generateText(request),isCode('configuration',false));
  assert.equal(calls,0);
});

test('Claude CLI is a configurable real provider with an explicit executable and model',()=>{
  const settings=ModelSettingsSchema.parse({provider:'claude-cli',model:'opus',command:'claude',timeout_ms:600000});
  assert.equal(settings.provider,'claude-cli');assert.equal(settings.command,'claude');
  assert.ok(createAdapter(settings));
});

test('model process receives UTF-8 prompt through stdin, not interpolated command arguments',async t=>{
  const root=await temporary(t),prompt='Hơi nước; $(echo private) `not a command`';
  const result=await execute(process.execPath,['-e','let text="";process.stdin.setEncoding("utf8");process.stdin.on("data",c=>text+=c);process.stdin.on("end",()=>process.stdout.write(text));'],
    {cwd:root,logFile:path.join(root,'stdin.log'),input:prompt,allowFailure:true});
  assert.equal(result.code,0);assert.equal(result.stdout,prompt);
});
