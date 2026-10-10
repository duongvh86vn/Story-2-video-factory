// DECLARED / NOT RUN. User QA owns callbacks, schemas, fixtures, samplers,
// rendering, real audio, anatomy/art/motion and complete factory acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {ConfigSchema} from '../packages/core/config.js';
import type {Shot,Storyboard,Narration} from '../packages/core/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {BODY_SOURCE_VERSION,MANIPULATION_SOURCE_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {VIEW_ACTING_CLOCK_VERSION,validateViewActingClock,type ViewActingClock} from '../packages/animation/view-acting-clock.js';
import {PROFILE_BODY_MANIPULATION_SELECTION,profileManipulationBindings} from '../packages/animation/body-view-profile-manipulation-binding.js';
import {PROFILE_BODY_LOCOMOTION_SELECTION} from '../packages/animation/body-view-profile-cloth-binding.js';
import {BODY_VIEW_MANIPULATION_SELECTION,registeredNativeManipulation,sampleNativeContactArm,nativeManipulationDescription,validateNativeContactBodyClock} from '../packages/animation/native-contact-arm.js';
import {registeredBodyView,registeredManipulationBodyView,registeredDetailedBodyView} from '../packages/animation/body-view-art.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {articulatedArmReference,articulatedPoseFromDirections} from '../packages/animation/arm-trajectory.js';
import {compilePerformance,samplePerformance,validatePerformance,solveChain} from '../packages/animation/compiler.js';
import {validateManipulationSourcePlan,sourceManipulationTime} from '../packages/animation/view-source-manipulation.js';
import {validatePropBindings} from '../packages/director/props.js';
import {bodyCalibrationPlan,BODY_MANIPULATION_MODES,type BodyAction} from '../packages/topics/body-workbench.js';
import {normalizeTopicActorAppearance} from '../packages/topics/cast-appearance.js';
import {topicAppearance,requireTopicProductionReady} from '../packages/topics/prehistoric-life.js';

type Actor='lila'|'karo';type View='left'|'right';type Hand='left'|'right';
const actors=['lila','karo'] as const,views=['left','right'] as const,hands=['left','right'] as const;
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
function candidate(actor:Actor,view:View,action:BodyAction='rest',hand:Hand='right',moving=false){
  return bodyCalibrationPlan(actor,action,'happy',hand,view,'cutout','silent','native','rest','native',moving?PROFILE_BODY_LOCOMOTION_SELECTION:'rigid','rigid','unregistered',PROFILE_BODY_MANIPULATION_SELECTION);
}
function original(actor:Actor,view:View,action:BodyAction,hand:Hand,moving=true){
  const f=candidate(actor,view,action,hand,moving),source={version:MANIPULATION_SOURCE_VERSION,id:'own-profile-contact',startMs:1000,endMs:5000,props:structuredClone(f.plan.props),gestures:structuredClone(f.plan.gestures)},body={version:BODY_SOURCE_VERSION,id:'own-profile-body',startMs:1000,endMs:5000,walks:structuredClone(f.plan.walks),jumps:structuredClone(f.plan.jumps??[])};
  const plan:PerformancePlan={...f.plan,expressions:[],gazes:[],props:[],gestures:[],walks:[],jumps:[],sourceBody:body,sourceManipulation:source};
  const clock:ViewActingClock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:plan.leadCharacterId,startMs:1000,endMs:5000,runStartMs:1000,runEndMs:5000,sourceIdentityHash:hash({source,body}),gazes:[],gestures:[],bodyMotion:body,manipulationMotion:source};
  return {...f,plan,source,body,clock};
}
function slice(f:ReturnType<typeof original>,from:number,to:number){return {plan:{...f.plan,durationMs:to-from},clock:{...f.clock,startMs:1000+from,endMs:1000+to}};}
function physical(f:ReturnType<typeof candidate>,timeMs:number){
  const frame=samplePerformance(f.plan,f.profile,timeMs,silence),m=rigMetrics(f.profile),numbers=(s:string)=>s.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)!.map(Number);
  for(const side of hands){const a=numbers(frame.transforms['arm-'+side+'-upper']!),b=numbers(frame.transforms['arm-'+side+'-lower']!),w=frame.wrists![side];assert.ok(Math.abs(Math.hypot(b[0]!-a[0]!,b[1]!-a[1]!)-m.arms![side].upper*f.plan.scale)<.02);assert.ok(Math.abs(Math.hypot(w.x-b[0]!,w.y-b[1]!)-m.arms![side].lower*f.plan.scale)<.02);assert.ok(frame.armGeometry![side]!.flexionDeg<=125+.01);}
  assert.doesNotMatch(JSON.stringify(frame),/NaN|Infinity/);return frame;
}

