import type {NativeSecondaryRegion} from './body-view-secondary.js';
export const FRONT_BODY_SECONDARY_SELECTION='registered-front-secondary-v1' as const;
export const FRONT_BODY_SECONDARY_VERSION='native-front-secondary-1';
export function isFrontSecondaryView(view:unknown):view is 'front'{return view==='front';}
/** Own front-source texture cues, not accepted segmentation/anatomy. The
 * lower beard uses its own UV contour to avoid moving the visible neck.
 * Face features, neck and Lila's tie stay outside the selected source pixels.
 * No other-view landmarks, inferred yaw, mirrored face or turn capability. */
export const frontSecondaryBindings={
  lila:{front:{file:'library/topics/prehistoric-life/body-views/lila-front-v1.png',sha256:'f25c96337a4afbee79a9ed2650e1f065d43a5bb92eade24201cafe30acff36ce',width:939,height:1675,hairTie:{x:260,y:476,width:88,height:58},protectedNeck:{x:466,y:518,width:48,height:48},regions:[
    {id:'crest',left:200,right:770,top:35,bottom:195,pin:'bottom',maxDisplacement:12,gain:.35},
    {id:'tail',left:157,right:345,top:555,bottom:889,pin:'top',maxDisplacement:32,gain:1},
  ]}},
  karo:{front:{file:'library/topics/prehistoric-life/body-views/karo-front-v1.png',sha256:'51dbffa390baea557b569d293bb9e7d87ad53948da17c253d060cc9efb5b1f9e',width:1024,height:1536,hairTie:null,protectedNeck:{x:488,y:554,width:48,height:48},regions:[
    {id:'crest',left:205,right:823,top:28,bottom:160,pin:'bottom',maxDisplacement:12,gain:.35},
    {id:'beard',left:378,right:650,top:455,bottom:552,pin:'top',maxDisplacement:10,gain:.3,sourceClip:'M378 455H650L636 490L625 505L596 515L607 524L565 538L528 544L511 550L500 548L500 543L475 540L467 535L464 530L463 526L434 525L429 517L422 511L398 504L389 495Z'},
  ]}},
} as const satisfies Record<'lila'|'karo',Record<'front',{file:string;sha256:string;width:number;height:number;hairTie:{x:number;y:number;width:number;height:number}|null;protectedNeck:{x:number;y:number;width:number;height:number};regions:readonly[NativeSecondaryRegion,NativeSecondaryRegion]}>>;
