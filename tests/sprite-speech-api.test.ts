// Runtime API/fixture execution delegated. No provider or production call is permitted by this fixture.
import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {buildServer} from '../apps/server/index.js';
import type {Coordinator} from '../apps/server/jobs.js';
import type {ActorSpeech} from '../packages/motion/speech-schemas.js';
import {importedSpeechFixture} from './sprite-speech-support.js';

async function fixture(t:TestContext){
  const f=await importedSpeechFixture(t),name=path.basename(f.root);
  await fs.writeFile(path.join(f.root,'project.yaml'),`project:\n  name: ${name}\n`);
  const forbidden=async():Promise<never>=>{throw new Error('Unexpected production/model coordinator call');};
  const coordinator:Coordinator={createProject:forbidden,getProjectStatus:forbidden,runPipeline:forbidden,approveProject:forbidden,updateLocks:forbidden,invalidateProject:forbidden};
  const app=await buildServer({projectsRoot:path.dirname(f.root),coordinator});t.after(()=>app.close());
  return {...f,app,url:`/api/projects/${name}/motions/speech`,body:{sheet:'input/open.png',registration:'input/speech-registration.json'}};
}
test('speech API imports an exact candidate, lists it and serves verified original PNG without production',async t=>{
  const f=await fixture(t);assert.deepEqual((await f.app.inject({url:f.url})).json(),{variants:[]});
  const imported=await f.app.inject({method:'POST',url:f.url+'/import',payload:f.body});assert.equal(imported.statusCode,200,imported.body);
  const variant=imported.json<ActorSpeech>();assert.equal(variant.motionFingerprint,f.motion.fingerprint);assert.equal(variant.review.productionReady,false);
  assert.deepEqual((await f.app.inject({url:f.url})).json().variants,[variant]);
  const image=await f.app.inject({url:`${f.url}/${variant.id}/${variant.fingerprint}/sheet`});assert.equal(image.statusCode,200);assert.deepEqual(image.rawPayload,f.speechBytes);
});
test('speech mutations reject busy projects while reads stay available and extra provider/path inputs fail',async t=>{
  const f=await fixture(t);
  assert.equal((await f.app.inject({method:'POST',url:f.url+'/import',payload:{...f.body,provider:'gemini'}})).statusCode,422);
  assert.equal((await f.app.inject({url:f.url+'?file=outside.png'})).statusCode,422);
  assert.equal((await f.app.inject({method:'POST',url:f.url+'/import',payload:{...f.body,sheet:'../outside.png'}})).statusCode,400);
  await fs.writeFile(path.join(f.root,'.factory.lock'),JSON.stringify({pid:process.pid}));
  const response=await f.app.inject({method:'POST',url:f.url+'/import',payload:f.body});assert.equal(response.statusCode,409);assert.equal(response.json().error.code,'PROJECT_BUSY');
  assert.equal((await f.app.inject({url:f.url})).statusCode,200);
});
test('speech sheet route cannot serve a corrupt or edited candidate by arbitrary hash or query',async t=>{
  const f=await fixture(t),response=await f.app.inject({method:'POST',url:f.url+'/import',payload:f.body});assert.equal(response.statusCode,200);
  const variant=response.json<ActorSpeech>(),url=`${f.url}/${variant.id}/${variant.fingerprint}/sheet`;
  assert.equal((await f.app.inject({url:url+'?path=input/open.png'})).statusCode,422);
  await fs.writeFile(path.join(f.root,variant.sheet.path),'corrupt');assert.ok((await f.app.inject({url})).statusCode>=400);
  assert.ok((await f.app.inject({url:`${f.url}/${variant.id}/${'f'.repeat(64)}/sheet`})).statusCode>=400);
});
