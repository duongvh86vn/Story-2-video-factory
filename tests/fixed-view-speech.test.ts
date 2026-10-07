// NOT RUN by controller. Runtime declarations for the user's test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {bodyViewRegistrations,REGISTERED_BODY_VIEWS,bodyViewDescription} from '../packages/animation/body-view-art.js';
import {BODY_VIEW_SPEECH_VERSION,bodyViewMouthRegistration,bodyViewMouthSvg,bodyViewMouthPaths,registeredBodyViewMouth,bodyViewMouthLevel,validateBodyViewMouthActivity,bodyViewMouthDescription} from '../packages/animation/body-view-mouth.js';
import {bodyCalibrationPlan,bodyCalibrationSvg,bodyWorkbench,BODY_MOUTH_MODES} from '../packages/topics/body-workbench.js';
import {readReferenceHeadAsset,referenceHeadAssets} from '../packages/animation/forest-head-art.js';
import {referenceBodyAssets,referenceBodyDescription} from '../packages/animation/forest-body-art.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {samplePerformance,compilePerformance,validatePerformance,bodyPoseAnchors} from '../packages/animation/compiler.js';
import {performanceScene} from '../packages/animation/scene.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import type {SpeechActivity} from '../packages/voice/schemas.js';
import type {Narration,Shot} from '../packages/core/schemas.js';
import {CONTINUOUS_ANIMATION_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {actorSpeech,actorProfile,bindActorShot} from '../packages/actors/model.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {creativeFixture} from './creative-fixture.js';
import {temporary} from './support.js';
import {ConfigSchema} from '../packages/core/config.js';
import {requireTopicProductionReady,topicContext,topicNarrativeContext} from '../packages/topics/prehistoric-life.js';
const silence:SpeechActivity={method:'segment-draft',windowMs:20,intervals:[]};
const activity:SpeechActivity={method:'audio-rms',windowMs:20,audioHash:'original-audio-hash',intervals:[
  {startMs:500,endMs:1000,level:.3},{startMs:1000,endMs:1500,level:.8},
  {startMs:1800,endMs:2500,level:.5},{startMs:2500,endMs:2650,level:0},{startMs:2650,endMs:3300,level:1}]};
const candidate=(actor:'lila'|'karo',view:typeof REGISTERED_BODY_VIEWS[number])=>bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BODY_VIEW_SPEECH_VERSION);

test('explicit mouth selection is shared by cast/host schemas; source/default routing stays closed',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate(actor,view);assert.doesNotThrow(()=>HostProfileSchema.parse(profile));
    const plain=bodyCalibrationPlan(actor,'rest','happy',undefined,view);
    assert.throws(()=>samplePerformance(plain.plan,plain.profile,900,activity),/needs-view-voice-animation/);
    assert.doesNotThrow(()=>samplePerformance(plan,profile,900,activity));
    assert.throws(()=>HostProfileSchema.parse({...profile,appearance:{...profile.appearance,artworkVersion:'forest-body-1'}}),/bodyView|Registered mouth/);
    assert.throws(()=>HostProfileSchema.parse({...profile,appearance:{...profile.appearance,bodyView:undefined}}),/Registered mouth|registered view/);
    const old:PerformancePlan={...plan,compilerVersion:CONTINUOUS_ANIMATION_VERSION};
    assert.throws(()=>validatePerformance(old,profile),/needs-view-voice-animation/);assert.throws(()=>bodyPoseAnchors(old,profile,0),/needs-view-voice-animation/);
  }
  assert.throws(()=>bodyCalibrationPlan('lila','rest','happy',undefined,'source','cutout',BODY_VIEW_SPEECH_VERSION),/needs-view-voice-animation/);
});

