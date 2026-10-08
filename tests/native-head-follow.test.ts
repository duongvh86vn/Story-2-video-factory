// DECLARED ONLY, NOT RUN. Geometry/runtime/renderer/video belong to user's model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {nativeHeadBank,NativeHeadBankDefinitionSchema} from '../packages/animation/native-head-bank.js';
import {nativeRearFollowState,nativeRearFollowPieces,nativeRearFollowMatrixError} from '../packages/animation/native-head-follow.js';
import {nativeHeadBankBounds,nativeHeadCellPoint,validateNativeHeadBankTrack,nativeHeadBankRearError} from '../packages/animation/body-head-bank.js';
import {headFaceCandidate} from '../packages/topics/head-face-source.js';
import {headFaceCalibration,headFacePreviewRevision} from '../packages/topics/head-face-workbench.js';
import {HEAD_FACE_FOLLOW_CANDIDATES} from '../packages/topics/head-face-candidates.js';
import {samplePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {performanceSvg} from '../packages/animation/rig.js';
import {createNativeHeadSeatTracer} from '../benchmarks/native-seat-tracer.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {actorProfile} from '../packages/actors/model.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles} from '../packages/scenes/security.js';
import {buildServer} from '../apps/server/index.js';
import {secondaryMotionDescription} from '../packages/animation/view-secondary-motion.js';
import {hash} from '../packages/core/utils.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const bare=(face:Record<string,unknown>)=>Object.fromEntries(Object.entries(face).filter(([id])=>!id.startsWith('native-head-follow-')));
async function definition(){return NativeHeadBankDefinitionSchema.parse(JSON.parse(await fs.readFile(path.join(repo,HEAD_FACE_FOLLOW_CANDIDATES[0].file),'utf8')));}

test('browser-safe temporal contract hash retains the original Node JSON fingerprint without changing kernel metadata',()=>{
  const {fingerprint,pending,verified,productionReady,approved,...contract}=secondaryMotionDescription;assert.equal(fingerprint,hash(contract));
});

test('four explicit bank6 definitions preserve own images and all prior face/paint registrations without inventing Karo rear hair',async()=>{
  for(const c of HEAD_FACE_FOLLOW_CANDIDATES){const next=await headFaceCandidate(repo,c.actor,c.view,'source-motion'),old=await headFaceCandidate(repo,c.actor,c.view,'source-layers');
    assert.equal(next.bank.version,'native-head-bank-6');assert.equal(next.bank.capabilities.secondary,c.actor==='lila');
    assert.deepEqual(next.bank.source,old.bank.source);assert.deepEqual(next.bank.primary,old.bank.primary);assert.deepEqual(next.bank.cells[0]!.face,old.bank.cells[0]!.face);
    assert.equal(old.bank.capabilities.secondary,false);assert.equal(next.bank.cells[0]!.paint!.version,'native-head-paint-2');
    assert.equal(next.bank.motionVerified,false);assert.equal(next.bank.approved,false);assert.equal(next.bank.productionReady,false);
    assert.equal(next.bank.cells[0]!.yawDeg,null);assert.deepEqual(next.bank.routes,[]);
  }
  await assert.rejects(headFaceCandidate(repo,'prehistoric-female-haired','three-quarter-right','source-motion'),/not been authored/);
});

test('motion cannot be promoted onto a legacy bank, missing/foreign paint, wrong capability or unstable tiny source mesh',async()=>{
  const original=await definition(),bad=(change:(d:typeof original)=>void,match:RegExp)=>{const d=structuredClone(original);change(d);assert.throws(()=>nativeHeadBank(d),match);};
  bad(d=>{d.version='native-head-bank-5';},/Only explicit bank6/);
  bad(d=>{d.capabilities.secondary=false;},/exact rear motion capability/);
  bad(d=>{delete d.cells[0]!.paint!.rear[0]!.motion;},/paint2 requires/);
  bad(d=>{d.cells[0]!.paint!.source.sha256='b'.repeat(64);},/exact cell PNG/);
  bad(d=>{d.cells[0]!.paint!.rear[0]!.motion!.maxDisplacement=25;},/24/);
  bad(d=>{d.cells[0]!.paint!.rear[0]!.region.width=20;},/64 by 96/);
  bad(d=>{d.cells[0]!.paint!.version='native-head-paint-1';},/complete own paint2|paint1 forbids/);
});

