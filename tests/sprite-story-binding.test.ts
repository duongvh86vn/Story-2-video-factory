// Runtime delegated: no fixture construction, assertions or compile outside callbacks.
import assert from 'node:assert/strict';
import test from 'node:test';
import {compileSpriteStoryActors} from '../packages/motion/story-stage.js';
import {spriteMotionKey} from '../packages/motion/stage.js';
import {SPRITE_STAGE_VERSION,type SpriteStage} from '../packages/motion/stage-schemas.js';
import type {ActorMotion} from '../packages/motion/schemas.js';
import {ShotSchema} from '../packages/core/schemas.js';
import {DIRECTION_VERSION} from '../packages/director/schemas.js';
import {ANIMATION_VERSION} from '../packages/animation/schemas.js';

function fixture(){
  const ref={kind:'narration' as const,segmentId:'s1',quote:'Lila walks.'},hash='a'.repeat(64);
  const motion:ActorMotion={version:'actor-motion-1',id:'lila-walk',actorId:'lila',state:'walk',view:'right',fingerprint:hash,
    source:{kind:'sprite-gen-strip',metadataHash:hash,sheetHash:hash,registrationHash:hash,referenceHash:hash,loop:true},
    sheet:{path:'sheet.png',hash,width:20,height:20},playback:{mode:'loop',end:'hold'},
    frames:[{rect:{x:0,y:0,w:20,h:20},durationMs:100,anchor:{x:10,y:20},landmarks:{hand:{x:10,y:20}}}],review:{status:'candidate',productionReady:false,warnings:[]}};
  const transform={x:0,y:0,scale:1,rotation:0};
  const plan:SpriteStage={version:1,producer:SPRITE_STAGE_VERSION,id:'shot1',durationMs:1000,stage:{width:1280,height:720},actors:[{actorId:'lila',clips:[{id:'clip1',compositionId:'shot1',motionId:motion.id,fingerprint:hash,startMs:0,endMs:1000,rate:1,placement:transform,sourceRefs:[ref],root:[{timeMs:0,transform,ease:'none'},{timeMs:1000,transform,ease:'none'}]}]}],contacts:[]};
  const character={id:'lila',name:'Lila',role:'walks',kind:'stick-man',identity:'fictional',sourceRefs:[ref],appearance:{outline:'#000000',shell:'#774020',screen:'#FFFFFF',accent:'#FF8800',badge:'#337722',headScale:1,bodyScale:1,strokeWidth:5}};
  const performance={version:22,compilerVersion:ANIMATION_VERSION,id:'shot1',leadCharacterId:'lila',profileHash:hash,kind:'stick-man',durationMs:1000,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:0,y:550},scale:1,walks:[],gestures:[],expressions:[],gazes:[],props:[]};
  const shot=ShotSchema.parse({id:'shot1',startMs:2000,endMs:3000,beatIds:['beat1'],sceneType:'character-scene',subject:'Lila walks',visualDescription:'A walk',camera:{shotSize:'wide',movement:'locked',angle:'eye-level'},sourceRefs:[ref],narrationSegmentIds:['s1'],characters:['lila'],cinematic:{version:22,producer:DIRECTION_VERSION,shotId:'shot1',leadCharacterId:'lila',motivation:'Walk',sourceRefs:[ref],setting:'forest',provenance:'illustration',actorScene:{primary:character,speakingSegmentIds:[],supporting:[],continuity:'cut'},sceneIntent:{participants:[{id:'lila',name:'Lila',role:'walks',identity:'fictional',sourceRefs:[ref]}],action:'Lila walks.',objective:'Walk',sourceRefs:[ref]},models:[],propBindings:[],continuity:{entry:{x:0,y:550},exit:{x:0,y:550},facing:'front',carriedProps:[],models:[]},camera:{framing:'wide',movement:'locked',anchor:{x:640,y:400},startScale:1,endScale:1},performance}});
  return {shot,plan,motions:new Map([[spriteMotionKey(motion.id,hash),motion]]),targets:new Map<string,{x:number;y:number}>()};
}

