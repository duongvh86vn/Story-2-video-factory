import {z} from 'zod';
import {NarrationSchema,type Narration} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {Id} from '../core/identifiers.js';
import {ActivitySchema,type SpeechActivity} from '../voice/schemas.js';
import {MotionHash} from './schemas.js';
import {spriteSeconds} from './clock.js';

export const SPRITE_SPEECH_CLOCK_VERSION='sprite-speech-clock-1' as const;
const clockMs=z.number().finite().nonnegative().max(120000);
const SpeechSlotSchema=z.object({shotStartMs:z.number().finite().nonnegative(),startMs:clockMs,endMs:clockMs,
  segmentIds:z.array(Id).min(1).max(128)}).strict().superRefine((slot,ctx)=>{
  if(spriteSeconds(slot.endMs)<=spriteSeconds(slot.startMs))ctx.addIssue({code:'custom',message:'Invalid speech slot clock'});
  if(new Set(slot.segmentIds).size!==slot.segmentIds.length)ctx.addIssue({code:'custom',message:'Duplicate speech cue ID'});
});
export type SpriteSpeechSlot=z.infer<typeof SpeechSlotSchema>;
export const SpriteSpeechScheduleSchema=z.object({version:z.literal(SPRITE_SPEECH_CLOCK_VERSION),slot:SpeechSlotSchema,
  synchronization:z.enum(['audio-activity','segment-draft']),audioHash:MotionHash.optional(),narrationHash:MotionHash,activityHash:MotionHash,
  intervals:z.array(z.object({startMs:clockMs,endMs:clockMs}).strict()).max(6000),
}).strict().superRefine((schedule,ctx)=>{
  const issue=(message:string)=>ctx.addIssue({code:'custom',message});
  if(schedule.synchronization==='audio-activity'&&!schedule.audioHash)issue('Measured speech activity requires its original audio hash');
  let prior=-Infinity;
  for(const interval of schedule.intervals){
    const start=spriteSeconds(interval.startMs),end=spriteSeconds(interval.endMs);
    if(end<=start||start<spriteSeconds(schedule.slot.startMs)||end>spriteSeconds(schedule.slot.endMs)||start<prior)issue('Invalid/overlapping speech activity within actor slot');
    prior=end;
  }
});
export type SpriteSpeechSchedule=z.infer<typeof SpriteSpeechScheduleSchema>;
const quantize=(ms:number)=>spriteSeconds(ms)*1000;

/** The original cue/audio clock is clipped, never estimated, stretched or rewritten. */
export function buildSpriteSpeechSchedule(narrationInput:Narration,activityInput:SpeechActivity,slotInput:SpriteSpeechSlot):SpriteSpeechSchedule{
  if(activityInput.intervals.length>200000)throw new Error('Speech activity exceeds bounded input intervals');
  const narration=NarrationSchema.parse(narrationInput),activity=ActivitySchema.parse(activityInput),slot=SpeechSlotSchema.parse(slotInput);
  if(slot.shotStartMs+slot.endMs>narration.durationMs)throw new Error('Speech slot escapes original narration clock');
  const cues=new Map(narration.segments.map(cue=>[cue.id,cue]));
  if(cues.size!==narration.segments.length)throw new Error('Duplicate original narration cue ID');
  const windows=slot.segmentIds.map(id=>{
    const cue=cues.get(id);if(!cue)throw new Error(`Unknown original speech cue: ${id}`);
    if(cue.endMs<=cue.startMs||cue.endMs>narration.durationMs)throw new Error('Invalid original narration cue clock');
    const startMs=quantize(Math.max(slot.startMs,cue.startMs-slot.shotStartMs)),endMs=quantize(Math.min(slot.endMs,cue.endMs-slot.shotStartMs));
    if(endMs<=startMs)throw new Error(`Speech cue does not overlap its actor slot: ${id}`);
    return {startMs,endMs};
  }).sort((a,b)=>a.startMs-b.startMs);
  for(let index=1;index<windows.length;index++)if(windows[index]!.startMs<windows[index-1]!.endMs)throw new Error('Actor speech cue windows overlap');
  let previous=-1;
  for(const interval of activity.intervals){
    if(interval.endMs<=interval.startMs||interval.endMs>narration.durationMs||interval.startMs<previous)throw new Error('Invalid/overlapping original speech activity clock');
    previous=interval.endMs;
  }
  const intervals:Array<{startMs:number;endMs:number}>=[];
  let cursor=0;
  for(const window of windows){
    while(cursor<activity.intervals.length&&quantize(activity.intervals[cursor]!.endMs-slot.shotStartMs)<=window.startMs)cursor++;
    for(let index=cursor;index<activity.intervals.length;index++){
      const activityInterval=activity.intervals[index]!,start=quantize(activityInterval.startMs-slot.shotStartMs);
      if(start>=window.endMs)break;if(activityInterval.level<=0)continue;
      const startMs=Math.max(start,window.startMs),endMs=Math.min(quantize(activityInterval.endMs-slot.shotStartMs),window.endMs);
      if(endMs<=startMs)continue;
      const last=intervals.at(-1);
      if(last&&spriteSeconds(last.endMs)===spriteSeconds(startMs))last.endMs=endMs;
      else{if(intervals.length===6000)throw new Error('Sprite speech schedule exceeds 6000 activity intervals');intervals.push({startMs,endMs});}
    }
  }
  return SpriteSpeechScheduleSchema.parse({version:SPRITE_SPEECH_CLOCK_VERSION,slot,synchronization:activity.method==='audio-rms'?'audio-activity':'segment-draft',
    ...(activity.audioHash?{audioHash:activity.audioHash}:{}),narrationHash:hash(narration),activityHash:hash(activity),intervals});
}
/** Owned schedule snapshot: seeking cannot observe a caller's later mutation. */
export function createSpriteSpeechSampler(input:SpriteSpeechSchedule):(timeMs:number)=>boolean{
  const schedule=SpriteSpeechScheduleSchema.parse(input);
  const intervals=schedule.intervals.map(interval=>({start:spriteSeconds(interval.startMs),end:spriteSeconds(interval.endMs)}));
  return timeMs=>{
    if(!Number.isFinite(timeMs))throw new Error('Speech sample clock must be finite');
    const time=spriteSeconds(timeMs);let low=0,high=intervals.length;
    while(low<high){const middle=(low+high)>>>1;if(intervals[middle]!.start<=time)low=middle+1;else high=middle;}
    return low>0&&time<intervals[low-1]!.end;
  };
}
