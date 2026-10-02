import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { hostSvg } from '../packages/host/rig.js';
import { HostProfileSchema } from '../packages/host/schemas.js';
import { benchmarkPlan, carryBenchmarkPlan } from '../packages/animation/benchmark.js';
import sharp from 'sharp';
import { compilePerformance, samplePerformance, solveChain, validatePerformance } from '../packages/animation/compiler.js';
import { validateSceneScript } from '../packages/scenes/security.js';
import { rigMetrics, performanceSvg } from '../packages/animation/rig.js';
import { ANIMATION_VERSION, PerformancePlanSchema, type PerformancePlan } from '../packages/animation/schemas.js';
import { actorProfile } from '../packages/actors/model.js';
import { ActorDefinitionSchema } from '../packages/actors/schemas.js';
const silence = {method:'segment-draft' as const,windowMs:20,intervals:[]};

export const profile = (kind: 'stick-man' | 'mini-robot' = 'stick-man') => HostProfileSchema.parse({
  id: 'lead', version: 1, kind, role: 'explainer-host', name: 'Lead', description: 'Character benchmark',
  appearance: { outline: '#172B36', shell: '#F5F3EC', screen: '#142A36', accent: '#27D8C5', badge: '#F6BD4F', headScale: 1, bodyScale: 1, strokeWidth: 7 },
  actions: ['idle', 'explain', 'point', 'operate-model', 'compare', 'summarize'], immutable: ['identity'],
  profileHash: 'fixture-profile', compilerVersion: 'fixture', sourcePath: 'fixture.md',
});

// Executes the real pinned GSAP/AttrPlugin. Plain attribute targets avoid pretending to test browser CSS.
function gsapProbe(js:string) {
  const targets=new Map<string, Record<string,unknown>>();
  const document={createElement:()=>({style:{}}),documentElement:{},querySelectorAll:(selector:string)=>{
    let target=targets.get(selector);
    if(!target){const attributes:Record<string,string>={};target={x:0,y:0,scaleY:1,rotation:0,opacity:1,getAttribute:(key:string)=>attributes[key]??'',setAttribute:(key:string,value:string)=>{attributes[key]=String(value);}};targets.set(selector,target);}
    return [target];
  }};
  const testWindow:Record<string,unknown>={document};
  const context=vm.createContext({window:testWindow,document,console,setTimeout:()=>0,clearTimeout:()=>{},Date});
  vm.runInContext(readFileSync(createRequire(import.meta.url).resolve('gsap/dist/gsap.js'),'utf8'),context);
  vm.runInContext(`var gsap=window.gsap;const tl=gsap.timeline({paused:true});${js};window.testTimeline=tl;gsap.ticker.sleep();`,context);
  const tl=context.window.testTimeline as {seek:(time:number,suppress:boolean)=>unknown};
  const attr=(id:string)=>(targets.get(`[data-composition-id="acting-benchmark"] #${id}`)?.getAttribute as (key:string)=>string)('transform');
  return {tl,attr};
}
const xy=(value:string)=>{const n=value.match(/-?\d+(?:\.\d+)?/g)!.map(Number);return {x:n[0]!,y:n[1]!,angle:n[2]!,scale:n[3]!};};
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const boneEnd=(value:string,length:number)=>{const p=xy(value),r=p.angle*Math.PI/180;return {x:p.x-Math.sin(r)*length*p.scale,y:p.y+Math.cos(r)*length*p.scale};};

