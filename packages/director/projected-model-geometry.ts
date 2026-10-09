import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {actorProfile} from '../actors/model.js';
import {emittedTransformTrack,svgLinearNumber,svgTransformPoint} from '../animation/svg-transform-track.js';
import {contactMatrixPoint,createContactMotionSampler,modelContactSlice} from './model-contact-motion.js';
import {sourceActor} from './source-actor.js';
import {boundProp} from './prop-owner.js';
import {validateSourceWorld} from './source-world.js';
import {sampleSourceWorldPhase} from './source-world-phase.js';
import {ownershipScene,type OwnershipScene} from './ownership-scene.js';
import {ownershipBakeSnapshot} from './ownership-bake-query.js';
import type {ActorCompilations} from './source-spear-emitted.js';

export const PROJECTED_MODEL_GEOMETRY_VERSION='projected-model-geometry-1';
export type ProjectedPoint={x:number;y:number};
export interface ProjectedModelShape {center:ProjectedPoint;quad:[ProjectedPoint,ProjectedPoint,ProjectedPoint,ProjectedPoint];visible:boolean;opacity:number;}
const fail=(message:string):never=>{throw new Error(`needs-source-prop-binding: projected model geometry ${message}`);};
const cross=(a:ProjectedPoint,b:ProjectedPoint)=>a.x*b.y-a.y*b.x;
/** Clip against the explicitly declared projected quadrilateral, never a
 * guessed silhouette. The declared center must lie strictly inside it. */
export function projectedModelEdge(shape:ProjectedModelShape,toward:ProjectedPoint):ProjectedPoint{
  const {center,quad}=shape,d={x:toward.x-center.x,y:toward.y-center.y};
  if(![center.x,center.y,d.x,d.y,...quad.flatMap(p=>[p.x,p.y])].every(Number.isFinite)||Math.hypot(d.x,d.y)<1e-9)return fail('has nonfinite or coincident relation centers');
  let orientation=0,first=Infinity;
  for(let i=0;i<4;i++){
    const a=quad[i]!,b=quad[(i+1)%4]!,edge={x:b.x-a.x,y:b.y-a.y},from={x:center.x-a.x,y:center.y-a.y},side=cross(edge,from);
    if(Math.abs(side)<1e-9||orientation&&Math.sign(side)!==orientation)return fail('center is outside or on a degenerate declared bound');orientation=Math.sign(side);
    const q={x:a.x-center.x,y:a.y-center.y},den=cross(d,edge);
    if(Math.abs(den)<1e-12)continue;
    const t=cross(q,edge)/den,u=cross(q,d)/den;
    if(t>=0&&u>=-1e-9&&u<=1+1e-9)first=Math.min(first,t);
  }
  if(!Number.isFinite(first))return fail('ray misses its declared bound');
  return {x:center.x+d.x*first,y:center.y+d.y*first};
}

/** Supplied renderer compilations and canonical bakes are the only physical
 * parents. No compiler, ownership fallback, guessed anchor or camera reset. */
