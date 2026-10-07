import type {HostProfile} from '../../packages/host/schemas.js';
import {referenceImageUrl} from '../../packages/animation/forest-head-art.js';

/** These are authored supplemental views, not pixel-exact extractions. The
 * standing cutouts remain unchanged. Atlas regions are passive SVG clips. */
const garments={
  lila:{file:'library/topics/prehistoric-life/rig-v1/lila-seated-garment-v1.png',sha256:'9db3501a16c1c4d4f36b504cbea99ad7b52a3eb855bd656029ff7d3f73c451c2',width:2172,height:724,scale:.105,
    right:{anchor:{x:350,y:145},region:{x:80,y:60,width:920,height:630}},
    left:{anchor:{x:1810,y:145},region:{x:1180,y:60,width:920,height:630}}},
  karo:{file:'library/topics/prehistoric-life/rig-v1/karo-seated-garment-v1.png',sha256:'06e01182df8bb332ce95d5fc765a4e3b236d2d08c5565e8f00b133374377cd0e',width:1774,height:887,scale:.1,
    right:{anchor:{x:305,y:298},region:{x:50,y:220,width:770,height:480}},
    left:{anchor:{x:1470,y:298},region:{x:950,y:220,width:770,height:480}}},
} as const;
type Point={x:number;y:number};
type Facing='left'|'right';
const columns=4,rows=2;
function mesh(actor:'lila'|'karo',facing:Facing){
  const r=garments[actor][facing].region,triangles:Point[][]=[];
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
    const p=(dx:number,dy:number)=>({x:r.x+(x+dx)*r.width/columns,y:r.y+(y+dy)*r.height/rows});
    triangles.push([p(0,0),p(1,0),p(1,1)],[p(0,0),p(1,1),p(0,1)]);
  }
  return triangles;
}
const matrix=(from:Point[],to:Point[])=>{
  const [p,q,r]=from as [Point,Point,Point],[a,b,c]=to as [Point,Point,Point];
  const ux=q.x-p.x,uy=q.y-p.y,vx=r.x-p.x,vy=r.y-p.y,det=ux*vy-uy*vx;
  const dx=b.x-a.x,dy=b.y-a.y,ex=c.x-a.x,ey=c.y-a.y;
  const A=(dx*vy-ex*uy)/det,B=(dy*vy-ey*uy)/det,C=(ex*ux-dx*vx)/det,D=(ey*ux-dy*vx)/det;
  return [A,B,C,D,a.x-A*p.x-C*p.y,a.y-B*p.x-D*p.y];
};
const fmt=(n:number)=>String(Number(n.toFixed(7)));
export function seatedGarmentMeshState(profile:HostProfile,facing:Facing,thighAngle:number){
  const actor=profile.appearance.characterVariant!,asset=garments[actor],anchor=asset[facing].anchor,direction=facing==='right'?1:-1;
  const angle=Math.max(-100,Math.min(100,thighAngle))*Math.PI/180,hingeY=actor==='lila'?24:18;
  const deform=(p:Point)=>{
    const local={x:(p.x-anchor.x)*asset.scale,y:(p.y-anchor.y)*asset.scale};
    // Keep the waist and rear hip under the torso; the forward lap follows the
    // thigh. This skins one opaque texture, without blending exterior hems.
    const phase=Math.max(0,Math.min(1,(direction*local.x-4)/36)),weight=phase*phase*(3-2*phase);
    const y=local.y-hingeY,x=local.x;
    const turned={x:x*Math.cos(angle)-y*Math.sin(angle),y:hingeY+x*Math.sin(angle)+y*Math.cos(angle)};
    return {x:local.x+(turned.x-local.x)*weight,y:local.y+(turned.y-local.y)*weight};
  };
  return Object.fromEntries(mesh(actor,facing).map((points,i)=>['garment-mesh-'+facing+'-'+i,{attr:{transform:'matrix('+matrix(points,points.map(deform)).map(fmt).join(' ')+')'}}]));
}
/** Bound interpolation at source triangle vertices, rather than comparing tiny
 * affine coefficients without accounting for the atlas's pixel dimensions. */
