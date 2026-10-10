// Local diagnostics authorized; current execution results live in TEST-RESULTS-PREHISTORIC.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NativeHeadBankDefinitionSchema,nativeHeadBank} from '../packages/animation/native-head-bank.js';
import {NativeHeadFaceSchema,nativeHeadFaceState,nativeHeadFaceMatrixError,NATIVE_FACE_REST_EMOTION} from '../packages/animation/native-head-face.js';
import {nativeHeadBankSvg} from '../packages/animation/body-head-bank.js';
import {samplePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {pathCoordinates} from '../packages/animation/ink-limb.js';
import {headFaceCandidate} from '../packages/topics/head-face-source.js';
import {headFaceCalibration,headFacePreviewFile,headFacePreviewRevision,headFaceWorkbench} from '../packages/topics/head-face-workbench.js';
import {HEAD_FACE_EXPRESSION_CANDIDATES} from '../packages/topics/head-face-candidates.js';
import {createNativeHeadSeatTracer,NATIVE_SEAT_TRACER_CUTS} from '../benchmarks/native-seat-tracer.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {nativeDialogueExpressionWindows} from '../packages/topics/native-dialogue-candidates.js';
import {nativeSeatTracerOptions} from '../scripts/native-seat-tracer.js';
import {hash} from '../packages/core/utils.js';
import {buildServer} from '../apps/server/index.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function definition(file:string=HEAD_FACE_EXPRESSION_CANDIDATES[0].file){
  return NativeHeadBankDefinitionSchema.parse(JSON.parse(await fs.readFile(path.join(repo,file),'utf8')));
}
const emotion={brow:.8,tilt:-.9,smile:0,frown:.8,round:.7,closure:.6};

test('four real principal emotion registrations bind the original source drawings and exact body views without approval',async()=>{
  for(const entry of HEAD_FACE_EXPRESSION_CANDIDATES){
    const result=await headFaceCandidate(repo,entry.actor,entry.view,'expressions');
    assert.equal(result.bank.version,'native-head-bank-5');assert.equal(result.bank.capabilities.expressions,true);
    assert.equal(result.bank.cells[0]!.face!.version,'native-head-face-2');assert.equal(result.bank.cells[0]!.yawDeg,null);
    assert.equal(result.bank.approved,false);assert.equal(result.bank.productionReady,false);assert.equal(result.bank.motionVerified,false);
    const old=await headFaceCandidate(repo,entry.actor,entry.view);
    assert.equal(old.bank.version,'native-head-bank-3');assert.equal(old.bank.capabilities.expressions,false);
    assert.deepEqual(result.bank.source,old.bank.source);assert.deepEqual(result.bank.bodyViews,old.bank.bodyViews);
    assert.deepEqual(result.bank.additionalSources,old.bank.additionalSources);assert.deepEqual(result.bank.primary,old.bank.primary);
    assert.notEqual(result.bank.fingerprint,old.bank.fingerprint);
  }
});

test('emotion capability cannot be granted to legacy faces, incomplete geometry or borrowed repair sources',async()=>{
  const d=await definition(),face=d.cells[0]!.face!;
  assert.throws(()=>nativeHeadBank({...d,version:'native-head-bank-3'}),/Only explicit bank5/);
  assert.throws(()=>nativeHeadBank({...d,capabilities:{...d.capabilities,expressions:false}}),/Only explicit bank5/);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,version:'native-head-face-1'}).success,false);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,emotions:undefined}).success,false);
  const missing=structuredClone(d);missing.cells[0]!.face!.emotions!.mouth.repair.sourceId='another-actor';
  assert.throws(()=>nativeHeadBank(missing),/repair|source/);
  const held=structuredClone(d);held.cells[0]!.restMood='neutral';assert.throws(()=>nativeHeadBank(held),/happy source rest/);
  const old=await headFaceCandidate(repo,'lila','three-quarter-left');
  assert.throws(()=>nativeHeadFaceState(old.bank.cells[0]!.face!,{aperture:0,blink:0,look:{x:0,y:0},emotion},'test'),/face2/);
});

