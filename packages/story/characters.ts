import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import { CharacterBibleSchema, Id, type CharacterBible, type Narration, type Story } from '../core/schemas.js';
import { exists, hash, readJson, safePath, safeRealPath, writeAtomic, writeJson } from '../core/utils.js';
import { parseMarkdown } from '../ingest/index.js';
import type { ModelRouter } from '../models/registry.js';
import { libraryRoot, loadPrompt } from './prompts.js';
import { planWithValidation } from './request.js';
import { uniqueIds } from './timeline.js';
import { readProjectLocks } from './locks.js';

type Character = CharacterBible['characters'][number];
export interface SeriesContext { bible: CharacterBible; source?: Story; directory?: string }

interface ApprovedCharacter { id: string; referenceAssets: string[]; versions: Character['versions']; poses: Record<string, string> }

/** Only explicit approvals in the user's pose registry become approved references. */
export async function discoverCharacterAssets(root: string, story: Story): Promise<ApprovedCharacter[]> {
  const result: ApprovedCharacter[] = [];
  for (const character of story.characters) {
    const references = new Set<string>();
    const poses: Record<string, string> = {};
    const versions = new Map<string, Character['versions'][number]>();
    for (const folder of [`input/assets/characters/${character.id}`, `assets/characters/${character.id}`]) {
      const relative = `${folder}/poses.json`;
      if (!await exists(safePath(root, relative))) continue;
      const registry: unknown = await readJson(await safeRealPath(root, relative));
      if (!registry || typeof registry !== 'object' || Array.isArray(registry)) throw new Error(`Invalid pose registry for ${character.id}`);
      const data = registry as Record<string, unknown>;
      if (data.characterId && data.characterId !== character.id) throw new Error(`Pose registry character ID conflicts with ${character.id}`);
      const versionId = typeof data.versionId === 'string' ? Id.parse(data.versionId) : undefined;
      async function add(name: string, value: unknown): Promise<void> {
        const entry = value && typeof value === 'object' ? value as Record<string, unknown> : {};
        if (entry.approved !== true && !(entry.approved === undefined && data.approved === true)) return;
        const file = typeof value === 'string' ? value : typeof entry.path === 'string' ? entry.path : undefined;
        if (!file || !name.trim()) throw new Error(`Approved pose ${name} for ${character.id} lacks a path`);
        const asset = await exists(safePath(root, file)) ? file : path.join(folder, file).replaceAll('\\', '/');
        const resolved = await safeRealPath(root, asset);
        if (!(await fs.stat(resolved)).isFile()) throw new Error(`Approved pose ${name} is not a regular file`);
        const canonical = path.relative(root, resolved).replaceAll('\\', '/');
        if (poses[name] && poses[name] !== canonical) throw new Error(`Conflicting approved pose ${name} for ${character.id}`);
        poses[name] = canonical;
        references.add(canonical);
        const version = typeof entry.versionId === 'string' ? Id.parse(entry.versionId) : versionId;
        if (version) {
          const known = versions.get(version) ?? { id: version, description: `Approved reference version for ${character.name}`, assets: [] };
          if (!known.assets.includes(canonical)) known.assets.push(canonical);
          versions.set(version, known);
        }
      }
      if (Array.isArray(data.poses)) {
        for (const value of data.poses) {
          if (!value || typeof value !== 'object') continue;
          const entry = value as Record<string, unknown>;
          const name = typeof entry.pose === 'string' ? entry.pose : typeof entry.name === 'string' ? entry.name : '';
          await add(name, value);
        }
      } else if (data.poses && typeof data.poses === 'object') {
        for (const [name, value] of Object.entries(data.poses)) await add(name, value);
      }
    }
    if (references.size) result.push({ id: character.id, referenceAssets: [...references], versions: [...versions.values()], poses });
  }
  return result;
}

export function validateCharacterBible(bible: CharacterBible): void {
  CharacterBibleSchema.parse(bible);
  uniqueIds(bible.characters, 'character');
  for (const character of bible.characters) {
    if (!character.name.trim() || !character.wardrobe.default.trim()) throw new Error(`Character ${character.id}: name and wardrobe baseline are required`);
    uniqueIds(character.versions, `version of ${character.id}`);
    const immutable = new Set(character.immutable.map(trait => trait.trim().toLowerCase()));
    if (character.mutable.some(trait => immutable.has(trait.trim().toLowerCase()))) throw new Error(`Character ${character.id}: a trait cannot be both mutable and immutable`);
  }
}