test('four mouth registrations bind exact native bytes/dimensions and one bounded local ROI',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile}=candidate(actor,view),source=bodyViewRegistrations[actor][view],c=registeredBodyViewMouth(profile,source.sha256),bytes=readReferenceHeadAsset(referenceHeadAssets(profile.appearance)[0]!);
    assert.equal(hash(bytes),c.sourceHash);assert.deepEqual(c.sourceSize,[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]);
    assert.equal(c,bodyViewMouthRegistration[actor][view]);assert.throws(()=>registeredBodyViewMouth(profile,'changed'),/do not match/);
    const args={sha256:source.sha256,width:source.width,height:source.height,url:'assets/rigs/'+source.sha256+'.png'};
    const svg=bodyViewMouthSvg(profile,args);assert.match(svg,/id="view-mouth-layer" opacity="0" clip-path="url\(#view-mouth-region\)"/);
    assert.doesNotMatch(svg,/(?:eye|brow|nose|hair)-/);assert.match(svg,/<use href="#view-mouth-interior"/);
    assert.throws(()=>bodyViewMouthSvg(profile,{...args,url:'https://example.com/image.png'}),/Unapproved mouth/);
    assert.throws(()=>bodyViewMouthSvg(profile,{...args,width:args.width+1}),/dimensions/);
    assert.throws(()=>bodyViewMouthSvg(profile,{...args,url:'" onload="bad'}),/Unapproved mouth/);
    assert.equal(bodyViewMouthSvg({...profile,appearance:{...profile.appearance,bodySpeech:undefined}},args),'');
  }
});

test('aperture envelope honors source gaps, zero levels and boundaries without changing clocks',()=>{
  const original=structuredClone(activity);validateBodyViewMouthActivity(activity);
  for(const at of [-1,0,499,500,1500,1700,1800,2500,2550,2650,3300,4000])assert.equal(bodyViewMouthLevel(activity,at),0,'silent boundary '+at);
  for(const at of [545,900,1000,1400,1870,2200,2720,3150])assert.ok(bodyViewMouthLevel(activity,at)>0,'speaking '+at);
  assert.ok(Math.abs(bodyViewMouthLevel(activity,999.999)-bodyViewMouthLevel(activity,1000))<.0001,'adjacent positive windows must not restart attack');
  assert.deepEqual(activity,original);assert.equal(bodyViewMouthLevel(silence,800),0);
});

test('random-access speech shape/visibility is pure and never displaces the registered head',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate(actor,view),clocks=[0,510,900,1000,1490,1650,2200,2570,3100,4000];
    const saved=clocks.map(at=>samplePerformance(plan,profile,at,activity));
    for(const i of [8,2,5,1,7,9,0,4,3,6])assert.deepEqual(samplePerformance(plan,profile,clocks[i]!,activity),saved[i]);
    for(const frame of saved){const rest=samplePerformance(plan,profile,frame.timeMs,silence);
      assert.deepEqual(frame.transforms,rest.transforms);assert.equal(frame.face['head-view-front']!.opacity,1);
      assert.equal(frame.face['eye-left'],undefined);assert.equal(frame.face['head-face-plane'],undefined);
      const amount=bodyViewMouthLevel(activity,frame.timeMs);
      assert.deepEqual(Object.fromEntries(Object.entries(frame.paths!).filter(([id])=>id.startsWith('view-mouth-'))),bodyViewMouthPaths(registeredBodyViewMouth(profile),amount));
      if(amount===0)assert.equal(frame.face['view-mouth-layer']!.opacity,0);
    }
  }
});

test('malformed clocks/levels fail closed even during gaps or zero intervals',()=>{
  for(const intervals of [[{startMs:20,endMs:10,level:.5}],[{startMs:0,endMs:100,level:1},{startMs:90,endMs:200,level:0}],
    [{startMs:0,endMs:100,level:Number.NaN}],[{startMs:0,endMs:100,level:2}],[{startMs:-1,endMs:100,level:.1}],[{startMs:0,endMs:100.5,level:1}]]){
    const bad={...activity,intervals};assert.throws(()=>validateBodyViewMouthActivity(bad));assert.throws(()=>bodyViewMouthLevel(bad,4000),/needs-view-speech-clock/);
  }
  assert.throws(()=>bodyViewMouthLevel(activity,Number.NaN));
  assert.throws(()=>bodyViewMouthLevel({...activity,windowMs:0},900),/needs-view-speech-clock/);
});

test('candidate keeps fixed-view expression/gaze/turn/locomotion guards and permits only registered geometry',()=>{
  const {profile,plan}=candidate('lila','three-quarter-left');
  for(const bad of [{...plan,gazes:[{startMs:0,endMs:1000,target:{x:350,y:120}}]},
    {...plan,expressions:[{startMs:0,endMs:4000,mood:'angry' as const}]},
    {...plan,walks:[{startMs:0,endMs:2000,fromX:210,toX:230}]},
    {...plan,headView:'three-quarter-right' as const}])assert.throws(()=>samplePerformance(bad,profile,900,activity),/needs-view-|needs-body-registration/);
});

