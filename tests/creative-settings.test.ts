import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { temporary } from './support.js';
import { updateSettings, type SettingsPatch } from '../packages/orchestrator/settings.js';
import { loadConfig } from '../packages/core/config.js';
import { loadState, saveState } from '../packages/orchestrator/state-machine.js';
import { hash } from '../packages/core/utils.js';

async function fixture(t:TestContext){
  const root=await temporary(t);await fs.mkdir(path.join(root,'input'));await fs.mkdir(path.join(root,'work'));
  await fs.writeFile(path.join(root,'project.yaml'),YAML.stringify({project:{name:'fixture'},content:{mode:'narrated-explainer'},input:{mode:'wav'},voice:{source:'input'},presentation:{mode:'story-cinematic'},host:{profile:'library/characters/STICK-MAN.md'},models:{storyboard:{provider:'mock',model:'mock'}}}));
  const files=['input/narration.wav','work/narration.json','work/voiced-narration.json'];
  for(const file of files)await fs.writeFile(path.join(root,file),file.endsWith('.wav')?Buffer.from([1,2,3,4]):JSON.stringify({durationMs:1707,segments:[{id:'cue',startMs:0,endMs:1707,text:'Nguồn lời kể'}]}));
  const state=await loadState(root);state.state='SCENES_READY';state.locked={'shot:approved':true};state.approvals={host:true,hostHash:'locked-rig',storyboard:true,characters:true};state.narrationInputHash='immutable-clock';state.artifactHashes={'scenes/approved/scene.js':'old-visual'};await saveState(root,state);
  return {root,files,bytes:await Promise.all(files.map(file=>fs.readFile(path.join(root,file))))};
}

test('design brief and storyboard model edits invalidate visual stages while preserving audio, clock and host locks',async t=>{
  const {root,files,bytes}=await fixture(t);
  await updateSettings(root,{presentation:{design_brief:'Một sân khấu xanh, diễn xuất có chủ đích'}});
  assert.equal((await loadConfig(root)).presentation.design_brief,'Một sân khấu xanh, diễn xuất có chủ đích');
  let state=await loadState(root);assert.equal(state.state,'TIMED');assert.equal(state.approvals.storyboard,false);assert.equal(state.approvals.host,true);assert.equal(state.approvals.hostHash,'locked-rig');assert.deepEqual(state.locked,{'shot:approved':true});assert.equal(state.narrationInputHash,'immutable-clock');assert.deepEqual(state.artifactHashes,{});
  state.state='SCENES_READY';state.approvals.storyboard=true;await saveState(root,state);
  await updateSettings(root,{models:{storyboard:{provider:'codex-cli',model:'default',temperature:.4}}});
  assert.equal((await loadState(root)).state,'TIMED');assert.equal((await loadConfig(root)).models.storyboard.provider,'codex-cli');
  for(const [i,file] of files.entries())assert.deepEqual(await fs.readFile(path.join(root,file)),bytes[i]);
});

test('settings revisions reject stale edits atomically, and identical visual settings do not invalidate',async t=>{
  const {root}=await fixture(t),file=path.join(root,'project.yaml'),revision=hash(await fs.readFile(file));
  await updateSettings(root,{revision,presentation:{design_brief:'First design'}});
  const before=await fs.readFile(file),stateBefore=await fs.readFile(path.join(root,'project-state.json'));
  await assert.rejects(updateSettings(root,{revision,presentation:{design_brief:'Stale design'}}),/REVISION_CONFLICT/);
  assert.deepEqual(await fs.readFile(file),before);assert.deepEqual(await fs.readFile(path.join(root,'project-state.json')),stateBefore);
  const state=await loadState(root);state.state='SCENES_READY';state.approvals.storyboard=true;await saveState(root,state);
  await updateSettings(root,{revision:hash(before),presentation:{design_brief:'First design'}});
  assert.equal((await loadState(root)).state,'SCENES_READY');assert.equal((await loadState(root)).approvals.storyboard,true);
});

test('creative settings reject executable overrides and unknown model roles without changing config or state',async t=>{
  const {root}=await fixture(t),before=await fs.readFile(path.join(root,'project.yaml')),stateBefore=await fs.readFile(path.join(root,'project-state.json'));
  for(const patch of [{models:{storyboard:{command:'powershell.exe'}}},{models:{storyboard:{command_args:['-Command','unsafe']}}},{models:{coder:{provider:'claude-cli',model:'opus'}}},{presentation:{design_brief:'x'.repeat(6001)}}]){
    await assert.rejects(updateSettings(root,patch as unknown as SettingsPatch));
    assert.deepEqual(await fs.readFile(path.join(root,'project.yaml')),before);assert.deepEqual(await fs.readFile(path.join(root,'project-state.json')),stateBefore);
  }
});

test('presentation patch accepts a brief alone including clearing it, and rejects an empty patch atomically',async t=>{
  const {root}=await fixture(t),file=path.join(root,'project.yaml');
  await updateSettings(root,{revision:hash(await fs.readFile(file)),presentation:{design_brief:'Brief-only change'}});
  assert.equal((await loadConfig(root)).presentation.mode,'story-cinematic');assert.equal((await loadConfig(root)).presentation.design_brief,'Brief-only change');
  await updateSettings(root,{revision:hash(await fs.readFile(file)),presentation:{design_brief:''}});
  assert.equal((await loadConfig(root)).presentation.design_brief,'');
  const before=await fs.readFile(file),stateBefore=await fs.readFile(path.join(root,'project-state.json'));
  await assert.rejects(updateSettings(root,{revision:hash(before),presentation:{}}),/presentation mode|design brief/i);
  assert.deepEqual(await fs.readFile(file),before);assert.deepEqual(await fs.readFile(path.join(root,'project-state.json')),stateBefore);
});
