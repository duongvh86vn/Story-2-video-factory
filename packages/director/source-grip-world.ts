import type {Shot} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {projectSourceWorldEvents} from './source-world-projection.js';
import {sourceFlowImplicitMotion} from './source-world-phase.js';

export const SOURCE_GRIP_WORLD_VERSION='source-grip-world-1';
/** A visible original grip has one geometry authority. World history cannot
 * translate/rotate the same owned entity again under an independent clock.
 * Fixed grips own their hold interval; bound props own their physical source. */
export function validateSourceGripWorld(shot:Shot,part:NonNullable<Shot['visualization']>['parts'][number],contactMs:number,holdEndMs:number,sourceSpan?:{startMs:number;endMs:number}):void{
  const c=shot.cinematic,world=c?.sourceWorld,kind=sourceSpan?'bound model':'fixed grip';
  const fail=(message:string):never=>{throw new Error(shot.id+': needs-source-prop-binding: '+kind+' '+message);};
  if(!Number.isFinite(contactMs)||!Number.isFinite(holdEndMs)||holdEndMs<=contactMs)return fail('has an invalid original ownership clock');
  if(sourceSpan&&(!Number.isSafeInteger(sourceSpan.startMs)||!Number.isSafeInteger(sourceSpan.endMs)||sourceSpan.startMs<0||sourceSpan.startMs>contactMs||sourceSpan.endMs<holdEndMs))return fail('has an invalid complete physical source span');
  if(!world){
    if(shot.visualization?.events.some(e=>e.targetId===part.id||e.type==='flow'&&e.relationTo===part.id))return fail('events require complete original world history');
    return;
  }
  if(hash(shot.visualization?.events)!==hash(projectSourceWorldEvents(world,shot.startMs,shot.endMs)))return fail('events are not exact original world projections');
  const reveals=world.events.filter(e=>e.targetId===part.id&&e.type==='reveal');
  if(reveals.length&&!reveals.some(e=>e.startMs<=contactMs))return fail('is not visible at its original contact');
  const motionEnd=sourceSpan?.endMs??holdEndMs;
  if(world.events.some(e=>e.targetId===part.id&&e.startMs<motionEnd&&(e.motion==='rotate'||e.motion==='translate'&&e.endMs>(sourceSpan?.startMs??contactMs))))return fail('cannot move or retain prior rotation under an independent world geometry track');
  if(world.events.some(e=>e.type==='flow'&&e.relationTo===part.id&&e.startMs+(e.endMs-e.startMs)*.55<motionEnd&&sourceFlowImplicitMotion(world,e,part)==='rotate'))return fail('cannot inherit an implicit flow rotation under its physical ownership');
}
export const sourceGripWorldDescription={version:SOURCE_GRIP_WORLD_VERSION,
  rule:'complete original reveal/transform/flow history; fixed grip during contact/hold or bound entity during its full original physical source has one geometry authority',
  allowed:'sourced highlights, thermal states, pulse and flows without independent whole-entity transforms; internal control animation does not move the declared world grip',
  pending:['runtime and actual model/hand/foreground/label/flow continuity acceptance','integrated production audit and shared/sequential ownership'],approved:false,productionReady:false,motionVerified:false};
