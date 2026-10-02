import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import { AssetManifestSchema, CharacterBibleSchema, Id, ProjectStateSchema, type Asset, type AssetManifest, type CharacterBible, type ProjectState, type Storyboard } from '../core/schemas.js';
import { appendLog, exists, hash, readJson, safePath, safeRealPath, walk } from '../core/utils.js';
import { AssetResolutionError, extensionFits, managedFile, mediaExtensions, readAsset, writeAsset, writeAssetJson } from './files.js';
import { explicitUrlProvider, registeredAssetProviders, type AssetRequest, type LicensedAssetSource } from './providers.js';
import { downloadAsset, licensedSource, publicSourceUrl } from './remote.js';
import { characterFingerprint, characterSvg, diagramSvg, type Character } from './svg.js';
import {ActorCastManifestSchema} from '../actors/assets.js';
import {actorDefinitions} from '../actors/locks.js';

interface Need { request: AssetRequest; shotIds: string[]; }
interface AudioCandidate { type: 'music' | 'sfx'; path: string; hash: string; }
interface ApprovedPose {
  characterId: string;
  versionId?: string;
  pose: string;
  path: string;
  hash?: string;
  author?: string;
  license?: string;
  retrievedAt?: string;
}
interface Continuity {
  version: 1;
  identities: Record<string, string>;
  poses: Record<string, { hash: string; path: string }>;
}
const manifestFiles = ['work/asset-manifest.json', 'work/assets.json', 'output/asset-manifest.json', 'input/assets/asset-manifest.json', 'assets/asset-manifest.json'];
const localRoots = ['input/assets', 'assets'];
const projectQueues = new Map<string, Promise<void>>();
const defaultVersion = (value?: string) => value ?? '';
const defaultPose = (value?: string) => value ?? 'standing';
const identityKey = (id: string, version?: string) => JSON.stringify([id, defaultVersion(version)]);
const poseKey = (id: string, version?: string, pose?: string) => JSON.stringify([id, defaultVersion(version), defaultPose(pose)]);

function assetLock(state: ProjectState | undefined, id: string): boolean {
  const locks = state?.locked ?? {};
  return Boolean(locks.assets || locks.assetManifest || locks[id] || locks[`asset:${id}`] || locks[`assets.${id}`]);
}

function characterLock(state: ProjectState | undefined, character: Character): boolean {
  const locks = state?.locked ?? {};
  return Boolean(locks.characters || locks.characterBible || (locks[character.id] ?? locks[`character:${character.id}`] ?? locks[`characters.${character.id}`] ?? character.locked));
}

function stateCharacterLock(state: ProjectState | undefined, id: string): boolean {
  const locks = state?.locked ?? {};
  return Boolean(locks.characters || locks.characterBible || locks[id] || locks[`character:${id}`] || locks[`characters.${id}`]);
}

function compatible(asset: Asset, request: Pick<Asset, 'type' | 'characterId' | 'versionId' | 'pose'>): boolean {
  return asset.type === request.type && asset.characterId === request.characterId &&
    defaultVersion(asset.versionId) === defaultVersion(request.versionId) &&
    (request.type !== 'character' || defaultPose(asset.pose) === defaultPose(request.pose));
}

function requestSignature(request: AssetRequest): string {
  return hash({ type: request.type, description: request.description, characterId: request.characterId ?? '',
    versionId: defaultVersion(request.versionId), pose: request.type === 'character' ? defaultPose(request.pose) : request.pose ?? '',
    localPath: request.localPath ?? '', sourceUrl: request.sourceUrl ?? '', license: request.license ?? '' });
}

function audioBasename(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/^[^a-z0-9]+|-+$/g, '');
}

