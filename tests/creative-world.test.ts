import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAuthoredVisualSources } from '../packages/explainer/visual-sources.js';
import { groundedExplanation, validateExplanation } from '../packages/explainer/plan.js';
import { ExplanationBeatSchema } from '../packages/explainer/schemas.js';
import { BeatSchema, StorySchema, type Narration, type Shot } from '../packages/core/schemas.js';
import type { HostProfile } from '../packages/host/schemas.js';
import { cinematicRelations } from '../library/shots/cinematic-models.js';
import { customModelArt } from '../packages/director/art-direction.js';
import { temporary } from './support.js';
import { creativeFixture } from './creative-fixture.js';
import { validateExplainerStoryboard } from '../packages/explainer/storyboard.js';

const ref=(id:string,quote:string)=>({kind:'narration' as const,segmentId:id,quote});
function world(texts=['Pin cấp năng lượng cho động cơ.','Pin đưa năng lượng vào động cơ.']){
  const narration:Narration={mode:'srt',durationMs:texts.length*2000,words:[],segments:texts.map((text,i)=>({id:`cue${i}`,startMs:i*2000,endMs:(i+1)*2000,text}))};
  const refs=texts.map((text,i)=>ref(`cue${i}`,text));
  const canonical=refs.map((source,i)=>ExplanationBeatSchema.parse({beatId:`b${i}`,explanationGoal:'Explain power',narrationSegmentIds:[source.segmentId],sourceRefs:[source],visualMethod:'mechanism',hostIntent:'Explain power',entities:[
    {id:`b${i}.battery`,label:'Pin',kind:'battery',sourceRefs:[source]},
    {id:`b${i}.engine`,label:'động cơ',kind:'engine',sourceRefs:[source]},
  ],relations:[{from:`b${i}.battery`,to:`b${i}.engine`,kind:'transfer',sourceRefs:[source]}]}));
  const shot={id:'world',startMs:0,endMs:narration.durationMs,narrationSegmentIds:refs.map(r=>r.segmentId),sourceRefs:refs,explanationGoal:'Explain power',cinematic:{motivation:'Explain power',propBindings:[]},visualization:{type:'mechanism',parts:canonical[0]!.entities.map((e,i)=>({...e,x:.25+i*.4,y:.4,width:.12,height:.12})),relations:canonical[0]!.relations,events:[]}} as unknown as Shot;
  return {shot,canonical,narration,refs};
}
const check=(f:ReturnType<typeof world>)=>validateAuthoredVisualSources(f.shot,f.canonical,f.narration,'host');

test('authored worlds merge the same subject across beats but reject wrong subjects, kinds, configuration, state and refs',()=>{
  const f=world(),part=f.shot.visualization!.parts[0]!;
  part.sourceRefs=[...f.refs];assert.doesNotThrow(()=>check(f));
  for(const mutate of [
    (p:typeof part)=>{p.label='động cơ';},
    (p:typeof part)=>{p.kind='engine';},
    (p:typeof part)=>{p.configuration='old-cylinder';},
    (p:typeof part)=>{p.states=[{value:'hot',sourceRefs:[f.refs[0]!]}];},
    (p:typeof part)=>{p.sourceRefs=[ref('cue0','Pin bịa nguồn')];},
  ]){const candidate=structuredClone(f);mutate(candidate.shot.visualization!.parts[0]!);assert.throws(()=>check(candidate),/identity|evidence|source/i);}
  const different=structuredClone(f);different.canonical[1]!.entities[0]!.kind='object';
  assert.throws(()=>check(different),/different subject/i);
});

