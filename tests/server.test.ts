import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { get } from 'node:http';
import { buildServer } from '../apps/server/index.js';
import * as core from '../packages/orchestrator/index.js';
import { loadState, saveState } from '../packages/orchestrator/state-machine.js';
import { temporary, createLegacyProject } from './support.js';

async function studio(t: TestContext, prepared = false) {
  const projectsRoot = await temporary(t);
  const root = await createLegacyProject('fixture', { root: projectsRoot, example: true });
  if (prepared) await core.runPipeline(root, { until: 'ASSETS_READY' });
  const app = await buildServer({ projectsRoot, coordinator: core });
  t.after(() => app.close());
  return { root, app };
}
function multipart(parts: Array<{ field: string; name: string; data: string | Buffer }>) {
  const boundary = 'factory-fixture-boundary';
  return { headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: Buffer.concat(parts.flatMap(part => [
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${part.field}"; filename="${part.name}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
    Buffer.from(part.data), Buffer.from('\r\n')
  ]).concat(Buffer.from(`--${boundary}--\r\n`))) };
}

test('artifact optimistic revisions reject stale writes and preserve canonical content', async t => {
  const { root, app } = await studio(t);
  const url = '/api/projects/fixture/artifacts/source.md';
  const document = (await app.inject({ url })).json();
  const content = '# TITLE\nUpdated fixture\n\n# STORY\nUpdated story.';
  const saved = await app.inject({ method: 'PUT', url, payload: { data: content, revision: document.revision } });
  assert.equal(saved.statusCode, 200, saved.body);
  const stale = await app.inject({ method: 'PUT', url, payload: { data: 'stale', revision: document.revision } });
  assert.equal(stale.statusCode, 409); assert.equal(stale.json().error.code, 'REVISION_CONFLICT');
  assert.equal(await fs.readFile(path.join(root, 'input/source.md'), 'utf8'), content);
});

test('locked shot edits reject; successful edits invalidate storyboard approval', async t => {
  const { root, app } = await studio(t, true);
  await core.approveProject(root, 'storyboard');
  const url = '/api/projects/fixture/artifacts/storyboard.json';
  const doc = (await app.inject({ url })).json();
  const board = doc.data; const shot = board.shots[0]; shot.subject += ' edited';
  await core.updateLocks(root, { [shot.id]: true });
  assert.equal((await app.inject({ method: 'PUT', url, payload: { data: board, revision: doc.revision } })).statusCode, 423);
  await core.updateLocks(root, { [shot.id]: false });
  const saved = await app.inject({ method: 'PUT', url, payload: { data: board, revision: doc.revision } });
  assert.equal(saved.statusCode, 200, saved.body);
  const state = await loadState(root); assert.equal(state.state, 'STORYBOARDED'); assert.equal(state.approvals.storyboard, false);
});

test('narration timestamps are immutable through artifact editor', async t => {
  const { app } = await studio(t, true);
  const url = '/api/projects/fixture/artifacts/narration.json'; const doc = (await app.inject({ url })).json();
  doc.data.segments[0].endMs -= 100;
  const response = await app.inject({ method: 'PUT', url, payload: { data: doc.data, revision: doc.revision } });
  assert.equal(response.statusCode, 422); assert.equal(response.json().error.code, 'TIMESTAMP_IMMUTABLE');
});

test('upload commits only after every file validates; rejects active SVG and oversize source', async t => {
  const { root, app } = await studio(t);
  const original = await fs.readFile(path.join(root, 'input/source.md'), 'utf8'); const url = '/api/projects/fixture/upload';
  const attack = multipart([{ field: 'source', name: 'source.md', data: '# TITLE\nReplace' }, { field: 'assets', name: 'bad.svg', data: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' }]);
  assert.equal((await app.inject({ method: 'POST', url, ...attack })).statusCode, 422);
  assert.equal(await fs.readFile(path.join(root, 'input/source.md'), 'utf8'), original);
  assert.equal((await app.inject({ method: 'POST', url, ...multipart([{ field: 'source', name: 'source.md', data: Buffer.alloc(2 * 1024 * 1024 + 1, 97) }]) })).statusCode, 413);
  const valid = await app.inject({ method: 'POST', url, ...multipart([{ field: 'source', name: 'source.md', data: '# TITLE\nA fixture\n\n# STORY\nA story.' }]) });
  assert.equal(valid.statusCode, 201, valid.body);
  assert.equal(valid.json().files[0].path, 'input/source.md');
  assert.equal((await fs.readdir(root)).some(name => name.startsWith('.studio-upload-')), false);
});

test('upload traversal, type mismatch, host/origin and active lock mutations are blocked', async t => {
  const { root, app } = await studio(t); const url = '/api/projects/fixture/upload';
  for (const part of [ { field: 'assets', name: '../escape.txt', data: 'escape' }, { field: 'assets', name: 'fake.png', data: 'not a PNG' }, { field: 'narration', name: 'voice.wav', data: 'not a WAV' } ]) {
    assert.ok((await app.inject({ method: 'POST', url, ...multipart([part]) })).statusCode >= 400);
  }
  assert.equal((await app.inject({ url: '/api/projects', headers: { host: 'evil.test' } })).statusCode, 403);
  assert.equal((await app.inject({ url: '/api/projects', headers: { origin: 'https://evil.test' } })).statusCode, 403);
  assert.equal((await app.inject({ method: 'PATCH', url: '/api/projects/fixture/locks', headers: { 'sec-fetch-site': 'cross-site' }, payload: { locked: {} } })).statusCode, 403);
  await fs.writeFile(path.join(root, '.factory.lock'), JSON.stringify({ pid: process.pid }));
  const busy = await app.inject({ method: 'PUT', url: '/api/projects/fixture/artifacts/source.md', payload: { data: 'busy' } });
  assert.equal(busy.statusCode, 409); assert.equal(busy.json().error.code, 'PROJECT_BUSY');
});

test('preview blocks junction escape and malformed/traversal paths; ranges are bounded', async t => {
  const { root, app } = await studio(t), outside = await temporary(t);
  await fs.writeFile(path.join(outside, 'private.txt'), 'private');
  await fs.symlink(outside, path.join(root, 'input/assets/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal((await app.inject({ url: '/project-static/fixture/input/assets/linked/private.txt' })).statusCode, 403);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const port = (app.server.address() as { port: number }).port;
  for (const url of ['/project-static/fixture/scenes/%2e%2e/project.yaml', '/project-static/fixture/scenes/%2e%2e%2fproject.yaml', '/project-static/fixture/scenes/%5cproject.yaml']) {
    const status = await new Promise<number | undefined>((resolve, reject) => {
      get({ hostname: '127.0.0.1', port, path: url }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); }).on('error', reject);
    });
    assert.equal(status, 400, url);
  }
  await fs.writeFile(path.join(root, 'output/final.mp4'), '0123456789');
  const state=await loadState(root);state.state='FINAL_RENDERED';await saveState(root,state);
  const url = '/api/projects/fixture/downloads/final.mp4';
  const ranged = await app.inject({ url, headers: { range: 'bytes=2-5' } });
  assert.equal(ranged.statusCode, 206); assert.equal(ranged.body, '2345');
  assert.equal((await app.inject({ url, headers: { range: 'bytes=100-' } })).statusCode, 416);
});
