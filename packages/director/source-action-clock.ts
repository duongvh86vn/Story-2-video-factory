import type {ShotHost} from '../host/schemas.js';
import type {PerformancePlan,Gesture} from '../animation/schemas.js';
import {rigHand} from '../core/identifiers.js';

type Action=ShotHost['actions'][number];
/** Browser-safe clock arithmetic only. Server callers separately validate
 * complete original body/source schemas, people, geometry and cue evidence. */
export function sourceActionSlice(plan:PerformancePlan,gesture:Gesture,shotStartMs:number){
  const source=plan.sourceManipulation;
  if(!source||!Number.isSafeInteger(shotStartMs)||!Number.isSafeInteger(plan.durationMs)||plan.durationMs<=0||shotStartMs<source.startMs||shotStartMs+plan.durationMs>source.endMs)
    throw new Error('needs-source-action: shot is outside the original owned contact clock');
  if(gesture.contactMs===undefined)throw new Error('needs-source-action: original contact mark is absent');
  const startMs=Math.max(shotStartMs,source.startMs+gesture.startMs),endMs=Math.min(shotStartMs+plan.durationMs,source.startMs+gesture.endMs);
  if(startMs>=endMs)return;
  const contact=source.startMs+gesture.contactMs;
  return {startMs,endMs,...(contact>=startMs&&contact<endMs?{contactMs:contact}:{})};
}
export function validateSourceActionClock(plan:PerformancePlan,actions:readonly Action[],shotStartMs:number):void{
  const selected=actions.filter(a=>a.sourceManipulation),source=plan.sourceManipulation;
  if(!source){if(selected.length)throw new Error('needs-source-action: reference has no original performance contact source');return;}
  if(!Number.isSafeInteger(shotStartMs)||!Number.isSafeInteger(plan.durationMs)||plan.durationMs<=0||shotStartMs<source.startMs||shotStartMs+plan.durationMs>source.endMs)
    throw new Error('needs-source-action: shot is outside the original owned contact clock');
  const expected=source.gestures.flatMap(g=>{const slice=sourceActionSlice(plan,g,shotStartMs);return slice?[{gesture:g,slice}]:[];});
  if(selected.length!==expected.length)throw new Error('needs-source-action: each original contact slice requires exactly one explicit action reference');
  const seen=new Set<string>();
  for(const action of selected){
    const ref=action.sourceManipulation!,entry=expected.find(e=>e.gesture.id===ref.gestureId);
    if(action.type!=='operate-model'||!action.hand||!action.target||action.target.anchor==='label'||!action.narrationAnchor||action.secondTarget||
      ref.sourceId!==source.id||!entry||seen.has(ref.gestureId)||rigHand(action)!==rigHand(entry.gesture)||
      action.startMs!==entry.slice.startMs||action.endMs!==entry.slice.endMs||action.contactMs!==entry.slice.contactMs)
      throw new Error('needs-source-action: original source/gesture/hand/clock/contact was changed or restarted at a cut');
    seen.add(ref.gestureId);
    if(actions.some(other=>other!==action&&!other.sourceManipulation&&(!other.hand&&other.type==='idle'||rigHand(other)===rigHand(action))&&other.startMs<action.endMs&&other.endMs>action.startMs))
      throw new Error('needs-source-action: another shot-local action owns the original contact hand');
  }
}
