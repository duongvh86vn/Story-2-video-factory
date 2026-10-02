import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { temporary } from './support.js';
import { creativeFixture } from './creative-fixture.js';
import { createCreativeStoryboard } from '../packages/director/creative.js';
import { ModelRouter } from '../packages/models/registry.js';
import { readJson, walk, exists } from '../packages/core/utils.js';
import { BeatSchema, StorySchema, type Narration, type Shot, type Storyboard } from '../packages/core/schemas.js';
import { groundedExplanation } from '../packages/explainer/plan.js';
import { explainerShot, validateExplainerStoryboard } from '../packages/explainer/storyboard.js';
import { directCinematicShot } from '../packages/director/index.js';
import type { ExplanationBeat } from '../packages/explainer/schemas.js';
import { canonicalNarrationCitation, canonicalExplanationEvidence, normalizeCreativeSourceRefs } from '../packages/explainer/citations.js';

type Ref=ExplanationBeat['sourceRefs'][number];
function rewriteNarrationRefs<T>(input:T,change:(ref:Ref)=>void):T{
  const copy=structuredClone(input);
  const visit=(value:unknown):void=>{
    if(Array.isArray(value)){value.forEach(visit);return;}
    if(!value||typeof value!=='object')return;
    const item=value as Record<string,unknown>;
    if(item.kind==='narration'&&typeof item.quote==='string')change(item as Ref);
    Object.values(item).forEach(visit);
  };
  visit(copy);return copy;
}
function narrationRefs(input:unknown):Ref[]{
  const refs:Ref[]=[];rewriteNarrationRefs(input,ref=>refs.push(structuredClone(ref)));return refs;
}
const context=(f:Awaited<ReturnType<typeof creativeFixture>>)=>({story:f.story,narration:f.narration,beats:[f.beat],characters:f.characters,profile:f.profile,rig:f.rig});

test('literal model citations expand to the exact full cue while raw design, factual layout and clocks remain unchanged',async t=>{
  const root=await temporary(t),f=await creativeFixture(root);f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;
  const original={shots:[{...structuredClone(f.shot),cinematic:{...structuredClone(f.shot.cinematic!),artDirection:structuredClone(f.artDirection)}}]};
  const excerpt='Hơi nước đẩy pít-tông',candidate=rewriteNarrationRefs(original,ref=>{ref.quote=excerpt;}),rawSnapshot=structuredClone(candidate);
  assert.ok(narrationRefs(candidate).length>5,'exercise nested model, event, cinematic and custom-art citations');
  const router=new ModelRouter(f.config,root);let calls=0;
  router.structured=async(role,_request,schema)=>{calls++;assert.equal(role,'storyboard');return schema.parse(candidate);};
  const seed={shots:[f.shot]},seedSnapshot=structuredClone(seed),contextSnapshot=structuredClone(context(f));
  const board=await createCreativeStoryboard(root,f.config,router,context(f),seed,[]),shot=board.shots[0]!;
  assert.equal(calls,1);assert.deepEqual(candidate,rawSnapshot);assert.deepEqual(seed,seedSnapshot);assert.deepEqual(context(f),contextSnapshot);
  const full=f.narration.segments[0]!.text;
  for(const ref of narrationRefs(board)){assert.equal(ref.segmentId,'cue');assert.equal(ref.quote,full);}
  assert.deepEqual(shot.visualization,f.shot.visualization);assert.deepEqual(shot.host,f.shot.host);
  assert.deepEqual(shot.cinematic!.performance,f.shot.cinematic!.performance);
  assert.equal(shot.startMs,f.shot.startMs);assert.equal(shot.endMs,f.shot.endMs);assert.deepEqual(shot.narrationSegmentIds,f.shot.narrationSegmentIds);
  const files=await walk(path.join(root,'work/attempts/creative-storyboard'));assert.equal(files.length,1);
  const attempt=await readJson<{status:string;response:Storyboard;result:Storyboard}>(files[0]!);
  assert.equal(attempt.status,'accepted');assert.deepEqual(attempt.response,rawSnapshot,'persist the actual raw model citation excerpts');
  assert.deepEqual(attempt.result,board,'persist normalized result separately from the unmodified response');
});

