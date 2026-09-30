import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { Id, type ProjectStatus } from '../core/schemas.js';
import { findRepoRoot } from '../core/config.js';
import { exists, readJson, safePath, writeAtomic } from '../core/utils.js';
import { loadState, saveState, stateIndex } from './state-machine.js';
import { ProductionStore } from './store.js';
import { reservation } from './reservation.js';
export { runPipeline, type PipelineOptions } from './pipeline.js';
export { ApprovalRequired, loadState } from './state-machine.js';

export async function createProject(name:string,options:{root?:string,example?:boolean}={}):Promise<string> {
  Id.parse(name); if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(name)) throw new Error('Project name must contain 1–64 letters, digits, underscores or hyphens'); const repo=await findRepoRoot(); const root=safePath(options.root ?? path.join(repo,'projects'),name);
  await fs.mkdir(path.dirname(root),{recursive:true}); await fs.mkdir(root,{recursive:false});
  for(const dir of ['input/assets/references','input/assets/images','input/assets/video','input/assets/music','input/assets/sfx','work','scenes','previews','output','logs']) await fs.mkdir(path.join(root,dir),{recursive:true});
  await writeAtomic(path.join(root,'project.yaml'),YAML.stringify({project:{name,language:'vi'},input:{source:'input/source.md',narration:'input/narration.wav',subtitles:'input/narration.srt'},style:{preset:'historical-cinematic'},workflow:{require_storyboard_approval:false},captions:{mode:'both'}}));
  if(options.example) { await fs.cp(path.join(repo,'examples/invention-demo/input'),path.join(root,'input'),{recursive:true}); }
  else { await writeAtomic(path.join(root,'input/source.md'),`# TITLE\n${name}\n\n# PURPOSE\nDescribe the purpose of your video.\n\n# STORY\nWrite your canonical story here.\n\n# VISUAL STYLE\nCinematic documentary with code-built diagrams.\n\n# RULES\n- Narration controls time.\n- Use only facts in this source.\n`); }
  const state=await loadState(root); state.name=name; await saveState(root,state); return root;
}
export async function getProjectStatus(projectRoot:string):Promise<unknown> {
  const root=path.resolve(projectRoot); const state=await loadState(root); const artifacts:Record<string,unknown>={};
  for(const name of ['story','narration','chapters','beats','character-bible','storyboard','asset-manifest','review','cost-report']) if(await exists(path.join(root,'work',`${name}.json`))) artifacts[name]=await readJson(path.join(root,'work',`${name}.json`));
  if(await exists(path.join(root,'output/qc-report.json'))) artifacts['qc-report']=await readJson(path.join(root,'output/qc-report.json'));
  let production:unknown={}; if(await exists(path.join(root,'work/production.sqlite'))) { const store=new ProductionStore(root); try { production=store.summary(); } finally { store.close(); } }
  return { ...state, projectRoot:root, artifacts, production };
}
async function ensureIdle(root:string):Promise<void> { if((await reservation(root))?.active)throw new Error('Cannot edit project state during a running production job'); }
export async function approveProject(projectRoot:string,kind:'storyboard'|'characters'):Promise<void> { await ensureIdle(projectRoot); const state=await loadState(projectRoot); const required=kind==='characters'?'ANALYZED':'STORYBOARDED'; if(stateIndex(state.state)<stateIndex(required)) throw new Error(`Generate ${kind} before approving it`); state.approvals[kind]=true; delete state.error; await saveState(projectRoot,state); }
export async function updateLocks(projectRoot:string,locked:Record<string,boolean>):Promise<void> { await ensureIdle(projectRoot); const state=await loadState(projectRoot); for(const [id,value] of Object.entries(locked)) { Id.parse(id); state.locked[id]=value; } if(Object.values(locked).some(value=>!value)) {state.reviewIteration=0;await writeAtomic(path.join(projectRoot,'work/scene-repair-budget.json'),'{}\n');} await saveState(projectRoot,state); }
export async function invalidateProject(projectRoot:string,from:ProjectStatus):Promise<void> { await ensureIdle(projectRoot); const state=await loadState(projectRoot); if(stateIndex(state.state)>stateIndex(from)) state.state=from; state.reviewIteration=0; state.artifactHashes={}; delete state.error; if(stateIndex(from)<=stateIndex('STORYBOARDED')) state.approvals.storyboard=false; if(stateIndex(from)<=stateIndex('ANALYZED')) state.approvals.characters=false; await writeAtomic(path.join(projectRoot,'work/scene-repair-budget.json'),'{}\n'); await saveState(projectRoot,state); }
