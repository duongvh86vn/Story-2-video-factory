import type {ShotHost} from '../host/schemas.js';
import type {PerformancePlan,Gesture} from '../animation/schemas.js';
import {rigHand} from '../core/identifiers.js';
import {validateSourceActionClock} from './source-action-clock.js';

type Action=ShotHost['actions'][number];
export interface CinematicActionGroup {action:Action;gestures:Gesture[];sourceManipulation?:{
  sourceId:string;gestureId:string;offsetMs:number;startMs:number;endMs:number;contactMs:number;releaseMs?:number;landingMs?:number;
};}
/** Resolve cue continuations per arm. Interleaved other-hand actions do not break a hold. */
export function cinematicActionGroups(actions:Action[],plan:PerformancePlan,shotStartMs:number):CinematicActionGroup[]{
  validateSourceActionClock(plan,actions,shotStartMs);
  const original:CinematicActionGroup[]=actions.filter(a=>a.sourceManipulation).map(action=>{
    const source=plan.sourceManipulation!,g=source.gestures.find(g=>g.id===action.sourceManipulation!.gestureId)!;
    // This is the actual original gesture, never a clipped/re-contacted copy.
    return {action,gestures:[g],sourceManipulation:{sourceId:source.id,gestureId:g.id,offsetMs:source.startMs,
      startMs:source.startMs+g.startMs,endMs:source.startMs+g.endMs,contactMs:source.startMs+g.contactMs!,
      ...(g.releaseMs===undefined?{}:{releaseMs:source.startMs+g.releaseMs}),...(g.landingMs===undefined?{}:{landingMs:source.startMs+g.landingMs})}};
  });
  const runs:Action[]=actions.filter(a=>a.type==='idle'&&!a.hand).map(a=>({...a}));
  for(const hand of ['right','left'] as const){
    const channel=actions.filter(a=>!a.sourceManipulation&&(a.type==='idle'?a.hand===hand:rigHand(a)===hand)).sort((a,b)=>a.startMs-b.startMs);
    for(let i=0;i<channel.length;i++){
      const action=channel[i]!,run={...action};
      const spanning=action.type!=='idle'&&action.contactMs===undefined&&action.type!=='operate-model'&&action.type!=='compare'
        ?plan.gestures.find(g=>rigHand(g)===hand&&g.startMs===action.startMs-shotStartMs&&g.endMs>action.endMs-shotStartMs):undefined;
      if(spanning){
        let j=i;
        while(j+1<channel.length&&run.endMs<spanning.endMs+shotStartMs){
          const next=channel[j+1]!;
          if(next.startMs!==run.endMs||next.contactMs!==undefined||next.type!==action.type||JSON.stringify(next.target)!==JSON.stringify(action.target)||JSON.stringify(next.secondTarget)!==JSON.stringify(action.secondTarget))break;
          run.endMs=next.endMs;j++;
        }
        if(run.endMs===spanning.endMs+shotStartMs)i=j;
        else run.endMs=action.endMs;
      }
      runs.push(run);
    }
  }
  return [...original,...runs.map(action=>({action,gestures:action.type==='idle'?[]:plan.gestures.filter(g=>rigHand(g)===rigHand(action)&&g.startMs>=action.startMs-shotStartMs&&g.endMs<=action.endMs-shotStartMs).sort((a,b)=>a.startMs-b.startMs)}))].sort((a,b)=>a.action.startMs-b.action.startMs);
}