test('new generic subjects must be literal source excerpts and cannot launder invented facts or source text',()=>{
  for(const kind of ['object','stage','marker'] as const){const f=world();f.shot.visualization!.relations=[];f.shot.visualization!.parts.push({id:`new.${kind}`,kind,label:'năng lượng',sourceRefs:[f.refs[0]!],x:.5,y:.7,width:.1,height:.1});assert.doesNotThrow(()=>check(f));}
  for(const patch of [
    {label:'máy du hành thời gian'},
    {label:'năng lượng',kind:'gear'},
    {label:'năng lượng',sourceRefs:[{kind:'source',quote:'năng lượng được sáng tạo từ hư không'}]},
    {label:'năng lượng',states:[{value:'hot',sourceRefs:[ref('cue0','Pin cấp năng lượng cho động cơ.')]}]},
  ]){const f=world();f.shot.visualization!.relations=[];f.shot.visualization!.parts.push({...{id:'new.subject',kind:'object',sourceRefs:[f.refs[0]!],x:.5,y:.7,width:.1,height:.1},...patch} as NonNullable<Shot['visualization']>['parts'][number]);assert.throws(()=>check(f),/literal|source/i);}
});

test('timed flow may use another affirmative cue but may not borrow static relation evidence for a negated cue',()=>{
  const f=world();f.shot.visualization!.events=[{type:'flow',targetId:'b0.battery',relationTo:'b0.engine',narrationAnchor:'cue1',startMs:2200,endMs:3000,contactRequired:false,motion:'none',sourceRefs:[f.refs[1]!]}];
  assert.notDeepEqual(f.shot.visualization!.events[0]!.sourceRefs,f.shot.visualization!.relations[0]!.sourceRefs);assert.doesNotThrow(()=>check(f));
  const negated=world(['Pin cấp năng lượng cho động cơ.','Pin không cấp năng lượng cho động cơ.']);
  negated.shot.visualization!.events=[{...f.shot.visualization!.events[0]!,sourceRefs:[negated.refs[1]!]}];
  assert.throws(()=>check(negated),/affirmative clause/i);
});

test('timed flow cannot launder an earlier affirmative source into a later negated narration anchor',()=>{
  const f=world(['Pin cấp năng lượng cho động cơ.','Pin không cấp năng lượng cho động cơ.']);
  f.canonical[1]!.relations=[];
  f.shot.visualization!.events=[{type:'flow',targetId:'b0.battery',relationTo:'b0.engine',narrationAnchor:'cue1',startMs:2200,endMs:3000,contactRequired:false,motion:'none',sourceRefs:[f.refs[0]!]}];
  assert.throws(()=>check(f),/source|cue|anchor|clock|affirmative/i,'an earlier true predicate is not evidence for a later denied event');
});

for(const [text,expected] of [
  ['Pin đưa năng lượng vào động cơ.',true],
  ['Hơi nước đi vào xi-lanh.',true],
  ['Bánh xe quay, đưa lực tới động cơ.',true],
  ['Pin không chỉ cấp năng lượng cho động cơ.',true],
  ['battery not only supplies engine.',true],
  ['Pin nóng; động cơ không nhận năng lượng.',false],
  ['Pin không cấp năng lượng cho động cơ.',false],
  ['battery never supplies engine.',false],
  ['Pin và động cơ ở cạnh nhau.',false],
  ['Không phải pin cấp năng lượng cho động cơ.',false],
  ['No battery supplies engine.',false],
] as const)test(`source transfer predicate: ${text}`,()=>{
  const narration:Narration={mode:'srt',durationMs:2000,words:[],segments:[{id:'cue',startMs:0,endMs:2000,text}]};
  const story=StorySchema.parse({title:'Predicate',story:text,style:{visual:'vector'}}),beat=BeatSchema.parse({id:'b',chapterId:'ch',startMs:0,endMs:2000,segmentIds:['cue'],narrationText:text,meaning:'transfer',visualGoal:'explain',importance:1});
  const plan=groundedExplanation(story,narration,[beat],{id:'host'} as HostProfile);
  assert.equal(plan.beats[0]!.relations.some(r=>r.kind==='transfer'),expected);
  assert.doesNotThrow(()=>validateExplanation(plan,story,narration,[beat],'host'));
  if(text.startsWith('Không phải')||text.startsWith('No ')){
    const source=plan.beats[0]!.entities.find(e=>e.kind==='battery'),target=plan.beats[0]!.entities.find(e=>e.kind==='engine');
    assert.ok(source&&target,'negative fixture must retain both narrated endpoint entities');
    const forged=structuredClone(plan);
    forged.beats[0]!.relations.push({from:source.id,to:target.id,kind:'transfer',sourceRefs:[ref('cue',text)]});
    assert.throws(()=>validateExplanation(forged,story,narration,[beat],'host'),/affirmative clause/i,'the validator must independently reject a forged prefixed negative transfer');
  }
});

