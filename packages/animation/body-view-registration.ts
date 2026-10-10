import {bodyViewClothingContours} from './body-view-contours.js';
import {bodyViewLeftRegistration} from './body-view-left-registration.js';
import {bodyFrontRegistration} from './body-view-front-registration.js';
import {bodyObliqueRegistration} from './body-view-oblique-registration.js';
import {OBLIQUE_BODY_VIEWS} from './body-view-basic-capabilities.js';
export const REGISTERED_BODY_VIEWS=['three-quarter-right','three-quarter-left'] as const;
export type RegisteredBodyView=typeof REGISTERED_BODY_VIEWS[number];
/** Legacy detail maps cover only REGISTERED_BODY_VIEWS. Never broaden those
 * loops when adding a view with fewer own-source capabilities. */
export const BODY_CANDIDATE_VIEWS=[...REGISTERED_BODY_VIEWS,'front',...OBLIQUE_BODY_VIEWS] as const;
export {bodyFrontRegistration};
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
/** Retain bodyViewRegistration[actor] as the existing right-view API. New
 * callers select explicit native artwork; neither view reflects the other. */
export const bodyViewRegistrations={
  lila:{'three-quarter-right':bodyViewRegistration.lila,'three-quarter-left':bodyViewLeftRegistration.lila},
  karo:{'three-quarter-right':bodyViewRegistration.karo,'three-quarter-left':bodyViewLeftRegistration.karo},
} as const;
export const bodyCandidateRegistrations={
  lila:{...bodyViewRegistrations.lila,front:bodyFrontRegistration.lila,...bodyObliqueRegistration.lila},
  karo:{...bodyViewRegistrations.karo,front:bodyFrontRegistration.karo,...bodyObliqueRegistration.karo},
} as const;
