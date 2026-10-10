import {z} from 'zod';
import {HEAD_FACE_MODES} from './head-face-candidates.js';

/** Screen placement is explicit. The opposite layout selects independent
 * painted views; it never reflects an image or swaps actor identities. */
export const NATIVE_HEAD_SEAT_TRACER_VERSION='native-head-seat-tracer-6';
export const NATIVE_HEAD_SEAT_TRACER_SCOPE='unapproved-native-head-seat-tracer';
export const NATIVE_DIALOGUE_STAGINGS=['lila-left','lila-right'] as const;
export const NATIVE_DIALOGUE_ACTING=['rest','listening-think','emotional-reactions'] as const;
export const NativeDialogueSelectionSchema=z.object({
  staging:z.enum(NATIVE_DIALOGUE_STAGINGS).default('lila-left'),
  acting:z.enum(NATIVE_DIALOGUE_ACTING).default('rest'),
  face:z.enum(HEAD_FACE_MODES).optional(),
}).strict();
export type NativeDialogueSelection=z.infer<typeof NativeDialogueSelectionSchema>;
export const nativeDialogueLayouts={
  'lila-left':[{actor:'lila',view:'three-quarter-right',rootX:380},{actor:'karo',view:'three-quarter-left',rootX:850}],
  'lila-right':[{actor:'lila',view:'three-quarter-left',rootX:850},{actor:'karo',view:'three-quarter-right',rootX:380}],
} as const;
/** Only authored diagnostic timing, not script/TTS or phoneme timing. The
 * selected body's declared nearHand supplies the rig-hand identity. */
export const nativeDialogueThinkingWindows={
  karo:{id:'karo-listener-think',startMs:1000,reachMs:1700,recoverMs:2500,endMs:2900},
  lila:{id:'lila-listener-think',startMs:3200,reachMs:3700,recoverMs:4200,endMs:4500},
} as const;
/** Authored palm-under-chin wrist poses, not a per-frame elbow/hand fallback. */
export const nativeDialogueThinkingWrist={lila:70,karo:60} as const;
/** Diagnostic reactions on one original run, spanning the existing camera
 * cuts. They are not substituted for a real user's story or narration. */
export const nativeDialogueExpressionWindows={
  lila:[{startMs:300,endMs:2600,mood:'excited'},{startMs:2700,endMs:4450,mood:'concerned'},{startMs:4600,endMs:6200,mood:'relieved'}],
  karo:[{startMs:300,endMs:2100,mood:'curious'},{startMs:2200,endMs:3850,mood:'surprised'},{startMs:4000,endMs:6250,mood:'confident'}],
} as const;
export const nativeDialogueDescription={version:NATIVE_HEAD_SEAT_TRACER_VERSION,scope:NATIVE_HEAD_SEAT_TRACER_SCOPE,
  stagings:nativeDialogueLayouts,acting:NATIVE_DIALOGUE_ACTING,thinkingWindows:nativeDialogueThinkingWindows,expressionWindows:nativeDialogueExpressionWindows,
  default:{staging:'lila-left',acting:'rest'},
  selection:'explicit diagnostic only; screen position selects independent matching head/body views; each actor keeps its ID, cue ownership and original physical/head/hand clocks',
  runtimeVerified:false,artApproved:false,motionVerified:false,productionAcceptance:false,finalExportAllowed:false} as const;
