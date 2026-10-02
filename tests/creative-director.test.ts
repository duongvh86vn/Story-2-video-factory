import assert from 'node:assert/strict';
import test from 'node:test';
import { temporary } from './support.js';
import { createStoryboard } from '../packages/storyboard/director.js';
import { creativeFixture } from './creative-fixture.js';
import { ModelRouter } from '../packages/models/registry.js';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { hash, readJson, walk, writeJson } from '../packages/core/utils.js';
import { createCreativeStoryboard, creativeInputIdentity, CreativeStoryboardSchema } from '../packages/director/creative.js';
import { directCinematicShot } from '../packages/director/index.js';
import { explainerShot } from '../packages/explainer/storyboard.js';

test('narrated cinematic production calls the configured storyboard model and retains its design',async t=>{
  const root=await temporary(t),f=await creativeFixture(root);
  f.config.models.storyboard.provider='gateway';
  const router=new ModelRouter(f.config,root),calls:string[]=[];
  router.structured=async (role,request,schema)=>{
    calls.push(role);assert.equal(role,'storyboard');assert.match(request.system??'',/creative|art direction/i);
    const seed=(request.context as {seed:typeof f.shot[]}).seed;
    return schema.parse({shots:seed.map(s=>({...s,cinematic:{...s.cinematic,artDirection:{...f.artDirection,origin:'model'}}}))});
  };
  const result=await createStoryboard(root,f.config,router,f.story,f.narration,f.characters,f.chapters,[f.beat]);
  assert.deepEqual(calls,['storyboard'],'a real storyboard role must not be bypassed');
  assert.equal(result.shots[0]!.cinematic!.artDirection!.origin,'model');
  assert.equal(result.shots[0]!.cinematic!.environmentAssetId,undefined,'authored scenery replaces the compulsory plate');
  const cached=await createStoryboard(root,f.config,router,f.story,f.narration,f.characters,f.chapters,[f.beat]);
  assert.deepEqual(cached,result);assert.equal(calls.length,1,'validated creative output is reusable');
});

test('invalid creative art is repaired without silently switching to an offline storyboard',async t=>{
  const root=await temporary(t),f=await creativeFixture(root);f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=1;
  const router=new ModelRouter(f.config,root);let attempts=0;
  router.structured=async (role,request,schema)=>{
    attempts++;assert.equal(role,'storyboard');
    if(attempts===2)assert.match(request.prompt,/Domain validation failed/);
    const seed=(request.context as {seed:typeof f.shot[]}).seed;
    const art=structuredClone(f.artDirection);if(attempts===1)art.layers[0]!.svg='<script>alert(1)</script>';
    return schema.parse({shots:seed.map(s=>({...s,cinematic:{...s.cinematic,artDirection:art}}))});
  };
  const result=await createStoryboard(root,f.config,router,f.story,f.narration,f.characters,f.chapters,[f.beat]);
  assert.equal(attempts,2);assert.equal(result.shots[0]!.cinematic!.artDirection!.origin,'model');
});

