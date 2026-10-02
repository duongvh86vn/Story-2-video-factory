import assert from 'node:assert/strict';
import test from 'node:test';
import { temporary } from './support.js';
import { ConfigSchema } from '../packages/core/config.js';
import { BeatSchema, StorySchema, type Narration } from '../packages/core/schemas.js';
import { compileHost } from '../packages/host/index.js';
import { ModelRouter } from '../packages/models/registry.js';
import { groundedExplanation, validateExplanation } from '../packages/explainer/plan.js';
import { explainerShot, validateExplainerStoryboard } from '../packages/explainer/storyboard.js';
import { directCinematicShot } from '../packages/director/index.js';
import { renderCinematic } from '../library/shots/cinematic.js';
import { cameraHostBounds, cameraModelLabel } from '../packages/director/camera.js';
import { steamConfigurations, validateConfiguration } from '../packages/explainer/configurations.js';
import { validateComparisonReadability } from '../packages/director/readability.js';

const activity={method:'segment-draft' as const,windowMs:20,intervals:[]};
type Box={left:number;right:number;top:number;bottom:number};
const overlaps=(a:Box,b:Box)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);
for(const kind of ['stick-man','mini-robot'] as const){
  test(`${kind}: steam comparison presents two sourced configurations instead of comparing unrelated components`,async t=>{
    const root=await temporary(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},rendering:{final:{width:1280,height:720,fps:30}}});
    const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
    const narration:Narration={mode:'srt',durationMs:17000,segments:[
      {id:'old',startMs:0,endMs:4000,text:'Trong thiết kế cũ, xi-lanh phải nóng, nhưng lại cần được làm nguội trong mỗi chu kỳ.'},
      {id:'cold',startMs:4000,endMs:8000,text:'James Watt tách nhiệm vụ làm lạnh sang một bình ngưng riêng.'},
      {id:'hot',startMs:8000,endMs:12000,text:'Hơi nước được dẫn đến bình ngưng, còn xi-lanh được giữ nóng.'},
      {id:'compare',startMs:12000,endMs:17000,text:'So với cách làm lạnh ngay trong xi-lanh, bình ngưng riêng giúp sử dụng nhiệt hiệu quả hơn.'}],words:[]};
    const text=narration.segments[3]!.text,story=StorySchema.parse({title:'Hai thiết kế',story:narration.segments.map(s=>s.text).join(' '),style:{visual:'vector'}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:12000,endMs:17000,segmentIds:['compare'],narrationText:text,meaning:'compare',visualGoal:'compare systems',importance:1});
    const plan=groundedExplanation(story,narration,[base],profile);validateExplanation(plan,story,narration,[base],profile.id);
    const beat={...base,...plan.beats[0]!},shot=directCinematicShot(explainerShot('s1',12000,17000,beat,narration,profile,rig),beat,profile,config);
    assert.deepEqual(shot.visualization!.parts.map(p=>(p as unknown as {configuration:string}).configuration),['old-cylinder','separate-condenser']);
    assert.ok(shot.host!.actions.every(a=>a.type==='compare'&&a.target?.partId!==a.secondTarget?.partId));
    const html=renderCinematic(shot,profile,rig,activity,config).files.files.find(f=>f.path==='index.html')!.content;
    assert.match(html,/data-configuration="old-cylinder"/);assert.match(html,/data-configuration="separate-condenser"/);
    assert.match(html,/data-config-component="hot-cylinder"/);assert.match(html,/data-config-component="cold-condenser"/);
    validateExplainerStoryboard({shots:[shot]},narration,[beat],profile,rig,config);
  });
  test(`${kind}: compared car models and labels remain readable after approaching the battery`,async t=>{
    const root=await temporary(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},rendering:{final:{width:1280,height:720,fps:30}}});
    const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
    const narration:Narration={mode:'srt',durationMs:7707,segments:[
      {id:'a',text:'Tiếp theo, ta so sánh xe dùng động cơ đốt trong với xe điện: nguồn năng lượng và bộ phận tạo chuyển động khác nhau.',startMs:0,endMs:6000},
      {id:'b',text:'Pin cấp năng lượng cho động cơ điện.',startMs:6000,endMs:7707}],words:[]};
    const story=StorySchema.parse({title:'Hai xe',story:narration.segments.map(s=>s.text).join(' '),style:{visual:'vector'}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:7707,segmentIds:['a','b'],narrationText:story.story,meaning:'compare',visualGoal:'readable alternatives',importance:1});
    const beat={...base,...groundedExplanation(story,narration,[base],profile).beats[0]!},next=explainerShot('s2',6000,7707,beat,narration,profile,rig);
    const first=directCinematicShot(explainerShot('s1',0,6000,beat,narration,profile,rig),beat,profile,config,undefined,{nextControlId:next.host!.actions.find(a=>a.type==='operate-model')!.target!.partId});
    const second=directCinematicShot(next,beat,profile,config,first.cinematic!.continuity.exit,{parts:first.visualization!.parts,facing:first.cinematic!.continuity.facing});
    const bounds=cameraHostBounds(second.cinematic!.performance,profile),parts=second.visualization!.parts;
    for(const part of parts){
      const label=cameraModelLabel(part,720,1280),box={left:(part.x-part.width*.56)*1280,right:(part.x+part.width*.56)*1280,top:label.labelY-label.font,bottom:label.labelY+label.labelHeight};
      assert.ok(!overlaps(box,bounds.head),`${part.label}: label must not cover the face`);
      for(const other of parts.filter(p=>p.id!==part.id)){
        const model={left:(other.x-other.width*.5)*1280,right:(other.x+other.width*.5)*1280,top:(other.y-other.height*.5)*720,bottom:(other.y+other.height*.5)*720};
        assert.ok(!overlaps(box,model),`${part.label}: label collides with ${other.label}`);
      }
      if(part.kind==='car')assert.ok(!overlaps({left:(part.x-part.width*.5)*1280,right:(part.x+part.width*.5)*1280,top:(part.y-part.height*.5)*720,bottom:(part.y+part.height*.5)*720},bounds.body),`${part.label}: passive car must not be hidden behind the actor`);
    }
    assert.ok(second.host!.actions.some(a=>a.type==='operate-model'));
    const forged=structuredClone(second),electric=forged.visualization!.parts.find(part=>part.kind==='engine'&&part.label.includes('điện'))!;
    electric.x=.65;electric.y=.69;
    assert.throws(()=>validateComparisonReadability(forged,profile),/label.*covers model/,'moved art cannot silently cover the battery caption');
  });
}

test('old cylinder heating/cooling does not establish an improved hot cylinder',()=>{
  const refs=[{kind:'narration' as const,segmentId:'compare',quote:'So với cách làm lạnh ngay trong xi-lanh, bình ngưng riêng giúp sử dụng nhiệt hiệu quả hơn.'}];
  const narration:Narration={mode:'srt',durationMs:12000,words:[],segments:[
    {id:'old',startMs:0,endMs:4000,text:'Trong thiết kế cũ, xi-lanh phải nóng, nhưng lại cần được làm nguội trong mỗi chu kỳ.'},
    {id:'cold',startMs:4000,endMs:8000,text:'James Watt tách nhiệm vụ làm lạnh sang một bình ngưng riêng.'},
    {id:'compare',startMs:8000,endMs:12000,text:refs[0]!.quote}]};
  assert.equal(steamConfigurations('b1',8000,refs,narration),undefined);
  assert.throws(()=>validateConfiguration({id:'forged',kind:'object',label:'bình ngưng riêng',configuration:'separate-condenser',sourceRefs:[...refs,...narration.segments.slice(0,2).map(s=>({kind:'narration' as const,segmentId:s.id,quote:s.text}))]},'comparison'),/component states/);
});
