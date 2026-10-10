// DECLARED / NOT RUN. User's model owns all fixture/compiler/renderer callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {temporary} from './support.js';
import {creativeFixture} from './creative-fixture.js';
import {originalSpearFixture} from './helpers/original-spear-fixture.js';
import {createCreativeStoryboard} from '../packages/director/creative.js';
import {ModelRouter} from '../packages/models/registry.js';
import {exists,readJson,walk} from '../packages/core/utils.js';
import type {Shot,Storyboard} from '../packages/core/schemas.js';

async function sourceContext(root:string){
  const f=await creativeFixture(root),source=originalSpearFixture('hold');
  f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;
  for(const shot of source.board.shots){
    shot.explanationGoal=source.narration.segments[0]!.text;
    shot.recipeId='host-summary-explainer';
    shot.captionRegion='bottom-safe';
  }
  // A deliberately rejected source proposal need not be a certified film.
  // The real full board/clock still reaches the validators; nothing is mocked.
  return {f,source,context:{story:f.story,narration:source.narration,beats:[f.beat],characters:f.characters,profile:f.profile,rig:f.rig}};
}

test('an original boundary rejection does not hide a later scene artwork error from repair feedback',async t=>{
  const root=await temporary(t),{f,source,context}=await sourceContext(root);
  const rejected=structuredClone(source.board),last=rejected.shots[1]!;
  const replacement=JSON.parse(JSON.stringify(f.shot,(_key,value:unknown)=>{
    if(value&&typeof value==='object'&&'kind' in value&&value.kind==='narration')
      return {...value,quote:source.narration.segments[0]!.text};
    return value;
  })) as Shot;
  replacement.id=last.id;replacement.startMs=last.startMs;replacement.endMs=last.endMs;
  replacement.cinematic!.shotId=last.id;replacement.cinematic!.performance.id=last.id;
  replacement.cinematic!.performance.durationMs=last.endMs-last.startMs;
  replacement.cinematic!.artDirection=structuredClone(f.artDirection);
  replacement.cinematic!.artDirection!.layers[0]!.svg='<pattern/>';
  rejected.shots[1]=replacement;
  // The complete original run now has a missing second source slice, in
  // addition to the independent executable/unsupported artwork rejection.
  const before=structuredClone(rejected),router=new ModelRouter(f.config,root);let calls=0;
  router.structured=async(_role,_request,schema)=>{calls++;return schema.parse(rejected);};
  await assert.rejects(()=>createCreativeStoryboard(root,f.config,router,context,source.board,[]),(error:unknown)=>{
    assert.ok(error instanceof Error);assert.match(error.message,/Creative storyboard validation failed/);
    assert.match(error.message,/needs-source-prop-binding/);
    assert.match(error.message,/unsupported\/executable tag pattern/);return true;
  });
  assert.equal(calls,1);assert.deepEqual(rejected,before);
  assert.equal(await exists(path.join(root,'work/creative-storyboard-cache.json')),false);
  const files=await walk(path.join(root,'work/attempts/creative-storyboard'));assert.equal(files.length,1);
  const receipt=await readJson<{status:string;response:Storyboard;error:string}>(files[0]!);
  assert.equal(receipt.status,'domain-rejected');assert.deepEqual(receipt.response,before);
  assert.match(receipt.error,/needs-source-prop-binding/);assert.match(receipt.error,/unsupported\/executable tag pattern/);
});

test('candidate boundary diagnostics never accept an original spear proposal or create a production cache',async t=>{
  const root=await temporary(t),{f,source,context}=await sourceContext(root),before=structuredClone(source.board);
  const router=new ModelRouter(f.config,root);let calls=0;
  router.structured=async(_role,_request,schema)=>{calls++;return schema.parse(source.board);};
  await assert.rejects(()=>createCreativeStoryboard(root,f.config,router,context,source.board,[]),(error:unknown)=>{
    assert.ok(error instanceof Error);
    // This exact ordinary guard is still required even if candidate source
    // geometry and metadata become valid after separate source repairs.
    assert.match(error.message,/original spear clock is a physical source candidate/);return true;
  });
  assert.equal(calls,1);assert.deepEqual(source.board,before);
  assert.equal(await exists(path.join(root,'work/creative-storyboard-cache.json')),false);
  assert.equal(await exists(path.join(root,'work/creative-direction-report.json')),false);
});

test('all camera roles receive their derived profile before original boundaries read sibling source history',async t=>{
  const root=await temporary(t),{f,source,context}=await sourceContext(root),proposal=structuredClone(source.board);
  for(const [i,shot] of proposal.shots.entries()){
    shot.cinematic!.performance.profileHash='seed-primary-before-bind-'+i;
    for(const actor of shot.cinematic!.actorScene!.supporting)
      actor.performance.profileHash='seed-support-before-bind-'+i;
  }
  const before=structuredClone(proposal),router=new ModelRouter(f.config,root);
  router.structured=async(_role,_request,schema)=>schema.parse(proposal);
  await assert.rejects(()=>createCreativeStoryboard(root,f.config,router,context,source.board,[]),(error:unknown)=>{
    assert.ok(error instanceof Error);
    assert.match(error.message,/original spear clock is a physical source candidate/);
    assert.doesNotMatch(error.message,/declared continuous native actor changed clock, cast\/view or geometry/);
    return true;
  });
  assert.deepEqual(proposal,before);
  assert.equal(await exists(path.join(root,'work/creative-storyboard-cache.json')),false);
});
