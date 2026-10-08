import type {HostProfile} from '../host/schemas.js';
import type {PerformancePlan,Point} from './schemas.js';
import {isCurrentAnimation} from './schemas.js';
import {hash} from '../core/utils.js';
import {clothTriangleArea,clothTriangleMatrix,clothAreaInfluence,type ClothTriangle} from './view-cloth-geometry.js';

export const BODY_VIEW_LOCOMOTION_SELECTION='registered-locomotion-v1' as const;
export const BODY_VIEW_CLOTH_VERSION='native-view-cloth-1';
export const VIEW_CLOTH_LAG_MS=90,VIEW_CLOTH_KNEE_WEIGHT=.6;
type View='three-quarter-left'|'three-quarter-right';
export type NativeClothSource={sha256:string;width:number;height:number;bodyScale:number;pelvis:Point;hips:Record<'left'|'right',Point>;clothing:string;inkPad:number;view:View};
/** Authored image-space cages around the registered belt/hem, not inferred
 * anatomical reconstruction or accepted fabric simulation. No bitmap changes. */
export const nativeClothBindings={
  lila:{
    'three-quarter-right':{sha256:'c11b0aeddf06e42d0e8363df9167c87fc4a94262606565a0c1bee55c950e43a9',width:1173,height:1341,left:476,right:760,waist:782,bottom:1020,split:627},
    'three-quarter-left':{sha256:'ef90f6783d89a8e554c12605065a218faf4e0f6aae4411ae00cccf6825b686bf',width:1024,height:1536,left:384,right:680,waist:826,bottom:1110,split:543}},
  karo:{
    'three-quarter-right':{sha256:'eefa90341b6a39138b163c173b3d6072b56c4bed4015bd431345691e8088e182',width:910,height:1729,left:316,right:646,waist:1023,bottom:1290,split:495},
    'three-quarter-left':{sha256:'bfcffe1fac13281de68ca11910407bb22fde02f8f5f5d867054713399166fdf4',width:910,height:1729,left:328,right:661,waist:1052,bottom:1322,split:520}},
} as const;
export const hasBodyViewLocomotion=(profile:Pick<HostProfile,'appearance'>)=>profile.appearance.bodyMotion===BODY_VIEW_LOCOMOTION_SELECTION;
export function registeredNativeCloth(profile:Pick<HostProfile,'appearance'>,source:NativeClothSource){
  const a=profile.appearance;
  if(!hasBodyViewLocomotion(profile)||a.artworkVersion!=='forest-body-view-1'||!a.characterVariant||!a.bodyView||a.sourceColour)throw new Error('needs-view-locomotion: select a registered native actor/view');
  const binding=nativeClothBindings[a.characterVariant][a.bodyView];
  if(source.view!==a.bodyView||source.sha256!==binding.sha256||source.width!==binding.width||source.height!==binding.height)throw new Error('needs-view-cloth: native garment image registration differs');
  return binding;
}
export function validateNativeLocomotion(plan:PerformancePlan,profile:Pick<HostProfile,'appearance'>,source:NativeClothSource){
  registeredNativeCloth(profile,source);
  if(!isCurrentAnimation(plan.compilerVersion))throw new Error('needs-view-locomotion: current animation contract required');
  if(plan.supports?.length||[...(plan.entryPosture?[plan.entryPosture]:[]),...(plan.postures??[])].some(p=>p.pose==='seated'||p.supportId))throw new Error('needs-view-seat: native seated garment/body correspondence is not registered');
  const forward=source.view==='three-quarter-left'?-1:1;
  if(plan.walks.some(w=>(w.toX-w.fromX)*forward<0))throw new Error('needs-view-locomotion: travel must follow the selected native view; backward gait is not registered');
}
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(v:number)=>{const x=clamp(v);return x*x*(3-2*x);};
const fmt=(n:number)=>String(Number(n.toFixed(7)));
const path=(points:readonly Point[])=>points.map((p,i)=>(i?'L':'M')+fmt(p.x)+' '+fmt(p.y)).join('')+'Z';
const apply=(m:readonly number[],p:Point)=>({x:m[0]!*p.x+m[2]!*p.y+m[4]!,y:m[1]!*p.x+m[3]!*p.y+m[5]!});
export function nativeClothTriangles(profile:Pick<HostProfile,'appearance'>,source:NativeClothSource):ClothTriangle[]{
  const c=registeredNativeCloth(profile,source),xs=[c.left,c.split,c.right],ys=[c.waist,c.waist+(c.bottom-c.waist)/3,c.waist+2*(c.bottom-c.waist)/3,c.bottom],result:ClothTriangle[]=[];
  for(let row=0;row<3;row++)for(let col=0;col<2;col++){
    const a={x:xs[col]!,y:ys[row]!},b={x:xs[col+1]!,y:ys[row]!},c={x:xs[col]!,y:ys[row+1]!},d={x:xs[col+1]!,y:ys[row+1]!};result.push([a,b,d],[a,d,c]);
  }return result;
}
/** SVG pieces share source coordinates and mesh vertices. Tiny UV overlap
 * closes internal raster seams; the original per-piece garment mask owns ink. */
