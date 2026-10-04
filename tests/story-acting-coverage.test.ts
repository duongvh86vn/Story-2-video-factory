import assert from 'node:assert/strict';
import test,{beforeEach,type TestContext} from 'node:test';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import YAML from 'yaml';
import {ConfigSchema,type ModelRole} from '../packages/core/config.js';
import {BeatSchema,StorySchema,ProjectStateSchema,type Beat,type Narration,type Shot,type Storyboard} from '../packages/core/schemas.js';
import {hash,writeJson} from '../packages/core/utils.js';
import {ModelRouter} from '../packages/models/registry.js';
import type {ModelRequest} from '../packages/models/adapter.js';
import type {ZodType,ZodTypeDef} from 'zod';
import {requireFinalStoryDirection,validateStoryActingCoverage} from '../packages/director/story-coverage.js';
import {compileHost} from '../packages/host/index.js';
import {groundedExplanation,createExplanation,validateSceneIntent,validateExplanation} from '../packages/explainer/plan.js';
import {explainerShot,validateExplainerStoryboard} from '../packages/explainer/storyboard.js';
import {directCinematicShot,writeCinematicPlans} from '../packages/director/index.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles} from '../packages/scenes/security.js';
import {createPreviews,eventPreviewTimes,reviewProject} from '../packages/review/index.js';
import {HyperFramesEngine} from '../packages/render/hyperframes.js';
import {ApprovalRequired} from '../packages/orchestrator/state-machine.js';

beforeEach(t=>{
  if(!('mock' in t))throw new Error('TestContext required for process safety guards');
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('PROHIBITED_NETWORK_PROVIDER_BOUNDARY');});
  for(const method of ['validate','renderDraft','renderFinal','snapshots'] as const)t.mock.method(HyperFramesEngine.prototype,method,async()=>{throw new Error('PROHIBITED_BROWSER_RENDER_BOUNDARY');});
});

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
  assert.throws(()=>validateSceneIntent(intent,f.narration,f.beat.sourceRefs!,['cue']),/whole statement|whole.*statement/);
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
  let calls=0;t.mock.method(f.router,'structured',async<T>(_role:ModelRole,_request:ModelRequest,schema:ZodType<T,ZodTypeDef,any>):Promise<T>=>{calls++;return schema.parse(candidate);});
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


test('unrelated narration refs cannot borrow the early waiting clock',async t=>{
  const f=await fixture(t,'stick-man','locomotion');
  const narration={...f.narration,segments:[{id:'early',startMs:0,endMs:3000,text:'Linh does not walk by a lever.'},{id:'late',startMs:3000,endMs:6000,text:'Linh walks past a lever.'}]};
  const story={...f.story,story:narration.segments.map(s=>s.text).join(' ')},base={...f.base,segmentIds:['early','late'],narrationText:story.story};
  const plan=groundedExplanation(story,narration,[base],f.profile,true),b=plan.beats[0]!;
  b.entities=[{id:'lever',kind:'lever',label:'lever',sourceRefs:b.sourceRefs}];b.relations=[];b.visualMethod='summary';
  b.sceneIntent!.acting=[{participantId:'person0',kind:'locomotion',statement:narration.segments[1]!.text,sourceRefs:narration.segments.map(s=>({kind:'narration' as const,segmentId:s.id,quote:s.text}))}];
  const beat={...base,...b},shot=directCinematicShot(explainerShot('unrelated-ref',0,6000,beat,narration,f.profile,f.rig),beat,f.profile,f.config,undefined,{seed:true}),p=shot.cinematic!.performance;
  p.gestures=[];p.gazes=[];p.expressions=[];p.walks=[{startMs:3500,endMs:5500,fromX:p.root.x,toX:p.root.x+45}];shot.cinematic!.continuity.exit.x=p.root.x+45;
  const validate=()=>validateExplainerStoryboard({shots:[shot]},narration,[beat],f.profile,f.rig,f.config);
  assert.doesNotThrow(validate);p.walks[0]!.startMs=500;p.walks[0]!.endMs=2500;
  assert.throws(validate,/needs-motion/,'an unrelated negated ref must not make early locomotion cover the later whole statement');
});