test('authored input is bound to the current narration and preserves approved shot locks',async t=>{
  const root=await temporary(t),f=await creativeFixture(root),board={shots:[f.shot]};
  await writeJson(path.join(root,'input/art-direction.json'),{identity:creativeInputIdentity(f.narration,[f.beat],f.profile,f.rig),
    storyboard:{shots:[{...f.shot,cinematic:{...f.shot.cinematic,artDirection:f.artDirection}}]}});
  const authored=await createStoryboard(root,f.config,f.router,f.story,f.narration,f.characters,f.chapters,[f.beat]);
  assert.equal(authored.shots[0]!.cinematic!.artDirection!.origin,'authored');
  await writeJson(path.join(root,'project-state.json'),{version:1,name:'fixture',state:'STORYBOARDED',updatedAt:new Date().toISOString(),inputHash:'x',locked:{[f.shot.id]:true}});
  const attempted={shots:[{...authored.shots[0]!,cinematic:{...authored.shots[0]!.cinematic!,artDirection:{...f.artDirection,brief:'overwrite lock'}}}]};
  await writeJson(path.join(root,'input/art-direction.json'),{identity:creativeInputIdentity(f.narration,[f.beat],f.profile,f.rig),storyboard:attempted});
  const locked=await createStoryboard(root,f.config,f.router,f.story,f.narration,f.characters,f.chapters,[f.beat]);
  assert.deepEqual(locked,authored);
  await writeJson(path.join(root,'input/art-direction.json'),{identity:{...creativeInputIdentity(f.narration,[f.beat],f.profile,f.rig),narrationHash:'different'},storyboard:board});
  await assert.rejects(()=>createStoryboard(root,f.config,f.router,f.story,f.narration,f.characters,f.chapters,[f.beat]),/needs-art-direction/);
});

test('model metadata canonicalization preserves factual visualization, host identity and clocks',async t=>{
  const root=await temporary(t),f=await creativeFixture(root);f.config.models.storyboard.provider='gateway';
  const original=structuredClone(f.shot),router=new ModelRouter(f.config,root);
  router.structured=async(_role,_request,schema)=>{
    const candidate=structuredClone(original),c=candidate.cinematic!;
    c.artDirection={...f.artDirection,origin:'model'};c.performance.id='redundant.performance';
    c.models=c.models.map(m=>({...m,variant:'historical-note' as const}));c.sourceRefs=[{kind:'narration',segmentId:'cue',quote:'redundant metadata only'}];
    c.continuity.entry.x+=20;c.continuity.exit.x+=20;c.continuity.models=[];
    candidate.camera={shotSize:'wide',movement:'static',angle:'front'};
    candidate.sceneType='technical-diagram';candidate.recipeId='redundant.recipe';
    return schema.parse({shots:[candidate]});
  };
  const context={story:f.story,narration:f.narration,beats:[f.beat],characters:f.characters,profile:f.profile,rig:f.rig};
  const board=await createCreativeStoryboard(root,f.config,router,context,{shots:[original]},[]),shot=board.shots[0]!;
  assert.deepEqual(shot.visualization,original.visualization);assert.deepEqual(shot.host,original.host);
  assert.deepEqual(shot.sourceRefs,original.sourceRefs);assert.equal(shot.startMs,original.startMs);assert.equal(shot.endMs,original.endMs);
  assert.equal(shot.cinematic!.performance.id,shot.id);assert.deepEqual(shot.cinematic!.performance.root,original.cinematic!.performance.root);
  assert.deepEqual(shot.cinematic!.models,original.cinematic!.models);assert.deepEqual(shot.cinematic!.continuity,original.cinematic!.continuity);
  assert.equal(shot.camera.angle,'eye-level');assert.equal(shot.camera.shotSize,shot.cinematic!.camera.framing);assert.equal(shot.recipeId,original.recipeId);
});

test('model canonicalization restores locked shots verbatim and rejects factual kind drift on unlocked shots',async t=>{
  const root=await temporary(t),f=await creativeFixture(root);f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;
  const locked=structuredClone(f.shot),context={story:f.story,narration:f.narration,beats:[f.beat],characters:f.characters,profile:f.profile,rig:f.rig};
  const router=new ModelRouter(f.config,root);
  router.structured=async(_role,_request,schema)=>{const candidate=structuredClone(locked);candidate.cinematic!.leadCharacterId='wrong-host';candidate.cinematic!.performance.id='wrong-performance';candidate.visualization!.parts[0]!.kind='gear';return schema.parse({shots:[candidate]});};
  const board=await createCreativeStoryboard(root,f.config,router,context,{shots:[locked]},[locked]);assert.deepEqual(board.shots[0],locked);
  // A fresh root avoids cache reuse for the second independent request.
  const second=await temporary(t),g=await creativeFixture(second);g.config.models.storyboard.provider='gateway';g.config.retry.structured_output=0;
  const bad=new ModelRouter(g.config,second);bad.structured=async(_role,_request,schema)=>{const candidate=structuredClone(g.shot);candidate.cinematic!.artDirection={...g.artDirection,origin:'model'};candidate.visualization!.parts[0]!.kind='gear';return schema.parse({shots:[candidate]});};
  await assert.rejects(createCreativeStoryboard(second,g.config,bad,{story:g.story,narration:g.narration,beats:[g.beat],characters:g.characters,profile:g.profile,rig:g.rig},{shots:[g.shot]},[]),/sourced identity|different subject/i);
});

