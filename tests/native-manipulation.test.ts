// DECLARED ONLY. The user's model runs all geometry/renderer/runtime callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../packages/core/utils.js';
import {ConfigSchema} from '../packages/core/config.js';
import {ShotSchema,type Shot} from '../packages/core/schemas.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {buildRig} from '../packages/host/rig.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {samplePerformance,compilePerformance,validatePerformance,solveChain} from '../packages/animation/compiler.js';
import {articulatedArmReference,articulatedPoseFromDirections} from '../packages/animation/arm-trajectory.js';
import {BODY_VIEW_MANIPULATION_SELECTION,registeredNativeManipulation,sampleNativeContactArm,nativeContactWindow,validateNativeContactBodyClock,nativeManipulationDescription} from '../packages/animation/native-contact-arm.js';
import {VIEW_ACTING_CLOCK_VERSION} from '../packages/animation/view-acting-clock.js';
import {bodyViewRegistrations} from '../packages/animation/body-view-registration.js';
import {BODY_VIEW_LOCOMOTION_SELECTION} from '../packages/animation/body-view-cloth.js';
import {bodyCalibrationPlan,bodyWorkbench,type BodyAction} from '../packages/topics/body-workbench.js';
import {normalizeTopicActorAppearance,TOPIC_RENDER_SELECTION_KEYS} from '../packages/topics/cast-appearance.js';
import {topicAppearance,requireTopicProductionReady} from '../packages/topics/prehistoric-life.js';
import {headFaceCalibration} from '../packages/topics/head-face-workbench.js';
import {DIRECTION_VERSION} from '../packages/director/schemas.js';
import {stageModels} from '../packages/director/models.js';
import {modelExitParts,validatePropBindings} from '../packages/director/props.js';
import {validateCinematicShot} from '../packages/director/index.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
type Actor='lila'|'karo';type View='three-quarter-left'|'three-quarter-right';type Hand='left'|'right';
const actors=['lila','karo'] as const,views=['three-quarter-left','three-quarter-right'] as const,hands=['left','right'] as const;
function candidate(actor:Actor,view:View,action:BodyAction,hand:Hand,walk=false){
  return bodyCalibrationPlan(actor,action,'happy',hand,view,'cutout','silent','native','rest','native',walk?BODY_VIEW_LOCOMOTION_SELECTION:'rigid','rigid','unregistered',BODY_VIEW_MANIPULATION_SELECTION);
}
const numbers=(s:string)=>s.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)!.map(Number);
function physical(f:ReturnType<typeof candidate>,t:number){
  const frame=samplePerformance(f.plan,f.profile,t,silence),m=rigMetrics(f.profile);
  for(const hand of hands){const a=numbers(frame.transforms['arm-'+hand+'-upper']!),b=numbers(frame.transforms['arm-'+hand+'-lower']!),w=frame.wrists![hand];
    assert.ok(Math.abs(Math.hypot(b[0]!-a[0]!,b[1]!-a[1]!)-m.arms![hand].upper*f.plan.scale)<.02);
    assert.ok(Math.abs(Math.hypot(w.x-b[0]!,w.y-b[1]!)-m.arms![hand].lower*f.plan.scale)<.02);
    assert.ok(frame.armGeometry![hand]!.upperRatio>=.7&&frame.armGeometry![hand]!.lowerRatio>=.7);
  }return frame;
}

test('native contact selection is explicit, source-bound and preserved by topic normalization',()=>{
  assert.ok(TOPIC_RENDER_SELECTION_KEYS.includes('bodyManipulation'));
  for(const actor of actors)for(const view of views){const f=candidate(actor,view,'rest','right'),source=bodyViewRegistrations[actor][view];
    HostProfileSchema.parse(f.profile);const binding=registeredNativeManipulation(f.profile,source);assert.equal(binding.body.sha256,source.sha256);
    assert.deepEqual(normalizeTopicActorAppearance(actor,topicAppearance(actor),f.profile.appearance).bodyManipulation,BODY_VIEW_MANIPULATION_SELECTION);
    for(const patch of [{artworkVersion:'forest-body-1'},{bodyView:undefined},{characterVariant:undefined}])assert.equal(HostProfileSchema.safeParse({...f.profile,appearance:{...f.profile.appearance,...patch}}).success,false);
    assert.throws(()=>registeredNativeManipulation(f.profile,{...source,sha256:'a'.repeat(64)}),/source registration differs/);
    assert.throws(()=>bodyCalibrationPlan(actor,'pick-place','happy','right',view),/explicitly select/);
  }
  assert.throws(()=>bodyCalibrationPlan('lila','rest','happy','right','source','cutout','silent','native','rest','native','rigid','rigid','unregistered',BODY_VIEW_MANIPULATION_SELECTION),/explicit native body view/);
  assert.throws(()=>requireTopicProductionReady(ConfigSchema.parse({topic:{id:'prehistoric-life'}})),/needs-art-direction/);
});

