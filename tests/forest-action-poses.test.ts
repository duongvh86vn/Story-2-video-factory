import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyCalibrationPlan,bodyWorkbench} from '../packages/topics/body-workbench.js';
import {samplePerformance,validatePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {ANIMATION_VERSION} from '../packages/animation/schemas.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {prehistoricReadiness} from '../packages/topics/prehistoric-life.js';
const silent={method:'segment-draft' as const,windowMs:20,intervals:[]};
const values=(s:string)=>s.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
const length=(a:{x:number;y:number},b:{x:number;y:number},depth=0)=>Math.hypot(a.x-b.x,a.y-b.y,depth);

for(const actor of ['lila','karo'] as const)for(const action of ['run','run-left'] as const){
  test(`${actor}/${action}: running has genuine flight, fixed support contacts, grounded settling and reproducible seeks`,()=>{
    const {plan,profile}=bodyCalibrationPlan(actor,action,'happy');
    let flight=false,support=false,prior=samplePerformance(plan,profile,0,silent);
    for(let t=10;t<=plan.durationMs;t+=10){
      const f=samplePerformance(plan,profile,t,silent);
      if(f.airborne?.phase==='flight'){
        flight=true;assert.ok(!f.stance.left&&!f.stance.right);assert.ok(f.feet.left.y<plan.stage.groundY&&f.feet.right.y<plan.stage.groundY);
      }
      for(const side of ['left','right'] as const){
        if(f.stance[side]){support=true;assert.equal(f.feet[side].y,plan.stage.groundY);}
        if(prior.stance[side]&&f.stance[side])assert.deepEqual(f.feet[side],prior.feet[side],'support sole slid');
        assert.ok(f.feet[side].y<=plan.stage.groundY);
      }
      assert.ok(Object.values(f.transforms).every(s=>!s.includes('NaN')));
      prior=f;
    }
    assert.ok(flight&&support);assert.ok(prior.stance.left&&prior.stance.right);
    const expected=samplePerformance(plan,profile,1115,silent);
    for(const t of [4000,665,0,2100,750,200])samplePerformance(plan,profile,t,silent);
    assert.deepEqual(samplePerformance(plan,profile,1115,silent),expected);
    const baked=compilePerformance(plan,profile,silent);
    assert.ok(baked.report.maxInterpolationGapPx<=.2);assert.ok(baked.report.selectedClips.includes('run'));
    assert.ok(!baked.report.selectedClips.includes('walk'));
  });
}
for(const actor of ['lila','karo'] as const){
  test(`${actor}: jump compresses, flies with tuck and lands without floor penetration`,()=>{
    const {plan,profile}=bodyCalibrationPlan(actor,'jump','happy'),clip=plan.jumps![0]!;
    const rest=samplePerformance(plan,profile,0,silent),apex=samplePerformance(plan,profile,(clip.takeoffMs+clip.landingMs)/2,silent);
    assert.ok(!apex.stance.left&&!apex.stance.right);
    const withoutTuck=samplePerformance({...plan,jumps:[{...clip,tuck:0}]},profile,(clip.takeoffMs+clip.landingMs)/2,silent);
    assert.ok(apex.feet.left.y<withoutTuck.feet.left.y,'tuck must change leg action, not translate the whole actor');
    assert.equal(apex.transforms.pelvis,withoutTuck.transforms.pelvis);
    for(const at of [clip.startMs,clip.landingMs,clip.endMs]){
      const f=samplePerformance(plan,profile,at,silent);assert.ok(f.stance.left&&f.stance.right);
      for(const side of ['left','right'] as const)assert.equal(f.feet[side].y,rest.feet[side].y);
    }
  });
  test(`${actor}: spear grips stay on one rotated shaft, fixed XYZ arms reach it and only contact reaches the aim`,()=>{
    const {plan,profile}=bodyCalibrationPlan(actor,'spear-thrust','happy'),track=plan.spears![0]!,prop=plan.props[0]!,m=rigMetrics(profile);
    const hit=samplePerformance(plan,profile,track.contactMs!,silent),ready=samplePerformance(plan,profile,track.readyMs!,silent);
    assert.ok(length(hit.props[prop.id]!.tip!,track.aim)<.0001);
    assert.ok(length(ready.props[prop.id]!.tip!,track.aim)>5);
    for(let t=0;t<=plan.durationMs;t+=20){
      const f=samplePerformance(plan,profile,t,silent),tool=f.props[prop.id]!,a=tool.angle!*Math.PI/180;
      assert.equal(tool.attached,true);assert.ok(f.contactError<.001);
      const primary={x:tool.point.x+(prop.gripOffset?.x??0)*Math.cos(a),y:tool.point.y+(prop.gripOffset?.x??0)*Math.sin(a)};
      const secondary={x:primary.x+track.secondaryOffset*Math.cos(a),y:primary.y+track.secondaryOffset*Math.sin(a)};
      assert.ok(length(f.hands.right,primary)<.001);assert.ok(length(f.hands.left,secondary)<.001);
      for(const side of ['left','right'] as const){
        const u=values(f.transforms['arm-'+side+'-upper']!),l=values(f.transforms['arm-'+side+'-lower']!),depth=f.armProjection![side]!.elbowDepth;
        const shoulder={x:u[0]!,y:u[1]!},elbow={x:l[0]!,y:l[1]!},bones=m.arms![side];
        assert.ok(Math.abs(length(shoulder,elbow,depth)-bones.upper)<.002,'physical upper arm changed');
        assert.ok(Math.abs(length(elbow,f.hands[side],depth)-bones.lower)<.002,'physical forearm changed');
      }
    }
    const expected=samplePerformance(plan,profile,1500,silent);samplePerformance(plan,profile,3900,silent);
    assert.deepEqual(samplePerformance(plan,profile,1500,silent),expected);
  });
}
test('new locomotion/tool clips reject old compiler versions, premature contacts and conflicting ownership',()=>{
  const {plan:run,profile}=bodyCalibrationPlan('karo','run','happy');
  assert.throws(()=>validatePerformance({...run,compilerVersion:ANIMATION_VERSION},profile),/2.2.15/);
  const {plan}=bodyCalibrationPlan('karo','spear-thrust','happy');
  const badClock=structuredClone(plan);badClock.spears![0]!.contactMs=100;
  assert.throws(()=>validatePerformance(badClock,profile),/ordered windup/);
  const competing=structuredClone(plan);competing.gestures=[{id:'competing',action:'think',hand:'left',startMs:200,endMs:2200}];
  assert.throws(()=>validatePerformance(competing,profile),/spear-owned hand/);
  const miss=structuredClone(plan);miss.spears![0]!.aim.x+=80;
  assert.throws(()=>validatePerformance(miss,profile),/rig reach/);
  const missing=structuredClone(plan);delete missing.spears;
  assert.throws(()=>validatePerformance(missing,profile),/no shared grip track/);
});
test('workbench exposes distinct run/jump/hunting/tool actions without implying production acceptance',()=>{
  for(const action of ['run','run-left','jump','hunt-stalk','spear-hold','spear-thrust','hunt-aim','hunt-chase'] as const){
    const html=bodyWorkbench(action,0,'happy');assert.ok(html.includes('value="'+action+'" selected'));
    assert.ok(html.includes('step="1"'),'pose clocks such as 665/1175 must be editable');
  }
  assert.equal(prehistoricReadiness.productionReady,false);
});
