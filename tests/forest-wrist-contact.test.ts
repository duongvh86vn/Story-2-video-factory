import test from 'node:test';
import assert from 'node:assert/strict';
import {solveWristContact,wristPalm} from '../packages/animation/wrist-contact.js';
import {samplePhysicalPerformance,solveChain} from '../packages/animation/compiler.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {articulatedGestureWindow} from '../packages/animation/arm-trajectory.js';
import {collectViewSourceGestures,projectViewSourceGestures,sourceViewGestureAt,type ViewSourceGesture} from '../packages/animation/view-source-gesture.js';

const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(a:number,b:number,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
const numbers=(s:string)=>s.match(/-?\d+(?:\.\d+)?/g)!.map(Number);

test('authored wrist hinge keeps three physical lengths and the original palm target on both elbow branches',()=>{
  const shoulder={x:10,y:20},palm={x:25,y:40};
  for(const pole of [-1,1])for(const curl of [0,30,60,70]){
    const arm=solveWristContact(shoulder,palm,40,35,12,curl,pole,solveChain);
    near(distance(shoulder,arm.joint),40);near(distance(arm.joint,arm.wrist!),35);near(distance(arm.wrist!,arm.end),12);
    near(distance(arm.end,palm),0);near(distance(wristPalm(arm.wrist!,arm.lower+90,12,arm.wristCurlDeg!),palm),0);
    near(arm.wristCurlDeg!,pole*curl);
    if(curl===0){const rigid=solveChain(shoulder,palm,40,47,pole);near(distance(arm.joint,rigid.joint),0);near(arm.lower,rigid.lower);}
  }
  for(const curl of [-1,70.01,NaN,Infinity])assert.throws(()=>solveWristContact(shoulder,palm,40,35,12,curl,1,solveChain),/invalid authored wrist/);
  for(const pole of [0,2,NaN])assert.throws(()=>solveWristContact(shoulder,palm,40,35,12,60,pole,solveChain),/invalid authored wrist/);
});

test('source chin wrist keeps cuff artwork joined and fixed bones through entry, hold, recovery and random seeks',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const)for(const hand of ['left','right'] as const){
    const {plan,profile}=bodyCalibrationPlan(actor,'think','happy',hand,view),metrics=rigMetrics(profile),window=articulatedGestureWindow(plan.gestures[0]!);
    assert.equal(plan.gestures[0]!.wristCurlDeg,70);
    for(const time of [0,300,350,600,window.reachMs,1771,window.recoverMs,3400,3599,3600,3900,1771,350]){
      const frame=samplePhysicalPerformance(plan,profile,time),upper=numbers(frame.transforms[`arm-${hand}-upper`]!),lower=numbers(frame.transforms[`arm-${hand}-lower`]!),drawn=numbers(frame.transforms[`hand-${hand}`]!);
      const shoulder={x:upper[0]!,y:upper[1]!},elbow={x:lower[0]!,y:lower[1]!},wrist=frame.wrists![hand],palm=frame.hands[hand],attachment=metrics.handAttachment![hand];
      near(distance(shoulder,elbow),metrics.arms![hand].upper*plan.scale,.003);
      near(distance(elbow,wrist),metrics.arms![hand].lower*plan.scale,.003);
      near(distance(wrist,palm),attachment.length*plan.scale,.003);
      const radians=drawn[2]!*Math.PI/180,offset=attachment.wristOffset,scale=drawn[3]!;
      const sourceCuff={x:drawn[0]!+scale*(offset.x*Math.cos(radians)-offset.y*Math.sin(radians)),y:drawn[1]!+scale*(offset.x*Math.sin(radians)+offset.y*Math.cos(radians))};
      near(distance(wrist,sourceCuff),0,.003);
      assert.ok(frame.armGeometry![hand]!.flexionDeg<=145.01);
      assert.deepEqual(frame,samplePhysicalPerformance(plan,profile,time));
    }
  }
});

test('no inferred wrist fallback or relaxed elbow guard is applied to an old chin command',()=>{
  const {plan,profile}=bodyCalibrationPlan('karo','think','happy','left','three-quarter-left');delete plan.gestures[0]!.wristCurlDeg;
  assert.throws(()=>samplePhysicalPerformance(plan,profile,1771),/chin elbow folds.*145deg/);
  const invalid=bodyCalibrationPlan('lila','point','happy');invalid.plan.gestures[0]!.wristCurlDeg=60;
  assert.throws(()=>samplePhysicalPerformance(invalid.plan,invalid.profile,1771),/needs-wrist-pose/);
});

test('original source wrist selection survives cuts and a sibling cannot change it',()=>{
  const source:ViewSourceGesture={id:'chin',action:'think',hand:'left',wristCurlDeg:60,startMs:100,reachMs:400,recoverMs:1000,endMs:1300};
  const cuts=[0,300,900,1500],entries=cuts.slice(0,-1).map((startMs,i)=>({startMs,endMs:cuts[i+1]!,gestures:projectViewSourceGestures([source],startMs,cuts[i+1]!,0,1500)}));
  assert.equal(sourceViewGestureAt([source],500,'left')!.wristCurlDeg,60);
  assert.deepEqual(collectViewSourceGestures(entries,0,1500),[{...source,target:undefined,elbowPole:undefined}]);
  entries[1]!.gestures[0]!.wristCurlDeg=65;
  assert.throws(()=>collectViewSourceGestures(entries,0,1500),/source command changed/);
});
