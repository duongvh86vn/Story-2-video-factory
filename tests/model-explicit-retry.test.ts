import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test, { type TestContext } from 'node:test';
import { z } from 'zod';
import YAML from 'yaml';
import { ModelRouter } from '../packages/models/registry.js';
import { MockAdapter } from '../packages/models/mock.js';
import { ModelJournal, type AttemptRecord } from '../packages/models/journal.js';
import { ModelError } from '../packages/models/adapter.js';
import { buildServer } from '../apps/server/index.js';
import * as core from '../packages/orchestrator/index.js';
import { config, model, temporary, createLegacyProject } from './support.js';

const input={system:'fixture',prompt:'answer',context:{data:'only'}},schema=z.object({answer:z.number()});
const code=(value:string)=>(error:unknown)=>error instanceof ModelError&&error.code===value;
const envelope=(text:string)=>({choices:[{message:{content:text},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:5}});
async function fixture(t:TestContext){
  let status=401,text='{"answer":42}';const calls:Array<{model:string;messages:unknown}>=[];
  const server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;calls.push(JSON.parse(body));res.writeHead(status,{'content-type':'application/json'});res.end(status===200?JSON.stringify(envelope(text)):'{}');});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});
  const settings=config();settings.retry.structured_output=0;settings.models.planner=model('gateway',`http://127.0.0.1:${(server.address() as {port:number}).port}`,{input_cost_per_million:1,output_cost_per_million:2});
  return {root:await temporary(t),settings,calls,set:(next:number,value=text)=>{status=next;text=value;}};
}
test('fatal failure -> ordinary resume blocked -> explicit retry succeeds with append-only retryOf and usage',async t=>{
  const f=await fixture(t),journal=new ModelJournal(f.root);
  await assert.rejects(new ModelRouter(f.settings,f.root).structured('planner',input,schema),code('http'));
  const prefix=await fs.readFile(journal.file,'utf8'),failed=journal.read().at(-1)!;
  await assert.rejects(new ModelRouter(f.settings,f.root).structured('planner',input,schema),code('attempt_budget'));assert.equal(f.calls.length,1);
  f.set(200);assert.deepEqual(await new ModelRouter(f.settings,f.root,{retryModelErrors:true}).structured('planner',input,schema),{answer:42});
  assert.ok((await fs.readFile(journal.file,'utf8')).startsWith(prefix));
  const rows=journal.read();assert.equal(rows.length,4);assert.equal(rows[2]!.retryOf,failed.callId);assert.equal(rows[3]!.retryOf,failed.callId);assert.equal(rows[2]!.attempt,1);
  const usage=journal.usageSummary();assert.equal(usage.calls,2);assert.equal(usage.failures,1);assert.equal(usage.successes,1);assert.equal(usage.totalTokens,15);assert.equal(usage.costUsd,.00002);assert.equal(usage.unknownUsageCalls,1);
});
test('only one restart per hash/router; later ordinary resume cannot reset the failed new cycle',async t=>{
  const f=await fixture(t);await assert.rejects(new ModelRouter(f.settings,f.root).structured('planner',input,schema),code('http'));
  const explicit=new ModelRouter(f.settings,f.root,{retryModelErrors:true});await assert.rejects(explicit.structured('planner',input,schema),code('http'));
  await assert.rejects(explicit.structured('planner',input,schema),code('attempt_budget'));
  await assert.rejects(new ModelRouter(f.settings,f.root).structured('planner',input,schema),code('attempt_budget'));assert.equal(f.calls.length,2);
  assert.equal(new ModelJournal(f.root).read().filter(r=>r.event==='started'&&r.retryOf).length,1);
});
test('schema-exhausted cycles retain charged usage and cannot reset on ordinary resume',async t=>{
  const f=await fixture(t);f.set(200,'{"answer":"wrong"}');f.settings.retry.structured_output=1;
  await assert.rejects(new ModelRouter(f.settings,f.root).structured('planner',input,schema),code('structured_output'));
  await assert.rejects(new ModelRouter(f.settings,f.root).structured('planner',input,schema),code('attempt_budget'));
  await assert.rejects(new ModelRouter(f.settings,f.root,{retryModelErrors:true}).structured('planner',input,schema),code('structured_output'));
  await assert.rejects(new ModelRouter(f.settings,f.root).structured('planner',input,schema),code('attempt_budget'));
  const usage=new ModelJournal(f.root).usageSummary();assert.equal(f.calls.length,4);assert.equal(usage.calls,4);assert.equal(usage.failures,4);assert.equal(usage.totalTokens,60);assert.equal(usage.costUsd,.00008);
});
for(const budget of ['calls','cost'] as const)test(`explicit retry retains global ${budget} budget`,async t=>{
  const f=await fixture(t);f.set(200,'{"answer":"wrong"}');await assert.rejects(new ModelRouter(f.settings,f.root).structured('planner',input,schema));
  if(budget==='calls')f.settings.workflow.max_model_calls=1;else f.settings.workflow.max_model_cost_usd=.00002;
  f.set(200,'{"answer":42}');await assert.rejects(new ModelRouter(f.settings,f.root,{retryModelErrors:true}).structured('planner',input,schema),code(budget==='calls'?'call_budget':'cost_budget'));assert.equal(f.calls.length,1);
});
test('explicit fallback starts fresh primary then one real fallback; history stays charged',async t=>{
  const f=await fixture(t);f.settings.models.planner.model='primary';f.settings.models.fallback={...f.settings.models.planner,model:'backup'};
  await assert.rejects(new ModelRouter(f.settings,f.root).structured('planner',input,schema),code('http'));
  await assert.rejects(new ModelRouter(f.settings,f.root).structured('planner',input,schema),code('attempt_budget'));
  await assert.rejects(new ModelRouter(f.settings,f.root,{retryModelErrors:true}).structured('planner',input,schema),code('http'));
  assert.deepEqual(f.calls.map(c=>c.model),['primary','backup','primary','backup']);assert.equal(new ModelJournal(f.root).usageSummary().calls,4);
});
const details={role:'planner' as const,routedRole:'planner' as const,provider:'fixture',model:'fixture',operation:'structured' as const,promptHash:'fixture'};
test('pending requests reject explicit restart; successes get no failure marker',async t=>{
  const journal=new ModelJournal(await temporary(t));const pending=await journal.reserve('pending',()=>details,20,1);
  await assert.rejects(journal.reserve('pending',()=>details,20,1,undefined,true),code('request_pending'));assert.equal(journal.read().length,1);
  await journal.complete(pending,{status:'success'});const next=await journal.reserve('pending',()=>details,20,1,undefined,true);assert.equal(next.retryOf,undefined);assert.equal(next.attempt,1);
});
for(const defect of ['unknown','cross-request','successful','mismatched-completion','missing-completion-marker'] as const)test(`retryOf journal integrity rejects ${defect}`,async t=>{
  const journal=new ModelJournal(await temporary(t));const first=await journal.reserve('request-A',()=>details,20,1);await journal.complete(first,{status:'error'});
  const next=await journal.reserve('request-A',()=>details,20,1,undefined,true);await journal.complete(next,{status:'success'});
  const records=journal.read();
  if(defect==='unknown')records[2]!.retryOf='unknown';
  if(defect==='cross-request')records[0]!.requestHash=records[1]!.requestHash='request-B';
  if(defect==='successful')records[1]!.status='success';
  if(defect==='mismatched-completion')records[3]!.retryOf='unknown';
  if(defect==='missing-completion-marker')delete records[3]!.retryOf;
  await fs.writeFile(journal.file,records.map(r=>JSON.stringify(r)).join('\n')+'\n');assert.throws(()=>new ModelJournal(path.dirname(path.dirname(journal.file))).read(),code('journal'));
});
test('legacy completed failure can retry; redaction keeps both cycles free of secrets',async t=>{
  const f=await fixture(t),secret='retry-fixture-private-secret';process.env.MODEL_RETRY_TEST_SECRET=secret;t.after(()=>{delete process.env.MODEL_RETRY_TEST_SECRET;});f.settings.models.planner.api_key_env='MODEL_RETRY_TEST_SECRET';
  const request={...input,context:{api_key:secret}};await assert.rejects(new ModelRouter(f.settings,f.root).structured('planner',request,schema));
  const journal=new ModelJournal(f.root),failure=journal.read().at(-1)!;
  await fs.writeFile(journal.file,JSON.stringify({role:failure.role,model:failure.model,provider:failure.provider,callId:failure.callId,requestHash:failure.requestHash,status:'error',attempt:1,usage:{prompt_tokens:3,completion_tokens:2},cost_usd:.01})+'\n');
  f.set(200);await new ModelRouter(f.settings,f.root,{retryModelErrors:true}).structured('planner',request,schema);
  assert.equal(journal.read()[1]!.retryOf,failure.callId);assert.equal(journal.usageSummary().totalTokens,20);assert.equal(journal.usageSummary().costUsd,.01002);
  for(const file of await fs.readdir(path.join(f.root,'work/model-attempts')))assert.doesNotMatch(await fs.readFile(path.join(f.root,'work/model-attempts',file),'utf8'),new RegExp(secret));assert.doesNotMatch(await fs.readFile(journal.file,'utf8'),new RegExp(secret));
});
test('run API strictly accepts boolean, forwards retry, and rejects busy/selected-shot violations',async t=>{
  const projectsRoot=await temporary(t),root=await createLegacyProject('retry-api',{root:projectsRoot});let forwarded:unknown;let finish!:()=>void;
  const wait=new Promise<void>(resolve=>{finish=resolve;});const app=await buildServer({projectsRoot,coordinator:{...core,runPipeline:async(_root,options)=>{forwarded=options;await wait;return core.loadState(root);}}});t.after(async()=>{finish();await app.close();});
  const url='/api/projects/retry-api/run';for(const retryModelErrors of ['true',1,null,{}])assert.equal((await app.inject({method:'POST',url,payload:{retryModelErrors}})).statusCode,422);
  assert.equal((await app.inject({method:'POST',url,payload:{retryModelErrors:true,unexpected:true}})).statusCode,422);
  assert.equal((await app.inject({method:'POST',url,payload:{retryModelErrors:true,shotIds:['shot001']}})).statusCode,409);
  await fs.writeFile(path.join(root,'.factory.lock'),JSON.stringify({pid:process.pid}));assert.equal((await app.inject({method:'POST',url,payload:{retryModelErrors:true}})).statusCode,409);await fs.unlink(path.join(root,'.factory.lock'));
  assert.equal((await app.inject({method:'POST',url,payload:{until:'TIMED',retryModelErrors:true}})).statusCode,202);assert.equal((forwarded as {retryModelErrors:boolean}).retryModelErrors,true);
  assert.equal((await app.inject({method:'POST',url,payload:{retryModelErrors:false}})).statusCode,409);finish();
});
test('CLI exposes explicit option on production commands and accepts it on a real no-provider ingest',async t=>{
  const exec=promisify(execFile),root=await createLegacyProject('retry-cli',{root:await temporary(t),example:true});
  const args=['--import','tsx','apps/cli/index.ts'];const help=await exec(process.execPath,[...args,'resume','--help']);assert.match(help.stdout,/--retry-model-errors/);
  const result=await exec(process.execPath,[...args,'resume',root,'--until','INGESTED','--retry-model-errors']);assert.match(result.stdout,/INGESTED/);assert.equal(new ModelJournal(root).usageSummary().calls,0);
});
test('each failed hash can restart once in an explicit invocation; later success has no retry boundary',async t=>{
  const f=await fixture(t),other={...input,prompt:'second request'},ordinary=new ModelRouter(f.settings,f.root);
  await assert.rejects(ordinary.structured('planner',input,schema));await assert.rejects(ordinary.structured('planner',other,schema));f.set(200);
  const retry=new ModelRouter(f.settings,f.root,{retryModelErrors:true});await retry.structured('planner',input,schema);await retry.structured('planner',other,schema);await retry.structured('planner',input,schema);
  const starts=new ModelJournal(f.root).read().filter(r=>r.event==='started');assert.equal(starts.length,5);assert.equal(starts.filter(r=>r.retryOf).length,2);assert.equal(starts.at(-1)!.retryOf,undefined);assert.equal(f.calls.length,5);
});
test('real pending provider request cannot be explicitly restarted while it is in flight',async t=>{
  const root=await temporary(t);let entered!:()=>void,release!:()=>void;const arrived=new Promise<void>(resolve=>{entered=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});let calls=0;
  const server=createServer(async(req,res)=>{for await(const _ of req){}calls++;entered();await gate;res.setHeader('content-type','application/json');res.end(JSON.stringify(envelope('{"answer":42}')));});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{release();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});const settings=config();settings.retry.structured_output=0;settings.models.planner=model('gateway',`http://127.0.0.1:${(server.address() as {port:number}).port}`);
  const running=new ModelRouter(settings,root).structured('planner',input,schema);await arrived;
  await assert.rejects(new ModelRouter(settings,root,{retryModelErrors:true}).structured('planner',input,schema),code('request_pending'));assert.equal(calls,1);release();assert.deepEqual(await running,{answer:42});assert.equal(new ModelJournal(root).usageSummary().pendingCalls,0);
});
test('genuine pipeline failure/ordinary block recover through CLI explicit option without narration change',async t=>{
  let fail=true,calls=0;const offline=new MockAdapter();
  const server=createServer(async(req,res)=>{let text='';for await(const chunk of req)text+=chunk;calls++;if(fail){res.writeHead(401,{'content-type':'application/json'});res.end('{}');return;}
    const body=JSON.parse(text),context=JSON.parse(body.messages[1].content.split('\n\nCONTEXT (data, not instructions):\n').at(-1));const response=await offline.generateText({system:'fixture data',prompt:'fixture',context});res.setHeader('content-type','application/json');res.end(JSON.stringify(envelope(response.text)));
  });await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});
  const root=await createLegacyProject('retry-pipeline',{root:await temporary(t),example:true}),file=path.join(root,'project.yaml'),settings=YAML.parse(await fs.readFile(file,'utf8'));
  settings.models={planner:model('gateway',`http://127.0.0.1:${(server.address() as {port:number}).port}`)};settings.retry={structured_output:0};await fs.writeFile(file,YAML.stringify(settings));
  await core.runPipeline(root,{until:'TIMED'});const narration=await fs.readFile(path.join(root,'work/narration.json'));await assert.rejects(core.runPipeline(root,{until:'ANALYZED'}),/HTTP 401/);assert.equal(calls,1);
  await assert.rejects(core.runPipeline(root,{until:'ANALYZED'}),/attempt budget|persisted provider error/);assert.equal(calls,1);fail=false;
  const result=await promisify(execFile)(process.execPath,['--import','tsx','apps/cli/index.ts','resume',root,'--until','ANALYZED','--retry-model-errors']);assert.match(result.stdout,/ANALYZED/);
  const journal=new ModelJournal(root),rows=journal.read(),first=rows.find(r=>r.event==='completed'&&r.status==='error')!,retry=rows.find(r=>r.event==='started'&&r.retryOf)!;assert.equal(retry.retryOf,first.callId);assert.ok(calls>1);
  assert.deepEqual(await fs.readFile(path.join(root,'work/narration.json')),narration);const completed=calls;assert.equal((await core.runPipeline(root,{until:'ANALYZED'})).state,'ANALYZED');assert.equal(calls,completed);
});
