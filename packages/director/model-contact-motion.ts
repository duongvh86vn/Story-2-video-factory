import type {Shot} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {ModelContactFrameSchema,MODEL_CONTACT_FRAME_VERSION} from './model-contact-reference.js';
import {SourceWorldSchema} from './source-world-schemas.js';
import {projectSourceWorldEvents} from './source-world-projection.js';
import {sampleSourceWorldPhase} from './source-world-phase.js';
import {validateSourceGripWorld} from './source-grip-world.js';
import {boundProp} from './prop-owner.js';
import {svgLinearNumber} from '../animation/svg-transform-track.js';

export type ContactMatrix=[number,number,number,number,number,number];
type Point={x:number;y:number};
export interface ContactMotionFrame {timeMs:number;matrix:ContactMatrix;opacity:number;}
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: projected model contact ${message}`);};
const number=(value:number)=>{if(!Number.isFinite(value))throw new Error('Nonfinite projected contact matrix');return Number(value.toFixed(4));};
export function contactMatrixPoint(matrix:ContactMatrix,p:Point):Point{
  if(matrix.length!==6||![...matrix,p.x,p.y].every(Number.isFinite))throw new Error('Invalid projected contact point/matrix');
  return {x:matrix[0]*p.x+matrix[2]*p.y+matrix[4],y:matrix[1]*p.x+matrix[3]*p.y+matrix[5]};
}
export const contactMatrixAttribute=(matrix:ContactMatrix)=>{contactMatrixPoint(matrix,{x:0,y:0});return `matrix(${matrix.join(' ')})`;};
function validateFrames(frames:readonly ContactMotionFrame[]):void{
  if(!frames.length)throw new Error('Contact track requires its actual frames');
  let prior=-Infinity;
  for(const f of frames){if(!Number.isFinite(f.timeMs)||f.timeMs<=prior||!Number.isFinite(f.opacity)||f.opacity<0||f.opacity>1)throw new Error('Invalid emitted contact frame clock/opacity');contactMatrixPoint(f.matrix,{x:0,y:0});prior=f.timeMs;}
}
function interpolate(frames:readonly ContactMotionFrame[],timeMs:number,serialized=true):ContactMotionFrame{
  if(!Number.isFinite(timeMs)||timeMs<frames[0]!.timeMs||timeMs>frames.at(-1)!.timeMs)throw new Error('Contact query cannot clamp or infer a missing emitted clock');
  let lo=0,hi=frames.length-1;
  while(lo<hi){const mid=Math.floor((lo+hi)/2);if(frames[mid]!.timeMs<timeMs)lo=mid+1;else hi=mid;}
  const right=frames[lo]!,left=frames[Math.max(0,lo-1)]!,mix=right.timeMs===left.timeMs?0:(timeMs-left.timeMs)/(right.timeMs-left.timeMs);
  return {timeMs,matrix:left.matrix.map((n,i)=>serialized?svgLinearNumber(n,right.matrix[i]!,mix):n+(right.matrix[i]!-n)*mix) as ContactMatrix,opacity:left.opacity+(right.opacity-left.opacity)*mix};
}
export function contactMotionAt(frames:readonly ContactMotionFrame[],timeMs:number):ContactMotionFrame{
  validateFrames(frames);return interpolate(frames,timeMs);
}
/** Validate once and privately snapshot the exact emitted matrix clock. Queries
 * remain binary, return fresh values and never clamp or evaluate a new phase. */
export function createContactMotionSampler(frames:readonly ContactMotionFrame[]){
  validateFrames(frames);
  const copy:ContactMotionFrame[]=[];
  for(let i=0;i<frames.length;i++){
    if(!Object.hasOwn(frames,i))throw new Error('Contact track must be dense');
    const f=frames[i]!;copy.push({timeMs:f.timeMs,matrix:[...f.matrix] as ContactMatrix,opacity:f.opacity});
  }
  return {times:copy.map(f=>f.timeMs),at:(timeMs:number)=>interpolate(copy,timeMs),
    fingerprint:hash(copy),continuousGeometryVerified:false as const,motionVerified:false as const,productionApproval:false as const};
}
function descriptor(shot:Shot,partId:string,width?:number,height?:number){
  const c=shot.cinematic,parts=shot.visualization?.parts.filter(p=>p.id===partId)??[],models=c?.artDirection?.models.filter(m=>m.partId===partId)??[];
  if(!c||parts.length!==1||models.length!==1||!models[0]!.contactFrame)return fail(shot,'requires one actual sourced model/part and its explicit own frame');
  const part=parts[0]!,art=models[0]!,frame=ModelContactFrameSchema.parse(art.contactFrame),w=width??part.width*c.performance.stage.width,h=height??part.height*c.performance.stage.height;
  if(![w,h].every(Number.isFinite)||w<=0||h<=0||art.motionOrigin)return fail(shot,'has invalid projected dimensions or two motion pivots');
  const world=c.sourceWorld;
  if(world){SourceWorldSchema.parse(world);if(![world.startMs,world.endMs].every(Number.isSafeInteger)||hash(shot.visualization!.events)!==hash(projectSourceWorldEvents(world,shot.startMs,shot.endMs)))return fail(shot,'world clock/events differ from exact original projections');}
  else if(shot.visualization!.events.some(e=>e.targetId===partId||e.type==='flow'&&e.relationTo===partId))return fail(shot,'effects/visibility require their complete original world clock');
  const canonical=c.sourceOwnership?.find(s=>s.partId===partId),binding=c.propBindings.find(b=>b.partId===partId);
  const source=canonical??(binding?(()=>{const p=boundProp(shot,binding).performance;return p.sourceSpear??p.sourceManipulation;})():undefined);
  if(canonical||binding){
    if(!source)return fail(shot,'owned artwork needs its complete original physical source');
    validateSourceGripWorld(shot,part,source.startMs,source.endMs,source);
  }
  return {c,part,art,frame,w,h,world};
}
/** Canonical original grid plus exact event breakpoints. Only this camera's
 * bracketing neighborhood is allocated; a long original story is not capped. */
function canonicalTimes(shot:Shot,start:number,end:number){
  const world=shot.cinematic!.sourceWorld!,fps=shot.cinematic!.performance.fps,step=1000/fps;
  if(!Number.isFinite(fps)||fps<=0||fps>120||start<world.startMs||end>world.endMs||end<start)return fail(shot,'invalid original grid query');
  const times=new Set<number>([world.startMs,world.endMs]);
  for(const e of world.events){const span=e.endMs-e.startMs;
    for(const t of [e.startMs,e.endMs,e.startMs+span/2,e.startMs+span*.55,e.startMs+span*.775,e.startMs+Math.min(280,span),e.startMs+120])if(t>=world.startMs&&t<=world.endMs)times.add(t);
  }
  const first=Math.max(0,Math.floor((start-world.startMs)/step)-1),last=Math.ceil((end-world.startMs)/step)+1;
  for(let i=first;i<=last;i++){const at=world.startMs+i*step;if(at<=world.endMs)times.add(at);}
  return [...times].sort((a,b)=>a-b);
}
function originalFrames(shot:Shot,partId:string,start:number,end:number,width?:number,height?:number){
  const d=descriptor(shot,partId,width,height),pivot={x:(d.frame.pivot.x-.5)*d.w,y:(d.frame.pivot.y-.5)*d.h};
  const at=(timeMs:number):ContactMotionFrame=>{
    const phase=d.world?sampleSourceWorldPhase(d.world,shot.visualization!.parts,d.c.performance.stage.width,timeMs).models[partId]!:{rotation:0,x:0,opacity:1};
    const a=phase.rotation*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a);
    // This exact serialized matrix is consumed by AttrPlugin, outside the
    // projected SVG. No SVG CSS origin, nested .motion or aspect guess.
    return {timeMs,matrix:[number(cos),number(sin),number(-sin),number(cos),number(phase.x+pivot.x-cos*pivot.x+sin*pivot.y),number(pivot.y-sin*pivot.x-cos*pivot.y)],opacity:phase.opacity};
  };
  return {d,frames:(d.world?canonicalTimes(shot,start,end):[shot.startMs,shot.endMs]).map(at)};
}
export function modelContactSlice(shot:Shot,partId:string,width?:number,height?:number){
  const {d,frames}=originalFrames(shot,partId,shot.startMs,shot.endMs,width,height);
  validateFrames(frames);
  const times=[shot.startMs,...frames.map(f=>f.timeMs).filter(t=>t>shot.startMs&&t<shot.endMs),shot.endMs];
  const slice=times.map(global=>({...interpolate(frames,global,false),timeMs:global-shot.startMs}));
  return {version:MODEL_CONTACT_FRAME_VERSION,partId,width:d.w,height:d.h,sourceWorldId:d.world?.id??null,
    fingerprint:hash({part:d.part,art:d.art,stage:d.c.performance.stage,fps:d.c.performance.fps,world:d.world??null,startMs:shot.startMs,endMs:shot.endMs,width:d.w,height:d.h}),frames:slice};
}
/** Same matrix and piecewise-linear numbers as the actual emitted timeline.
 * Original-grid entry is interpolated, never resampled at a new camera clock. */
export function modelContactPoint(shot:Shot,partId:string,anchor:'center'|'handle'|'label',globalMs:number,width?:number,height?:number){
  const slice=modelContactSlice(shot,partId,width,height),d=descriptor(shot,partId,width,height),point=anchor==='label'?undefined:d.frame.anchors[anchor];
  if(!point)return fail(shot,'requires the own authored center/handle, never label or a guessed handle');
  const state=contactMotionAt(slice.frames,globalMs-shot.startMs),local=contactMatrixPoint(state.matrix,{x:(point.x-.5)*d.w,y:(point.y-.5)*d.h});
  return {point:local,matrix:state.matrix,opacity:state.opacity,visible:d.world?sampleSourceWorldPhase(d.world,shot.visualization!.parts,d.c.performance.stage.width,globalMs).models[partId]!.visible:1,fingerprint:slice.fingerprint};
}
export function modelContactWorldPoint(shot:Shot,partId:string,anchor:'center'|'handle'|'label',globalMs:number){
  const d=descriptor(shot,partId),at=modelContactPoint(shot,partId,anchor,globalMs);
  if(d.c.propBindings.some(b=>b.partId===partId)||d.c.sourceOwnership?.some(s=>s.partId===partId))return fail(shot,'fixed world query cannot substitute for an actual physical owner/bake');
  if(at.visible!==1||at.opacity<=0)return fail(shot,'own anchor is hidden at the actual contact');
  return {x:d.part.x*d.c.performance.stage.width+at.point.x,y:d.part.y*d.c.performance.stage.height+at.point.y};
}
/** A fixed hand cannot follow a moving anchor. Check the entire held interval
 * on the original camera sequence, including all actual matrix breakpoints. */
export function modelContactHeldAnchor(shots:readonly Shot[],partId:string,anchor:'center'|'handle'|'label',contactMs:number,holdEndMs:number){
  const camera=shots.find(s=>s.startMs<=contactMs&&s.endMs>contactMs);
  if(!camera||!Number.isFinite(holdEndMs)||holdEndMs<=contactMs)throw new Error('needs-source-prop-binding: projected fixed grip has no positive original contact/hold');
  const target=modelContactWorldPoint(camera,partId,anchor,contactMs);let end=contactMs;
  for(const shot of [...shots].filter(s=>s.startMs<holdEndMs&&s.endMs>contactMs).sort((a,b)=>a.startMs-b.startMs)){
    const start=Math.max(contactMs,shot.startMs),stop=Math.min(holdEndMs,shot.endMs);
    if(start!==end)return fail(shot,'fixed hold has missing/overlapping original cameras');end=stop;
    const times=[start,stop,...modelContactSlice(shot,partId).frames.map(f=>shot.startMs+f.timeMs).filter(t=>t>start&&t<stop)];
    for(const time of times){const p=modelContactWorldPoint(shot,partId,anchor,time);if(Math.hypot(p.x-target.x,p.y-target.y)>1e-6)return fail(shot,'fixed hand cannot follow its independently moving projected anchor');}
  }
  if(end!==holdEndMs)return fail(camera,'fixed hold lacks complete original coverage');
  return target;
}
export function modelContactBounds(shot:Shot,partId:string){
  const slice=modelContactSlice(shot,partId),d=descriptor(shot,partId),b=d.frame.bounds;
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(const f of slice.frames)for(const x of [b.left,b.right])for(const y of [b.top,b.bottom]){
    const p=contactMatrixPoint(f.matrix,{x:(x-.5)*d.w,y:(y-.5)*d.h});
    left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);
  }
  const x=d.part.x*d.c.performance.stage.width,y=d.part.y*d.c.performance.stage.height;
  const quantizationPad=.000051*(Math.max(Math.abs((b.left-.5)*d.w),Math.abs((b.right-.5)*d.w))+Math.max(Math.abs((b.top-.5)*d.h),Math.abs((b.bottom-.5)*d.h))+1);
  return {left:x+left-quantizationPad,right:x+right+quantizationPad,top:y+top-quantizationPad,bottom:y+bottom+quantizationPad};
}
export function modelContactTimeline(shot:Shot,partId:string,selector:string,width?:number,height?:number):string[]{
  const {frames}=modelContactSlice(shot,partId,width,height),calls:string[]=[];
  for(const [i,f] of frames.entries()){
    const previous=frames[i-1],vars={attr:{transform:contactMatrixAttribute(f.matrix)},opacity:f.opacity,...(previous?{duration:(f.timeMs-previous.timeMs)/1000,ease:'none'}:{immediateRender:true})};
    calls.push(`tl.${previous?'to':'set'}(${JSON.stringify(selector)},${JSON.stringify(vars)},${(previous?.timeMs??0)/1000});`);
  }return calls;
}
export const modelContactDescription={version:MODEL_CONTACT_FRAME_VERSION,field:'artDirection.models[].contactFrame',
  coordinates:'own measured projected viewport fractions after original SVG/viewBox/aspect policy; explicit pivot/center/optional handle/drawable bounds; no inference or art approval',
  motion:'one whole projected glyph matrix outside the original SVG; original-global fps grid and event breakpoints, serialized coefficients and exact same linear AttrPlugin values for rendering/query/camera; camera entry interpolates the original grid',
  pending:['actual SVG/GSAP seeking, contour/anchor/bounds/depth visibility and film acceptance','integrated source production audit, native art/motion and full factory acceptance'],productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false,productionApproval:false};
