// Runtime execution is delegated. These declarations perform IO only inside test callbacks.
import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {hash} from '../packages/core/utils.js';
import {MotionRegistrationSchema, type MotionRegistration} from '../packages/motion/schemas.js';
import {importActorMotion,listActorMotions,loadActorMotion,normalizeSpriteMotion} from '../packages/motion/import.js';
import {motionLandmarkAt} from '../packages/motion/player.js';

const digest='a'.repeat(64);
const registration=():MotionRegistration=>({version:'actor-motion-registration-1',id:'lila-walk',actorId:'lila',state:'walk',view:'left',
  referenceHash:digest,playback:{mode:'once',end:'hold'},anchor:{x:2,y:4},requiredLandmarks:['hand'],notes:[]});
const atlas=()=>({game_input:'atlas.png',frame_layout:{rows:{walk:[{x:0,y:0,w:4,h:4},{x:4,y:0,w:4,h:4},{x:0,y:0,w:4,h:4}]}},
  animation:{rows:{walk:{frames:3,fps:8,loop:true,durations_ms:[70,230,120]}}},
  rig:{landmarks:{walk:[{hand:[1,2]},{hand:[7,1]},{hand:[2,3]}]}}});
const normalize=(meta:unknown=atlas(),reg:MotionRegistration=registration())=>normalizeSpriteMotion(meta,{width:8,height:4,hash:digest},reg,digest);

test('atlas preserves repeated rectangles, per-position timing and absolute landmark conversion',()=>{
  const motion=normalize();
  assert.deepEqual(motion.frames.map(f=>f.rect.x),[0,4,0]);
  assert.deepEqual(motion.frames.map(f=>f.durationMs),[70,230,120]);
  assert.deepEqual(motion.frames.map(f=>f.landmarks.hand),[{x:1,y:2},{x:3,y:1},{x:2,y:3}]);
  assert.equal(motion.source.loop,true);assert.equal(motion.playback.mode,'once');
  assert.deepEqual(motion.review.status,'candidate');assert.equal(motion.review.productionReady,false);
  assert.equal(motion.source.referenceHash,digest);
});
test('duration arrays take precedence over fps; fps is used only when durations are absent',()=>{
  const meta=atlas();meta.animation.rows.walk.fps=0;
  assert.deepEqual(normalize(meta).frames.map(f=>f.durationMs),[70,230,120]);
  const fallback=atlas();Reflect.deleteProperty(fallback.animation.rows.walk,'durations_ms');
  assert.deepEqual(normalize(fallback).frames.map(f=>f.durationMs),[125,125,125]);
  fallback.animation.rows.walk.fps=0;assert.throws(()=>normalize(fallback));
});
test('registration landmarks override atlas coordinates per position and must be complete',()=>{
  const reg=registration();reg.landmarks=[{hand:{x:0,y:0}},{hand:{x:1,y:1}},{hand:{x:2,y:2}}];
  assert.deepEqual(normalize(atlas(),reg).frames.map(f=>f.landmarks.hand),reg.landmarks.map(f=>f.hand));
  reg.landmarks.pop();assert.throws(()=>normalize(atlas(),reg),/every playback position/);
});

test('per-position anchors keep repeated atlas positions and world landmarks distinct without changing source rectangles',()=>{
  const reg=registration();reg.anchors=[{x:1,y:4},{x:2,y:3},{x:3,y:2}];
  const motion=normalize(atlas(),reg),clip={id:'anchor-check',compositionId:'shot-anchor',startMs:0,endMs:420,rate:1,placement:{x:100,y:200,scale:1,rotation:0}};
  assert.deepEqual(motion.frames.map(frame=>frame.anchor),reg.anchors);
  assert.deepEqual(motion.frames.map(frame=>frame.rect),atlas().frame_layout.rows.walk);
  assert.deepEqual([0,100,350].map(time=>motionLandmarkAt(motion,clip,'hand',time)),[{x:100,y:198},{x:101,y:198},{x:99,y:201}]);
  const unchanged=normalize();assert.deepEqual(unchanged.frames.map(frame=>frame.anchor),[{x:2,y:4},{x:2,y:4},{x:2,y:4}]);
  assert.equal(Object.hasOwn(MotionRegistrationSchema.parse(registration()),'anchors'),false);
  assert.notEqual(motion.fingerprint,unchanged.fingerprint);assert.notEqual(motion.source.registrationHash,unchanged.source.registrationHash);
});