async function rejectedCandidate(root:string){
  const f=await creativeFixture(root);f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;
  const context={story:f.story,narration:f.narration,beats:[f.beat],characters:f.characters,profile:f.profile,rig:f.rig},seed={shots:[f.shot]};
  const router=new ModelRouter(f.config,root);
  router.structured=async(_role,_request,schema)=>schema.parse({shots:[{...f.shot,cinematic:{...f.shot.cinematic,artDirection:{...f.artDirection,layers:[{...f.artDirection.layers[0]!,svg:'<script>alert(1)</script>'}]}}}]});
  await assert.rejects(createCreativeStoryboard(root,f.config,router,context,seed,[]),/semantic validation exhausted/i);
  const files=await walk(path.join(root,'work/attempts/creative-storyboard'));assert.equal(files.length,1);
  const file=files[0]!,attempt=await readJson<{status:string;binding?:{modelsHash:string};response:{shots:typeof f.shot[]}}>(file);
  assert.equal(attempt.status,'domain-rejected');
  assert.deepEqual(attempt.binding,{modelsHash:hash({primary:f.config.models.storyboard,fallback:f.config.models.fallback})},'domain attempts persist the complete routing settings binding');
  attempt.response.shots[0]!.cinematic!.artDirection=structuredClone(f.artDirection);
  await writeJson(file,attempt);
  return {f,context,seed,file,attempt};
}

test('matching settings-bound rejected candidates can revalidate without another model invocation',async t=>{
  const root=await temporary(t),{f,context,seed,file}=await rejectedCandidate(root),router=new ModelRouter(f.config,root);
  router.structured=async()=>{throw new Error('matching valid candidate must not call the model');};
  const board=await createCreativeStoryboard(root,f.config,router,context,seed,[]);
  assert.equal(board.shots[0]!.cinematic!.artDirection!.brief,f.artDirection.brief);
  const cached=await readJson<{revalidatedAttempt?:string}>(path.join(root,'work/creative-storyboard-cache.json'));
  assert.equal(cached.revalidatedAttempt,path.relative(root,file).split(path.sep).join('/'));
});

for(const change of ['legacy-unbound','primary-provider','primary-temperature','fallback-settings'] as const)test(`rejected candidate replay rejects ${change} and generates current output`,async t=>{
  const root=await temporary(t),{f,context,seed,file,attempt}=await rejectedCandidate(root);
  if(change==='legacy-unbound'){delete attempt.binding;await writeJson(file,attempt);}
  if(change==='primary-provider'){f.config.models.storyboard.provider='codex-cli';f.config.models.storyboard.model='default';}
  if(change==='primary-temperature')f.config.models.storyboard.temperature+=.1;
  if(change==='fallback-settings')f.config.models.fallback.timeout_ms+=17;
  const router=new ModelRouter(f.config,root);let calls=0;
  router.structured=async(_role,_request,schema)=>{calls++;return schema.parse({shots:[{...f.shot,cinematic:{...f.shot.cinematic,artDirection:{...f.artDirection,brief:'Fresh current-settings design'}}}]});};
  const board=await createCreativeStoryboard(root,f.config,router,context,seed,[]);
  assert.equal(calls,1,'an incompatible or legacy candidate must not suppress the configured model call');
  assert.equal(board.shots[0]!.cinematic!.artDirection!.brief,'Fresh current-settings design');
  const cached=await readJson<{revalidatedAttempt?:string}>(path.join(root,'work/creative-storyboard-cache.json'));
  assert.equal(cached.revalidatedAttempt,undefined);
});

