import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import { ShotSchema, type Beat, type Shot, type Storyboard } from '../core/schemas.js';
import { exists, hash, readJson, writeJson,writeAtomic } from '../core/utils.js';
import {rigHand} from '../core/identifiers.js';
import {cinematicActionGroups} from './actions.js';
import type { HostProfile } from '../host/schemas.js';
import { partAnchor } from '../host/controller.js';
import { rigMetrics } from '../animation/rig.js';
import { ANIMATION_VERSION, type Mood, type Point, type PerformancePlan } from '../animation/schemas.js';
import { validatePerformance } from '../animation/compiler.js';
import { CinematicPlanSchema, DIRECTION_VERSION, type CinematicPlan } from './schemas.js';
import { fold } from '../explainer/plan.js';
import { stageModels } from './models.js';
import { ANIMATION_LIBRARY } from '../animation/library.js';
import { planCamera, validateCamera } from './camera.js';
import { validateComparisonReadability } from './readability.js';
import { pickupPart, modelExitParts, validatePropBindings } from './props.js';
import { cueExpressions } from './emotion.js';
import { validateArtDirection } from './art-direction.js';
import {actorProfile,seedActorShot} from '../actors/model.js';
import {buildRig} from '../host/rig.js';
import {writeActorAssets} from '../actors/assets.js';
import {sceneSeats} from '../stage/seats.js';

const moods:Record<NonNullable<Shot['visualization']>['type'],Mood>={question:'curious',mechanism:'effort',process:'understanding',
  evolution:'curious',comparison:'thinking',breakdown:'thinking','event-sequence':'concerned',summary:'confident'};
/** Story actors can transport sourced models with one completed carry/placement. */
export const CINEMATIC_ACTION_CLIPS:Record<string,string[]>={
  idle:[],
  'operate-model':['operate','pick-place','carry'],compare:['point','inspect'],point:['point','inspect'],
  think:['think'],summarize:['address-viewer'],explain:['address-viewer','lead-next'],
  greet:['address-viewer'],react:['react'],'walk-to-marker':['lead-next'],
};
export const CINEMATIC_CLIPS=[...new Set(Object.values(CINEMATIC_ACTION_CLIPS).flat())];
export function cinematicSetting(text:string,fallback:CinematicPlan['setting']='neutral'):CinematicPlan['setting']{
  const words=fold(text).replace(/-/g,' ');
  return /\b(?:o to|xe hoi|xe dien|xe xang|dong co dot trong|dong co xang|benz)\b/.test(words)?'road':/hoi nuoc|xi lanh|binh ngung|pit tong/.test(words)?'workshop':fallback;
}

