import {hash} from '../core/utils.js';
import {rigHand,type RigHand} from '../core/identifiers.js';
import {ManipulationSourceSchema,type ManipulationSource,type PerformancePlan,type Gesture} from './schemas.js';
import {sourceBodyPlan,validateBodySourcePlan} from './view-source-body.js';
import type {ViewActingClock} from './view-acting-clock.js';

export function validateManipulationSourcePlan(plan:PerformancePlan):void{
  if(!plan.sourceManipulation)return;
  const source=ManipulationSourceSchema.parse(plan.sourceManipulation),body=plan.sourceBody;
  if(!body||source.startMs!==body.startMs||source.endMs!==body.endMs||source.endMs-source.startMs<plan.durationMs)
    throw new Error('needs-source-manipulation: exact complete original body clock is required');
  if(plan.props.length||plan.spears?.length||plan.lunge||plan.gestures.some(g=>['operate','pick-place','carry','drop'].includes(g.action)))
    throw new Error('needs-source-manipulation: local props/contact/spear/lunge conflict with original ownership');
  validateBodySourcePlan(plan);
}
/** Full physical source for canonical validation, without recursive source
 * fields or shot-local gaze/emotion/gesture approximations. */
export function manipulationSourcePlan(plan:PerformancePlan):PerformancePlan{
  if(!plan.sourceManipulation)return plan;
  validateManipulationSourcePlan(plan);
  const source=plan.sourceManipulation,physical=sourceBodyPlan(plan);
  return {...physical,sourceManipulation:undefined,sourceHead:undefined,durationMs:source.endMs-source.startMs,
    gestures:structuredClone(source.gestures),props:structuredClone(source.props),gazes:[],expressions:[]};
}
export function performanceProps(plan:PerformancePlan){return plan.sourceManipulation?.props??plan.props;}
export function sourceManipulationTime(plan:PerformancePlan,clock:ViewActingClock|undefined,timeMs:number){
  if(!plan.sourceManipulation)return timeMs;
  if(!clock||clock.ownerId!==plan.leadCharacterId||clock.endMs-clock.startMs!==plan.durationMs)
    throw new Error('needs-source-manipulation: missing owned shot clock');
  if(!Number.isFinite(timeMs)||timeMs<0||timeMs>plan.durationMs||clock.startMs<plan.sourceManipulation.startMs||clock.endMs>plan.sourceManipulation.endMs)
    throw new Error('needs-source-manipulation: seek/shot is outside the original owned run');
  return timeMs+clock.startMs-plan.sourceManipulation.startMs;
}
export function sourceManipulationGestureAt(plan:PerformancePlan,clock:ViewActingClock|undefined,timeMs:number,hand:RigHand):Gesture|undefined{
  const source=plan.sourceManipulation;if(!source)return;
  const at=sourceManipulationTime(plan,clock,timeMs),duration=source.endMs-source.startMs;
  return source.gestures.find(g=>rigHand(g)===hand&&at>=g.startMs&&(at<g.endMs||at===duration&&g.endMs===duration&&g.action==='carry'&&g.releaseMs===undefined));
}
export function collectViewSourceManipulation(entries:readonly {startMs:number;endMs:number;sourceManipulation?:ManipulationSource}[],runStartMs:number,runEndMs:number):ManipulationSource|undefined{
  if(!entries.some(e=>e.sourceManipulation))return;
  if(!Number.isSafeInteger(runStartMs)||!Number.isSafeInteger(runEndMs)||runStartMs<0||runEndMs<=runStartMs)throw new Error('needs-source-manipulation: invalid continuous run');
  let source:ManipulationSource|undefined,end=runStartMs;
  for(const entry of [...entries].sort((a,b)=>a.startMs-b.startMs)){
    if(!entry.sourceManipulation)throw new Error('needs-source-manipulation: a camera slice lost its complete original ownership');
    const parsed=ManipulationSourceSchema.parse(entry.sourceManipulation);
    if(parsed.startMs!==runStartMs||parsed.endMs!==runEndMs||source&&hash(source)!==hash(parsed))throw new Error('needs-source-manipulation: original action/hand/prop/clock changed between slices');
    if(!Number.isSafeInteger(entry.startMs)||!Number.isSafeInteger(entry.endMs)||entry.startMs!==end||entry.endMs<=entry.startMs||entry.endMs>runEndMs)throw new Error('needs-source-manipulation: missing/overlapping camera coverage');
    source=source??parsed;end=entry.endMs;
  }
  if(end!==runEndMs)throw new Error('needs-source-manipulation: incomplete original ownership coverage');
  return source;
}
export function validateViewSourceManipulation(plan:PerformancePlan,clock:ViewActingClock):void{
  if(!plan.sourceManipulation&&!clock.manipulationMotion)return;
  validateManipulationSourcePlan(plan);
  const source=clock.manipulationMotion;
  if(!source||!plan.sourceManipulation||hash(ManipulationSourceSchema.parse(source))!==hash(ManipulationSourceSchema.parse(plan.sourceManipulation))||
    source.startMs!==clock.runStartMs||source.endMs!==clock.runEndMs||clock.startMs<source.startMs||clock.endMs>source.endMs)
    throw new Error('needs-source-manipulation: local declaration differs from complete owned run');
  for(const g of source.gestures){const start=source.startMs+g.startMs,end=source.startMs+g.endMs;
    if(plan.gestures.some(local=>rigHand(local)===rigHand(g)&&local.startMs+clock.startMs<end&&local.endMs+clock.startMs>start)||
      clock.gestures.some(local=>local.hand===rigHand(g)&&local.startMs<end&&local.endMs>start))
      throw new Error('needs-source-manipulation: another local/source command owns the original contact hand');
  }
}
export const sourceManipulationDescription={version:'native-source-manipulation-1',selection:'explicit performance.sourceManipulation',
  clock:'complete run-relative hand/prop history repeated byte-equivalently on every explicitly continuous actor camera slice; matching original sourceBody required',
  invariant:'source actor/cast/view/root/stage/scale and original body/action/hand/target/release/grip/prop identity stay authoritative; local props/contact cannot approximate or restart the source',
  scope:'single-person one complete attachment per prop; no cross-person/shared/sequential handoff or new tool pose',approved:false,productionReady:false,motionVerified:false};
