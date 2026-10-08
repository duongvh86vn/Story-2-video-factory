import {z} from 'zod';
import {Id} from '../core/identifiers.js';

const Scalar=z.number().finite(),Point=z.object({x:Scalar.nonnegative(),y:Scalar.nonnegative()}).strict();
const Rect=z.object({x:Scalar.nonnegative(),y:Scalar.nonnegative(),width:Scalar.positive(),height:Scalar.positive()}).strict();
const Source=z.object({sha256:z.string().regex(/^[a-f0-9]{64}$/),width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192)}).strict();
const Polygon=z.array(Point).min(3).max(32),Curve=z.tuple([Point,Point,Point,Point]);
const Eye=z.object({center:Point,shift:Point,region:Polygon,glyph:Polygon,lid:Curve,strip:Rect,stroke:Scalar.positive().max(32)}).strict();
const Brow=z.object({center:Point,region:Polygon,glyph:Polygon,strip:Rect,up:Scalar.nonnegative().max(80),down:Scalar.nonnegative().max(80),tiltDeg:Scalar.nonnegative().max(30)}).strict();
const Emotions=z.object({mouth:z.object({flat:Curve,frown:Curve,repair:z.object({sourceId:Id,source:Source,strip:Rect}).strict()}).strict(),
  brows:z.object({'screen-left':Brow,'screen-right':Brow}).strict(),
}).strict();
const Shape=z.object({version:z.enum(['native-head-face-1','native-head-face-2']),source:Source,
  mouth:z.object({kind:z.enum(['skin-strip','native-rim']),region:Polygon,top:Curve,depth:Scalar.positive(),lift:Scalar.nonnegative(),stroke:Scalar.positive().max(32),strip:Rect.optional(),
    rest:z.object({sourceId:Id,source:Source,scale:Scalar.positive().max(2),offset:z.object({x:Scalar,y:Scalar}).strict()}).strict().optional(),
  }).strict(),
  eyes:z.object({'screen-left':Eye,'screen-right':Eye}).strict(),protectedContours:z.array(Polygon).min(1).max(8),
  emotions:Emotions.optional(),
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
  if((f.version==='native-head-face-2')!==('emotions' in f&&f.emotions!==undefined))fail('face2 requires its own complete emotions; face1 forbids emotion fields');
  const full={x:0,y:0,width:f.source.width,height:f.source.height};
  if(f.source.width*f.source.height>20_000_000||!corners(crop).every(p=>p.x>=0&&p.y>=0&&p.x<=full.width&&p.y<=full.height))fail('crop outside face source');
  const brows=f.emotions?slots.map(s=>f.emotions!.brows[s]):[];
  const edits=[f.mouth.region,...slots.map(s=>f.eyes[s].region),...brows.map(b=>b.region)],polygons=[...edits,...slots.map(s=>f.eyes[s].glyph),...brows.map(b=>b.glyph),...f.protectedContours];
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
  if(f.emotions){
    const emotion=f.emotions,repair=emotion.mouth.repair;
    if(!rectWithin(repair.strip,{x:0,y:0,width:repair.source.width,height:repair.source.height})||repair.source.width*repair.source.height>20_000_000)fail('emotion repair strip leaves its explicit source');
    if(repair.source.sha256===f.source.sha256&&(!rectWithin(repair.strip,crop)||edits.some(p=>overlap(corners(repair.strip),p))||f.protectedContours.some(p=>overlap(corners(repair.strip),p))))fail('emotion repair samples facial ink/protected paint');
    // The normalized smile/frown coefficients are nonnegative and sum to one
    // including the flat weight, even when smile+frown exceeds one. For fixed
    // aperture/round, emotionMouth and ALL mouthControls are affine in those
    // three curves (the round center is affine too). In aperture and round
    // they are multi-affine: the only product is aperture*round. Thus the
    // 3*2*2 vertex hull covers simultaneous mixed emotions, round and speech;
    // convex edit containment plus the fixed ink pad covers every intermediate.
    // Eye closure changes no mouth geometry.
    for(const top of [f.mouth.top,emotion.mouth.flat,emotion.mouth.frown]){
      if(top[0].x>=top[3].x)fail('emotion mouth endpoints reversed');
      for(const aperture of [0,1])for(const round of [0,1]){
        const shaped=emotionMouth(f,{brow:0,tilt:0,smile:0,frown:0,round,closure:0},aperture,top);
        for(const [key,points] of Object.entries(mouthControls(shaped,aperture))){const pad=key==='aperture'?f.mouth.stroke/2:0;
          if(!points.every(p=>corners({x:p.x-pad,y:p.y-pad,width:pad*2,height:pad*2}).every(inMouth)))fail('emotion mouth '+key+' hull/ink leaves its own region');
        }
      }
    }
    for(const b of brows){
      if(!contains(b.center,b.region)||!b.glyph.every(p=>contains(p,b.region))||!rectWithin(b.strip,crop)||edits.some(p=>overlap(corners(b.strip),p))||f.protectedContours.some(p=>overlap(corners(b.strip),p)))fail('brow pivot/strip differs from its own source geometry');
      // Axis extrema of each corner over the ENTIRE rotation interval, not
      // sampled endpoints. This bounds the clipped RASTER brow, including its
      // native painted ink; there is no added SVG brow stroke. The erase strip
      // remains static inside the original glyph mask, not on this transform.
      const angle=b.tiltDeg*Math.PI/180;
      for(const p of b.glyph){const x=p.x-b.center.x,y=p.y-b.center.y,angles=[-angle,angle];
        for(const axis of [Math.atan2(-y,x),Math.atan2(x,y)])for(let k=-2;k<=2;k++){const at=axis+k*Math.PI;if(at>=-angle&&at<=angle)angles.push(at);}
        const xs=angles.map(a=>b.center.x+x*Math.cos(a)-y*Math.sin(a)),ys=angles.map(a=>b.center.y+x*Math.sin(a)+y*Math.cos(a));
        if(!corners({x:Math.min(...xs),y:Math.min(...ys)-b.up,width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)+b.up+b.down}).every(q=>contains(q,b.region)))fail('brow rotation/shift hull leaves its own skin region');
      }
    }
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
export type NativeFaceEmotion={brow:number;tilt:number;smile:number;frown:number;round:number;closure:number};
export const NATIVE_FACE_REST_EMOTION:NativeFaceEmotion={brow:0,tilt:0,smile:1,frown:0,round:0,closure:0};
function emotionMouth(f:NativeHeadFace,e:NativeFaceEmotion,aperture:number,selected?:z.infer<typeof Curve>):NativeHeadFace{
  if(!f.emotions)return f;
  const bases=[f.emotions.mouth.flat,f.mouth.top,f.emotions.mouth.frown],total=Math.max(1,e.smile+e.frown),weights=[1-(e.smile+e.frown)/total,e.smile/total,e.frown/total];
  const top=selected??f.mouth.top.map((_,i)=>({x:bases.reduce((v,c,j)=>v+c[i]!.x*weights[j]!,0),y:bases.reduce((v,c,j)=>v+c[i]!.y*weights[j]!,0)})) as z.infer<typeof Curve>;
  const center=(top[0].x+top[3].x)/2,shrink=1-e.round*aperture*.35;
  return {...f,mouth:{...f.mouth,top:top.map(p=>({...p,x:center+(p.x-center)*shrink})) as z.infer<typeof Curve>}};
}
const browMatrix=(b:z.infer<typeof Brow>,vertical:number,tilt:number)=>{const a=tilt*b.tiltDeg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dy=vertical<0?vertical*b.up:vertical*b.down;
  return `matrix(${n(c)} ${n(s)} ${n(-s)} ${n(c)} ${n(b.center.x-c*b.center.x+s*b.center.y)} ${n(b.center.y-s*b.center.x-c*b.center.y+dy)})`;
};
/** Only local overlays; caller owns the one original head image/transform. */
export function nativeHeadFaceSvg(f:NativeHeadFace,imageId:string,prefix:string,restImageId?:string,emotionImageId?:string){
  NativeHeadFaceSchema.parse(f);id(imageId);id(prefix);if(f.mouth.rest&&!restImageId)throw new Error('needs-head-face-registration: missing closed-mouth image');if(restImageId)id(restImageId);
  // These internal patches sit over the same painted face. Generated paint is
  // often alpha252; make only the local sampled patch opaque to avoid showing
  // the old eye/open mouth through it. Raw PNG bytes remain unchanged.
  const opaque=prefix+'-opaque';
  if(f.emotions&&!emotionImageId)throw new Error('needs-head-face-registration: missing own emotion repair source');if(emotionImageId)id(emotionImageId);
  const sample=(strip:R,target:R,source=imageId)=>`<svg x="${target.x}" y="${target.y}" width="${target.width}" height="${target.height}" viewBox="${strip.x} ${strip.y} ${strip.width} ${strip.height}" preserveAspectRatio="none"><use href="#${source}" filter="url(#${opaque})"/></svg>`;
  const mouthId=prefix+'-mouth',paths=mouthPaths(f,0,prefix),rest=f.mouth.rest;
  const repair=rest?`<g transform="translate(${rest.offset.x} ${rest.offset.y}) scale(${rest.scale})"><use href="#${restImageId}" filter="url(#${opaque})"/></g>`:sample(f.mouth.strip!,regionBounds(f.mouth.region));
  const emotionRepair=f.emotions?`<g id="${mouthId}-emotion-repair" opacity="0">${sample(f.emotions.mouth.repair.strip,regionBounds(f.mouth.region),emotionImageId)}</g>`:'';
  const mouth=`<defs><clipPath id="${mouthId}-region"><path d="${polygon(f.mouth.region)}"/></clipPath><clipPath id="${mouthId}-inside"><use href="#${mouthId}-aperture"/></clipPath></defs><g id="${mouthId}-layer" opacity="${rest?1:0}" clip-path="url(#${mouthId}-region)">${repair}${emotionRepair}<g id="${mouthId}-generated" opacity="0"><path id="${mouthId}-aperture" d="${paths[mouthId+'-aperture']}" fill="#211008" stroke="#100804" stroke-width="${f.mouth.stroke}" stroke-linejoin="round"/><g clip-path="url(#${mouthId}-inside)"><path id="${mouthId}-teeth" d="${paths[mouthId+'-teeth']}" fill="#FFF8E9"/><path id="${mouthId}-tongue" d="${paths[mouthId+'-tongue']}" fill="#B3471F"/></g></g></g>`;
  const eyes=slots.map(side=>{const e=f.eyes[side],key=prefix+'-'+side;
    return `<defs><clipPath id="${key}-region"><path d="${polygon(e.region)}"/></clipPath><clipPath id="${key}-ink"><path d="${polygon(e.glyph)}"/></clipPath></defs><g clip-path="url(#${key}-region)">${sample(e.strip,regionBounds(e.region))}<g id="${key}-glyph"><g clip-path="url(#${key}-ink)"><use href="#${imageId}"/></g></g><g id="${key}-lid" opacity="0"><path d="${cubic(e.lid)}" fill="none" stroke="#100804" stroke-width="${e.stroke}" stroke-linecap="round"/></g></g>`;
  }).join('');
  const brows=f.emotions?slots.map(side=>{const b=f.emotions!.brows[side],key=prefix+'-brow-'+side;
    return `<defs><clipPath id="${key}-region"><path d="${polygon(b.region)}"/></clipPath><clipPath id="${key}-ink"><path d="${polygon(b.glyph)}"/></clipPath></defs><g id="${key}-layer" opacity="0" clip-path="url(#${key}-region)"><g clip-path="url(#${key}-ink)">${sample(b.strip,regionBounds(b.glyph))}</g><g id="${key}-glyph"><g clip-path="url(#${key}-ink)"><use href="#${imageId}" filter="url(#${prefix}-brow-ink)"/></g></g></g>`;
  }).join(''):'';
  const ink=f.emotions?`<filter id="${prefix}-brow-ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -1.2 -2.4 -.4 0 2"/></filter>`:'';
  return `<defs><filter id="${opaque}" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer></filter>${ink}</defs>${mouth}<g id="${prefix}-eyes-layer" opacity="0">${eyes}</g>${brows}`;
}
export type NativeFaceState={face:Record<string,{opacity?:number;attr?:{transform?:string}}>;paths:Record<string,string>};
export function nativeHeadFaceState(f:NativeHeadFace,input:{aperture:number;blink:number;look:{x:number;y:number};emotion?:NativeFaceEmotion},prefix:string):NativeFaceState{
  NativeHeadFaceSchema.parse(f);id(prefix);const {aperture,blink,look}=input;
  if(![aperture,blink,look.x,look.y].every(Number.isFinite)||aperture<0||aperture>1||blink<0||blink>1||Math.abs(look.x)>1||Math.abs(look.y)>1)throw new Error('needs-head-face-registration: invalid bounded face state');
  const emotion=input.emotion??NATIVE_FACE_REST_EMOTION;
  if(input.emotion&&!f.emotions)throw new Error('needs-head-turn-expression: own face2 emotion registration required');
  if(!Object.values(emotion).every(Number.isFinite)||Math.abs(emotion.brow)>1||Math.abs(emotion.tilt)>1||[emotion.smile,emotion.frown,emotion.round,emotion.closure].some(v=>v<0||v>1))throw new Error('needs-head-turn-expression: invalid bounded emotion state');
  const closure=Math.max(blink,f.emotions?emotion.closure:0),on=(v:number)=>v>1e-7?1:0,
    changed=f.emotions?on(1-emotion.smile+emotion.frown):0,mouthVisible=f.emotions?Math.max(changed,on(aperture)):ease(aperture/.08);
  // Erase native ink fully BEFORE moving its local replacement. Fading the
  // repair and replacement over the still-visible native glyph creates two
  // eyes/brows/mouth contours. Face2 painter switches are discrete in compiler;
  // only local paths and glyph matrices interpolate. Face1 retains its output.
  const face:NativeFaceState['face']={[prefix+'-mouth-layer']:{opacity:f.mouth.rest?1:mouthVisible},[prefix+'-mouth-generated']:{opacity:mouthVisible},[prefix+'-eyes-layer']:{opacity:f.emotions?on(Math.max(Math.abs(look.x),Math.abs(look.y),closure)):ease(Math.max(Math.abs(look.x),Math.abs(look.y),closure)/.025)}};
  for(const side of slots){const e=f.eyes[side],key=prefix+'-'+side,dx=look.x*e.shift.x,dy=look.y*e.shift.y;
    const open=Math.max(.02,1-closure);
    face[key+'-glyph']={opacity:1-ease((closure-.7)/.3),attr:{transform:`matrix(1 0 0 ${n(open)} ${n(dx)} ${n(e.center.y*(1-open)+dy)})`}};
    face[key+'-lid']={opacity:ease((closure-.4)/.6),attr:{transform:`translate(${n(dx)} ${n(dy)})`}};
  }
  if(f.emotions){face[prefix+'-mouth-emotion-repair']={opacity:mouthVisible};
    for(const [i,side] of slots.entries()){const key=prefix+'-brow-'+side;
      face[key+'-layer']={opacity:on(Math.max(Math.abs(emotion.brow),Math.abs(emotion.tilt)))};
      face[key+'-glyph']={attr:{transform:browMatrix(f.emotions.brows[side],emotion.brow,(i?1:-1)*emotion.tilt)}};
    }
  }
  return {face,paths:mouthPaths(emotionMouth(f,emotion,aperture),aperture,prefix)};
}
/** Exact affine interpolation error at registered glyph corners, source pixels. */
export function nativeHeadFaceMatrixError(f:NativeHeadFace,prefix:string,from:NativeFaceState['face'],to:NativeFaceState['face'],wanted:NativeFaceState['face'],progress:number){
  if(!Number.isFinite(progress)||progress<0||progress>1)throw new Error('Invalid native face interpolation');let error=0;
  for(const side of slots)for(const suffix of ['glyph','lid']){const key=prefix+'-'+side+'-'+suffix;
    const values=(state:typeof from)=>{const raw=state[key]?.attr?.transform,match=raw?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);if(!match||(suffix==='glyph'?match.length!==6:match.length!==2)||match.some(v=>!Number.isFinite(v)))throw new Error('Missing native face matrix');return suffix==='glyph'?match:[1,0,0,1,...match];};
    const a=values(from),b=values(to),actual=values(wanted),blend=a.map((v,i)=>v+(b[i]!-v)*progress);
    const points=suffix==='glyph'?f.eyes[side].glyph:f.eyes[side].lid.flatMap(p=>corners({x:p.x-f.eyes[side].stroke/2,y:p.y-f.eyes[side].stroke/2,width:f.eyes[side].stroke,height:f.eyes[side].stroke}));
    // Lids translate without rotation/scale, so the error is point-independent;
    // use their own stroke/control hull explicitly rather than unrelated glyphs.
    for(const p of points){const point=(m:number[])=>({x:m[0]!*p.x+m[2]!*p.y+m[4]!,y:m[1]!*p.x+m[3]!*p.y+m[5]!}),x=point(blend),y=point(actual);error=Math.max(error,Math.hypot(x.x-y.x,x.y-y.y));}
  }
  if(f.emotions)for(const side of slots){const key=prefix+'-brow-'+side+'-glyph',values=(state:typeof from)=>{const m=state[key]?.attr?.transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);if(!m||m.length!==6||m.some(v=>!Number.isFinite(v)))throw new Error('Missing native brow matrix');return m;};
    const a=values(from),b=values(to),actual=values(wanted),blend=a.map((v,i)=>v+(b[i]!-v)*progress);
    for(const p of f.emotions.brows[side].glyph){const at=(m:number[])=>({x:m[0]!*p.x+m[2]!*p.y+m[4]!,y:m[1]!*p.x+m[3]!*p.y+m[5]!}),x=at(blend),y=at(actual);error=Math.max(error,Math.hypot(x.x-y.x,x.y-y.y));}
  }
  return error;
}
