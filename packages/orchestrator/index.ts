import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { Id, type ProjectStatus } from '../core/schemas.js';
import { findRepoRoot } from '../core/config.js';
import { loadHost } from '../host/index.js';
import { exists, readJson, safePath, writeAtomic } from '../core/utils.js';
import { loadState, saveState, stateIndex } from './state-machine.js';
import { ProductionStore } from './store.js';
import { reservation } from './reservation.js';
import {topicModelDefaults} from '../models/nine-router.js';
export { runPipeline, type PipelineOptions } from './pipeline.js';
export { ApprovalRequired, loadState } from './state-machine.js';

export async function createProject(name:string,options:{root?:string,example?:boolean,topic?:'prehistoric-life'}={}):Promise<string> {
  Id.parse(name); if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(name)) throw new Error('Project name must contain 1–64 letters, digits, underscores or hyphens'); const repo=await findRepoRoot(); const root=safePath(options.root ?? path.join(repo,'projects'),name);
  await fs.mkdir(path.dirname(root),{recursive:true}); await fs.mkdir(root,{recursive:false});
  for(const dir of ['input/assets/references','input/assets/images','input/assets/video','input/assets/music','input/assets/sfx','work','scenes','previews','output','logs']) await fs.mkdir(path.join(root,dir),{recursive:true});
  await writeAtomic(path.join(root,'project.yaml'),YAML.stringify({project:{name,language:'vi'},topic:{id:options.topic??null},content:{mode:'narrated-explainer'},input:{mode:options.topic?'story':'auto',story:'input/story.txt',script:'input/script.txt',source:'input/source.md',narration:'input/narration.wav',subtitles:'input/narration.srt'},host:{profile:'library/characters/STICK-MAN.md'},presentation:{mode:'story-cinematic',character_mode:'actors'},...(options.topic?{models:topicModelDefaults()}:{}),rendering:{draft:{fps:30},...(options.topic?{final:{fps:60}}:{})},style:{preset:'technical-clean'},workflow:{automatic:true,require_storyboard_approval:false,...(options.topic?{max_model_calls:30}: {})},captions:{mode:'both'}}));
  if(options.example) { await fs.cp(path.join(repo,'examples/steam-explainer/input'),path.join(root,'input'),{recursive:true}); }
  const state=await loadState(root); state.name=name; await saveState(root,state); return root;
}
export async function getProjectStatus(projectRoot:string):Promise<unknown> {
  const root=path.resolve(projectRoot); const state=await loadState(root); const artifacts:Record<string,unknown>={};
  for(const name of ['story','narration','chapters','beats','character-bible','storyboard','asset-manifest','review','cost-report','input-document','script','script-generation','voiced-narration','voice-report','speech-activity','host-profile','host-rig','host-timeline','explanation-plan','story-direction','stage-plan','performance-plan','camera-plan','environment-provenance','performance-report','animation-library','creative-direction-report']) if(await exists(path.join(root,'work',`${name}.json`))) artifacts[name]=await readJson(path.join(root,'work',`${name}.json`));
  for (const name of ['story-direction','stage-plan','performance-plan','camera-plan','environment-provenance','performance-report','creative-direction-report']) if (!artifacts[name] && await exists(path.join(root,'output',`${name}.json`))) artifacts[name]=await readJson(path.join(root,'output',`${name}.json`));
  if(await exists(path.join(root,'output/qc-report.json'))) artifacts['qc-report']=await readJson(path.join(root,'output/qc-report.json'));
  let production:unknown={}; if(await exists(path.join(root,'work/production.sqlite'))) { const store=new ProductionStore(root); try { production=store.summary(); } finally { store.close(); } }
  for(const name of ['actor-cast','actor-timeline'])if(await exists(path.join(root,'work',`${name}.json`)))artifacts[name]=await readJson(path.join(root,'work',`${name}.json`));
  return { ...state, projectRoot:root, artifacts, production };
}
async function ensureIdle(root:string):Promise<void> { if((await reservation(root))?.active)throw new Error('Cannot edit project state during a running production job'); }
export async function approveProject(projectRoot:string,kind:'storyboard'|'characters'|'host'):Promise<void> { await ensureIdle(projectRoot); const state=await loadState(projectRoot); const required=kind==='storyboard'?'STORYBOARDED':'ANALYZED'; if(stateIndex(state.state)<stateIndex(required)) throw new Error(`Generate ${kind} before approving it`);if(kind==='host'){const{rig}=await loadHost(projectRoot);state.approvals.hostHash=rig.rigHash;}state.approvals[kind]=true; delete state.error; delete state.waitingFor; await saveState(projectRoot,state); }
export async function updateLocks(projectRoot:string,locked:Record<string,boolean>):Promise<void> { await ensureIdle(projectRoot); const state=await loadState(projectRoot); for(const [id,value] of Object.entries(locked)) { Id.parse(id); state.locked[id]=value; } if(Object.values(locked).some(value=>!value)) {state.reviewIteration=0;await writeAtomic(path.join(projectRoot,'work/scene-repair-budget.json'),'{}\n');} await saveState(projectRoot,state); }
export async function invalidateProject(projectRoot:string,from:ProjectStatus):Promise<void> { await ensureIdle(projectRoot); const state=await loadState(projectRoot); if(stateIndex(state.state)>stateIndex(from)) state.state=from; state.reviewIteration=0; state.artifactHashes={}; delete state.error; delete state.waitingFor; if(stateIndex(from)<stateIndex('INGESTED'))state.narrationInputHash=''; if(stateIndex(from)<=stateIndex('STORYBOARDED')) state.approvals.storyboard=false; if(stateIndex(from)<=stateIndex('ANALYZED')) state.approvals.characters=false; await writeAtomic(path.join(projectRoot,'work/scene-repair-budget.json'),'{}\n'); await saveState(projectRoot,state); }

