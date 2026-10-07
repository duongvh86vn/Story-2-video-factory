// Runtime delegated: fixtures, filesystem calls and assertions run only in test callbacks.
import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import YAML from 'yaml';
import {z} from 'zod';
import {temporary} from './support.js';
import {hash} from '../packages/core/utils.js';
import {ConfigSchema,loadConfig} from '../packages/core/config.js';
import type {Storyboard} from '../packages/core/schemas.js';
import {SpriteMotionCatalogSchema,SPRITE_CATALOG_VERSION,type SpriteMotionCatalog} from '../packages/motion/catalog-schemas.js';
import {loadSpriteMotionCatalog,saveSpriteMotionCatalog,validateSpriteCatalogSelection,validateLoadedSpriteCatalog,SPRITE_CATALOG_INPUT} from '../packages/motion/catalog.js';
import {importActorMotion} from '../packages/motion/import.js';
import {spriteMotionKey} from '../packages/motion/stage.js';
import {motionLibraryMarkup} from '../apps/studio/src/motion-library.js';
import {planWithValidation} from '../packages/story/request.js';
import type {ModelRouter} from '../packages/models/registry.js';

async function fixture(t:TestContext){
  const root=await temporary(t),input=path.join(root,'input');await fs.mkdir(input,{recursive:true});
  const bytes=await sharp({create:{width:20,height:20,channels:4,background:{r:240,g:100,b:20,alpha:.8}}}).png().toBuffer();
  await fs.writeFile(path.join(input,'idle.strip.png'),bytes);
  const metadata=path.join(input,'idle.strip.json'),registration=path.join(input,'registration.json');
  await fs.writeFile(metadata,JSON.stringify({frames:1,w:20,h:20,delay_ms:180,loop:true}));
  await fs.writeFile(registration,JSON.stringify({version:'actor-motion-registration-1',id:'lila-idle',actorId:'lila',state:'idle',view:'right',referenceHash:'a'.repeat(64),playback:{mode:'loop',end:'hold'},anchor:{x:10,y:20},requiredLandmarks:[],landmarks:[{hand_left:{x:1,y:12}}],notes:[]}));
  const motion=await importActorMotion(root,metadata,registration);
  const catalog:SpriteMotionCatalog={version:SPRITE_CATALOG_VERSION,entries:[{motionId:motion.id,fingerprint:motion.fingerprint,label:'Wait',capabilities:[{kind:'hold'}]}]};
  const board={shots:[{id:'shot1',cinematic:{actorScene:{primary:{id:'lila'},supporting:[]},spriteStage:{actors:[{actorId:'lila',clips:[{id:'clip1',motionId:motion.id,fingerprint:motion.fingerprint,sourcedAction:{kind:'hold',statement:'Lila waits.',motionState:'idle'}}]}]}}}]} as unknown as Storyboard;
  return {root,motion,catalog,board,bytes};
}

test('missing catalog is empty with null revision and cannot enable explicit image motion',async t=>{
  const root=await temporary(t),snapshot=await loadSpriteMotionCatalog(root);
  assert.equal(snapshot.revision,null);assert.deepEqual(snapshot.entries,[]);
  assert.throws(()=>validateSpriteCatalogSelection({shots:[]},snapshot,'sprite'),/needs-motion-library/);
});

test('catalog keeps exact versions and rejects duplicate or unsupported capability claims',async t=>{
  const f=await fixture(t);
  assert.throws(()=>SpriteMotionCatalogSchema.parse({...f.catalog,entries:[...f.catalog.entries,...f.catalog.entries]}),/Duplicate motion version/);
  for(const capability of [{kind:'speech'},{kind:'unsupported'},{kind:'hold',movement:'run'},{kind:'posture',operation:'drop'}])
    assert.throws(()=>SpriteMotionCatalogSchema.parse({...f.catalog,entries:[{...f.catalog.entries[0],capabilities:[capability]}]}));
  assert.throws(()=>SpriteMotionCatalogSchema.parse({...f.catalog,entries:[{...f.catalog.entries[0],capabilities:[{kind:'hold'},{kind:'hold'}]}]}),/Duplicate motion capability/);
});

