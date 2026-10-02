import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { FactoryConfig } from '../core/config.js';
import { StorySchema, type Story, type Narration } from '../core/schemas.js';
import type { ModelRouter } from '../models/registry.js';
import { appendLog, safePath, safeRealPath, writeAtomic, writeJson } from '../core/utils.js';
import { parseMarkdownDocument } from './markdown.js';
import { parseSrtDocument, serializeSrt } from './srt.js';
import { probeAudio, reconcileAudioDuration, validateNarration } from './audio.js';
import { runIngestCommand } from './process.js';

export { parseMarkdown, parseMarkdownDocument, characterId } from './markdown.js';
export { parseSrt, parseSrtDocument, parseSrtTimestamp, serializeSrt, formatSrtTimestamp, SrtParseError } from './srt.js';
export { probeAudio, reconcileAudioDuration, validateNarration } from './audio.js';
export type { SrtDocument, SrtCue, SrtDiagnostic } from './srt.js';
export type { MarkdownDocument } from './markdown.js';
export type { AudioProbe } from './audio.js';
export { prepareInput, parseScript, ScriptDocumentSchema } from './script.js';

async function inputFile(root: string, relative: string, required: boolean): Promise<string | undefined> {
  const lexical = safePath(root, relative);
  try {
    const real = await safeRealPath(root, relative);
    if (!(await fs.stat(real)).isFile()) throw new Error('Input is not a regular file: ' + relative);
    return real;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' && !required) return undefined;
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('Required input does not exist: ' + lexical);
    throw error;
  }
}
async function asrScript(): Promise<string> {
  if (process.env.VIDEO_FACTORY_ASR_SCRIPT) return path.resolve(process.env.VIDEO_FACTORY_ASR_SCRIPT);
  let cursor = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 7; i++) {
    const file = path.join(cursor, 'scripts', 'asr.py');
    try { if ((await fs.stat(file)).isFile()) return file; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const parent = path.dirname(cursor); if (parent === cursor) break; cursor = parent;
  }
  throw new Error('scripts/asr.py is missing; set VIDEO_FACTORY_ASR_SCRIPT to its absolute path');
}
/** The router is part of the public contract; deterministic ingest needs no model request. */
export async function ingestProject(projectRoot: string, config: FactoryConfig, _router: ModelRouter): Promise<{ story: Story; narration: Narration }> {
  const root = await fs.realpath(path.resolve(projectRoot));
  await fs.mkdir(safePath(root, 'work'), { recursive: true });
  const work = await safeRealPath(root, 'work');
  await fs.mkdir(path.join(work, 'ingest'), { recursive: true });
  const ingest = await safeRealPath(root, 'work/ingest');
  const runId = randomUUID(), startedAt = new Date().toISOString();
  const attempts = path.join(ingest, 'attempts.jsonl');
  await appendLog(attempts, { kind: 'ingest', event: 'started', runId, startedAt });
  try {
    const source = await inputFile(root, config.input.source, config.content.mode === 'legacy');
    const document = source ? parseMarkdownDocument(await fs.readFile(source, 'utf8'), config) : undefined;
    if (document) await writeJson(path.join(ingest, 'source.json'), { ...document, sourcePath: config.input.source, authority: 'supplemental' });
    const subtitles = await inputFile(root, config.input.subtitles, config.input.mode === 'srt');
    const audio = config.input.mode === 'srt' ? undefined : await inputFile(root, config.input.narration, config.input.mode === 'wav');
    if (!subtitles && !audio) throw new Error('Supply ' + config.input.subtitles + ' and/or ' + config.input.narration);
    const srt = subtitles ? parseSrtDocument(await fs.readFile(subtitles, 'utf8')) : undefined;
    if (srt) await writeJson(path.join(ingest, 'subtitles.json'), srt);
    const probe = audio ? await probeAudio(audio, { cwd: root, logFile: attempts }) : undefined;
    if (probe) await writeJson(path.join(ingest, 'audio-probe.json'), probe);
    let narration: Narration;
    if (!audio) {
      const segments = srt!.cues.map(({ id, startMs, endMs, text }) => ({ id, startMs, endMs, text }));
      narration = validateNarration({ segments, words: [], durationMs: segments[segments.length - 1]!.endMs, mode: 'srt' }, config);
    } else {
      const cueFile = path.join(ingest, runId + '.cues.json');
      const resultFile = path.join(ingest, runId + '.asr.json');
      const diagnosticFile = path.join(ingest, runId + '.alignment.json');
      if (srt) {
        reconcileAudioDuration(srt.cues[srt.cues.length - 1]!.endMs, probe!.durationMs, config.audio.duration_tolerance_ms);
        await writeJson(cueFile, { segments: srt.cues.map(({ id, startMs, endMs, text }) => ({ id, startMs, endMs, text })) });
      }
      const engine = srt || config.asr.align ? 'whisperx' : config.asr.engine;
      const args = [await asrScript(), '--audio', audio, '--output', resultFile, '--diagnostics', diagnosticFile, '--engine', engine, '--model', config.asr.model, '--device', config.asr.device, '--compute-type', config.asr.compute_type, '--language', (config.asr.language || config.project.language).split('-')[0]!, '--duration-ms', String(probe!.durationMs), '--tolerance-ms', String(config.audio.duration_tolerance_ms)];
      if (srt) args.push('--cues-json', cueFile);
      if (config.asr.allow_downloads) args.push('--allow-downloads');
      if (process.env.VIDEO_FACTORY_ALIGN_MODEL) args.push('--align-model', process.env.VIDEO_FACTORY_ALIGN_MODEL);
      const timeout = Number(process.env.VIDEO_FACTORY_ASR_TIMEOUT_MS || '1800000');
      if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('VIDEO_FACTORY_ASR_TIMEOUT_MS must be positive');
      await runIngestCommand(process.env.VIDEO_FACTORY_PYTHON || process.env.PYTHON_PATH || 'python', args, { cwd: root, logFile: attempts, timeoutMs: timeout, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' } });
      narration = validateNarration(JSON.parse(await fs.readFile(resultFile, 'utf8')), config);
      if (narration.mode !== (srt ? 'aligned' : 'wav')) throw new Error('ASR returned an unexpected input mode');
      const expectedDuration = reconcileAudioDuration(narration.segments[narration.segments.length - 1]!.endMs, probe!.durationMs, config.audio.duration_tolerance_ms);
      if (narration.durationMs !== expectedDuration) throw new Error('ASR changed the probed audio duration');
      if (srt && (narration.segments.length !== srt.cues.length || narration.segments.some((segment, i) => { const original = srt.cues[i]!; return segment.id !== original.id || segment.text !== original.text || segment.startMs !== original.startMs || segment.endMs !== original.endMs; }))) throw new Error('Forced alignment changed authoritative SRT cues');
      narration.audioPath = config.input.narration;
      // Preserve each run as evidence. Stable sidecar names point to the latest successful run.
      await writeJson(path.join(ingest, 'alignment.json'), JSON.parse(await fs.readFile(diagnosticFile, 'utf8')));
    }
    const firstStart = narration.segments[0]!.startMs;
    const finalEnd = narration.segments[narration.segments.length - 1]!.endMs;
    const gaps: Array<{ startMs: number; endMs: number }> = [];
    let cursor = 0;
    for (const segment of narration.segments) { if (segment.startMs > cursor) gaps.push({ startMs: cursor, endMs: segment.startMs }); cursor = segment.endMs; }
    if (cursor < narration.durationMs) gaps.push({ startMs: cursor, endMs: narration.durationMs });
    const timeline = { version: 1, durationMs: narration.durationMs, mode: narration.mode, segments: narration.segments, cues: narration.segments, words: narration.words, gaps, leadingSilenceMs: firstStart, trailingSilenceMs: narration.durationMs - finalEnd, ...(probe ? { audioDurationMs: probe.durationMs } : {}), ...(narration.audioPath ? { audioPath: narration.audioPath } : {}) };
    const narrationText = narration.segments.map(segment => segment.text).join('\n');
    const story = config.content.mode === 'legacy' ? document!.story : StorySchema.parse({
      title: document?.story.title ?? config.project.name, genre: 'explainer', language: config.project.language,
      story: narrationText, origin: 'narration', purpose: document?.story.purpose || 'Giải thích nội dung narration bằng một host cố định và hình minh họa.',
      style: document?.story.style ?? { visual: '', era: '' },
      rules: [...document?.story.rules ?? [], 'Narration is authoritative; host is a presenter, not a historical person.'],
      characters: (document?.story.characters ?? []).filter(character => narrationText.toLocaleLowerCase().includes(character.name.toLocaleLowerCase())),
      facts: narration.segments.map(segment => ({ claim: segment.text, type: 'fact', source: segment.id })),
      ...(document ? { supplement: { story: document.story.story, facts: document.story.facts, sourcePath: config.input.source } } : {}),
    });
    await writeJson(path.join(work, 'story.json'), story);
    await writeJson(path.join(work, 'narration.json'), narration);
    await writeJson(path.join(work, 'timeline.json'), timeline);
    if (audio && (srt || config.asr.engine === 'whisperx' || config.asr.align)) await writeJson(path.join(work, 'narration.aligned.json'), narration);
    if (audio && !srt) await writeAtomic(path.join(work, 'narration.srt'), serializeSrt(narration.segments));
    await appendLog(attempts, { kind: 'ingest', event: 'completed', runId, mode: narration.mode, durationMs: narration.durationMs, segmentCount: narration.segments.length, wordCount: narration.words.length, diagnostics: srt?.diagnostics ?? [], finishedAt: new Date().toISOString() });
    return { story, narration };
  } catch (error) {
    await appendLog(attempts, { kind: 'ingest', event: 'failed', runId, finishedAt: new Date().toISOString(), error: error instanceof Error ? { name: error.name, message: error.message } : String(error) });
    throw error;
  }
}