test('per-position anchors require complete bounded explicit registration for atlas and strip',()=>{
  for(const anchors of [[],[{x:1,y:2}],Array.from({length:4},()=>({x:1,y:2})),[{x:1,y:2},{x:5,y:2},{x:1,y:2}],
    [{x:1,y:2},{x:1,y:-1},{x:1,y:2}],[{x:1,y:2},{x:NaN,y:2},{x:1,y:2}]])assert.throws(()=>normalize(atlas(),{...registration(),anchors}));
  assert.throws(()=>MotionRegistrationSchema.parse({...registration(),anchors:Array.from({length:513},()=>({x:1,y:2}))}));
  const reg=registration();reg.requiredLandmarks=[];reg.anchors=[{x:0,y:4},{x:4,y:0}];
  assert.deepEqual(normalize({frames:2,w:4,h:4,delay_ms:90,loop:false},reg).frames.map(frame=>frame.anchor),reg.anchors);
  reg.anchors.pop();assert.throws(()=>normalize({frames:2,w:4,h:4,delay_ms:90,loop:false},reg),/every playback position/);
});
test('fingerprint is deterministic under JSON key reordering and binds registration notes and reference provenance',()=>{
  const first=normalize(),reg=registration();
  const reordered=Object.fromEntries(Object.entries(atlas()).reverse());
  assert.equal(normalize(reordered).fingerprint,first.fingerprint);
  reg.notes=['source review pending'];assert.notEqual(normalize(atlas(),reg).fingerprint,first.fingerprint);
  reg.referenceHash='b'.repeat(64);assert.notEqual(normalize(atlas(),reg).source.registrationHash,first.source.registrationHash);
});
test('strip requires explicit anchor, exact dimensions and known loop inference provenance',()=>{
  const reg=registration();reg.requiredLandmarks=[];reg.anchor={x:1,y:2};
  const meta={frames:2,w:4,h:4,delay_ms:90,kind:'one-shot'};
  const motion=normalize(meta,reg);
  assert.deepEqual(motion.frames.map(f=>f.anchor),[{x:1,y:2},{x:1,y:2}]);
  assert.deepEqual(motion.frames.map(f=>f.rect.x),[0,4]);assert.equal(motion.source.loop,false);
  assert.ok(motion.review.warnings.some(w=>w.includes('kind=one-shot')));
  assert.equal(normalize({...meta,kind:'periodic'},reg).source.loop,true);
  assert.equal(normalize({...meta,kind:'pinned'},reg).source.loop,true);
  assert.equal(normalize({...meta,loop:true},reg).source.loop,true);
  assert.throws(()=>normalize({...meta,kind:'unknown'},reg));
  assert.throws(()=>normalize({...meta,w:3},reg));
  const {anchor:_,...missingAnchor}=reg;assert.throws(()=>normalize(meta,missingAnchor as MotionRegistration));
});
test('strip rejects malformed frame counts, timing, loop and missing required landmarks',()=>{
  const reg=registration();reg.requiredLandmarks=[];
  const meta={frames:2,w:4,h:4,delay_ms:90,kind:'periodic'};
  for(const change of [{frames:0},{frames:513},{frames:1.5},{w:-4},{h:3},{delay_ms:0},{delay_ms:60001},{delay_ms:NaN},{loop:'yes'}])
    assert.throws(()=>normalize({...meta,...change},reg));
  assert.throws(()=>normalize(meta,registration()),/Missing required landmark/);
  reg.landmarks=[{},{}];reg.requiredLandmarks=['hand'];assert.throws(()=>normalize(meta,reg),/Missing required landmark/);
});

