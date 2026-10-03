import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { creativeFixture } from './creative-fixture.js';
import { ProjectStateSchema, StoryboardSchema, type Storyboard } from '../packages/core/schemas.js';
import { readJson } from '../packages/core/utils.js';
import { lockedShot } from '../packages/scenes/index.js';
import { frozenArtworkIssues, reserveQCArtworkRepair, finishQCArtworkRepair, qcArtworkRepairIteration } from '../packages/qc/artwork-repair.js';

type QC = Parameters<typeof frozenArtworkIssues>[0];
type Ledger = { version: number; attempts: Array<{ id: string; iteration: number; status: string;
  snapshot: string; files: Record<string, string>; storyboardHash: string; afterStoryboardHash?: string;
  error?: string; shotIds: string[] }> };
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const freeze = (startMs = 2500, endMs = 7500) => ({ type: 'frozen-frames', severity: 'high', description: 'Measured freeze', startMs, endMs });
const qc = (issues: unknown[] = [freeze()]): QC => ({ pass: false, issues, video: { synthetic: true } });
const ledgerFile = (root: string) => path.join(root, 'work/qc-artwork-repairs.json');

async function fixture(t: TestContext) {
  const evidence = process.env.QC_ARTWORK_REPAIR_TEST_EVIDENCE;
  const base = evidence ? path.resolve(evidence) : os.tmpdir();
  await fs.mkdir(base, { recursive: true });
  const root = await fs.mkdtemp(path.join(base, 'qc-artwork-test-'));
  if (evidence) t.diagnostic(`retained isolated fixture: ${root}`);
  else t.after(() => fs.rm(root, { recursive: true, force: true }));
  const creative = await creativeFixture(root);
  creative.shot.cinematic!.artDirection = structuredClone(creative.artDirection);
  const second = { ...structuredClone(creative.shot), id: 'ch1.s002', startMs: 5000, endMs: 10000 };
  const board = StoryboardSchema.parse({ shots: [creative.shot, second] });
  const state = ProjectStateSchema.parse({ version: 1, name: 'qc-fixture', state: 'FINAL_RENDERED',
    updatedAt: new Date().toISOString(), inputHash: digest('authoritative-input-v1'), assetInputHash: digest('assets-v1') });
  const report = qc(), issues = frozenArtworkIssues(report, board, 10000, () => false)!;
  // Deliberately synthetic bytes: these exercise ledger preservation, not video decoding or QC detection.
  const originals: Record<string, Buffer> = {
    'output/final.mp4': Buffer.from('SYNTHETIC FAILED FILM\0\xff', 'utf8'),
    'output/qc-report.json': Buffer.from(JSON.stringify(report, null, 2) + '\n'),
    'work/storyboard.json': Buffer.from(JSON.stringify(board, null, 2) + '\n'),
    'output/production-report.md': Buffer.from('# Synthetic failed production\n'),
    'work/creative-direction-report.json': Buffer.from('{"origin":"offline-fixture"}\n'),
  };
  for (const [relative, bytes] of Object.entries(originals)) {
    await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await fs.writeFile(path.join(root, relative), bytes);
  }
  return { root, board, state, report, issues, originals };
}

test('freeze intervals retain absolute and shot-local clocks across complete unsorted shot coverage', async t => {
  const f = await fixture(t), board = { shots: [...f.board.shots].reverse() };
  const issues = frozenArtworkIssues(f.report, board, 10000, () => false)!;
  assert.deepEqual(issues.map(issue => issue.shotId), ['ch1.s001', 'ch1.s002']);
  assert.match(issues[0]!.description, /2500–5000ms \(shot-local 2500–5000ms\)/);
  assert.match(issues[1]!.description, /5000–7500ms \(shot-local 0–2500ms\)/);
  assert.equal(frozenArtworkIssues(qc([freeze(0, 10000)]), board, 10000, () => false)!.length, 2);
  const separated = frozenArtworkIssues(qc([freeze(100, 900), freeze(9000, 9900)]), board, 10000, () => false)!;
  assert.deepEqual(separated.map(issue => issue.shotId), ['ch1.s001', 'ch1.s002']);
  assert.match(separated[1]!.description, /shot-local 4000–4900ms/);
});

