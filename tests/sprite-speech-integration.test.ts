// NOT RUN. Temporary PNG/manifest/Studio source inspections execute only in delegated callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {importedSpeechFixture} from './sprite-speech-support.js';
import {spriteSpeechStageFixture} from './sprite-speech-stage-support.js';
import {importActorSpeech,actorSpeechSheetBytes} from '../packages/motion/speech-import.js';
import {loadSpriteSceneMotions,loadSpriteSceneSpeech} from '../packages/motion/scene-source.js';
import {spriteMotionKey} from '../packages/motion/stage.js';
import {spriteSpeechKey} from '../packages/motion/speech-schemas.js';
import {loadSpriteMotionCatalog,saveSpriteMotionCatalog,validateSpriteCatalogSelection,SPRITE_CATALOG_INPUT} from '../packages/motion/catalog.js';
import {SpriteMotionCatalogSchema,type SpriteMotionCatalog} from '../packages/motion/catalog-schemas.js';
import {importActorMotion} from '../packages/motion/import.js';
import {motionLibraryMarkup} from '../apps/studio/src/motion-library.js';
import {motionWorkbench} from '../packages/motion/workbench.js';

test('scene loaders verify exact selected mouth/native identities and preserve PNG bytes',async t=>{
  const native=await importedSpeechFixture(t),variant=await importActorSpeech(native.root,native.speechSheet,native.registrationFile),f=spriteSpeechStageFixture();
  f.clip.motionId=native.motion.id;f.clip.fingerprint=native.motion.fingerprint;f.clip.speech={variantId:variant.id,fingerprint:variant.fingerprint,segmentIds:['s1']};
  const motions=await loadSpriteSceneMotions(native.root,f.shot),speech=await loadSpriteSceneSpeech(native.root,f.shot,motions);
  assert.equal(motions!.get(spriteMotionKey(native.motion.id,native.motion.fingerprint))!.actorId,'lila');
  assert.deepEqual(await actorSpeechSheetBytes(native.root,speech!.get(spriteSpeechKey(variant.id,variant.fingerprint))!),native.speechBytes);
  await fs.writeFile(path.join(native.root,variant.sheet.path),'corrupt');await assert.rejects(loadSpriteSceneSpeech(native.root,f.shot,motions));
});

test('catalog exposes only verified exact native-linked mouth artwork and selection cannot invent versions',async t=>{
  const f=await importedSpeechFixture(t),variant=await importActorSpeech(f.root,f.speechSheet,f.registrationFile),scene=spriteSpeechStageFixture();
  scene.clip.motionId=f.motion.id;scene.clip.fingerprint=f.motion.fingerprint;scene.clip.speech={variantId:variant.id,fingerprint:variant.fingerprint,segmentIds:['s1']};
  const catalog:SpriteMotionCatalog={version:'actor-motion-catalog-1',entries:[{motionId:f.motion.id,fingerprint:f.motion.fingerprint,label:'Speak while standing',capabilities:[{kind:'hold'}],speechVariants:[{variantId:variant.id,fingerprint:variant.fingerprint}]}]};
  const saved=await saveSpriteMotionCatalog(f.root,catalog,null);assert.equal(saved.entries[0]!.mouthArtwork![0]!.sheetHash,variant.sheet.hash);assert.equal(saved.entries[0]!.mouthArtwork![0]!.productionReady,false);
  assert.deepEqual(await loadSpriteMotionCatalog(f.root),saved);assert.doesNotThrow(()=>validateSpriteCatalogSelection({shots:[scene.shot]},saved,'sprite'));
  scene.clip.speech.fingerprint='f'.repeat(64);assert.throws(()=>validateSpriteCatalogSelection({shots:[scene.shot]},saved,'sprite'),/outside its exact native/);
});

test('cross-native catalog mouth association fails before publication and duplicate/oversized links fail parse',async t=>{
  const f=await importedSpeechFixture(t),variant=await importActorSpeech(f.root,f.speechSheet,f.registrationFile);
  const registration=path.join(f.input,'native-registration.json'),native=JSON.parse(await fs.readFile(registration,'utf8'));native.id='different-native';await fs.writeFile(registration,JSON.stringify(native));
  const other=await importActorMotion(f.root,path.join(f.input,'native.strip.json'),registration);
  const entry={motionId:other.id,fingerprint:other.fingerprint,label:'Wrong pose',capabilities:[{kind:'hold' as const}],speechVariants:[{variantId:variant.id,fingerprint:variant.fingerprint}]};
  await assert.rejects(saveSpriteMotionCatalog(f.root,{version:'actor-motion-catalog-1',entries:[entry]},null),/identity\/layout/);
  await assert.rejects(fs.stat(path.join(f.root,SPRITE_CATALOG_INPUT)),/ENOENT/);
  assert.throws(()=>SpriteMotionCatalogSchema.parse({version:'actor-motion-catalog-1',entries:[{...entry,speechVariants:[...entry.speechVariants,...entry.speechVariants]}]}),/Duplicate speech version/);
  assert.throws(()=>SpriteMotionCatalogSchema.parse({version:'actor-motion-catalog-1',entries:[{...entry,speechVariants:Array.from({length:17},()=>entry.speechVariants[0])}]}));
});

test('Studio refuses unseen registered mouth versions rather than deleting their annotations',async t=>{
  const f=await importedSpeechFixture(t),variant=await importActorSpeech(f.root,f.speechSheet,f.registrationFile),catalog:SpriteMotionCatalog={version:'actor-motion-catalog-1',entries:[{motionId:f.motion.id,fingerprint:f.motion.fingerprint,label:'Stand',capabilities:[{kind:'hold'}],speechVariants:[{variantId:variant.id,fingerprint:variant.fingerprint}]}]};
  const snapshot=await saveSpriteMotionCatalog(f.root,catalog,null);
  assert.throws(()=>motionLibraryMarkup('own-project',snapshot,[f.motion],'en',[]),/changed while opening/);
  const markup=motionLibraryMarkup('own-project',snapshot,[f.motion],'en',[variant]);assert.match(markup,/motion-mouth-0/);assert.match(markup,/Preview rest \/ open/);assert.match(markup,/speech-import-form/);
  assert.equal((markup.match(/<form\b/g)??[]).length,2);assert.equal((markup.match(/<\/form>/g)??[]).length,2);
});

test('candidate mouth workbench labels diagnostic timing while native workbench stays speech-free',()=>{
  const f=spriteSpeechStageFixture(),motion=f.motions.values().next().value!,variant=f.variants.values().next().value!;
  const old=motionWorkbench(motion),preview=motionWorkbench(motion,1,variant);
  assert.equal(old.report.speechSync,'none');assert.doesNotMatch(old.html,/diagnostic-rest-open|native-sheet/);
  assert.match(preview.html,/diagnostic-rest-open/);assert.match(preview.html,/No narration or audio/);assert.equal(preview.report.productionReady,false);
});