test('both own views and hands inspect or operate with fixed cuff/palm geometry and deterministic seeks',()=>{
  for(const actor of actors)for(const view of views)for(const hand of hands)for(const action of ['inspect','operate'] as const){const f=candidate(actor,view,action,hand),before=hash(f);
    for(const t of [3700,0,600,1000,1200,2000,2800,3250,3999,600]){const frame=physical(f,t);assert.deepEqual(frame,samplePerformance(f.plan,f.profile,t,silence));
      if(action==='operate'&&t>=1000&&t<=2800)assert.ok(Math.hypot(frame.hands[hand].x-f.plan.gestures[0]!.target!.x,frame.hands[hand].y-f.plan.gestures[0]!.target!.y)<.001);
    }assert.equal(hash(f),before);
  }
});

test('native pickup places the real object center without stretching arms or moving its authored target',()=>{
  for(const actor of actors)for(const view of views)for(const hand of hands){const f=candidate(actor,view,'pick-place',hand),prop=f.plan.props[0]!,before=hash(f);
    for(const t of [0,300,600,1000,1400,2000,2799,2800,3300,4000]){const frame=physical(f,t),object=frame.props[prop.id]!;
      const visible=['front','back','prop'].map(slot=>frame.face['hand-'+hand+'-'+slot+'-slot']!.opacity!);assert.equal(visible.reduce((a,b)=>a+b,0),1);
      if(t>=1000&&t<2800){assert.equal(frame.face['hand-'+hand+'-prop-slot']!.opacity,1);assert.equal(object.attached,true);assert.ok(Math.hypot(frame.hands[hand].x-object.point.x,frame.hands[hand].y-object.point.y)<.001);assert.equal(frame.armGeometry![hand]!.role,'manipulate');}
      if(t>=2800)assert.deepEqual(object.point,prop.destination);
    }assert.equal(hash(f),before);
  }
});

test('native carry uses the actual forward body path, then lowers and releases before recovery',()=>{
  for(const actor of actors)for(const view of views)for(const hand of hands){const f=candidate(actor,view,'carry',hand,true),p=f.plan.props[0]!;
    assert.equal(f.plan.walks.length,1);assert.equal(Math.sign(f.plan.walks[0]!.toX-f.plan.walks[0]!.fromX),view==='three-quarter-left'?-1:1);
    for(const t of [1000,1125,1250,1450,1675,1900,2350,2550,2799,2800,3200]){const frame=physical(f,t),object=frame.props[p.id]!;
      if(t<2800){assert.equal(object.attached,true);assert.ok(Math.hypot(frame.hands[hand].x-object.point.x,frame.hands[hand].y-object.point.y)<.001);}else assert.deepEqual(object.point,p.destination);
      for(const side of hands)if(frame.stance[side])assert.equal(frame.feet[side].y,f.plan.stage.groundY);
    }
    const broken=structuredClone(f.plan);broken.walks[0]!.startMs=1001;assert.throws(()=>validatePerformance(broken,f.profile),/after lift/);
  }
});

test('native drop owns the real release palm; flight and landing do not pull the arm toward the floor',()=>{
  for(const actor of actors)for(const view of views)for(const hand of hands){const f=candidate(actor,view,'drop',hand),p=f.plan.props[0]!;
    for(const t of [1000,1250,1800,2799,2800,3000,3300,3700]){const frame=physical(f,t),object=frame.props[p.id]!;
      if(t<2800)assert.ok(Math.hypot(frame.hands[hand].x-object.point.x,frame.hands[hand].y-object.point.y)<.001);
      if(t>=3300)assert.deepEqual(object.point,p.destination);
      assert.ok(object.point.y<=f.plan.stage.groundY);
    }
  }
});