test('brow motion, repair strips and closed mouth controls must remain inside their own protected source regions',async()=>{
  const face=(await definition()).cells[0]!.face!,e=face.emotions!;
  assert.equal(NativeHeadFaceSchema.safeParse({...face,emotions:{...e,brows:{...e.brows,'screen-left':{...e.brows['screen-left'],up:80,tiltDeg:30}}}}).success,false);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,emotions:{...e,mouth:{...e.mouth,frown:e.mouth.frown.map(p=>({...p,y:0}))}}}).success,false);
  const badStrip=structuredClone(face);badStrip.emotions!.mouth.repair.strip={x:0,y:0,width:99999,height:1};
  assert.equal(NativeHeadFaceSchema.safeParse(badStrip).success,false);
  const left=e.brows['screen-left'];assert.ok(!('visibility' in left),'legacy emotion source retains its visible brow');
  assert.equal(NativeHeadFaceSchema.safeParse({...face,protectedContours:[...face.protectedContours,left.region]}).success,false);
  assert.throws(()=>nativeHeadFaceState(face,{aperture:0,blink:0,look:{x:0,y:0},emotion:{...emotion,brow:NaN}},'test'),/bounded emotion/);
});

test('source rest remains native; silent expressions are closed contours and never create speech activity',async()=>{
  for(const entry of HEAD_FACE_EXPRESSION_CANDIDATES){const face=(await definition(entry.file)).cells[0]!.face!;
    const rest=nativeHeadFaceState(face,{aperture:0,blink:0,look:{x:0,y:0}},'test');
    assert.equal(rest.face['test-mouth-emotion-repair']!.opacity,0);assert.equal(rest.face['test-mouth-generated']!.opacity,0);
    assert.equal(rest.face['test-eyes-layer']!.opacity,0);assert.equal(rest.face['test-brow-screen-left-layer']!.opacity,0);
    for(const aperture of [0,.2,1])for(const round of [0,1]){
      const state=nativeHeadFaceState(face,{aperture,blink:0,look:{x:0,y:0},emotion:{...emotion,round}},'test');
      if(aperture===0){const p=pathCoordinates(state.paths['test-mouth-aperture']!);
        assert.deepEqual(p.slice(2,4),p.slice(10,12));assert.deepEqual(p.slice(4,6),p.slice(8,10));
      }else assert.notEqual(state.paths['test-mouth-aperture'],rest.paths['test-mouth-aperture']);
    }
    const explicit=nativeHeadFaceState(face,{aperture:0,blink:0,look:{x:0,y:0},emotion:NATIVE_FACE_REST_EMOTION},'test');assert.deepEqual(explicit,rest);
  }
});

test('mixed smile/frown, round and speech controls stay in the registered convex mouth region',async()=>{
  const inside=(x:number,y:number,poly:Array<{x:number;y:number}>)=>{let sign=0;
    for(let i=0;i<poly.length;i++){const a=poly[i]!,b=poly[(i+1)%poly.length]!,cross=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);if(Math.abs(cross)<1e-5)continue;const next=Math.sign(cross);if(sign&&next!==sign)return false;sign=next;}return true;
  };
  for(const entry of HEAD_FACE_EXPRESSION_CANDIDATES){const f=(await definition(entry.file)).cells[0]!.face!;
    for(const smile of [0,.3,.8,1])for(const frown of [0,.4,.9,1])for(const round of [0,.25,1])for(const aperture of [0,.3,.7,1]){
      const state=nativeHeadFaceState(f,{aperture,blink:0,look:{x:0,y:0},emotion:{...emotion,smile,frown,round}},'test');
      for(const d of Object.values(state.paths)){const p=pathCoordinates(d);for(let i=0;i<p.length;i+=2)assert.ok(inside(p[i]!,p[i+1]!,f.mouth.region),entry.id+' generated control');}
    }
  }
});

