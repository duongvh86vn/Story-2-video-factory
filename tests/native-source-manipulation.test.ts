import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import type {Shot} from '../packages/core/schemas.js';
import {bodyCalibrationPlan,type BodyAction} from '../packages/topics/body-workbench.js';
import {BODY_VIEW_LOCOMOTION_SELECTION} from '../packages/animation/body-view-cloth.js';
import {BODY_VIEW_MANIPULATION_SELECTION} from '../packages/animation/native-contact-arm.js';
import {BODY_SOURCE_VERSION,MANIPULATION_SOURCE_VERSION,ManipulationSourceSchema,PerformancePlanSchema,type PerformancePlan} from '../packages/animation/schemas.js';
import {VIEW_ACTING_CLOCK_VERSION,validateViewActingClock,type ViewActingClock} from '../packages/animation/view-acting-clock.js';
import {collectViewSourceManipulation,manipulationSourcePlan,sourceManipulationTime,validateManipulationSourcePlan} from '../packages/animation/view-source-manipulation.js';
import {compilePerformance,samplePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {validatePropBindings} from '../packages/director/props.js';
import {fixedMotionFields} from '../packages/director/acting-repair.js';

const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
/** Declared fixture factory only; never invoked at module load. */
function fixture(actor:'lila'|'karo',view:'three-quarter-left'|'three-quarter-right',hand:'left'|'right',action:BodyAction){
  const f=bodyCalibrationPlan(actor,action,'happy',hand,view,'cutout','silent','native','rest','native',BODY_VIEW_LOCOMOTION_SELECTION,'rigid','unregistered',BODY_VIEW_MANIPULATION_SELECTION);
  const source={version:MANIPULATION_SOURCE_VERSION,id:'owned-contact-run',startMs:1000,endMs:5000,props:structuredClone(f.plan.props),gestures:structuredClone(f.plan.gestures)};
  const body={version:BODY_SOURCE_VERSION,id:'owned-body-run',startMs:1000,endMs:5000,walks:structuredClone(f.plan.walks),jumps:structuredClone(f.plan.jumps??[])};
  const full:PerformancePlan={...f.plan,expressions:[],gazes:[],walks:[],jumps:[],gestures:[],props:[],sourceBody:body,sourceManipulation:source};
  const clock:ViewActingClock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:full.leadCharacterId,startMs:1000,endMs:5000,runStartMs:1000,runEndMs:5000,sourceIdentityHash:hash({body,source}),gazes:[],gestures:[],bodyMotion:body,manipulationMotion:source};
  return {...f,plan:full,clock,source,body};
}
function slice(f:ReturnType<typeof fixture>,from:number,to:number){
  return {plan:{...f.plan,durationMs:to-from},clock:{...f.clock,startMs:1000+from,endMs:1000+to}};
}

test('original manipulation is a separate complete schema, matches the original body and cannot be replaced by local contacts',()=>{
  const f=fixture('lila','three-quarter-right','right','pick-place'),before=hash(f);
  ManipulationSourceSchema.parse(f.source);PerformancePlanSchema.parse(f.plan);validatePerformance(f.plan,f.profile);validateViewActingClock(f.plan,f.clock);
  assert.ok(fixedMotionFields.includes('sourceManipulation'));
  const conflict={...f.plan,props:f.source.props};assert.throws(()=>validateManipulationSourcePlan(conflict),/local props\/contact/);
  assert.throws(()=>validateManipulationSourcePlan({...f.plan,sourceBody:undefined}),/complete original body clock/);
  assert.equal(ManipulationSourceSchema.safeParse({...f.source,props:[...f.source.props,...f.source.props]}).success,false);
  assert.equal(ManipulationSourceSchema.safeParse({...f.source,gestures:[...f.source.gestures,...f.source.gestures]}).success,false);
  assert.equal(hash(f),before);
});

test('every camera slice repeats the same actor-owned action/hand/prop clock with exact complete coverage',()=>{
  const f=fixture('karo','three-quarter-left','left','carry'),entries=[{startMs:1000,endMs:2400,sourceManipulation:f.source},{startMs:2400,endMs:5000,sourceManipulation:f.source}],before=hash(entries);
  assert.deepEqual(collectViewSourceManipulation(entries,1000,5000),f.source);
  assert.throws(()=>collectViewSourceManipulation([entries[0]!],1000,5000),/incomplete/);
  assert.throws(()=>collectViewSourceManipulation([entries[0]!,{startMs:2400,endMs:5000}],1000,5000),/lost/);
  assert.throws(()=>collectViewSourceManipulation([entries[0]!,{...entries[1]!,startMs:2401}],1000,5000),/coverage/);
  const foreign=structuredClone(f.source);foreign.gestures[0]!.target!.x+=1;
  assert.throws(()=>collectViewSourceManipulation([entries[0]!,{...entries[1]!,sourceManipulation:foreign}],1000,5000),/changed/);
  assert.equal(hash(entries),before);
});