test('saving catalog resolves native metadata without changing source pixels, manifest or approval',async t=>{
  const f=await fixture(t),manifest=path.join(f.root,'assets/motions',f.motion.id,f.motion.fingerprint,'manifest.json'),before=await fs.readFile(manifest);
  const saved=await saveSpriteMotionCatalog(f.root,f.catalog,null),entry=saved.entries[0]!;
  assert.equal(entry.nativeDurationMs,180);assert.equal(entry.actorId,'lila');assert.equal(entry.view,'right');assert.deepEqual(entry.frameBounds,{left:-10,right:10,top:-20,bottom:0});
  assert.deepEqual(entry.commonLandmarks,['hand_left']);assert.equal(entry.productionReady,false);assert.equal(entry.status,'candidate');
  assert.deepEqual(await fs.readFile(manifest),before);assert.deepEqual(await fs.readFile(path.join(f.root,f.motion.sheet.path)),f.bytes);
  assert.equal(saved.revision,hash(await fs.readFile(path.join(f.root,SPRITE_CATALOG_INPUT))));
  assert.deepEqual(await loadSpriteMotionCatalog(f.root),saved);
});

test('stale revision preserves another catalog edit and immutable asset',async t=>{
  const f=await fixture(t),first=await saveSpriteMotionCatalog(f.root,f.catalog,null),changed=structuredClone(f.catalog);changed.entries[0]!.label='Waiting';
  const second=await saveSpriteMotionCatalog(f.root,changed,first.revision);
  await assert.rejects(saveSpriteMotionCatalog(f.root,f.catalog,first.revision),/REVISION_CONFLICT/);
  assert.deepEqual((await loadSpriteMotionCatalog(f.root)).document,changed);assert.notEqual(first.revision,second.revision);
  assert.deepEqual(await fs.readFile(path.join(f.root,f.motion.sheet.path)),f.bytes);
});

test('unknown version or corrupt immutable sheet rejects save/load rather than silently omitting entries',async t=>{
  const f=await fixture(t),wrong=structuredClone(f.catalog);wrong.entries[0]!.fingerprint='b'.repeat(64);
  await assert.rejects(saveSpriteMotionCatalog(f.root,wrong,null));
  await assert.rejects(fs.stat(path.join(f.root,SPRITE_CATALOG_INPUT)),/ENOENT/);
  await saveSpriteMotionCatalog(f.root,f.catalog,null);await fs.writeFile(path.join(f.root,f.motion.sheet.path),'corrupt');
  await assert.rejects(loadSpriteMotionCatalog(f.root));
});

test('bounded catalog reader rejects oversized JSON before parsing and malformed input remains an error',async t=>{
  const root=await temporary(t);await fs.mkdir(path.join(root,'input'));
  await fs.writeFile(path.join(root,SPRITE_CATALOG_INPUT),Buffer.alloc(2*1024*1024+1));await assert.rejects(loadSpriteMotionCatalog(root),/2 MiB/);
  await fs.writeFile(path.join(root,SPRITE_CATALOG_INPUT),'not JSON');await assert.rejects(loadSpriteMotionCatalog(root));
});