test('own source SVG exposes every bounded mouth/eye/brow selector without whole-face transforms or extra assets',async()=>{
  const f=await headFaceCalibration(repo,{actor:'lila',view:'three-quarter-left',face:'expressions',mood:'sad'});
  const svg=nativeHeadBankSvg(f.profile,(_file,sha)=>'assets/rigs/'+sha+'.png');
  const state=nativeHeadFaceState(f.bank.cells[0]!.face!,{aperture:.7,blink:.5,look:{x:1,y:0},emotion},'native-face-0');
  for(const key of [...Object.keys(state.face),...Object.keys(state.paths)])assert.ok(svg.includes('id="'+key+'"'),key);
  assert.ok(!svg.includes('scale(-'));assert.ok(!svg.includes('view-expression-brow'));
  assert.ok(svg.includes('href="#native-head-bank-source-0"'));assert.ok(!svg.includes('reference-karo'));
  for(const aperture of [0,.001,.05,.7])for(const amount of [.001,.05,.4,1]){const local=nativeHeadFaceState(f.bank.cells[0]!.face!,{aperture,blink:amount,look:{x:amount,y:0},emotion:{...emotion,brow:amount,smile:1-amount}},'native-face-0');
    for(const [id,value] of Object.entries(local.face))if(/(?:-layer|-mouth-generated|-mouth-emotion-repair)$/.test(id))assert.ok(value.opacity===0||value.opacity===1,id+' painter must not crossfade native ink');
  }
});

test('emotions, speaker mouth, partner look and original gestures survive arbitrary seeks and camera slicing together',async()=>{
  for(const entry of HEAD_FACE_EXPRESSION_CANDIDATES){
    const selection={actor:entry.actor,view:entry.view,face:'expressions',mood:'angry',action:'think',look:'ahead'};
    const full=await headFaceCalibration(repo,{...selection,slice:'whole'}),slice=await headFaceCalibration(repo,{...selection,slice:'second-half'});
    assert.equal(full.clock.sourceIdentityHash,slice.clock.sourceIdentityHash);
    const at=(f:typeof full,t:number)=>samplePerformance(f.plan,f.profile,t,f.activity,f.sourceClock,f.clock);
    for(const global of [2150,3450,2000,3599,2150]){const a=at(full,global),b=at(slice,global-2000);
      assert.deepEqual(a.face,b.face);assert.deepEqual(a.paths,b.paths);assert.deepEqual(a.hands,b.hands);assert.deepEqual(a.transforms,b.transforms);
    }
    assert.throws(()=>at({...slice,clock:{...slice.clock,expressions:[]}},150),/expression|source/);
  }
});

test('compiler refinement includes original eyebrow matrices as well as nonlinear face paths through reaction boundaries',async()=>{
  const f=await headFaceCalibration(repo,{actor:'lila',view:'three-quarter-left',face:'expressions',mood:'afraid',look:'ahead'});
  const c=compilePerformance(f.plan,f.profile,f.activity,'actor-',f.sourceClock,f.clock);
  assert.equal(c.report.nativeHeadBank!.sourceFace!.version,'native-head-face-2');assert.equal(c.report.nativeHeadBank!.productionReady,false);
  assert.ok(c.js.includes('native-face-0-brow-screen-right-glyph'));
  for(const line of c.js.split('\n'))if(/native-face-\d+-(?:mouth-(?:layer|generated|emotion-repair)|eyes-layer|brow-screen-(?:left|right)-layer)/.test(line))assert.ok(line.startsWith('tl.set('),'repair/native ink painter changes must be discrete');
  const face=f.bank.cells[0]!.face!,scale=f.bank.source.pixelScale!*f.plan.scale*f.profile.appearance.headScale*f.profile.appearance.bodyScale;
  for(let i=1;i<c.frames.length;i++){const a=c.frames[i-1]!,b=c.frames[i]!,wanted=samplePerformance(f.plan,f.profile,(a.timeMs+b.timeMs)/2,f.activity,f.sourceClock,f.clock);
    assert.ok(nativeHeadFaceMatrixError(face,'native-face-0',a.face,b.face,wanted.face,.5)*scale<=.201);
  }
});

