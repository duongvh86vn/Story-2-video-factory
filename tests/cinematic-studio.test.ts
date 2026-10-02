import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { type TestContext } from 'node:test';
import YAML from 'yaml';
import { buildServer } from '../apps/server/index.js';
import * as core from '../packages/orchestrator/index.js';
import { loadState, saveState } from '../packages/orchestrator/state-machine.js';
import { loadConfig } from '../packages/core/config.js';
import { BeatSchema, StorySchema, type Storyboard } from '../packages/core/schemas.js';
import { hash, runCommand, writeJson } from '../packages/core/utils.js';
import { compileHost } from '../packages/host/index.js';
import { loadHost } from '../packages/host/index.js';
import { ModelRouter } from '../packages/models/registry.js';
import { groundedExplanation } from '../packages/explainer/plan.js';
import { explainerShot } from '../packages/explainer/storyboard.js';
import { directCinematicShot, writeCinematicPlans } from '../packages/director/index.js';
import { temporary } from './support.js';
import { cinematicReview } from '../apps/studio/src/cinematic.js';
import { renderCinematic } from '../library/shots/cinematic.js';
import { secureSceneFiles } from '../packages/scenes/security.js';
import { planCamera } from '../packages/director/camera.js';
import { DIRECTION_VERSION } from '../packages/director/schemas.js';

