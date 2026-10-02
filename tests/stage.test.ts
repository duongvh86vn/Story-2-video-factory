import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import YAML from 'yaml';
import { temporary } from './support.js';
import { createProject, runPipeline, updateLocks, invalidateProject } from '../packages/orchestrator/index.js';
import { loadState } from '../packages/orchestrator/state-machine.js';
import { hash, readJson } from '../packages/core/utils.js';
import { StoryboardSchema } from '../packages/core/schemas.js';
import { prepareCinematicEnvironments } from '../packages/stage/index.js';
import { ProductionStore } from '../packages/orchestrator/store.js';

async function project(t: Parameters<typeof temporary>[0]) {
  const root = await createProject('cinematic-stage', {root: await temporary(t)});
  const file = path.join(root, 'project.yaml'), raw = YAML.parse(await fs.readFile(file, 'utf8'));
  raw.input = {mode: 'srt'}; raw.presentation = {mode: 'story-cinematic'}; raw.voice = {tts_provider: 'none'};
  raw.host = {profile: 'library/characters/STICK-MAN.md'};
  await fs.writeFile(file, YAML.stringify(raw));
  await fs.writeFile(path.join(root, 'input/narration.srt'), '1\n00:00:00,000 --> 00:00:04,000\nHơi nước được dẫn đến bình ngưng riêng.\n');
  return root;
}

test('cinematic resume regenerates locked derived plans without repeating narration or valid asset stages', async t => {
  const root = await project(t);
  const first = await runPipeline(root, {until: 'ASSETS_READY'});
  assert.equal(first.state, 'ASSETS_READY'); assert.equal(first.specVersion, 4);
  const narration = hash(await fs.readFile(path.join(root, 'work/narration.json')));
  const board = hash(await fs.readFile(path.join(root, 'work/storyboard.json')));
  const parsed = await readJson(path.join(root, 'work/storyboard.json'), StoryboardSchema);
  assert.equal((await readJson<{storyboardHash:string}>(path.join(root, 'work/camera-plan.json'))).storyboardHash, hash(parsed));
  await updateLocks(root, {storyboard: true});
  await fs.unlink(path.join(root, 'work/camera-plan.json'));
  await runPipeline(root, {until: 'ASSETS_READY'});
  assert.equal(hash(await fs.readFile(path.join(root, 'work/storyboard.json'))), board);
  assert.equal(hash(await fs.readFile(path.join(root, 'work/narration.json'))), narration);
  const state = await loadState(root);
  for (const name of ['story-direction', 'stage-plan', 'performance-plan', 'camera-plan', 'environment-provenance']) {
    assert.ok(state.artifactHashes[`work/${name}.json`], `missing resume identity for ${name}`);
    assert.equal((await readJson<{version:number}>(path.join(root, `work/${name}.json`))).version, 22);
  }
  const before = new ProductionStore(root); const jobs = JSON.stringify(before.summary()); before.close();
  await runPipeline(root, {until: 'ASSETS_READY'});
  const after = new ProductionStore(root); assert.equal(JSON.stringify(after.summary()), jobs); after.close();
});

test('curated environment bytes and locked asset requests cannot silently change', async t => {
  const root = await project(t); await runPipeline(root, {until:'ASSETS_READY'});
  const board = await readJson(path.join(root, 'work/storyboard.json'), StoryboardSchema);
  const shot = board.shots[0]!, id = shot.cinematic!.environmentAssetId!;
  const asset = shot.assetNeeds.find(a => a.id === id)!;
  assert.equal(asset.required, true); assert.equal(asset.license, 'project-generated-illustration');
  const changed = structuredClone(board); changed.shots[0]!.cinematic!.environmentAssetId = 'other';
  await assert.rejects(prepareCinematicEnvironments(root, changed, new Set([shot.id])), /locked environment/);
  await fs.appendFile(path.join(root, asset.localPath!), 'tampered');
  await assert.rejects(prepareCinematicEnvironments(root, board), /environment changed/);
  await assert.rejects(runPipeline(root, {until: 'ASSETS_READY'}), /environment changed/);
});

test('unlocked older cinematic plans regenerate on the same clock; obsolete locked plans raise a migration error',async t=>{
  const root=await project(t);await runPipeline(root,{until:'ASSETS_READY'});
  const narration=hash(await fs.readFile(path.join(root,'work/narration.json'))),file=path.join(root,'work/storyboard.json');
  const older=await readJson<any>(file);older.shots[0].cinematic.producer='story-direction-2.2.0';delete older.shots[0].cinematic.models;
  await fs.writeFile(file,JSON.stringify(older));await invalidateProject(root,'TIMED');
  assert.equal((await runPipeline(root,{until:'ASSETS_READY'})).state,'ASSETS_READY');
  assert.equal(hash(await fs.readFile(path.join(root,'work/narration.json'))),narration);
  await fs.writeFile(file,JSON.stringify(older));await updateLocks(root,{[older.shots[0].id]:true});await invalidateProject(root,'TIMED');
  await assert.rejects(runPipeline(root,{until:'ASSETS_READY'}),/locked.*migration|locked.*version|unlock.*shot/i);
});

test('the lead stays in the established workshop when later narration describes its problem without naming the place',async t=>{
  const root=await project(t);
  await fs.writeFile(path.join(root,'input/narration.srt'),'1\n00:00:00,000 --> 00:00:03,000\nHệ thống hơi nước được cải tiến như thế nào?\n\n2\n00:00:03,000 --> 00:00:06,000\nViệc làm nóng rồi làm lạnh liên tục gây lãng phí.\n');
  await runPipeline(root,{until:'STORYBOARDED'});
  const board=await readJson(path.join(root,'work/storyboard.json'),StoryboardSchema);
  assert.ok(board.shots.length>1);
  assert.ok(board.shots.every(s=>s.cinematic!.setting==='workshop'),'an unnamed setting must continue the established story environment');
});
