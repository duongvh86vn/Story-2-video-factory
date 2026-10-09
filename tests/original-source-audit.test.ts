// DECLARED / NOT RUN. Human model owns execution. These deliberately invalid
// native fixtures do not establish physical, artwork, motion or film acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {hash} from '../packages/core/utils.js';
import {buildRig} from '../packages/host/rig.js';
import {assertOriginalAuditContext} from '../packages/director/source-audit-context.js';
import {inspectSourceProductionCandidate} from '../packages/director/source-production-audit.js';
import {sourceInteractionFixture} from './fixtures/source-interaction-fixture.js';
import {BeatSchema,CharacterBibleSchema,type Storyboard} from '../packages/core/schemas.js';
import {readSourceProductionAudit} from '../apps/server/source-audit.js';
import {ApiError} from '../apps/server/security.js';
import {sourceAuditMarkup} from '../apps/studio/src/source-audit.js';
import type {SourceProductionAuditDocument} from '../apps/server/contracts.js';

function context(){
  const f=sourceInteractionFixture();
  // Cover the silent opening for structural context tests only. Original pose
  // clocks are deliberately not changed, so this is NOT an accepted native run.
  f.board.shots[0]!.startMs=0;
  return f;
}
function input(){
  const f=context(),profile=f.profiles[0]!;
  const beats=[BeatSchema.parse({id:'beat',chapterId:'chapter',startMs:0,endMs:5000,narrationText:f.ref.quote,meaning:f.ref.quote,visualGoal:'Perform the original sourced actions',importance:1,segmentIds:['cue']})];
  const characters=CharacterBibleSchema.parse({characters:f.characters.map(c=>({id:c.id,name:c.name,identity:{},wardrobe:{default:'original fur costume'},immutable:['identity'],mutable:['expression']}))});
  return {board:f.board,narration:f.narration,beats,characters,profile,rig:buildRig(profile),config:f.config};
}

