import type {PerformancePlan,Point} from './schemas.js';
import type {RigMetrics} from './rig.js';
import {poseEase} from './source-walk.js';
import {sampleAirborne,type AirborneSample} from './airborne.js';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const RUN_POSES=[{id:'support',phase:0},{id:'compression',phase:.22},{id:'push',phase:.62},{id:'flight',phase:.81},{id:'contact',phase:1}] as const;
export function runStepCount(walk:PerformancePlan['walks'][number],m:RigMetrics,scale:number){
  return Math.max(4,Math.ceil(Math.abs(walk.toX-walk.fromX)/(m.upperLeg*.72*scale)));
}
/** Alternating world-space contact schedules. Unlike an accelerated walk,
 * each support ends before the opposite landing, establishing flight. The
 * last placement settles both feet; it does not invent a final flying frame. */
export function runSchedule(walk:PerformancePlan['walks'][number],m:RigMetrics,scale:number,feet:Record<'left'|'right',Point>,rootAt:(t:number)=>Point){
  const count=runStepCount(walk,m,scale),span=(walk.endMs-walk.startMs)/count;
  const tracks=(['left','right'] as const).map((side,sideIndex)=>{
    const contacts=[{at:walk.startMs,point:feet[side]}];
    for(let i=sideIndex;i<count;i+=2){
      const at=walk.startMs+(i+1)*span,x=(i>=count-2?walk.toX:rootAt(at).x)+(m.footOffsets?.[side]??(side==='left'?-m.stance:m.stance))*scale;
      contacts.push({at,point:{x,y:feet[side].y}});
    }
    if(contacts.at(-1)!.at<walk.endMs)contacts.push({at:walk.endMs,point:{x:walk.toX+(m.footOffsets?.[side]??(side==='left'?-m.stance:m.stance))*scale,y:feet[side].y}});
    return {side,clips:contacts.slice(1).map((next,i)=>({from:contacts[i]!.point,to:next.point,
      start:i===0&&sideIndex===0?walk.startMs:contacts[i]!.at+span*.62,end:next.at}))};
  });
  const hops=Array.from({length:Math.max(0,count-1)},(_,i)=>({startMs:walk.startMs+i*span,takeoffMs:walk.startMs+(i+.62)*span,
    landingMs:walk.startMs+(i+1)*span,endMs:Math.min(walk.endMs,walk.startMs+(i+1.20)*span),height:m.upperLeg*.12}));
  return {tracks,hops,count,span};
}
export function sampleRunning(schedule:ReturnType<typeof runSchedule>,time:number,scale:number,upperLeg:number){
  const feet={} as Record<'left'|'right',Point>,stance={left:true,right:true};
  for(const track of schedule.tracks){
    let point=track.clips[0]!.from;
    for(const clip of track.clips){
      if(time<clip.start)break;
      const p=clamp((time-clip.start)/(clip.end-clip.start)),travel=Math.abs(clip.to.x-clip.from.x);
      const lift=Math.min(upperLeg*.23*scale,travel*.22),arch=64*p*p*p*(1-p)*(1-p)*(1-p);
      point={x:clip.from.x+(clip.to.x-clip.from.x)*poseEase(p),y:clip.from.y-arch*lift};
      stance[track.side]=travel<1e-8||p===0||p===1;
    }
    feet[track.side]=point;
  }
  const samples=schedule.hops.filter(h=>time>=h.startMs&&time<=h.endMs).map(h=>sampleAirborne(h,time,scale));
  const airborne=samples.some(s=>s.airborne);
  const air:AirborneSample={phase:airborne?'flight':samples.some(s=>s.phase==='landing')?'landing':samples.length?'anticipation':'rest',airborne,
    bodyOffsetY:samples.reduce((n,s)=>n+s.bodyOffsetY,0),bodyVelocityY:samples.reduce((n,s)=>n+s.bodyVelocityY,0),
    feetOffsetY:samples.reduce((n,s)=>n+s.feetOffsetY,0),shadowScale:Math.min(1,...samples.map(s=>s.shadowScale))};
  return {feet,stance,air};
}
export const runningDescription={version:'forest-run-contact-2',poses:RUN_POSES,
  flight:'support ends at step phase 0.62 before opposite contact; timed body/sole lift, grounded shadow',
  feet:'alternating fixed world-space support anchors; quintic swing; final two placements settle standing stance',
  arms:'source upper-arm pendulum and continuous forearm flexion, interpolated from each current rest branch using exact lengths; frontal plane, no plan-global run pole or idle foreshortening',
  scope:'candidate front-body horizontal locomotion, not authored profile/rear running or accepted dynamics',productionReady:false};
