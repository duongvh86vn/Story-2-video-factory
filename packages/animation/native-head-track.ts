import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {jsonSha256 as hash} from '../core/json-sha256.js';

export const NATIVE_HEAD_SOURCE_VERSION='native-head-source-1' as const;
const absoluteMs=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const sample=z.object({atMs:z.number().int().nonnegative(),cell:Id}).strict();

/** An authored discrete cell route on the complete original run clock.
 * This declares timing/ownership only: no yaw interpolation, selection, pivot,
 * bank/artwork acceptance, or phoneme synchronization is implied. */
export const NativeHeadTrackSchema=z.object({
  version:z.literal(NATIVE_HEAD_SOURCE_VERSION),id:Id,ownerId:Id,
  bankFingerprint:z.string().length(64).regex(/^[a-f0-9]{64}$/),
  startMs:absoluteMs,endMs:absoluteMs,
  samples:z.array(sample).min(1).max(600),
}).strict().superRefine((track,ctx)=>{
  const durationMs=track.endMs-track.startMs;
  if(durationMs<=0||durationMs>300000)
    ctx.addIssue({code:'custom',path:['endMs'],message:'Original head source duration must be positive and at most 300000ms'});
  if(track.samples[0]?.atMs!==0)
    ctx.addIssue({code:'custom',path:['samples',0,'atMs'],message:'Original head source must start with a sample at 0ms'});
  for(let index=0;index<track.samples.length;index++){
    const current=track.samples[index]!,previous=track.samples[index-1];
    if(current.atMs>durationMs)
      ctx.addIssue({code:'custom',path:['samples',index,'atMs'],message:'Head cell sample is outside the original source duration'});
    if(previous&&current.atMs<=previous.atMs)
      ctx.addIssue({code:'custom',path:['samples',index,'atMs'],message:'Head cell sample times must strictly increase'});
    if(previous&&current.cell===previous.cell)
      ctx.addIssue({code:'custom',path:['samples',index,'cell'],message:'Adjacent head cell samples must differ'});
  }
});
export type NativeHeadTrack=z.infer<typeof NativeHeadTrackSchema>;

function fail(reason:string):never{
  throw new Error('needs-head-source-phase: '+reason);
}
function parseTrack(value:unknown,subject:string):NativeHeadTrack{
  const parsed=NativeHeadTrackSchema.safeParse(value);
  if(!parsed.success)fail('invalid '+subject+': '+parsed.error.message);
  return parsed.data;
}
const isMs=(value:number):boolean=>Number.isSafeInteger(value)&&value>=0;
function validateSpan(startMs:number,endMs:number,subject:string):void{
  if(!isMs(startMs)||!isMs(endMs)||endMs<=startMs)fail('invalid '+subject+' span');
}

/** Explicit key ordering makes identity independent of input object key order.
 * Every authored field, including the bank fingerprint and all cells, is bound. */
function declarationHash(track:NativeHeadTrack):string{
  return hash({version:track.version,id:track.id,ownerId:track.ownerId,
    bankFingerprint:track.bankFingerprint,startMs:track.startMs,endMs:track.endMs,
    samples:track.samples.map(s=>({atMs:s.atMs,cell:s.cell}))});
}
function validateOriginalSpan(track:NativeHeadTrack,runStartMs:number,runEndMs:number):void{
  if(track.startMs!==runStartMs||track.endMs!==runEndMs)
    fail('original head source must exactly span its continuous run; cuts cannot splice it');
}

/** Every participating entry repeats one full declaration and covers the run
 * exactly once. Parsing detaches the returned source from caller-owned input. */
