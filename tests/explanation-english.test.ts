import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { BeatSchema, StorySchema, type Narration } from '../packages/core/schemas.js';
import { exists, walk, readJson } from '../packages/core/utils.js';
import type { HostProfile } from '../packages/host/schemas.js';
import { configurationLabels, steamConfigurations, splitSteamEvidence, validateConfiguration } from '../packages/explainer/configurations.js';
import { groundedExplanation, validateExplanation } from '../packages/explainer/plan.js';
import { thermalEvidence } from '../packages/explainer/thermal.js';
import { validateAuthoredVisualSources } from '../packages/explainer/visual-sources.js';
import { createCreativeStoryboard } from '../packages/director/creative.js';
import { stageModels } from '../packages/director/models.js';
import { ModelRouter } from '../packages/models/registry.js';
import { creativeFixture } from './creative-fixture.js';

const auditDir=await fs.mkdtemp(path.join(os.tmpdir(),'explanation-english-audit-'));
const host={id:'audit-host'} as HostProfile;
const ref=(segmentId:string,quote:string)=>({kind:'narration' as const,segmentId,quote});
const comparison='Compared with cooling directly inside the cylinder, a separate condenser uses heat more efficiently.';
function source(texts:string[]){
  const narration:Narration={mode:'srt',durationMs:texts.length*4000,words:[],segments:texts.map((text,i)=>({id:`cue${i}`,startMs:i*4000,endMs:(i+1)*4000,text}))};
  const story=StorySchema.parse({title:'Independent English explanation audit',story:texts.join(' '),style:{visual:'vector'}});
  const i=texts.length-1,beat=BeatSchema.parse({id:'audit-beat',chapterId:'ch1',startMs:i*4000,endMs:(i+1)*4000,segmentIds:[`cue${i}`],narrationText:texts[i],meaning:'explain',visualGoal:'preserve sourced concepts',importance:1});
  return {story,narration,beat};
}
function groups(texts=['The cylinder stays hot.','The separate condenser is cold.',comparison]){
  const f=source(texts),cue=f.narration.segments.at(-1)!;
  return {...f,entities:steamConfigurations(f.beat.id,f.beat.startMs,[ref(cue.id,cue.text)],f.narration)};
}

test('English comparison keeps exact labels, exact prior citations, and the current cue first',()=>{
  const f=groups();assert.ok(f.entities);
  assert.deepEqual(configurationLabels(comparison),{before:'cooling directly inside the cylinder',after:'separate condenser'});
  assert.deepEqual(f.entities.map(e=>({label:e.label,kind:e.kind,configuration:e.configuration})),[
    {label:'cooling directly inside the cylinder',kind:'object',configuration:'old-cylinder'},
    {label:'separate condenser',kind:'object',configuration:'separate-condenser'},
  ]);
  assert.deepEqual(f.entities[0]!.sourceRefs,[ref('cue2',comparison)]);
  assert.deepEqual(f.entities[1]!.sourceRefs,[ref('cue2',comparison),ref('cue1','The separate condenser is cold.'),ref('cue0','The cylinder stays hot.')]);
  for(const e of f.entities)assert.doesNotThrow(()=>validateConfiguration(e,'comparison'));
  const plan=groundedExplanation(f.story,f.narration,[f.beat],host);
  assert.deepEqual(plan.beats[0]!.entities,f.entities);
  assert.doesNotThrow(()=>validateExplanation(plan,f.story,f.narration,[f.beat],host.id));
});

test('one earlier split-duty cue is cited once and does not transfer condenser cooling to cylinder',()=>{
  const text='The cylinder stays hot while the separate condenser is cooled.',f=groups([text,comparison]);
  assert.ok(f.entities);assert.deepEqual(f.entities[1]!.sourceRefs,[ref('cue1',comparison),ref('cue0',text)]);
  assert.deepEqual(thermalEvidence({kind:'cylinder',label:'cylinder'},text,[{label:'condenser'}]).map(s=>s.value),['hot']);
  assert.deepEqual(thermalEvidence({kind:'condenser',label:'condenser'},text,[{label:'cylinder'}]).map(s=>s.value),['cold']);
});

for(const cold of ['cold','cooled','cools','cooling'])test(`English condenser ${cold} establishes its own cooling state`,()=>{
  const text=`The condenser is ${cold}.`;
  assert.deepEqual(thermalEvidence({kind:'condenser',label:'condenser'},text).map(s=>s.value),['cold']);
  assert.ok(groups(['The cylinder is hot.',text,comparison]).entities);
});

