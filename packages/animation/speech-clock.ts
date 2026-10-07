import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {hash} from '../core/utils.js';
import {ActivitySchema,type SpeechActivity} from '../voice/schemas.js';

export const SPEECH_SOURCE_CLOCK_VERSION='speech-source-clock-1' as const;
export const SPEECH_ENVELOPE_ATTACK_MS=45,SPEECH_ENVELOPE_RELEASE_MS=70;
/** Renderer context only: never stored as a replacement for input waveform. */
export const SpeechSourceClockSchema=z.object({version:z.literal(SPEECH_SOURCE_CLOCK_VERSION),ownerId:Id,
  scope:z.enum(['storyboard-cues','shot-cues','narration']),cueIds:z.array(Id),
  startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),sourceActivityHash:z.string().regex(/^[a-f0-9]{64}$/),activity:ActivitySchema,
}).strict().refine(c=>c.endMs>c.startMs,'Source clock must cover a positive shot');
export type SpeechSourceClock=z.infer<typeof SpeechSourceClockSchema>;
export function validateSpeechActivityTrack(activity:SpeechActivity):void{
  ActivitySchema.parse(activity);let end=0;
  for(const cue of activity.intervals){if(cue.startMs<end||cue.endMs<=cue.startMs)throw new Error('needs-view-speech-clock: activity intervals overlap or are out of order');end=cue.endMs;}
}
export function projectSpeechActivity(activity:SpeechActivity,startMs:number,endMs:number):SpeechActivity{
  if(!Number.isInteger(startMs)||!Number.isInteger(endMs)||startMs<0||endMs<=startMs)throw new Error('needs-speech-phase: invalid shot clock');
  return {...activity,intervals:activity.intervals.flatMap(c=>{
    const start=Math.max(c.startMs,startMs),end=Math.min(c.endMs,endMs);
    return end>start?[{...c,startMs:start-startMs,endMs:end-startMs}]:[];
  })};
}
/** Retain original timestamps and neighboring centers; the halo exceeds both
 * envelope ramps. It limits per-frame work without turning the shot cut into
 * a new speech boundary or interpolating across any source gap/zero. */
export function windowSpeechActivity(activity:SpeechActivity,startMs:number,endMs:number):SpeechActivity{
  if(!Number.isInteger(startMs)||!Number.isInteger(endMs)||startMs<0||endMs<=startMs)throw new Error('needs-speech-phase: invalid shot clock');
  const indices=activity.intervals.flatMap((c,i)=>c.startMs<endMs+SPEECH_ENVELOPE_RELEASE_MS&&c.endMs>startMs-SPEECH_ENVELOPE_ATTACK_MS?[i]:[]);
  if(!indices.length)return {...activity,intervals:[]};
  return {...activity,intervals:activity.intervals.slice(Math.max(0,indices[0]!-1),Math.min(activity.intervals.length,indices.at(-1)!+2))};
}
/** Local speech must be exactly the projection of the supplied owned source,
 * including zero windows and metadata. A label/hash is not audio verification. */
export function validateSpeechSourceClock(local:SpeechActivity,clock:SpeechSourceClock,ownerId?:string,durationMs?:number):void{
  SpeechSourceClockSchema.parse(clock);validateSpeechActivityTrack(local);validateSpeechActivityTrack(clock.activity);
  if((ownerId!==undefined&&clock.ownerId!==ownerId)||(durationMs!==undefined&&clock.endMs-clock.startMs!==durationMs))throw new Error('needs-speech-phase: source owner or shot span does not match performer');
  if(new Set(clock.cueIds).size!==clock.cueIds.length)throw new Error('needs-speech-phase: duplicate owned cue IDs');
  const expected=projectSpeechActivity(clock.activity,clock.startMs,clock.endMs);
  if(hash(ActivitySchema.parse(local))!==hash(ActivitySchema.parse(expected)))throw new Error('needs-speech-phase: local activity differs from original owned source projection');
}
export function speechSourceClockDescription(clock:SpeechSourceClock){
  return {version:clock.version,scope:clock.scope,ownerId:clock.ownerId,cueIds:clock.cueIds,
    offsetMs:clock.startMs,endMs:clock.endMs,sourceActivityHash:clock.sourceActivityHash,windowActivityHash:hash(clock.activity),audioVerified:false};
}
