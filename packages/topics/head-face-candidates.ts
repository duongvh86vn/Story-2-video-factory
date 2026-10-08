/** Authoring candidates only. This catalog does not grant production approval. */
export const HEAD_FACE_WORKBENCH_VERSION='native-head-face-workbench-3';
export const HEAD_FACE_VIEWS=['three-quarter-right','three-quarter-left'] as const;
export type HeadFaceView=typeof HEAD_FACE_VIEWS[number];
export const HEAD_FACE_CANDIDATES=[
  {actor:'lila',view:'three-quarter-right',id:'lila-source-face-v1',file:'library/topics/prehistoric-life/head-face-registrations/lila-source-face-v1.json',headFile:'lila-head-source-angle-v2.png'},
  {actor:'karo',view:'three-quarter-right',id:'karo-source-face-v1',file:'library/topics/prehistoric-life/head-face-registrations/karo-source-face-v1.json',headFile:'karo-head-source-angle-v2.png'},
  {actor:'lila',view:'three-quarter-left',id:'lila-left-face-v1',file:'library/topics/prehistoric-life/head-face-registrations/lila-left-face-v1.json',headFile:'lila-head-left-dialogue-v1.png'},
  {actor:'karo',view:'three-quarter-left',id:'karo-left-face-v1',file:'library/topics/prehistoric-life/head-face-registrations/karo-left-face-v1.json',headFile:'karo-head-left-dialogue-v1.png'},
] as const;
