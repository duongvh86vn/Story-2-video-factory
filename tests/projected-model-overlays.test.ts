// DECLARED / NOT RUN. Human tester alone invokes geometry/compiler/SVG callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {projectedRelationsFixture,suppliedProjectedActors} from './helpers/projected-relations-fixture.js';
import {projectedCarryFixture} from './helpers/projected-carry-fixture.js';
import {customModelArt,customModelForegroundArt,artworkSvg} from '../packages/director/art-direction.js';
import {modelDecorationBounds,modelProjectedDecorations} from '../packages/director/model-decorations.js';
import {projectedModelGeometry} from '../packages/director/projected-model-geometry.js';
import {projectedModelOverlayTimeline,projectedOverlayCameraBounds} from '../packages/director/projected-model-overlays.js';
import {sourceWorldFrames,sourceWorldModelTimeline} from '../library/shots/source-world-timeline.js';
import {contactMatrixPoint,createContactMotionSampler,modelContactSlice} from '../packages/director/model-contact-motion.js';
import {cameraModelLabel} from '../packages/director/model-label.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {compilePerformance} from '../packages/animation/compiler.js';
import {validateSourceSpearProductionBinding} from '../packages/director/props.js';

function fixture(){const f=projectedRelationsFixture();for(const s of f.board.shots){s.cinematic!.artDirection!.models[0]!.labelMode='renderer';const part=s.visualization!.parts.find(p=>p.id==='target')!;part.states=[{value:'hot',sourceRefs:part.sourceRefs},{value:'cold',sourceRefs:part.sourceRefs}];}return f;}
function calls(lines:string[]){return lines.map(line=>{const m=line.match(/^tl\.(set|to)\(("(?:\\.|[^"\\])*"),(\{.*\}),([^,]+)\);$/);assert.ok(m);return {method:m[1],selector:JSON.parse(m[2]!) as string,vars:JSON.parse(m[3]!) as {attr?:{transform?:string};opacity?:number;duration?:number},at:Number(m[4])};});}
function numbers(transform:string){return transform.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number);}

test('generated effects share the actual projected root after viewport/aspect mapping and are not duplicated in foreground',()=>{
  const f=fixture(),s=f.board.shots[1]!,before=hash(f),svg=customModelArt(s,'target',180,90,true)!,front=customModelForegroundArt(s,'target',180,90)!;
  assert.equal((svg.match(/class="contact-model-root"/g)??[]).length,1);assert.equal((svg.match(/class="thermal-hot"/g)??[]).length,1);
  assert.ok(svg.indexOf('contact-model-underlay')>svg.indexOf('contact-model-root'));assert.ok(svg.indexOf('contact-model-underlay')<svg.indexOf('data-custom-model'));
  assert.ok(svg.indexOf('contact-model-effects')>svg.indexOf('viewBox="20 40 200 100"'));assert.ok(!front.includes('contact-model-effects'));assert.equal(hash(f),before);
});
test('source SVG cannot impersonate generated overlay namespaces and unframed art cannot acquire a separate decoration clock',()=>{
  for(const name of ['contact-model-underlay','contact-model-effects','contact-model-label','contact-model-shadow'])assert.throws(()=>artworkSvg(`<g class="${name}"><circle r="4"/></g>`,'foreign'),/reserved/);
  const f=fixture(),s=f.board.shots[0]!;delete s.cinematic!.artDirection!.models[0]!.contactFrame;
  assert.throws(()=>customModelArt(s,'target',180,90,true),/explicit whole frame/);
  assert.throws(()=>modelProjectedDecorations(s,'target',180,90),/whole projected model/);
});
test('upright label entry reads actual transformed declared bottom and shadow receives horizontal movement only',()=>{
  const f=fixture(),s=f.board.shots[2]!,geometry=projectedModelGeometry(s,f.board,f.narration,suppliedProjectedActors(f,s)),before=hash(f),track=projectedModelOverlayTimeline(s,'target',geometry),data=calls(track.calls);
  const part=s.visualization!.parts.find(p=>p.id==='target')!,stage=s.cinematic!.performance.stage,m=cameraModelLabel(part,stage.height,stage.width),shape=geometry.at('target',0),entry=data.find(c=>c.selector.includes('contact-model-label')&&c.vars.attr?.transform)!;
  assert.equal(entry.at,0);assert.deepEqual(numbers(entry.vars.attr!.transform!),[shape.center.x-part.x*stage.width,Math.max(...shape.quad.map(p=>p.y))+part.height*stage.height*.06-m.labelY]);
  assert.ok(data.filter(c=>c.selector.includes('contact-model-shadow')&&c.vars.attr).every(c=>numbers(c.vars.attr!.transform!)[1]===0));
  assert.ok(data.filter(c=>c.vars.attr).every(c=>!c.vars.attr!.transform!.includes('rotate')&&!c.vars.attr!.transform!.includes('scale')));
  const opacity=data.find(c=>c.selector.includes('contact-model-label')&&c.vars.opacity!==undefined)!;assert.equal(opacity.vars.opacity,shape.opacity);
  assert.equal(track.report.motionVerified,false);assert.equal(track.report.productionApproval,false);assert.equal(hash(f),before);
});
test('shared camera effect envelope includes generated local extents through fractional and reverse matrix samples',()=>{
  const f=fixture(),s=f.board.shots[1]!,geometry=projectedModelGeometry(s,f.board,f.narration,suppliedProjectedActors(f,s)),part=s.visualization!.parts.find(p=>p.id==='target')!,stage=s.cinematic!.performance.stage,w=part.width*stage.width,h=part.height*stage.height,frame=s.cinematic!.artDirection!.models[0]!.contactFrame!;
  const box=modelDecorationBounds(part,frame),camera=projectedOverlayCameraBounds(s,'target',undefined,geometry),matrix=createContactMotionSampler(modelContactSlice(s,'target').frames);
  for(const t of [899.875,137.875,0,300.125])for(const x of [box.left,box.right])for(const y of [box.top,box.bottom]){
    const p=contactMatrixPoint(matrix.at(t).matrix,{x:(x-.5)*w,y:(y-.5)*h}),q={x:p.x+part.x*stage.width,y:p.y+part.y*stage.height};
    assert.ok(q.x>=camera.decorated.left&&q.x<=camera.decorated.right&&q.y>=camera.decorated.top&&q.y<=camera.decorated.bottom);
  }
  assert.ok(camera.label);assert.ok(camera.combined.bottom>=camera.label!.bottom);assert.ok(camera.combined.right>=camera.shadow.right);assert.equal(camera.scope,'actual-emitted-conservative-envelope-candidate');assert.equal(camera.productionApproval,false);
});
test('physical preflight remains a distinct candidate and foreign emitted camera/timeline revisions fail',()=>{
  const f=fixture(),s=f.board.shots[1]!,geometry=projectedModelGeometry(s,f.board,f.narration,suppliedProjectedActors(f,s)),preflight=projectedOverlayCameraBounds(s,'target');
  assert.equal(preflight.scope,'physical-preflight-conservative-envelope-candidate');assert.equal(preflight.continuousGeometryVerified,false);
  const changed=structuredClone(s);changed.visualization!.parts.find(p=>p.id==='target')!.height+=.01;
  assert.throws(()=>projectedOverlayCameraBounds(changed,'target',undefined,geometry),/foreign/);assert.throws(()=>projectedModelOverlayTimeline(changed,'target',geometry),/foreign/);
});
test('source world addresses only generated base focus/energy/thermal while both artwork layers share the original whole matrix',()=>{
  const f=fixture(),s=f.board.shots[1]!,timeline=sourceWorldModelTimeline(s,sourceWorldFrames(s)),text=timeline.join('\n'),selectors=calls(timeline).map(c=>c.selector);
  assert.match(text,/contact-model-underlay \.focus-2/);assert.match(text,/contact-model-effects \.energy-effect/);assert.match(text,/contact-model-effects \.thermal-hot/);
  assert.ok(!selectors.some(s=>s.includes('foreground-object-2')&&s.includes('contact-model-effects')));
  assert.ok(selectors.some(s=>s.includes('foreground-object-2')&&s.endsWith(' .contact-model-root')));
  assert.ok(!selectors.some(s=>s.endsWith('[id="object-2"] .focus-2')||s.endsWith('[id="object-2"] .energy-effect')));
});
test('actual original carry parent scales the drawn local decorations once and keeps its shadow on the physical ground',()=>{
  const f=projectedCarryFixture(),s=f.board.shots[1]!,actor=s.cinematic!.actorScene!.primary!,profile=actorProfile(actor),compiled=compilePerformance(s.cinematic!.performance,profile,{method:'segment-draft',windowMs:20,intervals:[]},'',undefined,actorViewActingClock(f.board,s,actor.id));
  const geometry=projectedModelGeometry(s,f.board,f.narration,new Map([[actor.id,compiled]])),part=s.visualization!.parts.find(p=>p.id==='basket')!,stage=s.cinematic!.performance.stage,scale=s.cinematic!.performance.scale;
  const art=customModelArt(s,'basket',part.width*stage.width/scale,part.height*stage.height/scale,true)!;assert.equal((art.match(/contact-model-effects/g)??[]).length,1);
  const camera=projectedOverlayCameraBounds(s,'basket',undefined,geometry),baseline=stage.groundY-4;assert.ok(camera.shadow.top<baseline&&camera.shadow.bottom>baseline);
  for(const t of [0,1137.875,300]){const p=geometry.at('basket',t).center;assert.ok(p.x>=camera.center.left&&p.x<=camera.center.right&&p.y>=camera.center.top&&p.y<=camera.center.bottom);}
  const track=projectedModelOverlayTimeline(s,'basket',geometry);assert.ok(calls(track.calls).filter(c=>c.vars.attr).every(c=>numbers(c.vars.attr!.transform!)[1]===0));
  assert.throws(()=>projectedOverlayCameraBounds(s,'basket'),/physical parent envelope/);
});
test('projected effects, envelopes and source-only reports never remove the original production gate',()=>{
  const f=fixture(),s=f.board.shots[0]!,geometry=projectedModelGeometry(s,f.board,f.narration,suppliedProjectedActors(f,s));
  assert.equal(geometry.continuousGeometryVerified,false);assert.equal(projectedModelOverlayTimeline(s,'target',geometry).report.productionApproval,false);
  assert.throws(()=>validateSourceSpearProductionBinding(s),/needs-source-prop-binding/);
});
