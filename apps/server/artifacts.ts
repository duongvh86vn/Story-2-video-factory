import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  StorySchema, NarrationSchema, CharacterBibleSchema, StoryboardSchema, AssetManifestSchema,
  ChapterSchema, BeatSchema, ProjectStateSchema, ReviewSchema, States,
  type Narration, type Storyboard, type CharacterBible, type Beat, type ProjectStatus,
} from '../../packages/core/schemas.js';
import { hash, writeAtomic } from '../../packages/core/utils.js';
import { parseSrt } from '../../packages/ingest/srt.js';
import { validateNarration } from '../../packages/story/timeline.js';
import { validateCharacterBible } from '../../packages/story/characters.js';
import { validateStoryboard } from '../../packages/storyboard/validate.js';
import { storyboardMarkdown } from '../../packages/storyboard/markdown.js';
import { ApiError, boundPath, redact } from './security.js';
import type { Coordinator } from './jobs.js';
import { parseScript, ScriptDocumentSchema } from '../../packages/ingest/script.js';
import { loadConfig } from '../../packages/core/config.js';
import { HostProfileSchema, HostRigSchema, HostTimelineSchema, loadHost } from '../../packages/host/index.js';
import { VoiceReportSchema, ActivitySchema } from '../../packages/voice/index.js';
import { ExplanationPlanSchema } from '../../packages/explainer/schemas.js';
import { validateExplainerStoryboard, writeHostTimeline } from '../../packages/explainer/storyboard.js';
import { writeCinematicPlans } from '../../packages/director/index.js';
import { CINEMATIC_EXPORT_FILES, CINEMATIC_PLAN_FILES } from '../../packages/director/schemas.js';
import { inspectCinematicStoryboard, validateCinematicEdit } from './cinematic.js';
import type { CinematicArtifactStatus } from './contracts.js';
import {assertActorLocks} from '../../packages/actors/locks.js';

interface ArtifactSpec { paths: string[]; schema?: z.ZodTypeAny; editable?: boolean; from?: ProjectStatus; text?: boolean; }
export const ARTIFACTS: Record<string, ArtifactSpec> = {
  ...Object.fromEntries(CINEMATIC_EXPORT_FILES.map(name => [name, { paths: [`work/${name}`, `output/${name}`] }])),
  'script.txt': {paths:['input/script.txt'],editable:true,from:'NEW',text:true},
  'script.md': {paths:['input/script.md'],editable:true,from:'NEW',text:true},
  'host.md': {paths:['input/host.md'],editable:true,from:'TIMED',text:true},
  'script.json': {paths:['work/script.json'],schema:ScriptDocumentSchema},
  'input-document.json': {paths:['work/input-document.json']},
  'voiced-narration.json': {paths:['work/voiced-narration.json'],schema:NarrationSchema},
  'voice-report.json': {paths:['work/voice-report.json','output/voice-report.json'],schema:VoiceReportSchema},
  'speech-activity.json': {paths:['work/speech-activity.json'],schema:ActivitySchema},
  'host-profile.json': {paths:['work/host-profile.json','output/host-profile.json'],schema:HostProfileSchema},
  'host-rig.json': {paths:['work/host-rig.json'],schema:HostRigSchema},
  'host-timeline.json': {paths:['work/host-timeline.json','output/host-timeline.json'],schema:HostTimelineSchema},
  'explanation-plan.json': {paths:['work/explanation-plan.json','output/explanation-plan.json'],schema:ExplanationPlanSchema},
  'source.md': { paths: ['input/source.md'], editable: true, from: 'NEW', text: true },
  'narration.srt': { paths: ['input/narration.srt'], editable: true, from: 'NEW', text: true },
  'story.json': { paths: ['work/story.json'], schema: StorySchema, editable: true, from: 'INGESTED' },
  'narration.json': { paths: ['work/narration.json'], schema: NarrationSchema, editable: true, from: 'TIMED' },
  'character-bible.json': { paths: ['work/character-bible.json', 'work/characters.json'], schema: CharacterBibleSchema, editable: true, from: 'ANALYZED' },
  'chapters.json': { paths: ['work/chapters.json'], schema: z.array(ChapterSchema) },
  'beats.json': { paths: ['work/beats.json'], schema: z.array(BeatSchema) },
  'storyboard.json': { paths: ['work/storyboard.json'], schema: StoryboardSchema, editable: true, from: 'STORYBOARDED' },
  'storyboard.md': { paths: ['work/storyboard.md', 'output/storyboard.md'], text: true },
  'timeline.json': { paths: ['work/timeline.json', 'output/timeline.json'] },
  'asset-manifest.json': { paths: ['work/asset-manifest.json', 'work/assets.json'], schema: AssetManifestSchema, editable: true, from: 'ASSETS_READY' },
  'review.json': { paths: ['work/review.json', 'previews/review.json'], schema: ReviewSchema },
  'qc-report.json': { paths: ['output/qc-report.json', 'work/qc-report.json'] },
  'cost-report.json': { paths: ['work/cost-report.json', 'output/cost-report.json'] },
  'production-report.md': { paths: ['output/production-report.md'], text: true },
  'project-state.json': { paths: ['project-state.json'], schema: ProjectStateSchema },
};
export const DOWNLOADS: Record<string, string[]> = {
  'final.mp4': ['output/final.mp4'], 'final.srt': ['output/final.srt'],
  'draft.mp4': ['work/draft.mp4', 'previews/draft.mp4', 'output/draft.mp4'],
  'thumbnail.png': ['output/thumbnail.png'],
  'contact-sheet.jpg': ['previews/contact-sheet-global.jpg', 'previews/contact-sheet.jpg', 'previews/contact-sheet.jpeg'],
  'contact-sheet.png': ['previews/contact-sheet.png'],
  'host-preview.png': ['previews/host-preview-sheet.png'],
  ...Object.fromEntries(Object.entries(ARTIFACTS).map(([name, spec]) => [name, spec.paths])),
};

