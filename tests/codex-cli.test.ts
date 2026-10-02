import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import { z } from 'zod';
import { temporary } from './support.js';
import { ModelSettingsSchema } from '../packages/core/config.js';
import { CodexCliAdapter } from '../packages/models/codex-cli.js';
import { ModelError, StructuredOutputError } from '../packages/models/adapter.js';
import { execute, ProcessTimeoutError, type ProcessResult } from '../packages/render/process.js';

const request={system:'Private application instructions',prompt:'Hơi nước',context:{private:'stdin only'}};
const settings=()=>ModelSettingsSchema.parse({provider:'codex-cli',model:'default',command:'codex.exe',timeout_ms:150});
const completed={type:'turn.completed',usage:{input_tokens:11,output_tokens:4}};
const message=(text='answer')=>({type:'item.completed',item:{type:'agent_message',text}});
const response=(events:unknown[]=[message(),completed],patch:Partial<ProcessResult>={}):ProcessResult=>({code:0,stdout:events.map(e=>JSON.stringify(e)).join('\n'),stderr:'',timedOut:false,truncated:false,...patch});
const isCode=(code:string,retryable?:boolean)=>(error:unknown)=>error instanceof ModelError&&error.code===code&&(retryable===undefined||error.retryable===retryable);

test('Codex receives stdin in distinct empty scratch directories and removes them after success',async t=>{
  const root=await temporary(t),dirs:string[]=[];
  const runner:typeof execute=async(command,args,options)=>{
    assert.equal(command,'codex.exe');assert.notEqual(options.cwd,root);assert.deepEqual(await fs.readdir(options.cwd),[]);dirs.push(options.cwd);
    for(const flag of ['--ephemeral','--ignore-user-config','--skip-git-repo-check'])assert.ok(args.includes(flag),flag);
    assert.equal(args[args.indexOf('--sandbox')+1],'read-only');assert.equal(args.at(-1),'-');assert.ok(!args.includes('--model'));
    for(const feature of ['shell_tool','unified_exec','apps','plugins','hooks','code_mode','code_mode_host','browser_use','computer_use'])assert.ok(args.some((arg,i)=>arg==='--disable'&&args[i+1]===feature),feature);
    assert.ok(args.includes('approval_policy="never"'));assert.ok(args.includes('mcp_servers={}'));assert.ok(args.includes('web_search="disabled"'));
    assert.ok(options.input?.includes(request.system));assert.ok(options.input?.includes(request.prompt));assert.ok(!args.some(arg=>arg.includes(request.system)));assert.equal(options.logOutput,false);
    return response([{type:'item.completed',item:{type:'error',message:'code mode startup fails closed'}},message(),completed]);
  };
  const adapter=new CodexCliAdapter(settings(),{projectRoot:root},runner);
  assert.deepEqual(await adapter.generateText(request),{text:'answer',usage:{inputTokens:11,outputTokens:4}});await adapter.generateText(request);
  assert.equal(new Set(dirs).size,2);for(const dir of dirs)assert.equal(await fs.stat(dir).then(()=>true,()=>false),false);
});

test('Codex rejects failed turns, top-level errors, exits and tool operations and cleans each scratch',async t=>{
  const root=await temporary(t);
  for(const [result,code] of [
    [response([message(),completed,{type:'turn.failed'}]),'cli_provider'],
    [response([message(),completed,{type:'error',message:'fatal'}]),'cli_provider'],
    [response(undefined,{code:1}),'cli_provider'],
    [response([{type:'item.started',item:{type:'command_execution',command:'not executed'}},message(),completed]),'cli_tool_use'],
    [response([message()]),'cli_provider'],
  ] as const){let scratch='';const adapter=new CodexCliAdapter(settings(),{projectRoot:root},async(_c,_a,o)=>{scratch=o.cwd;return result;});
    await assert.rejects(adapter.generateText(request),isCode(code,false));assert.equal(await fs.stat(scratch).then(()=>true,()=>false),false);
  }
});

test('Codex local schemas reject invalid model data without losing usage',async t=>{
  const root=await temporary(t);let calls=0;
  const adapter=new CodexCliAdapter(settings(),{projectRoot:root},async(_c,_a,o)=>{assert.ok(o.input?.includes('OUTPUT JSON SCHEMA'));return response([message(JSON.stringify({count:calls++===0?2:'wrong'})),completed]);});
  const schema=z.object({count:z.number()}).strict();assert.deepEqual(await adapter.generateStructured(request,schema),{count:2});
  await assert.rejects(adapter.generateStructured(request,schema),StructuredOutputError);assert.deepEqual(adapter.lastResponse?.usage,{inputTokens:11,outputTokens:4});
});

test('Codex truncation, malformed capture and startup failures clear stale response; typed timeouts retry',async t=>{
  const root=await temporary(t);
  for(const [failure,code,retryable] of [
    [response(undefined,{truncated:true}),'truncated',false],
    [response(undefined,{stdout:'incomplete {'}),'response_json',false],
    [new ProcessTimeoutError('codex.exe'),'timeout',true],
    [new Error('private startup error'),'cli_start',false],
  ] as const){let calls=0;const adapter=new CodexCliAdapter(settings(),{projectRoot:root},async()=>{if(calls++===0)return response();if(failure instanceof Error)throw failure;return failure;});
    await adapter.generateText(request);await assert.rejects(adapter.generateText(request),isCode(code,retryable));assert.equal(adapter.lastResponse,undefined);
  }
});

test('Codex rejects shell commands and unsupported cost caps before invocation',async t=>{
  const root=await temporary(t);let calls=0;const runner:typeof execute=async()=>{calls++;return response();};
  for(const command of ['codex.cmd','codex.bat','codex.ps1'])await assert.rejects(new CodexCliAdapter({...settings(),command},{projectRoot:root},runner).generateText(request),isCode('configuration',false));
  await assert.rejects(new CodexCliAdapter({...settings(),max_call_cost_usd:1},{projectRoot:root},runner).generateText(request),isCode('configuration',false));assert.equal(calls,0);
});
