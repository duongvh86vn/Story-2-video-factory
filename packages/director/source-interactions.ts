import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import type {ShotHost} from '../host/schemas.js';
import type {HostGeometry,Anchor} from '../host/controller.js';
import {partAnchor} from '../host/controller.js';
import {hash} from '../core/utils.js';
import {rigHand,type RigHand} from '../core/identifiers.js';
import {actorProfile} from '../actors/model.js';
import {actorViewActingClock} from '../actors/view-acting-clock.js';
import {samplePhysicalPerformance} from '../animation/compiler.js';
import {validateManipulationActionSlices} from './source-manipulation-actions.js';
import {validateSourcePropBindings} from './source-prop-binding.js';
import {boundProp} from './prop-owner.js';

type Action=ShotHost['actions'][number];
export const SOURCE_INTERACTION_VERSION='source-interaction-1';
export type SourceInteractionPhase='approach'|'held'|'released'|'landed';
const fail=(shot:Shot,message:string):never=>{throw new Error(shot.id+': needs-source-prop-binding: original interaction '+message);};
function person(shot:Shot,id:string){
  const c=shot.cinematic,scene=c?.actorScene;
  const all=[...(scene?.primary?[{character:scene.primary,performance:c!.performance,actions:shot.host?.actions??[]}]:[]),...(scene?.supporting??[])];
  const matches=all.filter(a=>a.character.id===id);
  if(matches.length!==1||scene?.primary?.id===id&&shot.host?.presence==='absent')return fail(shot,'requires one explicit visible person');
  return matches[0]!;
}
export interface SourceInteractionDescriptor {
  version:typeof SOURCE_INTERACTION_VERSION;actorId:string;sourceId:string;sourceHash:string;gestureId:string;hand:RigHand;operation:string;
  partId:string;propId:string;narrationAnchor:string;cueHash:string;modelHash:string;startMs:number;endMs:number;contactMs:number;releaseMs?:number;landingMs?:number;
  sliceStartMs:number;sliceEndMs:number;inheritedContact:boolean;entryPhase:SourceInteractionPhase;exitPhase:SourceInteractionPhase;fingerprint:string;
}
export interface SourceInteractionRecord extends SourceInteractionDescriptor {
  sampleMs:number;phase:SourceInteractionPhase;modelCenter:Anchor;gripConstraintErrorPx?:number;originalContact:{shotId:string;sampleMs:number;target:Anchor;hand:Anchor;modelCenter:Anchor;errorPx:number;constraintErrorPx:number};
  scope:'original-physical-geometry-candidate';contactVerified:false;motionVerified:false;
}
function phase(at:number,contact:number,release?:number,landing?:number):SourceInteractionPhase{
  if(at<contact)return 'approach';
  if(landing!==undefined&&at>=landing)return 'landed';
  if(release!==undefined&&at>=release)return 'released';
  return 'held';
}
/** Original semantic ownership, not a contact invented at camera entry. The
 * canonical model retains its original position; its sampled center moves. */