export function seatedGarmentMeshError(profile:HostProfile,a:Record<string,{attr?:{transform?:string}}>,b:Record<string,{attr?:{transform?:string}}>,actual:Record<string,{attr?:{transform?:string}}>,progress:number){
  let error=0;
  for(const facing of ['left','right'] as const)for(const [i,points] of mesh(profile.appearance.characterVariant!,facing).entries()){
    const id='garment-mesh-'+facing+'-'+i;
    const values=(state:typeof a)=>state[id]?.attr?.transform?.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)?.map(Number);
    const from=values(a),to=values(b),wanted=values(actual);if(!from||!to||!wanted)continue;
    const mixed=from.map((n,j)=>n+(to[j]!-n)*progress);
    for(const p of points){
      const at=(v:number[])=>({x:v[0]!*p.x+v[2]!*p.y+v[4]!,y:v[1]!*p.x+v[3]!*p.y+v[5]!});
      const x=at(mixed),y=at(wanted);error=Math.max(error,Math.hypot(x.x-y.x,x.y-y.y));
    }
  }
  return error;
}
export function seatedGarmentAssets(appearance:HostProfile['appearance']){
  if(appearance.artworkVersion!=='forest-body-1')return [];
  const actor=appearance.characterVariant;if(!actor)throw new Error('Seated garment actor missing.');
  const asset=garments[actor];return [{file:asset.file,sha256:asset.sha256,path:'assets/rigs/'+asset.sha256+'.png'}];
}
export function seatedGarmentSvg(profile:HostProfile,mode:'embedded'|'scene'){
  const asset=garments[profile.appearance.characterVariant!],imageId='forest-seated-garment-source';
  const clips=(['left','right'] as const).map(facing=>{
    const r=asset[facing].region;
    return '<clipPath id="forest-seated-garment-'+facing+'" clipPathUnits="userSpaceOnUse"><rect x="'+r.x+'" y="'+r.y+'" width="'+r.width+'" height="'+r.height+'"/></clipPath>';
  }).join('');
  const defs='<defs><image id="'+imageId+'" width="'+asset.width+'" height="'+asset.height+'" href="'+referenceImageUrl(asset.file,asset.sha256,mode)+'"/>'+clips+'</defs>';
  let meshClips='';
  const artwork=(['left','right'] as const).map(facing=>{
    const triangles=mesh(profile.appearance.characterVariant!,facing).map((points,i)=>{
      const id='garment-mesh-'+facing+'-'+i,center={x:points.reduce((sum,p)=>sum+p.x,0)/3,y:points.reduce((sum,p)=>sum+p.y,0)/3};
      // Subpixel overlap keeps antialiased triangle edges from exposing seams.
      const expanded=points.map(p=>{const dx=p.x-center.x,dy=p.y-center.y,k=1+.8/Math.hypot(dx,dy);return {x:center.x+dx*k,y:center.y+dy*k};});
      meshClips+='<clipPath id="'+id+'-clip" clipPathUnits="userSpaceOnUse"><path d="'+expanded.map((p,j)=>(j?'L':'M')+fmt(p.x)+' '+fmt(p.y)).join('')+'Z"/></clipPath>';
      return '<g id="'+id+'"><g clip-path="url(#'+id+'-clip)"><use href="#'+imageId+'"/></g></g>';
    }).join('');
    return '<g id="garment-seated-'+facing+'"><g id="garment-fold-'+facing+'" opacity="0" stroke="none" fill="none">'+triangles+'</g></g>';
  }).join('');
  return {defs:defs+'<defs>'+meshClips+'</defs>',artwork};
}
export function seatedGarmentDescription(){return {version:'forest-seated-garment-2-mesh',assets:garments,status:'candidate-authored-folds',productionReady:false,
  mesh:{columns,rows,opacity:'one opaque garment per seated plan; no exterior-hem crossfade',attachment:'waist/rear hip follows torso; forward lap follows the thigh'},
  method:'independently authored seated left/right lower garments, continuously skinned native SVG image triangles; no bitmap rewrite or fabric simulation',
  prompts:'library/topics/prehistoric-life/rig-v1/seated-garment-prompts.json'};}
