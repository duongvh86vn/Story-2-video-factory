import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {rigHand} from '../core/identifiers.js';
import {isWholeSourceStatement} from '../explainer/plan.js';
import {actorProfile} from '../actors/model.js';
import {actorViewActingClock} from '../actors/view-acting-clock.js';
import {samplePhysicalPerformance} from '../animation/compiler.js';
import {hasBodyViewManipulation} from '../animation/native-contact-arm.js';
import {validateManipulationActionSlices} from './source-manipulation-actions.js';
import {sourceActor} from './source-actor.js';
import {boundProp} from './prop-owner.js';
import {SourceOwnershipSchema,type SourceOwnership,type OwnershipGrip,type OwnershipPhase} from './source-ownership-schemas.js';
import {ownershipPhaseAt} from './source-ownership-projection.js';

const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: original ownership ${message}`);};
const gripIds=(phase:OwnershipPhase):string[]=>phase.kind==='world'?[]:phase.kind==='held'?[phase.gripId]:phase.gripIds;
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const angleError=(a:number,b:number)=>Math.abs(((a-b+180)%360+360)%360-180);

function ownGrip(shot:Shot,source:SourceOwnership,grip:OwnershipGrip,board:Storyboard){
  const actor=sourceActor(shot,grip.actorId),original=actor.performance.sourceManipulation;
  if(!original||original.id!==grip.sourceId||original.startMs>source.startMs||original.endMs<source.endMs)
    return fail(shot,'grip lacks the actual person’s complete original manipulation clock');
  const matches=original.gestures.filter(g=>g.id===grip.gestureId&&g.propId===grip.propId);
  if(matches.length!==1||!['pick-place','carry'].includes(matches[0]!.action)||matches[0]!.hand!==grip.hand||matches[0]!.elbowPole!=='rest')
    return fail(shot,'grip is not one explicit original transport gesture and hand; airborne drop is not supported by this candidate');
  const gesture=matches[0]!;
  const bindings=shot.cinematic!.propBindings.filter(b=>b.ownerId===grip.actorId&&b.propId===grip.propId&&b.partId===source.partId);
  if(bindings.length!==1)return fail(shot,'grip alias must bind explicitly to the one canonical entity, without guessing its owner');
  const binding=bindings[0]!,prop=boundProp(shot,binding).prop,offset=prop.gripOffset??{x:0,y:0};
  if(prop.kind==='spear'||Math.abs(offset.x*actor.performance.scale-grip.gripOffset.x)>1e-6||Math.abs(offset.y*actor.performance.scale-grip.gripOffset.y)>1e-6)
    return fail(shot,'stage grip offset differs from its own physical prop; rotating spear handoffs need a separate physical contract');
  if(!hasBodyViewManipulation(actorProfile(actor.character)))return fail(shot,'grip requires this person’s explicit own native contact registration');
  const clock=actorViewActingClock(board,shot,grip.actorId);
  if(!clock?.manipulationMotion)return fail(shot,'grip lost its original body/head/contact history');
  validateManipulationActionSlices(actor.performance,actor.actions,shot.startMs);
  const actions=actor.actions.filter(a=>a.sourceManipulation?.sourceId===original.id&&a.sourceManipulation.gestureId===gesture.id);
  if(actions.some(a=>a.target?.partId!==source.partId||a.target.modelId!==shot.visualization?.modelId||rigHand(a)!==grip.hand||a.target.anchor==='label'))
    return fail(shot,'original action targets another entity, model, hand or label');
  return {actor,original,gesture,binding,prop,clock,actions};
}

/** Candidate semantic audit only. It deliberately does not draw aliases,
 * sample poses, approve native registrations or authorize production. */
export function validateSourceOwnershipContext(shot:Shot,source:SourceOwnership,board:Storyboard,narration:Narration):void {
  SourceOwnershipSchema.parse(source);
  const c=shot.cinematic;
  if(!c?.actorScene||c.spriteStage||board.shots.filter(s=>s.id===shot.id).length!==1||hash(board.shots.find(s=>s.id===shot.id))!==hash(shot))
    return fail(shot,'requires the authoritative complete native-actor storyboard');
  if(c.sourceOwnership?.filter(s=>s.id===source.id&&hash(s)===hash(source)).length!==1)return fail(shot,'timeline is not selected by the canonical shot');
  const run=board.shots.filter(s=>s.startMs<source.endMs&&s.endMs>source.startMs).sort((a,b)=>a.startMs-b.startMs);
  let end=source.startMs;
  const entity=(slice:Shot)=>({part:slice.visualization?.parts.find(p=>p.id===source.partId),model:slice.cinematic?.models.find(m=>m.partId===source.partId),art:slice.cinematic?.artDirection?.models.find(m=>m.partId===source.partId),stage:slice.cinematic?.performance.stage,setting:slice.cinematic?.setting,environment:slice.cinematic?.environmentAssetId});
  const canonical=entity(shot);
  if(!canonical.part||!canonical.model||!canonical.art||!['authored','model'].includes(c.artDirection?.origin??''))return fail(shot,'one canonical sourced entity/model/artwork is required');
  const bounds=(point:{x:number;y:number})=>point.x-canonical.part!.width*canonical.stage!.width/2>=0&&point.x+canonical.part!.width*canonical.stage!.width/2<=canonical.stage!.width&&point.y-canonical.part!.height*canonical.stage!.height/2>=0&&point.y+canonical.part!.height*canonical.stage!.height/2<=canonical.stage!.groundY;
  if(source.phases.some(p=>p.kind==='world'&&(p.rotationDeg!==0||!bounds(p.center))))return fail(shot,'placed world anchors must keep the non-rotating canonical entity inside its physical stage/floor');
  if(c.propBindings.filter(b=>b.partId===source.partId).length!==source.grips.length)return fail(shot,'undeclared or duplicated physical alias for the canonical entity');
  const initial=source.phases[0]!;
  if(initial.kind==='world'&&(distance(initial.center,{x:canonical.part.x*canonical.stage!.width,y:canonical.part.y*canonical.stage!.height})>1e-6||initial.rotationDeg!==0))
    return fail(shot,'initial independent world anchor must match the canonical entity');
  if(initial.kind!=='world'){
    const authority=initial.kind==='held'?initial.gripId:initial.authorityGripId;
    const first=ownGrip(shot,source,source.grips.find(g=>g.id===authority)!,board);
    if(distance(first.prop.origin,{x:canonical.part.x*canonical.stage!.width,y:canonical.part.y*canonical.stage!.height})>1e-6)
      return fail(shot,'initial held entity must retain its independent canonical world origin');
  }
  for(const slice of run){
    if(slice.startMs!==end||slice.endMs>source.endMs)return fail(slice,'camera coverage has a gap or crosses its complete ownership interval');end=slice.endMs;
    if(!slice.cinematic?.actorScene||slice.cinematic.spriteStage||slice.cinematic.sourceOwnership?.filter(s=>s.id===source.id&&hash(s)===hash(source)).length!==1||hash(entity(slice))!==hash(canonical))
      return fail(slice,'canonical entity/art/stage/ownership history changed at a camera cut');
    if(slice.visualization?.parts.filter(p=>p.id===source.partId).length!==1||slice.cinematic.models.filter(m=>m.partId===source.partId).length!==1||slice.cinematic.artDirection?.models.filter(m=>m.partId===source.partId).length!==1)
      return fail(slice,'canonical entity/model/art descriptor is duplicated or missing');
    if(slice.cinematic.propBindings.filter(b=>b.partId===source.partId).length!==source.grips.length)return fail(slice,'camera slice lost or duplicated an entity grip alias');
    for(const grip of source.grips){
      const owned=ownGrip(slice,source,grip,board),originalOwner=ownGrip(shot,source,grip,board);
      if(hash({character:owned.actor.character,source:owned.original,binding:owned.binding,scale:owned.actor.performance.scale})!==hash({character:originalOwner.actor.character,source:originalOwner.original,binding:originalOwner.binding,scale:originalOwner.actor.performance.scale}))
        return fail(slice,'person identity, physical source, scale or alias evidence changed at a cut');
      if(owned.binding.sourceRefs.some(ref=>!canonical.part!.sourceRefs.some(r=>hash(r)===hash(ref))||!canonical.art!.sourceRefs.some(r=>hash(r)===hash(ref))))
        return fail(slice,'alias lost its canonical model/art source evidence');
      for(const ref of owned.binding.sourceRefs)if(ref.kind==='narration'&&!narration.segments.some(s=>s.id===ref.segmentId&&s.text.normalize('NFC').includes(ref.quote.normalize('NFC'))))
        return fail(slice,'alias source quote is absent from the original narration');
      const intervals=source.phases.filter(p=>gripIds(p).includes(grip.id)),first=intervals[0]!,last=intervals.at(-1)!;
      if(owned.gesture.contactMs===undefined||owned.original.startMs+owned.gesture.contactMs!==first.startMs||owned.original.startMs+owned.gesture.endMs<last.endMs)
        return fail(slice,'ownership contact/hold interval differs from its original gesture');
      const release=owned.gesture.releaseMs===undefined?undefined:owned.original.startMs+owned.gesture.releaseMs;
      if(last.endMs<source.endMs?release!==last.endMs:release!==undefined&&release!==last.endMs)
        return fail(slice,'ownership release differs from its original hand clock');
      for(const action of owned.actions){
        const cue=narration.segments.find(s=>s.id===action.narrationAnchor);
        if(!cue||!slice.narrationSegmentIds?.includes(cue.id))return fail(slice,'contact action lost its original narration anchor');
        const witnesses=run.flatMap(s=>s.cinematic?.sceneIntent?.acting??[]).filter(a=>a.participantId===grip.actorId&&a.kind==='manipulation'&&a.operation===owned.gesture.action&&a.targetIds?.includes(source.partId));
        if(!witnesses.some(a=>isWholeSourceStatement(a.statement,cue.text)&&a.sourceRefs.some(r=>r.kind==='narration'&&r.segmentId===cue.id&&isWholeSourceStatement(a.statement,r.quote)&&cue.text.normalize('NFC').includes(r.quote.normalize('NFC')))))
          return fail(slice,'original transport needs its person’s complete sourced action statement');
      }
    }
  }
  if(end!==source.endMs)return fail(shot,'ownership timeline is not completely covered by camera slices');
  for(const transition of source.transitions){
    const cue=narration.segments.find(s=>s.id===transition.narrationAnchor);
    if(!cue||transition.timeMs<cue.startMs||transition.timeMs>=cue.endMs||!isWholeSourceStatement(transition.statement,cue.text)||!transition.sourceRefs.some(r=>r.kind==='narration'&&r.segmentId===cue.id&&isWholeSourceStatement(transition.statement,r.quote)))
      return fail(shot,'pickup/handoff/place boundary lacks its complete original narration witness and clock');
    for(const ref of transition.sourceRefs)if(ref.kind==='narration'&&!narration.segments.some(s=>s.id===ref.segmentId&&s.text.normalize('NFC').includes(ref.quote.normalize('NFC'))))
      return fail(shot,'ownership source quote is absent from the original narration');
    const index=source.phases.findIndex(p=>p.startMs===transition.timeMs),before=source.phases[index-1]!,after=source.phases[index]!;
    const changed=[...new Set([...gripIds(before),...gripIds(after)])].filter(id=>!gripIds(before).includes(id)||!gripIds(after).includes(id));
    // Authority-only changes still concern BOTH actual story people. A quote
    // about an unrelated person's action cannot authorize this ownership edge.
    const witnesses=changed.length?changed:gripIds(after);
    for(const id of witnesses){
      const grip=source.grips.find(g=>g.id===id)!;
      if(!run.some(s=>s.cinematic?.sceneIntent?.acting?.some(a=>a.participantId===grip.actorId&&a.kind==='manipulation'&&a.targetIds?.includes(source.partId)&&isWholeSourceStatement(a.statement,cue.text)&&a.sourceRefs.some(ref=>ref.kind==='narration'&&ref.segmentId===cue.id&&transition.sourceRefs.some(r=>hash(r)===hash(ref))&&isWholeSourceStatement(a.statement,ref.quote)))))
        return fail(shot,'ownership boundary lacks the changed person’s sourced manipulation witness for this canonical entity');
    }
  }
}

export function validateSourceOwnershipTimelines(shot:Shot,board:Storyboard,narration:Narration):void {
  const sources=shot.cinematic?.sourceOwnership??[],ids=new Set<string>(),parts=new Set<string>(),aliases=new Set<string>();
  for(const source of sources){
    if(ids.has(source.id)||parts.has(source.partId))return fail(shot,'one canonical entity can have only one ownership timeline');ids.add(source.id);parts.add(source.partId);
    validateSourceOwnershipContext(shot,source,board,narration);
    for(const grip of source.grips){
      const alias=JSON.stringify([grip.actorId,grip.propId]);if(aliases.has(alias))return fail(shot,'one physical alias cannot stand for different entities');aliases.add(alias);
      for(const other of sources)if(other!==source)for(const rival of other.grips.filter(g=>g.actorId===grip.actorId&&g.hand===grip.hand))
        if(source.phases.some(a=>gripIds(a).includes(grip.id)&&other.phases.some(b=>gripIds(b).includes(rival.id)&&a.startMs<b.endMs&&a.endMs>b.startMs)))
          return fail(shot,'the same actual hand cannot simultaneously hold different canonical entities');
    }
  }
}

function gripGeometry(shot:Shot,source:SourceOwnership,grip:OwnershipGrip,board:Storyboard,timeMs:number,requireAttached:boolean){
  const owned=ownGrip(shot,source,grip,board),frame=samplePhysicalPerformance(owned.actor.performance,actorProfile(owned.actor.character),timeMs-shot.startMs,owned.clock),state=frame.props[grip.propId];
  if(!state||requireAttached&&!state.attached)return fail(shot,'selected owner has no actual attached physical prop at this time');
  const center=state.point,rotationDeg=state.angle??0,hand=frame.hands[grip.hand],target={x:center.x+grip.gripOffset.x,y:center.y+grip.gripOffset.y};
  const errorPx=distance(hand,target),constraintErrorPx=frame.contactErrors[grip.hand];
  if(![center.x,center.y,rotationDeg,errorPx,constraintErrorPx].every(Number.isFinite)||rotationDeg!==0||errorPx>1||constraintErrorPx>1)
    return fail(shot,'actual palm misses its explicit grip or the transport rotates without a registered physical contract');
  // Initial contact is compared to the independently authored world anchor,
  // rather than only an object center calculated from that same moving palm.
  const contactMs=owned.original.startMs+owned.gesture.contactMs!;
  const contactCamera=board.shots.find(s=>s.startMs<=contactMs&&s.endMs>contactMs);
  if(!contactCamera)return fail(shot,'original grip contact has no actual camera slice');
  const contactOwner=ownGrip(contactCamera,source,grip,board),contactFrame=samplePhysicalPerformance(contactOwner.actor.performance,actorProfile(contactOwner.actor.character),contactMs-contactCamera.startMs,contactOwner.clock);
  const originalTarget={x:contactOwner.prop.origin.x+grip.gripOffset.x,y:contactOwner.prop.origin.y+grip.gripOffset.y};
  const originalHand=contactFrame.hands[grip.hand],originalState=contactFrame.props[grip.propId];
  const originalErrorPx=distance(originalHand,originalTarget),originalConstraintErrorPx=contactFrame.contactErrors[grip.hand];
  if(!contactOwner.gesture.target||distance(contactOwner.gesture.target,originalTarget)>1e-6||!originalState||distance(originalState.point,contactOwner.prop.origin)>1||!Number.isFinite(originalErrorPx)||originalErrorPx>1||!Number.isFinite(originalConstraintErrorPx)||originalConstraintErrorPx>1)
    return fail(shot,'actual original contact misses its independently authored world prop/grip target');
  return {gripId:grip.id,actorId:grip.actorId,hand:grip.hand,propId:grip.propId,center,rotationDeg,palm:hand,target,errorPx,constraintErrorPx,
    originalContact:{shotId:contactCamera.id,timeMs:contactMs,target:originalTarget,palm:originalHand,errorPx:originalErrorPx,constraintErrorPx:originalConstraintErrorPx}};
}

function samplePhase(shot:Shot,source:SourceOwnership,phase:OwnershipPhase,board:Storyboard,timeMs:number,requireAttached=true){
  if(phase.kind==='world')return {center:phase.center,rotationDeg:phase.rotationDeg,grips:[],authorityGripId:undefined};
  const grips=gripIds(phase).map(id=>gripGeometry(shot,source,source.grips.find(g=>g.id===id)!,board,timeMs,requireAttached));
  const authorityGripId=phase.kind==='held'?phase.gripId:phase.authorityGripId,authority=grips.find(g=>g.gripId===authorityGripId)!;
  for(const g of grips)if(distance(g.center,authority.center)>1||angleError(g.rotationDeg,authority.rotationDeg)>1e-6)
    return fail(shot,'two actual grips disagree on the one entity; do not pull a hand or duplicate the artwork to conceal the error');
  return {center:authority.center,rotationDeg:authority.rotationDeg,grips,authorityGripId};
}

/** Explicit candidate inspection callable by the human test model. A caller
 * chooses times; implementation/build/schema export never evaluates poses. */
export function sourceOwnershipFrame(shot:Shot,sourceId:string,timeMs:number,board:Storyboard,narration:Narration){
  const sources=shot.cinematic?.sourceOwnership?.filter(s=>s.id===sourceId)??[];
  if(sources.length!==1)return fail(shot,'missing or ambiguous selected canonical ownership timeline');
  const source=sources[0]!;
  validateSourceOwnershipTimelines(shot,board,narration);
  if(!Number.isFinite(timeMs)||timeMs<shot.startMs||timeMs>shot.endMs)return fail(shot,'sample must be in the actual camera slice, never clamped');
  const phase=ownershipPhaseAt(source,timeMs),sample=samplePhase(shot,source,phase,board,timeMs,timeMs!==source.endMs);
  const part=shot.visualization!.parts.find(p=>p.id===source.partId)!,stage=shot.cinematic!.performance.stage;
  if(sample.rotationDeg!==0||sample.center.x-part.width*stage.width/2<0||sample.center.x+part.width*stage.width/2>stage.width||sample.center.y-part.height*stage.height/2<0||sample.center.y+part.height*stage.height/2>stage.groundY)
    return fail(shot,'canonical world entity rotates or leaves the actual stage/floor bounds');
  return {version:source.version,id:source.id,partId:source.partId,timeMs,phaseIndex:source.phases.findIndex(p=>p.startMs===phase.startMs),kind:phase.kind,...sample,
    scope:'original-shared-geometry-candidate' as const,contactVerified:false as const,motionVerified:false as const,productionApproval:false as const};
}

/** Each side is evaluated from its original source at the same global time.
 * Adjacent camera cuts never restart contact or choose a new world authority. */
export function sourceOwnershipBoundary(shot:Shot,sourceId:string,transitionId:string,board:Storyboard,narration:Narration){
  const source=shot.cinematic?.sourceOwnership?.find(s=>s.id===sourceId);if(!source)return fail(shot,'missing boundary timeline');
  validateSourceOwnershipTimelines(shot,board,narration);
  const transition=source.transitions.find(t=>t.id===transitionId);if(!transition)return fail(shot,'missing explicit ownership transition');
  const index=source.phases.findIndex(p=>p.startMs===transition.timeMs),left=source.phases[index-1],right=source.phases[index];
  if(!left||!right)return fail(shot,'transition must connect two actual original phases');
  const camera=board.shots.find(s=>s.startMs<=transition.timeMs&&s.endMs>transition.timeMs);if(!camera)return fail(shot,'boundary has no actual source camera slice');
  const before=samplePhase(camera,source,left,board,transition.timeMs,false),after=samplePhase(camera,source,right,board,transition.timeMs,false);
  const errorPx=distance(before.center,after.center),rotationErrorDeg=angleError(before.rotationDeg,after.rotationDeg);
  if(errorPx>1||rotationErrorDeg>1e-6)return fail(camera,'canonical entity teleports or rotates at pickup, shared authority transfer or placement');
  return {sourceId,transitionId,timeMs:transition.timeMs,before,after,errorPx,rotationErrorDeg,scope:'original-shared-boundary-candidate' as const,contactVerified:false as const,motionVerified:false as const,productionApproval:false as const};
}

export const sourceOwnershipDescription={version:'source-ownership-1',status:'candidate',selection:'explicit cinematic.sourceOwnership; one canonical entity, actor/source/gesture/prop/hand grip aliases, complete global phases and sourced boundaries',
  geometry:'actual own original body/head/manipulation frames; shared grips must agree on one world entity; explicit stage grip offsets; no guessed palm, duplicated artwork, forced alignment or contact restart',
  supportedCandidate:'non-rotating generic pick-place/carry; two distinct people, explicit shared overlap before handoff; placed world anchors',
  pending:['candidate runtime and original contact/continuity acceptance','one-entity renderer and camera/interaction/coverage/continuity observation runtime acceptance','rotating tools, airborne drops and integrated production audit','all art/motion/video/input/voice/resume acceptance'],
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false,productionApproval:false};
