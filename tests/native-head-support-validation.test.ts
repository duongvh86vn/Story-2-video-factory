import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {nativeSeatPhysicalActor} from '../benchmarks/native-seat-tracer.js';
import {headFaceCandidate} from '../packages/topics/head-face-source.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {validatePerformance,samplePhysicalPerformance,samplePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {VIEW_ACTING_CLOCK_VERSION,type ViewActingClock} from '../packages/animation/view-acting-clock.js';
import {NATIVE_HEAD_SOURCE_VERSION} from '../packages/animation/native-head-track.js';

test('structural support validation is body-only while native head rendering still requires its complete clock',async()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const){
    const f=nativeSeatPhysicalActor(actor,view),candidate=await headFaceCandidate(process.cwd(),actor,view,'source-motion');
    const {profileHash:discarded,...data}=f.profile,appearance={...data.appearance,bodyHeadBank:candidate.bank};
    delete appearance.bodySpeech;delete appearance.bodyEyes;delete appearance.bodyExpressions;delete appearance.bodySecondary;
    const profile=HostProfileSchema.parse({...data,appearance,profileHash:hash({...data,appearance})}),plan={...f.plan,profileHash:profile.profileHash};
    const headMotion={version:NATIVE_HEAD_SOURCE_VERSION,id:actor+'-support-head',ownerId:actor,bankFingerprint:candidate.bank.fingerprint,
      startMs:0,endMs:plan.durationMs,samples:[{atMs:0,cell:candidate.bank.cells[0]!.id}]};
    plan.sourceHead=headMotion;
    const clock:ViewActingClock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:actor,startMs:0,endMs:plan.durationMs,runStartMs:0,runEndMs:plan.durationMs,
      sourceIdentityHash:hash({plan,profile}),gazes:[],gestures:[],expressions:plan.expressions,headMotion};
    assert.doesNotThrow(()=>validatePerformance(plan,profile));
    const invalid=structuredClone(plan);invalid.supports![0]!.center.x=plan.root.x;
    assert.throws(()=>validatePerformance(invalid,profile),/planted feet must be in front/);
    const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
    assert.throws(()=>samplePerformance(plan,profile,2000,silence),/needs-head-source-phase/);
    assert.throws(()=>samplePhysicalPerformance(plan,profile,2000),/needs-head-source-phase/);
    assert.throws(()=>compilePerformance(plan,profile,silence),/needs-head-source-phase/);
    const before=hash({plan,profile,clock});
    for(const at of [2000,0,7200,2000]){
      const frame=samplePhysicalPerformance(plan,profile,at,clock);
      assert.equal(frame.purpose,'physical-geometry');
      assert.doesNotMatch(JSON.stringify(frame),/NaN|Infinity/);
      if(at===2000)assert.ok(frame.seatContact&&frame.seatContact.errorPx<=.01);
    }
    assert.equal(hash({plan,profile,clock}),before);
  }
});
