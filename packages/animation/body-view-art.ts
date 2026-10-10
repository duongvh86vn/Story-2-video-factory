import type {HostProfile} from '../host/schemas.js';
import {hash} from '../core/utils.js';
import {bodyViewRegistrations,bodyCandidateRegistrations,BODY_CANDIDATE_VIEWS,REGISTERED_BODY_VIEWS} from './body-view-registration.js';
export {bodyViewRegistration,bodyViewRegistrations,bodyCandidateRegistrations,BODY_CANDIDATE_VIEWS,REGISTERED_BODY_VIEWS,type RegisteredBodyView} from './body-view-registration.js';
import {frontBodyRegistrationDescription} from './body-view-front-registration.js';
import {basicBodyHasUnsupportedOptions,basicBodyCapabilityError} from './body-view-basic-capabilities.js';
import {obliqueBodyRegistrationDescription} from './body-view-oblique-registration.js';
import {PROFILE_BODY_LOCOMOTION_SELECTION,isProfileMotionView} from './body-view-profile-cloth-binding.js';
import {authoredRestArm} from './body-view-rest-arm.js';
import {BASIC_BODY_EYES_SELECTION} from './body-view-basic-eyes-registration.js';
import {BASIC_BODY_SPEECH_SELECTION} from './body-view-basic-mouth-registration.js';
import {BASIC_BODY_EXPRESSIONS_SELECTION} from './body-view-basic-expression-registration.js';
import {bodyViewMouthSvg,bodyViewMouthDescription} from './body-view-mouth.js';
import {bodyViewEyesSvg,bodyViewEyesDescription} from './body-view-eyes.js';
import {bodyViewExpressionsSvg,bodyViewExpressionsDescription} from './body-view-expressions.js';
import {hasBodyViewLocomotion,nativeClothSvg,nativeClothDescription} from './body-view-cloth.js';
import {hasBodyViewSecondary,nativeSecondarySvg,nativeSecondaryDescription} from './body-view-secondary.js';
import {hasBodyViewSeat,nativeSeatSvg,nativeSeatDescription} from './body-view-seat.js';
import {hasNativeHeadBank,nativeHeadBankSvg,registeredNativeHeadBank,nativeHeadBankBounds} from './body-head-bank.js';
import {nativeManipulationDescription} from './native-contact-arm.js';
import {nativeHeadBankDescription} from './native-head-bank.js';

export const BODY_VIEW_VERSION='forest-body-view-1' as const;
export const BODY_VIEW_REGISTRATION_VERSION='forest-view-registration-10';
type Point={x:number;y:number};
/** Manually authored pixel landmarks, not model-generated skeletons. These
 * engineering candidates use uniform head/body transforms. Their physical
 * limb lengths and hand/foot artwork remain the canonical source rig's.
 * Registration is neither identity approval nor production acceptance. */
export function usesBodyView(profile:Pick<HostProfile,'appearance'>){return profile.appearance.artworkVersion===BODY_VIEW_VERSION;}
export function registeredBodyView(profile:Pick<HostProfile,'appearance'>){
  const actor=profile.appearance.characterVariant,view=profile.appearance.bodyView;
  if(!actor||!view||!BODY_CANDIDATE_VIEWS.includes(view))throw new Error('needs-body-registration: this authored body angle has no registered candidate');
  if(basicBodyHasUnsupportedOptions(profile.appearance))throw basicBodyCapabilityError(view,'feature/action');
  return bodyCandidateRegistrations[actor][view];
}
/** Keep legacy detail consumers on their original two independently drawn
 * sources. Never coerce a basic fixed view to a detailed3/4 registration. */
export function registeredDetailedBodyView(profile:Pick<HostProfile,'appearance'>){
  const source=registeredBodyView(profile);
  if(source.view!=='three-quarter-left'&&source.view!=='three-quarter-right')throw basicBodyCapabilityError(source.view,'detailed3/4 feature');
  return source;
}
/** Motion consumes the explicitly selected same-view garment, never a
 * fallback detailed3/4 image. Seat/secondary/tool callers retain their guards. */