/** Copy approved series references into this project's artifact namespace. */
async function importSeriesAssets(root: string, directory: string, seriesId: string, bible: CharacterBible): Promise<CharacterBible> {
  const imported = new Map<string, string>();
  async function asset(relative: string): Promise<string> {
    if (imported.has(relative)) return imported.get(relative)!;
    const source = await safeRealPath(directory, relative);
    const targetRelative = path.join('work', 'series-assets', seriesId, relative).replaceAll('\\', '/');
    const content = await fs.readFile(source);
    await writeAtomic(safePath(root, targetRelative), content);
    imported.set(relative, targetRelative);
    return targetRelative;
  }
  const characters: Character[] = [];
  for (const character of bible.characters) {
    const referenceAssets: string[] = [];
    for (const reference of character.referenceAssets) referenceAssets.push(await asset(reference));
    const versions: Character['versions'] = [];
    for (const version of character.versions) {
      const assets: string[] = [];
      for (const reference of version.assets) assets.push(await asset(reference));
      versions.push({ ...version, assets });
    }
    const poses: Record<string, string> = {};
    for (const [pose, reference] of Object.entries(character.poses)) poses[pose] = await asset(reference);
    characters.push({ ...character, referenceAssets, versions, poses, locked: true });
  }
  return { ...bible, characters };
}

export async function loadSeriesContext(root: string, config: FactoryConfig): Promise<SeriesContext> {
  const seriesId = config.project.series;
  if (!seriesId) return { bible: { characters: [] } };
  const repo = path.dirname(await libraryRoot());
  const directory = safePath(path.join(repo, 'series'), seriesId);
  if (!await exists(directory)) throw new Error(`Configured series ${seriesId} does not exist at ${directory}`);
  let bible: CharacterBible = { characters: [], seriesId };
  for (const name of ['character-bible.json', 'characters.json', 'characters/character-bible.json']) {
    const file = path.join(directory, name);
    if (await exists(file)) { bible = CharacterBibleSchema.parse(await readJson(file)); break; }
  }
  validateCharacterBible(bible);
  if (bible.seriesId && bible.seriesId !== seriesId) throw new Error(`Series bible ID ${bible.seriesId} conflicts with configured ${seriesId}`);
  const markdown = path.join(directory, 'series-bible.md');
  const source = await exists(markdown) ? parseMarkdown(await fs.readFile(markdown, 'utf8'), config) : undefined;
  bible = await importSeriesAssets(root, directory, seriesId, { ...bible, seriesId });
  await writeJson(path.join(root, 'work', 'series-character-bible.json'), bible);
  return { bible, source, directory };
}

/** Preserve locked objects byte-for-byte at the JSON data level. */
export function enforceCharacterLocks(candidate: CharacterBible, story: Story, inherited: CharacterBible, existing: CharacterBible, stateLocks: Record<string, boolean> = {}): CharacterBible {
  validateCharacterBible(candidate);
  if (inherited.seriesId && existing.seriesId && inherited.seriesId !== existing.seriesId) throw new Error('Existing character bible belongs to a different series');
  const locks = new Map<string, Character>();
  for (const bible of [inherited, existing]) {
    validateCharacterBible(bible);
    for (const character of bible.characters) {
      if (bible !== inherited && !(stateLocks[character.id] ?? stateLocks[`character:${character.id}`] ?? stateLocks[`characters.${character.id}`] ?? character.locked)) continue;
      const previous = locks.get(character.id);
      if (previous && hash(previous) !== hash(character)) throw new Error(`Conflicting locked definitions for character ${character.id}; update the canonical bible explicitly`);
      locks.set(character.id, character);
    }
  }
  const byId = new Map(candidate.characters.map(character => [character.id, character]));
  for (const [id, locked] of locks) {
    const proposed = byId.get(id);
    if (proposed && hash(proposed) !== hash(locked)) throw new Error(`Model attempted to change locked character ${id}`);
    byId.set(id, locked);
  }
  const allowed = new Set([...story.characters.map(character => character.id), ...inherited.characters.map(character => character.id), ...existing.characters.map(character => character.id)]);
  for (const character of byId.values()) {
    if (!allowed.has(character.id)) throw new Error(`Character ${character.id} is not grounded in source or inherited bible`);
  }
  for (const source of story.characters) {
    const character = byId.get(source.id);
    if (!character) throw new Error(`Source character ${source.id} missing from bible`);
    if (character.name !== source.name) throw new Error(`Source character ${source.id} was renamed`);
    for (const trait of source.immutableTraits) {
      if (!character.immutable.includes(trait)) throw new Error(`Character ${source.id} dropped immutable trait: ${trait}`);
    }
    for (const trait of source.mutableTraits) {
      if (!character.mutable.includes(trait)) throw new Error(`Character ${source.id} dropped mutable trait: ${trait}`);
    }
  }
  const seriesId = inherited.seriesId ?? existing.seriesId;
  if (candidate.seriesId && seriesId && candidate.seriesId !== seriesId) throw new Error('Model changed series ID');
  return CharacterBibleSchema.parse({ ...candidate, ...(seriesId ? { seriesId } : {}), characters: [...byId.values()].map(character => ({ ...character, locked: true })) });
}