test('contact angular approach/recovery has zero endpoint speed and keeps one elbow branch; owned exit and entry retain grip',()=>{
  const shoulder={x:0,y:0},neutral={x:0,y:90},target={x:70,y:40},upper=50,lower=50;
  const rest=solveChain(shoulder,neutral,upper,lower,1),active=solveChain(shoulder,target,upper,lower,1);
  const reference={pole:1,shoulder:articulatedArmReference(articulatedPoseFromDirections(rest.upper+90,rest.lower+90),articulatedPoseFromDirections(active.upper+90,active.lower+90))};
  const g={id:'contact',action:'operate' as const,hand:'right' as const,elbowPole:'rest' as const,startMs:0,contactMs:400,releaseMs:800,endMs:1200,target};
  const sample=(t:number,gesture=g)=>sampleNativeContactArm(shoulder,neutral,target,gesture,t,upper,lower,'right',reference,solveChain);
  for(const boundary of [0,400,800,1200]){const a=sample(boundary-.01),b=sample(boundary),c=sample(boundary+.01);assert.ok(Math.hypot(a.end.x-b.end.x,a.end.y-b.end.y)<1e-5);assert.ok(Math.hypot(c.end.x-b.end.x,c.end.y-b.end.y)<1e-5);}
  for(let t=0;t<=1200;t+=17){const s=sample(t);assert.ok(s.lower-s.upper>=0);assert.ok(Math.abs(Math.hypot(s.joint.x,s.joint.y)-upper)<1e-9);}
  const carry={...g,action:'carry' as const,releaseMs:undefined};const held=sampleNativeContactArm(shoulder,neutral,target,carry,1200,upper,lower,'right',reference,solveChain).end;assert.ok(Math.hypot(held.x-target.x,held.y-target.y)<1e-9);
  const entry={...g,action:'drop' as const,contactMs:0};assert.ok(Math.hypot(sampleNativeContactArm(shoulder,neutral,target,entry,0,upper,lower,'right',reference,solveChain).end.x-target.x,sampleNativeContactArm(shoulder,neutral,target,entry,0,upper,lower,'right',reference,solveChain).end.y-target.y)<1e-9);
});

test('unreachable/folded grips, wrong poles and source timing remain blocking errors without target repair',()=>{
  const f=candidate('karo','three-quarter-left','pick-place','left'),before=hash(f);
  const wrong=structuredClone(f.plan);wrong.gestures[0]!.elbowPole='reach';assert.throws(()=>validatePerformance(wrong,f.profile),/elbowPole=rest/);
  const outside=structuredClone(f.plan);outside.gestures[0]!.target!.x-=1000;assert.throws(()=>samplePerformance(outside,f.profile,1500,silence),/cannot reach/);
  const m=rigMetrics(f.profile),folded=structuredClone(f.plan);folded.gestures[0]!.target={x:f.plan.root.x+m.shoulders!.left.x+22,y:f.plan.root.y+m.pelvisY+m.shoulders!.left.y+8};folded.gestures[0]!.destination={...folded.gestures[0]!.target};assert.throws(()=>samplePerformance(folded,f.profile,1500,silence),/folds|keypose|cannot reach/);
  const span=structuredClone(f.plan);span.gestures[0]!.sourceSpan={id:'wrong-clock',startMs:0,endMs:4000};assert.throws(()=>validatePerformance(span,f.profile),/source.*point\/think|only explicit source/);
  const missing={...f.profile,appearance:{...f.profile.appearance,bodyManipulation:undefined}};assert.throws(()=>samplePerformance(f.plan,missing,1000,silence),/needs-view-motion/);
  const spear=structuredClone(f.plan);spear.props[0]!.kind='spear';spear.props[0]!.length=300;assert.throws(()=>validatePerformance(spear,f.profile),/left-view spear/);
  assert.throws(()=>nativeContactWindow({...f.plan.gestures[0]!,contactMs:300}),/invalid.*clock/);assert.equal(hash(f),before);
});