for(const defect of ['unknown-segment','missing-segment','forged-quote','nonliteral-quote','false-source-kind','untrusted-long-cue-excerpt'] as const)test(`creative citations reject ${defect} without silently substituting evidence`,async t=>{
  const root=await temporary(t),f=await creativeFixture(root);f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;
  const candidate={shots:[{...structuredClone(f.shot),cinematic:{...structuredClone(f.shot.cinematic!),artDirection:structuredClone(f.artDirection)}}]};
  const reference=candidate.shots[0]!.visualization!.parts[0]!.sourceRefs[0]!;
  if(defect==='unknown-segment')reference.segmentId='missing-cue';
  if(defect==='missing-segment')delete reference.segmentId;
  if(defect==='forged-quote')reference.quote='Hơi nước tạo ra một bánh răng chưa được kể.';
  if(defect==='nonliteral-quote')reference.quote='Steam pushes the piston inside the cylinder.';
  if(defect==='false-source-kind')reference.kind='source';
  if(defect==='untrusted-long-cue-excerpt'){
    f.narration.segments[0]!.text+=' '.repeat(2001);
    reference.quote='pít-tông';
  }
  const snapshot=structuredClone(candidate),router=new ModelRouter(f.config,root);
  router.structured=async(_role,_request,schema)=>schema.parse(candidate);
  await assert.rejects(createCreativeStoryboard(root,f.config,router,context(f),{shots:[f.shot]},[]),/source|citation|segment|cue|excerpt|evidence/i);
  assert.deepEqual(candidate,snapshot);
  assert.equal(await exists(path.join(root,'work/creative-storyboard-cache.json')),false);
  const files=await walk(path.join(root,'work/attempts/creative-storyboard'));assert.equal(files.length,1);
  const attempt=await readJson<{status:string;response:Storyboard}>(files[0]!);
  assert.equal(attempt.status,'domain-rejected');assert.deepEqual(attempt.response,snapshot);
});

test('a literal affirmative-looking excerpt from a negative full cue cannot fabricate a transfer',async t=>{
  const root=await temporary(t),f=await creativeFixture(root);f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;
  const text='Không phải pin cấp năng lượng cho động cơ.',narration:Narration={mode:'srt',durationMs:5000,words:[],segments:[{id:'cue',startMs:0,endMs:5000,text}]};
  const story=StorySchema.parse({title:'Negative transfer',story:text,style:{visual:''}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:5000,segmentIds:['cue'],narrationText:text,meaning:'explain',visualGoal:'preserve negation',importance:1});
  const beat={...base,...groundedExplanation(story,narration,[base],f.profile).beats[0]!};
  assert.equal(beat.relations.some(r=>r.kind==='transfer'),false);
  const shot=directCinematicShot(explainerShot('ch1.s001',0,5000,beat,narration,f.profile,f.rig),beat,f.profile,f.config);
  shot.cinematic!.artDirection={...structuredClone(f.artDirection),models:[]};
  const battery=shot.visualization!.parts.find(p=>p.kind==='battery')!,engine=shot.visualization!.parts.find(p=>p.kind==='engine')!;assert.ok(battery&&engine);
  const excerpt='pin cấp năng lượng cho động cơ.';assert.ok(text.includes(excerpt));
  const candidate={shots:[structuredClone(shot)]};
  candidate.shots[0]!.visualization!.relations=[{from:battery.id,to:engine.id,kind:'transfer',sourceRefs:[{kind:'narration',segmentId:'cue',quote:excerpt}]}];
  candidate.shots[0]!.visualization!.events=[{type:'flow',targetId:battery.id,relationTo:engine.id,narrationAnchor:'cue',startMs:500,endMs:1500,contactRequired:false,motion:'none',sourceRefs:[{kind:'narration',segmentId:'cue',quote:excerpt}]}];
  const raw=structuredClone(candidate),router=new ModelRouter(f.config,root);
  router.structured=async(_role,_request,schema)=>schema.parse(candidate);
  await assert.rejects(createCreativeStoryboard(root,f.config,router,{story,narration,beats:[beat],characters:f.characters,profile:f.profile,rig:f.rig},{shots:[shot]},[]),/affirmative clause/i);
  assert.deepEqual(candidate,raw);assert.deepEqual(narration.segments,[{id:'cue',startMs:0,endMs:5000,text}]);
  assert.equal(await exists(path.join(root,'work/creative-storyboard-cache.json')),false);
});

test('citation helpers preserve inputs and expand only known literal excerpts within the full-cue limit',async t=>{
  const f=await creativeFixture(await temporary(t)),narration=structuredClone(f.narration);
  narration.segments.push({id:'long-cue',startMs:5000,endMs:10000,text:'a'.repeat(2001)});narration.durationMs=10000;
  const excerpt:Ref={kind:'narration',segmentId:'cue',quote:'pít-tông'},before=structuredClone(excerpt);
  assert.deepEqual(canonicalNarrationCitation(excerpt,narration),{kind:'narration',segmentId:'cue',quote:f.narration.segments[0]!.text});
  assert.deepEqual(excerpt,before);
  for(const ref of [
    {kind:'narration',segmentId:'missing',quote:'pít-tông'},
    {kind:'narration',quote:'pít-tông'},
    {kind:'narration',segmentId:'cue',quote:'piston'},
    {kind:'narration',segmentId:'cue',quote:' '},
    {kind:'narration',segmentId:'long-cue',quote:'aaa'},
    {kind:'source',quote:'pít-tông'},
  ] satisfies Ref[]){const snapshot=structuredClone(ref);assert.deepEqual(canonicalNarrationCitation(ref,narration),snapshot);assert.deepEqual(ref,snapshot);}
  const canonical=groundedExplanation(f.story,f.narration,[f.beat],f.profile).beats;
  const evidence=rewriteNarrationRefs(canonical,ref=>{ref.quote='pít-tông';}),evidenceBefore=structuredClone(evidence);
  assert.deepEqual(canonicalExplanationEvidence(evidence,f.narration),canonical);assert.deepEqual(evidence,evidenceBefore);
  const candidate={shots:[{...structuredClone(f.shot),cinematic:{...structuredClone(f.shot.cinematic!),artDirection:structuredClone(f.artDirection)}}]};
  const boardBefore=structuredClone(candidate),normalized=normalizeCreativeSourceRefs(candidate,f.narration);
  normalized.shots[0]!.visualization!.parts[0]!.label='independent returned clone';
  assert.deepEqual(candidate,boardBefore,'normalization does not alias the returned world into the raw model candidate');
});

