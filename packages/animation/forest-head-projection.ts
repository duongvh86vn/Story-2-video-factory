/** An illustrated 2.5D candidate, not a reconstructed 3D head. Only the
 * existing front raster is sampled; no mirrored head or two-face crossfade. */
type Point={x:number;y:number};
type Actor='lila'|'karo';
export interface HeadProjectionTexture {width:number;height:number;anchor:Point;scale:number;}
type Face=Record<string,{attr?:Record<string,string|number>}>;
export const HEAD_PROJECTION_VERSION='forest-head-projection-2-glyph-floor';
export const HEAD_PROJECTION_UV_OVERLAP=3.5;
export const headProjectionGlyphLimits={eye:{minScaleX:.78,maxScaleX:1.12,shearWeight:0},brow:{minScaleX:.75,maxScaleX:1.15,shearWeight:.25},mouth:{minScaleX:.8,maxScaleX:1.15,shearWeight:.35}} as const;
export const headProjectionCalibration={
  maxYawDeg:32,
  lila:{columns:[0,250,445,665,880,1145],rows:[0,330,486,585,585+32/.15,1030,1374],faceRadius:36,frontDepth:18,hairDepth:-6,nose:{x:-1,y:9,depth:4},neckY:32,faceTop:-27,faceBottom:32},
  karo:{columns:[0,280,400,665,980,1312],rows:[0,340,467,598,835,598+72/.135,1199],faceRadius:44,frontDepth:20,hairDepth:-5,nose:{x:5,y:9,depth:5},neckY:72,faceTop:-32,faceBottom:71},
} as const;
const fmt=(n:number)=>String(Number(n.toFixed(7)));
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const local=(p:Point,t:HeadProjectionTexture)=>({x:(p.x-t.anchor.x)*t.scale,y:(p.y-t.anchor.y)*t.scale});
function depth(actor:Actor,p:Point){
  const c=headProjectionCalibration[actor],radius=p.x/c.faceRadius;
  const face=smooth((p.y-c.faceTop+10)/15)*(1-smooth((p.y-c.faceBottom+3)/18));
  const dome=Math.pow(Math.max(0,1-radius*radius),1.2);
  const nose=c.nose.depth*Math.exp(-(((p.x-c.nose.x)/9)**2)-(((p.y-c.nose.y)/10)**2));
  return c.hairDepth+(c.frontDepth-c.hairDepth)*dome*face+nose*face;
}
/** Neck is the pivot; facial volume moves farther than side hair/ears. All
 * landmarks and bitmap vertices pass through this exact same mapping. */
