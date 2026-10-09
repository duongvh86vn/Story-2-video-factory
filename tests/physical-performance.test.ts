// DECLARED ONLY, NOT RUN. User's model owns geometry/runtime/video acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {headFaceCandidate} from '../packages/topics/head-face-source.js';
import {BODY_VIEW_LOCOMOTION_SELECTION} from '../packages/animation/body-view-cloth.js';
import {BODY_VIEW_MANIPULATION_SELECTION} from '../packages/animation/native-contact-arm.js';
import {BODY_SOURCE_VERSION,MANIPULATION_SOURCE_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {VIEW_ACTING_CLOCK_VERSION,type ViewActingClock} from '../packages/animation/view-acting-clock.js';
import {SPEECH_SOURCE_CLOCK_VERSION,projectSpeechActivity,windowSpeechActivity} from '../packages/animation/speech-clock.js';
import {samplePerformance,samplePhysicalPerformance,compilePerformance,type FrameState} from '../packages/animation/compiler.js';
import {cameraHostBounds} from '../packages/director/camera.js';
import type {SpeechActivity} from '../packages/voice/schemas.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const silence:SpeechActivity={method:'segment-draft',windowMs:20,intervals:[]};
/** No registration/fixture/sampling at module load. */
async function fixture(actor:'lila'|'karo',view:'three-quarter-left'|'three-quarter-right',hand:'left'|'right'){
  const base=bodyCalibrationPlan(actor,'drop','happy',hand,view,'cutout','silent','native','rest','native',BODY_VIEW_LOCOMOTION_SELECTION,'rigid','unregistered',BODY_VIEW_MANIPULATION_SELECTION);
  const {bank}=await headFaceCandidate(repo,actor,view,'source-motion');
  const profile=HostProfileSchema.parse({...base.profile,appearance:{...base.profile.appearance,bodyHeadBank:bank},profileHash:hash({base:base.profile.profileHash,bank:bank.fingerprint})});
  const source={version:MANIPULATION_SOURCE_VERSION,id:'physical-contact-source',startMs:1000,endMs:5000,props:structuredClone(base.plan.props),gestures:structuredClone(base.plan.gestures)};
  const body={version:BODY_SOURCE_VERSION,id:'physical-body-source',startMs:1000,endMs:5000,walks:structuredClone(base.plan.walks),jumps:structuredClone(base.plan.jumps??[])};
  const head={version:'native-head-source-1' as const,id:'physical-head-source',ownerId:profile.id,bankFingerprint:bank.fingerprint,startMs:1000,endMs:5000,samples:[{atMs:0,cell:bank.cells[0]!.id}]};
  const plan:PerformancePlan={...base.plan,profileHash:profile.profileHash,expressions:[],gazes:[],walks:[],jumps:[],gestures:[],props:[],sourceBody:body,sourceManipulation:source,sourceHead:head};
  const clock:ViewActingClock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:profile.id,startMs:1000,endMs:5000,runStartMs:1000,runEndMs:5000,sourceIdentityHash:hash({body,source,head}),gazes:[],gestures:[],expressions:[],bodyMotion:body,manipulationMotion:source,headMotion:head};
  // Declared synthetic activity, not generated audio or an acceptance result.
  const whole:SpeechActivity={method:'audio-rms',windowMs:20,intervals:[{startMs:1000,endMs:5000,level:.8}]};
  return {profile,plan,clock,whole,source};
}
function speech(f:Awaited<ReturnType<typeof fixture>>,startMs:number,endMs:number){return {
  activity:projectSpeechActivity(f.whole,startMs,endMs),sourceClock:{version:SPEECH_SOURCE_CLOCK_VERSION,ownerId:f.profile.id,scope:'storyboard-cues' as const,cueIds:['declared-cue'],startMs,endMs,sourceActivityHash:hash(f.whole),activity:windowSpeechActivity(f.whole,startMs,endMs)}};}
function physical(frame:FrameState){return {root:frame.root,feet:frame.feet,stance:frame.stance,bodyPosture:frame.bodyPosture,hands:frame.hands,wrists:frame.wrists,armGeometry:frame.armGeometry,armProjection:frame.armProjection,legProjection:frame.legProjection,props:frame.props,transforms:frame.transforms,contactErrors:frame.contactErrors};}

