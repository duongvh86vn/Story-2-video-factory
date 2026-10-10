// DECLARED / NOT RUN. Fixtures, schema instances and evaluator/render calls
// belong inside callbacks and are delegated to the user's testing model.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {bodyFrontRegistration,frontBodyRegistrationDescription,FRONT_UNREGISTERED_OPTIONS} from '../packages/animation/body-view-front-registration.js';
import {bodyCandidateRegistrations,bodyViewRegistrations,BODY_CANDIDATE_VIEWS,REGISTERED_BODY_VIEWS,registeredBodyView,registeredDetailedBodyView,bodyViewFacing,bodyViewHeadSvg,bodyViewClothingSvg} from '../packages/animation/body-view-art.js';
import {registeredBodyViewMouth} from '../packages/animation/body-view-mouth.js';
import {registeredBodyViewRestMouth} from '../packages/animation/body-view-rest-mouth.js';
import {registeredBodyViewEyes} from '../packages/animation/body-view-eyes.js';
import {registeredBodyViewExpressions} from '../packages/animation/body-view-expressions.js';
import {bodyCalibrationPlan,BODY_ACTIONS,BODY_WORKBENCH_VIEWS} from '../packages/topics/body-workbench.js';
import {samplePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {performanceSvg,rigMetrics} from '../packages/animation/rig.js';
import type {PerformancePlan} from '../packages/animation/schemas.js';

test('front candidates bind their own immutable native PNG and never enter the detailed or approved view banks',()=>{
  assert.deepEqual(REGISTERED_BODY_VIEWS,['three-quarter-right','three-quarter-left']);
  assert.deepEqual(BODY_CANDIDATE_VIEWS,['three-quarter-right','three-quarter-left','front']);
  assert.ok(BODY_WORKBENCH_VIEWS.includes('front'));
  for(const actor of ['lila','karo'] as const){
    const c=bodyFrontRegistration[actor],bytes=readFileSync(c.file);
    assert.equal(hash(bytes),c.sha256);
    assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[c.width,c.height]);
    assert.equal(c.view,'front');assert.equal(c.armDepth,'coplanar');
    assert.equal(bodyCandidateRegistrations[actor].front,c);
    assert.equal('front' in bodyViewRegistrations[actor],false);
    for(const detailed of Object.values(bodyViewRegistrations[actor]))assert.notEqual(c.sha256,detailed.sha256);
  }
  assert.match(frontBodyRegistrationDescription.coordinateAuthority,/approximations/);
  assert.equal(frontBodyRegistrationDescription.measuredYawDeg,null);
  assert.equal(frontBodyRegistrationDescription.productionReady,false);
  assert.equal(frontBodyRegistrationDescription.artApproved,false);
  assert.equal(frontBodyRegistrationDescription.motionVerified,false);
  assert.equal(frontBodyRegistrationDescription.productionRig,null);
  assert.deepEqual(frontBodyRegistrationDescription.availableBanks,[]);
});

test('front rest and each point/think hand use explicit front facing and preserve canonical physical chain lengths during seeks',()=>{
  const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
  for(const actor of ['lila','karo'] as const)for(const action of ['rest','point','think'] as const)for(const hand of ['left','right'] as const){
    const f=bodyCalibrationPlan(actor,action,'happy',hand,'front'),source=bodyCalibrationPlan(actor,'rest','happy');
    assert.equal(registeredBodyView(f.profile),bodyFrontRegistration[actor]);
    assert.equal(f.plan.headView,'front');assert.equal(f.plan.facing,'front');assert.equal(bodyViewFacing(f.profile),'front');
    assert.doesNotThrow(()=>HostProfileSchema.parse(f.profile));
    const m=rigMetrics(f.profile),base=rigMetrics(source.profile);
    assert.deepEqual(m.arms,base.arms);assert.deepEqual(m.legs,base.legs);
    assert.deepEqual(m.handAttachment,base.handAttachment);assert.deepEqual(m.footSoleOffset,base.footSoleOffset);
    const before=structuredClone(f.plan);
    for(const timeMs of [0,1771,4000,500,1771]){
      const frame=samplePerformance(f.plan,f.profile,timeMs,silence);
      assert.doesNotMatch(JSON.stringify(frame),/NaN|Infinity/);
      assert.deepEqual(frame,samplePerformance(f.plan,f.profile,timeMs,silence));
      for(const side of ['left','right'])for(const kind of ['ink-arm','hand']){
        const back=frame.face[`${kind}-${side}-back-slot`]!.opacity;
        const front=frame.face[`${kind}-${side}-front-slot`]!.opacity;
        assert.equal(back!+front!,1,'exactly one arm/contact painter remains visible');
      }
    }
    assert.deepEqual(f.plan,before);
  }
});

