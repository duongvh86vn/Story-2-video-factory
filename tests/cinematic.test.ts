import assert from 'node:assert/strict';
import test from 'node:test';
import { temporary } from './support.js';
import { ConfigSchema } from '../packages/core/config.js';
import { BeatSchema, StorySchema, type Narration } from '../packages/core/schemas.js';
import { compileHost } from '../packages/host/index.js';
import { ModelRouter } from '../packages/models/registry.js';
import { groundedExplanation } from '../packages/explainer/plan.js';
import { explainerShot, validateExplainerStoryboard, EXPLAINER_RECIPES } from '../packages/explainer/storyboard.js';
import { directCinematicShot, validateCinematicShot } from '../packages/director/index.js';
import { renderCinematic } from '../library/shots/cinematic.js';
import { secureSceneFiles, validateSceneFiles } from '../packages/scenes/security.js';
const activity={method:'audio-rms' as const,windowMs:20,intervals:[{startMs:900,endMs:1400,level:.6}]};

for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: cinematic direction keeps narration, sources, targets and camera in the same scene contract`,async t=>{
  const root=await temporary(t),c=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},rendering:{final:{width:1280,height:720,fps:30}}});
  const {profile,rig}=await compileHost(root,c,new ModelRouter(c,root));
  const n:Narration={mode:'srt',durationMs:4000,segments:[{id:'s1',startMs:0,endMs:1500,text:'Hơi nước đẩy pít-tông trong xi-lanh.'},{id:'s2',startMs:1500,endMs:4000,text:'Pít-tông truyền chuyển động đến bánh xe.'}],words:[]};
  const story=StorySchema.parse({title:'Cơ chế',story:n.segments.map(s=>s.text).join(' '),style:{visual:'vector'}});
  const basic=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:4000,segmentIds:['s1','s2'],narrationText:story.story,meaning:'transfer',visualGoal:'show transfer',importance:1});
  const plan=groundedExplanation(story,n,[basic],profile);
  for(const method of Object.keys(EXPLAINER_RECIPES) as Array<keyof typeof EXPLAINER_RECIPES>){
    const beat={...basic,...plan.beats[0]!,visualMethod:method};
    const diagram=explainerShot('shot1',0,4000,beat,n,profile,rig),shot=directCinematicShot(diagram,beat,profile,c);
    assert.equal(shot.startMs,diagram.startMs);assert.equal(shot.endMs,diagram.endMs);assert.deepEqual(shot.sourceRefs,diagram.sourceRefs);
    assert.deepEqual(shot.host!.actions.map(a=>a.target?.partId),diagram.host!.actions.map(a=>a.target?.partId),'locomotion must not remove early explanatory targets');
    assert.equal(shot.cinematic!.setting,'workshop');assert.equal(shot.sceneType,'character-scene');
    validateExplainerStoryboard({shots:[shot]},n,[beat],profile,rig,c);
    const rendered=renderCinematic(shot,profile,rig,activity,c);
    if(shot.visualization!.relations.some(r=>r.kind==='transfer')){
      const html=rendered.files.files.find(f=>f.path==='index.html')!.content;
      assert.match(html,/class="arrowhead"/,'a narrated transfer requires a readable direction on the connection');
    }
    assert.deepEqual(validateSceneFiles(secureSceneFiles(rendered.files),shot,c.workflow.max_scene_bytes,[],c.rendering.final),[]);
    for(const interaction of rendered.geometry.interactions.filter(a=>a.type==='operate-model'))assert.ok(interaction.errorPx<1);
    const changed=structuredClone(shot);changed.cinematic!.performance.gestures[0]!.target=undefined;
    assert.throws(()=>validateCinematicShot(changed,profile,c),/target/);
    const next=directCinematicShot(explainerShot('shot2',0,4000,beat,n,profile,rig),beat,profile,c,shot.cinematic!.continuity.exit);
    assert.deepEqual(next.cinematic!.continuity.entry,shot.cinematic!.continuity.exit);
  }
});

test('named historical car uses sourced information rather than a modern sedan, and three wheels are explicit',async t=>{
  const root=await temporary(t),c=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:'library/characters/STICK-MAN.md'},rendering:{final:{width:1280,height:720,fps:30}}});
  const {profile,rig}=await compileHost(root,c,new ModelRouter(c,root));
  const text='Xe Benz Patent Motor Car năm 1886 có ba bánh và động cơ xăng một xi-lanh đặt phía sau.';
  const n:Narration={mode:'srt',durationMs:4000,segments:[{id:'s1',startMs:0,endMs:4000,text}],words:[]};
  const story=StorySchema.parse({title:'Ô tô',story:text,style:{visual:'vector'}});
  const basic=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:4000,segmentIds:['s1'],narrationText:text,meaning:'historical description',visualGoal:'sourced features',importance:1});
  const beat={...basic,...groundedExplanation(story,n,[basic],profile).beats[0]!};
  const shot=directCinematicShot(explainerShot('shot1',0,4000,beat,n,profile,rig),beat,profile,c);
  const car=shot.visualization!.parts.find(p=>p.kind==='car')!,wheel=shot.visualization!.parts.find(p=>p.kind==='wheel')!;
  assert.ok(wheel,'the narrated three wheels must be recognized as an explanatory object');
  assert.equal(shot.cinematic!.models.find(m=>m.partId===car.id)!.variant,'historical-note');
  assert.equal(shot.cinematic!.models.find(m=>m.partId===wheel.id)!.variant,'three-wheel-group');
  const html=renderCinematic(shot,profile,rig,activity,c).files.files.find(f=>f.path==='index.html')!.content;
  assert.match(html,/data-model-variant="historical-note"/);assert.match(html,/data-model-variant="three-wheel-group"/);
  assert.equal((html.match(/data-feature="historical-wheel"/g)??[]).length,3,'the narrated three-wheel vehicle needs three explicit wheel anchors');
  assert.match(html,/data-feature="rear-engine"/,'a sourced rear engine must be located on the schematic');
  shot.cinematic!.models.find(m=>m.partId===car.id)!.variant='conceptual';
  assert.throws(()=>validateCinematicShot(shot,profile,c),/variant.*source/);
});

test('a vehicle described in a separate cue shows its stated features without borrowing future facts',async t=>{
  const root=await temporary(t),c=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:'library/characters/STICK-MAN.md'},rendering:{final:{width:1280,height:720,fps:30}}});
  const {profile,rig}=await compileHost(root,c,new ModelRouter(c,root));
  const n:Narration={mode:'srt',durationMs:8000,segments:[
    {id:'s1',startMs:0,endMs:4000,text:'Năm 1886 là một mốc của Benz Patent Motor Car.'},
    {id:'s2',startMs:4000,endMs:8000,text:'Xe có ba bánh, với động cơ xăng một xi-lanh đặt phía sau.'}],words:[]};
  const story=StorySchema.parse({title:'Ô tô',story:n.segments.map(s=>s.text).join(' '),style:{visual:'vector'}});
  for(const segment of n.segments){
    const basic=BeatSchema.parse({id:`b${segment.id}`,chapterId:'ch1',startMs:segment.startMs,endMs:segment.endMs,segmentIds:[segment.id],narrationText:segment.text,meaning:'description',visualGoal:'stated features',importance:1});
    const beat={...basic,...groundedExplanation(story,n,[basic],profile).beats[0]!};
    const car=beat.entities!.find(e=>e.kind==='car');assert.ok(car,'sentence-subject Xe must remain a narrated vehicle');
    const shot=directCinematicShot(explainerShot(`shot${segment.id}`,segment.startMs,segment.endMs,beat,n,profile,rig),beat,profile,c);
    const html=renderCinematic(shot,profile,rig,activity,c).files.files.find(f=>f.path==='index.html')!.content;
    if(segment.id==='s2'){
      assert.equal(shot.cinematic!.models.find(m=>m.partId===car.id)!.variant,'vehicle-feature-schematic');
      assert.equal((html.match(/data-feature="historical-wheel"/g)??[]).length,3);
      assert.match(html,/data-feature="rear-engine"/);
    }else {assert.doesNotMatch(html,/data-feature="rear-engine"|data-feature="historical-wheel"/);assert.ok(!beat.entities!.some(e=>e.kind==='engine'),'Motor in a vehicle name is not a separately narrated engine');}
  }
  for(const text of ['Bánh xe có nhiều kích thước.','Thân xe có hình dạng khác nhau.']){
    const basic=BeatSchema.parse({id:'negative',chapterId:'ch1',startMs:0,endMs:4000,segmentIds:['x'],narrationText:text,meaning:'description',visualGoal:'component',importance:1});
    const fixture={...n,segments:[{id:'x',startMs:0,endMs:4000,text}]};
    assert.ok(!groundedExplanation(story,fixture,[basic],profile).beats[0]!.entities.some(e=>e.kind==='car'),'a component mention must not invent a whole vehicle');
  }
});
