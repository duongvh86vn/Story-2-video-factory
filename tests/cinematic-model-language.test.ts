import assert from 'node:assert/strict';
import test from 'node:test';
import { cinematicModel } from '../library/shots/cinematic-models.js';
import { VisualizationPartSchema } from '../packages/explainer/schemas.js';
import { CinematicModelSchema } from '../packages/director/schemas.js';
import { ConfigSchema } from '../packages/core/config.js';
import { BeatSchema, StorySchema, type Narration } from '../packages/core/schemas.js';
import { compileHost } from '../packages/host/index.js';
import { ModelRouter } from '../packages/models/registry.js';
import { groundedExplanation, validateExplanation } from '../packages/explainer/plan.js';
import { explainerShot, validateExplainerStoryboard } from '../packages/explainer/storyboard.js';
import { directCinematicShot } from '../packages/director/index.js';
import { renderCinematic } from '../library/shots/cinematic.js';
import { temporary } from './support.js';

const english='Compared with cooling directly inside the cylinder, a separate condenser uses heat more efficiently.';
const vietnamese='So với cách làm lạnh ngay trong xi-lanh, bình ngưng riêng giúp sử dụng nhiệt hiệu quả hơn.';
const ref=(quote:string)=>({kind:'narration' as const,segmentId:'cue',quote});
const labels=(svg:string)=>[...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]);

for(const [name,partQuotes,modelQuotes,expected] of [
  ['English comparison',[english],['The cylinder stays hot.'],['cylinder','condenser']],
  ['Vietnamese comparison',[vietnamese],['Xi-lanh được giữ nóng.'],['xi-lanh','bình ngưng']],
  ['English comparison after inherited Vietnamese refs',['Xi-lanh được giữ nóng.','Bình ngưng được làm lạnh.'],[english],['cylinder','condenser']],
  ['Vietnamese comparison after inherited English refs',['The cylinder stays hot.','The condenser is cold.'],[vietnamese],['xi-lanh','bình ngưng']],
] as const)test(`steam-split SVG: ${name}`,()=>{
  const part=VisualizationPartSchema.parse({id:'split',kind:'object',label:'sourced design',configuration:'separate-condenser',sourceRefs:partQuotes.map(ref),x:.6,y:.5,width:.3,height:.3});
  const model=CinematicModelSchema.parse({partId:part.id,variant:'steam-split',sourceRefs:modelQuotes.map(ref)});
  const before=structuredClone({part,model}),result=cinematicModel(part,model,320,220);
  assert.deepEqual(labels(result.svg),expected);
  assert.match(result.svg,/data-config-component="hot-cylinder"/);
  assert.match(result.svg,/data-config-component="cold-condenser"/);
  assert.deepEqual({part,model},before,'rendering must preserve exact source citations');
});

for(const [language,texts,expected] of [
  ['en',['The cylinder stays hot.','The separate condenser is cold.',english],['cylinder','condenser']],
  ['vi',['Xi-lanh được giữ nóng.','Bình ngưng được làm lạnh.',vietnamese],['xi-lanh','bình ngưng']],
] as const)test(`${language}: grounded comparison survives direction and complete cinematic HTML rendering`,async t=>{
  const root=await temporary(t),config=ConfigSchema.parse({project:{language},presentation:{mode:'story-cinematic'},host:{profile:'library/characters/STICK-MAN.md'},rendering:{final:{width:1280,height:720,fps:30}}});
  const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
  const narration:Narration={mode:'srt',durationMs:12000,words:[],segments:texts.map((text,i)=>({id:`cue${i}`,startMs:i*4000,endMs:(i+1)*4000,text}))};
  const story=StorySchema.parse({title:'Sourced language',story:texts.join(' '),style:{visual:'vector'}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:8000,endMs:12000,segmentIds:['cue2'],narrationText:texts[2],meaning:'compare',visualGoal:'compare sourced designs',importance:1});
  const plan=groundedExplanation(story,narration,[base],profile);validateExplanation(plan,story,narration,[base],profile.id);
  const beat={...base,...plan.beats[0]!},shot=directCinematicShot(explainerShot('s1',8000,12000,beat,narration,profile,rig),beat,profile,config);
  validateExplainerStoryboard({shots:[shot]},narration,[beat],profile,rig,config);
  const split=shot.visualization!.parts.find(p=>p.configuration==='separate-condenser')!;
  assert.ok(split);assert.equal(split.sourceRefs[0]!.quote,texts[2]);
  assert.ok(shot.cinematic!.models.some(m=>m.partId===split.id&&m.variant==='steam-split'));
  const html=renderCinematic(shot,profile,rig,{method:'segment-draft',windowMs:20,intervals:[]},config).files.files.find(f=>f.path==='index.html')!.content;
  const svg=html.slice(html.indexOf('<g data-configuration="separate-condenser"'));
  assert.deepEqual(labels(svg).slice(0,2),expected);
});
