import type {HostProfile} from '../host/schemas.js';
import {referenceImageUrl} from './forest-head-art.js';
import {hash} from '../core/utils.js';
import correspondence from '../../library/topics/prehistoric-life/rig-v1/garment-correspondence-v2.json' with {type:'json'};

/** Supplemental seated views are candidates, not pixel-exact extractions.
 * Both materials share a measured, opaque contour; no exterior-hem crossfade. */
const garments={
  lila:{file:'library/topics/prehistoric-life/rig-v1/lila-seated-garment-v1.png',sha256:'9db3501a16c1c4d4f36b504cbea99ad7b52a3eb855bd656029ff7d3f73c451c2',width:2172,height:724,scale:.105,
    right:{anchor:{x:350,y:145},region:{x:80,y:60,width:920,height:630}},
    left:{anchor:{x:1810,y:145},region:{x:1180,y:60,width:920,height:630}}},
  karo:{file:'library/topics/prehistoric-life/rig-v1/karo-seated-garment-v2.png',sha256:'f6082a8c6c92dbeaf80b94c0ec9f985f2cf0ba2e4cf00f826d621d4f90db7e8d',width:1774,height:887,scale:.1,
    right:{anchor:{x:305,y:298},region:{x:50,y:220,width:770,height:480}},
    left:{anchor:{x:1470,y:298},region:{x:950,y:220,width:770,height:480}}},
} as const;
export function seatedGarmentAssets(appearance:HostProfile['appearance']){
  if(appearance.artworkVersion!=='forest-body-1')return [];
  const actor=appearance.characterVariant;if(!actor)throw new Error('Seated garment actor missing.');
  const asset=garments[actor];return [{file:asset.file,sha256:asset.sha256,path:'assets/rigs/'+asset.sha256+'.png'}];
}
export function seatedGarmentSvg(profile:HostProfile,mode:'embedded'|'scene'){
  const actor=profile.appearance.characterVariant!,asset=garments[actor],geometry=correspondence.actors[actor],imageId='forest-seated-garment-source';
  let clips='';
  const artwork=(['left','right'] as const).map(facing=>{
    clips+='<clipPath id="garment-surface-'+facing+'" clipPathUnits="userSpaceOnUse"><path id="garment-contour-'+facing+'" d="M0 0Z"/></clipPath>';
    // The two rasters have different ragged ink near the hem. Let the common
    // contour own that ink instead of blending two perimeter lines. Keep the
    // original color/fold texture in the interior; no raster is rewritten.
    if(actor==='karo')clips+='<mask id="garment-texture-band-'+facing+'" maskUnits="userSpaceOnUse" x="-160" y="-40" width="320" height="200"><path id="garment-interior-'+facing+'" d="M0 0Z" fill="white" stroke="black" stroke-width="7" stroke-linejoin="round"/></mask>';
    const layers=(['rest','seat'] as const).map(material=>{
      const pieces=geometry.views[facing].pieces.map((piece,i)=>{
        const id='garment-texture-'+facing+'-'+material+'-'+i,points=piece[material],center={x:points.reduce((sum,p)=>sum+p.x,0)/3,y:points.reduce((sum,p)=>sum+p.y,0)/3};
        // Small UV overlap closes antialiased seams; the shared exterior clip
        // keeps this overlap from extending or doubling the visible hem.
        const expanded=points.map(p=>{const dx=p.x-center.x,dy=p.y-center.y,k=1+.65/Math.hypot(dx,dy);return {x:center.x+dx*k,y:center.y+dy*k};});
        clips+='<clipPath id="'+id+'-clip" clipPathUnits="userSpaceOnUse"><path d="'+path(expanded)+'"/></clipPath>';
        return '<g id="'+id+'"><g clip-path="url(#'+id+'-clip)"><use href="#'+(material==='rest'?'forest-body-source':imageId)+'"/></g></g>';
      }).join('');
      return '<g id="garment-material-'+facing+'-'+material+'"'+(material==='seat'?' opacity="0"':'')+'>'+pieces+'</g>';
    }).join('');
    return '<g id="garment-seated-'+facing+'"><g id="garment-fold-'+facing+'" opacity="0"><path id="garment-fill-'+facing+'" d="M0 0Z" fill="'+(actor==='lila'?'#785633':'#995C25')+'" stroke="none"/>'
      +'<g stroke="none" fill="none" clip-path="url(#garment-surface-'+facing+')"'+(actor==='karo'?' mask="url(#garment-texture-band-'+facing+')"':'')+'>'+layers+'</g><path id="garment-edge-'+facing+'" d="M0 0Z" fill="none" stroke="#080604" stroke-width="'+(actor==='karo'?'2.2':'1.1')+'" stroke-linejoin="round"/></g></g>';
  }).join('');
  const defs='<defs><image id="'+imageId+'" width="'+asset.width+'" height="'+asset.height+'" href="'+referenceImageUrl(asset.file,asset.sha256,mode)+'"/>'+clips+'</defs>';
  return {defs,artwork};
}
type Point={x:number;y:number};
type Facing='left'|'right';
type Face=Record<string,{opacity?:number;attr?:Record<string,string|number>}>;
export type GarmentRestPose=Record<'left'|'right',{hip:Point;angle:number}>;
const fmt=(n:number)=>String(Number(n.toFixed(7)));
const path=(points:Point[])=>points.map((p,i)=>(i?'L':'M')+fmt(p.x)+' '+fmt(p.y)).join('')+'Z';
const local=(p:Point,anchor:Point,scale:number)=>({x:(p.x-anchor.x)*scale,y:(p.y-anchor.y)*scale});
function affine(from:Point[],to:Point[]){
  const [p,q,r]=from as [Point,Point,Point],[a,b,c]=to as [Point,Point,Point];
  const ux=q.x-p.x,uy=q.y-p.y,vx=r.x-p.x,vy=r.y-p.y,det=ux*vy-uy*vx;
  if(Math.abs(det)<1e-8)throw new Error('Degenerate garment UV triangle');
  const dx=b.x-a.x,dy=b.y-a.y,ex=c.x-a.x,ey=c.y-a.y;
  const A=(dx*vy-ex*uy)/det,B=(dy*vy-ey*uy)/det,C=(ex*ux-dx*vx)/det,D=(ey*ux-dy*vx)/det;
  return 'matrix('+[A,B,C,D,a.x-A*p.x-C*p.y,a.y-B*p.x-D*p.y].map(fmt).join(' ')+')';
}
/** Native SVG geometry changes on the same absolute clock as the body. The
 * full surface stays opaque; only internal material/fold texture is blended. */
