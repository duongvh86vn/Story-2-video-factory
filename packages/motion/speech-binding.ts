import {NarrationSchema,type Narration,type Shot} from '../core/schemas.js';
import {ActorMotionSchema,type ActorMotion} from './schemas.js';
import type {SpriteStage} from './stage-schemas.js';
import {spriteSeconds} from './clock.js';
import {spriteMotionKey} from './stage.js';

function owners(shot:Shot){
  const scene=shot.cinematic?.actorScene;
  if(!scene)throw new Error(`${shot.id}: sprite speech requires story cast`);
  if(!scene.primary&&scene.speakingSegmentIds.length)throw new Error(`${shot.id}: speech has no primary actor`);
  const actors=[...(scene.primary?[{actorId:scene.primary.id,segmentIds:scene.speakingSegmentIds}]:[]),
    ...scene.supporting.map(actor=>({actorId:actor.character.id,segmentIds:actor.speakingSegmentIds}))];
  const all=actors.flatMap(actor=>actor.segmentIds);
  if(new Set(all).size!==all.length)throw new Error(`${shot.id}: original speech cue has duplicate actor ownership`);
  return actors;
}

/** Checks declared ownership/source links; timed visibility is checked separately. */
export function validateSpriteSpeechAssignments(shot:Shot,plan:SpriteStage){
  const actors=owners(shot),expected=new Map(actors.map(actor=>[actor.actorId,new Set(actor.segmentIds)]));
  for(const actor of plan.actors){
    const owned=expected.get(actor.actorId)??new Set<string>(),bound=new Set<string>();
    for(const clip of actor.clips)for(const id of clip.speech?.segmentIds??[]){
      if(!owned.has(id)||!shot.narrationSegmentIds?.includes(id))throw new Error(`${shot.id}: sprite speech cue belongs to another actor or shot: ${id}`);
      if(!clip.sourceRefs.some(ref=>ref.kind==='narration'&&ref.segmentId===id))throw new Error(`${shot.id}: sprite speech lacks original cue source evidence: ${id}`);
      bound.add(id);
    }
    if([...owned].some(id=>!bound.has(id)))throw new Error(`${shot.id}: needs-sprite-speech: original actor cues require registered mouth artwork`);
  }
  return actors;
}

/** Full clipped cue coverage, not just an overlapping talking pose. The source
 * actorScene owns speakers; this does not claim acoustic speaker identification. */
export function validateSpriteSpeechCoverage(shot:Shot,plan:SpriteStage,motions:ReadonlyMap<string,ActorMotion>,input:Narration){
  const actors=validateSpriteSpeechAssignments(shot,plan),narration=NarrationSchema.parse(input);
  if(shot.endMs>narration.durationMs)throw new Error(`${shot.id}: sprite speech shot escapes original narration clock`);
  const cues=new Map(narration.segments.map(cue=>[cue.id,cue]));
  if(cues.size!==narration.segments.length)throw new Error(`${shot.id}: duplicate original narration cue ID`);
  for(const actor of actors)for(const id of actor.segmentIds){
    const cue=cues.get(id);
    if(!cue||cue.endMs>narration.durationMs)throw new Error(`${shot.id}: unknown/invalid original speech cue: ${id}`);
    const begin=spriteSeconds(Math.max(cue.startMs,shot.startMs)-shot.startMs),end=spriteSeconds(Math.min(cue.endMs,shot.endMs)-shot.startMs);
    if(end<=begin)throw new Error(`${shot.id}: original speech cue does not overlap its shot: ${id}`);
    const clips=plan.actors.find(track=>track.actorId===actor.actorId)!.clips.filter(clip=>clip.speech?.segmentIds.includes(id)).slice().sort((a,b)=>a.startMs-b.startMs);
    let cursor=begin;
    for(const clip of clips){
      const source=motions.get(spriteMotionKey(clip.motionId,clip.fingerprint));
      if(!source)throw new Error(`${shot.id}: missing native motion for speech coverage`);
      const motion=ActorMotionSchema.parse(source);
      if(motion.id!==clip.motionId||motion.fingerprint!==clip.fingerprint||motion.actorId!==actor.actorId)throw new Error(`${shot.id}: speech motion identity mismatch`);
      const refs=clip.sourceRefs.filter(ref=>ref.kind==='narration'&&ref.segmentId===id);
      if(!refs.length||refs.some(ref=>!cue.text.normalize('NFC').includes(ref.quote.normalize('NFC'))))throw new Error(`${shot.id}: sprite speech quote differs from original narration: ${id}`);
      const hiddenAt=motion.playback.mode==='once'&&motion.playback.end==='hide'?clip.startMs+motion.frames.reduce((sum,frame)=>sum+frame.durationMs,0)/clip.rate:clip.endMs;
      const start=Math.max(begin,spriteSeconds(clip.startMs)),visibleEnd=Math.min(end,spriteSeconds(Math.min(clip.endMs,hiddenAt)));
      if(visibleEnd<=start)throw new Error(`${shot.id}: speech binding is outside its visible cue window: ${id}`);
      if(start>cursor)throw new Error(`${shot.id}: needs-sprite-speech-coverage: hidden actor gap within original cue ${id}`);
      cursor=Math.max(cursor,visibleEnd);
    }
    if(cursor<end)throw new Error(`${shot.id}: needs-sprite-speech-coverage: actor does not cover the complete original cue ${id}`);
  }
}
