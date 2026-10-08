import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {hash} from '../core/utils.js';
import {BodySourceSchema,PointSchema,type PerformancePlan} from './schemas.js';
import {rigHand} from '../core/identifiers.js';
import {VIEW_SOURCE_GESTURE_VERSION,ViewSourceGestureSchema,validateViewGesturePiece,validateViewSourceGestureTrack} from './view-source-gesture.js';
import {ViewExpressionSchema,normalizeViewExpressions,projectViewExpressions,VIEW_EXPRESSION_RAMP_MS} from './view-expression-track.js';
import {validateViewSourceBody} from './view-source-body.js';

export const VIEW_ACTING_CLOCK_VERSION='native-view-acting-clock-3' as const;
export const VIEW_GAZE_RAMP_MS=140,VIEW_BREATH_RAMP_MS=200;
const GazeSchema=z.object({startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),target:PointSchema}).strict();
export type ViewGaze=z.infer<typeof GazeSchema>;
/** Renderer context only; never changes narration, persisted activity or authored clips. */
export const ViewActingClockSchema=z.object({version:z.literal(VIEW_ACTING_CLOCK_VERSION),ownerId:Id,
  startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),
  runStartMs:z.number().int().nonnegative(),runEndMs:z.number().int().positive(),
  sourceIdentityHash:z.string().regex(/^[a-f0-9]{64}$/),gazes:z.array(GazeSchema),gestures:z.array(ViewSourceGestureSchema),expressions:z.array(ViewExpressionSchema).optional(),bodyMotion:BodySourceSchema.optional(),
}).strict().superRefine((c,ctx)=>{
  if(c.endMs<=c.startMs||c.runStartMs>c.startMs||c.runEndMs<c.endMs)ctx.addIssue({code:'custom',message:'Invalid continuous run/shot span'});
});
export type ViewActingClock=z.infer<typeof ViewActingClockSchema>;
export function normalizeViewGazes(gazes:readonly ViewGaze[]):ViewGaze[]{
  const result:ViewGaze[]=[];
  for(const raw of [...gazes].sort((a,b)=>a.startMs-b.startMs)){
    const g=GazeSchema.parse(raw),prior=result.at(-1);
    if(g.endMs<=g.startMs||prior&&g.startMs<prior.endMs)throw new Error('needs-view-acting-phase: invalid or overlapping gaze intervals');
    if(prior&&prior.endMs===g.startMs&&prior.target.x===g.target.x&&prior.target.y===g.target.y)prior.endMs=g.endMs;
    else result.push({...g,target:{...g.target}});
  }
  return result;
}
export function projectViewGazes(gazes:readonly ViewGaze[],startMs:number,endMs:number):ViewGaze[]{
  if(!Number.isInteger(startMs)||!Number.isInteger(endMs)||startMs<0||endMs<=startMs)throw new Error('needs-view-acting-phase: invalid gaze projection span');
  return normalizeViewGazes(gazes.flatMap(g=>{
    const start=Math.max(g.startMs,startMs),end=Math.min(g.endMs,endMs);
    return end>start?[{startMs:start-startMs,endMs:end-startMs,target:{...g.target}}]:[];
  }));
}
export function validateViewActingClock(plan:PerformancePlan,clock:ViewActingClock):void{
  const parsed=ViewActingClockSchema.parse(clock),normalized=normalizeViewGazes(parsed.gazes);
  if(clock.ownerId!==plan.leadCharacterId||clock.endMs-clock.startMs!==plan.durationMs)throw new Error('needs-view-acting-phase: actor or shot span mismatch');
  validateViewSourceBody(plan,parsed.bodyMotion,clock.startMs,clock.endMs,clock.runStartMs,clock.runEndMs);
  if(hash(normalized)!==hash(parsed.gazes)||normalized.some(g=>g.startMs<clock.runStartMs||g.endMs>clock.runEndMs))throw new Error('needs-view-acting-phase: source gaze is not a normalized run track');
  if(plan.gazes.some(g=>g.startMs<0||g.endMs>plan.durationMs)||hash(projectViewGazes(normalized,clock.startMs,clock.endMs))!==hash(normalizeViewGazes(plan.gazes)))throw new Error('needs-view-acting-phase: authored gaze differs from source projection');
  if(parsed.expressions){
    const expressions=normalizeViewExpressions(parsed.expressions);
    if(hash(expressions)!==hash(parsed.expressions)||expressions.some(e=>e.startMs<clock.runStartMs||e.endMs>clock.runEndMs))throw new Error('needs-view-expression-phase: source expression is not a normalized run track');
    if(plan.expressions.some(e=>e.startMs<0||e.endMs>plan.durationMs)||hash(projectViewExpressions(expressions,clock.startMs,clock.endMs))!==hash(normalizeViewExpressions(plan.expressions)))throw new Error('needs-view-expression-phase: authored expression differs from source projection');
  }
  validateViewSourceGestureTrack(parsed.gestures,clock.runStartMs,clock.runEndMs);
  if(parsed.gestures.length&&(plan.props.length||plan.spears?.length||plan.lunge))throw new Error('needs-view-gesture-phase: source point/think run cannot own prop or spear geometry');
  const pieces=plan.gestures.filter(g=>g.sourceSpan);
  for(const g of pieces){const source=validateViewGesturePiece(g,clock.startMs,clock.endMs),expected=parsed.gestures.find(s=>s.id===source.id);
    if(!expected||hash(expected)!==hash(source))throw new Error('needs-view-gesture-phase: source command differs from local declaration');
  }
  for(const source of parsed.gestures){
    const start=Math.max(source.startMs,clock.startMs),end=Math.min(source.endMs,clock.endMs);if(end<=start)continue;
    if(pieces.filter(g=>g.sourceSpan!.id===source.id).length!==1)throw new Error('needs-view-gesture-phase: missing/duplicate local source piece');
    if(plan.gestures.some(g=>!g.sourceSpan&&rigHand(g)===source.hand&&g.startMs+clock.startMs<end&&g.endMs+clock.startMs>start))throw new Error('needs-view-gesture-phase: ordinary clip conflicts with the source-owned hand');
  }
}
/** End frame of a camera cut may still be inside the same source cue. */
export function sourceViewGazeAt(clock:ViewActingClock,localTimeMs:number):ViewGaze|undefined{
  if(!Number.isFinite(localTimeMs)||localTimeMs<0||localTimeMs>clock.endMs-clock.startMs)throw new Error('needs-view-acting-phase: seek outside shot');
  const at=clock.startMs+localTimeMs;
  return clock.gazes.find(g=>at>=g.startMs&&at<g.endMs);
}
export function viewActingClockDescription(clock:ViewActingClock){
  return {version:clock.version,ownerId:clock.ownerId,offsetMs:clock.startMs,endMs:clock.endMs,
    runStartMs:clock.runStartMs,runEndMs:clock.runEndMs,sourceIdentityHash:clock.sourceIdentityHash,
    gazeTrackHash:hash(clock.gazes),gazeRampMs:VIEW_GAZE_RAMP_MS,breathRampMs:VIEW_BREATH_RAMP_MS,
    gestureVersion:VIEW_SOURCE_GESTURE_VERSION,gestureTrackHash:hash(clock.gestures),gestureCount:clock.gestures.length,
    gestureClock:'explicit source command/window; original quintic arm phase and entry branch',
    ...(clock.expressions?{expressionTrackHash:hash(clock.expressions),sourceExpressions:clock.expressions,expressionRampMs:VIEW_EXPRESSION_RAMP_MS,expressionClock:'normalized original mood track across explicitly continuous fixed-view shots'}:{}),
    sourceGestures:clock.gestures.map(g=>({id:g.id,hand:g.hand,action:g.action,startMs:g.startMs,endMs:g.endMs,reachMs:g.reachMs,recoverMs:g.recoverMs,target:g.target??null})),
    bodyMotion:clock.bodyMotion?{version:clock.bodyMotion.version,id:clock.bodyMotion.id,startMs:clock.bodyMotion.startMs,endMs:clock.bodyMotion.endMs,sourceTrackHash:hash(clock.bodyMotion),supportCount:clock.bodyMotion.supports?.length??0,clock:'complete original physical tracks and seat definitions; camera slices keep original relative phase',verified:false}:null,
    wholeBodyActionContinuous:!!clock.bodyMotion,opticalGazeVerified:false,approved:false};
}