export function projectHeadPoint(actor:Actor,p:Point,yaw:number):Point {
  if(!Number.isFinite(yaw)||Math.abs(yaw)>1+1e-8)throw new Error('needs-head-view: projected yaw must be within [-1,1]');
  const a=yaw*headProjectionCalibration.maxYawDeg*Math.PI/180;
  const neck={x:0,y:headProjectionCalibration[actor].neckY};
  return {x:p.x*Math.cos(a)+(depth(actor,p)-depth(actor,neck))*Math.sin(a),y:p.y};
}
export function headProjectionTriangles(actor:Actor):Point[][] {
  const {columns:x,rows:y}=headProjectionCalibration[actor],result:Point[][]=[];
  for(let j=0;j<y.length-1;j++)for(let i=0;i<x.length-1;i++){
    const a={x:x[i]!,y:y[j]!},b={x:x[i+1]!,y:y[j]!},c={x:x[i+1]!,y:y[j+1]!},d={x:x[i]!,y:y[j+1]!};
    result.push([a,b,c],[a,c,d]);
  }return result;
}
function projectSurfacePoint(actor:Actor,t:HeadProjectionTexture,p:Point,yaw:number):Point {
  // Locate the fixed UV point once per evaluation. Interpolate its projected
  // triangle vertices so glyph centers coincide with the actual painted mesh,
  // including between cage vertices (the smooth depth model is only the cage).
  for(const raw of headProjectionTriangles(actor)){
    const [a,b,c]=raw.map(q=>local(q,t)) as [Point,Point,Point],det=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const u=((p.x-a.x)*(c.y-a.y)-(p.y-a.y)*(c.x-a.x))/det,v=((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))/det;
    if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8){const x=projectHeadPoint(actor,a,yaw),y=projectHeadPoint(actor,b,yaw),z=projectHeadPoint(actor,c,yaw);return {x:x.x+(y.x-x.x)*u+(z.x-x.x)*v,y:x.y+(y.y-x.y)*u+(z.y-x.y)*v};}
  }
  throw new Error('needs-head-mapping: feature lies outside the measured texture cage');
}
const signedArea=(points:Point[])=>{const [a,b,c]=points as [Point,Point,Point];return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);};
function affine(from:Point[],to:Point[]){
  const [p,q,r]=from as [Point,Point,Point],[a,b,c]=to as [Point,Point,Point],det=signedArea(from);
  if(det<=0||signedArea(to)<=det*.15)throw new Error('needs-head-mapping: projected triangle folded or collapsed');
  const ux=q.x-p.x,uy=q.y-p.y,vx=r.x-p.x,vy=r.y-p.y,dx=b.x-a.x,dy=b.y-a.y,ex=c.x-a.x,ey=c.y-a.y;
  const A=(dx*vy-ex*uy)/det,B=(dy*vy-ey*uy)/det,C=(ex*ux-dx*vx)/det,D=(ey*ux-dy*vx)/det;
  return [A,B,C,D,a.x-A*p.x-C*p.y,a.y-B*p.x-D*p.y];
}
const matrix=(v:number[])=>'matrix('+v.map(fmt).join(' ')+')';
function tailMatrix(base:number[],pivot:Point,rotation:number){
  const a=rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),tx=pivot.x-c*pivot.x+s*pivot.y,ty=pivot.y-s*pivot.x-c*pivot.y;
  const [A,B,C,D,E,F]=base as [number,number,number,number,number,number];
  return [c*A-s*B,s*A+c*B,c*C-s*D,s*C+c*D,c*E-s*F+tx,s*E+c*F+ty];
}
export function projectedHeadSvg(actor:Actor,t:HeadProjectionTexture,image:string,tailPivot?:Point){
  const id='forest-projection-source',triangles=headProjectionTriangles(actor);
  let clips='',art='';
  for(const [i,points] of triangles.entries()){
    const center={x:points.reduce((n,p)=>n+p.x,0)/3,y:points.reduce((n,p)=>n+p.y,0)/3};
    // UV pixels shrink by ~0.12 in the rig. Cover one output antialias fringe,
    // rather than expanding by a subpixel in the original high-res bitmap.
    const expanded=points.map(p=>{const k=1+HEAD_PROJECTION_UV_OVERLAP/Math.hypot(p.x-center.x,p.y-center.y);return {x:center.x+(p.x-center.x)*k,y:center.y+(p.y-center.y)*k};});
    clips+='<clipPath id="head-projection-clip-'+i+'" clipPathUnits="userSpaceOnUse"><path d="'+expanded.map((p,j)=>(j?'L':'M')+fmt(p.x)+' '+fmt(p.y)).join('')+'Z"/></clipPath>';
    const piece=(layer:'paint'|'tail')=>'<g id="head-projection-'+layer+'-'+i+'" transform="'+matrix([t.scale,0,0,t.scale,-t.anchor.x*t.scale,-t.anchor.y*t.scale])+'"><g clip-path="url(#head-projection-clip-'+i+')"><use href="#'+id+'"'+(tailPivot?(layer==='tail'?' clip-path="url(#forest-tail-front)"':' mask="url(#forest-static-hair-front)"'):'')+'/></g></g>';
    art+=piece('paint');
  }
  // Only cells intersecting the existing ponytail mask need a second material.
  const tail=tailPivot?triangles.map((p,i)=>p.some(v=>v.x<=595&&v.y>=745)?'<g id="head-projection-tail-'+i+'" transform="'+matrix([t.scale,0,0,t.scale,-t.anchor.x*t.scale,-t.anchor.y*t.scale])+'"><g clip-path="url(#head-projection-clip-'+i+')"><use href="#'+id+'" clip-path="url(#forest-tail-front)"/></g></g>':'').join(''):'';
  return '<defs><image id="'+id+'" width="'+t.width+'" height="'+t.height+'" href="'+image+'"/>'+clips+'</defs>'+tail+art;
}
export function projectedHeadState(actor:Actor,t:HeadProjectionTexture,yaw:number,tailPivot?:Point,tailRotation=0):Face {
  const face:Face={},pivot=tailPivot?projectSurfacePoint(actor,t,local(tailPivot,t),yaw):undefined;
  for(const [i,points] of headProjectionTriangles(actor).entries()){
    const from=points.map(p=>local(p,t)),to=from.map(p=>projectHeadPoint(actor,p,yaw)),v=affine(from,to);
    // Affine maps raw UV pixels to projected head-local coordinates.
    const uv=[v[0]!*t.scale,v[1]!*t.scale,v[2]!*t.scale,v[3]!*t.scale,v[4]!-t.anchor.x*t.scale*v[0]!-t.anchor.y*t.scale*v[2]!,v[5]!-t.anchor.x*t.scale*v[1]!-t.anchor.y*t.scale*v[3]!];
    face['head-projection-paint-'+i]={attr:{transform:matrix(uv)}};
    if(pivot&&points.some(p=>p.x<=595&&p.y>=745))face['head-projection-tail-'+i]={attr:{transform:matrix(tailMatrix(uv,pivot,Math.max(-5,Math.min(5,tailRotation))))}};
  }return face;
}
/** Tangent transform for a small eye/brow/mouth glyph, with the anchor moved
 * by the same surface mapping as its underlying painted face. */