export function projectedModelGeometry(input:Shot,board:Storyboard|undefined,narration:Narration|undefined,compilations:ActorCompilations,ownership?:OwnershipScene){
  if(!board||!narration||board.shots.filter(s=>s.id===input.id).length!==1||hash(board.shots.find(s=>s.id===input.id))!==hash(input))return fail('requires the exact original storyboard/narration');
  validateSourceWorld(input,board,narration);
  const shot=structuredClone(input),c=shot.cinematic,v=shot.visualization;
  if(!c?.actorScene||!v||c.spriteStage)return fail('requires actual rig actor/model layers');
  const duration=shot.endMs-shot.startMs,{width,height}=c.performance.stage;
  if(!Number.isFinite(duration)||duration<=0)return fail('has no positive camera clock');
  const canonical=c.sourceOwnership?.length?(()=>{
    if(!ownership)return fail('requires the supplied exact canonical bake');
    return ownershipScene(input,board,narration,ownership);
  })():undefined;
  const readers=new Map<string,ReturnType<typeof emittedTransformTrack>>();
  const reader=(id:string)=>{
    const old=readers.get(id);if(old)return old;
    const owner=sourceActor(shot,id),compiled=compilations.get(id),keys=c.propBindings.filter(b=>boundProp(shot,b).id===id&&!canonical?.has(b.partId)).map(b=>`prop-${b.propId}`);
    if(!compiled||!keys.length)return fail('has no actual emitted owner channels');
    const r=emittedTransformTrack(owner.performance,actorProfile(owner.character).profileHash,c.actorScene!.primary?.id===id?'':`actor-${id}-`,keys,compiled);
    readers.set(id,r);return r;
  };
  const entries=new Map<string,{times:number[];at:(timeMs:number)=>ProjectedModelShape;identity:unknown}>();
  for(const part of v.parts){
    if(entries.has(part.id))return fail('has duplicate entity IDs');
    const art=c.artDirection?.models.find(m=>m.partId===part.id),item=canonical?.get(part.id),binding=c.propBindings.find(b=>b.partId===part.id),owner=binding&&!item?boundProp(shot,binding):undefined;
    const scale=owner?.performance.scale??1,w=part.width*width/scale,h=part.height*height/scale;
    if(![w,h,scale].every(Number.isFinite)||w<=0||h<=0||scale<=0)return fail('has invalid actual projected dimensions');
    const slice=art?.contactFrame?modelContactSlice(shot,part.id,w,h):undefined,contact=slice?createContactMotionSampler(slice.frames):undefined;
    const emitted=owner?reader(owner.id):undefined,bake=item?ownershipBakeSnapshot(item):undefined;
    const worldTimes=c.sourceWorld?.events.flatMap(e=>[e.startMs,e.endMs,e.startMs+(e.endMs-e.startMs)*.55]).map(t=>t-shot.startMs).filter(t=>t>0&&t<duration)??[];
    const times=[...new Set([0,duration,...worldTimes,...(contact?.times??[]),...(emitted?.times??[]),...(bake?.samples.map(s=>s.timeMs-shot.startMs)??[])])].sort((a,b)=>a-b);
    const parent=(p:ProjectedPoint,t:number):ProjectedPoint=>{
      if(emitted)return emitted.pointAt(`prop-${binding!.propId}`,t,p);
      if(bake){
        const global=shot.startMs+t,s=bake.samples;let lo=0,hi=s.length-1;
        while(lo<hi){const mid=Math.floor((lo+hi)/2);if(s[mid]!.timeMs<global)lo=mid+1;else hi=mid;}
        const b=s[lo]!,a=s[Math.max(0,lo-1)]!,mix=a.timeMs===b.timeMs?0:(global-a.timeMs)/(b.timeMs-a.timeMs);
        return {x:svgLinearNumber(a.center.x,b.center.x,mix)+p.x,y:svgLinearNumber(a.center.y,b.center.y,mix)+p.y};
      }
      return svgTransformPoint({x:part.x*width,y:part.y*height,angle:0,scale:1},p);
    };
    const at=(timeMs:number):ProjectedModelShape=>{
      if(!Number.isFinite(timeMs)||timeMs<0||timeMs>duration)return fail('cannot clamp its emitted camera clock');
      const frame=art?.contactFrame,local=contact?.at(timeMs),b=frame?.bounds??{left:-.03,right:1.03,top:-.03,bottom:1.03};
      const project=(x:number,y:number)=>parent(local?contactMatrixPoint(local.matrix,{x:(x-.5)*w,y:(y-.5)*h}):{x:(x-.5)*w,y:(y-.5)*h},timeMs);
      const center=project(frame?.anchors.center.x??.5,frame?.anchors.center.y??.5),quad=[project(b.left,b.top),project(b.right,b.top),project(b.right,b.bottom),project(b.left,b.bottom)] as ProjectedModelShape['quad'];
      const phase=c.sourceWorld?sampleSourceWorldPhase(c.sourceWorld,v.parts,width,shot.startMs+timeMs).models[part.id]:undefined;
      if(!frame&&phase&&(phase.rotation!==0||phase.x!==0||phase.opacity!==1))return fail('a moving legacy endpoint needs its own explicit whole projected frame');
      return {center,quad,visible:phase?.visible!==0,opacity:local?.opacity??1};
    };
    entries.set(part.id,{times,at,identity:{part,art,slice:slice?.fingerprint,emitted:emitted?.fingerprint,bake}});
  }
  return {version:PROJECTED_MODEL_GEOMETRY_VERSION,shotHash:hash(shot),durationMs:duration,
    times:(partId:string)=>{const e=entries.get(partId);if(!e)return fail('missing own relation entity');return [...e.times];},
    at:(partId:string,timeMs:number)=>{const e=entries.get(partId);if(!e)return fail('missing own relation entity');return e.at(timeMs);},
    fingerprint:hash({shot,board,narration,entries:[...entries].map(([id,e])=>({id,identity:e.identity}))}),
    scope:'supplied-emitted-parent/projected-declared-bound-candidate' as const,continuousGeometryVerified:false as const,motionVerified:false as const,productionApproval:false as const};
}
export const projectedModelGeometryDescription={version:PROJECTED_MODEL_GEOMETRY_VERSION,status:'candidate',
  authority:'exact renderer supplied own-actor emitted transforms and supplied validated canonical bake; own explicit projected frame/declared bounds, fixed stage parent or actual physical parent applied once',
  relations:'explicit projected endpoints use adaptive quadratic/arrow paths and original-world flow progress; separate source/target opacity parents and discrete source reveal visibility; legacy endpoint bounds remain logical rectangles, not inferred artwork contours',
  limits:'finite .2px probes/.17,.5,.83, depth12/12000 retained frames; no continuous/pixel/depth/browser/film acceptance; legacy moving endpoint needs its own explicit projected whole frame',
  pending:['projected label/focus/energy/thermal/shadow following and camera envelope integration','actual fractional/reverse/cut SVG/GSAP seeks, owned/canonical targets and depth/film acceptance','native artwork/acting and full three-input factory acceptance'],
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false,productionApproval:false};