/** Choreographs inside the immutable audio interval. No dialogue generation or retiming. */
export function directCinematicShot(input:Shot,beat:Beat,profile:HostProfile,config:FactoryConfig,entry?:Point,context?:{seed?:boolean;setting?:CinematicPlan['setting'];facing?:'front'|'left'|'right';parts?:NonNullable<Shot['visualization']>['parts'];nextControlId?:string}):Shot {
  const shot=structuredClone(input),v=shot.visualization,h=shot.host;
  if(!v||!h||!shot.sourceRefs?.length)throw new Error(`${shot.id}: cinematic direction requires sourced explanation and approved host`);
  const actors=config.presentation.character_mode==='actors',seed=actors&&context?.seed;
  if(seed){h.actions=[{type:'idle',startMs:shot.startMs,endMs:shot.endMs}];v.events=v.events.map(e=>({...e,type:e.type==='state'?'state' as const:'highlight' as const,contactRequired:false,contactActorId:undefined,contactHands:undefined,contactPartId:undefined,motion:'none' as const}));}
  const {width,height,fps}=config.rendering.final,duration=shot.endMs-shot.startMs,m=rigMetrics(profile);
  const groundY=height*.76,scale=height*.38/m.height;
  const root=entry??{x:width*.24,y:groundY};
  if(Math.abs(root.y-groundY)>.01)throw new Error(`${shot.id}: entry ground changed between scenes`);
  const maximumTravel=m.upperLeg*scale*.8*duration/1000;
  let exitX=!actors&&duration>=1800?Math.max(root.x,Math.min(width*.34,root.x+maximumTravel*.35)):root.x;
  let moveMs=exitX-root.x>1?Math.min(1100,Math.floor(duration*.3)):0;
  // Objects occupy the character's world, with a foreground focal object and supporting depth.
  const plannedOperation=h.actions.find(a=>a.type==='operate-model'&&a.endMs-a.startMs>=800);
  const pickup=!seed&&duration>=2400?pickupPart(shot):undefined;
  if(plannedOperation&&plannedOperation.startMs-shot.startMs<moveMs){exitX=root.x;moveMs=0;}
  const attention=plannedOperation?.target?.partId
    ??h.actions.find(a=>a.target)?.target?.partId??v.parts[0]?.id;
  const focal=v.parts.find(p=>p.id===attention)!;
  const others=v.parts.filter(p=>p.id!==attention);
  const shoulder={x:exitX+m.shoulderOffset*scale,y:groundY+m.shoulderY*scale};
  if(focal){focal.width=.18;focal.height=.19;focal.x=(shoulder.x+52*scale)/width+focal.width*.35;
  focal.y=(shoulder.y+32*scale)/height;
  if(pickup){Object.assign(focal,{width:.09,height:.09,x:(shoulder.x+40*scale)/width,y:(shoulder.y+32*scale)/height});}
  for(const [i,p] of others.entries()){
    const angle=(-65+i*130/Math.max(1,others.length-1))*Math.PI/180;
    p.x=Math.min(.9,focal.x+.12+.12*Math.cos(angle));
    p.y=(v.type==='mechanism'||v.type==='breakdown')&&duration>=2400?.47+.10*Math.sin(angle):.43+.16*Math.sin(angle);
    p.width=Math.min(.14,.38/Math.max(3,others.length));p.height=.12;
  }
  }
  if(v.parts.length===2&&v.parts.every(part=>part.configuration)){
    for(const [i,part] of v.parts.entries())Object.assign(part,{x:i===0?.57:.84,y:.32,width:.21,height:.17});
  }
  // Reserve two readable lanes and a lower control station before applying persistent transforms.
  // Cars sit above the walking corridor; long engine labels cannot cover the motor or the face.
  const cars=v.parts.filter(part=>part.kind==='car'),engines=v.parts.filter(part=>part.kind==='engine');
  if(cars.length===2&&engines.length<=2&&v.parts.every(part=>['car','engine','battery'].includes(part.kind))){
    for(const [i,part] of cars.entries())Object.assign(part,{x:i===0?.42:.79,y:.24,width:.22,height:.13});
    for(const [i,part] of engines.entries())Object.assign(part,i===0?{x:.151,y:.50,width:.10,height:.11}:{x:.82,y:.42,width:.18,height:.11});
    for(const part of v.parts.filter(part=>part.kind==='battery'))Object.assign(part,{x:.65,y:.58,width:.15,height:.12});
  }
  // Attention changes the acting, not an existing model's world transform.
  for(const part of v.parts){const previous=context?.parts?.find(p=>p.id===part.id);if(previous){part.x=previous.x;part.y=previous.y;part.width=previous.width;part.height=previous.height;}}
  if(plannedOperation&&attention&&context?.parts?.some(p=>p.id===attention)){
    const anchor=partAnchor(shot,attention,'handle',width,height),desired=anchor.x-(m.shoulderOffset+52)*scale;
    const travel=Math.abs(desired-root.x),needed=travel>1?Math.max(220,Math.ceil(travel/(m.upperLeg*scale*1.8)*1000)):0;
    if(needed<plannedOperation.endMs-shot.startMs-800){exitX=desired;moveMs=needed;}
    else {exitX=root.x;moveMs=0;}
  }
  if(!actors&&!plannedOperation&&duration>800&&context?.nextControlId&&v.parts.some(part=>part.id===context.nextControlId)){
    const anchor=partAnchor(shot,context.nextControlId,'handle',width,height),desired=anchor.x-(m.shoulderOffset+52)*scale;
    const travel=Math.abs(desired-root.x),needed=travel>1?Math.max(220,Math.ceil(travel/(m.upperLeg*scale*1.8)*1000)):0;
    // Prepare a short next cue by approaching its control during this longer, non-contact explanation.
    if(needed){moveMs=Math.min(needed,duration-500);exitX=root.x+(desired-root.x)*moveMs/needed;}
  }
  const performance:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:shot.id,leadCharacterId:profile.id,
    profileHash:profile.profileHash,kind:profile.kind,durationMs:duration,fps:Math.max(24,Math.min(60,Math.round(fps))),
    stage:{width,height,groundY},root,scale,walks:moveMs?[{startMs:0,endMs:moveMs,fromX:root.x,toX:exitX}]:[],
    facing:context?.facing??'front',turns:[],gestures:[],expressions:[],gazes:[],props:[]};
  const nextActions:NonNullable<Shot['host']>['actions']=[],events:NonNullable<Shot['visualization']>['events']=[];
  const propBindings:CinematicPlan['propBindings']=[];
  for(const [i,a] of h.actions.entries()){
    let startMs=a.startMs-shot.startMs;const endMs=a.endMs-shot.startMs;
    if(endMs<=startMs)continue;
    if(a.type==='idle'){nextActions.push({...a});continue;}
    if(pickup&&a.target?.partId===pickup.part.id){
      if(performance.props.length)throw new Error(`${shot.id}: repeated pickup requires a sequential placement plan; this seed supports one completed placement`);
      startMs=Math.max(startMs,moveMs);const span=endMs-startMs;
      if(span<1600)throw new Error(`${shot.id}: needs-clip: narration window is too short for pickup, placement and recovery`);
      const part=v.parts.find(part=>part.id===pickup.part.id)!,target={x:part.x*width,y:part.y*height},destination={x:target.x+28*scale,y:target.y},propId='model-prop-0';
      const contactMs=startMs+Math.min(500,Math.floor(span*.25)),releaseMs=endMs-260;
      performance.props.push({id:propId,origin:target,destination});
      performance.gestures.push({id:`${shot.id}.pickup`,action:'pick-place',...(a.hand?{hand:a.hand}:{}),startMs,endMs,target,destination,propId,contactMs,releaseMs});
      performance.gazes.push({startMs,endMs,target:destination});
      nextActions.push({...a,type:'operate-model',startMs:startMs+shot.startMs,endMs:endMs+shot.startMs,contactMs:contactMs+shot.startMs,target:{...a.target,anchor:'center'}});
      propBindings.push({propId,partId:part.id,role:'illustrative-model',sourceRefs:[pickup.ref]});
      events.push({type:'highlight',targetId:part.id,narrationAnchor:a.narrationAnchor!,startMs:contactMs+1+shot.startMs,endMs:releaseMs+shot.startMs,contactRequired:true,motion:'none',sourceRefs:[pickup.ref]});
      continue;
    }
    const target=a.target?partAnchor(shot,a.target.partId,a.target.anchor,width,height):undefined;
    if(a.type==='operate-model'&&a.target?.partId===focal?.id)startMs=Math.max(startMs,moveMs);
    const span=endMs-startMs;
    const handle=target?{x:target.x-exitX-m.shoulderOffset*scale*(rigHand(a)==='left'?-1:1),y:target.y-groundY-m.shoulderY*scale}:undefined;
    const operation=a.type==='operate-model'&&a.target?.partId===focal?.id&&span>=800&&startMs>=moveMs&&!!handle&&Math.hypot(handle.x,handle.y)<(m.upperArm+m.lowerArm-8)*scale;
    const contactMs=operation?startMs+Math.min(500,Math.floor(span*.35)):undefined;
    const feasible=operation&&contactMs!+80<=endMs-Math.min(220,span*.18);
    const compare=a.type==='compare'&&a.secondTarget&&span>=500;
    if(actors&&a.type==='operate-model'&&!feasible)throw new Error(`${shot.id}: needs-layout/needs-motion: sourced operation cannot reach its target with approach, contact and recovery inside the narration clock`);
    if(actors&&a.type==='compare'&&!compare)throw new Error(`${shot.id}: needs-layout/needs-motion: comparison requires two targets and a complete action window`);
    const type=feasible?'operate-model':compare?'compare':actors?a.type:a.type==='think'?'think':a.type==='summarize'?'summarize':a.target?'point':'explain';
    const action={...a,type:type as typeof a.type,startMs:startMs+shot.startMs,endMs:endMs+shot.startMs,
      ...(feasible?{contactMs:contactMs!+shot.startMs}:{})};
    if(!feasible)delete action.contactMs;if(!compare)delete action.secondTarget;
    nextActions.push(action);
    const windows=compare?[{startMs,endMs:Math.floor((startMs+endMs)/2),target},{startMs:Math.floor((startMs+endMs)/2),endMs,target:partAnchor(shot,a.secondTarget!.partId,a.secondTarget!.anchor,width,height)}]:[{startMs,endMs,target}];
    for(const [j,window] of windows.entries()){
      performance.gestures.push({id:`${shot.id}.g${i}${compare?`.${j}`:''}`,...window,...(a.hand?{hand:a.hand}:{}),action:feasible?'operate':type==='think'?'think':type==='react'?'react':type==='walk-to-marker'?'lead-next':type==='summarize'?'address-viewer':window.target?'point':'address-viewer',...(feasible?{contactMs}:{})});
      if(window.target)performance.gazes.push({...window,target:window.target});
    }
    const original=v.events.find(e=>e.type!=='state'&&e.targetId===a.target?.partId);
    if(original)events.push({...original,startMs:(feasible?contactMs!+1:startMs)+shot.startMs,
      endMs:(feasible?Math.floor(endMs-Math.min(220,span*.18)):endMs)+shot.startMs,
      contactRequired:!!feasible,type:feasible?original.type:'highlight',motion:feasible?original.motion:'none'});
    if(compare){
      const midpoint=Math.floor((startMs+endMs)/2)+shot.startMs;
      const first=events.at(-1);if(first&&first.targetId===a.target!.partId)first.endMs=midpoint;
      const part=v.parts.find(p=>p.id===a.secondTarget!.partId)!;
      events.push({type:'compare',targetId:part.id,startMs:midpoint,endMs:endMs+shot.startMs,contactRequired:false,motion:'none',narrationAnchor:a.narrationAnchor!,sourceRefs:part.sourceRefs});
    }
    if(feasible)for(const relation of v.relations.filter(r=>r.kind==='transfer'&&(r.from===a.target!.partId||r.to===a.target!.partId)&&r.sourceRefs.some(ref=>ref.segmentId===a.narrationAnchor))){
      const begin=contactMs!+1+shot.startMs,finish=Math.floor(endMs-Math.min(220,span*.18))+shot.startMs;
      events.push({type:'flow',targetId:relation.from,relationTo:relation.to,contactPartId:a.target!.partId,startMs:begin,endMs:finish,contactRequired:true,motion:'none',narrationAnchor:a.narrationAnchor!,sourceRefs:relation.sourceRefs});
    }
  }
  if(!nextActions.length&&(actors||!focal))nextActions.push({type:'idle',startMs:shot.startMs,endMs:shot.endMs});
  if(!nextActions.length&&focal){
    const target=partAnchor(shot,focal.id,'center',width,height);
    nextActions.push({type:'point',startMs:shot.startMs,endMs:shot.endMs,target:{modelId:v.modelId,partId:focal.id,anchor:'center'},narrationAnchor:shot.narrationSegmentIds![0]});
    performance.gestures.push({id:`${shot.id}.notice`,action:'inspect',startMs:0,endMs:duration,target});
    performance.gazes.push({startMs:0,endMs:duration,target});
    events.push({type:'highlight',targetId:focal.id,narrationAnchor:shot.narrationSegmentIds![0]!,startMs:shot.startMs,endMs:shot.endMs,contactRequired:false,motion:'none',sourceRefs:focal.sourceRefs});
  }
  h.actions=nextActions;v.events=seed?v.events:[...events,...v.events.filter(e=>e.type==='state')];
  // Bilateral seed actions share one attention channel. Let the sampler prefer
  // the right target (then left); overlapping arm cues must not create overlapping gazes.
  if(h.actions.some(a=>a.hand==='left'))performance.gazes=[];
  performance.expressions=cueExpressions(shot,moods[v.type]);
  const text=fold((shot.sourceRefs??[]).filter(ref=>h.actions.some(a=>a.narrationAnchor===ref.segmentId)).map(ref=>ref.quote).join(' '));
  let facing=performance.facing!;
  // Turn within an existing non-contact window; the speech clock and action targets remain untouched.
  for(const g of performance.gestures){
    if(['operate','pick-place','carry'].includes(g.action)||g.endMs-g.startMs<600)continue;
    const desired=g.action==='address-viewer'?'front':g.target&&g.target.x<exitX?'left':'right';
    const startMs=Math.max(moveMs,g.startMs),endMs=startMs+320;
    if(desired!==facing&&endMs<=g.endMs&&endMs<duration-140){performance.turns!.push({startMs,endMs,direction:desired});facing=desired;}
  }
  const setting=cinematicSetting(beat.narrationText,context?.setting);
  const discovery=/nhan ra|phat hien|bat ngo|hoa ra/.test(text)&&duration>=1400&&duration<=3000&&!performance.gestures.some(g=>g.action==='operate');
  const contact=performance.gestures.find(g=>g.action==='operate');
  const contactFocus=!!contact&&duration>=1200&&duration<1800&&new Set(performance.gestures.map(g=>JSON.stringify(g.target))).size===1;
  const framing=discovery||contactFocus?'close':(v.type==='mechanism'||v.type==='breakdown')&&duration>=2400?'medium':'wide';
  const movement=framing==='close'?'locked':v.type==='summary'?'pull-out':framing==='medium'?'push-in':'locked';
  const camera=planCamera(performance,profile,{framing,movement,focus:discovery?'face':contactFocus?'contact':'ensemble',target:contact?.target,parts:v.parts});
  shot.camera={shotSize:framing,movement,angle:'eye-level'};
  shot.sceneType='character-scene';
  shot.cinematic={version:22,producer:DIRECTION_VERSION,shotId:shot.id,leadCharacterId:profile.id,...(v.sceneIntent?{sceneIntent:v.sceneIntent}:{}),
    motivation:beat.hostIntent??shot.explanationGoal??beat.visualGoal,attentionPartId:attention,sourceRefs:shot.sourceRefs,setting,provenance:'illustration',models:stageModels(shot),propBindings,
    continuity:{entry:root,exit:{x:exitX,y:groundY},facing,carriedProps:[],models:v.parts.map(part=>{const binding=propBindings.find(b=>b.partId===part.id),prop=binding&&performance.props.find(p=>p.id===binding.propId);return {partId:part.id,x:prop?.destination?prop.destination.x/width:part.x,y:prop?.destination?prop.destination.y/height:part.y,width:part.width,height:part.height};})},
    camera,performance};
  // A legacy object plan can be directed before its caller supplies the actual cast.
  // Only the story-aware seed owns cast creation; do not erase pre-existing contact choreography.
  if(actors&&(seed||v.sceneIntent))seedActorShot(shot,profile,buildRig(profile));
  if(seed&&shot.cinematic.actorScene?.supporting.length){
    shot.cinematic.camera=planCamera(performance,profile,{framing,movement,focus:'ensemble',parts:v.parts,
      supporting:shot.cinematic.actorScene.supporting.map(actor=>({performance:actor.performance,profile:actorProfile(actor.character)}))});
    shot.camera={shotSize:shot.cinematic.camera.framing,movement:shot.cinematic.camera.movement,angle:'eye-level'};
  }
  shot.cinematic=CinematicPlanSchema.parse(shot.cinematic);
  shot.motion=performance.gestures.map(g=>`${g.action} → ${h.actions.find(a=>a.startMs===g.startMs+shot.startMs)?.target?.partId??'viewer'}`);
  validateCinematicShot(shot,profile,config);
  return ShotSchema.parse(shot);
}