test('four profile sources bind exact own pixels/canvas and authored rest poles, with canonical same-person palms',()=>{
  assert.ok(BODY_MANIPULATION_MODES.includes(PROFILE_BODY_MANIPULATION_SELECTION));
  for(const actor of actors)for(const view of views){const f=candidate(actor,view),b=profileManipulationBindings[actor][view],bytes=readFileSync(b.file),source=registeredManipulationBodyView(f.profile),r=registeredNativeManipulation(f.profile,source),m=rigMetrics(f.profile);
    assert.equal(hash(bytes),b.sha256);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[b.width,b.height]);assert.equal(source.file,b.file);assert.equal(r.body.sha256,b.sha256);assert.equal(registeredBodyView(f.profile).view,view);assert.equal(m.armRestPole!.left,actor==='karo'?1:-1);assert.equal(m.armRestPole!.right,actor==='karo'?-1:1);assert.ok(r.palms.left&&r.palms.right);assert.throws(()=>registeredDetailedBodyView(f.profile),/detailed3\/4/);
    for(const altered of [{...source,sha256:'0'.repeat(64)},{...source,width:source.width+1},{...source,height:source.height+1},{...source,view:view==='left'?'right' as const:'left' as const}])assert.throws(()=>registeredNativeManipulation(f.profile,altered),/source registration differs/);
    assert.equal(normalizeTopicActorAppearance(actor,topicAppearance(actor),f.profile.appearance).bodyManipulation,PROFILE_BODY_MANIPULATION_SELECTION);
  }
});

test('only exact profile manipulation grants contact; other views, colour, head-bank, cast and seat stay closed',()=>{
  for(const actor of actors)for(const view of views){const f=candidate(actor,view,'operate');assert.doesNotThrow(()=>HostProfileSchema.parse(f.profile));
    for(const bodyView of ['front','back-left','back-right','three-quarter-left','three-quarter-right'] as const){const raw={...f.profile,appearance:{...f.profile.appearance,bodyView}};assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredManipulationBodyView(raw));}
    for(const patch of [{bodyManipulation:undefined},{bodyManipulation:BODY_VIEW_MANIPULATION_SELECTION},{sourceColour:'source-rgb-v2'},{bodySeat:'registered-seated-v1'},{supportingModel:'prehistoric-male-bald'},{bodyHeadBank:{actor:'lila'}}]){const raw={...f.profile,appearance:{...f.profile.appearance,...patch}} as unknown as HostProfile;assert.throws(()=>registeredManipulationBodyView(raw));}
    assert.throws(()=>bodyCalibrationPlan(actor,'operate','happy','right',view),/capability|explicitly select/);
    for(const patch of [{turns:[{startMs:0,endMs:1000,direction:'left'}]},{headTurns:[{startMs:0,endMs:1000,direction:'left'}]},{props:[{id:'unregistered-spear',origin:{x:200,y:250},kind:'spear',length:300}]}])assert.throws(()=>validatePerformance({...f.plan,...patch} as PerformancePlan,f.profile));
  }
});

test('both hands inspect/operate with fixed bones and exact contact rather than target repair or deterministic pose drift',()=>{
  for(const actor of actors)for(const view of views)for(const hand of hands)for(const action of ['inspect','operate'] as const){const f=candidate(actor,view,action,hand),before=hash(f);
    for(const t of [3700,0,600,1000,1200,2000,2800,3250,3999,600]){const a=physical(f,t);assert.deepEqual(a,samplePerformance(f.plan,f.profile,t,silence));if(action==='operate'&&t>=1000&&t<=2800)assert.ok(Math.hypot(a.hands[hand].x-f.plan.gestures[0]!.target!.x,a.hands[hand].y-f.plan.gestures[0]!.target!.y)<.001);}assert.equal(hash(f),before);
  }
});

