import type {Narration,Shot} from '../packages/core/schemas.js';
/** Test fixture construction only; never run by implementation agents. Keep
 * the reused diagram schema valid without pretending the idle actor contacts
 * or drives its mechanism. The reveal follows an actual overlapping cue. */
export function passiveActorFixtureEvents(shot:Shot,narration:Narration):NonNullable<Shot['visualization']>['events']{
  const part=shot.visualization?.parts[0],cue=narration.segments.find(s=>shot.narrationSegmentIds?.includes(s.id)&&s.startMs<shot.endMs&&s.endMs>shot.startMs);
  if(!part||!cue)throw new Error('Native actor fixture needs a source part and overlapping declared narration cue');
  return [{type:'reveal',targetId:part.id,narrationAnchor:cue.id,startMs:Math.max(shot.startMs,cue.startMs),endMs:Math.min(shot.endMs,cue.endMs),contactRequired:false,motion:'none',sourceRefs:[{kind:'narration',segmentId:cue.id,quote:cue.text}]}];
}
