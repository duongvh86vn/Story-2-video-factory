// DECLARED / NOT RUN. User QA owns callbacks, factories, physical geometry,
// full scene audit, playback and film acceptance. Nothing is invoked here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {originalSpearFixture} from './helpers/original-spear-fixture.js';
import {hash} from '../packages/core/utils.js';
import {sourceModelEntryParts,sourceModelExitParts,modelEntryParts,modelExitParts,validatePropBindings} from '../packages/director/props.js';
import {validateSourceModelContinuity} from '../packages/director/index.js';
import {boundProp} from '../packages/director/prop-owner.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {samplePhysicalPerformance} from '../packages/animation/compiler.js';

test('original thrust boundaries use the actual shaft center through primary/supporting swaps, without mutating the story',()=>{
  const f=originalSpearFixture('thrust'),before=hash(f);
  for(const shot of f.board.shots){
    for(const [timeMs,parts] of [[0,sourceModelEntryParts(shot,f.board,f.narration)],[shot.endMs-shot.startMs,sourceModelExitParts(shot,f.board,f.narration)]] as const){
      for(const binding of shot.cinematic!.propBindings){
        const owner=boundProp(shot,binding),clock=actorViewActingClock(f.board,shot,owner.id);
        assert.ok(owner.character&&clock?.spearMotion);
        const physical=samplePhysicalPerformance(owner.performance,actorProfile(owner.character),timeMs,clock),center=physical.props[binding.propId]!.point,part=parts.find(p=>p.id===binding.partId)!;
        // The compiler draws four-decimal translations. Independent physical
        // coordinates supply the oracle; no static descriptor/destination.
        assert.equal(part.x,Number(center.x.toFixed(4))/owner.performance.stage.width);
        assert.equal(part.y,Number(center.y.toFixed(4))/owner.performance.stage.height);
        assert.equal(part.width,shot.visualization!.parts.find(p=>p.id===binding.partId)!.width);
      }
    }
  }
  assert.equal(hash(f),before);
});

test('complete source boundaries remain equal at every camera swap',()=>{
  const f=originalSpearFixture('thrust');
  for(let i=1;i<f.board.shots.length;i++){
    const prior=f.board.shots[i-1]!,next=f.board.shots[i]!;
    assert.deepEqual(sourceModelExitParts(prior,f.board,f.narration),sourceModelEntryParts(next,f.board,f.narration));
    validateSourceModelContinuity(prior,next,f.board,f.narration);
  }
});

test('truncated history, foreign fragments and changed narration cannot supply candidate model boundaries',()=>{
  const f=originalSpearFixture(),shot=f.board.shots[0]!;
  assert.throws(()=>sourceModelExitParts(shot,{shots:[shot]},f.narration),/needs-source-prop-binding/);
  const foreign=structuredClone(shot);foreign.subject='Foreign fragment';
  assert.throws(()=>sourceModelEntryParts(foreign,f.board,f.narration),/needs-source-prop-binding/);
  const narration=structuredClone(f.narration);narration.segments[0]!.text='An unrelated story.';
  assert.throws(()=>sourceModelExitParts(shot,f.board,narration),/needs-source-prop-binding/);
});

test('a later sibling with a foreign owner, dimension, glyph, phase or registration invalidates the complete run',()=>{
  const mutations:Array<(f:ReturnType<typeof originalSpearFixture>)=>void>=[
    f=>{f.board.shots[1]!.cinematic!.sourceSpearBindings![1]!.ownerId='foreign-person';},
    f=>{f.board.shots[1]!.visualization!.parts[1]!.width+=.01;},
    f=>{f.board.shots[1]!.cinematic!.artDirection!.models.push({partId:'karo-spear',sourceRefs:f.board.shots[1]!.visualization!.parts[1]!.sourceRefs,svg:'<circle r="20"/>'});},
    f=>{f.board.shots[1]!.cinematic!.performance.sourceSpear!.spears[0]!.endMs-=1;},
    f=>{f.board.shots[1]!.cinematic!.sourceSpearBindings!.pop();},
  ];
  for(const change of mutations){const f=originalSpearFixture();change(f);assert.throws(()=>sourceModelExitParts(f.board.shots[0]!,f.board,f.narration),/needs-source-prop-binding|needs-source-spear/);}
});

test('the first camera and intentional actor cuts still require valid original bindings',()=>{
  for(const first of [true,false]){
    const f=originalSpearFixture(),next=f.board.shots[first?0:1]!,previous=first?undefined:f.board.shots[0];
    next.cinematic!.actorScene!.continuity='cut';
    next.cinematic!.sourceSpearBindings![0]!.trackId='missing-track';
    assert.throws(()=>validateSourceModelContinuity(previous,next,f.board,f.narration),/needs-source-prop-binding/);
  }
});

test('read-only candidate geometry grants no production binding exception on either camera role',()=>{
  const f=originalSpearFixture();
  for(const shot of f.board.shots){
    sourceModelExitParts(shot,f.board,f.narration);
    assert.throws(()=>modelEntryParts(shot,f.board,f.narration),/needs-source-prop-binding/);
    assert.throws(()=>modelExitParts(shot,f.board,f.narration),/needs-source-prop-binding/);
    assert.throws(()=>validatePropBindings(shot,f.board,f.narration),/needs-source-prop-binding/);
  }
});