function collectNeeds(storyboard: Storyboard, characters: CharacterBible, candidates: AudioCandidate[], approved: Map<string, Asset>): Need[] {
  const characterIds = new Set(characters.characters.map(character => character.id));
  if (characterIds.size !== characters.characters.length) throw new AssetResolutionError('duplicate-character-id');
  const needs = new Map<string, Need>();
  const explicit = storyboard.shots.flatMap(shot => shot.assetNeeds);
  const explicitMusic = explicit.filter(request => request.type === 'music');
  const existingMusic = [...approved.values()].find(asset => asset.type === 'music');
  const candidateMusic = candidates.find(candidate => candidate.type === 'music');
  const inferredMusic: AssetRequest | undefined = !explicitMusic.length && (existingMusic || candidateMusic) ? {
    id: existingMusic?.id ?? `music_${audioBasename(path.posix.parse(candidateMusic!.path).name) || hash(candidateMusic!.path).slice(0, 16)}`,
    type: 'music', description: 'Optional project background music', required: false,
    localPath: existingMusic ? undefined : candidateMusic!.path,
  } : undefined;
  for (const shot of storyboard.shots) {
    const scene=shot.cinematic?.actorScene,actorIds=new Set([...(scene?.primary?[scene.primary.id]:[]),...(scene?.supporting.map(a=>a.character.id)??[])]);
    const requests = shot.assetNeeds.map(request => ({ ...request }));
    if (inferredMusic) requests.push({ ...inferredMusic });
    for (const characterId of shot.characters) {
      if(actorIds.has(characterId))continue;
      if (!characterIds.has(characterId)) throw new AssetResolutionError('unknown-shot-character');
      if (!requests.some(request => request.type === 'character' && request.characterId === characterId)) {
        requests.push({ id: `character_${characterId}`, type: 'character', characterId, pose: 'standing',
          description: `Character reference for ${characterId}`, required: true });
      }
    }
    for (const event of shot.sfx) {
      const typeKey = audioBasename(event.type);
      const named = event.assetId ? explicit.find(request => request.id === event.assetId) : explicit.find(request => request.type === 'sfx' &&
        (audioBasename(request.id) === typeKey || (request.localPath && audioBasename(path.posix.parse(request.localPath.replaceAll('\\', '/')).name) === typeKey)));
      if (named) {
        if (named.type !== 'sfx') throw new AssetResolutionError('sfx-asset-type-mismatch', named.id);
        if (!requests.some(request => request.id === named.id)) requests.push({ ...named });
        continue;
      }
      const existing = event.assetId ? approved.get(event.assetId) : [...approved.values()].find(asset => asset.type === 'sfx' &&
        (audioBasename(asset.id) === typeKey || audioBasename(path.posix.parse(asset.path).name) === typeKey));
      if (existing && existing.type !== 'sfx') throw new AssetResolutionError('sfx-asset-type-mismatch', existing.id);
      const candidate = candidates.find(item => item.type === 'sfx' && event.assetId && audioBasename(path.posix.parse(item.path).name) === audioBasename(event.assetId)) ??
        candidates.find(item => item.type === 'sfx' && audioBasename(path.posix.parse(item.path).name) === typeKey);
      const id = event.assetId ?? existing?.id ?? `sfx_${typeKey || hash(event.type).slice(0, 16)}`;
      const already = requests.find(request => request.id === id);
      if (already) {
        if (already.type !== 'sfx') throw new AssetResolutionError('sfx-asset-type-mismatch', id);
        continue;
      }
      requests.push({ id, type: 'sfx', description: `Sound effect asset ${id}`, required: false,
        localPath: existing ? undefined : candidate?.path });
    }
    for (const request of requests) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(request.id)) throw new AssetResolutionError('invalid-asset-id');
      if (request.type === 'character' && (!request.characterId || !characterIds.has(request.characterId))) throw new AssetResolutionError('unknown-character', request.id);
      if (request.type !== 'character' && (request.characterId || request.versionId || request.pose)) throw new AssetResolutionError('character-fields-on-noncharacter', request.id);
      const previous = needs.get(request.id);
      if (previous && requestSignature(previous.request) !== requestSignature(request)) throw new AssetResolutionError('conflicting-asset-requests', request.id);
      if (previous) {
        previous.request.required ||= request.required;
        if (!previous.shotIds.includes(shot.id)) previous.shotIds.push(shot.id);
      } else needs.set(request.id, { request, shotIds: [shot.id] });
    }
  }
  return [...needs.values()].sort((a, b) => a.request.id.localeCompare(b.request.id, 'en'));
}

async function optionalJsonFile(root: string, relative: string): Promise<string | undefined> {
  const lexical = safePath(root, relative);
  try { await fs.lstat(lexical); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
  const file = await safeRealPath(root, relative);
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new AssetResolutionError('invalid-asset-metadata-file');
  return file;
}

async function loadContinuity(root: string): Promise<Continuity> {
  const file = await optionalJsonFile(root, 'work/asset-continuity.json');
  if (!file) return { version: 1, identities: {}, poses: {} };
  const data = await readJson<Continuity>(file);
  if (!data || data.version !== 1 || !data.identities || !data.poses || typeof data.identities !== 'object' || typeof data.poses !== 'object' || Array.isArray(data.identities) || Array.isArray(data.poses)) throw new AssetResolutionError('invalid-asset-continuity');
  for (const value of Object.values(data.identities)) if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) throw new AssetResolutionError('invalid-asset-continuity');
  for (const value of Object.values(data.poses)) {
    if (!value || typeof value.path !== 'string' || !/^[a-f0-9]{64}$/i.test(value.hash)) throw new AssetResolutionError('invalid-asset-continuity');
    safePath(root, value.path);
  }
  return data;
}