test('canonical compiler emits bounded mouth curves and unchanged-duration reports; local resources remain enforced',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate(actor,view),scene=performanceScene(plan,profile,activity),assets=referenceBodyAssets(profile.appearance),selected=referenceHeadAssets(profile.appearance)[0]!;
    const compiled=scene.compiled;assert.equal(compiled.frames.at(-1)!.timeMs,plan.durationMs);
    assert.match(compiled.js,/view-mouth-interior/);assert.match(compiled.js,/view-mouth-layer/);
    assert.equal(compiled.report.bodySpeech?.fingerprint,bodyViewMouthDescription.fingerprint);assert.equal(compiled.report.bodySpeech?.sourceAudioHash,activity.audioHash);
    assert.equal(compiled.report.bodySpeech?.audioVerified,false);assert.equal(compiled.report.phonemeLipSync,false);assert.equal(compiled.report.bodySpeech?.approved,false);
    const shot={id:plan.id,startMs:0,endMs:plan.durationMs} as Shot,files=secureSceneFiles(scene.files);
    assert.deepEqual(validateSceneFiles(files,shot,2000000,assets.map(a=>a.path),plan.stage),[]);
    assert.ok(validateSceneFiles(files,shot,2000000,assets.filter(a=>a.path!==selected.path).map(a=>a.path),plan.stage).some(e=>e.includes('Unapproved local resource')));
    const separate=compilePerformance(plan,profile,activity,'support-');assert.match(separate.js,/support-view-mouth-interior/);
  }
});

