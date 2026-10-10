import {isBasicBodyView,basicBodyCapabilityError} from './body-view-basic-capabilities.js';
import type {HostProfile} from '../host/schemas.js';
import type {PerformancePlan,Point} from './schemas.js';
import {BODY_SOURCE_SEAT_CLOCK_VERSION} from './schemas.js';
import type {NativeClothSource} from './body-view-cloth.js';
import {clothTriangleArea,clothTriangleMatrix,clothAreaInfluence,type ClothTriangle} from './view-cloth-geometry.js';
import {nativeSeatRegistration,nativeSeatRegistrationFingerprint} from './native-seat-registration.js';
import {hash} from '../core/utils.js';

export const BODY_VIEW_SEAT_SELECTION='registered-seated-v1' as const;
export const BODY_VIEW_SEAT_VERSION='native-view-seat-2';
function freezeDeep<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))freezeDeep(child);Object.freeze(value);}return value;}
const registration=freezeDeep(nativeSeatRegistration());
export const hasBodyViewSeat=(profile:Pick<HostProfile,'appearance'>)=>profile.appearance.bodySeat===BODY_VIEW_SEAT_SELECTION;
export function registeredNativeSeat(profile:Pick<HostProfile,'appearance'>,source:NativeClothSource){
  const a=profile.appearance;
  if(isBasicBodyView(a.bodyView))throw basicBodyCapabilityError(a.bodyView,'seat');
  if(!hasBodyViewSeat(profile)||a.bodyMotion!=='registered-locomotion-v1'||a.artworkVersion!=='forest-body-view-1'||!a.characterVariant||!a.bodyView||a.sourceColour)throw new Error('needs-view-seat: select the registered native actor/view and locomotion');
  const actor=registration.actors[a.characterVariant],c=actor.views[a.bodyView],s=c.standing;
  if(source.view!==a.bodyView||source.sha256!==s.sha256||source.width!==s.width||source.height!==s.height||source.bodyScale!==s.bodyScale||hash(source.pelvis)!==hash(s.pelvis))throw new Error('needs-view-seat: native image/scale/pelvis registration differs');
  return {actor,c};
}
export function validateNativeSeat(plan:PerformancePlan,profile:Pick<HostProfile,'appearance'>,source:NativeClothSource){
  registeredNativeSeat(profile,source);
  const facing=source.view==='three-quarter-left'?'left':'right';
  const used=new Set([...(plan.entryPosture?[plan.entryPosture]:[]),...(plan.postures??[])].filter(p=>p.pose==='seated').map(p=>p.supportId));
  if(plan.supports?.some(s=>used.has(s.id)&&s.facing!==facing))throw new Error('needs-view-seat: support must face the selected fixed native body view');
}
export function nativeSeatAssets(appearance:HostProfile['appearance']){
  if(!hasBodyViewSeat({appearance}))return [];
  if(!appearance.characterVariant||!appearance.bodyView)throw new Error('needs-view-seat: missing actor/view');
  const c=registration.actors[appearance.characterVariant].material;return [{...c,path:'assets/rigs/'+c.sha256+'.png'}];
}
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const fmt=(n:number)=>String(Number(n.toFixed(7)));
const path=(points:readonly Point[])=>points.map((p,i)=>(i?'L':'M')+fmt(p.x)+' '+fmt(p.y)).join('')+'Z';
// The pinned top edge lies inside the original skirt/shorts. Keep native belt
// ink above it; do not invent a second black horizontal seam below that belt.
const edgePath=(points:readonly Point[])=>points.slice(8).concat(points[0]!).map((p,i)=>(i?'L':'M')+fmt(p.x)+' '+fmt(p.y)).join('');
type Face=Record<string,{opacity?:number;attr?:Record<string,string|number>}>;
const id=(material:'rest'|'seat',index:number)=>'view-seat-'+material+'-'+index;
export function nativeSeatSvg(profile:HostProfile,source:NativeClothSource,imageUrl:(file:string,sha:string)=>string){
  const {actor,c}=registeredNativeSeat(profile,source),m=actor.material,ink=source.inkPad;
  let defs='<clipPath id="view-seat-upper-clip"><path d="M0 0H'+source.width+'V'+(c.standing.waist+1)+'H0Z"/></clipPath>'
    +'<clipPath id="view-seat-surface"><path id="view-seat-contour" d="'+path(c.outline.rest)+'"/></clipPath>'
    +'<mask id="view-seat-interior" maskUnits="userSpaceOnUse" x="'+(-source.width)+'" y="0" width="'+source.width*3+'" height="'+source.height*2+'"><path id="view-seat-inset" d="'+path(c.outline.rest)+'" fill="white" stroke="none"/><path id="view-seat-interior-edge" d="'+edgePath(c.outline.rest)+'" fill="none" stroke="black" stroke-width="'+ink*2+'" stroke-linejoin="round"/></mask>'
    +'<image id="view-seat-source" width="'+m.width+'" height="'+m.height+'" href="'+imageUrl(m.file,m.sha256)+'"/>';
  const materials=(['rest','seat'] as const).map(material=>{
    const pieces=c.pieces.map((piece,i)=>{
      const triangle=piece[material],normals=triangle.map((p,j)=>{const q=triangle[(j+1)%3]!,dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);return {x:dy/length,y:-dx/length};});
      // Constant UV edge overlap closes interior raster seams. Cap acute miters;
      // only the shared contour owns the outer hem, never a faded second edge.
      const expanded=triangle.map((p,j)=>{const a=normals[(j+2)%3]!,b=normals[j]!,k=Math.min(12,1.5/Math.max(1e-8,1+a.x*b.x+a.y*b.y));return {x:p.x+(a.x+b.x)*k,y:p.y+(a.y+b.y)*k};});
      defs+='<clipPath id="'+id(material,i)+'-clip"><path d="'+path(expanded)+'"/></clipPath>';
      const matrix=clothTriangleMatrix(triangle,piece.rest);
      return '<g id="'+id(material,i)+'" transform="matrix('+matrix.map(fmt).join(' ')+')"><g clip-path="url(#'+id(material,i)+'-clip)">'+(material==='rest'?'<g mask="url(#view-clothing-mask)">':'')+'<use href="#'+(material==='rest'?'view-body-source':'view-seat-source')+'"/>'+(material==='rest'?'</g>':'')+'</g></g>';
    }).join('');
    return '<g id="view-seat-material-'+material+'" opacity="'+(material==='rest'?1:0)+'">'+pieces+'</g>';
  }).join('');
  const contour=path(c.outline.rest),fill=profile.appearance.characterVariant==='lila'?'#785633':'#995C25';
  return {defs:'<defs>'+defs+'</defs>',artwork:'<g clip-path="url(#view-seat-upper-clip)"><g mask="url(#view-clothing-mask)"><use href="#view-body-source"/></g></g>'
    +'<path id="view-seat-fill" d="'+contour+'" fill="'+fill+'"/>'
    +'<g clip-path="url(#view-seat-surface)" mask="url(#view-seat-interior)" stroke="none">'+materials+'</g>'
    +'<path id="view-seat-edge" d="'+edgePath(c.outline.rest)+'" fill="none" stroke="#080604" stroke-width="'+ink+'" stroke-linejoin="round"/>'};
}
/** One absolute-time, opaque surface. Support transfer owns progress; cloth
 * lag controls only the standing hem and fades as the seated shape takes over.
 * This is a registered geometric candidate, not a cloth physics simulation. */
