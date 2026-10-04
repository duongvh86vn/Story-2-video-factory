# Public FINAL checkpoint draft — NOT RUN on source26

Complete prior source and assertions preserved below. Non-executable preservation only. The old checkpoint incorrectly assumed REVIEWED; durable final-gate state is REPAIRED. No current public pipeline or media claim.

```typescript
import assert from 'node:assert/strict';
import test,{type TestContext} from 'node:test';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import YAML from 'yaml';
import {ConfigSchema} from '../packages/core/config.js';
import {BeatSchema,StorySchema,type Beat,type Narration,type Shot,type Storyboard} from '../packages/core/schemas.js';
import {hash,writeJson} from '../packages/core/utils.js';
import {ModelRouter} from '../packages/models/registry.js';
import {compileHost} from '../packages/host/index.js';
import {groundedExplanation,createExplanation,validateSceneIntent} from '../packages/explainer/plan.js';
import {explainerShot,validateExplainerStoryboard} from '../packages/explainer/storyboard.js';
import {directCinematicShot,writeCinematicPlans} from '../packages/director/index.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles} from '../packages/scenes/security.js';
import {createPreviews,eventPreviewTimes,reviewProject} from '../packages/review/index.js';
import {HyperFramesEngine} from '../packages/render/hyperframes.js';
import {loadState,saveState} from '../packages/orchestrator/state-machine.js';

async function owned(t:TestContext){
  const parent=process.env.STORY_ACTING_TEST_EVIDENCE??os.tmpdir();await fs.mkdir(parent,{recursive:true});
  const root=await fs.mkdtemp(path.join(parent,'story-acting-'));
  if(!process.env.STORY_ACTING_TEST_EVIDENCE)t.after(async()=>{
    const realParent=await fs.realpath(parent),entry=await fs.lstat(root),real=await fs.realpath(root);
    assert.equal(entry.isSymbolicLink(),false);assert.equal(path.dirname(real),realParent);assert.ok(path.basename(real).startsWith('story-acting-'));
    await fs.rm(real,{recursive:true,force:true});
  });
  t.diagnostic(`owned protocol fixture: ${root}`);return root;
}
type Acting='hold'|'locomotion'|'manipulation';
async function fixture(t:TestContext,kind:'stick-man'|'mini-robot'='stick-man',acting:Acting='hold',two=false){
  const root=await owned(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic',character_mode:'actors'},
    host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},models:Object.fromEntries(['planner','storyboard','coder','repair','visual_review','fallback'].map(role=>[role,{provider:'mock'}])),
    retry:{structured_output:0,render:0},rendering:{final:{width:1280,height:720,fps:30}}});
  const router=new ModelRouter(config,root),{profile,rig}=await compileHost(root,config,router);
  const text=`Linh ${acting==='locomotion'?'walks past':acting==='manipulation'?'moves':'waits by'} a lever.${two?' Minh waits.':''}`;
  const narration:Narration={mode:'srt',durationMs:6000,segments:[{id:'cue',startMs:0,endMs:6000,text}],words:[]};
  const story=StorySchema.parse({title:'An everyday fictional situation',genre:'fiction',story:text,style:{visual:'vector'},
    characters:(two?['Linh','Minh']:['Linh']).map((name,i)=>({id:`person${i}`,name,description:text}))});
  const base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:6000,segmentIds:['cue'],narrationText:text,meaning:text,visualGoal:text,importance:1});
  const plan=groundedExplanation(story,narration,[base],profile,true),b=plan.beats[0]!,ref=b.sourceRefs[0]!;
  b.entities=[{id:'lever',kind:'lever',label:'lever',sourceRefs:[ref]}];b.relations=[];b.visualMethod='summary';
  b.sceneIntent!.acting=b.sceneIntent!.participants.map((p,i)=>({participantId:p.id,kind:i?'hold':acting,statement:p.role,sourceRefs:p.sourceRefs,
    ...(acting==='manipulation'&&!i?{targetIds:['lever']}:{})}));
  const beat:Beat={...base,...b};
  function make(id='acting',start=0,end=6000,cutaway=false):Shot{
    const local=structuredClone(beat);
    if(cutaway)local.sceneIntent={...local.sceneIntent!,participants:[],acting:[]};
    const raw=explainerShot(id,start,end,local,narration,profile,rig);
    if(acting==='manipulation'&&!cutaway)raw.host!.actions=[{type:'operate-model',hand:'right',startMs:start,endMs:end,contactMs:start+1800,narrationAnchor:'cue',target:{modelId:raw.visualization!.modelId,partId:'lever',anchor:'handle'}}];
    const s=directCinematicShot(raw,local,profile,config,undefined,{seed:acting!=='manipulation'||cutaway});
    if(acting!=='manipulation'||cutaway){
      for(const p of [s.cinematic!.performance,...s.cinematic!.actorScene!.supporting.map(a=>a.performance)]){
        p.walks=[];p.gestures=[];p.expressions=[];p.gazes=[];p.turns=[];p.postures=[];
      }
      s.host!.actions=[{type:'idle',startMs:start,endMs:end}];
      for(const a of s.cinematic!.actorScene!.supporting)a.actions=[{type:'idle',startMs:start,endMs:end}];
      s.visualization!.events=[];
      if(acting==='locomotion'&&!cutaway){const p=s.cinematic!.performance;
        p.walks=[{startMs:500,endMs:Math.min(3500,end-start-500),fromX:p.root.x,toX:p.root.x+45}];s.cinematic!.continuity.exit.x=p.root.x+45;
      }
    }
    return s;
  }
  const shot=make();
  const validate=(shots:Shot[])=>validateExplainerStoryboard({shots},narration,[beat],profile,rig,config);
  return {root,config,router,profile,rig,text,narration,story,base,plan,beat,shot,make,validate};
}
for(const rig of ['stick-man','mini-robot'] as const){
  test(`${rig}: canonical walk plus completed-action hold is valid; idle/hold/point cannot replace the walk`,async t=>{
    const f=await fixture(t,rig,'locomotion');assert.equal(f.shot.cinematic!.actorScene!.primary!.identity,'fictional');
    assert.doesNotThrow(()=>f.validate([f.shot]));assert.ok(f.shot.cinematic!.performance.walks[0]!.endMs<6000);
    for(const downgrade of ['idle','hold','point'] as const){const s=structuredClone(f.shot);s.cinematic!.performance.walks=[];
      if(downgrade==='hold')for(const intent of [s.cinematic!.sceneIntent!,s.visualization!.sceneIntent!])intent.acting![0]!.kind='hold';
      if(downgrade==='point')s.cinematic!.performance.gestures=[{id:'point',action:'point',startMs:500,endMs:3500,target:{x:600,y:300}}];
      assert.throws(()=>f.validate([s]),/needs-motion.*locomotion/);
    }
  });
  test(`${rig}: mixed actor/cutaway succeeds but all actor situations cannot be omitted`,async t=>{
    const f=await fixture(t,rig,'locomotion'),cut=f.make('cutaway',0,2000,true),actor=f.make('actor',2000,6000);
    assert.doesNotThrow(()=>f.validate([cut,actor]));
    assert.throws(()=>f.validate([cut,f.make('other-cutaway',2000,6000,true)]),/missing story actor/);
  });
  test(`${rig}: genuine sourced hold has no artificial activity quota`,async t=>{
    const f=await fixture(t,rig,'hold',true);assert.doesNotThrow(()=>f.validate([f.shot]));
    assert.deepEqual(eventPreviewTimes(f.shot),[0,3000,5999]);
  });
  test(`${rig}: manipulation must retain intended target, action, gesture, cue and contact`,async t=>{
    const f=await fixture(t,rig,'manipulation');assert.doesNotThrow(()=>f.validate([f.shot]));
    for(const fault of ['target','action','gesture','cue','contact','hand'] as const){const s=structuredClone(f.shot);
      if(fault==='target')s.host!.actions[0]!.target!.partId='unrelated-machine';
      if(fault==='action')s.host!.actions[0]!.type='point';
      if(fault==='gesture')s.cinematic!.performance.gestures=[];
      if(fault==='cue')s.host!.actions[0]!.narrationAnchor='another-cue';
      if(fault==='contact')s.host!.actions[0]!.contactMs!++;
      if(fault==='hand')s.host!.actions[0]!.hand='left';
      assert.throws(()=>f.validate([s]),/needs-motion|contact|gesture|action|target|hand/);
    }
  });
}
test('whole current source/negation and immutable clocks are not borrowed or rewritten',async t=>{
  const f=await fixture(t);const intent=structuredClone(f.beat.sceneIntent!);
  intent.action='Linh does not wait.';
  assert.throws(()=>validateSceneIntent(intent,f.narration,f.beat.sourceRefs,['cue']),/whole statement|whole.*statement/);
  const altered=structuredClone(f.shot);altered.host!.actions[0]!.endMs=6001;
  assert.throws(()=>f.validate([altered]),/clock|bounds/);
  const walk=await fixture(t,'stick-man','locomotion');walk.shot.cinematic!.performance.walks[0]!.startMs=6500;walk.shot.cinematic!.performance.walks[0]!.endMs=7500;
  assert.throws(()=>walk.validate([walk.shot]),/needs-motion/);
});
for(const failure of ['missing-intent','missing-acting','missing-target','unsupported','fragment','wrong-source','accepted'] as const)test(`real planner normalization: ${failure}`,async t=>{
  const f=await fixture(t,'stick-man','manipulation');f.config.models.planner.provider='gateway';
  const candidate=structuredClone(f.plan),intent=candidate.beats[0]!.sceneIntent!;
  if(failure==='missing-intent')delete candidate.beats[0]!.sceneIntent;
  if(failure==='missing-acting')delete intent.acting;
  if(failure==='missing-target')delete intent.acting![0]!.targetIds;
  if(failure==='unsupported')intent.acting![0]!.kind='unsupported';
  if(failure==='fragment')intent.acting![0]!.statement='moves';
  if(failure==='wrong-source')intent.acting![0]!.sourceRefs=[{kind:'narration',segmentId:'cue',quote:'Invented action.'}];
  let calls=0;t.mock.method(f.router,'structured',async(_role,_request,schema)=>{calls++;return schema.parse(candidate);});
  const run=()=>createExplanation(f.root,f.config,f.router,f.story,f.narration,[f.base],f.profile);
  if(failure==='accepted'){const result=await run();assert.equal(result[0]!.sceneIntent!.acting![0]!.kind,'manipulation');assert.equal(result[0]!.narrationText,f.text);}
  else await assert.rejects(run,/sceneIntent|supported acting|targetIds|needs-motion|whole|evidence|source/);
  assert.equal(calls,1,'a real normalization boundary is exercised, with no provider call');
});

type F=Awaited<ReturnType<typeof fixture>>;
async function writeDisk(f:F,board:Storyboard){
  const assets={assets:board.shots.flatMap(s=>s.assetNeeds.filter(n=>n.required&&n.localPath===f.rig.assetPath).map(n=>({id:n.id,type:'image' as const,path:f.rig.assetPath,hash:'',source:'code' as const,status:'approved' as const,shotIds:[s.id]})))};
  const rigBytes=await fs.readFile(path.join(f.root,f.rig.assetPath));for(const asset of assets.assets)asset.hash=hash(rigBytes);
  const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
  for(const shot of board.shots){const result=renderCinematic(shot,f.profile,f.rig,silence,f.config,undefined,f.narration),dir=path.join(f.root,'scenes',shot.id);await fs.mkdir(dir,{recursive:true});
    for(const file of secureSceneFiles(result.files).files)await fs.writeFile(path.join(dir,file.path),file.content);
    await writeJson(path.join(dir,'host-geometry.json'),result.geometry);await writeJson(path.join(dir,'scene.json'),{shotId:shot.id,validated:true});
  }
  for(const [name,value] of Object.entries({'story':f.story,'narration':f.narration,'voiced-narration':f.narration,'beats':[f.beat],'storyboard':board,
    'character-bible':{characters:[]},'asset-manifest':assets,'speech-activity':silence,'chapters':[{id:'ch1',startMs:0,endMs:6000,title:f.story.title,summary:f.text,narrativePurpose:f.text,segmentIds:['cue']}],
    'timeline':{durationMs:6000,segments:f.narration.segments,words:[]},'explanation-plan':f.plan,'voice-report':{version:2,status:'needs-voice',source:'silent-draft',provider:null,voiceId:null,narrationHash:hash(f.narration),textPreserved:true,timingPreserved:true,inputAudioPreserved:true,synchronization:'segment',cues:[],warnings:[]}}))await writeJson(path.join(f.root,'work',name+'.json'),value);
  await writeCinematicPlans(f.root,board);await fs.writeFile(path.join(f.root,'work/storyboard.md'),'Controlled source protocol fixture');
  for(const file of ['scenes/index.html','scenes/master.js','work/master.json'])await fs.writeFile(path.join(f.root,file),'CONTROLLED MASTER HASH BOUNDARY; NOT A FILM');
  return assets;
}
async function screenshots(t:TestContext,f:F){
  t.mock.method(HyperFramesEngine.prototype,'snapshots',async(request:{frames:{timeMs:number;output:string}[]})=>{
    const outputs=[];for(const frame of request.frames){const file=path.join(f.root,frame.output);await fs.mkdir(path.dirname(file),{recursive:true});
      const png=await sharp({create:{width:128,height:72,channels:3,background:{r:frame.timeMs%255,g:40,b:90}}}).png().toBuffer();await fs.writeFile(file,png);outputs.push(file);
    }return outputs;
  });
}
for(const rig of ['stick-man','mini-robot'] as const)test(`${rig}: public previews/review require posture/gaze samples and each idle shot's hashed action sheet`,async t=>{
  const f=await fixture(t,rig,'hold',true),active=f.make('active',0,3000),hold=f.make('hold',3000,6000),p=active.cinematic!.performance;
  p.postures=[{pose:'lean',leanDeg:8,startMs:700,endMs:1200},{pose:'stand',startMs:1700,endMs:2200}];
  active.cinematic!.actorScene!.supporting[0]!.performance.gazes=[{startMs:1300,endMs:2100,target:{x:p.root.x,y:p.root.y-130}}];
  const board={shots:[active,hold]},assets=await writeDisk(f,board);await screenshots(t,f);await createPreviews(f.root,f.config,board);
  const file=path.join(f.root,'previews/manifest.json'),original=JSON.parse(await fs.readFile(file,'utf8'));
  for(const at of [666,700,950,1199,1234,1266,1300,1700,2099,2134,2234])assert.ok(original.actions.some((a:{shotId:string;timeMs:number})=>a.shotId==='active'&&a.timeMs===at),`missing authored posture/gaze sample ${at}`);
  for(const at of [3000,4500,5999])assert.ok(original.actions.some((a:{shotId:string;timeMs:number})=>a.shotId==='hold'&&a.timeMs===at));
  for(const id of ['active','hold']){const relative=`previews/${id}/action-sheet.jpg`;assert.equal(hash(await fs.readFile(path.join(f.root,relative))),original.sheetHashes[relative]);}
  const review=()=>reviewProject(f.root,f.config,f.router,board,f.story,{characters:[]},assets);
  assert.equal((await review()).pass,true,'metadata protocol review with synthetic screenshots must remain honest');
  for(const defect of ['posture-sample','idle-sample','idle-sheet'] as const){const manifest=structuredClone(original);
    if(defect==='posture-sample')manifest.actions=manifest.actions.filter((a:{shotId:string;timeMs:number})=>!(a.shotId==='active'&&a.timeMs===700));
    if(defect==='idle-sample')manifest.actions=manifest.actions.filter((a:{shotId:string;timeMs:number})=>!(a.shotId==='hold'&&a.timeMs===4500));
    if(defect==='idle-sheet')delete manifest.sheetHashes['previews/hold/action-sheet.jpg'];
    await writeJson(file,manifest);await assert.rejects(review,/missing timed event evidence|missing\/stale action sheet/);
  }
  await writeJson(file,original);await fs.appendFile(path.join(f.root,'previews/hold/action-sheet.jpg'),'tamper');
  await assert.rejects(review,/missing\/stale action sheet/);
});