export async function locate(root: string, paths: string[]): Promise<string | null> {
  for (const rel of paths) {
    try { const file = await boundPath(root, rel); if ((await fs.stat(file)).isFile()) return file; }
    catch (error) { if (!(error instanceof ApiError && error.statusCode === 404)) throw error; }
  }
  return null;
}

export async function readArtifact(root: string, name: string): Promise<{ name: string; data: unknown; revision: string; editable: boolean }> {
  const spec = ARTIFACTS[name];
  if (!spec) throw new ApiError(404, 'Artifact is not allowed.', 'NOT_FOUND');
  const file = await locate(root, spec.paths);
  if (!file) throw new ApiError(404, 'Artifact is not available yet.', 'NOT_FOUND');
  if ((await fs.stat(file)).size > 8 * 1024 * 1024) throw new ApiError(413, 'Artifact is too large for the editor. Download it instead.', 'TOO_LARGE');
  const content = await fs.readFile(file, 'utf8');
  let data: unknown = spec.text ? content : JSON.parse(content);
  let obsolete=false;
  if(name==='storyboard.json'){
    const inspection=inspectCinematicStoryboard(data);
    obsolete=inspection.migration.required;
    data=obsolete?inspection.board:StoryboardSchema.parse(data);
  }else if (spec.schema) data = spec.schema.parse(data);
  const derived=(await loadConfig(root)).content.mode==='narrated-explainer'&&['story.json','narration.json'].includes(name);
  return { name, data, revision: hash(content), editable: !!spec.editable&&!derived&&!obsolete };
}

export async function optionalArtifact<T>(root: string, name: string): Promise<T | null> {
  try { return (await readArtifact(root, name)).data as T; }
  catch (error) { if (error instanceof ApiError && error.statusCode === 404) return null; throw error; }
}

function unique(ids: string[], kind: string): void {
  if (new Set(ids).size !== ids.length) throw new ApiError(422, `Duplicate ${kind} IDs.`, 'VALIDATION_FAILED');
}

