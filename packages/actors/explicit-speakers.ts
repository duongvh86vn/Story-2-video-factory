import type {Narration,Storyboard} from '../core/schemas.js';

/** A source marker can name its own fictional/illustrative performer without
 * adding that name to spoken audio. It proves no historical identity, role,
 * motive or physical action. Callers still validate complete source references. */
export function explicitSpeakerNameEvidence(narration:Narration,id:string,name:string,identity:string,refs:ReadonlyArray<{kind:string;segmentId?:string;quote:string}>):boolean{
  if(id==='narrator'||identity==='historical'||name.normalize('NFC').toLowerCase()!==id.normalize('NFC').toLowerCase())return false;
  return refs.some(ref=>ref.kind==='narration'&&narration.segments.some(c=>c.id===ref.segmentId&&c.speakerId===id&&!!ref.quote.trim()&&c.text.normalize('NFC').includes(ref.quote.normalize('NFC'))));
}

/** Source speaker IDs, when supplied, are authoritative. Unlabelled legacy
 * narration retains its existing explicit storyboard ownership contract. */
export function assertExplicitCueSpeaker(narration:Narration,actorId:string,cueId:string):void{
  const cue=narration.segments.find(s=>s.id===cueId);
  if(!cue)throw new Error(`needs-speaker-ownership: unknown cue ${cueId}`);
  if(cue.speakerId&&(cue.speakerId==='narrator'||cue.speakerId!==actorId))
    throw new Error(`needs-speaker-ownership: ${cueId} belongs to ${cue.speakerId}, not ${actorId}`);
}
export function validateExplicitNarrationSpeakers(board:Storyboard,narration:Narration):void{
  if(!narration.segments.some(c=>c.speakerId))return;
  for(const shot of board.shots){
    const scene=shot.cinematic?.actorScene;if(!scene)continue;
    const actors=[...(scene.primary?[{id:scene.primary.id,cues:scene.speakingSegmentIds}]:[]),...scene.supporting.map(a=>({id:a.character.id,cues:a.speakingSegmentIds}))];
    for(const actor of actors)for(const cueId of actor.cues)assertExplicitCueSpeaker(narration,actor.id,cueId);
    for(const cue of narration.segments){
      if(!cue.speakerId||cue.speakerId==='narrator'||cue.startMs>=shot.endMs||cue.endMs<=shot.startMs)continue;
      const visible=actors.find(a=>a.id===cue.speakerId);
      if(visible&&!visible.cues.includes(cue.id))throw new Error(`needs-speaker-ownership: visible ${visible.id} must own original cue ${cue.id} in ${shot.id}`);
    }
  }
}
