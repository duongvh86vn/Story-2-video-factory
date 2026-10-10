import type {HostProfile} from '../host/schemas.js';
import type {SpeechActivity} from '../voice/schemas.js';
import {hash} from '../core/utils.js';
import {SPEECH_SOURCE_CLOCK_VERSION,SPEECH_ENVELOPE_ATTACK_MS,SPEECH_ENVELOPE_RELEASE_MS,validateSpeechActivityTrack,validateSpeechSourceClock,type SpeechSourceClock} from './speech-clock.js';
import {hasBodyViewRestSpeech,registeredBodyViewRestMouth,bodyViewRestMouthSvg,bodyViewRestMouthDescription} from './body-view-rest-mouth.js';

export const BODY_VIEW_SPEECH_VERSION='registered-mouth-v1' as const;
export const BODY_VIEW_MOUTH_VERSION='forest-fixed-view-mouth-3';
type Point={x:number;y:number};
type Mouth={sourceHash:string;sourceSize:readonly [number,number];kind:'skin-strip'|'native-rim';bounds:{x:number;y:number;width:number;height:number};
  clip:string;top:readonly [Point,Point,Point,Point];depth:number;lift:number;stroke:number;
  strip?:{x:number;y:number;width:number;height:number};interior?:string;curvedTeeth?:boolean};
/** Manual native-pixel mouth regions, not inferred new facial landmarks.
 * Lila's bare cheek strip restores only the old smile; Karo's native outer
 * lip/moustache/beard stay outside the interior patch. All remain unapproved. */