async function loadApproved(root: string): Promise<Map<string, Asset>> {
  const result = new Map<string, Asset>();
  for (const relative of manifestFiles) {
    const file = await optionalJsonFile(root, relative);
    if (!file) continue;
    const manifest = await readJson(file, AssetManifestSchema);
    const ids = new Set<string>();
    for (const asset of manifest.assets) {
      if (ids.has(asset.id)) throw new AssetResolutionError('duplicate-manifest-id', asset.id);
      ids.add(asset.id);
      if (asset.status !== 'approved') continue;
      if (!/^[a-f0-9]{64}$/i.test(asset.hash)) throw new AssetResolutionError('invalid-approved-hash', asset.id);
      if (asset.sourceUrl) publicSourceUrl(asset.sourceUrl);
      result.set(asset.id, { ...asset, shotIds: [] });
    }
    // Manual canonical edits supersede the mirrors, including a deliberately empty manifest.
    // Never merge stale output or alias approvals back into this authoritative artifact.
    break;
  }
  return result;
}

async function discoverLocalFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const relative of localRoots) {
    if (!await exists(safePath(root, relative))) continue;
    const directory = await safeRealPath(root, relative);
    files.push(...(await walk(directory)).map(file => path.relative(root, file).split(path.sep).join('/')));
  }
  return [...new Set(files)];
}

function preferInputFiles(files: string[]): string[] {
  const canonical = files.filter(file => file.startsWith('input/assets/'));
  return canonical.length ? canonical : files;
}

/** Directory placement is an owner assertion; unsafe/invalid optional media is never approved. */
async function discoverAudioCandidates(root: string, files: string[], skipped: () => Promise<void>): Promise<AudioCandidate[]> {
  const candidates: AudioCandidate[] = [];
  const sorted = [...files].sort((a, b) => Number(b.startsWith('input/assets/')) - Number(a.startsWith('input/assets/')) || a.localeCompare(b, 'en'));
  for (const file of sorted) {
    const type = localRoots.some(prefix => file.startsWith(`${prefix}/music/`)) ? 'music' : localRoots.some(prefix => file.startsWith(`${prefix}/sfx/`)) ? 'sfx' : undefined;
    if (!type || !extensionFits(type, path.posix.extname(file).toLowerCase())) continue;
    try {
      const inspected = await readAsset(root, file, type);
      candidates.push({ type, path: inspected.path, hash: inspected.hash });
    } catch { await skipped(); }
  }
  return candidates;
}

