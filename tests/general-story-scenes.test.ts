import assert from 'node:assert/strict';
import test from 'node:test';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ConfigSchema} from '../packages/core/config.js';
import {BeatSchema,StorySchema,type Narration,type Shot} from '../packages/core/schemas.js';
import {ModelRouter} from '../packages/models/registry.js';
import {compileHost} from '../packages/host/index.js';
import {createExplanation,groundedExplanation,validateExplanation,validateSceneIntent} from '../packages/explainer/plan.js';
import {explainerShot,validateExplainerStoryboard} from '../packages/explainer/storyboard.js';
import {directCinematicShot,validateCinematicShot} from '../packages/director/index.js';
import {seedActorStoryboard,validateActorCast} from '../packages/actors/model.js';
import {createStoryboard,readStoryboardForDirection} from '../packages/storyboard/director.js';
import {inspectCinematicStoryboard} from '../apps/server/cinematic.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';

// Optional retained evidence location; normal use resolves through the OS temp directory.
async function fixture(options:{kind?:'stick-man'|'mini-robot';genre?:string;authoring?:'fiction'|'factual';text?:string;names?:string[]}={}){
  const parent=process.env.GENERAL_SCENE_AUDIT_DIR??os.tmpdir();
  await fs.mkdir(parent,{recursive:true});
  const root=await fs.mkdtemp(path.join(parent,'general-story-scenes-'));
  const kind=options.kind??'stick-man';
  const config=ConfigSchema.parse({presentation:{mode:'story-cinematic',character_mode:'actors'},
    host:{profile:kind==='stick-man'?'library/characters/STICK-MAN.md':'library/characters/MINI-ROBOT.md'},
    models:{planner:{provider:'mock'},storyboard:{provider:'mock'},fallback:{provider:'mock'}},
    rendering:{final:{width:1280,height:720,fps:30}}});
  const router=new ModelRouter(config,root),{profile,rig}=await compileHost(root,config,router);
  const text=options.text??'Linh waits for Minh.',names=options.names??['Linh','Minh'];
  const narration:Narration={mode:'srt',durationMs:5000,words:[],segments:[{id:'cue',startMs:0,endMs:5000,text}]};
  const story=StorySchema.parse({title:'An ordinary situation',genre:options.genre??'nonfiction',story:text,style:{visual:'vector'},
    characters:names.map((name,i)=>({id:`person${i}`,name,description:text})),
    ...(options.authoring?{authoring:{kind:options.authoring,identity:'local-fixture',title:'An ordinary situation',sourcePath:'fixture.txt',factualVerification:'not-independently-verified',warnings:[]}}:{})});
  const base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:5000,segmentIds:['cue'],narrationText:text,
    meaning:'A sourced situation',visualGoal:'Show the people acting in this situation',importance:1});
  const plan=groundedExplanation(story,narration,[base],profile,true);
  const beat={...base,...plan.beats[0]!};
  const raw=explainerShot('ch1.s001',0,5000,beat,narration,profile,rig);
  console.log(JSON.stringify({fixtureRoot:root,pid:process.pid,kind}));
  // Direction is exercised only by tests that need it: a camera failure must not
  // prevent independent explanation/source checks from reaching their assertions.
  return {root,config,router,profile,rig,text,story,narration,base,plan,beat,raw,
    get shot(){return directCinematicShot(raw,beat,profile,config,undefined,{seed:true});}};
}

