import type {NativeSecondaryRegion} from './body-view-secondary.js';
export const PROFILE_BODY_SECONDARY_SELECTION='registered-profile-secondary-v1' as const;
export const PROFILE_BODY_SECONDARY_VERSION='native-profile-secondary-1';
export const PROFILE_SECONDARY_VIEWS=['left','right'] as const;
export type ProfileSecondaryView=typeof PROFILE_SECONDARY_VIEWS[number];
export function isProfileSecondaryView(view:unknown):view is ProfileSecondaryView{return PROFILE_SECONDARY_VIEWS.some(v=>v===view);}
/** Independent own-source crest/tail/beard cues, not measured anatomy or
 * accepted segmentation. Attachment row/side seams stay pinned. Face feature
 * ROIs and neck are protected separately; no inferred hidden hair or yaw. */
export const profileSecondaryBindings={
  lila:{
    left:{file:'library/topics/prehistoric-life/body-views/lila-left-v2.png',sha256:'aa8ef7e30b11bf8f34b85ca7de211d20c0900a09437ba3a10e76aab7eee0afee',width:1173,height:1341,hairTie:{x:682,y:420,width:83,height:63},regions:[
      {id:'crest',left:394,right:879,top:56,bottom:202,pin:'bottom',maxDisplacement:12,gain:.35},
      {id:'tail',left:700,right:851,top:536,bottom:797,pin:'top',maxDisplacement:32,gain:1},
    ]},
    right:{file:'library/topics/prehistoric-life/body-views/lila-right-v3.png',sha256:'4ee7c232a489162159542d58f06ae16a72fadb9bc1382170b5c07a6ca3c4e311',width:1024,height:1536,hairTie:{x:330,y:439,width:116,height:82},regions:[
      {id:'crest',left:214,right:829,top:30,bottom:182,pin:'bottom',maxDisplacement:12,gain:.35},
      {id:'tail',left:244,right:434,top:545,bottom:833,pin:'top',maxDisplacement:32,gain:1},
    ]},
  },
  karo:{
    left:{file:'library/topics/prehistoric-life/body-views/karo-left-v1.png',sha256:'9d000f6134385eebba1b79aaff8cb07b266bca9b87e16f3bd3529b379a2a8e6b',width:910,height:1728,hairTie:null,regions:[
      {id:'crest',left:205,right:721,top:83,bottom:268,pin:'bottom',maxDisplacement:12,gain:.35},
      {id:'beard',left:260,right:395,top:554,bottom:622,pin:'top',maxDisplacement:10,gain:.3},
    ]},
    right:{file:'library/topics/prehistoric-life/body-views/karo-right-v2.png',sha256:'d3bf00b107d07c12a7384610a9181d6aa2ca14f9e5e160ff133f69aece3f37d8',width:910,height:1727,hairTie:null,regions:[
      {id:'crest',left:223,right:750,top:28,bottom:214,pin:'bottom',maxDisplacement:12,gain:.35},
      {id:'beard',left:547,right:679,top:491,bottom:548,pin:'top',maxDisplacement:10,gain:.3},
    ]},
  },
} as const satisfies Record<'lila'|'karo',Record<ProfileSecondaryView,{file:string;sha256:string;width:number;height:number;hairTie:{x:number;y:number;width:number;height:number}|null;regions:readonly[NativeSecondaryRegion,NativeSecondaryRegion]}>>;