/** Import explicit owner approvals without depending on the story package's discovery API. */
async function discoverApprovedPoses(root: string, files: string[], characters: CharacterBible): Promise<ApprovedPose[]> {
  const poses = new Map<string, ApprovedPose>();
  for (const character of characters.characters) {
    const registries = files.filter(file => localRoots.some(prefix => file.startsWith(`${prefix}/characters/${character.id}/`)) && path.posix.basename(file) === 'poses.json');
    for (const relative of registries) {
      const file = await optionalJsonFile(root, relative);
      if (!file) continue;
      const value = await readJson<unknown>(file);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AssetResolutionError('invalid-pose-registry', character.id);
      const data = value as Record<string, unknown>;
      if (data.characterId !== undefined && data.characterId !== character.id) throw new AssetResolutionError('pose-registry-character-mismatch', character.id);
      const versionId = data.versionId === undefined ? undefined : Id.parse(data.versionId);
      const folder = path.posix.dirname(relative);
      const add = async (pose: string, value: unknown): Promise<void> => {
        const entry = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
        if (entry.approved !== true && !(entry.approved === undefined && data.approved === true)) return;
        const pointer = typeof value === 'string' ? value : typeof entry.path === 'string' ? entry.path : undefined;
        if (!pointer || !pose.trim()) throw new AssetResolutionError('approved-pose-path-missing', character.id);
        const assetPath = await exists(safePath(root, pointer)) ? pointer : path.posix.join(folder, pointer.replaceAll('\\', '/'));
        const real = await safeRealPath(root, assetPath);
        if (!(await fs.stat(real)).isFile()) throw new AssetResolutionError('approved-pose-not-a-file', character.id);
        const declaredHash = entry.hash;
        if (declaredHash !== undefined && (typeof declaredHash !== 'string' || !/^[a-f0-9]{64}$/i.test(declaredHash))) throw new AssetResolutionError('invalid-approved-pose-hash', character.id);
        const entryVersion = entry.versionId === undefined ? versionId : Id.parse(entry.versionId);
        const approved: ApprovedPose = { characterId: character.id, versionId: entryVersion, pose,
          path: path.relative(root, real).split(path.sep).join('/'), hash: typeof declaredHash === 'string' ? declaredHash.toLowerCase() : undefined,
          author: typeof entry.author === 'string' ? entry.author : typeof data.author === 'string' ? data.author : undefined,
          license: typeof entry.license === 'string' ? entry.license : typeof data.license === 'string' ? data.license : undefined,
          retrievedAt: typeof entry.retrievedAt === 'string' ? entry.retrievedAt : typeof data.retrievedAt === 'string' ? data.retrievedAt : undefined };
        const key = poseKey(character.id, entryVersion, pose);
        const previous = poses.get(key);
        if (previous && previous.path !== approved.path) throw new AssetResolutionError('conflicting-approved-pose-registry', character.id);
        if (previous?.hash && approved.hash && previous.hash !== approved.hash) throw new AssetResolutionError('conflicting-approved-pose-hash', character.id);
        if (!previous) poses.set(key, approved);
      };
      if (Array.isArray(data.poses)) {
        for (const value of data.poses) {
          if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
          const entry = value as Record<string, unknown>;
          await add(typeof entry.pose === 'string' ? entry.pose : typeof entry.name === 'string' ? entry.name : '', entry);
        }
      } else if (data.poses && typeof data.poses === 'object') {
        for (const [pose, value] of Object.entries(data.poses)) await add(pose, value);
      } else throw new AssetResolutionError('invalid-pose-registry', character.id);
    }
  }
  return [...poses.values()];
}

function approvedPose(poses: ApprovedPose[], request: AssetRequest): ApprovedPose | undefined {
  const matches = poses.filter(item => item.characterId === request.characterId && item.pose === defaultPose(request.pose));
  if (request.versionId) return matches.find(item => item.versionId === request.versionId);
  const defaults = matches.filter(item => !item.versionId || item.versionId === 'default' || item.versionId === `${request.characterId}.default`);
  const candidates = defaults.length ? defaults : matches;
  if (candidates.length > 1) throw new AssetResolutionError('ambiguous-approved-pose-version', request.id);
  return candidates[0];
}

function withRequest(asset: Asset, need: Need): Asset {
  return { ...asset, id: need.request.id, type: need.request.type, requestHash: requestSignature(need.request), shotIds: [...need.shotIds],
    characterId: need.request.characterId, versionId: need.request.versionId,
    pose: need.request.type === 'character' ? defaultPose(need.request.pose) : need.request.pose };
}

async function approvedAsset(root: string, asset: Asset, request: AssetRequest): Promise<Asset> {
  try {
    const inspected = await readAsset(root, asset.path, request.type);
    if (inspected.hash !== asset.hash.toLowerCase()) throw new AssetResolutionError('approved-hash-changed', request.id);
    if ((asset.source === 'stock' || asset.source === 'archive') && (!asset.sourceUrl || !asset.license?.trim())) throw new AssetResolutionError('approved-provenance-incomplete', request.id);
    return { ...asset, path: inspected.path, hash: inspected.hash,
      author: asset.author ?? (asset.source === 'user' ? 'Project owner' : 'Unspecified in the existing approval'),
      license: asset.license ?? 'Existing project approval; usage permission asserted by project owner',
      retrievedAt: asset.retrievedAt ?? new Date().toISOString() };
  } catch (error) {
    if (error instanceof AssetResolutionError) throw new AssetResolutionError(error.code, request.id);
    throw new AssetResolutionError('approved-asset-unavailable', request.id);
  }
}

