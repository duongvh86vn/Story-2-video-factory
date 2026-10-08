import assert from 'node:assert/strict';
import test from 'node:test';
import {ConfigSchema} from '../packages/core/config.js';
import {ShotSchema,type Shot} from '../packages/core/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {buildRig} from '../packages/host/rig.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {ANIMATION_VERSION,PerformancePlanSchema} from '../packages/animation/schemas.js';
import {compilePerformance,samplePerformance} from '../packages/animation/compiler.js';
import {DIRECTION_VERSION} from '../packages/director/schemas.js';
import {stageModels} from '../packages/director/models.js';
import {boundProp,propPerformer,modelExitParts,validatePropBindings} from '../packages/director/props.js';
import {compiledPropFrames} from '../packages/director/prop-motion.js';
import {validateCinematicShot,validateModelContinuity} from '../packages/director/index.js';
import {validateCamera} from '../packages/director/camera.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {cinematicRelations} from '../library/shots/cinematic-models.js';
import {secureSceneFiles,validateSceneFiles,validateSceneScript} from '../packages/scenes/security.js';
import {validateCinematicEdit,inspectCinematicStoryboard} from '../apps/server/cinematic.js';

// Protocol/geometry declarations for the human's test model. No media/provider
// mocks are counted as film/voice/art acceptance. No fixture runs at module load.
function fixture(kind:'stick-man'|'mini-robot'='stick-man',carrying=false){
  const config=ConfigSchema.parse({presentation:{mode:'story-cinematic',character_mode:'actors'},rendering:{final:{width:1280,height:720,fps:30}}});
  const ref={kind:'narration' as const,segmentId:'cue',quote:carrying?'Lila lifts the basket while Karo carries the bowl and places it down.':'Lila lifts the basket and Karo lifts the bowl, then each puts their object down.'};
  const characters=['lila-person','karo-person'].map((id,i)=>ActorDefinitionSchema.parse({id,name:i?'Karo':'Lila',role:'sourced illustrative placement',identity:'illustrative',kind,sourceRefs:[ref],appearance:{outline:'#17363F',shell:'#F7E4BD',screen:'#203742',accent:'#ECFFFF',badge:'#DAB26B',headScale:1,bodyScale:1,strokeWidth:6},costume:[]}));
  const profiles=characters.map(actor=>actorProfile(actor)),parts:NonNullable<Shot['visualization']>['parts']=[];
  const plans=profiles.map((profile,i)=>{
    const scale=i?.8:1,m=rigMetrics(profile),root={x:i?900:350,y:550},origin={x:root.x+m.shoulderOffset*scale+25,y:root.y+m.shoulderY*scale+30};
    const destination={x:origin.x+20,y:origin.y+20},gripOffset={x:10,y:-5},id=i?'bowl-prop':'basket-prop',partId=i?'bowl':'basket';
    parts.push({id:partId,label:partId,kind:'object',x:origin.x/1280,y:origin.y/720,width:32/1280,height:20/720,sourceRefs:[ref]});
    return PerformancePlanSchema.parse({version:22,compilerVersion:ANIMATION_VERSION,id:'owned-props',leadCharacterId:profile.id,profileHash:profile.profileHash,kind,durationMs:6000,fps:30,stage:{width:1280,height:720,groundY:550},root,scale,facing:'right',walks:carrying&&i?[{startMs:1600,endMs:3300,fromX:root.x,toX:root.x+20}]:[],expressions:[],gazes:[],props:[{id,origin,destination,gripOffset}],gestures:[{id:'place-'+partId,propId:id,hand:'right',action:carrying&&i?'carry':'pick-place',...(carrying&&i?{carryOffset:{x:40,y:35}}:{}),startMs:i?750:500,endMs:i?4750:4500,contactMs:i?1250:1000,releaseMs:i?4250:4000,target:{x:origin.x+10*scale,y:origin.y-5*scale},destination:{x:destination.x+10*scale,y:destination.y-5*scale}}]});
  });
  const actions=plans.map((p,i)=>[{type:'operate-model' as const,hand:'right' as const,startMs:1000+p.gestures[0]!.startMs,endMs:1000+p.gestures[0]!.endMs,contactMs:1000+p.gestures[0]!.contactMs!,narrationAnchor:'cue',target:{modelId:'owned-world',partId:parts[i]!.id,anchor:'handle' as const}}]);
  const shot=ShotSchema.parse({id:'owned-props',startMs:1000,endMs:7000,beatIds:['beat'],sceneType:'character-scene',subject:ref.quote,characters:characters.map(c=>c.id),visualDescription:ref.quote,camera:{shotSize:'wide',movement:'locked',angle:'eye-level'},recipeId:'host-mechanism-explainer',renderer:'hyperframes',narrationSegmentIds:['cue'],sourceRefs:[ref],host:{id:profiles[0]!.id,profileVersion:1,rigHash:buildRig(profiles[0]!).rigHash,presence:'beside-model',actions:actions[0]},visualization:{type:'summary',modelId:'owned-world',provenance:'visualization',fidelity:'conceptual',parts,relations:[],events:[]}});
  shot.cinematic={version:22,producer:DIRECTION_VERSION,shotId:shot.id,leadCharacterId:profiles[0]!.id,motivation:ref.quote,attentionPartId:parts[0]!.id,sourceRefs:[ref],setting:'forest',provenance:'illustration',models:stageModels(shot),propBindings:plans.map((p,i)=>({propId:p.props[0]!.id,partId:parts[i]!.id,...(i?{ownerId:profiles[i]!.id}:{}),role:'illustrative-model' as const,sourceRefs:[ref]})),actorScene:{primary:characters[0]!,speakingSegmentIds:[],continuity:'cut',supporting:[{character:characters[1]!,performance:plans[1]!,actions:actions[1]!,speakingSegmentIds:[]}]},artDirection:{origin:'authored',brief:'Two distinct sourced objects manipulated independently in the same vivid forest scene.',useEnvironment:false,palette:{background:'#A2D9F7',surface:'#FFE3A8',ink:'#17363F',accent:'#F58A29'},showHeading:false,layers:[],models:parts.map((part,i)=>({partId:part.id,sourceRefs:[ref],handleAnchor:{x:(10*plans[i]!.scale+16)/32,y:(-5*plans[i]!.scale+10)/20},svg:'<path d="M-40 -25H40L30 25H-30Z" fill="#C77732"/>',foregroundSvg:'<path d="M-40 -25H40" stroke="#7B381C"/>'}))},continuity:{entry:{...plans[0]!.root},exit:{...plans[0]!.root},facing:'right',carriedProps:[],models:[]},camera:{framing:'wide',movement:'locked',focus:'ensemble',anchor:{x:640,y:330},startScale:1,endScale:1,designIntent:'Keep both actual performers, grips, grounded feet and moving objects inside the safe view.'},performance:plans[0]!};
  shot.cinematic.continuity.models=modelExitParts(shot).map(p=>({partId:p.id,x:p.x,y:p.y,width:p.width,height:p.height}));
  return {config,shot,plans,profiles,characters,ref,activity:{method:'segment-draft' as const,windowMs:20,intervals:[]}};
}