export function validateNarrationTiming(next: Narration, previous?: Narration | null): void {
  try { validateNarration(next); } catch (error) { throw new ApiError(422, (error as Error).message, 'TIMESTAMP_INVALID'); }
  unique(next.segments.map(s => s.id), 'segment');
  let end = 0;
  for (const segment of next.segments) {
    if (segment.startMs < end || segment.endMs > next.durationMs) throw new ApiError(422, 'Narration timestamps overlap or exceed the duration.', 'TIMESTAMP_INVALID');
    end = segment.endMs;
  }
  for (const word of next.words) if (word.endMs < word.startMs || word.endMs > next.durationMs) throw new ApiError(422, 'Word timestamps exceed the narration.', 'TIMESTAMP_INVALID');
  if (previous) {
    const clock = (n: Narration) => ({ durationMs: n.durationMs, mode: n.mode, audioPath: n.audioPath, segments: n.segments.map(({ id, startMs, endMs }) => ({ id, startMs, endMs })), words: n.words });
    if (hash(clock(previous)) !== hash(clock(next))) throw new ApiError(422, 'Narration timing is immutable. Only segment text can be edited here.', 'TIMESTAMP_IMMUTABLE');
  }
}

export function srtSegments(source: string): Array<{ startMs: number; endMs: number; text: string }> {
  try { return parseSrt(source).segments.map(({ startMs, endMs, text }) => ({ startMs, endMs, text })); }
  catch (error) { throw new ApiError(422, (error as Error).message, 'INVALID_SRT'); }
}

/** Extra boundary checks complement the workers' story validator. */
export async function validateStoryboardEdit(root: string, board: Storyboard, previous?: Storyboard | null): Promise<void> {
  const narration = await optionalArtifact<Narration>(root, 'narration.json');
  const beats = await optionalArtifact<Beat[]>(root, 'beats.json');
  const bible = await optionalArtifact<CharacterBible>(root, 'character-bible.json');
  if (!narration || !beats || !bible) throw new ApiError(409, 'Analyze narration, beats and characters before editing the storyboard.', 'CONTEXT_MISSING');
  try { validateStoryboard(board, narration, beats, bible); }
  catch (error) { throw new ApiError(422, (error as Error).message, 'STORYBOARD_INVALID'); }
  const config = await loadConfig(root);
  validateCinematicEdit(board, config, previous);
  if (config.content.mode === 'narrated-explainer') {
    const { profile, rig } = await loadHost(root);
    try { validateExplainerStoryboard(board, narration, beats, profile, rig, config); }
    catch (error) { throw new ApiError(422, (error as Error).message, board.shots.some(s => s.cinematic) ? 'CINEMATIC_INVALID' : 'STORYBOARD_INVALID'); }
  }
  unique(board.shots.map(s => s.id), 'shot');
  const beatIds = new Set(beats.map(b => b.id));
  const characterIds = new Set(bible.characters.map(c => c.id));
  let cursor = 0;
  for (const shot of board.shots) {
    if (shot.startMs !== cursor || shot.endMs > narration.durationMs) throw new ApiError(422, 'Shots must form a continuous, ordered timeline inside narration duration.', 'COVERAGE_INVALID');
    cursor = shot.endMs;
    if (shot.beatIds.some(id => !beatIds.has(id))) throw new ApiError(422, `Unknown beat in ${shot.id}.`, 'REFERENCE_INVALID');
    const scene=shot.cinematic?.actorScene,castIds=new Set([...(scene?.primary?[scene.primary.id]:[]),...(scene?.supporting.map(a=>a.character.id)??[])]);
    if (shot.characters.some(id => !characterIds.has(id)&&!castIds.has(id))) throw new ApiError(422, `Unknown character in ${shot.id}.`, 'REFERENCE_INVALID');
    for (const asset of shot.assetNeeds) {
      if (asset.characterId && !characterIds.has(asset.characterId)) throw new ApiError(422, `Unknown asset character in ${shot.id}.`, 'REFERENCE_INVALID');
      if (asset.localPath) await validateAssetPath(root, asset.localPath);
    }
  }
  if (cursor !== narration.durationMs) throw new ApiError(422, 'Storyboard must cover the complete narration duration.', 'COVERAGE_INVALID');
  for (const beat of beats) {
    let coverage = beat.startMs;
    for (const shot of board.shots.filter(s => s.beatIds.includes(beat.id))) {
      const start = Math.max(shot.startMs, beat.startMs), end = Math.min(shot.endMs, beat.endMs);
      if (end <= start) continue;
      if (start > coverage) break;
      coverage = Math.max(coverage, end);
    }
    if (coverage < beat.endMs) throw new ApiError(422, `Beat ${beat.id} is not fully covered by its shots.`, 'COVERAGE_INVALID');
  }
}