const derived = ['story-direction', 'stage-plan', 'performance-plan', 'camera-plan', 'environment-provenance', 'performance-report'];
const repo = fileURLToPath(new URL('../', import.meta.url));
test('an obsolete cinematic project opens read-only for resume and never serves old media as current',async t=>{
  const {root,app}=await fixture(t);
  const file=path.join(root,'work/storyboard.json'),board=JSON.parse(await fs.readFile(file,'utf8'));
  const oldVersion='story-direction-2.2.0';assert.notEqual(oldVersion,DIRECTION_VERSION);
  board.shots[0].cinematic.producer=oldVersion;
  await fs.writeFile(file,JSON.stringify(board));
  const before=await fs.readFile(file),state=await loadState(root);
  state.state='DONE';state.locked={'shot:shot1':true};await saveState(root,state);
  await fs.writeFile(path.join(root,'output/final.mp4'),'old film');
  const detail=await app.inject({url:'/api/projects/fixture'});
  assert.equal(detail.statusCode,200,detail.body);
  const data=detail.json();assert.equal(data.cinematicMigration?.required,true);
  assert.deepEqual(data.cinematicMigration.shotIds,['shot1']);assert.deepEqual(data.cinematicMigration.lockedShotIds,['shot1']);
  assert.equal(data.preview.final,null);assert.equal(data.preview.composition,null);
  assert.ok(!data.downloads.some((d:{name:string})=>d.name==='final.mp4'));
  const artifact=await app.inject({url:'/api/projects/fixture/artifacts/storyboard.json'});
  assert.equal(artifact.statusCode,200,artifact.body);assert.equal(artifact.json().editable,false);
  assert.equal(artifact.json().data.shots[0].cinematic.producer,oldVersion);
  const save=await app.inject({method:'PUT',url:'/api/projects/fixture/artifacts/storyboard.json',payload:{data:artifact.json().data,revision:artifact.json().revision}});
  assert.equal(save.statusCode,409,save.body);assert.equal(save.json().error.code,'CINEMATIC_MIGRATION_REQUIRED');
  assert.equal((await app.inject({url:'/api/projects/fixture/downloads/final.mp4'})).statusCode,409);
  assert.deepEqual(await fs.readFile(file),before);assert.deepEqual((await loadState(root)).locked,state.locked);
});
async function fixture(t: TestContext, method?: 'question') {
  const projectsRoot = await temporary(t), root = await core.createProject('fixture', { root: projectsRoot });
  const file = path.join(root, 'project.yaml'), raw = YAML.parse(await fs.readFile(file, 'utf8'));
  raw.presentation = { mode: 'story-cinematic' }; raw.host = { profile: 'library/characters/STICK-MAN.md' };
  raw.rendering = { final: { width: 1280, height: 720, fps: 30 } };
  await fs.writeFile(file, YAML.stringify(raw));
  const config = await loadConfig(root), { profile, rig } = await compileHost(root, config, new ModelRouter(config, root));
  const narration = { mode: 'srt' as const, durationMs: 8000, audioPath: 'input/narration.wav', words: [], segments: [
    { id: 's1', startMs: 0, endMs: 4000, text: 'Hơi nước đẩy pít-tông trong xi-lanh.' },
    { id: 's2', startMs: 4000, endMs: 8000, text: 'Pít-tông truyền chuyển động đến bánh xe.' },
  ] };
  const story = StorySchema.parse({ title: 'Cơ chế', story: narration.segments.map(s => s.text).join(' '), style: { visual: 'vector' } });
  const basic = narration.segments.map((s, i) => BeatSchema.parse({ id: `b${i + 1}`, chapterId: 'ch1', startMs: s.startMs, endMs: s.endMs,
    segmentIds: [s.id], narrationText: s.text, meaning: 'transfer', visualGoal: 'show transfer', importance: 1 }));
  const plan = groundedExplanation(story, narration, basic, profile);
  const beats = basic.map((b, i) => ({ ...b, ...plan.beats[i]!, ...(method?{visualMethod:method}:{}) }));
  const board: Storyboard = { shots: [] };
  for (const [i, beat] of beats.entries()) {
    board.shots.push(directCinematicShot(explainerShot(`shot${i + 1}`, beat.startMs, beat.endMs, beat, narration, profile, rig),
      beat, profile, config, board.shots.at(-1)?.cinematic?.continuity.exit,{facing:board.shots.at(-1)?.cinematic?.continuity.facing}));
  }
  for (const [name, data] of Object.entries({ narration, 'voiced-narration': narration, beats, 'character-bible': { characters: [] }, storyboard: board })) {
    await writeJson(path.join(root, `work/${name}.json`), data);
  }
  await fs.writeFile(path.join(root, 'input/narration.wav'), 'unchanged audio fixture');
  await writeCinematicPlans(root, board);
  await writeJson(path.join(root, 'work/environment-provenance.json'), { version: 22, producer: 'environment-stage-2.2.0', environments: [] });
  await writeJson(path.join(root, 'work/performance-report.json'), { version: 22, producer: 'performance-fixture', storyboardHash: hash(board), shots: [] });
  const state = await loadState(root); state.state = 'SCENES_READY'; state.approvals = { storyboard: true, characters: true, host: true, hostHash: rig.rigHash };
  state.narrationInputHash = 'narration-clock'; await saveState(root, state);
  const app = await buildServer({ projectsRoot, coordinator: core }); t.after(() => app.close());
  return { root, app, board, profile };
}
async function edit(app: Awaited<ReturnType<typeof buildServer>>, change: (board: Storyboard) => void) {
  const url = '/api/projects/fixture/artifacts/storyboard.json', doc = (await app.inject({ url })).json();
  change(doc.data); return app.inject({ method: 'PUT', url, payload: { data: doc.data, revision: doc.revision } });
}

// Defect: style settings are rejected or invalidate narration instead of only visual stages.
test('style change keeps audio, narration clock, host approval and inherited locks; same style is a no-op', async t => {
  const { root, app } = await fixture(t), original = await loadState(root);
  original.locked = { storyboard: true, shot1: true }; await saveState(root, original);
  const files = ['input/narration.wav', 'work/narration.json', 'work/voiced-narration.json'];
  const before = await Promise.all(files.map(f => fs.readFile(path.join(root, f))));
  const url = '/api/projects/fixture/settings', doc = (await app.inject({ url: '/api/projects/fixture' })).json();
  const changed = await app.inject({ method: 'PATCH', url, payload: { revision: doc.settings.revision, presentation: { mode: 'diagram' } } });
  assert.equal(changed.statusCode, 200, changed.body);
  assert.equal(changed.json().settings.presentation.mode, 'diagram');
  const state = await loadState(root); assert.equal(state.state, 'TIMED'); assert.equal(state.approvals.storyboard, false);
  assert.equal(state.approvals.hostHash, original.approvals.hostHash); assert.equal(state.approvals.host, true);
  assert.equal(state.narrationInputHash, 'narration-clock'); assert.deepEqual(state.locked, original.locked);
  for (const [i, f] of files.entries()) assert.deepEqual(await fs.readFile(path.join(root, f)), before[i]);
  const stateBytes = await fs.readFile(path.join(root, 'project-state.json'));
  assert.equal((await app.inject({ method: 'PATCH', url, payload: { presentation: { mode: 'diagram' } } })).statusCode, 200);
  assert.deepEqual(await fs.readFile(path.join(root, 'project-state.json')), stateBytes);
  assert.equal(changed.json().preview.draft, null);
});

