// DECLARED / NOT RUN. Only the user's tester invokes these callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {buildProjectedRelationTrack,createProjectedRelationSampler,projectedCurvePoint,type RelationCurve} from '../packages/director/projected-relation-track.js';
import {projectedModelGeometry,projectedModelEdge} from '../packages/director/projected-model-geometry.js';
import {contactMatrixPoint,createContactMotionSampler,modelContactSlice} from '../packages/director/model-contact-motion.js';
import {svgLinearNumber,emittedTransformTrack} from '../packages/animation/svg-transform-track.js';
import {renderProjectedRelation} from '../library/shots/projected-relations.js';
import {cinematicRelations} from '../library/shots/cinematic-models.js';
import {projectedContactFixture} from './helpers/projected-contact-fixture.js';
import {projectSourceWorldEvents} from '../packages/director/source-world-projection.js';
import {sourceActor} from '../packages/director/source-actor.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {compilePerformance} from '../packages/animation/compiler.js';
import type {ActorCompilations} from '../packages/director/source-spear-emitted.js';
import type {Shot} from '../packages/core/schemas.js';
import {OWNERSHIP_RENDER_VERSION,type CompiledOwnership} from '../packages/director/ownership-compile.js';
import type {SourceOwnership} from '../packages/director/source-ownership-schemas.js';

