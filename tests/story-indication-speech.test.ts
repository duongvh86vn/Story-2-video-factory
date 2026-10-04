import assert from 'node:assert/strict';
import test, {beforeEach, type TestContext} from 'node:test';
import {promises as fs, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ConfigSchema, type ModelRole} from '../packages/core/config.js';
import type {ModelRequest} from '../packages/models/adapter.js';
import type {ZodType, ZodTypeDef} from 'zod';
import {BeatSchema, StorySchema, type Beat, type Narration, type Shot} from '../packages/core/schemas.js';
import {HostProfileSchema, HostActions} from '../packages/host/schemas.js';
import {buildRig} from '../packages/host/rig.js';
import {ModelRouter} from '../packages/models/registry.js';
import {groundedExplanation, validateExplanation, createExplanation, EXPLANATION_VERSION} from '../packages/explainer/plan.js';
import {EntitySchema} from '../packages/explainer/schemas.js';
import {explainerShot, validateExplainerStoryboard} from '../packages/explainer/storyboard.js';
import {directCinematicShot} from '../packages/director/index.js';
import {requireFinalStoryDirection, validateStoryActingCoverage} from '../packages/director/story-coverage.js';
import {DIRECTION_VERSION} from '../packages/director/schemas.js';
import {partAnchor} from '../packages/host/controller.js';
import {actorProfile, actorSpeech} from '../packages/actors/model.js';
import {compilePerformance, samplePerformance} from '../packages/animation/compiler.js';
import {planCamera} from '../packages/director/camera.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles, validateSceneScript} from '../packages/scenes/security.js';
import {HyperFramesEngine} from '../packages/render/hyperframes.js';
import {hash} from '../packages/core/utils.js';

