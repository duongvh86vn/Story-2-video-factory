import { hash } from '../core/utils.js';
import type { Narration, Shot, Story } from '../core/schemas.js';
import { fold, validateExplanation } from './plan.js';
import type { ExplanationBeat } from './schemas.js';

/** Authored worlds may join the same narrated subject across beats and illustrate literal generic subjects. */
export function validateAuthoredVisualSources(shot:Shot,canonical:ExplanationBeat[],narration:Narration,hostId:string):void{
  const v=shot.visualization!,entities=canonical.flatMap(beat=>beat.entities);
  const refs=canonical.flatMap(beat=>[...beat.sourceRefs,...beat.entities.flatMap(e=>e.sourceRefs),...beat.relations.flatMap(r=>r.sourceRefs)]);
  const equivalent=(a:typeof entities[number],b:typeof entities[number])=>a.kind===b.kind&&a.configuration===b.configuration&&fold(a.label)===fold(b.label);
  for(const part of v.parts){
    const original=entities.find(e=>e.id===part.id);
    if(original){
      if(part.label!==original.label||!equivalent(part,original)||hash(part.states??[])!==hash(original.states??[]))throw new Error(`${shot.id}: model entity changed its sourced identity: ${part.id} must preserve label=${JSON.stringify(original.label)}, kind=${original.kind}, configuration=${original.configuration??'absent'} and canonical states; customize displayed labels in artDirection artwork`);
      const matching=entities.filter(entity=>equivalent(entity,original));
      if(!part.sourceRefs.every(ref=>matching.some(entity=>entity.sourceRefs.some(source=>hash(ref)===hash(source)))))throw new Error(`${shot.id}: merged entity evidence belongs to a different subject`);
    }else if(!['object','stage','marker'].includes(part.kind)||part.configuration||part.states?.length||!part.sourceRefs.some(ref=>fold(ref.quote).includes(fold(part.label)))){
      throw new Error(`${shot.id}: new illustrative subject must be a literal generic source excerpt`);
    }
    if(!part.sourceRefs.every(ref=>refs.some(source=>hash(ref)===hash(source))))throw new Error(`${shot.id}: unverifiable illustrative subject source`);
  }
  // Run the existing predicate/source validator on the composed world, rather than assuming
  // an arrow is valid simply because its endpoints occur in the same story.
  const id=`${shot.id}.visual-evidence`,sourceText=refs.filter(ref=>ref.kind==='source').map(ref=>ref.quote).join('\n');
  const story={supplement:sourceText?{story:sourceText}:undefined} as Story;
  const beat={id,segmentIds:shot.narrationSegmentIds!} as Parameters<typeof validateExplanation>[3][number];
  const timedTransfers=v.events.filter(e=>e.type==='flow'&&e.relationTo).map(e=>{
    const cue=narration.segments.find(segment=>segment.id===e.narrationAnchor);
    if(!cue||e.startMs<cue.startMs||e.endMs>cue.endMs||!e.sourceRefs.some(ref=>ref.kind==='narration'&&ref.segmentId===cue.id))throw new Error(`${shot.id}: timed flow must cite its current narration anchor and fit its cue clock`);
    // Persistent subject refs may span earlier cues; a new moving occurrence needs its own evidence.
    return {from:e.targetId,to:e.relationTo!,kind:'transfer' as const,sourceRefs:e.sourceRefs.filter(ref=>ref.kind==='narration'&&ref.segmentId===cue.id)};
  });
  // Named subjects remain subject to the same source/name/role checks as the original beat.
  // Share this context with timed transfers as well as the persistent world relations.
  const composedBeat:ExplanationBeat={beatId:id,explanationGoal:shot.explanationGoal!,
    narrationSegmentIds:shot.narrationSegmentIds!,sourceRefs:shot.sourceRefs!,entities:v.parts,relations:v.relations,
    visualMethod:v.type,hostIntent:shot.cinematic!.motivation.slice(0,500),
    ...(shot.cinematic?.sceneIntent?{sceneIntent:shot.cinematic.sceneIntent}:{})};
  validateExplanation({version:2,hostId,contentIssues:[],beats:[composedBeat]},story,narration,[beat],hostId);
  for(const relation of timedTransfers)validateExplanation({version:2,hostId,contentIssues:[],
    beats:[{...composedBeat,relations:[relation]}]},story,narration,[beat],hostId);
}
