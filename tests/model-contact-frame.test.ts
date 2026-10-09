// DECLARED / NOT RUN. Runtime/geometry/browser/video are owned by the user's tester.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {projectedContactFixture,contactCamera} from './helpers/projected-contact-fixture.js';
import {ModelContactFrameSchema} from '../packages/director/model-contact-reference.js';
import {ArtDirectionSchema} from '../packages/director/art-direction-schemas.js';
import {customModelArt,customModelForegroundArt,validateArtDirection,artworkSvg} from '../packages/director/art-direction.js';
import {modelContactSlice,modelContactPoint,modelContactBounds,modelContactTimeline,modelContactHeldAnchor,contactMotionAt,contactMatrixPoint} from '../packages/director/model-contact-motion.js';
import {sourceWorldFrames,sourceWorldModelTimeline} from '../library/shots/source-world-timeline.js';
import {validateSourceWorld,projectSourceWorldEvents} from '../packages/director/source-world.js';
import {sourceActor} from '../packages/director/source-actor.js';
import {validateSourceSpearProductionBinding} from '../packages/director/props.js';

test('projected frame rejects unknown fields, invalid bounds/anchors and competing pivots or handles',()=>{
  const f=projectedContactFixture(),art=f.board.shots[0]!.cinematic!.artDirection!,model=art.models[0]!;
  assert.equal(ModelContactFrameSchema.safeParse(model.contactFrame).success,true);
  for(const frame of [{...model.contactFrame,approved:true},{...model.contactFrame,bounds:{left:1,right:0,top:0,bottom:1}},{...model.contactFrame,anchors:{center:{x:2,y:.5}}}])assert.equal(ModelContactFrameSchema.safeParse(frame).success,false);
  for(const extra of [{motionOrigin:{x:0,y:0}},{handleAnchor:{x:.2,y:.5}}])assert.equal(ArtDirectionSchema.safeParse({...art,models:[{...model,...extra}]}).success,false);
  assert.throws(()=>artworkSvg('<g class="contact-model-root"><circle r="4"/></g>','foreign'),/reserved/);
});
test('whole frame wraps after original viewBox/aspect projection and does not require nested .motion',()=>{
  const f=projectedContactFixture(),s=f.board.shots[0]!,before=hash(f);validateArtDirection(s);
  for(const markup of [customModelArt(s,'target',180,90)!,customModelForegroundArt(s,'target',180,90)!]){
    assert.equal((markup.match(/class="contact-model-root"/g)??[]).length,1);assert.match(markup,/viewBox="20 40 200 100" preserveAspectRatio="xMidYMid meet"/);
    assert.ok(markup.indexOf('class="contact-model-root"')<markup.indexOf('<svg x="-90" y="-45" width="180" height="90"'));
  }assert.equal(hash(f),before);
});
test('global phase survives non-grid camera entry, fractional and reverse queries within serialized precision',()=>{
  const f=projectedContactFixture(),full=contactCamera(f,0,4000),cut=contactCamera(f,1771,2600),before=hash(f);
  for(const global of [2599.375,1800,1771,1891.125,2500]){
    const a=modelContactPoint(full,'target','handle',global),b=modelContactPoint(cut,'target','handle',global);
    assert.ok(Math.hypot(a.point.x-b.point.x,a.point.y-b.point.y)<.02);assert.equal(a.visible,b.visible);
  }assert.equal(hash(f),before);
  assert.throws(()=>modelContactPoint(cut,'target','handle',1770),/clamp/);
});
test('drawing and point query consume the same actual serialized matrix segment, including GSAP intermediate rounding',()=>{
  const f=projectedContactFixture(),s=contactCamera(f,1771,2600),slice=modelContactSlice(s,'target'),part=s.visualization!.parts.find(p=>p.id==='target')!,local={x:.25*part.width*s.cinematic!.performance.stage.width,y:0};
  const at=contactMotionAt(slice.frames,95.875),point=modelContactPoint(s,'target','handle',s.startMs+95.875);
  assert.deepEqual(point.point,contactMatrixPoint(at.matrix,local));
  const calls=modelContactTimeline(s,'target','#root');assert.equal(calls.length,slice.frames.length);assert.ok(calls[0]!.includes('"transform":"matrix('));
  const world=sourceWorldModelTimeline(s,sourceWorldFrames(s));assert.ok(world.some(c=>c.includes('.contact-model-root')));assert.ok(!world.some(c=>c.includes('object-2')&&c.includes(' .motion')));assert.ok(!world.some(c=>c.includes('svgOrigin')&&c.includes('contact-model-root')));
});
test('explicit bounds enclose transformed declared corners with interpolation quantization padding',()=>{
  const f=projectedContactFixture(),s=contactCamera(f,1771,2600),b=modelContactBounds(s,'target'),slice=modelContactSlice(s,'target'),part=s.visualization!.parts.find(p=>p.id==='target')!,width=part.width*s.cinematic!.performance.stage.width,height=part.height*s.cinematic!.performance.stage.height;
  for(const time of [0,95.875,300,828.75])for(const x of [-width/2,width/2])for(const y of [-height/2,height/2]){
    const p=contactMatrixPoint(contactMotionAt(slice.frames,time).matrix,{x,y}),world={x:p.x+part.x*s.cinematic!.performance.stage.width,y:p.y+part.y*s.cinematic!.performance.stage.height};assert.ok(world.x>=b.left&&world.x<=b.right&&world.y>=b.top&&world.y<=b.bottom);
  }
});
test('original world identity includes selected frame fps and rejects local clock substitution',()=>{
  const f=projectedContactFixture();validateSourceWorld(f.board.shots[1]!,f.board,f.narration);
  f.board.shots[2]!.cinematic!.performance.fps=30;assert.throws(()=>validateSourceWorld(f.board.shots[1]!,f.board,f.narration),/identity changed/);
  const next=projectedContactFixture(),s=next.board.shots[1]!;s.cinematic!.sourceWorld=undefined;assert.throws(()=>validateArtDirection(s),/complete original world clock/);
});
test('fixed hold permits a stationary pivot but rejects moving anchor and invisible original contact',()=>{
  const f=projectedContactFixture();assert.ok(modelContactHeldAnchor(f.board.shots,'target','center',1800,2200));
  assert.throws(()=>modelContactHeldAnchor(f.board.shots,'target','handle',1800,2200),/moving projected anchor/);
  const reveal={id:'late-reveal',type:'reveal' as const,targetId:'target',startMs:2400,endMs:2500,narrationAnchor:'cue',contactRequired:false,motion:'none' as const,sourceRefs:f.board.shots[0]!.sourceRefs!};
  for(const s of f.board.shots){s.cinematic!.sourceWorld!.events.push(reveal);s.visualization!.events=projectSourceWorldEvents(s.cinematic!.sourceWorld!,s.startMs,s.endMs);}
  assert.throws(()=>modelContactHeldAnchor(f.board.shots,'target','center',1800,2200),/hidden/);
});
test('owned model cannot acquire independent world geometry or production approval through an explicit frame',()=>{
  const f=projectedContactFixture(),s=f.board.shots[0]!,part=s.visualization!.parts[0]!,p=sourceActor(s,'lila-person').performance;
  s.cinematic!.artDirection!.models.push({...s.cinematic!.artDirection!.models[0]!,partId:part.id,sourceRefs:part.sourceRefs});
  s.cinematic!.sourceWorld!.events.push({id:'double-motion',type:'part-motion',targetId:part.id,startMs:100,endMs:500,narrationAnchor:'cue',contactRequired:false,motion:'translate',sourceRefs:part.sourceRefs});
  s.visualization!.events=projectSourceWorldEvents(s.cinematic!.sourceWorld!,s.startMs,s.endMs);
  assert.throws(()=>modelContactSlice(s,part.id,part.width*p.stage.width/p.scale,part.height*p.stage.height/p.scale),/independent world geometry/);
  assert.throws(()=>validateSourceSpearProductionBinding(s),/needs-source-prop-binding/);
});