test('later sourced locomotion cannot be satisfied by an early walk during waiting',async t=>{
  const f=await fixture(t,'stick-man','locomotion');
  const segments=[{id:'early',startMs:0,endMs:3000,text:'Linh waits by a lever.'},{id:'late',startMs:3000,endMs:6000,text:'Linh walks past a lever.'}];
  const narration={...f.narration,segments},story={...f.story,story:segments.map(s=>s.text).join(' ')};
  const base={...f.base,segmentIds:['early','late'],narrationText:story.story};
  const plan=groundedExplanation(story,narration,[base],f.profile,true),b=plan.beats[0]!;
  b.entities=[{id:'lever',kind:'lever',label:'lever',sourceRefs:b.sourceRefs}];b.relations=[];b.visualMethod='summary';
  b.sceneIntent!.acting=segments.map((s,i)=>({participantId:'person0',kind:i?'locomotion' as const:'hold' as const,statement:s.text,sourceRefs:[{kind:'narration' as const,segmentId:s.id,quote:s.text}]}));
  const beat={...base,...b},raw=explainerShot('multi-cue',0,6000,beat,narration,f.profile,f.rig),shot=directCinematicShot(raw,beat,f.profile,f.config,undefined,{seed:true});
  const p=shot.cinematic!.performance;p.gestures=[];p.gazes=[];p.expressions=[];p.walks=[{startMs:3500,endMs:5500,fromX:p.root.x,toX:p.root.x+45}];shot.cinematic!.continuity.exit.x=p.root.x+45;
  const validate=()=>validateExplainerStoryboard({shots:[shot]},narration,[beat],f.profile,f.rig,f.config);
  assert.doesNotThrow(validate,'positive control walks during its declared later source cue');
  p.walks[0]!.startMs=500;p.walks[0]!.endMs=2500;
  assert.throws(validate,/needs-motion|cue|clock/,'early waiting-window motion must not cover a later sourced walk');
});