// Defect: creation has no explicit style contract, or arbitrary presentation keys reach config.
test('project creation and API settings share a strict presentation mode', async t => {
  const projectsRoot = await temporary(t), app = await buildServer({ projectsRoot, coordinator: core }); t.after(() => app.close());
  const created = await app.inject({ method: 'POST', url: '/api/projects', payload: { name: 'selected', presentation: { mode: 'story-cinematic' } } });
  assert.equal(created.statusCode, 201, created.body);
  assert.equal((await app.inject({ url: '/api/projects/selected' })).json().settings.presentation.mode, 'story-cinematic');
  const file = path.join(projectsRoot, 'selected/project.yaml'), bytes = await fs.readFile(file);
  for (const presentation of [{ mode: 'unsupported' }, { mode: 'diagram', code: 'alert(1)' }, {}]) {
    assert.equal((await app.inject({ method: 'PATCH', url: '/api/projects/selected/settings', payload: { presentation } })).statusCode, 422);
    assert.deepEqual(await fs.readFile(file), bytes);
  }
  await fs.writeFile(path.join(projectsRoot, 'selected/.factory.lock'), JSON.stringify({ pid: process.pid }));
  assert.equal((await app.inject({ method: 'PATCH', url: '/api/projects/selected/settings', payload: { presentation: { mode: 'diagram' } } })).statusCode, 409);
});

// Defect: production reports are absent from status/downloads or allow direct writes.
test('derived cinematic artifacts are visible, read-only and downloadable with honest freshness', async t => {
  const { root, app } = await fixture(t);
  const detail = (await app.inject({ url: '/api/projects/fixture' })).json();
  const status = await core.getProjectStatus(root) as { artifacts: Record<string, unknown> };
  for (const name of derived) {
    assert.ok(status.artifacts[name], `status missing ${name}`);
    const url = `/api/projects/fixture/artifacts/${name}.json`, response = await app.inject({ url });
    assert.equal(response.statusCode, 200, response.body); assert.equal(response.json().editable, false);
    assert.equal((await app.inject({ method: 'PUT', url, payload: { data: {} } })).statusCode, 403);
    assert.ok(detail.downloads.some((f: { name: string }) => f.name === `${name}.json`));
    assert.equal((await app.inject({ url: `/api/projects/fixture/downloads/${name}.json` })).statusCode, 200);
  }
  assert.equal(detail.cinematicArtifacts['performance-plan.json'].status, 'current');
  assert.equal(detail.cinematicArtifacts['environment-provenance.json'].status, 'unverified');
  await core.invalidateProject(root, 'TIMED');
  const stale = (await app.inject({ url: '/api/projects/fixture' })).json();
  assert.equal(stale.cinematicArtifacts['performance-plan.json'].status, 'stale');
  assert.equal((await app.inject({ url: '/api/projects/fixture/downloads/performance-plan.json' })).statusCode, 409);
});

