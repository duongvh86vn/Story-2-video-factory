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
import {directCinematicShot, validateCinematicShot} from '../packages/director/index.js';
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

const evidence=process.env.CINEMATIC_TARGET_PRECISION_EVIDENCE??mkdtempSync(path.join(tmpdir(),'cinematic-target-precision-'));
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
  const early='Linh waits beside a notebook in the public library. Minh waits beside a bag.';
  const targetStatement=acting==='speech'?`${who} says, "Please sit by the notebook."`:acting==='manipulation'?`${who} moves the notebook in the public library.`:`${who} points to a notebook in the public library.`;
  const other=owner==='primary'?'Minh waits beside a bag.':'Linh waits beside a bag.';
  const late=owner==='primary'?targetStatement+' '+other:other+' '+targetStatement;
  const narration:Narration={mode:'srt',durationMs:6000,segments:[{id:'early',startMs:0,endMs:3000,text:early},{id:'late',startMs:3000,endMs:6000,text:late}],words:[]};
  const text=early+' '+late,story=StorySchema.parse({title:'At the public library',genre:'fiction',story:text,style:{visual:'vector'},characters:[{id:'linh',name:'Linh',description:early},{id:'minh',name:'Minh',description:early}]});
  const base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:6000,segmentIds:['early','late'],narrationText:text,meaning:text,visualGoal:'Show the sourced actors at a public library',importance:1});
  const explanation=groundedExplanation(story,narration,[base],p,true),b=explanation.beats[0]!,lateRef={kind:'narration' as const,segmentId:'late',quote:late};
  b.entities=[{id:'notebook',kind:'object',label:'notebook',sourceRefs:b.sourceRefs},{id:'bag',kind:'object',label:'bag',sourceRefs:b.sourceRefs}];b.relations=[];b.visualMethod='summary';
  b.sceneIntent!.acting=b.sceneIntent!.participants.map(person=>({participantId:person.id,kind:person.name===who?acting:'hold',statement:acting==='speech'?late:person.name===who?targetStatement:other,sourceRefs:[lateRef],...(person.name===who&&acting!=='speech'?{targetIds:['notebook']}:{})}));
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
  else{const target=partAnchor(shot,'notebook','center',1280,720);setActions([{type:'point',startMs:3500,endMs:5500,narrationAnchor:'late',target:{modelId:shot.visualization!.modelId,partId:'notebook',anchor:'center'}}]);performance.gestures=[{id:'library-point',action:'point',startMs:3500,endMs:5500,target}];}
  c.camera=planCamera(c.performance,actorProfile(cast.primary!),{framing:'wide',movement:'locked',focus:'ensemble',parts:shot.visualization!.parts,supporting:cast.supporting.map(a=>({performance:a.performance,profile:actorProfile(a.character)}))});
  shot.camera={shotSize:c.camera.framing,movement:c.camera.movement,angle:'eye-level'};
  function publicGate(s=shot,b=beat){requireFinalStoryDirection({shots:[s]},[b]);validateExplainerStoryboard({shots:[s]},narration,[b],p,rig,config);}
  function coverage(s=shot,b=beat){validateStoryActingCoverage({shots:[s]},[b],narration);}
  return {p,rig,kind,owner,acting,who,early,late,targetStatement,narration,text,story,base,explanation,beat,config,shot,performance,actions,setActions,publicGate,coverage};
}

function geometry(f: ReturnType<typeof fixture>, bounds: {x:number;y:number;width:number;height:number}) {
  const part=f.shot.visualization!.parts.find(p=>p.id==='notebook')!;
  const rect={x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height};
  Object.assign(part,rect);
  const continuity=f.shot.cinematic!.continuity.models!.find(p=>p.partId===part.id)!;
  Object.assign(continuity,rect);
  const target=partAnchor(f.shot,part.id,'center',1280,720);
  f.performance.gestures[0]!.target={...target};
  return target;
}

