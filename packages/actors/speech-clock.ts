import {NarrationSchema,type Narration,type Shot,type Storyboard} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import type {SpeechActivity} from '../voice/schemas.js';
import {actorSpeech} from './model.js';
import {SPEECH_SOURCE_CLOCK_VERSION,projectSpeechActivity,windowSpeechActivity,validateSpeechActivityTrack,validateSpeechSourceClock,type SpeechSourceClock} from '../animation/speech-clock.js';
import {hasBodyViewSpeech} from '../animation/body-view-mouth.js';

export function shotUsesSourceSpeechClock(shot:Shot):boolean{
  const scene=shot.cinematic?.actorScene;
  return !!scene&&[...(scene.primary?[scene.primary]:[]),...scene.supporting.map(a=>a.character)].some(hasBodyViewSpeech);
}
/** Whole cue ownership only. Repeated appearances of the same actor/cue are
 * deduplicated; conflicting owners are not guessed from camera or voice. */
export function narrationCueOwners(board:Storyboard,current:Shot,narration:Narration):Map<string,string[]>{
  const shots=board.shots.filter(s=>s.id!==current.id).concat(current),known=new Set(narration.segments.map(s=>s.id));
  const owners=new Map<string,string>(),byActor=new Map<string,Set<string>>();
  for(const shot of shots){const scene=shot.cinematic?.actorScene;if(!scene)continue;
    const actors=[...(scene.primary?[{id:scene.primary.id,ids:scene.speakingSegmentIds}]:[]),...scene.supporting.map(a=>({id:a.character.id,ids:a.speakingSegmentIds}))];
    for(const actor of actors)for(const cueId of actor.ids){
      if(!known.has(cueId))throw new Error('needs-speaker-ownership: unknown narration cue '+cueId);
      if(!shot.narrationSegmentIds?.includes(cueId))throw new Error('needs-speaker-ownership: cue is outside shot anchors '+cueId);
      const prior=owners.get(cueId);if(prior&&prior!==actor.id)throw new Error('needs-speaker-ownership: one complete cue has conflicting actor owners '+cueId);
      owners.set(cueId,actor.id);let set=byActor.get(actor.id);if(!set){set=new Set();byActor.set(actor.id,set);}set.add(cueId);
    }
  }
  return new Map([...byActor].map(([id,cues])=>[id,[...cues].sort()]));
}
export function actorShotSpeech(activity:SpeechActivity,narration:Narration|undefined,ownerId:string,cueIds:string[],startMs:number,endMs:number,allOwnedCueIds?:string[]){
  if(!narration)throw new Error('needs-speech-phase: owned source speech requires narration');
  validateSpeechActivityTrack(activity);
  const ownedIds=[...new Set(allOwnedCueIds??cueIds)].sort(),known=new Set(narration.segments.map(s=>s.id));
  if(ownedIds.some(id=>!known.has(id))||cueIds.some(id=>!ownedIds.includes(id)))throw new Error('needs-speaker-ownership: source cue list is missing or unknown');
  const source=actorSpeech(activity,narration,ownedIds,0,narration.durationMs);
  validateSpeechActivityTrack(source);
  const local=projectSpeechActivity(actorSpeech(activity,narration,cueIds,0,narration.durationMs),startMs,endMs);
  const sourceClock:SpeechSourceClock={version:SPEECH_SOURCE_CLOCK_VERSION,ownerId,scope:allOwnedCueIds?'storyboard-cues':'shot-cues',
    cueIds:ownedIds,startMs,endMs,sourceActivityHash:hash(source),activity:windowSpeechActivity(source,startMs,endMs)};
  validateSpeechSourceClock(local,sourceClock,ownerId,endMs-startMs);
  return {activity:local,sourceClock};
}
export function rigSpeechInputIdentity(shot:Shot,narration:Narration,board:Storyboard){
  if(!shotUsesSourceSpeechClock(shot))return undefined;
  const owners=narrationCueOwners(board,shot,narration),scene=shot.cinematic!.actorScene!;
  const selected=[...(scene.primary?[scene.primary]:[]),...scene.supporting.map(a=>a.character)].filter(hasBodyViewSpeech);
  return {version:SPEECH_SOURCE_CLOCK_VERSION,narrationHash:hash(NarrationSchema.parse(narration)),owners:selected.map(a=>({actorId:a.id,cueIds:owners.get(a.id)??[]}))};
}
export type RigSpeechPublicationBinding={version:typeof SPEECH_SOURCE_CLOCK_VERSION;identityHash:string};
export function rigSpeechPublicationBinding(shot:Shot,narration:Narration,board:Storyboard):RigSpeechPublicationBinding|undefined{
  const identity=rigSpeechInputIdentity(shot,narration,board);
  return identity?{version:SPEECH_SOURCE_CLOCK_VERSION,identityHash:hash(identity)}:undefined;
}
/** Acceptance uses the board actually being committed, with the repaired shot
 * substituted. Nonlocal ownership/narration changes must not approve a scene
 * compiled with another source phase. This is not waveform verification. */
export function assertRigSpeechPublicationBinding(shot:Shot,narration:Narration,board:Storyboard,expected?:RigSpeechPublicationBinding):void{
  const current=rigSpeechPublicationBinding(shot,narration,board);
  if(!current&&!expected)return;
  if(!current||!expected||current.version!==expected.version||current.identityHash!==expected.identityHash)throw new Error('needs-speech-phase: storyboard/narration source identity changed before repair publication');
}
