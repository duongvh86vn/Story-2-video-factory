import {HostActionSchema,type ShotHost} from '../host/schemas.js';
import {rigHand} from '../core/identifiers.js';
import type {PerformancePlan,Gesture} from '../animation/schemas.js';
import {validateManipulationSourcePlan} from '../animation/view-source-manipulation.js';

type Action=ShotHost['actions'][number];
type Context={shotStartMs:number;target:NonNullable<Action['target']>;narrationAnchor:string};
function ownedSlice(plan:PerformancePlan,gesture:Gesture,shotStartMs:number){
  const source=plan.sourceManipulation!;
  if(!Number.isSafeInteger(shotStartMs)||shotStartMs<source.startMs||shotStartMs+plan.durationMs>source.endMs)
    throw new Error('needs-source-action: shot is outside the original owned contact clock');
  const startMs=Math.max(shotStartMs,source.startMs+gesture.startMs),endMs=Math.min(shotStartMs+plan.durationMs,source.startMs+gesture.endMs);
  if(startMs>=endMs)return;
  const contact=source.startMs+gesture.contactMs!;
  return {startMs,endMs,...(contact>=startMs&&contact<endMs?{contactMs:contact}:{})};
}
/** Source-only authoring contract. Target/cue are supplied from the sourced
 * storyboard, never inferred from coordinates or manufactured after a cut. */
export function projectManipulationAction(plan:PerformancePlan,gestureId:string,context:Context):Action{
  validateManipulationSourcePlan(plan);
  const source=plan.sourceManipulation,gesture=source?.gestures.find(g=>g.id===gestureId);
  if(!source||!gesture)throw new Error('needs-source-action: missing original contact source/gesture');
  const slice=ownedSlice(plan,gesture,context.shotStartMs);
  if(!slice)throw new Error('needs-source-action: original gesture does not overlap this shot');
  return HostActionSchema.parse({type:'operate-model',hand:rigHand(gesture),...slice,
    target:context.target,narrationAnchor:context.narrationAnchor,sourceManipulation:{sourceId:source.id,gestureId:gesture.id}});
}
/** Exact per-shot projection only. This does not certify cue evidence, object
 * binding, contact reactions, model continuity, rendering or production. */
export function validateManipulationActionSlices(plan:PerformancePlan,actions:readonly Action[],shotStartMs:number):void{
  const selected=actions.filter(a=>a.sourceManipulation),source=plan.sourceManipulation;
  if(!source){if(selected.length)throw new Error('needs-source-action: reference has no original performance contact source');return;}
  validateManipulationSourcePlan(plan);
  // Validate even a slice that has no active contact gesture.
  if(!Number.isSafeInteger(shotStartMs)||shotStartMs<source.startMs||shotStartMs+plan.durationMs>source.endMs)
    throw new Error('needs-source-action: shot is outside the original owned contact clock');
  const expected=source.gestures.flatMap(g=>{const slice=ownedSlice(plan,g,shotStartMs);return slice?[{gesture:g,slice}]:[];});
  if(selected.length!==expected.length)throw new Error('needs-source-action: each original contact slice requires exactly one explicit action reference');
  const seen=new Set<string>();
  for(const raw of selected){
    const action=HostActionSchema.parse(raw),ref=action.sourceManipulation!,entry=expected.find(e=>e.gesture.id===ref.gestureId);
    if(ref.sourceId!==source.id||!entry||seen.has(ref.gestureId)||rigHand(action)!==rigHand(entry.gesture)||
      action.startMs!==entry.slice.startMs||action.endMs!==entry.slice.endMs||action.contactMs!==entry.slice.contactMs)
      throw new Error('needs-source-action: original source/gesture/hand/clock/contact was changed or restarted at a cut');
    seen.add(ref.gestureId);
    // Unbound idle occupies both hands. Legacy non-idle actions without hand
    // still own the established default right channel (rigHand never throws).
    // Requiring other.hand here would silently lose that real conflict.
    if(actions.some(other=>other!==raw&&!other.sourceManipulation&&(!other.hand&&other.type==='idle'||rigHand(other)===rigHand(action))&&other.startMs<action.endMs&&other.endMs>action.startMs))
      throw new Error('needs-source-action: another shot-local action owns the original contact hand');
  }
}
export const sourceManipulationActionDescription={version:'source-manipulation-action-1',
  selection:'explicit host/supporting action.sourceManipulation sourceId + gestureId',
  clock:'exact shot intersection of original contact gesture; contact only in its actual half-open slice, never fabricated at a later cut',
  scope:'schema and projection validation only; original cue/model/entity/reaction/continuity production binding still pending',
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false};
