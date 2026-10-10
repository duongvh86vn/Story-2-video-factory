// DECLARED / NOT RUN. All fixtures/schema instances/geometry/evaluator and SVG
// calls stay in callbacks for the user's test model; source typecheck only.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {bodyObliqueRegistration,obliqueBodyRegistrationDescription} from '../packages/animation/body-view-oblique-registration.js';
import {OBLIQUE_BODY_VIEWS,BASIC_UNREGISTERED_OPTIONS,ART_TO_BODY_VIEW,isRearBodyView} from '../packages/animation/body-view-basic-capabilities.js';
import {authoredRestArm} from '../packages/animation/body-view-rest-arm.js';
import {bodyCandidateRegistrations,registeredBodyView,registeredDetailedBodyView,bodyViewHeadSvg,bodyViewClothingSvg,REGISTERED_BODY_VIEWS} from '../packages/animation/body-view-art.js';
import {cutoutHeadChin} from '../packages/animation/forest-cutout-head.js';
import {bodyCalibrationPlan,BODY_WORKBENCH_VIEWS} from '../packages/topics/body-workbench.js';
import {rigMetrics,performanceSvg} from '../packages/animation/rig.js';
import {samplePerformance,validatePerformance,solveChain} from '../packages/animation/compiler.js';
import {findRepoRoot} from '../packages/core/config.js';
import {viewArtInventory,viewArtCoverage} from '../packages/topics/view-art-workbench.js';
import type {PerformancePlan} from '../packages/animation/schemas.js';

test('each profile/rear body uses its own SHA/canvas and source-art ID mapping without mirrored or borrowed registration',()=>{
  assert.equal(ART_TO_BODY_VIEW['back-three-quarter-left'],'back-left');
  assert.equal(ART_TO_BODY_VIEW['back-three-quarter-right'],'back-right');
  assert.deepEqual(REGISTERED_BODY_VIEWS,['three-quarter-right','three-quarter-left']);
  for(const actor of ['lila','karo'] as const)for(const view of OBLIQUE_BODY_VIEWS){
    assert.ok(BODY_WORKBENCH_VIEWS.includes(view));
    const c=bodyObliqueRegistration[actor][view],bytes=readFileSync(c.file),study=JSON.parse(readFileSync(c.file.replace('.png','.json'),'utf8'));
    assert.equal(hash(bytes),c.sha256);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[c.width,c.height]);
    assert.equal(study.view,c.sourceView);assert.equal(ART_TO_BODY_VIEW[c.sourceView],view);
    assert.equal(bodyCandidateRegistrations[actor][view],c);
    assert.equal(study.registered,false);assert.equal(study.approved,false);assert.equal(study.productionReady,false);
    for(const other of Object.values(bodyCandidateRegistrations[actor]))if(other.view!==view)assert.notEqual(c.sha256,other.sha256);
    if(isRearBodyView(view))assert.equal(c.chin,null);
  }
  assert.equal(obliqueBodyRegistrationDescription.measuredYawDeg,null);
  assert.equal(obliqueBodyRegistrationDescription.productionReady,false);assert.equal(obliqueBodyRegistrationDescription.productionRig,null);
  assert.deepEqual(obliqueBodyRegistrationDescription.availableBanks,[]);
});

test('authored rest cues reproduce the same fixed-length joint using inverse kinematics on both elbow sides',()=>{
  for(const lengths of [{upper:40,lower:55},{upper:81,lower:66}])for(const directions of [{upper:104,lower:96},{upper:76,lower:84},{upper:109,lower:115},{upper:73,lower:66}]){
    const rest=authoredRestArm(lengths.upper,lengths.lower,directions),chain=solveChain({x:0,y:0},rest.grip,lengths.upper,lengths.lower,rest.pole),r=directions.upper*Math.PI/180;
    assert.ok(chain.error<1e-6);assert.equal(chain.reachable,true);
    assert.ok(Math.abs(chain.joint.x-lengths.upper*Math.cos(r))<1e-6);assert.ok(Math.abs(chain.joint.y-lengths.upper*Math.sin(r))<1e-6);
    assert.ok(Math.abs(Math.hypot(chain.joint.x,chain.joint.y)-lengths.upper)<1e-6);
    assert.ok(Math.abs(Math.hypot(chain.end.x-chain.joint.x,chain.end.y-chain.joint.y)-lengths.lower)<1e-6);
  }
  for(const directions of [{upper:90,lower:90},{upper:0,lower:180},{upper:NaN,lower:80}])assert.throws(()=>authoredRestArm(40,55,directions),/needs-rest-arm-registration/);
  assert.throws(()=>authoredRestArm(0,55,{upper:76,lower:84}));
});

test('own-view rest/point and visible-profile think sample without inventing a rear chin and remain deterministic',()=>{
  const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
  for(const actor of ['lila','karo'] as const)for(const view of OBLIQUE_BODY_VIEWS)for(const action of isRearBodyView(view)?['rest','point'] as const:['rest','point','think'] as const)for(const hand of ['left','right'] as const){
    const f=bodyCalibrationPlan(actor,action,'happy',hand,view),c=bodyObliqueRegistration[actor][view];
    assert.doesNotThrow(()=>HostProfileSchema.parse(f.profile));assert.equal(registeredBodyView(f.profile),c);
    assert.equal(f.plan.headView,view);assert.equal(f.plan.facing,view==='left'||view==='back-left'?'left':'right');
    if(isRearBodyView(view))assert.throws(()=>cutoutHeadChin(f.profile,hand),/needs-visible-chin-registration/);
    const before=structuredClone(f.plan);
    for(const at of [0,1771,3999,500,1771]){
      const frame=samplePerformance(f.plan,f.profile,at,silence);
      assert.doesNotMatch(JSON.stringify(frame),/NaN|Infinity/);assert.deepEqual(frame,samplePerformance(f.plan,f.profile,at,silence));
    }
    assert.deepEqual(f.plan,before);
  }
});