test('malformed findings, nonfinite clocks and non-artwork high failures never enter freeze repair', async t => {
  const f = await fixture(t);
  const invalid: Array<[string, unknown[]]> = [
    ['null finding', [null]], ['missing description', [{ type: 'frozen-frames', severity: 'high', startMs: 0, endMs: 1000 }]],
    ['NaN', [freeze(NaN, 1000)]], ['Infinity', [freeze(0, Infinity)]], ['missing interval', [{ type: 'frozen-frames', severity: 'high', description: 'No clock' }]],
    ['negative', [freeze(-1, 1000)]], ['empty', [freeze(1000, 1000)]], ['reverse', [freeze(2000, 1000)]],
    ['outside duration', [freeze(0, 10001)]], ['unknown high with freeze', [freeze(), { type: 'unknown', severity: 'high', description: 'Unknown' }]],
    ['voice with freeze', [freeze(), { type: 'missing-narration', severity: 'high', description: 'Voice missing' }]],
    ['later invalid finding', [freeze(), freeze(9000, 11000)]], ['no high', [{ ...freeze(), severity: 'medium' }]],
  ];
  for (const [name, findings] of invalid) assert.equal(frozenArtworkIssues(qc(findings), f.board, 10000, () => false), undefined, name);
  for (const duration of [0, -1, NaN, Infinity]) assert.equal(frozenArtworkIssues(f.report, f.board, duration, () => false), undefined);
  assert.equal(frozenArtworkIssues({ ...f.report, pass: true }, f.board, 10000, () => false), undefined);
});

test('coverage gaps, overlaps and affected shots without cinematic artwork reject the entire repair', async t => {
  const f = await fixture(t);
  for (const [name, mutate] of [
    ['gap', (board: Storyboard) => { board.shots[1]!.startMs = 5100; }],
    ['overlap', (board: Storyboard) => { board.shots[1]!.startMs = 4900; }],
    ['noncinematic', (board: Storyboard) => { delete board.shots[1]!.cinematic; }],
    ['no artwork', (board: Storyboard) => { delete board.shots[1]!.cinematic!.artDirection; }],
  ] as const) {
    const board = structuredClone(f.board); mutate(board);
    assert.equal(frozenArtworkIssues(f.report, board, 10000, () => false), undefined, name);
  }
  assert.equal(frozenArtworkIssues(f.report, { shots: [] }, 10000, () => false), undefined);
  const unaffected = structuredClone(f.board); delete unaffected.shots[1]!.cinematic;
  assert.equal(frozenArtworkIssues(qc([freeze(100, 1000)]), unaffected, 10000, () => false)!.length, 1);
});

test('every lock alias wins over competing false aliases, including shot.locked', async t => {
  const f = await fixture(t), first = f.board.shots[0]!;
  const aliases = ['storyboard', 'scenes', first.id, `shot:${first.id}`, `scene:${first.id}`, `shots.${first.id}`];
  const allFalse = Object.fromEntries(aliases.map(alias => [alias, false]));
  for (const alias of aliases) {
    const state = { locked: { ...allFalse, [alias]: true } };
    assert.equal(lockedShot(state, first), true, alias);
    assert.equal(frozenArtworkIssues(f.report, f.board, 10000, shot => lockedShot(state, shot)), undefined, alias);
  }
  const board = structuredClone(f.board); board.shots[0]!.locked = true;
  assert.equal(frozenArtworkIssues(f.report, board, 10000, shot => lockedShot({ locked: allFalse }, shot)), undefined);
  assert.equal(frozenArtworkIssues(f.report, f.board, 10000, shot => lockedShot({ locked: allFalse }, shot))!.length, 2);
});

