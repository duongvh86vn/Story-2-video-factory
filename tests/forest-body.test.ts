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
    assert.equal(assets.length,1);assert.equal(hash(readReferenceHeadAsset(assets[0]!)),assets[0]!.sha256);
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
test('source body cannot silently simulate missing seated or full-body views',()=>{
  const {profile,plan}=fixture('lila');
  assert.throws(()=>validatePerformance({...plan,turns:[{startMs:300,endMs:900,direction:'left'}]},profile),/needs-body-view/);
  assert.throws(()=>validatePerformance({...plan,entryPosture:{pose:'seated',supportId:'seat'}},profile),/needs-source-motion/);
});
test('pose inspection preserves opacity on hidden bones and source hair namespaces',()=>{
  const svg=bodyCalibrationSvg('lila','point',1600,'happy');
  assert.match(svg,/<g id="lila-calibration-leg-left-upper" opacity="0" transform=/);
  assert.match(svg,/id="lila-calibration-hair-tail-three-quarter-right"/);
  assert.match(svg,/mask="url\(#lila-calibration-forest-static-hair-three-quarter-right\)"/);
});
test('source body scenes reference staged original resources under the scene contract',()=>{
  const {profile,plan}=fixture('karo'),result=performanceScene(plan,profile,silence);
  const resources=[...referenceHeadAssets(profile.appearance),...referenceBodyAssets(profile.appearance)].map(asset=>asset.path);
  assert.deepEqual(validateSceneFiles(secureSceneFiles(result.files),{id:plan.id,startMs:0,endMs:plan.durationMs} as Parameters<typeof validateSceneFiles>[1],2000000,resources,plan.stage),[]);
  assert.ok(!result.files.files.find(file=>file.path==='index.html')!.content.includes('data:image'));
});
