import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import YAML from 'yaml';
import { creativeFixture } from './creative-fixture.js';
import {beginReviewEvidence,captureReviewSource,commitReviewEvidence,recordFinalEvidence,requireCurrentPassingReview} from '../packages/review/evidence.js';
import {loadConfig,type FactoryConfig} from '../packages/core/config.js';
import { NarrationSchema, StoryboardSchema, type AssetManifest, type Narration,type Storyboard } from '../packages/core/schemas.js';
import { exists, hash, readJson, writeJson } from '../packages/core/utils.js';
import { ModelRouter } from '../packages/models/registry.js';
import { buildScenes, buildMaster } from '../packages/scenes/index.js';
import { writeCinematicPlans } from '../packages/director/index.js';
import { groundedExplanation } from '../packages/explainer/plan.js';
import { writeHostTimeline } from '../packages/explainer/storyboard.js';
import { storyboardMarkdown } from '../packages/storyboard/markdown.js';
import { serializeSrt } from '../packages/ingest/srt.js';
import { HyperFramesEngine } from '../packages/render/hyperframes.js';
import { loadState, saveState } from '../packages/orchestrator/state-machine.js';
import { ProductionStore } from '../packages/orchestrator/store.js';

// Run with node --experimental-test-module-mocks --import tsx --test ...
// This is control-flow integration, NOT native/media acceptance. Named boundaries:
// browser validation, render bytes, preview/review, final postprocessing, QC
// measurement, provider HTTP transport. Pipeline/repair/routing/domain/security,
// fingerprints, state machine, SQLite, reservations and disk logic stay real.
test('public QC artwork pipeline: reservation, rerender and rejection gates', async t => {
  if (!process.execArgv.includes('--experimental-test-module-mocks')) {
    t.skip('controlled media boundaries require --experimental-test-module-mocks'); return;
  }
  let active: { root: string; trace: string[]; qcCalls: number; artistCalls: number; mode: string };
  const failQC = { pass: false, issues: [{ type: 'frozen-frames', severity: 'high',
    description: 'ISOLATED-MEASURED-FREEZE', startMs: 1200, endMs: 2600 }], video: null };
  t.mock.module(new URL('../packages/qc/index.ts', import.meta.url).href, { namedExports: {
    runQC: async () => {
      active.qcCalls++;
      const pass = active.mode === 'success' && active.qcCalls > 1;
      active.trace.push(pass ? 'qc-pass' : 'qc-fail');
      return pass ? { pass: true, issues: [], video: null } : failQC;
    },
  } });
  const preview = async (root: string) => {
    active.trace.push('preview');
    await fs.mkdir(path.join(root, 'previews'), { recursive: true });
    const bytes = Buffer.from('ISOLATED-PREVIEW-BOUNDARY');
    await fs.writeFile(path.join(root, 'previews/contact-sheet-global.jpg'), bytes);
    const cfg=await loadConfig(root),sb=await readJson(path.join(root,'work/storyboard.json'),StoryboardSchema);
    await writeJson(path.join(root, 'previews/manifest.json'), { sourceInputHash:hash(await captureReviewSource(root,cfg,sb)),frames: [],
      sheetHashes: { 'previews/contact-sheet-global.jpg': hash(bytes) } });
  };
  t.mock.module(new URL('../packages/review/index.ts', import.meta.url).href, { namedExports: {
    createPreviews: preview,
    reviewProject: async (root:string,cfg:FactoryConfig,sb:Storyboard) => {
      active.trace.push('review');return commitReviewEvidence(root,cfg,sb,await beginReviewEvidence(root,cfg,sb),{pass:true,issues:[],mode:'rule-based',warnings:[]});
    },
  } });
  t.mock.module(new URL('../packages/audio/index.ts', import.meta.url).href, { namedExports: {
    produceMedia: async (root: string, _config: unknown, n: Narration) => {
      active.trace.push('postprocess');
      await fs.copyFile(path.join(root, 'work/rendered.mp4'), path.join(root, 'output/final.mp4'));
      await fs.writeFile(path.join(root, 'output/final.srt'), serializeSrt(n.segments));
      await fs.writeFile(path.join(root, 'output/thumbnail.png'), 'ISOLATED-THUMBNAIL');
    },
  } });
  t.mock.method(HyperFramesEngine.prototype, 'validate', async () => ({ pass: true, errors: [] }));
  t.mock.method(HyperFramesEngine.prototype, 'renderDraft', async function (this: HyperFramesEngine) {
    active.trace.push('draft');
    const file = path.join(this.projectRoot, 'work/draft.mp4');
    await fs.writeFile(file, 'ISOLATED-RENDERED-DRAFT');
    return { path: file, profile: 'draft', renderer: 'isolated-boundary', version: 'fixture', code: 0, cacheKey: 'fixture' };
  });
  t.mock.method(HyperFramesEngine.prototype, 'renderFinal', async function (this: HyperFramesEngine) {
    active.trace.push('final');
    const file = path.join(this.projectRoot, 'work/rendered.mp4');
    await fs.writeFile(file, 'ISOLATED-RENDERED-REPLACEMENT');
    return { path: file, profile: 'final', renderer: 'isolated-boundary', version: 'fixture', code: 0, cacheKey: 'fixture' };
  });
  const { runPipeline } = await import('../packages/orchestrator/pipeline.js');

  for (const mode of ['success', 'provider-failure', 'locked'] as const) await t.test(mode, async sub => {
    const evidence = process.env.ARTWORK_REPAIR_TEST_EVIDENCE;
    const base = evidence ? path.resolve(evidence) : os.tmpdir();
    await fs.mkdir(base, { recursive: true });
    const root = await fs.mkdtemp(path.join(base, 'qc-public-pipeline-'));
    if (!evidence) sub.after(() => fs.rm(root, { recursive: true, force: true }));
    else sub.diagnostic(`retained controlled pipeline fixture: ${root}`);
    active = { root, mode, trace: [], qcCalls: 0, artistCalls: 0 };
    const f = await creativeFixture(root);
    f.config.input.mode = 'srt';
    f.config.voice.tts_provider = 'none';
    f.config.captions.mode = 'soft';
    f.config.workflow.max_review_iterations = 1;
    f.config.models.storyboard = { ...f.config.models.storyboard, provider: 'gateway',
      model: 'isolated-qc-artist', base_url: 'https://qc-artwork.invalid/v1', api_key_env: 'QC_ARTWORK_UNUSED_KEY' };
    f.config.retry.structured_output = 0;
    f.config.retry.scene_repair = 1;
    await fs.mkdir(path.join(root, 'input'), { recursive: true });
    await fs.mkdir(path.join(root, 'output'), { recursive: true });
    await fs.writeFile(path.join(root, f.config.input.subtitles), serializeSrt(f.narration.segments));
    await fs.writeFile(path.join(root, 'project.yaml'), YAML.stringify(f.config));
    // Public initialization establishes fingerprints; no private hash helper.
    assert.equal((await runPipeline(root, { until: 'INGESTED' })).state, 'INGESTED');
    const voice = Buffer.from('ISOLATED-PREAPPROVED-VOICE-BYTES-NOT-AUDIO-ACCEPTANCE');
    await fs.writeFile(path.join(root, 'input/narration.wav'), voice);
    const n = NarrationSchema.parse({ ...f.narration, audioPath: 'input/narration.wav' });
    f.shot.cinematic!.artDirection = structuredClone(f.artDirection);
    const board = StoryboardSchema.parse({ shots: [f.shot] });
    const rigNeed = f.shot.assetNeeds.find(a => a.localPath === f.rig.assetPath)!;
    const manifest: AssetManifest = { assets: [{ id: rigNeed.id, type: 'image', path: f.rig.assetPath,
      hash: hash(await fs.readFile(path.join(root, f.rig.assetPath))), source: 'code', status: 'approved', shotIds: [f.shot.id] }] };
    for (const [name, value] of Object.entries({ 'story.json': f.story, 'narration.json': n, 'voiced-narration.json': n,
      'timeline.json': { durationMs: n.durationMs, segments: n.segments, words: [] }, 'beats.json': [f.beat],
      'chapters.json': f.chapters, 'character-bible.json': f.characters, 'storyboard.json': board, 'asset-manifest.json': manifest,
      'explanation-plan.json': groundedExplanation(f.story, n, [f.beat], f.profile),
      'environment-provenance.json': { version: 1, shots: [] },
      'speech-activity.json': { method: 'segment-draft', windowMs: 20, intervals: [] },
      'voice-report.json': { version: 2, status: 'ready', source: 'input', provider: null, voiceId: null,
        narrationHash: hash(n), audioPath: n.audioPath, audioHash: hash(voice), textPreserved: true,
        timingPreserved: true, inputAudioPreserved: true, synchronization: 'audio-activity', cues: [], warnings: [] },
      'review.json': { pass: true, issues: [], mode: 'rule-based', warnings: [] },
    })) await writeJson(path.join(root, 'work', name), value);
    await fs.writeFile(path.join(root, 'work/storyboard.md'), storyboardMarkdown(board, [f.beat]));
    await writeCinematicPlans(root, board);
    await writeHostTimeline(root, board, n, f.profile, f.rig, 'audio-activity');
    await buildScenes(root, f.config, new ModelRouter(f.config, root), board, f.characters, manifest);
    await buildMaster(root, f.config, board, n, manifest);
    await preview(root);
    await fs.writeFile(path.join(root, 'work/draft.mp4'), 'ISOLATED-PREVIOUS-DRAFT');
    const oldFinal = Buffer.from('ISOLATED-FAILED-FINAL-DO-NOT-ACCEPT-AS-REAL-MEDIA');
    await fs.writeFile(path.join(root, 'output/final.mp4'), oldFinal);
    await fs.writeFile(path.join(root, 'output/final.srt'), serializeSrt(n.segments));
    await fs.writeFile(path.join(root, 'output/thumbnail.png'), 'ISOLATED-THUMBNAIL');
    await fs.writeFile(path.join(root,'work/rendered.mp4'),oldFinal);
    const evidenceConfig=await loadConfig(root);
    await commitReviewEvidence(root,evidenceConfig,board,await beginReviewEvidence(root,evidenceConfig,board),{pass:true,issues:[],mode:'rule-based',warnings:[]});
    await recordFinalEvidence(root,evidenceConfig,board,await requireCurrentPassingReview(root,evidenceConfig,board));
    const state = await loadState(root); state.state = 'FINAL_RENDERED'; state.artifactHashes = {};
    if (mode === 'locked') state.locked[`scene:${f.shot.id}`] = true;
    await saveState(root, state);
    active.trace = [];
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
      assert.equal(String(input), 'https://qc-artwork.invalid/v1/chat/completions');
      active.artistCalls++; active.trace.push('artist');
      const ledger = await readJson<Record<string, any>>(path.join(root, 'work/qc-artwork-repairs.json'));
      assert.equal(ledger.attempts.length, 1); assert.equal(ledger.attempts[0].status, 'reserved');
      assert.equal((await loadState(root)).reviewIteration, 1, 'count before provider');
      assert.deepEqual(await fs.readFile(path.join(root, ledger.attempts[0].snapshot, 'output/final.mp4')), oldFinal);
      const request = JSON.parse(String(init?.body));
      assert.equal(request.model, 'isolated-qc-artist');
      assert.match(request.messages[1].content, /ISOLATED-MEASURED-FREEZE/);
      if (mode === 'provider-failure') return new Response('ISOLATED-ARTIST-503', { status: 503 });
      const artDirection = { ...structuredClone(f.artDirection), brief: 'Repair the measured frozen interval.',
        palette: { ...f.artDirection.palette, accent: '#E1A755' },
        models: f.artDirection.models.map(m => ({ ...m, svg: m.svg.replaceAll('#F7BE52', '#E1A755') })) };
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ artDirection }) }, finish_reason: 'stop' }] }),
        { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const progress: string[] = [];
    if (mode === 'success') {
      const result = await runPipeline(root, { until: 'QC_PASSED', onProgress: s => progress.push(s.state) });
      assert.equal(result.state, 'QC_PASSED');
      assert.equal(result.reviewIteration, 1);
      assert.equal(active.artistCalls, 1);
      assert.deepEqual(active.trace, ['qc-fail', 'artist', 'draft', 'preview', 'review', 'final', 'postprocess', 'qc-pass']);
      assert.equal(progress[0], 'SCENES_READY');
      const ledger = await readJson<Record<string, any>>(path.join(root, 'work/qc-artwork-repairs.json'));
      assert.equal(ledger.attempts[0].status, 'repaired');
      assert.deepEqual(await fs.readFile(path.join(root, ledger.attempts[0].snapshot, 'output/final.mp4')), oldFinal);
      assert.notEqual(hash(await fs.readFile(path.join(root, 'output/final.mp4'))), hash(oldFinal));
      assert.equal((await readJson<Record<string, any>>(path.join(root, 'output/qc-report.json'))).pass, true);
      const store = new ProductionStore(root); const jobs = (store.summary() as { jobs: Array<{ stage: string; status: string }> }).jobs; store.close();
      assert.deepEqual(jobs.filter(j => j.stage === 'QC_PASSED').map(j => j.status), ['completed', 'failed']);
    } else {
      await assert.rejects(runPipeline(root, { until: 'QC_PASSED' }), mode === 'locked' ? /Production QC failed/ : /503|ISOLATED-ARTIST-503/);
      assert.equal((await loadState(root)).state, 'FINAL_RENDERED');
      assert.deepEqual(await fs.readFile(path.join(root, 'output/final.mp4')), oldFinal);
      assert.equal(active.artistCalls, mode === 'locked' ? 0 : 1);
      if (mode === 'locked') assert.equal(await exists(path.join(root, 'work/qc-artwork-repairs.json')), false);
      else {
        const ledger = await readJson<Record<string, any>>(path.join(root, 'work/qc-artwork-repairs.json'));
        assert.equal(ledger.attempts[0].status, 'failed');
        assert.equal((await loadState(root)).reviewIteration, 1);
        await assert.rejects(runPipeline(root, { until: 'QC_PASSED' }), /Production QC failed/);
        assert.equal(active.artistCalls, 1, 'resume cannot reset the reserved failed budget');
      }
    }
    assert.ok(n.audioPath, 'this fixture supplies an approved audio artifact');
    assert.equal(hash(await fs.readFile(path.join(root, n.audioPath))), hash(voice));
    assert.equal(await exists(path.join(root, '.factory.lock')), false);
    await writeJson(path.join(root, 'work/isolated-boundary-trace.json'), { trace: active.trace, progress,
      artistCalls: active.artistCalls, qcCalls: active.qcCalls, mediaAcceptance: 'NOT RUN' });
  });
});