test('mouth clips/use and workbench survive namespacing with explicit labelled diagnostic selection',()=>{
  assert.ok(BODY_MOUTH_MODES.includes(BODY_VIEW_SPEECH_VERSION));
  const html=bodyWorkbench('point',900,'happy','three-quarter-left','cutout',BODY_VIEW_SPEECH_VERSION);
  assert.match(html,/name="mouth"/);assert.match(html,/registered-mouth-v1" selected/);assert.match(html,/segment-draft/);
  const svg=bodyCalibrationSvg('lila','rest',900,'happy',{view:'three-quarter-left',mouth:BODY_VIEW_SPEECH_VERSION});
  assert.match(svg,/id="lila-calibration-view-mouth-layer"[^>]*clip-path="url\(#lila-calibration-view-mouth-region\)"/);
  const both=['left','right'].map(prefix=>namespaceRigSvg(svg,prefix+'-')).join(''),ids=[...both.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);assert.doesNotMatch(both,/href="#view-mouth-|url\(#view-mouth-/);
});

test('paired actors speak only their assigned source cue windows and preserve original audio metadata',()=>{
  const narration:Narration={mode:'wav',durationMs:6000,words:[],segments:[{id:'lila-line',startMs:1000,endMs:2500,text:'Lila: We can share this.'},{id:'karo-line',startMs:2800,endMs:5000,text:'Karo: Thank you.'}]};
  const original:SpeechActivity={...activity,intervals:[{startMs:950,endMs:2300,level:.4},{startMs:2350,endMs:3100,level:.8},{startMs:3200,endMs:5500,level:.6}]};
  const before=structuredClone({narration,original});
  for(const [actor,view,cue] of [['lila','three-quarter-right','lila-line'],['karo','three-quarter-left','karo-line']] as const){
    const own=actorSpeech(original,narration,[cue],1200,5200),local={...own,intervals:own.intervals.map(a=>({...a,startMs:a.startMs-1200,endMs:a.endMs-1200}))};
    const {profile,plan}=candidate(actor,view);const compiled=compilePerformance(plan,profile,local);
    assert.equal(compiled.report.bodySpeech?.sourceAudioHash,original.audioHash);
    for(const at of [0,1000,1500,1700,2300,3200,3900]){
      const absolute=at+1200,segment=narration.segments.find(s=>s.id===cue)!;
      if(absolute<segment.startMs||absolute>=segment.endMs)assert.equal(samplePerformance(plan,profile,at,local).face['view-mouth-layer']!.opacity,0);
    }
    assert.deepEqual(actorSpeech(original,narration,[],1200,5200).intervals,[]);
  }
  assert.deepEqual({narration,original},before);
});

test('canonical cinematic primary and supporting mouths select independent native views with actor-owned reports',async t=>{
  const f=await creativeFixture(await temporary(t)),s=f.shot,c=s.cinematic!;
  s.startMs=1000;s.endMs=6000;s.narrationSegmentIds=['lila-line','karo-line'];c.propBindings=[];
  const n:Narration={mode:'wav',durationMs:6000,words:[],segments:[{id:'lila-line',startMs:1000,endMs:2900,text:'Lila shares.'},{id:'karo-line',startMs:3100,endMs:6000,text:'Karo thanks her.'}]};
  const definitions=(['lila','karo'] as const).map((actor,i)=>{
    const {profile,plan}=candidate(actor,i?'three-quarter-left':'three-quarter-right');
    const character=ActorDefinitionSchema.parse({id:actor,name:actor,role:'illustration',kind:'stick-man',identity:'illustrative',sourceRefs:[{kind:'narration',segmentId:n.segments[i]!.id,quote:n.segments[i]!.text}],appearance:profile.appearance});
    plan.id=s.id;plan.durationMs=5000;plan.expressions[0]!.endMs=5000;plan.stage={width:1280,height:720,groundY:650};plan.root={x:i?800:380,y:650};plan.scale=.8;
    return {character,plan};
  });
  c.performance=definitions[0]!.plan;c.actorScene=ActorSceneSchema.parse({primary:definitions[0]!.character,speakingSegmentIds:['lila-line'],supporting:[{character:definitions[1]!.character,performance:definitions[1]!.plan,actions:[],speakingSegmentIds:['karo-line']}]});
  c.camera={...c.camera,focus:'ensemble',framing:'wide',movement:'locked',startScale:1,endScale:1,anchor:{x:640,y:360}};
  bindActorShot(s,f.profile,f.rig);
  c.continuity={...c.continuity,entry:{...c.performance.root},exit:{...c.performance.root},facing:c.performance.facing??'front',carriedProps:[]};
  s.camera={...s.camera,shotSize:c.camera.framing,movement:c.camera.movement};
  s.host!.actions=[{type:'idle',startMs:s.startMs,endMs:s.endMs}];
  c.actorScene!.supporting[0]!.actions=[{type:'idle',startMs:s.startMs,endMs:s.endMs}];
  const signal:SpeechActivity={method:'audio-rms',audioHash:'original-paired-audio',windowMs:20,intervals:[{startMs:1000,endMs:2700,level:.6},{startMs:3200,endMs:5900,level:.8}]};
  const rendered=renderCinematic(s,f.profile,f.rig,signal,f.config,undefined,n),html=rendered.files.files.find(x=>x.path==='index.html')!.content;
  assert.match(html,/data-body-view="three-quarter-right"/);assert.match(html,/data-body-view="three-quarter-left"/);
  assert.match(html,/id="actor-karo-view-mouth-layer"/);const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  assert.deepEqual(rendered.report.actors.map(a=>a.actorId),['lila','karo']);
  for(const a of rendered.report.actors){assert.equal(a.report.bodySpeech?.sourceAudioHash,signal.audioHash);assert.equal(a.report.bodySpeech?.approved,false);}
  const allowed=definitions.flatMap(d=>referenceBodyAssets(actorProfile(d.character).appearance).map(a=>a.path));
  assert.deepEqual(validateSceneFiles(secureSceneFiles(rendered.files),s,2000000,allowed,f.config.rendering.final),[]);
});

test('speech selection changes derived cache identity but never opens topic production or alters narration contract',()=>{
  const a=candidate('lila','three-quarter-right'),b=bodyCalibrationPlan('lila','rest','happy',undefined,'three-quarter-right');assert.notEqual(a.profile.profileHash,b.profile.profileHash);
  assert.equal(bodyViewDescription.mouthCandidate.fingerprint,bodyViewMouthDescription.fingerprint);assert.equal(referenceBodyDescription().authoredViews.fingerprint,bodyViewDescription.fingerprint);
  const config=ConfigSchema.parse({topic:{id:'prehistoric-life'}});assert.equal(topicContext(config)!.readiness.productionReady,false);
  assert.throws(()=>requireTopicProductionReady(config),/needs-art-direction/);assert.equal(topicNarrativeContext(config)!.version,'prehistoric-story-contract-1');
});