// Defect: valid mood edits leave derived plans describing the previous canonical storyboard.
test('canonical mood edits regenerate read-only plans, invalidate clips and keep narration unchanged', async t => {
  const { root, app } = await fixture(t), before = await fs.readFile(path.join(root, 'work/narration.json'));
  const changed = await edit(app, board => { board.shots[0]!.cinematic!.performance.expressions[0]!.mood = 'thinking'; });
  assert.equal(changed.statusCode, 200, changed.body);
  const response = await app.inject({ url: '/api/projects/fixture/artifacts/performance-plan.json' });
  assert.equal(response.statusCode, 200, response.body);
  const plan = response.json();
  assert.equal(plan.data.shots[0].expressions[0].mood, 'thinking');
  assert.equal(plan.data.storyboardHash, hash(changed.json().data));
  assert.equal((await loadState(root)).state, 'STORYBOARDED');
  assert.deepEqual(await fs.readFile(path.join(root, 'work/narration.json')), before);
  assert.equal((await app.inject({ url: '/api/projects/fixture' })).json().preview.draft, null);
});

// Defect: consistent per-shot locomotion can still teleport across the cut.
test('canonical editing rejects broken continuity across adjacent cinematic shots', async t => {
  const { root, app } = await fixture(t), before = await fs.readFile(path.join(root, 'work/storyboard.json'));
  const response = await edit(app, board => {
    const c = board.shots[1]!.cinematic!; c.continuity.entry.x += 10; c.continuity.exit.x += 10; c.performance.root.x += 10;
    for (const w of c.performance.walks) { w.fromX += 10; w.toX += 10; }
  });
  assert.equal(response.statusCode, 422, response.body); assert.match(response.json().error.message, /continuity/i);
  assert.deepEqual(await fs.readFile(path.join(root, 'work/storyboard.json')), before);
});

// Unsupported carried props remain explicit until the cinematic library integrates the parent's carry clips.
test('canonical editing fails clearly for unsupported carried props', async t => {
  const { root, app } = await fixture(t), before = await fs.readFile(path.join(root, 'work/storyboard.json'));
  for (const change of [
    (board: Storyboard) => { board.shots[0]!.cinematic!.continuity.carriedProps = ['prop1']; },
  ]) {
    const response = await edit(app, change); assert.equal(response.statusCode, 422, response.body);
    assert.equal(response.json().error.code, 'CINEMATIC_UNSUPPORTED'); assert.match(response.json().error.message, /unsupported|not supported/i);
    assert.deepEqual(await fs.readFile(path.join(root, 'work/storyboard.json')), before);
  }
});

// Defect: a well-framed medium API edit is rejected by the legacy wide-only guard/schema.
test('canonical camera API accepts medium framing while preserving world performance, timing and locks',async t=>{
  const {root,app}=await fixture(t),doc=(await app.inject({url:'/api/projects/fixture/artifacts/storyboard.json'})).json();
  const before=doc.data.shots[0].cinematic.performance,narration=await fs.readFile(path.join(root,'work/narration.json'));
  const response=await edit(app,board=>{const shot=board.shots[0]!,c=shot.cinematic!,p=c.performance;
    c.camera={framing:'medium',movement:'locked',anchor:{x:1280*.43,y:p.stage.groundY-(720*.32/1.25)},startScale:1.25,endScale:1.25};shot.camera.shotSize='medium';shot.camera.movement='locked';});
  assert.equal(response.statusCode,200,response.body);assert.deepEqual(response.json().data.shots[0].cinematic.performance,before);
  assert.deepEqual(await fs.readFile(path.join(root,'work/narration.json')),narration);assert.equal((await loadState(root)).state,'STORYBOARDED');
  await core.updateLocks(root,{shot1:true});assert.equal((await edit(app,board=>{board.shots[0]!.cinematic!.camera.anchor.x+=2;})).statusCode,423);
});