// Rigside IDs describe image coordinates (-x left, +x right), not anatomy.
const elbowProfiles=(['stick-man','mini-robot'] as const).flatMap(kind=>{
  const host=profile(kind),actor=actorProfile(ActorDefinitionSchema.parse({id:`actor-${kind}`,name:'Researcher',role:'observes',kind,identity:'illustrative',
    sourceRefs:[{kind:'narration',segmentId:'cue',quote:'A researcher observes the model.'}],
    appearance:{...host.appearance,bodyScale:.9,headScale:1.1},costume:[{joint:'chest',svg:'<rect x="-20" y="-70" width="40" height="55" fill="#704020"/>'}]}));
  return [{label:kind,host},{label:`story-actor ${kind}`,host:actor}];
});
function elbowRestPlan(host:ReturnType<typeof profile>):PerformancePlan{
  return {...benchmarkPlan(host),durationMs:3200,walks:[],turns:[],gestures:[],expressions:[],gazes:[],props:[]};
}
function assertArmGeometry(transforms:Record<string,string>,host:ReturnType<typeof profile>,scale:number,tolerance:number){
  const m=rigMetrics(host);
  for(const side of ['left','right'] as const){
    const upper=transforms[`arm-${side}-upper`]!,lower=transforms[`arm-${side}-lower`]!,hand=transforms[`hand-${side}`]!;
    assert.ok(Math.abs(dist(xy(upper),xy(lower))-m.upperArm*scale)<tolerance,`${side} upper arm length changed`);
    assert.ok(Math.abs(dist(xy(lower),xy(hand))-m.lowerArm*scale)<tolerance,`${side} forearm length changed`);
    assert.ok(dist(boneEnd(upper,m.upperArm),xy(lower))<tolerance,`${side} elbow disconnected`);
    assert.ok(dist(boneEnd(lower,m.lowerArm),xy(hand))<tolerance,`${side} wrist disconnected`);
  }
}
function assertOutwardRest(transforms:Record<string,string>,scale:number){
  for(const side of ['left','right'] as const){
    const shoulder=xy(transforms[`arm-${side}-upper`]!),elbow=xy(transforms[`arm-${side}-lower`]!);
    assert.ok((side==='left'?-1:1)*(elbow.x-shoulder.x)>scale,`${side} rest elbow must be outside its shoulder`);
    assert.ok(elbow.y>shoulder.y,'rest elbow must remain below the shoulder');
  }
}
function retainElbowEvidence(label:string,action:string,data:unknown){
  const directory=process.env.OUTWARD_ELBOWS_TEST_EVIDENCE;if(!directory)return;
  mkdirSync(directory,{recursive:true});writeFileSync(path.join(directory,`${label.replaceAll(' ','-')}-${action}.json`),JSON.stringify(data,null,2));
}
for(const {label,host} of elbowProfiles)test(`${label}: idle rigside elbows open outward with fixed arm lengths in the actual GSAP bake`,()=>{
  const plan=elbowRestPlan(host),compiled=compilePerformance(plan,host,silence),probe=gsapProbe(compiled.js);
  assert.equal(compiled.report.compilerVersion,ANIMATION_VERSION);if(label.startsWith('story-actor'))assert.equal(host.role,'story-actor');
  const frames=[0,123.125,1600,3200].map(time=>samplePerformance(plan,host,time,silence));
  for(const frame of frames){assertOutwardRest(frame.transforms,plan.scale);assertArmGeometry(frame.transforms,host,plan.scale,.002);}
  for(const time of [3200,1600,123.125,0]){
    probe.tl.seek(time/1000,true);
    const transforms=Object.fromEntries(['left','right'].flatMap(side=>[`arm-${side}-upper`,`arm-${side}-lower`,`hand-${side}`]).map(id=>[id,probe.attr(id)]));
    assertOutwardRest(transforms,plan.scale);assertArmGeometry(transforms,host,plan.scale,.002);
  }
  retainElbowEvidence(label,'idle',{profile:host,plan,report:compiled.report,frames});
});
for(const {label,host} of elbowProfiles)for(const action of ['point','think','pick-place'] as const)test(`${label}: idle to ${action} and back preserves elbows, contacts and reverse GSAP seek without jumps`,t=>{
  const plan=elbowRestPlan(host),m=rigMetrics(host),s=plan.scale;
  const target={x:plan.root.x+(m.shoulderOffset+60)*s,y:plan.root.y+(m.shoulderY+35)*s},destination={x:target.x-25*s,y:target.y+10*s};
  plan.gestures=[{id:'outward-transition',action,startMs:600,endMs:2600,target:action==='think'?{x:1000,y:250}:target,
    ...(action==='pick-place'?{contactMs:1100,releaseMs:2200,propId:'sample',destination}:{})}];
  if(action==='pick-place')plan.props=[{id:'sample',origin:target,destination}];
  const compiled=compilePerformance(plan,host,silence),probe=gsapProbe(compiled.js);
  const diagnostics={profile:host,plan,report:compiled.report,maxStep:0,maxStepTime:0,maxBoundaryJump:0,maxBakedStep:0,
    frames:[0,600,640,680,1100,2200,2441,2441.5,2442,2453,2454,2560,2600,3000].map(time=>samplePerformance(plan,host,time,silence))};
  t.after(()=>retainElbowEvidence(label,action,diagnostics));
  assert.ok(compiled.report.maxContactError<1);assert.ok(compiled.report.maxInterpolationGapPx<=.2);
  let maxStep=0;
  for(let time=500;time<=2700;time++){
    const frame=samplePerformance(plan,host,time,silence),next=samplePerformance(plan,host,time+1,silence);
    assertArmGeometry(frame.transforms,host,s,.002);
    for(const id of ['arm-left-lower','arm-right-lower','hand-right']){
      const step=dist(xy(frame.transforms[id]!),xy(next.transforms[id]!));if(step>maxStep){maxStep=step;diagnostics.maxStepTime=time;}
    }
    if(time<600||time>=2600)assertOutwardRest(frame.transforms,s);
  }
  diagnostics.maxStep=maxStep;assert.ok(maxStep<4*s,`1ms elbow/hand step jumps ${maxStep}px`);
  // Dense +/- epsilon probes cover every approach/recovery instant without
  // copying the compiler's private pole-switch schedule into the test.
  let maxBoundaryJump=0;
  for(let time=600;time<=2600;time+=.5){
    const before=samplePerformance(plan,host,time-.001,silence),after=samplePerformance(plan,host,time+.001,silence);
    maxBoundaryJump=Math.max(maxBoundaryJump,dist(xy(before.transforms['arm-right-lower']!),xy(after.transforms['arm-right-lower']!)));
  }
  diagnostics.maxBoundaryJump=maxBoundaryJump;assert.ok(maxBoundaryJump<.05*s,`epsilon elbow discontinuity ${maxBoundaryJump}px`);
  if(action==='pick-place'){
    for(const time of [1100,1500.125,2199.999]){
      const frame=samplePerformance(plan,host,time,silence);assert.equal(frame.props.sample!.attached,true);
      assert.ok(dist(frame.props.sample!.point,frame.hands.right)<.001);assert.ok(frame.contactError<.001);
      probe.tl.seek(time/1000,true);assert.ok(dist(xy(probe.attr('prop-sample')),xy(probe.attr('hand-right')))<.002);
    }
    assert.ok(dist(samplePerformance(plan,host,1100,silence).hands.right,target)<.001);
    const released=samplePerformance(plan,host,2200,silence);assert.equal(released.props.sample!.attached,false);assert.deepEqual(released.props.sample!.point,destination);
  }
  const ids=['arm-left-upper','arm-left-lower','hand-left','arm-right-upper','arm-right-lower','hand-right'];
  const baked=(time:number)=>{probe.tl.seek(time/1000,true);return Object.fromEntries(ids.map(id=>[id,probe.attr(id)]));};
  let previous=baked(500),maxBakedStep=0;
  for(let time=502.5;time<=2700;time+=2.5){
    const current=baked(time);assertArmGeometry(current,host,s,.21);
    maxBakedStep=Math.max(maxBakedStep,dist(xy(previous['arm-right-lower']!),xy(current['arm-right-lower']!)));previous=current;
  }
  diagnostics.maxBakedStep=maxBakedStep;assert.ok(maxBakedStep<8*s,`2.5ms baked elbow step jumps ${maxBakedStep}px`);
  const times=[0,599.999,600,620.125,640,680,900.75,1100,2199.999,2200,2520,2560,2600,3000,3200];
  const forward=times.map(baked),reverse=times.slice().reverse().map(baked).reverse();
  for(let i=0;i<times.length;i++)for(const id of ids){
    const a=xy(forward[i]![id]!),b=xy(reverse[i]![id]!);assert.ok(dist(a,b)<.001,'reverse seek changes a joint');assert.ok(Math.abs(a.angle-b.angle)<.001,'reverse seek changes a bone angle');
  }
  assertOutwardRest(baked(0),s);assertOutwardRest(baked(3000),s);
  const idle=samplePerformance(plan,host,0,silence),settled=samplePerformance(plan,host,3000,silence);
  assert.deepEqual(ids.map(id=>idle.transforms[id]),ids.map(id=>settled.transforms[id]),'settled arms must return to the exact idle pose');
  retainElbowEvidence(label,action,{profile:host,plan,report:compiled.report,maxStep,maxBoundaryJump,maxBakedStep,frames:times.map(time=>samplePerformance(plan,host,time,silence)),forward,reverse});
});

