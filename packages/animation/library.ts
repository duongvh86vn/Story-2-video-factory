import { ANIMATION_VERSION, Moods, type PerformancePlan } from './schemas.js';

const rigs=['stick-man','mini-robot'] as const;
const gestures=['address-viewer','point','inspect','think','operate','pick-place','carry','react','lead-next'] as const;
/** Only compiler-supported data clips are advertised. All clocks are local narration milliseconds. */
export const ANIMATION_LIBRARY={version:22,producer:ANIMATION_VERSION,rigs,
  clips:[{id:'walk',tracks:['locomotion'],entry:'planted support feet',exit:'balanced planted feet',constraints:['speed <= upperLeg*3 per second','continuous root']},
    {id:'turn',tracks:['orientation'],entry:'current facing',exit:'front or three-quarter facing',constraints:['stationary','minimum 280ms','no contact overlap']},
    ...(['stand','crouch','lean'] as const).map(pose=>({id:`body.${pose}`,tracks:['body-posture'],entry:'current body pose',exit:'hold destination until the next posture transition',constraints:['planted feet','minimum 280ms transition','fixed bone lengths','return to stand before walking','intensity 0–1; body lean -25–25 degrees']})),
    {id:'body.seated',tracks:['body-posture','seat-support'],entry:'standing or supported seated pose',exit:'pelvis held on the rendered seat',constraints:['known physical seat support','minimum 700ms sit/stand transition','feet planted in front of the seat','fixed thighs and shins','stand before walking, turning or changing seats','left/right knee pole changes through a straight-leg waypoint']},
    ...gestures.map(id=>({id,tracks:['left-arm','right-arm'],entry:'current neutral arm',exit:'neutral arm',constraints:[...(id==='carry'?['stationary pickup and lowering','250ms lift and lowering','attachment during locomotion','release at destination']:id==='pick-place'?['source grip contact','attachment interval','release at destination']:id==='operate'?['reachable contact','80ms hold','120ms recovery']:['bounded local interval']),'one gesture owns each hand at a time','one hand owns an attached prop at a time','omitted hand means right','fixed elbowPole rest or reach; no instantaneous branch flip']})),
    ...Moods.map(id=>({id:`mood.${id}`,tracks:['posture','expression'],entry:'blend from the previous contiguous reaction, or neutral after a gap',exit:'hold through a contiguous reaction; recover to neutral only before a gap',constraints:['adjacent equal moods stay held','blend <=140ms, shortened for short clips','do not anticipate a later cue','speech only owns talking mouth']})),
    {id:'gaze',tracks:['attention'],entry:'blend current gaze',exit:'blend to neutral',constraints:['world target required']},
    {id:'speech-activity',tracks:['talking-mouth'],entry:'audio activity',exit:'closed speech mouth during silence',constraints:['not phoneme lip-sync']}],
} as const;
export function selectedClips(plan:PerformancePlan):string[]{
  return [...new Set([...(plan.walks.length?['walk']:[]),...((plan.turns?.length||plan.facing&&plan.facing!=='front')?['turn']:[]),
    ...(plan.entryPosture?[`body.${plan.entryPosture.pose}`]:[]),...(plan.postures??[]).map(p=>`body.${p.pose}`),
    ...plan.gestures.map(g=>g.action),...plan.expressions.map(e=>`mood.${e.mood}`),...(plan.gazes.length?['gaze']:[]),'speech-activity'])];
}