test('complete structural context retains exact shot membership without mutating original cues or poses',()=>{
  const f=context(),before=hash(f);
  assertOriginalAuditContext(f.board,f.narration,[f.board.shots[1]!]);assert.equal(hash(f),before);
});
test('a locally matching fragment cannot supply a truncated complete narration context',()=>{
  const f=sourceInteractionFixture(),fragment={shots:[f.board.shots[1]!]} as Storyboard;
  assert.throws(()=>assertOriginalAuditContext(fragment,f.narration,fragment.shots),/complete narration clock/);
  assert.throws(()=>assertOriginalAuditContext(f.board,f.narration,f.board.shots),/complete narration clock/);
});
test('complete original context rejects gaps, duplicate IDs, foreign revisions and repeated fragments',()=>{
  for(const change of [(b:Storyboard)=>{b.shots[1]!.startMs++;},(b:Storyboard)=>{b.shots[1]!.id=b.shots[0]!.id;}]){
    const f=context();change(f.board);assert.throws(()=>assertOriginalAuditContext(f.board,f.narration,f.board.shots));
  }
  const f=context(),foreign=structuredClone(f.board.shots[1]!);foreign.subject+=' altered';
  assert.throws(()=>assertOriginalAuditContext(f.board,f.narration,[foreign]),/exact unique members/);
  assert.throws(()=>assertOriginalAuditContext(f.board,f.narration,[f.board.shots[1]!,f.board.shots[1]!]),/exact unique members/);
});
test('candidate audit collects complete acting and all shot camera checks despite independent source failures',()=>{
  const f=input(),before=hash(f),report=inspectSourceProductionCandidate(f);
  assert.equal(hash(f),before);assert.equal(report.sourceChecksPassed,false);
  for(const id of ['storyboard-clock-source','complete-original-context','actor-continuity','story-acting-coverage','final-direction-source'])assert.ok(report.checks.some(c=>c.id===id));
  for(const shot of f.board.shots){
    for(const id of ['model-continuity','explainer-original-candidate','cast-camera'])assert.ok(report.checks.some(c=>c.shotId===shot.id&&c.id===id));
    for(const id of [shot.cinematic!.actorScene!.primary!.id,...shot.cinematic!.actorScene!.supporting.map(a=>a.character.id)])
      assert.ok(report.checks.some(c=>c.id==='cast-camera'&&c.shotId===shot.id&&c.actorId===id));
  }
  assert.equal(report.productionBinding,'needs-source-prop-binding');assert.equal(report.canPublish,false);assert.equal(report.approved,false);
  assert.equal(report.productionReady,false);assert.equal(report.productionRig,null);assert.deepEqual(report.availableBanks,[]);
  assert.equal(report.productionApproval,false);assert.equal(report.motionVerified,false);
});
test('candidate fingerprints change with source revision but never grant publication or motion acceptance',()=>{
  const f=input(),old=inspectSourceProductionCandidate(f);
  f.board.shots[1]!.cinematic!.camera.anchor.x++;
  const next=inspectSourceProductionCandidate(f);
  assert.notEqual(old.fingerprint,next.fingerprint);assert.notEqual(old.binding.storyboard,next.binding.storyboard);
  assert.equal(next.canPublish,false);assert.equal(next.motionVerified,false);
});
test('camera subject construction failure marks every declared actual actor unavailable',()=>{
  const f=input(),shot=f.board.shots[0]!,scene=shot.cinematic!.actorScene!;
  // Duplicate IDs are a structural camera-subject error, not a valid cast.
  scene.supporting[0]!.character.id=scene.primary!.id;
  const report=inspectSourceProductionCandidate(f),rows=report.checks.filter(c=>c.shotId===shot.id&&c.id==='cast-camera');
  assert.ok(rows.some(c=>c.actorId===scene.primary!.id&&c.status==='unavailable'));
  assert.equal(rows.filter(c=>c.actorId===scene.primary!.id).length,1);
  assert.equal(report.sourceChecksPassed,false);assert.equal(report.productionApproval,false);
});
test('ordinary rig default is supported; sprite configuration and structurally invalid inputs are rejected',()=>{
  const f=input();delete f.config.presentation.actor_renderer;
  assert.equal(inspectSourceProductionCandidate(f).scope,'original-source-candidate-diagnostics');
  f.config.presentation.actor_renderer='sprite';assert.throws(()=>inspectSourceProductionCandidate(f),/rig actors/);
  const bad=input();bad.narration.durationMs=NaN;assert.throws(()=>inspectSourceProductionCandidate(bad));
});
test('read-only route reports missing context without creating project work artifacts',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'factory-source-audit-missing-'));
  try{await assert.rejects(readSourceProductionAudit(root),(e:unknown)=>e instanceof ApiError&&e.statusCode===409&&e.code==='SOURCE_AUDIT_CONTEXT_MISSING');assert.deepEqual(await fs.readdir(root),[]);}
  finally{await fs.rm(root,{recursive:true,force:true});}
});
test('read-only route rejects oversized source before providers, geometry or host loading',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'factory-source-audit-size-'));
  try{
    await fs.mkdir(path.join(root,'work'));await fs.writeFile(path.join(root,'work/voiced-narration.json'),Buffer.alloc(4*1024*1024+1));
    const before=hash(await fs.readFile(path.join(root,'work/voiced-narration.json')));
    await assert.rejects(readSourceProductionAudit(root),(e:unknown)=>e instanceof ApiError&&e.statusCode===413&&e.code==='SOURCE_AUDIT_TOO_LARGE');
    assert.equal(hash(await fs.readFile(path.join(root,'work/voiced-narration.json'))),before);
    assert.deepEqual(await fs.readdir(path.join(root,'work')),['voiced-narration.json']);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('test-model diagnostics escape actor IDs and source messages in the visible table and JSON',()=>{
  const data={...inspectSourceProductionCandidate(input()),fileReceipts:{},narrationFile:'work/narration.json',revisionChecked:true as const,freshness:'optimistic end-of-read comparison; not an OS snapshot, asset/audio receipt or publication authority' as const} satisfies SourceProductionAuditDocument;
  data.checks.push({id:'cast-camera',actorId:'<img src=x>',status:'unavailable',message:'<script>alert(1)</script>'});
  const markup=sourceAuditMarkup(data,'vi');assert.ok(!markup.includes('<script>')&&!markup.includes('<img src=x>'));
  assert.ok(markup.includes('&lt;script&gt;')&&markup.includes('Chưa kiểm tra được'));
});
