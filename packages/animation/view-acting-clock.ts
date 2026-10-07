import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {hash} from '../core/utils.js';
import {PointSchema,type PerformancePlan} from './schemas.js';

export const VIEW_ACTING_CLOCK_VERSION='native-view-acting-clock-1' as const;
export const VIEW_GAZE_RAMP_MS=140,VIEW_BREATH_RAMP_MS=200;
const GazeSchema=z.object({startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),target:PointSchema}).strict();
export type ViewGaze=z.infer<typeof GazeSchema>;
/** Renderer context only; never changes narration, persisted activity or authored clips. */
export const ViewActingClockSchema=z.object({version:z.literal(VIEW_ACTING_CLOCK_VERSION),ownerId:Id,
  startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),
  runStartMs:z.number().int().nonnegative(),runEndMs:z.number().int().positive(),
  sourceIdentityHash:z.string().regex(/^[a-f0-9]{64}$/),gazes:z.array(GazeSchema),
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
  if(hash(normalized)!==hash(parsed.gazes)||normalized.some(g=>g.startMs<clock.runStartMs||g.endMs>clock.runEndMs))throw new Error('needs-view-acting-phase: source gaze is not a normalized run track');
  if(plan.gazes.some(g=>g.startMs<0||g.endMs>plan.durationMs)||hash(projectViewGazes(normalized,clock.startMs,clock.endMs))!==hash(normalizeViewGazes(plan.gazes)))throw new Error('needs-view-acting-phase: authored gaze differs from source projection');
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
    wholeBodyActionContinuous:false,opticalGazeVerified:false,approved:false};
}