function curve(x:number):RelationCurve{return {start:{x,y:10},control:{x:x+40,y:-20},end:{x:x+80,y:20},arrow:[{x:x+80,y:20},{x:x+70,y:10},{x:x+70,y:30}]};}
function fixture(){
  const f=projectedContactFixture(),ref=f.board.shots[0]!.sourceRefs![0]!;
  for(const s of f.board.shots){
    s.visualization!.parts.push({id:'emitter',label:'emitter',kind:'object',x:.12,y:.22,width:.08,height:.1,sourceRefs:[ref]});
    s.cinematic!.models.push({partId:'emitter',variant:'conceptual',sourceRefs:[ref]});
    const art=s.cinematic!.artDirection!.models[0]!;art.contactFrame!.anchors.center={x:.6,y:.55};
    s.cinematic!.artDirection!.models.push({...structuredClone(art),partId:'emitter'});
    s.visualization!.relations=[{from:'emitter',to:'target',kind:'transfer',sourceRefs:[ref]}];
    s.cinematic!.sourceWorld!.events.push({id:'original-flow',type:'flow',targetId:'emitter',relationTo:'target',startMs:1200,endMs:3800,narrationAnchor:'cue',contactRequired:false,motion:'none',sourceRefs:[ref]},
      {id:'target-pulse',type:'part-motion',targetId:'target',startMs:500,endMs:3000,narrationAnchor:'cue',contactRequired:false,motion:'pulse',sourceRefs:[ref]});
    s.visualization!.events=projectSourceWorldEvents(s.cinematic!.sourceWorld!,s.startMs,s.endMs);
  }
  return f;
}
function supplied(f:ReturnType<typeof fixture>,s:Shot):ActorCompilations{
  const c=s.cinematic!,ids=[c.actorScene!.primary!.id,...c.actorScene!.supporting.map(a=>a.character.id)];
  return new Map(ids.map(id=>{const o=sourceActor(s,id);return [id,compilePerformance(o.performance,actorProfile(o.character),{method:'segment-draft',windowMs:20,intervals:[]},c.actorScene!.primary!.id===id?'':`actor-${id}-`,undefined,actorViewActingClock(f.board,s,id))];}));
}
function callData(line:string){const m=line.match(/^tl\.(set|to)\(("(?:\\.|[^"\\])*"),(\{.*\}),([^,]+)\);$/);assert.ok(m);return {method:m[1],selector:JSON.parse(m[2]!) as string,vars:JSON.parse(m[3]!) as {attr?:{d?:string;transform?:string};opacity?:number;duration?:number},at:Number(m[4])};}

test('retained adaptive intervals meet finite probes and never report rejected coarse gaps as accepted',()=>{
  const track=buildProjectedRelationTrack([0,1000],t=>curve(100*Math.sin(t/1000*Math.PI)));
  assert.ok(track.frames.length>2);assert.ok(track.maxMeasuredGapPx<=.2);assert.equal(track.continuousGeometryVerified,false);assert.equal(track.motionVerified,false);assert.equal(track.productionApproval,false);
  const sample=createProjectedRelationSampler(track);
  for(const [i,b] of track.frames.entries()){if(!i)continue;const a=track.frames[i-1]!;for(const u of [.17,.5,.83]){
    const t=a.timeMs+(b.timeMs-a.timeMs)*u,p=sample.at(t).start;assert.ok(Math.hypot(p.x-100*Math.sin(t/1000*Math.PI),p.y-10)<=.2);
  }}
});
test('private relation snapshots retain exact endpoints, fractional/reverse seeks and four-decimal complex interpolation',()=>{
  const track=buildProjectedRelationTrack([0,1000],t=>curve(t/1000)),sample=createProjectedRelationSampler(track),before=sample.at(123.456);
  assert.equal(before.start.x,svgLinearNumber(0,1,.123456));assert.deepEqual(sample.at(0),curve(0));assert.deepEqual(sample.at(1000),curve(1));
  track.frames[0]!.curve.start.x=999;before.start.x=999;sample.times[0]=999;
  for(const t of [999.375,1.125,800,123.456])assert.equal(sample.at(t).start.x,svgLinearNumber(0,1,t/1000));
  for(const t of [-1,1001,NaN])assert.throws(()=>sample.at(t),/clamp/);
});
test('bad clocks, nonfinite vertices, malformed metadata and an unresolved step fail instead of truncating or loosening tolerance',()=>{
  for(const clock of [[1,1000],[0,0,1000],[0,NaN,1000],[0,1000,500],Array(2),Array.from({length:12001},(_,i)=>i)])assert.throws(()=>buildProjectedRelationTrack(clock,t=>curve(t)),/needs-source-prop-binding/);
  assert.throws(()=>buildProjectedRelationTrack([0,1000],()=>curve(Infinity)),/finite/);
  assert.throws(()=>buildProjectedRelationTrack([0,1000],t=>curve(t<500?0:100)),/limit/);
  const t=buildProjectedRelationTrack([0,1000],()=>curve(0));t.frames[0]!.curve.control.x++;
  assert.throws(()=>createProjectedRelationSampler(t),/snapshot/);
  assert.throws(()=>projectedCurvePoint(curve(0),1.01),/clamped/);
});
test('contact sampler snapshots matrices once and cannot be changed through caller frames or returned points',()=>{
  const f=fixture(),s=f.board.shots[1]!,slice=modelContactSlice(s,'target'),sample=createContactMotionSampler(slice.frames),old=sample.at(137.875);
  slice.frames[0]!.matrix[0]=999;const result=sample.at(137.875);result.matrix[0]=999;sample.times[0]=999;
  assert.deepEqual(sample.at(137.875),old);assert.throws(()=>sample.at(-.1),/clamp/);
});
test('fixed projected centers and declared edge points follow the actual whole matrix rather than the old part center',()=>{
  const f=fixture(),s=f.board.shots[1]!,geometry=projectedModelGeometry(s,f.board,f.narration,supplied(f,s)),part=s.visualization!.parts.find(p=>p.id==='target')!,w=part.width*s.cinematic!.performance.stage.width,h=part.height*s.cinematic!.performance.stage.height;
  const at=137.875,state=createContactMotionSampler(modelContactSlice(s,'target').frames).at(at),p=contactMatrixPoint(state.matrix,{x:.1*w,y:.05*h}),shape=geometry.at('target',at);
  assert.ok(Math.hypot(shape.center.x-part.x*s.cinematic!.performance.stage.width-p.x,shape.center.y-part.y*s.cinematic!.performance.stage.height-p.y)<1e-8);
  const edge=projectedModelEdge(shape,geometry.at('emitter',at).center);assert.ok(Number.isFinite(edge.x)&&Number.isFinite(edge.y));assert.notDeepEqual(shape.center,geometry.at('target',0).center);
  assert.throws(()=>projectedModelEdge(shape,shape.center),/coincident/);
  assert.throws(()=>geometry.at('target',-1),/clamp/);
});
test('both own-actor parent channels retain exact emitted shaft rotation/scale through primary swaps',()=>{
  const f=fixture();for(const s of [...f.board.shots].reverse()){
    const compiled=supplied(f,s),geometry=projectedModelGeometry(s,f.board,f.narration,compiled);
    for(const id of ['lila-person','karo-person']){
      const o=sourceActor(s,id),key=`prop-${o.performance.sourceSpear!.props[0]!.id}`,partId=id==='lila-person'?'lila-spear':'karo-spear';
      const actual=emittedTransformTrack(o.performance,actorProfile(o.character).profileHash,s.cinematic!.actorScene!.primary!.id===id?'':`actor-${id}-`,[key],compiled.get(id)!);
      const time=(s.endMs-s.startMs)*.37125;assert.deepEqual(geometry.at(partId,time).center,actual.pointAt(key,time,{x:0,y:0}));
    }
  }
});
test('projected relation SVG uses one quadratic and its original flow keeps nonzero progress at a camera entry',()=>{
  const f=fixture(),s=f.board.shots[2]!,before=hash(f),geometry=projectedModelGeometry(s,f.board,f.narration,supplied(f,s)),r=s.visualization!.relations[0]!,result=renderProjectedRelation(s,r,0,s.cinematic!.performance.stage.height,geometry);
  assert.match(result.html,/data-projected-relation="true"/);assert.ok(!result.html.includes('-segment-'));assert.match(result.html,/relation-0-from-opacity/);assert.match(result.html,/relation-0-to-opacity/);
  const data=result.calls.map(callData),curveSet=data.find(c=>c.selector.includes('relation-0-curve')&&c.method==='set')!,flowSet=data.find(c=>c.selector.includes('relation-flow-0')&&c.vars.attr?.transform)!;
  const n=curveSet.vars.attr!.d!.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number),g:RelationCurve={start:{x:n[0]!,y:n[1]!},control:{x:n[2]!,y:n[3]!},end:{x:n[4]!,y:n[5]!},arrow:curve(0).arrow};
  const progress=(s.startMs-1200)/((3800-1200)*.55),p=projectedCurvePoint(g,progress);
  assert.equal(flowSet.at,0);assert.equal(flowSet.vars.attr!.transform,`translate(${p.x} ${p.y})`);assert.ok(progress>0&&progress<1);assert.ok(data.every(c=>c.at>=0));assert.equal(hash(f),before);
  assert.ok(result.report.maxMeasuredGapPx<=.2);assert.equal(result.report.productionApproval,false);
  const both=cinematicRelations(s,s.cinematic!.performance.stage.width,s.cinematic!.performance.stage.height,undefined,undefined,geometry);
  assert.equal(both.projectedReports.length,1);assert.throws(()=>cinematicRelations(s,1200,440),/requires actual emitted projected geometry/);
});
test('original source revision, exact emitted JS and complete parent channels are required',()=>{
  const f=fixture(),s=f.board.shots[1]!,compiled=supplied(f,s);
  assert.throws(()=>projectedModelGeometry(s,undefined,f.narration,compiled),/original/);
  const changed=structuredClone(f.board);changed.shots[0]!.cinematic!.artDirection!.models[0]!.contactFrame!.pivot.x=.2;
  assert.throws(()=>projectedModelGeometry(changed.shots[1]!,changed,f.narration,compiled),/identity changed/);
  assert.throws(()=>projectedModelGeometry(s,f.board,f.narration,new Map()),/actual emitted owner channels/);
  const forged=new Map(compiled),id=s.cinematic!.actorScene!.primary!.id,bad=structuredClone(forged.get(id)!);bad.js='';forged.set(id,bad);
  assert.throws(()=>projectedModelGeometry(s,f.board,f.narration,forged),/emitted JS channel/);
});
test('canonical parent consumes only a supplied revision-bound bake and never invokes an implicit ownership compiler',()=>{
  // Synthetic held source tests only consumer wiring, not physical provenance.
  const f=fixture(),ref=f.board.shots[0]!.sourceRefs![0]!,source:SourceOwnership={version:'source-ownership-1',id:'target-held-source',partId:'target',startMs:0,endMs:4000,
    grips:[{id:'held-grip',actorId:'karo-person',sourceId:'synthetic-source',gestureId:'synthetic-hold',propId:'synthetic-prop',hand:'right',gripOffset:{x:0,y:0}}],phases:[{kind:'held',startMs:0,endMs:4000,gripId:'held-grip'}],transitions:[]};
  const paint={version:'ownership-paint-1' as const,sourceId:source.id,entityPlane:'in-front-of-actors' as const,sourceRefs:[ref],grips:[{gripId:'held-grip',depth:'after-entity' as const,anchor:{x:.5,y:.5}}]};
  for(const s of f.board.shots){s.cinematic!.sourceOwnership=[structuredClone(source)];s.cinematic!.ownershipPaint=[structuredClone(paint)];s.cinematic!.sourceWorld!.events=s.cinematic!.sourceWorld!.events.filter(e=>e.targetId!=='target');s.visualization!.events=projectSourceWorldEvents(s.cinematic!.sourceWorld!,s.startMs,s.endMs);}
  const s=f.board.shots[1]!,make=(timeMs:number)=>({timeMs,center:{x:100+(timeMs-s.startMs)*.2,y:200},palms:{'held-grip':{x:100,y:200}},activeGripIds:['held-grip'],authorityGripId:'held-grip'});
  const item:CompiledOwnership={version:OWNERSHIP_RENDER_VERSION,source,paint,aliases:[],shotHash:hash(s),sourceHash:hash({source,original:f.board,voice:f.narration}),paintHash:hash(paint),motionVerified:false,productionApproval:false,bake:{version:'ownership-bake-1',startMs:s.startMs,endMs:s.endMs,samples:[make(s.startMs),make(s.endMs)],maxMeasuredGapPx:0,gapLimitPx:.2,motionVerified:false,productionApproval:false}};
  const compiled=supplied(f,s);assert.throws(()=>projectedModelGeometry(s,f.board,f.narration,compiled),/supplied exact canonical bake/);
  const geometry=projectedModelGeometry(s,f.board,f.narration,compiled,new Map([['target',item]])),part=s.visualization!.parts.find(p=>p.id==='target')!,w=part.width*s.cinematic!.performance.stage.width;
  const t=137.875;assert.ok(Math.abs(geometry.at('target',t).center.x-(svgLinearNumber(100,280,t/900)+.1*w))<1e-8);
  item.bake.samples[0]!.center.x=999;assert.ok(geometry.at('target',t).center.x<300);
});
