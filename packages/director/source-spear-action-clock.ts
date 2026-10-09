import type {ShotHost} from '../host/schemas.js';
import type {PerformancePlan,SpearSource} from '../animation/schemas.js';
import {rigHand} from '../core/identifiers.js';

type Action=ShotHost['actions'][number];
type Track=SpearSource['spears'][number];
const fail=(message:string):never=>{throw new Error('needs-source-action: original spear '+message);};
/** Browser-safe exact arithmetic only. No body, rig, renderer or cue inference. */
export function spearActionSlice(plan:PerformancePlan,track:Track,shotStartMs:number){
  const s=plan.sourceSpear;
  if(!s||![s.startMs,s.endMs,shotStartMs,plan.durationMs,shotStartMs+plan.durationMs,track.startMs,track.endMs].every(Number.isSafeInteger)||s.startMs<0||s.endMs<=s.startMs||plan.durationMs<=0||shotStartMs<s.startMs||shotStartMs+plan.durationMs>s.endMs||track.startMs<0||track.endMs<=track.startMs||track.endMs>s.endMs-s.startMs)return fail('shot or track lies outside its complete safe original clock');
  if(track.action==='thrust'){
    const phases=[track.startMs,track.readyMs,track.contactMs,track.recoverMs,track.endMs];
    if(phases.some(t=>t===undefined||!Number.isSafeInteger(t))||phases.some((t,i)=>i>0&&t!<=phases[i-1]!))return fail('thrust has no ordered original ready/contact/recovery clock');
  }else if(track.action!=='hold'||[track.readyMs,track.contactMs,track.recoverMs].some(t=>t!==undefined))return fail('hold cannot invent thrust phases or contact');
  const startMs=Math.max(shotStartMs,s.startMs+track.startMs),endMs=Math.min(shotStartMs+plan.durationMs,s.startMs+track.endMs);
  if(startMs>=endMs)return;
  const contact=track.contactMs===undefined?undefined:s.startMs+track.contactMs;
  return {startMs,endMs,...(contact!==undefined&&contact>=startMs&&contact<endMs?{contactMs:contact}:{})};
}
export function validateSpearActionClock(plan:PerformancePlan,actions:readonly Action[],shotStartMs:number):void{
  const source=plan.sourceSpear,selected=actions.filter(a=>a.sourceSpear||['hold-tool','thrust-tool'].includes(a.type));
  if(!source){if(selected.length)return fail('reference has no original owned performance');return;}
  for(const action of actions)if(![action.startMs,action.endMs].every(Number.isSafeInteger)||action.endMs<=action.startMs||action.startMs<shotStartMs||action.endMs>shotStartMs+plan.durationMs||action.contactMs!==undefined&&(!Number.isSafeInteger(action.contactMs)||action.contactMs<action.startMs||action.contactMs>=action.endMs))return fail('action or companion has an invalid safe half-open slice clock');
  if(new Set(source.spears.map(t=>t.id)).size!==source.spears.length)return fail('track IDs must be unique');
  const expected=source.spears.flatMap(track=>{const slice=spearActionSlice(plan,track,shotStartMs);return slice?[{track,slice}]:[];});
  if(selected.length!==expected.length)return fail('each original track needs exactly one explicit action slice');
  const seen=new Set<string>();
  for(const action of selected){
    const ref=action.sourceSpear,entry=expected.find(e=>e.track.id===ref?.trackId);
    if(!ref||ref.sourceId!==source.id||!entry||seen.has(ref.trackId)||action.type!==(entry.track.action==='hold'?'hold-tool':'thrust-tool')||!action.hand||action.hand!==entry.track.hand||!action.target||action.target.anchor==='label'||!action.narrationAnchor||action.secondTarget||action.sourceManipulation||
      action.startMs!==entry.slice.startMs||action.endMs!==entry.slice.endMs||action.contactMs!==entry.slice.contactMs)return fail('person/track/hand/clock/contact changed or restarted at a cut');
    if(entry.track.action==='hold'&&(action.target.partId!==ref.shaftPartId||action.target.anchor!=='center'))return fail('hold targets a different entity or invents a grip anchor');
    seen.add(ref.trackId);
    const hands=entry.track.twoHand?['left','right']:[entry.track.hand];
    for(const other of actions)if(other!==action&&other.startMs<action.endMs&&other.endMs>action.startMs){
      const otherTrack=other.sourceSpear&&source.spears.find(t=>t.id===other.sourceSpear!.trackId);
      const otherHands=otherTrack?.twoHand?['left','right']:other.type==='idle'&&!other.hand?['left','right']:[rigHand(other)];
      if(otherHands.some(h=>hands.includes(h)))return fail('another action owns a gripping hand during the original track');
    }
  }
}
