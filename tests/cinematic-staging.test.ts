import assert from 'node:assert/strict';
import test from 'node:test';
import { temporary } from './support.js';
import { ConfigSchema } from '../packages/core/config.js';
import { BeatSchema, StorySchema, type Narration } from '../packages/core/schemas.js';
import { compileHost } from '../packages/host/index.js';
import { ModelRouter } from '../packages/models/registry.js';
import { groundedExplanation, validateExplanation } from '../packages/explainer/plan.js';
import { explainerShot, validateExplainerStoryboard } from '../packages/explainer/storyboard.js';
import { directCinematicShot, validateModelContinuity } from '../packages/director/index.js';
import { renderCinematic } from '../library/shots/cinematic.js';
import { secureSceneFiles, validateSceneFiles } from '../packages/scenes/security.js';

const activity={method:'segment-draft' as const,windowMs:20,intervals:[]};
for(const kind of ['stick-man','mini-robot'] as const){
  test(`${kind}: the old cylinder changes hot/cold, while the improved cylinder remains hot`,async t=>{
    const root=await temporary(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},rendering:{final:{width:1280,height:720,fps:30}}});
    const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
    for(const [text,expected] of [
      ['Trong thiết kế cũ, xi-lanh phải nóng để tiết kiệm nhiên liệu, nhưng lại cần được làm nguội trong mỗi chu kỳ.',['hot','cold']],
      ['Hơi nước được dẫn đến bình ngưng, còn xi-lanh được giữ nóng.',['hot']],
    ] as const){
      const narration:Narration={mode:'srt',durationMs:5000,segments:[{id:'s1',text,startMs:0,endMs:5000}],words:[]};
      const story=StorySchema.parse({title:'Nhiệt',story:text,style:{visual:'vector'}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:5000,segmentIds:['s1'],narrationText:text,meaning:'thermal',visualGoal:'observe the narrated change',importance:1});
      const plan=groundedExplanation(story,narration,[base],profile);validateExplanation(plan,story,narration,[base],profile.id);
      const beat={...base,...plan.beats[0]!},shot=directCinematicShot(explainerShot('s1',0,5000,beat,narration,profile,rig),beat,profile,config);
      const cylinder=shot.visualization!.parts.find(p=>p.kind==='cylinder')!;
      const changes=shot.visualization!.events.filter(e=>e.targetId===cylinder.id&&String(e.type)==='state');
      assert.deepEqual(changes.map(e=>(e as unknown as {state:string}).state),expected,'the narrated thermal distinction must change the actual model');
      const files=renderCinematic(shot,profile,rig,activity,config).files.files;
      assert.match(files.find(f=>f.path==='index.html')!.content,/class="thermal-coat"/);
      assert.match(files.find(f=>f.path==='index.html')!.content,/#D65332.*#3394C5/);
      assert.match(files.find(f=>f.path==='scene.js')!.content,/thermal-hot-coat.*opacity/);
      assert.match(files.find(f=>f.path==='scene.js')!.content,/thermal-cold-coat.*opacity/);
      assert.deepEqual(validateSceneFiles(secureSceneFiles({files,dependencies:[],notes:[]}),shot,config.workflow.max_scene_bytes,[],config.rendering.final),[]);
      assert.ok(!shot.visualization!.relations.some(r=>r.from.endsWith('.flow')&&r.to===cylinder.id));
      validateExplainerStoryboard({shots:[shot]},narration,[beat],profile,rig,config);
    }
  });
  test(`${kind}: comparison preserves distinct narrated vehicles and paired attention`,async t=>{
    const root=await temporary(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},rendering:{final:{width:1280,height:720,fps:30}}});
    const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
    const text='Ta so sánh xe dùng động cơ đốt trong với xe điện: nguồn năng lượng và bộ phận tạo chuyển động khác nhau.';
    const narration:Narration={mode:'srt',durationMs:6000,segments:[{id:'s1',text,startMs:0,endMs:6000}],words:[]};
    const story=StorySchema.parse({title:'Hai phương án',story:text,style:{visual:'vector'}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:6000,segmentIds:['s1'],narrationText:text,meaning:'compare',visualGoal:'compare alternatives',importance:1});
    const plan=groundedExplanation(story,narration,[base],profile);validateExplanation(plan,story,narration,[base],profile.id);
    const beat={...base,...plan.beats[0]!};
    assert.deepEqual(beat.entities.filter(e=>e.kind==='car').map(e=>e.label),['xe dùng động cơ đốt trong','xe điện']);
    const shot=directCinematicShot(explainerShot('s1',0,6000,beat,narration,profile,rig),beat,profile,config);
    const comparisons=shot.host!.actions.filter(a=>a.type==='compare');assert.ok(comparisons.length);
    for(const a of comparisons){
      assert.ok(a.secondTarget&&a.target!.partId!==a.secondTarget.partId);
      const paired=shot.cinematic!.performance.gestures.filter(g=>g.startMs>=a.startMs&&g.endMs<=a.endMs);
      assert.equal(paired.length,2,'one A/B action requires two actual attention windows');
      assert.notDeepEqual(paired[0]!.target,paired[1]!.target);
    }
    const rendered=renderCinematic(shot,profile,rig,activity,config);
    const html=rendered.files.files.find(f=>f.path==='index.html')!.content;
    assert.match(html,/data-power-kind="electric"/);assert.match(html,/data-power-kind="combustion"/);
    const covered=new Set(rendered.geometry.interactions.map(a=>a.partId));
    assert.ok(beat.entities.every(e=>covered.has(e.id)),'the paired expansion must not drop other explanatory targets');
    validateExplainerStoryboard({shots:[shot]},narration,[beat],profile,rig,config);
  });
  for(const text of ['Động cơ truyền chuyển động đến bánh xe.','Hơi nước được dẫn đến bình ngưng, còn xi-lanh được giữ nóng.','Pin cấp năng lượng cho động cơ điện.']){
    test(`${kind}: illustrative control precedes the narrated effect: ${text}`,async t=>{
      const root=await temporary(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},rendering:{final:{width:1280,height:720,fps:30}}});
      const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
      const narration:Narration={mode:'srt',durationMs:4000,segments:[{id:'s1',text,startMs:0,endMs:4000}],words:[]};
      const story=StorySchema.parse({title:'Cơ chế',story:text,style:{visual:'vector'}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:4000,segmentIds:['s1'],narrationText:text,meaning:'transfer',visualGoal:'control then effect',importance:1});
      const beat={...base,...groundedExplanation(story,narration,[base],profile).beats[0]!},shot=directCinematicShot(explainerShot('s1',0,4000,beat,narration,profile,rig),beat,profile,config);
      const operation=shot.host!.actions.find(a=>a.type==='operate-model');assert.ok(operation?.contactMs,'real sample mechanism needs control contact');
      const transfer=shot.visualization!.events.find(e=>e.type==='flow');assert.ok(transfer?.contactRequired);
      assert.ok(transfer.startMs>operation.contactMs&&transfer.endMs<=operation.endMs);
      const rendered=renderCinematic(shot,profile,rig,activity,config);
      const contact=rendered.geometry.interactions.find(a=>a.type==='operate-model');assert.ok(contact&&contact.errorPx<1);
      const html=rendered.files.files.find(f=>f.path==='index.html')!.content;
      assert.match(html,/relation-flow/);assert.match(html,/data-control="illustrative"/);
      validateExplainerStoryboard({shots:[shot]},narration,[beat],profile,rig,config);
    });
  }
}

