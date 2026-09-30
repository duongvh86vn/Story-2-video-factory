import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { loadConfig, findRepoRoot, type FactoryConfig } from '../core/config.js';
import { AssetManifestSchema, BeatSchema, ChapterSchema, CharacterBibleSchema, NarrationSchema, StoryboardSchema, StorySchema, ReviewSchema, States, type ProjectState, type ProjectStatus } from '../core/schemas.js';
import { appendLog, exists, hash, readJson, safePath, safeRealPath, walk, writeAtomic, writeJson } from '../core/utils.js';
import { ModelRouter } from '../models/registry.js';
import { ingestProject } from '../ingest/index.js';
import { analyzeProject } from '../story/index.js';
import { createStoryboard, validateStoryboard, storyboardMarkdown } from '../storyboard/index.js';
import { resolveAssets } from '../assets/index.js';
import { buildScenes, buildMaster, repairScenes } from '../scenes/index.js';
import { HyperFramesEngine } from '../render/hyperframes.js';
import { createPreviews, reviewProject } from '../review/index.js';
import { produceMedia } from '../audio/index.js';
import { runQC } from '../qc/index.js';
import { loadState, saveState, transition, stateIndex, ApprovalRequired } from './state-machine.js';
import { ProductionStore } from './store.js';
import { collectResearch } from './research.js';
import { reservation } from './reservation.js';