test('reservation preserves exact failed final/QC/board bytes and hashes before finishing a revision', async t => {
  const f = await fixture(t);
  const reserved = await reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 3);
  let ledger = await readJson<Ledger>(ledgerFile(f.root)), attempt = ledger.attempts[0]!;
  assert.equal(attempt.status, 'reserved'); assert.equal(reserved.iteration, 1);
  assert.deepEqual(attempt.shotIds, ['ch1.s001', 'ch1.s002']);
  assert.equal(attempt.storyboardHash, digest(JSON.stringify(f.board)));
  assert.deepEqual(Object.keys(attempt.files).sort(), Object.keys(f.originals).sort());
  for (const [relative, bytes] of Object.entries(f.originals)) {
    assert.deepEqual(await fs.readFile(path.join(f.root, relative)), bytes);
    assert.deepEqual(await fs.readFile(path.join(f.root, attempt.snapshot, relative)), bytes);
    assert.equal(attempt.files[relative], digest(bytes));
    await fs.writeFile(path.join(f.root, relative), 'A later artifact must not replace the failed snapshot');
  }
  const revised = structuredClone(f.board); revised.shots[0]!.cinematic!.artDirection!.brief = 'Revised sourced artwork';
  await finishQCArtworkRepair(f.root, reserved.id, { status: 'repaired', board: revised });
  ledger = await readJson<Ledger>(ledgerFile(f.root)); attempt = ledger.attempts[0]!;
  assert.equal(attempt.status, 'repaired'); assert.equal(attempt.afterStoryboardHash, digest(JSON.stringify(revised)));
  for (const [relative, bytes] of Object.entries(f.originals)) assert.equal(digest(await fs.readFile(path.join(f.root, attempt.snapshot, relative))), digest(bytes));
  const terminal = await fs.readFile(ledgerFile(f.root));
  await assert.rejects(finishQCArtworkRepair(f.root, reserved.id, { status: 'failed', error: 'Must not rewrite history' }), /already finished/);
  assert.deepEqual(await fs.readFile(ledgerFile(f.root)), terminal);
});

test('failed and interrupted reservations share the review floor and cannot reset the same-input budget', async t => {
  const f = await fixture(t); f.state.reviewIteration = 2;
  const failed = await reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 4);
  assert.equal(failed.iteration, 3);
  await finishQCArtworkRepair(f.root, failed.id, { status: 'failed', error: 'Synthetic artist failure' });
  const resumed = { ...f.state, reviewIteration: 0 };
  assert.equal(await qcArtworkRepairIteration(f.root, resumed), 3);
  const interrupted = await reserveQCArtworkRepair(f.root, resumed, f.board, f.report, f.issues, 4);
  assert.equal(interrupted.iteration, 4); assert.equal(await qcArtworkRepairIteration(f.root, resumed), 4);
  const before = await fs.readFile(ledgerFile(f.root)), history = await fs.readdir(path.join(f.root, 'work/qc-artwork-repair-history'));
  let artistCalls = 0;
  await assert.rejects((async () => {
    await reserveQCArtworkRepair(f.root, { ...resumed }, f.board, f.report, f.issues, 4); artistCalls++;
  })(), /budget exhausted/);
  assert.equal(artistCalls, 0); assert.deepEqual(await fs.readFile(ledgerFile(f.root)), before);
  assert.deepEqual(await fs.readdir(path.join(f.root, 'work/qc-artwork-repair-history')), history);
  const ledger = await readJson<Ledger>(ledgerFile(f.root));
  assert.deepEqual(ledger.attempts.map(attempt => attempt.status), ['failed', 'reserved']);
  assert.equal(ledger.attempts[0]!.error, 'Synthetic artist failure');
});

test('input and asset identities keep separate histories while returning inputs retain their used budget', async t => {
  const f = await fixture(t), changedInput = { ...f.state, inputHash: digest('input-v2') }, changedAssets = { ...f.state, assetInputHash: digest('assets-v2') };
  await reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 3);
  for (const state of [changedInput, changedAssets]) {
    assert.equal(await qcArtworkRepairIteration(f.root, state), 0);
    assert.equal((await reserveQCArtworkRepair(f.root, state, f.board, f.report, f.issues, 3)).iteration, 1);
  }
  assert.equal(await qcArtworkRepairIteration(f.root, { ...f.state, reviewIteration: 0 }), 1);
  assert.equal((await reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 3)).iteration, 2);
  assert.equal((await readJson<Ledger>(ledgerFile(f.root))).attempts.length, 4);
});

test('every missing required snapshot prevents reservation; optional reports may be absent', async t => {
  for (const relative of ['output/final.mp4', 'output/qc-report.json', 'work/storyboard.json']) {
    const f = await fixture(t); await fs.unlink(path.join(f.root, relative));
    await assert.rejects(reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 3), /snapshot is missing/);
    assert.equal(await qcArtworkRepairIteration(f.root, f.state), 0);
    assert.equal(await fs.stat(ledgerFile(f.root)).then(() => true, () => false), false);
  }
  const f = await fixture(t);
  for (const relative of ['output/production-report.md', 'work/creative-direction-report.json']) await fs.unlink(path.join(f.root, relative));
  await reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 3);
  assert.equal(Object.keys((await readJson<Ledger>(ledgerFile(f.root))).attempts[0]!.files).length, 3);
});