for(const kind of kinds)for(const owner of ['primary','supporting'] as const){
  test(`${kind}/${owner}: operate-model still rejects a ten-pixel bag reach and mismatched contact`,()=>{
    const f=fixture(kind,owner),expected=geometry(f,{x:.4296875,y:.5347222,width:.1,height:.1});
    const g=f.performance.gestures[0]!,a=f.actions()[0]!;
    f.performance.root.x=expected.x-40;
    if(owner==='primary'){
      f.shot.cinematic!.continuity.entry={...f.performance.root};
      f.shot.cinematic!.continuity.exit={...f.performance.root};
    }
    a.type='operate-model';a.contactMs=4000;g.action='operate';g.contactMs=4000;
    assert.doesNotThrow(()=>validateCinematicShot(f.shot,f.p,f.config));
    g.target={x:550,y:375};
    assert.ok(Math.abs(Math.hypot(g.target.x-expected.x,g.target.y-expected.y)-10)<.0001);
    assert.throws(()=>validateCinematicShot(f.shot,f.p,f.config),/wrong world target/);
    g.target={...expected};g.contactMs=4001;
    assert.throws(()=>validateCinematicShot(f.shot,f.p,f.config),/contact\/action mismatch/);
  });
  test(`${kind}/${owner}: six-decimal notebook coordinate accepts the actual 0.000024 stage-pixel discrepancy`,async()=>{
    const f=fixture(kind,owner),expected=geometry(f,{x:.625,y:.5833333,width:.078125,height:.0277778});
    f.performance.gestures[0]!.target={x:800,y:420};
    const distance=Math.hypot(800-expected.x,420-expected.y);
    assert.ok(distance>1e-6&&distance<.001);
    assert.ok(Math.abs(distance-.000024)<1e-10);
    assert.doesNotThrow(()=>f.publicGate());
    await retain(kind+'-'+owner+'-roundtrip',{expected,received:f.performance.gestures[0]!.target,distance,shot:f.shot});
  });
  for(const representation of ['exact','rounded'] as const)for(const [name,dx,dy,accepted] of [
    ['zero',0,0,true],['existing-5e-7-x',5e-7,0,true],['existing-5e-7-y',0,5e-7,true],
    ['boundary-x',1e-6,0,true],['boundary-y',0,1e-6,true],
    ['outside-x',1.1e-6,0,false],['outside-y',0,1.1e-6,false],
    ['old-2e-6-x',2e-6,0,false],['old-2e-6-y',0,2e-6,false],
    ['negative-outside-x',-1.1e-6,0,false],['negative-outside-y',0,-1.1e-6,false],
    ['diagonal-inside',.7e-6,.7e-6,true],['diagonal-outside',.8e-6,.8e-6,false],
    ['former-broad-neighborhood',.000999,0,false],['genuine-bag-reach',0,-10,false],
  ] as const)test(`${kind}/${owner}: ${representation} representation ${name}`,async()=>{
    const f=fixture(kind,owner),expected=geometry(f,{x:.6250003,y:.5833333,width:.078125,height:.0277778});
    // These canonical values are independent fixed expectations for this input,
    // rather than recomputing the production acceptance predicate in the test.
    const canonical={x:800,y:420};
    assert.ok(Math.abs(expected.x-800.000384)<1e-10);
    assert.ok(Math.abs(expected.y-419.999976)<1e-10);
    const base=representation==='exact'?expected:canonical;
    f.performance.gestures[0]!.target={x:base.x+dx,y:base.y+dy};
    if(accepted)assert.doesNotThrow(()=>f.publicGate());
    else assert.throws(()=>f.publicGate(),/wrong world target/);
    await retain(`${kind}-${owner}-${representation}-${name}`,{expected,canonical,received:f.performance.gestures[0]!.target,accepted});
  });
  for(const representation of ['exact','rounded'] as const)
  for(const fault of ['identity','partidentity','modelidentity','anchor','cue','action','clock','contact','missingtarget','actoridentity','source','camera'] as const)
    test(`${kind}/${owner}: ${representation} target does not relax ${fault}`,()=>{
      const f=fixture(kind,owner),expected=geometry(f,{x:.625,y:.5833333,width:.078125,height:.0277778});
      const g=f.performance.gestures[0]!,a=f.actions()[0]!;
      g.target=representation==='exact'?{x:expected.x+5e-7,y:expected.y}:{x:800,y:420+5e-7};
      assert.doesNotThrow(()=>f.publicGate());
      if(fault==='identity')f.shot.cinematic!.shotId='another-shot';
      if(fault==='partidentity')a.target!.partId='bag';
      if(fault==='modelidentity')a.target!.modelId='another-model';
      if(fault==='anchor')a.target!.anchor='handle';
      if(fault==='cue')a.narrationAnchor='early';
      if(fault==='action')g.action='inspect';
      if(fault==='clock')g.startMs++;
      if(fault==='contact')g.contactMs=4000;
      if(fault==='missingtarget')delete g.target;
      if(fault==='actoridentity'){
        const cast=f.shot.cinematic!.actorScene!;
        (owner==='primary'?cast.primary!:cast.supporting[0]!.character).name='Someone else';
      }
      if(fault==='source')f.shot.sourceRefs=[{kind:'narration',segmentId:'early',quote:'Invented cue.'}];
      if(fault==='camera')f.shot.camera.movement='pan';
      assert.throws(()=>f.publicGate(),/identity|source|target|clock|cue|action|contact|actor|camera|gesture|needs-motion/);
    });
}

test('retained actual candidate supplements precision coverage; it remains a rejected film',async t=>{
  const file=process.env.CINEMATIC_TARGET_CANDIDATE;
  if(!file){t.skip('Supplemental retained native candidate is supplied only in independent evidence runs');return;}
  const candidate=JSON.parse(await fs.readFile(file,'utf8')) as {status:string;error:string;response:{shots:Shot[]}};
  assert.equal(candidate.status,'domain-rejected');
  assert.match(candidate.error,/amir-notebook-point.*wrong world target/);
  assert.match(candidate.error,/lena-bag-reach.*wrong world target/);
  for(const [shotId,partId,gestureId,accepted] of [
    ['ch002.s004','notebook','amir-notebook-point',true],
    ['ch001.s001','bag','lena-bag-reach',false],
  ] as const){
    const shot=candidate.response.shots.find(s=>s.id===shotId)!;
    const part=shot.visualization!.parts.find(p=>p.id===partId)!;
    const gesture=shot.cinematic!.performance.gestures.find(g=>g.id===gestureId)!;
    const expected=partAnchor(shot,partId,'center',1280,720),distance=Math.hypot(gesture.target!.x-expected.x,gesture.target!.y-expected.y);
    if(accepted){assert.deepEqual(gesture.target,{x:800,y:420});assert.ok(Math.abs(distance-.000024)<1e-10);}
    else assert.ok(Math.abs(distance-10)<.0001);
    for(const kind of kinds)for(const owner of ['primary','supporting'] as const){
      const f=fixture(kind,owner);geometry(f,part);f.performance.gestures[0]!.target=structuredClone(gesture.target);
      if(accepted)assert.doesNotThrow(()=>f.publicGate());
      else assert.throws(()=>f.publicGate(),/wrong world target/);
    }
    await retain('retained-'+partId,{shotId,expected,received:gesture.target,distance,acceptedByPrecisionGate:accepted,fullCandidateAccepted:false});
  }
});