export function sourceInteractionDescriptor(shot:Shot,actorId:string,action:Action,board:Storyboard|undefined,narration:Narration|undefined):SourceInteractionDescriptor{
  if(!board||!narration||board.shots.filter(s=>s.id===shot.id).length!==1||hash(board.shots.find(s=>s.id===shot.id))!==hash(shot))return fail(shot,'requires the authoritative complete storyboard and original narration');
  const owner=person(shot,actorId),source=owner.performance.sourceManipulation,ref=action.sourceManipulation;
  if(!source||!ref||ref.sourceId!==source.id||owner.actions.filter(a=>hash(a)===hash(action)).length!==1)return fail(shot,'action is not the actual original person-owned slice');
  validateManipulationActionSlices(owner.performance,owner.actions,shot.startMs);
  const g=source.gestures.find(g=>g.id===ref.gestureId);
  if(!g||g.contactMs===undefined||!action.target||!action.narrationAnchor)return fail(shot,'missing original gesture, target or cue');
  if(g.action==='operate')return fail(shot,'fixed operate target geometry is still pending; do not substitute a carried prop');
  validateSourcePropBindings(shot,board,narration);
  const bindings=shot.cinematic!.propBindings.filter(b=>b.ownerId===actorId&&b.propId===g.propId&&b.partId===action.target!.partId);
  if(bindings.length!==1)return fail(shot,'target is not the explicit original prop entity');
  const binding=bindings[0]!,owned=boundProp(shot,binding),prop=owned.prop,offset=prop.gripOffset??{x:0,y:0};
  const anchor=partAnchor(shot,binding.partId,action.target.anchor,owner.performance.stage.width,owner.performance.stage.height);
  const grip={x:prop.origin.x+offset.x*owner.performance.scale,y:prop.origin.y+offset.y*owner.performance.scale};
  const exact=Math.hypot(anchor.x-grip.x,anchor.y-grip.y)<=1e-6;
  const serialized=Math.hypot(Math.round(anchor.x*1000)/1000-grip.x,Math.round(anchor.y*1000)/1000-grip.y)<=1e-6;
  if(!exact&&!serialized)return fail(shot,'declared center/handle differs from the actual original grip offset');
  const cue=narration.segments.find(s=>s.id===action.narrationAnchor);
  if(!cue)return fail(shot,'original narration cue is absent');
  const clock=actorViewActingClock(board,shot,actorId);
  if(!clock?.manipulationMotion)return fail(shot,'complete original physical actor clock is absent');
  const run=board.shots.filter(s=>s.startMs>=source.startMs&&s.endMs<=source.endMs).sort((a,b)=>a.startMs-b.startMs);
  for(const slice of run){
    const a=person(slice,actorId);
    for(const local of a.actions.filter(a=>a.sourceManipulation?.sourceId===source.id&&a.sourceManipulation.gestureId===g.id))
      if(local.narrationAnchor!==action.narrationAnchor||local.target?.partId!==binding.partId||local.target?.anchor!==action.target.anchor||local.target.modelId!==slice.visualization?.modelId)return fail(slice,'original cue/entity/anchor changed at a camera cut');
  }
  const start=source.startMs+g.startMs,end=source.startMs+g.endMs,contact=source.startMs+g.contactMs;
  const release=g.releaseMs===undefined?undefined:source.startMs+g.releaseMs,landing=g.landingMs===undefined?undefined:source.startMs+g.landingMs;
  const descriptor:Omit<SourceInteractionDescriptor,'fingerprint'>={version:SOURCE_INTERACTION_VERSION,actorId,sourceId:source.id,sourceHash:hash(source),gestureId:g.id,hand:rigHand(g),operation:g.action,
    partId:binding.partId,propId:prop.id,narrationAnchor:cue.id,cueHash:hash(cue),modelHash:hash({binding,part:shot.visualization!.parts.find(p=>p.id===binding.partId),model:shot.cinematic!.models.find(m=>m.partId===binding.partId),art:shot.cinematic!.artDirection?.models.find(m=>m.partId===binding.partId)}),
    startMs:start,endMs:end,contactMs:contact,...(release===undefined?{}:{releaseMs:release}),...(landing===undefined?{}:{landingMs:landing}),
    sliceStartMs:action.startMs,sliceEndMs:action.endMs,inheritedContact:contact<action.startMs,entryPhase:phase(action.startMs,contact,release,landing),exitPhase:phase(action.endMs,contact,release,landing)};
  return {...descriptor,fingerprint:hash({descriptor,original:run,narration})};
}
/** Actual source palm/prop geometry at the original contact and the visible
 * slice. No speech/face evaluation or invented target after release. */