test('English transfer of cooling to a separate condenser preserves earlier split duties',()=>{
  const earlier='Watt moved cooling to a separate condenser.',later='Steam enters the condenser while the cylinder stays hot.';
  const f=source([earlier,later]),plan=groundedExplanation(f.story,f.narration,[f.beat],host);
  const cylinder=plan.beats[0]!.entities.find(e=>e.kind==='cylinder')!,condenser=plan.beats[0]!.entities.find(e=>e.kind==='condenser')!;
  assert.deepEqual(cylinder.states?.map(s=>s.value),['hot']);
  assert.deepEqual(condenser.states,[{value:'cold',sourceRefs:[ref('cue0',earlier)]}]);
  assert.notEqual(cylinder.id,condenser.id);
  assert.doesNotThrow(()=>validateExplanation(plan,f.story,f.narration,[f.beat],host.id));
});

test('Vietnamese sourced comparison remains valid with separate hot and cold duties',()=>{
  const text='So với cách làm lạnh ngay trong xi-lanh, bình ngưng riêng giúp sử dụng nhiệt hiệu quả hơn.';
  const f=groups(['Xi-lanh được giữ nóng.','James Watt tách nhiệm vụ làm lạnh sang một bình ngưng riêng.',text]);
  assert.ok(f.entities);assert.deepEqual(f.entities.map(e=>e.label),['cách làm lạnh ngay trong xi-lanh','bình ngưng riêng']);
  assert.ok(splitSteamEvidence(f.entities[1]!.sourceRefs));
  const plan=groundedExplanation(f.story,f.narration,[f.beat],host);
  assert.doesNotThrow(()=>validateExplanation(plan,f.story,f.narration,[f.beat],host.id));
});

for(const [name,texts] of [
  ['old alternating cycle',['The old cylinder is hot and is cooled each cycle.','The condenser is cold.',comparison]],
  ['missing hot cylinder',['The cylinder is present.','The condenser is cold.',comparison]],
  ['missing cold condenser',['The cylinder is hot.','The condenser is present.',comparison]],
  ['negated cylinder subject',['No cylinder is hot.','The condenser is cold.',comparison]],
  ['negated cylinder predicate',['The cylinder is not hot.','The condenser is cold.',comparison]],
  ['negated condenser predicate',['The cylinder is hot.','The condenser is not cold.',comparison]],
  ['later unrelated thermal sentence',['The cylinder is present. The furnace is hot.','The condenser is cold.',comparison]],
  ['wrong subject in same sentence',['The cylinder is beside a hot furnace.','The condenser is cold.',comparison]],
] as const)test(`English grouped comparison rejects ${name}`,()=>{
  const f=groups([...texts]);assert.equal(f.entities,undefined,'unsupported improved states must not create grouped designs');
  const forged={id:'forged',kind:'object' as const,label:'separate condenser',configuration:'separate-condenser' as const,sourceRefs:f.narration.segments.map(s=>ref(s.id,s.text))};
  assert.throws(()=>validateConfiguration(forged,'comparison'),/improved cylinder staying hot|component states/);
});

test('future thermal evidence cannot establish an earlier comparison',()=>{
  const f=source([comparison,'The cylinder is hot.','The condenser is cold.']);
  assert.equal(steamConfigurations('early',0,[ref('cue0',comparison)],f.narration),undefined);
});

for(const [kind,label,text] of [
  ['cylinder','cylinder','No cylinder is hot.'],
  ['cylinder','cylinder','The cylinder is not hot.'],
  ['cylinder','cylinder','The cylinder is never hot.'],
  ['cylinder','cylinder','The cylinder is present. The furnace is hot.'],
  ['cylinder','cylinder','The cylinder is present while the furnace is hot.'],
  ['cylinder','cylinder','The cylinder is beside a hot furnace.'],
  ['condenser','condenser','No condenser is cold.'],
  ['condenser','condenser','The condenser is not cooled.'],
  ['condenser','condenser','The condenser is present. The water is cold.'],
] as const)test(`thermal predicate guard: ${text}`,()=>{
  assert.deepEqual(thermalEvidence({kind,label},text),[]);
  const f=source([text]),plan=groundedExplanation(f.story,f.narration,[f.beat],host),entity=plan.beats[0]!.entities.find(e=>e.kind===kind)!;
  assert.ok(entity);assert.deepEqual(entity.states??[],[]);
  const forged=structuredClone(plan),target=forged.beats[0]!.entities.find(e=>e.kind===kind)!;
  target.states=[{value:kind==='cylinder'?'hot':'cold',sourceRefs:target.sourceRefs}];
  assert.throws(()=>validateExplanation(forged,f.story,f.narration,[f.beat],host.id),/thermal states.*subject.*predicates/);
});

