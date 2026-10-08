// NOT RUN by controller. Behavioral declarations for the user's test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {hash,readJson,writeJson} from '../packages/core/utils.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {NarrationSchema,StoryboardSchema,type Shot} from '../packages/core/schemas.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {actorRigResourcePaths} from '../packages/actors/rig-resources.js';
import {actorShotSpeech,rigSpeechInputIdentity,rigSpeechPublicationBinding,assertRigSpeechPublicationBinding,shotUsesSourceSpeechClock} from '../packages/actors/speech-clock.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {bodyViewRegistrations,REGISTERED_BODY_VIEWS} from '../packages/animation/body-view-art.js';
import {BODY_VIEW_SPEECH_VERSION,bodyViewMouthSvg,bodyViewMouthPaths,bodyViewMouthLevel,registeredBodyViewMouth,hasBodyViewSpeech,bodyViewMouthDescription} from '../packages/animation/body-view-mouth.js';
import {BODY_VIEW_REST_SPEECH_SELECTION,bodyViewRestMouthRegistration,bodyViewRestMouthAssets,registeredBodyViewRestMouth,bodyViewRestMouthSvg,bodyViewRestMouthDescription} from '../packages/animation/body-view-rest-mouth.js';
import {BODY_VIEW_EYES_SELECTION} from '../packages/animation/body-view-eyes.js';
import {bodyCalibrationPlan,BODY_MOUTH_MODES,bodyWorkbench,BODY_MOUTH_PREVIEW_ACTIVITY} from '../packages/topics/body-workbench.js';
import {readReferenceHeadAsset,referenceHeadAssets} from '../packages/animation/forest-head-art.js';
import {referenceBodyAssets} from '../packages/animation/forest-body-art.js';
import {samplePerformance,compilePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {performanceScene} from '../packages/animation/scene.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {ConfigSchema} from '../packages/core/config.js';
import {requireTopicProductionReady,topicContext} from '../packages/topics/prehistoric-life.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {repairCinematicArtwork} from '../packages/director/artwork-repair.js';
import {ModelRouter} from '../packages/models/registry.js';
import {creativeFixture} from './creative-fixture.js';
import {temporary} from './support.js';
import type {SpeechActivity} from '../packages/voice/schemas.js';

const silence:SpeechActivity={method:'segment-draft',windowMs:20,intervals:[]};
const activity:SpeechActivity={method:'audio-rms',windowMs:20,audioHash:'unchanged-native-rest-mouth-audio',intervals:[
  {startMs:500,endMs:1000,level:.3},{startMs:1000,endMs:1500,level:.8},{startMs:1800,endMs:2500,level:.5},{startMs:2500,endMs:2700,level:0},{startMs:2700,endMs:3500,level:.9}]};
const candidate=(actor:'lila'|'karo',view:typeof REGISTERED_BODY_VIEWS[number],mouth:typeof BODY_VIEW_REST_SPEECH_SELECTION|typeof BODY_VIEW_SPEECH_VERSION=BODY_VIEW_REST_SPEECH_SELECTION)=>bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',mouth,BODY_VIEW_EYES_SELECTION);

test('resting speech is an explicit shared host/cast/workbench selection and does not select default/source artwork',()=>{
  assert.ok(BODY_MOUTH_MODES.includes(BODY_VIEW_REST_SPEECH_SELECTION));
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate(actor,view);assert.equal(profile.appearance.bodySpeech,BODY_VIEW_REST_SPEECH_SELECTION);assert.ok(hasBodyViewSpeech(profile));assert.doesNotThrow(()=>HostProfileSchema.parse(profile));assert.doesNotThrow(()=>validatePerformance(plan,profile));
    const legacy=candidate(actor,view,BODY_VIEW_SPEECH_VERSION),plain=bodyCalibrationPlan(actor,'rest','happy',undefined,view);
    assert.notEqual(profile.profileHash,legacy.profile.profileHash);assert.notEqual(profile.profileHash,plain.profile.profileHash);assert.equal(plain.profile.appearance.bodySpeech,undefined);
    assert.throws(()=>HostProfileSchema.parse({...profile,appearance:{...profile.appearance,artworkVersion:'forest-body-1'}}),/bodyView|Registered mouth/);
    assert.throws(()=>HostProfileSchema.parse({...profile,appearance:{...profile.appearance,sourceColour:'original-rgb-v2'}}),/source colour/);
  }
  assert.throws(()=>bodyCalibrationPlan('karo','rest','happy',undefined,'source','cutout',BODY_VIEW_REST_SPEECH_SELECTION),/authored body view/);
});