export function sourceInteractionGeometry(shot:Shot,actorId:string,action:Action,board:Storyboard|undefined,narration:Narration|undefined):HostGeometry['interactions'][number]{
  const d=sourceInteractionDescriptor(shot,actorId,action,board,narration);
  const sample=(s:Shot,global:number)=>{
    const owner=person(s,actorId),clock=actorViewActingClock(board!,s,actorId);
    if(!clock?.manipulationMotion)return fail(s,'sample lacks its complete original clock');
    const f=samplePhysicalPerformance(owner.performance,actorProfile(owner.character),global-s.startMs,clock),state=f.props[d.propId];
    if(!state)return fail(s,'sample has no actual original model center');
    const prop=owner.performance.sourceManipulation!.props.find(p=>p.id===d.propId)!,offset=prop.gripOffset??{x:0,y:0},hand=f.hands[d.hand];
    const target={x:state.point.x+offset.x*owner.performance.scale,y:state.point.y+offset.y*owner.performance.scale};
    return {frame:f,hand,target,modelCenter:state.point,errorPx:Math.hypot(hand.x-target.x,hand.y-target.y)};
  };
  const contactShot=board!.shots.find(s=>s.startMs<=d.contactMs&&s.endMs>d.contactMs);
  if(!contactShot)return fail(shot,'original contact camera slice is absent');
  const contact=sample(contactShot,d.contactMs);
  // The original witness compares against the independently declared world
  // grip, rather than only a prop center computed from that same palm.
  const original=person(contactShot,actorId),prop=original.performance.sourceManipulation!.props.find(p=>p.id===d.propId)!,offset=prop.gripOffset??{x:0,y:0};
  const target={x:prop.origin.x+offset.x*original.performance.scale,y:prop.origin.y+offset.y*original.performance.scale};
  const contactError=Math.hypot(contact.hand.x-target.x,contact.hand.y-target.y),constraintError=contact.frame.contactErrors[d.hand];
  if(!Number.isFinite(contactError)||contactError>1||!Number.isFinite(constraintError)||constraintError>1||Math.hypot(contact.modelCenter.x-prop.origin.x,contact.modelCenter.y-prop.origin.y)>1)return fail(shot,'actual original palm/model misses its declared grip');
  const sampleMs=action.contactMs??action.startMs,at=sample(shot,sampleMs),currentPhase=phase(sampleMs,d.contactMs,d.releaseMs,d.landingMs);
  const gripError=at.frame.contactErrors[d.hand];
  if(currentPhase==='held'&&(!Number.isFinite(at.errorPx)||at.errorPx>1||!Number.isFinite(gripError)||gripError>1))return fail(shot,'inherited held grip is not on the actual model');
  return {actorId,handSide:d.hand,type:action.type,startMs:action.startMs,reachMs:sampleMs,endMs:action.endMs,partId:d.partId,target:at.target,hand:at.hand,errorPx:at.errorPx,root:at.frame.root,gaze:at.target,
    ...(action.contactMs===undefined?{}:{contactMs:action.contactMs}),
    sourceManipulation:{...d,sampleMs,phase:currentPhase,modelCenter:at.modelCenter,...(currentPhase==='held'?{gripConstraintErrorPx:gripError}:{}),originalContact:{shotId:contactShot.id,sampleMs:d.contactMs,target,hand:contact.hand,modelCenter:contact.modelCenter,errorPx:contactError,constraintErrorPx:constraintError},scope:'original-physical-geometry-candidate',contactVerified:false,motionVerified:false}};
}
/** Review re-evaluates the canonical source; serialized flags or a fabricated
 * inherited contact cannot bypass the legacy contact check. */
export function validateSourceInteractionGeometry(shot:Shot,board:Storyboard,narration:Narration,interactions:HostGeometry['interactions']):void{
  const scene=shot.cinematic?.actorScene;
  const owners=[...(scene?.primary?[{id:scene.primary.id,actions:shot.host?.actions??[]}]:[]),...(scene?.supporting.map(a=>({id:a.character.id,actions:a.actions}))??[])];
  const expected=owners.flatMap(o=>o.actions.filter(a=>a.sourceManipulation).map(a=>sourceInteractionGeometry(shot,o.id,a,board,narration)));
  const actual=interactions.filter(a=>a.sourceManipulation),sort=(records:typeof actual)=>[...records].sort((a,b)=>(a.actorId+':'+a.sourceManipulation!.gestureId).localeCompare(b.actorId+':'+b.sourceManipulation!.gestureId));
  if(hash(sort(actual))!==hash(sort(expected)))return fail(shot,'geometry differs from its canonical original contact/slice; rebuild rather than editing the report');
}
export function interactionPreviewTimes(shot:Pick<Shot,'startMs'|'endMs'>,interactions:readonly {reachMs:number;sourceManipulation?:SourceInteractionRecord}[],step:number):number[]{
  if(!Number.isFinite(step)||step<=0)throw new Error('Invalid interaction evidence frame step');
  const times=new Set<number>(),add=(time:number)=>{if(time>=shot.startMs&&time<shot.endMs)times.add(time);};
  for(const action of interactions){
    const source=action.sourceManipulation;
    if(source){
      add(shot.startMs);add(shot.endMs-1);add(action.reachMs);
      for(const at of [source.contactMs,source.releaseMs,source.landingMs].filter((t):t is number=>t!==undefined))for(const time of [at-step,at,at+step])add(time);
    }else for(const time of [action.reachMs-step,action.reachMs,action.reachMs+step])add(Math.max(shot.startMs,Math.min(shot.endMs-1,time)));
  }
  return [...times].sort((a,b)=>a-b);
}
export const sourceInteractionDescription={version:SOURCE_INTERACTION_VERSION,
  rule:'actual original person/source/gesture/hand/entity/grip/cue; unchanged complete original action through camera and primary/supporting swaps',
  geometry:'original contact sampled in its actual camera slice; current held/approach/released/landed state uses the actual physical source frame, without new contact at entry or narration/face evaluation',
  review:'recompute canonical source records; actual original contact/release/landing evidence sampled only in the owning camera slice',
  pending:['fixed operate geometry, generic operation validation and API role swaps','shared/sequential ownership and full runtime/art/motion/film/factory acceptance'],
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false};