for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: emitted thinking bones stay connected between bake frames around an angular wrap`,()=>{
  const host=profile(kind),plan=carryBenchmarkPlan(host),probe=gsapProbe(compilePerformance(plan,host,silence).js),m=rigMetrics(host);
  for(let ms=2300.75;ms<2430;ms+=2.5){
    probe.tl.seek(ms/1000,true);
    assert.ok(dist(boneEnd(probe.attr('arm-right-upper'),m.upperArm),xy(probe.attr('arm-right-lower')))<1,`elbow opens at ${ms}ms`);
    assert.ok(dist(boneEnd(probe.attr('arm-right-lower'),m.lowerArm),xy(probe.attr('hand-right')))<1,`wrist opens at ${ms}ms`);
  }
});
for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: carry benchmark actually lifts clear of the source support and lowers to the destination`,()=>{
  const host=profile(kind),plan=carryBenchmarkPlan(host);
  const pickup=samplePerformance(plan,host,3800,silence).props.sample!.point,lifted=samplePerformance(plan,host,4050,silence).props.sample!.point;
  assert.ok(lifted.y<pickup.y-20*plan.scale,'the prop must move upward and clear its tabletop');
  const lowering=samplePerformance(plan,host,8550,silence).props.sample!.point,placed=samplePerformance(plan,host,8800,silence).props.sample!.point;
  assert.ok(placed.y>lowering.y+20*plan.scale,'the placement phase must move downward toward the support');
});
for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: neck contributes visible pixels outside the filled head in changing poses`,async()=>{
  const host=profile(kind),plan=carryBenchmarkPlan(host);
  for(const t of [0,700,2500,5600,9400]){
    const frame=samplePerformance(plan,host,t,silence);
    let rig=performanceSvg(host);
    for(const [id,transform] of Object.entries(frame.transforms))rig=rig.replace(`<g id="${id}">`,`<g id="${id}" transform="${transform}">`);
    const without=rig.replace(/<g id="neck"[^>]*><path[^>]*\/><\/g>/,'');
    const render=(body:string)=>sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">${body}</svg>`)).ensureAlpha().raw().toBuffer();
    const [a,b]=await Promise.all([render(rig),render(without)]);
    assert.ok(a.some((value,i)=>value!==b[i]),`neck is completely hidden at ${t}ms`);
  }
});
test('animation rejects nonfinite stage dimensions before compilation',()=>{
  const host=profile(),plan=benchmarkPlan(host);
  for(const axis of ['width','height'] as const)assert.throws(()=>compilePerformance({...plan,stage:{...plan.stage,[axis]:JSON.parse('1e999')}},host,silence),/finite|Infinity/i);
});

