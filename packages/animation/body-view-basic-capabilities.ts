import {BASIC_BODY_EYES_SELECTION,isBasicEyeView} from './body-view-basic-eyes-registration.js';
import {BASIC_BODY_SPEECH_SELECTION,isBasicMouthView} from './body-view-basic-mouth-registration.js';
import {BASIC_BODY_EXPRESSIONS_SELECTION,isBasicExpressionView} from './body-view-basic-expression-registration.js';
import {PROFILE_BODY_LOCOMOTION_SELECTION,isProfileMotionView} from './body-view-profile-cloth-binding.js';
import {PROFILE_BODY_SECONDARY_SELECTION,isProfileSecondaryView} from './body-view-profile-secondary-binding.js';
import {REAR_BODY_LOCOMOTION_SELECTION,isRearMotionView} from './body-view-rear-cloth-binding.js';
/** Discovery of a source angle grants no detailed feature or production bank.
 * These fixed-view authoring candidates retain independent source geometry. */
export const OBLIQUE_BODY_VIEWS=['left','right','back-left','back-right'] as const;
export const BASIC_BODY_VIEWS=['front',...OBLIQUE_BODY_VIEWS] as const;
export type BasicBodyView=typeof BASIC_BODY_VIEWS[number];
export const BASIC_UNREGISTERED_OPTIONS=['bodySpeech','bodyEyes','bodyExpressions','bodyMotion','bodySeat','bodySecondary','bodyManipulation','bodyHeadBank','supportingModel','sourceColour'] as const;
export function isBasicBodyView(view:unknown):view is BasicBodyView{
  return BASIC_BODY_VIEWS.some(candidate=>candidate===view);
}
export function isRearBodyView(view:unknown):view is 'back-left'|'back-right'{return view==='back-left'||view==='back-right';}
export function basicBodyHasUnsupportedOptions(a:{bodyView?:unknown}&Partial<Record<typeof BASIC_UNREGISTERED_OPTIONS[number],unknown>>){
  return isBasicBodyView(a.bodyView)&&BASIC_UNREGISTERED_OPTIONS.some(key=>a[key]!==undefined&&!(key==='bodyEyes'&&a[key]===BASIC_BODY_EYES_SELECTION&&isBasicEyeView(a.bodyView))&&!(key==='bodySpeech'&&a[key]===BASIC_BODY_SPEECH_SELECTION&&isBasicMouthView(a.bodyView))&&!(key==='bodyExpressions'&&a[key]===BASIC_BODY_EXPRESSIONS_SELECTION&&isBasicExpressionView(a.bodyView)&&a.bodyEyes===BASIC_BODY_EYES_SELECTION&&a.bodySpeech===BASIC_BODY_SPEECH_SELECTION)&&!(key==='bodyMotion'&&a[key]===PROFILE_BODY_LOCOMOTION_SELECTION&&isProfileMotionView(a.bodyView))&&!(key==='bodyMotion'&&a[key]===REAR_BODY_LOCOMOTION_SELECTION&&isRearMotionView(a.bodyView))&&!(key==='bodySecondary'&&a[key]===PROFILE_BODY_SECONDARY_SELECTION&&isProfileSecondaryView(a.bodyView)));
}
export function basicBodyCapabilityError(view:unknown,feature:string){
  return new Error(`${view==='front'?'needs-front-capability':'needs-basic-view-capability'}: ${String(view)} has no own ${feature} registration; detailed3/4 data cannot be borrowed`);
}
export function basicBodyActionAllowed(view:BasicBodyView,action:string){
  return action==='rest'||action==='point'||action==='think'&&!isRearBodyView(view);
}
/** Head/body IDs use the existing HeadView contract. Source-art study IDs
 * retain their original, longer requested-view names; neither implies yaw. */
export const ART_TO_BODY_VIEW={front:'front','three-quarter-left':'three-quarter-left','three-quarter-right':'three-quarter-right',left:'left',right:'right','back-three-quarter-left':'back-left','back-three-quarter-right':'back-right'} as const;
