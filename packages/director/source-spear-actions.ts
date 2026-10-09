import {HostActionSchema,type ShotHost} from '../host/schemas.js';
import type {PerformancePlan} from '../animation/schemas.js';
import {validateSpearSourcePlan} from '../animation/view-source-spear.js';
import {spearActionSlice,validateSpearActionClock} from './source-spear-action-clock.js';
import {SOURCE_SPEAR_ACTION_VERSION} from './source-spear-action-reference.js';
type Action=ShotHost['actions'][number];

export function projectSpearAction(plan:PerformancePlan,trackId:string,context:{shotStartMs:number;shaftPartId:string;target:NonNullable<Action['target']>;narrationAnchor:string}):Action{
  validateSpearSourcePlan(plan);
  const source=plan.sourceSpear,track=source?.spears.find(t=>t.id===trackId);
  if(!source||!track)throw new Error('needs-source-action: original spear source/track absent');
  const slice=spearActionSlice(plan,track,context.shotStartMs);
  if(!slice)throw new Error('needs-source-action: original spear track does not intersect this camera');
  return HostActionSchema.parse({type:track.action==='hold'?'hold-tool':'thrust-tool',hand:track.hand,...slice,target:context.target,narrationAnchor:context.narrationAnchor,
    sourceSpear:{sourceId:source.id,trackId,shaftPartId:context.shaftPartId}});
}
export function validateSpearActionSlices(plan:PerformancePlan,actions:readonly Action[],shotStartMs:number):void{
  if(plan.sourceSpear)validateSpearSourcePlan(plan);
  for(const action of actions.filter(a=>a.sourceSpear||['hold-tool','thrust-tool'].includes(a.type)))HostActionSchema.parse(action);
  validateSpearActionClock(plan,actions,shotStartMs);
}
export const sourceSpearActionDescription={version:SOURCE_SPEAR_ACTION_VERSION,selection:'explicit hold-tool/thrust-tool and action.sourceSpear sourceId/trackId/shaftPartId; separate intended target and exact narration cue',
  clock:'exact original action intersection; a contact mark exists only in its real half-open camera slice; both gripping hands stay owned, no reset/pickup/local thrust',
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false,productionApproval:false};
