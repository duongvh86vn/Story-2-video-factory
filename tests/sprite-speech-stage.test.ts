// NOT RUN by implementer. Fixtures, GSAP/source compiler and assertions are delegated.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spriteSpeechStageFixture} from './sprite-speech-stage-support.js';
import {compileSpriteStoryActors,validateSpriteStoryBinding} from '../packages/motion/story-stage.js';
import {compileSpriteStage,createSpriteStageSpeechSampler,spriteMotionKey} from '../packages/motion/stage.js';
import {spriteSpeechKey} from '../packages/motion/speech-schemas.js';
import {validateSpriteSpeechCoverage} from '../packages/motion/speech-binding.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {validateSceneScript,validateSceneFiles,secureSceneFiles} from '../packages/scenes/security.js';
import {validateStoryActingCoverage} from '../packages/director/story-coverage.js';
import {assertNoCandidateSpriteActors} from '../packages/motion/scene-validation.js';
import {hash} from '../packages/core/utils.js';

test('two actors speak only in their owned original cue and audio windows, including silence and reverse seek',()=>{
  const f=spriteSpeechStageFixture(true),sample=createSpriteStageSpeechSampler(f.plan,f.motions,f.context);
  const states=(ms:number)=>sample(ms).map(actor=>[actor.actorId,'speech' in actor?actor.speech.open:false]);
  assert.deepEqual(states(0),[['lila',true],['karo',false]]);assert.deepEqual(states(250),[['lila',false],['karo',false]]);
  assert.deepEqual(states(500),[['lila',false],['karo',true]]);assert.deepEqual(states(550),[['lila',false],['karo',false]]);
  assert.deepEqual(states(800),[['lila',false],['karo',true]]);assert.deepEqual(states(1000),[]);
  const times=[0,249.999,250,400,500,550,800,999,1000];assert.deepEqual(times.map(states),times.slice().reverse().map(states).reverse());
  const output=compileSpriteStoryActors(f.shot,f.plan,f.motions,new Map(),f.context);
  assert.equal(output.report.speechSync,'audio-activity');assert.equal(output.report.productionReady,false);
  assert.deepEqual(output.report.clips.map(clip=>clip.speech?.segmentIds),[['s1'],['s2']]);
});

test('duplicate speaker ownership, stolen cue IDs and missing source-linked artwork remain blockers',()=>{
  const f=spriteSpeechStageFixture(true),scene=f.shot.cinematic!.actorScene!;
  scene.supporting[0]!.speakingSegmentIds=['s1'];assert.throws(()=>validateSpriteStoryBinding(f.shot,f.plan),/duplicate actor ownership/);
  scene.supporting[0]!.speakingSegmentIds=['s2'];f.clip.speech!.segmentIds=['s2'];assert.throws(()=>validateSpriteStoryBinding(f.shot,f.plan),/another actor or shot/);
  f.clip.speech!.segmentIds=['s1'];f.clip.sourceRefs=[f.shot.sourceRefs![1]!];assert.throws(()=>validateSpriteStoryBinding(f.shot,f.plan),/source evidence/);
  f.clip.sourceRefs=f.shot.sourceRefs!;delete f.clip.speech;assert.throws(()=>validateSpriteStoryBinding(f.shot,f.plan),/needs-sprite-speech/);
});

test('full cue may cross adjacent native clips but a hidden gap is never excused by silence',()=>{
  const f=spriteSpeechStageFixture(),second=structuredClone(f.clip);
  f.clip.endMs=500;f.clip.root[1]!.timeMs=500;second.id='clip2';second.startMs=500;second.root[0]!.timeMs=500;f.plan.actors[0]!.clips.push(second);
  assert.doesNotThrow(()=>compileSpriteStoryActors(f.shot,f.plan,f.motions,new Map(),f.context));
  second.startMs=500.0002;second.root[0]!.timeMs=second.startMs;
  assert.throws(()=>compileSpriteStoryActors(f.shot,f.plan,f.motions,new Map(),f.context),/hidden actor gap/);
});

test('a once/hide native pose cannot disappear during its longer original speech cue',()=>{
  const f=spriteSpeechStageFixture(),motion=f.motions.values().next().value!;motion.playback={mode:'once',end:'hide'};
  f.activity.intervals=[{startMs:2000,endMs:2100,level:.6}];
  assert.throws(()=>compileSpriteStoryActors(f.shot,f.plan,f.motions,new Map(),f.context),/complete original cue/);
});

test('missing voice context, mismatched native artwork and shifted narration clock cannot fall back',()=>{
  const f=spriteSpeechStageFixture();assert.throws(()=>compileSpriteStoryActors(f.shot,f.plan,f.motions,new Map()),/speech-context/);
  assert.throws(()=>compileSpriteStoryActors(f.shot,f.plan,f.motions,new Map(),{...f.context,shotStartMs:0}),/clock must match/);
  assert.throws(()=>compileSpriteStage(f.plan,f.motions,new Map(),{...f.context,variants:new Map()}),/speech-artwork/);
  const variant=f.variants.values().next().value!;variant.actorId='karo';assert.throws(()=>compileSpriteStage(f.plan,f.motions,new Map(),f.context),/identity\/layout/);
});

