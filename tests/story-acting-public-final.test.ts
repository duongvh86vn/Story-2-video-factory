import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import YAML from 'yaml';

// Public checkpoint integration only. Synthetic draft/voice bytes are NOT media
// acceptance. Every executable/provider/browser boundary is closed before imports.
test('public FINAL checkpoint retains drafts and refuses incomplete story direction', async t => {
  assert.ok(process.execArgv.includes('--experimental-test-module-mocks'), 'run with module mocks; never silently skip');
  const forbiddenCalls: string[] = [];
  const forbidden = (name: string) => async (..._args: unknown[]): Promise<never> => {
    forbiddenCalls.push(name); throw new Error(`PROHIBITED_BOUNDARY:${name}`);
  };
  t.mock.method(globalThis, 'fetch', forbidden('network-fetch'));
  const subprocess = await import('node:child_process');
  t.mock.module('node:child_process', { namedExports: {
    ...subprocess,
    spawn: () => { forbiddenCalls.push('native-spawn'); throw new Error('PROHIBITED_BOUNDARY:native-spawn'); },
    spawnSync: () => { forbiddenCalls.push('native-spawnSync'); throw new Error('PROHIBITED_BOUNDARY:native-spawnSync'); },
    exec: () => { forbiddenCalls.push('native-exec'); throw new Error('PROHIBITED_BOUNDARY:native-exec'); },
    execSync: () => { forbiddenCalls.push('native-execSync'); throw new Error('PROHIBITED_BOUNDARY:native-execSync'); },
    execFile: () => { forbiddenCalls.push('native-execFile'); throw new Error('PROHIBITED_BOUNDARY:native-execFile'); },
    execFileSync: () => { forbiddenCalls.push('native-execFileSync'); throw new Error('PROHIBITED_BOUNDARY:native-execFileSync'); },
    fork: () => { forbiddenCalls.push('native-fork'); throw new Error('PROHIBITED_BOUNDARY:native-fork'); },
  } });
  const puppeteer = (await import('puppeteer-core')).default;
  t.mock.method(puppeteer, 'launch', forbidden('browser-launch'));
  t.mock.method(puppeteer, 'connect', forbidden('browser-connect'));
  const processBoundary = await import('../packages/render/process.js');
  t.mock.module(new URL('../packages/render/process.ts', import.meta.url).href, {
    namedExports: { ...processBoundary, execute: forbidden('native-execute') },
  });
  t.mock.module(new URL('../packages/review/index.ts', import.meta.url).href, {
    namedExports: { createPreviews: forbidden('browser-preview'), reviewProject: forbidden('review') },
  });
  t.mock.module(new URL('../packages/audio/index.ts', import.meta.url).href, {
    namedExports: { produceMedia: forbidden('final-postprocess') },
  });
  t.mock.module(new URL('../packages/qc/index.ts', import.meta.url).href, {
    namedExports: { runQC: forbidden('native-qc') },
  });
  const { ConfigSchema } = await import('../packages/core/config.js');
  const { BeatSchema, StorySchema, StoryboardSchema, NarrationSchema } = await import('../packages/core/schemas.js');
  const { exists, hash, readJson, writeJson, walk } = await import('../packages/core/utils.js');
  const { ModelRouter } = await import('../packages/models/registry.js');
  const { HyperFramesEngine } = await import('../packages/render/hyperframes.js');
  const { compileHost, loadHost } = await import('../packages/host/index.js');
  const { groundedExplanation } = await import('../packages/explainer/plan.js');
  const { explainerShot, writeHostTimeline, validateExplainerStoryboard } = await import('../packages/explainer/storyboard.js');
  const { directCinematicShot, writeCinematicPlans } = await import('../packages/director/index.js');
  const { CINEMATIC_PLAN_FILES } = await import('../packages/director/schemas.js');
  const { actorAssetHashes } = await import('../packages/actors/assets.js');
  const { requireVoice } = await import('../packages/voice/index.js');
  const { loadState, saveState } = await import('../packages/orchestrator/state-machine.js');
  const { ProductionStore } = await import('../packages/orchestrator/store.js');
  const { serializeSrt } = await import('../packages/ingest/srt.js');
  const { buildScenes, buildMaster } = await import('../packages/scenes/index.js');

  t.mock.method(ModelRouter.prototype, 'structured', forbidden('provider-structured'));
  t.mock.method(ModelRouter.prototype, 'text', forbidden('provider-text'));
  t.mock.method(ModelRouter.prototype, 'review', forbidden('provider-vision'));
  let fixturePreparation = false, fixtureValidations = 0;
  t.mock.method(HyperFramesEngine.prototype, 'validate', async () => {
    if (!fixturePreparation) return forbidden('engine-validate')();
    fixtureValidations++; return { pass: true, errors: [], diagnostics: [] };
  });
  for (const method of ['renderDraft', 'snapshot', 'snapshots'] as const)
    t.mock.method(HyperFramesEngine.prototype, method, forbidden(`engine-${method}`));
  let finalCalls = 0;
  t.mock.method(HyperFramesEngine.prototype, 'renderFinal', async () => {
    finalCalls++; throw new Error('CONTROLLED_FINAL_PRODUCER_STOP: no media rendered');
  });
  const { runPipeline } = await import('../packages/orchestrator/pipeline.js');
  const base = process.env.STORY_PUBLIC_FINAL_EVIDENCE ?? os.tmpdir();
  await fs.mkdir(base, { recursive: true });
  const cases = ['authored', 'model', 'missing-intent', 'missing-acting', 'missing-participant', 'unsupported', 'missing-target', 'missing-art', 'offline-art'] as const;
  for (const mode of cases) await t.test(mode, async sub => {
    const root = await fs.mkdtemp(path.join(base, `public-final-${mode}-`));
    sub.diagnostic(`retained fixture ${root}`);
    const config = ConfigSchema.parse({ input: { mode: 'srt' }, presentation: { mode: 'story-cinematic', character_mode: 'actors' },
      host: { profile: 'library/characters/STICK-MAN.md' }, voice: { tts_provider: 'none' },
      models: Object.fromEntries(['planner', 'storyboard', 'coder', 'repair', 'visual_review', 'fallback'].map(role => [role, { provider: 'mock' }])),
      retry: { structured_output: 0, render: 0 }, rendering: { final: { width: 1280, height: 720, fps: 30 } } });
    const text = 'Linh waits by a lever. Minh waits.';
    const segments = [{ id: 'cue', startMs: 0, endMs: 6000, text }];
    await fs.mkdir(path.join(root, 'input'), { recursive: true });
    await fs.mkdir(path.join(root, 'output'), { recursive: true });
    await fs.writeFile(path.join(root, config.input.subtitles), serializeSrt(segments));
    await fs.writeFile(path.join(root, 'project.yaml'), YAML.stringify(config));
    assert.equal((await runPipeline(root, { until: 'INGESTED' })).state, 'INGESTED');
    const initialized = await loadState(root);
    assert.equal(initialized.specVersion, 4);
    assert.ok(initialized.inputHash && initialized.narrationInputHash && initialized.hostInputHash && initialized.assetInputHash);
    const router = new ModelRouter(config, root), { profile, rig } = await compileHost(root, config, router);
    const voiceBytes = Buffer.from('CONTROLLED VOICE HASH FIXTURE: NOT REAL AUDIO');
    const voicePath = 'work/voice/approved.wav';
    await fs.mkdir(path.join(root, 'work/voice'), { recursive: true });
    await fs.writeFile(path.join(root, voicePath), voiceBytes);
    const narration = NarrationSchema.parse({ mode: 'srt', durationMs: 6000, segments, words: [], audioPath: voicePath });
    const story = StorySchema.parse({ title: 'Fictional waiting', genre: 'fiction', story: text, style: { visual: 'vector' },
      characters: ['Linh', 'Minh'].map((name, i) => ({ id: `person${i}`, name, description: text })) });
    const rawBeat = BeatSchema.parse({ id: 'b1', chapterId: 'ch1', startMs: 0, endMs: 6000, segmentIds: ['cue'], narrationText: text, meaning: text, visualGoal: text, importance: 1 });
    const plan = groundedExplanation(story, narration, [rawBeat], profile, true), semantic = plan.beats[0]!;
    semantic.entities = [{ id: 'lever', kind: 'lever', label: 'lever', sourceRefs: semantic.sourceRefs }];
    semantic.relations = []; semantic.visualMethod = 'summary';
    semantic.sceneIntent!.acting = semantic.sceneIntent!.participants.map(p => ({ participantId: p.id, kind: 'hold', statement: p.role, sourceRefs: p.sourceRefs }));
    const beat = { ...rawBeat, ...semantic };
    const shot = directCinematicShot(explainerShot('acting', 0, 6000, beat, narration, profile, rig), beat, profile, config, undefined, { seed: true });
    for (const p of [shot.cinematic!.performance, ...shot.cinematic!.actorScene!.supporting.map(a => a.performance)]) {
      p.walks = []; p.gestures = []; p.expressions = []; p.gazes = []; p.turns = []; p.postures = [];
    }
    shot.host!.actions = [{ type: 'idle', startMs: 0, endMs: 6000 }];
    for (const a of shot.cinematic!.actorScene!.supporting) a.actions = [{ type: 'idle', startMs: 0, endMs: 6000 }];
    shot.visualization!.events = [];
    shot.cinematic!.artDirection = { origin: mode === 'model' ? 'model' : 'authored', brief: 'Controlled waiting scene', useEnvironment: true,
      palette: { background: '#FFFFFF', surface: '#EEEEEE', ink: '#111111', accent: '#AABBCC' }, showHeading: false, layers: [], models: [] };
    const board = StoryboardSchema.parse({ shots: [shot] });
    assert.ok(board.shots[0]!.cinematic!.actorScene!.primary);
    assert.equal(board.shots[0]!.cinematic!.actorScene!.supporting.length, 1);
    validateExplainerStoryboard(board, narration, [beat], profile, rig, config);
    const activity = { method: 'segment-draft' as const, windowMs: 20, intervals: [] };
    const manifest = { assets: [{ id: shot.assetNeeds.find(need => need.localPath === rig.assetPath)!.id, type: 'image', path: rig.assetPath, hash: hash(await fs.readFile(path.join(root, rig.assetPath))), source: 'code' as const, status: 'approved' as const, shotIds: ['acting'] }] };
    for (const [name, value] of Object.entries({ 'story.json': story, 'narration.json': narration, 'voiced-narration.json': narration,
      'timeline.json': { durationMs: 6000, segments, words: [] }, 'beats.json': [beat],
      'chapters.json': [{ id: 'ch1', startMs: 0, endMs: 6000, title: story.title, summary: text, narrativePurpose: text, segmentIds: ['cue'] }],
      'character-bible.json': { characters: [] }, 'storyboard.json': board, 'asset-manifest.json': manifest,
      'explanation-plan.json': plan, 'environment-provenance.json': { version: 1, shots: [] }, 'speech-activity.json': activity,
      'voice-report.json': { version: 2, status: 'ready', source: 'input', provider: null, voiceId: null, narrationHash: hash(narration), audioPath: voicePath, audioHash: hash(voiceBytes),
        textPreserved: true, timingPreserved: true, inputAudioPreserved: true, synchronization: 'audio-activity', cues: [], warnings: [] },
      'review.json': { pass: true, issues: [], mode: 'rule-based', warnings: [] },
    })) await writeJson(path.join(root, 'work', name), value);
    await fs.writeFile(path.join(root, 'work/storyboard.md'), 'Controlled checkpoint; no visual acceptance');
    await writeCinematicPlans(root, board);
    await writeHostTimeline(root, board, narration, profile, rig, 'audio-activity');
    // Real public producer cache; the only runtime-validation stub is scoped to fixture preparation.
    const protectedSetup = structuredClone({ board, beat, narration, profile, rig, manifest });
    const validationsBefore = fixtureValidations;
    fixturePreparation = true;
    try {
      await buildScenes(root, config, router, board, { characters: [] }, manifest);
      await buildMaster(root, config, board, narration, manifest);
    } finally { fixturePreparation = false; }
    assert.equal(fixtureValidations - validationsBefore, 1, 'public fixture compilation actually validated once');
    assert.deepEqual({ board, beat, narration, profile, rig, manifest }, protectedSetup, 'accepted canonical inputs preserved');
    const producerRecord = await readJson<{ inputHash: string; sourceHash: string; validated: boolean }>(path.join(root, 'scenes/acting/scene.json'));
    assert.ok(producerRecord.validated && /^[a-f0-9]{64}$/.test(producerRecord.inputHash) && /^[a-f0-9]{64}$/.test(producerRecord.sourceHash), 'complete public scene producer record');
    await writeJson(path.join(root, 'fixture-producer-proof.json'), { producerRecord, fixtureValidations: fixtureValidations - validationsBefore, mediaAcceptance: 'NOTRUN' });
    const draftBytes = Buffer.from('RETAINED CONTROLLED DRAFT BYTES: NO FILM QUALITY CLAIM');
    await fs.writeFile(path.join(root, 'work/draft.mp4'), draftBytes);
    const previewBytes = Buffer.from('CONTROLLED CONTACT SHEET BYTES: NO SCREENSHOT');
    await fs.writeFile(path.join(root, 'previews/contact-sheet-global.jpg'), previewBytes);
    await writeJson(path.join(root, 'previews/manifest.json'), { frames: [], actions: [], sheetHashes: { 'previews/contact-sheet-global.jpg': hash(previewBytes) } });
    await loadHost(root); await requireVoice(root, narration);
    const actors = await actorAssetHashes(root); assert.equal(Object.keys(actors).length, 8, 'all four files for both actors');
    for (const [relative, expected] of Object.entries(actors)) assert.equal(hash(await fs.readFile(path.join(root, relative))), expected);
    // Apply semantic defects only after constructing a valid draft checkpoint.
    const badBeat = structuredClone(beat), badBoard = structuredClone(board);
    if (mode === 'missing-intent') delete badBeat.sceneIntent;
    if (mode === 'missing-acting') delete badBeat.sceneIntent!.acting;
    if (mode === 'missing-participant') { badBeat.sceneIntent!.participants = []; badBeat.sceneIntent!.acting = []; }
    if (mode === 'unsupported') badBeat.sceneIntent!.acting![0]!.kind = 'unsupported';
    if (mode === 'missing-target') { badBeat.sceneIntent!.acting![0]!.kind = 'manipulation'; delete badBeat.sceneIntent!.acting![0]!.targetIds; }
    if (mode === 'missing-art') delete badBoard.shots[0]!.cinematic!.artDirection;
    if (mode === 'offline-art') badBoard.shots[0]!.cinematic!.artDirection!.origin = 'offline';
    await writeJson(path.join(root, 'work/beats.json'), [badBeat]);
    await writeJson(path.join(root, 'work/storyboard.json'), badBoard);
    const staleFinal = Buffer.from('STALE FINAL FROM AN EARLIER ATTEMPT: NOT ACCEPTED');
    if (mode === 'offline-art') await fs.writeFile(path.join(root, 'output/final.mp4'), staleFinal);
    const required = ['work/input-document.json', 'work/story.json', 'work/narration.json', 'work/timeline.json', 'work/voiced-narration.json', 'work/voice-report.json', 'work/speech-activity.json',
      'work/character-bible.json', 'work/chapters.json', 'work/beats.json', 'work/host-profile.json', 'work/host-rig.json', 'work/explanation-plan.json', 'previews/host-preview-sheet.png',
      'work/storyboard.json', 'work/storyboard.md', 'work/host-timeline.json', ...CINEMATIC_PLAN_FILES.map(n => `work/${n}`), 'work/environment-provenance.json', 'work/animation-library.json',
      'work/asset-manifest.json', 'scenes/index.html', 'work/performance-report.json', 'work/draft.mp4', 'previews/contact-sheet-global.jpg', 'previews/manifest.json', 'work/review.json'];
    const state = await loadState(root); state.state = 'REPAIRED'; state.artifactHashes = {};
    state.reviewIteration = 1;
    state.approvals.host = true; state.approvals.hostHash = rig.rigHash;
    for (const relative of required) { assert.ok(await exists(path.join(root, relative)), relative); state.artifactHashes[relative] = hash(await fs.readFile(path.join(root, relative))); }
    for (const directory of ['assets/host', 'assets/actors', 'scenes', 'previews', 'work/voice']) for (const file of await walk(path.join(root, directory)))
      state.artifactHashes[path.relative(root, file).replaceAll('\\', '/')] = hash(await fs.readFile(file));
    await saveState(root, state);
    await writeJson(path.join(root, 'checkpoint-hashes.json'), { required, hashes: state.artifactHashes, inputHash: state.inputHash, actors, mediaAcceptance: 'NOTRUN' });
    const beforeFinal = finalCalls, beforeForbidden = forbiddenCalls.length;
    const progress: string[] = [];
    const invoke = () => runPipeline(root, { until: 'FINAL_RENDERED', onProgress: s => progress.push(s.state) });
    const valid = mode === 'authored' || mode === 'model';
    if (valid) await assert.rejects(invoke(), /CONTROLLED_FINAL_PRODUCER_STOP/);
    else { const result = await invoke(); assert.equal(result.state, 'REPAIRED'); assert.equal(result.waitingFor, 'art-direction'); assert.match(result.error ?? '', /needs-art-direction|needs-motion|needs-source-plan/); }
    let durable = await loadState(root);
    assert.equal(durable.state, 'REPAIRED', 'FINAL failure must stay at the draft checkpoint');
    assert.equal(durable.inputHash, initialized.inputHash, 'no fingerprint rewind');
    assert.equal(durable.narrationInputHash, initialized.narrationInputHash);
    assert.equal(durable.hostInputHash, initialized.hostInputHash);
    assert.equal(durable.assetInputHash, initialized.assetInputHash);
    assert.equal(durable.reviewIteration, 1, 'resume must not reset the existing repair budget');
    assert.equal(finalCalls - beforeFinal, valid ? 1 : 0);
    assert.equal(forbiddenCalls.length, beforeForbidden, 'no earlier stage or executable boundary');
    assert.deepEqual(await fs.readFile(path.join(root, 'work/draft.mp4')), draftBytes);
    assert.equal(durable.artifactHashes['work/draft.mp4'], hash(draftBytes), 'retained draft remains available in the checkpoint');
    assert.equal(await exists(path.join(root, 'output/final.mp4')), mode === 'offline-art');
    if (mode === 'offline-art') assert.deepEqual(await fs.readFile(path.join(root, 'output/final.mp4')), staleFinal);
    for (const [relative, expected] of Object.entries(state.artifactHashes)) {
      assert.equal(hash(await fs.readFile(path.join(root, relative))), expected, `retained checkpoint artifact: ${relative}`);
      assert.equal(durable.artifactHashes[relative], expected, `durable checkpoint hash: ${relative}`);
    }
    assert.equal(await exists(path.join(root, '.factory.lock')), false);
    assert.ok(!Object.keys(durable.artifactHashes).some(p => p.startsWith('output/')), 'no stale final claimed');
    if (!valid) { await invoke(); durable = await loadState(root); assert.equal(durable.waitingFor, 'art-direction'); assert.equal(finalCalls, beforeFinal); }
    assert.ok(progress.every(s => s === 'REPAIRED'), 'no reconciliation rewind or FINAL completion');
    assert.ok(durable.error);
    const store = new ProductionStore(root);
    let summary: unknown;
    try { summary = store.summary(); } finally { store.close(); }
    const jobs = (summary as { jobs: Array<{ stage: string; status: string }> }).jobs;
    assert.ok(jobs.filter(j => j.stage === 'FINAL_RENDERED').every(j => j.status === 'failed'));
    assert.ok(jobs.some(j => j.stage === 'FINAL_RENDERED'), 'public FINAL job actually attempted');
    await writeJson(path.join(root, 'result.json'), { mode, valid, state: durable, progress, finalCalls: finalCalls - beforeFinal,
      forbiddenCalls: forbiddenCalls.slice(beforeForbidden), draftHash: hash(draftBytes), jobs, mediaAcceptance: 'NOTRUN' });
  });
  assert.deepEqual(forbiddenCalls, []);
});
