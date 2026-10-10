import {BASIC_UNREGISTERED_OPTIONS,basicBodyHasUnsupportedOptions} from './body-view-basic-capabilities.js';
/** Own-front PNG authoring candidates in native canvas pixels. These manually
 * authored landmarks/masks are approximations awaiting visual/pose review,
 * NOT measured anatomy/yaw, accepted rig geometry or production approval.
 * Rig-left remains anatomical right (screen-left in this frontal drawing).
 * Never inherit another view's face, clothing mask or feature registrations. */
export const FRONT_UNREGISTERED_OPTIONS=BASIC_UNREGISTERED_OPTIONS;
export function frontBodyHasUnsupportedOptions(a:{bodyView?:unknown}&Partial<Record<typeof FRONT_UNREGISTERED_OPTIONS[number],unknown>>){
  return a.bodyView==='front'&&basicBodyHasUnsupportedOptions(a);
}
export const bodyFrontRegistration={
  lila:{view:'front',file:'library/topics/prehistoric-life/body-views/lila-front-v1.png',
    sha256:'f25c96337a4afbee79a9ed2650e1f065d43a5bb92eade24201cafe30acff36ce',width:939,height:1675,
    bodyScale:66.8/365,headScale:113.8/510,pelvis:{x:490,y:907},neck:{x:490,y:542},
    shoulders:{left:{x:375,y:613},right:{x:590,y:614}},hips:{left:{x:427,y:929},right:{x:557,y:929}},
    armDepth:'coplanar',restDirectionsDeg:{left:{upper:104,lower:96},right:{upper:76,lower:84}},inkPad:7,
    clothing:'M458 530L513 530L515 557L542 574L572 575L592 598L598 646L609 679L600 718L619 766L586 790L583 835L599 877L623 888L627 930L642 975L659 1020L676 1065L675 1120L695 1185L687 1255L642 1215L628 1278L601 1244L588 1197L558 1246L546 1181L515 1210L500 1149L483 1112L463 1157L445 1231L420 1181L400 1256L377 1199L346 1227L356 1170L327 1208L343 1122L333 1099L349 1038L340 1010L362 956L371 930L381 900L389 877L384 850L397 798L386 772L393 738L391 697L402 666L399 631L406 598L439 577L455 555Z',
    headClip:'M0 0H939V540H545L532 526H454L443 550L412 570L382 608L365 655L348 704L329 748L301 795L270 840L233 889H0Z',
    headBounds:{left:157,right:779,top:32,bottom:889},chin:{left:{x:382,y:482},right:{x:585,y:482}}},
  karo:{view:'front',file:'library/topics/prehistoric-life/body-views/karo-front-v1.png',
    sha256:'51dbffa390baea557b569d293bb9e7d87ad53948da17c253d060cc9efb5b1f9e',width:1024,height:1536,
    bodyScale:66.2/341,headScale:124/537,pelvis:{x:512,y:904},neck:{x:512,y:563},
    shoulders:{left:{x:390,y:566},right:{x:634,y:561}},hips:{left:{x:441,y:929},right:{x:586,y:929}},
    armDepth:'coplanar',restDirectionsDeg:{left:{upper:104,lower:96},right:{upper:76,lower:84}},inkPad:7,
    clothing:'M445 535L555 535L587 533L621 541L636 565L637 612L648 662L651 709L660 755L661 800L673 848L657 871L661 888L675 918L680 948L697 971L680 991L682 1031L697 1071L701 1104L698 1135L667 1108L650 1150L627 1126L607 1157L588 1118L572 1092L552 1112L542 1050L518 1004L502 1054L486 1105L466 1093L446 1154L419 1121L394 1152L377 1106L345 1117L343 1088L355 1042L347 1018L368 974L367 940L382 916L378 889L361 864L374 823L371 798L384 761L379 738L397 709L403 668L407 623L406 582L420 551Z',
    headClip:'M0 0H1024V514H650L611 556L563 575L513 560L480 569L434 553L392 514H0Z',
    headBounds:{left:183,right:839,top:23,bottom:575},chin:{left:{x:409,y:498},right:{x:625,y:498}}},
} as const;
export const frontBodyRegistrationDescription={version:'native-front-body-registration-6',sources:bodyFrontRegistration,
  coordinateAuthority:'manually authored source-canvas approximations; not measured anatomy/pose/yaw',measuredYawDeg:null,
  capabilities:['fixed happy source head','rigid own-source clothing','same-person canonical soft limb rest/point/think candidate','explicit registered-basic-eyes-v1 from own front source; bounded look/blink candidate only','explicit registered-basic-mouth-v1 from own front source; activity-driven mouth and original speaker clock, unaccepted skin/contour seams'],
  ownMotion:'explicit registered-front-motion-v1 from own frontal PNG/canvas cage; lateral paired sidestep, jump, stand/crouch/lean and react; no forward walk/run or depth travel; own face/secondary selections remain independent; physical/art/motion acceptance pending',
  ownSecondary:'explicit registered-front-secondary-v1 uses own front crest/tail/lower beard texture cues; shared own face erase masks, original expression clock and manual lower-beard UV contour; seams/segmentation/identity/motion unaccepted',
  ownExpressions:'explicit registered-basic-expressions-v1 with own front brows, registered-basic-eyes-v1 and registered-basic-mouth-v1; original expression clock, unaccepted skin/ink/contour seams',
  unavailable:['phoneme lip-sync','exact optical gaze','laugh/body acting acceptance','forward walk/run and depth travel','seat','cloth rigid unless own front motion selected; hair/beard rigid unless own front secondary selected','manipulation/tools','supporting cast','head bank','continuous body/head turns'],
  artApproved:false,approved:false,motionVerified:false,productionReady:false,productionRig:null,availableBanks:[]};