export interface PipelineOptions { until?:ProjectStatus; force?:boolean; shotIds?:string[]; onProgress?:(state:ProjectState)=>void; }
const outputs:Partial<Record<ProjectStatus,string[]>>={ INGESTED:['work/story.json'], TIMED:['work/narration.json','work/timeline.json'], ANALYZED:['work/character-bible.json','work/chapters.json','work/beats.json'], STORYBOARDED:['work/storyboard.json','work/storyboard.md'], ASSETS_READY:['work/asset-manifest.json'], SCENES_READY:['scenes/index.html'], DRAFT_RENDERED:['work/draft.mp4','previews/contact-sheet-global.jpg','previews/manifest.json'], REVIEWED:['work/review.json'], FINAL_RENDERED:['output/final.mp4','output/final.srt','output/thumbnail.png'], QC_PASSED:['output/qc-report.json'], DONE:['output/production-report.md','output/storyboard.json','output/storyboard.md','output/character-bible.json','output/timeline.json','output/asset-manifest.json'] };
export function redact(message:string,config:FactoryConfig):string { for (const role of Object.values(config.models)) { const key=process.env[role.api_key_env]; if (key) message=message.split(key).join('[REDACTED]'); } return message.replace(/Bearer\s+[^\s"']+/gi,'Bearer [REDACTED]'); }
async function inputFingerprint(root:string,config:FactoryConfig):Promise<string> { const files:string[]=[]; for(const relative of Object.values(config.input)) if(await exists(safePath(root,relative))) files.push(await safeRealPath(root,relative)); const repo=await findRepoRoot(); if (config.project.series) files.push(...await walk(safePath(path.join(repo,'series'),config.project.series))); const contents=await Promise.all([...new Set(files)].sort().map(async file=>[path.relative(root,file),hash(await fs.readFile(file))])); return hash({config,contents}); }
async function assetFingerprint(root:string):Promise<string> {
  const files=[...await walk(path.join(root,'input/assets')),...await walk(path.join(root,'assets'))];
  const inputs=files.filter(file=>!/^assets\/(?:generated|resolved)\//.test(path.relative(root,file).replace(/\\/g,'/')));
  return hash(await Promise.all(inputs.sort().map(async file=>[path.relative(root,file),hash(await fs.readFile(file))])));
}
async function artifactHashes(root:string,state:ProjectState):Promise<void> {
  for (const [stage,files] of Object.entries(outputs)) if (stateIndex(stage as ProjectStatus)<=stateIndex(state.state)) for (const file of files) if (await exists(path.join(root,file))) state.artifactHashes[file]=hash(await fs.readFile(path.join(root,file)));
  if(stateIndex(state.state)>=stateIndex('SCENES_READY')) for(const file of await walk(path.join(root,'scenes'))) if(/\.(html|js|css|json)$/.test(file)) state.artifactHashes[path.relative(root,file).replace(/\\/g,'/')]=hash(await fs.readFile(file));
  if(stateIndex(state.state)>=stateIndex('DRAFT_RENDERED')) for(const file of await walk(path.join(root,'previews'))) if(/\.(png|jpg|json)$/.test(file)) state.artifactHashes[path.relative(root,file).replace(/\\/g,'/')]=hash(await fs.readFile(file));
}
async function reconcile(root:string,state:ProjectState):Promise<void> {
  const initial=stateIndex(state.state); let target=initial;
  const editable=new Set(['work/story.json','work/narration.json','work/character-bible.json','work/chapters.json','work/beats.json','work/storyboard.json','work/asset-manifest.json']);
  for (const stage of States) {
    if (stateIndex(stage)>initial) break;
    for (const file of outputs[stage] ?? []) {
      if (!await exists(path.join(root,file))) {
        // Narration and its rich timeline are produced by ingest, before TIMED validates them.
        const producer = ['work/narration.json','work/timeline.json'].includes(file) ? 'INGESTED' : stage;
        target=Math.min(target,Math.max(0,stateIndex(producer as ProjectStatus)-1)); continue;
      }
      const current=hash(await fs.readFile(path.join(root,file)));
      if (state.artifactHashes[file] && state.artifactHashes[file]!==current) {
        target=Math.min(target,Math.max(0,stateIndex(stage)-(editable.has(file)?0:1)));
        state.artifactHashes[file]=current;
      }
    }
  }
  if(initial>=stateIndex('SCENES_READY')) for(const [file,previous] of Object.entries(state.artifactHashes)) if(file.startsWith('scenes/') && file!=='scenes/index.html') {
    if(!await exists(path.join(root,file))) target=Math.min(target,stateIndex('ASSETS_READY'));
    else if(hash(await fs.readFile(path.join(root,file)))!==previous) target=Math.min(target,stateIndex('SCENES_READY'));
  }
  if(initial>=stateIndex('DRAFT_RENDERED')) {
    for(const [file,previous] of Object.entries(state.artifactHashes)) if(file.startsWith('previews/')) {
      if(!await exists(path.join(root,file))||hash(await fs.readFile(path.join(root,file)))!==previous) target=Math.min(target,stateIndex('SCENES_READY'));
    }
    // Upgrade older preview manifests by regenerating them at their producing stage.
    try {
      const manifest=await readJson(path.join(root,'previews/manifest.json'),z.object({sheetHashes:z.record(z.string())}));
      if(!manifest.sheetHashes['previews/contact-sheet-global.jpg']) target=Math.min(target,stateIndex('SCENES_READY'));
    } catch {target=Math.min(target,stateIndex('SCENES_READY'));}
  }
  if(target<initial) {
    state.state=States[target]!;state.reviewIteration=0;
    await writeJson(path.join(root,'work/scene-repair-budget.json'),{});
    if(target<=stateIndex('STORYBOARDED')) state.approvals.storyboard=false;
    if(target<=stateIndex('ANALYZED')) state.approvals.characters=false;
  }
}
async function acquire(root:string):Promise<()=>Promise<void>> {
  const file=path.join(root,'.factory.lock'); const token=randomUUID();
  for (let attempt=0;attempt<2;attempt++) {
    try { const handle=await fs.open(file,'wx'); try { await handle.writeFile(JSON.stringify({pid:process.pid,token,startedAt:new Date().toISOString()})); } finally { await handle.close(); } return async()=>{ try { const current=await readJson<{token:string}>(file); if (current.token===token) await fs.unlink(file); } catch {} }; }
    catch (e) { if ((e as NodeJS.ErrnoException).code!=='EEXIST') throw e; const lock=await reservation(root); if(lock?.active)throw new Error(lock.pid?`Project is already running in process ${lock.pid}`:'Project reservation is being initialized; retry shortly'); if(lock && await fs.readFile(file,'utf8')===lock.content)await fs.unlink(file); }
  }
  throw new Error('Could not acquire project lock');
}
async function retryRender<T>(config:FactoryConfig,fn:()=>Promise<T>):Promise<T> { let last:unknown; for(let i=0;i<=config.retry.render;i++) try { return await fn(); } catch(e) { last=e; } throw last; }
function costSummary(router:ModelRouter,config:FactoryConfig):unknown { const pricing=Object.fromEntries(Object.entries(config.models).map(([role,m])=>[role,{model:m.model,provider:m.provider,inputPerMillion:m.input_cost_per_million,outputPerMillion:m.output_cost_per_million,configured:['mock','ollama'].includes(m.provider) || m.input_cost_per_million>0 || m.output_cost_per_million>0}])); const warnings=Object.entries(pricing).filter(([,p])=>!p.configured).map(([role])=>`${role}: pricing is not configured; zero tracked cost is not a measured service price`); return {...router.usageSummary(),pricing,pricingComplete:warnings.length===0,warnings}; }
async function report(root:string,config:FactoryConfig,state:ProjectState,router:ModelRouter):Promise<void> {
  const [storyboard,narration,assets,qc,review]=await Promise.all([readJson(path.join(root,'work/storyboard.json'),StoryboardSchema),readJson(path.join(root,'work/narration.json'),NarrationSchema),readJson(path.join(root,'work/asset-manifest.json'),AssetManifestSchema),readJson<{pass:boolean,issues:unknown[]}>(path.join(root,'output/qc-report.json')),readJson(path.join(root,'work/review.json'),ReviewSchema)]);
  const costs=costSummary(router,config); await writeJson(path.join(root,'output/cost-report.json'),costs);
  const research=await exists(path.join(root,'work/research.json')) ? await readJson<{sources:Array<{sourceUrl:string}>}>(path.join(root,'work/research.json')) : undefined;
  const models=Object.entries(config.models).map(([role,m])=>`- ${role}: ${m.provider} / ${m.model}`).join('\n');
  const text=`# Production Report\n\n## Input\nProject: ${state.name}\n\nNarration: ${narration.mode}, ${(narration.durationMs/1000).toFixed(3)} seconds\n\nAudio: ${narration.audioPath ? 'User narration present':'SRT-only; no voice track supplied'}\n\n## Models\n${models}\n\n## Storyboard\n${storyboard.shots.length} shots\n\n## Assets\n${assets.assets.length} resolved assets; ${assets.assets.filter(a=>a.status==='missing').length} missing\n\n## Review and repairs\nReview mode: ${review.mode ?? 'unspecified'}\n\nReview iterations: ${state.reviewIteration}\n\nRemaining issues: ${review.issues.length}\n\n${review.warnings.map(w=>`- ${w}`).join('\n')}\n\n## Render\n${config.rendering.final.width}×${config.rendering.final.height} at ${config.rendering.final.fps} fps\n\nRenderer: HyperFrames 0.8.96; post-processing: FFmpeg\n\n## QC\n${qc.pass ? 'PASS':'FAIL'}\n\n${JSON.stringify(qc,null,2)}\n\n## Costs\n${JSON.stringify(costs,null,2)}\n\n## Provenance\nUser source is authoritative. Historical reconstructions are visualizations.\n\n${assets.assets.filter(a=>a.sourceUrl).map(a=>`- ${a.id}: ${a.sourceUrl}; ${a.license ?? 'license unspecified'}; ${a.author ?? ''}`).join('\n')}\n\n${research?.sources.map(s=>`- Research reference: ${s.sourceUrl}`).join('\n') ?? ''}\n`;
  await writeAtomic(path.join(root,'output/production-report.md'),text);
}
export async function runPipeline(projectRoot:string,options:PipelineOptions={}):Promise<ProjectState> {
  const resolved=path.resolve(projectRoot); if (!await exists(path.join(resolved,'project.yaml'))) throw new Error('Missing project.yaml; use video-factory new first');
  // Canonicalize Windows short paths and directory aliases before deriving asset-relative paths.
  const root=await fs.realpath(resolved);
  const release=await acquire(root); let store:ProductionStore|undefined; let config:FactoryConfig|undefined;
  try {
    config=await loadConfig(root); const state=await loadState(root); store=new ProductionStore(root); store.failInterruptedJobs();
    const fingerprint=await inputFingerprint(root,config), assetHash=await assetFingerprint(root);
    if (options.force || (state.inputHash && state.inputHash!==fingerprint)) { state.state='NEW'; state.reviewIteration=0; state.artifactHashes={}; state.approvals.storyboard=false; if(!state.locked.characterBible) state.approvals.characters=false; await writeJson(path.join(root,'work/scene-repair-budget.json'),{}); }
    if(state.assetInputHash && state.assetInputHash!==assetHash && stateIndex(state.state)>stateIndex('STORYBOARDED')) {state.state='STORYBOARDED';state.reviewIteration=0;await writeJson(path.join(root,'work/scene-repair-budget.json'),{});}
    state.inputHash=fingerprint;state.assetInputHash=assetHash; await reconcile(root,state);
    const router=new ModelRouter(config,root); const engine=new HyperFramesEngine(config,root);
    if (options.shotIds?.length) {
      if(stateIndex(state.state)<stateIndex('SCENES_READY')) throw new Error('Build all scenes before rebuilding selected shots');
      const board=await readJson(path.join(root,'work/storyboard.json'),StoryboardSchema); for(const id of options.shotIds) if(!board.shots.some(s=>s.id===id)) throw new Error(`Unknown shot: ${id}`);
      const chars=await readJson(path.join(root,'work/character-bible.json'),CharacterBibleSchema); const assets=await readJson(path.join(root,'work/asset-manifest.json'),AssetManifestSchema);
      await buildScenes(root,config,router,board,chars,assets,{shotIds:options.shotIds,force:true});
      await buildMaster(root,config,board,await readJson(path.join(root,'work/narration.json'),NarrationSchema),assets); state.state='SCENES_READY'; state.reviewIteration=0;
    }
    await saveState(root,state); store.saveState(state);
    const until=options.until ?? 'DONE';
    while(stateIndex(state.state)<stateIndex(until)) {
      const next=States[stateIndex(state.state)+1]!; const job=store.beginJob(next);
      await appendLog(path.join(root,'logs/orchestrator.log'),{time:new Date().toISOString(),event:'start',state:next});
      try {
        const story=()=>readJson(path.join(root,'work/story.json'),StorySchema);
        const narration=()=>readJson(path.join(root,'work/narration.json'),NarrationSchema);
        const characters=()=>readJson(path.join(root,'work/character-bible.json'),CharacterBibleSchema);
        const beats=()=>readJson(path.join(root,'work/beats.json'),z.array(BeatSchema));
        const board=()=>readJson(path.join(root,'work/storyboard.json'),StoryboardSchema);
        const assets=()=>readJson(path.join(root,'work/asset-manifest.json'),AssetManifestSchema);
        switch(next) {
          case 'INGESTED': { const result=await ingestProject(root,config,router); await writeJson(path.join(root,'work/story.json'),result.story); await writeJson(path.join(root,'work/narration.json'),result.narration); break; }
          case 'TIMED': { const n=await narration(); if(n.durationMs>config.rendering.max_duration_seconds*1000) throw new Error('Narration exceeds configured video duration limit'); if(!await exists(path.join(root,'work/timeline.json'))) await writeJson(path.join(root,'work/timeline.json'),{durationMs:n.durationMs,segments:n.segments,words:n.words}); break; }
          case 'ANALYZED': { await collectResearch(root,config); const result=await analyzeProject(root,config,router,await story(),await narration()); await writeJson(path.join(root,'work/story.json'),result.story); await writeJson(path.join(root,'work/character-bible.json'),result.characters); await writeJson(path.join(root,'work/characters.json'),result.characters); await writeJson(path.join(root,'work/chapters.json'),result.chapters); await writeJson(path.join(root,'work/beats.json'),result.beats); break; }
          case 'STORYBOARDED': {
            if(config.workflow.require_character_approval && !state.approvals.characters) throw new ApprovalRequired('characters');
            const chars=await characters(); const n=await narration(); const b=await beats();
            const sb=state.locked.storyboard && await exists(path.join(root,'work/storyboard.json')) ? await board() : await createStoryboard(root,config,router,await story(),n,chars,await readJson(path.join(root,'work/chapters.json'),z.array(ChapterSchema)),b);
            validateStoryboard(sb,n,b,chars); if(sb.shots.length>config.rendering.max_shots) throw new Error('Storyboard exceeds configured maximum shots');
            await writeJson(path.join(root,'work/storyboard.json'),sb); await writeAtomic(path.join(root,'work/storyboard.md'),storyboardMarkdown(sb,b)); store.records('shots',sb.shots); break;
          }
          case 'ASSETS_READY': {
            if((config.workflow.require_storyboard_approval || !config.workflow.automatic) && !state.approvals.storyboard) throw new ApprovalRequired('storyboard');
            const result=await resolveAssets(root,config,await board(),await characters()); await writeJson(path.join(root,'work/asset-manifest.json'),result); await writeJson(path.join(root,'work/assets.json'),result); store.records('assets',result.assets); break;
          }
          case 'SCENES_READY': { const sb=await board(); const n=await narration(); validateStoryboard(sb,n,await beats(),await characters()); const manifest=await assets(); await buildScenes(root,config,router,sb,await characters(),manifest); await buildMaster(root,config,sb,n,manifest); const validation=await engine.validate(); if(!validation.pass) throw new Error(`Master validation failed: ${validation.errors.join('\n')}`); break; }
          case 'DRAFT_RENDERED': { const sb=await board(), manifest=await assets(); await buildScenes(root,config,router,sb,await characters(),manifest); await buildMaster(root,config,sb,await narration(),manifest); const validation=await engine.validate(); if(!validation.pass) throw new Error(`Master validation failed: ${validation.errors.join('\n')}`); const result=await retryRender(config,()=>engine.renderDraft()); store.render('draft',result.path); await createPreviews(root,config,sb); break; }
          case 'REVIEWED': { const result=await reviewProject(root,config,router,await board(),await story(),await characters(),await assets()); await writeJson(path.join(root,'work/review.json'),result); store.review(result); break; }
          case 'REPAIRED': {
            let review=await readJson(path.join(root,'work/review.json'),ReviewSchema);
            while(review.issues.some(i=>i.severity==='high') && state.reviewIteration<config.workflow.max_review_iterations) {
              await repairScenes(root,config,router,await board(),await characters(),await assets(),review.issues.filter(i=>i.severity==='high'));
              await buildMaster(root,config,await board(),await narration(),await assets()); const validation=await engine.validate(); if(!validation.pass) throw new Error(`Repaired master invalid: ${validation.errors.join('\n')}`);
              await retryRender(config,()=>engine.renderDraft()); await createPreviews(root,config,await board());
              review=await reviewProject(root,config,router,await board(),await story(),await characters(),await assets()); await writeJson(path.join(root,'work/review.json'),review); state.reviewIteration++; store.review(review); await saveState(root,state);
            }
            if(review.issues.some(i=>i.severity==='high') || !review.pass) throw new Error('Review failed after the configured repair budget; edit or unlock the affected shots before resuming'); break;
          }
          case 'FINAL_RENDERED': { const review=await readJson(path.join(root,'work/review.json'),ReviewSchema); if(!review.pass) throw new Error('Final render requires a passing draft review'); const result=await retryRender(config,()=>engine.renderFinal()); store.render('final',result.path); await produceMedia(root,config,await narration(),await board(),await assets()); break; }
          case 'QC_PASSED': { const qc=await runQC(root,config,await narration(),await board()); await writeJson(path.join(root,'output/qc-report.json'),qc); await report(root,config,state,router); if(!qc.pass) throw new Error(`Production QC failed: ${JSON.stringify(qc.issues)}`); break; }
          case 'DONE': { for(const name of ['storyboard.json','storyboard.md','character-bible.json','timeline.json','asset-manifest.json']) await fs.copyFile(path.join(root,'work',name),path.join(root,'output',name)); await report(root,config,state,router); break; }
        }
        transition(state,next); await artifactHashes(root,state); await saveState(root,state); store.saveState(state); store.finishJob(job); options.onProgress?.(state);
        await writeJson(path.join(root,'work/cost-report.json'),costSummary(router,config));
        const calls=path.join(root,'logs/model-calls.jsonl'); if(await exists(calls)) { const content=await fs.readFile(calls,'utf8'); for(const line of content.slice(0,content.lastIndexOf('\n')+1).split('\n').filter(Boolean)) store.modelCall(JSON.parse(line) as Record<string,unknown>); }
        await appendLog(path.join(root,'logs/orchestrator.log'),{time:new Date().toISOString(),event:'complete',state:next});
      } catch(error) {
        const message=redact(error instanceof Error ? error.message:String(error),config); state.error=message; await saveState(root,state); store.saveState(state); store.finishJob(job,message); store.recordError(next,message);
        await appendLog(path.join(root,'logs/errors/pipeline.jsonl'),{time:new Date().toISOString(),stage:next,error:message});
        if(error instanceof ApprovalRequired) return state; throw new Error(message,{cause:error});
      }
    }
    return state;
  } finally { store?.close(); await release(); }
}
