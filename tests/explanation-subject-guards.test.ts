import assert from 'node:assert/strict';
import test from 'node:test';
import { BeatSchema, StorySchema, type Narration } from '../packages/core/schemas.js';
import type { HostProfile } from '../packages/host/schemas.js';
import { groundedExplanation, validateExplanation } from '../packages/explainer/plan.js';
import { steamConfigurations, splitSteamEvidence, validateConfiguration } from '../packages/explainer/configurations.js';
import { thermalEvidence } from '../packages/explainer/thermal.js';

const host={id:'subject-guard-audit'} as HostProfile;
const ref=(segmentId:string,quote:string)=>({kind:'narration' as const,segmentId,quote});
const comparison='Compared with cooling directly inside the cylinder, a separate condenser uses heat more efficiently.';
function fixture(text:string){
  const narration:Narration={mode:'srt',durationMs:4000,words:[],segments:[{id:'cue',startMs:0,endMs:4000,text}]};
  const story=StorySchema.parse({title:'Subject guard boundaries',story:text,style:{visual:'vector'}});
  const beat=BeatSchema.parse({id:'guard',chapterId:'ch1',startMs:0,endMs:4000,segmentIds:['cue'],narrationText:text,meaning:'thermal',visualGoal:'use only the asserted component state',importance:1});
  return {narration,story,beat,plan:groundedExplanation(story,narration,[beat],host)};
}
function compareAfter(cylinder:string,condenser='The condenser is cold.'){
  const refs=[ref('thermal',cylinder),ref('cold',condenser),ref('compare',comparison)];
  const narration:Narration={mode:'srt',durationMs:12000,words:[],segments:refs.map((r,i)=>({id:r.segmentId,text:r.quote,startMs:i*4000,endMs:(i+1)*4000}))};
  return {refs,narration,groups:steamConfigurations('comparison',8000,[refs[2]!],narration)};
}

for(const text of [
  'The cylinder is hot and is cooled in each cycle.',
  'The cylinder is kept hot then cooled in water.',
  'The cylinder is hot and cools in each cycle.',
  'The cylinder is hot before cooling in each cycle.',
])test(`ordered cylinder heating and cooling remain distinct: ${text}`,()=>{
  assert.deepEqual(thermalEvidence({kind:'cylinder',label:'cylinder'},text).map(s=>s.value),['hot','cold']);
  const f=fixture(text),cylinder=f.plan.beats[0]!.entities.find(e=>e.kind==='cylinder')!;
  assert.deepEqual(cylinder.states,[{value:'hot',sourceRefs:[ref('cue',text)]},{value:'cold',sourceRefs:[ref('cue',text)]}]);
  assert.doesNotThrow(()=>validateExplanation(f.plan,f.story,f.narration,[f.beat],host.id));
  const comparisonFixture=compareAfter(text);
  assert.equal(comparisonFixture.groups,undefined,'the alternating cycle cannot establish an improved always-hot cylinder');
  assert.equal(splitSteamEvidence(comparisonFixture.refs),false);
  assert.throws(()=>validateConfiguration({id:'forged',kind:'object',label:'separate condenser',configuration:'separate-condenser',sourceRefs:comparisonFixture.refs},'comparison'),/old cylinder alternating hot\/cold is insufficient/);
});

for(const [kind,text] of [
  ['cylinder','The cylinder is beside a hot furnace.'],
  ['cylinder','The cylinder is near a hot furnace.'],
  ['cylinder','The cylinder stands nearby the hot furnace.'],
  ['cylinder','The cylinder is next to a cold reservoir.'],
  ['cylinder','The cylinder sits by a hot furnace.'],
  ['cylinder','The cylinder is in cold water.'],
  ['cylinder','The cylinder is on a hot plate.'],
  ['cylinder','The cylinder is under a hot boiler.'],
  ['cylinder','The cylinder is fitted with a cold sleeve.'],
  ['cylinder','The cylinder contains hot steam.'],
  ['cylinder','The cylinder holds cold water.'],
  ['condenser','The condenser is near a cold reservoir.'],
  ['condenser','The condenser contains cold water.'],
  ['condenser','The condenser holds hot steam.'],
] as const)test(`noun thermal attribute does not establish ${kind} temperature: ${text}`,()=>{
  assert.deepEqual(thermalEvidence({kind,label:kind},text),[]);
  const f=fixture(text),entity=f.plan.beats[0]!.entities.find(e=>e.kind===kind)!;
  assert.ok(entity);assert.deepEqual(entity.states??[],[]);
  assert.doesNotThrow(()=>validateExplanation(f.plan,f.story,f.narration,[f.beat],host.id));
  const forged=structuredClone(f.plan),target=forged.beats[0]!.entities.find(e=>e.kind===kind)!;
  target.states=[{value:text.includes('cold')?'cold':'hot',sourceRefs:target.sourceRefs}];
  assert.throws(()=>validateExplanation(forged,f.story,f.narration,[f.beat],host.id),/thermal states must follow its narrated subject and predicates/);
  if(kind==='cylinder')assert.equal(compareAfter(text).groups,undefined);
  else assert.equal(compareAfter('The cylinder stays hot.',text).groups,undefined);
});

for(const [kind,text,value] of [
  ['cylinder','The cylinder is hot.','hot'],
  ['cylinder','The cylinder is kept hot.','hot'],
  ['cylinder','The cylinder stays cold.','cold'],
  ['condenser','The condenser is cold.','cold'],
  ['condenser','The condenser is cooled in water.','cold'],
  ['condenser','The condenser cools in each cycle.','cold'],
  ['condenser','The condenser is cooling in water.','cold'],
  ['cylinder','The cylinder is in water and stays hot.','hot'],
  ['condenser','The condenser by the tank is cold.','cold'],
] as const)test(`affirmative component predicate is retained: ${text}`,()=>{
  assert.deepEqual(thermalEvidence({kind,label:kind},text).map(s=>s.value),[value]);
  const f=fixture(text),entity=f.plan.beats[0]!.entities.find(e=>e.kind===kind)!;
  assert.deepEqual(entity.states,[{value,sourceRefs:[ref('cue',text)]}]);
  assert.doesNotThrow(()=>validateExplanation(f.plan,f.story,f.narration,[f.beat],host.id));
  if(kind==='cylinder'&&value==='hot')assert.ok(compareAfter(text).groups,'an actually hot cylinder still supports the improved design');
  if(kind==='condenser'&&value==='cold')assert.ok(compareAfter('The cylinder stays hot.',text).groups);
});
