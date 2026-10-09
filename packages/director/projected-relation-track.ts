import {svgLinearNumber} from '../animation/svg-transform-track.js';
import {hash} from '../core/utils.js';

export const PROJECTED_RELATION_TRACK_VERSION='projected-relation-track-1';
export type RelationPoint={x:number;y:number};
export interface RelationCurve {start:RelationPoint;control:RelationPoint;end:RelationPoint;arrow:[RelationPoint,RelationPoint,RelationPoint];}
export interface ProjectedRelationFrame {timeMs:number;curve:RelationCurve;}
export interface ProjectedRelationTrack {
  version:typeof PROJECTED_RELATION_TRACK_VERSION;frames:ProjectedRelationFrame[];gapLimitPx:0.2;maxMeasuredGapPx:number;fingerprint:string;
  continuousGeometryVerified:false;motionVerified:false;productionApproval:false;
}
const fail=(message:string):never=>{throw new Error(`needs-source-prop-binding: projected relation ${message}`);};
const vertices=(c:RelationCurve)=>[c.start,c.control,c.end,...c.arrow];
function copyPoint(p:RelationPoint):RelationPoint{
  if(!p||![p.x,p.y].every(Number.isFinite))return fail('requires finite actual vertices');return {x:p.x,y:p.y};
}
function copyCurve(c:RelationCurve):RelationCurve{
  if(!c||!Array.isArray(c.arrow)||c.arrow.length!==3||![0,1,2].every(i=>Object.hasOwn(c.arrow,i)))return fail('requires three explicit arrow vertices');
  return {start:copyPoint(c.start),control:copyPoint(c.control),end:copyPoint(c.end),arrow:c.arrow.map(copyPoint) as RelationCurve['arrow']};
}
function clock(times:readonly number[]):void{
  if(!Array.isArray(times)||times.length<2||times.length>12000||times[0]!==0||!(times.at(-1)!>0))return fail('requires a complete positive camera clock, at most 12000 retained frames');
  let previous=-Infinity;
  for(let i=0;i<times.length;i++){const t=times[i]!;if(!Object.hasOwn(times,i)||!Number.isFinite(t)||t<=previous)return fail('requires a dense increasing finite clock');previous=t;}
}
function mixCurve(a:RelationCurve,b:RelationCurve,t:number):RelationCurve{
  const mix=(p:RelationPoint,q:RelationPoint)=>({x:svgLinearNumber(p.x,q.x,t),y:svgLinearNumber(p.y,q.y,t)});
  return {start:mix(a.start,b.start),control:mix(a.control,b.control),end:mix(a.end,b.end),arrow:a.arrow.map((p,i)=>mix(p,b.arrow[i]!)) as RelationCurve['arrow']};
}
/** Finite probes constrain serialized AttrPlugin path interpolation. They do
 * not certify the unsampled continuum, contours, occlusion or browser output. */
export function buildProjectedRelationTrack(initialTimes:readonly number[],sample:(timeMs:number)=>RelationCurve):ProjectedRelationTrack{
  const times=[...initialTimes];clock(initialTimes);clock(times);
  const cache=new Map<number,RelationCurve>();
  const get=(timeMs:number)=>{let c=cache.get(timeMs);if(!c){c=copyCurve(sample(timeMs));cache.set(timeMs,c);}return c;};
  const frames:ProjectedRelationFrame[]=[{timeMs:0,curve:get(0)}];let retained=times.length,maxMeasuredGapPx=0;
  const refine=(start:number,end:number,depth:number):void=>{
    const a=get(start),b=get(end);let gap=0;
    for(const t of [.17,.5,.83]){
      const actual=vertices(get(start+(end-start)*t)),emitted=vertices(mixCurve(a,b,t));
      gap=Math.max(gap,...actual.map((p,i)=>Math.hypot(p.x-emitted[i]!.x,p.y-emitted[i]!.y)));
    }
    if(!Number.isFinite(gap))return fail('has a nonfinite measured gap');
    if(gap>.2){
      const mid=(start+end)/2;
      if(depth>=12||++retained>12000||mid<=start||mid>=end)return fail('cannot meet .2px finite-probe limit within depth12/12000 retained frames');
      refine(start,mid,depth+1);refine(mid,end,depth+1);return;
    }
    maxMeasuredGapPx=Math.max(maxMeasuredGapPx,gap);frames.push({timeMs:end,curve:b});
  };
  for(let i=1;i<times.length;i++)refine(times[i-1]!,times[i]!,0);
  const data={version:PROJECTED_RELATION_TRACK_VERSION as typeof PROJECTED_RELATION_TRACK_VERSION,frames,gapLimitPx:.2 as const,maxMeasuredGapPx};
  return {...data,fingerprint:hash(data),continuousGeometryVerified:false,motionVerified:false,productionApproval:false};
}
/** Own validated immutable snapshot; no full-track scan on each seek. */
export function createProjectedRelationSampler(track:ProjectedRelationTrack){
  if(track.version!==PROJECTED_RELATION_TRACK_VERSION||track.gapLimitPx!==.2||!Number.isFinite(track.maxMeasuredGapPx)||track.maxMeasuredGapPx<0||track.maxMeasuredGapPx>.2||track.continuousGeometryVerified!==false||track.motionVerified!==false||track.productionApproval!==false)return fail('requires current candidate metadata without approval');
  clock(track.frames.map(f=>f.timeMs));
  const frames=track.frames.map(f=>({timeMs:f.timeMs,curve:copyCurve(f.curve)}));
  if(hash({version:track.version,frames,gapLimitPx:track.gapLimitPx,maxMeasuredGapPx:track.maxMeasuredGapPx})!==track.fingerprint)return fail('snapshot differs from retained track data');
  return {times:frames.map(f=>f.timeMs),at:(timeMs:number):RelationCurve=>{
    if(!Number.isFinite(timeMs)||timeMs<0||timeMs>frames.at(-1)!.timeMs)return fail('cannot clamp or infer an absent emitted clock');
    let lo=0,hi=frames.length-1;
    while(lo<hi){const mid=Math.floor((lo+hi)/2);if(frames[mid]!.timeMs<timeMs)lo=mid+1;else hi=mid;}
    const b=frames[lo]!,a=frames[Math.max(0,lo-1)]!,t=a.timeMs===b.timeMs?0:(timeMs-a.timeMs)/(b.timeMs-a.timeMs);
    return mixCurve(a.curve,b.curve,t);
  },fingerprint:track.fingerprint,continuousGeometryVerified:false as const,motionVerified:false as const,productionApproval:false as const};
}
export function projectedCurvePoint(curve:RelationCurve,progress:number):RelationPoint{
  if(!Number.isFinite(progress)||progress<0||progress>1)return fail('flow progress cannot be clamped');
  const {start:a,control:b,end:c}=copyCurve(curve),s=1-progress;
  return {x:s*s*a.x+2*s*progress*b.x+progress*progress*c.x,y:s*s*a.y+2*s*progress*b.y+progress*progress*c.y};
}