export function validateCinematicShot(shot:Shot,profile:HostProfile,config:FactoryConfig):void {
  if(shot.cinematic?.actorScene?.primary)profile=actorProfile(shot.cinematic.actorScene.primary,profile);
  const c=CinematicPlanSchema.parse(shot.cinematic),p=c.performance;
  validateArtDirection(shot);
  if(c.camera.designIntent&&!c.artDirection)throw new Error(`${shot.id}: authored camera requires an art direction brief`);
  if(c.shotId!==shot.id||c.leadCharacterId!==profile.id||p.id!==shot.id||p.durationMs!==shot.endMs-shot.startMs)throw new Error(`${shot.id}: cinematic identity/clock mismatch`);
  if(p.stage.width!==config.rendering.final.width||p.stage.height!==config.rendering.final.height)throw new Error(`${shot.id}: stage dimensions changed; replan cinematic shots`);
  const parts=shot.visualization?.parts;
  if(hash(c.sourceRefs)!==hash(shot.sourceRefs)||!parts||(parts.length?!parts.some(part=>part.id===c.attentionPartId):!!c.attentionPartId))throw new Error(`${shot.id}: cinematic attention/source mismatch`);
  if(!parts.length&&(config.presentation.character_mode!=='actors'||!c.sceneIntent?.participants.length||!(c.actorScene?.primary||c.actorScene?.supporting.length)||shot.visualization!.events.length||shot.visualization!.relations.length||p.props.length||shot.host?.actions.some(a=>a.target||a.secondTarget||a.contactMs!==undefined)))throw new Error(`${shot.id}: objectless scene requires real sourced actors without dangling objects or contact`);
  if(hash(c.models)!==hash(stageModels(shot)))throw new Error(`${shot.id}: cinematic model variant lacks its source evidence`);
  if(hash(c.continuity.entry)!==hash(p.root)||Math.abs(c.continuity.exit.x-(p.walks.at(-1)?.toX??p.root.x))>.01)throw new Error(`${shot.id}: cinematic continuity disagrees with locomotion`);
  validatePropBindings(shot);
  if(hash(c.continuity.models)!==hash(modelExitParts(shot).map(part=>({partId:part.id,x:part.x,y:part.y,width:part.width,height:part.height}))))throw new Error(`${shot.id}: model continuity disagrees with stage transforms`);
  const exitFacing=[...(p.turns??[])].sort((a,b)=>a.startMs-b.startMs).at(-1)?.direction??p.facing??'front';
  if(c.continuity.facing!==exitFacing)throw new Error(`${shot.id}: cinematic facing disagrees with turn exit`);
  if(c.camera.framing!==shot.camera.shotSize||c.camera.movement!==shot.camera.movement)throw new Error(`${shot.id}: camera plan differs from shot`);
  validatePerformance(p,profile);
  if(p.supports?.length&&(!c.actorScene?.primary||!c.artDirection||!['authored','model'].includes(c.artDirection.origin)))throw new Error(`${shot.id}: seated acting requires a story actor and authored/model stage direction`);
  sceneSeats(shot);
  validateCamera(shot,profile);
  if(c.actorScene?.primary!==null)validateComparisonReadability(shot,profile);
  for(const actor of c.actorScene?.supporting??[]){
    const actorDefinition=actorProfile(actor.character,profile);
    validateCinematicShot({...shot,host:{...shot.host!,id:actorDefinition.id,rigHash:shot.host!.rigHash,actions:actor.actions},
      cinematic:{...c,leadCharacterId:actorDefinition.id,performance:actor.performance,propBindings:[],
        continuity:{...c.continuity,entry:actor.performance.root,exit:{x:actor.performance.walks.at(-1)?.toX??actor.performance.root.x,y:actor.performance.stage.groundY},facing:actor.performance.turns?.at(-1)?.direction??actor.performance.facing??'front'},
        actorScene:{primary:actor.character,speakingSegmentIds:actor.speakingSegmentIds,continuity:'cut',supporting:[]}}},actorDefinition,config);
  }
  const consumed=new Set<string>();
  const actions=shot.host?.actions??[];
  if(c.actorScene?.primary===null){
    if(p.gestures.length||p.props.length||actions.some(a=>a.type!=='idle'||a.target))throw new Error(`${shot.id}: mechanism-only shot cannot contain primary actor actions`);
    return;
  }
  for(const {action:a,gestures:group} of cinematicActionGroups(actions,p,shot.startMs)){
    if(a.type==='idle'){
      if(a.target||a.secondTarget||a.contactMs!==undefined||p.gestures.some(g=>(!a.hand||rigHand(g)===a.hand)&&g.startMs<a.endMs-shot.startMs&&g.endMs>a.startMs-shot.startMs))throw new Error(`${shot.id}: idle interval cannot own an arm gesture, target or contact; use performance.walks/postures for body motion`);
      continue;
    }
    if(group.length!==(a.type==='compare'?2:1))throw new Error(`${shot.id}: missing performance action for ${a.type} at shot-local ${a.startMs-shot.startMs}–${a.endMs-shot.startMs}ms; expected ${a.type==='compare'?2:1} contained gesture(s), received ${group.length}`);
    for(const [index,g] of group.entries()){
    consumed.add(g.id);
    const target=index===1?a.secondTarget:a.target;
    const midpoint=Math.floor((a.startMs+a.endMs-2*shot.startMs)/2);
    const expectedStart=index===1?midpoint:a.startMs-shot.startMs,expectedEnd=a.type==='compare'&&index===0?midpoint:a.endMs-shot.startMs;
    if(g.startMs!==expectedStart||g.endMs!==expectedEnd)throw new Error(`${shot.id}: gesture/action clock mismatch for ${g.id} (${a.type}); expected shot-local ${expectedStart}–${expectedEnd}ms, received ${g.startMs}–${g.endMs}ms`);
    const expected=target?partAnchor(shot,target.partId,target.anchor,p.stage.width,p.stage.height):undefined;
    // Keep the existing 1e-6px comparison. Also recognize the canonical anchor
    // rounded to three stage-pixel decimals after normalized-coordinate input.
    // This accepts 419.999976 -> 420, not arbitrary nearby shifted targets.
    const exactTarget=expected&&g.target&&Math.hypot(g.target.x-expected.x,g.target.y-expected.y)<=1e-6;
    const roundedTarget=expected&&g.target&&Math.hypot(g.target.x-Math.round(expected.x*1000)/1000,g.target.y-Math.round(expected.y*1000)/1000)<=1e-6;
    if(Boolean(expected)!==Boolean(g.target)||expected&&g.target&&!exactTarget&&!roundedTarget)throw new Error(`${shot.id}: gesture ${g.id} points at the wrong world target for ${a.type}; expected ${expected?JSON.stringify(expected):'no gesture.target (omit it because this action has no object target; a walking destination belongs in performance.walks)'}, received ${g.target?JSON.stringify(g.target):'no gesture.target'}${target?`; object ${target.partId}, anchor ${target.anchor}`:''}`);
    if(!CINEMATIC_ACTION_CLIPS[a.type]?.includes(g.action))throw new Error(`${shot.id}: performance action contradicts host intent for ${g.id}; ${a.type} requires ${CINEMATIC_ACTION_CLIPS[a.type]?.join(' or ')}, received ${g.action}`);
    if(['operate','pick-place','carry'].includes(g.action)!==(a.type==='operate-model')||g.contactMs!==(a.contactMs===undefined?undefined:a.contactMs-shot.startMs))throw new Error(`${shot.id}: contact/action mismatch for ${g.id}; intent ${a.type}, clip ${g.action}, expected shot-local contactMs ${a.contactMs===undefined?'omitted':a.contactMs-shot.startMs}, received ${g.contactMs??'omitted'}`);
    }
  }
  if(consumed.size!==p.gestures.length)throw new Error(`${shot.id}: missing performance action`);
}