const evidence=process.env.STORY_INDICATION_SPEECH_EVIDENCE??mkdtempSync(path.join(tmpdir(),'story-indication-speech-'));
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const kinds=['stick-man','mini-robot'] as const;
type Kind=typeof kinds[number];
type Owner='primary'|'supporting';
type Acting='indication'|'speech'|'manipulation';
beforeEach(t=>{
  if(!('mock' in t))throw new Error('TestContext is required for fail-closed process guards');
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('FORBIDDEN_NATIVE_PROVIDER');});
  for(const method of ['validate','renderDraft','renderFinal','snapshot','snapshots'] as const)
    t.mock.method(HyperFramesEngine.prototype,method,async()=>{throw new Error('FORBIDDEN_BROWSER_RENDER');});
});
function profile(kind:Kind){return HostProfileSchema.parse({id:'seed',version:1,kind,role:'story-actor',name:'Seed',description:'Independent ordinary story fixture',appearance:{outline:'#172B36',shell:'#F5F3EC',screen:'#142A36',accent:'#27D8C5',badge:'#F6BD4F',headScale:1,bodyScale:1,strokeWidth:6},actions:[...HostActions],immutable:['identity'],profileHash:'independent31',compilerVersion:'host-svg-2.2.7',sourcePath:'fixture.md'});}
async function retain(name:string,data:unknown){await fs.mkdir(evidence,{recursive:true});await fs.writeFile(path.join(evidence,name+'.json'),JSON.stringify(data,null,2));}
function fixture(kind:Kind='stick-man',owner:Owner='primary',acting:Acting='indication'){
  const p=profile(kind),rig=buildRig(p),who=owner==='primary'?'Linh':'Minh';
  const early='Linh waits beside a table in the public library. Minh waits beside a chair.';
  const targetStatement=acting==='speech'?`${who} says, "Please sit by the table."`:acting==='manipulation'?`${who} moves the table in the public library.`:`${who} points to a table in the public library.`;
  const other=owner==='primary'?'Minh waits beside a chair.':'Linh waits beside a chair.';
  const late=owner==='primary'?targetStatement+' '+other:other+' '+targetStatement;
  const narration:Narration={mode:'srt',durationMs:6000,segments:[{id:'early',startMs:0,endMs:3000,text:early},{id:'late',startMs:3000,endMs:6000,text:late}],words:[]};
  const text=early+' '+late,story=StorySchema.parse({title:'At the public library',genre:'fiction',story:text,style:{visual:'vector'},characters:[{id:'linh',name:'Linh',description:early},{id:'minh',name:'Minh',description:early}]});
  const base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:6000,segmentIds:['early','late'],narrationText:text,meaning:text,visualGoal:'Show the sourced actors at a public library',importance:1});
  const explanation=groundedExplanation(story,narration,[base],p,true),b=explanation.beats[0]!,lateRef={kind:'narration' as const,segmentId:'late',quote:late};
  b.entities=[{id:'table',kind:'object',label:'table',sourceRefs:b.sourceRefs},{id:'chair',kind:'object',label:'chair',sourceRefs:b.sourceRefs}];b.relations=[];b.visualMethod='summary';
  b.sceneIntent!.acting=b.sceneIntent!.participants.map(person=>({participantId:person.id,kind:person.name===who?acting:'hold',statement:acting==='speech'?late:person.name===who?targetStatement:other,sourceRefs:[lateRef],...(person.name===who&&acting!=='speech'?{targetIds:['table']}:{})}));
  validateExplanation(explanation,story,narration,[base],p.id);
  const beat:Beat={...base,...b},config=ConfigSchema.parse({presentation:{mode:'story-cinematic',character_mode:'actors'},rendering:{final:{width:1280,height:720,fps:30}},models:{planner:{provider:'mock'},storyboard:{provider:'mock'},fallback:{provider:'mock'}},retry:{structured_output:0,render:0}});
  const shot=directCinematicShot(explainerShot('library-acting',0,6000,beat,narration,p,rig),beat,p,config,undefined,{seed:true});
  const c=shot.cinematic!,cast=c.actorScene!;
  const performances=[c.performance,...cast.supporting.map(a=>a.performance)];
  for(const performance of performances){performance.walks=[];performance.turns=[];performance.gestures=[];performance.expressions=[];performance.gazes=[];performance.postures=[];performance.props=[];}
  shot.host!.actions=[{type:'idle',startMs:0,endMs:6000}];for(const a of cast.supporting)a.actions=[{type:'idle',startMs:0,endMs:6000}];
  cast.speakingSegmentIds=[];for(const a of cast.supporting)a.speakingSegmentIds=[];
  shot.visualization!.events=[];c.propBindings=[];c.continuity.exit={...c.performance.root};c.continuity.facing=c.performance.facing??'front';
  c.artDirection={origin:'authored',brief:'An independent sourced ordinary library situation with the accepted people and objects visible.',useEnvironment:false,showHeading:false,palette:{background:'#FFFFFF',surface:'#EEEEEE',ink:'#172B36',accent:'#27D8C5'},layers:[],models:[]};
  const performance=owner==='primary'?c.performance:cast.supporting[0]!.performance;
  const actions=()=>owner==='primary'?shot.host!.actions:cast.supporting[0]!.actions;
  const setActions=(value:NonNullable<Shot['host']>['actions'])=>{if(owner==='primary')shot.host!.actions=value;else cast.supporting[0]!.actions=value;};
  if(acting==='speech'){if(owner==='primary')cast.speakingSegmentIds=['late'];else cast.supporting[0]!.speakingSegmentIds=['late'];}
  else{const target=partAnchor(shot,'table','center',1280,720);setActions([{type:'point',startMs:3500,endMs:5500,narrationAnchor:'late',target:{modelId:shot.visualization!.modelId,partId:'table',anchor:'center'}}]);performance.gestures=[{id:'library-point',action:'point',startMs:3500,endMs:5500,target}];}
  c.camera=planCamera(c.performance,actorProfile(cast.primary!),{framing:'wide',movement:'locked',focus:'ensemble',parts:shot.visualization!.parts,supporting:cast.supporting.map(a=>({performance:a.performance,profile:actorProfile(a.character)}))});
  shot.camera={shotSize:c.camera.framing,movement:c.camera.movement,angle:'eye-level'};
  function publicGate(s=shot,b=beat){requireFinalStoryDirection({shots:[s]},[b]);validateExplainerStoryboard({shots:[s]},narration,[b],p,rig,config);}
  function coverage(s=shot,b=beat){validateStoryActingCoverage({shots:[s]},[b],narration);}
  return {p,rig,kind,owner,acting,who,early,late,targetStatement,narration,text,story,base,explanation,beat,config,shot,performance,actions,setActions,publicGate,coverage};
}

