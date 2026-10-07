import type {HostProfile} from '../host/schemas.js';
import {hash} from '../core/utils.js';

export const BODY_VIEW_EYES_SELECTION='registered-eyes-v1' as const;
export const BODY_VIEW_EYES_VERSION='forest-native-view-eyes-1';
type Point={x:number;y:number};
export type EyeSlot='screen-left'|'screen-right';
type Eye={center:Point;rx:number;ry:number;shift:Point;bounds:{x:number;y:number;width:number;height:number};
  strip:{x:number;y:number;width:number;height:number};region?:string;glyph?:string;lid?:string};
type Registration={sourceHash:string;sourceSize:readonly [number,number];eyes:readonly [Eye,Eye]};
/** Screen slots only, never anatomical hand labels. Manual native eye/skin
 * regions from the exact PNG; the left Karo eye touches the nose, so its edit
 * region excludes the nose with a diagonal lower edge. No whole-face warp. */
export const bodyViewEyesRegistration={
  lila:{
    'three-quarter-right':{sourceHash:'c11b0aeddf06e42d0e8363df9167c87fc4a94262606565a0c1bee55c950e43a9',sourceSize:[1173,1341],eyes:[
      {center:{x:675.5,y:315},rx:12.5,ry:20,shift:{x:6,y:3},bounds:{x:655,y:292,width:42,height:46},strip:{x:655,y:341,width:42,height:3}},
      {center:{x:765,y:303.5},rx:10.5,ry:18.5,shift:{x:4,y:2},bounds:{x:749,y:281,width:33,height:44},strip:{x:749,y:323,width:33,height:2}},
    ]},
    'three-quarter-left':{sourceHash:'ef90f6783d89a8e554c12605065a218faf4e0f6aae4411ae00cccf6825b686bf',sourceSize:[1024,1536],eyes:[
      {center:{x:363,y:333},rx:8.5,ry:17,shift:{x:3,y:2},bounds:{x:350,y:313,width:27,height:40},strip:{x:350,y:351,width:27,height:2}},
      {center:{x:432,y:336.5},rx:11.5,ry:18.5,shift:{x:5,y:3},bounds:{x:414,y:314,width:37,height:46},strip:{x:414,y:357,width:37,height:3}},
    ]},
  },
  karo:{
    'three-quarter-right':{sourceHash:'eefa90341b6a39138b163c173b3d6072b56c4bed4015bd431345691e8088e182',sourceSize:[910,1729],eyes:[
      {center:{x:538.5,y:349},rx:14,ry:22,shift:{x:6,y:3},bounds:{x:517,y:323,width:43,height:52},strip:{x:517,y:372,width:43,height:3}},
      {center:{x:638,y:336},rx:10.5,ry:20,shift:{x:4,y:2},bounds:{x:623,y:313,width:31,height:45},strip:{x:623,y:356,width:31,height:2}},
    ]},
    'three-quarter-left':{sourceHash:'bfcffe1fac13281de68ca11910407bb22fde02f8f5f5d867054713399166fdf4',sourceSize:[910,1729],eyes:[
      {center:{x:333,y:355},rx:13,ry:23,shift:{x:3,y:2},bounds:{x:313,y:329,width:41,height:49},strip:{x:324,y:320,width:25,height:4},
        region:'M313 329H354V368L325 378H313Z',glyph:'M337 331C346 332 348 349 343 363C340 373 333 378 328 375C321 373 319 361 322 348C325 337 330 330 337 331Z',lid:'M322 356C328 360 335 359 342 352'},
      {center:{x:439,y:362},rx:16,ry:24,shift:{x:7,y:4},bounds:{x:414,y:334,width:50,height:57},strip:{x:414,y:388,width:50,height:3}},
    ]},
  },
} as const satisfies Record<'lila'|'karo',Record<'three-quarter-left'|'three-quarter-right',Registration>>;
export function hasBodyViewEyes(profile:Pick<HostProfile,'appearance'>){return profile.appearance.bodyEyes===BODY_VIEW_EYES_SELECTION;}
export function registeredBodyViewEyes(profile:Pick<HostProfile,'appearance'>,sourceHash?:string):Registration{
  const a=profile.appearance;
  if(!hasBodyViewEyes(profile)||a.artworkVersion!=='forest-body-view-1'||!a.characterVariant||!a.bodyView||a.sourceColour)throw new Error('needs-view-eyes: eye candidate requires its registered actor/body view');
  const c=bodyViewEyesRegistration[a.characterVariant]?.[a.bodyView];
  if(!c||sourceHash!==undefined&&sourceHash!==c.sourceHash)throw new Error('needs-view-eyes: eye coordinates do not match the native view image');
  return c;
}
const n=(value:number)=>Number(value.toFixed(5));
const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*t*(t*(t*6-15)+10);};
const ellipse=(e:Eye)=>{const {x,y}=e.center,k=.55228475,rx=e.rx,ry=e.ry;
  return `M${x+rx} ${y}C${x+rx} ${n(y+ry*k)} ${n(x+rx*k)} ${y+ry} ${x} ${y+ry}C${n(x-rx*k)} ${y+ry} ${x-rx} ${n(y+ry*k)} ${x-rx} ${y}C${x-rx} ${n(y-ry*k)} ${n(x-rx*k)} ${y-ry} ${x} ${y-ry}C${n(x+rx*k)} ${y-ry} ${x+rx} ${n(y-ry*k)} ${x+rx} ${y}Z`;};