for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: approved large heads retain a visible neck above the torso`,()=>{
  const host=profile(kind);host.appearance.headScale=1.25;host.appearance.bodyScale=.75;
  const plan=benchmarkPlan(host);
  for(const time of [0,700,2500,5600,9400]){
    const frame=samplePerformance(plan,host,time,silence),neck=frame.transforms.neck!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const end={x:neck[0]!-Math.sin(neck[2]!*Math.PI/180)*neck[4]!,y:neck[1]!+Math.cos(neck[2]!*Math.PI/180)*neck[4]!};
    assert.ok(neck[4]!>=10*host.appearance.bodyScale*plan.scale-.001,'large head covers or reverses the neck');
    assert.ok(dist(end,boneEnd(frame.transforms.head!,(kind==='mini-robot'?42:40)))<.005,'neck must meet the head rim');
    assert.ok(end.y<neck[1]!-1,'neck must extend above the torso rather than into it');
  }
});

function carryPlan(host:ReturnType<typeof profile>):PerformancePlan {
  const base=benchmarkPlan(host),m=rigMetrics(host),s=base.scale;
  const source={x:base.root.x+(m.shoulderOffset+50)*s,y:base.root.y+(m.shoulderY+35)*s};
  const destination={...source,x:source.x+110};
  return {...base,turns:[],walks:[{startMs:2200,endMs:5400,fromX:base.root.x,toX:base.root.x+110}],
    gestures:[{id:'transport',action:'carry',startMs:1000,endMs:8000,contactMs:1600,releaseMs:7500,target:source,destination,propId:'sample',carryOffset:{x:50,y:35}}],
    props:[{id:'sample',origin:{x:source.x-8*s,y:source.y-4*s},gripOffset:{x:8,y:4},destination}],
    expressions:[],gazes:[] } as PerformancePlan;
}

for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: carry holds the grip during walking and places it without a seek or release jump`,()=>{
  const host=profile(kind),plan=carryPlan(host);
  const compiled=compilePerformance(plan,host,silence),probe=gsapProbe(compiled.js);
  assert.ok(compiled.report.selectedClips.includes('carry'));
  for(const t of [1600,2200,2500.125,4000.75,5399,5400,7499.999]){
    const f=samplePerformance(plan,host,t,silence),prop=f.props.sample!;
    assert.equal(prop.attached,true);
    assert.ok(dist({x:prop.point.x+8*plan.scale,y:prop.point.y+4*plan.scale},f.hands.right)<.001);
    probe.tl.seek(t/1000,true);
    assert.ok(dist({x:xy(probe.attr('prop-sample')).x+8*plan.scale,y:xy(probe.attr('prop-sample')).y+4*plan.scale},xy(probe.attr('hand-right')))<.002,'baked attachment slips off the hand');
  }
  const before=samplePerformance(plan,host,7499.999,silence),after=samplePerformance(plan,host,7500,silence);
  assert.ok(dist(before.hands.right,after.hands.right)<.001);
  assert.equal(after.props.sample!.attached,false);
  assert.ok(dist(after.props.sample!.point,{x:plan.gestures[0]!.destination!.x-8*plan.scale,y:plan.gestures[0]!.destination!.y-4*plan.scale})<.001);
  const times=[0,1600,4000,7500,8000,10000];
  assert.deepEqual(times.map(t=>samplePerformance(plan,host,t,silence)),[...times].reverse().map(t=>samplePerformance(plan,host,t,silence)).reverse());
  const bad=structuredClone(plan);bad.walks[0]!.startMs=1500;
  assert.throws(()=>compilePerformance(bad,host,silence),/carry.*lift|carry.*window/i);
});

