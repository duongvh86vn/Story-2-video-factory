export const REAR_BODY_LOCOMOTION_SELECTION='registered-rear-locomotion-v1' as const;
export const REAR_BODY_CLOTH_VERSION='native-rear-cloth-1';
export const REAR_MOTION_VIEWS=['back-left','back-right'] as const;
export type RearMotionView=typeof REAR_MOTION_VIEWS[number];
export function isRearMotionView(view:unknown):view is RearMotionView{return REAR_MOTION_VIEWS.some(v=>v===view);}
/** Own rear PNG/canvas belt/hem authoring cues, not accepted anatomy/fabric.
 * Source coordinates are independent of profile and detailed3/4 artworks.
 * The pinned row is below the visible belt; upper clothing stays intact.
 * No inferred yaw, hidden facial glyphs, seat, tool grip or turn is granted. */
export const rearClothBindings={
  lila:{
    'back-left':{file:'library/topics/prehistoric-life/body-views/lila-back-three-quarter-left-v2.png',sha256:'48b6607a9395bcb77e34ac58648f3eee5a4d66df36afebc85efa76c7b1d99349',width:939,height:1675,left:330,right:668,waist:936,bottom:1288,split:491},
    'back-right':{file:'library/topics/prehistoric-life/body-views/lila-back-three-quarter-right-v1.png',sha256:'4e13ed7b693be71213bc3f223f4e2bd817f5ab9b177b091141cd798b78661e32',width:939,height:1676,left:367,right:708,waist:919,bottom:1283,split:552},
  },
  karo:{
    'back-left':{file:'library/topics/prehistoric-life/body-views/karo-back-three-quarter-left-v1.png',sha256:'4a281876694fb6f1952e7d35496ab2d353f60d131d570f0a255a0dcd4637e97b',width:910,height:1729,left:312,right:668,waist:1035,bottom:1305,split:495},
    'back-right':{file:'library/topics/prehistoric-life/body-views/karo-back-three-quarter-right-v2.png',sha256:'4bbe2bc16625b8c35bc81015607eeb3a8151f838450af3d0917bcc23957d22b6',width:910,height:1728,left:298,right:698,waist:1016,bottom:1305,split:496},
  },
} as const;
