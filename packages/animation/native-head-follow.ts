import {z} from 'zod';
import type {NativeHeadPaint} from './native-head-paint.js';
import {clothTriangleArea,clothTriangleMatrix,clothAreaInfluence,type ClothTriangle,type ClothPoint} from './view-cloth-geometry.js';
import {secondaryMotionDescription} from './view-secondary-motion.js';

export const NativeRearMotionSchema=z.object({pin:z.literal('top'),gain:z.number().finite().positive().max(1),maxDisplacement:z.number().finite().positive().max(24)}).strict();
export type NativeRearMotion=z.infer<typeof NativeRearMotionSchema>;
const fmt=(n:number)=>String(Number(n.toFixed(7)));
const path=(ps:readonly ClothPoint[])=>ps.map((p,i)=>(i?'L':'M')+fmt(p.x)+' '+fmt(p.y)).join('')+'Z';
const smooth=(u:number)=>u*u*(3-2*u);
/** Mesh lives in the selected HEAD PNG. No fixed-body hair ROIs, face warp or
 * face-driven arm/gaze feedback. Attachment row and side boundaries are fixed. */
export function nativeRearFollowPieces(paint:NativeHeadPaint,index:number){
  return paint.rear.flatMap((region,slot)=>{
    if(!region.motion)return [];
    const r=region.region,xs=[r.x,r.x+r.width/2,r.x+r.width],ys=Array.from({length:4},(_,i)=>r.y+r.height*i/3),triangles:ClothTriangle[]=[];
    for(let row=0;row<3;row++)for(let col=0;col<2;col++){
      const a={x:xs[col]!,y:ys[row]!},b={x:xs[col+1]!,y:ys[row]!},c={x:xs[col]!,y:ys[row+1]!},d={x:xs[col+1]!,y:ys[row+1]!};triangles.push([a,b,d],[a,d,c]);
    }
    return triangles.map((from,i)=>({id:`native-head-follow-${index}-${slot}-${i}`,region,from}));
  });
}
function expanded(from:ClothTriangle){
  const normals=from.map((p,i)=>{const q=from[(i+1)%3]!,dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);return {x:dy/length,y:-dx/length};});
  return from.map((p,i)=>{const a=normals[(i+2)%3]!,b=normals[i]!,k=2/(1+a.x*b.x+a.y*b.y);return {x:p.x+(a.x+b.x)*k,y:p.y+(a.y+b.y)*k};});
}
/** UV clips expand only shared triangle seams; the original region/crop is
 * applied BEFORE each matrix. Destination tips must not be clipped again. */
export function nativeRearFollowDefs(paint:NativeHeadPaint,index:number){
  return paint.rear.flatMap((r,slot)=>r.motion?[`<clipPath id="native-head-follow-${index}-${slot}-region"><rect x="${r.region.x}" y="${r.region.y}" width="${r.region.width}" height="${r.region.height}"/></clipPath>`]:[]).join('')
    +nativeRearFollowPieces(paint,index).map(p=>`<clipPath id="${p.id}-uv"><path d="${path(expanded(p.from))}"/></clipPath>`).join('');
}
export function nativeRearFollowSvg(paint:NativeHeadPaint,index:number,imageId:string){
  return nativeRearFollowPieces(paint,index).map(p=>{const slot=paint.rear.indexOf(p.region);return `<g id="${p.id}"><g clip-path="url(#native-head-follow-${index}-${slot}-region)"><g clip-path="url(#${p.id}-uv)"><g clip-path="url(#native-head-bank-clip-${index})"><use href="#${imageId}"/></g></g></g></g>`;}).join('');
}
export function nativeRearFollowState(paint:NativeHeadPaint,index:number,control:{x:number;y:number;angle:number}){
  if(!control||![control.x,control.y,control.angle].every(Number.isFinite)||Math.hypot(control.x,control.y)>32+1e-9||Math.abs(control.angle)>8+1e-9)throw new Error('needs-head-secondary: invalid bounded original-head follow control');
  const wanted=nativeRearFollowPieces(paint,index).map(p=>{
    const r=p.region.region,m=p.region.motion!,cx=r.x+r.width/2,a=control.angle*Math.PI/180;
    const to=p.from.map(v=>{const u=(v.x-r.x)/r.width,t=(v.y-r.y)/r.height,w=smooth(t)*4*u*(1-u),x=v.x-cx,y=v.y-r.y;
      const dx=(control.x+x*(Math.cos(a)-1)-y*Math.sin(a))*m.gain,dy=(control.y+x*Math.sin(a)+y*(Math.cos(a)-1))*m.gain,d=Math.hypot(dx,dy),k=d?m.maxDisplacement*Math.tanh(d/m.maxDisplacement)/d:0;
      return {x:v.x+dx*k*w,y:v.y+dy*k*w};
    }) as unknown as ClothTriangle;return {...p,to};
  }),influence=clothAreaInfluence(wanted,.4),face:Record<string,{attr:{transform:string}}>={};
  const pieces=wanted.map(p=>{const target=p.from.map((v,i)=>({x:v.x+(p.to[i]!.x-v.x)*influence,y:v.y+(p.to[i]!.y-v.y)*influence})) as unknown as ClothTriangle,
    areaRatio=clothTriangleArea(target)/clothTriangleArea(p.from);
    if(areaRatio<.4-1e-9)throw new Error('needs-head-secondary: rear mesh lost positive area');
    face[p.id]={attr:{transform:'matrix('+clothTriangleMatrix(p.from,target).map(fmt).join(' ')+')'}};return {...p,target,areaRatio};
  });return {face,pieces,influence};
}
const matrix=(state:Record<string,unknown>,id:string)=>{const text=(state[id] as {attr?:{transform?:string}}|undefined)?.attr?.transform;
  if(typeof text!=='string'||!/^matrix\([^()]+\)$/.test(text))throw new Error('needs-head-secondary: missing baked rear matrix');
  const m=text.slice(7,-1).trim().split(/\s+/).map(Number);if(m.length!==6||!m.every(Number.isFinite))throw new Error('needs-head-secondary: invalid baked rear matrix');return m;};
