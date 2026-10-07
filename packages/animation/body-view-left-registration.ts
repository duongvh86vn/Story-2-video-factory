import {bodyViewLeftClothingContours} from './body-view-left-contours.js';
/** Manually authored candidate landmarks in native PNG pixel coordinates.
 * These independent views are NOT mirrors of the right-facing registrations.
 * Hair/garment occlusion, facial fidelity, proportions and landmarks remain
 * unaccepted; physical limb lengths and source mitten/sole artwork are separate. */
export const bodyViewLeftRegistration={
  lila:{view:'three-quarter-left',file:'library/topics/prehistoric-life/body-views/lila-three-quarter-left-v2.png',
    sha256:'ef90f6783d89a8e554c12605065a218faf4e0f6aae4411ae00cccf6825b686bf',width:1024,height:1536,
    bodyScale:66.8/264,headScale:113.8/430,pelvis:{x:543,y:786},neck:{x:509,y:522},
    shoulders:{left:{x:443,y:570},right:{x:607,y:609}},hips:{left:{x:504,y:806},right:{x:585,y:806}},
    nearHand:'right',farHand:'left',clothing:bodyViewLeftClothingContours.lila,inkPad:7,
    headClip:'M0 0H1024V800H694L680 770L666 730L646 690L642 650L606 595L571 549L530 518L482 492L425 493H0Z',
    headBounds:{left:250,right:840,top:92,bottom:800},chin:{left:{x:547,y:454},right:{x:379,y:455}}},
  karo:{view:'three-quarter-left',file:'library/topics/prehistoric-life/body-views/karo-three-quarter-left-v1.png',
    sha256:'bfcffe1fac13281de68ca11910407bb22fde02f8f5f5d867054713399166fdf4',width:910,height:1729,
    bodyScale:66.2/378,headScale:124/554,pelvis:{x:494,y:1012},neck:{x:514,y:634},
    shoulders:{left:{x:389,y:659},right:{x:563,y:697}},hips:{left:{x:430,y:1030},right:{x:550,y:1030}},
    nearHand:'right',farHand:'left',clothing:bodyViewLeftClothingContours.karo,inkPad:7,
    headClip:'M0 0H910V625L570 625L544 641L522 646H352L323 628L306 595H0Z',
    headBounds:{left:170,right:788,top:80,bottom:646},chin:{left:{x:531,y:602},right:{x:344,y:560}}},
} as const;
