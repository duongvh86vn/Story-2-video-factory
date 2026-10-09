// DECLARED / NOT RUN. Only the human's tester may invoke these factories,
// schemas, physical geometry, compiler channels and relation rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {originalSpearFixture as bindingFixture} from './helpers/original-spear-fixture.js';
import {hash} from '../packages/core/utils.js';
import {SourceSpearBindingSchema} from '../packages/director/source-spear-binding-schemas.js';
import {sourceSpearBinding,validateSourceSpearBindings} from '../packages/director/source-spear-bindings.js';
import {sourcePropBindingIdentity} from '../packages/director/source-prop-identity.js';
import {validateSourceSpearProductionBinding} from '../packages/director/props.js';
import {compiledModelFrames,compiledRigidProp,mergeModelMotionFrames,validateModelMotionFrames,type CompiledModelSource,type CompiledPropFrame} from '../packages/director/prop-motion.js';
import {modelRelationRadius} from '../library/shots/cinematic-models.js';

function rigidFixture():CompiledModelSource{
  const frame=(timeMs:number,x:number,raw:number,emitted:number):CompiledPropFrame=>({timeMs,props:{shaft:{point:{x,y:30},attached:true,angle:raw,tip:{x:x-100,y:30}}},transforms:{'prop-shaft':`translate(${Number(x.toFixed(4))} 30) rotate(${emitted}) scale(0.8)`}});
  return {partId:'actual-spear',ownerId:'karo-person',propId:'shaft',rigid:{transformKey:'prop-shaft',scale:.8},frames:[frame(0,100.123456,170,170),frame(100,200.123456,-150,210)]};
}

test('rigid entity reads the rounded emitted center and unwrapped angle, including fractional union times',()=>{
  const s=rigidFixture(),before=hash(s),base=[{timeMs:0,props:{}},{timeMs:25.25,props:{}},{timeMs:100,props:{}}],frames=compiledModelFrames(base,[s]);
  assert.equal(frames[0]!.centers[s.partId]!.x,100.1235);assert.equal(frames[1]!.rotations![s.partId],180.1);assert.equal(frames[2]!.rotations![s.partId],210);
  validateModelMotionFrames(frames,[s.partId],100);assert.equal(hash(s),before);
});
test('a missing, mismatched, rescaled or detached rigid glyph cannot borrow raw physics as a drawn transform',()=>{
  for(const mutate of [(s:CompiledModelSource)=>{delete s.frames[0]!.transforms;},(s:CompiledModelSource)=>{s.frames[0]!.transforms!['prop-shaft']='translate(101 30) rotate(170) scale(0.8)';},(s:CompiledModelSource)=>{s.rigid!.scale=1;},(s:CompiledModelSource)=>{s.frames[0]!.props.shaft!.attached=false;},(s:CompiledModelSource)=>{s.frames[0]!.props.shaft!.angle=NaN;},(s:CompiledModelSource)=>{s.frames[0]!.transforms=Object.create(s.frames[0]!.transforms!); }]){
    const s=rigidFixture();mutate(s);assert.throws(()=>compiledRigidProp(s.frames[0]!,s));
  }
});
test('mixed canonical and rigid channels preserve entity keys, unwrapped angle and full clock without inferred rotation',()=>{
  const s=rigidFixture(),f=compiledModelFrames(s.frames,[s]),merged=mergeModelMotionFrames(100,[{partIds:[s.partId],frames:f},{partIds:['basket'],frames:[{timeMs:0,centers:{basket:{x:400,y:30}}},{timeMs:50,centers:{basket:{x:410,y:30}}},{timeMs:100,centers:{basket:{x:420,y:30}}}]}]);
  assert.equal(merged[1]!.rotations![s.partId],190);assert.equal(Object.hasOwn(merged[1]!.rotations!,'basket'),false);
  const broken=structuredClone(merged);delete broken[1]!.rotations;assert.throws(()=>validateModelMotionFrames(broken,[s.partId,'basket'],100),/rotation/);
});
test('relation ray uses local rotated shaft dimensions without applying owner scale twice',()=>{
  assert.equal(modelRelationRadius(200,14,1,0,0),106);assert.ok(Math.abs(modelRelationRadius(200,14,1,0,90)-7.42)<1e-8);
  assert.ok(Math.abs(modelRelationRadius(200,14,0,1,90)-106)<1e-8);assert.throws(()=>modelRelationRadius(200,14,1,0,NaN));
});
test('actual two-person spear entity/model/source registration survives complete primary and supporting camera swaps',()=>{
  const f=bindingFixture(),before=hash(f);
  for(const shot of f.board.shots){validateSourceSpearBindings(shot,f.board,f.narration);assert.equal(sourceSpearBinding(shot,shot.cinematic!.propBindings[1]!)!.owner.id,'karo-person');}
  assert.equal(hash(f),before);
});
test('full binding rejects sibling art, dimensions, foreign owner, orphan registration, changed source and narration evidence',()=>{
  const mutations:Array<(f:ReturnType<typeof bindingFixture>)=>void>=[
    f=>{f.board.shots[1]!.visualization!.parts[1]!.width+=.01;},
    f=>{f.board.shots[1]!.cinematic!.sourceSpearBindings![1]!.ownerId='foreign';},
    f=>{f.board.shots[1]!.cinematic!.sourceSpearBindings!.push({...f.board.shots[1]!.cinematic!.sourceSpearBindings![1]!,id:'orphan',partId:'missing'});},
    f=>{f.board.shots[1]!.cinematic!.artDirection!.models.push({partId:'karo-spear',sourceRefs:f.board.shots[1]!.visualization!.parts[1]!.sourceRefs,svg:'<circle r="20"/>'});},
    f=>{f.board.shots[1]!.cinematic!.performance.sourceSpear!.props[0]!.length+=1;},
    f=>{f.narration.segments[0]!.text='Another story entirely.';},
  ];
  for(const mutate of mutations){const f=bindingFixture();mutate(f);assert.throws(()=>validateSourceSpearBindings(f.board.shots[0]!,f.board,f.narration));}
});
test('tool cache identity changes with the actual sibling model, phase, owner and cue; no approval is created',()=>{
  const f=bindingFixture(),shot=f.board.shots[0]!,first=sourcePropBindingIdentity(shot,f.board,f.narration)!;
  f.board.shots[2]!.visualization!.parts[0]!.height+=.01;
  assert.notEqual(first.fingerprint,sourcePropBindingIdentity(shot,f.board,f.narration)!.fingerprint);assert.equal(first.approved,false);
});
test('model binding candidates still block production on both camera roles and never synthesize acceptance',()=>{
  const f=bindingFixture();for(const shot of f.board.shots){assert.throws(()=>validateSourceSpearProductionBinding(shot),/needs-source-prop-binding/);}
  const declared=f.board.shots[0]!.cinematic!.sourceSpearBindings![0]!;
  assert.equal(SourceSpearBindingSchema.safeParse({...declared,approved:true}).success,false);
});
