import {z} from 'zod';
import {Id,RigHandSchema,rigHand,type RigHand} from '../core/identifiers.js';
import {hash} from '../core/utils.js';
import {GestureSourceSpanSchema,PointSchema,type Gesture} from './schemas.js';
import {articulatedGestureWindow} from './arm-trajectory.js';

export const VIEW_SOURCE_GESTURE_VERSION='native-source-gesture-2' as const;
export const VIEW_SOURCE_GESTURE_PROJECTION_VERSION='native-source-gesture-projection-1' as const;
export const ViewSourceGestureSchema=z.object({id:Id,action:z.enum(['point','think']),hand:RigHandSchema,target:PointSchema.optional(),elbowPole:z.enum(['rest','reach']).optional(),
  wristCurlDeg:z.number().finite().min(0).max(70).optional(),
  startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),reachMs:z.number().finite().nonnegative(),recoverMs:z.number().finite().nonnegative(),
}).strict().superRefine((g,ctx)=>{
  if(g.wristCurlDeg!==undefined&&g.action!=='think')ctx.addIssue({code:'custom',message:'Authored wrist curl is only registered for think'});
  if(g.reachMs<=g.startMs||g.recoverMs<g.reachMs||g.endMs<=g.recoverMs||g.action==='point'&&!g.target)ctx.addIssue({code:'custom',message:'Invalid native source gesture target/window'});
});
export type ViewSourceGesture=z.infer<typeof ViewSourceGestureSchema>;
export function viewSourceGestureDefinition(g:Gesture):ViewSourceGesture{
  if(!g.sourceSpan||g.action!=='point'&&g.action!=='think')throw new Error('needs-view-gesture-phase: only explicit source point/think is supported');
  if(g.contactMs!==undefined||g.releaseMs!==undefined||g.destination||g.propId||g.landingMs!==undefined||g.carryOffset)throw new Error('needs-view-gesture-phase: source motion timing cannot replace a contact/prop clock');
  const span=GestureSourceSpanSchema.parse(g.sourceSpan),window=articulatedGestureWindow({startMs:span.startMs,endMs:span.endMs,contactMs:span.reachMs,releaseMs:span.recoverMs});
  return ViewSourceGestureSchema.parse({id:span.id,action:g.action,hand:rigHand(g),target:g.target,elbowPole:g.elbowPole,...(g.wristCurlDeg===undefined?{}:{wristCurlDeg:g.wristCurlDeg}),
    startMs:span.startMs,endMs:span.endMs,reachMs:window.reachMs,recoverMs:window.recoverMs});
}
export function validateViewGesturePiece(g:Gesture,shotStartMs:number,shotEndMs:number):ViewSourceGesture{
  const source=viewSourceGestureDefinition(g),start=Math.max(source.startMs,shotStartMs),end=Math.min(source.endMs,shotEndMs);
  if(!Number.isInteger(shotStartMs)||!Number.isInteger(shotEndMs)||shotStartMs<0||shotEndMs<=shotStartMs||end<=start||g.startMs!==start-shotStartMs||g.endMs!==end-shotStartMs)throw new Error('needs-view-gesture-phase: local clip differs from exact source span projection');
  return source;
}
export function validateViewSourceGestureTrack(track:readonly ViewSourceGesture[],runStartMs:number,runEndMs:number):void{
  const parsed=track.map(g=>ViewSourceGestureSchema.parse(g));
  if(new Set(parsed.map(g=>g.id)).size!==parsed.length)throw new Error('needs-view-gesture-phase: duplicate source command ID');
  for(const hand of ['left','right'] as const){let end=runStartMs;
    for(const g of parsed.filter(g=>g.hand===hand).sort((a,b)=>a.startMs-b.startMs)){
      if(g.startMs<end||g.endMs>runEndMs)throw new Error('needs-view-gesture-phase: source hand track overlaps or leaves its continuous run');
      end=g.endMs;
    }
  }
}
export function collectViewSourceGestures(entries:readonly {startMs:number;endMs:number;gestures:readonly Gesture[]}[],runStartMs:number,runEndMs:number):ViewSourceGesture[]{
  const commands=new Map<string,{source:ViewSourceGesture;pieces:Array<{startMs:number;endMs:number}>}>();
  for(const entry of entries)for(const g of entry.gestures)if(g.sourceSpan){
    const source=validateViewGesturePiece(g,entry.startMs,entry.endMs),prior=commands.get(source.id);
    if(prior&&hash(prior.source)!==hash(source))throw new Error('needs-view-gesture-phase: source command changed hand/action/target/pole/window');
    const command=prior??{source,pieces:[]};command.pieces.push({startMs:g.startMs+entry.startMs,endMs:g.endMs+entry.startMs});commands.set(source.id,command);
  }
  const track=[...commands.values()].map(command=>{
    let end=command.source.startMs;
    for(const piece of command.pieces.sort((a,b)=>a.startMs-b.startMs)){
      if(piece.startMs!==end)throw new Error('needs-view-gesture-phase: source gesture has missing/duplicated pieces');end=piece.endMs;
    }
    if(end!==command.source.endMs)throw new Error('needs-view-gesture-phase: source gesture coverage is incomplete');return command.source;
  }).sort((a,b)=>a.startMs-b.startMs||(a.id<b.id?-1:a.id>b.id?1:0));
  validateViewSourceGestureTrack(track,runStartMs,runEndMs);
  for(const entry of entries)for(const g of entry.gestures)if(!g.sourceSpan&&track.some(source=>source.hand===rigHand(g)&&g.startMs+entry.startMs<source.endMs&&g.endMs+entry.startMs>source.startMs))throw new Error('needs-view-gesture-phase: ordinary clip conflicts with the source-owned hand in the run');
  return track;
}
/** Project the original hand commands into one shot without restarting their
 * approach/hold/recovery. An empty projection still validates the full source
 * track, so a cut cannot hide conflicting or incomplete hand ownership. */