test('public final helper rejects canonical gaps and offline art; authored/model and actual waitingFor schema stay valid',async t=>{
 const f=await fixture(t,'stick-man','manipulation'),board={shots:[f.shot]};
 const art={origin:'authored' as const,brief:'Controlled protocol art',useEnvironment:true,palette:{background:'#FFFFFF',surface:'#EEEEEE',ink:'#111111',accent:'#AABBCC'},showHeading:false,layers:[],models:[]};
 f.shot.cinematic!.artDirection=art;
 for(const origin of ['authored','model'] as const){f.shot.cinematic!.artDirection!.origin=origin;assert.doesNotThrow(()=>requireFinalStoryDirection(board,[f.beat]));}
 for(const defect of ['missing-intent','missing-acting','missing-participant','unsupported','missing-target','missing-art','offline'] as const){
  const beats=structuredClone([f.beat]),copy=structuredClone(board),intent=beats[0]!.sceneIntent!;
  if(defect==='missing-intent')delete beats[0]!.sceneIntent;
  if(defect==='missing-acting')delete intent.acting;
  if(defect==='missing-participant')intent.acting=[];
  if(defect==='unsupported')intent.acting![0]!.kind='unsupported';
  if(defect==='missing-target')delete intent.acting![0]!.targetIds;
  if(defect==='missing-art')delete copy.shots[0]!.cinematic!.artDirection;
  if(defect==='offline')copy.shots[0]!.cinematic!.artDirection!.origin='offline';
  assert.throws(()=>requireFinalStoryDirection(copy,beats),(error:unknown)=>error instanceof ApprovalRequired&&error.kind==='art-direction');
 }
 const state=ProjectStateSchema.parse({version:1,name:'protocol',state:'REPAIRED',updatedAt:new Date().toISOString(),inputHash:'immutable',waitingFor:'art-direction'});
 assert.equal(state.state,'REPAIRED');assert.equal(state.waitingFor,'art-direction');assert.equal(ProjectStateSchema.safeParse({...state,waitingFor:'invented'}).success,false);
});

test('mock planner uses semantic storyboard role without rewriting narration; fully mock classification cannot final',async t=>{
 const f=await fixture(t,'stick-man','manipulation');f.config.models.storyboard.provider='gateway';
 const before=structuredClone({story:f.story,narration:f.narration}),roles:ModelRole[]=[];
 t.mock.method(f.router,'structured',async<T>(role:ModelRole,_request:ModelRequest,schema:ZodType<T,ZodTypeDef,any>):Promise<T>=>{roles.push(role);return schema.parse(f.plan);});
 const beats=await createExplanation(f.root,f.config,f.router,f.story,f.narration,[f.base],f.profile);
 assert.deepEqual(roles,['storyboard']);assert.deepEqual({story:f.story,narration:f.narration},before);assert.equal(beats[0]!.sceneIntent!.acting![0]!.kind,'manipulation');
 f.shot.cinematic!.artDirection={origin:'authored',brief:'Controlled protocol',useEnvironment:true,palette:{background:'#FFFFFF',surface:'#EEEEEE',ink:'#111111',accent:'#AABBCC'},showHeading:false,layers:[],models:[]};
 assert.doesNotThrow(()=>requireFinalStoryDirection({shots:[f.shot]},beats));
 f.config.models.storyboard.provider='mock';const seed=await createExplanation(f.root,f.config,f.router,f.story,f.narration,[f.base],f.profile);
 assert.deepEqual(roles,['storyboard']);assert.throws(()=>requireFinalStoryDirection({shots:[f.shot]},seed),(error:unknown)=>error instanceof ApprovalRequired&&error.kind==='art-direction');assert.deepEqual({story:f.story,narration:f.narration},before);
});

for(const rig of ['stick-man','mini-robot'] as const)test(`${rig}: final requires reverse canonical membership for every actual cast and allows genuine cutaways`,async t=>{
  const f=await fixture(t,rig,'hold',true),cut=f.make('cutaway',0,2000,true),actor=f.make('actor',2000,6000);
  const art={origin:'authored' as const,brief:'Controlled membership protocol',useEnvironment:true,palette:{background:'#FFFFFF',surface:'#EEEEEE',ink:'#111111',accent:'#AABBCC'},showHeading:false,layers:[],models:[]};
  for(const shot of [f.shot,cut,actor])shot.cinematic!.artDirection=structuredClone(art);
  assert.doesNotThrow(()=>requireFinalStoryDirection({shots:[cut,actor]},[f.beat]));
  const empty=structuredClone(f.beat);empty.sceneIntent!.participants=[];empty.sceneIntent!.acting=[];
  assert.doesNotThrow(()=>requireFinalStoryDirection({shots:[cut]},[empty]),'genuine actor-free cutaway needs no invented cast classification');
  const rejected=(board:Storyboard,beats:Beat[])=>assert.throws(()=>requireFinalStoryDirection(board,beats),(error:unknown)=>error instanceof ApprovalRequired&&error.kind==='art-direction');
  rejected({shots:[f.shot]},[empty]);
  for(const field of ['id','name','role','identity'] as const){const shot=structuredClone(f.shot),primary=shot.cinematic!.actorScene!.primary!;
    if(field==='identity')primary.identity='historical';else primary[field]+=' unaccepted';
    rejected({shots:[shot]},[f.beat]);
  }
  const extra=structuredClone(f.shot),support=structuredClone(extra.cinematic!.actorScene!.supporting[0]!);
  support.character.id='unaccepted-extra';support.character.name='Unaccepted actor';extra.cinematic!.actorScene!.supporting.push(support);
  rejected({shots:[extra]},[f.beat]);
  const wrongBeat=structuredClone(f.shot);wrongBeat.beatIds=['unrelated-beat'];rejected({shots:[wrongBeat]},[f.beat]);
  const lateBeat=structuredClone(f.beat);lateBeat.startMs=6000;lateBeat.endMs=7000;rejected({shots:[f.shot]},[lateBeat]);
  assert.doesNotThrow(()=>requireFinalStoryDirection({shots:[f.shot]},[f.beat]),'both primary and supporting canonical actors remain admissible');
});

