// DECLARED ONLY, NOT RUN. User's test model owns geometry/runtime/video.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NativeHeadBankDefinitionSchema,nativeHeadBank} from '../packages/animation/native-head-bank.js';
import {headFaceCandidate} from '../packages/topics/head-face-source.js';
import {HEAD_FACE_LAYERED_CANDIDATES} from '../packages/topics/head-face-candidates.js';
import {headFaceCalibration,headFacePreviewRevision,headFaceWorkbench} from '../packages/topics/head-face-workbench.js';
import {performanceSvg} from '../packages/animation/rig.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {samplePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {createNativeHeadSeatTracer,NATIVE_SEAT_TRACER_CUTS} from '../benchmarks/native-seat-tracer.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {nativeDialogueExpressionWindows} from '../packages/topics/native-dialogue-candidates.js';
import {nativeSeatTracerOptions} from '../scripts/native-seat-tracer.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles} from '../packages/scenes/security.js';
import {buildServer} from '../apps/server/index.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function raw(){return JSON.parse(await fs.readFile(path.join(repo,HEAD_FACE_LAYERED_CANDIDATES[0].file),'utf8')) as ReturnType<typeof NativeHeadBankDefinitionSchema.parse>;}

test('four explicit source-layer definitions retain exact original faces, body/identity and unapproved state',async()=>{
  for(const entry of HEAD_FACE_LAYERED_CANDIDATES){
    const next=await headFaceCandidate(repo,entry.actor,entry.view,'source-layers'),old=await headFaceCandidate(repo,entry.actor,entry.view,'expressions');
    assert.deepEqual(next.bank.source,old.bank.source);assert.deepEqual(next.bank.primary,old.bank.primary);
    assert.deepEqual(next.bank.bodyViews,old.bank.bodyViews);assert.deepEqual(next.bank.cells[0]!.face,old.bank.cells[0]!.face);
    assert.equal(old.bank.cells[0]!.paint,undefined);assert.equal(next.bank.cells[0]!.paint!.rear.length,entry.actor==='lila'?1:0);
    assert.equal(next.bank.productionReady,false);assert.equal(next.bank.motionVerified,false);assert.equal(next.bank.capabilities.secondary,false);
    assert.equal(next.bank.cells[0]!.yawDeg,null);assert.deepEqual(next.bank.routes,[]);assert.notEqual(next.bank.fingerprint,old.bank.fingerprint);
  }
  await assert.rejects(headFaceCandidate(repo,'prehistoric-female-haired','three-quarter-right','source-layers'),/not been authored/);
});

test('paint rejects another source, legacy banks, facial/neck regions, crop escapes and unbounded/double rear paint',async()=>{
  const initial=await raw();
  const check=(mutate:(d:typeof initial)=>void,pattern:RegExp)=>{const d=structuredClone(initial);mutate(d);assert.throws(()=>nativeHeadBank(d),pattern);};
  check(d=>{d.cells[0]!.paint!.source.sha256='a'.repeat(64);},/exact cell PNG/);
  check(d=>{d.version='native-head-bank-3';},/explicit complete bank5/);
  check(d=>{d.cells[0]!.paint!.rear[0]!.region.x=1150;},/leaves/);
  check(d=>{d.cells[0]!.paint!.rear[0]!.frontCut.x+=10;d.cells[0]!.paint!.rear[0]!.frontCut.width-=10;},/two source pixels/);
  check(d=>{d.cells[0]!.paint!.rear[0]!.frontCut={...d.cells[0]!.paint!.rear[0]!.region};},/explicit overlap/);
  for(const r of [{x:300,y:480,width:100,height:100},{x:550,y:760,width:100,height:100}])check(d=>{
    d.cells[0]!.paint!.rear[0]!.region=r;d.cells[0]!.paint!.rear[0]!.frontCut={x:r.x+1,y:r.y+1,width:r.width-2,height:r.height-2};
  },/facial edits|neck overlap/);
  check(d=>{d.cells[0]!.paint!.rear.push({...d.cells[0]!.paint!.rear[0]!,id:'other-tail'});},/rear layers overlap/);
});