test('new neutral arm registrations change directions and poles while preserving same-person canonical bones/hand/sole and old3/4 behavior',()=>{
  for(const actor of ['lila','karo'] as const){
    const base=bodyCalibrationPlan(actor,'rest','happy'),canonical=rigMetrics(base.profile);
    for(const view of ['front',...OBLIQUE_BODY_VIEWS] as const){
      const f=bodyCalibrationPlan(actor,'rest','happy',undefined,view),m=rigMetrics(f.profile),c=registeredBodyView(f.profile);
      assert.deepEqual(m.arms,canonical.arms);assert.deepEqual(m.legs,canonical.legs);
      assert.deepEqual(m.handAttachment,canonical.handAttachment);assert.deepEqual(m.footSoleOffset,canonical.footSoleOffset);
      assert.ok('restDirectionsDeg' in c);assert.ok(m.armRestPole);
      for(const side of ['left','right'] as const){const target=authoredRestArm(m.arms![side].upper,m.arms![side].lower+m.handAttachment![side].length,c.restDirectionsDeg[side]);assert.deepEqual(m.armRest![side],target.grip);assert.equal(m.armRestPole![side],target.pole);}
    }
    for(const view of REGISTERED_BODY_VIEWS){const f=bodyCalibrationPlan(actor,'rest','happy',undefined,view),m=rigMetrics(f.profile);assert.deepEqual(m.armRest,canonical.armRest);assert.equal(m.armRestPole,undefined);assert.equal('restDirectionsDeg' in registeredDetailedBodyView(f.profile),false);}
  }
});

test('raw and schema profiles cannot attach detailed3/4 capabilities to any own profile/rear source',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of OBLIQUE_BODY_VIEWS){
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,view);
    for(const key of BASIC_UNREGISTERED_OPTIONS)for(const value of [false,null,'selected',{},[]]){
      const raw={...profile,appearance:{...profile.appearance,[key]:value}} as unknown as HostProfile;
      assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredBodyView(raw),/needs-basic-view-capability/);
    }
    assert.throws(()=>registeredDetailedBodyView(profile),/needs-basic-view-capability/);
  }
});

test('new fixed views reject turns, gaze, props, unregistered movement/emotion and rear chin contact rather than silently using another source',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of OBLIQUE_BODY_VIEWS){
    for(const action of ['walk','run','jump','spear-thrust','sit-left','head-turn'] as const)assert.throws(()=>bodyCalibrationPlan(actor,action,'happy',undefined,view));
    const f=bodyCalibrationPlan(actor,'rest','happy',undefined,view);
    const bad:PerformancePlan[]=[{...f.plan,headView:'front'},{...f.plan,gazes:[{startMs:300,endMs:900,target:{x:300,y:200}}]},{...f.plan,turns:[{startMs:300,endMs:900,direction:'front'}]},{...f.plan,expressions:[{startMs:0,endMs:4000,mood:'sad'}]},{...f.plan,props:[{id:'food',kind:'generic',origin:{x:300,y:200}}]}];
    for(const plan of bad)assert.throws(()=>validatePerformance(plan,f.profile));
    if(isRearBodyView(view)){
      assert.throws(()=>bodyCalibrationPlan(actor,'think','happy',undefined,view));
      assert.throws(()=>validatePerformance({...f.plan,gestures:[{id:'hidden-chin',hand:'left',action:'think',startMs:300,endMs:3600}]},f.profile),/visible chin contact/);
    }
  }
});

test('own SVG head/clothing use one independent image transform and authored near/far arm order without a mirrored face',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of OBLIQUE_BODY_VIEWS){
    const {profile}=bodyCalibrationPlan(actor,'point','happy',undefined,view),c=bodyObliqueRegistration[actor][view],resolve=(_file:string,sha:string)=>'assets/rigs/'+sha+'.png';
    const head=bodyViewHeadSvg(profile,resolve),cloth=bodyViewClothingSvg(profile,resolve),svg=performanceSvg(profile,'scene');
    assert.ok(head.includes(resolve(c.file,c.sha256)));assert.ok(cloth.defs.includes(resolve(c.file,c.sha256)));
    assert.ok(head.includes(`data-body-view="${view}"`));assert.doesNotMatch(head,/scale\(-1|view-mouth|view-eye-/);
    const far=`id="ink-arm-${c.farHand}-back-slot"`,near=`id="ink-arm-${c.nearHand}-back-slot"`;
    assert.equal(svg.split(far).length-1,1);assert.equal(svg.split(near).length-1,1);
    assert.ok(svg.indexOf(far)<svg.indexOf('id="chest"'));assert.ok(svg.indexOf(near)>svg.indexOf('id="chest"'));
    assert.ok(svg.indexOf(near)<svg.indexOf('id="head"'));
  }
});

test('catalog distinguishes profile/rear source matching from zero production approval',async()=>{
  const coverage=viewArtCoverage(await viewArtInventory(await findRepoRoot()));
  for(const actor of coverage.actors)for(const row of actor.views.filter(row=>['left','right','back-three-quarter-left','back-three-quarter-right'].includes(row.view))){assert.equal(row.engineeringRegistrationMatches,true);assert.equal(row.registeredForProduction,false);assert.equal(row.artApproved,false);}
  assert.equal(coverage.sourceCandidateSlots,14);assert.equal(coverage.productionReadySlots,0);assert.equal(coverage.productionReady,false);assert.deepEqual(coverage.availableBanks,[]);
});