for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: a visible neck connects the moving torso to the head rim`,()=>{
  const host=profile(kind),plan=benchmarkPlan(host);
  assert.match(performanceSvg(host),/id="neck"/);
  for(const t of [0,800,3800,6200,9200]){
    const f=samplePerformance(plan,host,t,silence),neck=f.transforms.neck;
    assert.ok(neck,'neck transform missing');
    const head=xy(f.transforms.head!),numbers=neck.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const angle=numbers[2]!*Math.PI/180,length=numbers[4]!;
    const end={x:numbers[0]!-Math.sin(angle)*length,y:numbers[1]!+Math.cos(angle)*length};
    const bottom=(kind==='mini-robot'?42:40)*head.scale,headAngle=head.angle*Math.PI/180;
    assert.ok(dist(end,{x:head.x-Math.sin(headAngle)*bottom,y:head.y+Math.cos(headAngle)*bottom})<.005,'neck does not reach the head rim');
  }
});

for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: carried props and hand pose survive a scene cut without replaying pickup`,()=>{
  const host=profile(kind),first=carryPlan(host),g=first.gestures[0]!;
  first.durationMs=6500;g.endMs=6500;delete g.releaseMs;delete g.destination;
  const outgoing=compilePerformance(first,host,silence).frames.at(-1)!;
  assert.equal(outgoing.props.sample!.attached,true);
  const next:PerformancePlan={...first,root:outgoing.root,walks:[],durationMs:2500,
    gestures:[{...g,startMs:0,contactMs:0,releaseMs:1800,endMs:2300,target:outgoing.hands.right,destination:{...outgoing.hands.right,y:outgoing.hands.right.y+20}}],
    props:[{...first.props[0]!,origin:outgoing.props.sample!.point,attachedTo:'right-hand'}]};
  const incoming=compilePerformance(next,host,silence).frames[0]!;
  assert.ok(dist(outgoing.hands.right,incoming.hands.right)<.001,'hand drops to neutral at the cut');
  assert.ok(dist(outgoing.props.sample!.point,incoming.props.sample!.point)<.001,'prop jumps between scenes');
  const broken=structuredClone(next);broken.props[0]!.origin.x+=30;
  assert.throws(()=>compilePerformance(broken,host,silence),/grip anchor|entry grip/i);
});

// A think cue with a distant explanatory target must not become a pointing reach.
for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: thinking keeps the hand at the chin while gazing at the explanatory target`,()=>{
  const host=profile(kind),plan=benchmarkPlan(host);plan.walks=[];plan.gazes=[];plan.props=[];
  plan.expressions=[{startMs:0,endMs:3000,mood:'thinking'}];
  const target={x:1100,y:250};
  plan.gestures=[{id:'thought',action:'think',startMs:200,endMs:2600,target}];
  const frame=samplePerformance(plan,host,1000,silence),head=xy(frame.transforms.head!);
  assert.ok(dist(frame.hands.right,head)<60*plan.scale,`thinking hand is ${dist(frame.hands.right,head).toFixed(2)}px from the head`);
  assert.ok(frame.hands.right.y>head.y,'the thoughtful hand belongs below the face');
  assert.ok(frame.face['eye-right']!.x!>2,'eyes should retain attention toward the distant target');
  assert.deepEqual(frame.hands.right,samplePerformance({...plan,gestures:[{...plan.gestures[0]!,target:{x:0,y:250}}]},host,1000,silence).hands.right,'changing attention must not move the chin pose');
  const pointing=samplePerformance({...plan,gestures:[{...plan.gestures[0]!,action:'point'}]},host,1000,silence);
  assert.ok(dist(pointing.hands.right,frame.hands.right)>50*plan.scale,'point must remain distinct from think');
});

function turnPlan(host:ReturnType<typeof profile>):PerformancePlan & {
  facing?:'front'|'left'|'right';turns?:Array<{startMs:number;endMs:number;direction:'front'|'left'|'right'}>;
} {
  return {...benchmarkPlan(host),gestures:[],expressions:[],gazes:[],props:[],
    turns:[{startMs:3500,endMs:4400,direction:'right'},{startMs:5400,endMs:6300,direction:'left'},
      {startMs:7500,endMs:8400,direction:'front'}]};
}

// A stationary turn must change the authored face/body geometry without moving its support feet.
for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: stationary turns respond in three-quarter face and body with fixed bones and grounded feet`,()=>{
  const host=profile(kind),plan=turnPlan(host),m=rigMetrics(host),front=samplePerformance(plan,host,3400,silence);
  const right=samplePerformance(plan,host,4400,silence),left=samplePerformance(plan,host,6300,silence);
  assert.notEqual(right.transforms.head,front.transforms.head,'head must respond to explicit turn direction');
  assert.notEqual(right.transforms.chest,front.transforms.chest,'chest must respond to explicit turn direction');
  const rightFace=xy(right.transforms['face-orientation']!),leftFace=xy(left.transforms['face-orientation']!);
  assert.ok(rightFace.x>0&&leftFace.x<0,'facial features must orient to the requested side');
  assert.ok(rightFace.scale>.8&&rightFace.scale<1,'three-quarter face needs bounded projection');
  for(let t=3400;t<=8500;t+=25){
    const frame=samplePerformance(plan,host,t,silence);
    assert.deepEqual(frame.root,front.root);assert.deepEqual(frame.feet,front.feet);assert.deepEqual(frame.stance,{left:true,right:true});
    for(const side of ['left','right'] as const){
      for(const [part,upper,lower,end] of [['leg',m.upperLeg,m.lowerLeg,frame.feet[side]],['arm',m.upperArm,m.lowerArm,frame.hands[side]]] as const){
        const a=xy(frame.transforms[`${part}-${side}-upper`]!),b=xy(frame.transforms[`${part}-${side}-lower`]!);
        assert.ok(Math.abs(dist(a,b)-upper*plan.scale)<.002,'upper bone length changed');
        assert.ok(Math.abs(dist(b,end)-lower*plan.scale)<.002,'lower bone length changed');
        assert.ok(dist(boneEnd(frame.transforms[`${part}-${side}-lower`]!,lower),end)<.002,'bone endpoint disconnected');
      }
    }
  }
  assert.deepEqual(samplePerformance(plan,host,8500,silence).transforms,front.transforms,'front-facing exit must settle back to the authored pose');
});

