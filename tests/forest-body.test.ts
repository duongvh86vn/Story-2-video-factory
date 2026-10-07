import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {topicPreviewProfile} from '../packages/topics/preview.js';
import {ANIMATION_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {referenceBodyAssets,referenceBodyMetrics} from '../packages/animation/forest-body-art.js';
import {referenceHeadAssets,readReferenceHeadAsset} from '../packages/animation/forest-head-art.js';
import {samplePerformance,validatePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {bodyCalibrationSvg} from '../packages/topics/body-workbench.js';
import {performanceScene} from '../packages/animation/scene.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {legGeometry} from '../packages/animation/body-geometry.js';
import {rigMetrics} from '../packages/animation/rig.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
function fixture(actor:'lila'|'karo'){
  const profile=topicPreviewProfile(actor);
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'body-fixture',leadCharacterId:actor,profileHash:profile.profileHash,
    kind:'stick-man',durationMs:4000,fps:30,stage:{width:640,height:480,groundY:420},root:{x:320,y:420},scale:1,
    headView:actor==='lila'?'three-quarter-right':'three-quarter-left',walks:[],gestures:[],props:[],gazes:[],expressions:[]};
  return {profile,plan};
}
test('source body keeps asymmetric shoulders and hands, with pelvis at the belt',()=>{
  for(const actor of ['lila','karo'] as const){const {profile}=fixture(actor),metrics=referenceBodyMetrics(profile),assets=referenceBodyAssets(profile.appearance);
    assert.equal(assets.length,2);for(const asset of assets)assert.equal(hash(readReferenceHeadAsset(asset)),asset.sha256);
    assert.notEqual(metrics.arms.left.upper,metrics.arms.right.upper);
    assert.notEqual(Math.abs(metrics.armRest.left.x),metrics.armRest.right.x);
    assert.ok(metrics.pelvisY < -120);
    assert.ok(metrics.torsoTop < -50 && metrics.torsoTop > -100);
  }
});
test('source legs stay grounded and absolute seek does not accumulate secondary motion',()=>{
  for(const actor of ['lila','karo'] as const){const {profile,plan}=fixture(actor);
    const before=samplePerformance(plan,profile,1600,silence);samplePerformance(plan,profile,3000,silence);
    assert.deepEqual(samplePerformance(plan,profile,1600,silence),before);
    for(const time of [0,600,1600,2770,4000]){const frame=samplePerformance(plan,profile,time,silence);
      assert.equal(frame.feet.left.y,plan.stage.groundY);assert.equal(frame.feet.right.y,plan.stage.groundY);
      assert.equal(frame.contactError,0);assert.ok(frame.stance.left && frame.stance.right);
    }
    const compiled=compilePerformance(plan,profile,silence);assert.ok(compiled.report.maxInterpolationGapPx<=.2);
    assert.equal(compiled.report.headArtwork?.fullBodyReplacement,true);
    assert.equal(compiled.report.bodyArtwork?.productionReady,false);
  }
});
test('source body cannot silently simulate missing full-body views or a seat without support',()=>{
  const {profile,plan}=fixture('lila');
  assert.throws(()=>validatePerformance({...plan,turns:[{startMs:300,endMs:900,direction:'left'}]},profile),/needs-body-view/);
  assert.throws(()=>validatePerformance({...plan,entryPosture:{pose:'seated',supportId:'seat'}},profile),/known seat support/);
});
function seatingFixture(actor:'lila'|'karo',facing:'left'|'right'){
  const {profile,plan}=fixture(actor),m=rigMetrics(profile),direction=facing==='left'?-1:1;
  plan.durationMs=6000;plan.facing=facing;plan.headView=facing==='left'?'three-quarter-left':'three-quarter-right';
  plan.supports=[{id:'source-seat',kind:'seat',facing,width:80,center:{x:plan.root.x-direction*((m.legs!.left.upper+m.legs!.right.upper)/2+m.seatContactOffset!.x),
    y:plan.root.y-(m.legs!.left.lower+m.legs!.right.lower)/2-(m.footSoleOffset!.left+m.footSoleOffset!.right)*profile.appearance.bodyScale/2-(m.hips!.left.y+m.hips!.right.y)/2+m.seatContactOffset!.y}}];
  plan.postures=[{pose:'seated',supportId:'source-seat',startMs:300,endMs:1800},{pose:'stand',startMs:3000,endMs:4500}];
  return {profile,plan,m};
}
const nums=(text:string)=>text.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
for(const actor of ['lila','karo'] as const)for(const facing of ['left','right'] as const){
  test(`${actor}/${facing}: source seat prepares each foot, retains both asymmetric bones, restores the original stance and supports absolute seek`,()=>{
    const {profile,plan,m}=seatingFixture(actor,facing);validatePerformance(plan,profile);
    const before=samplePerformance(plan,profile,2600,silence);samplePerformance(plan,profile,4800,silence);
    assert.deepEqual(samplePerformance(plan,profile,2600,silence),before);
    for(let time=0;time<=6000;time+=25){
      const f=samplePerformance(plan,profile,time,silence),pelvis=nums(f.transforms.pelvis!),lean=nums(f.transforms.chest!)[2]!;
      for(const side of ['left','right'] as const){
        const g=legGeometry(m,{x:pelvis[0]!,y:pelvis[1]!},f.feet[side],side,plan.scale,profile.appearance.bodyScale,lean);
        const upper=nums(f.transforms['leg-'+side+'-upper']!),lower=nums(f.transforms['leg-'+side+'-lower']!);
        const end={x:lower[0]!-Math.sin(lower[2]!*Math.PI/180)*g.bones.lower,y:lower[1]!+Math.cos(lower[2]!*Math.PI/180)*g.bones.lower};
        assert.ok(Math.abs(Math.hypot(lower[0]!-upper[0]!,lower[1]!-upper[1]!)-g.bones.upper)<.001);
        assert.ok(Math.hypot(end.x-g.ankle.x,end.y-g.ankle.y)<.001);
        assert.ok(f.feet[side].y<=plan.stage.groundY+.001);
        if(f.stance[side])assert.equal(f.feet[side].y,plan.stage.groundY);
        const cloth=nums(f.transforms['garment-'+side]!);assert.ok(Math.hypot(cloth[0]!-g.hip.x,cloth[1]!-g.hip.y)<.001);
      }
      if(time>=1800&&time<=3000)assert.ok(f.seatContact!.errorPx<.001);
    }
    const entry=samplePerformance(plan,profile,0,silence),exit=samplePerformance(plan,profile,4800,silence);
    assert.deepEqual(exit.feet,entry.feet);
    for(const side of ['left','right'] as const){
      assert.equal(entry.face['garment-fold-'+side]!.opacity,0);assert.equal(exit.face['garment-fold-'+side]!.opacity,0);
      assert.equal(exit.face['garment-standing-'+side]!.opacity,1);
      assert.equal(before.face['garment-fold-'+side]!.opacity,side===facing?1:0);
      assert.equal(before.face['garment-standing-'+side]!.opacity,0);
    }
    const compiled=compilePerformance(plan,profile,silence);assert.ok(compiled.report.maxInterpolationGapPx<=.2);
    assert.ok(compiled.report.maxSeatContactErrorPx!<.001);
    const result=performanceScene(plan,profile,silence),resources=[...referenceHeadAssets(profile.appearance),...referenceBodyAssets(profile.appearance)].map(asset=>asset.path);
    assert.deepEqual(validateSceneFiles(secureSceneFiles(result.files),{id:plan.id,startMs:0,endMs:plan.durationMs} as Parameters<typeof validateSceneFiles>[1],2000000,resources,plan.stage),[]);
  });
}
test('source seat refuses shortened preparation and generic seat geometry that its real ankles cannot reach',()=>{
  const {profile,plan}=seatingFixture('lila','right');plan.postures![0]!.endMs=1100;
  assert.throws(()=>validatePerformance(plan,profile),/1500ms/);
  plan.postures![0]!.endMs=1800;plan.supports![0]!.center.y=200;
  assert.throws(()=>validatePerformance(plan,profile),/seat\/foot geometry/);
});
test('source seat keeps the closed hip contact planted during explicit lean and emotion changes',()=>{
  for(const actor of ['lila','karo'] as const)for(const facing of ['left','right'] as const){
    const {profile,plan,m}=seatingFixture(actor,facing);
    plan.postures!.splice(1,0,{pose:'seated',supportId:'source-seat',leanDeg:facing==='left'?-12:12,startMs:1900,endMs:2400});
    plan.expressions=[{startMs:1800,endMs:3000,mood:'thinking'}];
    validatePerformance(plan,profile);
    for(const at of [1850,2000,2300,2600,2900]){
      const f=samplePerformance(plan,profile,at,silence);assert.ok(f.seatContact!.errorPx<.001);
      const pelvis=nums(f.transforms.pelvis!),seat=plan.supports![0]!;
      assert.ok(pelvis[1]!<seat.center.y-m.seatContactOffset!.y*.8);
    }
  }
});
test('pose inspection preserves opacity on hidden bones and source hair namespaces',()=>{
  const svg=bodyCalibrationSvg('lila','point',1600,'happy');
  assert.match(svg,/<g id="lila-calibration-leg-left-upper" opacity="0" transform=/);
  assert.match(svg,/id="lila-calibration-hair-tail-three-quarter-right"/);
  assert.match(svg,/<g id="lila-calibration-neck" opacity="0" transform=/);
  assert.match(svg,/id="lila-calibration-neck-art"/);
  assert.match(svg,/mask="url\(#lila-calibration-forest-static-hair-three-quarter-right\)"/);
});
test('source body scenes reference staged original resources under the scene contract',()=>{
  const {profile,plan}=fixture('karo'),result=performanceScene(plan,profile,silence);
  const resources=[...referenceHeadAssets(profile.appearance),...referenceBodyAssets(profile.appearance)].map(asset=>asset.path);
  assert.deepEqual(validateSceneFiles(secureSceneFiles(result.files),{id:plan.id,startMs:0,endMs:plan.durationMs} as Parameters<typeof validateSceneFiles>[1],2000000,resources,plan.stage),[]);
  assert.ok(!result.files.files.find(file=>file.path==='index.html')!.content.includes('data:image'));
});
