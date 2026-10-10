import type {HostProfile} from '../host/schemas.js';
import {hash} from '../core/utils.js';
import {registeredBodyViewEyes} from './body-view-eyes.js';
import {registeredBodyViewMouth,bodyViewMouthPaths} from './body-view-mouth.js';
import {registeredBodyViewRestMouth} from './body-view-rest-mouth.js';
import {moodPoses} from './expression-pose.js';
import {nativeBrowRegions} from './body-view-brow-regions.js';

export const BODY_VIEW_EXPRESSIONS_SELECTION='registered-expressions-v1' as const;
export const BODY_VIEW_EXPRESSIONS_VERSION='forest-native-expressions-1';
type Point={x:number;y:number};
type Brow={center:Point;clip:string;strip:{x:number;y:number;width:number;height:number}};
/** Native screen slots, not physical arm labels. Tight erase masks follow the
 * existing ink, not a rectangular forehead crop. Nose/hair/jaw remain intact.
 * Sampling a nearby skin strip is provisional artwork, never identity approval. */
export const bodyViewBrowRegistration={
  lila:{
    'three-quarter-right':[
      {center:{x:659,y:275},clip:'M633 291C639 277 659 257 677 260C685 261 684 270 676 271C660 272 646 283 638 292Z',strip:{x:645,y:289,width:39,height:3}},
      {center:{x:760,y:261},clip:'M742 265C747 247 766 248 776 265C780 273 774 275 770 269C762 259 751 259 747 267Z',strip:{x:744,y:274,width:34,height:3}},
    ],
    'three-quarter-left':[
      {center:{x:362,y:291},clip:'M351 302C354 280 368 278 373 288L371 302Z',strip:{x:352,y:304,width:22,height:3}},
      {center:{x:447,y:290},clip:'M425 291C424 272 450 276 468 297L468 304C451 291 437 284 427 293Z',strip:{x:426,y:306,width:42,height:3}},
    ],
  },
  karo:{
    'three-quarter-right':[
      {center:{x:521,y:298},clip:'M483 321C497 293 528 269 548 269C560 269 567 278 557 284C530 290 507 306 490 327C486 331 481 326 483 321Z',strip:{x:491,y:329,width:67,height:3}},
      {center:{x:630,y:282},clip:'M609 281C610 267 630 268 640 277L650 301C638 291 625 285 614 286Z',strip:{x:610,y:305,width:38,height:3}},
    ],
    'three-quarter-left':[
      {center:{x:336,y:301},clip:'M314 308C321 286 342 281 353 289C360 295 358 303 349 304C337 303 323 310 317 317Z',strip:{x:315,y:320,width:40,height:3}},
      {center:{x:460,y:306},clip:'M426 299C425 284 446 283 464 292C480 300 495 316 496 326C494 334 486 329 478 323C460 313 444 307 433 308Z',strip:{x:427,y:329,width:67,height:3}},
    ],
  },
} as const satisfies Record<'lila'|'karo',Record<'three-quarter-left'|'three-quarter-right',readonly [Brow,Brow]>>;
export type NativeExpressionPose={brow:number;browAngle:number;smile:number;frown:number;round:number;lid:number;eyeOpen:number};
export function hasBodyViewExpressions(profile:Pick<HostProfile,'appearance'>){return profile.appearance.bodyExpressions===BODY_VIEW_EXPRESSIONS_SELECTION;}
export function registeredBodyViewExpressions(profile:Pick<HostProfile,'appearance'>,sourceHash?:string){
  const a=profile.appearance;
  if(a.bodyView==='front')throw new Error('needs-front-capability: own-front expression registration is unavailable');
  if(!hasBodyViewExpressions(profile)||a.artworkVersion!=='forest-body-view-1'||!a.characterVariant||!a.bodyView||a.sourceColour||a.bodyEyes!=='registered-eyes-v1'||a.bodySpeech!=='registered-rest-mouth-v1')throw new Error('needs-view-expression: native expressions require the exact native actor/view, registered eyes and resting speech');
  const eyes=registeredBodyViewEyes(profile,sourceHash),mouth=registeredBodyViewMouth(profile,sourceHash);
  const actor=a.characterVariant,view=a.bodyView;
  return {sourceHash:eyes.sourceHash,sourceSize:eyes.sourceSize,brows:bodyViewBrowRegistration[actor][view].map((b,i)=>({...b,clip:nativeBrowRegions[actor][view]![i]!})),mouth};
}
const n=(v:number)=>Number(v.toFixed(5));
/** Pure shape authoring shared by static art documents and the compiler. No
 * narration inference, pose clock or face-plane warp. Silence stays closed. */