test('own source mesh has12 affine triangles, keeps attachment/sides pinned and bounds every vertex with positive area',async()=>{
  for(const view of ['three-quarter-left','three-quarter-right'] as const){const {bank}=await headFaceCandidate(repo,'lila',view,'source-motion'),paint=bank.cells[0]!.paint!;
    assert.equal(nativeRearFollowPieces(paint,0).length,12);
    for(const control of [{x:0,y:0,angle:0},{x:32,y:0,angle:8},{x:0,y:-32,angle:-8},{x:-20,y:20,angle:6}]){
      const state=nativeRearFollowState(paint,0,control);assert.equal(state.pieces.length,12);
      for(const p of state.pieces){assert.ok(p.areaRatio>=.4-1e-9);const r=p.region.region;
        p.from.forEach((v,i)=>{const d=Math.hypot(v.x-p.target[i]!.x,v.y-p.target[i]!.y);assert.ok(d<=p.region.motion!.maxDisplacement+1e-8);
          if(v.y===r.y||v.x===r.x||v.x===r.x+r.width)assert.equal(d,0);
        });
      }
      if(!control.x&&!control.y&&!control.angle)for(const v of Object.values(state.face))assert.equal(v.attr.transform,'matrix(1 0 0 1 0 0)');
    }
    for(const control of [{x:NaN,y:0,angle:0},{x:33,y:0,angle:0},{x:0,y:0,angle:9}])assert.throws(()=>nativeRearFollowState(paint,0,control),/bounded/);
  }
});

test('interpolation checks the expanded UV hull and rejects positive-endpoint matrices that invert between frames',async()=>{
  const d=await definition(),paint=d.cells[0]!.paint!,a=nativeRearFollowState(paint,0,{x:0,y:0,angle:0}),b=nativeRearFollowState(paint,0,{x:20,y:0,angle:6});
  assert.equal(nativeRearFollowMatrixError(paint,0,a.face,a.face,a.face,.5),0);
  assert.ok(nativeRearFollowMatrixError(paint,0,a.face,a.face,b.face,.5)>0);
  const flipped=Object.fromEntries(Object.keys(a.face).map(id=>[id,{attr:{transform:'matrix(-1 0 0 -1 0 0)'}}]));
  assert.equal(nativeRearFollowMatrixError(paint,0,a.face,flipped,a.face,.5),Infinity);
  assert.throws(()=>nativeRearFollowMatrixError(paint,0,a.face,a.face,a.face,NaN),/progress/);
  assert.throws(()=>nativeRearFollowMatrixError(paint,0,{},a.face,a.face,.5),/missing baked/);
});

test('motion bounds contain displaced source triangles and UV clips stay before matrices without a destination crop',async()=>{
  const f=await headFaceCalibration(repo,{actor:'lila',view:'three-quarter-left',face:'source-motion'}),bounds=nativeHeadBankBounds(f.bank),paint=f.bank.cells[0]!.paint!;
  for(const control of [{x:32,y:0,angle:8},{x:0,y:-32,angle:-8}])for(const p of nativeRearFollowState(paint,0,control).pieces)for(const vertex of p.target){const v=nativeHeadCellPoint(f.bank,f.bank.cells[0]!,vertex);assert.ok(v.x>=bounds.left&&v.x<=bounds.right&&v.y>=bounds.top&&v.y<=bounds.bottom);}
  const svg=performanceSvg(f.profile,'scene');assert.ok(svg.indexOf('id="head-back"')<svg.indexOf('id="chest"'));
  assert.ok(svg.includes('<g id="native-head-follow-0-0-0"><g clip-path="url(#native-head-follow-0-0-region)">'));
  assert.ok(svg.includes('clip-path="url(#native-head-follow-0-0-0-uv)"><g clip-path="url(#native-head-bank-clip-0)">'));
});

test('complete causal head history is seekable across camera slices and does not alter face, hand or body geometry',async()=>{
  for(const view of ['three-quarter-left','three-quarter-right'] as const){const opts={actor:'lila',view,face:'source-motion',mood:'concerned',action:'think',look:'ahead'},full=await headFaceCalibration(repo,opts),slice=await headFaceCalibration(repo,{...opts,slice:'second-half'}),old=await headFaceCalibration(repo,{...opts,face:'source-layers'});let moved=false;
    const at=(f:typeof full,t:number)=>samplePerformance(f.plan,f.profile,t,f.activity,f.sourceClock,f.clock);
    for(const global of [3599,2150,3450,2000,2150]){const a=at(full,global),b=at(slice,global-2000),c=at(old,global);
      assert.deepEqual(a.face,b.face);assert.deepEqual(a.paths,b.paths);assert.deepEqual(a.hands,b.hands);assert.deepEqual(a.transforms,b.transforms);
      assert.deepEqual(bare(a.face),c.face);assert.deepEqual(a.paths,c.paths);assert.deepEqual(a.hands,c.hands);assert.deepEqual(a.transforms,c.transforms);
      moved ||= Object.entries(a.face).some(([id,v])=>id.startsWith('native-head-follow-')&&v.attr?.transform!=='matrix(1 0 0 1 0 0)');
    }assert.ok(moved);assert.equal(full.clock.sourceIdentityHash,slice.clock.sourceIdentityHash);
  }
});