// Discrete mirroring and stateful turning would break boundary, reverse, and batch sampling.
for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: turn boundaries and emitted interpolation remain continuous under reverse seek`,()=>{
  const host=profile(kind),plan=turnPlan(host);
  assert.doesNotThrow(()=>compilePerformance(plan,host,silence),'optional turn data must be accepted by the existing compiler');
  const compiled=compilePerformance(plan,host,silence),probe=gsapProbe(compiled.js);
  assert.deepEqual(validateSceneScript(`const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines[${JSON.stringify(plan.id)}]=tl;${compiled.js}`,plan.id),[]);
  for(const t of [3500,4400,5400,6300,7500,8400])for(const id of ['head','chest','arm-right-lower','face-orientation']){
    assert.ok(dist(xy(samplePerformance(plan,host,t-.001,silence).transforms[id]!),xy(samplePerformance(plan,host,t+.001,silence).transforms[id]!))<.01,`${id} snaps at ${t}`);
  }
  const feet=samplePerformance(plan,host,3400,silence).feet;
  for(const t of [6300,5800.125,5400,4050.667,4400,3500,3680.55,0]){
    probe.tl.seek(t/1000,true);
    if(t>=3400)for(const side of ['left','right'] as const){
      assert.ok(dist(xy(probe.attr(`foot-${side}`)),feet[side])<.001,'emitted turn loses ground contact');
    }
    assert.ok(xy(probe.attr('head')).scale>0,'head mirror snapped');
    if(compiled.frames.some(f=>f.timeMs===t))assert.equal(probe.attr('head'),samplePerformance(plan,host,t,silence).transforms.head);
  }
  const times=[0,3500,3811,4400,5755,6300,7900,8400,10000];
  assert.deepEqual(times.map(t=>samplePerformance(plan,host,t,silence)),times.slice().reverse().map(t=>samplePerformance(plan,host,t,silence)).reverse());
  assert.deepEqual(samplePerformance({...plan,turns:plan.turns!.slice().reverse()},host,5900,silence),samplePerformance(plan,host,5900,silence));
});

test('stationary turn contract is optional and rejects ownership conflicts and undersized windows',()=>{
  const host=profile(),legacy:PerformancePlan=benchmarkPlan(host);
  assert.doesNotThrow(()=>PerformancePlanSchema.parse(legacy));
  const plan=turnPlan(host);
  assert.doesNotThrow(()=>validatePerformance(plan,host),'stationary turns should be a valid optional input');
  assert.throws(()=>validatePerformance({...plan,turns:[{startMs:500,endMs:1000,direction:'right'}]},host),/turn.*walk|turn.*locomotion/i);
  assert.throws(()=>validatePerformance({...plan,turns:[{startMs:3500,endMs:3600,direction:'right'}]},host),/turn.*280|turn.*window/i);
  assert.throws(()=>validatePerformance({...plan,turns:[{startMs:3500,endMs:4200,direction:'right'},{startMs:4000,endMs:4500,direction:'left'}]},host),/overlapping/i);
  const contact=benchmarkPlan(host);
  assert.throws(()=>validatePerformance({...contact,turns:[{startMs:4800,endMs:5600,direction:'left'}]},host),/turn.*contact|turn.*attach/i);
  assert.doesNotThrow(()=>validatePerformance({...plan,facing:'left',turns:[]},host));
});

test('fresh time-zero and reverse time-zero initialize the same authored pose',()=>{
  const host=profile(),c=compilePerformance(benchmarkPlan(host),host,silence),probe=gsapProbe(c.js);
  probe.tl.seek(0,true);assert.equal(probe.attr('head'),c.frames[0]!.transforms.head);
  probe.tl.seek(10,true);probe.tl.seek(0,true);assert.equal(probe.attr('head'),c.frames[0]!.transforms.head);
});
for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: browser interpolation keeps the foot planted immediately after landing`,()=>{
  const host=profile(kind),plan=benchmarkPlan(host),probe=gsapProbe(compilePerformance(plan,host,silence).js);
  const times=kind==='stick-man'?[889,895,899]:[1086,1090,1099];
  for(const time of times){
    const f=samplePerformance(plan,host,time,silence);assert.equal(f.stance.right,true);
    probe.tl.seek(time/1000,true);assert.ok(dist(xy(probe.attr('foot-right')),f.feet.right)<.01,`planted foot drifts at ${time}`);
  }
});
for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: walk entry is continuous and emitted bone joins remain connected between samples`,()=>{
  const host=profile(kind),plan=benchmarkPlan(host),m=rigMetrics(host);
  for(let t=200;t<234;t++)assert.ok(dist(xy(samplePerformance(plan,host,t,silence).transforms['leg-left-lower']!),xy(samplePerformance(plan,host,t+1,silence).transforms['leg-left-lower']!))<1,'knee jumps at walk entry');
  const probe=gsapProbe(compilePerformance(plan,host,silence).js);probe.tl.seek(.216667,true);
  for(const side of ['left','right']){
    assert.ok(dist(boneEnd(probe.attr(`leg-${side}-upper`),m.upperLeg),xy(probe.attr(`leg-${side}-lower`)))<1,'thigh/knee disconnect');
    assert.ok(dist(boneEnd(probe.attr(`leg-${side}-lower`),m.lowerLeg),xy(probe.attr(`foot-${side}`)))<1,'shin/foot disconnect');
  }
});
test('a pickup must contact the prop current grip anchor',()=>{
  const host=profile(),plan=benchmarkPlan(host);plan.gestures[1]!.target!.x-=25;
  assert.throws(()=>compilePerformance(plan,host,silence),/prop.*anchor/i);
});
test('operate requires room for actual contact, hold and recovery',()=>{
  const host=profile(),plan=benchmarkPlan(host);plan.gestures=[{id:'late',action:'operate',startMs:4000,endMs:5000,contactMs:4950,target:plan.props[0]!.origin}];
  assert.throws(()=>compilePerformance(plan,host,silence),/contact.*schedule/i);
});
test('release-relative recovery never snaps the hand away',()=>{
  const host=profile(),plan=benchmarkPlan(host);plan.gestures[1]!.releaseMs=7650;
  const a=samplePerformance(plan,host,7649.999,silence),b=samplePerformance(plan,host,7650,silence);
  assert.ok(dist(a.hands.right,b.hands.right)<.01,`release jumps ${dist(a.hands.right,b.hands.right)}`);
});
test('repeated prop transitions use chronological order and release detaches',()=>{
  const host=profile(),plan=benchmarkPlan(host),first=plan.gestures[1]!;
  const later={...first,id:'later',startMs:8000,contactMs:8400,releaseMs:9500,endMs:9900,target:first.destination!,destination:first.target!};
  plan.gestures=[later,first];const sorted={...plan,gestures:[first,later]};
  assert.deepEqual(samplePerformance(plan,host,9000,silence).props,samplePerformance(sorted,host,9000,silence).props);
  assert.equal(samplePerformance(plan,host,9600,silence).props.sample!.attached,false);
});
test('short audio intervals are baked and speech preserves the mood mouth',()=>{
  const host=profile(),plan=benchmarkPlan(host),activity={...silence,intervals:[{startMs:9010,endMs:9030,level:.8}]};
  const compiled=compilePerformance(plan,host,activity);
  assert.ok(compiled.frames.some(f=>f.timeMs>=9010&&f.timeMs<9030&&f.face['mouth-talk']!.scaleY!>1));
  assert.equal(samplePerformance(plan,host,9020,activity).face['mouth-smile']!.opacity,samplePerformance(plan,host,9020,silence).face['mouth-smile']!.opacity);
});
test('gaze blends at target changes instead of jumping',()=>{
  const host=profile(),plan=benchmarkPlan(host);
  for(const t of [3450,3500,5200,7400]){
    const a=samplePerformance(plan,host,t-.01,silence).face['eye-right']!,b=samplePerformance(plan,host,t+.01,silence).face['eye-right']!;
    assert.ok(Math.hypot(a.x!-b.x!,a.y!-b.y!)<.01,`gaze jumps at ${t}`);
  }
});
test('static host poses preserve gaze with shared face layers',()=>{
  for(const kind of ['stick-man','mini-robot'] as const)assert.match(hostSvg(profile(kind),'point'),/id="eye-right" transform="translate\(5 0\)"/);
});
test('only finite SVG transform numbers and valid operation arities are accepted',()=>{
  for(const value of ['translate(e)','rotate(1 2)','translate(1,2,3)','scale(1e999)']){
    const js=`const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines["x"]=tl;tl.set('[data-composition-id="x"] #head',{attr:{transform:${JSON.stringify(value)}}},0);`;
    assert.ok(validateSceneScript(js,'x').length>0,`accepted ${value}`);
  }
});

test('fixed-length chains solve world-space contact and reject unreachable targets',()=>{
  const start={x:30,y:40},target={x:75,y:93};const c=solveChain(start,target,55,50);
  assert.ok(Math.abs(Math.hypot(c.joint.x-start.x,c.joint.y-start.y)-55)<1e-6);
  assert.ok(Math.abs(Math.hypot(c.end.x-c.joint.x,c.end.y-c.joint.y)-50)<1e-6);
  assert.ok(c.error<1e-5);assert.equal(solveChain(start,{x:300,y:40},55,50).reachable,false);
});

for(const kind of ['stick-man','mini-robot'] as const)test(`${kind}: compiler preserves stance, contact, identity and random-access states`,()=>{
  const host=profile(kind),plan=benchmarkPlan(host);const compiled=compilePerformance(plan,host,silence);
  const frames=compiled.frames;
  for(let i=1;i<frames.length;i++)for(const side of ['left','right'] as const){
    const a=frames[i-1]!,b=frames[i]!;
    if(a.stance[side]&&b.stance[side])assert.ok(Math.hypot(a.feet[side].x-b.feet[side].x,a.feet[side].y-b.feet[side].y)<.01,`stance drift at ${b.timeMs}`);
  }
  const at=samplePerformance(plan,host,plan.gestures[1]!.contactMs!,silence);
  assert.ok(Math.hypot(at.hands.right.x-plan.props[0]!.origin.x,at.hands.right.y-plan.props[0]!.origin.y)<1);
  for(const t of [5100,6000,7000]){
    const f=samplePerformance(plan,host,t,silence);assert.equal(f.props.sample!.attached,true);
    assert.deepEqual(f.props.sample!.point,f.hands.right);
  }
  assert.deepEqual(samplePerformance(plan,host,7350,silence).props.sample!.point,plan.props[0]!.destination);
  const forward=[0,2200,6000,9000].map(t=>samplePerformance(plan,host,t,silence));
  const reverse=[9000,6000,2200,0].map(t=>samplePerformance(plan,host,t,silence)).reverse();assert.deepEqual(forward,reverse);
  const wrapped=`const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines["${plan.id}"]=tl;${compiled.js}`;
  assert.deepEqual(validateSceneScript(wrapped,plan.id),[]);
  const bad=structuredClone(plan);bad.gestures[1]!.target={x:1100,y:50};bad.props[0]!.origin=bad.gestures[1]!.target!;assert.throws(()=>compilePerformance(bad,host,silence),/cannot reach/);
  const overlapping=structuredClone(plan);overlapping.gestures[1]!.startMs=4000;assert.throws(()=>validatePerformance(overlapping,host),/overlapping/);
});

test('mood and audio activity coexist and risky AttrPlugin fields remain forbidden',()=>{
  const host=profile(),plan=benchmarkPlan(host),activity={...silence,intervals:[{startMs:9000,endMs:9200,level:.8}]};
  const talking=samplePerformance(plan,host,9100,activity),rest=samplePerformance(plan,host,9300,activity);
  assert.equal(talking.mood,'understanding');assert.ok(talking.face['mouth-talk']!.scaleY!>1);
  assert.equal(rest.face['mouth-talk']!.scaleY,.2);assert.ok(rest.face['mouth-smile']!.opacity!>.5);
  const script='const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines["x"]=tl;tl.set("[data-composition-id=\\"x\\"] #head",{attr:{href:"https://example.com"}},0);';
  assert.ok(validateSceneScript(script,'x').length>0);
});

test('both host rigs have independent expression layers rather than only a talking oval', () => {
  for (const kind of ['stick-man', 'mini-robot'] as const) {
    const svg = hostSvg(profile(kind));
    for (const part of ['brow-left', 'brow-right', 'lid-left', 'lid-right', 'mouth-smile', 'mouth-round', 'mouth-talk']) {
      assert.ok(svg.includes(`id="${part}"`), `${kind} is missing ${part}`);
    }
  }
});
