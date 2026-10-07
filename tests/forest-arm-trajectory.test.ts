// NOT RUN. These callbacks/fixtures are reserved for the delegated runtime model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {articulatedGestureWindow,articulatedPoseFromDirections,sampleArticulatedArm} from '../packages/animation/arm-trajectory.js';
import {samplePerformance,solveChain} from '../packages/animation/compiler.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(a:number,b:number,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} vs ${b}`);
const window={startMs:100,reachMs:700,recoverMs:1500,endMs:1900};
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};

test('fixed forward lengths and grip endpoints survive shoulder crossing and signed elbow branch changes at random-access clocks',()=>{
  const start={x:10,y:20},rest={shoulderDeg:170,elbowDeg:55},active={shoulderDeg:-170,elbowDeg:-55};
  const sample=(time:number)=>sampleArticulatedArm(start,60,45,rest,active,window,time);
  const before=JSON.stringify({start,rest,active,window}),reference=sample(1250);
  for(const at of [100,103,220,399,400,401,550,700,1250,1500,1700,1899,1900,1250,400,103]){
    const chain=sample(at);near(distance(start,chain.joint),60);near(distance(chain.joint,chain.end),45);
    near(chain.error,0);assert.equal(chain.reachable,true);
  }
  const crossing=sample(400);near(crossing.lower-crossing.upper,0);near(distance(start,crossing.end),105);
  near(sample(700).upper+90,190);assert.deepEqual(sample(1250),reference);assert.equal(JSON.stringify({start,rest,active,window}),before);
  assert.deepEqual(sample(99),sample(1901));
});

test('quintic entry and recovery are position/velocity/acceleration continuous for fixed keyposes without a separate 80ms transit',()=>{
  const sample=(at:number)=>sampleArticulatedArm({x:0,y:0},60,45,{shoulderDeg:90,elbowDeg:-25},{shoulderDeg:20,elbowDeg:-70},window,at).end;
  const h=.05;
  for(const at of [window.startMs,window.reachMs,window.recoverMs,window.endMs]){
    const before=sample(at-h),center=sample(at),after=sample(at+h);
    assert.ok(distance(before,after)<.001);
    for(const axis of ['x','y'] as const){near((after[axis]-before[axis])/(2*h),0,.00001);near((after[axis]-2*center[axis]+before[axis])/(h*h),0,.0001);}
  }
  const long=articulatedGestureWindow({startMs:100,endMs:3000});assert.equal(long.reachMs,700);assert.equal(long.recoverMs,2600);
  const explicit=articulatedGestureWindow({startMs:100,endMs:1300,contactMs:450,releaseMs:900});assert.deepEqual(explicit,{startMs:100,reachMs:450,recoverMs:900,endMs:1300});
});

test('directions retain signed flexion while degenerate windows and nonfinite/collapsed pose inputs are rejected',()=>{
  const pose=articulatedPoseFromDirections(90,30);near(pose.shoulderDeg,90);near(pose.elbowDeg,-60);
  near(articulatedPoseFromDirections(179,-171).elbowDeg,10);
  assert.throws(()=>articulatedGestureWindow({startMs:200,endMs:200}),/invalid trajectory window/);
  assert.throws(()=>articulatedGestureWindow({startMs:100,endMs:500,contactMs:400,releaseMs:300}),/invalid trajectory window/);
  assert.throws(()=>articulatedGestureWindow({startMs:100,endMs:500,releaseMs:500}),/invalid trajectory window/);
  assert.throws(()=>sampleArticulatedArm({x:0,y:0},0,45,{shoulderDeg:90,elbowDeg:0},{shoulderDeg:20,elbowDeg:-70},window,500),/invalid fixed bone/);
  assert.throws(()=>articulatedPoseFromDirections(NaN,0),/nonfinite/);
  assert.throws(()=>articulatedPoseFromDirections(0,180),/candidate pose range/);
  assert.throws(()=>sampleArticulatedArm({x:1e12,y:0},60,45,{shoulderDeg:90,elbowDeg:0},{shoulderDeg:20,elbowDeg:-70},window,500),/authoring precision range/);
});

test('current source-body pointing keeps an authored reachable target through its pose hold and separate cuff/palm geometry',()=>{
  for(const actor of ['lila','karo'] as const)for(const hand of ['left','right'] as const){
    const {plan,profile}=bodyCalibrationPlan(actor,'point','happy',hand),metrics=rigMetrics(profile),gesture=plan.gestures[0]!;
    assert.equal(plan.compilerVersion,ANIMATION_VERSION);const clock=articulatedGestureWindow(gesture);
    for(const at of [clock.reachMs,clock.reachMs+100,clock.recoverMs]){
      const frame=samplePerformance(plan,profile,at,silence);assert.ok(distance(frame.hands[hand],gesture.target!)<.001);
      assert.ok(frame.wrists?.[hand]);near(distance(frame.wrists![hand],frame.hands[hand]),metrics.handAttachment![hand].length*plan.scale);
      near(frame.armGeometry![hand]!.upperRatio,1);near(frame.armGeometry![hand]!.lowerRatio,1);
    }
    assert.equal(JSON.stringify(plan),JSON.stringify(bodyCalibrationPlan(actor,'point','happy',hand).plan));
  }
});

test('current source reactions scale with their arm reach and explicit unreachable authored targets require a new keypose',()=>{
  const {plan,profile}=bodyCalibrationPlan('karo','rest','happy');
  plan.gestures=[{id:'react-right',action:'react',hand:'right',startMs:100,endMs:2000}];
  const clock=articulatedGestureWindow(plan.gestures[0]!);
  for(const scale of [.5,1,2]){
    const frame=samplePerformance({...plan,scale},profile,clock.reachMs,silence);
    assert.ok(frame.armGeometry!.right!.flexionDeg<110);assert.ok(Object.values(frame.hands.right).every(Number.isFinite));
  }
  assert.throws(()=>samplePerformance({...plan,gestures:[{...plan.gestures[0]!,target:{x:10000,y:10000}}]},profile,500,silence),/cannot reach its authored grip/);
});

test('legacy source pointing remains on its former IK/goal/pole path and contact poses retain their exact locked grip',()=>{
  const {plan,profile}=bodyCalibrationPlan('karo','point','happy','right');
  const legacy:PerformancePlan={...plan,compilerVersion:CONTINUOUS_ANIMATION_VERSION},frame=samplePerformance(legacy,profile,1771,silence),metrics=rigMetrics(profile);
  const transform=frame.transforms['arm-right-upper']!,values=transform.match(/-?\d+(?:\.\d+)?/g)!.map(Number),shoulder={x:values[0]!,y:values[1]!};
  const expected=solveChain(shoulder,plan.gestures[0]!.target!,metrics.arms!.right.upper*plan.scale,(metrics.arms!.right.lower+metrics.handAttachment!.right.length)*plan.scale,-1);
  assert.ok(distance(frame.hands.right,expected.end)<.001);
  const contact={...plan,gestures:[{id:'touch',action:'operate' as const,hand:'right' as const,startMs:300,endMs:3600,contactMs:900,target:plan.gestures[0]!.target!,elbowPole:'rest' as const}]};
  for(const at of [900,1100,1700])assert.ok(distance(samplePerformance(contact,profile,at,silence).hands.right,contact.gestures[0]!.target)<.001);
});