const malformed:Array<[string,(meta:ReturnType<typeof atlas>,reg:MotionRegistration)=>void]>=[
  ['empty rectangles',m=>{m.frame_layout.rows.walk=[];}],
  ['fractional rectangle',m=>{m.frame_layout.rows.walk[0]!.x=.5;}],
  ['escaping rectangle',m=>{m.frame_layout.rows.walk[0]!.x=6;}],
  ['declared frame count',m=>{m.animation.rows.walk.frames=2;}],
  ['duration count',m=>{m.animation.rows.walk.durations_ms=[70];}],
  ['zero duration',m=>{m.animation.rows.walk.durations_ms[0]=0;}],
  ['nonfinite duration',m=>{m.animation.rows.walk.durations_ms[0]=Infinity;}],
  ['overlong cycle',m=>{m.animation.rows.walk.durations_ms=[60000,60000,1];}],
  ['missing atlas loop',m=>{Reflect.deleteProperty(m.animation.rows.walk,'loop');}],
  ['string loop',m=>{Object.assign(m.animation.rows.walk,{loop:'yes'});}],
  ['missing required landmark',m=>{Reflect.deleteProperty(m.rig.landmarks.walk[0]!,'hand');}],
  ['landmark count',m=>{m.rig.landmarks.walk.pop();}],
  ['out of bounds landmark',m=>{m.rig.landmarks.walk[1]!.hand=[100,1];}],
  ['out of bounds anchor',(_m,r)=>{r.anchor={x:5,y:4};}],
  ['no atlas grid inference',m=>{Reflect.deleteProperty(m.frame_layout,'rows');}],
];
for(const [name,mutate] of malformed)test(`rejects ${name}`,()=>{
  const meta=atlas(),reg=registration();mutate(meta,reg);assert.throws(()=>normalize(meta,reg));
});
test('rejects malformed metadata, hashes, sheet limits and unsafe landmark names',()=>{
  for(const meta of [null,[],{},'code'])assert.throws(()=>normalize(meta));
  assert.throws(()=>normalizeSpriteMotion(atlas(),{width:8,height:4,hash:'bad'},registration(),digest));
  assert.throws(()=>normalizeSpriteMotion(atlas(),{width:8,height:4,hash:digest},registration(),'bad'));
  assert.throws(()=>normalizeSpriteMotion(atlas(),{width:32769,height:4,hash:digest},registration(),digest));
  assert.throws(()=>normalizeSpriteMotion(atlas(),{width:10000,height:10000,hash:digest},registration(),digest));
  const reg=registration();reg.landmarks=Array.from({length:3},()=>JSON.parse('{"constructor":{"x":1,"y":1}}'));
  assert.throws(()=>normalize(atlas(),reg));
  assert.throws(()=>MotionRegistrationSchema.parse({...registration(),anchor:undefined}));
});

async function bundle(t:TestContext, strip=false) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'sprite-motion-import-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const source=path.join(root,'bundle');await fs.mkdir(source);
  const bytes=await sharp({create:{width:8,height:4,channels:4,background:{r:30,g:60,b:90,alpha:.5}}}).png().toBuffer();
  const metadataFile=path.join(source,strip?'walk.strip.json':'atlas.json');
  const pngFile=path.join(source,strip?'walk.strip.png':'atlas.png'), registrationFile=path.join(source,'registration.json');
  const reg=registration();if(strip)reg.requiredLandmarks=[];
  await fs.writeFile(pngFile,bytes);
  await fs.writeFile(metadataFile,JSON.stringify(strip?{frames:2,w:4,h:4,delay_ms:90,kind:'periodic'}:atlas()));
  await fs.writeFile(registrationFile,JSON.stringify(reg));
  return {root,source,bytes,metadataFile,pngFile,registrationFile};
}
test('immutable imports preserve raw bytes, hashes and repeat descriptors; source edits create another version',async t=>{
  const b=await bundle(t),first=await importActorMotion(b.root,b.metadataFile,b.registrationFile);
  const sheetFile=path.join(b.root,first.sheet.path), manifestFile=path.join(path.dirname(sheetFile),'manifest.json');
  const before=await fs.readFile(manifestFile);
  assert.deepEqual(await fs.readFile(sheetFile),b.bytes);
  assert.equal(first.source.metadataHash,hash(await fs.readFile(b.metadataFile)));
  assert.equal(first.source.sheetHash,hash(b.bytes));
  assert.deepEqual(await importActorMotion(b.root,b.metadataFile,b.registrationFile),first);
  assert.deepEqual(await fs.readFile(manifestFile),before);
  const reg=registration();reg.notes=['new provenance'];await fs.writeFile(b.registrationFile,JSON.stringify(reg));
  const second=await importActorMotion(b.root,b.metadataFile,b.registrationFile);
  assert.notEqual(second.fingerprint,first.fingerprint);assert.deepEqual(await fs.readFile(manifestFile),before);
  assert.equal((await listActorMotions(b.root)).length,2);
  await assert.rejects(fs.access(path.join(b.root,'asset-manifest.json')));
});

