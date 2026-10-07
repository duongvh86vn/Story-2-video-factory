import type {HostProfile} from '../host/schemas.js';
import {hash} from '../core/utils.js';
import {bodyViewClothingContours} from './body-view-contours.js';

export const BODY_VIEW_VERSION='forest-body-view-1' as const;
export const BODY_VIEW_REGISTRATION_VERSION='forest-view-registration-1';
type Point={x:number;y:number};
/** Manually authored pixel landmarks, not model-generated skeletons. These two
 * engineering candidates use uniform head/body transforms. Their physical
 * limb lengths and hand/foot artwork remain the canonical source rig's.
 * Registration is neither identity approval nor production acceptance. */
export const bodyViewRegistration={
  lila:{view:'three-quarter-right',file:'library/topics/prehistoric-life/body-views/lila-three-quarter-right-v2.png',
    sha256:'c11b0aeddf06e42d0e8363df9167c87fc4a94262606565a0c1bee55c950e43a9',width:1173,height:1341,
    bodyScale:66.8/246,headScale:113.8/428,pelvis:{x:627,y:742},neck:{x:620,y:496},
    shoulders:{left:{x:542,y:509},right:{x:675,y:535}},hips:{left:{x:586,y:754},right:{x:665,y:754}},
    // Source rig-left is anatomical right (bare shoulder); that assignment is
    // retained through this view rather than inferred from screen direction.
    nearHand:'left',farHand:'right',
    clothing:bodyViewClothingContours.lila,inkPad:7,
    headClip:'M0 0H1173V451L815 451L749 507L689 504L635 456L585 456L555 516L540 650L494 753H0Z',
    headBounds:{left:295,right:858,top:60,bottom:753},chin:{left:{x:751,y:429},right:{x:592,y:438}}},
  karo:{view:'three-quarter-right',file:'library/topics/prehistoric-life/body-views/karo-three-quarter-right-v1.png',
    sha256:'eefa90341b6a39138b163c173b3d6072b56c4bed4015bd431345691e8088e182',width:910,height:1729,
    bodyScale:66.2/376,headScale:124/512,pelvis:{x:475,y:983},neck:{x:486,y:607},
    shoulders:{left:{x:365,y:620},right:{x:545,y:661}},hips:{left:{x:422,y:1000},right:{x:525,y:1000}},
    nearHand:'left',farHand:'right',
    clothing:bodyViewClothingContours.karo,inkPad:7,
    headClip:'M0 0H910V558L642 558L601 619L548 635L501 625L457 635L409 617L363 579H0Z',
    headBounds:{left:287,right:710,top:95,bottom:635},chin:{left:{x:622,y:538},right:{x:378,y:551}}},
} as const;
export function usesBodyView(profile:Pick<HostProfile,'appearance'>){return profile.appearance.artworkVersion===BODY_VIEW_VERSION;}
export function registeredBodyView(profile:Pick<HostProfile,'appearance'>){
  const actor=profile.appearance.characterVariant;
  if(!actor||profile.appearance.bodyView!=='three-quarter-right')throw new Error('needs-body-registration: this authored body angle has no registered candidate');
  return bodyViewRegistration[actor];
}
export function bodyViewMetrics(profile:Pick<HostProfile,'appearance'>){
  const c=registeredBodyView(profile),b=profile.appearance.bodyScale,k=c.bodyScale*b;
  const relative=(p:Point)=>({x:(p.x-c.pelvis.x)*k,y:(p.y-c.pelvis.y)*k});
  return {neckX:relative(c.neck).x,torsoTop:relative(c.neck).y,
    shoulders:{left:relative(c.shoulders.left),right:relative(c.shoulders.right)},
    hips:{left:relative(c.hips.left),right:relative(c.hips.right)}};
}
export function bodyViewAsset(appearance:HostProfile['appearance']){
  const c=registeredBodyView({appearance});return {file:c.file,sha256:c.sha256,path:'assets/rigs/'+c.sha256+'.png'};
}
export function bodyViewHeadCalibration(profile:HostProfile){
  const c=registeredBodyView(profile);return {...c,scale:c.headScale,bounds:c.headBounds};
}
export function bodyViewHeadSvg(profile:HostProfile,imageUrl:(file:string,sha:string)=>string){
  const c=registeredBodyView(profile);
  // Keep the complete authored happy face together. Unregistered blink/lip or
  // expression overlays must not paint over this angle or silently use front.
  return `<g data-body-view="${c.view}" data-registration="${BODY_VIEW_REGISTRATION_VERSION}" stroke="none"><defs><clipPath id="source-head-clip"><path d="${c.headClip}"/></clipPath></defs><g id="head-view-front"><g transform="scale(${c.headScale}) translate(${-c.neck.x} ${-c.neck.y})" clip-path="url(#source-head-clip)"><image width="${c.width}" height="${c.height}" href="${imageUrl(c.file,c.sha256)}"/></g></g></g>`;
}
export function bodyViewClothingSvg(profile:HostProfile,imageUrl:(file:string,sha:string)=>string){
  const c=registeredBodyView(profile);
  return {defs:`<defs><mask id="view-clothing-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${c.width}" height="${c.height}"><path d="${c.clothing}" fill="white" stroke="white" stroke-width="${c.inkPad*2}" stroke-linejoin="round"/></mask><image id="view-body-source" width="${c.width}" height="${c.height}" href="${imageUrl(c.file,c.sha256)}"/></defs>`,
    torso:`<g stroke="none" transform="scale(${c.bodyScale}) translate(${-c.pelvis.x} ${-c.pelvis.y})" mask="url(#view-clothing-mask)"><use href="#view-body-source"/></g>`};
}
export const bodyViewDescription={version:BODY_VIEW_REGISTRATION_VERSION,artworkVersion:BODY_VIEW_VERSION,
  sources:bodyViewRegistration,fingerprint:hash({version:BODY_VIEW_REGISTRATION_VERSION,bodyViewRegistration}),
  status:'developer-landmark-and-layer-candidate',productionReady:false,approved:false,
  method:'fixed authored 3/4 right head/body with independent uniform source registrations; source limb lengths and mitten/sole artwork retained; no mirror or face warp',
  limitations:['identity/proportion/mask review','only happy silent fixed-view poses','rigid garment; no walking/seating/cloth follow for this view','no continuous body/head turn','no motion acceptance']};