for(const kind of ['stick-man','mini-robot'] as const)for(const mode of ['everyday','fiction','nonfiction'] as const){
  test(`${kind}: public mock explanation/storyboard preserves ${mode} cast without a researcher`,async()=>{
    const f=await fixture({kind,genre:mode==='everyday'?'everyday':mode,authoring:mode==='fiction'?'fiction':mode==='nonfiction'?'factual':undefined});
    const beats=await createExplanation(f.root,f.config,f.router,f.story,f.narration,[f.base],f.profile);
    const board=await createStoryboard(f.root,f.config,f.router,f.story,f.narration,{characters:[]},
      [{id:'ch1',startMs:0,endMs:5000,title:'A situation',summary:f.text,narrativePurpose:'show situation',segmentIds:['cue']}],beats);
    const shot=board.shots[0]!,scene=shot.cinematic!.actorScene!;
    const cast=[scene.primary!,...scene.supporting.map(a=>a.character)];
    assert.deepEqual(cast.map(a=>[a.id,a.name,a.identity]),[['person0','Linh',mode==='fiction'?'fictional':'illustrative'],['person1','Minh',mode==='fiction'?'fictional':'illustrative']]);
    assert.ok(cast.every(a=>a.role===f.text&&a.sourceRefs[0]!.quote===f.text));
    assert.deepEqual(shot.visualization!.parts,[]);assert.deepEqual(shot.visualization!.events,[]);
    assert.deepEqual(shot.cinematic!.models,[]);assert.equal(shot.cinematic!.attentionPartId,undefined);
    assert.deepEqual(shot.cinematic!.propBindings,[]);assert.deepEqual(shot.cinematic!.continuity.models,[]);
    assert.equal(shot.startMs,0);assert.equal(shot.endMs,5000);
    assert.doesNotThrow(()=>validateExplainerStoryboard(board,f.narration,beats,f.profile,f.rig,f.config));
    const report=JSON.parse(await fs.readFile(path.join(f.root,'work/creative-direction-report.json'),'utf8'));
    assert.equal(report.origin,'offline','a mock seed must retain honest provenance');
  });
}

for(const [genre,authoring,identity] of [['nonfiction',undefined,'illustrative'],['fiction','factual','illustrative'],['nonfiction','fiction','fictional']] as const){
  test(`identity classification: genre=${genre}, authoring=${authoring??'absent'}`,async()=>{
    const f=await fixture({genre,authoring,names:['Linh'],text:'Linh waits.'});
    assert.equal(f.plan.beats[0]!.sceneIntent!.participants[0]!.identity,identity);
    assert.equal(f.shot.cinematic!.actorScene!.primary!.identity,identity);
  });
}

test('actor-only scene renders through the public secured scene contract for both cast members',async()=>{
  const f=await fixture();
  const files=renderCinematic(f.shot,f.profile,f.rig,{method:'segment-draft',windowMs:20,intervals:[]},f.config,undefined,f.narration).files;
  assert.deepEqual(validateSceneFiles(secureSceneFiles(files),f.shot,f.config.workflow.max_scene_bytes,[],f.config.rendering.final),[]);
  assert.doesNotThrow(()=>validateActorCast({shots:[f.shot]},f.narration));
  assert.deepEqual(seedActorStoryboard({shots:[f.shot]},f.profile,f.rig,f.narration),{shots:[f.shot]},'already sourced cast must not be redesigned');
});

for(const [name,mutate] of [
  ['object attention',(s:Shot)=>{s.cinematic!.attentionPartId='missing';}],
  ['object models',(s:Shot)=>{s.cinematic!.models=[{partId:'missing',variant:'conceptual',sourceRefs:s.sourceRefs!}];}],
  ['missing actual cast',(s:Shot)=>{s.cinematic!.actorScene={primary:null,supporting:[],speakingSegmentIds:[],continuity:'cut'};}],
  ['object event',(s:Shot)=>{s.visualization!.events=[{type:'highlight',targetId:'missing',narrationAnchor:'cue',startMs:0,endMs:1000,contactRequired:false,motion:'none',sourceRefs:s.sourceRefs!}];}],
  ['dangling target',(s:Shot)=>{s.host!.actions=[{type:'point',startMs:0,endMs:5000,target:{modelId:s.visualization!.modelId,partId:'missing',anchor:'center'},narrationAnchor:'cue'}];}],
] as const){test(`actor-only scene rejects ${name}`,async()=>{
  const f=await fixture({names:['Linh'],text:'Linh waits.'}),candidate=structuredClone(f.shot);mutate(candidate);
  assert.throws(()=>validateCinematicShot(candidate,f.profile,f.config));
});}