export async function validateAssetPath(root: string, relative: string): Promise<void> {
  if (!['assets/', 'input/assets/', 'work/series-assets/', 'scenes/assets/'].some(prefix => relative.startsWith(prefix)) || !['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg', '.mp4', '.webm', '.mov', '.wav', '.mp3', '.flac', '.ogg', '.m4a', '.pdf', '.md', '.txt'].includes(path.extname(relative).toLowerCase())) {
    throw new ApiError(422, 'Asset references must point to an allowed file inside project assets.', 'INVALID_ASSET');
  }
  const file = await boundPath(root, relative);
  if (!(await fs.stat(file)).isFile()) throw new ApiError(422, 'Asset reference is not a file.', 'INVALID_ASSET');
}

export async function checkRevision(file: string | null, expected: string | undefined): Promise<void> {
  if (expected && expected.replace(/^"|"$/g, '') !== (file ? hash(await fs.readFile(file)) : 'new')) {
    throw new ApiError(409, 'This file changed since you opened it. Reload before saving.', 'REVISION_CONFLICT');
  }
}

export async function saveArtifact(root: string, name: string, value: unknown, revision: string | undefined, coordinator: Coordinator): Promise<unknown> {
  const spec = ARTIFACTS[name];
  if (!spec?.editable || !spec.from) throw new ApiError(403, 'This artifact is read-only.', 'READ_ONLY');
  const existing = await locate(root, spec.paths);
  await checkRevision(existing, revision);
  if(name==='storyboard.json'&&(await cinematicMigration(root)).required)throw new ApiError(409,'This cinematic plan uses an earlier renderer. Resume production before editing; locked shots require an explicit unlock or their original renderer.','CINEMATIC_MIGRATION_REQUIRED');
  const state = await optionalArtifact<z.infer<typeof ProjectStateSchema>>(root, 'project-state.json');
  let data: unknown = spec.text ? z.string().min(1).max(2 * 1024 * 1024).parse(value) : spec.schema!.parse(value);
  if(name==='script.txt'||name==='script.md')parseScript(data as string,`input/${name}`);
  if(name==='host.md'&&Buffer.byteLength(data as string,'utf8')>128*1024)throw new ApiError(413,'Host MD exceeds 128 KB','TOO_LARGE');
  if(['story.json','narration.json'].includes(name)&&(await loadConfig(root)).content.mode==='narrated-explainer')throw new ApiError(403,'Edit the script or input SRT; generated narration is immutable.','READ_ONLY');
  if (name === 'narration.json') validateNarrationTiming(data as Narration, await optionalArtifact<Narration>(root, name));
  if (name === 'narration.srt') {
    const cues = srtSegments(data as string), previous = await optionalArtifact<Narration>(root, 'narration.json');
    if (previous && ['srt','aligned'].includes(previous.mode) && hash(cues.map(({ startMs, endMs }) => ({ startMs, endMs }))) !== hash(previous.segments.map(({ startMs, endMs }) => ({ startMs, endMs })))) {
      throw new ApiError(422, 'Existing narration timestamps are immutable. Create another project for new timing.', 'TIMESTAMP_IMMUTABLE');
    }
  }
  if (name === 'storyboard.json') {
    const board = data as Storyboard, previous = await optionalArtifact<Storyboard>(root, name);
    try{assertActorLocks(previous??{shots:[]},board,state?.locked??{});}catch(error){throw new ApiError(423,(error as Error).message,'LOCKED');}
    if (state?.locked.storyboard && hash(previous) !== hash(board)) throw new ApiError(423, 'Unlock storyboard before editing.', 'LOCKED');
    for (const old of previous?.shots ?? []) {
      if ((state?.locked[old.id] ?? state?.locked[`shot:${old.id}`] ?? old.locked) && hash(old) !== hash(board.shots.find(s => s.id === old.id))) throw new ApiError(423, `Unlock shot ${old.id} before editing.`, 'LOCKED');
    }
    for(const shot of board.shots)if(shot.cinematic?.artDirection&&hash(shot.cinematic)!==hash(previous?.shots.find(old=>old.id===shot.id)?.cinematic))shot.cinematic.artDirection.origin='authored';
    await validateStoryboardEdit(root, board, previous);
  }
  if (name === 'character-bible.json') {
    const bible = data as CharacterBible, previous = await optionalArtifact<CharacterBible>(root, name);
    try { validateCharacterBible(bible); } catch (error) { throw new ApiError(422, (error as Error).message, 'CHARACTERS_INVALID'); }
    unique(bible.characters.map(c => c.id), 'character');
    if (state?.locked.characterBible && hash(previous) !== hash(bible)) throw new ApiError(423, 'Unlock character bible before editing.', 'LOCKED');
    for (const old of previous?.characters ?? []) {
      const next = bible.characters.find(c => c.id === old.id);
      const identity = (c: typeof old | undefined) => c && ({ id: c.id, identity: c.identity, wardrobe: c.wardrobe, immutable: c.immutable, negativeRules: c.negativeRules });
      if ((state?.locked[old.id] ?? old.locked) && hash(identity(old)) !== hash(identity(next))) throw new ApiError(423, `Unlock character ${old.id} before changing identity.`, 'LOCKED');
    }
    for (const c of bible.characters) for (const ref of [...c.referenceAssets, ...c.versions.flatMap(v => v.assets), ...Object.values(c.poses)]) await validateAssetPath(root, ref);
  }
  if (name === 'asset-manifest.json') {
    const manifest = AssetManifestSchema.parse(data);
    unique(manifest.assets.map(a => a.id), 'asset');
    for (const asset of manifest.assets) if (asset.status === 'approved') await validateAssetPath(root, asset.path);
    data = manifest;
  }
  const relative = existing ? path.relative(root, existing).split(path.sep).join('/') : spec.paths[0]!;
  if (name === 'storyboard.json' && (data as Storyboard).shots.some(s => s.cinematic)) {
    for (const name of CINEMATIC_PLAN_FILES) await boundPath(root, `work/${name}`, true);
  }
  // Invalidate generated dependents before replacing their canonical input.
  await coordinator.invalidateProject(root, name==='source.md'&&(await loadConfig(root)).content.mode==='narrated-explainer'?'TIMED':spec.from);
  const file = await boundPath(root, relative, true);
  await writeAtomic(file, spec.text ? data as string : JSON.stringify(data, null, 2) + '\n');
  const alias = name === 'character-bible.json' ? 'work/characters.json' : name === 'asset-manifest.json' ? 'work/assets.json' : null;
  if (alias && await locate(root, [alias])) await writeAtomic(await boundPath(root, alias), JSON.stringify(data, null, 2) + '\n');
  if (name === 'narration.json') {
    const timeline = await locate(root, ['work/timeline.json']);
    if (timeline) {
      const previous: unknown = JSON.parse(await fs.readFile(timeline, 'utf8'));
      const metadata = z.record(z.unknown()).parse(previous);
      await writeAtomic(timeline, JSON.stringify({ ...metadata, segments: (data as Narration).segments, cues: (data as Narration).segments }, null, 2) + '\n');
    }
  }
  if (name === 'storyboard.json') {
    const beats = await optionalArtifact<Beat[]>(root, 'beats.json');
    await writeAtomic(await boundPath(root, 'work/storyboard.md', true), storyboardMarkdown(data as Storyboard, beats ?? []));
    if((await loadConfig(root)).content.mode==='narrated-explainer'){const {profile,rig}=await loadHost(root),n=await optionalArtifact<Narration>(root,'narration.json'),voice=await optionalArtifact<z.infer<typeof VoiceReportSchema>>(root,'voice-report.json');if(n)await writeHostTimeline(root,data as Storyboard,n,profile,rig,voice?.synchronization);}
    if ((data as Storyboard).shots.some(s => s.cinematic)) {
      await writeCinematicPlans(root, data as Storyboard);
    }
  }
  return readArtifact(root, name);
}

