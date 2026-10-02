import assert from 'node:assert/strict';
import test from 'node:test';
import { temporary } from './support.js';
import { ConfigSchema } from '../packages/core/config.js';
import { BeatSchema, StorySchema, type Narration } from '../packages/core/schemas.js';
import { compileHost } from '../packages/host/index.js';
import { ModelRouter } from '../packages/models/registry.js';
import { groundedExplanation } from '../packages/explainer/plan.js';
import { explainerShot } from '../packages/explainer/storyboard.js';
import { directCinematicShot, validateCinematicShot } from '../packages/director/index.js';
import { renderCinematic } from '../library/shots/cinematic.js';
import { creativeFixture } from './creative-fixture.js';
import { validateCinematicEdit } from '../apps/server/cinematic.js';
import { validateExplainerStoryboard } from '../packages/explainer/storyboard.js';
import { planCamera } from '../packages/director/camera.js';

for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: emotion follows the current cue instead of an identical 45-percent schedule`,async t=>{
  const root=await temporary(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},rendering:{final:{width:1280,height:720,fps:30}}});
  const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
  const narration:Narration={mode:'srt',durationMs:9000,words:[],segments:[{id:'problem',startMs:0,endMs:5000,text:'Xi-lanh phải nóng, nhưng lại cần được làm nguội trong mỗi chu kỳ.'},{id:'solution',startMs:5000,endMs:9000,text:'Xi-lanh được giữ nóng để sử dụng nhiệt hiệu quả hơn.'}]};
  const story=StorySchema.parse({title:'Vấn đề và giải pháp',story:narration.segments.map(s=>s.text).join(' '),style:{visual:'vector'}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:9000,segmentIds:['problem','solution'],narrationText:story.story,meaning:'explain',visualGoal:'read reactions',importance:1});
  const beat={...base,...groundedExplanation(story,narration,[base],profile).beats[0]!};
  const first=directCinematicShot(explainerShot('s1',0,5000,beat,narration,profile,rig),beat,profile,config),second=directCinematicShot(explainerShot('s2',5000,9000,beat,narration,profile,rig),beat,profile,config,first.cinematic!.continuity.exit,{facing:first.cinematic!.continuity.facing,parts:first.visualization!.parts});
  assert.ok(first.cinematic!.performance.expressions.some(e=>e.mood==='concerned'));
  assert.ok(second.cinematic!.performance.expressions.some(e=>e.mood==='understanding'));
  assert.ok(!second.cinematic!.performance.expressions.some(e=>e.mood==='concerned'),'a prior problem must not overwrite the current improvement');
  assert.notEqual(first.cinematic!.performance.expressions[0]!.mood,'curious','every shot need not restart curiosity');
});

test('the production stage has explicit depth planes, shadows and foreground occlusion',async t=>{
  const root=await temporary(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},rendering:{final:{width:1280,height:720,fps:30}}});
  const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root)),text='Hơi nước đẩy pít-tông trong xi-lanh.';
  const narration:Narration={mode:'srt',durationMs:6000,words:[],segments:[{id:'cue',startMs:0,endMs:6000,text}]},story=StorySchema.parse({title:'Cơ chế',story:text,style:{visual:'vector'}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:6000,segmentIds:['cue'],narrationText:text,meaning:'cause',visualGoal:'world stage',importance:1}),beat={...base,...groundedExplanation(story,narration,[base],profile).beats[0]!};
  const shot=directCinematicShot(explainerShot('s1',0,6000,beat,narration,profile,rig),beat,profile,config),html=renderCinematic(shot,profile,rig,{method:'segment-draft',windowMs:20,intervals:[]},config,'assets/environment.png').files.files.find(f=>f.path==='index.html')!.content;
  assert.match(html,/data-stage-plane="midground"/);assert.match(html,/data-stage-plane="foreground"/);assert.match(html,/data-light-direction="upper-left"/);assert.match(html,/data-model-shadow=/);
  assert.ok(html.indexOf('data-stage-plane="foreground"')>html.indexOf('id="performer"'),'authored foreground can occlude the lower actor body');
});

test('reaction and invitation intents pass production and edit validation without inventing contact',async t=>{
  const f=await creativeFixture(await temporary(t));
  for(const [intent,clip] of [['react','react'],['explain','lead-next']] as const){
    const shot=structuredClone(f.shot),action=shot.host!.actions[0]!,gesture=shot.cinematic!.performance.gestures.find(g=>g.startMs===action.startMs-shot.startMs)!;
    action.type=intent;delete action.target;delete action.secondTarget;delete action.contactMs;
    gesture.action=clip;delete gesture.target;delete gesture.contactMs;
    assert.doesNotThrow(()=>validateCinematicShot(shot,f.profile,f.config));
    assert.doesNotThrow(()=>validateCinematicEdit({shots:[shot]},f.config,{shots:[f.shot]}));
    assert.doesNotThrow(()=>validateExplainerStoryboard({shots:[shot]},f.narration,[f.beat],f.profile,f.rig,f.config));
    assert.equal(gesture.contactMs,undefined);
    assert.deepEqual(shot.cinematic!.continuity,f.shot.cinematic!.continuity);assert.equal(shot.endMs,f.shot.endMs);
  }
});

test('an operate intent with contact removed is rejected rather than accepted as an invitation',async t=>{
  const f=await creativeFixture(await temporary(t)),shot=structuredClone(f.shot),action=shot.host!.actions.find(a=>a.type==='operate-model');
  assert.ok(action,'fixture must actually exercise an operation');
  const gesture=shot.cinematic!.performance.gestures.find(g=>g.startMs===action.startMs-shot.startMs)!;
  delete action.contactMs;delete gesture.contactMs;
  assert.throws(()=>validateCinematicShot(shot,f.profile,f.config),/contact/i);
  assert.throws(()=>validateExplainerStoryboard({shots:[shot]},f.narration,[f.beat],f.profile,f.rig,f.config),/contact/i);
});

async function decimalTargetFixture(root:string){
  const f=await creativeFixture(root),shot=structuredClone(f.shot),c=shot.cinematic!,p=c.performance,part=shot.visualization!.parts[0]!;
  part.x=.58;
  // An equivalent serialized decimal can differ from normalized stage arithmetic.
  const target={x:742.4000000000001,y:part.y*p.stage.height};
  assert.notEqual(.58*1280,target.x,'the fixture must exercise floating-point arithmetic drift');
  assert.ok(Math.abs(.58*1280-target.x)<1e-6);
  shot.host!.actions=[{type:'point',startMs:shot.startMs,endMs:shot.endMs,narrationAnchor:'cue',
    target:{modelId:shot.visualization!.modelId,partId:part.id,anchor:'center'}}];
  p.gestures=[{id:`${shot.id}.decimal-point`,action:'point',startMs:0,endMs:p.durationMs,target}];
  p.gazes=[{startMs:0,endMs:p.durationMs,target}];
  shot.visualization!.events=shot.visualization!.events.map(event=>({...event,contactRequired:false}));
  c.continuity.models=shot.visualization!.parts.map(model=>({partId:model.id,x:model.x,y:model.y,width:model.width,height:model.height}));
  c.camera=planCamera(p,f.profile,{framing:'wide',movement:'locked',parts:shot.visualization!.parts});
  shot.camera={shotSize:'wide',movement:'locked',angle:'eye-level'};
  return {...f,shot};
}

test('world targets accept authored decimal roundoff at .58 of a 1280px stage',async t=>{
  const f=await decimalTargetFixture(await temporary(t));
  assert.doesNotThrow(()=>validateCinematicShot(f.shot,f.profile,f.config));
  assert.doesNotThrow(()=>validateExplainerStoryboard({shots:[f.shot]},f.narration,[f.beat],f.profile,f.rig,f.config));
  const exact=structuredClone(f.shot);exact.cinematic!.performance.gestures[0]!.target!.x=742.4;
  assert.doesNotThrow(()=>validateCinematicShot(exact,f.profile,f.config));
  const tolerated=structuredClone(exact);tolerated.cinematic!.performance.gestures[0]!.target!.x+=5e-7;
  assert.doesNotThrow(()=>validateCinematicShot(tolerated,f.profile,f.config));
  const outside=structuredClone(exact);outside.cinematic!.performance.gestures[0]!.target!.x+=2e-6;
  assert.throws(()=>validateCinematicShot(outside,f.profile,f.config),/wrong world target/);
});

for(const axis of ['x','y'] as const)test(`world targets reject a .01px error on ${axis} while accepting the decimal baseline`,async t=>{
  const f=await decimalTargetFixture(await temporary(t));
  assert.doesNotThrow(()=>validateCinematicShot(f.shot,f.profile,f.config));
  const wrong=structuredClone(f.shot);wrong.cinematic!.performance.gestures[0]!.target![axis]+=.01;
  assert.throws(()=>validateCinematicShot(wrong,f.profile,f.config),/wrong world target/);
  assert.throws(()=>validateExplainerStoryboard({shots:[wrong]},f.narration,[f.beat],f.profile,f.rig,f.config),/wrong world target/);
});

test('world targets reject a missing gesture target and an unexpected target on an invitation',async t=>{
  const f=await decimalTargetFixture(await temporary(t)),missing=structuredClone(f.shot);
  delete missing.cinematic!.performance.gestures[0]!.target;
  assert.throws(()=>validateCinematicShot(missing,f.profile,f.config),/missing gesture target/);
  const unexpected=structuredClone(f.shot);
  unexpected.host!.actions[0]!.type='explain';delete unexpected.host!.actions[0]!.target;
  unexpected.cinematic!.performance.gestures[0]!.action='lead-next';
  assert.throws(()=>validateCinematicShot(unexpected,f.profile,f.config),/wrong world target/);
});

async function continuousCueFixture(root:string){
  const f=await creativeFixture(root),text=f.narration.segments[0]!.text;
  const narration:Narration={mode:'srt',durationMs:5000,words:[],segments:[{id:'cue-a',startMs:0,endMs:2500,text},{id:'cue-b',startMs:2500,endMs:5000,text}]};
  const story=StorySchema.parse({title:'Continuous acting',story:`${text}\n${text}`,style:{visual:''}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:5000,segmentIds:['cue-a','cue-b'],narrationText:story.story,meaning:'explain',visualGoal:'one continuous point across two cues',importance:1});
  const beat={...base,...groundedExplanation(story,narration,[base],f.profile).beats[0]!};
  const shot=directCinematicShot(explainerShot('ch1.s001',0,5000,beat,narration,f.profile,f.rig),beat,f.profile,f.config),p=shot.cinematic!.performance,part=shot.visualization!.parts[0]!;
  const target={modelId:shot.visualization!.modelId,partId:part.id,anchor:'center' as const},worldTarget={x:part.x*p.stage.width,y:part.y*p.stage.height};
  shot.host!.actions=narration.segments.map(cue=>({type:'point',startMs:cue.startMs,endMs:cue.endMs,narrationAnchor:cue.id,target:{...target}}));
  p.gestures=[{id:'continuous-point',action:'point',startMs:0,endMs:5000,target:worldTarget}];p.gazes=[{startMs:0,endMs:5000,target:worldTarget}];
  shot.visualization!.events=narration.segments.map(cue=>({type:'highlight',targetId:part.id,narrationAnchor:cue.id,startMs:cue.startMs,endMs:cue.endMs,contactRequired:false,motion:'none',sourceRefs:[{kind:'narration',segmentId:cue.id,quote:cue.text}]}));
  shot.cinematic!.camera=planCamera(p,f.profile,{framing:'wide',movement:'locked',parts:shot.visualization!.parts});shot.camera={shotSize:'wide',movement:'locked',angle:'eye-level'};
  return {...f,shot,narration,story,beat};
}

test('identical adjacent non-contact actions with different cue anchors can share one matching continuous gesture',async t=>{
  const f=await continuousCueFixture(await temporary(t)),before=structuredClone(f.shot);
  assert.notEqual(f.shot.host!.actions[0]!.narrationAnchor,f.shot.host!.actions[1]!.narrationAnchor);
  assert.equal(f.shot.host!.actions.length,2);assert.equal(f.shot.cinematic!.performance.gestures.length,1);
  assert.doesNotThrow(()=>validateCinematicShot(f.shot,f.profile,f.config));
  assert.doesNotThrow(()=>validateExplainerStoryboard({shots:[f.shot]},f.narration,[f.beat],f.profile,f.rig,f.config));
  assert.deepEqual(f.shot,before,'validation must retain both authored cue actions and their targets');
});

for(const defect of ['gap','different-target','different-intent','host-contact','gesture-contact','wrong-world-target','wrong-clip','short-gesture'] as const)test(`a shared gesture rejects ${defect} instead of merging incompatible host actions`,async t=>{
  const f=await continuousCueFixture(await temporary(t)),shot=structuredClone(f.shot),actions=shot.host!.actions,gesture=shot.cinematic!.performance.gestures[0]!;
  if(defect==='gap')actions[0]!.endMs-=100;
  if(defect==='different-target'){const other=shot.visualization!.parts.find(part=>part.id!==actions[0]!.target!.partId);assert.ok(other);actions[1]!.target!.partId=other.id;}
  if(defect==='different-intent')actions[1]!.type='explain';
  if(defect==='host-contact')actions[1]!.contactMs=3000;
  if(defect==='gesture-contact')gesture.contactMs=1800;
  if(defect==='wrong-world-target')gesture.target!.x+=.01;
  if(defect==='wrong-clip')gesture.action='react';
  if(defect==='short-gesture')gesture.endMs=4999;
  assert.throws(()=>validateCinematicShot(shot,f.profile,f.config),/action|gesture|target|contact|intent|clock|performance/i);
  assert.throws(()=>validateExplainerStoryboard({shots:[shot]},f.narration,[f.beat],f.profile,f.rig,f.config),/action|gesture|target|contact|intent|clock|performance/i);
});
