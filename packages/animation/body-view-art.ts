import type {HostProfile} from '../host/schemas.js';
import {hash} from '../core/utils.js';
import {bodyViewRegistrations,REGISTERED_BODY_VIEWS} from './body-view-registration.js';
export {bodyViewRegistration,bodyViewRegistrations,REGISTERED_BODY_VIEWS,type RegisteredBodyView} from './body-view-registration.js';
import {bodyViewMouthSvg,bodyViewMouthDescription} from './body-view-mouth.js';
import {bodyViewEyesSvg,bodyViewEyesDescription} from './body-view-eyes.js';
import {bodyViewExpressionsSvg,bodyViewExpressionsDescription} from './body-view-expressions.js';
import {hasBodyViewLocomotion,nativeClothSvg,nativeClothDescription} from './body-view-cloth.js';
import {hasBodyViewSecondary,nativeSecondarySvg,nativeSecondaryDescription} from './body-view-secondary.js';
import {hasBodyViewSeat,nativeSeatSvg,nativeSeatDescription} from './body-view-seat.js';

export const BODY_VIEW_VERSION='forest-body-view-1' as const;
export const BODY_VIEW_REGISTRATION_VERSION='forest-view-registration-4';
type Point={x:number;y:number};
/** Manually authored pixel landmarks, not model-generated skeletons. These two
 * engineering candidates use uniform head/body transforms. Their physical
 * limb lengths and hand/foot artwork remain the canonical source rig's.
 * Registration is neither identity approval nor production acceptance. */
export function usesBodyView(profile:Pick<HostProfile,'appearance'>){return profile.appearance.artworkVersion===BODY_VIEW_VERSION;}
export function registeredBodyView(profile:Pick<HostProfile,'appearance'>){
  const actor=profile.appearance.characterVariant,view=profile.appearance.bodyView;
  if(!actor||!view||!REGISTERED_BODY_VIEWS.includes(view))throw new Error('needs-body-registration: this authored body angle has no registered candidate');
  return bodyViewRegistrations[actor][view];
}
export function bodyViewFacing(profile:Pick<HostProfile,'appearance'>){return registeredBodyView(profile).view==='three-quarter-left'?'left':'right';}
/** A planted lunge has only been authored for the right-facing candidate. */
export function validateBodyViewLunge(profile:Pick<HostProfile,'appearance'>){
  if(!usesBodyView(profile)||registeredBodyView(profile).view!=='three-quarter-right')throw new Error('needs-lunge-pose: left-facing/native source stance is not registered; choose an authored right-facing lunge');
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
  // Native eyes/mouth remain inside the same uniform attachment. Unselected
  // overlays, whole-face warp, expressions and continuous turns stay blocked.
  const url=imageUrl(c.file,c.sha256),source={sha256:c.sha256,width:c.width,height:c.height,url},mouth=bodyViewMouthSvg(profile,source,imageUrl),eyes=bodyViewEyesSvg(profile,source),expressions=bodyViewExpressionsSvg(profile,source,imageUrl);
  const secondary=hasBodyViewSecondary(profile)?nativeSecondarySvg(profile,c):undefined;
  return `<g data-body-view="${c.view}" data-registration="${BODY_VIEW_REGISTRATION_VERSION}" stroke="none"><defs><clipPath id="source-head-clip"><path d="${c.headClip}"/></clipPath>${secondary?`<image id="view-secondary-source" width="${c.width}" height="${c.height}" href="${url}"/>`:''}</defs>${secondary?.defs??''}<g id="head-view-front"><g transform="scale(${c.headScale}) translate(${-c.neck.x} ${-c.neck.y})">${secondary?.artwork??`<g clip-path="url(#source-head-clip)"><image width="${c.width}" height="${c.height}" href="${url}"/></g>`}<g clip-path="url(#source-head-clip)">${mouth}${eyes}${expressions}</g></g></g></g>`;
}
export function bodyViewClothingSvg(profile:HostProfile,imageUrl:(file:string,sha:string)=>string){
  const c=registeredBodyView(profile);
  const cloth=hasBodyViewSeat(profile)?nativeSeatSvg(profile,c,imageUrl):hasBodyViewLocomotion(profile)?nativeClothSvg(profile,c):undefined;
  return {defs:`<defs><mask id="view-clothing-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${c.width}" height="${c.height}"><path d="${c.clothing}" fill="white" stroke="white" stroke-width="${c.inkPad*2}" stroke-linejoin="round"/></mask><image id="view-body-source" width="${c.width}" height="${c.height}" href="${imageUrl(c.file,c.sha256)}"/></defs>`+(cloth?.defs??''),
    torso:`<g stroke="none" transform="scale(${c.bodyScale}) translate(${-c.pelvis.x} ${-c.pelvis.y})">${cloth?.artwork??'<g mask="url(#view-clothing-mask)"><use href="#view-body-source"/></g>'}</g>`};
}
export const bodyViewDescription={version:BODY_VIEW_REGISTRATION_VERSION,artworkVersion:BODY_VIEW_VERSION,
  sources:bodyViewRegistrations,mouthCandidate:bodyViewMouthDescription,eyesCandidate:bodyViewEyesDescription,expressionsCandidate:bodyViewExpressionsDescription,locomotionCandidate:nativeClothDescription,seatedCandidate:nativeSeatDescription,secondaryCandidate:nativeSecondaryDescription,fingerprint:hash({version:BODY_VIEW_REGISTRATION_VERSION,bodyViewRegistrations,mouth:bodyViewMouthDescription.fingerprint,eyes:bodyViewEyesDescription.fingerprint,expressions:bodyViewExpressionsDescription.fingerprint,cloth:nativeClothDescription.fingerprint,seat:nativeSeatDescription.fingerprint,secondary:nativeSecondaryDescription.fingerprint}),
  status:'developer-landmark-and-layer-candidate',productionReady:false,approved:false,
  method:'fixed authored 3/4 left/right head/body with independent uniform native registrations; source limb lengths and mitten/sole artwork retained; no mirror or face warp',
  limitations:['identity/proportion/mask review','happy fixed view by default; optional unapproved speech/eyes/expression selections','rigid garment by default; optional unapproved locomotion and separately selected single-shot seated candidate','bounded eye look only; no continuous body/head turn or optical gaze','native seated supports through camera cuts remain pending','no motion acceptance']};