test('corrupt ledgers reject reads, reservation and finish without replacing prior bytes', async t => {
  const f = await fixture(t), reserved = await reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 3);
  const original = await readJson<Ledger>(ledgerFile(f.root));
  const invalidIteration = structuredClone(original); invalidIteration.attempts[0]!.iteration = 0;
  for (const content of ['{broken', JSON.stringify({ version: 2, attempts: [] }), JSON.stringify({ version: 1, attempts: 'broken' }), JSON.stringify(invalidIteration)]) {
    await fs.writeFile(ledgerFile(f.root), content);
    await assert.rejects(qcArtworkRepairIteration(f.root, f.state));
    await assert.rejects(reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 3));
    await assert.rejects(finishQCArtworkRepair(f.root, reserved.id, { status: 'failed', error: 'Blocked' }));
    assert.equal(await fs.readFile(ledgerFile(f.root), 'utf8'), content);
  }
});

test('ledger commit and finish storage failures never grant a reservation or erase a charged attempt', async t => {
  const f = await fixture(t), rename = fs.rename.bind(fs);
  const failingRename = t.mock.method(fs, 'rename', async (source: Parameters<typeof fs.rename>[0], target: Parameters<typeof fs.rename>[1]) => {
    if (String(target) === ledgerFile(f.root)) throw Object.assign(new Error('Synthetic ledger write failure'), { code: 'EIO' });
    return rename(source, target);
  });
  let artistCalls = 0;
  await assert.rejects((async () => {
    await reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 3); artistCalls++;
  })(), /Synthetic ledger write failure/);
  assert.equal(artistCalls, 0); assert.equal(await qcArtworkRepairIteration(f.root, f.state), 0);
  failingRename.mock.restore();
  const reserved = await reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 3), before = await fs.readFile(ledgerFile(f.root));
  t.mock.method(fs, 'rename', async (source: Parameters<typeof fs.rename>[0], target: Parameters<typeof fs.rename>[1]) => {
    if (String(target) === ledgerFile(f.root)) throw Object.assign(new Error('Synthetic finish write failure'), { code: 'EIO' });
    return rename(source, target);
  });
  await assert.rejects(finishQCArtworkRepair(f.root, reserved.id, { status: 'failed', error: 'Artist failed' }), /Synthetic finish write failure/);
  assert.deepEqual(await fs.readFile(ledgerFile(f.root)), before);
  assert.equal(await qcArtworkRepairIteration(f.root, f.state), 1);
});

test('an I/O error checking an existing ledger cannot masquerade as missing history and reopen its budget', async t => {
  const f = await fixture(t);
  await reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 1);
  const before = await fs.readFile(ledgerFile(f.root)), access = fs.access.bind(fs);
  t.mock.method(fs, 'access', async (target: Parameters<typeof fs.access>[0], mode?: number) => {
    if (String(target) === ledgerFile(f.root)) throw Object.assign(new Error('Synthetic ledger read I/O failure'), { code: 'EIO' });
    return access(target, mode);
  });
  const iteration = await qcArtworkRepairIteration(f.root, { ...f.state, reviewIteration: 0 }).then(value => ({ value }), error => ({ error }));
  let artistCalls = 0;
  const reservation = await reserveQCArtworkRepair(f.root, { ...f.state, reviewIteration: 0 }, f.board, f.report, f.issues, 1)
    .then(value => { artistCalls++; return { value }; }, error => ({ error }));
  assert.ok('error' in iteration, 'Unreadable ledger history must fail closed rather than return zero');
  assert.ok('error' in reservation, 'An exhausted existing ledger must not be overwritten on a storage error');
  assert.equal(artistCalls, 0); assert.deepEqual(await fs.readFile(ledgerFile(f.root)), before);
});

