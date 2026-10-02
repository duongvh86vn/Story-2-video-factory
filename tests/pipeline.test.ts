import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import YAML from 'yaml';
import { runPipeline, approveProject, invalidateProject, updateLocks } from '../packages/orchestrator/index.js';
import { loadState, saveState } from '../packages/orchestrator/state-machine.js';
import { ProductionStore } from '../packages/orchestrator/store.js';
import { reservation } from '../packages/orchestrator/reservation.js';
import { temporary, createLegacyProject as createProject } from './support.js';

test('missing narration artifact resumes by repeating ingest', async t => {
  const projects = await temporary(t), root = await createProject('recovery', { root: projects, example: true });
  await runPipeline(root, { until: 'TIMED' });
  await fs.unlink(path.join(root, 'work/narration.json'));
  const resumed = await runPipeline(root, { until: 'TIMED' });
  assert.equal(resumed.state, 'TIMED');
  const narration = JSON.parse(await fs.readFile(path.join(root, 'work/narration.json'), 'utf8'));
  assert.equal(narration.durationMs, 60000);
  assert.equal(await reservation(root), undefined);
});

test('approval gates, locked identity and storyboard invalidation survive resume', async t => {
  const projects = await temporary(t), root = await createProject('approvals', { root: projects, example: true });
  const file = path.join(root, 'project.yaml'); const settings = YAML.parse(await fs.readFile(file, 'utf8'));
  settings.workflow = { require_character_approval: true, require_storyboard_approval: true };
  await fs.writeFile(file, YAML.stringify(settings));
  const first = await runPipeline(root, { until: 'ASSETS_READY' });
  assert.equal(first.state, 'ANALYZED'); assert.match(first.error!, /characters approval/);
  await approveProject(root, 'characters');
  const bible = await fs.readFile(path.join(root, 'work/character-bible.json'), 'utf8');
  await updateLocks(root, { characterBible: true });
  const second = await runPipeline(root, { until: 'ASSETS_READY' });
  assert.equal(second.state, 'STORYBOARDED'); assert.match(second.error!, /storyboard approval/);
  await approveProject(root, 'storyboard');
  assert.equal((await runPipeline(root, { until: 'ASSETS_READY' })).state, 'ASSETS_READY');
  await invalidateProject(root, 'STORYBOARDED');
  assert.equal((await loadState(root)).approvals.storyboard, false);
  assert.equal(await fs.readFile(path.join(root, 'work/character-bible.json'), 'utf8'), bible);
  assert.equal((await runPipeline(root, { until: 'ASSETS_READY' })).state, 'STORYBOARDED');
});

test('dead and abandoned locks recover; live and recent partial locks remain busy', async t => {
  const projects = await temporary(t), root = await createProject('locks', { root: projects, example: true });
  const lock = path.join(root, '.factory.lock');
  await fs.writeFile(lock, JSON.stringify({ pid: process.pid, token: 'active' }));
  await assert.rejects(runPipeline(root, { until: 'INGESTED' }), /already running/);
  assert.equal((await reservation(root))?.token, 'active');
  await fs.writeFile(lock, '{');
  await assert.rejects(runPipeline(root, { until: 'INGESTED' }), /initialized/);
  const past = new Date(Date.now() - 120000); await fs.utimes(lock, past, past);
  assert.equal((await runPipeline(root, { until: 'INGESTED' })).state, 'INGESTED');
  await fs.writeFile(lock, '{"pid":2147483647,"token":"dead"}');
  assert.equal((await runPipeline(root, { until: 'TIMED' })).state, 'TIMED');
  assert.equal(await reservation(root), undefined);
});

test('SQLite interrupted jobs recover and completed stages are not repeated', async t => {
  const projects = await temporary(t), root = await createProject('sqlite', { root: projects, example: true });
  await runPipeline(root, { until: 'TIMED' });
  const store = new ProductionStore(root); const id = store.beginJob('ANALYZED'); store.close();
  await runPipeline(root, { until: 'TIMED' });
  const resumed = new ProductionStore(root);
  const summary = resumed.summary() as { jobs: Array<{ id: number; stage: string; status: string }> };
  resumed.close();
  assert.equal(summary.jobs.find(job => job.id === id)?.status, 'interrupted');
  assert.equal(summary.jobs.filter(job => job.stage === 'INGESTED').length, 1);
  assert.equal(summary.jobs.filter(job => job.stage === 'TIMED').length, 1);
});

test('legacy preview manifests invalidate draft artifacts for regeneration', async t => {
  const projects = await temporary(t), root = await createProject('previews', { root: projects, example: true });
  await runPipeline(root, { until: 'ASSETS_READY' });
  await fs.writeFile(path.join(root, 'scenes/index.html'), 'fixture');
  await fs.writeFile(path.join(root, 'work/draft.mp4'), 'fixture');
  await fs.writeFile(path.join(root, 'previews/contact-sheet-global.jpg'), 'fixture');
  await fs.writeFile(path.join(root, 'previews/manifest.json'), '{"frames":[]}');
  const state = await loadState(root); state.state = 'DRAFT_RENDERED'; await saveState(root, state);
  const resumed = await runPipeline(root, { until: 'SCENES_READY' });
  assert.equal(resumed.state, 'SCENES_READY'); assert.equal(resumed.error, undefined);
});