test('source31/explanation6 contract describes contiguous labels and indication/speech capabilities',()=>{
  assert.equal(DIRECTION_VERSION,'story-direction-2.2.31');assert.equal(EXPLANATION_VERSION,'sourced-explanation-2.2.6');assert.match(EntitySchema.shape.label.description!,/contiguous excerpt/);
});
test('quoted dialogue plus a following actor statement retains the complete current cue assertion',()=>{
  const f=fixture('stick-man','primary','speech');assert.doesNotThrow(()=>f.publicGate());
  assert.equal(f.beat.sceneIntent!.acting![0]!.statement,f.late);
  const fragment=structuredClone(f.explanation);fragment.beats[0]!.sceneIntent!.acting![0]!.statement=f.targetStatement;
  assert.throws(()=>validateExplanation(fragment,f.story,f.narration,[f.base],f.p.id),/whole current narration/);
});
test('ordinary story exact excerpts pass; composed labels and false subjects remain rejected',()=>{
  const f=fixture();for(const label of ['table','a table','public library']){const candidate=structuredClone(f.explanation);candidate.beats[0]!.entities[0]!.label=label;assert.doesNotThrow(()=>validateExplanation(candidate,f.story,f.narration,[f.base],f.p.id));}
  for(const label of ['Library table','Minh table','Linh moves the chair','famous library table']){const candidate=structuredClone(f.explanation);candidate.beats[0]!.entities[0]!.label=label;assert.throws(()=>validateExplanation(candidate,f.story,f.narration,[f.base],f.p.id),/source excerpt/);}
  const invented=structuredClone(f.explanation);invented.beats[0]!.entities[0]!.sourceRefs=[{kind:'narration',segmentId:'late',quote:'Minh owns a library table.'}];assert.throws(()=>validateExplanation(invented,f.story,f.narration,[f.base],f.p.id),/Unverifiable source/);
  const wrong=structuredClone(f.explanation);wrong.beats[0]!.sceneIntent!.acting![0]!.statement='Minh points to a table in the public library.';assert.throws(()=>validateExplanation(wrong,f.story,f.narration,[f.base],f.p.id),/whole current narration/);
});
test('real explanation normalization includes label contract, rejects composed label, preserves native narration',async t=>{
  const f=fixture(),root=await fs.mkdtemp(path.join(evidence,'planner-'));f.config.models.planner.provider='gateway';const router=new ModelRouter(f.config,root),requests:unknown[]=[];
  t.mock.method(router,'structured',async<T>(_role:ModelRole,request:ModelRequest,schema:ZodType<T,ZodTypeDef,any>):Promise<T>=>{requests.push(request);return schema.parse(f.explanation);});
  const original=JSON.stringify({story:f.story,narration:f.narration}),result=await createExplanation(root,f.config,router,f.story,f.narration,[f.base],f.p);
  assert.equal(result[0]!.sceneIntent!.acting![0]!.kind,'indication');assert.equal(JSON.stringify({story:f.story,narration:f.narration}),original);
  assert.match(JSON.stringify(requests),/entityLabelContract/);assert.match(JSON.stringify(requests),/contiguous source excerpt/);assert.match(JSON.stringify(requests),/speakingSegmentIds/);
  const candidate=structuredClone(f.explanation);candidate.beats[0]!.entities[0]!.label='Library table';t.mock.method(router,'structured',async<T>(_role:ModelRole,_request:ModelRequest,schema:ZodType<T,ZodTypeDef,any>):Promise<T>=>schema.parse(candidate));
  await assert.rejects(createExplanation(root,f.config,router,f.story,f.narration,[f.base],f.p),/semantic validation exhausted.*source excerpt/);await retain('planner-request',{requests,result,root,nativeProviderCalls:0});
});

