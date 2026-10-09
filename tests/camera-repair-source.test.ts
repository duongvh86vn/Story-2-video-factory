// DECLARED ONLY, NOT RUN. Human model owns fixtures, runtime and video acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {assertCameraOnlyChange} from '../packages/director/camera-direction.js';
import {cameraRepairSourceSnapshot,assertCameraRepairSourceSnapshot} from '../packages/director/camera-repair-source.js';
import {sourceInteractionFixture} from './fixtures/source-interaction-fixture.js';

function revisions(){
  const f=sourceInteractionFixture(),candidate=structuredClone(f.board);
  candidate.shots[0]!.cinematic!.camera.anchor.x-=10;
  return {...f,candidate};
}

test('allowed camera revision binds its own source while original publication binds the original board',()=>{
  const f=revisions(),before=hash(f),old=cameraRepairSourceSnapshot(f.board,f.narration);
  assertCameraOnlyChange(f.board,f.candidate,[f.board.shots[1]!]);
  const next=cameraRepairSourceSnapshot(f.candidate,f.narration);
  assert.notEqual(old.storyboardHash,next.storyboardHash);
  assert.equal(old.narrationHash,next.narrationHash);
  assertCameraRepairSourceSnapshot(f.board,f.narration,old);
  assertCameraRepairSourceSnapshot(f.candidate,f.narration,next);
  assert.equal(hash(f),before);
});

test('camera publication cannot validate either phase with the opposite revision snapshot',()=>{
  const f=revisions(),old=cameraRepairSourceSnapshot(f.board,f.narration),next=cameraRepairSourceSnapshot(f.candidate,f.narration);
  assert.throws(()=>assertCameraRepairSourceSnapshot(f.candidate,f.narration,old),/needs-camera-direction/);
  assert.throws(()=>assertCameraRepairSourceSnapshot(f.board,f.narration,next),/needs-camera-direction/);
});

test('new planning binding never makes an old rendered scene binding valid, including a sibling camera edit',()=>{
  const f=revisions();
  for(const shot of f.board.shots){
    const prior=rigSpeechPublicationBinding(shot,f.narration,f.board);
    assert.ok(prior);
    const current=f.candidate.shots.find(s=>s.id===shot.id)!;
    assert.notEqual(rigSpeechPublicationBinding(current,f.narration,f.candidate)?.identityHash,prior.identityHash);
    assert.throws(()=>assertRigSpeechPublicationBinding(current,f.narration,f.candidate,prior),/needs-speech-phase/);
  }
});

test('a revision snapshot captures bytes, not mutable aliases, and rejects later narration or source edits',()=>{
  const f=revisions(),source=cameraRepairSourceSnapshot(f.candidate,f.narration),copy=structuredClone(f.candidate);
  assertCameraRepairSourceSnapshot(copy,structuredClone(f.narration),source);
  const narration=structuredClone(f.narration);narration.segments[0]!.text+=' Changed.';
  assert.throws(()=>assertCameraRepairSourceSnapshot(copy,narration,source),/needs-camera-direction/);
  copy.shots[1]!.cinematic!.performance.sourceManipulation!.startMs++;
  assert.throws(()=>assertCameraRepairSourceSnapshot(copy,f.narration,source),/needs-camera-direction/);
  assert.ok(Object.isFrozen(source)&&Object.isFrozen(source.shots)&&Object.isFrozen(source.shots[0]!.binding));
});

test('camera-only authority still rejects lock, body, cue and prop edits before a candidate can be bound',()=>{
  const f=revisions(),lock=f.board.shots[1]!;
  const locked=structuredClone(f.candidate);locked.shots[1]!.cinematic!.camera.anchor.x--;
  assert.throws(()=>assertCameraOnlyChange(f.board,locked,[lock]),/approved shot lock/);
  for(const change of [
    (b:typeof f.board)=>{b.shots[0]!.cinematic!.performance.root.x++;},
    (b:typeof f.board)=>{b.shots[0]!.host!.actions[0]!.narrationAnchor='wrong-cue';},
    (b:typeof f.board)=>{b.shots[1]!.cinematic!.propBindings[0]!.ownerId='wrong-person';},
  ]){
    const candidate=structuredClone(f.candidate);change(candidate);
    assert.throws(()=>assertCameraOnlyChange(f.board,candidate,[lock]),/camera cannot change/);
  }
});

test('snapshot keeps source-binding checks in addition to the whole revision hashes',()=>{
  const f=revisions(),snapshot=cameraRepairSourceSnapshot(f.candidate,f.narration),changed=structuredClone(snapshot);
  assert.ok(changed.shots[0]!.binding);
  const forged={...changed,shots:changed.shots.map((s,i)=>i?s:{...s,binding:{...s.binding!,identityHash:'not-the-compiled-source'}})};
  assert.throws(()=>assertCameraRepairSourceSnapshot(f.candidate,f.narration,forged),/needs-speech-phase/);
});