test('actual narration statement membership rejects subject/negation excerpts while sentence and name citations remain legal',async t=>{
  const f=await fixture(t,'stick-man','locomotion'),intent=structuredClone(f.beat.sceneIntent!);
  const full={kind:'narration' as const,segmentId:'cue',quote:f.text},name={...full,quote:'Linh'};
  const narration={...f.narration,segments:[{...f.narration.segments[0]!,text:'Linh waits. '+f.text}]};
  intent.sourceRefs=[full,name];intent.participants[0]!.sourceRefs=[name,full];intent.acting![0]!.sourceRefs=[full];
  assert.doesNotThrow(()=>validateSceneIntent(intent,narration,[full,name],['cue']),'a whole actual sentence and short name citation are valid');
  const fragment={...full,quote:'walks past a lever.'},narrow=structuredClone(intent);narrow.action=fragment.quote;narrow.sourceRefs.push(fragment);
  assert.throws(()=>validateSceneIntent(narrow,narration,[full,name,fragment],['cue']),/whole.*statement|negation/);
  const negated='Linh does not walk to school.',excerpt={...full,quote:'walk to school.'},original={...full,quote:negated},negName={...full,quote:'Linh'};
  const negNarration={...f.narration,segments:[{...f.narration.segments[0]!,text:negated}]};
  const negative=structuredClone(intent);negative.action=negated;negative.objective=negated;delete negative.result;negative.sourceRefs=[original,excerpt,negName];
  negative.participants[0]!.role=negated;negative.participants[0]!.sourceRefs=[negName,original];negative.acting![0]!.kind='hold';negative.acting![0]!.statement=negated;negative.acting![0]!.sourceRefs=[original];
  assert.doesNotThrow(()=>validateSceneIntent(negative,negNarration,[original,excerpt,negName],['cue']));
  for(const field of ['action','acting','role'] as const){const bad=structuredClone(negative);
    if(field==='action')bad.action=excerpt.quote;
    if(field==='acting'){bad.acting![0]!.statement=excerpt.quote;bad.acting![0]!.sourceRefs=[excerpt];}
    if(field==='role'){bad.participants[0]!.role=excerpt.quote;bad.participants[0]!.sourceRefs=[negName,excerpt];}
    assert.throws(()=>validateSceneIntent(bad,negNarration,[original,excerpt,negName],['cue']),/whole|negation/);
  }
});

test('upstream explanation preserves original supplement negation and permits short entity/name source citations',async t=>{
 const f=await fixture(t),plan=structuredClone(f.plan),b=plan.beats[0]!,intent=b.sceneIntent!;
 const sourceText='Linh does not walk to school.',source={kind:'source' as const,quote:sourceText},name={kind:'source' as const,quote:'Linh'},excerpt={kind:'source' as const,quote:'walk to school.'};
 const story={...f.story,supplement:{story:sourceText,facts:[],sourcePath:'input/owned-supplement.md'}};
 b.sourceRefs.push(source,name,excerpt);intent.participants[0]!.role=sourceText;intent.participants[0]!.sourceRefs=[name,source];
 const label={kind:'narration' as const,segmentId:'cue',quote:'lever'};b.sourceRefs.push(label);b.entities[0]!.sourceRefs=[label];
 const validate=(candidate:typeof plan)=>validateExplanation(candidate,story,f.narration,[f.base],f.profile.id);
 assert.doesNotThrow(()=>validate(plan),'original supplementary role, short name and entity citation must remain valid');
 const narrowed=structuredClone(plan);narrowed.beats[0]!.sceneIntent!.participants[0]!.role=excerpt.quote;
 narrowed.beats[0]!.sceneIntent!.participants[0]!.sourceRefs=[name,excerpt];
 assert.throws(()=>validate(narrowed),/whole|negation/,'a verified excerpt cannot redefine the original supplementary statement');
 const unverifiable=structuredClone(plan);unverifiable.beats[0]!.sourceRefs.push({kind:'source',quote:'Invented supplement.'});
 assert.throws(()=>validate(unverifiable),/Unverifiable/);
});

test('public performance coverage independently refuses a locomotion excerpt stripped from the original negated cue',async t=>{
 const f=await fixture(t,'stick-man','locomotion');
 assert.doesNotThrow(()=>validateStoryActingCoverage({shots:[f.shot]},[f.beat],f.narration));
 const beat=structuredClone(f.beat),excerpt={kind:'narration' as const,segmentId:'cue',quote:'walk past a lever.'};
 beat.sceneIntent!.acting![0]!.statement=excerpt.quote;beat.sceneIntent!.acting![0]!.sourceRefs=[excerpt];
 const narration={...f.narration,segments:[{...f.narration.segments[0]!,text:'Linh does not walk past a lever.'}]};
 assert.throws(()=>validateStoryActingCoverage({shots:[f.shot]},[beat],narration),/needs-motion.*locomotion/,'track overlap alone cannot affirm a negated original cue');
});