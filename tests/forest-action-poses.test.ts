import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyCalibrationPlan,bodyWorkbench} from '../packages/topics/body-workbench.js';
import {samplePerformance,validatePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {ANIMATION_VERSION} from '../packages/animation/schemas.js';
import {rigMetrics,performanceSvg} from '../packages/animation/rig.js';
import {solveChain} from '../packages/animation/compiler.js';
import {sourceArmShape,sourceSpearPairShape} from '../packages/animation/source-arm.js';
import {prehistoricReadiness} from '../packages/topics/prehistoric-life.js';
const silent={method:'segment-draft' as const,windowMs:20,intervals:[]};
const values=(s:string)=>s.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
const length=(a:{x:number;y:number},b:{x:number;y:number},depth=0)=>Math.hypot(a.x-b.x,a.y-b.y,depth);

test('source arm guard rejects a reachable but pinched spear elbow without shortening bones',()=>{
  const shoulder={x:0,y:0},target={x:18,y:8},chain=solveChain(shoulder,target,60,55,-1);
  assert.ok(chain.reachable);
  assert.throws(()=>sourceArmShape('spear-front',shoulder,chain.joint,chain.end,60,55),/needs-arm-pose.*folds/);
  assert.ok(Math.abs(length(shoulder,chain.joint)-60)<.0001);
  assert.ok(Math.abs(length(chain.joint,chain.end)-55)<.0001);
});
test('source spear pair rejects two individually reachable forward hooks, while permitting a rear elbow above its shoulder',()=>{
  const front={shoulder:{x:40,y:0},elbow:{x:75,y:30},wrist:{x:110,y:40},upper:55,lower:50};
  const rear={shoulder:{x:0,y:0},elbow:{x:40,y:35},wrist:{x:65,y:40},upper:60,lower:55};
  assert.throws(()=>sourceSpearPairShape(front,rear,0),/grips crowd/);
  assert.throws(()=>sourceSpearPairShape(front,{...rear,wrist:{x:20,y:40}},0),/drive elbow curls forward/);
  assert.doesNotThrow(()=>sourceSpearPairShape(front,{...rear,elbow:{x:-25,y:-10},wrist:{x:20,y:40}},0));
});

for(const actor of ['lila','karo'] as const){
  test(`${actor}: a future run or seat clip cannot alter the current idle arms`,()=>{
    const {plan:rest,profile}=bodyCalibrationPlan(actor,'rest','happy');
    const baseline=samplePerformance(rest,profile,0,silent);
    for(const action of ['run','run-left','sit-right','sit-left'] as const){
      const {plan}=bodyCalibrationPlan(actor,action,'happy');
      const frame=samplePerformance(plan,profile,0,silent);
      assert.deepEqual(frame.hands,baseline.hands,action+' changed an idle wrist');
      for(const side of ['left','right'] as const){
        assert.equal(frame.paths!['ink-arm-'+side],baseline.paths!['ink-arm-'+side]);
        assert.equal(frame.armGeometry![side]!.role,'rest');
      }
    }
  });
  for(const hand of ['left','right'] as const)test(`${actor}/${hand}: chin contact uses one hand definition in the foreground`,()=>{
    const {plan,profile}=bodyCalibrationPlan(actor,'think','happy',hand),frame=samplePerformance(plan,profile,1600,silent);
    const svg=performanceSvg(profile);
    assert.equal(frame.face[`hand-${hand}-front-slot`]!.opacity,1);
    assert.equal(frame.face[`hand-${hand}-back-slot`]!.opacity,0);
    assert.equal(frame.face[`ink-arm-${hand}-front-slot`]!.opacity,1);
    assert.equal(frame.face[`ink-arm-${hand}-back-slot`]!.opacity,0);
    assert.equal((svg.match(new RegExp(`id="hand-${hand}"`,'g'))??[]).length,1);
    assert.equal((svg.match(new RegExp(`id="ink-arm-${hand}"`,'g'))??[]).length,1);
    assert.ok(svg.indexOf(`id="hand-${hand}-front-slot"`)>svg.indexOf('id="head"'));
    assert.ok(svg.indexOf(`id="ink-arm-${hand}-front-slot"`)>svg.indexOf('id="head"'));
    const rest=samplePerformance(plan,profile,3900,silent);
    assert.equal(rest.face[`hand-${hand}-front-slot`]!.opacity,0);
    assert.equal(rest.face[`hand-${hand}-back-slot`]!.opacity,1);
    assert.equal(rest.face[`ink-arm-${hand}-front-slot`]!.opacity,0);
    assert.equal(rest.face[`ink-arm-${hand}-back-slot`]!.opacity,1);
  });
}

for(const actor of ['lila','karo'] as const)for(const action of ['run','run-left'] as const){
  test(`${actor}/${action}: running has genuine flight, fixed support contacts, grounded settling and reproducible seeks`,()=>{
    const {plan,profile}=bodyCalibrationPlan(actor,action,'happy'),m=rigMetrics(profile);
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
        const u=values(f.transforms['arm-'+side+'-upper']!),l=values(f.transforms['arm-'+side+'-lower']!);
        const shoulder={x:u[0]!,y:u[1]!},elbow={x:l[0]!,y:l[1]!},depth=f.armProjection?.[side]?.elbowDepth??0,bones=m.arms![side];
        assert.ok(elbow.y>shoulder.y,'a running recovery elbow must not snap upward beside the head');
        assert.ok(Math.abs(length(shoulder,elbow,depth)-bones.upper)<.002,'running upper arm changed length');
        assert.ok(Math.abs(length(elbow,f.wrists![side],depth)-bones.lower)<.002,'running forearm changed length');
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
  for(const action of ['spear-thrust','spear-thrust-left'] as const)test(`${actor}/${action}: spear grips stay on one rotated shaft, fixed XYZ arms reach it and only contact reaches the aim`,()=>{
    const {plan,profile}=bodyCalibrationPlan(actor,action,'happy'),track=plan.spears![0]!,prop=plan.props[0]!,m=rigMetrics(profile);
    assert.ok(Math.abs(prop.length!/m.height-1.2)<1e-8,'calibration spear must read as a full-length tool');
    assert.ok(prop.gripOffset!.x+track.secondaryOffset> -prop.length!/2+5,'rear grip must retain wooden shaft behind it');
    const hit=samplePerformance(plan,profile,track.contactMs!,silent),ready=samplePerformance(plan,profile,track.readyMs!,silent);
    assert.ok(length(hit.props[prop.id]!.tip!,track.aim)<.0001);
    assert.ok(length(ready.props[prop.id]!.tip!,track.aim)>5);
    for(let t=0;t<=plan.durationMs;t+=20){
      const f=samplePerformance(plan,profile,t,silent),tool=f.props[prop.id]!,a=tool.angle!*Math.PI/180;
      assert.equal(tool.attached,true);assert.ok(f.contactError<.001);
      const pair=f.spearGeometry![track.id]!;
      assert.ok(pair.gripSpan>=pair.minimumSpan-.01,'both arm roles are crowded despite reachable wrists');
      assert.ok(pair.rearElbowAlong<=.01,'drive elbow must open behind its shoulder on the shaft axis');
      const primary={x:tool.point.x+(prop.gripOffset?.x??0)*Math.cos(a),y:tool.point.y+(prop.gripOffset?.x??0)*Math.sin(a)};
      const secondary={x:primary.x+track.secondaryOffset*Math.cos(a),y:primary.y+track.secondaryOffset*Math.sin(a)};
      assert.ok(length(f.hands[track.hand],primary)<.001);assert.ok(length(f.hands[track.hand==='left'?'right':'left'],secondary)<.001);
      for(const side of ['left','right'] as const){
        const u=values(f.transforms['arm-'+side+'-upper']!),l=values(f.transforms['arm-'+side+'-lower']!),depth=f.armProjection![side]!.elbowDepth;
        const shoulder={x:u[0]!,y:u[1]!},elbow={x:l[0]!,y:l[1]!},bones=m.arms![side];
        assert.ok(Math.abs(bones.upper/(bones.upper+bones.lower)-.52)<1e-8,'an unmeasured source elbow must not recreate the old short upper arm');
        // No universal below-shoulder rule: the user reference legitimately
        // raises its drive elbow. Pair silhouette and exact bones are checked.
        assert.ok(Math.abs(length(shoulder,elbow,depth)-bones.upper)<.002,'physical upper arm changed');
        assert.ok(Math.abs(length(elbow,f.wrists![side],depth)-bones.lower)<.002,'physical forearm changed');
      }
    }
    const expected=samplePerformance(plan,profile,1500,silent);samplePerformance(plan,profile,3900,silent);
    assert.deepEqual(samplePerformance(plan,profile,1500,silent),expected);
  });
  test(`${actor}: aimed emotions keep planted soles and fixed leg lengths`,()=>{
    for(const mood of ['neutral','happy','angry','thinking'] as const){
      const {plan,profile}=bodyCalibrationPlan(actor,'spear-thrust',mood),m=rigMetrics(profile);
      for(const time of [0,1200,1800,3000,4000]){
        const frame=samplePerformance(plan,profile,time,silent);
        assert.ok(frame.stance.left&&frame.stance.right);
        for(const side of ['left','right'] as const){
          const u=values(frame.transforms['leg-'+side+'-upper']!),l=values(frame.transforms['leg-'+side+'-lower']!),depth=frame.legProjection![side].kneeDepth,bones=m.legs![side];
          const hip={x:u[0]!,y:u[1]!},knee={x:l[0]!,y:l[1]!},ankle={x:frame.feet[side].x,y:frame.feet[side].y-m.footSoleOffset![side]*profile.appearance.bodyScale};
          assert.ok(Math.abs(length(hip,knee,depth)-bones.upper)<.002);
          assert.ok(Math.abs(length(knee,ankle,depth)-bones.lower)<.002);
        }
      }
    }
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
  const nonSpear=structuredClone(plan);nonSpear.props[0]!.kind='generic';
  assert.throws(()=>validatePerformance(nonSpear,profile),/extended 600-unit shaft/);
});
test('workbench exposes distinct run/jump/hunting/tool actions without implying production acceptance',()=>{
  for(const action of ['run','run-left','jump','hunt-stalk','spear-hold','spear-thrust','hunt-aim','hunt-chase'] as const){
    const html=bodyWorkbench(action,0,'happy');assert.ok(html.includes('value="'+action+'" selected'));
    assert.ok(html.includes('step="1"'),'pose clocks such as 665/1175 must be editable');
  }
  assert.equal(prehistoricReadiness.productionReady,false);
});
