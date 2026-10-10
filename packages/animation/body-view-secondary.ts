import {isBasicBodyView,basicBodyCapabilityError} from './body-view-basic-capabilities.js';
import type {HostProfile} from '../host/schemas.js';
import type {Point} from './schemas.js';
import {hash} from '../core/utils.js';
import {clothTriangleArea,clothTriangleMatrix,clothAreaInfluence,type ClothTriangle} from './view-cloth-geometry.js';
import {secondaryMotionDescription} from './view-secondary-motion.js';

export const BODY_VIEW_SECONDARY_SELECTION='registered-secondary-v1' as const;
export const BODY_VIEW_SECONDARY_VERSION='native-view-secondary-1';
type Region={id:string;left:number;right:number;top:number;bottom:number;pin:'top'|'bottom';maxDisplacement:number;gain:number};
type View='three-quarter-left'|'three-quarter-right';
export type NativeSecondarySource={sha256:string;width:number;height:number;view:View;headBounds:{left:number;right:number;top:number;bottom:number}};
/** Image-space texture regions authored by inspecting the four existing PNGs.
 * Side seams and the attachment row are pinned. No face pixels are selected;
 * identity, silhouette, layer separation and mesh seams remain unapproved. */
export const nativeSecondaryBindings={
  lila:{
    'three-quarter-right':{sha256:'c11b0aeddf06e42d0e8363df9167c87fc4a94262606565a0c1bee55c950e43a9',width:1173,height:1341,regions:[
      {id:'crest',left:300,right:900,top:40,bottom:185,pin:'bottom',maxDisplacement:12,gain:.35},
      {id:'tail',left:280,right:550,top:470,bottom:780,pin:'top',maxDisplacement:32,gain:1}]},
    'three-quarter-left':{sha256:'ef90f6783d89a8e554c12605065a218faf4e0f6aae4411ae00cccf6825b686bf',width:1024,height:1536,regions:[
      {id:'crest',left:250,right:850,top:60,bottom:205,pin:'bottom',maxDisplacement:12,gain:.35},
      {id:'tail',left:600,right:860,top:535,bottom:820,pin:'top',maxDisplacement:32,gain:1}]}},
  karo:{
    'three-quarter-right':{sha256:'eefa90341b6a39138b163c173b3d6072b56c4bed4015bd431345691e8088e182',width:910,height:1729,regions:[
      {id:'crest',left:280,right:740,top:70,bottom:230,pin:'bottom',maxDisplacement:12,gain:.35},
      {id:'beard',left:530,right:660,top:550,bottom:650,pin:'top',maxDisplacement:10,gain:.3}]},
    'three-quarter-left':{sha256:'bfcffe1fac13281de68ca11910407bb22fde02f8f5f5d867054713399166fdf4',width:910,height:1729,regions:[
      {id:'crest',left:180,right:800,top:60,bottom:230,pin:'bottom',maxDisplacement:12,gain:.35},
      {id:'beard',left:300,right:480,top:550,bottom:670,pin:'top',maxDisplacement:10,gain:.3}]}},
} as const;
export const hasBodyViewSecondary=(profile:Pick<HostProfile,'appearance'>)=>profile.appearance.bodySecondary===BODY_VIEW_SECONDARY_SELECTION;
export function registeredNativeSecondary(profile:Pick<HostProfile,'appearance'>,source:NativeSecondarySource){
  const a=profile.appearance;
  if(isBasicBodyView(a.bodyView))throw basicBodyCapabilityError(a.bodyView,'secondary');
  if(!hasBodyViewSecondary(profile)||a.artworkVersion!=='forest-body-view-1'||!a.characterVariant||!a.bodyView||a.sourceColour)throw new Error('needs-view-secondary: select a registered native actor/view');
  const binding=nativeSecondaryBindings[a.characterVariant][a.bodyView];
  if(source.view!==a.bodyView||source.sha256!==binding.sha256||source.width!==binding.width||source.height!==binding.height)throw new Error('needs-view-secondary: native image registration differs');
  return binding;
}
const smooth=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};
const fmt=(n:number)=>String(Number(n.toFixed(7)));
const polygon=(points:readonly Point[])=>points.map((p,i)=>(i?'L':'M')+fmt(p.x)+' '+fmt(p.y)).join('')+'Z';
const rect=(r:Region)=>`M${r.left} ${r.top}H${r.right}V${r.bottom}H${r.left}Z`;
function regionTriangles(region:Region):ClothTriangle[]{
  const xs=[region.left,(region.left+region.right)/2,region.right],ys=Array.from({length:4},(_,i)=>region.top+(region.bottom-region.top)*i/3),triangles:ClothTriangle[]=[];
  for(let row=0;row<3;row++)for(let col=0;col<2;col++){
    const a={x:xs[col]!,y:ys[row]!},b={x:xs[col+1]!,y:ys[row]!},c={x:xs[col]!,y:ys[row+1]!},d={x:xs[col+1]!,y:ys[row+1]!};triangles.push([a,b,d],[a,d,c]);
  }return triangles;
}
export function nativeSecondaryPieces(profile:Pick<HostProfile,'appearance'>,source:NativeSecondarySource){
  return registeredNativeSecondary(profile,source).regions.flatMap(region=>regionTriangles(region).map((from,i)=>({id:'view-secondary-'+region.id+'-'+i,region,from})));
}
/** The static image and moving source pieces partition the same native head.
 * Original headClip is applied in UV space before deformation; moving tips
 * are not clipped again against the old silhouette in destination space. */
