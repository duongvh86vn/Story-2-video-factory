import { ShotSchema, type Review, type SceneFiles } from '../core/schemas.js';
import { recipes, renderRecipe, type RecipeAsset } from '../../library/shots/index.js';
import { styles, type VisualStyle } from '../../library/styles/index.js';
import { ModelError, object } from './adapter.js';
import type { MockContext } from './mock-story.js';

function visualStyle(input: unknown): VisualStyle {
  const value = object(input);
  const preset = typeof input === 'string' ? input : value.preset ?? value.id ?? 'historical-cinematic';
  const base = styles.find(style => style.id === preset) ?? styles[0]!;
  const merged = { ...base }; const overrides = { ...value, ...object(value.overrides) };
  for (const key of ['background', 'foreground', 'accent', 'muted', 'panel'] as const) {
    if (typeof overrides[key] === 'string' && /^#[\da-f]{6}$/i.test(overrides[key])) merged[key] = overrides[key];
  }
  if (typeof overrides.borderRadius === 'number' && overrides.borderRadius >= 0 && overrides.borderRadius <= 100) merged.borderRadius = overrides.borderRadius;
  return merged;
}
export function mockScene(context: MockContext, repair = false): SceneFiles {
  const shotResult = ShotSchema.safeParse(context.shot ?? context.shotSpec);
  if (!shotResult.success) throw new ModelError('mock_context', 'Scene generation/repair requires a timed Shot');
  const shot = shotResult.data;
  const config = object(context.config); const rendering = object(context.rendering ?? config.rendering);
  const size = object(context.profile ?? rendering.final ?? context.dimensions);
  const rules = object(context.rules);
  const width = dimension(rules.width ?? context.width ?? size.width, 1920); const height = dimension(rules.height ?? context.height ?? size.height, 1080);
  const manifest = context.assets ?? context.assetManifest;
  const list = Array.isArray(manifest) ? manifest : Array.isArray(object(manifest).assets) ? object(manifest).assets as unknown[] : [];
  const assets: RecipeAsset[] = list.filter(value => object(value).status === undefined || object(value).status === 'approved').flatMap(value => {
    const asset = object(value);
    if (typeof asset.id !== 'string' || typeof asset.path !== 'string' || typeof asset.type !== 'string'
      || /^[a-z]+:|^[/\\]|(?:^|[/\\])\.\.(?:[/\\]|$)/i.test(asset.path)) return [];
    return [{ id: asset.id, path: asset.path, type: asset.type, ...(typeof asset.characterId === 'string' ? { characterId: asset.characterId } : {}) }];
  });
  const recipe = recipes.find(value => value.id === shot.recipeId && value.sceneTypes.includes(shot.sceneType))
    ?? recipes.find(value => value.sceneTypes.includes(shot.sceneType));
  if (!recipe) throw new ModelError('mock_context', 'No deterministic local recipe supports the supplied shot scene type');
  const generated = renderRecipe(recipe, shot, visualStyle(context.style ?? config.style), width, height, assets);
  return { ...generated, notes: [...generated.notes, repair
    ? 'Deterministic repair replacement rebuilt from the original shot and approved local assets; preserves shot identity and timing.'
    : 'Deterministic mock generation uses the supplied shot, local recipe, and approved assets only.'] };
}
function dimension(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 8192 ? value : fallback;
}

/** Objective context checks only; no claim of having inspected image pixels. */
export function mockReview(context: MockContext): Review {
  const source = context.shots ?? object(context.storyboard).shots ?? (context.shot ? [context.shot] : []);
  const values = Array.isArray(source) ? source : [];
  const issues: Review['issues'] = [];
  const rules = object(context.visualRules ?? context.rules);
  const maxStatic = typeof rules.max_static_seconds === 'number' ? rules.max_static_seconds * 1000 : 4000;
  const characters = object(context.characters).characters ?? context.characters;
  const knownCharacters = Array.isArray(characters) ? new Set(characters.map(value => object(value).id)) : undefined;
  const seen = new Set<string>(); let previousEnd: number | undefined;
  for (const value of values) {
    const parsed = ShotSchema.safeParse(value); const raw = object(value);
    const id = typeof raw.id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(raw.id) ? raw.id : 'unknown-shot';
    if (!parsed.success) {
      issues.push({ shotId: id, type: 'invalid-shot', severity: 'high', description: 'Supplied shot does not satisfy the canonical shot schema.', repair: 'Correct the shot data using the supplied narration and beat anchors.' });
      continue;
    }
    const shot = parsed.data;
    if (seen.has(id)) issues.push({ shotId: id, type: 'duplicate-id', severity: 'high', description: 'Shot ID repeats in the supplied storyboard.', repair: 'Assign a unique chapter-namespaced ID while preserving locked shot IDs.' });
    seen.add(id);
    if (previousEnd !== undefined && shot.startMs !== previousEnd) issues.push({ shotId: id, type: shot.startMs < previousEnd ? 'overlap' : 'gap', severity: 'high',
      description: 'Shot timing does not meet the preceding shot boundary.', repair: 'Align coverage to the supplied narration anchors; preserve locked intervals.' });
    previousEnd = shot.endMs;
    if (!shot.intentionalStatic && !shot.motion.length && /^(static|locked|none)$/i.test(shot.camera.movement)
      && shot.endMs - shot.startMs > maxStatic) issues.push({ shotId: id, type: 'static-duration', severity: 'medium',
      description: 'A long shot has no declared subject or camera motion.', repair: 'Add a deterministic camera move or motivated subject motion, or mark a purposeful static shot.' });
    if (knownCharacters && shot.characters.some(character => !knownCharacters.has(character))) issues.push({ shotId: id, type: 'unknown-character', severity: 'high',
      description: 'Shot references a character outside the supplied bible.', repair: 'Use the actual supplied character IDs and their locked versions.' });
  }
  return { pass: !issues.some(issue => issue.severity === 'high' || issue.severity === 'medium'), issues, mode: 'rule-based',
    warnings: ['Mock reviewer checks supplied specifications only; no screenshot pixels, rendering, or visual continuity were evaluated.',
      ...(values.length ? [] : ['No shot specifications were supplied for objective review.'])] };
}
