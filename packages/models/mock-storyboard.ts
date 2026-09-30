import { BeatSchema, CharacterBibleSchema, ChapterSchema, SceneTypes, ShotSchema, StorySchema,
  type Beat, type CharacterBible, type Shot, type Storyboard } from '../core/schemas.js';
import path from 'node:path';
import { ModelError, object } from './adapter.js';
import { excerpt, phase, type MockContext } from './mock-story.js';

type SceneType = typeof SceneTypes[number];
const cameras = [
  { shotSize: 'wide', movement: 'slow push-in', angle: 'eye-level three-quarter' },
  { shotSize: 'medium', movement: 'lateral tracking', angle: 'three-quarter' },
  { shotSize: 'macro', movement: 'gentle pull-back', angle: 'overhead oblique' },
  { shotSize: 'close-up', movement: 'controlled arc', angle: 'low three-quarter' },
  { shotSize: 'wide', movement: 'slow pull-back', angle: 'overhead' }
];
function allowedSceneTypes(input: unknown): SceneType[] {
  if (input === undefined) return [...SceneTypes];
  const catalog = Array.isArray(input) ? input : Object.entries(object(input)).map(([key, value]) => typeof value === 'object' ? { id: key, ...object(value) } : key);
  const result = catalog.map(value => typeof value === 'string' ? value : object(value).id ?? object(value).sceneType)
    .filter((value): value is SceneType => SceneTypes.includes(value as SceneType));
  if (!result.length) throw new ModelError('mock_context', 'Storyboard context contains no supported scene types');
  return [...new Set(result)];
}
function characterBible(input: unknown): CharacterBible {
  const parsed = CharacterBibleSchema.safeParse(Array.isArray(input) ? { characters: input } : input ?? { characters: [] });
  if (!parsed.success) throw new ModelError('mock_context', 'Storyboard requires canonical character records');
  return parsed.data;
}
function sceneFor(text: string, hasCharacter: boolean, index: number, allowed: SceneType[]): SceneType {
  const kind = phase(text);
  const choices: SceneType[] = /\b(map|location|route)\b|bản đồ|địa điểm|đường đi/i.test(text) ? ['map', 'timeline', 'technical-diagram']
    : kind === 'evidence' ? ['document-highlight', 'data-chart', 'quote', 'technical-diagram']
    : kind === 'process' ? ['process-diagram', 'factory-process', 'exploded-view', 'macro-detail']
    : kind === 'experiment' ? ['technical-cutaway', 'exploded-view', 'macro-detail', 'technical-diagram']
    : kind === 'failure' ? ['technical-cutaway', 'comparison', 'macro-detail', 'schematic']
    : kind === 'solution' ? ['before-after', 'object-hero', 'technical-diagram', 'comparison']
    : hasCharacter ? ['character-scene', 'historical-reconstruction', 'object-hero', 'timeline']
    : kind === 'conclusion' ? ['object-hero', 'timeline', 'kinetic-typography'] : ['timeline', 'technical-diagram', 'object-hero', 'kinetic-text'];
  const available = choices.filter(type => allowed.includes(type));
  return available.length ? available[index % available.length]! : allowed[index % allowed.length]!;
}
function recipeFor(input: unknown, sceneType: SceneType, durationMs: number): string | null {
  const list = Array.isArray(input) ? input : Array.isArray(object(input).recipes) ? object(input).recipes as unknown[]
    : Object.entries(object(input)).map(([id, recipe]) => ({ id, ...object(recipe) }));
  for (const value of list) {
    const recipe = object(value); const id = typeof value === 'string' ? value : recipe.id;
    if (typeof id !== 'string') continue;
    const types = recipe.sceneTypes ?? recipe.scene_types ?? recipe.sceneType ?? recipe.scene_type;
    const matches = Array.isArray(types) ? types.includes(sceneType) : types === sceneType || id === sceneType;
    const duration = object(recipe.duration);
    if (matches && (typeof duration.min !== 'number' || durationMs >= duration.min * 1000)
      && (typeof duration.max !== 'number' || durationMs <= duration.max * 1000)) return id;
  }
  return null;
}
function motions(text: string, sceneType: SceneType, silence: boolean): string[] {
  if (silence) return ['Carry the established visual state across the narration pause', 'Subtle foreground/background parallax', 'Continue the camera move without adding a new story event'];
  if (/rotor|động cơ|motor|quay|spin|rotate/i.test(text)) return ['Reveal the rotor and surrounding assembly in separate depth layers', 'Rotate the component at a deterministic rate',
    /nhiệt|heat|fail|hỏng/i.test(text) ? 'Build a warning glow at the narrated failure point' : 'Trace the narrated transfer of motion with a moving accent'];
  if (['process-diagram', 'factory-process', 'exploded-view', 'technical-cutaway', 'technical-diagram', 'schematic'].includes(sceneType)) {
    return ['Draw component connections progressively', 'Move the highlight through the narrated sequence', 'Separate depth layers as the camera moves'];
  }
  if (['character-scene', 'historical-reconstruction'].includes(sceneType)) return ['Move the reference-consistent character toward the narrated object', 'Reveal the object as the gesture reaches it', 'Parallax the foreground and background at distinct rates'];
  if (sceneType === 'map') return ['Draw the supplied route or location marker', 'Track the camera toward the active marker', 'Reveal only source-supported place labels'];
  if (['comparison', 'before-after'].includes(sceneType)) return ['Reveal the original constraint on the left', 'Slide the supplied result into the right-hand composition', 'Sweep a highlight across the changed feature'];
  if (['document-highlight', 'quote', 'newspaper'].includes(sceneType)) return ['Reveal the source excerpt line by line', 'Sweep an underline across the exact narrated claim', 'Apply a gentle depth shift to the paper and annotation layers'];
  if (sceneType === 'data-chart') return ['Reveal only supplied values; never invent measurements', 'Highlight the narrated comparison', 'Move the camera between the active annotation and chart'];
  return ['Reveal the central motif with a controlled opacity and position ramp', 'Move the focal accent in narration order', 'Maintain foreground/background parallax during the camera move'];
}
function assetsFor(id: string, sceneType: SceneType, subject: string, selected: CharacterBible['characters']): Shot['assetNeeds'] {
  const assets: Shot['assetNeeds'] = selected.map(character => {
    const version = character.versions.find(value => value.id === `${character.id}.default`) ?? character.versions[0];
    const pose = Object.hasOwn(character.poses, 'working') ? 'working' : Object.hasOwn(character.poses, 'standing') ? 'standing' : Object.keys(character.poses)[0] ?? 'standing';
    const candidates = [...(version?.assets ?? []), ...character.referenceAssets];
    const poseAsset = candidates.find(file => { const name = path.posix.parse(file.replaceAll('\\', '/')).name; return name === pose || name.endsWith(`-${pose}`) || name.endsWith(`_${pose}`); });
    const localPath = character.poses[pose] ?? poseAsset ?? (pose === 'standing' ? candidates[0] : undefined);
    return { id: `${id}.character.${character.id}`, type: 'character', characterId: character.id,
      ...(version ? { versionId: version.id } : {}), pose,
      description: `Locked reference for ${character.name}; ${character.wardrobe.default}; preserve ${character.immutable.join(', ')}`,
      ...(localPath ? { localPath } : {}), required: Boolean(localPath) };
  });
  const document = ['document-highlight', 'newspaper', 'quote'].includes(sceneType);
  const photo = ['archival-photo', 'photo-parallax'].includes(sceneType);
  assets.push({ id: `${id}.visual`, type: document ? 'document' : photo ? 'image' : 'diagram',
    description: photo ? `Approved, licensed source image for ${subject}; if unavailable use a labeled code reconstruction`
      : document ? `Exact supplied source excerpt for ${subject}; do not fabricate an archival document`
      : `Code-built ${sceneType} visual showing ${subject}; derive labels and geometry only from supplied facts`, required: !photo && !document });
  return assets;
}