test('pickup palm, cuff, prop and painter retain the original phase through approach, contact and release cuts on both hands/views',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const)for(const hand of ['left','right'] as const){
    const f=fixture(actor,view,hand,'pick-place'),before=hash(f);
    for(const [from,to] of [[0,700],[700,1600],[1600,2800],[2800,4000]]){const piece=slice(f,from!,to!);
      validateViewActingClock(piece.plan,piece.clock);
      for(const local of [to!-from!,0,(to!-from!)/2,0]){const a=samplePerformance(f.plan,f.profile,from!+local,silence,undefined,f.clock),b=samplePerformance(piece.plan,f.profile,local,silence,undefined,piece.clock);
        assert.deepEqual(b.hands,a.hands);assert.deepEqual(b.wrists,a.wrists);assert.deepEqual(b.props,a.props);assert.deepEqual(b.paths,a.paths);assert.deepEqual(b.transforms,a.transforms);
        assert.equal(b.face['hand-'+hand+'-prop-slot']?.opacity,a.face['hand-'+hand+'-prop-slot']?.opacity);
      }
    }assert.equal(hash(f),before);
  }
});

test('forward carry root and exact owned grip remain on the actual original body path across cuts',()=>{
  const f=fixture('karo','three-quarter-left','right','carry'),piece=slice(f,1700,2600),before=hash(f);
  for(const t of [900,0,200,500,100,900]){const a=samplePerformance(f.plan,f.profile,t+1700,silence,undefined,f.clock),b=samplePerformance(piece.plan,f.profile,t,silence,undefined,piece.clock);
    assert.deepEqual(b.root,a.root);assert.deepEqual(b.feet,a.feet);assert.deepEqual(b.props,a.props);assert.deepEqual(b.hands,a.hands);assert.equal(b.contactError,a.contactError);
  }
  const broken=structuredClone(f.plan);broken.sourceBody!.walks[0]!.startMs=1001;
  assert.throws(()=>validatePerformance(broken,f.profile),/after lift/);assert.equal(hash(f),before);
});

test('flight in a later camera shot uses the actual release palm before that shot and never clamps release to the cut',()=>{
  for(const actor of ['lila','karo'] as const){const f=fixture(actor,'three-quarter-right','right','drop'),piece=slice(f,2900,4000),before=hash(f);
    for(const t of [0,50,200,400,900,100,1100]){const a=samplePerformance(f.plan,f.profile,t+2900,silence,undefined,f.clock),b=samplePerformance(piece.plan,f.profile,t,silence,undefined,piece.clock);
      assert.deepEqual(b.props,a.props);assert.deepEqual(b.hands,a.hands);assert.equal(b.props['native-object']!.attached,false);
    }assert.equal(hash(f),before);
  }
});

test('source contact rejects conflicting point/local hand ownership, false actor/clock/source and unselected native motion',()=>{
  const f=fixture('lila','three-quarter-right','right','pick-place'),piece=slice(f,800,1800);
  const other={...piece.plan,gestures:[{id:'wrong-hand-owner',action:'point' as const,hand:'right' as const,startMs:0,endMs:1000,target:{x:300,y:220}}]};
  assert.throws(()=>validateViewActingClock(other,piece.clock),/another local\/source command/);
  assert.throws(()=>samplePerformance(piece.plan,{...f.profile,appearance:{...f.profile.appearance,bodyManipulation:undefined}},100,silence,undefined,piece.clock),/native selection/);
  assert.throws(()=>samplePerformance(piece.plan,f.profile,100,silence),/complete owned clock/);
  assert.throws(()=>sourceManipulationTime(piece.plan,{...piece.clock,ownerId:'foreign-person'},0),/owned shot clock/);
  assert.throws(()=>sourceManipulationTime(piece.plan,piece.clock,-1),/outside/);assert.throws(()=>sourceManipulationTime(piece.plan,piece.clock,NaN),/outside/);
  assert.throws(()=>sourceManipulationTime(piece.plan,{...piece.clock,startMs:800,endMs:1800},0),/outside/);
  const changed=structuredClone(piece.clock);changed.manipulationMotion!.props[0]!.gripOffset={x:1,y:0};
  assert.throws(()=>validateViewActingClock(piece.plan,changed),/local declaration differs/);
});

test('baking includes original ownership boundaries and generic preview props but production still requires sourced storyboard bindings',()=>{
  const f=fixture('lila','three-quarter-right','left','pick-place'),piece=slice(f,700,1800),before=hash(f);
  const compiled=compilePerformance(piece.plan,f.profile,silence,'',undefined,piece.clock);
  assert.ok(compiled.frames.some(frame=>frame.timeMs===300));assert.ok(compiled.frames.every(frame=>frame.props['native-object']));
  assert.equal((compiled.report as {sourceManipulation:{sourceHash:string}}).sourceManipulation.sourceHash,hash(f.source));
  const physical=manipulationSourcePlan(f.plan);assert.equal(physical.sourceBody,undefined);assert.equal(physical.sourceManipulation,undefined);assert.deepEqual(physical.gestures,f.source.gestures);
  const isolated={id:'source-prop-gate',cinematic:{performance:piece.plan,actorScene:{supporting:[]}}} as unknown as Shot;
  assert.throws(()=>validatePropBindings(isolated),/needs-source-prop-binding/);assert.equal(hash(f),before);
});