test('invalid grouped design reports method, kind, exact label, and missing thermal evidence together',()=>{
  const bad={id:'audit-invalid-group',kind:'cylinder' as const,label:'Improved engine',configuration:'separate-condenser' as const,sourceRefs:[ref('cue',comparison)]};
  assert.throws(()=>validateConfiguration(bad,'mechanism'),error=>{
    assert.ok(error instanceof Error);
    for(const expected of ['audit-invalid-group','visualization.type must be comparison, received mechanism','kind must be object','omit configuration on an individual component','preserve the exact sourced label "separate condenser", received "Improved engine"','artDirection artwork','improved cylinder staying hot','old cylinder alternating hot/cold is insufficient'])assert.ok(error.message.includes(expected),expected);
    return true;
  });
  assert.throws(()=>validateConfiguration({...bad,sourceRefs:[ref('cue','A cylinder exists.')]},'mechanism'),/sourceRefs must include the literal narrated comparison/);
});

test('renamed canonical world identity reports the expected label, kind, configuration, and artwork remedy',async()=>{
  await fs.mkdir(auditDir,{recursive:true});const root=await fs.mkdtemp(path.join(auditDir,'identity-')),f=await creativeFixture(root);
  const candidate=structuredClone(f.shot),part=candidate.visualization!.parts[0]!,original=f.beat.entities![0]!;
  part.label='Renamed display label';
  assert.throws(()=>validateAuthoredVisualSources(candidate,[{...f.beat,beatId:f.beat.id}],f.narration,f.profile.id),error=>{
    assert.ok(error instanceof Error);
    for(const expected of [part.id,`label=${JSON.stringify(original.label)}`,`kind=${original.kind}`,'configuration=absent','canonical states','artDirection artwork'])assert.ok(error.message.includes(expected),expected);
    return true;
  });
});

test('fake creative model remains rejected and retains aggregate diagnostics after stageModels fails',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('Network forbidden in independent semantic audit');});
  await fs.mkdir(auditDir,{recursive:true});const root=await fs.mkdtemp(path.join(auditDir,'creative-')),f=await creativeFixture(root);
  f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;
  const seed={shots:[structuredClone(f.shot)]};seed.shots[0]!.cinematic!.artDirection=structuredClone(f.artDirection);
  const originalSeed=structuredClone(seed),candidate=structuredClone(seed),shot=candidate.shots[0]!;
  shot.visualization!.parts[0]!.configuration='separate-condenser';
  shot.visualization!.parts[0]!.label='Unsourced renamed design';
  shot.cinematic!.camera.anchor.x=-1;
  shot.cinematic!.artDirection!.layers[0]!.svg='<script>alert(1)</script>';
  assert.throws(()=>stageModels(shot),/kind must be object/,'prove this candidate fails specifically in stageModels');
  const originalCandidate=structuredClone(candidate),router=new ModelRouter(f.config,root);let calls=0;
  router.structured=async(role,_request,schema)=>{calls++;assert.equal(role,'storyboard');return schema.parse(candidate);};
  const feedback=(message:string)=>{
    for(const expected of ['Creative storyboard validation failed','kind must be object','model entity changed its sourced identity','camera anchor must be inside the world stage','Art SVG unsupported/executable tag script'])assert.ok(message.includes(expected),`missing independent diagnostic: ${expected}\n${message}`);
  };
  await assert.rejects(createCreativeStoryboard(root,f.config,router,{story:f.story,narration:f.narration,beats:[f.beat],characters:f.characters,profile:f.profile,rig:f.rig},seed,[]),error=>{assert.ok(error instanceof Error);feedback(error.message);return true;});
  assert.equal(calls,1);assert.deepEqual(seed,originalSeed);assert.deepEqual(candidate,originalCandidate);
  const files=await walk(path.join(root,'work/attempts/creative-storyboard'));assert.equal(files.length,1);
  const attempt=await readJson<{status:string;error:string;response:typeof candidate}>(files[0]!);
  assert.equal(attempt.status,'domain-rejected');feedback(attempt.error);assert.deepEqual(attempt.response,candidate);
  for(const file of ['creative-storyboard-cache.json','creative-direction-report.json'])assert.equal(await exists(path.join(root,'work',file)),false);
  await fs.writeFile(path.join(auditDir,'creative-rejection-evidence.json'),JSON.stringify({root,calls,attemptFile:files[0],status:attempt.status,error:attempt.error,noCache:true,noAcceptedReport:true},null,2));
});