function ensemble(){
  const config=ConfigSchema.parse({presentation:{mode:'story-cinematic',character_mode:'actors'},rendering:{final:{width:1280,height:720,fps:30}}}),ref={kind:'narration' as const,segmentId:'cue',quote:'Lila picks up the basket and Karo picks up the bowl, then both set them down.'};
  const f=[candidate('lila','three-quarter-right','pick-place','left'),candidate('karo','three-quarter-left','pick-place','right')];
  const characters=f.map((v,i)=>ActorDefinitionSchema.parse({id:i?'karo-person':'lila-person',name:i?'Karo':'Lila',role:ref.quote,identity:'illustrative',kind:'stick-man',appearance:v.profile.appearance,sourceRefs:[ref]}));
  const profiles=characters.map(c=>actorProfile(c)),parts:NonNullable<Shot['visualization']>['parts']=[];
  const plans=f.map((v,i)=>{const p=structuredClone(v.plan),dx=(i?900:350)-p.root.x,dy=550-p.root.y,move=(x:{x:number;y:number})=>({x:x.x+dx,y:x.y+dy});p.root=move(p.root);p.stage={width:1280,height:720,groundY:550};p.profileHash=profiles[i]!.profileHash;p.leadCharacterId=profiles[i]!.id;p.fps=30;
    p.props=p.props.map(prop=>({...prop,id:i?'bowl-prop':'basket-prop',origin:move(prop.origin),destination:move(prop.destination!)}));p.gestures=p.gestures.map(g=>({...g,id:'place-'+i,propId:p.props[0]!.id,target:move(g.target!),destination:move(g.destination!)}));
    const origin=p.props[0]!.origin;parts.push({id:i?'bowl':'basket',label:i?'bowl':'basket',kind:'object',x:origin.x/1280,y:origin.y/720,width:20/1280,height:20/720,sourceRefs:[ref]});return p;});
  const actions=plans.map((p,i)=>[{type:'operate-model' as const,hand:p.gestures[0]!.hand,startMs:1000+p.gestures[0]!.startMs,endMs:1000+p.gestures[0]!.endMs,contactMs:1000+p.gestures[0]!.contactMs!,narrationAnchor:'cue',target:{modelId:'native-world',partId:parts[i]!.id,anchor:'center' as const}}]);
  const shot=ShotSchema.parse({id:'native-props',startMs:1000,endMs:5000,beatIds:['beat'],sceneType:'character-scene',subject:ref.quote,characters:characters.map(c=>c.id),visualDescription:ref.quote,camera:{shotSize:'wide',movement:'locked',angle:'eye-level'},recipeId:'host-mechanism-explainer',renderer:'hyperframes',narrationSegmentIds:['cue'],sourceRefs:[ref],host:{id:profiles[0]!.id,profileVersion:1,rigHash:buildRig(profiles[0]!).rigHash,presence:'beside-model',actions:actions[0]},visualization:{type:'summary',modelId:'native-world',provenance:'visualization',fidelity:'conceptual',parts,relations:[],events:[]}});
  shot.cinematic={version:22,producer:DIRECTION_VERSION,shotId:shot.id,leadCharacterId:profiles[0]!.id,motivation:ref.quote,attentionPartId:parts[0]!.id,sourceRefs:[ref],setting:'forest',provenance:'illustration',models:stageModels(shot),propBindings:plans.map((p,i)=>({propId:p.props[0]!.id,partId:parts[i]!.id,...(i?{ownerId:profiles[i]!.id}:{}),role:'illustrative-model' as const,sourceRefs:[ref]})),actorScene:{primary:characters[0]!,speakingSegmentIds:[],continuity:'cut',supporting:[{character:characters[1]!,performance:plans[1]!,actions:actions[1]!,speakingSegmentIds:[]}]},artDirection:{origin:'authored',brief:'Two sourced actors manipulate their own separate objects.',useEnvironment:false,palette:{background:'#A2D9F7',surface:'#FFE3A8',ink:'#17363F',accent:'#F58A29'},showHeading:false,layers:[],models:parts.map(part=>({partId:part.id,sourceRefs:[ref],svg:'<circle r="40" fill="#C77732"/>'}))},continuity:{entry:{...plans[0]!.root},exit:{...plans[0]!.root},facing:'right',carriedProps:[],models:[]},camera:{framing:'wide',movement:'locked',focus:'ensemble',anchor:{x:640,y:330},startScale:1,endScale:1,designIntent:'Both own native actors and their actual grips stay visible.'},performance:plans[0]!};
  shot.cinematic.continuity.models=modelExitParts(shot).map(p=>({partId:p.id,x:p.x,y:p.y,width:p.width,height:p.height}));return {config,shot,plans,profiles};
}

test('canonical renderer draws both actual native actors and distinct owned props using the same physical compiler',()=>{
  const f=ensemble(),before=hash(f);validatePropBindings(f.shot);validateCinematicShot(f.shot,f.profiles[0]!,f.config);
  for(const [i,p] of f.plans.entries()){const c=compilePerformance(p,f.profiles[i]!,silence);assert.equal(c.report.bodyManipulation!.selection,BODY_VIEW_MANIPULATION_SELECTION);assert.equal(c.report.bodyManipulation!.motionVerified,false);assert.ok(c.report.maxInterpolationGapPx<=.2);}
  const scene=renderCinematic(f.shot,f.profiles[0]!,buildRig(f.profiles[0]!),silence,f.config),files=secureSceneFiles(scene.files);assert.deepEqual(validateSceneFiles(files,f.shot,f.config.workflow.max_scene_bytes,[],f.config.rendering.final),[]);
  const html=files.files.find(file=>file.path==='index.html')!.content;assert.match(html,/id="prop-basket-prop"/);assert.match(html,/id="actor-karo-person-prop-bowl-prop"/);assert.ok(html.indexOf('id="actor-karo-person-hand-right-prop-slot"')>html.indexOf('id="actor-karo-person-prop-bowl-prop"'));assert.equal((html.match(/id="actor-karo-person-hand-right-prop-slot"/g)??[]).length,1);
  assert.equal(scene.report!.boundModels![1]!.actorId,'karo-person');assert.equal(hash(f),before);
});

