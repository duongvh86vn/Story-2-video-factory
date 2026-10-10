import { BeatSchema, StoryboardSchema, type Beat, type CharacterBible, type Narration, type Shot, type Storyboard } from '../core/schemas.js';
import { validateCharacterBible } from '../story/characters.js';
import { uniqueIds, validateNarration, validatePartition } from '../story/timeline.js';
import {validateExplicitNarrationSpeakers} from '../actors/explicit-speakers.js';

export function narrationBoundaries(narration: Narration, beats: Beat[]): Set<number> {
  return new Set([0, narration.durationMs,
    ...narration.segments.flatMap(segment => [segment.startMs, segment.endMs]),
    ...narration.words.flatMap(word => [word.startMs, word.endMs]),
    ...beats.flatMap(beat => [beat.startMs, beat.endMs]),
  ]);
}

export function validateShotReferences(shot: Shot, beats: Beat[], characters: CharacterBible, boundaries?: Set<number>): void {
  if (boundaries && (!boundaries.has(shot.startMs) || !boundaries.has(shot.endMs))) throw new Error(`Shot ${shot.id}: generated cut must use an existing narration, word, beat, or locked shot boundary`);
  if (!shot.subject.trim() || !shot.visualDescription.trim()) throw new Error(`Shot ${shot.id}: subject and visualDescription must be meaningful`);
  if (Object.values(shot.camera).some(value => !value.trim())) throw new Error(`Shot ${shot.id}: camera details cannot be blank`);
  if (new Set(shot.beatIds).size !== shot.beatIds.length) throw new Error(`Shot ${shot.id}: duplicate beat references`);
  const overlapping = beats.filter(beat => beat.startMs < shot.endMs && beat.endMs > shot.startMs);
  if (overlapping.length !== shot.beatIds.length || overlapping.some(beat => !shot.beatIds.includes(beat.id))) throw new Error(`Shot ${shot.id}: beatIds must list exactly all beats overlapped by its interval`);
  if (new Set(shot.characters).size !== shot.characters.length) throw new Error(`Shot ${shot.id}: duplicate character IDs`);
  const scene=shot.cinematic?.actorScene,actorIds=new Set([...(scene?.primary?[scene.primary.id]:[]),...(scene?.supporting.map(a=>a.character.id)??[])]);
  for (const id of shot.characters) {
    if (!actorIds.has(id)&&!characters.characters.some(character => character.id === id)) throw new Error(`Shot ${shot.id}: unknown character ${id}`);
  }
  uniqueIds(shot.assetNeeds, `asset request in ${shot.id}`);
  for (const asset of shot.assetNeeds) {
    if (!asset.description.trim()) throw new Error(`Shot ${shot.id}: empty asset description`);
    if (asset.type === 'character' && !asset.characterId) throw new Error(`Shot ${shot.id}: character asset ${asset.id} requires characterId`);
    if (asset.characterId) {
      if(actorIds.has(asset.characterId))throw new Error(`Shot ${shot.id}: actor ${asset.characterId} is generated from actorScene; do not request a legacy character image asset`);
      const character = characters.characters.find(item => item.id === asset.characterId);
      if (!character || !shot.characters.includes(asset.characterId)) throw new Error(`Shot ${shot.id}: asset ${asset.id} references a character absent from this shot`);
      if (asset.versionId && !character.versions.some(version => version.id === asset.versionId)) throw new Error(`Shot ${shot.id}: unknown character version ${asset.versionId}`);
      // An absent pose library can be fulfilled downstream; an established library is authoritative.
      if (asset.pose && Object.keys(character.poses).length && !character.poses[asset.pose]) throw new Error(`Shot ${shot.id}: unknown approved pose ${asset.pose}`);
    } else if (asset.versionId || asset.pose) throw new Error(`Shot ${shot.id}: version/pose requires characterId`);
  }
  for (const effect of shot.sfx) {
    if (effect.timeMs < shot.startMs || effect.timeMs >= shot.endMs) throw new Error(`Shot ${shot.id}: SFX time lies outside shot`);
  }
}

export function validateStoryboard(storyboard: Storyboard, narration: Narration, beats: Beat[], characters: CharacterBible): void {
  const parsed = StoryboardSchema.parse(storyboard);
  validateNarration(narration);
  validateExplicitNarrationSpeakers(parsed,narration);
  validateCharacterBible(characters);
  beats.forEach(beat => BeatSchema.parse(beat));
  validatePartition(beats, narration.segments, 'storyboard beats');
  let beatCursor = 0;
  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]!;
    const next = beats[i + 1];
    const expectedEnd = next ? narration.segments.find(segment => segment.id === next.segmentIds[0])!.startMs : narration.durationMs;
    const text = narration.segments.filter(segment => beat.segmentIds.includes(segment.id)).map(segment => segment.text).join('\n');
    if (beat.startMs !== beatCursor || beat.endMs !== expectedEnd || beat.endMs <= beat.startMs || beat.narrationText !== text) throw new Error(`Beat ${beat.id}: narration text/timing changed`);
    beatCursor = beat.endMs;
  }
  uniqueIds(parsed.shots, 'shot');
  let cursor = 0;
  for (const shot of parsed.shots) {
    if (shot.startMs !== cursor) throw new Error(`Shot ${shot.id}: ${shot.startMs < cursor ? 'overlap or out-of-order shot' : 'gap'} at ${cursor}ms`);
    if (shot.endMs > narration.durationMs) throw new Error(`Shot ${shot.id} exceeds narration duration`);
    // Authored editorial cuts may be inside a beat; they never change cue/beat timing.
    validateShotReferences(shot, beats, characters);
    cursor = shot.endMs;
  }
  if (cursor !== narration.durationMs) throw new Error(`Storyboard ends at ${cursor}ms, narration ends at ${narration.durationMs}ms`);
  for (const beat of beats) {
    const covering = parsed.shots.filter(shot => shot.beatIds.includes(beat.id));
    let coveredUntil = beat.startMs;
    for (const shot of covering) {
      const start = Math.max(beat.startMs, shot.startMs);
      const end = Math.min(beat.endMs, shot.endMs);
      if (start !== coveredUntil || end <= start) throw new Error(`Beat ${beat.id} is not continuously covered`);
      coveredUntil = end;
    }
    if (coveredUntil !== beat.endMs) throw new Error(`Beat ${beat.id} is not fully covered by shots`);
  }
  const assetIds = new Set(parsed.shots.flatMap(shot => shot.assetNeeds.map(asset => asset.id)));
  for (const shot of parsed.shots) for (const effect of shot.sfx) {
    if (effect.assetId && !assetIds.has(effect.assetId)) throw new Error(`Shot ${shot.id}: SFX refers to unknown requested asset ${effect.assetId}`);
  }
}
