// NOT RUN. Runtime declarations for the user's delegated test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {ConfigSchema} from '../packages/core/config.js';
import {topicContext,topicNarrativeContext,requireTopicProductionReady} from '../packages/topics/prehistoric-life.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {topicPreviewProfile} from '../packages/topics/preview.js';
import {bodyCalibrationPlan,bodyWorkbench,BODY_WORKBENCH_VIEWS} from '../packages/topics/body-workbench.js';
import {viewRegistrationWorkbench} from '../packages/topics/view-registration-workbench.js';
import {BODY_VIEW_VERSION,REGISTERED_BODY_VIEWS,bodyViewRegistration,bodyViewRegistrations,registeredDetailedBodyView,bodyViewAsset,bodyViewDescription,bodyViewFacing,type RegisteredBodyView} from '../packages/animation/body-view-art.js';
import {referenceBodyAssets,referenceBodyMetrics,referenceBodyDescription} from '../packages/animation/forest-body-art.js';
import {referenceHeadAssets,readReferenceHeadAsset} from '../packages/animation/forest-head-art.js';
import {performanceSvg} from '../packages/animation/rig.js';
import {cutoutHeadChin} from '../packages/animation/forest-cutout-head.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {samplePerformance,validatePerformance,bodyPoseAnchors} from '../packages/animation/compiler.js';
import {HUNT_ANIMATION_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {performanceScene} from '../packages/animation/scene.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import type {Shot} from '../packages/core/schemas.js';
const actors=['lila','karo'] as const;
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
function profileFor(actor:typeof actors[number],view:RegisteredBodyView):HostProfile{
  const base=topicPreviewProfile(actor);
  return HostProfileSchema.parse({...base,appearance:{...base.appearance,artworkVersion:BODY_VIEW_VERSION,bodyView:view},profileHash:hash({source:base.profileHash,view,registration:bodyViewDescription.fingerprint})});
}

test('each actor selects independent native left/right artwork; existing right registrations remain exact',()=>{
  for(const actor of actors){
    const left=registeredDetailedBodyView(profileFor(actor,'three-quarter-left')),right=registeredDetailedBodyView(profileFor(actor,'three-quarter-right'));
    assert.strictEqual(right,bodyViewRegistration[actor]);assert.notEqual(left.sha256,right.sha256);
    assert.equal(left.nearHand,'right');assert.equal(left.farHand,'left');assert.equal(right.nearHand,'left');
    assert.equal(bodyViewFacing(profileFor(actor,'three-quarter-left')),'left');
    for(const view of REGISTERED_BODY_VIEWS){
      const c=bodyViewRegistrations[actor][view],asset=bodyViewAsset(profileFor(actor,view).appearance),bytes=readReferenceHeadAsset(asset);
      assert.equal(hash(bytes),c.sha256);assert.equal(bytes.readUInt32BE(16),c.width);assert.equal(bytes.readUInt32BE(20),c.height);
      assert.equal(asset.file,c.file);assert.equal(asset.path,'assets/rigs/'+c.sha256+'.png');
    }
    const base=topicPreviewProfile(actor);
    assert.throws(()=>HostProfileSchema.parse({...base,appearance:{...base.appearance,bodyView:'three-quarter-left'}}),/bodyView requires/);
    assert.throws(()=>HostProfileSchema.parse({...profileFor(actor,'three-quarter-left'),appearance:{...profileFor(actor,'three-quarter-left').appearance,sourceColour:'original-rgb-v2'}}),/Original source colour/);
    assert.throws(()=>HostProfileSchema.parse({...profileFor(actor,'three-quarter-left'),appearance:{...profileFor(actor,'three-quarter-left').appearance,characterVariant:undefined}}),/requires its actor/);
  }
  assert.deepEqual(bodyViewRegistration.lila.neck,{x:620,y:496});assert.deepEqual(bodyViewRegistration.karo.pelvis,{x:475,y:983});
  assert.equal(bodyViewDescription.approved,false);assert.equal(bodyViewDescription.productionReady,false);
});

test('native view registration changes attachment positions but preserves canonical physical limb and hand/sole dimensions',()=>{
  for(const actor of actors)for(const scale of [.75,1,1.25]){
    const base=topicPreviewProfile(actor);base.appearance.bodyScale=scale;
    const original=referenceBodyMetrics(base);
    for(const view of REGISTERED_BODY_VIEWS){
      const profile=profileFor(actor,view);profile.appearance.bodyScale=scale;
      const candidate=referenceBodyMetrics(profile),c=registeredDetailedBodyView(profile);
      for(const key of ['arms','legs','handAttachment','footSoleOffset','footOffsets','armRest','handRestRotation','height','pelvisY'] as const)assert.deepEqual(candidate[key],original[key],actor+'/'+view+'/'+key);
      assert.equal(candidate.shoulders!.left.x,(c.shoulders.left.x-c.pelvis.x)*c.bodyScale*scale);
      assert.equal(candidate.hips!.right.y,(c.hips.right.y-c.pelvis.y)*c.bodyScale*scale);
    }
  }
});

test('paired opposite views retain hand labels and unique painter slots, intact faces and independent resources',()=>{
  const pair=[profileFor('lila','three-quarter-right'),profileFor('karo','three-quarter-left')];
  const combined=pair.map(profile=>{
    const c=registeredDetailedBodyView(profile),svg=performanceSvg(profile,'scene');
    assert.ok(svg.includes('data-body-view="'+c.view+'"'));
    assert.doesNotMatch(svg,/source-blink-|source-mouth-cover|scale\(\s*-/);
    assert.ok(svg.indexOf('id="ink-arm-'+c.farHand+'-back-slot"')<svg.indexOf('id="chest"'));
    assert.ok(svg.indexOf('id="ink-arm-'+c.nearHand+'-back-slot"')>svg.indexOf('id="chest"'));
    for(const side of ['left','right'])assert.equal([...svg.matchAll(new RegExp('id="hand-'+side+'"','g'))].length,1);
    return namespaceRigSvg(svg,profile.id+'-');
  }).join('');
  const ids=[...combined.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]!);assert.equal(ids.length,new Set(ids).size);
  for(const m of combined.matchAll(/(?:url\(#([^)]*)\)|href="#([^"]+)")/g))assert.ok(ids.includes((m[1]??m[2])!));
  for(const profile of pair)assert.ok(combined.includes(bodyViewAsset(profile.appearance).path));
});

test('fixed-view mismatches, unregistered motion/expressions and speech fail in validation and direct sampling',()=>{
  for(const actor of actors)for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=bodyCalibrationPlan(actor,'rest','happy',undefined,view);
    const cases=[
      {plan:{...plan,facing:plan.facing==='left'?'right' as const:'left' as const},error:/needs-body-registration/},
      {plan:{...plan,headView:view==='three-quarter-left'?'three-quarter-right' as const:'three-quarter-left' as const},error:/needs-(?:head-view|body-registration)/},
      {plan:{...plan,walks:[{startMs:300,endMs:3600,fromX:210,toX:240}]},error:/needs-view-motion/},
      {plan:{...plan,entryPosture:{pose:'crouch' as const}},error:/needs-view-motion/},
      {plan:{...plan,gazes:[{startMs:0,endMs:4000,target:{x:80,y:120}}]},error:/needs-view-gaze/},
      {plan:{...plan,expressions:[{startMs:0,endMs:4000,mood:'angry' as const}]},error:/needs-view-expression/},
    ];
    for(const c of cases){assert.throws(()=>validatePerformance(c.plan,profile),c.error);assert.throws(()=>samplePerformance(c.plan,profile,0,silence),c.error);assert.throws(()=>bodyPoseAnchors(c.plan,profile,0),c.error);}
    assert.throws(()=>samplePerformance(plan,profile,1000,{...silence,method:'audio-rms',intervals:[{startMs:100,endMs:1200,level:.5}]}),/needs-view-voice-animation/);
  }
});

test('left lunge and spear are blocked before sampling; workbench never substitutes the right view',()=>{
  for(const actor of actors){
    const {profile,plan}=bodyCalibrationPlan(actor,'rest','happy',undefined,'three-quarter-left');
    const lunge:PerformancePlan={...plan,compilerVersion:HUNT_ANIMATION_VERSION,lunge:{version:'forest-planted-lunge-1',spearId:'candidate',soles:{left:{x:150,y:410},right:{x:270,y:410}},kneePoles:{left:1,right:1},advanceX:10,dropY:5,entryLeanDeg:9,contactLeanDeg:16}};
    assert.throws(()=>validatePerformance(lunge,profile),/needs-lunge-pose/);assert.throws(()=>samplePerformance(lunge,profile,0,silence),/needs-lunge-pose/);assert.throws(()=>bodyPoseAnchors(lunge,profile,0),/needs-lunge-pose/);
    const spear:PerformancePlan={...plan,compilerVersion:HUNT_ANIMATION_VERSION,props:[{id:'tool',kind:'spear',origin:{x:200,y:300},length:320}]};
    assert.throws(()=>validatePerformance(spear,profile),/needs-view-tool-pose/);assert.throws(()=>samplePerformance(spear,profile,0,silence),/needs-view-tool-pose/);
    assert.throws(()=>bodyCalibrationPlan(actor,'spear-lunge','happy',undefined,'three-quarter-left'),/needs-lunge-pose/);
    assert.throws(()=>bodyCalibrationPlan(actor,'spear-hold-left','happy',undefined,'three-quarter-left'),/needs-view-tool-pose/);
  }
  assert.match(bodyWorkbench('spear-lunge',1800,'happy','three-quarter-left'),/needs-lunge-pose/);
});

test('left/right staging and canonical scene resources match each selected native view and keep production closed',()=>{
  for(const actor of actors)for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=bodyCalibrationPlan(actor,'rest','happy',undefined,view),selected=bodyViewAsset(profile.appearance);
    assert.deepEqual(referenceHeadAssets(profile.appearance),[selected]);
    const assets=referenceBodyAssets(profile.appearance);assert.ok(assets.some(a=>a.path===selected.path));assert.equal(assets.length,2);
    const scene=performanceScene(plan,profile,silence),files=secureSceneFiles(scene.files),shot={id:plan.id,startMs:0,endMs:plan.durationMs} as Shot;
    assert.deepEqual(validateSceneFiles(files,shot,500000,assets.map(a=>a.path),{width:430,height:440}),[]);
    assert.ok(validateSceneFiles(files,shot,500000,assets.filter(a=>a.path!==selected.path).map(a=>a.path),{width:430,height:440}).some(e=>e.includes('Unapproved local resource')));
    assert.equal(scene.compiled.report.bodyArtwork?.productionReady,false);
  }
  assert.equal(referenceBodyDescription().authoredViews.fingerprint,bodyViewDescription.fingerprint);
});

test('fixed silent point plans preserve exact authored clocks and reproduce random-access seeks',()=>{
  for(const actor of actors)for(const view of REGISTERED_BODY_VIEWS)for(const hand of ['left','right'] as const){
    const {profile,plan}=bodyCalibrationPlan(actor,'point','happy',hand,view);
    assert.equal(plan.durationMs,4000);assert.equal(plan.gestures[0]!.startMs,300);assert.equal(plan.gestures[0]!.endMs,3600);
    const saved=[0,800,1600,3500,4000].map(at=>samplePerformance(plan,profile,at,silence));
    for(const i of [3,1,4,0,2])assert.deepEqual(samplePerformance(plan,profile,saved[i]!.timeMs,silence),saved[i]);
    assert.equal(plan.gestures[0]!.hand,hand);assert.equal(plan.headView,view);
  }
});

test('body and native registration workbenches expose both candidates with separate namespaces and blocked unsupported actions',()=>{
  assert.ok(BODY_WORKBENCH_VIEWS.includes('three-quarter-left'));
  const html=bodyWorkbench('rest',0,'happy','three-quarter-left');
  assert.match(html,/value="three-quarter-left" selected/);assert.match(html,/data-body-view="three-quarter-left"/);
  const registrations=viewRegistrationWorkbench();
  for(const actor of actors)for(const view of REGISTERED_BODY_VIEWS)assert.ok(registrations.includes('id="cloth-'+actor+'-'+view+'"'));
  for(const action of ['walk','run','jump','sit-left','head-turn'] as const)assert.throws(()=>bodyCalibrationPlan('lila',action,'happy',undefined,'three-quarter-left'),/needs-view-motion/);
  const right=bodyCalibrationPlan('karo','rest','happy',undefined,'three-quarter-right').profile;
  const left=bodyCalibrationPlan('karo','rest','happy',undefined,'three-quarter-left').profile;
  assert.notEqual(left.profileHash,right.profileHash);
});

test('topic metadata describes registered candidates while preserving the production and narration contract',()=>{
  const config=ConfigSchema.parse({topic:{id:'prehistoric-life'},presentation:{mode:'story-cinematic',character_mode:'actors'}});
  const context=topicContext(config)!;
  assert.deepEqual(context.headViews.bodyCandidates.sources,bodyViewRegistrations);
  assert.equal(context.headViews.bodyCandidates.approved,false);assert.equal(context.readiness.productionReady,false);
  assert.throws(()=>requireTopicProductionReady(config),/needs-art-direction/);
  assert.equal(topicNarrativeContext(config)!.version,'prehistoric-story-contract-1');
  assert.match(topicNarrativeContext(config)!.rule,/Preserve source names, meaning and dialogue/);
});

test('fixed-view think grips follow the native chin transformed by the actual rendered head',()=>{
  for(const actor of actors)for(const view of REGISTERED_BODY_VIEWS)for(const hand of ['left','right'] as const)for(const scale of [.85,1]){
    const {profile,plan}=bodyCalibrationPlan(actor,'think','happy',hand,view);plan.scale=scale;
    // The 300ms gesture entry has a 600ms approach. Compare only the hold;
    // an approaching hand must not be mistaken for misplaced chin contact.
    for(const at of [1000,1600,2600]){
      const frame=samplePerformance(plan,profile,at,silence),matrix=frame.transforms.head!;
      const values=matrix.match(/^translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\) scale\(([-\d.]+)\)$/);
      assert.ok(values,'head transform must expose the actual scene attachment');
      const [x,y,angle,k]=values.slice(1).map(Number) as [number,number,number,number],chin=cutoutHeadChin(profile,hand),a=angle*Math.PI/180;
      const expected={x:x+k*(chin.x*Math.cos(a)-chin.y*Math.sin(a)),y:y+k*(chin.x*Math.sin(a)+chin.y*Math.cos(a))};
      assert.ok(Math.hypot(frame.hands[hand].x-expected.x,frame.hands[hand].y-expected.y)<.05,actor+'/'+view+'/'+hand+' misplaced the grip relative to rendered chin');
    }
  }
});
