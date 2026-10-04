import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import test, {type TestContext} from 'node:test';
import YAML from 'yaml';
import {ActingRepairSchema,actingRepairSchemaFor,applyActingRepair,fixedMotionFields} from '../packages/director/acting-repair.js';
import {createRequire} from 'node:module';
import {jsonSchemaFor,validateStructured} from '../packages/models/adapter.js';
import type {Shot,AssetManifest} from '../packages/core/schemas.js';
import type {ActingRepair} from '../packages/director/acting-repair.js';

// Independent contract/public-integration tests. Provider HTTP and all executable
// render/browser boundaries are controlled. Synthetic output is never media QA.
test('independent acting freeze repair: immutable contract and publication',async t=>{
  assert.ok(process.execArgv.includes('--experimental-test-module-mocks'));
  const native=await import('../packages/render/process.js');
  t.mock.module(new URL('../packages/render/process.ts',import.meta.url).href,{namedExports:{...native,execute:async()=>{throw new Error('FORBIDDEN_NATIVE_BOUNDARY');}}});
  const {ConfigSchema}=await import('../packages/core/config.js');
  const {BeatSchema,StorySchema,NarrationSchema,StoryboardSchema}=await import('../packages/core/schemas.js');
  const {compileHost}=await import('../packages/host/index.js');
  const {ModelRouter}=await import('../packages/models/registry.js');
  const {groundedExplanation}=await import('../packages/explainer/plan.js');
  const {explainerShot,validateExplainerStoryboard,writeHostTimeline}=await import('../packages/explainer/storyboard.js');
  const {directCinematicShot,writeCinematicPlans}=await import('../packages/director/index.js');
  const {writeJson,readJson,hash,walk,exists}=await import('../packages/core/utils.js');
  const {storyboardMarkdown}=await import('../packages/storyboard/markdown.js');
  const {repairCinematicArtwork}=await import('../packages/director/artwork-repair.js');
  const {buildScenes,repairScenes}=await import('../packages/scenes/index.js');
  const {HyperFramesEngine}=await import('../packages/render/hyperframes.js');
  for(const method of ['renderDraft','renderFinal','snapshot','snapshots'] as const)t.mock.method(HyperFramesEngine.prototype,method,async()=>{throw new Error(`FORBIDDEN_${method}`);});
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('UNEXPECTED_NETWORK');});
  const base=process.env.ACTING_FREEZE_TEST_EVIDENCE??os.tmpdir();await fs.mkdir(base,{recursive:true});
  const canonical=['storyboard.json','storyboard.md','story-direction.json','stage-plan.json','performance-plan.json','camera-plan.json','animation-library.json','host-timeline.json','actor-timeline.json','creative-storyboard-cache.json','creative-direction-report.json'];
  async function fixture(sub:TestContext){
    const root=await fs.mkdtemp(path.join(base,'acting-freeze-'));
    if(!process.env.ACTING_FREEZE_TEST_EVIDENCE)sub.after(()=>fs.rm(root,{recursive:true,force:true}));
    else sub.diagnostic(`retained isolated fixture ${root}`);
    const config=ConfigSchema.parse({input:{mode:'srt'},presentation:{mode:'story-cinematic',character_mode:'actors'},host:{profile:'library/characters/STICK-MAN.md'},retry:{structured_output:0,scene_repair:0,render:0},rendering:{final:{width:1280,height:720,fps:30}}});
    const router0=new ModelRouter(config,root),{profile,rig}=await compileHost(root,config,router0);
    const text='Lena waits by a table. Amir waits.';
    const narration=NarrationSchema.parse({mode:'srt',durationMs:6000,words:[],segments:[{id:'cue',startMs:0,endMs:6000,text}]});
    const story=StorySchema.parse({title:'Ordinary fictional waiting',genre:'fiction',story:text,style:{visual:'vector'},characters:['Lena','Amir'].map((name,i)=>({id:`person${i}`,name,description:text}))});
    const raw=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:6000,segmentIds:['cue'],narrationText:text,meaning:text,visualGoal:text,importance:1});
    const semantic=groundedExplanation(story,narration,[raw],profile,true).beats[0]!;
    semantic.entities=[];semantic.relations=[];semantic.visualMethod='summary';
    semantic.sceneIntent!.acting=semantic.sceneIntent!.participants.map(p=>({participantId:p.id,kind:'hold',statement:p.role,sourceRefs:p.sourceRefs}));
    const beat={...raw,...semantic};
    const shot=directCinematicShot(explainerShot('acting',0,6000,beat,narration,profile,rig),beat,profile,config,undefined,{seed:true});
    for(const p of [shot.cinematic!.performance,...shot.cinematic!.actorScene!.supporting.map(a=>a.performance)]){p.walks=[];p.gestures=[];p.expressions=[];p.gazes=[];p.turns=[];p.postures=[];}
    shot.host!.actions=[{type:'idle',startMs:0,endMs:6000}];
    for(const a of shot.cinematic!.actorScene!.supporting)a.actions=[{type:'idle',startMs:0,endMs:6000}];
    shot.visualization!.events=[];
    shot.cinematic!.artDirection={origin:'authored',brief:'Ordinary waiting actors',useEnvironment:false,palette:{background:'#FFFFFF',surface:'#EEEEEE',ink:'#111111',accent:'#AABBCC'},showHeading:false,layers:[],models:[]};
    const board=StoryboardSchema.parse({shots:[shot]});validateExplainerStoryboard(board,narration,[beat],profile,rig,config);
    const accepted=board.shots[0]!;
    config.models.storyboard={...config.models.storyboard,provider:'gateway',model:'isolated-acting-director',base_url:'https://acting-freeze.invalid/v1',api_key_env:'ACTING_FREEZE_UNUSED',timeout_ms:1000};
    const router=new ModelRouter(config,root);
    await fs.mkdir(path.join(root,'input'),{recursive:true});await fs.writeFile(path.join(root,'project.yaml'),YAML.stringify(config));
    for(const [name,value] of Object.entries({'narration.json':narration,'beats.json':[beat],'storyboard.json':board,'speech-activity.json':{method:'segment-draft',windowMs:20,intervals:[]},'voice-report.json':{version:2,status:'ready',source:'input',provider:null,voiceId:null,narrationHash:hash(narration),textPreserved:true,timingPreserved:true,inputAudioPreserved:true,synchronization:'audio-activity',cues:[],warnings:[]}}))await writeJson(path.join(root,'work',name),value);
    await fs.writeFile(path.join(root,'work/storyboard.md'),storyboardMarkdown(board,[beat]));await writeCinematicPlans(root,board);await writeHostTimeline(root,board,narration,profile,rig,'audio-activity');
    await writeJson(path.join(root,'work/creative-storyboard-cache.json'),{inputHash:'IMMUTABLE-INPUT',modelsHash:'IMMUTABLE-MODELS',storyboard:board});
    const manifest:AssetManifest={assets:[{id:accepted.assetNeeds.find(a=>a.localPath===rig.assetPath)!.id,type:'image',path:rig.assetPath,hash:hash(await fs.readFile(path.join(root,rig.assetPath))),source:'code',status:'approved',shotIds:[accepted.id]}]};
    await writeJson(path.join(root,'work/asset-manifest.json'),manifest);
    return {root,config,router,profile,rig,narration,beat,shot:accepted,board,manifest,characters:{characters:[]}};
  }
  type Fixture=Awaited<ReturnType<typeof fixture>>;
  const payload=(shot:Shot):ActingRepair=>({artDirection:structuredClone(shot.cinematic!.artDirection!),primary:{performance:{...structuredClone(shot.cinematic!.performance),expressions:[{startMs:0,endMs:2500,mood:'concerned'},{startMs:2500,endMs:6000,mood:'relieved'}]},actions:structuredClone(shot.host!.actions)}});
  function locked(shot:Shot){const x=structuredClone(shot);for(const p of [x.cinematic!.performance,...x.cinematic!.actorScene!.supporting.map(a=>a.performance)]){p.expressions=[];p.gazes=[];p.postures=[];p.gestures=[];}x.host!.actions=[];for(const a of x.cinematic!.actorScene!.supporting)a.actions=[];return x;}
  async function snapshot(f:Fixture){return Object.fromEntries(await Promise.all(canonical.map(async n=>[n,await exists(path.join(f.root,'work',n))?hash(await fs.readFile(path.join(f.root,'work',n))):null])));}
  function provider(sub:TestContext,response:unknown){let calls=0;sub.mock.method(globalThis,'fetch',async(input:string|URL|Request,init?:RequestInit)=>{assert.equal(String(input),'https://acting-freeze.invalid/v1/chat/completions');calls++;const b=JSON.parse(String(init?.body));assert.equal(b.model,'isolated-acting-director');return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(response)},finish_reason:'stop'}]}),{status:200});});return()=>calls;}
  const issue={shotId:'acting',type:'qc-frozen-frames',severity:'high' as const,description:'ACTUAL-CONTROLLED-FREEZE',repair:'Animate the sourced reaction'};
  const unit=await fixture(t);
  // Per-shot provider schema must agree with runtime parsing; validate JSON without
  // Ajv defaults, coercion or key removal as well as through the actual adapter.
  const schemaUnit=structuredClone(unit.shot); // Original uppercase palette must pass provider JSON unchanged.
  const Ajv=createRequire(import.meta.url)('ajv') as typeof import('ajv').default;
  const ajv=new Ajv({strict:false,allErrors:true,coerceTypes:false,useDefaults:false,removeAdditional:false});
  let jsonErrors:unknown; const acceptsJSON=(shot:Shot,value:unknown)=>{const check=ajv.compile(jsonSchemaFor(actingRepairSchemaFor(shot)));const accepted=check(value);jsonErrors=check.errors;return accepted;};
  await t.test('per-shot provider schema advertises only target-free reactions and actual cast IDs',()=>{
    const input=(jsonSchemaFor(actingRepairSchemaFor(schemaUnit)) as any).allOf[0];
    const gesture=input.properties.primary.properties.performance.properties.gestures.items;
    assert.equal(gesture.type,'object');assert.equal(gesture.additionalProperties,false);
    assert.equal(gesture.properties.action.const,'react');
    for(const key of ['target','destination','propId','contactMs','releaseMs','carryOffset'])assert.equal(key in gesture.properties,false,key);
    assert.equal(input.properties.supporting.items.properties.id.const,schemaUnit.cinematic!.actorScene!.supporting[0]!.character.id);
    for(const field of ['script','execute','onclick']){const p=payload(schemaUnit);(p.primary!.performance as any)[field]='bad';assert.equal(acceptsJSON(schemaUnit,p),false);assert.equal(actingRepairSchemaFor(schemaUnit).safeParse(p).success,false);}
  });
  await t.test('retained actual native invalid response is rejected by converted JSON and adapter without stripping/coercion',async sub=>{
    const file=process.env.ACTING_REPAIR_RETAINED_ATTEMPT;
    if(!file){sub.skip('historical native attempt is external; set ACTING_REPAIR_RETAINED_ATTEMPT to inspect it');return;}
    const bytes=await fs.readFile(file),saved=JSON.parse(bytes.toString()),shot=saved.request.context.shot as Shot,response=saved.response;
    assert.equal(saved.status,'domain-rejected');assert.match(saved.error,/unsupported gesture/);
    assert.equal(response.primary.performance.gestures.filter((g:any)=>g.action==='react'&&g.target).length,3);
    const untouched=JSON.stringify(response),schema=actingRepairSchemaFor(shot),parsed=schema.safeParse(response);
    assert.equal(acceptsJSON(shot,response),false);assert.equal(parsed.success,false);
    if(!parsed.success)assert.ok(parsed.error.issues.some(i=>i.code==='unrecognized_keys'&&i.path.includes('gestures')));
    assert.throws(()=>validateStructured({text:JSON.stringify(response)},schema),/requested schema/);
    assert.equal(JSON.stringify(response),untouched);assert.ok((await fs.readFile(file)).equals(bytes));
    sub.diagnostic(`retained actual attempt SHA256 ${hash(bytes)}; three target-bearing reactions rejected before domain publication`);
  });
  await t.test('target-free reactions with disjoint idle intervals pass schema, original helper and canonical validator',()=>{
    const p=payload(schemaUnit);p.primary!.performance.gestures=[{id:'new-reaction',action:'react',hand:'left',startMs:1000,endMs:2000}];
    p.primary!.actions=[{type:'idle',hand:'left',startMs:0,endMs:1000},{type:'react',hand:'left',startMs:1000,endMs:2000,narrationAnchor:'cue'},{type:'idle',hand:'left',startMs:2000,endMs:6000},{type:'idle',hand:'right',startMs:0,endMs:6000}];
    assert.equal(acceptsJSON(schemaUnit,p),true,JSON.stringify(jsonErrors));
    const result=applyActingRepair(schemaUnit,actingRepairSchemaFor(schemaUnit).parse(p));assert.deepEqual(locked(result),locked(schemaUnit));
    assert.doesNotThrow(()=>validateExplainerStoryboard({shots:[result]},unit.narration,[unit.beat],unit.profile,unit.rig,unit.config));
    for(const mode of ['overlap','hand','clock'] as const){const bad=structuredClone(p);if(mode==='overlap')bad.primary!.actions.push({type:'idle',startMs:0,endMs:6000});if(mode==='hand')bad.primary!.actions[1]!.hand='right';if(mode==='clock')bad.primary!.actions[1]!.startMs++;
      const rejected=applyActingRepair(schemaUnit,actingRepairSchemaFor(schemaUnit).parse(bad));
      assert.throws(()=>validateExplainerStoryboard({shots:[rejected]},unit.narration,[unit.beat],unit.profile,unit.rig,unit.config),mode);
    }
  });
  await t.test('new reaction binding fields and unknown keys are rejected rather than stripped',()=>{
    for(const extra of [{target:{x:100,y:200}},{destination:{x:300,y:400}},{propId:'new-prop'},{contactMs:1200},{releaseMs:1500},{carryOffset:{x:1,y:2}},{execute:'bad'}]){
      const p=payload(schemaUnit);p.primary!.performance.gestures=[{id:'new-react',action:'react',startMs:1000,endMs:2000,...extra}];const before=JSON.stringify(p);
      assert.equal(acceptsJSON(schemaUnit,p),false);assert.equal(actingRepairSchemaFor(schemaUnit).safeParse(p).success,false);assert.equal(JSON.stringify(p),before);
    }
    const p=payload(schemaUnit);(p.primary!.performance.gestures as unknown[])=[{id:'new-react',action:'react',startMs:'1000',endMs:2000}];assert.equal(acceptsJSON(schemaUnit,p),false);assert.equal(actingRepairSchemaFor(schemaUnit).safeParse(p).success,false);
  });
  await t.test('protected point/contact/carry are advertised exactly and cannot gain targets or change any protected field',()=>{
    const s=structuredClone(schemaUnit);
    s.cinematic!.performance.gestures=[
      {id:'point-original',action:'point',hand:'left',startMs:0,endMs:800,target:{x:300,y:400}},
      {id:'contact-original',action:'operate',hand:'right',startMs:900,endMs:1700,target:{x:400,y:410},contactMs:1200},
      {id:'carry-original',action:'carry',hand:'right',startMs:1800,endMs:3000,target:{x:400,y:410},destination:{x:500,y:410},propId:'notebook',contactMs:1900,releaseMs:2900,carryOffset:{x:2,y:3}},
    ];
    const p=payload(s);assert.equal(acceptsJSON(s,p),true,JSON.stringify(jsonErrors));assert.doesNotThrow(()=>applyActingRepair(s,actingRepairSchemaFor(s).parse(p)));
    for(let i=0;i<3;i++)for(const key of Object.keys(p.primary!.performance.gestures[i]!)){
      const bad=structuredClone(p),g=bad.primary!.performance.gestures[i]! as any,old=g[key];g[key]=typeof old==='number'?old+0.000002:typeof old==='string'?old+'-changed':{...old,x:old.x+0.000002};
      assert.equal(acceptsJSON(s,bad),false,`${i}:${key}`);assert.equal(actingRepairSchemaFor(s).safeParse(bad).success,false,`${i}:${key}`);
    }
    for(const mode of ['removed','duplicated','reordered']){const bad=structuredClone(p);if(mode==='removed')bad.primary!.performance.gestures.shift();if(mode==='duplicated')bad.primary!.performance.gestures.push(structuredClone(bad.primary!.performance.gestures[0]!));if(mode==='reordered')bad.primary!.performance.gestures.reverse();assert.throws(()=>applyActingRepair(s,actingRepairSchemaFor(s).parse(bad)),mode==='duplicated'?/introduced an unsupported gesture/:/changed a protected gesture/);}
  });
  await t.test('only actual supporting IDs allowed; duplicates rejected; null/absent primary and zero cast cannot gain actors',()=>{
    const p=payload(schemaUnit),a=schemaUnit.cinematic!.actorScene!.supporting[0]!;
    p.supporting=[{id:'unknown-actor',performance:structuredClone(a.performance),actions:structuredClone(a.actions)}];assert.equal(acceptsJSON(schemaUnit,p),false);assert.equal(actingRepairSchemaFor(schemaUnit).safeParse(p).success,false);
    p.supporting[0]!.id=a.character.id;p.supporting.push(structuredClone(p.supporting[0]!));assert.equal(actingRepairSchemaFor(schemaUnit).safeParse(p).success,false,'duplicate refinement retained');
    const noPrimary=structuredClone(schemaUnit);noPrimary.cinematic!.actorScene!.primary=null;assert.equal(acceptsJSON(noPrimary,payload(noPrimary)),false);assert.equal(actingRepairSchemaFor(noPrimary).safeParse(payload(noPrimary)).success,false);
    const absent=structuredClone(schemaUnit);absent.host!.presence='absent';assert.throws(()=>applyActingRepair(absent,actingRepairSchemaFor(absent).parse(payload(absent))),/absent\/null/);
    const empty=structuredClone(noPrimary);empty.cinematic!.actorScene!.supporting=[];assert.equal(acceptsJSON(empty,{artDirection:p.artDirection,supporting:[{id:a.character.id,performance:a.performance,actions:a.actions}]}),false);
    const noCast=structuredClone(schemaUnit);delete noCast.cinematic!.actorScene;assert.throws(()=>actingRepairSchemaFor(noCast),/existing actor scene/);
  });
  await t.test('zero-actor and presenter freeze feedback retains artwork guidance; real cast receives acting guidance',async()=>{
    const {frozenArtworkIssues}=await import('../packages/qc/artwork-repair.js');
    const qc={pass:false,video:{synthetic:true},issues:[{type:'frozen-frames',severity:'high',description:'Measured',startMs:100,endMs:3000}]};
    const actor=frozenArtworkIssues(qc,{shots:[schemaUnit]},6000,()=>false)!;assert.match(actor[0]!.repair,/sourced actor reaction/);
    const empty=structuredClone(schemaUnit);empty.cinematic!.actorScene!.primary=null;empty.cinematic!.actorScene!.supporting=[];
    const presenter=structuredClone(schemaUnit);delete presenter.cinematic!.actorScene;
    const e=frozenArtworkIssues(qc,{shots:[empty]},6000,()=>false)!,old=frozenArtworkIssues(qc,{shots:[presenter]},6000,()=>false)!;
    assert.equal(e[0]!.repair,old[0]!.repair);assert.match(e[0]!.repair,/existing sourced explanation/);assert.doesNotMatch(e[0]!.repair,/sourced actor reaction/);
  });
  await t.test('runtime actor request supplies dynamic JSON, binding and idle/hand/clock prompt; no canonical publication',async sub=>{
    const f=await fixture(sub),before=await snapshot(f),p=payload(f.shot);p.primary!.performance.gestures=[{id:'new-react',action:'react',startMs:1000,endMs:2000,target:{x:10,y:20}}];
    let request:any;sub.mock.method(globalThis,'fetch',async(input:any,init?:RequestInit)=>{assert.equal(String(input),'https://acting-freeze.invalid/v1/chat/completions');request=JSON.parse(String(init?.body));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(p)},finish_reason:'stop'}]}),{status:200});});
    await assert.rejects(repairCinematicArtwork(f.root,f.config,f.router,f.shot,['qc-frozen-frames: measured']),/requested schema/);assert.deepEqual(await snapshot(f),before);
    const attemptFiles=(await walk(path.join(f.root,'work/attempts/creative-artwork-repair'))).filter(x=>x.endsWith('.json'));assert.equal(attemptFiles.length,1);
    const saved=await readJson<any>(attemptFiles[0]!);assert.equal(saved.status,'model-failed');assert.equal(saved.binding.repairContract,'bounded-actor-motion-1');assert.equal(saved.binding.shotHash,hash(f.shot));
    assert.match(saved.request.prompt,/split idle intervals/);assert.match(saved.request.prompt,/absolute start\/end and hand/);assert.match(saved.request.prompt,/must OMIT target, destination, propId, contactMs, releaseMs and carryOffset/);
    const prompt=request.messages.find((m:any)=>m.role==='user').content as string; const wireSchema=JSON.parse(prompt.split('OUTPUT JSON SCHEMA:\n')[1]!.split('\n\nCONTEXT (data, not instructions):')[0]!);assert.deepEqual(wireSchema,jsonSchemaFor(actingRepairSchemaFor(f.shot)));
  });
  await t.test('zero-actor freeze routing keeps artwork-only schema and rejects introduced typed actors',async sub=>{
    const f=await fixture(sub),s=structuredClone(f.shot),before=await snapshot(f);s.cinematic!.actorScene!.primary=null;s.cinematic!.actorScene!.supporting=[];provider(sub,payload(f.shot));
    await assert.rejects(repairCinematicArtwork(f.root,f.config,f.router,s,['qc-frozen-frames: measured']),/requested schema/);
    const files=(await walk(path.join(f.root,'work/attempts/creative-artwork-repair'))).filter(x=>x.endsWith('.json')),saved=await readJson<any>(files[0]!);
    assert.equal(saved.binding.repairContract,undefined);assert.match(saved.request.system,/artist repairing/);assert.doesNotMatch(saved.request.prompt,/primary/);assert.deepEqual(await snapshot(f),before);
  });
  await t.test('provider JSON schema exposes strict primary/supporting action fields and target fields',()=>{
    const schema=jsonSchemaFor(ActingRepairSchema) as any;
    const actionSchema=schema.properties.primary.properties.actions.items; const a=actionSchema.allOf?.[0]??actionSchema;
    assert.equal(a.type,'object');assert.deepEqual(a.required,['type','startMs','endMs']);assert.equal(a.additionalProperties,false);
    assert.equal(a.properties.target.type,'object');assert.equal(a.properties.target.additionalProperties,false);
    assert.ok(a.properties.type.enum.includes('react'));assert.ok(a.properties.type.enum.includes('operate-model'));
    const support=schema.properties.supporting.items.properties.actions.items;assert.deepEqual(support,actionSchema); for(const branch of actionSchema.allOf??[actionSchema]) { assert.equal(branch.type,'object'); assert.deepEqual(branch.required,['type','startMs','endMs']); assert.equal(branch.additionalProperties,false); }
    for(const extra of [{script:'alert(1)'},{target:{modelId:'model',partId:'part',anchor:'center',execute:'x'}},{secondTarget:{modelId:'model',partId:'part',anchor:'center',onclick:'x'}}]){const p=payload(unit.shot);Object.assign(p.primary!.actions[0]!,extra);assert.equal(ActingRepairSchema.safeParse(p).success,false);}
    const p=payload(unit.shot);p.primary!.actions[0]!.endMs=0;assert.equal(ActingRepairSchema.safeParse(p).success,false,'interval refinement retained');
  });
  await t.test('primary and supporting expressions/gazes/postures/react tracks change without touching locked shot/cast/source/clock',()=>{
    const original=structuredClone(unit.shot),p=payload(original),support=original.cinematic!.actorScene!.supporting[0]!;
    p.primary!.performance.gazes=[{startMs:0,endMs:6000,target:{x:300,y:200}}];p.primary!.performance.postures=[{startMs:100,endMs:900,pose:'lean',leanDeg:5}];p.primary!.performance.gestures=[{id:'reaction',action:'react',startMs:1000,endMs:2000}];
    p.primary!.actions=[{type:'idle',startMs:0,endMs:1000},{type:'react',startMs:1000,endMs:2000,narrationAnchor:'cue'},{type:'idle',startMs:2000,endMs:6000}];
    p.supporting=[{id:support.character.id,performance:{...structuredClone(support.performance),expressions:[{startMs:0,endMs:6000,mood:'curious'}],gazes:[{startMs:100,endMs:800,target:{x:500,y:200}}],postures:[{startMs:100,endMs:800,pose:'lean',leanDeg:-4}],gestures:[{id:'support-react',action:'react',startMs:1000,endMs:2000}]},actions:[{type:'idle',startMs:0,endMs:1000},{type:'react',startMs:1000,endMs:2000,narrationAnchor:'cue'},{type:'idle',startMs:2000,endMs:6000}]}];
    const result=applyActingRepair(original,p);assert.deepEqual(original,unit.shot);assert.deepEqual(locked(result),locked(original));assert.deepEqual(result.cinematic!.performance,p.primary!.performance);assert.deepEqual(result.cinematic!.actorScene!.supporting[0]!.performance,p.supporting[0]!.performance);assert.notEqual(result,original);
  });
  for(const field of fixedMotionFields)await t.test(`reject fixed performance ${field}`,()=>{
    const p=payload(unit.shot);const perf=p.primary!.performance as any;const old=perf[field];perf[field]=typeof old==='string'?`${old}-changed`:typeof old==='number'?old+1:Array.isArray(old)?[...old,{invalid:true}]:old&&typeof old==='object'?{...old,invalid:true}:field==='facing'?'left':{invalid:true};assert.throws(()=>applyActingRepair(unit.shot,p));
  });
  for(const [label,change] of [
    ['duplicate support',(p:ActingRepair)=>{const a=unit.shot.cinematic!.actorScene!.supporting[0]!;const x={id:a.character.id,performance:structuredClone(a.performance),actions:structuredClone(a.actions)};p.supporting=[x,structuredClone(x)];}],
    ['unknown actor',(p:ActingRepair)=>{p.supporting=[{id:'unknown',performance:structuredClone(p.primary!.performance),actions:structuredClone(p.primary!.actions)}];}],
    ['new target gesture',(p:ActingRepair)=>{p.primary!.performance.gestures=[{id:'react',action:'react',startMs:0,endMs:1000,target:{x:100,y:100}}];}],
    ['new prop contact',(p:ActingRepair)=>{p.primary!.performance.gestures=[{id:'contact',action:'react',startMs:0,endMs:1000,propId:'invented',contactMs:300}];}],
    ['new action target',(p:ActingRepair)=>{p.primary!.actions=[{type:'react',startMs:0,endMs:1000,target:{modelId:'new',partId:'new',anchor:'center'}}];}],
    ['environment source',(p:ActingRepair)=>{p.artDirection.useEnvironment=!p.artDirection.useEnvironment;}],
    ['extra envelope',(p:ActingRepair)=>{(p as any).camera={x:3};}],
    ['extra performance code',(p:ActingRepair)=>{(p.primary!.performance as any).script='execute';}],
  ] as const)await t.test(`reject ${label}`,()=>{const p=payload(unit.shot);change(p);assert.throws(()=>applyActingRepair(unit.shot,p));});
  await t.test('original non-idle actions and contact gestures are exact including multiplicity/order',()=>{
    const s=structuredClone(unit.shot);s.host!.actions=[{type:'point',startMs:0,endMs:900,narrationAnchor:'cue',target:{modelId:'m',partId:'p',anchor:'center'}},{type:'react',startMs:900,endMs:1500,narrationAnchor:'cue'},{type:'idle',startMs:1500,endMs:6000}];s.cinematic!.performance.gestures=[{id:'point',action:'point',startMs:0,endMs:900,target:{x:300,y:400}},{id:'contact',action:'operate',startMs:1600,endMs:2500,contactMs:2000,target:{x:400,y:400}}];
    assert.doesNotThrow(()=>applyActingRepair(s,payload(s)));
    for(const mutate of [(p:ActingRepair)=>p.primary!.actions.splice(0,1),(p:ActingRepair)=>p.primary!.actions.reverse(),(p:ActingRepair)=>{p.primary!.actions[1]!.endMs++;},(p:ActingRepair)=>{p.primary!.performance.gestures[1]!.contactMs!++;},(p:ActingRepair)=>p.primary!.performance.gestures.push(structuredClone(s.cinematic!.performance.gestures[0]!))]){const p=payload(s);mutate(p);assert.throws(()=>applyActingRepair(s,p));}
  });
  await t.test('metadata-only artwork/actions/renaming/implicit hand and track reordering do not count as repair',()=>{
    const s=structuredClone(unit.shot);s.cinematic!.performance.gestures=[{id:'old',action:'react',startMs:0,endMs:1000}];s.cinematic!.performance.expressions=[{startMs:0,endMs:1000,mood:'neutral'},{startMs:1000,endMs:6000,mood:'concerned'}];
    for(const mode of ['art','rename','hand','order','actions']){const p=payload(s);p.primary!.performance=structuredClone(s.cinematic!.performance);if(mode==='art')p.artDirection.brief='changed metadata';if(mode==='rename')p.primary!.performance.gestures[0]!.id='new';if(mode==='hand')p.primary!.performance.gestures[0]!.hand='right';if(mode==='order')p.primary!.performance.expressions.reverse();if(mode==='actions')p.primary!.actions=[{type:'idle',startMs:0,endMs:3000},{type:'idle',startMs:3000,endMs:6000}];assert.throws(()=>applyActingRepair(s,p),/actual typed actor motion/);}
  });
  await t.test('null/absent primary cannot be introduced',()=>{for(const mode of ['null','absent']){const s=structuredClone(unit.shot);if(mode==='null')s.cinematic!.actorScene!.primary=null;else s.host!.presence='absent';assert.throws(()=>applyActingRepair(s,payload(s)),/absent\/null/);}});
  await t.test('typed actor freeze schema selected; unsafe SVG/current domain rejected without canonical writes',async sub=>{
    const f=await fixture(sub),before=await snapshot(f),p=payload(f.shot);p.artDirection.layers=[{id:'attack',plane:'background',role:'decoration',svg:'<script>alert(1)</script>',keyframes:[{atMs:0,x:0,y:0,scale:1,rotation:0,opacity:1}]}];const calls=provider(sub,p);await assert.rejects(repairCinematicArtwork(f.root,f.config,f.router,f.shot,['qc-frozen-frames: measured unplanned freeze']),/script|executable/i);assert.equal(calls(),1);assert.deepEqual(await snapshot(f),before);
  });
  await t.test('nonfreeze actor path retains art-only schema; actor tracks rejected',async sub=>{const f=await fixture(sub),before=await snapshot(f);provider(sub,payload(f.shot));await assert.rejects(repairCinematicArtwork(f.root,f.config,f.router,f.shot,['caption overlap']),/requested schema/);assert.deepEqual(await snapshot(f),before);});
  for(const mode of ['commit','runtime-fail','lock','ceiling','default-zero'] as const)await t.test(`public repairScenes actor freeze ${mode}`,async sub=>{
    const f=await fixture(sub),configBefore=structuredClone(f.config),original=structuredClone(f.shot),yamlBefore=await fs.readFile(path.join(f.root,'project.yaml'));sub.mock.method(HyperFramesEngine.prototype,'validate',async()=>({pass:true,errors:[]}));await buildScenes(f.root,f.config,f.router,f.board,f.characters,f.manifest);
    const before=await snapshot(f),htmlBefore=hash(await fs.readFile(path.join(f.root,`scenes/${f.shot.id}/index.html`)));const scriptBeforeText=await fs.readFile(path.join(f.root,'scenes',f.shot.id,'scene.js'),'utf8'); const scriptBefore=hash(scriptBeforeText),recordBefore=await readJson<any>(path.join(f.root,'scenes',f.shot.id,'scene.json')); const p=payload(f.shot),calls=provider(sub,p);
    if(mode==='lock')await writeJson(path.join(f.root,'project-state.json'),{locked:{[`scene:${f.shot.id}`]:true}});
    if(mode==='ceiling'){await fs.mkdir(path.join(f.root,'logs'),{recursive:true});f.config.workflow.max_model_calls=1;await fs.appendFile(path.join(f.root,'logs/model-calls.jsonl'),JSON.stringify({version:1,event:'started',id:'existing',callId:'existing',timestamp:new Date().toISOString(),status:'pending',role:'storyboard',routedRole:'storyboard',requestHash:'existing-request',promptHash:'existing-prompt',operation:'structured',attempt:1,provider:'gateway',model:'isolated-acting-director'})+'\n'+JSON.stringify({version:1,event:'completed',id:'end',callId:'existing',timestamp:new Date().toISOString(),status:'success',role:'storyboard',routedRole:'storyboard',requestHash:'existing-request',promptHash:'existing-prompt',operation:'structured',attempt:1,provider:'gateway',model:'isolated-acting-director'})+'\n');}
    if(mode==='runtime-fail')sub.mock.method(HyperFramesEngine.prototype,'validate',async()=>({pass:false,errors:['CONTROLLED-RUNTIME-REJECTION']}));
    const options=mode==='default-zero'?{}:{sceneRepairAttempts:1};
    if(mode==='commit'){
      await repairScenes(f.root,f.config,f.router,f.board,f.characters,f.manifest,[issue],options);assert.equal(calls(),1);const after=await readJson(path.join(f.root,'work/storyboard.json'),StoryboardSchema);assert.deepEqual(after.shots[0]!.cinematic!.performance.expressions,p.primary!.performance.expressions);const persistedOriginal=JSON.parse(JSON.stringify(original)) as Shot; persistedOriginal.cinematic!.artDirection!.origin='model'; assert.deepEqual(locked(after.shots[0]!),locked(persistedOriginal));
      const cache=await readJson<any>(path.join(f.root,'work/creative-storyboard-cache.json'));assert.deepEqual(cache.storyboard,after);assert.equal(cache.inputHash,'IMMUTABLE-INPUT');assert.equal(cache.modelsHash,'IMMUTABLE-MODELS'); const report=await readJson<any>(path.join(f.root,'work/creative-direction-report.json')); assert.equal(report.runtimeArtworkRepairs.at(-1).scope,'actor-motion-and-artwork'); const actorTimeline=await readJson<any>(path.join(f.root,'work/actor-timeline.json')); assert.equal(actorTimeline.storyboardHash,hash(after));
      for(const name of ['performance-plan.json','stage-plan.json','camera-plan.json','story-direction.json'])assert.equal((await readJson<any>(path.join(f.root,'work',name))).storyboardHash,hash(after));
      const scriptAfter=await fs.readFile(path.join(f.root,'scenes',f.shot.id,'scene.js'),'utf8'); assert.notEqual(hash(scriptAfter),scriptBefore,'typed actor tracks must change executable scene bundle'); const faceCommands=(source:string)=>{ const commands:unknown[]=[]; let timeline:any; timeline=new Proxy({}, {get:(_target,method)=> (...args:unknown[])=> { if((method==='set'||method==='to')&&typeof args[0]==='string'&&/brow|mouth|lid|eye/.test(args[0]))commands.push([String(method),...args]); return timeline; }}); vm.runInNewContext(source,{window:{},gsap:{timeline:()=>timeline}},{timeout:1000}); return JSON.stringify(commands); }; const bakedBefore=faceCommands(scriptBeforeText),bakedAfter=faceCommands(scriptAfter); assert.notEqual(bakedAfter,'[]'); assert.notEqual(bakedAfter,bakedBefore,'actual emitted numeric face state changes without requiring mood labels in baked JS'); const recordAfter=await readJson<any>(path.join(f.root,'scenes',f.shot.id,'scene.json')); assert.notEqual(recordAfter.sourceHash,recordBefore.sourceHash); assert.notEqual(recordAfter.inputHash,recordBefore.inputHash,'actual repaired actor tracks change scene input');assert.equal((await readJson<any>(path.join(f.root,'work/scene-repair-budget.json'))).acting,1);
      const ledger=await fs.readFile(path.join(f.root,'logs/model-calls.jsonl'),'utf8');assert.equal(ledger.trim().split('\n').map(line=>JSON.parse(line)).filter((r:any)=>r.event==='started').length,1);
      f.config.workflow.max_review_iterations=1;await assert.rejects(repairScenes(f.root,f.config,new ModelRouter(f.config,f.root),f.board,f.characters,f.manifest,[issue],options),/iteration budget exhausted/);assert.equal(calls(),1);f.config.workflow.max_review_iterations=configBefore.workflow.max_review_iterations; sub.mock.method(HyperFramesEngine.prototype,'validate',async()=>{throw new Error('ACCEPTED_SCENE_MUST_STAY_CACHED');}); await buildScenes(f.root,f.config,f.router,f.board,f.characters,f.manifest); assert.equal(calls(),1);
    }else{
      await assert.rejects(repairScenes(f.root,f.config,f.router,f.board,f.characters,f.manifest,[issue],options));assert.equal(calls(),mode==='runtime-fail'?1:0);assert.deepEqual(await snapshot(f),before);assert.equal(hash(await fs.readFile(path.join(f.root,`scenes/${f.shot.id}/index.html`))),htmlBefore); assert.equal(hash(await fs.readFile(path.join(f.root,'scenes',f.shot.id,'scene.js'))),scriptBefore); assert.deepEqual(await readJson<any>(path.join(f.root,'scenes',f.shot.id,'scene.json')),recordBefore);
      if(mode==='ceiling')f.config.workflow.max_model_calls=configBefore.workflow.max_model_calls;
    }
    assert.deepEqual(f.config,configBefore,'invocation override never persists config');assert.ok((await fs.readFile(path.join(f.root,'project.yaml'))).equals(yamlBefore));
  });
  await t.test('pipeline rejects invalid invocation options before reservation/config/native work',async()=>{const {runPipeline}=await import('../packages/orchestrator/pipeline.js');for(const value of [-1,4,1.5,NaN,Infinity])await assert.rejects(runPipeline('DOES-NOT-EXIST',{sceneRepairAttempts:value}),/integer from 0 to 3/);});
  await t.test('API bounds and forwards override without settings mutation; no listener/native pipeline',async sub=>{
    const core=await import('../packages/orchestrator/index.js');const {buildServer}=await import('../apps/server/index.js');const projectsRoot=await fs.mkdtemp(path.join(base,'api-acting-'));const root=await core.createProject('owned',{root:projectsRoot,example:false});const configBytes=await fs.readFile(path.join(root,'project.yaml'));const calls:any[]=[];
    const app=await buildServer({projectsRoot,coordinator:{...core,runPipeline:async(_root:string,options:any)=>{calls.push(options);return core.loadState(_root);}}});sub.after(()=>app.close());
    for(const value of [-1,4,1.5,'1',null]){const r=await app.inject({method:'POST',url:'/api/projects/owned/run',payload:{until:'DONE',sceneRepairAttempts:value}});assert.equal(r.statusCode,422,r.body);}assert.equal(calls.length,0);
    for(const value of [0,1,3]){const r=await app.inject({method:'POST',url:'/api/projects/owned/run',payload:{until:'DONE',sceneRepairAttempts:value}});assert.equal(r.statusCode,202,r.body);for(let i=0;i<5;i++)await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(calls.at(-1).sceneRepairAttempts,value);}
    assert.ok((await fs.readFile(path.join(root,'project.yaml'))).equals(configBytes));assert.equal(app.server.listening,false);await app.close();
  });
  await t.test('CLI/API/Studio public wiring advertises per-invocation bound repair and retains normal retry flag',async()=>{
    const cli=await fs.readFile(new URL('../apps/cli/index.ts',import.meta.url),'utf8'),api=await fs.readFile(new URL('../apps/studio/src/api.ts',import.meta.url),'utf8'),ui=await fs.readFile(new URL('../apps/studio/src/main.ts',import.meta.url),'utf8');assert.match(cli,/--scene-repair-attempts/);assert.match(cli,/min\(0\)\.max\(3\)/);assert.match(cli,/retryModelErrors:options\.retryModelErrors/);assert.match(api,/sceneRepairAttempts===undefined/);assert.match(ui,/action==='repair-motion'/);assert.match(ui,/api\.run\(p\.name,'DONE',undefined,false,1\)/);assert.match(ui,/qc-frozen-frames\|frozen-frames/);
  });
});