export function nativeSecondarySvg(profile:Pick<HostProfile,'appearance'>,source:NativeSecondarySource){
  const regions=registeredNativeSecondary(profile,source).regions,pieces=nativeSecondaryPieces(profile,source);
  const defs='<defs><mask id="view-secondary-static-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="'+source.width+'" height="'+source.height+'"><path d="M0 0H'+source.width+'V'+source.height+'H0Z" fill="white"/>'+regions.map(r=>'<path d="'+rect(r)+'" fill="black"/>').join('')+'</mask>'
    +regions.map(r=>'<clipPath id="view-secondary-'+r.id+'-clip"><path d="'+rect(r)+'"/></clipPath>').join('')
    +pieces.map(piece=>{
      const normals=piece.from.map((p,i)=>{const q=piece.from[(i+1)%3]!,dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);return {x:dy/length,y:-dx/length};});
      const expanded=piece.from.map((p,i)=>{const a=normals[(i+2)%3]!,b=normals[i]!,k=2/(1+a.x*b.x+a.y*b.y);return {x:p.x+(a.x+b.x)*k,y:p.y+(a.y+b.y)*k};});
      return '<clipPath id="'+piece.id+'-clip"><path d="'+polygon(expanded)+'"/></clipPath>';
    }).join('')+'</defs>';
  const staticArt='<g clip-path="url(#source-head-clip)" mask="url(#view-secondary-static-mask)"><use href="#view-secondary-source"/></g>';
  const moving=pieces.map(p=>'<g id="'+p.id+'"><g clip-path="url(#view-secondary-'+p.region.id+'-clip)"><g clip-path="url(#'+p.id+'-clip)"><g clip-path="url(#source-head-clip)"><use href="#view-secondary-source"/></g></g></g></g>').join('');
  return {defs,artwork:staticArt+moving};
}
export function nativeSecondaryState(profile:Pick<HostProfile,'appearance'>,source:NativeSecondarySource,control:{x:number;y:number;angle:number}){
  if(!control||![control.x,control.y,control.angle].every(Number.isFinite))throw new Error('needs-view-secondary: expected complete finite follow control');
  if(Math.hypot(control.x,control.y)>32+1e-9||Math.abs(control.angle)>8+1e-9)throw new Error('needs-view-secondary: follow control exceeds registered bounds');
  const pieces=nativeSecondaryPieces(profile,source),wanted=pieces.map(piece=>{
    const r=piece.region,cx=(r.left+r.right)/2,base=r.pin==='top'?r.top:r.bottom;
    const moved=(p:Point)=>{
      const x=(p.x-r.left)/(r.right-r.left),u=(p.y-r.top)/(r.bottom-r.top),weight=smooth(r.pin==='top'?u:1-u)*4*x*(1-x),angle=control.angle*Math.PI/180,dx=p.x-cx,dy=p.y-base;
      const offset={x:(control.x+dx*(Math.cos(angle)-1)-dy*Math.sin(angle))*r.gain,y:(control.y+dx*Math.sin(angle)+dy*(Math.cos(angle)-1))*r.gain},length=Math.hypot(offset.x,offset.y),gain=length?Math.tanh(length/r.maxDisplacement)*r.maxDisplacement/length:0;
      return {x:p.x+offset.x*gain*weight,y:p.y+offset.y*gain*weight};
    };
    return {...piece,to:piece.from.map(moved) as unknown as ClothTriangle};
  }),influence=clothAreaInfluence(wanted,.4),face:Record<string,{attr:{transform:string}}>={};
  const mapped=wanted.map(piece=>{
    const target=piece.from.map((p,i)=>({x:p.x+(piece.to[i]!.x-p.x)*influence,y:p.y+(piece.to[i]!.y-p.y)*influence})) as unknown as ClothTriangle,areaRatio=clothTriangleArea(target)/clothTriangleArea(piece.from);
    if(areaRatio<.4-1e-9)throw new Error('needs-view-secondary: texture mesh lost positive area');
    face[piece.id]={attr:{transform:'matrix('+clothTriangleMatrix(piece.from,target).map(fmt).join(' ')+')'}};
    return {id:piece.id,from:piece.from,target,areaRatio};
  });return {face,pieces:mapped,influence};
}
const coefficients=(item:unknown)=>{
  const raw=(item as {attr?:{transform?:unknown}}|undefined)?.attr?.transform;
  if(typeof raw!=='string'||!/^matrix\([^()]+\)$/.test(raw))throw new Error('needs-view-secondary: missing baked texture transform');
  const values=raw.slice(7,-1).trim().split(/\s+/).map(Number);
  if(values.length!==6||!values.every(Number.isFinite))throw new Error('needs-view-secondary: invalid baked texture transform');return values;
};
const apply=(m:readonly number[],p:Point)=>({x:m[0]!*p.x+m[2]!*p.y+m[4]!,y:m[1]!*p.x+m[3]!*p.y+m[5]!});
export function nativeSecondaryBounds(profile:Pick<HostProfile,'appearance'>,source:NativeSecondarySource,face:Record<string,unknown>){
  const bounds={...source.headBounds};
  for(const piece of nativeSecondaryPieces(profile,source))for(const p of piece.from){const point=apply(coefficients(face[piece.id]),p);bounds.left=Math.min(bounds.left,point.x);bounds.right=Math.max(bounds.right,point.x);bounds.top=Math.min(bounds.top,point.y);bounds.bottom=Math.max(bounds.bottom,point.y);}
  return bounds;
}
export function nativeSecondaryMatrixError(profile:Pick<HostProfile,'appearance'>,source:NativeSecondarySource,a:Record<string,unknown>,b:Record<string,unknown>,actual:Record<string,unknown>,progress:number){
  if(!Number.isFinite(progress)||progress<0||progress>1)throw new Error('needs-view-secondary: invalid interpolation progress');let error=0;
  for(const p of nativeSecondaryPieces(profile,source)){
    const from=coefficients(a[p.id]),to=coefficients(b[p.id]),wanted=coefficients(actual[p.id]),mixed=from.map((v,i)=>v+(to[i]!-v)*progress);
    for(const vertex of p.from){const x=apply(mixed,vertex),y=apply(wanted,vertex);error=Math.max(error,Math.hypot(x.x-y.x,x.y-y.y));}
  }return error;
}
export const nativeSecondaryDescription={version:BODY_VIEW_SECONDARY_VERSION,selection:BODY_VIEW_SECONDARY_SELECTION,
  fingerprint:hash({version:BODY_VIEW_SECONDARY_VERSION,bindings:nativeSecondaryBindings,temporal:secondaryMotionDescription.fingerprint,mesh:[2,3],minimumArea:.4,uvOverlap:2}),bindings:nativeSecondaryBindings,temporal:secondaryMotionDescription,
  method:'source-texture meshes for ponytail/crest or lower beard; attachment row and side seams pinned; eyes/nose/mouth/hair ties and face stay rigid',trianglesPerActor:24,
  limits:'candidate regions, layers and silhouette not accepted; no reconstructed hidden artwork, collision/fabric/hair simulation or full turns',approved:false,productionReady:false,motionVerified:false};