export function nativeSeatState(profile:Pick<HostProfile,'appearance'>,source:NativeClothSource,control:{progress:number;thighAngles:Record<'left'|'right',number>}){
  const {c}=registeredNativeSeat(profile,source);
  if(![control.progress,...Object.values(control.thighAngles)].every(Number.isFinite)||control.progress<0||control.progress>1)throw new Error('needs-view-seat: invalid support/cloth controls');
  const t=control.progress,waist=c.standing.waist,bottom=Math.max(...c.outline.rest.map(p=>p.y)),split=source.pelvis.x;
  const base=(rest:Point,target:Point)=>({x:rest.x+(target.x-rest.x)*t,y:rest.y+(target.y-rest.y)*t});
  const wanted=(rest:Point,target:Point)=>{
    const p=base(rest,target),hem=smooth((rest.y-waist)/(bottom-waist)),right=smooth((rest.x-split+45)/90);
    const rotate=(side:'left'|'right')=>{const hip=source.hips[side],a=clamp(control.thighAngles[side]*.7,-18,18)*(1-t)*Math.PI/180,dx=rest.x-hip.x,dy=rest.y-hip.y;return {x:hip.x+dx*Math.cos(a)-dy*Math.sin(a),y:hip.y+dx*Math.sin(a)+dy*Math.cos(a)};};
    const a=rotate('left'),b=rotate('right');return {x:p.x+(a.x+(b.x-a.x)*right-rest.x)*hem*(1-t),y:p.y+(a.y+(b.y-a.y)*right-rest.y)*hem*(1-t)};
  };
  const neutral=c.pieces.map(p=>({from:p.rest.map((r,i)=>base(r,p.target[i]!)) as unknown as ClothTriangle,to:p.rest.map((r,i)=>wanted(r,p.target[i]!)) as unknown as ClothTriangle}));
  const influence=clothAreaInfluence(neutral,.25),mix=(rest:Point,target:Point)=>{const a=base(rest,target),b=wanted(rest,target);return {x:a.x+(b.x-a.x)*influence,y:a.y+(b.y-a.y)*influence};};
  const face:Face={'view-seat-material-rest':{opacity:1},'view-seat-material-seat':{opacity:t}};
  const pieces=c.pieces.map((piece,i)=>{
    const target=piece.rest.map((p,j)=>mix(p,piece.target[j]!)) as unknown as ClothTriangle,ratio=clothTriangleArea(target)/clothTriangleArea(neutral[i]!.from);
    if(ratio<.25-1e-8)throw new Error('needs-view-seat: moving cloth lost positive area');
    for(const material of ['rest','seat'] as const)face[id(material,i)]={attr:{transform:'matrix('+clothTriangleMatrix(piece[material],target).map(fmt).join(' ')+')'}};
    return {target,areaRatio:ratio};
  });
  const outline=c.outline.rest.map((p,i)=>mix(p,c.outline.target[i]!)),d=path(outline);
  return {face,paths:{'view-seat-contour':d,'view-seat-fill':d,'view-seat-inset':d,'view-seat-edge':edgePath(outline),'view-seat-interior-edge':edgePath(outline)},pieces,outline,influence};
}
export function nativeSeatMatrixError(profile:Pick<HostProfile,'appearance'>,source:NativeClothSource,a:Face,b:Face,actual:Face,progress:number){
  const {c}=registeredNativeSeat(profile,source),values=(face:Face,name:string)=>String(face[name]?.attr?.transform??'').match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)?.map(Number);let error=0;
  for(const [i,piece] of c.pieces.entries())for(const material of ['rest','seat'] as const){
    const name=id(material,i),from=values(a,name),to=values(b,name),wanted=values(actual,name);
    if(!from||!to||!wanted||[from,to,wanted].some(v=>v.length!==6||!v.every(Number.isFinite)))throw new Error('needs-view-seat: missing baked texture transform');
    const mixed=from.map((v,j)=>v+(to[j]!-v)*progress);
    for(const p of piece[material]){const apply=(m:number[])=>({x:m[0]!*p.x+m[2]!*p.y+m[4]!,y:m[1]!*p.x+m[3]!*p.y+m[5]!});const x=apply(mixed),y=apply(wanted);error=Math.max(error,Math.hypot(x.x-y.x,x.y-y.y));}
  }return error;
}
export const nativeSeatDescription=freezeDeep({version:BODY_VIEW_SEAT_VERSION,selection:BODY_VIEW_SEAT_SELECTION,fingerprint:hash({version:BODY_VIEW_SEAT_VERSION,supportClock:BODY_SOURCE_SEAT_CLOCK_VERSION,registration:nativeSeatRegistrationFingerprint,minimumArea:.25,lagMs:90,follow:.7,angleBound:18,uvOverlap:1.5,perimeter:'open-exterior-only',maskFillStroke:'none'}),
  correspondence:'library/topics/prehistoric-life/native-seat-v1/correspondence-v1.json',bindings:Object.fromEntries(Object.entries(registration.actors).map(([actor,c])=>[actor,{material:c.material,primary:c.primary,views:Object.fromEntries(Object.entries(c.views).map(([view,data])=>[view,{standing:data.standing,tileId:data.tileId,triangles:data.pieces.length,outlineVertices:data.outline.rest.length,minimumTriangleArea:data.minimumTriangleArea}]))}])),status:'registered-geometric-candidate',approved:false,productionReady:false,motionVerified:false,
  waist:'original upper torso/belt stays native; shared waist row pinned',surface:'one opaque fill and exterior outline; only internal standing/seated material blends; preserve PNG bytes/alpha',
  supportClockVersion:BODY_SOURCE_SEAT_CLOCK_VERSION,clock:'actual physical support transfer, original bone chains and sole offsets; sourceBody owns complete original supports/postures through explicitly continuous cuts; fixed matching native view only',
  limitations:['native seat art/UV/ink/cuff/identity and normal-speed motion await review','source support clock/occupancy through cuts and actor-role swaps is source-only; runtime equivalence and canonical tracer await tests','native left meshes have222/226 pieces; compile/seek cost and existing2MB scene cap require runtime verification, cap unchanged','no continuous body/head turns or new tool grasp registration','no physical cloth simulation or accepted final video']});