export function seatedGarmentState(profile:HostProfile,facing:Facing,progress:number,restPose?:GarmentRestPose){
  const actor=profile.appearance.characterVariant!,asset=garments[actor],geometry=correspondence.actors[actor],view=geometry.views[facing];
  const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
  const restPoint=(point:Point,t:number)=>{
    const p=local(point,geometry.rest.anchor,geometry.rest.scale);if(!restPose)return p;
    // Pin the belt/upper overlap; lower fabric follows each thigh with the
    // compiler's absolute 100ms lag. Blend side influences across the crotch
    // instead of tearing the shared hip into two independently rotating flaps.
    const hemWeight=smooth((p.y-12)/32),rightWeight=smooth((point.x-geometry.rest.anchor.x+18)/36);
    const moved=(side:'left'|'right')=>{
      const {hip,angle}=restPose[side],a=Math.max(-22,Math.min(22,angle))*(1-t)*Math.PI/180,dx=p.x-hip.x,dy=p.y-hip.y;
      return {x:hip.x+dx*Math.cos(a)-dy*Math.sin(a),y:hip.y+dx*Math.sin(a)+dy*Math.cos(a)};
    };
    const left=moved('left'),right=moved('right'),target={x:left.x+(right.x-left.x)*rightWeight,y:left.y+(right.y-left.y)*rightWeight};
    return {x:p.x+(target.x-p.x)*hemWeight,y:p.y+(target.y-p.y)*hemWeight};
  };
  const t=Math.max(0,Math.min(1,progress)),base=(rest:Point,seat:Point)=>{
    const a=local(rest,geometry.rest.anchor,geometry.rest.scale),b=local(seat,asset[facing].anchor,asset.scale);
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  },wanted=(rest:Point,seat:Point)=>{
    const a=restPoint(rest,t),b=local(seat,asset[facing].anchor,asset.scale);
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  },interpolate=(a:Point,b:Point,n:number)=>({x:a.x+(b.x-a.x)*n,y:a.y+(b.y-a.y)*n});
  const area=(p:Point[])=>{const [a,b,c]=p as [Point,Point,Point];return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);};
  // A large opposing step can fold the narrow crotch. Bound the shared thigh
  // displacement before drawing it, preserving at least 25% of each neutral
  // triangle's signed area. Area is quadratic along this displacement ray;
  // its first positive threshold root gives a continuous absolute-time limit.
  // This is a geometric governor, not a physical cloth solver or a bypass of
  // the inversion guard below. The same factor controls texture and outline.
  let influence=1;
  if(restPose)for(const piece of view.pieces){
    const from=piece.rest.map((p,j)=>base(p,piece.seat[j]!)),to=piece.rest.map((p,j)=>wanted(p,piece.seat[j]!));
    const start=area(from),end=area(to),mid=area(from.map((p,j)=>interpolate(p,to[j]!,.5)));
    if(start<=1e-7)throw new Error('needs-cloth-mapping: neutral garment triangle inverted');
    const a=2*(end+start-2*mid),b=end-start-a,c=.75*start,roots:number[]=[];
    if(Math.abs(a)<1e-10){if(b<0)roots.push(-c/b);}
    else {const discriminant=b*b-4*a*c;if(discriminant>=0){const d=Math.sqrt(discriminant);roots.push((-b-d)/(2*a),(-b+d)/(2*a));}}
    for(const root of roots)if(root>0&&root<influence)influence=root;
  }
  const mix=(rest:Point,seat:Point)=>interpolate(base(rest,seat),wanted(rest,seat),influence);
  const contour=path(geometry.rest.outline.map((p,i)=>mix(p,view.outline[i]!))),face:Face={};
  for(const [i,piece] of view.pieces.entries()){
    const target=piece.rest.map((p,j)=>mix(p,piece.seat[j]!));
    const [a,b,c]=target as [Point,Point,Point];
    if((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)<=1e-7)throw new Error('needs-cloth-mapping: '+actor+'/'+facing+' garment triangle inverted during motion');
    for(const material of ['rest','seat'] as const)face['garment-texture-'+facing+'-'+material+'-'+i]={attr:{transform:affine(piece[material],target)}};
  }
  // The outgoing texture is opaque underneath the incoming folds. The fill
  // and exterior edge are never faded or duplicated.
  face['garment-material-'+facing+'-rest']={opacity:1};face['garment-material-'+facing+'-seat']={opacity:t};
  return {face,paths:Object.fromEntries(['contour','fill','edge',...(actor==='karo'?['interior']:[])].map(id=>['garment-'+id+'-'+facing,contour]))};
}
export function seatedGarmentMatrixError(profile:HostProfile,a:Face,b:Face,actual:Face,progress:number){
  let error=0;const geometry=correspondence.actors[profile.appearance.characterVariant!];
  const values=(value:unknown)=>typeof value==='string'?value.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)?.map(Number):undefined;
  for(const facing of ['left','right'] as const)for(const [i,piece] of geometry.views[facing].pieces.entries())for(const material of ['rest','seat'] as const){
    const id='garment-texture-'+facing+'-'+material+'-'+i,from=values(a[id]?.attr?.transform),to=values(b[id]?.attr?.transform),wanted=values(actual[id]?.attr?.transform);if(!from||!to||!wanted)continue;
    const mixed=from.map((n,j)=>n+(to[j]!-n)*progress);
    for(const p of piece[material]){
      const at=(v:number[])=>({x:v[0]!*p.x+v[2]!*p.y+v[4]!,y:v[1]!*p.x+v[3]!*p.y+v[5]!});
      const x=at(mixed),y=at(wanted);error=Math.max(error,Math.hypot(x.x-y.x,x.y-y.y));
    }
  }return error;
}
export function seatedGarmentDescription(){return {version:'forest-seated-garment-3-cuffs-and-swing',assets:garments,status:'candidate-authored-folds',productionReady:false,
  karoPerimeterInk:{textureInsetBand:3.5,contourStrokeWidth:2.2,method:'one common SVG perimeter owns the black ink; raster perimeter texture is excluded by a moving mask, retaining interior colors and folds'},
  restSwing:{lagMs:100,maxAngleDeg:22,waistPinY:12,hemBlendHeight:32,minimumNeutralAreaRatio:.25,method:'continuous blended thigh influences below a pinned waist; quadratic area governor limits shared displacement before drawing, fading into seated correspondence; inverted triangles still block evaluation',physicalSimulation:false},
  correspondence:{file:'library/topics/prehistoric-life/rig-v1/garment-correspondence-v2.json',fingerprint:hash(correspondence),cageVertices:16,outlineVertices:50,
    mappings:Object.fromEntries(Object.entries(correspondence.actors).map(([actor,geometry])=>[actor,Object.fromEntries(Object.entries(geometry.views).map(([facing,view])=>[facing,{triangles:view.pieces.length,minimumTriangleArea:view.minimumTriangleArea}]))])),
    guarantee:'positive triangle area for undeformed rest/seated interpolation; not a physical cloth/anatomy or runtime acceptance guarantee'},
  method:'common semantic UV triangles and one opaque interpolated SVG contour; source and authored seated materials share the same surface; no bitmap rewrite or fabric simulation',
  prompts:'library/topics/prehistoric-life/rig-v1/seated-garment-prompts.json',repairPrompt:'library/topics/prehistoric-life/rig-v1/karo-cuffs-v2-prompt.json'};}