export function validateModelContinuity(previous:Shot|undefined,next:Shot):void{
  if(!previous?.cinematic||!next.cinematic)return;
  if(next.cinematic.actorScene?.continuity==='cut')return;
  for(const part of next.visualization!.parts){const prior=modelExitParts(previous).find(p=>p.id===part.id);if(prior&&hash([part.x,part.y,part.width,part.height])!==hash([prior.x,prior.y,prior.width,prior.height]))throw new Error(`${next.id}: model ${part.id} teleports at the cut; preserve its world transform`);}
}

export async function writeCinematicPlans(root:string,board:Storyboard):Promise<void> {
  const shots=board.shots.filter(s=>s.cinematic);
  {
    await writeActorAssets(root,board);
    await writeJson(path.join(root,'work/actor-timeline.json'),{version:1,storyboardHash:hash(board),shots:shots.map(s=>({shotId:s.id,startMs:s.startMs,endMs:s.endMs,scene:s.cinematic!.actorScene}))});
  }
  const reportFile=path.join(root,'work/creative-direction-report.json'),previous=await exists(reportFile)?await readJson<Record<string,unknown>>(reportFile):{};
  const origins=[...new Set(shots.map(s=>s.cinematic!.artDirection?.origin??'offline'))];
  await writeJson(reportFile,{...previous,version:22,producer:DIRECTION_VERSION,storyboardHash:hash(board),
    origin:origins.length===1?origins[0]:'mixed',shots:shots.map(s=>({shotId:s.id,origin:s.cinematic!.artDirection?.origin??'offline',brief:s.cinematic!.artDirection?.brief??null})),
    warning:'Creative origin describes the design source. Technical QC does not constitute visual acceptance.'});
  for(const [file,value] of Object.entries({
    'story-direction.json':shots.map(s=>({...s.cinematic,performance:undefined})),
    'stage-plan.json':shots.map(s=>({shotId:s.id,...s.cinematic!.performance.stage,setting:s.cinematic!.setting,environmentAssetId:s.cinematic!.environmentAssetId,artDirection:s.cinematic!.artDirection,provenance:'illustration',parts:s.visualization!.parts,models:s.cinematic!.models,relations:s.visualization!.relations})),
    'performance-plan.json':shots.map(s=>s.cinematic!.performance),
    'camera-plan.json':shots.map(s=>({shotId:s.id,...s.cinematic!.camera})),
  }))await writeJson(path.join(root,'work',file),{version:22,producer:DIRECTION_VERSION,storyboardHash:hash(board),shots:value});
  await writeJson(path.join(root,'work/animation-library.json'),{...ANIMATION_LIBRARY,storyboardHash:hash(board)});
}
