import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { ConfigSchema, loadConfig } from '../packages/core/config.js';
import * as core from '../packages/orchestrator/index.js';
import { updateSettings } from '../packages/orchestrator/settings.js';
import { prepareInput } from '../packages/ingest/script.js';
import { narratedStory } from '../packages/ingest/narrated-story.js';
import { hash } from '../packages/core/utils.js';

// Lazy public API imports keep an API startup failure from masking independent
// ingest/pipeline cases. API assertions still execute and fail unchanged.
async function currentDownload(root: string, name: string) {
  return (await import('../apps/server/artifacts.js')).currentDownload(root, name);
}

const spoken = 'Mina finds a lost red scarf. She returns it to her friend Jo.';
const draft = { title: 'The returned scarf', kind: 'fiction' as const, narration: spoken, warnings: ['Deterministic local test fiction; not a real model.'] };
async function present(file: string) { try { await fs.access(file); return true; } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false; throw e; } }
async function json(root: string, file: string) { return JSON.parse(await fs.readFile(path.join(root, file), 'utf8')); }
function wav() {
  // Exactly one second of 16kHz mono PCM tone. Protocol/clock fixture, NOT speech.
  const samples = 16000, bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(16000, 24); bytes.writeUInt32LE(32000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) bytes.writeInt16LE(Math.round(2400 * Math.sin(i * 2 * Math.PI * 220 / 16000)), 44 + i * 2);
  return bytes;
}
async function fixture(t: TestContext, mock = false) {
  const parent = process.env.TOPIC_AUTHORING_EVIDENCE || os.tmpdir(); await fs.mkdir(parent, { recursive: true });
  const base = await fs.mkdtemp(path.join(parent, 'topic-authoring-'));
  if (!process.env.TOPIC_AUTHORING_EVIDENCE) t.after(async () => {
    const entry = await fs.lstat(base), real = await fs.realpath(base), parentReal = await fs.realpath(parent);
    assert.equal(entry.isSymbolicLink(), false); assert.equal(path.dirname(real), parentReal);
    assert.ok(path.basename(real).startsWith('topic-authoring-')); await fs.rm(real, { recursive: true, force: true });
  });
  else t.diagnostic(`retained fixture: ${base}`);
  const requests: Array<{ path: string; body: any }> = [];
  let gate: Promise<void> | undefined, release: (() => void) | undefined;
  const server = createServer(async (request, response) => {
    try {
      const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      requests.push({ path: request.url!, body });
      if (request.url === '/v1/chat/completions') {
        if (gate) await gate;
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(draft) }, finish_reason: 'stop' }], usage: { prompt_tokens: 12, completion_tokens: 16 } }));
      } else if (request.url === '/tts') { response.writeHead(200, { 'content-type': 'audio/wav' }); response.end(wav()); }
      else { response.writeHead(404); response.end('Unexpected local test endpoint'); }
    } catch (error) { response.writeHead(500); response.end(String(error)); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  t.after(async () => { release?.(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await fs.writeFile(path.join(base, 'local-http-receipt.json'), JSON.stringify({ closed: !server.listening, port, requests, provenance: 'Deterministic local structured writer and synthetic PCM only; no native/paid model or real TTS' }, null, 2)); });
  const root = await core.createProject('topic-fixture', { root: base });
  const settings = ConfigSchema.parse({ project: { name: 'topic-fixture', language: 'en' }, input: { mode: 'idea' },
    host: { profile: 'library/characters/STICK-MAN.md' }, presentation: { mode: 'diagram', character_mode: 'presenter' },
    voice: { tts_provider: 'none', voice_id: 'no-live-voice', api_key_env: 'TOPIC_UNUSED_TTS_KEY' },
    models: { planner: { provider: mock ? 'mock' : 'openai-compatible', model: 'local-story-writer', base_url: `http://127.0.0.1:${port}/v1`, api_key_env: 'TOPIC_UNUSED_MODEL_KEY', timeout_ms: 3000 } },
    retry: { structured_output: 0 }, script_generation: { kind: 'fiction', target_seconds: 60 }, asr: { allow_downloads: false } });
  await fs.writeFile(path.join(root, 'project.yaml'), YAML.stringify(settings));
  await fs.writeFile(path.join(root, 'input/idea.txt'), 'Tell a short fictional story about Mina returning a lost scarf to Jo.');
  return { base, root, settings, requests, url: `http://127.0.0.1:${port}`, writers: () => requests.filter(r => r.path === '/v1/chat/completions').length,
    voices: () => requests.filter(r => r.path === '/tts').length, pause: () => { gate = new Promise<void>(resolve => { release = resolve; }); }, release: () => { release?.(); gate = undefined; } };
}

test('mock idea writer blocks before clock, voice or final; missing TTS remains a separate gate', async t => {
  const f = await fixture(t, true), state = await core.runPipeline(f.root, { until: 'DONE' });
  assert.equal(state.state, 'NEW'); assert.equal(state.waitingFor, 'script'); assert.match(state.error!, /needs-script/);
  assert.equal(f.writers(), 0); assert.equal(f.voices(), 0);
  for (const file of ['work/timeline.json', 'work/narration.json', 'work/generated-script.txt', 'output/final.mp4']) assert.equal(await present(path.join(f.root, file)), false, file);
  const ready = await fixture(t), stopped = await core.runPipeline(ready.root, { until: 'TIMED' });
  assert.equal(stopped.state, 'INGESTED'); assert.equal(stopped.waitingFor, 'voice'); assert.match(stopped.error!, /TTS voice/);
  assert.equal(ready.writers(), 1); assert.equal(ready.voices(), 0);
  assert.equal(await present(path.join(ready.root, 'work/timeline.json')), false);
  assert.equal(await present(path.join(ready.root, 'output/final.mp4')), false);
});

test('idea INGESTED publishes full accepted script/document/report without speculative clock', async t => {
  const f = await fixture(t), state = await core.runPipeline(f.root, { until: 'INGESTED' });
  assert.equal(state.state, 'INGESTED'); assert.equal(f.writers(), 1); assert.equal(f.voices(), 0);
  const text = await fs.readFile(path.join(f.root, 'work/generated-script.txt'), 'utf8'), doc = await json(f.root, 'work/script.json'), report = await json(f.root, 'work/script-generation.json');
  assert.equal(text, spoken); assert.equal(doc.original, spoken); assert.equal(doc.text, spoken);
  assert.equal(report.title, draft.title); assert.equal(report.kind, 'fiction'); assert.equal(report.factualVerification, 'not-independently-verified');
  assert.equal(report.scriptHash, hash(await fs.readFile(path.join(f.root, 'work/generated-script.txt'))));
  assert.equal(report.documentHash, hash(await fs.readFile(path.join(f.root, 'work/script.json'))));
  assert.ok(doc.chunks.every((c: any) => !('startMs' in c) && !('endMs' in c))); assert.equal('durationMs' in doc, false);
  for (const file of ['work/timeline.json', 'work/narration.json', 'output/final.mp4']) assert.equal(await present(path.join(f.root, file)), false);
  assert.equal(await currentDownload(f.root, 'generated-script.txt'), true);
  await core.runPipeline(f.root, { until: 'INGESTED' }); assert.equal(f.writers(), 1);
  const story = await narratedStory(f.root, await loadConfig(f.root), { mode: 'script', durationMs: 2000, words: [], segments: [{ id: 'metadata-only-cue', startMs: 0, endMs: 2000, text: spoken }] });
  assert.equal(story.story, spoken); assert.equal(story.title, draft.title); assert.equal(story.genre, 'fiction');
  assert.equal(story.authoring?.identity, report.identity); assert.equal(story.authoring?.kind, 'fiction');
  assert.deepEqual(story.authoring?.warnings, draft.warnings); assert.ok(story.facts.every(fact => fact.type === 'visualization'));
  assert.ok(story.rules.some(rule => rule.includes('This is fiction')));
});

test('voice and host settings edits/resume reuse exact accepted draft without another writing call', async t => {
  const f = await fixture(t); await core.runPipeline(f.root, { until: 'INGESTED' });
  const files = ['work/generated-script.txt', 'work/script.json', 'work/script-generation.json'];
  const original = await Promise.all(files.map(file => fs.readFile(path.join(f.root, file))));
  for (const patch of [{ voice: { voice_id: 'other-unconfigured-voice' } }, { host: 'mini-robot' as const }]) {
    await updateSettings(f.root, patch); assert.equal(await currentDownload(f.root, 'generated-script.txt'), true);
    assert.equal((await core.runPipeline(f.root, { until: 'INGESTED' })).state, 'INGESTED');
    assert.equal(f.writers(), 1); assert.equal(f.voices(), 0);
    for (const [i, file] of files.entries()) assert.deepEqual(await fs.readFile(path.join(f.root, file)), original[i]);
  }
});

test('idea, language, writer, reference and writing preferences invalidate accepted draft identity', async t => {
  for (const edit of ['idea', 'language', 'writer', 'reference', 'preferences']) await t.test(edit, async sub => {
    const f = await fixture(sub); await core.runPipeline(f.root, { until: 'INGESTED' });
    const old = await json(f.root, 'work/script-generation.json');
    if (edit === 'idea') await fs.appendFile(path.join(f.root, 'input/idea.txt'), '\nJo lives near the park.');
    if (edit === 'language') await updateSettings(f.root, { language: 'vi' });
    if (edit === 'writer') await updateSettings(f.root, { models: { planner: { model: 'local-story-writer-v2' } } });
    if (edit === 'reference') await fs.writeFile(path.join(f.root, 'input/source.md'), '# TITLE\nReference\n\n# STORY\nMina and Jo are fictional friends.');
    if (edit === 'preferences') await updateSettings(f.root, { script_generation: { brief: 'Focus on kindness.', target_seconds: 30 } });
    assert.equal(await currentDownload(f.root, 'generated-script.txt'), false);
    assert.equal((await core.runPipeline(f.root, { until: 'INGESTED' })).state, 'INGESTED');
    const fresh = await json(f.root, 'work/script-generation.json'); assert.notEqual(fresh.identity, old.identity);
    assert.equal(f.writers(), 2); assert.equal(f.voices(), 0); assert.equal(await currentDownload(f.root, 'generated-script.txt'), true);
    assert.equal((await fs.readdir(path.join(f.root, 'work/cache/scripts'))).length, 2);
  });
});

test('complete script is preserved verbatim and bypasses writing; explicit WAV/SRT selection and auto ambiguity', async t => {
  const f = await fixture(t), original = 'Mina waits.\r\n\r\nJo arrives with café bread.';
  await fs.writeFile(path.join(f.root, 'input/script.txt'), original);
  await updateSettings(f.root, { input: { mode: 'script' } });
  assert.equal((await core.runPipeline(f.root, { until: 'INGESTED' })).state, 'INGESTED');
  assert.equal((await json(f.root, 'work/script.json')).original, original); assert.equal(await fs.readFile(path.join(f.root, 'input/script.txt'), 'utf8'), original);
  assert.equal(f.writers(), 0); assert.equal(f.voices(), 0);
  await fs.writeFile(path.join(f.root, 'input/narration.wav'), wav());
  await fs.writeFile(path.join(f.root, 'input/narration.srt'), '1\n00:00:00,000 --> 00:00:01,000\nMina waits.\n');
  for (const mode of ['wav', 'srt', 'idea', 'script'] as const) {
    const cfg = await loadConfig(f.root); cfg.input.mode = mode;
    assert.equal(await prepareInput(f.root, cfg), mode);
    const input = await json(f.root, 'work/input-document.json'); assert.equal(input.mode, mode);
    if (mode === 'wav') assert.equal(input.companionSubtitles, 'input/narration.srt');
  }
  const cfg = await loadConfig(f.root); cfg.input.mode = 'auto';
  await assert.rejects(prepareInput(f.root, cfg), /Multiple input types/);
  // Audio+SRT are one selected branch; the idea alone must still make auto ambiguous.
  await fs.unlink(path.join(f.root, 'input/script.txt')); await assert.rejects(prepareInput(f.root, cfg), /Multiple input types/);
  assert.equal(f.writers(), 0);
});

test('public prepareInput rejects invalid UTF8, NUL, empty and byte-overlimit idea/script files', async t => {
  for (const mode of ['idea', 'script'] as const) for (const data of [Buffer.from([0xc3, 0x28]), Buffer.from('bad\0text'), Buffer.from('   '), Buffer.from('é '.repeat(45000))]) await t.test(`${mode}:${data.length}`, async sub => {
    const f = await fixture(sub), cfg = await loadConfig(f.root); cfg.input.mode = mode;
    await fs.writeFile(path.join(f.root, `input/${mode}.txt`), data);
    await assert.rejects(prepareInput(f.root, cfg), /UTF|encoded|NUL|128 KB|nonempty|too_small|at least|String must contain/);
    assert.equal(f.writers(), 0); assert.equal(f.voices(), 0);
    assert.equal(await present(path.join(f.root, 'work/timeline.json')), false);
  });
});

function multipart(parts: Array<{ field: string; name: string; data: string | Buffer }>) {
  const boundary = 'topic-authoring-test-boundary';
  return { headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: Buffer.concat(parts.flatMap(p => [Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${p.field}"; filename="${p.name}"\r\nContent-Type: application/octet-stream\r\n\r\n`), Buffer.from(p.data), Buffer.from('\r\n')]).concat(Buffer.from(`--${boundary}--\r\n`))) };
}
async function waitFor(check: () => Promise<boolean>) { for (let i = 0; i < 300; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw new Error('Local test observation timeout'); }

test('public idea API/settings uses revisions, real busy gate, atomic mixed upload and fresh generated downloads', async t => {
  const { buildServer } = await import('../apps/server/index.js');
  const f = await fixture(t), app = await buildServer({ projectsRoot: f.base, coordinator: core }); t.after(() => app.close());
  const url = '/api/projects/topic-fixture';
  let detail = (await app.inject({ url })).json();
  const saved = await app.inject({ method: 'PUT', url: `${url}/idea`, payload: { text: 'Mina brings a lost scarf to Jo.', format: 'txt', settingsRevision: detail.settings.revision } });
  assert.equal(saved.statusCode, 200, saved.body);
  const stale = await app.inject({ method: 'PUT', url: `${url}/idea`, payload: { text: 'Do not overwrite.', revision: 'obsolete', settingsRevision: saved.json().settingsRevision } });
  assert.equal(stale.statusCode, 409); assert.equal(stale.json().error.code, 'REVISION_CONFLICT');
  const input = await fs.readFile(path.join(f.root, 'input/idea.txt'));
  const mixed = await app.inject({ method: 'POST', url: `${url}/upload`, ...multipart([{ field: 'idea', name: 'new.txt', data: 'Atomic idea' }, { field: 'script', name: 'complete.txt', data: 'Atomic complete script.' }]) });
  assert.equal(mixed.statusCode, 422); assert.equal(mixed.json().error.code, 'AMBIGUOUS_INPUT');
  assert.deepEqual(await fs.readFile(path.join(f.root, 'input/idea.txt')), input); assert.equal(await present(path.join(f.root, 'input/script.txt')), false);
  for (const data of [Buffer.from([0xc3, 0x28]), Buffer.from('bad\0idea'), Buffer.from('é'.repeat(65537))]) {
    const bad = await app.inject({ method: 'POST', url: `${url}/upload`, ...multipart([{ field: 'idea', name: 'bad.txt', data }]) });
    assert.ok(bad.statusCode >= 400, bad.body); assert.deepEqual(await fs.readFile(path.join(f.root, 'input/idea.txt')), input);
  }
  detail = (await app.inject({ url })).json();
  const settings = await app.inject({ method: 'PATCH', url: `${url}/settings`, payload: { revision: detail.settings.revision, input: { mode: 'idea' }, script_generation: { target_seconds: 30, brief: 'Keep both friends.' }, models: { planner: { model: 'api-local-writer' } } } });
  assert.equal(settings.statusCode, 200, settings.body); assert.equal(settings.json().settings.scriptModel.model, 'api-local-writer'); assert.equal(settings.json().settings.scriptGeneration.target_seconds, 30);
  assert.equal((await app.inject({ method: 'PATCH', url: `${url}/settings`, payload: { revision: detail.settings.revision, language: 'vi' } })).statusCode, 409);
  f.pause(); const run = await app.inject({ method: 'POST', url: `${url}/run`, payload: { until: 'INGESTED' } });
  assert.equal(run.statusCode, 202, run.body); const jobId = run.json().job.id;
  await waitFor(async () => f.writers() === 1);
  const busy = await app.inject({ method: 'PUT', url: `${url}/idea`, payload: { text: 'Busy edit' } });
  assert.equal(busy.statusCode, 409); assert.equal(busy.json().error.code, 'PROJECT_BUSY');
  assert.equal((await app.inject({ method: 'PATCH', url: `${url}/settings`, payload: { language: 'vi' } })).statusCode, 409);
  f.release(); await waitFor(async () => (await app.inject({ url: `${url}/jobs/${jobId}` })).json().job.status !== 'running');
  assert.equal((await app.inject({ url: `${url}/jobs/${jobId}` })).json().job.status, 'completed');
  const download = `${url}/downloads/generated-script.txt`;
  assert.equal((await app.inject({ url: download })).body, spoken);
  assert.equal(f.voices(), 0); detail = (await app.inject({ url })).json();
  assert.ok(detail.downloads.some((d: any) => d.name === 'generated-script.txt'));
  await fs.appendFile(path.join(f.root, 'work/generated-script.txt'), ' UNAPPROVED');
  assert.equal((await app.inject({ url: download })).statusCode, 409);
  await core.runPipeline(f.root, { until: 'INGESTED' }); assert.equal(f.writers(), 1); assert.equal((await app.inject({ url: download })).body, spoken);
  await fs.appendFile(path.join(f.root, 'work/script.json'), ' ');
  assert.equal((await app.inject({ url: download })).statusCode, 409);
  await core.runPipeline(f.root, { until: 'INGESTED' }); assert.equal(f.writers(), 1);
  const edited = await app.inject({ method: 'PUT', url: `${url}/idea`, payload: { text: 'Mina returns Jo a blue scarf instead.' } });
  assert.equal(edited.statusCode, 200, edited.body); assert.equal((await app.inject({ url: download })).statusCode, 409);
  assert.equal((await app.inject({ url })).json().downloads.some((d: any) => d.name === 'generated-script.txt'), false);
  await core.runPipeline(f.root, { until: 'INGESTED' }); assert.equal(f.writers(), 2);
  const promoted = await app.inject({ method: 'PUT', url: `${url}/script`, payload: { text: spoken, format: 'txt' } });
  assert.equal(promoted.statusCode, 200, promoted.body);
  assert.equal((await app.inject({ url: download })).statusCode, 409);
  await core.runPipeline(f.root, { until: 'INGESTED' }); assert.equal(f.writers(), 2);
  assert.equal((await json(f.root, 'work/input-document.json')).mode, 'script'); assert.equal((await json(f.root, 'work/script.json')).original, spoken);
});

test('actual source CLI imports idea, configures authoring, stops before voice and promotes complete script', async t => {
  const f = await fixture(t), cli = fileURLToPath(new URL('../apps/cli/index.ts', import.meta.url));
  const incoming = path.join(f.base, 'incoming.md'); await fs.writeFile(incoming, 'A fictional story about friends Mina and Jo sharing a scarf.');
  const receipts: unknown[] = [];
  async function command(args: string[]) {
    const argv = ['--import', 'tsx', cli, ...args];
    try {
      const result = await promisify(execFile)(process.execPath, argv, { timeout: 20000, windowsHide: true, cwd: fileURLToPath(new URL('..', import.meta.url)) });
      receipts.push({ executable: process.execPath, args: argv, exit: 0, ...result }); return result;
    } catch (error) {
      const e = error as Error & { code?: number | string; stdout?: string; stderr?: string };
      receipts.push({ executable: process.execPath, args: argv, exit: e.code, stdout: e.stdout, stderr: e.stderr, error: e.message }); throw error;
    }
  }
  t.after(() => fs.writeFile(path.join(f.base, 'cli-receipts.json'), JSON.stringify(receipts, null, 2)));
  await command(['idea', f.root, incoming]); assert.equal((await loadConfig(f.root)).input.idea, 'input/idea.md');
  await command(['authoring', f.root, '--provider', 'openai-compatible', '--model', 'cli-local-writer', '--url', `${f.url}/v1`, '--kind', 'fiction', '--seconds', '30', '--brief', 'Preserve friends.']);
  const output = await command(['write-script', f.root]); assert.equal(JSON.parse(output.stdout).state, 'INGESTED');
  assert.equal(f.writers(), 1); assert.equal(f.voices(), 0); assert.equal(await present(path.join(f.root, 'work/timeline.json')), false);
  const destination = path.join(f.base, 'accepted.txt'); await command(['download', f.root, 'generated-script.txt', destination]); assert.equal(await fs.readFile(destination, 'utf8'), spoken);
  await command(['script', f.root, destination]); await command(['ingest', f.root, '--until', 'INGESTED']);
  assert.equal((await loadConfig(f.root)).input.mode, 'script'); assert.equal(f.writers(), 1);
  assert.equal((await json(f.root, 'work/script.json')).original, spoken);
});

test('idea timeline uses actual measured local PCM durations and preserves authored fiction metadata', async t => {
  const f = await fixture(t); await updateSettings(f.root, { voice: { tts_provider: 'http', base_url: `${f.url}/tts`, voice_id: 'synthetic-tone-protocol-only', timeout_ms: 3000 } });
  const state = await core.runPipeline(f.root, { until: 'TIMED' });
  assert.equal(state.state, 'TIMED'); assert.equal(state.error, undefined); assert.equal(f.writers(), 1);
  const doc = await json(f.root, 'work/script.json'), n = await json(f.root, 'work/narration.json'), story = await json(f.root, 'work/story.json');
  assert.equal(f.voices(), doc.chunks.length); assert.equal(n.durationMs, doc.chunks.length * 1000);
  assert.notEqual(n.durationMs, 60000, 'target writing duration is not the measured clock');
  assert.deepEqual(n.segments.map((s: any) => s.text), doc.chunks.map((c: any) => c.text));
  assert.ok(n.segments.every((s: any, i: number) => s.startMs === i * 1000 && s.endMs === (i + 1) * 1000));
  assert.equal(story.title, draft.title); assert.equal(story.genre, 'fiction'); assert.equal(story.authoring.kind, 'fiction');
  const report = await json(f.root, 'work/script-generation.json'); assert.equal(story.authoring.identity, report.identity);
  const counts = [f.writers(), f.voices()]; await core.runPipeline(f.root, { until: 'TIMED' }); assert.deepEqual([f.writers(), f.voices()], counts);
  assert.equal(await present(path.join(f.root, 'output/final.mp4')), false);
  t.diagnostic('Actual WAV/ffmpeg/ffprobe clock integration; synthetic PCM, NOT live speech/provider acceptance.');
});

test('independent public pipeline authoring cache and invalidation remain observable without API imports', async t => {
  const f = await fixture(t); await core.runPipeline(f.root, { until: 'INGESTED' });
  const original = await fs.readFile(path.join(f.root, 'work/script-generation.json'));
  for (const patch of [{ voice: { voice_id: 'independent-unconfigured-voice' } }, { host: 'mini-robot' as const }]) {
    await updateSettings(f.root, patch); await core.runPipeline(f.root, { until: 'INGESTED' });
    assert.equal(f.writers(), 1); assert.equal(f.voices(), 0);
    assert.deepEqual(await fs.readFile(path.join(f.root, 'work/script-generation.json')), original);
  }
  let previous = await json(f.root, 'work/script-generation.json');
  for (const [index, edit] of ['idea', 'language', 'writer', 'reference'].entries()) {
    if (edit === 'idea') await fs.appendFile(path.join(f.root, 'input/idea.txt'), '\nJo lives by a park.');
    if (edit === 'language') await updateSettings(f.root, { language: 'vi' });
    if (edit === 'writer') await updateSettings(f.root, { models: { planner: { model: 'independent-local-writer' } } });
    if (edit === 'reference') await fs.writeFile(path.join(f.root, 'input/source.md'), '# TITLE\nFictional friends\n\n# STORY\nMina and Jo are fictional.');
    assert.equal((await core.runPipeline(f.root, { until: 'INGESTED' })).state, 'INGESTED');
    const current = await json(f.root, 'work/script-generation.json');
    assert.notEqual(current.identity, previous.identity, edit); assert.equal(f.writers(), index + 2); assert.equal(f.voices(), 0);
    assert.equal((await json(f.root, 'work/script.json')).original, spoken); previous = current;
  }
  t.diagnostic('Independent core coverage only; original public download/API/CLI expectations stay unchanged and remain separately required. Local response language quality is not evaluated.');
});
