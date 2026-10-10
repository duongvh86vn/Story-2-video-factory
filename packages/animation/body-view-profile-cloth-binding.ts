export const PROFILE_BODY_LOCOMOTION_SELECTION='registered-profile-locomotion-v1' as const;
export const PROFILE_BODY_CLOTH_VERSION='native-profile-cloth-1';
export const PROFILE_MOTION_VIEWS=['left','right'] as const;
export type ProfileMotionView=typeof PROFILE_MOTION_VIEWS[number];
export function isProfileMotionView(view:unknown):view is ProfileMotionView{return PROFILE_MOTION_VIEWS.some(v=>v===view);}
/** Own PNG/canvas-bound belt/hem authoring cages, not measured anatomy or
 * accepted fabric. No detailed3/4 coordinates, neutral tile or mirrored art.
 * The upper row starts below the own belt; the original upper cloth stays
 * intact. Same-person canonical bone/mitten/sole inputs remain upstream. */
export const profileClothBindings={
  lila:{
    left:{file:'library/topics/prehistoric-life/body-views/lila-left-v2.png',sha256:'aa8ef7e30b11bf8f34b85ca7de211d20c0900a09437ba3a10e76aab7eee0afee',width:1173,height:1341,left:487,right:737,waist:736,bottom:1020,split:595},
    right:{file:'library/topics/prehistoric-life/body-views/lila-right-v3.png',sha256:'4ee7c232a489162159542d58f06ae16a72fadb9bc1382170b5c07a6ca3c4e311',width:1024,height:1536,left:376,right:698,waist:860,bottom:1176,split:550},
  },
  karo:{
    left:{file:'library/topics/prehistoric-life/body-views/karo-left-v1.png',sha256:'9d000f6134385eebba1b79aaff8cb07b266bca9b87e16f3bd3529b379a2a8e6b',width:910,height:1728,left:315,right:594,waist:1044,bottom:1302,split:448},
    right:{file:'library/topics/prehistoric-life/body-views/karo-right-v2.png',sha256:'d3bf00b107d07c12a7384610a9181d6aa2ca14f9e5e160ff133f69aece3f37d8',width:910,height:1727,left:308,right:648,waist:1001,bottom:1244,split:493},
  },
} as const;