test('story binding preserves absolute narration clock, original references and cast identity',()=>{
  const {shot,plan,motions,targets}=fixture(),before=JSON.stringify(shot),result=compileSpriteStoryActors(shot,plan,motions,targets);
  assert.equal(JSON.stringify(shot),before);assert.equal(result.report.shotStartMs,2000);assert.equal(result.report.durationMs,1000);
  assert.deepEqual(result.report.sourceRefs,shot.sourceRefs);assert.equal(result.report.productionReady,false);
  assert.equal(result.report.sourceEvidence,'shot-references-only');assert.equal(result.report.speechSync,'none');
  assert.equal(result.report.shotHash.length,64);assert.equal(result.report.castHash.length,64);
  const changed=structuredClone(shot);changed.cinematic!.actorScene!.primary!.name='A different name';
  assert.notEqual(compileSpriteStoryActors(changed,plan,motions,targets).report.castHash,result.report.castHash);
});

test('cannot add or substitute actors, including a narrator posing as a story actor',()=>{
  const {shot,plan,motions,targets}=fixture();plan.actors[0]!.actorId='narrator';
  assert.throws(()=>compileSpriteStoryActors(shot,plan,motions,targets),/exact story cast/);
  plan.actors[0]!.actorId='lila';shot.cinematic!.actorScene!.supporting.push({character:structuredClone(shot.cinematic!.actorScene!.primary!),performance:structuredClone(shot.cinematic!.performance),actions:[],speakingSegmentIds:[]});
  assert.throws(()=>compileSpriteStoryActors(shot,plan,motions,targets),/exact story cast/);
});

test('dialogue cannot claim baked sprites have mouth/audio synchronization',()=>{
  const {shot,plan,motions,targets}=fixture();shot.cinematic!.actorScene!.speakingSegmentIds=['s1'];
  assert.throws(()=>compileSpriteStoryActors(shot,plan,motions,targets),/needs-sprite-speech/);
});

test('clock and dimensions must match story instead of stretching audio to sprite duration',()=>{
  const {shot,plan,motions,targets}=fixture();shot.endMs=3001;
  assert.throws(()=>compileSpriteStoryActors(shot,plan,motions,targets),/clock\/dimensions mismatch/);shot.endMs=3000;
  plan.stage.width=1920;assert.throws(()=>compileSpriteStoryActors(shot,plan,motions,targets),/clock\/dimensions mismatch/);
});

test('invented source quotes and a narration reference outside the shot are rejected',()=>{
  const {shot,plan,motions,targets}=fixture(),ref=plan.actors[0]!.clips[0]!.sourceRefs[0]!;
  ref.quote='Lila hunts a machine.';assert.throws(()=>compileSpriteStoryActors(shot,plan,motions,targets),/unbound story source/);
  ref.quote='Lila walks.';shot.narrationSegmentIds=['s2'];assert.throws(()=>compileSpriteStoryActors(shot,plan,motions,targets),/unbound story source/);
});

test('contact target cannot be supplied only in a fake target map outside the actual scene',()=>{
  const {shot,plan,motions,targets}=fixture();targets.set('imaginary',{x:0,y:0});
  plan.contacts=[{id:'contact',actorId:'lila',clipId:'clip1',landmark:'hand',targetId:'imaginary',timeMs:100,maxErrorPx:1,sourceRefs:shot.sourceRefs!}];
  assert.throws(()=>compileSpriteStoryActors(shot,plan,motions,targets),/outside the story scene/);
});

test('missing cinematic cast and missing shot references cannot silently fall back to host',()=>{
  const {shot,plan,motions,targets}=fixture();delete shot.sourceRefs;
  assert.throws(()=>compileSpriteStoryActors(shot,plan,motions,targets),/requires shot source/);
  delete shot.cinematic;assert.throws(()=>compileSpriteStoryActors(shot,plan,motions,targets),/require a cinematic actorScene/);
});
