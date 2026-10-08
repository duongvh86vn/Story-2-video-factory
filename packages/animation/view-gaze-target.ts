import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {hash} from '../core/utils.js';
import {HostProfileSchema} from '../host/schemas.js';
import {PerformancePlanSchema} from './schemas.js';
import {validateBodySourcePlan} from './view-source-body.js';
import {sourceBodyPlan} from './view-source-body.js';
import {supportMotionTimes} from './support.js';
import {PhysicalLungeClockSchema} from './lunge.js';

export const VIEW_ACTOR_GAZE_VERSION='native-actor-gaze-source-1' as const;
export const nativeActorGazeDescription={version:VIEW_ACTOR_GAZE_VERSION,selection:"performance.gazes[].actorTarget={id,anchor:'eyes'}",
  method:'complete visible original actor run; registered eye midpoint projected by the rendered physical neck/head transform, body/expression/breath clock and owned physical lunge timings; no gaze feedback or arm/tool evaluation',
  limits:'fixed native body/eye/expression view; behind-view targets require authored turns; no optical gaze or motion acceptance',
  runtimeVerified:false,opticalGazeVerified:false,productionReady:false,approved:false};
const SourceSchema=z.object({version:z.literal(VIEW_ACTOR_GAZE_VERSION),actorId:Id,
  startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),sourceIdentityHash:z.string().regex(/^[a-f0-9]{64}$/),
  profile:HostProfileSchema,performance:PerformancePlanSchema,lungeClock:PhysicalLungeClockSchema.optional()}).strict();
export const ViewGazeTargetSchema=SourceSchema.extend({fingerprint:z.string().regex(/^[a-f0-9]{64}$/)}).superRefine((source,ctx)=>{
  const p=source.performance,a=source.profile;
  if(source.endMs<=source.startMs||source.endMs-source.startMs>300000||p.durationMs!==source.endMs-source.startMs)ctx.addIssue({code:'custom',message:'Invalid complete gaze target run clock'});
  if(source.actorId!==a.id||p.leadCharacterId!==a.id||p.profileHash!==a.profileHash||p.kind!==a.kind)ctx.addIssue({code:'custom',message:'Gaze target identity/profile mismatch'});
  if(a.appearance.artworkVersion!=='forest-body-view-1'||a.appearance.bodyEyes!=='registered-eyes-v1'||a.appearance.bodyExpressions!=='registered-expressions-v1'||!a.appearance.bodyView)ctx.addIssue({code:'custom',message:'Actor eye target needs its registered native eye/body/expression view'});
  if(p.root.y!==p.stage.groundY)ctx.addIssue({code:'custom',message:'Gaze target root must use its ground anchor'});
  if(p.gazes.length||p.gestures.length||p.props.length||p.spears?.length)ctx.addIssue({code:'custom',message:'Gaze target source is physical only, without attention/arms/props'});
  if(!!p.lunge!==!!source.lungeClock||source.lungeClock&&(source.lungeClock.spearId!==p.lunge?.spearId||source.lungeClock.endMs!==p.durationMs))ctx.addIssue({code:'custom',message:'Gaze target lunge must keep its original owned physical clock'});
  if(p.sourceBody&&(p.sourceBody.startMs!==source.startMs||p.sourceBody.endMs!==source.endMs))ctx.addIssue({code:'custom',message:'Gaze target body source must cover its complete original run'});
  try{validateBodySourcePlan(p);}catch(error){ctx.addIssue({code:'custom',message:error instanceof Error?error.message:String(error)});}
  if(p.expressions.some(e=>e.startMs<0||e.endMs>p.durationMs||e.endMs<=e.startMs))ctx.addIssue({code:'custom',message:'Gaze target expression outside its run'});
  const {fingerprint,...value}=source;if(fingerprint!==hash(value))ctx.addIssue({code:'custom',message:'Gaze target source fingerprint changed'});
});
export type ViewGazeTarget=z.infer<typeof ViewGazeTargetSchema>;
export function viewGazeTarget(input:z.infer<typeof SourceSchema>):ViewGazeTarget{
  const source=SourceSchema.parse(input);return ViewGazeTargetSchema.parse({...source,fingerprint:hash(source)});
}
/** Pure original global event seeds for gaze baking/camera checks. */
export function viewGazeTargetTimes(source:ViewGazeTarget):number[]{
  const p=source.performance,physical=sourceBodyPlan(p),offset=p.sourceBody?.startMs??source.startMs;
  const times=[source.startMs,source.startMs+200,source.endMs-200,source.endMs,...supportMotionTimes(physical).map(t=>t+offset)];
  if(source.lungeClock)for(const at of [source.lungeClock.readyMs,source.lungeClock.contactMs,source.lungeClock.recoverMs,source.lungeClock.endMs])times.push(source.startMs+at);
  for(const clip of [...physical.walks,...(physical.jumps??[]),...(physical.postures??[])])for(const at of [clip.startMs,clip.endMs,(clip.startMs+clip.endMs)/2])times.push(offset+at);
  for(const jump of physical.jumps??[])for(const at of [jump.takeoffMs,jump.landingMs,(jump.takeoffMs+jump.landingMs)/2])times.push(offset+at);
  for(const e of p.expressions){const ramp=Math.min(140,(e.endMs-e.startMs)/2);for(const at of [e.startMs,e.startMs+ramp,e.endMs-ramp,e.endMs])times.push(source.startMs+at);}
  return [...new Set(times.filter(t=>t>=source.startMs&&t<=source.endMs))].sort((a,b)=>a-b);
}