test('pickup/carry/drop retain the actual object, one palm slot, actual release and fixed cuffs on all own profiles/hands',()=>{
  for(const actor of actors)for(const view of views)for(const hand of hands)for(const action of ['pick-place','carry','drop'] as const){const f=candidate(actor,view,action,hand,action==='carry'),before=hash(f),p=f.plan.props[0]!;
    for(const t of [0,600,1000,1450,1800,2350,2799,2800,3000,3300,3700]){const a=physical(f,t),object=a.props[p.id]!;assert.equal(['front','back','prop'].map(slot=>a.face['hand-'+hand+'-'+slot+'-slot']!.opacity!).reduce((x,y)=>x+y,0),1);
      if(t>=1000&&t<2800){assert.equal(object.attached,true);assert.ok(Math.hypot(a.hands[hand].x-object.point.x,a.hands[hand].y-object.point.y)<.001);assert.equal(a.face['hand-'+hand+'-prop-slot']!.opacity,1);}if(t>=(action==='drop'?3300:2800))assert.deepEqual(object.point,p.destination);
    }if(action==='carry')assert.equal(Math.sign(f.plan.walks[0]!.toX-f.plan.walks[0]!.fromX),view==='left'?-1:1);assert.equal(hash(f),before);
  }
});

test('an explicit own reversed rest pole keeps its angular branch; legacy callers retain their per-hand default',()=>{
  const shoulder={x:0,y:0},neutral={x:0,y:90},target={x:70,y:40},g={id:'own-pole',action:'operate' as const,hand:'right' as const,elbowPole:'rest' as const,startMs:0,contactMs:400,releaseMs:800,endMs:1200,target};
  for(const pole of [-1,1]){const rest=solveChain(shoulder,neutral,50,50,pole),active=solveChain(shoulder,target,50,50,pole),reference={pole,restPole:pole,shoulder:articulatedArmReference(articulatedPoseFromDirections(rest.upper+90,rest.lower+90),articulatedPoseFromDirections(active.upper+90,active.lower+90))},sample=(t:number)=>sampleNativeContactArm(shoulder,neutral,target,g,t,50,50,'right',reference,solveChain);
    for(let t=0;t<=1200;t+=17){const a=sample(t);assert.ok((a.lower-a.upper)*pole>=0);assert.ok(Math.abs(Math.hypot(a.joint.x,a.joint.y)-50)<1e-9);}for(const t of [0,400,800,1200]){const a=sample(t),b=sample(t+.01);assert.ok(Math.hypot(a.end.x-b.end.x,a.end.y-b.end.y)<1e-5);}
    assert.throws(()=>sampleNativeContactArm(shoulder,neutral,target,g,600,50,50,'right',{...reference,restPole:0},solveChain),/branch changed/);if(pole===-1)assert.throws(()=>sampleNativeContactArm(shoulder,neutral,target,g,600,50,50,'right',{...reference,restPole:undefined},solveChain),/branch changed/);
  }
});

test('approach/contact/place/drop flight are identical across original camera cuts including release before the current shot',()=>{
  for(const actor of actors)for(const view of views)for(const hand of hands)for(const action of ['pick-place','drop'] as const){const f=original(actor,view,action,hand),before=hash(f);validatePerformance(f.plan,f.profile);validateViewActingClock(f.plan,f.clock);
    for(const [from,to]of [[0,700],[700,1400],[1400,2900],[2900,4000]]){const cut=slice(f,from!,to!);for(const t of [to!-from!,0,Math.floor((to!-from!)/2),0]){const a=samplePerformance(f.plan,f.profile,from!+t,silence,undefined,f.clock),b=samplePerformance(cut.plan,f.profile,t,silence,undefined,cut.clock);assert.deepEqual(b.hands,a.hands);assert.deepEqual(b.props,a.props);assert.equal(b.contactError,a.contactError);assert.deepEqual(b.paths,a.paths);}}
    assert.equal(hash(f),before);
  }
});