test('whole negated source assertion is accepted without inventing a positive action',async()=>{
  const f=await fixture({text:'Linh does not leave.',names:['Linh']});
  assert.equal(f.beat.sceneIntent!.action,f.text);
  assert.doesNotThrow(()=>validateExplanation(f.plan,f.story,f.narration,[f.base],f.profile.id));
  assert.doesNotThrow(()=>validateExplainerStoryboard({shots:[f.shot]},f.narration,[f.beat],f.profile,f.rig,f.config));
});
for(const field of ['action','objective','result'] as const)test(`sceneIntent ${field} cannot strip negation`,async()=>{
  const f=await fixture({text:'Linh does not leave.',names:['Linh']}),candidate=structuredClone(f.plan);
  candidate.beats[0]!.sceneIntent![field]='Linh leaves.';
  assert.throws(()=>validateExplanation(candidate,f.story,f.narration,[f.base],f.profile.id),/whole statement|negation/i);
});
for(const mutation of ['name','role','evidence','cast'] as const)test(`sourced actors reject changed ${mutation}`,async()=>{
  const f=await fixture({genre:'fiction',authoring:'fiction',names:['Linh'],text:'Linh waits.'});
  if(mutation==='cast'){
    const candidate=structuredClone(f.shot);candidate.cinematic!.actorScene!.primary!.name='Someone else';
    assert.throws(()=>validateExplainerStoryboard({shots:[candidate]},f.narration,[f.beat],f.profile,f.rig,f.config),/identity|participant|name/i);
  }else{
    const candidate=structuredClone(f.plan),participant=candidate.beats[0]!.sceneIntent!.participants[0]!;
    if(mutation==='name')participant.name='Someone else';
    if(mutation==='role')participant.role='Linh is a famous researcher.';
    if(mutation==='evidence')participant.sourceRefs=[{kind:'narration',segmentId:'cue',quote:'An invented person.'}];
    assert.throws(()=>validateExplanation(candidate,f.story,f.narration,[f.base],f.profile.id),/source|evidence|role|name|participant/i);
  }
});

test('scene assertions cannot borrow an earlier cue outside their current scene',async()=>{
  const f=await fixture(),intent=structuredClone(f.beat.sceneIntent!);
  const old={kind:'narration' as const,segmentId:'old',quote:'Linh leaves.'};
  const narration={...f.narration,segments:[{id:'old',startMs:0,endMs:1000,text:old.quote},...f.narration.segments]};
  intent.sourceRefs.push(old);intent.action=old.quote;
  assert.throws(()=>validateSceneIntent(intent,narration,[...f.beat.sourceRefs,old],['cue']),/current narration|whole statement/i);
});

test('infeasible final actor operation rejects instead of silently becoming point; seed still reaches planner',async()=>{
  const f=await fixture({text:'Linh moves the lever.',names:['Linh']}),raw=structuredClone(f.raw),part=raw.visualization!.parts[0]!;
  raw.host!.actions=[{type:'operate-model',startMs:0,endMs:400,contactMs:150,narrationAnchor:'cue',target:{modelId:raw.visualization!.modelId,partId:part.id,anchor:'handle'}}];
  const before=structuredClone(raw);
  assert.throws(()=>directCinematicShot(raw,f.beat,f.profile,f.config),/needs-layout|needs-motion/i);
  assert.deepEqual(raw,before,'rejected direction must not mutate its input');
  const seed=directCinematicShot(raw,f.beat,f.profile,f.config,undefined,{seed:true});
  assert.deepEqual(seed.host!.actions.map(a=>a.type),['idle']);
  assert.equal(seed.cinematic!.actorScene!.primary!.name,'Linh');
});