test('canonical camera API accepts informative face close and publishes matching derived camera data without changing turns or narration',async t=>{
  const {root,app,board,profile}=await fixture(t,'question'),before=structuredClone(board.shots[0]!.cinematic!.performance);
  const files=['input/narration.wav','work/narration.json','work/voiced-narration.json'],bytes=await Promise.all(files.map(f=>fs.readFile(path.join(root,f))));
  const response=await edit(app,board=>{
    const shot=board.shots[0]!,c=shot.cinematic!;
    c.camera=planCamera(c.performance,profile,{framing:'close',movement:'locked',focus:'face'});
    shot.camera.shotSize='close';shot.camera.movement='locked';
  });
  assert.equal(response.statusCode,200,response.body);
  assert.deepEqual(response.json().data.shots[0].cinematic.performance,before);
  const derived=(await app.inject({url:'/api/projects/fixture/artifacts/camera-plan.json'})).json();
  assert.equal(derived.editable,false);assert.equal(derived.data.storyboardHash,hash(response.json().data));
  assert.equal(derived.data.shots[0].framing,'close');assert.equal(derived.data.shots[0].focus,'face');
  for(const [i,file] of files.entries())assert.deepEqual(await fs.readFile(path.join(root,file)),bytes[i]);
});

test('canonical camera API rejects unsafe framing and arbitrary transforms without changing the storyboard',async t=>{
  const {root,app}=await fixture(t),before=await fs.readFile(path.join(root,'work/storyboard.json'));
  const unsafe=await edit(app,board=>{board.shots[0]!.cinematic!.camera.anchor.y-=100;});
  assert.equal(unsafe.statusCode,422,unsafe.body);assert.match(unsafe.json().error.message,/camera.*feet\/visual ground.*subtitle/);
  const arbitrary=await edit(app,board=>{Object.assign(board.shots[0]!.cinematic!.camera,{rotation:30});});
  assert.equal(arbitrary.statusCode,422,arbitrary.body);
  assert.ok(arbitrary.json().error.issues.some((issue:{path:string;message:string})=>issue.path.endsWith('.cinematic.camera')&&/rotation/.test(issue.message)),arbitrary.body);
  const missingIntent=await edit(app,board=>{
    const shot=board.shots[0]!,c=shot.cinematic!;c.camera.framing='close';c.camera.focus=undefined;c.camera.startScale=c.camera.endScale=2.4;c.camera.movement='locked';shot.camera.shotSize='close';shot.camera.movement='locked';
  });
  assert.equal(missingIntent.statusCode,422,missingIntent.body);
  assert.equal(missingIntent.json().error.code,'VALIDATION_FAILED');
  assert.ok(missingIntent.json().error.issues.some((issue:{path:string;message:string})=>issue.path.endsWith('.camera.focus')&&issue.message==='Close framing requires intentional face, contact or object focus.'),missingIntent.body);
  assert.deepEqual(await fs.readFile(path.join(root,'work/storyboard.json')),before);
});

test('canonical camera API refuses unsupported legacy angles rather than silently ignoring them',async t=>{
  const {root,app}=await fixture(t),before=await fs.readFile(path.join(root,'work/storyboard.json'));
  const response=await edit(app,board=>{board.shots[0]!.camera.angle='top-down';});
  assert.equal(response.statusCode,422,response.body);assert.equal(response.json().error.code,'CINEMATIC_UNSUPPORTED');
  assert.match(response.json().error.message,/eye-level/);
  assert.deepEqual(await fs.readFile(path.join(root,'work/storyboard.json')),before);
});

test('canonical editing rejects a facing that contradicts the actual turn exit',async t=>{
  const {app}=await fixture(t);
  const response=await edit(app,board=>{board.shots[0]!.cinematic!.continuity.facing='left';});
  assert.equal(response.statusCode,422,response.body);assert.match(response.json().error.message,/facing.*turn|continuity/);
});

// Defect: inconsistent target/camera errors become opaque 500s; inherited locks disappear on edits.
test('canonical target/camera validation reports a client error and preserves locks and revisions', async t => {
  const { root, app } = await fixture(t);
  const invalid = await edit(app, board => { board.shots[0]!.cinematic!.performance.gestures[0]!.target = { x: 1, y: 1 }; });
  assert.equal(invalid.statusCode, 422, invalid.body); assert.match(invalid.json().error.message, /target/i);
  const camera = await edit(app, board => { board.shots[0]!.camera.movement = 'locked'; });
  assert.equal(camera.statusCode, 422, camera.body); assert.match(camera.json().error.message, /camera/i);
  await core.updateLocks(root, { shot1: true });
  assert.equal((await edit(app, board => { board.shots[0]!.subject += ' edit'; })).statusCode, 423);
  assert.equal((await loadState(root)).locked.shot1, true);
  await core.updateLocks(root, { shot1: false });
  const doc = (await app.inject({ url: '/api/projects/fixture/artifacts/storyboard.json' })).json();
  assert.equal((await edit(app, board => { board.shots[0]!.subject += ' edit'; })).statusCode, 200);
  assert.equal((await app.inject({ method: 'PUT', url: '/api/projects/fixture/artifacts/storyboard.json', payload: { data: doc.data, revision: doc.revision } })).statusCode, 409);
});