test('physical geometry preserves own native head/body/hand/prop history while exposing no rendered facial or speech state',async()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const)for(const hand of ['left','right'] as const){
    const f=await fixture(actor,view,hand),before=hash(f),voice=speech(f,1000,5000);
    for(const at of [0,1000,2500,3500,4000]){
      const geometry=samplePhysicalPerformance(f.plan,f.profile,at,f.clock),render=samplePerformance(f.plan,f.profile,at,voice.activity,voice.sourceClock,f.clock);
      assert.equal(geometry.purpose,'physical-geometry');assert.equal(Object.hasOwn(geometry,'face'),false);
      assert.ok(!Object.keys(geometry.surfaceState).some(id=>/native-face-|^eye-|^mouth-|^brow-|^lid-|head-face/.test(id)));
      assert.ok(!Object.keys(geometry.paths??{}).some(id=>/native-face-|mouth-|head-contour/.test(id)));
      assert.deepEqual(physical({...geometry,face:{}}),physical(render));
      for(const [id,state] of Object.entries(geometry.surfaceState))assert.deepEqual(state,render.face[id],id);
    }assert.equal(hash(f),before);
  }
});

test('camera geometry works on a speech-capable own head without inventing narration; rendered frames and compiler still require the owned voice clock',async()=>{
  const f=await fixture('lila','three-quarter-right','right'),before=hash(f),bounds=cameraHostBounds(f.plan,f.profile,f.clock);
  assert.ok(Number.isFinite(bounds.ratio.max)&&bounds.ratio.max>0);
  assert.throws(()=>samplePerformance(f.plan,f.profile,1000,silence,undefined,f.clock),/complete owned narration clock/);
  assert.throws(()=>compilePerformance(f.plan,f.profile,silence,'',undefined,f.clock),/complete owned narration clock/);
  assert.equal(hash(f),before);
});

test('a falling prop uses original release palms before the camera cut while current narration remains confined to its actual shot',async()=>{
  for(const actor of ['lila','karo'] as const){
    const f=await fixture(actor,'three-quarter-right','right'),g=f.source.gestures.find(g=>g.action==='drop')!,cut=g.releaseMs!+10;
    assert.ok(cut<g.landingMs!&&g.landingMs!<=4000);
    const plan={...f.plan,durationMs:4000-cut},clock={...f.clock,startMs:1000+cut},voice=speech(f,clock.startMs,clock.endMs),full=speech(f,1000,5000),before=hash({f,plan,clock,voice});
    for(const local of [0,(g.landingMs!-cut)/2,g.landingMs!-cut,4000-cut,0]){
      const geometry=samplePhysicalPerformance(plan,f.profile,local,clock),render=samplePerformance(plan,f.profile,local,voice.activity,voice.sourceClock,clock),original=samplePerformance(f.plan,f.profile,cut+local,full.activity,full.sourceClock,f.clock);
      assert.deepEqual(geometry.props,original.props);assert.deepEqual(render.props,original.props);assert.deepEqual(render.hands,original.hands);
    }
    assert.equal(voice.sourceClock.startMs,clock.startMs);assert.equal(hash({f,plan,clock,voice}),before);
  }
});

test('physical queries reject foreign/missing clocks, absent native selection, changed source ownership and invalid seeks',async()=>{
  const f=await fixture('karo','three-quarter-left','left');
  assert.throws(()=>samplePhysicalPerformance(f.plan,f.profile,0),/complete owned clock/);
  assert.throws(()=>samplePhysicalPerformance(f.plan,f.profile,0,{...f.clock,ownerId:'foreign'}),/actor profile mismatch/);
  assert.throws(()=>samplePhysicalPerformance(f.plan,{...f.profile,appearance:{...f.profile.appearance,bodyManipulation:undefined}},0,f.clock),/native selection/);
  const changed=structuredClone(f.clock);changed.manipulationMotion!.props[0]!.origin.x+=1;
  assert.throws(()=>samplePhysicalPerformance(f.plan,f.profile,0,changed),/local declaration differs/);
  for(const at of [-1,4001,NaN,Infinity])assert.throws(()=>samplePhysicalPerformance(f.plan,f.profile,at,f.clock),/seek is outside/);
});