for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: persistent anchors and reachable energy control across a 1.707-second cue`,async t=>{
  const root=await temporary(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},rendering:{final:{width:1280,height:720,fps:30}}});
  const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
  const narration:Narration={mode:'srt',durationMs:7207,segments:[
    {id:'a',text:'Ta so sánh xe dùng động cơ đốt trong với xe điện: nguồn năng lượng khác nhau.',startMs:0,endMs:5500},
    {id:'b',text:'Pin cấp năng lượng cho động cơ điện.',startMs:5500,endMs:7207}],words:[]};
  const story=StorySchema.parse({title:'Qua cảnh',story:narration.segments.map(s=>s.text).join(' '),style:{visual:'vector'}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:7207,segmentIds:['a','b'],narrationText:story.story,meaning:'compare',visualGoal:'keep objects stable',importance:1});
  const beat={...base,...groundedExplanation(story,narration,[base],profile).beats[0]!};
  const next=explainerShot('s2',5500,7207,beat,narration,profile,rig);
  const first=directCinematicShot(explainerShot('s1',0,5500,beat,narration,profile,rig),beat,profile,config,undefined,{nextControlId:next.host!.actions.find(a=>a.type==='operate-model')!.target!.partId});
  const second=directCinematicShot(next,beat,profile,config,first.cinematic!.continuity.exit,{facing:first.cinematic!.continuity.facing,parts:first.visualization!.parts});
  for(const part of first.visualization!.parts){
    const same=second.visualization!.parts.find(p=>p.id===part.id)!;
    assert.deepEqual([same.x,same.y,same.width,same.height],[part.x,part.y,part.width,part.height],`${part.id}: attention is not permission to teleport`);
  }
  assert.ok(second.host!.actions.some(a=>a.type==='operate-model'),'a stable battery still needs a prepared, reachable control');
  validateExplainerStoryboard({shots:[first,second]},narration,[beat],profile,rig,config);
  const geometry=renderCinematic(second,profile,rig,activity,config).geometry;
  assert.ok(geometry.interactions.some(a=>a.type==='operate-model'&&a.errorPx<1));
  const forged=structuredClone(second);forged.visualization!.parts[0]!.x+=.01;
  assert.throws(()=>validateModelContinuity(first,forged),/teleports/);
});

test('thermal claims reject a forged heat state and negated heating remains unpainted',async t=>{
  const root=await temporary(t),config=ConfigSchema.parse({}),{profile}=await compileHost(root,config,new ModelRouter(config,root));
  const text='Xi-lanh được giữ nóng.',narration:Narration={mode:'srt',durationMs:4000,segments:[{id:'a',text,startMs:0,endMs:4000}],words:[]};
  const story=StorySchema.parse({title:'Nhiệt',story:text,style:{visual:'vector'}}),beat=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:4000,segmentIds:['a'],narrationText:text,meaning:'thermal',visualGoal:'state',importance:1});
  const plan=groundedExplanation(story,narration,[beat],profile),forged=structuredClone(plan);
  forged.beats[0]!.entities[0]!.states![0]!.value='cold';assert.throws(()=>validateExplanation(forged,story,narration,[beat],profile.id),/thermal.*subject|predicates/);
  const negative='Xi-lanh không được giữ nóng.';
  const n={...narration,segments:[{...narration.segments[0]!,text:negative}]};
  assert.deepEqual(groundedExplanation(story,n,[{...beat,narrationText:negative}],profile).beats[0]!.entities[0]!.states??[],[]);
});

test('the improved condenser retains its earlier sourced cooling duty beside a hot cylinder',async t=>{
  const root=await temporary(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},rendering:{final:{width:1280,height:720,fps:30}}});
  const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
  const narration:Narration={mode:'srt',durationMs:8000,segments:[
    {id:'cooling',startMs:0,endMs:4000,text:'James Watt tách nhiệm vụ làm lạnh sang một bình ngưng riêng.'},
    {id:'split',startMs:4000,endMs:8000,text:'Hơi nước được dẫn đến bình ngưng, còn xi-lanh được giữ nóng.'}],words:[]};
  const text=narration.segments[1]!.text,story=StorySchema.parse({title:'Tách nhiệm vụ',story:narration.segments.map(s=>s.text).join(' '),style:{visual:'vector'}}),base=BeatSchema.parse({id:'b2',chapterId:'ch1',startMs:4000,endMs:8000,segmentIds:['split'],narrationText:text,meaning:'mechanism',visualGoal:'separate thermal duties',importance:1});
  const plan=groundedExplanation(story,narration,[base],profile);validateExplanation(plan,story,narration,[base],profile.id);
  const beat={...base,...plan.beats[0]!},shot=directCinematicShot(explainerShot('s2',4000,8000,beat,narration,profile,rig),beat,profile,config);
  const cold=shot.visualization!.events.find(e=>e.type==='state'&&e.state==='cold');assert.ok(cold);
  assert.equal(cold.sourceRefs[0]!.segmentId,'cooling');assert.equal(cold.startMs,4000);
  const hot=shot.visualization!.events.find(e=>e.type==='state'&&e.state==='hot');assert.ok(hot);
  assert.notEqual(cold.targetId,hot.targetId);
  validateExplainerStoryboard({shots:[shot]},narration,[beat],profile,rig,config);
});
