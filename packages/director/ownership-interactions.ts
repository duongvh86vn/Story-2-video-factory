import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import type {ShotHost} from '../host/schemas.js';
import type {SourceInteractionDescriptor} from './source-interactions.js';
import {SOURCE_INTERACTION_VERSION} from './source-interaction-version.js';
import {hash} from '../core/utils.js';
import {rigHand} from '../core/identifiers.js';
import {sourceActor} from './source-actor.js';
import {validateSourceOwnershipTimelines} from './source-ownership.js';
import {ownershipPhaseAt} from './source-ownership-projection.js';

export interface OwnershipInteraction {
  sourceId:string;sourceHash:string;gripId:string;
  entryKind:'world'|'held'|'shared';exitKind:'world'|'held'|'shared';
  activeIntervals:Array<{startMs:number;endMs:number}>;transitionIds:string[];transitionTimesMs:number[];
}
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: ownership interaction ${message}`);};
const active=(phase:ReturnType<typeof ownershipPhaseAt>,grip:string)=>phase.kind==='held'?phase.gripId===grip:phase.kind==='shared'&&phase.gripIds.includes(grip);

/** A grip alias belongs to a story person and one original action, not the
 * first prop binding or current camera lead. Semantic source only, no poses. */
export function ownershipInteractionDescriptor(shot:Shot,actorId:string,action:ShotHost['actions'][number],board:Storyboard,narration:Narration):SourceInteractionDescriptor{
  validateSourceOwnershipTimelines(shot,board,narration);
  const owner=sourceActor(shot,actorId),original=owner.performance.sourceManipulation,ref=action.sourceManipulation;
  if(!original||!ref||ref.sourceId!==original.id||owner.actions.filter(a=>hash(a)===hash(action)).length!==1||!action.target||!action.narrationAnchor)return fail(shot,'requires the actual explicit person/action/entity/cue');
  const sources=shot.cinematic!.sourceOwnership!.filter(s=>s.partId===action.target!.partId);
  if(sources.length!==1)return fail(shot,'canonical entity is missing or ambiguous');
  const source=sources[0]!,grips=source.grips.filter(g=>g.actorId===actorId&&g.sourceId===ref.sourceId&&g.gestureId===ref.gestureId&&g.hand===rigHand(action));
  if(grips.length!==1)return fail(shot,'action has no unique original grip');
  const grip=grips[0]!,gesture=original.gestures.find(g=>g.id===grip.gestureId&&g.propId===grip.propId),cue=narration.segments.find(s=>s.id===action.narrationAnchor);
  if(!gesture||!cue||gesture.contactMs===undefined||!['pick-place','carry'].includes(gesture.action)||action.target.modelId!==shot.visualization?.modelId||action.target.anchor==='label')return fail(shot,'transport, narration or target differs from the original grip');
  const contactMs=original.startMs+gesture.contactMs,releaseMs=gesture.releaseMs===undefined?undefined:original.startMs+gesture.releaseMs;
  const startMs=original.startMs+gesture.startMs,endMs=original.startMs+gesture.endMs;
  if(contactMs<cue.startMs||contactMs>=cue.endMs||releaseMs!==undefined&&releaseMs>cue.endMs)return fail(shot,'original contact/release must stay inside its actual narration cue');
  const paints=shot.cinematic!.ownershipPaint?.filter(p=>p.sourceId===source.id)??[],painted=paints[0]?.grips.filter(g=>g.gripId===grip.id)??[];
  if(paints.length!==1||painted.length!==1)return fail(shot,'requires its own explicit artwork grip');
  const part=shot.visualization!.parts.find(p=>p.id===source.partId)!,stage=owner.performance.stage,anchor=painted[0]!.anchor;
  if(Math.hypot((anchor.x-.5)*part.width*stage.width-grip.gripOffset.x,(anchor.y-.5)*part.height*stage.height-grip.gripOffset.y)>1e-6||action.target.anchor==='center'&&(anchor.x!==.5||anchor.y!==.5))return fail(shot,'artwork anchor differs from its original physical grip');
  const run=board.shots.filter(s=>s.startMs<source.endMs&&s.endMs>source.startMs);
  for(const slice of run){
    const other=sourceActor(slice,actorId);
    for(const a of other.actions.filter(a=>a.sourceManipulation?.sourceId===ref.sourceId&&a.sourceManipulation.gestureId===ref.gestureId))
      if(a.narrationAnchor!==cue.id||a.target?.partId!==source.partId||a.target.modelId!==slice.visualization?.modelId||a.target.anchor!==action.target.anchor||rigHand(a)!==grip.hand)return fail(slice,'person/entity/cue/anchor changed at a camera cut');
  }
  const activeIntervals=source.phases.filter(p=>active(p,grip.id)).map(p=>({startMs:p.startMs,endMs:p.endMs}));
  const transitions=source.transitions.filter(t=>{
    const index=source.phases.findIndex(p=>p.startMs===t.timeMs);
    return active(source.phases[index-1]!,grip.id)||active(source.phases[index]!,grip.id);
  });
  const transitionIds=transitions.map(t=>t.id),transitionTimesMs=transitions.map(t=>t.timeMs);
  const phase=(time:number)=>time<contactMs?'approach' as const:releaseMs!==undefined&&time>=releaseMs?'released' as const:'held' as const;
  const descriptor:Omit<SourceInteractionDescriptor,'fingerprint'>={version:SOURCE_INTERACTION_VERSION,actorId,sourceId:original.id,sourceHash:hash(original),gestureId:grip.gestureId,hand:grip.hand,operation:gesture.action,
    partId:source.partId,targetKind:'bound-prop',propId:grip.propId,narrationAnchor:cue.id,cueHash:hash(cue),modelHash:hash({source,part,model:shot.cinematic!.models.find(m=>m.partId===source.partId),art:shot.cinematic!.artDirection?.models.find(m=>m.partId===source.partId),paint:paints[0]}),
    startMs,endMs,contactMs,...(releaseMs===undefined?{}:{releaseMs}),sliceStartMs:action.startMs,sliceEndMs:action.endMs,inheritedContact:contactMs<action.startMs,entryPhase:phase(action.startMs),exitPhase:phase(action.endMs),
    ownership:{sourceId:source.id,sourceHash:hash(source),gripId:grip.id,entryKind:ownershipPhaseAt(source,action.startMs).kind,exitKind:ownershipPhaseAt(source,action.endMs).kind,activeIntervals,transitionIds,transitionTimesMs}};
  return {...descriptor,fingerprint:hash({descriptor,original:run,narration})};
}
