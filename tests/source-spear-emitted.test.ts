// DECLARED / NOT RUN. Only the user's tester invokes compiler/geometry callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {projectedContactFixture} from './helpers/projected-contact-fixture.js';
import {sourceActor} from '../packages/director/source-actor.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {compilePerformance} from '../packages/animation/compiler.js';
import {emittedTransformTrack,parseSvgTransform,svgLinearNumber} from '../packages/animation/svg-transform-track.js';
import {inspectEmittedSpearActions,type ActorCompilations} from '../packages/director/source-spear-emitted.js';
import type {Shot} from '../packages/core/schemas.js';
function supplied(f:ReturnType<typeof projectedContactFixture>,s:Shot):ActorCompilations{
  const ids=[s.cinematic!.actorScene!.primary!.id,...s.cinematic!.actorScene!.supporting.map(a=>a.character.id)];
  return new Map(ids.map(id=>{const o=sourceActor(s,id);return [id,compilePerformance(o.performance,actorProfile(o.character),{method:'segment-draft',windowMs:20,intervals:[]},s.cinematic!.actorScene!.primary!.id===id?'':`actor-${id}-`,undefined,actorViewActingClock(f.board,s,id))];}));
}
test('actual supplied transforms retain unwrapped angles and GSAP rounding without shortest-path or scale inference',()=>{
  assert.deepEqual(parseSvgTransform('translate(10.1234 30) rotate(390) scale(0.8)'),{x:10.1234,y:30,angle:390,scale:.8});
  assert.equal(svgLinearNumber(170,210,.2525),180.1);assert.equal(svgLinearNumber(0,1,.123456),.1235);
  for(const text of ['translate(0 0) rotate(0) scale(-1)','matrix(1 0 0 1 0 0)','translate(NaN 0) rotate(0) scale(1)'])assert.throws(()=>parseSvgTransform(text));
});
test('both people keep their own actual shaft/palms through lead swaps and only the original camera inspects tip contact',()=>{
  const f=projectedContactFixture(),before=hash(f);
  for(const s of [...f.board.shots].reverse()){
    const rows=inspectEmittedSpearActions(s,f.board,f.narration,supplied(f,s));assert.equal(rows.length,2);
    for(const row of rows){assert.equal(row.gripHands.length,2);assert.ok(row.maxGripErrorPx<=1);assert.equal(row.motionVerified,false);assert.equal(row.contactVerified,false);assert.equal(row.productionApproval,false);assert.equal(row.continuousGeometryVerified,false);}
    const thrust=rows.find(r=>r.actorId==='karo-person')!;assert.equal(thrust.contactCameraInspected,s.startMs===1800);assert.equal(thrust.inheritedContact,s.startMs>1800);
    if(thrust.contact)assert.ok(thrust.contact.errorPx<=1);
  }assert.equal(hash(f),before);
});
test('foreign namespace, plan/profile/report or mismatched actual JS cannot masquerade as emitted geometry',()=>{
  const f=projectedContactFixture(),s=f.board.shots[0]!,all=supplied(f,s),owner=sourceActor(s,'karo-person'),original=all.get(owner.character.id)!,profile=actorProfile(owner.character),key=`prop-${owner.performance.sourceSpear!.props[0]!.id}`;
  const read=(compiled:typeof original,prefix='actor-karo-person-')=>emittedTransformTrack(owner.performance,profile.profileHash,prefix,[key,'hand-left','hand-right'],compiled);
  assert.ok(read(original));assert.throws(()=>read(original,''),/emitted JS channel/);
  for(const mutate of [(x:typeof original)=>{x.report.planHash='foreign';},(x:typeof original)=>{x.report.profileHash='foreign';},(x:typeof original)=>{x.js=x.js.split('\n').map(line=>line.includes('actor-karo-person-hand-left')?line.replace('"attr":{"transform":','"attr":{"foreign":'):line).join('\n');},(x:typeof original)=>{x.frames[0]!.transforms[key]='translate(1 2) rotate(0) scale(1)';}]){
    const next=structuredClone(original);mutate(next);assert.throws(()=>read(next));
  }
  assert.throws(()=>read(original).at(key,-.1),/clamp/);
});
test('independent target displacement fails instead of snapping the drawn target to the tip',()=>{
  const f=projectedContactFixture();for(const s of f.board.shots)s.cinematic!.artDirection!.models[0]!.contactFrame!.anchors.center={x:.7,y:.5};
  const s=f.board.shots[2]!;assert.throws(()=>inspectEmittedSpearActions(s,f.board,f.narration,supplied(f,s)),/target|aim/);
});