test('every repeated flow clock is emitted and explicit receiver motion owns its interval',()=>{
  const f=world(),v=f.shot.visualization!;v.parts[1]!.kind='wheel';v.events=[
    {type:'flow',targetId:'b0.battery',relationTo:'b0.engine',narrationAnchor:'cue0',startMs:500,endMs:1500,contactRequired:false,motion:'none',sourceRefs:[f.refs[0]!]},
    {type:'flow',targetId:'b0.battery',relationTo:'b0.engine',narrationAnchor:'cue1',startMs:2500,endMs:3500,contactRequired:false,motion:'none',sourceRefs:[f.refs[1]!]},
    {type:'part-motion',targetId:'b0.engine',narrationAnchor:'cue0',startMs:1000,endMs:1500,contactRequired:false,motion:'rotate',sourceRefs:[f.refs[0]!]},
  ];
  f.shot.cinematic!.propBindings=[{partId:'b0.engine',propId:'wheel-prop',role:'illustrative-model',sourceRefs:f.refs}];
  const emitted=cinematicRelations(f.shot,1280,720),calls:unknown[][]=[];
  const tl={set:(...args:unknown[])=>calls.push(args),to:(...args:unknown[])=>calls.push(args)};
  Function('tl',emitted.calls.join('\n'))(tl);
  const starts=calls.filter(c=>(c[1] as {opacity?:number}).opacity===1&&String(c[0]).includes('relation-flow')).map(c=>c[2]);assert.deepEqual(starts,[.5,2.5]);
  const rotations=calls.filter(c=>(c[1] as {rotation?:number}).rotation===100);assert.equal(rotations.length,1,'first receiver motion is already owned by an explicit event');
  assert.equal(rotations[0]![0],'[data-composition-id="world"] #prop-wheel-prop .motion');assert.equal(rotations[0]![2],3.05);
});