test('two actors carry complete reaction and gaze histories through the actual five-shot canonical factory design',async()=>{
  for(const staging of ['lila-left','lila-right'] as const){
    const f=await createNativeHeadSeatTracer(repo,{staging,acting:'emotional-reactions',face:'expressions'});
    assert.equal(f.board.shots.length,NATIVE_SEAT_TRACER_CUTS.length-1);assert.equal(f.productionAcceptance,false);assert.equal(f.finalExportAllowed,false);
    for(const shot of f.board.shots)for(const id of ['lila','karo'] as const){const clock=actorViewActingClock(f.board,shot,id);assert.ok(clock);
      assert.deepEqual(clock.expressions,nativeDialogueExpressionWindows[id]);assert.equal(clock.ownerId,id);
    }
    assert.deepEqual(f.headSelection.map(h=>h.definitionFile).sort(),HEAD_FACE_EXPRESSION_CANDIDATES.filter(c=>
      c.view===(c.actor==='lila'?(staging==='lila-left'?'three-quarter-right':'three-quarter-left'):(staging==='lila-left'?'three-quarter-left':'three-quarter-right'))).map(c=>c.file).sort());
  }
  await assert.rejects(createNativeHeadSeatTracer(repo,{acting:'emotional-reactions'}),/explicit face/);
  assert.throws(()=>nativeSeatTracerOptions(['--native-heads','--acting','emotional-reactions']),/explicit --face/);
  assert.equal(nativeSeatTracerOptions(['--native-heads','--face','expressions','--acting','emotional-reactions']).dialogue!.face,'expressions');
});

test('mode and mood are bound in preview URLs/revisions; missing supporting emotions cannot fall back to a principal',async()=>{
  const a=await headFaceCalibration(repo,{face:'expressions',mood:'sad'}),b=await headFaceCalibration(repo,{face:'expressions',mood:'angry'});
  assert.notEqual(hash(a.clock),hash(b.clock));assert.notEqual(headFacePreviewRevision(a),headFacePreviewRevision(b));
  await assert.rejects(headFacePreviewFile(repo,a.selection,'index.html',headFacePreviewRevision(b)),/binding changed/);
  assert.ok(headFaceWorkbench({face:'expressions',mood:'sad'}).includes('/expressions/sad/'));
  await assert.rejects(headFaceCalibration(repo,{actor:'prehistoric-male-bald',view:'three-quarter-left',face:'expressions'}),/has not been authored/);
  await assert.rejects(headFaceCalibration(repo,{face:'speech-eyes',mood:'sad'}),/select own expressions/);
});

test('Studio expression routes retain exact mood/scene binding and legacy routes retain their original bank',async t=>{
  const app=await buildServer({repoRoot:repo,logger:false});t.after(()=>app.close());
  const base='/api/topics/prehistoric-life/head-face-preview/lila/views/three-quarter-left/rest/ahead/whole/expressions/sad/';
  const binding=await app.inject({method:'GET',url:base+'binding.json'});assert.equal(binding.statusCode,200);
  const revision=binding.json().revision as string;
  const scene=await app.inject({method:'GET',url:base+'scene.js?revision='+revision});assert.equal(scene.statusCode,200);assert.ok(scene.body.includes('native-face-0-brow-screen-left-glyph'));
  const wrong=await app.inject({method:'GET',url:base.replace('/sad/','/angry/')+'scene.js?revision='+revision});assert.notEqual(wrong.statusCode,200);
  const legacy=await app.inject({method:'GET',url:'/api/topics/prehistoric-life/head-face-preview/lila/views/three-quarter-left/rest/ahead/whole/binding.json'});assert.equal(legacy.statusCode,200);assert.notEqual(legacy.json().revision,revision);
  const missing=await app.inject({method:'GET',url:base.replace('/lila/','/prehistoric-male-bald/')+'binding.json'});assert.notEqual(missing.statusCode,200);
});
