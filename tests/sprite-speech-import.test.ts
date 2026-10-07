// NOT RUN by implementer: IO/decode/assertions only in delegated test callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {ActorSpeechSchema,bindActorSpeech} from '../packages/motion/speech-schemas.js';
import {importActorSpeech,loadActorSpeech,listActorSpeech,actorSpeechSheetBytes} from '../packages/motion/speech-import.js';
import {importedSpeechFixture} from './sprite-speech-support.js';

test('speech import preserves native/alternate PNG bytes and binds exact motion without approving artwork',async t=>{
  const f=await importedSpeechFixture(t),manifest=path.join(f.root,'assets/motions',f.motion.id,f.motion.fingerprint,'manifest.json'),original=await fs.readFile(manifest);
  const variant=await importActorSpeech(f.root,f.speechSheet,f.registrationFile);
  assert.equal(variant.motionFingerprint,f.motion.fingerprint);assert.equal(variant.view,f.motion.view);assert.equal(variant.review.productionReady,false);assert.equal(variant.review.status,'candidate');
  assert.deepEqual(await fs.readFile(manifest),original);assert.deepEqual(await fs.readFile(f.baseSheet),f.baseBytes);
  assert.deepEqual(await actorSpeechSheetBytes(f.root,variant),f.speechBytes);assert.deepEqual(await loadActorSpeech(f.root,variant.id,variant.fingerprint),variant);
  assert.deepEqual(await listActorSpeech(f.root),[variant]);assert.throws(()=>ActorSpeechSchema.parse({...variant,review:{...variant.review,productionReady:true}}));
});
test('repeated import is immutable and unchanged artwork is rejected before publication',async t=>{
  const f=await importedSpeechFixture(t),first=await importActorSpeech(f.root,f.speechSheet,f.registrationFile);
  assert.deepEqual(await importActorSpeech(f.root,f.speechSheet,f.registrationFile),first);
  await fs.writeFile(f.speechSheet,f.baseBytes);await assert.rejects(importActorSpeech(f.root,f.speechSheet,f.registrationFile),/no alternate mouth/);
  assert.deepEqual(await actorSpeechSheetBytes(f.root,first),f.speechBytes);
});
test('native identity, layout, source view and reference cannot be swapped under the mouth artwork',async t=>{
  const f=await importedSpeechFixture(t),variant=await importActorSpeech(f.root,f.speechSheet,f.registrationFile);
  for(const edited of [{actorId:'karo'},{motionFingerprint:'f'.repeat(64)},{view:'right'},{referenceHash:'f'.repeat(64)},{sheet:{...variant.sheet,width:63}},{regions:[variant.regions[0]]}])
    assert.throws(()=>bindActorSpeech(f.motion,ActorSpeechSchema.parse({...variant,...edited})),/identity\/layout/);
});
test('mouth region cannot cover eyes/nose, miss mouth centre or escape registered face',async t=>{
  const f=await importedSpeechFixture(t);
  for(const region of [{x:12,y:12,w:8,h:14},{x:12,y:20,w:2,h:2},{x:0,y:20,w:20,h:6}]){
    await fs.writeFile(f.registrationFile,JSON.stringify({...f.registration,regions:[region,region]}));
    await assert.rejects(importActorSpeech(f.root,f.speechSheet,f.registrationFile),/protected|centre|escapes/);
  }
  await assert.rejects(fs.stat(path.join(f.root,'assets/motion-speech')),/ENOENT/);
});
test('pixel or alpha changes outside the oral registration are rejected even when the pose looks similar',async t=>{
  const f=await importedSpeechFixture(t);
  for(const channel of [0,3]){
    const raw=Buffer.from(f.alternateRaw);raw[(1*f.width+1)*4+channel]=1;
    await fs.writeFile(f.speechSheet,await f.png(raw));await assert.rejects(importActorSpeech(f.root,f.speechSheet,f.registrationFile),/outside registered mouth/);
  }
});
test('each native frame requires changed mouth artwork rather than an unmodified talking placeholder',async t=>{
  const f=await importedSpeechFixture(t),raw=Buffer.from(f.alternateRaw);
  f.baseRaw.copy(raw,(22*f.width+47)*4,(22*f.width+47)*4,(22*f.width+47)*4+4);
  await fs.writeFile(f.speechSheet,await f.png(raw));await assert.rejects(importActorSpeech(f.root,f.speechSheet,f.registrationFile),/no alternate mouth.*1/);
});
test('overlapping native rectangles preserve each frame protection instead of accepting a union-only loophole',async t=>{
  const f=await importedSpeechFixture(t,true),raw=Buffer.from(f.alternateRaw);raw[(21*f.width+15)*4]=250;
  await fs.writeFile(f.speechSheet,await f.png(raw));
  await fs.writeFile(f.registrationFile,JSON.stringify({...f.registration,regions:[f.registration.regions[0],{x:12,y:22,w:8,h:6}]}));
  await assert.rejects(importActorSpeech(f.root,f.speechSheet,f.registrationFile),/outside frame mouth region: 1/);
});
test('corrupt native/alternate PNG or edited descriptor is never returned as a verified speech version',async t=>{
  const f=await importedSpeechFixture(t),variant=await importActorSpeech(f.root,f.speechSheet,f.registrationFile),sheetPath=path.join(f.root,variant.sheet.path);
  await fs.writeFile(sheetPath,'corrupt');await assert.rejects(loadActorSpeech(f.root,variant.id,variant.fingerprint));
  await fs.writeFile(sheetPath,f.speechBytes);const file=path.join(path.dirname(sheetPath),'manifest.json');
  await fs.writeFile(file,JSON.stringify({...variant,referenceHash:'f'.repeat(64)}));await assert.rejects(loadActorSpeech(f.root,variant.id,variant.fingerprint),/descriptor integrity/);
  await fs.writeFile(file,JSON.stringify(variant));await fs.writeFile(path.join(f.root,f.motion.sheet.path),'corrupt native');await assert.rejects(loadActorSpeech(f.root,variant.id,variant.fingerprint));
});
test('speech source JSON/PNG limits and unsafe registration IDs fail before saving an asset',async t=>{
  const f=await importedSpeechFixture(t);
  await fs.writeFile(f.registrationFile,Buffer.alloc(2*1024*1024+1));await assert.rejects(importActorSpeech(f.root,f.speechSheet,f.registrationFile),/size limit/);
  await fs.writeFile(f.registrationFile,JSON.stringify({...f.registration,id:'../bad'}));await assert.rejects(importActorSpeech(f.root,f.speechSheet,f.registrationFile));
  await fs.writeFile(f.registrationFile,JSON.stringify(f.registration));await fs.writeFile(f.speechSheet,Buffer.alloc(16*1024*1024+1));await assert.rejects(importActorSpeech(f.root,f.speechSheet,f.registrationFile),/size limit/);
  await assert.rejects(loadActorSpeech(f.root,'../bad','a'.repeat(64)));await assert.rejects(fs.stat(path.join(f.root,'assets/motion-speech')),/ENOENT/);
});