test('own secondary remains source-clock gated and cannot hide a head-cell jump or missing original actor history',async()=>{
  const f=await headFaceCalibration(repo,{actor:'lila',view:'three-quarter-left',face:'source-motion'});
  assert.throws(()=>samplePerformance(f.plan,f.profile,1000,f.activity),/head-source-phase/);
  const frame=samplePerformance(f.plan,f.profile,1000,f.activity,f.sourceClock,f.clock),missing=structuredClone(frame.face);missing['head-view-bank-0']={opacity:0};missing['head-back-view-bank-0']={opacity:0};
  assert.throws(()=>nativeHeadBankRearError(f.bank,missing,frame.face,frame.face,.5),/exactly one/);
  const mismatch=structuredClone(frame.face);mismatch['head-back-view-bank-0']={opacity:0};assert.throws(()=>nativeHeadBankRearError(f.bank,mismatch,frame.face,frame.face,.5),/opacity differs/);
  const other=structuredClone(f.bank);other.cells.push({...structuredClone(other.cells[0]!),id:'another-fixed-cell'});
  const profile={...f.profile,appearance:{...f.profile.appearance,bodyHeadBank:other}};
  // Malformed banks fail fingerprint/registration first; they never bypass the
  // actual source/route guard by inventing a missing artwork cell.
  assert.throws(()=>validateNativeHeadBankTrack({...f.plan,sourceHead:{...f.plan.sourceHead!,samples:[{atMs:0,cell:f.bank.cells[0]!.id},{atMs:500,cell:'another-fixed-cell'}]}},profile),/fingerprint|registration|crop|angle/);
});

test('canonical moving two-actor film keeps rear matrices continuous through lead swaps and uses the actual factory renderer',async()=>{
  for(const staging of ['lila-left','lila-right'] as const){const f=await createNativeHeadSeatTracer(repo,{staging,acting:'emotional-reactions',face:'source-motion'});let previous:ReturnType<typeof samplePerformance>|undefined;
    for(const shot of f.board.shots){const scene=shot.cinematic!.actorScene!,a=scene.primary!.id==='lila'?{character:scene.primary!,performance:shot.cinematic!.performance}:scene.supporting.find(a=>a.character.id==='lila')!,profile=actorProfile(a.character),clock=actorViewActingClock(f.board,shot,'lila')!;
      const first=samplePerformance(a.performance,profile,0,silence,undefined,clock),last=samplePerformance(a.performance,profile,a.performance.durationMs,silence,undefined,clock);
      if(previous)assert.deepEqual(Object.fromEntries(Object.entries(first.face).filter(([id])=>id.startsWith('native-head-follow-'))),Object.fromEntries(Object.entries(previous.face).filter(([id])=>id.startsWith('native-head-follow-'))));previous=last;
      const r=renderCinematic(shot,f.profile,f.rig,silence,f.config,undefined,f.narration,undefined,undefined,f.board),files=secureSceneFiles(r.files);
      assert.ok(files.files.reduce((n,file)=>n+Buffer.byteLength(file.content),0)<=2_000_000);assert.ok(files.files.find(file=>file.path==='index.html')!.content.includes('native-head-follow-0-0-11'));
      const c=compilePerformance(a.performance,profile,silence,'lila-',undefined,clock);assert.equal(c.report.nativeHeadPaint!.secondaryMotion,true);assert.equal(c.report.nativeHeadPaint!.version,'native-head-paint-2');assert.equal(c.report.nativeHeadPaint!.productionReady,false);
    }assert.equal(f.finalExportAllowed,false);
  }
});

test('Studio source-motion is explicit and revision-bound; old source-layers never silently acquires moving texture',async t=>{
  const app=await buildServer({repoRoot:repo,logger:false});t.after(()=>app.close());const base='/api/topics/prehistoric-life/head-face-preview/lila/views/three-quarter-left/think/ahead/whole/source-motion/sad/';
  const binding=await app.inject({method:'GET',url:base+'binding.json'});assert.equal(binding.statusCode,200);const revision=binding.json().revision as string;
  const scene=await app.inject({method:'GET',url:base+'scene.js?revision='+revision});assert.equal(scene.statusCode,200);assert.ok(scene.body.includes('native-head-follow-0-0-0'));
  const stale=await app.inject({method:'GET',url:base.replace('/source-motion/','/source-layers/')+'scene.js?revision='+revision});assert.notEqual(stale.statusCode,200);
  const missing=await app.inject({method:'GET',url:base.replace('/lila/','/prehistoric-female-haired/')+'binding.json'});assert.notEqual(missing.statusCode,200);
  const next=await headFaceCalibration(repo,{face:'source-motion'}),old=await headFaceCalibration(repo,{face:'source-layers'});assert.notEqual(headFacePreviewRevision(next),headFacePreviewRevision(old));
});