test('independent native rest tiles have exact bytes/dimensions and are staged only for their selected Karo view',()=>{
  for(const view of REGISTERED_BODY_VIEWS){
    const {profile}=candidate('karo',view),c=registeredBodyViewRestMouth(profile)!,assets=bodyViewRestMouthAssets(profile.appearance);assert.equal(c,bodyViewRestMouthRegistration[view]);assert.equal(assets.length,1);
    const bytes=readReferenceHeadAsset(assets[0]!);assert.equal(hash(bytes),c.sha256);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[c.width,c.height]);
    assert.equal(c.sourceHash,bodyViewRegistrations.karo[view].sha256);assert.throws(()=>registeredBodyViewRestMouth(profile,'wrong'),/does not match/);
    for(const resourceList of [referenceHeadAssets(profile.appearance),referenceBodyAssets(profile.appearance)])assert.ok(resourceList.some(a=>a.sha256===c.sha256));
    assert.deepEqual(bodyViewRestMouthAssets(candidate('lila',view).profile.appearance),[]);assert.deepEqual(bodyViewRestMouthAssets(candidate('karo',view,BODY_VIEW_SPEECH_VERSION).profile.appearance),[]);
  }
  assert.notEqual(bodyViewRestMouthRegistration['three-quarter-left'].sha256,bodyViewRestMouthRegistration['three-quarter-right'].sha256);
});

test('permanent rest plate is bounded and namespaced, accepts only registered URLs, and leaves source/default native artwork intact',()=>{
  for(const view of REGISTERED_BODY_VIEWS){
    const {profile}=candidate('karo',view),c=bodyViewRegistrations.karo[view],source={sha256:c.sha256,width:c.width,height:c.height,url:'assets/rigs/'+c.sha256+'.png'},url=(_file:string,sha:string)=>'assets/rigs/'+sha+'.png';
    const svg=bodyViewMouthSvg(profile,source,url);assert.match(svg,/id="view-rest-mouth-plate" clip-path/);assert.match(svg,/id="view-mouth-layer" opacity="1"/);assert.doesNotMatch(svg,/(?:eye|nose|hair|brow)-/);
    const namespaced=namespaceRigSvg(svg,'actor-karo-');assert.match(namespaced,/id="actor-karo-view-rest-mouth-plate"/);assert.match(namespaced,/url\(#actor-karo-view-rest-mouth-region\)/);assert.doesNotMatch(namespaced,/url\(#view-/);
    assert.throws(()=>bodyViewMouthSvg(profile,source),/resolver required/);assert.throws(()=>bodyViewMouthSvg(profile,source,()=> 'https://example.com/unapproved.png'),/Unapproved resting/);
    assert.throws(()=>bodyViewRestMouthSvg(profile,{...source,height:c.height+1},url),/dimensions changed/);
    const legacy=bodyViewMouthSvg(candidate('karo',view,BODY_VIEW_SPEECH_VERSION).profile,source);assert.doesNotMatch(legacy,/view-rest-mouth-plate/);assert.match(legacy,/view-mouth-layer" opacity="0"/);
  }
});

test('zero aperture remains a closed contour throughout actual silence/zero levels, with deterministic seeking and no head/limb displacement',()=>{
  for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate('karo',view),clocks=[0,500,550,999.999,1000,1499,1500,1800,2300,2500,2600,2700,2800,3500,4000],before=structuredClone({profile,plan,activity});
    const frames=clocks.map(at=>samplePerformance(plan,profile,at,activity)),closed=bodyViewMouthPaths(registeredBodyViewMouth(profile),0);
    for(const index of [14,1,8,2,13,4,0,9,3,10,6,5,12,11,7])assert.deepEqual(samplePerformance(plan,profile,clocks[index]!,activity),frames[index]);
    frames.forEach((frame,i)=>{assert.equal(frame.face['view-mouth-layer']!.opacity,1);const rest=samplePerformance(plan,profile,clocks[i]!,silence);assert.deepEqual(frame.transforms,rest.transforms);assert.deepEqual(frame.hands,rest.hands);
      if(bodyViewMouthLevel(activity,clocks[i]!)===0)assert.equal(frame.paths!['view-mouth-interior'],closed['view-mouth-interior']);
      else assert.notEqual(frame.paths!['view-mouth-interior'],closed['view-mouth-interior']);
    });assert.deepEqual({profile,plan,activity},before);
    const legacy=candidate('karo',view,BODY_VIEW_SPEECH_VERSION);assert.equal(samplePerformance(legacy.plan,legacy.profile,0,silence).face['view-mouth-layer']!.opacity,0);
  }
});

test('Lila uses her original closed smile while sharing the same activity clock and no unnecessary rest plate',()=>{
  for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate('lila',view),legacy=candidate('lila',view,BODY_VIEW_SPEECH_VERSION);
    for(const time of [0,700,1500,2300,2600,3200,4000]){
      const frame=samplePerformance(plan,profile,time,activity),old=samplePerformance(legacy.plan,legacy.profile,time,activity);
      assert.deepEqual(frame.paths,old.paths);assert.deepEqual(frame.face['view-mouth-layer'],old.face['view-mouth-layer']);
    }assert.equal(registeredBodyViewRestMouth(profile),undefined);
  }
});

test('compiled report/security retain exact rest resources, selected protocol, original audio and unchanged production guards',()=>{
  for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate('karo',view),result=performanceScene(plan,profile,activity),report=result.compiled.report;
    assert.equal(report.bodySpeech!.selection,BODY_VIEW_REST_SPEECH_SELECTION);assert.equal(report.bodySpeech!.fingerprint,bodyViewMouthDescription.fingerprint);assert.equal(report.bodySpeech!.restMouth.fingerprint,bodyViewRestMouthDescription.fingerprint);
    assert.equal(report.bodySpeech!.sourceAudioHash,activity.audioHash);assert.equal(report.bodySpeech!.audioVerified,false);assert.equal(report.phonemeLipSync,false);assert.equal(report.bodySpeech!.approved,false);
    assert.deepEqual(validateSceneFiles(secureSceneFiles(result.files),{id:plan.id,startMs:0,endMs:4000} as Shot,2000000,referenceBodyAssets(profile.appearance).map(a=>a.path),plan.stage),[]);
    assert.throws(()=>compilePerformance({...plan,expressions:[{startMs:0,endMs:4000,mood:'angry'}]},profile,activity),/needs-view-expression/);
    assert.throws(()=>compilePerformance({...plan,walks:[{startMs:0,endMs:4000,fromX:plan.root.x,toX:250}]},profile,activity),/needs-view-motion/);
  }
  const config=ConfigSchema.parse({topic:{id:'prehistoric-life'}});assert.equal(topicContext(config)!.readiness.productionReady,false);assert.throws(()=>requireTopicProductionReady(config),/needs-art-direction/);
});

