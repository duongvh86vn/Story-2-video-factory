import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { loadConfig, findRepoRoot, type FactoryConfig } from '../core/config.js';
import { AssetManifestSchema, BeatSchema, ChapterSchema, CharacterBibleSchema, NarrationSchema, StoryboardSchema, StorySchema, ReviewSchema, States, type ProjectState, type ProjectStatus } from '../core/schemas.js';
import { appendLog, exists, hash, readJson, safePath, safeRealPath, walk, writeAtomic, writeJson } from '../core/utils.js';
import { ModelRouter } from '../models/registry.js';
import { ingestProject, prepareInput, ScriptDocumentSchema } from '../ingest/index.js';
import { SCRIPT_PARSER_VERSION } from '../ingest/script.js';
import { narratedStory, NARRATED_STORY_VERSION } from '../ingest/narrated-story.js';
import { analyzeProject } from '../story/index.js';
import { createStoryboard, validateStoryboard, storyboardMarkdown } from '../storyboard/index.js';
import { resolveAssets } from '../assets/index.js';
import { buildScenes, buildMaster, repairScenes } from '../scenes/index.js';
import { HyperFramesEngine } from '../render/hyperframes.js';
import { createPreviews, reviewProject } from '../review/index.js';
import { produceMedia } from '../audio/index.js';
import { MEDIA_TEXT_VERSION } from '../captions/literal.js';
import { runQC } from '../qc/index.js';
import { loadState, saveState, transition, stateIndex, ApprovalRequired } from './state-machine.js';
import { ProductionStore } from './store.js';
import { collectResearch } from './research.js';
import { reservation } from './reservation.js';
import { compileHost, loadHost, hostProfileFingerprint, rigHashMatchesProfile, HOST_RIG_IDENTITY_VERSION } from '../host/index.js';
import { createExplanation, EXPLANATION_VERSION } from '../explainer/plan.js';
import { ExplanationPlanSchema } from '../explainer/schemas.js';
import { validateExplainerStoryboard, writeHostTimeline } from '../explainer/storyboard.js';
import { narrateScript, resolveVoice, requireVoice, VoiceReportSchema } from '../voice/index.js';
import { ANIMATION_VERSION } from '../animation/schemas.js';
import { CINEMATIC_PLAN_FILES, CINEMATIC_EXPORT_FILES, DIRECTION_VERSION } from '../director/schemas.js';
import { writeCinematicPlans } from '../director/index.js';
import { environmentLibraryFingerprint, prepareCinematicEnvironments } from '../stage/index.js';
import { readStoryboardForDirection } from '../storyboard/director.js';
import {actorAssetHashes,exportActorAssets} from '../actors/assets.js';
import {actorDefinitions} from '../actors/locks.js';
import { CINEMATIC_MODEL_VERSION } from '../../library/shots/cinematic-models.js';
import { PROP_BINDING_VERSION } from '../director/props.js';
import {SEAT_SUPPORT_VERSION} from '../stage/seats.js';

