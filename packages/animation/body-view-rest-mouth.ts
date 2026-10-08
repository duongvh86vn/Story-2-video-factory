import type {HostProfile} from '../host/schemas.js';
import {hash} from '../core/utils.js';

export const BODY_VIEW_REST_SPEECH_SELECTION='registered-rest-mouth-v1' as const;
export const BODY_VIEW_REST_MOUTH_VERSION='forest-native-rest-mouth-1';
/** Native-pixel ROI only. Generated full-body variants were rejected. These
 * separate tiles are not mirrored, resampled PNGs or identity-approved art. */
export const bodyViewRestMouthRegistration={
  'three-quarter-right':{sourceHash:'eefa90341b6a39138b163c173b3d6072b56c4bed4015bd431345691e8088e182',sourceSize:[910,1729],
    file:'library/topics/prehistoric-life/body-views/karo-rest-mouth-right-tile-v1.png',sha256:'4eb6bb39b353bee9938ed0f6f41b4a16390143e5bb7ba6e628afa660beb79511',width:1500,height:1049,
    x:500,y:432,scale:160/1500,
    clip:'M506 440C534 432 622 432 651 441C659 470 657 511 633 531C597 541 540 541 512 523C501 501 501 462 506 440Z',
    speechClip:'M522 448C543 441 610 441 638 445C652 452 651 480 639 503C614 527 566 530 535 510C517 492 513 465 522 448Z',
    top:[{x:535,y:463},{x:560,y:482},{x:608,y:479},{x:632,y:460}],depth:24,lift:8,stroke:3},
  'three-quarter-left':{sourceHash:'bfcffe1fac13281de68ca11910407bb22fde02f8f5f5d867054713399166fdf4',sourceSize:[910,1729],
    file:'library/topics/prehistoric-life/body-views/karo-rest-mouth-left-tile-v1.png',sha256:'8bebcdd782963731ee3c3ae6c7a594ca864db649286028b0428d41c8a1c8cc2f',width:1500,height:1049,
    x:310,y:440,scale:160/1500,
    clip:'M316 445C345 441 438 442 463 449C469 479 465 527 442 542C407 549 351 548 324 528C312 507 312 465 316 445Z',
    speechClip:'M326 455C343 450 425 453 447 456C460 468 458 499 436 521C405 543 355 538 329 514C314 496 315 469 326 455Z',
    top:[{x:334,y:467},{x:356,y:494.5},{x:418,y:494.5},{x:442,y:466}],depth:24,lift:8,stroke:3},
} as const;
export function hasBodyViewRestSpeech(profile:Pick<HostProfile,'appearance'>):boolean{return profile.appearance.bodySpeech===BODY_VIEW_REST_SPEECH_SELECTION;}
export function registeredBodyViewRestMouth(profile:Pick<HostProfile,'appearance'>,sourceHash?:string){
  if(!hasBodyViewRestSpeech(profile))return undefined;
  const a=profile.appearance;
  if(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant||a.sourceColour)throw new Error('needs-view-rest-mouth: resting mouth requires its native actor/view');
  if(a.characterVariant==='lila')return undefined; // Her actual source smile is already closed.
  const c=bodyViewRestMouthRegistration[a.bodyView];
  if(!c||sourceHash!==undefined&&c.sourceHash!==sourceHash)throw new Error('needs-view-rest-mouth: plate does not match the original native view');
  return c;
}
export function bodyViewRestMouthAssets(appearance:HostProfile['appearance']){
  const c=registeredBodyViewRestMouth({appearance});return c?[{file:c.file,sha256:c.sha256,path:'assets/rigs/'+c.sha256+'.png'}]:[];
}
/** Uniform local image placement, no face/head transform or pixel rewriting. */
export function bodyViewRestMouthSvg(profile:Pick<HostProfile,'appearance'>,source:{sha256:string;width:number;height:number},imageUrl?:(file:string,sha:string)=>string):string{
  const c=registeredBodyViewRestMouth(profile,source.sha256);if(!c)return '';
  if(source.width!==c.sourceSize[0]||source.height!==c.sourceSize[1])throw new Error('needs-view-rest-mouth: original source dimensions changed');
  if(!imageUrl)throw new Error('needs-view-rest-mouth: registered plate image resolver required');
  const url=imageUrl(c.file,c.sha256);
  if(url!=='assets/rigs/'+c.sha256+'.png'&&!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(url))throw new Error('Unapproved resting mouth image URL');
  return `<defs><clipPath id="view-rest-mouth-region"><path d="${c.clip}"/></clipPath></defs><g id="view-rest-mouth-plate" clip-path="url(#view-rest-mouth-region)" stroke="none" data-rest-mouth="${BODY_VIEW_REST_MOUTH_VERSION}"><image width="${c.width}" height="${c.height}" transform="translate(${c.x} ${c.y}) scale(${c.scale})" href="${url}"/></g>`;
}
export const bodyViewRestMouthDescription={version:BODY_VIEW_REST_MOUTH_VERSION,selection:BODY_VIEW_REST_SPEECH_SELECTION,
  registrations:bodyViewRestMouthRegistration,fingerprint:hash({version:BODY_VIEW_REST_MOUTH_VERSION,bodyViewRestMouthRegistration}),
  approved:false,productionReady:false,method:'generated native mouth-region tiles; uniform independent left/right placement, bounded SVG aperture over permanent resting plate',
  limitations:['Tile colour/texture/mask seams and left slit alignment need visual approval.','Right closed contour is authored SVG over the generated fill plate.','Only happy fixed views; not a full neutral/emotion/head-turn bank.','Audio activity only, never phoneme lip-sync or verified motion.']};