test('legacy presenter diagram retains sourced objects/events while objectless actor contract is rejected',async()=>{
  const f=await fixture({text:'The wheel turns.',names:[]}),config=ConfigSchema.parse({...f.config,presentation:{...f.config.presentation,mode:'diagram',character_mode:'presenter'}});
  const plan=groundedExplanation(f.story,f.narration,[f.base],f.profile),beat={...f.base,...plan.beats[0]!};
  const shot=explainerShot('diagram',0,5000,beat,f.narration,f.profile,f.rig);
  assert.ok(shot.visualization!.parts.length>0);assert.ok(shot.visualization!.events.length>0);
  assert.doesNotThrow(()=>validateExplainerStoryboard({shots:[shot]},f.narration,[beat],f.profile,f.rig,config));
  const actors=await fixture({names:['Linh'],text:'Linh waits.'});
  const cinematicPresenter=ConfigSchema.parse({...config,presentation:{...config.presentation,mode:'story-cinematic'}});
  assert.throws(()=>validateExplainerStoryboard({shots:[actors.shot]},actors.narration,[actors.beat],actors.profile,actors.rig,cinematicPresenter),/objectless|actor|diagram|presenter/i);
});

for(const alias of ['storyboard','scenes','id','shot','scene','shots','shot.locked'] as const)test(`obsolete plans honor true ${alias} despite competing false locks`,async()=>{
  const f=await fixture({names:['Linh'],text:'Linh waits.'}),old=structuredClone(f.shot);
  (old.cinematic as unknown as {producer:string}).producer='story-direction-2.2.22';
  const locks:Record<string,boolean>={[old.id]:false,[`shot:${old.id}`]:false,[`scene:${old.id}`]:false};
  if(alias==='shot.locked')old.locked=true;
  else locks[alias==='id'?old.id:alias==='shot'||alias==='scene'?`${alias}:${old.id}`:alias==='shots'?`shots.${old.id}`:alias]=true;
  const file=path.join(f.root,'old-storyboard.json');await fs.writeFile(file,JSON.stringify({shots:[old]}));
  await assert.rejects(()=>readStoryboardForDirection(file,locks),/locked.*migration/i);
  assert.deepEqual(inspectCinematicStoryboard({shots:[old]},locks).migration.lockedShotIds,[old.id]);
  assert.equal(JSON.parse(await fs.readFile(file,'utf8')).shots[0].cinematic.producer,'story-direction-2.2.22','migration must not retag old evidence');
});

test('unlocked obsolete numeric plan discards derived direction without retagging its source file',async()=>{
  const f=await fixture({names:['Linh'],text:'Linh waits.'}),old=structuredClone(f.shot);
  (old.cinematic as unknown as {producer:string}).producer='story-direction-2.2.22';
  const file=path.join(f.root,'old-storyboard.json'),bytes=JSON.stringify({shots:[old]});await fs.writeFile(file,bytes);
  const board=await readStoryboardForDirection(file,{});
  assert.equal(board.shots[0]!.cinematic,undefined);assert.equal(await fs.readFile(file,'utf8'),bytes);
});

for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: one sourced ordinary actor completes public local mock planning`,async()=>{
  const f=await fixture({kind,names:['Linh'],text:'Linh waits.',authoring:'factual'});
  const beats=await createExplanation(f.root,f.config,f.router,f.story,f.narration,[f.base],f.profile);
  const board=await createStoryboard(f.root,f.config,f.router,f.story,f.narration,{characters:[]},
    [{id:'ch1',startMs:0,endMs:5000,title:'A situation',summary:f.text,narrativePurpose:'show situation',segmentIds:['cue']}],beats);
  assert.equal(board.shots[0]!.cinematic!.actorScene!.primary!.name,'Linh');
  assert.deepEqual(board.shots[0]!.visualization!.parts,[]);
  assert.deepEqual(board.shots[0]!.cinematic!.models,[]);
  assert.doesNotThrow(()=>validateExplainerStoryboard(board,f.narration,beats,f.profile,f.rig,f.config));
});
