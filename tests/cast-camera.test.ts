// DECLARED ONLY / NOT RUN. Human model owns all fixture/geometry/runtime/video execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import type {Storyboard} from '../packages/core/schemas.js';
import {hash} from '../packages/core/utils.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {cameraHostBounds} from '../packages/director/camera.js';
import {inspectCastCameras,validateCastCameras,validateCastCameraSources} from '../packages/director/cast-camera.js';
import {sourceInteractionFixture} from './fixtures/source-interaction-fixture.js';

function fit(board:Storyboard){
  for(const shot of board.shots){const c=shot.cinematic!,scene=c.actorScene!;
    const owners=[{character:scene.primary!,performance:c.performance},...scene.supporting];
    const bounds=owners.map(a=>({id:a.character.id,b:cameraHostBounds(a.performance,actorProfile(a.character),actorViewActingClock(board,shot,a.character.id))}));
    const boxes=bounds.map(b=>b.b.body);
    for(const part of shot.visualization!.parts){const binding=c.propBindings.find(b=>b.partId===part.id)!,b=bounds.find(a=>a.id===binding.ownerId)!.b.props[binding.propId]!;
      boxes.push({left:b.left-part.width*1000*.56,right:b.right+part.width*1000*.56,top:b.top-part.height*440*.6,bottom:b.bottom+part.height*440*.6});}
    const left=Math.min(...boxes.map(b=>b.left)),right=Math.max(...boxes.map(b=>b.right)),top=Math.min(...boxes.map(b=>b.top)),bottom=Math.max(...boxes.map(b=>b.bottom));
    const scale=Math.min(1,800/(right-left),264/(bottom-top));
    c.camera={...c.camera,anchor:{x:(left+right)/2,y:(top+bottom)/2},startScale:scale,endScale:scale,designIntent:'Human test engineering envelope only, not an accepted film camera.'};
  }
}

test('every primary/supporting person is measured from their own original clock through role swaps',()=>{
  const f=sourceInteractionFixture();fit(f.board);const before=hash(f.board);
  for(const shot of f.board.shots){const r=validateCastCameras(shot,f.profiles[0]!,f.board);
    assert.equal(r.issues.length,0);assert.deepEqual(r.actors.map(a=>a.actorId).sort(),['karo-person','lila-person']);
    assert.equal(r.actors.find(a=>a.role==='primary')!.actorId,shot.cinematic!.actorScene!.primary!.id);
    assert.equal(r.actors.find(a=>a.role==='supporting')!.actorId,shot.cinematic!.actorScene!.supporting[0]!.character.id);
    assert.equal(r.productionApproval,false);assert.equal(r.visualAcceptance,false);assert.equal(r.motionVerified,false);
  }assert.equal(hash(f.board),before);
});

test('supporting actor floor defect is named explicitly and does not disappear behind primary framing',()=>{
  const f=sourceInteractionFixture();fit(f.board);const shot=f.board.shots[1]!,support=shot.cinematic!.actorScene!.supporting[0]!;
  support.performance.stage.groundY-=6;const r=inspectCastCameras(shot,f.profiles[0]!,f.board);
  assert.ok(r.issues.some(i=>i.actorId===support.character.id&&i.role==='supporting'&&i.message.includes('same physical stage/floor')));
  assert.equal(r.issues.find(i=>i.actorId===support.character.id)!.type,'camera-source');
  assert.equal(r.actors.length+r.issues.length,2);assert.throws(()=>validateCastCameras(shot,f.profiles[0]!,f.board),/camera cast validation failed/);
});

test('both cropped actors generate diagnostics instead of aborting on the first actor',()=>{
  const f=sourceInteractionFixture();fit(f.board);const shot=f.board.shots[0]!;
  shot.cinematic!.camera.anchor.x=1000;shot.cinematic!.camera.startScale=shot.cinematic!.camera.endScale=8;
  const r=inspectCastCameras(shot,f.profiles[0]!,f.board);assert.equal(r.issues.length,2);
  assert.deepEqual(r.issues.map(i=>i.actorId).sort(),['karo-person','lila-person']);assert.equal(r.productionApproval,false);
  assert.ok(r.issues.every(i=>i.type==='camera-layout'));
});

test('candidate outside complete board, duplicate camera person and sprite rig substitution are rejected',()=>{
  const f=sourceInteractionFixture();fit(f.board);const changed=structuredClone(f.board.shots[0]!);changed.cinematic!.camera.anchor.x--;
  assert.throws(()=>inspectCastCameras(changed,f.profiles[0]!,f.board),/authoritative complete storyboard/);
  const shot=f.board.shots[0]!;shot.cinematic!.actorScene!.supporting[0]!.character.id=shot.cinematic!.actorScene!.primary!.id;
  assert.throws(()=>inspectCastCameras(shot,f.profiles[0]!,f.board),/unique visible person IDs/);
  const g=sourceInteractionFixture();g.board.shots[0]!.cinematic!.spriteStage={} as NonNullable<typeof shot.cinematic>['spriteStage'];
  assert.throws(()=>inspectCastCameras(g.board.shots[0]!,g.profiles[0]!,g.board),/canonical rig shot/);
});

test('object-only camera retains a null person rather than inventing a presenter',()=>{
  const f=sourceInteractionFixture(),shot=f.board.shots[0]!,c=shot.cinematic!;f.board.shots=[shot];
  c.actorScene!.primary=null;c.actorScene!.supporting=[];c.propBindings=[];shot.host!.actions=[];
  delete c.performance.sourceBody;delete c.performance.sourceManipulation;c.performance.gestures=[];c.performance.props=[];
  const r=inspectCastCameras(shot,f.profiles[0]!,f.board),rows=[...r.actors,...r.issues];
  assert.equal(rows.length,1);assert.equal(rows[0]!.actorId,null);assert.equal(rows[0]!.role,'object-only');
  assert.equal(r.visualAcceptance,false);assert.equal(r.productionApproval,false);
});

test('bad framing cannot hide a missing original prop envelope from source preflight',()=>{
  const f=sourceInteractionFixture(),shot=f.board.shots[0]!;
  shot.cinematic!.camera.anchor.x=10000;shot.cinematic!.propBindings[0]!.propId='missing-original-prop';
  assert.throws(()=>validateCastCameraSources(shot,f.profiles[0]!,f.board),/needs-camera-source/);
  const report=inspectCastCameras(shot,f.profiles[0]!,f.board);
  assert.equal(report.issues.length,2);assert.ok(report.issues.every(i=>i.type==='camera-source'));
});