test('independent source heads and bald/haired supporting identities remain their own while native bodies operate',async()=>{
  const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  for(const choice of [{actor:'lila',view:'three-quarter-right',face:'source-motion'},{actor:'karo',view:'three-quarter-left',face:'source-motion'},{actor:'prehistoric-male-bald',view:'three-quarter-left',face:'speech-eyes'},{actor:'prehistoric-female-haired',view:'three-quarter-right',face:'speech-eyes'}] as const){
    const original=await headFaceCalibration(repo,{...choice,action:'rest',slice:'whole',look:'rest',mood:'happy'}),profile={...original.profile,appearance:{...original.profile.appearance,bodyManipulation:BODY_VIEW_MANIPULATION_SELECTION}};
    profile.profileHash=hash({old:original.profile.profileHash,appearance:profile.appearance});HostProfileSchema.parse(profile);
    const c=candidate(profile.appearance.characterVariant!,choice.view,'operate','right'),plan={...original.plan,profileHash:profile.profileHash,gestures:c.plan.gestures,props:[]};
    for(const t of [0,600,1000,1800,2800,3300]){const frame=samplePerformance(plan,profile,t,original.activity,original.sourceClock,original.clock);assert.ok(frame.armGeometry!.right!.flexionDeg<=125+.01);assert.equal(frame.contactError,0);}
    assert.deepEqual(profile.appearance.bodyHeadBank,original.profile.appearance.bodyHeadBank);assert.equal(profile.appearance.bodyHeadBank!.actor,choice.actor);assert.equal(profile.appearance.bodyHeadBank!.approved,false);
  }
});

test('diagnostic controls expose both hands without auto selecting a pose or approving the film',()=>{
  const html=bodyWorkbench('pick-place',1500,'happy','three-quarter-left','cutout','silent','native','rest','native','rigid','rigid','unregistered',BODY_VIEW_MANIPULATION_SELECTION,'left');
  assert.match(html,/name="manipulation"/);assert.match(html,/name="hand"/);assert.match(html,/marker kiểm geometry/);assert.match(html,/chưa nghiệm thu/);
  assert.equal(nativeManipulationDescription.motionVerified,false);assert.equal(nativeManipulationDescription.productionReady,false);
  const f=candidate('lila','three-quarter-right','carry','right'),bad=structuredClone(f.plan);bad.gestures[0]!.sourceSpan={id:'not-a-contact-clock',startMs:0,endMs:4000};assert.throws(()=>validatePerformance(bad,f.profile),/source/);
});

test('native contact validates original body locomotion/jump windows in the owned shot clock rather than empty local arrays',()=>{
  const f=candidate('lila','three-quarter-right','carry','right',true),plan=structuredClone(f.plan);
  const source={version:'native-source-body-1' as const,id:'original-body',startMs:1000,endMs:6000,walks:plan.walks,jumps:[]};
  plan.sourceBody=source;plan.walks=[];
  const clock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:plan.leadCharacterId,startMs:1000,endMs:5000,runStartMs:1000,runEndMs:6000,sourceIdentityHash:'a'.repeat(64),gazes:[],gestures:[],bodyMotion:source};
  validateNativeContactBodyClock(plan,clock);
  const before=hash(plan);assert.throws(()=>validateNativeContactBodyClock(plan),/complete owned shot clock/);
  const early=structuredClone(plan);early.sourceBody!.walks[0]!.startMs=900;assert.throws(()=>validateNativeContactBodyClock(early,clock),/after lift/);
  const other=structuredClone(plan);other.gestures[0]!.action='operate';assert.throws(()=>validateNativeContactBodyClock(other,clock),/requires carry/);
  const jump=structuredClone(plan);jump.sourceBody!.walks=[];jump.sourceBody!.jumps=[{startMs:500,takeoffMs:800,landingMs:1200,endMs:1400,height:20}];assert.throws(()=>validateNativeContactBodyClock(jump,clock),/established grip/);
  const shifted={...clock,startMs:1500,endMs:5500};assert.throws(()=>validateNativeContactBodyClock(plan,shifted),/after lift/);
  assert.equal(hash(plan),before);
});