test('passive full-root SVG gets a centered normalized viewport without losing authored viewBox or local definitions',()=>{
  const f=world(),id=f.shot.visualization!.parts[0]!.id;
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" x="20" y="30" viewBox="0 0 200 100"><defs><linearGradient id="paint"/><clipPath id="clip"><rect width="200" height="100"/></clipPath></defs><rect class="motion" width="200" height="100" fill="url(#paint)" clip-path="url(#clip)"/></svg>';
  f.shot.cinematic!.artDirection={origin:'authored',brief:'Probe',useEnvironment:false,palette:{background:'#142D40',surface:'#EAF3F5',ink:'#142D40',accent:'#F7BE52'},showHeading:false,layers:[],models:[{partId:id,sourceRefs:f.refs,svg}]};
  const output=customModelArt(f.shot,id,160,80)!;
  assert.match(output,/transform="scale\(1.6 0.8\)"/);assert.match(output,/<svg x="-50" y="-50" width="100" height="100"/);assert.match(output,/viewBox="0 0 200 100"/);
  assert.ok(!output.includes('width="900"'));assert.match(output,/url\(#world\.art\.model\.b0\.battery\.paint\)/);
  assert.match(output,/<linearGradient id="world\.art\.model\.b0\.battery\.paint"\/>/);
  assert.match(output,/<clipPath id="world\.art\.model\.b0\.battery\.clip"><rect width="200" height="100"\/><\/clipPath>/);
  assert.match(output,/clip-path="url\(#world\.art\.model\.b0\.battery\.clip\)"/);
  assert.doesNotMatch(output,/<(?:lineargradient|clippath)\b|\bviewbox=/);
});

function recapWorld(){
  const f=world(['Pin cấp năng lượng cho động cơ.','Tóm lại, thiết bị vẫn vận hành.']);
  f.canonical[1]!.entities=[{id:'b1.recap',kind:'object',label:'thiết bị',sourceRefs:[f.refs[1]!]}];f.canonical[1]!.relations=[];
  f.shot.startMs=2000;f.shot.narrationSegmentIds=['cue1'];f.shot.sourceRefs=[f.refs[1]!];
  return f;
}

test('a static authored recap can retain known earlier entities and evidence without changing its current cue',()=>{
  const f=recapWorld(),before=structuredClone(f);
  assert.doesNotThrow(()=>check(f));
  assert.deepEqual(f,before,'source validation must not retime narration or rewrite authored facts');
  const unknown=structuredClone(f);unknown.shot.visualization!.parts[0]!.id='invented.battery';
  assert.throws(()=>check(unknown),/literal|source|subject|identity/i);
});

test('static earlier transfer evidence cannot animate a recap cue without a current affirmative predicate',()=>{
  const f=recapWorld();assert.doesNotThrow(()=>check(f));
  for(const source of [f.refs[0]!,f.refs[1]!]){
    const bad=structuredClone(f);bad.shot.visualization!.events=[{type:'flow',targetId:'b0.battery',relationTo:'b0.engine',narrationAnchor:'cue1',startMs:2200,endMs:3000,contactRequired:false,motion:'none',sourceRefs:[source]}];
    assert.throws(()=>check(bad),/current|anchor|clock|source|affirmative|predicate|evidence/i);
  }
});

test('a current affirmative flow over earlier subjects is allowed only inside its own cue clock',()=>{
  const f=world();f.shot.startMs=2000;f.shot.narrationSegmentIds=['cue1'];f.shot.sourceRefs=[f.refs[1]!];
  f.shot.visualization!.events=[{type:'flow',targetId:'b0.battery',relationTo:'b0.engine',narrationAnchor:'cue1',startMs:2200,endMs:3000,contactRequired:false,motion:'none',sourceRefs:[f.refs[1]!]}];
  assert.doesNotThrow(()=>check(f));
  for(const [startMs,endMs] of [[1900,3000],[2200,4100]]){
    const bad=structuredClone(f);Object.assign(bad.shot.visualization!.events[0]!,{startMs,endMs});
    assert.throws(()=>check(bad),/cue|clock|anchor/i);
  }
});

test('compare relationTo compares distinct existing subjects without requiring a sourced flow relation',async t=>{
  const f=await creativeFixture(await temporary(t)),shot=structuredClone(f.shot),v=shot.visualization!;
  shot.cinematic!.artDirection=structuredClone(f.artDirection);v.relations=[];
  const [left,right]=v.parts;assert.ok(left&&right);
  v.events=[{type:'compare',targetId:left.id,relationTo:right.id,narrationAnchor:'cue',startMs:100,endMs:300,contactRequired:false,motion:'none',sourceRefs:shot.sourceRefs!}];
  const validate=(candidate:Shot)=>validateExplainerStoryboard({shots:[candidate]},f.narration,[f.beat],f.profile,f.rig,f.config);
  assert.doesNotThrow(()=>validate(shot));
  for(const endpoint of ['missing-part',left.id]){
    const bad=structuredClone(shot);bad.visualization!.events[0]!.relationTo=endpoint;
    assert.throws(()=>validate(bad),/compar|endpoint|distinct|target|event/i);
  }
  const badTarget=structuredClone(shot);badTarget.visualization!.events[0]!.targetId='missing-part';
  assert.throws(()=>validate(badTarget),/target|event|endpoint/i);
  for(const type of ['highlight','reveal','part-motion'] as const){
    const bad=structuredClone(shot);bad.visualization!.events[0]!.type=type;
    assert.throws(()=>validate(bad),/relationTo|flow|compare|event/i);
  }
});