async function pairedFixture(root:string){
  // Existing engineering stage is a structural renderer fixture only; this is
  // not an episode, theme restriction or three-input runtime acceptance.
  const base=await creativeFixture(root),narration=NarrationSchema.parse(base.narration);
  const definitions=(['lila','karo'] as const).map((actor,i)=>{const {profile}=candidate(actor,i?'three-quarter-left':'three-quarter-right');return ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'illustration',identity:'illustrative',appearance:profile.appearance,sourceRefs:base.shot.sourceRefs});});
  const shots=[[0,2500],[2500,5000]].map(([startMs,endMs],i)=>{
    const shot=structuredClone(base.shot),c=shot.cinematic!;shot.id='rest-mouth-cut-'+i;shot.startMs=startMs!;shot.endMs=endMs!;c.shotId=shot.id;c.propBindings=[];c.artDirection=structuredClone(base.artDirection);shot.visualization!.events=[];
    for(const layer of c.artDirection.layers)for(const frame of layer.keyframes)frame.atMs=frame.atMs/2;
    const tracks=definitions.map((character,index)=>{const {plan}=candidate(character.id as 'lila'|'karo',index?'three-quarter-left':'three-quarter-right');plan.durationMs=2500;plan.expressions[0]!.endMs=2500;plan.stage={width:1280,height:720,groundY:540};plan.root={x:index?800:380,y:540};plan.scale=.8;return {character,performance:plan,actions:[{type:'idle' as const,startMs:shot.startMs,endMs:shot.endMs}],speakingSegmentIds:index?['cue']:[]};});
    const primary=tracks[i]!,support=tracks[1-i]!;c.performance=primary.performance;c.actorScene=ActorSceneSchema.parse({primary:primary.character,speakingSegmentIds:primary.speakingSegmentIds,continuity:i?'continuous':'cut',supporting:[support]});
    c.camera={...c.camera,focus:'ensemble',framing:'wide',movement:'locked',startScale:1,endScale:1,anchor:{x:640,y:360}};bindActorShot(shot,base.profile,base.rig);shot.host!.actions=primary.actions;
    c.continuity={...c.continuity,entry:{...c.performance.root},exit:{...c.performance.root},facing:c.performance.facing??'front',carriedProps:[]};shot.camera={...shot.camera,shotSize:c.camera.framing,movement:c.camera.movement};return shot;
  });return {...base,root,narration,board:StoryboardSchema.parse({shots})};
}