async function localAsset(root: string, relative: string, need: Need, source: 'user' | 'template'): Promise<Asset> {
  let inspected: Awaited<ReturnType<typeof readAsset>>;
  try { inspected = await readAsset(root, relative, need.request.type); }
  catch (error) { throw new AssetResolutionError(error instanceof AssetResolutionError ? error.code : 'local-asset-unavailable-or-unsafe', need.request.id); }
  return withRequest({ id: need.request.id, type: need.request.type, path: inspected.path, source,
    status: 'approved', hash: inspected.hash, shotIds: [], author: 'Project owner',
    license: need.request.license?.trim() || (source === 'user' ? 'User-supplied; usage permission asserted by project owner' : 'Project-supplied reusable template; usage permission asserted by project owner'),
    retrievedAt: new Date().toISOString() }, need);
}

function pointerCandidates(character: Character | undefined, request: AssetRequest): string[] {
  if (!character) return [];
  const pose = defaultPose(request.pose);
  if (request.versionId) {
    const version = character.versions.find(item => item.id === request.versionId);
    if (!version) throw new AssetResolutionError('unknown-character-version', request.id);
    const matching = version.assets.filter(value => path.parse(value).name === pose || path.parse(value).name.endsWith(`-${pose}`));
    return matching.length ? matching : pose === 'standing' ? version.assets : [];
  }
  if (character.poses[pose]) return [character.poses[pose]!];
  const matching = character.referenceAssets.filter(value => path.parse(value).name === pose || path.parse(value).name.endsWith(`-${pose}`));
  return matching.length ? matching : pose === 'standing' ? character.referenceAssets : [];
}

async function boundedProvider<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new AssetResolutionError('provider-timeout'));
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    operation.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort)).catch(() => undefined);
  });
}

async function remoteAsset(root: string, config: FactoryConfig, need: Need): Promise<Asset> {
  const requestedUrl = licensedSource(need.request, config);
  const signal = AbortSignal.timeout(30000);
  let candidate: LicensedAssetSource | undefined;
  for (const provider of [...registeredAssetProviders(), explicitUrlProvider]) {
    if (!provider.supports(need.request)) continue;
    try {
      candidate = await boundedProvider(provider.resolve(Object.freeze({ ...need.request }), { projectRoot: root, config, signal }), signal);
    } catch { throw new AssetResolutionError(signal.aborted ? 'provider-timeout' : 'provider-resolution-failed', need.request.id); }
    if (!candidate) continue;
    if (candidate.usageStatus !== 'approved' || !candidate.author.trim() || !candidate.license.trim() || !['stock', 'archive', 'generated'].includes(candidate.source)) throw new AssetResolutionError('provider-usage-not-approved', need.request.id);
    const source = licensedSource({ ...need.request, sourceUrl: candidate.sourceUrl, license: candidate.license }, config);
    if (source.href !== requestedUrl.href) throw new AssetResolutionError('provider-changed-explicit-url', need.request.id);
    break;
  }
  if (!candidate) throw new AssetResolutionError('no-approved-provider', need.request.id);
  const downloaded = await downloadAsset(requestedUrl, need.request.type, signal);
  const digest = hash(downloaded.bytes);
  const relative = `assets/resolved/${digest}${downloaded.extension}`;
  await writeAsset(root, relative, downloaded.bytes, need.request.type);
  return withRequest({ id: need.request.id, type: need.request.type, path: relative, source: candidate.source,
    status: 'approved', hash: digest, shotIds: [], sourceUrl: requestedUrl.href, author: candidate.author,
    license: candidate.license, retrievedAt: new Date().toISOString() }, need);
}

