import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import YAML from 'yaml';
import {beginReviewEvidence,captureReviewSource,commitReviewEvidence,recordFinalEvidence,requireCurrentPassingReview} from '../packages/review/evidence.js';
import type {FactoryConfig} from '../packages/core/config.js';
import type {Storyboard} from '../packages/core/schemas.js';

// Public checkpoint integration only. Synthetic draft/voice bytes are NOT media
// acceptance. Every executable/provider/browser boundary is closed before imports.
test('public source-only scene migration preserves accepted checkpoint and ledgers', async t => {
  assert.ok(process.execArgv.includes('--experimental-test-module-mocks'), 'run with module mocks; never silently skip');
  const forbiddenCalls: string[] = [];
  const forbidden = (name: string) => async (..._args: unknown[]): Promise<never> => {
    forbiddenCalls.push(name); throw new Error(`PROHIBITED_BOUNDARY:${name}`);
  };
  t.mock.method(globalThis, 'fetch', forbidden('network-fetch'));
  const subprocess = await import('node:child_process');
  t.mock.module('node:child_process', { namedExports: {
    ...subprocess,
    spawn: () => { forbiddenCalls.push('native-spawn'); throw new Error('PROHIBITED_BOUNDARY:native-spawn'); },
    spawnSync: () => { forbiddenCalls.push('native-spawnSync'); throw new Error('PROHIBITED_BOUNDARY:native-spawnSync'); },
    exec: () => { forbiddenCalls.push('native-exec'); throw new Error('PROHIBITED_BOUNDARY:native-exec'); },
    execSync: () => { forbiddenCalls.push('native-execSync'); throw new Error('PROHIBITED_BOUNDARY:native-execSync'); },
    execFile: () => { forbiddenCalls.push('native-execFile'); throw new Error('PROHIBITED_BOUNDARY:native-execFile'); },
    execFileSync: () => { forbiddenCalls.push('native-execFileSync'); throw new Error('PROHIBITED_BOUNDARY:native-execFileSync'); },
    fork: () => { forbiddenCalls.push('native-fork'); throw new Error('PROHIBITED_BOUNDARY:native-fork'); },
  } });
  const puppeteer = (await import('puppeteer-core')).default;
  t.mock.method(puppeteer, 'launch', forbidden('browser-launch'));
  t.mock.method(puppeteer, 'connect', forbidden('browser-connect'));
  const processBoundary = await import('../packages/render/process.js');
  t.mock.module(new URL('../packages/render/process.ts', import.meta.url).href, {
    namedExports: { ...processBoundary, execute: forbidden('native-execute') },
  });
  t.mock.module(new URL('../packages/review/index.ts', import.meta.url).href, {
    namedExports: {
      createPreviews: async (root:string,cfg:FactoryConfig,sb:Storyboard) => { const bytes=Buffer.from('SYNTHETIC PREVIEW');await fs.mkdir(path.join(root,'previews'),{recursive:true});await fs.writeFile(path.join(root,'previews/contact-sheet-global.jpg'),bytes);await fs.writeFile(path.join(root,'previews/manifest.json'),JSON.stringify({sourceInputHash:hash(await captureReviewSource(root,cfg,sb)),frames:[],actions:[],sheetHashes:{'previews/contact-sheet-global.jpg':hash(bytes)}})); },
      reviewProject: async (root:string,cfg:FactoryConfig,sb:Storyboard) => commitReviewEvidence(root,cfg,sb,await beginReviewEvidence(root,cfg,sb),{pass:true,issues:[],mode:'rule-based',warnings:[]}),
    },
  });
  t.mock.module(new URL('../packages/audio/index.ts', import.meta.url).href, {
    namedExports: { produceMedia: async (root:string) => {await fs.copyFile(path.join(root,'work/rendered.mp4'),path.join(root,'output/final.mp4'));await fs.writeFile(path.join(root,'output/final.srt'),'SYNTHETIC SUBTITLES');await fs.writeFile(path.join(root,'output/thumbnail.png'),'SYNTHETIC THUMBNAIL');} },
  });
  t.mock.module(new URL('../packages/qc/index.ts', import.meta.url).href, {
    namedExports: { runQC: async () => ({pass:true,issues:[],video:{synthetic:true}}) },
  });
  const { ConfigSchema,loadConfig } = await import('../packages/core/config.js');
  const { BeatSchema, StorySchema, StoryboardSchema, NarrationSchema } = await import('../packages/core/schemas.js');
  const { exists, hash, readJson, writeJson, walk } = await import('../packages/core/utils.js');
  const { ModelRouter } = await import('../packages/models/registry.js');
  const { HyperFramesEngine } = await import('../packages/render/hyperframes.js');
  const { compileHost, loadHost } = await import('../packages/host/index.js');
  const { groundedExplanation } = await import('../packages/explainer/plan.js');
  const { explainerShot, writeHostTimeline, validateExplainerStoryboard } = await import('../packages/explainer/storyboard.js');
  const { directCinematicShot, writeCinematicPlans } = await import('../packages/director/index.js');
  const { CINEMATIC_PLAN_FILES } = await import('../packages/director/schemas.js');
  const { actorAssetHashes } = await import('../packages/actors/assets.js');
  const { requireVoice } = await import('../packages/voice/index.js');
  const { loadState, saveState } = await import('../packages/orchestrator/state-machine.js');
  const { ProductionStore } = await import('../packages/orchestrator/store.js');
  const { serializeSrt } = await import('../packages/ingest/srt.js');
  const { renderCinematic } = await import('../library/shots/cinematic.js');
  const { secureSceneFiles } = await import('../packages/scenes/security.js');
  t.mock.method(ModelRouter.prototype, 'structured', forbidden('provider-structured'));
  t.mock.method(ModelRouter.prototype, 'text', forbidden('provider-text'));
  t.mock.method(ModelRouter.prototype, 'review', forbidden('provider-vision'));
  let draftCalls=0,finalCalls=0,validationCalls=0;
  t.mock.method(HyperFramesEngine.prototype,'validate',async()=>{validationCalls++;return {pass:true,errors:[],diagnostics:[]};});
  for(const method of ['snapshot','snapshots'] as const)t.mock.method(HyperFramesEngine.prototype,method,forbidden('engine-'+method));
  for(const method of ['renderDraft','renderFinal'] as const)t.mock.method(HyperFramesEngine.prototype,method,async function(this:InstanceType<typeof HyperFramesEngine>){
   const draft=method==='renderDraft';if(draft)draftCalls++;else finalCalls++;
   const out=path.join(this.projectRoot,draft?'work/draft.mp4':'work/rendered.mp4');await fs.writeFile(out,'SYNTHETIC CONTROLLED MEDIA '+method);return {path:out,profile:draft?'draft':'final',renderer:'SYNTHETIC',version:'TEST',code:0,cacheKey:hash(out)};
  });
  const archive=process.env.SCENE_MIGRATION_BASELINE!;assert.ok(archive);
  const oldEngine=await import(pathToFileURL(path.join(archive,'packages/render/hyperframes.ts')).href);
  t.mock.method(oldEngine.HyperFramesEngine.prototype,'validate',async()=>({pass:true,errors:[],diagnostics:[]}));
  for(const method of ['renderDraft','renderFinal','snapshot','snapshots'])t.mock.method(oldEngine.HyperFramesEngine.prototype,method,forbidden('archive-engine-'+method));
  const oldScenes=await import(pathToFileURL(path.join(archive,'packages/scenes/index.ts')).href);
  const {outdatedSceneInputs}=await import('../packages/scenes/index.js');
  const {currentDownload}=await import('../apps/server/artifacts.js');
  const {exportActorAssets}=await import('../packages/actors/assets.js');
  const {CINEMATIC_EXPORT_FILES}=await import('../packages/director/schemas.js');
  async function census(root:string){const rows:Record<string,string>={};for(const file of await walk(root))rows[path.relative(root,file).replaceAll('\\','/')]=hash(await fs.readFile(file));return rows;}
  const { runPipeline } = await import('../packages/orchestrator/pipeline.js');
  const base = process.env.SCENE_MIGRATION_EVIDENCE!;
  await fs.mkdir(base, { recursive: true });
  const cases=['EN-header','JA-label','KO-label','VI-public','EN-hidden','JA-hidden','locked-EN','VI-diagram'] as const;
  for (const mode of cases) await t.test(mode, async sub => {
    const root = await fs.mkdtemp(path.join(base, `migration-${mode}-`));
    sub.diagnostic(`retained fixture ${root}`);
    const config = ConfigSchema.parse({ project:{language:mode.startsWith('JA')?'ja':mode.startsWith('KO')?'ko':mode.startsWith('VI')?'vi':'en'},captions:{mode:'none'},input: { mode: 'srt' }, presentation: { mode:mode==='VI-diagram'?'diagram':'story-cinematic', character_mode:mode==='VI-diagram'?'presenter':'actors' },
      host: { profile: 'library/characters/STICK-MAN.md' }, voice: { tts_provider: 'none' },
      models: Object.fromEntries(['planner', 'storyboard', 'coder', 'repair', 'visual_review', 'fallback'].map(role => [role, { provider: 'mock' }])),
      workflow:{max_model_calls:30},retry: { structured_output: 0, render: 0 }, rendering: { final: { width: 1280, height: 720, fps: 30 } } });
    const text = 'Linh waits by a lever. Minh waits.';
    const segments = [{ id: 'cue', startMs: 0, endMs: 6000, text }];
    await fs.mkdir(path.join(root, 'input'), { recursive: true });
    await fs.mkdir(path.join(root, 'output'), { recursive: true });
    await fs.writeFile(path.join(root, config.input.subtitles), serializeSrt(segments));
    await fs.writeFile(path.join(root, 'project.yaml'), YAML.stringify(config));
    assert.equal((await runPipeline(root, { until: 'INGESTED' })).state, 'INGESTED');
    const initialized = await loadState(root);
    assert.equal(initialized.specVersion, mode==='VI-diagram'?3:4);
    assert.ok(initialized.inputHash && initialized.narrationInputHash && initialized.hostInputHash && initialized.assetInputHash);
    const router = new ModelRouter(config, root), { profile, rig } = await compileHost(root, config, router);
    const voiceBytes = Buffer.from('CONTROLLED VOICE HASH FIXTURE: NOT REAL AUDIO');
    const voicePath = 'work/voice/approved.wav';
    await fs.mkdir(path.join(root, 'work/voice'), { recursive: true });
    await fs.writeFile(path.join(root, voicePath), voiceBytes);
    const narration = NarrationSchema.parse({ mode: 'srt', durationMs: 6000, segments, words: [], audioPath: voicePath });
    const story = StorySchema.parse({ title: 'Fictional waiting', genre: 'fiction', story: text, style: { visual: 'vector' },
      characters: ['Linh', 'Minh'].map((name, i) => ({ id: `person${i}`, name, description: text })) });
    const rawBeat = BeatSchema.parse({ id: 'b1', chapterId: 'ch1', startMs: 0, endMs: 6000, segmentIds: ['cue'], narrationText: text, meaning: text, visualGoal: text, importance: 1 });
    const plan = groundedExplanation(story, narration, [rawBeat], profile, mode!=='VI-diagram'), semantic = plan.beats[0]!;
    if(mode!=='VI-diagram'){
    semantic.entities = [{ id: 'lever', kind: 'lever', label: 'lever', sourceRefs: semantic.sourceRefs }];
    semantic.relations = []; semantic.visualMethod = 'summary';
    semantic.sceneIntent!.acting = semantic.sceneIntent!.participants.map(p => ({ participantId: p.id, kind: 'hold', statement: p.role, sourceRefs: p.sourceRefs }));
    }
    const beat = { ...rawBeat, ...semantic };
    const shot = mode==='VI-diagram'?explainerShot('acting',0,6000,beat,narration,profile,rig):directCinematicShot(explainerShot('acting', 0, 6000, beat, narration, profile, rig), beat, profile, config, undefined, { seed: true });
    if(mode!=='VI-diagram'){
    for (const p of [shot.cinematic!.performance, ...(shot.cinematic!.actorScene?.supporting??[]).map(a => a.performance)]) {
      p.walks = []; p.gestures = []; p.expressions = []; p.gazes = []; p.turns = []; p.postures = [];
    }
    shot.host!.actions = [{ type: 'idle', startMs: 0, endMs: 6000 }];
    for (const a of shot.cinematic!.actorScene?.supporting??[]) a.actions = [{ type: 'idle', startMs: 0, endMs: 6000 }];
    shot.visualization!.events = [];
    shot.cinematic!.artDirection = { origin:'authored', brief: 'Controlled waiting scene', useEnvironment: true,
      palette: { background: '#FFFFFF', surface: '#EEEEEE', ink: '#111111', accent: '#AABBCC' }, showHeading:mode==='EN-header'||mode==='VI-public'||mode==='locked-EN',layers:[],models:mode.endsWith('-label')||mode.endsWith('-hidden')?shot.visualization!.parts.map(part=>({partId:part.id,sourceRefs:part.sourceRefs,svg:'<g class="motion"><rect x="-20" y="-20" width="40" height="40" fill="#FFFFFF"/></g>',labelMode:mode.endsWith('-hidden')?'none' as const:'renderer' as const,controlMode:'none' as const})):[] };
    }
    const board = StoryboardSchema.parse({ shots: [shot] });
    if(mode!=='VI-diagram')assert.ok(board.shots[0]!.cinematic!.actorScene!.primary);
    if(mode!=='VI-diagram')assert.equal(board.shots[0]!.cinematic!.actorScene!.supporting.length, 1);
    validateExplainerStoryboard(board, narration, [beat], profile, rig, config);
    const activity = { method: 'segment-draft' as const, windowMs: 20, intervals: [] };
    const manifest = { assets: [{ id: shot.assetNeeds.find(n=>n.localPath===rig.assetPath)!.id, type: 'image', path: rig.assetPath, hash: hash(await fs.readFile(path.join(root, rig.assetPath))), source: 'code' as const, status: 'approved' as const, shotIds: ['acting'] }] };
    for (const [name, value] of Object.entries({ 'story.json': story, 'narration.json': narration, 'voiced-narration.json': narration,
      'timeline.json': { durationMs: 6000, segments, words: [] }, 'beats.json': [beat],
      'chapters.json': [{ id: 'ch1', startMs: 0, endMs: 6000, title: story.title, summary: text, narrativePurpose: text, segmentIds: ['cue'] }],
      'character-bible.json': { characters: [] }, 'storyboard.json': board, 'asset-manifest.json': manifest,
      'explanation-plan.json': plan, 'environment-provenance.json': { version: 1, shots: [] }, 'speech-activity.json': activity,
      'voice-report.json': { version: 2, status: 'ready', source: 'input', provider: null, voiceId: null, narrationHash: hash(narration), audioPath: voicePath, audioHash: hash(voiceBytes),
        textPreserved: true, timingPreserved: true, inputAudioPreserved: true, synchronization: 'audio-activity', cues: [], warnings: [] },
      'review.json': { pass: true, issues: [], mode: 'rule-based', warnings: [] },
    })) await writeJson(path.join(root, 'work', name), value);
    await fs.writeFile(path.join(root, 'work/storyboard.md'), 'Controlled checkpoint; no visual acceptance');
    if(mode!=='VI-diagram')await writeCinematicPlans(root, board);
    await writeHostTimeline(root, board, narration, profile, rig, 'audio-activity');

    await oldScenes.buildScenes(root,config,router,board,{characters:[]},manifest);
    await oldScenes.buildMaster(root,config,board,narration,manifest);
    const oldRecord=await readJson<{inputHash:string;sourceHash:string;validated:boolean}>(path.join(root,'scenes/acting/scene.json'));
    assert.ok(oldRecord.validated&&oldRecord.inputHash&&oldRecord.sourceHash,'genuine archived public record');
    const sceneBefore=await census(path.join(root,'scenes/acting'));
    await writeJson(path.join(root,'archived-checkpoint.json'),{initialized,oldRecord,sceneBefore,configHash:hash(await fs.readFile(path.join(root,'project.yaml'))),boardHash:hash(board),narrationHash:hash(narration)});
    await fs.writeFile(path.join(root,'work/draft.mp4'),'SYNTHETIC RETAINED DRAFT');
    const preview=Buffer.from('SYNTHETIC RETAINED PREVIEW');await fs.writeFile(path.join(root,'previews/contact-sheet-global.jpg'),preview);
    await writeJson(path.join(root,'previews/manifest.json'),{frames:[],actions:[],sheetHashes:{'previews/contact-sheet-global.jpg':hash(preview)}});
    for(const name of ['final.mp4','final.srt','thumbnail.png'])await fs.writeFile(path.join(root,'output',name),'SYNTHETIC RETAINED '+name);
    await writeJson(path.join(root,'output/qc-report.json'),{pass:true,issues:[],video:{synthetic:true}});
    await fs.writeFile(path.join(root,'output/production-report.md'),'SYNTHETIC ACCEPTED CHECKPOINT: NOT MEDIA ACCEPTANCE');
    const names=['storyboard.json','storyboard.md','character-bible.json','timeline.json','asset-manifest.json','host-profile.json','host-timeline.json','voice-report.json','explanation-plan.json','narration.json','speech-activity.json',...CINEMATIC_EXPORT_FILES];
    for(const name of names)if(await exists(path.join(root,'work',name)))await fs.copyFile(path.join(root,'work',name),path.join(root,'output',name));
    if(mode==='VI-diagram')await writeJson(path.join(root,'work/performance-report.json'),{version:22,shots:[]});
    await exportActorAssets(root);
    await fs.writeFile(path.join(root,'work/script.json'),'SYNTHETIC SCRIPT IDENTITY');await fs.writeFile(path.join(root,'work/transcript.txt'),text);
    // Controlled revision boundary only; no pixel/media approval is claimed.
    const evidenceConfig=await loadConfig(root);
    await writeJson(path.join(root,'previews/manifest.json'),{sourceInputHash:hash(await captureReviewSource(root,evidenceConfig,board)),frames:[],actions:[],sheetHashes:{'previews/contact-sheet-global.jpg':hash(preview)}});
    await commitReviewEvidence(root,evidenceConfig,board,await beginReviewEvidence(root,evidenceConfig,board),{pass:true,issues:[],mode:'rule-based',warnings:[]});
    await fs.copyFile(path.join(root,'output/final.mp4'),path.join(root,'work/rendered.mp4'));
    await recordFinalEvidence(root,evidenceConfig,board,await requireCurrentPassingReview(root,evidenceConfig,board));
    for(const name of ['review-attempt.json','review-evidence.json','final-evidence.json'])await fs.copyFile(path.join(root,'work',name),path.join(root,'output',name));
    await loadHost(root);await requireVoice(root,narration);
    const state=await loadState(root);state.state=mode==='JA-label'?'SCENES_READY':mode==='KO-label'?'FINAL_RENDERED':'DONE';state.reviewIteration=2;
    state.approvals={...state.approvals,host:true,hostHash:rig.rigHash,characters:true,storyboard:true};
    state.artifactHashes={};
    const all=await census(root);
    for(const [file,value] of Object.entries(all))if(file.startsWith('work/')||file.startsWith('output/')||file.startsWith('assets/')||file.startsWith('scenes/')||file.startsWith('previews/'))state.artifactHashes[file]=value;
    await saveState(root,state);
    // These are fixture history, not real-provider calls or edits to any user project.
    await writeJson(path.join(root,'work/scene-repair-budget.json'),{acting:2});
    await writeJson(path.join(root,'work/qc-artwork-repairs.json'),{version:1,attempts:[{id:'00000000-0000-4000-8000-000000000001',inputHash:state.inputHash,assetInputHash:state.assetInputHash,iteration:2,status:'failed',createdAt:'2026-10-01T00:00:00Z',snapshot:'work/historical-fixture',shotIds:['acting'],files:{},issues:[],storyboardHash:hash(board),finishedAt:'2026-10-01T00:00:01Z',error:'SYNTHETIC retained consumed history'}]});
    await fs.writeFile(path.join(root,'work/model-calls.jsonl'),'');
    const history=Array.from({length:30},(_,i)=>({version:1,event:'completed',id:'synthetic-'+i,callId:'synthetic-'+i,requestHash:'retained-'+i,timestamp:'2026-10-01T00:00:00Z',role:'storyboard',routedRole:'storyboard',provider:'mock',model:'synthetic-history-only',operation:'structured',attempt:1,promptHash:'retained',status:i%2?'error':'success',durationMs:1,costUsd:0}));
    await fs.writeFile(path.join(root,'logs/model-calls.jsonl'),history.map(row=>JSON.stringify(row)).join('\n')+'\n');assert.equal(router.usageSummary().calls,30);
    const protectedFiles=['project.yaml','input/'+config.input.subtitles,'work/input-document.json','work/story.json','work/narration.json','work/voiced-narration.json','work/voice-report.json','work/speech-activity.json','work/voice/approved.wav','work/storyboard.json','work/storyboard.md','work/character-bible.json','work/beats.json','work/explanation-plan.json','work/host-profile.json','work/host-rig.json','work/host-timeline.json','work/asset-manifest.json','work/actor-cast.json','work/actor-timeline.json','work/script.json','work/transcript.txt','logs/model-calls.jsonl','work/model-calls.jsonl','work/scene-repair-budget.json','work/qc-artwork-repairs.json'];
    const identities:Record<string,string>={};for(const file of protectedFiles)if(await exists(path.join(root,file)))identities[file]=hash(await fs.readFile(path.join(root,file)));
    for(const [file,value]of Object.entries(all))if(file.startsWith('assets/'))identities[file]=value;
    const affected=['EN-header','JA-label','KO-label','locked-EN'].includes(mode);
    const beforeRead=await census(root);assert.deepEqual(await outdatedSceneInputs(root,config,board,{characters:[]},manifest),affected?['acting']:[]);assert.deepEqual(await census(root),beforeRead,'read-only checker');
    const gates=['final.mp4','final.srt','draft.mp4','thumbnail.png','production-report.md','qc-report.json'];
    for(const name of gates)assert.equal(await currentDownload(root,name),!affected,name);
    assert.deepEqual(await census(root),beforeRead,'download checks are read-only');
    if(mode==='EN-header'){
      const {buildServer}=await import('../apps/server/index.js');
      const blocked=forbidden('coordinator-operation');
      const app=await buildServer({repoRoot:process.cwd(),projectsRoot:base,coordinator:{createProject:blocked,getProjectStatus:async()=>({...await loadState(root),artifacts:{storyboard:board}}),runPipeline:blocked,approveProject:blocked,updateLocks:blocked,invalidateProject:blocked}});
      try{const name=path.basename(root);const response=await app.inject({url:'/api/projects/'+name+'/downloads/final.mp4'});assert.equal(response.statusCode,409);assert.equal(response.json().error.code,'STALE_ARTIFACT');
       const staticResponse=await app.inject({url:'/project-static/'+name+'/output/final.mp4'});assert.equal(staticResponse.statusCode,409);
       const detail=await app.inject({url:'/api/projects/'+name});assert.equal(detail.statusCode,200);const detailData=detail.json();assert.equal(detailData.cinematicMigration.required,true);assert.deepEqual(detailData.cinematicMigration.shotIds,['acting']);for(const key of ['composition','draft','final','contactSheet'])assert.equal(detailData.preview[key],null,key);assert.deepEqual(detailData.preview.shots.acting,{composition:null,frames:null});
       await writeJson(path.join(root,'api-observation.json'),{download:response.statusCode,static:staticResponse.statusCode,detail:detail.json().preview,knownGap:false});
      }finally{await app.close();}
    }
    const finalBefore=finalCalls,draftBefore=draftCalls;
    if(mode==='locked-EN'){
      state.locked.acting=true;await saveState(root,state);const lockBefore=await census(root);
      await assert.rejects(runPipeline(root,{until:'DONE'}),/locked/i);assert.deepEqual(await census(root),lockBefore,'lock fails before persistent writes');
    }else if(affected){
      const until=mode==='EN-header'?'ASSETS_READY':'SCENES_READY';
      const rewound=await runPipeline(root,{until});assert.equal(rewound.state,until);assert.equal(rewound.inputHash,initialized.inputHash);assert.equal(rewound.reviewIteration,2);assert.deepEqual(rewound.approvals,state.approvals);
      if(until==='ASSETS_READY'){assert.deepEqual(await census(path.join(root,'scenes/acting')),sceneBefore);assert.ok(!rewound.artifactHashes['output/final.mp4']);assert.deepEqual(await fs.readFile(path.join(root,'work/draft.mp4')),Buffer.from('SYNTHETIC RETAINED DRAFT'));assert.equal((await runPipeline(root,{until:'SCENES_READY'})).state,'SCENES_READY');}
      const rebuilt=await readJson<{inputHash:string;sourceHash:string}>(path.join(root,'scenes/acting/scene.json'));assert.notEqual(rebuilt.inputHash,oldRecord.inputHash);assert.notEqual(rebuilt.sourceHash,oldRecord.sourceHash);
      const result=await runPipeline(root,{until:'DONE'});assert.equal(result.state,'DONE');assert.equal(result.reviewIteration,2);assert.equal(result.inputHash,initialized.inputHash);assert.equal(finalCalls-finalBefore,1);assert.equal(draftCalls-draftBefore,1);
      assert.deepEqual(await outdatedSceneInputs(root,config,board,{characters:[]},manifest),[]);for(const name of gates)assert.equal(await currentDownload(root,name),true,name);
      const logs=await fs.readFile(path.join(root,'logs/orchestrator.log'),'utf8');assert.match(logs,/scene-input-migration/);assert.match(logs,/DONE/);
    }else{
      const result=await runPipeline(root,{until:'DONE'});assert.equal(result.state,'DONE');assert.equal(result.inputHash,initialized.inputHash);assert.equal(result.reviewIteration,2);assert.deepEqual(await census(path.join(root,'scenes/acting')),sceneBefore,'unaffected cache exact bytes retained');assert.equal(finalCalls,finalBefore);assert.equal(draftCalls,draftBefore);
    }
    for(const [file,value]of Object.entries(identities))assert.equal(hash(await fs.readFile(path.join(root,file))),value,'preserved '+file);
    assert.equal(router.usageSummary().calls,30,'all consumed model history retained; no new provider call');
    assert.equal(await exists(path.join(root,'.factory.lock')),false);
    // Malformed, missing and source-only modified current records must close every public media gate.
    if(mode==='EN-hidden'){
      const recordPath=path.join(root,'scenes/acting/scene.json'),record=await fs.readFile(recordPath);
      for(const defect of ['malformed','missing','altered-source']){
        if(defect==='malformed')await fs.writeFile(recordPath,'{');else if(defect==='missing')await fs.unlink(recordPath);else await fs.appendFile(path.join(root,'scenes/acting/scene.js'),'\n// altered bytes');
        const defectBefore=await census(root);for(const name of gates)assert.equal(await currentDownload(root,name),false,defect+' '+name);assert.deepEqual(await census(root),defectBefore);if(defect!=='altered-source')await fs.writeFile(recordPath,record);
      }
    }
    await writeJson(path.join(root,'migration-proof.json'),{mode,affected,archivedRecord:oldRecord,sceneBefore,identities,finalCalls:finalCalls-finalBefore,draftCalls:draftCalls-draftBefore,forbiddenCalls,mediaAcceptance:'NOTRUN'});
  });
  assert.deepEqual(forbiddenCalls,[]);
});
