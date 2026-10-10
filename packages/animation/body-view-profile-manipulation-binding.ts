export const PROFILE_BODY_MANIPULATION_SELECTION='registered-profile-manipulation-v1' as const;
export const PROFILE_BODY_MANIPULATION_VERSION='native-profile-manipulation-1';
export const PROFILE_MANIPULATION_VIEWS=['left','right'] as const;
export type ProfileManipulationView=typeof PROFILE_MANIPULATION_VIEWS[number];
export function isProfileManipulationView(view:unknown):view is ProfileManipulationView{return PROFILE_MANIPULATION_VIEWS.some(v=>v===view);}
/** Exact own profile sources. Shoulders/rest directions/depth remain their
 * own authored registrations; canonical same-person bones/cuff/palm are
 * reused. No new finger/wrist/tool pose, yaw or anatomy/art acceptance. */
export const profileManipulationBindings={
  lila:{
    left:{file:'library/topics/prehistoric-life/body-views/lila-left-v2.png',sha256:'aa8ef7e30b11bf8f34b85ca7de211d20c0900a09437ba3a10e76aab7eee0afee',width:1173,height:1341},
    right:{file:'library/topics/prehistoric-life/body-views/lila-right-v3.png',sha256:'4ee7c232a489162159542d58f06ae16a72fadb9bc1382170b5c07a6ca3c4e311',width:1024,height:1536},
  },
  karo:{
    left:{file:'library/topics/prehistoric-life/body-views/karo-left-v1.png',sha256:'9d000f6134385eebba1b79aaff8cb07b266bca9b87e16f3bd3529b379a2a8e6b',width:910,height:1728},
    right:{file:'library/topics/prehistoric-life/body-views/karo-right-v2.png',sha256:'d3bf00b107d07c12a7384610a9181d6aa2ca14f9e5e160ff133f69aece3f37d8',width:910,height:1727},
  },
} as const;