export function mockStoryboard(context: MockContext): Storyboard {
  const chapterResult = ChapterSchema.safeParse(context.chapter);
  if (!chapterResult.success || chapterResult.data.endMs <= chapterResult.data.startMs) throw new ModelError('mock_context', 'Storyboard requires a timed chapter');
  const chapter = chapterResult.data;
  // The director intentionally supplies a compact Story projection for each chapter.
  const suppliedStory = object(context.story);
  const storyResult = StorySchema.safeParse({ ...suppliedStory, story: suppliedStory.story ?? chapter.summary ?? chapter.title });
  if (!storyResult.success) throw new ModelError('mock_context', 'Storyboard requires a story title, visual style, and rules');
  const story = storyResult.data;
  if (!Array.isArray(context.beats) || !context.beats.length) throw new ModelError('mock_context', 'Storyboard requires timed beats');
  const beats: Beat[] = context.beats.map(value => {
    const result = BeatSchema.safeParse(value);
    if (!result.success || result.data.endMs <= result.data.startMs || result.data.chapterId !== chapter.id) throw new ModelError('mock_context', 'Storyboard contains an invalid timed beat');
    return result.data;
  }).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  if (new Set(beats.map(beat => beat.id)).size !== beats.length) throw new ModelError('mock_context', 'Storyboard beat IDs must be unique');
  if (beats.some(beat => beat.startMs < chapter.startMs || beat.endMs > chapter.endMs)) throw new ModelError('mock_context', 'Beat timing must lie inside its chapter');
  const bible = characterBible(context.characters); const allowed = allowedSceneTypes(context.sceneTypes);
  const rules = object(context.visualRules); const preferred = object(rules.preferred_shot_seconds ?? rules.preferredShotSeconds);
  const maxSeconds = typeof preferred.max === 'number' && preferred.max > 0 ? preferred.max : 6;
  const sameCamera = typeof rules.max_same_camera_seconds === 'number' && rules.max_same_camera_seconds > 0 ? rules.max_same_camera_seconds : 7;
  const minimumChanges = typeof rules.minimum_changes_per_10_seconds === 'number' && rules.minimum_changes_per_10_seconds > 0 ? rules.minimum_changes_per_10_seconds : 2;
  const maxShotMs = Math.max(1, Math.floor(Math.min(maxSeconds, sameCamera, 10 / minimumChanges) * 1000));
  const suppliedLocks = Array.isArray(context.lockedShots) ? context.lockedShots : [];
  const locks: Shot[] = suppliedLocks.map(value => {
    const parsed = ShotSchema.safeParse(value);
    if (!parsed.success) throw new ModelError('mock_context', 'Storyboard contains an invalid locked shot');
    // Preserve the canonical input object exactly, rather than reapplying schema defaults.
    return structuredClone(value) as Shot;
  }).sort((a, b) => a.startMs - b.startMs);
  if (new Set(locks.map(shot => shot.id)).size !== locks.length || locks.some((shot, index) => shot.startMs < chapter.startMs
    || shot.endMs > chapter.endMs || (index > 0 && locks[index - 1]!.endMs > shot.startMs))) {
    throw new ModelError('mock_context', 'Locked shots must be unique, non-overlapping, and inside the chapter');
  }
  if (Array.isArray(context.lockedShotIds) && context.lockedShotIds.some(id => !locks.some(shot => shot.id === id))) {
    throw new ModelError('mock_context', 'Every lockedShotId requires its complete locked shot specification');
  }
  const endpoints = [chapter.startMs, chapter.endMs, ...beats.flatMap(beat => [beat.startMs, beat.endMs]), ...locks.flatMap(shot => [shot.startMs, shot.endMs])];
  const suppliedAnchors = Array.isArray(context.allowedBoundaries) ? context.allowedBoundaries : endpoints;
  const anchors = [...new Set(suppliedAnchors.filter((value): value is number => typeof value === 'number' && Number.isInteger(value)
    && value >= chapter.startMs && value <= chapter.endMs))].sort((a, b) => a - b);
  if (endpoints.some(value => !anchors.includes(value))) throw new ModelError('mock_context', 'Chapter, beat, and locked shot endpoints must be supplied allowed boundaries');
  const boundaries = [...new Set(endpoints)].sort((a, b) => a - b);
  const shots: Shot[] = []; const usedIds = new Set(locks.map(shot => shot.id)); let serial = 0;
  let previousCharacters: CharacterBible['characters'] = [];
  for (let window = 0; window < boundaries.length - 1; window++) {
    const start = boundaries[window]!; const end = boundaries[window + 1]!;
    const locked = locks.find(shot => shot.startMs <= start && shot.endMs >= end);
    if (locked) {
      if (locked.startMs === start) shots.push(locked);
      previousCharacters = bible.characters.filter(character => locked.characters.includes(character.id));
      continue;
    }
    const active = beats.filter(beat => beat.startMs < end && beat.endMs > start);
    if (!active.length) throw new ModelError('mock_context', 'Timed beats must cover the entire chapter, including silence');
    const beat = active[0]!;
    const silence = !beat.narrationText.trim();
    const text = `${beat.narrationText} ${beat.meaning}`;
    const mentioned = bible.characters.filter(character => {
      const normalized = text.toLocaleLowerCase();
      return normalized.includes(character.name.toLocaleLowerCase()) || normalized.includes(character.id.toLocaleLowerCase());
    });
    const selected = mentioned.length ? mentioned : /\b(he|she|ông|bà)\b/i.test(text) ? previousCharacters : [];
    if (mentioned.length) previousCharacters = mentioned;
    const cuts = [start];
    // Every cut comes from the parent-provided narration/word/beat anchors.
    // If no intermediate anchor exists, retain one complete beat shot.
    while (end - cuts.at(-1)! > maxShotMs) {
      const current = cuts.at(-1)!;
      const options = anchors.filter(anchor => anchor > current && anchor < end && anchor <= current + maxShotMs);
      const next = options.at(-1);
      if (next === undefined) break;
      cuts.push(next);
    }
    cuts.push(end);
    const divisions = cuts.length - 1;
    for (let part = 0; part < divisions; part++) {
      const index = shots.length;
      const shotStart = cuts[part]!;
      const shotEnd = cuts[part + 1]!;
      let id: string;
      do { id = `${chapter.id}.s${String(++serial).padStart(3, '0')}`; } while (usedIds.has(id));
      usedIds.add(id);
      const sceneType = sceneFor(text, selected.length > 0, part + window, allowed);
      const subject = excerpt(beat.narrationText || beat.meaning || chapter.title, 18);
      const camera = cameras[index % cameras.length]!;
      const visualDescription = `${silence ? 'Narration pause: carry the established result forward. ' : ''}${beat.visualGoal} `
        + `Compose ${subject} as a ${sceneType}, using ${story.style.visual}${story.style.era ? ` in the supplied era ${story.style.era}` : ''}. `
        + `Layer the focal object, supporting evidence, and background for a ${camera.movement}; keep labels inside safe margins. `
        + `Emphasize ${part === 0 ? 'the setup and primary relationship' : part === divisions - 1 ? 'the stated outcome and continuity into the next idea' : 'the narrated mechanism and changing detail'}. `
        + `${selected.length ? `Use only locked character IDs ${selected.map(character => character.id).join(', ')}. ` : ''}${story.rules.join('; ')}`;
      const shot = ShotSchema.parse({ id, startMs: shotStart, endMs: shotEnd,
        beatIds: active.length ? active.map(value => value.id) : [beat.id], sceneType, subject,
        characters: selected.map(character => character.id), visualDescription, camera: { ...camera },
        motion: motions(text, sceneType, silence), transitionIn: index === 0 ? 'hard-cut' : part > 0 ? 'match-cut' : 'hard-cut',
        transitionOut: part < divisions - 1 ? 'match-cut' : 'hard-cut', assetNeeds: assetsFor(id, sceneType, subject, selected),
        textOnScreen: silence ? null : ['quote', 'document-highlight', 'kinetic-text', 'kinetic-typography'].includes(sceneType)
          ? excerpt(beat.narrationText, 12) : null,
        recipeId: recipeFor(context.recipes, sceneType, shotEnd - shotStart), renderer: 'hyperframes',
        locked: false, intentionalStatic: false, intentionalBlack: false, sfx: [] });
      shots.push(shot);
    }
  }
  return { shots };
}
