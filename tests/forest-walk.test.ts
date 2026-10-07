import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCE_WALK_POSES,sourceSwing} from '../packages/animation/source-walk.js';
import {topicPreviewProfile} from '../packages/topics/preview.js';
import {ANIMATION_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {samplePerformance,compilePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {legGeometry} from '../packages/animation/body-geometry.js';
import {bodyCalibrationSvg,bodyWorkbench} from '../packages/topics/body-workbench.js';
const silent={method:'segment-draft' as const,windowMs:20,intervals:[]};
const values=(s:string)=>s.match(/-?\d+(?:\.\d+)?/g)!.map(Number);

test('short steps keep the support sole planted; lift scales with travel and eases to the floor without a velocity kick',()=>{
  for(const travel of [-60,-12,0,12,60]){
    const from={x:130,y:410},at=(p:number)=>sourceSwing(from,from.x+travel,410,p,65,1);
    for(const p of [0,.06,.12,.82,.9,1])assert.equal(at(p).point.y,410);
    for(let i=0;i<=100;i++){
      const f=at(i/100);assert.ok(f.point.y<=410 && 410-f.point.y<=6.5+1e-8);
      assert.ok(f.point.x>=Math.min(from.x,from.x+travel)-1e-8 && f.point.x<=Math.max(from.x,from.x+travel)+1e-8);
      if(f.planted)assert.equal(f.point.y,410);
      if(travel===0)assert.ok(f.planted,'a zero-distance step cannot claim a lifted foot');
    }
    for(const boundary of [.12,.82]){
      const dt=.0001,left=at(boundary-dt).point,right=at(boundary+dt).point,center=at(boundary).point;
      for(const axis of ['x','y'] as const){
        assert.ok(Math.abs((right[axis]-left[axis])/(2*dt))<.01,'contact velocity must settle to zero');
        assert.ok(Math.abs((right[axis]-2*center[axis]+left[axis])/(dt*dt))<3,'contact acceleration must settle to zero');
      }
    }
  }
  assert.ok(410-sourceSwing({x:0,y:410},4,410,.47,65,1).point.y<1,'tiny step must not march');
});

for(const actor of ['lila','karo'] as const)for(const direction of [-1,1]){
  test(`${actor}/${direction}: front gait retains XYZ bone lengths, sole contact and deterministic seeks`,()=>{
    const profile=topicPreviewProfile(actor),m=rigMetrics(profile);
    const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'walk-front-'+actor,leadCharacterId:actor,profileHash:profile.profileHash,
      kind:'stick-man',durationMs:3600,fps:60,stage:{width:640,height:480,groundY:420},root:{x:320,y:420},scale:.85,
      facing:direction===-1?'left':'right',walks:[{startMs:300,endMs:3000,fromX:320,toX:320+direction*70}],gestures:[],props:[],gazes:[],expressions:[]};
    validatePerformance(plan,profile);
    const wanted=samplePerformance(plan,profile,800,silent);
    for(const t of [3000,900,0,300,1800,3600])samplePerformance(plan,profile,t,silent);
    assert.deepEqual(samplePerformance(plan,profile,800,silent),wanted);
    let prior=samplePerformance(plan,profile,0,silent),seenLift=false,seenDepth=false;
    for(let t=10;t<=3600;t+=10){
      const f=samplePerformance(plan,profile,t,silent),p=values(f.transforms.pelvis!),lean=values(f.transforms.chest!)[2]!;
      assert.ok(f.stance.left||f.stance.right,'normal walk must never be airborne');
      for(const side of ['left','right'] as const){
        const g=legGeometry(m,{x:p[0]!,y:p[1]!},f.feet[side],side,plan.scale,profile.appearance.bodyScale,lean);
        const u=values(f.transforms['leg-'+side+'-upper']!),l=values(f.transforms['leg-'+side+'-lower']!),depth=f.legProjection![side].kneeDepth;
        const end={x:l[0]!-Math.sin(l[2]!*Math.PI/180)*(m.legs![side].lower*l[4]!),y:l[1]!+Math.cos(l[2]!*Math.PI/180)*(m.legs![side].lower*l[4]!)};
        assert.ok(Math.abs(Math.hypot(l[0]!-u[0]!,l[1]!-u[1]!,depth)-g.bones.upper)<.002,'physical thigh length changed');
        assert.ok(Math.abs(Math.hypot(end.x-l[0]!,end.y-l[1]!,depth)-g.bones.lower)<.002,'physical shin length changed');
        assert.ok(Math.hypot(end.x-g.ankle.x,end.y-g.ankle.y)<.002,'projected shin must meet original ankle');
        assert.ok(f.feet[side].y<=420);
        if(prior.stance[side]&&f.stance[side])assert.deepEqual(f.feet[side],prior.feet[side],'planted sole slid');
        if(!f.stance[side])seenLift=true;
        if(depth>.1)seenDepth=true;
        const line=f.paths!['ink-leg-'+side]!,coords=values(line);
        assert.ok(Math.hypot(coords.at(-2)!-g.ankle.x,coords.at(-1)!-g.ankle.y)<.002,'ink tip lost ankle contact');
      }
      prior=f;
    }
    assert.ok(seenLift&&seenDepth,'gait must contain an actual swing and a depth-flexed knee');
    const compiled=compilePerformance(plan,profile,silent);assert.ok(compiled.report.maxInterpolationGapPx<=.2);
    assert.equal(compiled.report.bodyArtwork!.walkMotion.productionAcceptance,false);
    assert.ok(SOURCE_WALK_POSES.every(p=>p.phase>=0&&p.phase<=1));
  });
}
test('workbench exposes both directions and source-preserving pose links without an alternate renderer',()=>{
  assert.match(bodyCalibrationSvg('karo','walk-left',800,'happy'),/karo walk-left 800ms/);
  assert.match(bodyWorkbench('walk',800,'happy'),/Pose bước đầu/);
  assert.match(bodyWorkbench('walk',800,'happy'),/Đặt chân/);
});