// Defect: CLI style selection bypasses the API contract or fails to invalidate visual work.
test('CLI configure and new select the same strict style; status exposes derived reports', async t => {
  const { root } = await fixture(t);
  const cli = (...args: string[]) => runCommand(process.execPath, ['--import', 'tsx', 'apps/cli/index.ts', ...args], { cwd: repo, allowFailure: true });
  const configured = await cli('configure', root, '--style', 'diagram'); assert.equal(configured.code, 0, configured.stderr);
  assert.equal((await loadConfig(root)).presentation.mode, 'diagram'); assert.equal((await loadState(root)).state, 'TIMED');
  const status = await cli('status', root); assert.equal(status.code, 0, status.stderr);
  assert.ok(JSON.parse(status.stdout).artifacts['performance-report']);
  assert.equal(JSON.parse(status.stdout).cinematicArtifacts['performance-plan.json'].status, 'stale');
  const bytes = await fs.readFile(path.join(root, 'project.yaml'));
  assert.equal((await cli('configure', root, '--style', 'turn-js')).code, 1);
  assert.deepEqual(await fs.readFile(path.join(root, 'project.yaml')), bytes);
  const projects = await temporary(t), created = await cli('new', 'chosen', '--root', projects, '--style', 'story-cinematic');
  assert.equal(created.code, 0, created.stderr); assert.equal((await loadConfig(path.join(projects, 'chosen'))).presentation.mode, 'story-cinematic');
});

// Defect: a CLI has no usable read-only artifact/download seam, or exports a stale plan.
test('CLI reads and downloads derived artifacts, rejects stale downloads and preserves existing destinations', async t => {
  const { root } = await fixture(t), destination = path.join(await temporary(t), 'performance.json');
  const cli = (...args: string[]) => runCommand(process.execPath, ['--import', 'tsx', 'apps/cli/index.ts', ...args], { cwd: repo, allowFailure: true });
  const read = await cli('artifact', root, 'performance-plan.json'); assert.equal(read.code, 0, read.stderr);
  assert.equal(JSON.parse(read.stdout).editable, false);
  assert.equal((await cli('download', root, 'performance-plan.json', destination)).code, 0);
  const bytes = await fs.readFile(destination); assert.deepEqual(bytes, await fs.readFile(path.join(root, 'work/performance-plan.json')));
  assert.equal((await cli('download', root, 'performance-plan.json', destination)).code, 1);
  assert.deepEqual(await fs.readFile(destination), bytes);
  await core.invalidateProject(root, 'TIMED');
  assert.equal((await cli('download', root, 'performance-plan.json', destination + '.stale')).code, 1);
  assert.equal(await fs.stat(destination + '.stale').then(() => true, () => false), false);
});

// Defect: an explicitly empty CLI style silently becomes a no-op instead of a validation error.
test('CLI rejects an empty explicitly supplied presentation mode', async t => {
  const { root } = await fixture(t), bytes = await fs.readFile(path.join(root, 'project.yaml'));
  const result = await runCommand(process.execPath, ['--import','tsx','apps/cli/index.ts','configure',root,'--style',''], { cwd: repo, allowFailure: true });
  assert.equal(result.code, 1, result.stdout); assert.deepEqual(await fs.readFile(path.join(root, 'project.yaml')), bytes);
});