test('creative production schema requires every explanatory, narration, host and cinematic contract',async t=>{
  const f=await creativeFixture(await temporary(t));
  assert.equal(CreativeStoryboardSchema.safeParse({shots:[f.shot]}).success,true);
  for(const field of ['explanationGoal','sourceRefs','narrationSegmentIds','host','visualization','cinematic','captionRegion'] as const){
    const candidate:Record<string,unknown>=structuredClone(f.shot);delete candidate[field];
    const parsed=CreativeStoryboardSchema.safeParse({shots:[candidate]});
    assert.equal(parsed.success,false,`${field} must be explicitly supplied by creative production`);
    if(!parsed.success)assert.ok(parsed.error.issues.some(issue=>issue.path.join('.')===`shots.0.${field}`),`${field} must have actionable schema feedback`);
  }
  for(const [field,value] of [['explanationGoal','   '],['sourceRefs',[]],['narrationSegmentIds',[]],['narrationSegmentIds',['']],['captionRegion','unsafe']] as const){
    assert.equal(CreativeStoryboardSchema.safeParse({shots:[{...f.shot,[field]:value}]}).success,false,`${field} cannot be empty or invalid`);
  }
});

test('two invalid creative shots retain aggregate errors and resume the newest design with current repair feedback',async t=>{
  const root=await temporary(t),f=await creativeFixture(root);
  f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;
  const first=directCinematicShot(explainerShot('ch1.s001',0,2500,f.beat,f.narration,f.profile,f.rig),f.beat,f.profile,f.config);
  const second=directCinematicShot(explainerShot('ch1.s002',2500,5000,f.beat,f.narration,f.profile,f.rig),f.beat,f.profile,f.config,first.cinematic!.continuity.exit,
    {facing:first.cinematic!.continuity.facing,parts:first.visualization!.parts});
  for(const shot of [first,second]){
    shot.cinematic!.artDirection=structuredClone(f.artDirection);
    shot.cinematic!.artDirection!.layers[0]!.keyframes[1]!.atMs=2500;
  }
  const seed={shots:[first,second]},original=structuredClone(seed),context={story:f.story,narration:f.narration,beats:[f.beat],characters:f.characters,profile:f.profile,rig:f.rig};
  const invalid=structuredClone(seed);
  invalid.shots[0]!.visualization!.parts[0]!.label='UNSOURCED-PART-LABEL';
  invalid.shots[0]!.cinematic!.artDirection!.layers[0]!.svg='<script>alert(1)</script>';
  const badSecond=invalid.shots[1]!,performance=badSecond.cinematic!.performance;
  badSecond.cinematic!.camera.anchor.x=-1;
  performance.root.x+=20;
  for(const walk of performance.walks){walk.fromX+=20;walk.toX+=20;}
  badSecond.visualization!.parts[0]!.x+=.02;
  const rejectedRouter=new ModelRouter(f.config,root);let rejectedCalls=0;
  rejectedRouter.structured=async(_role,_request,schema)=>{rejectedCalls++;return schema.parse(invalid);};
  const assertFeedback=(feedback:string)=>{
    assert.match(feedback,/Creative storyboard validation failed/);
    assert.match(feedback,/ch1\.s001: model entity changed its sourced identity/);
    assert.match(feedback,/Art SVG unsupported\/executable tag script/);
    assert.match(feedback,/ch1\.s002: camera anchor must be inside the world stage/);
    assert.match(feedback,/ch1\.s002: creative character position\/facing\/scale continuity changed at the cut/);
    assert.match(feedback,/ch1\.s002: model .* teleports at the cut/);
  };
  await assert.rejects(createCreativeStoryboard(root,f.config,rejectedRouter,context,seed,[]),error=>{
    assert.ok(error instanceof Error);assertFeedback(error.message);return true;
  });
  assert.equal(rejectedCalls,1,'all errors must be collected in the bounded attempt');
  assert.deepEqual(seed,original,'validation must preserve the original seed and facts');
  const attempts=await walk(path.join(root,'work/attempts/creative-storyboard'));assert.equal(attempts.length,1);
  const attempt=await readJson<{status:string;error:string;response:typeof seed;request:{system:string;context:unknown};binding:{modelsHash:string}}>(attempts[0]!);
  assert.equal(attempt.status,'domain-rejected');assertFeedback(attempt.error);
  assert.deepEqual(attempt.response,invalid,'the rejected raw design must remain available for review');
  await assert.rejects(fs.access(path.join(root,'work/creative-storyboard-cache.json')),/ENOENT/);
  await assert.rejects(fs.access(path.join(root,'work/creative-direction-report.json')),/ENOENT/);
  // Lexical order deliberately disagrees with mtime; persisted feedback is deliberately stale.
  const newer=structuredClone(attempt),older=structuredClone(attempt);
  newer.response.shots[0]!.cinematic!.artDirection!.brief='NEWEST-CREATIVE-DESIGN';newer.error='STALE-FEEDBACK-MUST-NOT-BE-REUSED';
  older.response.shots[0]!.cinematic!.artDirection!.brief='OLDER-CREATIVE-DESIGN';
  const newerFile=path.join(root,'work/attempts/creative-storyboard/a-newest.json'),olderFile=path.join(root,'work/attempts/creative-storyboard/z-older.json');
  await writeJson(newerFile,newer);await writeJson(olderFile,older);
  const clock=Date.now()/1000;
  await fs.utimes(attempts[0]!,clock-300,clock-300);await fs.utimes(olderFile,clock-200,clock-200);await fs.utimes(newerFile,clock-100,clock-100);
  const repairedRouter=new ModelRouter(f.config,root);let repairedCalls=0;
  repairedRouter.structured=async(role,request,schema)=>{
    repairedCalls++;assert.equal(role,'storyboard');assertFeedback(request.prompt);
    assert.match(request.prompt,/Domain validation failed/);assert.match(request.prompt,/NEWEST-CREATIVE-DESIGN/);
    assert.doesNotMatch(request.prompt,/OLDER-CREATIVE-DESIGN|STALE-FEEDBACK-MUST-NOT-BE-REUSED/);
    const previous=request.prompt.split('Previous output:\n')[1];assert.ok(previous);
    assert.deepEqual(JSON.parse(previous),newer.response,'repair must receive the entire matching raw design');
    return schema.parse(original);
  };
  const board=await createCreativeStoryboard(root,f.config,repairedRouter,context,seed,[]);
  assert.equal(repairedCalls,1,'resume still needs a configured model repair before acceptance');
  assert.deepEqual(await readJson(newerFile),newer,'resume must neither edit nor silently accept the rejected attempt');
  for(const [i,shot] of board.shots.entries()){
    const source=original.shots[i]!;
    assert.deepEqual(shot.visualization,source.visualization);assert.deepEqual(shot.host,source.host);assert.deepEqual(shot.sourceRefs,source.sourceRefs);
    assert.deepEqual(shot.narrationSegmentIds,source.narrationSegmentIds);assert.equal(shot.startMs,source.startMs);assert.equal(shot.endMs,source.endMs);
    assert.equal(shot.cinematic!.artDirection!.origin,'model');
  }
  const currentAttempts=await walk(path.join(root,'work/attempts/creative-storyboard'));
  const statuses=await Promise.all(currentAttempts.map(file=>readJson<{status:string}>(file)));
  assert.equal(statuses.filter(value=>value.status==='accepted').length,1);
});
