import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildScenes, assertLockedSceneCompatibility } from '../packages/scenes/index.js';
import { HyperFramesEngine } from '../packages/render/hyperframes.js';
import { ModelRouter } from '../packages/models/registry.js';
import { hash, writeJson } from '../packages/core/utils.js';
import { config, shot } from './support.js';

// Disk/identity/public scene control-flow regression. Only browser validation is
// injected; these fixtures are not speech, native provider or media acceptance.
test('locked scene preflight retains approved bundles before any batch writes', async t => {
  t.mock.method(HyperFramesEngine.prototype, 'validate', async () => ({ pass: true, errors: [] }));
  const parent = process.env.LOCKED_SCENE_TEST_EVIDENCE || os.tmpdir();
  await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'locked-scene-protocol-'));
  if (!process.env.LOCKED_SCENE_TEST_EVIDENCE) t.after(async () => {
    const parentReal = await fs.realpath(parent);
    const entry = await fs.lstat(root);
    const rootReal = await fs.realpath(root);
    assert.equal(entry.isSymbolicLink(), false, 'owned fixture must not be a junction/symlink');
    assert.equal(path.dirname(rootReal), parentReal, 'resolved fixture must stay directly inside its parent');
    assert.ok(path.basename(rootReal).startsWith('locked-scene-protocol-'), 'fixture must retain its generated prefix');
    await fs.rm(rootReal, { recursive: true, force: true });
  });
  else t.diagnostic(`retained controlled fixture: ${root}`);
  const cfg = config(), characters = { characters: [] }, assets = { assets: [] };
  async function snapshot(dir: string): Promise<Record<string, string>> {
    const entries: Record<string, string> = {};
    async function walk(current: string) {
      for (const e of await fs.readdir(current, { withFileTypes: true })) {
        const p = path.join(current, e.name);
        if (e.isDirectory()) await walk(p);
        else entries[path.relative(dir, p)] = hash(await fs.readFile(p));
      }
    }
    await walk(dir); return entries;
  }
  let serial = 0;
  async function fixture(shotLock = false) {
    const dir = path.join(root, `case-${++serial}`); await fs.mkdir(dir);
    const board = { shots: [shot({ id: 'shot001' }), shot({ id: 'shot002', locked: shotLock, startMs: 4000, endMs: 8000 })] };
    const router = new ModelRouter(cfg, dir);
    await buildScenes(dir, cfg, router, board, characters, assets);
    return { dir, board, router };
  }
  const aliases = ['storyboard', 'scenes', 'shot002', 'shot:shot002', 'scene:shot002', 'shots.shot002', 'competing-false', 'shot.locked'];
  for (const alias of aliases) await t.test(alias, async () => {
    const f = await fixture(alias === 'shot.locked');
    const locked: Record<string, boolean> = alias === 'shot.locked'
      ? { shot002: false, 'scene:shot002': false }
      : alias === 'competing-false' ? { shot002: false, 'shot:shot002': false, 'scene:shot002': true }
      : { [alias]: true };
    await writeJson(path.join(f.dir, 'project-state.json'), { locked });
    await assertLockedSceneCompatibility(f.dir, cfg, f.board, characters, assets, { locked });
    await buildScenes(f.dir, cfg, f.router, f.board, characters, assets);
    const before = await snapshot(f.dir);
    // Public build originally computed both identities. Change real requested
    // content, not a fabricated old inputHash. The unlocked shot is first.
    const changed = structuredClone(f.board);
    changed.shots[0]!.subject = 'Unapproved first-shot edit';
    changed.shots[1]!.subject = 'Unapproved locked-shot edit';
    let calls = 0;
    t.mock.method(f.router, 'structured', async () => { calls++; throw new Error('Unexpected model call before preflight'); });
    await assert.rejects(buildScenes(f.dir, cfg, f.router, changed, characters, assets), /locked scene input\/renderer conflict/);
    assert.equal(calls, 0);
    assert.deepEqual(await snapshot(f.dir), before, 'reject before scene/assets/state/log writes');
  });
  for (const defect of ['partial bundle', 'missing record', 'unvalidated record', 'malformed record', 'record without bundle']) await t.test(defect, async () => {
    const f = await fixture();
    const scene = path.join(f.dir, 'scenes/shot002');
    if (defect === 'partial bundle') await fs.unlink(path.join(scene, 'scene.js'));
    if (defect === 'missing record') await fs.unlink(path.join(scene, 'scene.json'));
    if (defect === 'unvalidated record') {
      const record = JSON.parse(await fs.readFile(path.join(scene, 'scene.json'), 'utf8'));
      await writeJson(path.join(scene, 'scene.json'), { ...record, validated: false });
    }
    if (defect === 'malformed record') await fs.writeFile(path.join(scene, 'scene.json'), '{');
    if (defect === 'record without bundle') for (const name of ['index.html', 'style.css', 'scene.js']) await fs.unlink(path.join(scene, name));
    await writeJson(path.join(f.dir, 'project-state.json'), { locked: { 'scene:shot002': true } });
    const before = await snapshot(f.dir);
    const changed = structuredClone(f.board); changed.shots[0]!.subject = 'First shot must not be published';
    await assert.rejects(buildScenes(f.dir, cfg, f.router, changed, characters, assets), /incomplete scene|locked scene input\/renderer conflict|JSON|Unexpected/);
    assert.deepEqual(await snapshot(f.dir), before);
  });
  await t.test('prebuild lock permits the first real public build', async () => {
    const dir = path.join(root, 'initial-lock'); await fs.mkdir(dir);
    const board = { shots: [shot({ locked: true })] };
    await writeJson(path.join(dir, 'project-state.json'), { locked: { storyboard: true } });
    await assertLockedSceneCompatibility(dir, cfg, board, characters, assets, { locked: { storyboard: true } });
    await buildScenes(dir, cfg, new ModelRouter(cfg, dir), board, characters, assets);
    const record = JSON.parse(await fs.readFile(path.join(dir, 'scenes/shot001/scene.json'), 'utf8'));
    assert.equal(record.validated, true); assert.match(record.inputHash, /^[a-f0-9]{64}$/);
    await assertLockedSceneCompatibility(dir, cfg, board, characters, assets, { locked: { storyboard: true } });
  });
});