// Regression: the API must serve the production scene through the safe bridge and reject raw scene edits.
test('Studio preview uses production files and the sandboxed bridge; stale clips are hidden', async t => {
  const { root, app, board } = await fixture(t), config = await loadConfig(root), { profile, rig } = await loadHost(root), shot = board.shots[0]!;
  const files = secureSceneFiles(renderCinematic(shot, profile, rig, { method:'audio-rms', windowMs:20, intervals:[] }, config).files);
  const dir = path.join(root, `scenes/${shot.id}`); await fs.mkdir(dir, { recursive:true });
  for (const file of files.files) await fs.writeFile(path.join(dir,file.path),file.content);
  await fs.writeFile(path.join(root,'work/draft.mp4'),'existing draft');
  const detail = (await app.inject({url:'/api/projects/fixture'})).json(), composition = detail.preview.shots[shot.id].composition;
  assert.equal(composition, '/project-static/fixture/scenes/shot1/index.html');
  assert.equal(detail.preview.draft, null);
  const html = await app.inject({url:composition}); assert.equal(html.statusCode,200,html.body);
  assert.match(html.headers['content-security-policy'] as string,/sandbox allow-scripts/);
  assert.match(html.body,/<script src="\/preview-bridge\.js"><\/script>/);
  const doc = (await app.inject({url:`/api/projects/fixture/scenes/${shot.id}`})).json();
  const edit = await app.inject({method:'PUT',url:`/api/projects/fixture/scenes/${shot.id}`,payload:{files:doc.files,revision:doc.revision}});
  assert.equal(edit.statusCode,403,edit.body); assert.equal(edit.json().error.code,'READ_ONLY');
  assert.equal((await app.inject({url:'/project-static/fixture/work/draft.mp4'})).statusCode,409);
  await core.invalidateProject(root,'TIMED');
  assert.equal((await app.inject({url:'/api/projects/fixture'})).json().preview.shots[shot.id].composition,null);
  assert.equal((await app.inject({url:composition})).statusCode,409);
});

// Regression: new model variants remain owned by the source mapping; inherited lock aliases remain effective.
test('cinematic model variants and inherited shot locks cannot be bypassed through canonical edits', async t => {
  const { root, app } = await fixture(t), before = await fs.readFile(path.join(root,'work/storyboard.json'));
  const invalid = await edit(app,board => { board.shots[0]!.cinematic!.models[0]!.variant='historical-note'; });
  assert.equal(invalid.statusCode,422,invalid.body); assert.match(invalid.json().error.message,/model variant.*source/i);
  const state = await loadState(root); state.locked['shot:shot1']=true; await saveState(root,state);
  const locked = await edit(app,board => { board.shots[0]!.cinematic!.performance.expressions[0]!.mood='thinking'; });
  assert.equal(locked.statusCode,423,locked.body);
  assert.deepEqual(await fs.readFile(path.join(root,'work/storyboard.json')),before);
});

// Regression: the three-column display must escape text and show real media controls plus read-only model provenance.
test('Studio shot review renders narration, staging, targets, mood, camera, continuity and production preview safely', async t => {
  const { board } = await fixture(t), shot = structuredClone(board.shots[0]!);
  shot.cinematic!.motivation='<script>alert(1)</script>';
  const html = cinematicReview({shot,narration:'Lời kể <img onerror="alert(1)">',locale:'vi',
    preview:{composition:'/project-static/fixture/scenes/shot1/index.html',frames:'/project-static/fixture/previews/shot1/contact-sheet.jpg'},clip:'draft',missingAssets:['missing.environment']});
  for (const label of ['Lời kể','Dàn cảnh và diễn xuất','Preview clip',...shot.cinematic!.performance.expressions.map(e=>e.mood),'operate','pít-tông','Camera:','Liên tục','missing.environment','conceptual']) assert.ok(html.includes(label),label);
  assert.match(html,/data-action="preview-shot"/); assert.match(html,/data-action="preview-clip" data-mode="draft"/);
  assert.match(html,/Mô hình và nguồn \(chỉ đọc\)/); assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<script>|<img onerror=|name="(?:variant|turn|carry)"/);
});
