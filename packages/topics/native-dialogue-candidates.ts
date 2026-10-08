import {z} from 'zod';

/** Screen placement is explicit. The opposite layout selects independent
 * painted views; it never reflects an image or swaps actor identities. */
export const NATIVE_HEAD_SEAT_TRACER_VERSION='native-head-seat-tracer-2';
export const NATIVE_HEAD_SEAT_TRACER_SCOPE='unapproved-native-head-seat-tracer';
export const NATIVE_DIALOGUE_STAGINGS=['lila-left','lila-right'] as const;
export const NATIVE_DIALOGUE_ACTING=['rest','listening-think'] as const;
export const NativeDialogueSelectionSchema=z.object({
  staging:z.enum(NATIVE_DIALOGUE_STAGINGS).default('lila-left'),
  acting:z.enum(NATIVE_DIALOGUE_ACTING).default('rest'),
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
export const nativeDialogueDescription={version:NATIVE_HEAD_SEAT_TRACER_VERSION,scope:NATIVE_HEAD_SEAT_TRACER_SCOPE,
  stagings:nativeDialogueLayouts,acting:NATIVE_DIALOGUE_ACTING,thinkingWindows:nativeDialogueThinkingWindows,
  default:{staging:'lila-left',acting:'rest'},
  selection:'explicit diagnostic only; screen position selects independent matching head/body views; each actor keeps its ID, cue ownership and original physical/head/hand clocks',
  runtimeVerified:false,artApproved:false,motionVerified:false,productionAcceptance:false,finalExportAllowed:false} as const;