test('original owned speech phase preserves mouth across a camera/primary swap while the listener remains closed',async t=>{
  const f=await pairedFixture(await temporary(t)),signal:SpeechActivity={...activity,intervals:[{startMs:500,endMs:1800,level:.7},{startMs:2200,endMs:4800,level:.8}]},before=structuredClone({narration:f.narration,board:f.board,signal});
  const mouthAt=(index:number,owner:'lila'|'karo',time:number)=>{const shot=f.board.shots[index]!,c=shot.cinematic!,a=c.actorScene!.primary!.id===owner?{character:c.actorScene!.primary!,performance:c.performance}:c.actorScene!.supporting.find(a=>a.character.id===owner)!;
    const speech=actorShotSpeech(signal,f.narration,owner,owner==='karo'?['cue']:[],shot.startMs,shot.endMs,owner==='karo'?['cue']:[]);
    return samplePerformance(a.performance,actorProfile(a.character),time,speech.activity,speech.sourceClock,actorViewActingClock(f.board,shot,owner));};
  assert.equal(mouthAt(0,'karo',2500).paths!['view-mouth-interior'],mouthAt(1,'karo',0).paths!['view-mouth-interior']);
  const listener=mouthAt(1,'lila',500);assert.equal(listener.face['view-mouth-layer']!.opacity,0);
  for(const shot of f.board.shots){assert.ok(shotUsesSourceSpeechClock(shot));const rendered=renderCinematic(shot,f.profile,f.rig,signal,f.config,undefined,f.narration,undefined,undefined,f.board);
    const html=rendered.files.files.find(file=>file.path==='index.html')!.content;
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]),karoPrefix=shot.cinematic!.actorScene!.primary!.id==='karo'?'':'actor-karo-';
    assert.deepEqual(ids.filter(id=>id!.endsWith('view-rest-mouth-plate')),[karoPrefix+'view-rest-mouth-plate']);assert.equal(new Set(ids).size,ids.length);assert.deepEqual(validateSceneFiles(secureSceneFiles(rendered.files),shot,2000000,actorRigResourcePaths(shot,f.profile),f.config.rendering.final),[]);
    if(!('actors' in rendered.report))throw new Error('Expected rig actors');for(const actor of rendered.report.actors){if(!('report' in actor))throw new Error('Expected compiled actor');assert.equal(actor.report.bodySpeech!.selection,BODY_VIEW_REST_SPEECH_SELECTION);assert.equal(actor.report.bodySpeech!.sourcePhase!.scope,'storyboard-cues');}
  }assert.deepEqual({narration:f.narration,board:f.board,signal},before);
});

test('rest selection invalidates source/cache/repair identity and artwork replay validates its registered native resource',async t=>{
  const f=await pairedFixture(await temporary(t)),shot=f.board.shots[0]!,identity=rigSpeechInputIdentity(shot,f.narration,f.board),binding=rigSpeechPublicationBinding(shot,f.narration,f.board)!;
  const edited=structuredClone(f.board);for(const s of edited.shots)for(const a of [s.cinematic!.actorScene!.primary!,...s.cinematic!.actorScene!.supporting.map(a=>a.character)])a.appearance.bodySpeech=BODY_VIEW_SPEECH_VERSION;
  for(const s of edited.shots)bindActorShot(s,f.profile,f.rig);assert.notEqual(hash(identity),hash(rigSpeechInputIdentity(edited.shots[0]!,f.narration,edited)));assert.throws(()=>assertRigSpeechPublicationBinding(edited.shots[0]!,f.narration,edited,binding),/changed before repair publication/);
  f.config.models.storyboard.provider='gateway';await writeJson(path.join(f.root,'work/storyboard.json'),f.board);await writeJson(path.join(f.root,'work/narration.json'),f.narration);await writeJson(path.join(f.root,'work/beats.json'),[f.beat]);
  const router=new ModelRouter(f.config,f.root);let calls=0;router.structured=async(_role,_request,schema)=>{calls++;return schema.parse({artDirection:shot.cinematic!.artDirection});};
  const repair=await repairCinematicArtwork(f.root,f.config,router,shot,['isolated rest-mouth source diagnostic'],f.board);const receipt=await readJson<Record<string,unknown>>(repair.attemptFile);await writeJson(repair.attemptFile,{...receipt,status:'domain-rejected'});
  const replay=await repairCinematicArtwork(f.root,f.config,router,shot,['isolated rest-mouth source diagnostic']);assert.equal(calls,1);assert.deepEqual(replay.shot,repair.shot);
});

test('workbench keeps rest selection and labelled diagnostic activity; no final/phoneme acceptance is implied',()=>{
  const html=bodyWorkbench('rest',0,'happy','three-quarter-left','cutout',BODY_VIEW_REST_SPEECH_SELECTION);assert.match(html,/registered-rest-mouth-v1" selected/);assert.match(html,/segment-draft/);assert.match(html,/productionReady=false/);
  const speaking=bodyWorkbench('rest',2300,'happy','three-quarter-left','cutout',BODY_VIEW_REST_SPEECH_SELECTION);assert.notEqual(hash(html),hash(speaking));
  assert.ok(bodyViewMouthLevel(BODY_MOUTH_PREVIEW_ACTIVITY,2300)>0);assert.equal(bodyViewRestMouthDescription.approved,false);
});
