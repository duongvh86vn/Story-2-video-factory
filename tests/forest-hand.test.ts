import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {compilePerformance,samplePerformance} from '../packages/animation/compiler.js';
import {forestHandRegistration} from '../packages/animation/forest-hand.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const nums=(s:string)=>s.match(/-?\d+(?:\.\d+)?/g)!.map(Number);

// Runtime assertions are prepared for the delegated tester; authoring/build
// work must not be reported as having executed these acceptance checks.
for(const actor of ['lila','karo'] as const)for(const action of ['rest','point','think','run','run-left','spear-hold','spear-thrust','spear-thrust-left','spear-lunge'] as const){
  test(`${actor}/${action}: source cuff, rigid palm and contact remain distinct through seeks`,()=>{
    const {profile,plan}=bodyCalibrationPlan(actor,action,'happy');
    plan.scale=.8;const m=rigMetrics(profile);
    // Re-author world-space calibration anchors at this scale. Scaling only
    // bones while keeping the scale-1 thrust aim/stance would be a bad fixture.
    const scaled=(p:{x:number;y:number})=>({x:plan.root.x+(p.x-plan.root.x)*plan.scale,y:plan.root.y+(p.y-plan.root.y)*plan.scale});
    for(const track of plan.spears??[])track.aim=scaled(track.aim);
    for(const gesture of plan.gestures)if(gesture.target)gesture.target=scaled(gesture.target);
    for(const walk of plan.walks){walk.fromX=scaled({x:walk.fromX,y:plan.root.y}).x;walk.toX=scaled({x:walk.toX,y:plan.root.y}).x;}
    if(plan.lunge)for(const side of ['left','right'] as const)plan.lunge.soles[side]=scaled(plan.lunge.soles[side]);
    const entry=samplePerformance(plan,profile,0,silence);
    for(const prop of plan.props)prop.origin=entry.props[prop.id]!.point;
    for(const t of [0,500,1200,1500,1800,3000,3900,800,1800]){
      const f=samplePerformance(plan,profile,t,silence);
      for(const side of ['left','right'] as const){
        const upper=nums(f.transforms[`arm-${side}-upper`]!),lower=nums(f.transforms[`arm-${side}-lower`]!),hand=nums(f.transforms[`hand-${side}`]!);
        const shoulder={x:upper[0]!,y:upper[1]!},elbow={x:lower[0]!,y:lower[1]!},wrist=f.wrists![side],grip=f.hands[side],attachment=m.handAttachment![side];
        assert.ok(Math.abs(dist(shoulder,elbow)-m.arms![side].upper*plan.scale)<.002);
        assert.ok(Math.abs(dist(elbow,wrist)-m.arms![side].lower*plan.scale)<.002);
        assert.ok(Math.abs(dist(wrist,grip)-attachment.length*plan.scale)<.002,'cuff-to-grip length changed');
        const offset=attachment.wristOffset,a=hand[2]!*Math.PI/180,k=hand[3]!;
        const drawnCuff={x:hand[0]!+k*(offset.x*Math.cos(a)-offset.y*Math.sin(a)),y:hand[1]!+k*(offset.x*Math.sin(a)+offset.y*Math.cos(a))};
        assert.ok(dist(drawnCuff,wrist)<.002,'bitmap cuff detached from ink/bones');
        assert.ok(dist(grip,wrist)>2,'palm incorrectly reused as wrist');
        const before={x:wrist.x-elbow.x,y:wrist.y-elbow.y},after={x:grip.x-wrist.x,y:grip.y-wrist.y};
        if(action==='think'){
          const curl=Math.abs(Math.atan2(before.x*after.y-before.y*after.x,before.x*after.x+before.y*after.y))*180/Math.PI;
          assert.ok(curl<=70.01,'authored chin wrist exceeds its registered bend');
          if(t<=300||t>=3600)assert.ok(curl<.01,'wrist does not recover its original tangent');
        }else assert.ok(Math.abs(before.x*after.y-before.y*after.x)<.002,'source mitten kinks away from forearm tangent');
        const ink=nums(f.paths![`ink-arm-${side}`]!);
        assert.ok(dist({x:ink.at(-2)!,y:ink.at(-1)!},wrist)<.002);
        // The source grip must be inside its explicit crop, independent of pose.
        const registration=forestHandRegistration[actor][side];assert.ok(registration.grip.y>registration.wrist.y);
      }
      if(plan.spears?.length)assert.ok(f.contactError<.001,'registered grip missed its shaft');
    }
    const compiled=compilePerformance(plan,profile,silence);
    assert.ok(compiled.report.maxInterpolationGapPx<=.2,'interpolated cuff separated from the lower bone');
    assert.equal(compiled.report.bodyArtwork!.handRegistration.version,'forest-wrist-palm-1');
    if(action==='think'){
      const slotLines=compiled.js.split('\n').filter(line=>/(?:hand|ink-arm)-right-(?:front|back)-slot/.test(line));
      assert.ok(slotLines.length>=8,'missing initial and gesture-boundary painter sets');
      assert.ok(slotLines.every(line=>line.startsWith('tl.set(')),'physical arm is cross-faded between slots');
      for(const boundary of [300,3600])assert.ok(slotLines.some(line=>line.endsWith(`,${boundary/1000});`)),'slot change is not at its exact gesture boundary');
    }
  });
}
