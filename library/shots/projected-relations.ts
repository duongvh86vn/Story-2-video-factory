import type {Shot} from '../../packages/core/schemas.js';
import {escapeHtml,hash} from '../../packages/core/utils.js';
import {projectedModelEdge,type projectedModelGeometry} from '../../packages/director/projected-model-geometry.js';
import {buildProjectedRelationTrack,createProjectedRelationSampler,projectedCurvePoint,type RelationCurve} from '../../packages/director/projected-relation-track.js';

export type ProjectedGeometry=ReturnType<typeof projectedModelGeometry>;
type Relation=NonNullable<Shot['visualization']>['relations'][number];
const path=(g:RelationCurve)=>`M${g.start.x} ${g.start.y}Q${g.control.x} ${g.control.y} ${g.end.x} ${g.end.y}`;
const arrowPath=(g:RelationCurve)=>`M${g.arrow[0].x} ${g.arrow[0].y}L${g.arrow[1].x} ${g.arrow[1].y}L${g.arrow[2].x} ${g.arrow[2].y}Z`;
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: projected relation ${message}`);};
/** Relations attach to each actual projected declared bound. Flow dots query
 * the exact emitted quadratic track, then retain original-global progress.
 * No arbitrary shift of a contact/reaction to a new camera's zero clock. */
export function renderProjectedRelation(shot:Shot,r:Relation,index:number,height:number,geometry:ProjectedGeometry){
  if(!shot.cinematic?.sourceWorld)return fail(shot,'requires the complete original world clock');
  const world=structuredClone(shot.cinematic.sourceWorld),duration=shot.endMs-shot.startMs;
  if(geometry.durationMs!==duration||geometry.shotHash!==hash(shot))return fail(shot,'has a foreign emitted geometry revision/clock');
  const times=[...new Set([...geometry.times(r.from),...geometry.times(r.to)])].sort((a,b)=>a-b),size=height*.014;
  const track=buildProjectedRelationTrack(times,t=>{
    const a=geometry.at(r.from,t),b=geometry.at(r.to,t),start=projectedModelEdge(a,b.center),end=projectedModelEdge(b,a.center);
    const direction={x:b.center.x-a.center.x,y:b.center.y-a.center.y};
    if((end.x-start.x)*direction.x+(end.y-start.y)*direction.y<=0)return fail(shot,'declared endpoint bounds overlap or reverse the directed line');
    const control={x:(start.x+end.x)/2,y:Math.min(start.y,end.y)-height*.055},angle=Math.atan2(end.y-control.y,end.x-control.x),dx=Math.cos(angle),dy=Math.sin(angle);
    return {start,control,end,arrow:[end,{x:end.x-dx*size-dy*size*.45,y:end.y-dy*size+dx*size*.45},{x:end.x-dx*size+dy*size*.45,y:end.y-dy*size-dx*size*.45}]};
  });
  const actual=createProjectedRelationSampler(track),scope=`[data-composition-id="${shot.id}"]`,selector=(id:string)=>JSON.stringify(`${scope} [id=${JSON.stringify(id)}]`),calls:string[]=[],directed=['transfer','cause','sequence'].includes(r.kind);
  for(const [i,f] of track.frames.entries()){
    const prior=track.frames[i-1],t=(prior?.timeMs??0)/1000,base=prior?{duration:(f.timeMs-prior.timeMs)/1000,ease:'none'}:{immediateRender:true};
    calls.push(`tl.${prior?'to':'set'}(${selector(`relation-${index}-curve`)},${JSON.stringify({attr:{d:path(f.curve)},...base})},${t});`);
    if(directed)calls.push(`tl.${prior?'to':'set'}(${selector(`relation-${index}-arrow`)},${JSON.stringify({attr:{d:arrowPath(f.curve)},...base})},${t});`);
  }
  let previousVisible:number|undefined;
  for(const t of times){
    const a=geometry.at(r.from,t),b=geometry.at(r.to,t),visible=a.visible&&b.visible?1:0;
    if(visible!==previousVisible)calls.push(`tl.set(${selector(`link-${index}`)},${JSON.stringify({opacity:visible,...(t===0?{immediateRender:true}:{})})},${t/1000});`);previousVisible=visible;
  }
  // Separate opacity parents reproduce both actual endpoint channels without
  // approximating their product/minimum or tweening a discrete reveal.
  for(const [side,partId] of [['from',r.from],['to',r.to]] as const){
    const clock=geometry.times(partId);
    for(const [i,t] of clock.entries()){
      const previous=clock[i-1],opacity=geometry.at(partId,t).opacity;
      if(!Number.isFinite(opacity)||opacity<0||opacity>1)return fail(shot,'has invalid emitted endpoint opacity');
      calls.push(`tl.${previous===undefined?'set':'to'}(${selector(`relation-${index}-${side}-opacity`)},${JSON.stringify({opacity,...(previous===undefined?{immediateRender:true}:{duration:(t-previous)/1000,ease:'none'})})},${(previous??0)/1000});`);
    }
  }
  calls.push(`tl.set(${selector(`relation-flow-${index}`)},{opacity:0,immediateRender:true},0);`);
  const flows=world.events.filter(e=>e.type==='flow'&&e.targetId===r.from&&e.relationTo===r.to&&['transfer','cause'].includes(r.kind)).sort((a,b)=>a.startMs-b.startMs),flowReports:unknown[]=[];
  for(const e of flows){
    const split=e.startMs+(e.endMs-e.startMs)*.55,start=Math.max(shot.startMs,e.startMs),end=Math.min(shot.endMs,split);
    if(end<=start)continue;
    const begin=start-shot.startMs,stop=end-shot.startMs,clock=[0,...actual.times.filter(t=>t>begin&&t<stop).map(t=>t-begin),stop-begin];
    // A point is lifted to identical vertices solely to reuse the fixed .2px
    // adaptive serialization contract. It is not a source/target contour.
    const flow=buildProjectedRelationTrack(clock,t=>{
      const p=projectedCurvePoint(actual.at(begin+t),(start+t-e.startMs)/(split-e.startMs));return {start:p,control:p,end:p,arrow:[p,p,p]};
    });
    calls.push(`tl.set(${selector(`relation-flow-${index}`)},{opacity:1},${begin/1000});`);
    for(const [i,f] of flow.frames.entries()){
      const prior=flow.frames[i-1],p=f.curve.start;
      calls.push(`tl.${prior?'to':'set'}(${selector(`relation-flow-${index}`)},${JSON.stringify({attr:{transform:`translate(${p.x} ${p.y})`},...(prior?{duration:(f.timeMs-prior.timeMs)/1000,ease:'none'}:{immediateRender:true})})},${(begin+(prior?.timeMs??0))/1000});`);
    }
    if(split<=shot.endMs)calls.push(`tl.set(${selector(`relation-flow-${index}`)},{opacity:0},${stop/1000});`);
    flowReports.push({eventId:e.id,fingerprint:flow.fingerprint,frames:flow.frames.length,maxMeasuredGapPx:flow.maxMeasuredGapPx});
  }
  const first=track.frames[0]!.curve;
  return {html:`<g id="link-${index}" data-relation-kind="${escapeHtml(r.kind)}" data-from="${escapeHtml(r.from)}" data-to="${escapeHtml(r.to)}" data-projected-relation="true" stroke="#765438" stroke-width="${height*.003}" fill="none"><g id="relation-${index}-from-opacity"><g id="relation-${index}-to-opacity"><path id="relation-${index}-curve" d="${path(first)}"${r.kind==='part-of'?' stroke-dasharray="5 4"':''}/>${directed?`<path id="relation-${index}-arrow" d="${arrowPath(first)}" fill="#765438"/>`:''}<circle id="relation-flow-${index}" r="${height*.005}" fill="#D8912C" stroke="none" opacity="0"/></g></g></g>`,calls,
    report:{relationIndex:index,from:r.from,to:r.to,trackVersion:track.version,frames:track.frames.length,maxMeasuredGapPx:track.maxMeasuredGapPx,gapLimitPx:track.gapLimitPx,
      fingerprint:hash({geometry:geometry.fingerprint,track:track.fingerprint,flows:flowReports}),flows:flowReports,scope:'finite-probe-emitted-declared-bound-candidate' as const,continuousGeometryVerified:false as const,motionVerified:false as const,productionApproval:false as const}};
}