export const bodyViewMouthRegistration={
  lila:{
    'three-quarter-right':{sourceHash:'c11b0aeddf06e42d0e8363df9167c87fc4a94262606565a0c1bee55c950e43a9',sourceSize:[1173,1341],kind:'skin-strip',bounds:{x:634,y:355,width:126,height:82},
      clip:'M639 373C648 360 670 361 678 371C698 369 727 367 748 371C757 375 756 389 748 396C733 425 700 432 676 409C658 398 648 389 639 385Z',
      top:[{x:655,y:377},{x:680,y:405},{x:725,y:401},{x:746,y:381}],depth:30,lift:12,stroke:5,
      strip:{x:634,y:357,width:126,height:8}},
    'three-quarter-left':{sourceHash:'ef90f6783d89a8e554c12605065a218faf4e0f6aae4411ae00cccf6825b686bf',sourceSize:[1024,1536],kind:'skin-strip',bounds:{x:375,y:382,width:103,height:75},
      clip:'M379 399C396 396 431 393 453 383C464 382 474 390 468 401C454 433 423 448 402 434C388 426 377 414 379 399Z',
      top:[{x:386,y:408},{x:408,y:432},{x:439,y:420},{x:459,y:395}],depth:24,lift:8,stroke:5,
      strip:{x:375,y:382,width:103,height:6}},
  },
  karo:{
    'three-quarter-right':{sourceHash:'eefa90341b6a39138b163c173b3d6072b56c4bed4015bd431345691e8088e182',sourceSize:[910,1729],kind:'native-rim',bounds:{x:525,y:447,width:112,height:63},
      clip:'M528 449C557 456 598 457 633 449C630 469 611 500 584 502C558 505 536 478 528 449Z',
      top:[{x:532,y:451},{x:558,y:458},{x:606,y:458},{x:629,y:451}],depth:62,lift:0,stroke:3,interior:'#211008'},
    'three-quarter-left':{sourceHash:'bfcffe1fac13281de68ca11910407bb22fde02f8f5f5d867054713399166fdf4',sourceSize:[910,1729],kind:'native-rim',bounds:{x:333,y:455,width:113,height:65},
      clip:'M336 458C369 467 412 468 443 458C441 482 421 510 392 514C365 518 346 493 336 458Z',
      top:[{x:340,y:461},{x:365,y:469},{x:416,y:469},{x:439,y:461}],depth:59,lift:0,stroke:3,interior:'#211008'},
  },
} as const satisfies Record<'lila'|'karo',Record<'three-quarter-left'|'three-quarter-right',Mouth>>;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{const t=clamp(x);return t*t*t*(t*(t*6-15)+10);};
const point=(p:Point)=>`${Number(p.x.toFixed(4))} ${Number(p.y.toFixed(4))}`;
const closed=(p:readonly Point[])=>`M${point(p[0]!)} C${point(p[1]!)} ${point(p[2]!)} ${point(p[3]!)} C${point(p[4]!)} ${point(p[5]!)} ${point(p[0]!)}`;
export function hasBodyViewSpeech(profile:Pick<HostProfile,'appearance'>){return profile.appearance.bodySpeech===BODY_VIEW_SPEECH_VERSION||hasBodyViewRestSpeech(profile);}
export function registeredBodyViewMouth(profile:Pick<HostProfile,'appearance'>,sourceHash?:string):Mouth{
  const a=profile.appearance;
  if(a.bodyView==='front')throw new Error('needs-front-capability: own-front speech registration is unavailable');
  if(!hasBodyViewSpeech(profile)||a.artworkVersion!=='forest-body-view-1'||!a.characterVariant||!a.bodyView||a.sourceColour)throw new Error('needs-view-voice-animation: mouth candidate requires its registered actor/body view');
  const c=bodyViewMouthRegistration[a.characterVariant]?.[a.bodyView];
  if(!c)throw new Error('needs-view-voice-animation: mouth actor/view is not registered');
  if(sourceHash!==undefined&&c.sourceHash!==sourceHash)throw new Error('needs-view-voice-animation: mouth coordinates do not match the native view image');
  const rest=registeredBodyViewRestMouth(profile,sourceHash);
  return rest?{...c,clip:rest.speechClip,top:rest.top,depth:rest.depth,lift:rest.lift,stroke:rest.stroke,curvedTeeth:true}:c;
}
/** Pure shape authoring. No audio, actor pose evaluation or playback. */
export function bodyViewMouthPaths(c:Mouth,amount:number):Record<string,string>{
  if(!Number.isFinite(amount)||amount<0||amount>1)throw new Error('Invalid mouth aperture');
  const [l,a,b,r]=c.top,u={...a,y:a.y-c.lift*amount},v={...b,y:b.y-c.lift*amount};
  const interior=closed([l,u,v,r,{...v,y:v.y+c.depth*amount},{...u,y:u.y+c.depth*amount}]);
  const span=r.x-l.x,y=(l.y+r.y)/2+4,thickness=c.kind==='native-rim'?10:5;
  // Resting smiles have a curved upper contour, not a horizontal top rim.
  // Keep teeth inside that actual contour instead of clipping them away on
  // the left view or leaving a detached white rectangle on the right view.
  const bezier=(t:number)=>({x:(1-t)**3*l.x+3*(1-t)**2*t*u.x+3*(1-t)*t*t*v.x+t**3*r.x,y:(1-t)**3*l.y+3*(1-t)**2*t*u.y+3*(1-t)*t*t*v.y+t**3*r.y});
  const derivative=(t:number)=>({x:3*(1-t)**2*(u.x-l.x)+6*(1-t)*t*(v.x-u.x)+3*t*t*(r.x-v.x),y:3*(1-t)**2*(u.y-l.y)+6*(1-t)*t*(v.y-u.y)+3*t*t*(r.y-v.y)});
  const tl=bezier(.12),tr=bezier(.88),dl=derivative(.12),dr=derivative(.88),ta={x:tl.x+dl.x*.76/3,y:tl.y+dl.y*.76/3},tb={x:tr.x-dr.x*.76/3,y:tr.y-dr.y*.76/3};
  const teeth=c.curvedTeeth?closed([tl,ta,tb,tr,{...tb,y:tb.y+Math.min(8,c.depth*amount*.38)},{...ta,y:ta.y+Math.min(8,c.depth*amount*.38)}])
    :closed([{x:l.x+span*.09,y},{x:l.x+span*.32,y:y+5},{x:l.x+span*.68,y:y+5},{x:r.x-span*.09,y},{x:l.x+span*.68,y:y+5+thickness},{x:l.x+span*.32,y:y+5+thickness}]);
  const tongueY=(u.y+v.y)/2+c.depth*amount*.64;
  const tongue=closed([{x:l.x+span*.32,y:tongueY},{x:l.x+span*.4,y:tongueY-5},{x:l.x+span*.6,y:tongueY-5},{x:l.x+span*.68,y:tongueY},
    {x:l.x+span*.6,y:tongueY+7},{x:l.x+span*.4,y:tongueY+7}]);
  return {'view-mouth-interior':interior,'view-mouth-teeth':teeth,'view-mouth-tongue':tongue};
}
export function bodyViewMouthSvg(profile:Pick<HostProfile,'appearance'>,source:{sha256:string;width:number;height:number;url:string},imageUrl?:(file:string,sha:string)=>string):string{
  if(!hasBodyViewSpeech(profile))return '';
  const c=registeredBodyViewMouth(profile,source.sha256),p=bodyViewMouthPaths(c,0),q=c.bounds;
  if(source.url!=='assets/rigs/'+c.sourceHash+'.png'&&!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(source.url))throw new Error('Unapproved mouth image URL');
  if(source.width!==c.sourceSize[0]||source.height!==c.sourceSize[1])throw new Error('Invalid mouth source dimensions');
  const rest=registeredBodyViewRestMouth(profile,source.sha256),plate=bodyViewRestMouthSvg(profile,source,imageUrl);
  // The same immutable image supplies a clean cheek strip. Only this clip is
  // reconstructed; source eyes/nose/hair and the original happy image remain.
  const repair=rest?'':c.strip?`<svg x="${q.x}" y="${q.y}" width="${q.width}" height="${q.height}" viewBox="${c.strip.x} ${c.strip.y} ${c.strip.width} ${c.strip.height}" preserveAspectRatio="none"><image width="${source.width}" height="${source.height}" href="${source.url}"/></svg>`
    :`<path d="${c.clip}" fill="${c.interior}"/>`;
  return `${plate}<defs><clipPath id="view-mouth-region"><path d="${c.clip}"/></clipPath><clipPath id="view-mouth-aperture"><use href="#view-mouth-interior"/></clipPath></defs><g id="view-mouth-layer" opacity="${rest?1:0}" clip-path="url(#view-mouth-region)" data-mouth-artwork="${BODY_VIEW_MOUTH_VERSION}">${repair}<path id="view-mouth-interior" d="${p['view-mouth-interior']}" fill="#211008" stroke="#160B05" stroke-width="${c.stroke}" stroke-linejoin="round"/><g clip-path="url(#view-mouth-aperture)"><path id="view-mouth-teeth" d="${p['view-mouth-teeth']}" fill="#FFF8E9"/><path id="view-mouth-tongue" d="${p['view-mouth-tongue']}" fill="#B3471F"/></g></g>`;
}
export const BODY_VIEW_MOUTH_ATTACK_MS=SPEECH_ENVELOPE_ATTACK_MS,BODY_VIEW_MOUTH_RELEASE_MS=SPEECH_ENVELOPE_RELEASE_MS;
export function validateBodyViewMouthActivity(activity:SpeechActivity):void{
  validateSpeechActivityTrack(activity);
}
/** Uses only adjacent positive source windows; no extension over silence.
 * Caller data is never mutated, and no previous playback frame is consulted. */