export function collectNativeHeadTracks(
  entries:readonly {startMs:number;endMs:number;sourceHead?:NativeHeadTrack}[],
  runStartMs:number,runEndMs:number,
):NativeHeadTrack|undefined{
  if(!entries.some(entry=>entry.sourceHead!==undefined))return undefined;
  validateSpan(runStartMs,runEndMs,'continuous run');
  let source:NativeHeadTrack|undefined,sourceHash:string|undefined,coveredEndMs=runStartMs;
  for(const entry of [...entries].sort((a,b)=>a.startMs-b.startMs)){
    validateSpan(entry.startMs,entry.endMs,'participating shot');
    if(entry.sourceHead===undefined)fail('participating shot is missing its original head source declaration');
    const parsed=parseTrack(entry.sourceHead,'original head source');
    validateOriginalSpan(parsed,runStartMs,runEndMs);
    const currentHash=declarationHash(parsed);
    if(sourceHash!==undefined&&sourceHash!==currentHash)
      fail('original head source definition changed between participating shots');
    if(entry.startMs!==coveredEndMs||entry.endMs>runEndMs)
      fail('original head source coverage has a gap, overlap, or duplicated shot');
    source=source??parsed;sourceHash=currentHash;coveredEndMs=entry.endMs;
  }
  if(coveredEndMs!==runEndMs)fail('original head source coverage is incomplete');
  return source;
}

/** Bind a local plan to its full run-owned declaration. Local headTurns own the
 * same head and therefore cannot coexist with an explicit source cell route. */
export function validateNativeHeadSource(
  plan:{leadCharacterId:string;durationMs:number;headTurns?:readonly unknown[];sourceHead?:NativeHeadTrack},
  sourceContext:NativeHeadTrack|undefined,startMs:number,endMs:number,runStartMs:number,runEndMs:number,
):void{
  if(plan.sourceHead===undefined&&sourceContext===undefined)return;
  if(plan.sourceHead===undefined||sourceContext===undefined)
    fail('missing original head source declaration/context');
  const source=parseTrack(plan.sourceHead,'local original head source');
  const context=parseTrack(sourceContext,'original head source context');
  validateSpan(runStartMs,runEndMs,'continuous run');
  validateOriginalSpan(source,runStartMs,runEndMs);
  validateOriginalSpan(context,runStartMs,runEndMs);
  validateSpan(startMs,endMs,'participating shot');
  if(startMs<runStartMs||endMs>runEndMs||!isMs(plan.durationMs)||plan.durationMs!==endMs-startMs)
    fail('local plan differs from the exact original head source span projection');
  if(source.ownerId!==plan.leadCharacterId||context.ownerId!==plan.leadCharacterId)
    fail('original head source owner differs from the local lead character');
  if(declarationHash(source)!==declarationHash(context))
    fail('local original head source differs from its run context');
  if(plan.headTurns!==undefined&&(!Array.isArray(plan.headTurns)||plan.headTurns.length>0))
    fail('original head source conflicts with local headTurns');
}

/** Stateless seek: each cell holds on [sample, next sample), including across
 * shot splits; the last cell also holds at the inclusive original source end.
 * sourceTimeMs is relative to the full source, cellStartMs is absolute. */
export function nativeHeadCellAt(track:NativeHeadTrack,shotStartMs:number,localTimeMs:number,shotDurationMs:number):{
  cell:string;index:number;sourceTimeMs:number;cellStartMs:number;
}{
  const source=parseTrack(track,'original head source');
  const shotEndMs=shotStartMs+shotDurationMs;
  validateSpan(shotStartMs,shotEndMs,'participating shot');
  if(!isMs(shotDurationMs)||shotStartMs<source.startMs||shotEndMs>source.endMs)
    fail('participating shot is outside its original head source window');
  if(!Number.isFinite(localTimeMs)||localTimeMs<0||localTimeMs>shotDurationMs)
    fail('head cell time is outside the inclusive local shot window');
  // Equivalent to (shotStartMs + localTimeMs) - source.startMs, without
  // discarding fractional seek precision at large absolute clock offsets.
  const sourceTimeMs=shotStartMs-source.startMs+localTimeMs;
  let low=0,high=source.samples.length;
  while(low<high){
    const middle=Math.floor((low+high)/2);
    if(source.samples[middle]!.atMs<=sourceTimeMs)low=middle+1;
    else high=middle;
  }
  const index=low-1,selected=source.samples[index]!;
  return {cell:selected.cell,index,sourceTimeMs,cellStartMs:source.startMs+selected.atMs};
}

/** Exact global authored change times plus the source end; no evaluation. */
export function nativeHeadTrackTimes(track:NativeHeadTrack):number[]{
  const source=parseTrack(track,'original head source');
  const times=source.samples.map(s=>source.startMs+s.atMs);
  if(times[times.length-1]!==source.endMs)times.push(source.endMs);
  return times;
}