test('clip selection binds actor, exact version/state and capability while retaining source statement',async t=>{
  const f=await fixture(t),snapshot=await saveSpriteMotionCatalog(f.root,f.catalog,null),before=JSON.stringify(f.board);
  assert.doesNotThrow(()=>validateSpriteCatalogSelection(f.board,snapshot,'sprite'));assert.equal(JSON.stringify(f.board),before);
  const actor=f.board.shots[0]!.cinematic!.spriteStage!.actors[0]!,clip=actor.clips[0]!;
  actor.actorId='karo';assert.throws(()=>validateSpriteCatalogSelection(f.board,snapshot,'sprite'),/actor's registered/);actor.actorId='lila';
  clip.fingerprint='b'.repeat(64);assert.throws(()=>validateSpriteCatalogSelection(f.board,snapshot,'sprite'),/registered/);clip.fingerprint=f.motion.fingerprint;
  clip.sourcedAction!.motionState='run';assert.throws(()=>validateSpriteCatalogSelection(f.board,snapshot,'sprite'),/capability/);clip.sourcedAction!.motionState='idle';
  clip.sourcedAction!.kind='locomotion';clip.sourcedAction!.movement='run';assert.throws(()=>validateSpriteCatalogSelection(f.board,snapshot,'sprite'),/capability/);
});

test('explicit renderer prevents silent fallback; absent field retains earlier authored opt-in',async t=>{
  const f=await fixture(t),snapshot=await saveSpriteMotionCatalog(f.root,f.catalog,null);
  assert.throws(()=>validateSpriteCatalogSelection(f.board,snapshot,'rig'),/rig selection/);
  const plan=f.board.shots[0]!.cinematic!.spriteStage;delete f.board.shots[0]!.cinematic!.spriteStage;
  assert.throws(()=>validateSpriteCatalogSelection(f.board,snapshot,'sprite'),/no rig fallback/);
  f.board.shots[0]!.cinematic!.spriteStage=plan;
  assert.doesNotThrow(()=>validateSpriteCatalogSelection(f.board,{...snapshot,revision:null,entries:[]}));
});

test('scene selection revalidates only consumed descriptors and catalog edits invalidate its identity',async t=>{
  const f=await fixture(t),saved=await saveSpriteMotionCatalog(f.root,f.catalog,null),motions=new Map([[spriteMotionKey(f.motion.id,f.motion.fingerprint),f.motion]]);
  const first=await validateLoadedSpriteCatalog(f.root,f.board.shots[0]!,motions);
  const changed=structuredClone(f.catalog);changed.entries[0]!.label='Wait in forest';await saveSpriteMotionCatalog(f.root,changed,saved.revision);
  assert.notEqual(await validateLoadedSpriteCatalog(f.root,f.board.shots[0]!,motions),first);
  await assert.rejects(validateLoadedSpriteCatalog(f.root,f.board.shots[0]!,new Map()),/registered/);
});

test('legacy config gains no renderer key and sprite requires narrated cinematic actors',async t=>{
  assert.ok(!Object.hasOwn(ConfigSchema.parse({}).presentation,'actor_renderer'));
  const root=await temporary(t);await fs.writeFile(path.join(root,'project.yaml'),YAML.stringify({presentation:{actor_renderer:'sprite'}}));
  await assert.rejects(loadConfig(root),/Image motion requires/);
  await fs.writeFile(path.join(root,'project.yaml'),YAML.stringify({presentation:{mode:'story-cinematic',character_mode:'actors',actor_renderer:'sprite'}}));
  assert.equal((await loadConfig(root)).presentation.actor_renderer,'sprite');
});

test('library UI preserves all typed capabilities and escapes labels and version text',async t=>{
  const f=await fixture(t);f.catalog.entries[0]!.label='<img src=x onerror=alert(1)>';
  f.catalog.entries[0]!.capabilities=[{kind:'hold'},{kind:'locomotion',movement:'run'},{kind:'manipulation',operation:'drop'}];
  const snapshot=await saveSpriteMotionCatalog(f.root,f.catalog,null),html=motionLibraryMarkup('fixture',snapshot,[f.motion],'en');
  assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img src=x/);assert.equal((html.match(/checked/g)??[]).length,3);
  assert.match(html,/Labels do not approve/);assert.match(html,/\/preview/);assert.doesNotMatch(html,/approved motion/);
});

test('catalog snapshot participates in accepted planning reuse while narration context remains unchanged',async t=>{
  const f=await fixture(t),config=ConfigSchema.parse({retry:{structured_output:0}}),first=await saveSpriteMotionCatalog(f.root,f.catalog,null);
  let calls=0;const router={structured:async()=>({value:++calls})} as unknown as ModelRouter;
  const narration={text:'Lila waits.',clock:[0,1000]},narrationHash=hash(narration),schema=z.object({value:z.number()});
  const plan=async(snapshotHash:string)=>planWithValidation(f.root,config,router,'storyboard','catalog-reuse',{system:'Choose exact registered motions',prompt:'Preserve narration',context:{narration,motionLibrary:{snapshotHash}}},schema,async value=>value,{source:'same narration'},undefined,{reuseAccepted:true});
  assert.equal((await plan(first.snapshotHash)).value,1);assert.equal((await plan(first.snapshotHash)).value,1);assert.equal(calls,1);
  const changed=structuredClone(f.catalog);changed.entries[0]!.label='Waiting in forest';const second=await saveSpriteMotionCatalog(f.root,changed,first.revision);
  assert.equal((await plan(second.snapshotHash)).value,2);assert.equal(calls,2);assert.equal(hash(narration),narrationHash);
});

test('library UI refuses an incomplete version listing instead of silently deleting unseen annotations',async t=>{
  const f=await fixture(t),snapshot=await saveSpriteMotionCatalog(f.root,f.catalog,null);
  assert.throws(()=>motionLibraryMarkup('fixture',snapshot,[],'en'),/changed while opening/);
  assert.throws(()=>motionLibraryMarkup('fixture',snapshot,[{...f.motion,fingerprint:'b'.repeat(64)}],'en'),/changed while opening/);
  assert.doesNotThrow(()=>motionLibraryMarkup('fixture',snapshot,[f.motion],'en'));
  assert.deepEqual(snapshot.document,f.catalog);
});