const apply=(m:number[],p:ClothPoint)=>({x:m[0]!*p.x+m[2]!*p.y+m[4]!,y:m[1]!*p.x+m[3]!*p.y+m[5]!});
const mix=(a:number[],b:number[],u:number)=>a.map((v,i)=>v+(b[i]!-v)*u);
export function nativeRearFollowMatrixError(paint:NativeHeadPaint,index:number,from:Record<string,unknown>,to:Record<string,unknown>,actual:Record<string,unknown>,progress:number){
  if(!Number.isFinite(progress)||progress<0||progress>1)throw new Error('needs-head-secondary: invalid interpolation progress');
  let error=0;
  for(const p of nativeRearFollowPieces(paint,index)){
    const a=matrix(from,p.id),b=matrix(to,p.id),c=matrix(actual,p.id),m=mix(a,b,progress);
    // Area is quadratic over linear matrix interpolation. Check the entire
    // interval analytically; a small positional error cannot hide an inversion.
    const area=(u:number)=>clothTriangleArea(p.from.map(v=>apply(mix(a,b,u),v)) as unknown as ClothTriangle)/clothTriangleArea(p.from),v0=area(0),v1=area(1),half=area(.5),q=2*(v1+v0-2*half),linear=v1-v0-q;
    const critical=q>0?-linear/(2*q):-1,min=Math.min(v0,v1,...(critical>0&&critical<1?[area(critical)]:[]));if(min<.4-1e-7)return Infinity;
    for(const v of expanded(p.from)){const x=apply(m,v),y=apply(c,v);error=Math.max(error,Math.hypot(x.x-y.x,x.y-y.y));}
  }return error;
}
/** Conservative bound for the expanded UV clips: each affine displacement
 * is a barycentric combination of <=maxDisplacement vertex deltas. Max sum
 * of absolute weights at polygon vertices bounds every selected source pixel. */
export function nativeRearFollowMargin(paint:NativeHeadPaint){
  let margin=0;for(const p of nativeRearFollowPieces(paint,0)){const [a,b,c]=p.from,area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    for(const v of expanded(p.from)){const u=((v.x-a.x)*(c.y-a.y)-(v.y-a.y)*(c.x-a.x))/area,w=((b.x-a.x)*(v.y-a.y)-(b.y-a.y)*(v.x-a.x))/area;
      margin=Math.max(margin,(Math.abs(1-u-w)+Math.abs(u)+Math.abs(w))*p.region.motion!.maxDisplacement);
    }
  }return margin;
}
export const nativeRearFollowDescription={version:'native-head-follow-1',temporal:secondaryMotionDescription,mesh:[2,3],uvOverlap:2,minimumArea:.4,maxDisplacement:24,
  method:'own head-source rear texture only; pinned attachment/sides, original causal head history, affine source triangles; no face/neck/eye/hand warp',
  headCellChanges:'blocked pending authored continuous hair correspondence',approved:false,productionReady:false,motionVerified:false};