export function projectedFeatureTransform(actor:Actor,t:HeadProjectionTexture,point:Point,yaw:number,glyph:'eye'|'brow'|'mouth'){
  const p=local(point,t),at=projectSurfacePoint(actor,t,p,yaw),dx=projectSurfacePoint(actor,t,{x:p.x+.05,y:p.y},yaw),dy=projectSurfacePoint(actor,t,{x:p.x,y:p.y+.05},yaw);
  const scale=(dx.x-at.x)/.05;
  if(scale<=.15)throw new Error('needs-head-mapping: feature projection collapsed');
  // Preserve glyph readability while moving its center with the facial volume.
  const limit=headProjectionGlyphLimits[glyph];
  return matrix([Math.max(limit.minScaleX,Math.min(limit.maxScaleX,scale)),0,(dy.x-at.x)/.05*limit.shearWeight,1,at.x,at.y]);
}
export function projectedSkinPolygon(actor:Actor,t:HeadProjectionTexture,points:Point[],yaw:number){
  return points.map((p,i)=>{const q=projectSurfacePoint(actor,t,local(p,t),yaw);return (i?'L':'M')+fmt(q.x)+' '+fmt(q.y);}).join('')+'Z';
}
/** Bound interpolation at actual texture vertices and feature extents, not at
 * matrix coefficients alone (UV pixels amplify tiny coefficient errors). */
export function headProjectionMatrixError(actor:Actor,a:Face,b:Face,wanted:Face,progress:number){
  let error=0;
  const nums=(value:unknown)=>typeof value==='string'?value.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)?.map(Number):undefined;
  const point=(v:number[],p:Point)=>({x:v[0]!*p.x+v[2]!*p.y+v[4]!,y:v[1]!*p.x+v[3]!*p.y+v[5]!});
  const compare=(id:string,vertices:Point[])=>{
    const from=nums(a[id]?.attr?.transform),to=nums(b[id]?.attr?.transform),actual=nums(wanted[id]?.attr?.transform);if(!from||!to||!actual)return;
    const mixed=from.map((n,i)=>n+(to[i]!-n)*progress);
    for(const p of vertices){const x=point(mixed,p),y=point(actual,p);error=Math.max(error,Math.hypot(x.x-y.x,x.y-y.y));}
  };
  for(const [i,points] of headProjectionTriangles(actor).entries())for(const layer of ['paint','tail'])compare('head-projection-'+layer+'-'+i,points);
  for(const id of Object.keys(a).filter(id=>id.startsWith('head-anchor-')))compare(id,[{x:-22,y:-16},{x:22,y:16},{x:0,y:0}]);
  return error;
}
