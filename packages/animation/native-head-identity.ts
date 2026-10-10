import {PREHISTORIC_SUPPORTING_MODELS,prehistoricSupportingModels,type PrehistoricSupportingModel} from '../topics/supporting-models.js';

/** Visual model identity is separate from a sourced story-person ID. A shared
 * costume template never authorizes that template's principal face resource. */
export const NATIVE_HEAD_ACTORS=['lila','karo',...PREHISTORIC_SUPPORTING_MODELS] as const;
export type NativeHeadActor=typeof NATIVE_HEAD_ACTORS[number];
export const NATIVE_SUPPORTING_HEAD_BANK_VERSION='native-head-bank-4' as const;
export const NATIVE_EMOTION_HEAD_BANK_VERSION='native-head-bank-5' as const;
export const NATIVE_MOTION_HEAD_BANK_VERSION='native-head-bank-6' as const;
export const NATIVE_OCCLUSION_HEAD_BANK_VERSION='native-head-bank-7' as const;
const male=prehistoricSupportingModels['prehistoric-male-bald'],female=prehistoricSupportingModels['prehistoric-female-haired'];
export const nativeHeadIdentities={
  lila:{bodyTemplate:'lila',supporting:false,mouthKind:'skin-strip',primary:{file:'docs/topics/assets/reference-lila-full.png',sha256:'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce'}},
  karo:{bodyTemplate:'karo',supporting:false,mouthKind:'native-rim',primary:{file:'docs/topics/assets/reference-karo-full.png',sha256:'7106afd9697f5b4be341c46a357fe45981f29bb4b0e58dd136528e6c1e600aa2'}},
  'prehistoric-male-bald':{bodyTemplate:'karo',supporting:true,mouthKind:'skin-strip',primary:{file:male.file,sha256:male.sha256}},
  'prehistoric-female-haired':{bodyTemplate:'lila',supporting:true,mouthKind:'skin-strip',primary:{file:female.file,sha256:female.sha256}},
} as const;
export function nativeHeadIdentityMatches(appearance:{characterVariant?:'lila'|'karo';supportingModel?:PrehistoricSupportingModel},actor:NativeHeadActor){
  const identity=nativeHeadIdentities[actor];
  return appearance.characterVariant===identity.bodyTemplate&&(identity.supporting?appearance.supportingModel===actor:appearance.supportingModel===undefined);
}
export function isNativeHeadFaceVersion(version:string){return version==='native-head-bank-3'||version===NATIVE_SUPPORTING_HEAD_BANK_VERSION||version===NATIVE_EMOTION_HEAD_BANK_VERSION||version===NATIVE_MOTION_HEAD_BANK_VERSION||version===NATIVE_OCCLUSION_HEAD_BANK_VERSION;}
export function isSupportingNativeHeadVersion(version:string){return version===NATIVE_SUPPORTING_HEAD_BANK_VERSION||version===NATIVE_EMOTION_HEAD_BANK_VERSION||version===NATIVE_MOTION_HEAD_BANK_VERSION||version===NATIVE_OCCLUSION_HEAD_BANK_VERSION;}