for(const kind of kinds)for(const owner of ['primary','supporting'] as const){
  test(`${kind}/${owner}: speech metadata in an early-only visible shot cannot cover the later cue`,()=>{
    const f=fixture(kind,owner,'speech');assert.doesNotThrow(()=>f.publicGate());f.shot.endMs=3000;
    for(const performance of [f.shot.cinematic!.performance,...f.shot.cinematic!.actorScene!.supporting.map(a=>a.performance)])performance.durationMs=3000;
    assert.throws(()=>f.coverage(),/needs-motion.*speech/);
  });
  test(`${kind}/${owner}: nonzero shot clock distinguishes local gestures from absolute cue actions`,()=>{
    for(const acting of ['indication','speech'] as const){const f=fixture(kind,owner,acting),c=f.shot.cinematic!;f.shot.startMs=1000;
      for(const performance of [c.performance,...c.actorScene!.supporting.map(a=>a.performance)]){performance.durationMs=5000;for(const g of performance.gestures){g.startMs-=1000;g.endMs-=1000;}}
      for(const actions of [f.shot.host!.actions,...c.actorScene!.supporting.map(a=>a.actions)])for(const action of actions)if(action.type==='idle')action.startMs=1000;
      assert.doesNotThrow(()=>f.publicGate());
      if(acting==='indication'){f.performance.gestures[0]!.startMs+=1000;f.performance.gestures[0]!.endMs+=1000;assert.throws(()=>f.publicGate(),/needs-motion.*indication/);}
      else{if(owner==='primary')c.actorScene!.speakingSegmentIds=['early'];else c.actorScene!.supporting[0]!.speakingSegmentIds=['early'];assert.throws(()=>f.coverage(),/needs-motion.*speech/);}
    }
  });
  test(`${kind}/${owner}: actual indication target/cue/clock passes real public final gate`,async()=>{
    const f=fixture(kind,owner);assert.doesNotThrow(()=>f.publicGate());assert.doesNotThrow(()=>f.coverage());const actor=owner==='primary'?f.shot.cinematic!.actorScene!.primary!:f.shot.cinematic!.actorScene!.supporting[0]!.character,definition=actorProfile(actor),compiled=compilePerformance(f.performance,definition,silence);
    for(const ms of [3500,4100.125,5500]){const frame=samplePerformance(f.performance,definition,ms,silence);assert.ok(Number.isFinite(frame.hands.right.x)&&Number.isFinite(frame.hands.right.y));assert.ok(frame.contactError===0);assert.doesNotMatch(JSON.stringify(frame),/NaN|Infinity/);}
    const rendered=renderCinematic(f.shot,f.p,f.rig,silence,f.config,undefined,f.narration),files=secureSceneFiles(rendered.files);assert.deepEqual(validateSceneScript(files.files.find(file=>file.path==='scene.js')!.content,f.shot.id),[]);await retain(kind+'-'+owner+'-point-positive',{beat:f.beat,shot:f.shot,compiledReport:compiled.report,rendererReport:rendered.report});
  });
  for(const fault of ['inspect','hold','operate','missingtarget','wrongtarget','gesturetarget','wrongcue','missingcue','earlyclock','clockmismatch','otheractor'] as const)test(`${kind}/${owner}: indication rejects ${fault}`,()=>{
    const f=fixture(kind,owner);assert.doesNotThrow(()=>f.publicGate());const g=f.performance.gestures[0]!,a=f.actions()[0]!;
    if(fault==='inspect')g.action='inspect';if(fault==='hold'){f.performance.gestures=[];f.setActions([{type:'idle',startMs:0,endMs:6000}]);}
    if(fault==='operate'){g.action='operate';g.contactMs=4000;a.type='operate-model';a.contactMs=4000;}
    if(fault==='missingtarget'){delete a.target;delete g.target;}if(fault==='wrongtarget'){a.target!.partId='chair';g.target=partAnchor(f.shot,'chair','center',1280,720);}
    if(fault==='gesturetarget')g.target!.x+=20;if(fault==='wrongcue')a.narrationAnchor='early';if(fault==='missingcue')delete a.narrationAnchor;
    if(fault==='earlyclock'){a.startMs=g.startMs=500;a.endMs=g.endMs=2500;a.narrationAnchor='early';}
    if(fault==='clockmismatch')g.startMs++;
    if(fault==='otheractor'){const c=f.shot.cinematic!,support=c.actorScene!.supporting[0]!;if(owner==='primary'){support.performance.gestures=f.performance.gestures;support.actions=f.actions();c.performance.gestures=[];f.setActions([{type:'idle',startMs:0,endMs:6000}]);}else{c.performance.gestures=f.performance.gestures;f.shot.host!.actions=f.actions();support.performance.gestures=[];support.actions=[{type:'idle',startMs:0,endMs:6000}];}}
    assert.throws(()=>f.publicGate(),/needs-motion|performance action|contradicts|target|clock|cue|gesture|contact/);
  });
  test(`${kind}/${owner}: owned speech cue passes final coverage and opens only activity mouth`,async()=>{
    const f=fixture(kind,owner,'speech');assert.doesNotThrow(()=>f.publicGate());const cast=f.shot.cinematic!.actorScene!,character=owner==='primary'?cast.primary!:cast.supporting[0]!.character,p=actorProfile(character),activity={...silence,intervals:[{startMs:400,endMs:700,level:.7},{startMs:3800,endMs:4200,level:.6}]},owned=actorSpeech(activity,f.narration,['late'],0,6000),compiled=compilePerformance(f.performance,p,owned);
    assert.deepEqual(owned.intervals,[{startMs:3800,endMs:4200,level:.6}]);for(const ms of [400,3800,4000,4200]){const frame=samplePerformance(f.performance,p,ms,owned),mouth=frame.face['mouth-talk']!;assert.equal(mouth.scaleY,ms>=3800&&ms<4200?1+.6*2.3:.2);}
    const rendered=renderCinematic(f.shot,f.p,f.rig,activity,f.config,undefined,f.narration);assert.equal(rendered.report.actors.length,2);await retain(kind+'-'+owner+'-speech-positive',{beat:f.beat,shot:f.shot,owned,compiledReport:compiled.report,rendererReport:rendered.report});
  });
  for(const fault of ['otheractor','wrongcue','unknowncue','voiceover','smileonly','cutaway','absent','identity','source'] as const)test(`${kind}/${owner}: speech rejects ${fault}`,()=>{
    const f=fixture(kind,owner,'speech');assert.doesNotThrow(()=>f.publicGate());const c=f.shot.cinematic!,cast=c.actorScene!,support=cast.supporting[0]!,set=(ids:string[])=>{if(owner==='primary')cast.speakingSegmentIds=ids;else support.speakingSegmentIds=ids;};
    if(fault==='otheractor'){set([]);if(owner==='primary')support.speakingSegmentIds=['late'];else cast.speakingSegmentIds=['late'];}
    if(fault==='wrongcue')set(['early']);if(fault==='unknowncue')set(['missing']);if(fault==='voiceover')set([]);
    if(fault==='smileonly'){set([]);f.performance.expressions=[{startMs:3000,endMs:6000,mood:'happy'}];}
    if(fault==='cutaway'){cast.primary=null;cast.supporting=[];f.shot.host!.presence='absent';}
    if(fault==='absent'){if(owner==='primary')f.shot.host!.presence='absent';else cast.supporting=[];}
    if(fault==='identity'){const actor=owner==='primary'?cast.primary!:support.character;actor.name='Someone else';}
    if(fault==='source'){const actor=owner==='primary'?cast.primary!:support.character;actor.sourceRefs=[{kind:'narration',segmentId:'late',quote:'Invented spoken words.'}];}
    assert.throws(()=>f.publicGate(),/needs-motion|missing story actor|actor|identity|source|evidence|participant|narration|sceneIntent/);
  });
}
test('manipulation cannot be relabeled as supported pointing to escape its canonical contact requirement',()=>{
  const f=fixture('stick-man','primary','manipulation');assert.throws(()=>f.coverage(),/needs-motion.*manipulation/);assert.throws(()=>f.publicGate(),/needs-motion.*manipulation/);
});
test('source/negation/identity and intended-target final gates remain fail closed',()=>{
  const f=fixture();for(const fault of ['negation','actoridentity','missingtarget','unknownentity','unsupported','offline'] as const){const b=structuredClone(f.beat),s=structuredClone(f.shot);
    if(fault==='negation')b.sceneIntent!.acting![0]!.statement='Linh does not point to a table in the public library.';
    if(fault==='actoridentity')s.cinematic!.actorScene!.primary!.identity='historical';
    if(fault==='missingtarget')delete b.sceneIntent!.acting![0]!.targetIds;
    if(fault==='unknownentity')b.sceneIntent!.acting![0]!.targetIds=['missing'];
    if(fault==='unsupported')b.sceneIntent!.acting![0]!.kind='unsupported';
    if(fault==='offline')s.cinematic!.artDirection!.origin='offline';
    assert.throws(()=>{const candidate=structuredClone(f.explanation);candidate.beats[0]!.sceneIntent=b.sceneIntent;validateExplanation(candidate,f.story,f.narration,[f.base],f.p.id);f.publicGate(s,b);},/whole|source|actor|identity|target|needs-motion|art-direction|historical/);
  }
});