export function registeredLocomotionBodyView(profile:Pick<HostProfile,'appearance'>){
  const a=profile.appearance;
  if(!hasBodyViewLocomotion(profile)||a.artworkVersion!==BODY_VIEW_VERSION||a.characterVariant!=='lila'&&a.characterVariant!=='karo')throw new Error('needs-view-locomotion: select the exact native actor and motion mode');
  if(profile.appearance.bodyMotion!==PROFILE_BODY_LOCOMOTION_SELECTION)return registeredDetailedBodyView(profile);
  const source=registeredBodyView(profile);
  if(source.view!=='left'&&source.view!=='right'||!isProfileMotionView(profile.appearance.bodyView))throw basicBodyCapabilityError(source.view,'profile locomotion');
  return source;
}
export function bodyViewFacing(profile:Pick<HostProfile,'appearance'>){const view=registeredBodyView(profile).view;return view==='front'?'front':view==='three-quarter-left'||view==='left'||view==='back-left'?'left':'right';}
/** A planted lunge has only been authored for the right-facing candidate. */
export function validateBodyViewLunge(profile:Pick<HostProfile,'appearance'>){
  if(!usesBodyView(profile)||registeredBodyView(profile).view!=='three-quarter-right')throw new Error('needs-lunge-pose: left-facing/native source stance is not registered; choose an authored right-facing lunge');
}
export function bodyViewMetrics(profile:Pick<HostProfile,'appearance'>,limbs?:{arms:Record<'left'|'right',{upper:number;lower:number}>;handAttachment:Record<'left'|'right',{length:number}>}){
  const c=registeredBodyView(profile),b=profile.appearance.bodyScale,k=c.bodyScale*b;
  const relative=(p:Point)=>({x:(p.x-c.pelvis.x)*k,y:(p.y-c.pelvis.y)*k});
  const rest='restDirectionsDeg' in c&&limbs?{left:authoredRestArm(limbs.arms.left.upper,limbs.arms.left.lower+limbs.handAttachment.left.length,c.restDirectionsDeg.left),right:authoredRestArm(limbs.arms.right.upper,limbs.arms.right.lower+limbs.handAttachment.right.length,c.restDirectionsDeg.right)}:undefined;
  return {neckX:relative(c.neck).x,torsoTop:relative(c.neck).y,...(rest?{armRest:{left:rest.left.grip,right:rest.right.grip},armRestPole:{left:rest.left.pole,right:rest.right.pole}}:{}),
    shoulders:{left:relative(c.shoulders.left),right:relative(c.shoulders.right)},
    hips:{left:relative(c.hips.left),right:relative(c.hips.right)}};
}
export function bodyViewAsset(appearance:HostProfile['appearance']){
  const c=registeredBodyView({appearance});return {file:c.file,sha256:c.sha256,path:'assets/rigs/'+c.sha256+'.png'};
}
export function bodyViewHeadCalibration(profile:HostProfile){
  const c=registeredBodyView(profile);
  if(hasNativeHeadBank(profile)){const bank=registeredNativeHeadBank(profile);return {...c,neck:{x:0,y:0},chin:{left:{x:0,y:0},right:{x:0,y:0}},scale:1,bounds:nativeHeadBankBounds(bank)};}
  return {...c,scale:c.headScale,bounds:c.headBounds};
}
export function bodyViewHeadSvg(profile:HostProfile,imageUrl:(file:string,sha:string)=>string){
  if(hasNativeHeadBank(profile))return nativeHeadBankSvg(profile,imageUrl);
  const c=registeredBodyView(profile);
  // Native eyes/mouth remain inside the same uniform attachment. Unselected
  // overlays, whole-face warp, expressions and continuous turns stay blocked.
  const url=imageUrl(c.file,c.sha256),source={sha256:c.sha256,width:c.width,height:c.height,url},mouth=bodyViewMouthSvg(profile,source,imageUrl),eyes=bodyViewEyesSvg(profile,source),expressions=bodyViewExpressionsSvg(profile,source,imageUrl);
  const secondary=hasBodyViewSecondary(profile)?nativeSecondarySvg(profile,registeredDetailedBodyView(profile)):undefined;
  const base=`<image width="${c.width}" height="${c.height}" href="${url}"${profile.appearance.bodyEyes===BASIC_BODY_EYES_SELECTION?' mask="url(#view-eyes-source-mask)"':''}/>`;
  const mouthMasked=profile.appearance.bodySpeech===BASIC_BODY_SPEECH_SELECTION?`<g mask="url(#view-mouth-source-mask)">${base}</g>`:base;
  const sourceHead=profile.appearance.bodyExpressions===BASIC_BODY_EXPRESSIONS_SELECTION?`<g mask="url(#view-expression-source-mask)">${mouthMasked}</g>`:mouthMasked;
  return `<g data-body-view="${c.view}" data-registration="${BODY_VIEW_REGISTRATION_VERSION}" stroke="none"><defs><clipPath id="source-head-clip"><path d="${c.headClip}"/></clipPath>${secondary?`<image id="view-secondary-source" width="${c.width}" height="${c.height}" href="${url}"/>`:''}</defs>${secondary?.defs??''}<g id="head-view-front"><g transform="scale(${c.headScale}) translate(${-c.neck.x} ${-c.neck.y})">${secondary?.artwork??`<g clip-path="url(#source-head-clip)">${sourceHead}</g>`}<g clip-path="url(#source-head-clip)">${mouth}${eyes}${expressions}</g></g></g></g>`;
}
export function bodyViewClothingSvg(profile:HostProfile,imageUrl:(file:string,sha:string)=>string){
  const c=registeredBodyView(profile);
  const cloth=hasBodyViewSeat(profile)?nativeSeatSvg(profile,registeredDetailedBodyView(profile),imageUrl):hasBodyViewLocomotion(profile)?nativeClothSvg(profile,registeredLocomotionBodyView(profile)):undefined;
  return {defs:`<defs><mask id="view-clothing-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${c.width}" height="${c.height}"><path d="${c.clothing}" fill="white" stroke="white" stroke-width="${c.inkPad*2}" stroke-linejoin="round"/></mask><image id="view-body-source" width="${c.width}" height="${c.height}" href="${imageUrl(c.file,c.sha256)}"/></defs>`+(cloth?.defs??''),
    torso:`<g stroke="none" transform="scale(${c.bodyScale}) translate(${-c.pelvis.x} ${-c.pelvis.y})">${cloth?.artwork??'<g mask="url(#view-clothing-mask)"><use href="#view-body-source"/></g>'}</g>`};
}
export const bodyViewDescription={version:BODY_VIEW_REGISTRATION_VERSION,artworkVersion:BODY_VIEW_VERSION,
  sources:bodyViewRegistrations,frontCandidate:frontBodyRegistrationDescription,obliqueCandidate:obliqueBodyRegistrationDescription,headBankCandidate:nativeHeadBankDescription,mouthCandidate:bodyViewMouthDescription,eyesCandidate:bodyViewEyesDescription,expressionsCandidate:bodyViewExpressionsDescription,locomotionCandidate:nativeClothDescription,seatedCandidate:nativeSeatDescription,secondaryCandidate:nativeSecondaryDescription,manipulationCandidate:nativeManipulationDescription,fingerprint:hash({version:BODY_VIEW_REGISTRATION_VERSION,bodyViewRegistrations,front:frontBodyRegistrationDescription,oblique:obliqueBodyRegistrationDescription,headBank:nativeHeadBankDescription,mouth:bodyViewMouthDescription.fingerprint,eyes:bodyViewEyesDescription.fingerprint,expressions:bodyViewExpressionsDescription.fingerprint,cloth:nativeClothDescription.fingerprint,seat:nativeSeatDescription.fingerprint,secondary:nativeSecondaryDescription.fingerprint,manipulation:nativeManipulationDescription.fingerprint}),
  status:'developer-landmark-and-layer-candidate',productionReady:false,approved:false,
  method:'independent uniform3/4 sources plus own front/profile/rear fixed-view engineering candidates; own neutral-arm cues/poles with same-person canonical bones/mitten/sole; no borrowed detailed features, mirrored/warped faces or inferred yaw',
  limitations:['front/profile/rear landmarks/masks/depth/arm direction are own-source approximations, not measured or accepted; fixed happy/rigid rest/point/think except rear has no think/chin; no continuous turns','identity/proportion/mask review','happy fixed view by default; optional unapproved speech/eyes/expression selections','rigid garment by default; optional unapproved locomotion and separately selected seated candidate','bounded eye look only; no continuous body/head turn or optical gaze','source support clock through camera cuts is source-only; runtime equivalence remains pending','no motion acceptance']};
