// Runtime delegated. No API/fixture/coordinator call occurs outside test callbacks.
import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {temporary} from './support.js';
import {buildServer} from '../apps/server/index.js';
import type {Coordinator} from '../apps/server/jobs.js';
import {importActorMotion} from '../packages/motion/import.js';
import type {SpriteMotionCatalogSnapshot} from '../packages/motion/catalog.js';
import type {SpriteMotionCatalog} from '../packages/motion/catalog-schemas.js';
import {ProjectStateSchema,type ProjectStatus} from '../packages/core/schemas.js';

async function fixture(t:TestContext){
  const projectsRoot=await temporary(t),root=path.join(projectsRoot,'fixture'),input=path.join(root,'input');await fs.mkdir(input,{recursive:true});
  await fs.writeFile(path.join(root,'project.yaml'),'project:\n  name: fixture\n');
  const forbidden=async():Promise<never>=>{throw new Error('Unexpected production coordinator call');};
  const invalidations:ProjectStatus[]=[];
  const coordinator:Coordinator={createProject:forbidden,getProjectStatus:forbidden,runPipeline:forbidden,approveProject:forbidden,updateLocks:forbidden,
    invalidateProject:async(root,from)=>{invalidations.push(from);const {invalidateProject}=await import('../packages/orchestrator/index.js');await invalidateProject(root,from);}};
  const app=await buildServer({projectsRoot,coordinator});t.after(()=>app.close());
  const bytes=await sharp({create:{width:4,height:4,channels:4,background:{r:230,g:120,b:10,alpha:.8}}}).png().toBuffer();
  await fs.writeFile(path.join(input,'idle.strip.png'),bytes);await fs.writeFile(path.join(input,'idle.strip.json'),JSON.stringify({frames:1,w:4,h:4,delay_ms:150,loop:true}));
  await fs.writeFile(path.join(input,'registration.json'),JSON.stringify({version:'actor-motion-registration-1',id:'idle',actorId:'karo',state:'idle',view:'right',referenceHash:'a'.repeat(64),playback:{mode:'loop',end:'hold'},anchor:{x:2,y:4},notes:[]}));
  const motion=await importActorMotion(root,path.join(input,'idle.strip.json'),path.join(input,'registration.json'));
  const catalog:SpriteMotionCatalog={version:'actor-motion-catalog-1',entries:[{motionId:motion.id,fingerprint:motion.fingerprint,label:'Karo waits',capabilities:[{kind:'hold'}]}]};
  return {app,root,motion,catalog,invalidations,url:'/api/projects/fixture/motions/catalog'};
}

test('catalog API returns empty revision then saves exact candidate version without model or render calls',async t=>{
  const f=await fixture(t),empty=await f.app.inject({url:f.url});assert.equal(empty.statusCode,200);assert.equal(empty.json().revision,null);
  const response=await f.app.inject({method:'PUT',url:f.url,payload:{catalog:f.catalog,revision:null}});assert.equal(response.statusCode,200,response.body);
  const saved=response.json<SpriteMotionCatalogSnapshot>();assert.equal(saved.entries[0]!.actorId,'karo');assert.equal(saved.entries[0]!.productionReady,false);
  assert.deepEqual((await f.app.inject({url:f.url})).json(),saved);
  assert.deepEqual(f.invalidations,['TIMED']);
});

test('catalog API reports stale revision as conflict and preserves the newer document',async t=>{
  const f=await fixture(t),first=await f.app.inject({method:'PUT',url:f.url,payload:{catalog:f.catalog,revision:null}});assert.equal(first.statusCode,200);
  const stale=await f.app.inject({method:'PUT',url:f.url,payload:{catalog:{...f.catalog,entries:[]},revision:null}});
  assert.equal(stale.statusCode,409);assert.equal(stale.json().error.code,'REVISION_CONFLICT');assert.deepEqual((await f.app.inject({url:f.url})).json().document,f.catalog);
  assert.deepEqual(f.invalidations,['TIMED']);
});

test('catalog API rejects active production but read-only library access stays available',async t=>{
  const f=await fixture(t);await fs.writeFile(path.join(f.root,'.factory.lock'),JSON.stringify({pid:process.pid}));
  const response=await f.app.inject({method:'PUT',url:f.url,payload:{catalog:f.catalog,revision:null}});
  assert.equal(response.statusCode,409);assert.equal(response.json().error.code,'PROJECT_BUSY');assert.equal((await f.app.inject({url:f.url})).statusCode,200);
  assert.deepEqual(f.invalidations,[]);
});

test('catalog route accepts no arbitrary paths, account choices, query parameters or missing revision',async t=>{
  const f=await fixture(t);
  for(const payload of [{catalog:f.catalog},{catalog:f.catalog,revision:null,path:'../other.json'},{catalog:f.catalog,revision:null,provider:'gemini'}])
    assert.equal((await f.app.inject({method:'PUT',url:f.url,payload})).statusCode,422);
  assert.equal((await f.app.inject({url:f.url+'?file=other.json'})).statusCode,422);
  assert.equal((await f.app.inject({url:'/api/projects/missing/motions/catalog'})).statusCode,404);
});

test('corrupt catalog source cannot be accepted as usable library or silently dropped',async t=>{
  const f=await fixture(t);await fs.writeFile(path.join(f.root,f.motion.sheet.path),'changed pixels');
  const response=await f.app.inject({method:'PUT',url:f.url,payload:{catalog:f.catalog,revision:null}});assert.ok(response.statusCode>=400);
  await assert.rejects(fs.stat(path.join(f.root,'input/motion-catalog.json')),/ENOENT/);
  assert.deepEqual(f.invalidations,[]);
});

test('catalog edit invalidates completed visuals immediately while keeping narration bytes and approved locks',async t=>{
  const f=await fixture(t);await fs.mkdir(path.join(f.root,'work'),{recursive:true});
  const audio=Buffer.from('original narration bytes');await fs.writeFile(path.join(f.root,'work/narration.wav'),audio);
  const state=ProjectStateSchema.parse({version:1,name:'fixture',state:'DONE',updatedAt:'2026-10-07T00:00:00Z',inputHash:'visual-old',narrationInputHash:'voice-current',locked:{storyboard:true,'actor:lila':true},approvals:{storyboard:true,characters:true,host:true}});
  await fs.writeFile(path.join(f.root,'project-state.json'),JSON.stringify(state));
  const response=await f.app.inject({method:'PUT',url:f.url,payload:{catalog:f.catalog,revision:null}});assert.equal(response.statusCode,200,response.body);
  const next=ProjectStateSchema.parse(JSON.parse(await fs.readFile(path.join(f.root,'project-state.json'),'utf8')));
  assert.equal(next.state,'TIMED');assert.equal(next.narrationInputHash,state.narrationInputHash);assert.deepEqual(next.locked,state.locked);
  assert.deepEqual(await fs.readFile(path.join(f.root,'work/narration.wav')),audio);assert.equal(next.approvals.storyboard,false);
  const revision=response.json<SpriteMotionCatalogSnapshot>().revision;
  const unchanged=await f.app.inject({method:'PUT',url:f.url,payload:{catalog:f.catalog,revision}});assert.equal(unchanged.statusCode,200);
  assert.deepEqual(f.invalidations,['TIMED']);
});