async function resolveProject(root: string, config: FactoryConfig, storyboard: Storyboard, characters: CharacterBible): Promise<AssetManifest> {
  const log = async (event: string, assetId?: string, code?: string) => {
    // Never persist descriptions, URLs, provider errors, environment values or arbitrary paths.
    await appendLog(await managedFile(root, 'work/logs/assets.jsonl'), { timestamp: new Date().toISOString(), event, assetId, code });
  };
  try {
    const stateFile = await optionalJsonFile(root, 'project-state.json');
    const state = stateFile ? await readJson(stateFile, ProjectStateSchema) : undefined;
    const approved = await loadApproved(root);
    const discoveredFiles = await discoverLocalFiles(root);
    const audioCandidates = await discoverAudioCandidates(root, discoveredFiles, () => log('audio-candidate-skipped', undefined, 'unsafe-or-invalid-audio'));
    const needs = collectNeeds(storyboard, characters, audioCandidates, approved);
    const registryPoses = await discoverApprovedPoses(root, discoveredFiles, characters);
    const localFiles = discoveredFiles.filter(file => mediaExtensions.has(path.extname(file).toLowerCase()));
    for (const need of needs) {
      if (need.request.type !== 'character' || need.request.versionId) continue;
      // Inferred/default requests retain the version of an existing approval or supplied default pose.
      need.request.versionId = approved.get(need.request.id)?.versionId ?? approvedPose(registryPoses, need.request)?.versionId;
    }
    const continuity = await loadContinuity(root);
    const charactersById = new Map(characters.characters.map(character => [character.id, character]));
    const assets = new Map<string, Asset>();
    await log('resolution-started');

    // Check every retained approval, including assets temporarily unused by this storyboard.
    for (const asset of approved.values()) {
      const type = asset.type as AssetRequest['type'];
      if (!['character', 'image', 'video', 'diagram', 'music', 'sfx', 'document'].includes(type)) throw new AssetResolutionError('unsupported-approved-type', asset.id);
      try { assets.set(asset.id, await approvedAsset(root, asset, { id: asset.id, type, description: '', required: false })); }
      catch (error) {
        const character=asset.characterId ? charactersById.get(asset.characterId) : undefined;
        if(assetLock(state,asset.id) || character && characterLock(state,character) || !['local','user','code','template'].includes(asset.source)) throw error;
        await log('unlocked-approval-invalidated',asset.id,'local-asset-changed');
      }
    }
    // A previously approved bible is also a baseline when no continuity sidecar exists yet.
    for (const relative of ['work/character-bible.json', 'work/characters.json', 'output/character-bible.json']) {
      const file = await optionalJsonFile(root, relative);
      if (!file) continue;
      const baseline = await readJson(file, CharacterBibleSchema);
      for (const previous of baseline.characters) {
        const current = charactersById.get(previous.id);
        if (!current && characterLock(state, previous)) throw new AssetResolutionError('locked-character-unavailable', previous.id);
        if (!current || !characterLock(state, current)) continue;
        for (const versionId of [undefined, ...previous.versions.map(version => version.id)]) {
          if ((versionId && !current.versions.some(version => version.id === versionId)) || characterFingerprint(previous, versionId, baseline.seriesId) !== characterFingerprint(current, versionId, characters.seriesId)) throw new AssetResolutionError('locked-character-identity-changed', previous.id);
        }
      }
      break;
    }
    for (const character of characters.characters) {
      const versions = new Set([undefined, ...character.versions.map(version => version.id), ...needs.filter(need => need.request.characterId === character.id).map(need => need.request.versionId)]);
      for (const versionId of versions) {
        const key = identityKey(character.id, versionId);
        const fingerprint = characterFingerprint(character, versionId, characters.seriesId);
        if (characterLock(state, character) && continuity.identities[key] && continuity.identities[key] !== fingerprint) throw new AssetResolutionError('locked-character-identity-changed', character.id);
        continuity.identities[key] = fingerprint;
      }
    }

    const generatedPerShot = new Map<string, number>();

    for (const need of needs) {
      const request = need.request;
      const character = request.characterId ? charactersById.get(request.characterId) : undefined;
      const suppliedPose = character ? approvedPose(registryPoses, request) : undefined;
      if (request.versionId && !character?.versions.some(version => version.id === request.versionId) && !suppliedPose) throw new AssetResolutionError('unknown-character-version', request.id);
      const pinned = character ? continuity.poses[poseKey(character.id, request.versionId, request.pose)] : undefined;
      const locked = assetLock(state, request.id);
      let asset: Asset | undefined;
      const previous = assets.get(request.id);
      if (previous) {
        const changed=!compatible(previous, request) || Boolean(request.localPath && request.localPath!==previous.path) || Boolean(previous.source==='code' && previous.requestHash && previous.requestHash!==requestSignature(request));
        if(changed && locked) throw new AssetResolutionError('approved-asset-request-changed', request.id);
        if(!changed) asset = withRequest(previous, need);
        else assets.delete(request.id);
      }
      if (!asset && character && !request.localPath) {
        const expectedCodeHash=hash(characterSvg(character,request,characters.seriesId));
        const matches = [...assets.values()].filter(item => compatible(item, request) && (item.source!=='code' || item.hash===expectedCodeHash));
        if (matches.some(item => item.hash !== matches[0]?.hash)) throw new AssetResolutionError('conflicting-character-pose-approvals', request.id);
        if (matches[0]) asset = withRequest(matches[0], need);
      }
      if (!asset && pinned && character && characterLock(state, character)) {
        const pinnedAsset = [...assets.values()].find(item => item.hash === pinned.hash && compatible(item, request));
        if (!pinnedAsset) throw new AssetResolutionError('locked-character-pose-unavailable', request.id);
        asset = withRequest(pinnedAsset, need);
      }
      if (!asset && locked) throw new AssetResolutionError('locked-asset-unavailable', request.id);

      // A localPath is explicit ownership input. Invalid or escaping paths fail, never fall through.
      if (!asset && request.localPath) {
        asset = await localAsset(root, request.localPath, need, 'user');
        const selectedAudio = audioCandidates.find(candidate => candidate.path === asset!.path && candidate.type === request.type);
        if (selectedAudio && selectedAudio.hash !== asset.hash) throw new AssetResolutionError('audio-candidate-changed', request.id);
      }
      if (!asset && suppliedPose) {
        asset = await localAsset(root, suppliedPose.path, need, 'user');
        if (suppliedPose.hash && suppliedPose.hash !== asset.hash) throw new AssetResolutionError('approved-pose-hash-changed', request.id);
        asset = { ...asset, author: suppliedPose.author ?? asset.author, license: suppliedPose.license ?? asset.license,
          retrievedAt: suppliedPose.retrievedAt ?? asset.retrievedAt };
      }
      if (!asset) {
        for (const pointer of pointerCandidates(character, request)) {
          const linked = assets.get(pointer);
          if (linked) {
            if (linked.characterId && !compatible(linked, request)) throw new AssetResolutionError('character-reference-mismatch', request.id);
            asset = withRequest(await approvedAsset(root, linked, request), need); break;
          }
          if (await exists(safePath(root, pointer))) { asset = await localAsset(root, pointer, need, 'user'); break; }
          if (character && characterLock(state, character)) throw new AssetResolutionError('locked-character-reference-unavailable', request.id);
        }
      }
      if (!asset) {
        const matches = preferInputFiles(localFiles.filter(file => {
          const prefix = file.startsWith('input/assets/') ? 'input/assets' : 'assets';
          if (['templates', 'generated', 'resolved'].some(folder => file.startsWith(`${prefix}/${folder}/`))) return false;
          if (!extensionFits(request.type, path.extname(file).toLowerCase())) return false;
          if (path.posix.parse(file).name === request.id) return true;
          if (!character) return false;
          const directory = `${prefix}/characters/${character.id}/${request.versionId ? `${request.versionId}/` : ''}`;
          return file.startsWith(directory) && path.posix.dirname(file) === directory.slice(0, -1) && path.posix.parse(file).name === defaultPose(request.pose);
        }));
        if (matches.length > 1) throw new AssetResolutionError('ambiguous-local-asset', request.id);
        if (matches[0]) asset = await localAsset(root, matches[0], need, 'user');
      }
      if (!asset && character && stateCharacterLock(state, character.id)) throw new AssetResolutionError('locked-character-asset-unavailable', request.id);
      if (!asset && character && characterLock(state, character) && registryPoses.some(item => item.characterId === character.id)) throw new AssetResolutionError('locked-character-pose-unavailable', request.id);
      if (!asset) {
        const templates = preferInputFiles(localFiles.filter(file => localRoots.some(prefix => file.startsWith(`${prefix}/templates/`)) &&
          (path.posix.parse(file).name === request.id || path.posix.parse(file).name === `template-${hash(request.description).slice(0, 16)}`) &&
          extensionFits(request.type, path.extname(file).toLowerCase())));
        if (templates.length > 1) throw new AssetResolutionError('ambiguous-asset-template', request.id);
        if (templates[0]) asset = await localAsset(root, templates[0], need, 'template');
      }
      if (!asset && (character || request.type === 'diagram')) {
        const bytes = character ? characterSvg(character, request, characters.seriesId) : diagramSvg(request);
        const digest = hash(bytes);
        const reusable = [...assets.values()].find(item => item.status === 'approved' && item.type === request.type && item.hash === digest);
        if (reusable) asset = withRequest(reusable, need);
        const allowed = need.shotIds.every(id => (generatedPerShot.get(id) ?? 0) < config.workflow.max_generated_assets_per_shot);
        if (!asset && allowed) {
          const relative = `assets/generated/${character ? 'characters' : 'diagrams'}/${digest}.svg`;
          await writeAsset(root, relative, bytes, request.type);
          asset = withRequest({ id: request.id, type: request.type, path: relative, source: 'code', status: 'approved', hash: digest,
            shotIds: [], author: 'Story-to-video factory deterministic SVG generator', license: 'Project-generated illustration', retrievedAt: new Date().toISOString() }, need);
          for (const id of need.shotIds) generatedPerShot.set(id, (generatedPerShot.get(id) ?? 0) + 1);
        } else if (!asset) await log('fallback-budget-exhausted', request.id, 'generated-asset-budget');
      }
      if (!asset && request.sourceUrl) {
        try { asset = await remoteAsset(root, config, need); }
        catch (error) {
          const code = error instanceof AssetResolutionError ? error.code : 'remote-resolution-failed';
          await log('remote-unavailable', request.id, code);
          if (request.required) throw new AssetResolutionError(code, request.id);
        }
      }
      if (!asset) {
        if (request.required || locked) throw new AssetResolutionError('required-asset-unavailable', request.id);
        asset = withRequest({ id: request.id, type: request.type, path: '', source: 'local', status: 'missing', hash: '', shotIds: [] }, need);
      }
      if (character && asset.status === 'approved') {
        const key = poseKey(character.id, request.versionId, request.pose);
        if (characterLock(state, character) && pinned && pinned.hash !== asset.hash) throw new AssetResolutionError('locked-character-pose-changed', request.id);
        continuity.poses[key] = { hash: asset.hash, path: asset.path };
      }
      assets.set(request.id, asset);
      await log(asset.status === 'approved' ? 'asset-resolved' : 'asset-missing', request.id);
    }
    if(actorDefinitions(storyboard).length){
      const cast=await readJson(path.join(root,'work/actor-cast.json'),ActorCastManifestSchema);
      if(cast.storyboardHash!==hash(storyboard))throw new AssetResolutionError('stale-actor-cast');
      for(const actor of cast.actors){
        const content=await fs.readFile(await safeRealPath(root,actor.assetPath));
        if(hash(content)!==actor.assetHash)throw new AssetResolutionError('actor-asset-hash-mismatch');
        const id=`actor-${hash(actor.character.id).slice(0,32)}`;
        if(needs.some(n=>n.request.id===id))throw new AssetResolutionError('actor-asset-id-conflict',id);
        assets.set(id,{id,type:'character',source:'code',status:'approved',path:actor.assetPath,hash:actor.assetHash,requestHash:hash(actor.character),
          characterId:actor.character.id,shotIds:storyboard.shots.filter(s=>s.cinematic?.actorScene?.primary?.id===actor.character.id||s.cinematic?.actorScene?.supporting.some(a=>a.character.id===actor.character.id)).map(s=>s.id)});
      }
    }
    const activeMusic = new Set(needs.filter(need => need.request.type === 'music').map(need => need.request.id));
    const manifest: AssetManifest = { assets: [...assets.values()].sort((a, b) =>
      Number(b.type === 'music' && activeMusic.has(b.id)) - Number(a.type === 'music' && activeMusic.has(a.id)) || a.id.localeCompare(b.id, 'en')) };
    // The work artifact is the resumable source; output receives the same full manifest.
    await writeAssetJson(root, 'work/asset-manifest.json', manifest);
    await writeAssetJson(root, 'work/asset-continuity.json', continuity);
    await writeAssetJson(root, 'work/assets.json', manifest);
    await writeAssetJson(root, 'output/asset-manifest.json', manifest);
    await log('resolution-completed');
    return manifest;
  } catch (error) {
    const safe = error instanceof AssetResolutionError ? error : new AssetResolutionError('resolution-failed');
    try { await log('resolution-failed', safe.assetId, safe.code); } catch { /* Preserve the original failure when logging is unavailable. */ }
    throw safe;
  }
}

/** Resolve offline-first assets, serializing concurrent calls for the same project. */
export async function resolveAssets(projectRoot: string, config: FactoryConfig, storyboard: Storyboard, characters: CharacterBible): Promise<AssetManifest> {
  const root = await fs.realpath(path.resolve(projectRoot));
  if (!(await fs.stat(root)).isDirectory()) throw new AssetResolutionError('invalid-project-root');
  const key = process.platform === 'win32' ? root.toLowerCase() : root;
  const previous = projectQueues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const finished = new Promise<void>(resolve => { release = resolve; });
  projectQueues.set(key, finished);
  await previous;
  try { return await resolveProject(root, config, storyboard, characters); }
  finally { release(); if (projectQueues.get(key) === finished) projectQueues.delete(key); }
}