export function projectViewSourceGestures(track:readonly ViewSourceGesture[],shotStartMs:number,shotEndMs:number,runStartMs:number,runEndMs:number):Gesture[]{
  if(![shotStartMs,shotEndMs,runStartMs,runEndMs].every(t=>Number.isSafeInteger(t)&&t>=0)||
    runEndMs<=runStartMs||shotEndMs<=shotStartMs||shotStartMs<runStartMs||shotEndMs>runEndMs)throw new Error('needs-view-gesture-phase: invalid source projection clock');
  validateViewSourceGestureTrack(track,runStartMs,runEndMs);
  return track.flatMap(source=>{
    // SourceSpan explicit events use integer milliseconds, but its existing
    // default ramps may be fractional. Preserve those exact defaults by
    // omission, never round/restart them at a cut.
    const defaults=articulatedGestureWindow({startMs:source.startMs,endMs:source.endMs});
    if((!Number.isSafeInteger(source.reachMs)&&source.reachMs!==defaults.reachMs)||(!Number.isSafeInteger(source.recoverMs)&&source.recoverMs!==defaults.recoverMs))throw new Error('needs-view-gesture-phase: source events cannot be represented by the original gesture span');
    const start=Math.max(source.startMs,shotStartMs),end=Math.min(source.endMs,shotEndMs);
    if(end<=start)return [];
    const piece:Gesture={id:source.id,action:source.action,hand:source.hand,startMs:start-shotStartMs,endMs:end-shotStartMs,
      ...(source.target?{target:{...source.target}}:{}),...(source.elbowPole?{elbowPole:source.elbowPole}:{}),
      ...(source.wristCurlDeg===undefined?{}:{wristCurlDeg:source.wristCurlDeg}),
      sourceSpan:{id:source.id,startMs:source.startMs,endMs:source.endMs,...(Number.isSafeInteger(source.reachMs)?{reachMs:source.reachMs}:{}),...(Number.isSafeInteger(source.recoverMs)?{recoverMs:source.recoverMs}:{})}};
    validateViewGesturePiece(piece,shotStartMs,shotEndMs);return [piece];
  });
}
/** Full original window/time, with a separate body-entry reference in shot-local space. */
export function sourceViewGestureAt(track:readonly ViewSourceGesture[],absoluteTimeMs:number,hand:RigHand):Gesture|undefined{
  if(!Number.isFinite(absoluteTimeMs)||absoluteTimeMs<0||hand!=='left'&&hand!=='right')throw new Error('needs-view-gesture-phase: invalid source time/hand');
  const g=track.find(g=>g.hand===hand&&absoluteTimeMs>=g.startMs&&absoluteTimeMs<g.endMs);
  return g?{id:g.id,action:g.action,hand:g.hand,target:g.target,elbowPole:g.elbowPole,...(g.wristCurlDeg===undefined?{}:{wristCurlDeg:g.wristCurlDeg}),startMs:g.startMs,endMs:g.endMs,contactMs:g.reachMs,releaseMs:g.recoverMs}:undefined;
}