test('ledger storage negative: access EACCES preserves exhausted history and cannot authorize artist work', async t => {
  const f = await fixture(t);
  const attempt = await reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 1);
  const before = await fs.readFile(ledgerFile(f.root));
  const history = path.join(f.root, 'work/qc-artwork-repair-history');
  const snapshotsBefore = await fs.readdir(history), access = fs.access.bind(fs);
  const denied = t.mock.method(fs, 'access', async (target: Parameters<typeof fs.access>[0], mode?: number) => {
    if (String(target) === ledgerFile(f.root)) throw Object.assign(new Error('Synthetic ledger access denied'), { code: 'EACCES' });
    return access(target, mode);
  });
  const inaccessible = (error: unknown) => (error as NodeJS.ErrnoException).code === 'EACCES';
  await assert.rejects(qcArtworkRepairIteration(f.root, { ...f.state, reviewIteration: 0 }), inaccessible);
  let artistCalls = 0;
  await assert.rejects((async () => {
    await reserveQCArtworkRepair(f.root, { ...f.state, reviewIteration: 0 }, f.board, f.report, f.issues, 1);
    artistCalls++;
  })(), inaccessible);
  await assert.rejects(finishQCArtworkRepair(f.root, attempt.id, { status: 'failed', error: 'Must not be published' }), inaccessible);
  assert.equal(artistCalls, 0);
  assert.deepEqual(await fs.readFile(ledgerFile(f.root)), before);
  assert.deepEqual(await fs.readdir(history), snapshotsBefore);
  denied.mock.restore();
  assert.equal(await qcArtworkRepairIteration(f.root, f.state), 1);
});

test('ledger storage negative: a real dangling entry is never mistaken for absent reservation history', async t => {
  const f = await fixture(t);
  const attempt = await reserveQCArtworkRepair(f.root, f.state, f.board, f.report, f.issues, 1);
  const original = await fs.readFile(ledgerFile(f.root));
  const preservedLedger = path.join(f.root, 'work/qc-artwork-repairs.preserved.json');
  await fs.rename(ledgerFile(f.root), preservedLedger);
  const missingTarget = path.join(f.root, 'work/never-created-ledger-target');
  // Windows junctions are native Node filesystem links and need no developer-mode file-symlink privilege.
  await fs.symlink(missingTarget, ledgerFile(f.root), process.platform === 'win32' ? 'junction' : 'file');
  assert.equal((await fs.lstat(ledgerFile(f.root))).isSymbolicLink(), true);
  const linkBefore = await fs.readlink(ledgerFile(f.root));
  const history = path.join(f.root, 'work/qc-artwork-repair-history');
  const snapshotsBefore = await fs.readdir(history);
  const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT';
  // Windows can report a dangling junction itself as accessible. Require public recovery to reject it either way.
  const accessResult = await fs.access(ledgerFile(f.root)).then(() => 'resolved', error => {
    assert.equal((error as NodeJS.ErrnoException).code, 'ENOENT'); return 'ENOENT';
  });
  t.diagnostic(`native dangling-entry access probe: ${accessResult}`);
  await assert.rejects(qcArtworkRepairIteration(f.root, { ...f.state, reviewIteration: 0 }), missing);
  let artistCalls = 0;
  await assert.rejects((async () => {
    await reserveQCArtworkRepair(f.root, { ...f.state, reviewIteration: 0 }, f.board, f.report, f.issues, 1);
    artistCalls++;
  })(), missing);
  await assert.rejects(finishQCArtworkRepair(f.root, attempt.id, { status: 'failed', error: 'Must not be published' }), missing);
  // Also exercise the strict missing-target branch against the actual existing link, including on Windows.
  const access = fs.access.bind(fs);
  t.mock.method(fs, 'access', async (target: Parameters<typeof fs.access>[0], mode?: number) => {
    if (String(target) === ledgerFile(f.root)) throw Object.assign(new Error('Synthetic missing-target probe'), { code: 'ENOENT' });
    return access(target, mode);
  });
  await assert.rejects(qcArtworkRepairIteration(f.root, { ...f.state, reviewIteration: 0 }), missing);
  await assert.rejects(reserveQCArtworkRepair(f.root, { ...f.state, reviewIteration: 0 }, f.board, f.report, f.issues, 1), missing);
  await assert.rejects(finishQCArtworkRepair(f.root, attempt.id, { status: 'failed', error: 'Must not be published' }), missing);
  assert.equal(artistCalls, 0);
  assert.equal(await fs.readlink(ledgerFile(f.root)), linkBefore);
  assert.deepEqual(await fs.readFile(preservedLedger), original);
  assert.deepEqual(await fs.readdir(history), snapshotsBefore);
  await assert.rejects(fs.lstat(missingTarget), missing);
});