export function bodyViewMouthLevel(activity:SpeechActivity,timeMs:number,sourceClock?:SpeechSourceClock):number{
  if(sourceClock){validateSpeechSourceClock(activity,sourceClock);return bodyViewMouthLevel(sourceClock.activity,timeMs+sourceClock.startMs);}
  if(!Number.isFinite(timeMs))throw new Error('Invalid mouth clock');
  if(!Number.isFinite(activity.windowMs)||activity.windowMs<=0||!['audio-rms','segment-draft'].includes(activity.method))throw new Error('needs-view-speech-clock: invalid activity method/window');
  // Direct random-access callers receive the same fail-closed clock checks as
  // compilation; no mutable validation cache can hide edited caller data.
  let priorEnd=0,i=-1;
  for(const [j,c] of activity.intervals.entries()){
    if(!Number.isInteger(c.startMs)||!Number.isInteger(c.endMs)||!Number.isFinite(c.level)||c.level<0||c.level>1||c.startMs<priorEnd||c.endMs<=c.startMs)throw new Error('needs-view-speech-clock: invalid, overlapping or unordered activity');
    priorEnd=c.endMs;if(timeMs>=c.startMs&&timeMs<c.endMs)i=j;
  }
  const cue=activity.intervals[i];
  if(!cue)return 0;
  if(cue.level===0)return 0;
  const prior=activity.intervals[i-1],next=activity.intervals[i+1];
  const positive=(c:SpeechActivity['intervals'][number]|undefined)=>!!c&&c.level>0;
  let start=cue.startMs,end=cue.endMs;
  for(let j=i-1;j>=0&&timeMs-start<BODY_VIEW_MOUTH_ATTACK_MS;j--){const c=activity.intervals[j]!;if(!positive(c)||c.endMs!==start)break;start=c.startMs;}
  for(let j=i+1;j<activity.intervals.length&&end-timeMs<BODY_VIEW_MOUTH_RELEASE_MS;j++){const c=activity.intervals[j]!;if(!positive(c)||c.startMs!==end)break;end=c.endMs;}
  const center=(cue.startMs+cue.endMs)/2;
  let level=cue.level;
  if(timeMs<center&&positive(prior)&&prior!.endMs===cue.startMs){const a=(prior!.startMs+prior!.endMs)/2;level=prior!.level+(cue.level-prior!.level)*clamp((timeMs-a)/(center-a));}
  if(timeMs>=center&&positive(next)&&next!.startMs===cue.endMs){const b=(next!.startMs+next!.endMs)/2;level=cue.level+(next!.level-cue.level)*clamp((timeMs-center)/(b-center));}
  return (.25+.75*Math.sqrt(clamp(level)))*ease((timeMs-start)/BODY_VIEW_MOUTH_ATTACK_MS)*ease((end-timeMs)/BODY_VIEW_MOUTH_RELEASE_MS);
}
export function sampleBodyViewMouth(profile:Pick<HostProfile,'appearance'>,activity:SpeechActivity,timeMs:number,sourceClock?:SpeechSourceClock){
  const c=registeredBodyViewMouth(profile),amount=bodyViewMouthLevel(activity,timeMs,sourceClock);
  return {paths:bodyViewMouthPaths(c,amount),face:{'head-view-front':{opacity:1},'view-mouth-layer':{opacity:registeredBodyViewRestMouth(profile)?1:ease(amount/.08)}}};
}
export const bodyViewMouthDescription={version:BODY_VIEW_MOUTH_VERSION,selection:BODY_VIEW_SPEECH_VERSION,
  selections:[BODY_VIEW_SPEECH_VERSION,bodyViewRestMouthDescription.selection],restMouth:bodyViewRestMouthDescription,
  registrations:bodyViewMouthRegistration,fingerprint:hash({version:BODY_VIEW_MOUTH_VERSION,bodyViewMouthRegistration,restMouth:bodyViewRestMouthDescription.fingerprint,sourceClock:SPEECH_SOURCE_CLOCK_VERSION,attackMs:BODY_VIEW_MOUTH_ATTACK_MS,releaseMs:BODY_VIEW_MOUTH_RELEASE_MS}),
  method:'bounded native-coordinate mouth-only SVG/source-window envelope; legacy selection restores original happy image in silence; explicit rest selection keeps Karo closed-mouth plate and zero-aperture contour, Lila native closed smile',
  synchronization:'audio-activity-or-labelled-segment-draft',phonemeLipSync:false,productionReady:false,approved:false,
  limitations:['native mouth/skin-strip/outer-rim artistic review','happy fixed view only','no phonemes/prosody inference','actor-owned cue and real audio verification remain upstream','no motion/video acceptance']};
