// DECLARED ONLY, NOT RUN. Human's model owns runtime/image/video acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../packages/core/utils.js';
import {NativeHeadFaceSchema,validateNativeHeadFace,nativeHeadFaceState} from '../packages/animation/native-head-face.js';
import {NativeHeadBankDefinitionSchema,nativeHeadBank,nativeHeadSources} from '../packages/animation/native-head-bank.js';
import {nativeHeadBankSvg,nativeHeadBankFacialState,nativeHeadCellPoint} from '../packages/animation/body-head-bank.js';
import {nativeHeadResources,readNativeHeadSource} from '../packages/animation/native-head-resources.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {topicPreviewProfile} from '../packages/topics/preview.js';
import {HUNT_ANIMATION_VERSION,PerformancePlanSchema} from '../packages/animation/schemas.js';
import {VIEW_ACTING_CLOCK_VERSION} from '../packages/animation/view-acting-clock.js';
import {SPEECH_SOURCE_CLOCK_VERSION,projectSpeechActivity,windowSpeechActivity} from '../packages/animation/speech-clock.js';
import {samplePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {pathCoordinates} from '../packages/animation/ink-limb.js';
import type {SpeechActivity} from '../packages/voice/schemas.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function definition(actor:'lila'|'karo'){
  return NativeHeadBankDefinitionSchema.parse(JSON.parse(await fs.readFile(path.join(repo,'library/topics/prehistoric-life/head-face-registrations/'+actor+'-source-face-v1.json'),'utf8')));
}
async function fixture(actor:'lila'|'karo'){
  const bank=nativeHeadBank(await definition(actor)),base=topicPreviewProfile(actor);
  const profile=HostProfileSchema.parse({...base,appearance:{...base.appearance,artworkVersion:'forest-body-view-1',bodyView:'three-quarter-right',bodyHeadBank:bank},profileHash:hash(bank)});
  const sourceHead={version:'native-head-source-1' as const,id:'source-face-head',ownerId:profile.id,bankFingerprint:bank.fingerprint,startMs:1000,endMs:3000,samples:[{atMs:0,cell:'source-angle'}]};
  const plan=PerformancePlanSchema.parse({version:22,compilerVersion:HUNT_ANIMATION_VERSION,id:'source-face-shot',profileHash:profile.profileHash,kind:profile.kind,leadCharacterId:profile.id,durationMs:1000,fps:60,stage:{width:1280,height:720,groundY:630},root:{x:400,y:630},scale:1,facing:'right',headView:'three-quarter-right',walks:[],gestures:[],gazes:[],expressions:[],props:[],sourceHead});
  const clock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:profile.id,startMs:2000,endMs:3000,runStartMs:1000,runEndMs:3000,sourceIdentityHash:'a'.repeat(64),gazes:[],gestures:[],expressions:[],headMotion:sourceHead};
  const whole:SpeechActivity={method:'audio-rms',windowMs:20,intervals:[{startMs:1950,endMs:2150,level:.8}]};
  const sourceClock={version:SPEECH_SOURCE_CLOCK_VERSION,ownerId:profile.id,scope:'storyboard-cues' as const,cueIds:['cue-a'],startMs:2000,endMs:3000,sourceActivityHash:hash(whole),activity:windowSpeechActivity(whole,2000,3000)};
  return {bank,profile,plan,clock,activity:projectSpeechActivity(whole,2000,3000),sourceClock,whole};
}
test('real source-face candidates bind original V2 and local rest plate bytes without granting production approval',async()=>{
  for(const actor of ['lila','karo'] as const){
    const bank=nativeHeadBank(await definition(actor));
    for(const source of nativeHeadSources(bank))assert.equal(hash(readNativeHeadSource(repo,source,bank.primary)),source.sha256);
    assert.equal(bank.cells.length,1);assert.equal(bank.cells[0]!.yawDeg,null);assert.deepEqual(bank.routes,[]);
    assert.equal(bank.productionReady,false);assert.equal(bank.approved,false);assert.equal(bank.motionVerified,false);
    const cell=bank.cells[0]!,face=cell.face!;
    const left=face.eyes['screen-left'],right=face.eyes['screen-right'];
    assert.ok(!('visibility' in left)&&!('visibility' in right),'legacy source registration retains both visible eyes');
    assert.equal(cell.eyeTarget.x,(left.center.x+right.center.x)/2);
    assert.equal(cell.eyeTarget.y,(left.center.y+right.center.y)/2);
    assert.deepEqual(nativeHeadCellPoint(bank,cell,cell.neck),{x:0,y:0});
  }
});
test('foreign source, swapped eyes and protected-paint edit intersections are rejected',async()=>{
  const d=await definition('lila'),face=d.cells[0]!.face!;
  assert.throws(()=>validateNativeHeadFace(face,{...face.source,sha256:'c'.repeat(64)},d.cells[0]!.crop),/identity mismatch/);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,eyes:{'screen-left':face.eyes['screen-right'],'screen-right':face.eyes['screen-left']}}).success,false);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,protectedContours:[face.mouth.region]}).success,false);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,source:{...face.source,width:10}}).success,false);
});
test('maximum mouth opening, pupil travel, strips and polygon retraces cannot escape registered regions',async()=>{
  const face=(await definition('lila')).cells[0]!.face!;
  assert.equal(NativeHeadFaceSchema.safeParse({...face,mouth:{...face.mouth,depth:1000}}).success,false);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,eyes:{...face.eyes,'screen-left':{...face.eyes['screen-left'],shift:{x:1000,y:0}}}}).success,false);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,mouth:{...face.mouth,strip:{x:650,y:620,width:50,height:5}}}).success,false);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,mouth:{...face.mouth,region:[...face.mouth.region,face.mouth.region[0]!]}}).success,false);
  assert.throws(()=>nativeHeadFaceState(face,{aperture:NaN,blink:0,look:{x:0,y:0}},'native-face-0'));
});
test('Karo requires a distinct closed-mouth plate and the bank cannot use that image as a whole head',async()=>{
  const d=await definition('karo'),face=d.cells[0]!.face!,rest=face.mouth.rest!;
  assert.equal(NativeHeadFaceSchema.safeParse({...face,mouth:{...face.mouth,rest:undefined}}).success,false);
  assert.throws(()=>nativeHeadBank({...d,additionalSources:d.additionalSources!.map(s=>({...s,sha256:'e'.repeat(64)}))}),/patch source differs/);
  assert.throws(()=>nativeHeadBank({...d,cells:d.cells.map(c=>({...c,sourceId:rest.sourceId}))}));
  const bank=nativeHeadBank(d),resources=nativeHeadResources(bank);
  assert.equal(resources.length,3);assert.ok(resources.some(r=>r.file.includes('/head-face-plates/')));
});
test('source-face SVG and state retain stable local selectors, exact glyph source and one uniform neck transform',async()=>{
  for(const actor of ['lila','karo'] as const){
    const {bank,profile}=await fixture(actor),svg=nativeHeadBankSvg(profile,(_file,sha)=>'assets/rigs/'+sha+'.png');
    const rest=nativeHeadBankFacialState(bank,{aperture:0,blink:0,look:{x:0,y:0}}),talk=nativeHeadBankFacialState(bank,{aperture:.7,blink:1,look:{x:1,y:0}});
    assert.deepEqual(Object.keys(rest.face),Object.keys(talk.face));assert.deepEqual(Object.keys(rest.paths),Object.keys(talk.paths));
    for(const key of [...Object.keys(talk.face),...Object.keys(talk.paths)])assert.ok(svg.includes('id="'+key+'"'),key);
    assert.ok(svg.includes('href="#native-head-bank-source-0"'));assert.ok(!svg.includes('scale(-'));
    assert.equal(rest.face['native-face-0-mouth-layer']!.opacity,actor==='karo'?1:0);
    assert.equal(rest.face['native-face-0-eyes-layer']!.opacity,0);
    assert.equal(rest.face['native-face-0-mouth-generated']!.opacity,0);
    assert.ok(talk.paths['native-face-0-mouth-aperture']!==rest.paths['native-face-0-mouth-aperture']);
  }
});
test('owned original voice drives both source faces across a camera slice; no source clock or wrong owner fails',async()=>{
  for(const actor of ['lila','karo'] as const){
    const f=await fixture(actor),frame=samplePerformance(f.plan,f.profile,50,f.activity,f.sourceClock,f.clock);
    assert.equal(frame.face['native-face-0-mouth-layer']!.opacity,1);
    assert.throws(()=>samplePerformance(f.plan,f.profile,50,f.activity,undefined,f.clock),/complete owned narration clock/);
    assert.throws(()=>samplePerformance(f.plan,f.profile,50,f.activity,{...f.sourceClock,ownerId:'foreign'},f.clock),/owner|disagree/);
    const fullPlan={...f.plan,durationMs:2000},fullClock={...f.clock,startMs:1000,endMs:3000};
    const fullActivity=projectSpeechActivity(f.whole,1000,3000),fullSource={...f.sourceClock,startMs:1000,activity:windowSpeechActivity(f.whole,1000,3000)};
    const full=samplePerformance(fullPlan,f.profile,1050,fullActivity,fullSource,fullClock);
    assert.deepEqual(frame.paths,full.paths);assert.deepEqual(frame.face,full.face);
    const baseline=new Map([0,50,500,990].map(time=>[time,samplePerformance(f.plan,f.profile,time,f.activity,f.sourceClock,f.clock)]));
    for(const time of [990,0,50,500,50])assert.deepEqual(samplePerformance(f.plan,f.profile,time,f.activity,f.sourceClock,f.clock),baseline.get(time));
  }
});
test('bank3 keeps unknown single view honest and rejects unavailable turn/expression or backward gaze',async()=>{
  const f=await fixture('lila'),d=await definition('lila');
  assert.throws(()=>nativeHeadBank({...d,routes:[['source-angle','source-angle']]}),/single fixed|repeats/);
  assert.throws(()=>nativeHeadBank({...d,version:'native-head-bank-2'}),/Legacy/);
  assert.throws(()=>nativeHeadBank({...d,capabilities:{...d.capabilities,speech:false}}),/capabilities/);
  assert.throws(()=>samplePerformance({...f.plan,expressions:[{startMs:0,endMs:700,mood:'angry'}]},f.profile,50,f.activity,f.sourceClock,f.clock),/expression/);
  const gaze={startMs:2000,endMs:2700,target:{x:0,y:300}};
  assert.throws(()=>samplePerformance({...f.plan,gazes:[{...gaze,startMs:0,endMs:700}]},f.profile,350,f.activity,f.sourceClock,{...f.clock,gazes:[gaze]}),/behind/);
});
test('compiled source face preserves local matrices/path ids and owns narration metadata',async()=>{
  const f=await fixture('lila'),compiled=compilePerformance(f.plan,f.profile,f.activity,'actor-lila-',f.sourceClock,f.clock);
  assert.ok(compiled.js.includes('actor-lila-native-face-0-mouth-aperture'));assert.ok(compiled.js.includes('actor-lila-native-face-0-screen-left-glyph'));
  assert.equal(compiled.report.nativeHeadBank!.capabilities.speech,true);assert.equal(compiled.report.nativeHeadBank!.productionReady,false);
  // Check the actual compiler's path tween against the original evaluator,
  // including the nonlinear RMS attack/release, not only opacity endpoints.
  for(let i=1;i<compiled.frames.length;i++){
    const a=compiled.frames[i-1]!,b=compiled.frames[i]!,wanted=samplePerformance(f.plan,f.profile,(a.timeMs+b.timeMs)/2,f.activity,f.sourceClock,f.clock);
    for(const key of ['aperture','teeth','tongue']){
      const id='native-face-0-mouth-'+key,from=pathCoordinates(a.paths![id]!),to=pathCoordinates(b.paths![id]!),target=pathCoordinates(wanted.paths![id]!);
      assert.ok(from.every((value,j)=>Math.abs((value+to[j]!)/2-target[j]!)<=.201),id+' interpolation');
    }
  }
});
