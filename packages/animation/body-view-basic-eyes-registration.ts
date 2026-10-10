import type {NativeEyeRegistration} from './body-view-eyes.js';

export const BASIC_BODY_EYES_SELECTION='registered-basic-eyes-v1' as const;
export const BASIC_BODY_EYES_VERSION='forest-basic-view-eyes-1';
export const BASIC_EYE_VIEWS=['front','left','right'] as const;
export type BasicEyeView=typeof BASIC_EYE_VIEWS[number];
export function isBasicEyeView(view:unknown):view is BasicEyeView{return BASIC_EYE_VIEWS.some(v=>v===view);}
/** Own PNG pixels only. Screen slots are not anatomical left/right labels.
 * Profiles have ONE visible eye. Coordinates, skin strips, clip ellipses,
 * lids and bounded shifts are unaccepted authoring cues, not optical gaze or
 * yaw measurements. Original images and legacy3/4 registrations stay intact. */
export const bodyViewBasicEyesRegistration={
  lila:{
    front:{view:'front',file:'library/topics/prehistoric-life/body-views/lila-front-v1.png',sourceHash:'f25c96337a4afbee79a9ed2650e1f065d43a5bb92eade24201cafe30acff36ce',sourceSize:[939,1675],sourceErase:true,eyes:[
      {slot:'screen-left',center:{x:428.5,y:365.5},rx:15.5,ry:22,shift:{x:5,y:3},bounds:{x:407,y:339,width:44,height:52},strip:{x:407,y:391,width:44,height:3}},
      {slot:'screen-right',center:{x:567,y:360.5},rx:15,ry:22,shift:{x:5,y:3},bounds:{x:545,y:334,width:44,height:52},strip:{x:545,y:386,width:44,height:3}},
    ]},
    left:{view:'left',file:'library/topics/prehistoric-life/body-views/lila-left-v2.png',sourceHash:'aa8ef7e30b11bf8f34b85ca7de211d20c0900a09437ba3a10e76aab7eee0afee',sourceSize:[1173,1341],sourceErase:true,eyes:[
      {slot:'screen-left',center:{x:482.5,y:290.5},rx:10.5,ry:21,shift:{x:3,y:2},bounds:{x:465,y:264,width:35,height:54},strip:{x:465,y:318,width:35,height:3}},
    ]},
    right:{view:'right',file:'library/topics/prehistoric-life/body-views/lila-right-v3.png',sourceHash:'4ee7c232a489162159542d58f06ae16a72fadb9bc1382170b5c07a6ca3c4e311',sourceSize:[1024,1536],sourceErase:true,eyes:[
      {slot:'screen-right',center:{x:693.5,y:303},rx:14.5,ry:26,shift:{x:4,y:3},bounds:{x:671,y:271,width:45,height:64},strip:{x:671,y:335,width:45,height:3}},
    ]},
  },
  karo:{
    front:{view:'front',file:'library/topics/prehistoric-life/body-views/karo-front-v1.png',sourceHash:'51dbffa390baea557b569d293bb9e7d87ad53948da17c253d060cc9efb5b1f9e',sourceSize:[1024,1536],sourceErase:true,eyes:[
      {slot:'screen-left',center:{x:459.5,y:287.5},rx:14.5,ry:20,shift:{x:5,y:3},bounds:{x:439,y:262,width:42,height:52},strip:{x:439,y:314,width:42,height:3}},
      {slot:'screen-right',center:{x:594,y:286},rx:14,ry:19,shift:{x:5,y:3},bounds:{x:574,y:261,width:40,height:50},strip:{x:574,y:311,width:40,height:3}},
    ]},
    left:{view:'left',file:'library/topics/prehistoric-life/body-views/karo-left-v1.png',sourceHash:'9d000f6134385eebba1b79aaff8cb07b266bca9b87e16f3bd3529b379a2a8e6b',sourceSize:[910,1728],sourceErase:true,eyes:[
      {slot:'screen-left',center:{x:305,y:369},rx:12,ry:21,shift:{x:3,y:2},bounds:{x:284,y:342,width:42,height:56},strip:{x:284,y:398,width:42,height:3}},
    ]},
    right:{view:'right',file:'library/topics/prehistoric-life/body-views/karo-right-v2.png',sourceHash:'d3bf00b107d07c12a7384610a9181d6aa2ca14f9e5e160ff133f69aece3f37d8',sourceSize:[910,1727],sourceErase:true,eyes:[
      {slot:'screen-right',center:{x:613,y:316},rx:14,ry:23,shift:{x:4,y:2},bounds:{x:594,y:286,width:40,height:60},strip:{x:594,y:346,width:40,height:3}},
    ]},
  },
} as const satisfies Record<'lila'|'karo',Record<BasicEyeView,NativeEyeRegistration&{view:BasicEyeView;file:string}>>;