/** Pure native SVG art authoring; no animation clock/pose/audio evaluation. */
export function bodyViewEyesSvg(profile:Pick<HostProfile,'appearance'>,source:{sha256:string;width:number;height:number;url:string}):string{
  if(!hasBodyViewEyes(profile))return '';
  const c=registeredBodyViewEyes(profile,source.sha256);
  if(source.width!==c.sourceSize[0]||source.height!==c.sourceSize[1])throw new Error('Invalid eye source dimensions');
  if(source.url!=='assets/rigs/'+c.sourceHash+'.png'&&!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(source.url))throw new Error('Unapproved eye image URL');
  const image=`<image width="${source.width}" height="${source.height}" href="${source.url}"/>`;
  const eyes=c.eyes.map((e,i)=>{const id='view-eye-'+(i?'screen-right':'screen-left'),q=e.bounds,s=e.strip,{x,y}=e.center;
    const region=e.region??`M${q.x} ${q.y}H${q.x+q.width}V${q.y+q.height}H${q.x}Z`,glyph=e.glyph??ellipse(e),lid=e.lid??`M${x-e.rx} ${y}C${x-e.rx*.45} ${y+4} ${x+e.rx*.45} ${y+4} ${x+e.rx} ${y}`;
    return `<defs><clipPath id="${id}-region"><path d="${region}"/></clipPath><clipPath id="${id}-glyph-clip"><path d="${glyph}"/></clipPath></defs><g clip-path="url(#${id}-region)"><svg x="${q.x}" y="${q.y}" width="${q.width}" height="${q.height}" viewBox="${s.x} ${s.y} ${s.width} ${s.height}" preserveAspectRatio="none">${image}</svg><g id="${id}-glyph"><g clip-path="url(#${id}-glyph-clip)">${image}</g></g><g id="${id}-lid" opacity="0"><path d="${lid}" fill="none" stroke="#100B06" stroke-width="3" stroke-linecap="round"/></g></g>`;
  });
  return `<g id="view-eyes-layer" opacity="0" data-eyes-artwork="${BODY_VIEW_EYES_VERSION}">${eyes.join('')}</g>`;
}
/** Bounded shape/transform authoring shared by static documents and sampler.
 * Input is a head-local normalized direction, not an inferred speaker/target. */
export function bodyViewEyesState(c:Registration,look:Point,blink:number){
  if(!Number.isFinite(look.x)||!Number.isFinite(look.y)||Math.abs(look.x)>1||Math.abs(look.y)>1||!Number.isFinite(blink)||blink<0||blink>1)throw new Error('needs-view-eyes: invalid bounded look/blink');
  const face:Record<string,{opacity?:number;attr?:{transform:string}}>={'view-eyes-layer':{opacity:ease(Math.max(Math.abs(look.x),Math.abs(look.y),blink)/.025)}};
  for(const [i,e] of c.eyes.entries()){const id='view-eye-'+(i?'screen-right':'screen-left'),dx=look.x*e.shift.x,dy=look.y*e.shift.y,sy=Math.max(.02,1-blink);
    face[id+'-glyph']={opacity:1-ease((blink-.7)/.3),attr:{transform:`matrix(1 0 0 ${n(sy)} ${n(dx)} ${n(e.center.y*(1-sy)+dy)})`}};
    face[id+'-lid']={opacity:ease((blink-.4)/.6),attr:{transform:`translate(${n(dx)} ${n(dy)})`}};
  }
  return {face};
}
/** Native-space bound on string-matrix interpolation, at the eye's corners.
 * Translation caused by scaling about cy cancels here; checking its raw large
 * coefficient alone would over-refine while missing the visible error. */
export function bodyViewEyesMatrixError(c:Registration,from:Record<string,{attr?:{transform?:string}}>,to:Record<string,{attr?:{transform?:string}}>,wanted:Record<string,{attr?:{transform?:string}}>,progress:number):number{
  if(!Number.isFinite(progress)||progress<0||progress>1)throw new Error('needs-view-eyes: invalid interpolation progress');
  let error=0;
  for(const [i,e] of c.eyes.entries())for(const suffix of ['glyph','lid']){
    const id='view-eye-'+(i?'screen-right':'screen-left')+'-'+suffix;
    const numbers=(face:typeof from)=>{const value=face[id]?.attr?.transform;if(!value)throw new Error('needs-view-eyes: missing native eye transform');
      const m=value.match(/-?\d+(?:\.\d+)?/g)?.map(Number);if(!m||(suffix==='glyph'?m.length!==6:m.length!==2))throw new Error('needs-view-eyes: invalid native eye transform');return suffix==='glyph'?m:[1,0,0,1,...m];};
    const a=numbers(from),b=numbers(to),actual=numbers(wanted),blend=a.map((v,j)=>v+(b[j]!-v)*progress);
    for(const x of [e.center.x-e.rx,e.center.x+e.rx])for(const y of [e.center.y-e.ry,e.center.y+e.ry]){
      const point=(m:number[])=>({x:m[0]!*x+m[2]!*y+m[4]!,y:m[1]!*x+m[3]!*y+m[5]!}),p=point(blend),q=point(actual);
      error=Math.max(error,Math.hypot(p.x-q.x,p.y-q.y));
    }
  }
  return error;
}
export const bodyViewEyesDescription={version:BODY_VIEW_EYES_VERSION,selection:BODY_VIEW_EYES_SELECTION,registrations:bodyViewEyesRegistration,
  fingerprint:hash({version:BODY_VIEW_EYES_VERSION,bodyViewEyesRegistration,fade:.025,blinkGlyphFade:[.7,1],blinkLidFade:[.4,1],blinkDurationMs:140,blinkPeriodMs:3500}),
  method:'bounded native raster eye glyph/skin samples and authored closed lids; head-local directional pupil look, fixed authored head view',
  productionReady:false,approved:false,limitations:['skin-strip/clip seams and original eye-nose contact need artistic review','happy fixed face only; full expression set pending','no head turn or exact optical gaze','no animation/audio/video acceptance']};