test('timed speech rejects unknown cues, non-overlapping bindings and edited original quotes',()=>{
  const f=spriteSpeechStageFixture();f.narration.segments[0]!.id='other';assert.throws(()=>validateSpriteSpeechCoverage(f.shot,f.plan,f.motions,f.narration),/original speech cue/);
  f.narration.segments[0]!.id='s1';f.narration.segments[0]!.text='Different words';assert.throws(()=>validateSpriteSpeechCoverage(f.shot,f.plan,f.motions,f.narration),/quote differs/);
  f.narration.segments[0]!.text='Lila speaks.';f.narration.segments[0]!.startMs=0;f.narration.segments[0]!.endMs=100;
  assert.throws(()=>validateSpriteSpeechCoverage(f.shot,f.plan,f.motions,f.narration),/does not overlap/);
});

test('owned sampler snapshots resist later source map/activity/clip mutation',()=>{
  const f=spriteSpeechStageFixture(),sample=createSpriteStageSpeechSampler(f.plan,f.motions,f.context),before=sample(100);
  f.clip.placement.x=0;f.activity.intervals=[];f.motions.clear();f.variants.clear();
  assert.deepEqual(sample(100),before);
});

test('stage event cap counts mouth transitions across independent actors before publication',()=>{
  const f=spriteSpeechStageFixture(),motion=f.motions.values().next().value!,variant=f.variants.values().next().value!;
  f.activity.intervals=Array.from({length:500},(_,i)=>({startMs:2000+i*2,endMs:2001+i*2,level:.7}));
  for(let n=1;n<8;n++){
    const actorId=`actor${n}`,native={...structuredClone(motion),id:`native${n}`,actorId},mouth={...structuredClone(variant),id:`mouth${n}`,actorId,motionId:native.id};
    const clip={...structuredClone(f.clip),id:`clip${n}`,motionId:native.id,speech:{...f.clip.speech!,variantId:mouth.id}};
    f.motions.set(spriteMotionKey(native.id,native.fingerprint),native);f.variants.set(spriteSpeechKey(mouth.id,mouth.fingerprint),mouth);f.plan.actors.push({actorId,clips:[clip]});
  }
  assert.throws(()=>compileSpriteStage(f.plan,f.motions,new Map(),f.context),/12000 timeline calls/);
});

test('canonical renderer uses both immutable artworks, real provenance and literal single-clock calls',()=>{
  const f=spriteSpeechStageFixture(),before=hash({shot:f.shot,narration:f.narration,activity:f.activity});
  const result=renderCinematic(f.shot,f.profile,f.rig,f.activity,f.config,undefined,f.narration,f.motions,f.variants);
  assert.ok('kind' in result.geometry);if(!('kind' in result.geometry))return;
  assert.ok('speechSync' in result.report);
  assert.equal(result.geometry.speech![0]!.audioHash,f.activity.audioHash);assert.equal(result.report.speechSync,'audio-activity');
  const variant=f.variants.values().next().value!,paths=[...f.motions.values(),variant].map(asset=>`assets/${asset.sheet.hash}.png`);
  assert.deepEqual(validateSceneFiles(secureSceneFiles(result.files),f.shot,f.config.workflow.max_scene_bytes,paths,f.config.rendering.final),[]);
  const js=result.files.files.find(file=>file.path==='scene.js')!.content;
  assert.deepEqual(validateSceneScript(js,f.shot.id),[]);assert.doesNotMatch(js,/requestAnimationFrame|setTimeout/);
  assert.equal(hash({shot:f.shot,narration:f.narration,activity:f.activity}),before);
  assert.throws(()=>assertNoCandidateSpriteActors({shots:[f.shot]}),/needs-sprite-acceptance/);
});

test('speech acting needs actual cue/artwork binding and does not borrow a native hold declaration',()=>{
  const f=spriteSpeechStageFixture(),intent=f.shot.cinematic!.sceneIntent!,beat={id:'beat1',chapterId:'chapter1',startMs:2000,endMs:3000,narrationText:'Lila speaks.',meaning:'Speak',visualGoal:'Show speaking',importance:1,segmentIds:['s1'],sceneIntent:intent};
  assert.doesNotThrow(()=>validateStoryActingCoverage({shots:[f.shot]},[beat],f.narration));
  delete f.clip.speech;assert.throws(()=>validateStoryActingCoverage({shots:[f.shot]},[beat],f.narration),/needs-motion/);
});

test('segment draft is labelled and speech-free canonical scenes preserve legacy output even with unused variants',()=>{
  const f=spriteSpeechStageFixture(),draft={method:'segment-draft' as const,windowMs:20,intervals:[]};
  const spoken=renderCinematic(f.shot,f.profile,f.rig,draft,f.config,undefined,f.narration,f.motions,f.variants);assert.ok('speechSync' in spoken.report);assert.equal(spoken.report.speechSync,'segment-draft');
  delete f.clip.speech;f.shot.cinematic!.actorScene!.speakingSegmentIds=[];
  const plain=renderCinematic(f.shot,f.profile,f.rig,draft,f.config,undefined,f.narration,f.motions),extra=renderCinematic(f.shot,f.profile,f.rig,draft,f.config,undefined,f.narration,f.motions,f.variants);
  assert.deepEqual(extra,plain);
});