test('per-position anchor edits create immutable versions while invalid registration publishes no assets',async t=>{
  const b=await bundle(t),reg=registration();reg.anchors=[{x:1,y:4},{x:2,y:3},{x:3,y:2}];
  await fs.writeFile(b.registrationFile,JSON.stringify({...reg,anchors:reg.anchors.slice(0,2)}));
  await assert.rejects(importActorMotion(b.root,b.metadataFile,b.registrationFile),/every playback position/);
  await assert.rejects(fs.access(path.join(b.root,'assets')),{code:'ENOENT'});
  await fs.writeFile(b.registrationFile,JSON.stringify(reg));
  const first=await importActorMotion(b.root,b.metadataFile,b.registrationFile),firstManifest=path.join(b.root,path.dirname(first.sheet.path),'manifest.json'),bytes=await fs.readFile(firstManifest);
  assert.deepEqual(first.frames.map(frame=>frame.anchor),reg.anchors);assert.deepEqual(await fs.readFile(path.join(b.root,first.sheet.path)),b.bytes);
  reg.anchors[1]!.x=3;await fs.writeFile(b.registrationFile,JSON.stringify(reg));
  const second=await importActorMotion(b.root,b.metadataFile,b.registrationFile);
  assert.notEqual(second.fingerprint,first.fingerprint);assert.deepEqual(await fs.readFile(firstManifest),bytes);
  assert.deepEqual(await loadActorMotion(b.root,first.id,first.fingerprint),first);
});
test('strip IO resolves the sibling PNG without using metadata path hints',async t=>{
  const b=await bundle(t,true);
  const motion=await importActorMotion(b.root,b.metadataFile,b.registrationFile);
  assert.equal(motion.source.kind,'sprite-gen-strip');assert.deepEqual(await fs.readFile(path.join(b.root,motion.sheet.path)),b.bytes);
});
test('source relative paths resolve inside project; malformed JSON and renamed strip metadata fail',async t=>{
  const b=await bundle(t,true);
  await importActorMotion(b.root,path.relative(b.root,b.metadataFile),path.relative(b.root,b.registrationFile));
  const renamed=path.join(b.source,'renamed.json');await fs.copyFile(b.metadataFile,renamed);
  await assert.rejects(importActorMotion(b.root,renamed,b.registrationFile),/strip.json/);
  await fs.writeFile(b.metadataFile,'{"frames":');await assert.rejects(importActorMotion(b.root,b.metadataFile,b.registrationFile));
});
test('load rejects descriptor corruption, source provenance edits and wrong sheet paths',async t=>{
  const b=await bundle(t),motion=await importActorMotion(b.root,b.metadataFile,b.registrationFile);
  const manifest=path.join(b.root,path.dirname(motion.sheet.path),'manifest.json');
  const edits=[
    (m:typeof motion)=>{m.frames[0]!.durationMs++;},
    (m:typeof motion)=>{m.frames[1]!.anchor.y--;},
    (m:typeof motion)=>{m.source.metadataHash='b'.repeat(64);},
    (m:typeof motion)=>{m.source.registrationHash='b'.repeat(64);},
    (m:typeof motion)=>{m.source.referenceHash='b'.repeat(64);},
    (m:typeof motion)=>{m.source.loop=!m.source.loop;},
    (m:typeof motion)=>{m.sheet.path='bundle/atlas.png';},
    (m:typeof motion)=>{m.review.warnings.push('altered');},
    (m:typeof motion)=>{m.playback.end='hide';},
    (m:typeof motion)=>{m.id='other';},
    (m:typeof motion)=>{m.fingerprint='b'.repeat(64);},
  ];
  for(const edit of edits){const changed=structuredClone(motion);edit(changed);await fs.writeFile(manifest,JSON.stringify(changed));
    await assert.rejects(loadActorMotion(b.root,motion.id,motion.fingerprint));}
  await assert.rejects(loadActorMotion(b.root,'../escape',motion.fingerprint));
  await assert.rejects(loadActorMotion(b.root,motion.id,'../escape'));
});
test('load and repeat import reject changed PNG bytes without overwriting them',async t=>{
  const b=await bundle(t),motion=await importActorMotion(b.root,b.metadataFile,b.registrationFile);
  const changed=await sharp({create:{width:8,height:4,channels:4,background:'#ff000080'}}).png().toBuffer();
  const output=path.join(b.root,motion.sheet.path);await fs.writeFile(output,changed);
  await assert.rejects(loadActorMotion(b.root,motion.id,motion.fingerprint),/integrity/);
  await assert.rejects(importActorMotion(b.root,b.metadataFile,b.registrationFile),/Immutable/);
  assert.deepEqual(await fs.readFile(output),changed);
});
test('repeat import rejects altered manifest bytes without replacing them',async t=>{
  const b=await bundle(t),motion=await importActorMotion(b.root,b.metadataFile,b.registrationFile);
  const file=path.join(b.root,path.dirname(motion.sheet.path),'manifest.json'),changed=Buffer.from('{}');
  await fs.writeFile(file,changed);await assert.rejects(importActorMotion(b.root,b.metadataFile,b.registrationFile),/Immutable/);
  assert.deepEqual(await fs.readFile(file),changed);
});
test('source IO rejects traversal, absolute paths, oversized JSON/PNG, non-PNG and missing alpha',async t=>{
  const b=await bundle(t);
  for(const game_input of ['../atlas.png','C:/atlas.png','/atlas.png','file://atlas.png','sub\\atlas.png']) {
    await fs.writeFile(b.metadataFile,JSON.stringify({...atlas(),game_input}));
    await assert.rejects(importActorMotion(b.root,b.metadataFile,b.registrationFile));
  }
  await fs.writeFile(b.metadataFile,Buffer.alloc(2*1024*1024+1,32));
  await assert.rejects(importActorMotion(b.root,b.metadataFile,b.registrationFile),/size limit/);
  await fs.writeFile(b.metadataFile,JSON.stringify(atlas()));
  await fs.writeFile(b.registrationFile,Buffer.alloc(2*1024*1024+1,32));
  await assert.rejects(importActorMotion(b.root,b.metadataFile,b.registrationFile),/size limit/);
  await fs.writeFile(b.registrationFile,JSON.stringify(registration()));
  for(const bytes of [Buffer.alloc(16*1024*1024+1),Buffer.from('not png'),b.bytes.subarray(0,40),
    await sharp({create:{width:8,height:4,channels:3,background:'#ffffff'}}).png().toBuffer()]) {
    await fs.writeFile(b.pngFile,bytes);await assert.rejects(importActorMotion(b.root,b.metadataFile,b.registrationFile));
  }
});
test('source PNG symlinks are rejected and list skips directory symlinks',async t=>{
  const b=await bundle(t),real=path.join(b.source,'real.png');await fs.rename(b.pngFile,real);
  try {await fs.symlink(real,b.pngFile,'file');}catch(error){if((error as NodeJS.ErrnoException).code==='EPERM'){t.skip('Windows file symlink privilege unavailable');return;}throw error;}
  await assert.rejects(importActorMotion(b.root,b.metadataFile,b.registrationFile),/symlink/);
  await fs.unlink(b.pngFile);await fs.rename(real,b.pngFile);
  await importActorMotion(b.root,b.metadataFile,b.registrationFile);
  await fs.symlink(b.source,path.join(b.root,'assets/motions/linked'),'junction');
  assert.equal((await listActorMotions(b.root)).length,1);
});
for(const selection of ['metadata','registration'] as const) {
  for(const ancestor of [false,true])test(`${selection} selection rejects ${ancestor?'ancestor':'parent'} directory junction before publication`,async t=>{
    const b=await bundle(t),link=path.join(b.root,'source-link');
    await fs.symlink(ancestor?b.root:b.source,link,'junction');
    const selectedRoot=ancestor?path.join(link,'bundle'):link;
    const metadataFile=selection==='metadata'?path.join(selectedRoot,path.basename(b.metadataFile)):b.metadataFile;
    const registrationFile=selection==='registration'?path.join(selectedRoot,path.basename(b.registrationFile)):b.registrationFile;
    await assert.rejects(importActorMotion(b.root,metadataFile,registrationFile),/symlink/);
    await assert.rejects(fs.access(path.join(b.root,'assets')),{code:'ENOENT'});
  });
}
test('expanded manifest above the read limit is rejected before either output is published',async t=>{
  const b=await bundle(t),limit=2*1024*1024;
  const makeMetadata=(landmarkCount:number)=>({game_input:'atlas.png',
    frame_layout:{rows:{walk:Array.from({length:512},()=>({x:0,y:0,w:4,h:4}))}},
    animation:{rows:{walk:{frames:512,loop:true,durations_ms:Array.from({length:512},()=>1)}}},
    rig:{landmarks:{walk:Array.from({length:512},()=>Object.fromEntries(
      Array.from({length:landmarkCount},(_,i)=>[`p${String(i).padStart(3,'0')}`,[1,2]])))}}});
  const reg=registration();reg.requiredLandmarks=[];
  await fs.writeFile(b.registrationFile,JSON.stringify(reg));
  // Both inputs fit the source bound; only the larger descriptor crosses the saved-manifest bound.
  const oversized=makeMetadata(200),sourceBytes=Buffer.from(JSON.stringify(oversized));
  assert.ok(sourceBytes.length<limit);
  const motion=normalizeSpriteMotion(oversized,{width:8,height:4,hash:hash(b.bytes)},reg,hash(sourceBytes));
  assert.ok(Buffer.byteLength(JSON.stringify(motion)+'\n')>limit);
  await fs.writeFile(b.metadataFile,sourceBytes);
  await assert.rejects(importActorMotion(b.root,b.metadataFile,b.registrationFile),/manifest exceeds size limit/);
  await assert.rejects(fs.access(path.join(b.root,'assets')),{code:'ENOENT'});
  // The smaller expansion remains importable and loadable using the unchanged 2 MiB read bound.
  const accepted=makeMetadata(180),acceptedBytes=Buffer.from(JSON.stringify(accepted));
  const acceptedMotion=normalizeSpriteMotion(accepted,{width:8,height:4,hash:hash(b.bytes)},reg,hash(acceptedBytes));
  assert.ok(Buffer.byteLength(JSON.stringify(acceptedMotion)+'\n')<limit);
  await fs.writeFile(b.metadataFile,acceptedBytes);
  const saved=await importActorMotion(b.root,b.metadataFile,b.registrationFile);
  assert.deepEqual(await loadActorMotion(b.root,saved.id,saved.fingerprint),saved);
});
test('output directory junctions cannot redirect immutable writes',async t=>{
  const b=await bundle(t),outside=path.join(b.root,'outside');await fs.mkdir(outside);
  await fs.symlink(outside,path.join(b.root,'assets'),'junction');
  await assert.rejects(importActorMotion(b.root,b.metadataFile,b.registrationFile),/symlink/);
  assert.deepEqual(await fs.readdir(outside),[]);
});
test('list verifies stored versions through load and surfaces corruption',async t=>{
  const b=await bundle(t),motion=await importActorMotion(b.root,b.metadataFile,b.registrationFile);
  await fs.writeFile(path.join(b.root,motion.sheet.path),Buffer.from('corrupt'));
  await assert.rejects(listActorMotions(b.root));
});
test('list is empty for missing storage and refuses more than 256 versions',async t=>{
  const b=await bundle(t);assert.deepEqual(await listActorMotions(b.root),[]);
  for(let i=0;i<257;i++) {
    const reg=registration();reg.id=`motion-${i}`;await fs.writeFile(b.registrationFile,JSON.stringify(reg));
    await importActorMotion(b.root,b.metadataFile,b.registrationFile);
  }
  await assert.rejects(listActorMotions(b.root),/256/);
});