for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: two actual owners compile independent simultaneous pickups in one canonical scene`,()=>{
  const f=fixture(kind),before=structuredClone(f.shot);
  validatePropBindings(f.shot);validateCinematicShot(f.shot,f.profiles[0]!,f.config);validateCinematicEdit({shots:[f.shot]},f.config);
  assert.equal(propPerformer(f.shot,f.shot.cinematic!.propBindings[0]!).id,'lila-person');
  assert.equal(boundProp(f.shot,f.shot.cinematic!.propBindings[1]!).svgId,'actor-karo-person-prop-bowl-prop');
  for(const [i,p] of f.plans.entries())for(const time of [p.gestures[0]!.contactMs!,2000,p.gestures[0]!.releaseMs!]){
    const frame=samplePerformance(p,f.profiles[i]!,time,f.activity),prop=frame.props[p.props[0]!.id]!,offset=p.props[0]!.gripOffset!;
    assert.equal(prop.attached,time<p.gestures[0]!.releaseMs!);
    if(prop.attached)assert.ok(Math.hypot(frame.hands.right.x-prop.point.x-offset.x*p.scale,frame.hands.right.y-prop.point.y-offset.y*p.scale)<.01);
  }
  const result=renderCinematic(f.shot,f.profiles[0]!,buildRig(f.profiles[0]!),f.activity,f.config);
  const files=secureSceneFiles(result.files),html=files.files.find(file=>file.path==='index.html')!.content,js=files.files.find(file=>file.path==='scene.js')!.content;
  assert.deepEqual(validateSceneFiles(files,f.shot,f.config.workflow.max_scene_bytes,[],f.config.rendering.final),[]);assert.deepEqual(validateSceneScript(js,f.shot.id),[]);
  assert.equal((html.match(/data-prop-entity="basket"/g)??[]).length,1);assert.equal((html.match(/data-prop-entity="bowl"/g)??[]).length,1);
  assert.doesNotMatch(html,/id="stand-\d+"/,'story objects must not invent mechanical stand scenery');
  assert.match(html,/id="actor-karo-person-prop-bowl-prop" data-prop-entity="bowl"[^>]*data-prop-owner="karo-person"/);
  assert.ok(js.includes('actor-karo-person-prop-bowl-prop'));assert.ok(js.includes('foreground-object-1'));
  assert.deepEqual(result.report.boundModels?.map(m=>[m.actorId,m.ownerScale]),[['lila-person',1],['karo-person',.8]]);
  assert.deepEqual(f.shot,before,'rendering must not rewrite narration/roles/actions/source evidence or clocks');
});

test('supporting ownership is explicit, unambiguous and cannot borrow a primary prop or person identity',()=>{
  const f=fixture(),binding=f.shot.cinematic!.propBindings[1]!;
  delete binding.ownerId;assert.throws(()=>validatePropBindings(f.shot),/missing from/);
  binding.ownerId='invented-person';assert.throws(()=>validatePropBindings(f.shot),/one visible/);
  binding.ownerId='karo-person';f.shot.cinematic!.actorScene!.supporting.push(structuredClone(f.shot.cinematic!.actorScene!.supporting[0]!));assert.throws(()=>validatePropBindings(f.shot),/unique|one visible/);
  const duplicate=fixture();duplicate.plans[1]!.props[0]!.id=duplicate.plans[0]!.props[0]!.id;assert.throws(()=>validatePropBindings(duplicate.shot),/unique across/);
});

test('wrong owner scale/clock/stage/source/hand/contact and joint manipulation still reject',()=>{
  for(const change of [(f:ReturnType<typeof fixture>)=>{f.plans[1]!.stage.width=1200;},(f:ReturnType<typeof fixture>)=>{f.plans[1]!.durationMs=5900;},(f:ReturnType<typeof fixture>)=>{f.plans[1]!.leadCharacterId='other';},(f:ReturnType<typeof fixture>)=>{f.plans[1]!.scale=1;},(f:ReturnType<typeof fixture>)=>{f.shot.cinematic!.propBindings[1]!.sourceRefs=[{...f.ref,quote:'unsupported'}];},(f:ReturnType<typeof fixture>)=>{f.shot.cinematic!.actorScene!.supporting[0]!.actions[0]!.hand='left';},(f:ReturnType<typeof fixture>)=>{f.shot.cinematic!.actorScene!.supporting[0]!.actions[0]!.contactMs!+=1;},(f:ReturnType<typeof fixture>)=>{f.shot.host!.actions.push(structuredClone(f.shot.cinematic!.actorScene!.supporting[0]!.actions[0]!));}]){
    const f=fixture();change(f);assert.throws(()=>validatePropBindings(f.shot));assert.throws(()=>validateCinematicEdit({shots:[f.shot]},f.config));
  }
});

test('different actor/prop IDs cannot create the same compound SVG prop namespace',()=>{
  const f=fixture(),c=f.shot.cinematic!,a=structuredClone(c.actorScene!.primary!),b=c.actorScene!.supporting[0]!;
  const p=structuredClone(c.performance);a.id='a';p.leadCharacterId=a.id;p.props[0]!.id='b-prop-c';p.gestures[0]!.propId='b-prop-c';
  b.character.id='a-prop-b';b.performance.leadCharacterId=b.character.id;b.performance.props[0]!.id='c';b.performance.gestures[0]!.propId='c';
  c.actorScene!.primary=null;c.actorScene!.supporting.unshift({character:a,performance:p,actions:f.shot.host!.actions,speakingSegmentIds:[]});
  c.performance.props=[];c.performance.gestures=[];f.shot.host!.actions=[];
  c.propBindings[0]!.ownerId='a';c.propBindings[0]!.propId='b-prop-c';c.propBindings[1]!.ownerId='a-prop-b';c.propBindings[1]!.propId='c';
  assert.equal(boundProp(f.shot,c.propBindings[0]!).svgId,boundProp(f.shot,c.propBindings[1]!).svgId);
  assert.throws(()=>validatePropBindings(f.shot),/namespaces collide/);
});

test('supporting-only cast can own a prop without inventing a primary presenter',()=>{
  const f=fixture(),c=f.shot.cinematic!;c.actorScene!.primary=null;c.performance.props=[];c.performance.gestures=[];f.shot.host!.presence='absent';f.shot.host!.actions=[];
  c.propBindings=c.propBindings.slice(1);c.continuity.models=modelExitParts(f.shot).map(p=>({partId:p.id,x:p.x,y:p.y,width:p.width,height:p.height}));
  assert.equal(propPerformer(f.shot,c.propBindings[0]!).id,'karo-person');validateCinematicShot(f.shot,f.profiles[0]!,f.config);validateCinematicEdit({shots:[f.shot]},f.config);
  delete c.propBindings[0]!.ownerId;assert.throws(()=>validatePropBindings(f.shot),/one visible|no primary/);
});

test('model exits and role changes keep each owner placed center and refuse retained cross-cut carry',()=>{
  const f=fixture(),exits=modelExitParts(f.shot);
  for(const [i,part] of exits.entries())assert.ok(Math.hypot(part.x*1280-f.plans[i]!.props[0]!.destination!.x,part.y*720-f.plans[i]!.props[0]!.destination!.y)<1e-10);
  const next=structuredClone(f.shot);next.cinematic!.actorScene!.continuity='continuous';next.visualization!.parts=exits;
  validateModelContinuity(f.shot,next);next.visualization!.parts[1]!.x-=.04;assert.throws(()=>validateModelContinuity(f.shot,next),/teleports/);
  f.shot.cinematic!.continuity.carriedProps=['bowl-prop'];assert.throws(()=>validatePropBindings(f.shot),/cross-cut carried/);
});

test('relation clock includes every real owner boundary and rejects missing/truncated centers',()=>{
  const f=fixture(),compiled=f.plans.map((p,i)=>compilePerformance(p,f.profiles[i]!,f.activity));
  const sources=new Map(f.plans.map((p,i)=>[p.props[0]!.id,compiled[i]!.frames])),frames=compiledPropFrames(compiled[0]!.frames,sources);
  for(const source of sources.values())for(const frame of source)assert.ok(frames.some(f=>f.timeMs===frame.timeMs));
  f.shot.visualization!.relations=[{from:'basket',to:'bowl',kind:'compare',sourceRefs:[f.ref]}];
  assert.match(cinematicRelations(f.shot,1280,720,frames).html,/relation-0-segment-0/);
  const invalid=structuredClone(compiled[1]!.frames);delete invalid[0]!.props['bowl-prop'];assert.throws(()=>compiledPropFrames(compiled[0]!.frames,new Map([['bowl-prop',invalid]])),/missing or invalid/);
  assert.throws(()=>compiledPropFrames(compiled[0]!.frames,new Map([['bowl-prop',compiled[1]!.frames.slice(1)]])),/different compiled/);
  const numeric=structuredClone(compiled[1]!.frames);numeric[1]!.props['bowl-prop']!.point.x=NaN;assert.throws(()=>compiledPropFrames(compiled[0]!.frames,new Map([['bowl-prop',numeric]])),/invalid/);
  const clone=structuredClone(compiled[0]!.frames);assert.equal(compiledPropFrames(clone,new Map()),clone);
});

test('camera uses the supporting prop motion envelope instead of its static or primary anchor',()=>{
  const f=fixture();validateCamera(f.shot,f.profiles[0]!);
  const p=f.plans[1]!,prop=p.props[0]!,g=p.gestures[0]!;prop.destination={x:1240,y:prop.destination!.y};g.destination={x:1240+prop.gripOffset!.x*p.scale,y:prop.destination.y+prop.gripOffset!.y*p.scale};
  assert.throws(()=>validateCamera(f.shot,f.profiles[0]!),/camera.*model bowl.*cropped/);
});

test('producer migration remains visible and locks are retained after the owner contract revision',()=>{
  const f=fixture(),old=structuredClone(f.shot) as unknown as {cinematic:{producer:string}};old.cinematic.producer='story-direction-2.2.31';
  const inspection=inspectCinematicStoryboard({shots:[old]},{storyboard:true});assert.equal(inspection.migration.required,true);assert.deepEqual(inspection.migration.lockedShotIds,['owned-props']);
  const before=structuredClone(f.shot);bindActorShot(f.shot,f.profiles[0]!,buildRig(f.profiles[0]!));assert.deepEqual(f.shot.cinematic!.propBindings,before.cinematic!.propBindings);assert.deepEqual(f.shot.visualization,before.visualization);
});

test('supporting carry retains its own lift, walking grip, lowering and placed-center clock',()=>{
  const f=fixture('stick-man',true),p=f.plans[1]!,prop=p.props[0]!,g=p.gestures[0]!;
  validateCinematicShot(f.shot,f.profiles[0]!,f.config);validateCinematicEdit({shots:[f.shot]},f.config);
  for(const time of [1600,2400,3300,4000]){
    const frame=samplePerformance(p,f.profiles[1]!,time,f.activity),held=frame.props[prop.id]!;
    assert.equal(held.attached,true);assert.ok(Math.hypot(frame.hands.right.x-held.point.x-prop.gripOffset!.x*p.scale,frame.hands.right.y-held.point.y-prop.gripOffset!.y*p.scale)<.01);
  }
  assert.deepEqual(samplePerformance(p,f.profiles[1]!,g.releaseMs!,f.activity).props[prop.id]!.point,prop.destination);
  const result=renderCinematic(f.shot,f.profiles[0]!,buildRig(f.profiles[0]!),f.activity,f.config);
  assert.equal(result.report.boundModels?.find(m=>m.actorId==='karo-person')?.action,'carry');
  const early=structuredClone(f.shot);early.cinematic!.actorScene!.supporting[0]!.performance.walks[0]!.startMs=1300;
  assert.throws(()=>validateCinematicShot(early,f.profiles[0]!,f.config),/carry locomotion/);
});
