// Runtime/GSAP assertions are delegated, never executed in implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {hash} from '../packages/core/utils.js';
import {buildSpriteSpeechSchedule,createSpriteSpeechSampler,SpriteSpeechScheduleSchema} from '../packages/motion/speech-clock.js';
import {compileActorMotion,createActorSpeechSampler} from '../packages/motion/player.js';
import {validateSceneScript} from '../packages/scenes/security.js';
import {speechClockFixture} from './sprite-speech-support.js';
import {NarrationSchema} from '../packages/core/schemas.js';

test('original cues and measured audio produce clipped activity; adjacent windows merge and silence stays closed',()=>{
  const f=speechClockFixture(),before=JSON.stringify({n:f.narration,a:f.activity});
  assert.deepEqual(f.schedule.intervals,[{startMs:100,endMs:250},{startMs:500,endMs:700}]);
  assert.equal(f.schedule.audioHash,f.activity.audioHash);assert.equal(f.schedule.synchronization,'audio-activity');
  assert.equal(f.schedule.narrationHash,hash(NarrationSchema.parse(f.narration)));assert.equal(JSON.stringify({n:f.narration,a:f.activity}),before);
});
test('RMS needs original audio hash; segment drafts remain labelled rather than claimed phoneme sync',()=>{
  const f=speechClockFixture();delete f.activity.audioHash;assert.throws(()=>buildSpriteSpeechSchedule(f.narration,f.activity,f.schedule.slot),/audio hash/);
  f.activity.method='segment-draft';const schedule=buildSpriteSpeechSchedule(f.narration,f.activity,f.schedule.slot);
  assert.equal(schedule.synchronization,'segment-draft');assert.equal(schedule.audioHash,undefined);
  const out=compileActorMotion(f.motion,f.clip,undefined,{variant:f.variant,schedule});assert.equal(out.report.speechSync,'segment-draft');assert.equal(out.report.speech!.phonemeLipSync,false);
});
test('cue IDs, narration/slot boundaries and unordered or overlapping audio intervals cannot be invented',()=>{
  const f=speechClockFixture();
  for(const slot of [{...f.schedule.slot,segmentIds:['missing']},{...f.schedule.slot,segmentIds:['cue1','cue1']},{...f.schedule.slot,shotStartMs:2300},{...f.schedule.slot,startMs:1200}])
    assert.throws(()=>buildSpriteSpeechSchedule(f.narration,f.activity,slot));
  for(const intervals of [[{startMs:1100,endMs:1100,level:.5}],[{startMs:1300,endMs:1400,level:.5},{startMs:1100,endMs:1200,level:.5}],[{startMs:1100,endMs:1200,level:.5},{startMs:1190,endMs:1300,level:.5}]])
    assert.throws(()=>buildSpriteSpeechSchedule(f.narration,{...f.activity,intervals},f.schedule.slot),/activity clock/);
});
test('arbitrary forward/backward seek follows half-open boundaries and an owned schedule snapshot',()=>{
  const f=speechClockFixture(),sample=createSpriteSpeechSampler(f.schedule);
  const times=[0,99.99994,99.99996,100,249.99994,249.99996,250,499.99994,500,699.99994,700,1600];
  const expected=[false,false,true,true,true,false,false,false,true,true,false,false];
  assert.deepEqual(times.map(sample),expected);assert.deepEqual(times.slice().reverse().map(sample).reverse(),expected);
  f.schedule.intervals[0]!.endMs=1400;assert.deepEqual(times.map(sample),expected);assert.throws(()=>sample(Infinity),/finite/);
});
test('native pose/frame timing and mouth timing remain independent across rate and hold/hide policies',()=>{
  const f=speechClockFixture();
  for(const rate of [.5,1,2]){
    const sample=createActorSpeechSampler(f.motion,{...f.clip,rate},{variant:f.variant,schedule:f.schedule});
    assert.equal(sample(99.999),'hidden');assert.equal(sample(100),'open');assert.equal(sample(250),'rest');assert.equal(sample(550),'open');assert.equal(sample(1700),'rest');assert.throws(()=>sample(Infinity),/finite/);
  }
  f.motion.playback.mode='once';f.motion.playback.end='hide';
  assert.throws(()=>compileActorMotion(f.motion,f.clip,undefined,{variant:f.variant,schedule:f.schedule}),/hidden native/);
  f.motion.playback.end='hold';assert.doesNotThrow(()=>compileActorMotion(f.motion,f.clip,undefined,{variant:f.variant,schedule:f.schedule}));
});
test('compiler keeps both whole artworks on the same crop/anchor, scopes selectors and reports honest activity provenance',()=>{
  const f=speechClockFixture(),out=compileActorMotion(f.motion,f.clip,undefined,{variant:f.variant,schedule:f.schedule});
  assert.match(out.svg,/sprite-mouth-rest/);assert.match(out.svg,/sprite-mouth-open/);assert.match(out.svg,new RegExp(f.variant.sheet.hash));
  assert.equal(out.report.speech!.scheduleHash,hash(f.schedule));assert.equal(out.report.speech!.activityHash,hash(f.activity));assert.equal(out.report.productionReady,false);
  assert.equal(out.report.eventCount,out.js.split('\n').length);assert.doesNotMatch(out.js,/callback|setTimeout|gsap\.timeline/);
  const js=`const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines[${JSON.stringify(f.clip.compositionId)}]=tl;${out.js}`;
  assert.deepEqual(validateSceneScript(js,f.clip.compositionId),[]);
});
test('missing or mismatched native identity, protected registration and slot clock fail instead of falling back',()=>{
  const f=speechClockFixture();
  assert.throws(()=>compileActorMotion(f.motion,f.clip,undefined,{variant:{...f.variant,actorId:'karo'},schedule:f.schedule}),/identity/);
  assert.throws(()=>compileActorMotion(f.motion,f.clip,undefined,{variant:f.variant,schedule:{...f.schedule,slot:{...f.schedule.slot,endMs:1400}}}),/different actor slot/);
  assert.throws(()=>compileActorMotion(f.motion,f.clip,undefined,{variant:f.variant,schedule:f.schedule,sheetUrl:'https://evil/image.png'}),/safe local/);
  delete f.motion.frames[0]!.landmarks.nose;assert.throws(()=>compileActorMotion(f.motion,f.clip,undefined,{variant:f.variant,schedule:f.schedule}),/registration/);
});
test('event cap includes mouth changes and never truncates activity to fit a scene',()=>{
  const f=speechClockFixture();f.clip.endMs=120000;
  const intervals=Array.from({length:1600},(_,index)=>({startMs:100+index*60,endMs:120+index*60}));
  const schedule=SpriteSpeechScheduleSchema.parse({...f.schedule,slot:{...f.schedule.slot,endMs:f.clip.endMs},intervals});
  assert.throws(()=>compileActorMotion(f.motion,f.clip,undefined,{variant:f.variant,schedule}),/maximum is 6000/);
});
test('without optional speech context legacy body markup and none synchronization remain unchanged',()=>{
  const f=speechClockFixture(),out=compileActorMotion(f.motion,f.clip);
  assert.doesNotMatch(out.svg,/sprite-mouth/);assert.equal(out.report.speechSync,'none');assert.equal(out.report.speech,undefined);
  assert.match(out.svg,/translate\(-16 -48\)/);assert.equal(out.report.eventCount,out.js.split('\n').length);
});
test('real GSAP seek keeps one mouth state on the active native frame, including reverse seeks and shared frame boundaries',t=>{
  const f=speechClockFixture(),out=compileActorMotion(f.motion,f.clip,undefined,{variant:f.variant,schedule:f.schedule}),sample=createActorSpeechSampler(f.motion,f.clip,{variant:f.variant,schedule:f.schedule});
  const frames=new Map<string,{opacity:number;rest:{opacity:number};open:{opacity:number}}>();
  for(const match of out.svg.matchAll(/<g id="(sprite-[^"]+-frame-\d+)" opacity="([01])"/g))
    frames.set(`[data-composition-id="${f.clip.compositionId}"] [id="${match[1]}"]`,{opacity:Number(match[2]),rest:{opacity:1},open:{opacity:0}});
  const document={createElement:()=>({style:{}}),documentElement:{},querySelectorAll:(selector:string)=>{
    if(selector.endsWith('.sprite-mouth-rest'))return [...frames.values()].map(frame=>frame.rest);
    if(selector.endsWith('.sprite-mouth-open'))return [...frames.values()].map(frame=>frame.open);
    const frame=frames.get(selector);if(!frame)throw new Error(`Unknown speech selector: ${selector}`);return [frame];
  }};
  const window:Record<string,unknown>={document},context=vm.createContext({window,document,console,setTimeout:()=>0,clearTimeout:()=>{},Date});
  vm.runInContext(readFileSync(createRequire(import.meta.url).resolve('gsap/dist/gsap.js'),'utf8'),context);
  vm.runInContext(`var gsap=window.gsap;const tl=gsap.timeline({paused:true});${out.js}window.testTimeline=tl;gsap.ticker.sleep();`,context);
  const timeline=window.testTimeline as {seek:(seconds:number,suppressEvents:boolean)=>unknown;kill:()=>unknown};t.after(()=>timeline.kill());
  const times=[0,99.99994,99.99996,100,199.999,200,249.99994,249.99996,250,300,499.999,500,699.99994,699.99996,700,1500,2000];
  for(const time of times.concat(times.slice().reverse())){
    timeline.seek(time/1000,true);
    const visible=[...frames.values()].filter(frame=>frame.opacity>.5);
    const state=sample(time);assert.equal(visible.length,state==='hidden'?0:1,`native frame count at ${time}`);
    for(const frame of visible){assert.equal(frame.open.opacity>.5,state==='open');assert.equal(frame.rest.opacity>.5,state==='rest');}
  }
});