test('profile carry follows the original body with correct lift/lower margins even when local movement/contact arrays are empty',()=>{
  for(const actor of actors)for(const view of views){const f=original(actor,view,'carry','right'),cut=slice(f,1700,2600);assert.deepEqual(cut.plan.walks,[]);assert.deepEqual(cut.plan.gestures,[]);
    for(const t of [900,0,200,500,100,900]){const a=samplePerformance(f.plan,f.profile,1700+t,silence,undefined,f.clock),b=samplePerformance(cut.plan,f.profile,t,silence,undefined,cut.clock);assert.deepEqual(b.root,a.root);assert.deepEqual(b.feet,a.feet);assert.deepEqual(b.props,a.props);assert.deepEqual(b.hands,a.hands);}
    const early=structuredClone(f.plan);early.sourceBody!.walks[0]!.startMs=1001;assert.throws(()=>validatePerformance(early,f.profile),/after lift/);assert.throws(()=>validateNativeContactBodyClock(f.plan),/complete owned shot clock/);
  }
});

test('stationary complete contact survives cuts without selecting motion, while any original physical track still needs its own capability',()=>{
  for(const actor of actors)for(const view of views)for(const action of ['operate','pick-place','drop'] as const){const f=original(actor,view,action,'right',false),cut=slice(f,700,1800),before=hash(f);assert.equal(f.profile.appearance.bodyMotion,undefined);assert.doesNotThrow(()=>validatePerformance(f.plan,f.profile));
    for(const t of [0,300,700,1100]){const a=samplePerformance(f.plan,f.profile,700+t,silence,undefined,f.clock),b=samplePerformance(cut.plan,f.profile,t,silence,undefined,cut.clock);assert.deepEqual(b.hands,a.hands);assert.deepEqual(b.props,a.props);}
    for(const patch of [{walks:[{startMs:1450,endMs:2350,fromX:f.plan.root.x,toX:f.plan.root.x+(view==='left'?-18:18)}]},{jumps:[{startMs:1400,takeoffMs:1600,landingMs:1800,endMs:2000,height:10}]},{postures:[{pose:'crouch',startMs:1400,endMs:1800}]},{entryPosture:{pose:'stand'}}]){const wrong={...f.plan,sourceBody:{...f.body,...patch}} as PerformancePlan;assert.throws(()=>validatePerformance(wrong,f.profile));}assert.equal(hash(f),before);
  }
});

test('missing/foreign/edited original clocks, local ownership, wrong poles and impossible reach fail without repairing input',()=>{
  const f=original('karo','right','pick-place','right'),cut=slice(f,700,1800),before=hash(f);assert.throws(()=>samplePerformance(cut.plan,f.profile,0,silence),/complete owned clock/);assert.throws(()=>validateManipulationSourcePlan({...cut.plan,sourceBody:undefined}),/complete original body clock/);assert.throws(()=>validateManipulationSourcePlan({...cut.plan,props:f.source.props}),/local props\/contact/);
  assert.throws(()=>sourceManipulationTime(cut.plan,{...cut.clock,ownerId:'foreign'},0),/owned shot clock/);const changed=structuredClone(cut.clock);changed.manipulationMotion!.props[0]!.gripOffset={x:1,y:0};assert.throws(()=>validateViewActingClock(cut.plan,changed),/local declaration differs/);
  const wrong=structuredClone(f.plan);wrong.sourceManipulation!.gestures[0]!.elbowPole='reach';assert.throws(()=>validatePerformance(wrong,f.profile),/elbowPole=rest/);const far=candidate('karo','right','operate','right');far.plan.gestures[0]!.target!.x+=1000;assert.throws(()=>samplePerformance(far.plan,far.profile,1500,silence),/cannot reach/);assert.equal(hash(f),before);
});