export function bodyViewExpressionPaths(profile:Pick<HostProfile,'appearance'>,pose:NativeExpressionPose,amount:number){
  if(Object.values(pose).some(v=>!Number.isFinite(v))||!Number.isFinite(amount)||amount<0||amount>1)throw new Error('needs-view-expression: invalid native expression geometry');
  const {mouth:c}=registeredBodyViewExpressions(profile),[left,a,b,right]=c.top;
  const chord=(p:Point)=>left.y+(right.y-left.y)*(p.x-left.x)/(right.x-left.x);
  const bend=Math.max(-.8,Math.min(1,pose.smile-pose.frown*.8)),round=Math.max(0,Math.min(1,pose.round))*amount;
  const center={x:(left.x+right.x)/2,y:(left.y+right.y)/2},offset=((a.y-chord(a))+(b.y-chord(b)))/2*.55*(1-bend);
  const p=(point:Point)=>({x:n(center.x+(point.x-center.x)*(1-round*.45)),y:n(point.y+offset)});
  const top=[p(left),p({...a,y:chord(a)+(a.y-chord(a))*bend}),p({...b,y:chord(b)+(b.y-chord(b))*bend}),p(right)] as const;
  return bodyViewMouthPaths({...c,top,depth:c.depth*(1+Math.max(0,Math.min(1,pose.round))*.5),curvedTeeth:true},amount);
}
export function bodyViewExpressionState(profile:Pick<HostProfile,'appearance'>,pose:NativeExpressionPose,amount:number){
  const c=registeredBodyViewExpressions(profile),paths=bodyViewExpressionPaths(profile,pose,amount),face:Record<string,{opacity?:number;x?:number;y?:number;rotation?:number}>={
    'view-mouth-layer':{opacity:0},'view-expression-layer':{opacity:1},'view-expression-mouth-teeth':{opacity:Math.max(0,1-pose.round)},
  };
  for(const [i] of c.brows.entries())face['view-expression-brow-'+(i?'screen-right':'screen-left')]={y:n(Math.max(-8,Math.min(6,pose.brow))),rotation:n((i?1:-1)*Math.max(-24,Math.min(24,pose.browAngle)))};
  return {paths:Object.fromEntries(Object.entries(paths).map(([id,d])=>[id.replace('view-mouth-','view-expression-mouth-')+(id==='view-mouth-teeth'?'-path':''),d])),face,
    eyeClosure:Math.max(0,Math.min(.8,pose.lid+Math.max(0,1-pose.eyeOpen)))};
}
/** Native images only. This opt-in layer owns brow/mouth ink, while the existing
 * registered eye layer keeps the actual eyes and bounded partner/object look. */
