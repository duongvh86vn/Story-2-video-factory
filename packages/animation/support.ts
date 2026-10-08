import type {HostProfile} from '../host/schemas.js';
import {rigMetrics} from './rig.js';
import {usesReferenceBody} from './forest-body-art.js';
import {sourceSwing} from './source-walk.js';
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
type Feet=Record<'left'|'right',Point>;
// Shared boundaries for foot preparation, hip transfer and stand recovery.
// These are original track times, projected to the shot only by the caller.
export function supportMotionTimes(plan:PerformancePlan):number[]{
  let previous=plan.entryPosture?.pose??'stand';const times:number[]=[];
  for(const clip of [...(plan.postures??[])].sort((a,b)=>a.startMs-b.startMs)){
    if((previous==='seated')!==(clip.pose==='seated'))for(const phase of [0,.04,.21,.38,.62,.75,.81,1])times.push(clip.startMs+(clip.endMs-clip.startMs)*phase);
    previous=clip.pose;
  }return times;
}
/** Source actors take two small planted-to-planted steps before sitting, and
 * widen their stance after rising. Both asynchronous feet and the pelvis are
 * evaluated from absolute time. A single knee pole is retained for the whole
 * source plan; asymmetric chains cannot share the old straight-leg waypoint. */
export function sourceSupportMotion(plan:PerformancePlan,profile:HostProfile,timeMs:number,root:Point,groundFeet:Feet){
  if(!usesReferenceBody(profile))throw new Error('Source support motion requires the source body rig.');
  const m=rigMetrics(profile),s=plan.scale,bend=plan.facing==='left'?-1:1;
  const contactOffset={x:-bend*(m.seatContactOffset?.x??0)*s,y:(m.seatContactOffset?.y??0)*s};
  const target=(pose:PostureTarget)=>{
    if(pose.pose==='seated'){
      const seat=seatFor(plan,pose);
      return {pose:pose.pose,pelvis:{x:seat.center.x-contactOffset.x,y:seat.center.y-contactOffset.y},feet:{
        left:{x:root.x+m.hips!.left.x*s,y:root.y},right:{x:root.x+m.hips!.right.x*s,y:root.y}}};
    }
    const drop=(pose.pose==='crouch'?.42:pose.pose==='lean'?.04:0)*(pose.intensity??1);
    return {pose:pose.pose,pelvis:{x:root.x,y:root.y+m.pelvisY*s+Math.abs(m.pelvisY)*drop*s},feet:groundFeet};
  };
  let value=target(plan.entryPosture??{pose:'stand'});
  for(const clip of [...(plan.postures??[])].sort((a,b)=>a.startMs-b.startMs)){
    if(timeMs<clip.startMs)break;
    const next=target(clip),p=Math.max(0,Math.min(1,(timeMs-clip.startMs)/(clip.endMs-clip.startMs)));
    if(p===1){value=next;continue;}
    const entering=value.pose!=='seated'&&next.pose==='seated',leaving=value.pose==='seated'&&next.pose!=='seated';
    const bodyProgress=entering?smooth((p-.38)/.62):leaving?smooth(p/.62):smooth(p);
    const step=(side:'left'|'right')=>{
      if(!entering&&!leaving)return {point:mix(value.feet[side],next.feet[side],smooth(p)),planted:true};
      const start=entering?(side==='left'?.04:.21):(side==='left'?.62:.81),end=entering?(side==='left'?.21:.38):(side==='left'?.81:1);
      const phase=Math.max(0,Math.min(1,(p-start)/(end-start)));
      const sampled=sourceSwing(value.feet[side],next.feet[side].x,root.y,phase,m.legs![side].upper,s);
      return {point:sampled.point,planted:sampled.planted};
    };
    const left=step('left'),right=step('right');
    // Anticipation bends toward the planted feet; it settles to the held pose.
    const leanOffset=(entering?Math.sin(Math.PI*Math.max(0,Math.min(1,p/.75))):leaving?Math.sin(Math.PI*Math.max(0,Math.min(1,p/.62))):0)*bend*7;
    return {pelvis:mix(value.pelvis,next.pelvis,bodyProgress),bend,feet:{left:left.point,right:right.point},
      stance:{left:left.planted,right:right.planted},ownsFeet:entering||leaving||value.pose==='seated',leanOffset,
      supportWeight:(value.pose==='seated'?1:0)*(1-bodyProgress)+(next.pose==='seated'?1:0)*bodyProgress,contactOffset};
  }
  return {pelvis:value.pelvis,bend,feet:value.feet,stance:{left:true,right:true},ownsFeet:value.pose==='seated',leanOffset:0,
    supportWeight:value.pose==='seated'?1:0,contactOffset};
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