test('rear source pixels paint before the entire body; original face and chin-contact arms remain in front with namespaced local references',async()=>{
  for(const view of ['three-quarter-left','three-quarter-right'] as const){
    const f=await headFaceCalibration(repo,{actor:'lila',view,face:'source-layers',action:'think'}),svg=performanceSvg(f.profile,'scene');
    const rear=svg.indexOf('id="head-back"'),head=svg.indexOf('id="head"');assert.ok(rear>=0);
    for(const name of ['ink-leg-left','garment-left','chest','ink-arm-left-back-slot','ink-arm-right-back-slot'])assert.ok(rear<svg.indexOf('id="'+name+'"'),name+' must occlude rear hair');
    for(const name of ['ink-arm-left-front-slot','hand-right-front-slot'])assert.ok(head<svg.indexOf('id="'+name+'"'),name+' must retain chin/contact foreground');
    assert.ok(svg.includes('mask="url(#native-head-paint-0-front)"'));assert.ok(svg.includes('clip-path="url(#native-head-paint-0-rear)"'));
    assert.equal([...svg.matchAll(/id="native-head-bank-source-0"/g)].length,1);
    const ns=namespaceRigSvg(svg,'story-lila-'),ids=[...ns.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]!);
    assert.equal(new Set(ids).size,ids.length);
    const refs=[...ns.matchAll(/url\(#([^)]+)\)|\bhref="#([^"]+)"/g)].map(m=>m[1]??m[2]!);
    for(const ref of refs)assert.ok(ref.startsWith('story-lila-')&&ids.includes(ref),'unbound/cross-actor paint: '+ref);
  }
});

test('whole/slice/reverse seeks keep rear attachment identical to head and preserve facial/hand motion from the plain emotion source',async()=>{
  for(const view of ['three-quarter-left','three-quarter-right'] as const){
    const opts={actor:'lila',view,face:'source-layers',mood:'concerned',action:'think',look:'ahead'};
    const full=await headFaceCalibration(repo,opts),slice=await headFaceCalibration(repo,{...opts,slice:'second-half'}),plain=await headFaceCalibration(repo,{...opts,face:'expressions'});
    assert.equal(full.clock.sourceIdentityHash,slice.clock.sourceIdentityHash);
    const at=(f:typeof full,t:number)=>samplePerformance(f.plan,f.profile,t,f.activity,f.sourceClock,f.clock);
    for(const global of [3599,2150,3450,2000,2150]){
      const a=at(full,global),b=at(slice,global-2000),c=at(plain,global);
      assert.deepEqual(a.transforms,b.transforms);assert.deepEqual(a.face,b.face);assert.deepEqual(a.paths,b.paths);assert.deepEqual(a.hands,b.hands);
      assert.equal(a.transforms['head-back'],a.transforms.head);assert.equal(a.face['head-back-view-bank-0']!.opacity,a.face['head-view-bank-0']!.opacity);
      const {['head-back']:discarded,...rest}=a.transforms;assert.deepEqual(rest,c.transforms);assert.deepEqual(a.paths,c.paths);assert.deepEqual(a.hands,c.hands);
      assert.deepEqual(Object.fromEntries(Object.entries(a.face).filter(([id])=>!id.startsWith('head-back-view-bank-'))),c.face);
    }
  }
});

test('compiled rear/head transforms share exact frame values and discrete cell opacity; Karo has no invented rear hair',async()=>{
  const f=await headFaceCalibration(repo,{actor:'lila',view:'three-quarter-left',face:'source-layers',mood:'afraid',look:'ahead'}),c=compilePerformance(f.plan,f.profile,f.activity,'lila-',f.sourceClock,f.clock);
  for(const frame of c.frames)assert.equal(frame.transforms['head-back'],frame.transforms.head);
  for(const line of c.js.split('\n'))if(line.includes('head-back-view-bank-'))assert.ok(line.startsWith('tl.set('),'no independent rear fade');
  assert.equal(c.report.nativeHeadPaint!.rearPresent,true);assert.equal(c.report.nativeHeadPaint!.secondaryMotion,false);assert.equal(c.report.nativeHeadPaint!.productionReady,false);
  const k=await headFaceCalibration(repo,{actor:'karo',view:'three-quarter-right',face:'source-layers'}),ks=samplePerformance(k.plan,k.profile,1000,k.activity,k.sourceClock,k.clock);
  assert.equal(ks.transforms['head-back'],undefined);assert.ok(!performanceSvg(k.profile,'scene').includes('id="head-back"'));
});

test('both stagings carry sourced rear paint through five canonical factory shots, actor namespaces, original reactions and byte caps',async()=>{
  for(const staging of ['lila-left','lila-right'] as const){
    const f=await createNativeHeadSeatTracer(repo,{staging,acting:'emotional-reactions',face:'source-layers'});
    assert.equal(f.board.shots.length,NATIVE_SEAT_TRACER_CUTS.length-1);assert.equal(f.finalExportAllowed,false);
    assert.deepEqual(f.headSelection.map(h=>h.definitionFile).sort(),HEAD_FACE_LAYERED_CANDIDATES.filter(c=>
      c.view===(c.actor==='lila'?(staging==='lila-left'?'three-quarter-right':'three-quarter-left'):(staging==='lila-left'?'three-quarter-left':'three-quarter-right'))).map(c=>c.file).sort());
    for(const shot of f.board.shots){
      for(const id of ['lila','karo'] as const)assert.deepEqual(actorViewActingClock(f.board,shot,id)!.expressions,nativeDialogueExpressionWindows[id]);
      const r=renderCinematic(shot,f.profile,f.rig,{method:'segment-draft',windowMs:20,intervals:[]},f.config,undefined,f.narration,undefined,undefined,f.board),files=secureSceneFiles(r.files);
      assert.ok(files.files.reduce((n,file)=>n+Buffer.byteLength(file.content),0)<=2_000_000);
      const html=files.files.find(file=>file.path==='index.html')!.content;assert.ok(html.includes('head-back-view-bank-0'));assert.ok(html.includes('native-head-paint-0-front'));
    }
  }
  assert.equal(nativeSeatTracerOptions(['--native-heads','--face','source-layers','--acting','emotional-reactions']).dialogue!.face,'source-layers');
});

test('Studio source-layers route/revision cannot reuse the old expression route or supply a missing supporting partition',async t=>{
  const app=await buildServer({repoRoot:repo,logger:false});t.after(()=>app.close());
  const base='/api/topics/prehistoric-life/head-face-preview/lila/views/three-quarter-left/think/ahead/whole/source-layers/sad/';
  const binding=await app.inject({method:'GET',url:base+'binding.json'});assert.equal(binding.statusCode,200);
  const revision=binding.json().revision as string;
  const scene=await app.inject({method:'GET',url:base+'index.html?revision='+revision});assert.equal(scene.statusCode,200);assert.ok(scene.body.includes('id="head-back"'));
  const old=await app.inject({method:'GET',url:base.replace('/source-layers/','/expressions/')+'index.html?revision='+revision});assert.notEqual(old.statusCode,200);
  const missing=await app.inject({method:'GET',url:base.replace('/lila/','/prehistoric-female-haired/')+'binding.json'});assert.notEqual(missing.statusCode,200);
  assert.ok(headFaceWorkbench({face:'source-layers',mood:'sad'}).includes('/source-layers/sad/'));
  const f=await headFaceCalibration(repo,{face:'source-layers'}),e=await headFaceCalibration(repo,{face:'expressions'});assert.notEqual(headFacePreviewRevision(f),headFacePreviewRevision(e));
});
