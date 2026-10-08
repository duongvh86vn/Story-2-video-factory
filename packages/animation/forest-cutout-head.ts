import type {HostProfile} from '../host/schemas.js';
import type {FrameState} from './compiler.js';
import {hash} from '../core/utils.js';
import {usesBodyView,bodyViewHeadCalibration,bodyViewHeadSvg,bodyViewDescription} from './body-view-art.js';
import {hasNativeHeadBank} from './body-head-bank.js';
import {usesSourceColour,sourceColourSvg,sourceColourDescription} from './source-colour-art.js';
import {supportingHeadRegistration,supportingHeadSvg,supportingHeadDescription} from './prehistoric-supporting-head.js';

type Actor='lila'|'karo';
type Point={x:number;y:number};
/** Source-unit registration, shared with the body cutout. The cutouts remain
 * unaccepted AI extractions; preserving their pixels is not pixel identity to
 * the user's original. No independently generated head or face warp is used. */
export const cutoutHeadCalibration={
  lila:{file:'library/topics/prehistoric-life/lila-cutout-v1.png',sha256:'ef8b4a5f1445e0937bb41e661e8dc9de8a8a12a499e2eca87e3367807474d14e',width:430,height:766,scale:318/766,
    neck:{x:263,y:274},chin:{left:{x:335,y:230},right:{x:335,y:230}},eyes:[{x:285,y:158},{x:347,y:150}],mouth:{x:305,y:201},bounds:{left:80,right:430,top:0,bottom:434},
    clip:'M0 0H430V250L363 298L337 420L305 365L299 311L281 263L243 263L221 365L160 434H0Z',
    mouthCover:'M269 185Q306 180 340 187L345 213Q310 230 272 216Z'},
  karo:{file:'library/topics/prehistoric-life/karo-cutout-v1.png',sha256:'f190653ab448f89da80b7156ff7ee677d5788a16dca6126b7796bab3f845b665',width:377,height:716,scale:318/716,
    neck:{x:212,y:279},chin:{left:{x:300,y:245},right:{x:190,y:255}},eyes:[{x:216,y:141},{x:282,y:137}],mouth:{x:245,y:201},bounds:{left:80,right:360,top:0,bottom:291},
    clip:'M0 0H377V255L283 281L229 291L196 279L165 247H0Z',
    mouthCover:'M199 181Q245 166 293 181L288 216Q246 243 207 221Z'},
} as const;
export const CUTOUT_HEAD_VERSION='forest-cutout-head-2';
export function usesCutoutHead(profile:HostProfile){return profile.appearance.artworkVersion==='forest-body-1'||usesBodyView(profile);}
export function cutoutHeadRegistration(profile:HostProfile){return profile.appearance.supportingModel?supportingHeadRegistration(profile):usesBodyView(profile)?bodyViewHeadCalibration(profile):cutoutHeadCalibration[profile.appearance.characterVariant!];}
export function cutoutHeadChin(profile:HostProfile,side:'left'|'right'):Point {
  if(hasNativeHeadBank(profile))throw new Error('needs-head-source-phase: changing head chin requires its selected original cell/time');
  const c=cutoutHeadRegistration(profile);
  return {x:(c.chin[side].x-c.neck.x)*c.scale,y:(c.chin[side].y-c.neck.y)*c.scale};
}
export function cutoutHeadSvg(profile:HostProfile,imageUrl:(file:string,sha:string)=>string):string {
  if(profile.appearance.supportingModel)return supportingHeadSvg(profile,imageUrl);
  const originalColour=usesSourceColour(profile.appearance);
  if(usesBodyView(profile))return bodyViewHeadSvg(profile,imageUrl);
  const actor=profile.appearance.characterVariant!,c=cutoutHeadCalibration[actor];
  const colour=originalColour?sourceColourSvg(actor,'source-head-colour',imageUrl):undefined;
  const artwork=colour?colour.artwork:`<image width="${c.width}" height="${c.height}" href="${imageUrl(c.file,c.sha256)}"/>`;
  const local=(p:Point)=>`${(p.x-c.neck.x)*c.scale} ${(p.y-c.neck.y)*c.scale}`;
  const eyes=c.eyes.map((p,i)=>`<g transform="translate(${local(p)})"><g id="source-blink-${i}" opacity="0"><ellipse rx="${13*c.scale}" ry="${20*c.scale}" fill="#FFB36F"/><path d="M${-9*c.scale} 0Q0 ${4*c.scale} ${9*c.scale} 0" stroke="#080604" stroke-width="${3*c.scale}" stroke-linecap="round" fill="none"/></g></g>`).join('');
  const mouth=`<g id="source-mouth-cover" opacity="0" transform="scale(${c.scale}) translate(${-c.neck.x} ${-c.neck.y})"><path d="${c.mouthCover}" fill="${actor==='lila'?'#FFB36F':'#4A2815'}"/></g>`;
  const talk=actor==='lila'?'<path d="M-12 -3Q0 -5 12 -3Q13 9 0 10Q-13 9 -12 -3Z" fill="#211009" stroke="#080604" stroke-width="1.2"/><path d="M-5 7Q0 4 5 7" stroke="#BE5B32" stroke-width="2"/>':
    '<path d="M-17 -4Q0 -8 17 -4Q17 12 0 13Q-17 12 -17 -4Z" fill="#221108" stroke="#080604" stroke-width="1.4"/><path d="M-12 -3Q0 -1 12 -3L10 0Q0 3 -10 0Z" fill="#fff6e5"/>';
  const round='<ellipse rx="6" ry="8" fill="#211009" stroke="#080604" stroke-width="1.3"/>';
  const frown='<path d="M-12 3Q0 -6 12 3" fill="none" stroke="#080604" stroke-width="2" stroke-linecap="round"/>';
  const shapes=[['talk',talk],['talk-tense',round],['talk-round',round],['round',round],['frown',frown]]
    .map(([id,svg])=>`<g transform="translate(${local(c.mouth)})"><g id="mouth-${id}-front" opacity="0">${svg}</g></g>`).join('');
  return `<g data-head-artwork="${CUTOUT_HEAD_VERSION}" stroke="none"><defs>${colour?.defs??''}<clipPath id="source-head-clip"><path d="${c.clip}"/></clipPath></defs><g id="head-view-front"><g transform="scale(${c.scale}) translate(${-c.neck.x} ${-c.neck.y})" clip-path="url(#source-head-clip)">${artwork}</g>${eyes}${mouth}${shapes}</g></g>`;
}
export function cutoutHeadFaceState(input:{blink:number;round:number;frown:number;speechLevel:number|null}):FrameState['face'] {
  const speaking=input.speechLevel!==null,round=!speaking?Math.min(1,input.round*1.25):0,frown=!speaking?Math.min(1,input.frown*1.6):0;
  const tenseSpeaking=speaking&&input.frown>=.35,roundedSpeaking=speaking&&!tenseSpeaking&&input.round>=.5;
  return {'head-view-front':{opacity:1},'source-blink-0':{opacity:input.blink},'source-blink-1':{opacity:input.blink},
    'source-mouth-cover':{opacity:speaking?1:Math.max(round,frown)},
    'mouth-talk-front':{opacity:speaking&&!tenseSpeaking&&!roundedSpeaking?1:0,scaleY:speaking?.55+input.speechLevel!*.65:1},
    'mouth-talk-tense-front':{opacity:tenseSpeaking?1:0,scaleY:tenseSpeaking?.7+input.speechLevel!*.8:1},
    'mouth-talk-round-front':{opacity:roundedSpeaking?1:0,scaleY:roundedSpeaking?.6+input.speechLevel!*.55:1},
    'mouth-round-front':{opacity:round*(1-frown)},'mouth-frown-front':{opacity:frown}};
}
export function cutoutHeadDescription(){return {version:CUTOUT_HEAD_VERSION,calibration:cutoutHeadCalibration,supporting:supportingHeadDescription,sourceColour:sourceColourDescription,authoredViews:bodyViewDescription,fingerprint:hash({version:CUTOUT_HEAD_VERSION,cutoutHeadCalibration,supporting:supportingHeadDescription,views:bodyViewDescription.fingerprint,colour:sourceColourDescription.fingerprint}),
  happy:'One unwarped cutout image, retaining its complete face, nose, eyes and smile; no relocated or enlarged glyphs.',
  orientation:'fixed source orientation with whole-head tilt/nod; no yaw reconstruction; partner-facing authored views pending',
  expression:'source happy retained; provisional blink and speech/frown/round overlays only, not accepted expression art or phoneme lip-sync',
  productionReady:false};}
