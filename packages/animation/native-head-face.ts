import {z} from 'zod';
import {Id} from '../core/identifiers.js';

const Scalar=z.number().finite(),Point=z.object({x:Scalar.nonnegative(),y:Scalar.nonnegative()}).strict();
const Rect=z.object({x:Scalar.nonnegative(),y:Scalar.nonnegative(),width:Scalar.positive(),height:Scalar.positive()}).strict();
const Source=z.object({sha256:z.string().regex(/^[a-f0-9]{64}$/),width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192)}).strict();
const Polygon=z.array(Point).min(3).max(32),Curve=z.tuple([Point,Point,Point,Point]);
const Eye=z.object({center:Point,shift:Point,region:Polygon,glyph:Polygon,lid:Curve,strip:Rect,stroke:Scalar.positive().max(32)}).strict();
const Shape=z.object({version:z.literal('native-head-face-1'),source:Source,
  mouth:z.object({kind:z.enum(['skin-strip','native-rim']),region:Polygon,top:Curve,depth:Scalar.positive(),lift:Scalar.nonnegative(),stroke:Scalar.positive().max(32),strip:Rect.optional(),
    rest:z.object({sourceId:Id,source:Source,scale:Scalar.positive().max(2),offset:z.object({x:Scalar,y:Scalar}).strict()}).strict().optional(),
  }).strict(),
  eyes:z.object({'screen-left':Eye,'screen-right':Eye}).strict(),protectedContours:z.array(Polygon).min(1).max(8),
  status:z.literal('engineering-face-registration'),approved:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),
}).strict();
type P=z.infer<typeof Point>;type R=z.infer<typeof Rect>;
export type NativeHeadFace=z.infer<typeof Shape>;
const slots=['screen-left','screen-right'] as const,epsilon=1e-7;
const cross=(a:P,b:P,c:P)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const segment=(p:P,a:P,b:P)=>Math.abs(cross(a,b,p))<=epsilon&&p.x>=Math.min(a.x,b.x)-epsilon&&p.x<=Math.max(a.x,b.x)+epsilon&&p.y>=Math.min(a.y,b.y)-epsilon&&p.y<=Math.max(a.y,b.y)+epsilon;
const intersects=(a:P,b:P,c:P,d:P)=>segment(a,c,d)||segment(b,c,d)||segment(c,a,b)||segment(d,a,b)||(cross(a,b,c)>0)!==(cross(a,b,d)>0)&&(cross(c,d,a)>0)!==(cross(c,d,b)>0);
function contains(p:P,poly:P[]){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i]!,b=poly[j]!;if(segment(p,a,b))return true;
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
}return inside;}
function simple(poly:P[]){let area=0;for(let i=0;i<poly.length;i++){
  const a=poly[i]!,b=poly[(i+1)%poly.length]!,prior=poly[(i+poly.length-1)%poly.length]!;
  if(Math.hypot(a.x-b.x,a.y-b.y)<=epsilon||Math.abs(cross(prior,a,b))<=epsilon&&(prior.x-a.x)*(b.x-a.x)+(prior.y-a.y)*(b.y-a.y)>epsilon)return false;
  area+=a.x*b.y-b.x*a.y;for(let j=i+1;j<poly.length;j++)if(j!==i+1&&!(i===0&&j===poly.length-1)&&intersects(a,b,poly[j]!,poly[(j+1)%poly.length]!))return false;
}return Math.abs(area)>epsilon;}
function convex(poly:P[]){let sign=0;for(let i=0;i<poly.length;i++){const next=Math.sign(cross(poly[i]!,poly[(i+1)%poly.length]!,poly[(i+2)%poly.length]!));if(next&&sign&&next!==sign)return false;if(next)sign=next;}return !!sign;}
const overlap=(a:P[],b:P[])=>a.some(p=>contains(p,b))||b.some(p=>contains(p,a))||a.some((p,i)=>b.some((q,j)=>intersects(p,a[(i+1)%a.length]!,q,b[(j+1)%b.length]!)));
const corners=(r:R):P[]=>[{x:r.x,y:r.y},{x:r.x+r.width,y:r.y},{x:r.x+r.width,y:r.y+r.height},{x:r.x,y:r.y+r.height}];
const within=(p:P,r:R)=>p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height;
const rectWithin=(r:R,b:R)=>r.x>=b.x&&r.y>=b.y&&r.x+r.width<=b.x+b.width&&r.y+r.height<=b.y+b.height;
function geometry(f:NativeHeadFace,crop:R){
  const fail=(reason:string):never=>{throw new Error('needs-head-face-registration: '+reason);};
  const full={x:0,y:0,width:f.source.width,height:f.source.height};
  if(f.source.width*f.source.height>20_000_000||!corners(crop).every(p=>p.x>=0&&p.y>=0&&p.x<=full.width&&p.y<=full.height))fail('crop outside face source');
  const edits=[f.mouth.region,...slots.map(s=>f.eyes[s].region)],polygons=[...edits,...slots.map(s=>f.eyes[s].glyph),...f.protectedContours];
  for(const poly of polygons)if(!simple(poly)||!poly.every(p=>within(p,full)&&within(p,crop)))fail('polygon is invalid or leaves source/crop');
  if(edits.some(p=>!convex(p)))fail('edit region must be convex to bound all Bezier/transform intermediates');
  for(let i=0;i<edits.length;i++)if(edits.slice(i+1).some(p=>overlap(edits[i]!,p))||f.protectedContours.some(p=>overlap(edits[i]!,p)))fail('edit region touches another edit or protected paint');
  const inMouth=(p:P)=>contains(p,f.mouth.region);
  const [left,,,right]=f.mouth.top;
  if(left.x>=right.x)fail('mouth endpoints reversed');
  // Every generated control point is affine in aperture. A convex edit region
  // containing both extrema contains all intermediate curves and their ink.
  for(const amount of [0,1])for(const [key,points] of Object.entries(mouthControls(f,amount))){const pad=key==='aperture'?f.mouth.stroke/2:0;
    if(!points.every(p=>corners({x:p.x-pad,y:p.y-pad,width:pad*2,height:pad*2}).every(inMouth)))fail('generated mouth '+key+' hull/ink leaves its own region');
  }
  const strips=[...slots.map(s=>f.eyes[s].strip),...(f.mouth.strip?[f.mouth.strip]:[])];
  for(const strip of strips)if(!rectWithin(strip,full)||!rectWithin(strip,crop)||edits.some(p=>overlap(corners(strip),p)))fail('source strip leaves crop or samples edited facial paint');
  for(const side of slots){const e=f.eyes[side];
    if(!contains(e.center,e.glyph)||!e.lid.every(p=>contains(p,e.region)))fail('eye center/lid differs from its local geometry');
    for(const sy of [0,1])for(const dx of [-e.shift.x,e.shift.x])for(const dy of [-e.shift.y,e.shift.y])if(![...e.glyph,...e.lid].every(p=>contains({x:p.x+dx,y:e.center.y+(p.y-e.center.y)*sy+dy},e.region)))fail('eye shift/blink hull leaves its region');
    for(const dx of [-e.shift.x,e.shift.x])for(const dy of [-e.shift.y,e.shift.y])if(!e.lid.every(p=>corners({x:p.x+dx-e.stroke/2,y:p.y+dy-e.stroke/2,width:e.stroke,height:e.stroke}).every(q=>contains(q,e.region))))fail('lid stroke leaves its eye region');
  }
  if(f.eyes['screen-left'].center.x>=f.eyes['screen-right'].center.x)fail('screen-coordinate eyes are swapped');
  if(f.mouth.kind==='skin-strip'&&(!f.mouth.strip||f.mouth.rest)||f.mouth.kind==='native-rim'&&(!f.mouth.rest||f.mouth.strip))fail('mouth requires its own cheek strip or explicit closed-mouth plate');
  if(f.mouth.rest){const r=f.mouth.rest;if(r.source.sha256===f.source.sha256||r.source.width*r.source.height>20_000_000)fail('rest plate must be a separate bounded source');
    if(!f.mouth.region.every(p=>within({x:(p.x-r.offset.x)/r.scale,y:(p.y-r.offset.y)/r.scale},{x:0,y:0,width:r.source.width,height:r.source.height})))fail('rest plate does not cover its target mouth region');
  }
}
export const NativeHeadFaceSchema=Shape.superRefine((f,ctx)=>{try{geometry(f,{x:0,y:0,width:f.source.width,height:f.source.height});}catch(error){ctx.addIssue({code:'custom',message:error instanceof Error?error.message:String(error)});}});
export function validateNativeHeadFace(value:NativeHeadFace,source:z.infer<typeof Source>,crop:R){
  const f=NativeHeadFaceSchema.parse(value);if(f.source.sha256!==source.sha256||f.source.width!==source.width||f.source.height!==source.height)throw new Error('needs-head-face-registration: face source identity mismatch');geometry(f,Rect.parse(crop));
}
const id=(s:string)=>{if(!/^[a-zA-Z_][a-zA-Z0-9_-]{0,100}$/.test(s))throw new Error('Unsafe face SVG identifier');return s;};
const n=(v:number)=>Number(v.toFixed(5));
const point=(p:P)=>`${n(p.x)} ${n(p.y)}`;
const polygon=(p:P[])=>`M${p.map(point).join('L')}Z`;
const cubic=(p:readonly P[])=>`M${point(p[0]!)}C${point(p[1]!)} ${point(p[2]!)} ${point(p[3]!)}`;
const closed=(p:readonly P[])=>`${cubic(p)}C${point(p[4]!)} ${point(p[5]!)} ${point(p[0]!)}Z`;
const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*t*(t*(t*6-15)+10);};
const regionBounds=(poly:P[])=>({x:Math.min(...poly.map(p=>p.x)),y:Math.min(...poly.map(p=>p.y)),width:Math.max(...poly.map(p=>p.x))-Math.min(...poly.map(p=>p.x)),height:Math.max(...poly.map(p=>p.y))-Math.min(...poly.map(p=>p.y))});
function mouthControls(f:NativeHeadFace,amount:number){
  const [l,a,b,r]=f.mouth.top,u={x:a.x,y:a.y-f.mouth.lift*amount},v={x:b.x,y:b.y-f.mouth.lift*amount},depth=f.mouth.depth*amount;
  const curve=(t:number)=>({x:(1-t)**3*l.x+3*(1-t)**2*t*u.x+3*(1-t)*t*t*v.x+t**3*r.x,y:(1-t)**3*l.y+3*(1-t)**2*t*u.y+3*(1-t)*t*t*v.y+t**3*r.y});
  const derivative=(t:number)=>({x:3*(1-t)**2*(u.x-l.x)+6*(1-t)*t*(v.x-u.x)+3*t*t*(r.x-v.x),y:3*(1-t)**2*(u.y-l.y)+6*(1-t)*t*(v.y-u.y)+3*t*t*(r.y-v.y)});
  const tl=curve(.12),tr=curve(.88),dl=derivative(.12),dr=derivative(.88),ta={x:tl.x+dl.x*.76/3,y:tl.y+dl.y*.76/3},tb={x:tr.x-dr.x*.76/3,y:tr.y-dr.y*.76/3},thickness=depth*.18;
  const tongueTop=curve(.4),tongueRight=curve(.66),tongueY=(u.y+v.y)/2+depth*.72;
  return {aperture:[l,u,v,r,{x:v.x,y:v.y+depth},{x:u.x,y:u.y+depth}],
    teeth:[tl,ta,tb,tr,{x:tb.x,y:tb.y+thickness},{x:ta.x,y:ta.y+thickness}],
    tongue:[{x:tongueTop.x,y:tongueY},{x:tongueTop.x,y:tongueY-depth*.12},{x:tongueRight.x,y:tongueY-depth*.12},{x:tongueRight.x,y:tongueY},{x:tongueRight.x,y:tongueY+depth*.1},{x:tongueTop.x,y:tongueY+depth*.1}]};
}
function mouthPaths(f:NativeHeadFace,amount:number,prefix:string){
  return Object.fromEntries(Object.entries(mouthControls(f,amount)).map(([key,points])=>[prefix+'-mouth-'+key,closed(points)]));
}
/** Only local overlays; caller owns the one original head image/transform. */
export function nativeHeadFaceSvg(f:NativeHeadFace,imageId:string,prefix:string,restImageId?:string){
  NativeHeadFaceSchema.parse(f);id(imageId);id(prefix);if(f.mouth.rest&&!restImageId)throw new Error('needs-head-face-registration: missing closed-mouth image');if(restImageId)id(restImageId);
  // These internal patches sit over the same painted face. Generated paint is
  // often alpha252; make only the local sampled patch opaque to avoid showing
  // the old eye/open mouth through it. Raw PNG bytes remain unchanged.
  const opaque=prefix+'-opaque';
  const sample=(strip:R,target:R)=>`<svg x="${target.x}" y="${target.y}" width="${target.width}" height="${target.height}" viewBox="${strip.x} ${strip.y} ${strip.width} ${strip.height}" preserveAspectRatio="none"><use href="#${imageId}" filter="url(#${opaque})"/></svg>`;
  const mouthId=prefix+'-mouth',paths=mouthPaths(f,0,prefix),rest=f.mouth.rest;
  const repair=rest?`<g transform="translate(${rest.offset.x} ${rest.offset.y}) scale(${rest.scale})"><use href="#${restImageId}" filter="url(#${opaque})"/></g>`:sample(f.mouth.strip!,regionBounds(f.mouth.region));
  const mouth=`<defs><clipPath id="${mouthId}-region"><path d="${polygon(f.mouth.region)}"/></clipPath><clipPath id="${mouthId}-inside"><use href="#${mouthId}-aperture"/></clipPath></defs><g id="${mouthId}-layer" opacity="${rest?1:0}" clip-path="url(#${mouthId}-region)">${repair}<g id="${mouthId}-generated" opacity="0"><path id="${mouthId}-aperture" d="${paths[mouthId+'-aperture']}" fill="#211008" stroke="#100804" stroke-width="${f.mouth.stroke}" stroke-linejoin="round"/><g clip-path="url(#${mouthId}-inside)"><path id="${mouthId}-teeth" d="${paths[mouthId+'-teeth']}" fill="#FFF8E9"/><path id="${mouthId}-tongue" d="${paths[mouthId+'-tongue']}" fill="#B3471F"/></g></g></g>`;
  const eyes=slots.map(side=>{const e=f.eyes[side],key=prefix+'-'+side;
    return `<defs><clipPath id="${key}-region"><path d="${polygon(e.region)}"/></clipPath><clipPath id="${key}-ink"><path d="${polygon(e.glyph)}"/></clipPath></defs><g clip-path="url(#${key}-region)">${sample(e.strip,regionBounds(e.region))}<g id="${key}-glyph"><g clip-path="url(#${key}-ink)"><use href="#${imageId}"/></g></g><g id="${key}-lid" opacity="0"><path d="${cubic(e.lid)}" fill="none" stroke="#100804" stroke-width="${e.stroke}" stroke-linecap="round"/></g></g>`;
  }).join('');
  return `<defs><filter id="${opaque}" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer></filter></defs>${mouth}<g id="${prefix}-eyes-layer" opacity="0">${eyes}</g>`;
}
export type NativeFaceState={face:Record<string,{opacity?:number;attr?:{transform?:string}}>;paths:Record<string,string>};
export function nativeHeadFaceState(f:NativeHeadFace,input:{aperture:number;blink:number;look:{x:number;y:number}},prefix:string):NativeFaceState{
  NativeHeadFaceSchema.parse(f);id(prefix);const {aperture,blink,look}=input;
  if(![aperture,blink,look.x,look.y].every(Number.isFinite)||aperture<0||aperture>1||blink<0||blink>1||Math.abs(look.x)>1||Math.abs(look.y)>1)throw new Error('needs-head-face-registration: invalid bounded face state');
  const face:NativeFaceState['face']={[prefix+'-mouth-layer']:{opacity:f.mouth.rest?1:ease(aperture/.08)},[prefix+'-mouth-generated']:{opacity:ease(aperture/.08)},[prefix+'-eyes-layer']:{opacity:ease(Math.max(Math.abs(look.x),Math.abs(look.y),blink)/.025)}};
  for(const side of slots){const e=f.eyes[side],key=prefix+'-'+side,dx=look.x*e.shift.x,dy=look.y*e.shift.y,sy=Math.max(.02,1-blink);
    face[key+'-glyph']={opacity:1-ease((blink-.7)/.3),attr:{transform:`matrix(1 0 0 ${n(sy)} ${n(dx)} ${n(e.center.y*(1-sy)+dy)})`}};
    face[key+'-lid']={opacity:ease((blink-.4)/.6),attr:{transform:`translate(${n(dx)} ${n(dy)})`}};
  }
  return {face,paths:mouthPaths(f,aperture,prefix)};
}
/** Exact affine interpolation error at registered glyph corners, source pixels. */
export function nativeHeadFaceMatrixError(f:NativeHeadFace,prefix:string,from:NativeFaceState['face'],to:NativeFaceState['face'],wanted:NativeFaceState['face'],progress:number){
  if(!Number.isFinite(progress)||progress<0||progress>1)throw new Error('Invalid native face interpolation');let error=0;
  for(const side of slots)for(const suffix of ['glyph','lid']){const key=prefix+'-'+side+'-'+suffix;
    const values=(state:typeof from)=>{const raw=state[key]?.attr?.transform,match=raw?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);if(!match||(suffix==='glyph'?match.length!==6:match.length!==2)||match.some(v=>!Number.isFinite(v)))throw new Error('Missing native face matrix');return suffix==='glyph'?match:[1,0,0,1,...match];};
    const a=values(from),b=values(to),actual=values(wanted),blend=a.map((v,i)=>v+(b[i]!-v)*progress);
    for(const p of f.eyes[side].glyph){const point=(m:number[])=>({x:m[0]!*p.x+m[2]!*p.y+m[4]!,y:m[1]!*p.x+m[3]!*p.y+m[5]!}),x=point(blend),y=point(actual);error=Math.max(error,Math.hypot(x.x-y.x,x.y-y.y));}
  }return error;
}