export function bodyViewExpressionsSvg(profile:Pick<HostProfile,'appearance'>,source:{sha256:string;width:number;height:number;url:string},imageUrl?:(file:string,sha:string)=>string){
  if(!hasBodyViewExpressions(profile))return '';
  const c=registeredBodyViewExpressions(profile,source.sha256);
  if(source.width!==c.sourceSize[0]||source.height!==c.sourceSize[1])throw new Error('needs-view-expression: native source dimensions changed');
  const approved=(url:string,sha:string)=>url==='assets/rigs/'+sha+'.png'||/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(url);
  if(!approved(source.url,c.sourceHash))throw new Error('Unapproved expression image URL');
  const image=`<image width="${source.width}" height="${source.height}" href="${source.url}"/>`;
  const brows=c.brows.map((b,i)=>{const id='view-expression-brow-'+(i?'screen-right':'screen-left'),s=b.strip;
    return `<defs><clipPath id="${id}-glyph"><path d="${b.clip}"/></clipPath><mask id="${id}-erase" maskUnits="userSpaceOnUse" x="0" y="0" width="${source.width}" height="${source.height}"><path d="${b.clip}" fill="white"/></mask></defs><g mask="url(#${id}-erase)"><svg x="${s.x-10}" y="${b.center.y-40}" width="${s.width+20}" height="85" viewBox="${s.x} ${s.y} ${s.width} ${s.height}" preserveAspectRatio="none">${image}</svg></g><g transform="translate(${b.center.x} ${b.center.y})"><g id="${id}"><g transform="translate(${-b.center.x} ${-b.center.y})" clip-path="url(#${id}-glyph)" filter="url(#view-expression-ink)">${image}</g></g></g>`;
  }).join('');
  const m=c.mouth,rest=registeredBodyViewRestMouth(profile);let repair:string;
  if(rest){
    if(!imageUrl)throw new Error('needs-view-expression: native rest tile resolver required');
    const url=imageUrl(rest.file,rest.sha256);if(!approved(url,rest.sha256))throw new Error('Unapproved expression rest image URL');
    // Sample only the clean central lower lip skin. A full-width row crosses
    // the outer beard/closed slit and would stretch dark ink into vertical bars.
    const stripY=profile.appearance.bodyView==='three-quarter-left'?580:500;
    repair=`<svg x="${rest.x}" y="${rest.y}" width="160" height="112" viewBox="450 ${stripY} 600 60" preserveAspectRatio="none"><image width="${rest.width}" height="${rest.height}" href="${url}"/></svg>`;
  }else{
    const s=m.strip!;repair=`<svg x="${m.bounds.x}" y="${m.bounds.y}" width="${m.bounds.width}" height="${m.bounds.height}" viewBox="${s.x} ${s.y} ${s.width} ${s.height}" preserveAspectRatio="none">${image}</svg>`;
  }
  const p=bodyViewExpressionPaths(profile,{brow:0,browAngle:0,smile:0,frown:0,round:0,lid:0,eyeOpen:1},0);
  return `<g id="view-expression-layer" data-native-expression="${BODY_VIEW_EXPRESSIONS_VERSION}"><defs><filter id="view-expression-ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -1.2 -2.4 -.4 0 2"/></filter><clipPath id="view-expression-mouth-region"><path d="${m.clip}"/></clipPath><clipPath id="view-expression-mouth-aperture"><use href="#view-expression-mouth-interior"/></clipPath></defs>${brows}<g clip-path="url(#view-expression-mouth-region)">${repair}<path id="view-expression-mouth-interior" d="${p['view-mouth-interior']}" fill="#211008" stroke="#160B05" stroke-width="${m.stroke}" stroke-linejoin="round"/><g clip-path="url(#view-expression-mouth-aperture)"><g id="view-expression-mouth-teeth"><path id="view-expression-mouth-teeth-path" d="${p['view-mouth-teeth']}" fill="#FFF8E9"/></g><path id="view-expression-mouth-tongue" d="${p['view-mouth-tongue']}" fill="#B3471F"/></g></g></g>`;
}
export const bodyViewExpressionsDescription={version:BODY_VIEW_EXPRESSIONS_VERSION,selection:BODY_VIEW_EXPRESSIONS_SELECTION,brows:bodyViewBrowRegistration,measuredInkRegions:nativeBrowRegions,
  fingerprint:hash({version:BODY_VIEW_EXPRESSIONS_VERSION,bodyViewBrowRegistration,nativeBrowRegions,moodPoses,mouth:'closed chord/smile/frown; chord height .55; activity-gated round aperture',restSkinStrips:{x:450,width:600,height:60,leftY:580,rightY:500},browInkDilation:2,inkAlpha:[-1.2,-2.4,-.4,0,2],browBounds:[-8,6,-24,24]}),
  method:'native brow ink isolated within measured masks; bounded brow motion, original eye glyphs with lids, closed emotional mouth contour and activity-gated aperture',
  approved:false,productionReady:false,phonemeLipSync:false,limitations:['skin-strip/brow erase/closed-mouth colour and contour seams need artwork review','fixed head view; no continuous head/body turns','bounded eye closure cannot enlarge source eye glyphs','not laugh/body/cloth/locomotion or runtime/audio/video acceptance']};
