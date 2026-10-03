import assert from 'node:assert/strict';
import test from 'node:test';
import { BeatSchema, StorySchema, type Narration } from '../packages/core/schemas.js';
import type { HostProfile } from '../packages/host/schemas.js';
import { groundedExplanation, validateExplanation } from '../packages/explainer/plan.js';
import { thermalEvidence } from '../packages/explainer/thermal.js';

const host={id:'relative-subject-audit'} as HostProfile;
for(const [kind,text,expected] of [
  ['cylinder','The cylinder sits beside a furnace which is hot.',[]],
  ['cylinder','The cylinder stands near a furnace that is hot.',[]],
  ['cylinder','The cylinder sits beside a furnace which is cooled.',[]],
  ['cylinder','The cylinder stands near a furnace that is cooled.',[]],
  ['cylinder','The cylinder near the furnace remains consistently hot.',['hot']],
  ['condenser','The condenser by the tank is relatively cold.',['cold']],
] as const)test(`relative subject/direct component predicate: ${text}`,()=>{
  assert.deepEqual(thermalEvidence({kind,label:kind},text).map(state=>state.value),[...expected]);
  const narration:Narration={mode:'srt',durationMs:4000,words:[],segments:[{id:'cue',startMs:0,endMs:4000,text}]};
  const story=StorySchema.parse({title:'Relative subject boundary',story:text,style:{visual:'vector'}});
  const beat=BeatSchema.parse({id:'relative',chapterId:'ch1',startMs:0,endMs:4000,segmentIds:['cue'],narrationText:text,meaning:'thermal',visualGoal:'keep the thermal predicate on its source subject',importance:1});
  const plan=groundedExplanation(story,narration,[beat],host),entity=plan.beats[0]!.entities.find(e=>e.kind===kind)!;
  assert.ok(entity);assert.deepEqual((entity.states??[]).map(state=>state.value),[...expected]);
  assert.doesNotThrow(()=>validateExplanation(plan,story,narration,[beat],host.id));
  if(expected.length){
    assert.deepEqual(entity.states![0]!.sourceRefs,[{kind:'narration',segmentId:'cue',quote:text}]);
  }else{
    const forged=structuredClone(plan),target=forged.beats[0]!.entities.find(e=>e.kind===kind)!;
    target.states=[{value:text.includes('cooled')?'cold':'hot',sourceRefs:target.sourceRefs}];
    assert.throws(()=>validateExplanation(forged,story,narration,[beat],host.id),/thermal states must follow its narrated subject and predicates/);
  }
});