async function glyphWorld(root:string){
  const f=await creativeFixture(root),texts=['Pin cấp năng lượng cho động cơ.',f.narration.segments[0]!.text];
  const narration:Narration={mode:'srt',durationMs:10000,words:[],segments:texts.map((text,i)=>({id:`cue${i}`,startMs:i*5000,endMs:(i+1)*5000,text}))};
  const story=StorySchema.parse({title:'Independent glyph provenance',story:texts.join('\n'),style:{visual:''}});
  const bases=texts.map((text,i)=>BeatSchema.parse({id:`b${i}`,chapterId:'ch1',startMs:i*5000,endMs:(i+1)*5000,segmentIds:[`cue${i}`],narrationText:text,meaning:'explain',visualGoal:'preserve source identity',importance:1}));
  const explanation=groundedExplanation(story,narration,bases,f.profile),beats=bases.map((beat,i)=>({...beat,...explanation.beats[i]!}));
  const shots:Shot[]=[];
  beats.forEach((beat,i)=>{
    const prior=shots.at(-1)?.cinematic;
    const shot=directCinematicShot(explainerShot(`ch1.s00${i+1}`,i*5000,(i+1)*5000,beat,narration,f.profile,f.rig),beat,f.profile,f.config,prior?.continuity.exit,prior?{facing:prior.continuity.facing}:undefined);
    shot.cinematic!.artDirection={...structuredClone(f.artDirection),models:[{...structuredClone(f.artDirection.models[0]!),partId:shot.visualization!.parts[0]!.id,sourceRefs:shot.visualization!.parts[0]!.sourceRefs}]};
    shots.push(shot);
  });
  return {...f,story,narration,beats,board:{shots}};
}

async function acceptGlyphCandidate(root:string,f:Awaited<ReturnType<typeof glyphWorld>>,candidate:Storyboard){
  f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;
  const router=new ModelRouter(f.config,root);router.structured=async(_role,_request,schema)=>schema.parse(candidate);
  return createCreativeStoryboard(root,f.config,router,{story:f.story,narration:f.narration,beats:f.beats,characters:f.characters,profile:f.profile,rig:f.rig},f.board,[]);
}

test('custom glyph and explanatory layer may add verified earlier evidence while retaining the anchored subject ref',async t=>{
  const root=await temporary(t),f=await glyphWorld(root),raw=structuredClone(f.board),shot=raw.shots[1]!,art=shot.cinematic!.artDirection!;
  const own=shot.visualization!.parts[0]!.sourceRefs[0]!,earlier=f.beats[0]!.sourceRefs![0]!;
  assert.notEqual(own.segmentId,earlier.segmentId);
  art.models[0]!.sourceRefs=[own,earlier];
  art.layers.push({...structuredClone(art.layers[0]!),id:'earlier-evidence',role:'explanation',sourceRefs:[earlier]});
  const snapshot=structuredClone(raw),normalized=await acceptGlyphCandidate(root,f,raw);
  assert.deepEqual(raw,snapshot);assert.deepEqual(normalized.shots[1]!.narrationSegmentIds,['cue1']);
  assert.ok(normalized.shots[1]!.sourceRefs!.some(ref=>ref.segmentId==='cue0'));
  assert.doesNotThrow(()=>validateExplainerStoryboard(normalized,f.narration,f.beats,f.profile,f.rig,f.config));
});

for(const defect of ['other-subject-only','forged-glyph-added-to-provenance','forged-layer-added-to-provenance'] as const)test(`custom art rejects ${defect} after citation normalization`,async t=>{
  const root=await temporary(t),f=await glyphWorld(root),raw=structuredClone(f.board),art=raw.shots[1]!.cinematic!.artDirection!;
  const earlier=f.beats[0]!.sourceRefs![0]!,forged:Ref={kind:'narration',segmentId:'cue0',quote:'Pin cấp năng lượng cho một cỗ máy du hành thời gian.'};
  if(defect==='other-subject-only')art.models[0]!.sourceRefs=[earlier];
  if(defect==='forged-glyph-added-to-provenance')art.models[0]!.sourceRefs.push(forged);
  if(defect==='forged-layer-added-to-provenance')art.layers.push({...structuredClone(art.layers[0]!),id:'forged-layer',role:'explanation',sourceRefs:[forged]});
  const snapshot=structuredClone(raw);
  await assert.rejects(acceptGlyphCandidate(root,f,raw),/custom model changed its source identity|changed\/unverifiable narration sources/i,'being copied into shot provenance cannot independently verify fabricated evidence');
  assert.deepEqual(raw,snapshot);
});
