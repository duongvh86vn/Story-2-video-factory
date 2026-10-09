import {HostActionSchema,type ShotHost} from '../host/schemas.js';
import {rigHand} from '../core/identifiers.js';
import type {PerformancePlan} from '../animation/schemas.js';
import {validateManipulationSourcePlan} from '../animation/view-source-manipulation.js';
import {sourceActionSlice,validateSourceActionClock} from './source-action-clock.js';

type Action=ShotHost['actions'][number];
type Context={shotStartMs:number;target:NonNullable<Action['target']>;narrationAnchor:string};
/** Source-only authoring contract. Target/cue are supplied from the sourced
 * storyboard, never inferred from coordinates or manufactured after a cut. */
export function projectManipulationAction(plan:PerformancePlan,gestureId:string,context:Context):Action{
  validateManipulationSourcePlan(plan);
  const source=plan.sourceManipulation,gesture=source?.gestures.find(g=>g.id===gestureId);
  if(!source||!gesture)throw new Error('needs-source-action: missing original contact source/gesture');
  const slice=sourceActionSlice(plan,gesture,context.shotStartMs);
  if(!slice)throw new Error('needs-source-action: original gesture does not overlap this shot');
  return HostActionSchema.parse({type:'operate-model',hand:rigHand(gesture),...slice,
    target:context.target,narrationAnchor:context.narrationAnchor,sourceManipulation:{sourceId:source.id,gestureId:gesture.id}});
}
/** Exact per-shot projection only. This does not certify cue evidence, object
 * binding, contact reactions, model continuity, rendering or production. */
export function validateManipulationActionSlices(plan:PerformancePlan,actions:readonly Action[],shotStartMs:number):void{
  if(plan.sourceManipulation)validateManipulationSourcePlan(plan);
  for(const action of actions.filter(a=>a.sourceManipulation))HostActionSchema.parse(action);
  validateSourceActionClock(plan,actions,shotStartMs);
}
export const sourceManipulationActionDescription={version:'source-manipulation-action-1',
  selection:'explicit host/supporting action.sourceManipulation sourceId + gestureId',
  clock:'exact shot intersection of original contact gesture; contact only in its actual half-open slice, never fabricated at a later cut',
  scope:'exact original action projection and source groups; original cue/model/entity/world/interaction/coverage source candidates exist; fixed operation/API/runtime production acceptance remains pending',
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false};