function ensemble(){
  const cast=actors.map((actor,i)=>{const f=original(actor,i?'left':'right','carry',i?'left':'right'),character=ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'story actor',identity:'fictional',appearance:f.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'line',quote:actor}]}),profile=actorProfile(character);return {...f,character,profile,plan:{...f.plan,profileHash:profile.profileHash,leadCharacterId:character.id}};});
  const shots=[1000,3000].map((startMs,i)=>{const parts=cast.map(a=>({character:a.character,performance:{...a.plan,id:'contact-'+i+'-'+a.character.id,durationMs:2000,expressions:[{startMs:0,endMs:2000,mood:'happy' as const}]},actions:[],speakingSegmentIds:[]}));return {id:'own-profile-cut-'+i,startMs,endMs:startMs+2000,narrationSegmentIds:['line'],cinematic:{performance:parts[i]!.performance,actorScene:{primary:parts[i]!.character,speakingSegmentIds:[],supporting:[parts[1-i]!],continuity:i?'continuous':'cut'}}} as unknown as Shot;});return {cast,shots,board:{shots} as Storyboard};
}
test('both actor-owned original contacts persist through primary/supporting swaps and any sibling source edit invalidates publication',()=>{
  const f=ensemble(),before=hash(f.board),narration:Narration={mode:'wav',durationMs:5000,words:[],segments:[{id:'line',startMs:1000,endMs:5000,text:'Lila and Karo carry separate objects.'}]},binding=rigSpeechPublicationBinding(f.shots[0]!,narration,f.board);
  for(const actor of f.cast){const clocks=f.shots.map(s=>actorViewActingClock(f.board,s,actor.character.id)!);assert.equal(clocks[0]!.sourceIdentityHash,clocks[1]!.sourceIdentityHash);assert.deepEqual(clocks[0]!.manipulationMotion,actor.source);assert.deepEqual(clocks[0]!.bodyMotion,actor.body);assert.deepEqual(clocks[0]!.expressions,[{startMs:1000,endMs:5000,mood:'happy'}]);const plan={...actor.plan,durationMs:2000,expressions:[{startMs:0,endMs:2000,mood:'happy' as const}]},a=samplePerformance(plan,actor.profile,2000,silence,undefined,clocks[0]),b=samplePerformance(plan,actor.profile,0,silence,undefined,clocks[1]);assert.deepEqual(a.hands,b.hands);assert.deepEqual(a.props,b.props);assert.deepEqual(a.paths,b.paths);}
  const edited=structuredClone(f.board);edited.shots[1]!.cinematic!.performance.sourceManipulation!.props[0]!.gripOffset={x:1,y:0};assert.throws(()=>actorViewActingClock(edited,edited.shots[0]!,'karo'));assert.throws(()=>assertRigSpeechPublicationBinding(edited.shots[0]!,narration,edited,binding));assert.equal(hash(f.board),before);
});

test('compiled report preserves exact mode/source phase and generic markers cannot satisfy production source/approval gates',()=>{
  const f=original('lila','left','pick-place','left'),cut=slice(f,700,1800),c=compilePerformance(cut.plan,f.profile,silence,'own-',undefined,cut.clock);assert.equal(c.report.bodyManipulation!.selection,PROFILE_BODY_MANIPULATION_SELECTION);assert.equal(c.report.bodyManipulation!.motionVerified,false);assert.equal(c.report.bodyManipulation!.audioVerified,false);assert.equal(c.report.phonemeLipSync,false);assert.ok(c.report.maxInterpolationGapPx<=.2);assert.ok(c.frames.some(frame=>frame.timeMs===300));
  assert.equal(nativeManipulationDescription.ownProfile.sourceCount,4);assert.equal(nativeManipulationDescription.ownProfile.productionReady,false);assert.equal(nativeManipulationDescription.ownProfile.handoff,false);assert.deepEqual(nativeManipulationDescription.ownProfile.availableBanks,[]);assert.throws(()=>requireTopicProductionReady(ConfigSchema.parse({topic:{id:'prehistoric-life'}})),/needs-art-direction/);assert.throws(()=>validatePropBindings({id:'unbound-contact',cinematic:{performance:cut.plan,actorScene:{supporting:[]}}} as unknown as Shot),/needs-source-prop-binding/);
  const old=bodyCalibrationPlan('lila','operate','happy','right','three-quarter-right','cutout','silent','native','rest','native','rigid','rigid','unregistered',BODY_VIEW_MANIPULATION_SELECTION);assert.equal(registeredManipulationBodyView(old.profile).view,'three-quarter-right');assert.equal(old.profile.appearance.bodyManipulation,BODY_VIEW_MANIPULATION_SELECTION);
});