export function nativeClothSvg(profile:Pick<HostProfile,'appearance'>,source:NativeClothSource){
  const c=registeredNativeCloth(profile,source),triangles=nativeClothTriangles(profile,source);
  const defs='<defs><clipPath id="view-cloth-upper-clip"><path d="M0 0H'+source.width+'V'+(c.waist+.35)+'H0Z"/></clipPath>'+triangles.map((triangle,i)=>{
    // Offset each edge by a constant native distance. Radial expansion about
    // the centroid barely padded long diagonals and left visible light cracks.
    const normals=triangle.map((p,i)=>{const next=triangle[(i+1)%3]!,dx=next.x-p.x,dy=next.y-p.y,length=Math.hypot(dx,dy);return {x:dy/length,y:-dx/length};});
    const expanded=triangle.map((p,i)=>{const prior=normals[(i+2)%3]!,next=normals[i]!,k=3/(1+prior.x*next.x+prior.y*next.y);return {x:p.x+(prior.x+next.x)*k,y:p.y+(prior.y+next.y)*k};});
    return '<clipPath id="view-cloth-triangle-'+i+'-clip"><path d="'+path(expanded)+'"/></clipPath>';
  }).join('')+'</defs>';
  const artwork='<g clip-path="url(#view-cloth-upper-clip)"><g mask="url(#view-clothing-mask)"><use href="#view-body-source"/></g></g>'+triangles.map((_,i)=>'<g id="view-cloth-triangle-'+i+'"><g clip-path="url(#view-cloth-triangle-'+i+'-clip)"><g mask="url(#view-clothing-mask)"><use href="#view-body-source"/></g></g></g>').join('');
  return {defs,artwork};
}
export function nativeClothState(profile:Pick<HostProfile,'appearance'>,source:NativeClothSource,thighAngles:Record<'left'|'right',number>){
  const c=registeredNativeCloth(profile,source);if(!Object.values(thighAngles).every(Number.isFinite))throw new Error('needs-view-cloth: nonfinite thigh controls');
  const moved=(p:Point)=>{
    const lower=smooth((p.y-c.waist)/(c.bottom-c.waist)),right=smooth((p.x-c.split+45)/90);
    const rotate=(side:'left'|'right')=>{const hip=source.hips[side],angle=clamp(thighAngles[side]*.7,-18,18)*Math.PI/180,dx=p.x-hip.x,dy=p.y-hip.y;return {x:hip.x+dx*Math.cos(angle)-dy*Math.sin(angle),y:hip.y+dx*Math.sin(angle)+dy*Math.cos(angle)};};
    const a=rotate('left'),b=rotate('right'),target={x:a.x+(b.x-a.x)*right,y:a.y+(b.y-a.y)*right};return {x:p.x+(target.x-p.x)*lower,y:p.y+(target.y-p.y)*lower};
  };
  const triangles=nativeClothTriangles(profile,source),wanted=triangles.map(from=>({from,to:from.map(moved) as unknown as ClothTriangle})),influence=clothAreaInfluence(wanted,.25);
  const face:Record<string,{attr:{transform:string}}>={},pieces=wanted.map(({from,to},i)=>{
    const target=from.map((p,j)=>({x:p.x+(to[j]!.x-p.x)*influence,y:p.y+(to[j]!.y-p.y)*influence})) as unknown as ClothTriangle,matrix=clothTriangleMatrix(from,target),areaRatio=clothTriangleArea(target)/clothTriangleArea(from);
    if(areaRatio<.25-1e-9)throw new Error('needs-view-cloth: garment mesh lost positive area');
    face['view-cloth-triangle-'+i]={attr:{transform:'matrix('+matrix.map(fmt).join(' ')+')'}};return {from,target,areaRatio};
  });return {face,pieces,influence};
}
/** Baked interpolation must reproduce texture vertices, not merely compare
 * tiny affine coefficient errors at a large native-image coordinate. */
export function nativeClothMatrixError(profile:Pick<HostProfile,'appearance'>,source:NativeClothSource,a:Record<string,unknown>,b:Record<string,unknown>,actual:Record<string,unknown>,progress:number){
  const values=(item:unknown)=>{const value=(item as {attr?:{transform?:string}}|undefined)?.attr?.transform;return value?.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)?.map(Number);};let error=0;
  for(const [i,triangle] of nativeClothTriangles(profile,source).entries()){
    const id='view-cloth-triangle-'+i,from=values(a[id]),to=values(b[id]),wanted=values(actual[id]);if(!from||!to||!wanted)throw new Error('needs-view-cloth: missing baked garment transform');
    const mixed=from.map((v,j)=>v+(to[j]!-v)*progress);for(const p of triangle){const x=apply(mixed,p),y=apply(wanted,p);error=Math.max(error,Math.hypot(x.x-y.x,x.y-y.y));}
  }return error;
}
export const nativeClothDescription={version:BODY_VIEW_CLOTH_VERSION,selection:BODY_VIEW_LOCOMOTION_SELECTION,
  fingerprint:hash({version:BODY_VIEW_CLOTH_VERSION,bindings:nativeClothBindings,mesh:[2,3],lagMs:VIEW_CLOTH_LAG_MS,kneeWeight:VIEW_CLOTH_KNEE_WEIGHT,follow:.7,maxAngle:18,minimumArea:.25,uvOverlap:{edgeNormal:3}}),
  bindings:nativeClothBindings,triangles:12,belt:'pinned complete row; upper material remains native',follow:'90ms absolute thigh follow, 0.7 gain, 18deg bound; shared lower cage and positive-area governor',
  limbs:'existing fixed XYZ chains, source mitten/sole artwork, joined soft ink, source walk/run/airborne schedules; inferred anatomy',
  supported:['forward walk','forward run','jump','stand/crouch/lean','point/think/react'],
  limitations:['unapproved art/pose/skin/ink/mesh seam quality','fixed native view; no continuous body/head turns','no native seating or new grasp/carry/tool registration','moving camera cuts require explicit identical complete sourceBody on every continuous actor slice; ordinary local clips cannot cross','hair/beard rigid by default; explicit registered-secondary-v1 is an unapproved separate native candidate','not a fabric simulator or anatomy/motion acceptance'],
  approved:false,productionReady:false,physicalSimulation:false};