test('public FINAL_RENDERED gate keeps missing/offline/unclassified drafts and admits classified authored/model to a controlled render boundary',async t=>{
  // A public INGESTED call supplies genuine fingerprints. Typed disk checkpoint
  // fixtures isolate the final gate; these are NOT completed media productions.
  const {runPipeline}=await import('../packages/orchestrator/pipeline.js');
  for(const origin of ['missing','offline','authored','model','unclassified'] as const)await t.test(origin,async sub=>{
    // Fail closed if this controlled checkpoint unexpectedly rewinds into scene
    // production. No browser/render subprocess is permitted by this protocol.
    sub.mock.method(HyperFramesEngine.prototype,'validate',async()=>({pass:true,errors:[]}));
    sub.mock.method(HyperFramesEngine.prototype,'renderDraft',async()=>{throw new Error('UNEXPECTED_PRE_FINAL_STAGE_IN_PROTOCOL_FIXTURE');});
    const f=await fixture(sub);f.config.input.mode='srt';f.config.voice.source='input';f.config.voice.tts_provider='none';
    await fs.mkdir(path.join(f.root,'input'),{recursive:true});await fs.mkdir(path.join(f.root,'output'),{recursive:true});
    await fs.writeFile(path.join(f.root,'project.yaml'),YAML.stringify(f.config));
    await fs.writeFile(path.join(f.root,f.config.input.subtitles),'1\n00:00:00,000 --> 00:00:06,000\n'+f.text+'\n');
    const audio=Buffer.from('CONTROLLED READY VOICE HASH ONLY; NOT LIVE SPEECH');await fs.writeFile(path.join(f.root,'input/narration.wav'),audio);
    f.narration.audioPath='input/narration.wav';
    if(origin==='unclassified')delete f.beat.sceneIntent!.acting;
    if(origin!=='missing')f.shot.cinematic!.artDirection={origin:origin==='unclassified'?'authored':origin,brief:'Controlled final gate protocol design',useEnvironment:true,
      palette:{background:'#FFFFFF',surface:'#EEEEEE',ink:'#111111',accent:'#AABBCC'},showHeading:false,layers:[],models:[]};
    const board={shots:[f.shot]};await writeDisk(f,board);await screenshots(sub,f);await createPreviews(f.root,f.config,board);
    assert.equal((await runPipeline(f.root,{until:'INGESTED'})).state,'INGESTED');
    await writeDisk(f,board);await createPreviews(f.root,f.config,board);
    await writeJson(path.join(f.root,'work/voice-report.json'),{version:2,status:'ready',source:'input',provider:null,voiceId:null,narrationHash:hash(f.narration),audioPath:f.narration.audioPath,audioHash:hash(audio),textPreserved:true,timingPreserved:true,inputAudioPreserved:true,synchronization:'audio-activity',cues:[],warnings:[]});
    await writeJson(path.join(f.root,'work/review.json'),{pass:true,issues:[],mode:'rule-based',warnings:['Controlled checkpoint, not visual acceptance']});
    const draft=Buffer.from('RETAINED CONTROLLED DRAFT');await fs.writeFile(path.join(f.root,'work/draft.mp4'),draft);
    const state=await loadState(f.root);state.state='REVIEWED';state.artifactHashes={};state.approvals={host:true,hostHash:f.rig.rigHash,characters:true,storyboard:true};await saveState(f.root,state);
    let finalCalls=0;sub.mock.method(HyperFramesEngine.prototype,'renderFinal',async()=>{finalCalls++;throw new Error('CONTROLLED_FINAL_RENDER_BOUNDARY');});
    if(origin==='missing'||origin==='offline'||origin==='unclassified'){const result=await runPipeline(f.root,{until:'FINAL_RENDERED'});assert.equal(result.state,'REVIEWED');if(origin==='unclassified')assert.ok(result.waitingFor,'canonical acting classification must block final production');else assert.equal(result.waitingFor,'art-direction');assert.equal(finalCalls,0);}
    else {await assert.rejects(()=>runPipeline(f.root,{until:'FINAL_RENDERED'}),/CONTROLLED_FINAL_RENDER_BOUNDARY/);assert.equal(finalCalls,1);}
    assert.deepEqual(await fs.readFile(path.join(f.root,'work/draft.mp4')),draft);await assert.rejects(fs.access(path.join(f.root,'output/final.mp4')));
  });
});

```
