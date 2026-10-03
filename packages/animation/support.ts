import type {HostProfile} from '../host/schemas.js';
import {rigMetrics} from './rig.js';
import type {PerformancePlan,Point,PostureTarget,SeatSupport} from './schemas.js';

const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
const mix=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export function seatFor(plan:PerformancePlan,target:PostureTarget):SeatSupport {
  const seat=plan.supports?.find(s=>s.id===target.supportId);
  if(!seat)throw new Error(`${plan.id}: seated posture requires a known seat support`);
  return seat;
}
/** Geometry equality is independent of JSON key order and an omitted zero backrest. */
export function sameSeatSupport(a:SeatSupport|undefined,b:SeatSupport|undefined):boolean {
  return !!a&&!!b&&a.id===b.id&&a.kind===b.kind&&a.center.x===b.center.x&&a.center.y===b.center.y&&
    a.width===b.width&&a.facing===b.facing&&(a.backHeight??0)===(b.backHeight??0);
}
export function seatWeightsAt(plan:PerformancePlan,timeMs:number):Record<string,number>{
  const weights=(pose:PostureTarget)=>pose.pose==='seated'?{[seatFor(plan,pose).id]:1}:{};
  let value:Record<string,number>=weights(plan.entryPosture??{pose:'stand'});
  for(const clip of [...(plan.postures??[])].sort((a,b)=>a.startMs-b.startMs)){
    if(timeMs<clip.startMs)break;
    const next=weights(clip),weight=smooth((timeMs-clip.startMs)/(clip.endMs-clip.startMs));
    value=Object.fromEntries([...new Set([...Object.keys(value),...Object.keys(next)])].map(id=>[id,(value[id]??0)*(1-weight)+(next[id]??0)*weight]).filter(([,n])=>Number(n)>0));
  }
  return value;
}
/** Planted feet, fixed bones and a straight-leg waypoint when the knee pole changes. */
export function seatedPlacement(plan:PerformancePlan,profile:HostProfile,timeMs:number,root:Point):{pelvis:Point;bend:number}{
  const m=rigMetrics(profile),s=plan.scale;
  const target=(pose:PostureTarget)=>{
    if(pose.pose==='seated'){const seat=seatFor(plan,pose);return {pelvis:{...seat.center},bend:seat.facing==='left'?-1:1};}
    const drop=(pose.pose==='crouch'?.42:pose.pose==='lean'?.04:0)*(pose.intensity??1);
    return {pelvis:{x:root.x,y:root.y+m.pelvisY*s+Math.abs(m.pelvisY)*drop*s},bend:1};
  };
  // After a walk, gait establishes the same balanced stance around root.
  const legLength=(m.upperLeg+m.lowerLeg)*s-1e-6,dx=(m.stance-m.hipOffset)*s;
  const straight={x:root.x,y:root.y-Math.sqrt(legLength*legLength-dx*dx)};
  let value=target(plan.entryPosture??{pose:'stand'});
  for(const clip of [...(plan.postures??[])].sort((a,b)=>a.startMs-b.startMs)){
    if(timeMs<clip.startMs)break;
    const next=target(clip),progress=Math.max(0,Math.min(1,(timeMs-clip.startMs)/(clip.endMs-clip.startMs)));
    if(progress===1){value=next;continue;}
    if(value.bend!==next.bend)return progress<.5
      ?{pelvis:mix(value.pelvis,straight,smooth(progress*2)),bend:value.bend}
      :{pelvis:mix(straight,next.pelvis,smooth(progress*2-1)),bend:next.bend};
    return {pelvis:mix(value.pelvis,next.pelvis,smooth(progress)),bend:value.bend};
  }
  return value;
}
/** Reserve the seat throughout approach/sit and stand recovery, not only contact. */
export function seatOccupancy(plan:PerformancePlan):Array<{supportId:string;startMs:number;endMs:number}>{
  const intervals:Array<{supportId:string;startMs:number;endMs:number}>=[];
  let active=plan.entryPosture?.pose==='seated'?{supportId:seatFor(plan,plan.entryPosture).id,startMs:0}:undefined;
  for(const clip of [...(plan.postures??[])].sort((a,b)=>a.startMs-b.startMs)){
    if(clip.pose==='seated'){
      const supportId=seatFor(plan,clip).id;
      if(active&&active.supportId!==supportId)throw new Error('Stand up before changing seat supports');
      active??={supportId,startMs:clip.startMs};
    }else if(active){intervals.push({...active,endMs:clip.endMs});active=undefined;}
  }
  if(active)intervals.push({...active,endMs:plan.durationMs});
  return intervals;
}
