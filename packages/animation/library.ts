import { ANIMATION_VERSION, Moods, type PerformancePlan } from './schemas.js';

const rigs=['stick-man','mini-robot'] as const;
const gestures=['address-viewer','point','inspect','think','operate','pick-place','carry','react','lead-next'] as const;
/** Only compiler-supported data clips are advertised. All clocks are local narration milliseconds. */
export const ANIMATION_LIBRARY={version:22,producer:ANIMATION_VERSION,rigs,
  clips:[{id:'walk',tracks:['locomotion'],entry:'planted support feet',exit:'balanced planted feet',constraints:['speed <= upperLeg*3 per second','continuous root']},
    {id:'turn',tracks:['orientation'],entry:'current facing',exit:'front or three-quarter facing',constraints:['stationary','minimum 280ms','no contact overlap']},
    ...gestures.map(id=>({id,tracks:['right-arm'],entry:'current neutral arm',exit:'neutral arm',constraints:id==='carry'?['stationary pickup and lowering','250ms lift and lowering','attachment during locomotion','release at destination']:id==='pick-place'?['source grip contact','attachment interval','release at destination']:id==='operate'?['reachable contact','80ms hold','120ms recovery']:['bounded local interval']})),
    ...Moods.map(id=>({id:`mood.${id}`,tracks:['posture','expression'],entry:'blend from neutral',exit:'blend to neutral',constraints:['speech only owns talking mouth']})),
    {id:'gaze',tracks:['attention'],entry:'blend current gaze',exit:'blend to neutral',constraints:['world target required']},
    {id:'speech-activity',tracks:['talking-mouth'],entry:'audio activity',exit:'closed speech mouth during silence',constraints:['not phoneme lip-sync']}],
} as const;
export function selectedClips(plan:PerformancePlan):string[]{
  return [...new Set([...(plan.walks.length?['walk']:[]),...((plan.turns?.length||plan.facing&&plan.facing!=='front')?['turn']:[]),
    ...plan.gestures.map(g=>g.action),...plan.expressions.map(e=>`mood.${e.mood}`),...(plan.gazes.length?['gaze']:[]),'speech-activity'])];
}