test('schema and raw registration reject every unsupported front option even when present as false or null',()=>{
  for(const actor of ['lila','karo'] as const){
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,'front');
    for(const key of FRONT_UNREGISTERED_OPTIONS)for(const value of [false,null,'selected',{},[]]){
      const raw={...profile,appearance:{...profile.appearance,[key]:value}} as unknown as HostProfile;
      assert.throws(()=>HostProfileSchema.parse(raw));
      assert.throws(()=>registeredBodyView(raw),/needs-front-capability/);
      assert.throws(()=>registeredDetailedBodyView(raw),/needs-front-capability/);
    }
    assert.throws(()=>registeredDetailedBodyView(profile),/needs-front-capability/);
  }
});

test('direct detailed face entry points cannot borrow3/4 coordinates or bypass the Lila resting-mouth early return',()=>{
  for(const actor of ['lila','karo'] as const){
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,'front');
    const raw={...profile,appearance:{...profile.appearance,bodySpeech:'registered-rest-mouth-v1',bodyEyes:'registered-eyes-v1',bodyExpressions:'registered-expressions-v1'}} as HostProfile;
    for(const read of [registeredBodyViewMouth,registeredBodyViewRestMouth,registeredBodyViewEyes,registeredBodyViewExpressions])assert.throws(()=>read(raw),/needs-front-capability/);
  }
});

test('front compiler/workbench refuse unregistered motion, partner gaze, emotion, turns, props and source carriers',()=>{
  for(const actor of ['lila','karo'] as const){
    for(const action of BODY_ACTIONS.filter(action=>!['rest','point','think'].includes(action)))assert.throws(()=>bodyCalibrationPlan(actor,action,'happy',undefined,'front'));
    const f=bodyCalibrationPlan(actor,'rest','happy',undefined,'front');
    const bad:PerformancePlan[]=[
      {...f.plan,facing:'right'},
      {...f.plan,headView:'three-quarter-right'},
      {...f.plan,turns:[{startMs:300,endMs:900,direction:'left'}]},
      {...f.plan,headTurns:[{startMs:300,endMs:900,direction:'left'}]},
      {...f.plan,gazes:[{startMs:300,endMs:900,target:{x:300,y:200}}]},
      {...f.plan,expressions:[{startMs:0,endMs:4000,mood:'sad'}]},
      {...f.plan,walks:[{startMs:300,endMs:900,fromX:210,toX:240}]},
      {...f.plan,props:[{id:'foreign-food',kind:'generic',origin:{x:300,y:200}}]},
      {...f.plan,sourceUnregistered:{borrowed:'three-quarter-right'}} as unknown as PerformancePlan,
    ];
    for(const plan of bad)assert.throws(()=>validatePerformance(plan,f.profile));
    assert.throws(()=>bodyCalibrationPlan(actor,'rest','happy',undefined,'front','cutout','registered-rest-mouth-v1'));
    assert.throws(()=>bodyCalibrationPlan(actor,'rest','happy',undefined,'front','cutout','silent','registered-eyes-v1'));
  }
});

test('front SVG uses own head/clothing source, two coplanar arm painters and head above both arms without mirroring',()=>{
  for(const actor of ['lila','karo'] as const){
    const {profile}=bodyCalibrationPlan(actor,'point','happy',undefined,'front'),c=bodyFrontRegistration[actor];
    const resolver=(_file:string,sha:string)=>'assets/rigs/'+sha+'.png';
    const head=bodyViewHeadSvg(profile,resolver),cloth=bodyViewClothingSvg(profile,resolver),svg=performanceSvg(profile,'scene');
    assert.ok(head.includes(resolver(c.file,c.sha256)));assert.ok(cloth.defs.includes(resolver(c.file,c.sha256)));
    assert.match(head,/data-body-view="front"/);assert.doesNotMatch(head,/view-eye-|view-mouth|scale\(-1/);
    assert.equal((svg.match(/data-view-depth="coplanar"/g)??[]).length,2);
    assert.doesNotMatch(svg,/data-view-depth="(?:near|far)"/);
    for(const side of ['left','right']){
      for(const kind of ['ink-arm','hand']){
        const id=`id="${kind}-${side}-back-slot"`;
        assert.equal(svg.split(id).length-1,1);
        assert.ok(svg.indexOf(id)<svg.indexOf('id="head"'));
      }
    }
  }
});