export async function buildCharacterBible(root: string, config: FactoryConfig, router: ModelRouter, story: Story, narration: Narration, series: SeriesContext): Promise<CharacterBible> {
  const file = path.join(root, 'work', 'character-bible.json');
  let existing: CharacterBible = await exists(file) ? CharacterBibleSchema.parse(await readJson(file)) : { characters: [] };
  if(config.content.mode==='narrated-explainer'){const subjects=new Set(story.characters.map(c=>c.id));existing={...existing,characters:existing.characters.filter(c=>subjects.has(c.id))};series={...series,bible:{...series.bible,characters:series.bible.characters.filter(c=>subjects.has(c.id))}};}
  const locks = await readProjectLocks(root);
  if (locks.characterBible) {
    if (!await exists(file)) throw new Error('Character bible is locked but work/character-bible.json is missing');
    validateCharacterBible(existing);
    enforceCharacterLocks(existing, story, series.bible, existing, locks);
    await writeJson(path.join(root, 'work', 'characters.json'), existing);
    await writeJson(path.join(root, 'output', 'character-bible.json'), existing);
    return existing;
  }
  const approvedCharacters = await discoverCharacterAssets(root, story);
  const approvedReferences = new Map<string, Set<string>>();
  for (const character of [...approvedCharacters, ...series.bible.characters, ...existing.characters]) {
    const owned = approvedReferences.get(character.id) ?? new Set<string>();
    for (const reference of [...character.referenceAssets, ...character.versions.flatMap(version => version.assets), ...Object.values(character.poses)]) owned.add(reference);
    approvedReferences.set(character.id, owned);
  }
  const characters = await planWithValidation(root, config, router, 'planner', 'character-bible', {
    system: await loadPrompt('character-bible'),
    prompt: 'Build the canonical character bible. Preserve inherited and existing locked characters exactly, including asset paths and locks. Ground all additions in story.characters. Retain source immutable/mutable traits verbatim. Every resulting character is locked.',
    context: { task: 'character-bible', story, narration: { segments: narration.segments }, inherited: series.bible, existing, seriesSource: series.source, approvedCharacters,
      ...(config.content.mode==='narrated-explainer'&&config.presentation.character_mode==='actors'?{visualPresentation:{characterMode:'actors',rigProfile:config.host.profile,designBrief:config.presentation.design_brief,authority:'Use the selected rig family for illustrative story roles. Preserve supplied identity facts and explicit inherited/approved locks. Visual styling is an illustration, not an invented biographical claim; a seed silhouette is not a mandatory shared costume.'}}:{}),
    },
  }, CharacterBibleSchema, result => {
    const withReferences = { ...result, characters: result.characters.map(character => {
      if (series.bible.characters.some(item => item.id === character.id) || existing.characters.some(item => item.id === character.id && (locks[item.id] ?? locks[`character:${item.id}`] ?? locks[`characters.${item.id}`] ?? item.locked))) return character;
      const approved = approvedCharacters.find(item => item.id === character.id);
      return approved ? { ...character, referenceAssets: approved.referenceAssets, versions: approved.versions, poses: approved.poses } : character;
    }) };
    for (const character of withReferences.characters) {
      for (const reference of [...character.referenceAssets, ...character.versions.flatMap(version => version.assets), ...Object.values(character.poses)]) {
        if (!approvedReferences.get(character.id)?.has(reference)) throw new Error(`Character ${character.id}: reference ${reference} has no supplied approval for this character`);
      }
    }
    return enforceCharacterLocks(withReferences, story, series.bible, existing, locks);
  },undefined,undefined,{reuseAccepted:true});
  await writeJson(file, characters);
  await writeJson(path.join(root, 'work', 'characters.json'), characters);
  await writeJson(path.join(root, 'output', 'character-bible.json'), characters);
  await writeJson(path.join(root, 'work', 'character-locks.json'), {
    seriesId: characters.seriesId, identities: Object.fromEntries(characters.characters.map(character => [character.id, hash(character)])),
  });
  return characters;
}
