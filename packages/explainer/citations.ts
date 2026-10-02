import type { Narration, Storyboard } from '../core/schemas.js';
import type { ExplanationBeat } from './schemas.js';

type Citation=ExplanationBeat['sourceRefs'][number];

/** A literal excerpt identifies a cue; predicates must see the entire cue, including negation. */
export function canonicalNarrationCitation(ref:Citation,narration:Narration):Citation {
  if(ref.kind!=='narration')return ref;
  const cue=narration.segments.find(segment=>segment.id===ref.segmentId);
  // Long legacy cues retain their explicit evidence window. Never truncate a predicate here.
  if(!cue||cue.text.length>2000||!ref.quote.trim()||!cue.text.normalize('NFC').includes(ref.quote.normalize('NFC')))return ref;
  return {kind:'narration',segmentId:cue.id,quote:cue.text};
}

/** Visit citation metadata only, leaving artwork, subjects, choreography and narration clocks intact. */
function canonicalize<T>(input:T,narration:Narration):T {
  const result=structuredClone(input);
  const visit=(value:unknown):void=>{
    if(!value||typeof value!=='object')return;
    if(Array.isArray(value)){value.forEach(visit);return;}
    for(const [key,child] of Object.entries(value)){
      if(key==='sourceRefs'&&Array.isArray(child)){
        (value as Record<string,unknown>)[key]=child.map(ref=>canonicalNarrationCitation(ref as Citation,narration));
      }else visit(child);
    }
  };
  visit(result);return result;
}

export function canonicalExplanationEvidence(beats:ExplanationBeat[],narration:Narration):ExplanationBeat[]{return canonicalize(beats,narration);}

export function normalizeCreativeSourceRefs(board:Storyboard,narration:Narration):Storyboard {
  const result=canonicalize(board,narration);
  for(const shot of result.shots){
    const art=shot.cinematic?.artDirection;if(!art)continue;
    // Static artwork can recap known earlier evidence. This is provenance, not a new spoken cue.
    const refs=[...(shot.sourceRefs??[]),...art.layers.filter(layer=>layer.role==='explanation').flatMap(layer=>layer.sourceRefs??[]),...art.models.flatMap(model=>model.sourceRefs)];
    shot.sourceRefs=[...new Map(refs.map(ref=>[JSON.stringify(ref),ref])).values()];
  }
  return result;
}