export interface PipelineOptions { until?:ProjectStatus; force?:boolean; shotIds?:string[]; onProgress?:(state:ProjectState)=>void; }
const outputs:Partial<Record<ProjectStatus,string[]>>={ INGESTED:['work/story.json'], TIMED:['work/narration.json','work/timeline.json'], ANALYZED:['work/character-bible.json','work/chapters.json','work/beats.json'], STORYBOARDED:['work/storyboard.json','work/storyboard.md'], ASSETS_READY:['work/asset-manifest.json'], SCENES_READY:['scenes/index.html'], DRAFT_RENDERED:['work/draft.mp4','previews/contact-sheet-global.jpg','previews/manifest.json'], REVIEWED:['work/review.json'], FINAL_RENDERED:['output/final.mp4','output/final.srt','output/thumbnail.png'], QC_PASSED:['output/qc-report.json'], DONE:['output/production-report.md','output/storyboard.json','output/storyboard.md','output/character-bible.json','output/timeline.json','output/asset-manifest.json'] };
function stageOutputs(state:ProjectState):Partial<Record<ProjectStatus,string[]>> {
  if ((state.specVersion ?? 1)<3) return outputs;
  const narrated={ ...outputs, INGESTED:['work/input-document.json'], TIMED:['work/story.json','work/narration.json','work/timeline.json','work/voiced-narration.json','work/voice-report.json','work/speech-activity.json'],
    ANALYZED:[...outputs.ANALYZED!,'work/host-profile.json','work/host-rig.json','work/explanation-plan.json','previews/host-preview-sheet.png'],
    STORYBOARDED:[...outputs.STORYBOARDED!,'work/host-timeline.json'], DONE:[...outputs.DONE!,'output/host-profile.json','output/host-timeline.json','output/voice-report.json','output/explanation-plan.json','output/narration.json','output/speech-activity.json'] };
  if((state.specVersion??1)<4)return narrated;
  return {...narrated,STORYBOARDED:[...narrated.STORYBOARDED,...[...CINEMATIC_PLAN_FILES,'environment-provenance.json','animation-library.json'].map(n=>`work/${n}`)],
    SCENES_READY:[...outputs.SCENES_READY!,'work/performance-report.json'],DONE:[...narrated.DONE,...CINEMATIC_EXPORT_FILES.map(n=>`output/${n}`)]};
}
export function redact(message:string,config:FactoryConfig):string { for (const role of [...Object.values(config.models),config.voice]) { const key=process.env[role.api_key_env]; if (key) message=message.split(key).join('[REDACTED]'); } return message.replace(/Bearer\s+[^\s"']+/gi,'Bearer [REDACTED]'); }
async function inputFingerprint(root:string,config:FactoryConfig,hostHash:string):Promise<{all:string;narration:string}> {
  const mode=config.input.mode==='auto' ? await exists(safePath(root,config.input.script)) ? 'script' : await exists(safePath(root,config.input.narration)) ? 'wav' : 'srt' : config.input.mode;
  const autoPresence=config.input.mode==='auto'?await Promise.all([config.input.script,config.input.narration,config.input.subtitles].map(file=>exists(safePath(root,file)))):undefined;
  const relativeFiles=mode==='script'?[config.input.script]:mode==='wav'?[config.input.narration,config.input.subtitles]:[config.input.subtitles];
  const digest=async(relative:string)=>await exists(safePath(root,relative))?hash(await fs.readFile(await safeRealPath(root,relative))):null;
  const inputContents=await Promise.all(relativeFiles.map(async file=>[file,await digest(file)]));
  const repo=await findRepoRoot(),seriesFiles=config.project.series?await walk(safePath(path.join(repo,'series'),config.project.series)):[];
  const series=await Promise.all(seriesFiles.sort().map(async file=>[path.relative(root,file),hash(await fs.readFile(file))]));
  const cinematic=config.content.mode==='narrated-explainer'&&config.presentation.mode==='story-cinematic'
    ?{animation:ANIMATION_VERSION,director:DIRECTION_VERSION,models:CINEMATIC_MODEL_VERSION,props:PROP_BINDING_VERSION,seats:SEAT_SUPPORT_VERSION,environments:await environmentLibraryFingerprint(),
      creativePrompt:hash(await fs.readFile(path.join(await findRepoRoot(),'library/prompts/creative-director.md'))),
      authoredDirection:await exists(path.join(root,'input/art-direction.json'))?hash(await fs.readFile(path.join(root,'input/art-direction.json'))):null}:undefined;
  return {all:hash({version:4,hostRigIdentityVersion:config.content.mode==='narrated-explainer'?HOST_RIG_IDENTITY_VERSION:undefined,explanationVersion:config.content.mode==='narrated-explainer'?EXPLANATION_VERSION:undefined,storyMetadataVersion:config.content.mode==='narrated-explainer'?NARRATED_STORY_VERSION:undefined,mediaTextVersion:MEDIA_TEXT_VERSION,config,inputContents,autoPresence,source:await digest(config.input.source),hostHash,series,cinematic}),
    narration:hash({version:3,scriptParser:mode==='script'?SCRIPT_PARSER_VERSION:undefined,input:mode,autoPresence,paths:relativeFiles,inputContents,voice:mode==='wav'?undefined:config.voice,asr:mode==='wav'?config.asr:undefined,language:config.project.language,audio:config.audio,maxDuration:config.rendering.max_duration_seconds})};
}
async function assetFingerprint(root:string):Promise<string> {
  const files=[...await walk(path.join(root,'input/assets')),...await walk(path.join(root,'assets'))];
  const inputs=files.filter(file=>!/^assets\/(?:generated|resolved|host|actors)\//.test(path.relative(root,file).replace(/\\/g,'/')));
  return hash(await Promise.all(inputs.sort().map(async file=>[path.relative(root,file),hash(await fs.readFile(file))])));
}
async function artifactHashes(root:string,state:ProjectState):Promise<void> {
  for (const [stage,files] of Object.entries(stageOutputs(state))) if (stateIndex(stage as ProjectStatus)<=stateIndex(state.state)) for (const file of files) if (await exists(path.join(root,file))) state.artifactHashes[file]=hash(await fs.readFile(path.join(root,file)));
  if((state.specVersion??1)>=3&&stateIndex(state.state)>=stateIndex('INGESTED')&&await exists(path.join(root,'work/script.json'))){const input=await readJson<{mode:string}>(path.join(root,'work/input-document.json'));if(input.mode==='script')state.artifactHashes['work/script.json']=hash(await fs.readFile(path.join(root,'work/script.json')));}
  if(stateIndex(state.state)>=stateIndex('ANALYZED')) for(const file of await walk(path.join(root,'assets/host'))) state.artifactHashes[path.relative(root,file).replace(/\\/g,'/')]=hash(await fs.readFile(file));
  if((state.specVersion??1)>=4&&stateIndex(state.state)>=stateIndex('STORYBOARDED'))for(const [file,expected] of Object.entries(await actorAssetHashes(root))){
    if(hash(await fs.readFile(await safeRealPath(root,file)))!==expected)throw new Error(`Actor asset differs from its canonical cast: ${file}`);
    state.artifactHashes[file]=expected;
    if(state.state==='DONE')state.artifactHashes[`output/${file}`]=hash(await fs.readFile(await safeRealPath(root,`output/${file}`)));
  }
  if(stateIndex(state.state)>=stateIndex('TIMED')&&await exists(path.join(root,'work/voiced-narration.json'))) {const n=await readJson(path.join(root,'work/voiced-narration.json'),NarrationSchema);if(n.audioPath)state.artifactHashes[n.audioPath]=hash(await fs.readFile(await safeRealPath(root,n.audioPath)));}
  if(stateIndex(state.state)>=stateIndex('SCENES_READY')) for(const file of await walk(path.join(root,'scenes'))) if(/\.(html|js|css|json)$/.test(file)) state.artifactHashes[path.relative(root,file).replace(/\\/g,'/')]=hash(await fs.readFile(file));
  if(stateIndex(state.state)>=stateIndex('DRAFT_RENDERED')) for(const file of await walk(path.join(root,'previews'))) if(/\.(png|jpg|json)$/.test(file)) state.artifactHashes[path.relative(root,file).replace(/\\/g,'/')]=hash(await fs.readFile(file));
}
async function reconcile(root:string,state:ProjectState):Promise<void> {
  const initial=stateIndex(state.state); let target=initial;
  const editable=new Set([...(state.specVersion??1)<3?['work/story.json','work/narration.json','work/beats.json']:[],'work/character-bible.json','work/chapters.json','work/storyboard.json','work/asset-manifest.json']);
  for (const stage of States) {
    if (stateIndex(stage)>initial) break;
    for (const file of stageOutputs(state)[stage] ?? []) {
      if (!await exists(path.join(root,file))) {
        // Narration and its rich timeline are produced by ingest, before TIMED validates them.
        const producer = (state.specVersion ?? 1)<3 && ['work/narration.json','work/timeline.json'].includes(file) ? 'INGESTED' : stage;
        target=Math.min(target,Math.max(0,stateIndex(producer as ProjectStatus)-1)); continue;
      }
      const current=hash(await fs.readFile(path.join(root,file)));
      if (state.artifactHashes[file] && state.artifactHashes[file]!==current) {
        target=Math.min(target,Math.max(0,stateIndex(stage)-(editable.has(file)?0:1)));
        state.artifactHashes[file]=current;
      }
    }
  }
  if((state.specVersion??1)>=3&&initial>=stateIndex('INGESTED')){const input=await readJson<{mode:string}>(path.join(root,'work/input-document.json')).catch(()=>undefined);if(input?.mode==='script'&&(!await exists(path.join(root,'work/script.json'))||state.artifactHashes['work/script.json']&&hash(await fs.readFile(path.join(root,'work/script.json')))!==state.artifactHashes['work/script.json']))target=stateIndex('NEW');}
  if((state.specVersion??1)>=4&&initial>=stateIndex('STORYBOARDED')){
    try{for(const [file,expected] of Object.entries(await actorAssetHashes(root))){
      if(!await exists(path.join(root,file))||hash(await fs.readFile(await safeRealPath(root,file)))!==expected)target=Math.min(target,stateIndex('ANALYZED'));
      if(initial===stateIndex('DONE')&&(!await exists(path.join(root,'output',file))||hash(await fs.readFile(await safeRealPath(root,`output/${file}`)))!==expected))target=Math.min(target,stateIndex('QC_PASSED'));
    }}catch{target=Math.min(target,stateIndex('ANALYZED'));}
  }
  for(const [file,previous] of Object.entries(state.artifactHashes)) {
    if(!file.startsWith('assets/host/')&&!file.startsWith('work/voice/'))continue;
    if(!await exists(path.join(root,file))||hash(await fs.readFile(path.join(root,file)))!==previous){
      target=Math.min(target,stateIndex(file.startsWith('assets/host/')?'TIMED':'INGESTED'));
      if(file.startsWith('assets/host/'))state.approvals.host=false;
    }
  }
  if((state.specVersion??1)>=3&&initial>=stateIndex('TIMED')){const n=await readJson(path.join(root,'work/voiced-narration.json'),NarrationSchema).catch(()=>undefined),voice=await readJson(path.join(root,'work/voice-report.json'),VoiceReportSchema).catch(()=>undefined);if(n?.audioPath&&(!await exists(path.join(root,n.audioPath))||voice?.audioHash&&hash(await fs.readFile(await safeRealPath(root,n.audioPath)))!==voice.audioHash))target=Math.min(target,stateIndex('INGESTED'));}
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
  const voice=config.content.mode==='narrated-explainer'?await readJson(path.join(root,'work/voice-report.json'),VoiceReportSchema):undefined;
  const host=config.content.mode==='narrated-explainer'?await loadHost(root):undefined;
  const cast=actorDefinitions(storyboard);
  const hostSummary=host?`${cast.length?`Cast: ${cast.map(a=>`${a.name} (${a.id}; ${a.identity}; ${a.role})`).join('; ')}. Per-actor profiles and rigs: actor-cast.json; speech/action assignments: actor-timeline.json.\n\nSeed rig: ${host.profile.id}`:`Host: ${host.profile.id}`} v${host.profile.version}; rig ${host.rig.rigHash}.\n\nSynchronization: ${voice?.synchronization}; audio activity is not phoneme lip-sync.\n\nVoice: ${voice?.status}; source ${voice?.source}; provider ${voice?.provider??'input'}; voice ${voice?.voiceId??'default'}; hash ${voice?.audioHash??'none'}.\n\n`:'';
  const models=Object.entries(config.models).map(([role,m])=>`- ${role}: ${m.provider} / ${m.model}`).join('\n');
  const text=`# Production Report\n\n## Input\nProject: ${state.name}\n\nNarration: ${narration.mode}, ${(narration.durationMs/1000).toFixed(3)} seconds\n\nAudio: ${voice?voice.status==='ready'?'Ready spoken narration':'Silent draft / voice blocked':narration.audioPath?'User narration present':'SRT-only; no voice track supplied'}\n\n${hostSummary}## Models\n${models}\n\n## Storyboard\n${storyboard.shots.length} shots\n\n## Assets\n${assets.assets.length} resolved assets; ${assets.assets.filter(a=>a.status==='missing').length} missing\n\n## Review and repairs\nReview mode: ${review.mode ?? 'unspecified'}\n\nReview iterations: ${state.reviewIteration}\n\nRemaining issues: ${review.issues.length}\n\n${review.warnings.map(w=>`- ${w}`).join('\n')}\n\n## Render\n${config.rendering.final.width}×${config.rendering.final.height} at ${config.rendering.final.fps} fps\n\nRenderer: HyperFrames 0.8.96; post-processing: FFmpeg\n\n## QC\n${qc.pass ? 'PASS':'FAIL'}\n\n${JSON.stringify(qc,null,2)}\n\n## Costs\n${JSON.stringify(costs,null,2)}\n\n## Provenance\nThe selected narration is authoritative; source.md is optional supplemental data. Diagrams are conceptual visualizations. QC PASS reports technical measurements; visual/content acceptance requires the stated review mode and external acceptance evidence.\n\n${assets.assets.filter(a=>a.sourceUrl).map(a=>`- ${a.id}: ${a.sourceUrl}; ${a.license ?? 'license unspecified'}; ${a.author ?? ''}`).join('\n')}\n\n${research?.sources.map(s=>`- Research reference: ${s.sourceUrl}`).join('\n') ?? ''}\n`;
  await writeAtomic(path.join(root,'output/production-report.md'),text);
}
export async function runPipeline(projectRoot:string,options:PipelineOptions={}):Promise<ProjectState> {
  const resolved=path.resolve(projectRoot); if (!await exists(path.join(resolved,'project.yaml'))) throw new Error('Missing project.yaml; use video-factory new first');
  // Canonicalize Windows short paths and directory aliases before deriving asset-relative paths.
  const root=await fs.realpath(resolved);
  const release=await acquire(root); let store:ProductionStore|undefined; let config:FactoryConfig|undefined;
  try {
    // Recover an interrupted local artwork bundle before reading its storyboard
    // or reconciling cached artifact hashes.
    const {recoverCinematicArtworkTransactions}=await import('../director/artwork-repair.js');
    await recoverCinematicArtworkTransactions(root);
    config=await loadConfig(root); const state=await loadState(root); store=new ProductionStore(root); store.failInterruptedJobs();
    const hostHash=config.content.mode==='narrated-explainer'?await hostProfileFingerprint(root,config):'',fingerprints=await inputFingerprint(root,config,hostHash),fingerprint=fingerprints.all,assetHash=await assetFingerprint(root);
    if (options.force || (state.inputHash && state.inputHash!==fingerprint)) { state.state=!options.force&&state.narrationInputHash===fingerprints.narration&&stateIndex(state.state)>=stateIndex('TIMED')?'TIMED':'NEW'; state.reviewIteration=0; state.artifactHashes={}; state.approvals.storyboard=false; if(!state.locked.characterBible) state.approvals.characters=false; await writeJson(path.join(root,'work/scene-repair-budget.json'),{}); }
    if(state.hostInputHash!==hostHash){state.approvals.host=false;state.approvals.hostHash='';}
    state.specVersion=config.content.mode==='narrated-explainer'?(config.presentation.mode==='story-cinematic'?4:3):1;state.narrationInputHash=fingerprints.narration;state.hostInputHash=hostHash;
    if(state.assetInputHash && state.assetInputHash!==assetHash && stateIndex(state.state)>stateIndex('STORYBOARDED')) {state.state='STORYBOARDED';state.reviewIteration=0;await writeJson(path.join(root,'work/scene-repair-budget.json'),{});}
    state.inputHash=fingerprint;state.assetInputHash=assetHash; await reconcile(root,state);
    const router=new ModelRouter(config,root); const engine=new HyperFramesEngine(config,root);
    if (options.shotIds?.length) {
      if(stateIndex(state.state)<stateIndex('SCENES_READY')) throw new Error('Build all scenes before rebuilding selected shots');
      const board=await readJson(path.join(root,'work/storyboard.json'),StoryboardSchema); for(const id of options.shotIds) if(!board.shots.some(s=>s.id===id)) throw new Error(`Unknown shot: ${id}`);
      const chars=await readJson(path.join(root,'work/character-bible.json'),CharacterBibleSchema); const assets=await readJson(path.join(root,'work/asset-manifest.json'),AssetManifestSchema);
      await buildScenes(root,config,router,board,chars,assets,{shotIds:options.shotIds,force:true});
      await buildMaster(root,config,board,await readJson(path.join(root,config.content.mode==='narrated-explainer'?'work/voiced-narration.json':'work/narration.json'),NarrationSchema),assets); state.state='SCENES_READY'; state.reviewIteration=0;
    }
    await saveState(root,state); store.saveState(state);
    const until=options.until ?? 'DONE';
    while(stateIndex(state.state)<stateIndex(until)) {
      const next=States[stateIndex(state.state)+1]!; const job=store.beginJob(next);
      await appendLog(path.join(root,'logs/orchestrator.log'),{time:new Date().toISOString(),event:'start',state:next});
      try {
        const story=()=>readJson(path.join(root,'work/story.json'),StorySchema);
        const narration=()=>readJson(path.join(root,'work/narration.json'),NarrationSchema);
        const voiced=()=>config!.content.mode==='narrated-explainer'?readJson(path.join(root,'work/voiced-narration.json'),NarrationSchema):narration();
        const characters=()=>readJson(path.join(root,'work/character-bible.json'),CharacterBibleSchema);
        const beats=()=>readJson(path.join(root,'work/beats.json'),z.array(BeatSchema));
        const board=()=>readJson(path.join(root,'work/storyboard.json'),StoryboardSchema);
        const assets=()=>readJson(path.join(root,'work/asset-manifest.json'),AssetManifestSchema);
        switch(next) {
          case 'INGESTED': {
            if(config.content.mode==='legacy'){await ingestProject(root,config,router);break;}
            await prepareInput(root,config); break;
          }
          case 'TIMED': {
            if(config.content.mode==='narrated-explainer') {
              const input=await readJson<{mode:'script'|'wav'|'srt'}>(path.join(root,'work/input-document.json'));
              if(input.mode==='script') {
                const script=await readJson(path.join(root,'work/script.json'),ScriptDocumentSchema),n=await narrateScript(root,config,script);
                if(!n)throw new ApprovalRequired('voice',(await readJson(path.join(root,'work/voice-report.json'),VoiceReportSchema)).error);
                await writeJson(path.join(root,'work/narration.json'),n);
                await writeJson(path.join(root,'work/story.json'),await narratedStory(root,config,n));
                await writeJson(path.join(root,'work/timeline.json'),{version:2,mode:'script',durationMs:n.durationMs,segments:n.segments,words:n.words,audioPath:n.audioPath});
              } else {const result=await ingestProject(root,{...config,input:{...config.input,mode:input.mode}},router);await resolveVoice(root,config,result.narration);}
            }
            const n=await narration();if(n.durationMs>config.rendering.max_duration_seconds*1000)throw new Error('Narration exceeds configured video duration limit');
            if(!await exists(path.join(root,'work/timeline.json')))await writeJson(path.join(root,'work/timeline.json'),{durationMs:n.durationMs,segments:n.segments,words:n.words});break;
          }
          case 'ANALYZED': { if(config.content.mode==='narrated-explainer')await writeJson(path.join(root,'work/story.json'),await narratedStory(root,config,await narration())); await collectResearch(root,config); const result=await analyzeProject(root,config,router,await story(),await narration()); await writeJson(path.join(root,'work/story.json'),result.story); await writeJson(path.join(root,'work/character-bible.json'),result.characters); await writeJson(path.join(root,'work/characters.json'),result.characters); await writeJson(path.join(root,'work/chapters.json'),result.chapters);
            if(config.content.mode==='narrated-explainer') {const {profile,rig}=await compileHost(root,config,router);result.beats=await createExplanation(root,config,router,result.story,await narration(),result.beats,profile);
              const standard=['library/characters/MINI-ROBOT.md','library/characters/STICK-MAN.md'].includes(config.host.profile);
              if(standard){state.approvals.host=true;state.approvals.hostHash=rig.rigHash;}}
            await writeJson(path.join(root,'work/beats.json'),result.beats); break; }
          case 'STORYBOARDED': {
            if(config.content.mode==='narrated-explainer') {const {profile}=await loadHost(root);if(!state.approvals.host||!rigHashMatchesProfile(profile,state.approvals.hostHash??''))throw new ApprovalRequired('host');
              const plan=await readJson(path.join(root,'work/explanation-plan.json'),ExplanationPlanSchema);if(plan.contentIssues.some(i=>i.severity==='high'))throw new ApprovalRequired('source-review','Resolve conflicting narration/source facts before production');}
            if(config.workflow.require_character_approval && !state.approvals.characters) throw new ApprovalRequired('characters');
            const chars=await characters(); const n=await narration(); const b=await beats();
            const sb=state.locked.storyboard && await exists(path.join(root,'work/storyboard.json')) ? await readStoryboardForDirection(path.join(root,'work/storyboard.json'),state.locked) : await createStoryboard(root,config,router,await story(),n,chars,await readJson(path.join(root,'work/chapters.json'),z.array(ChapterSchema)),b);
            if(config.content.mode==='narrated-explainer'&&config.presentation.mode==='story-cinematic'){
              const lockedIds=new Set(sb.shots.filter(s=>state.locked.storyboard||(state.locked[s.id]??state.locked[`shot:${s.id}`]??s.locked)).map(s=>s.id));
              await prepareCinematicEnvironments(root,sb,lockedIds);await writeCinematicPlans(root,sb);
            }
            validateStoryboard(sb,n,b,chars); if(sb.shots.length>config.rendering.max_shots) throw new Error('Storyboard exceeds configured maximum shots');
            if(config.content.mode==='narrated-explainer'){const{profile,rig}=await loadHost(root);validateExplainerStoryboard(sb,n,b,profile,rig,config);const voice=await readJson(path.join(root,'work/voice-report.json'),VoiceReportSchema);await writeHostTimeline(root,sb,n,profile,rig,voice.synchronization);}
            await writeJson(path.join(root,'work/storyboard.json'),sb); await writeAtomic(path.join(root,'work/storyboard.md'),storyboardMarkdown(sb,b)); store.records('shots',sb.shots); break;
          }
          case 'ASSETS_READY': {
            if(config.content.mode==='narrated-explainer'&&config.presentation.mode==='story-cinematic'){
              const sb=await board();await prepareCinematicEnvironments(root,sb,new Set(sb.shots.map(s=>s.id)));
            }
            if(config.content.mode==='narrated-explainer'){const sb=await board(),n=await narration(),b=await beats(),{profile,rig}=await loadHost(root);validateExplainerStoryboard(sb,n,b,profile,rig,config);await writeHostTimeline(root,sb,n,profile,rig,(await readJson(path.join(root,'work/voice-report.json'),VoiceReportSchema)).synchronization);}
            if((config.workflow.require_storyboard_approval || !config.workflow.automatic) && !state.approvals.storyboard) throw new ApprovalRequired('storyboard');
            const result=await resolveAssets(root,config,await board(),await characters()); await writeJson(path.join(root,'work/asset-manifest.json'),result); await writeJson(path.join(root,'work/assets.json'),result); store.records('assets',result.assets); break;
          }
          case 'SCENES_READY': { const sb=await board(); const n=await voiced(); validateStoryboard(sb,n,await beats(),await characters()); const manifest=await assets(); await buildScenes(root,config,router,sb,await characters(),manifest); await buildMaster(root,config,sb,n,manifest); const validation=await engine.validate(); if(!validation.pass) throw new Error(`Master validation failed: ${validation.errors.join('\n')}`); break; }
          case 'DRAFT_RENDERED': { const sb=await board(), manifest=await assets(); await buildScenes(root,config,router,sb,await characters(),manifest); await buildMaster(root,config,sb,await voiced(),manifest); const validation=await engine.validate(); if(!validation.pass) throw new Error(`Master validation failed: ${validation.errors.join('\n')}`); const result=await retryRender(config,()=>engine.renderDraft()); store.render('draft',result.path); await createPreviews(root,config,sb); break; }
          case 'REVIEWED': { const result=await reviewProject(root,config,router,await board(),await story(),await characters(),await assets()); await writeJson(path.join(root,'work/review.json'),result); store.review(result); break; }
          case 'REPAIRED': {
            let review=await readJson(path.join(root,'work/review.json'),ReviewSchema);
            while(review.issues.some(i=>i.severity==='high') && state.reviewIteration<config.workflow.max_review_iterations) {
              await repairScenes(root,config,router,await board(),await characters(),await assets(),review.issues.filter(i=>i.severity==='high'));
              await buildMaster(root,config,await board(),await voiced(),await assets()); const validation=await engine.validate(); if(!validation.pass) throw new Error(`Repaired master invalid: ${validation.errors.join('\n')}`);
              await retryRender(config,()=>engine.renderDraft()); await createPreviews(root,config,await board());
              review=await reviewProject(root,config,router,await board(),await story(),await characters(),await assets()); await writeJson(path.join(root,'work/review.json'),review); state.reviewIteration++; store.review(review); await saveState(root,state);
            }
            if(review.issues.some(i=>i.severity==='high') || !review.pass) throw new Error('Review failed after the configured repair budget; edit or unlock the affected shots before resuming'); break;
          }
          case 'FINAL_RENDERED': { const review=await readJson(path.join(root,'work/review.json'),ReviewSchema); if(!review.pass) throw new Error('Final render requires a passing draft review');if(config.content.mode==='narrated-explainer'){try{await requireVoice(root,await voiced());}catch(error){throw new ApprovalRequired('voice',String(error));}}
            const result=await retryRender(config,()=>engine.renderFinal()); store.render('final',result.path); await produceMedia(root,config,await voiced(),await board(),await assets()); break; }
          case 'QC_PASSED': { const qc=await runQC(root,config,await voiced(),await board()); await writeJson(path.join(root,'output/qc-report.json'),qc); await report(root,config,state,router); if(!qc.pass) throw new Error(`Production QC failed: ${JSON.stringify(qc.issues)}`); break; }
          case 'DONE': { const names=['storyboard.json','storyboard.md','character-bible.json','timeline.json','asset-manifest.json',...(config.content.mode==='narrated-explainer'?['host-profile.json','host-timeline.json','voice-report.json','explanation-plan.json','narration.json','speech-activity.json']:[]),...(state.specVersion===4?CINEMATIC_EXPORT_FILES:[])];if(state.specVersion===4)await exportActorAssets(root);for(const name of names) await fs.copyFile(path.join(root,'work',name),path.join(root,'output',name)); await report(root,config,state,router); break; }
        }
        transition(state,next);if(next==='STORYBOARDED'||next==='ASSETS_READY')state.assetInputHash=await assetFingerprint(root); await artifactHashes(root,state); await saveState(root,state); store.saveState(state); store.finishJob(job); options.onProgress?.(state);
        await writeJson(path.join(root,'work/cost-report.json'),costSummary(router,config));
        const calls=path.join(root,'logs/model-calls.jsonl'); if(await exists(calls)) { const content=await fs.readFile(calls,'utf8'); for(const line of content.slice(0,content.lastIndexOf('\n')+1).split('\n').filter(Boolean)) store.modelCall(JSON.parse(line) as Record<string,unknown>); }
        await appendLog(path.join(root,'logs/orchestrator.log'),{time:new Date().toISOString(),event:'complete',state:next});
      } catch(error) {
        const message=redact(error instanceof Error ? error.message:String(error),config); state.error=message; await saveState(root,state); store.saveState(state); store.finishJob(job,message); store.recordError(next,message);
        await appendLog(path.join(root,'logs/errors/pipeline.jsonl'),{time:new Date().toISOString(),stage:next,error:message});
        if(error instanceof ApprovalRequired){state.waitingFor=error.kind==='host'?'host-approval':error.kind==='characters'?'characters-approval':error.kind==='storyboard'?'storyboard-approval':error.kind;await saveState(root,state);options.onProgress?.(state);return state;} throw new Error(message,{cause:error});
      }
    }
    return state;
  } finally { store?.close(); await release(); }
}