export async function cinematicMigration(root:string){
  const file=await locate(root,ARTIFACTS['storyboard.json']!.paths);
  if(!file)return {required:false,shotIds:[],lockedShotIds:[]};
  const doc=await readArtifact(root,'storyboard.json'),state=await optionalArtifact<z.infer<typeof ProjectStateSchema>>(root,'project-state.json');
  return inspectCinematicStoryboard(doc.data,state?.locked).migration;
}
export async function cinematicArtifactStatus(root: string, name: string): Promise<CinematicArtifactStatus> {
  const file = await locate(root, ARTIFACTS[name]!.paths);
  if (!file) return { status: 'missing', reason: 'Production has not generated this artifact.' };
  if((await cinematicMigration(root)).required)return {status:'stale',reason:'The cinematic renderer version changed. Resume production; approved locks are preserved.'};
  const config = await loadConfig(root), state = await optionalArtifact<z.infer<typeof ProjectStateSchema>>(root, 'project-state.json');
  const required = name === 'performance-report.json' ? 'SCENES_READY' : 'STORYBOARDED';
  if (config.presentation.mode !== 'story-cinematic' || !state || States.indexOf(state.state) < States.indexOf(required)) {
    return { status: 'stale', reason: `Resume story-cinematic production through ${required}.` };
  }
  const data = z.object({ storyboardHash: z.string().optional() }).passthrough().parse(JSON.parse(await fs.readFile(file, 'utf8')));
  if (!data.storyboardHash) return { status: 'unverified', reason: 'The producer did not include storyboardHash; correspondence to the current storyboard is unverified.' };
  const board = await optionalArtifact<Storyboard>(root, 'storyboard.json');
  return board && hash(board) === data.storyboardHash ? { status: 'current', reason: 'Storyboard hash matches the current canonical data.' } : { status: 'stale', reason: 'Storyboard hash differs; resume production to regenerate this artifact.' };
}
export async function cinematicArtifactStatuses(root: string): Promise<Record<string, CinematicArtifactStatus>> {
  return Object.fromEntries(await Promise.all(CINEMATIC_EXPORT_FILES.map(async name => [name, await cinematicArtifactStatus(root, name)])));
}
export async function currentDownload(root:string,name:string):Promise<boolean>{
  if ((CINEMATIC_EXPORT_FILES as readonly string[]).includes(name)) return (await cinematicArtifactStatus(root, name)).status !== 'stale';
  const stage:Record<string,ProjectStatus>={'final.mp4':'FINAL_RENDERED','final.srt':'FINAL_RENDERED','thumbnail.png':'FINAL_RENDERED','qc-report.json':'QC_PASSED','production-report.md':'DONE','draft.mp4':'DRAFT_RENDERED'};if(!stage[name])return true;
  if((await cinematicMigration(root)).required)return false;
  const state=await optionalArtifact<z.infer<typeof ProjectStateSchema>>(root,'project-state.json');return !!state&&States.indexOf(state.state)>=States.indexOf(stage[name]!);
}
export async function listDownloads(root: string): Promise<unknown[]> {
  const result: unknown[] = [];
  for (const [name, paths] of Object.entries(DOWNLOADS)) {
    if(!await currentDownload(root,name))continue;
    const file = await locate(root, paths);
    if (file) { const stat = await fs.stat(file); result.push({ name, size: stat.size, modifiedAt: stat.mtime.toISOString(), editable: !!ARTIFACTS[name]?.editable }); }
  }
  return result;
}

export const LOGS: Record<string, string[]> = { orchestrator: ['logs/orchestrator.log'], models: ['logs/model-calls.jsonl', 'work/logs/model-calls.jsonl'], renderer: ['work/logs/hyperframes.jsonl', 'logs/renderer.log'], ffmpeg: ['work/logs/ffmpeg.jsonl', 'logs/ffmpeg.log'] };
export async function tailLog(root: string, key: string): Promise<{ text: string; truncated: boolean }> {
  const relative = LOGS[key];
  if (!relative) throw new ApiError(404, 'Unknown log.', 'NOT_FOUND');
  const file = await locate(root, relative);
  if (!file) return { text: '', truncated: false };
  const handle = await fs.open(file, 'r');
  try {
    const { size } = await handle.stat();
    const length = Math.min(size, 128 * 1024), buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, Math.max(0, size - length));
    let text = buffer.toString('utf8');
    if (size > length) text = text.slice(text.indexOf('\n') + 1);
    return { text: redact(text), truncated: size > length };
  } finally { await handle.close(); }
}
