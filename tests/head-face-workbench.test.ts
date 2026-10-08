// DECLARED ONLY, NOT RUN. Runtime/render/browser belongs to the user's model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {buildServer} from '../apps/server/index.js';
import {samplePerformance} from '../packages/animation/compiler.js';
import {hash} from '../packages/core/utils.js';
import {NativeHeadBankDefinitionSchema} from '../packages/animation/native-head-bank.js';
import {headFaceCalibration,headFaceCandidate,headFacePreviewFile,headFacePreviewRevision} from '../packages/topics/head-face-workbench.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('full and camera-sliced face previews keep original mouth/blink/gesture phase in all authored views',async()=>{
  const views=[{actor:'lila',view:'three-quarter-right'},{actor:'karo',view:'three-quarter-right'},{actor:'lila',view:'three-quarter-left'},{actor:'karo',view:'three-quarter-left'}] as const;
  for(const {actor,view} of views)for(const action of ['rest','point','think'] as const){
    const full=await headFaceCalibration(repo,{actor,view,action,look:'ahead',slice:'whole'}),slice=await headFaceCalibration(repo,{actor,view,action,look:'ahead',slice:'second-half'});
    assert.equal(full.profile.appearance.bodyView,view);assert.equal(full.plan.headView,view);
    const gaze=full.plan.gazes[0]!;assert.ok('target' in gaze);
    assert.equal(gaze.target.x,view==='three-quarter-left'?50:370);
    if(action!=='rest')assert.equal(full.plan.gestures[0]!.hand,view==='three-quarter-left'?'left':'right');
    assert.equal(full.clock.sourceIdentityHash,slice.clock.sourceIdentityHash);
    assert.equal(full.bank.fingerprint,slice.bank.fingerprint);assert.deepEqual(full.plan.sourceHead,slice.plan.sourceHead);
    assert.notEqual(headFacePreviewRevision(full),headFacePreviewRevision(slice));
    const at=(f:typeof full,local:number)=>samplePerformance(f.plan,f.profile,local,f.activity,f.sourceClock,f.clock);
    const wanted=new Map([2000,2150,2650,2800,3450,3599,3999].map(time=>[time,at(full,time)]));
    for(const global of [3450,2000,3999,2800,2150,3599,2650,2000]){
      const actual=at(slice,global-2000),expected=wanted.get(global)!;
      assert.deepEqual(actual.face,expected.face);assert.deepEqual(actual.paths,expected.paths);
      assert.deepEqual(actual.hands,expected.hands);assert.deepEqual(actual.transforms,expected.transforms);
    }
    assert.equal(slice.sourceClock.activity.method,'segment-draft');assert.equal(slice.bank.productionReady,false);
  }
});

test('each left selection owns its own raw head/body/rest plate and cannot borrow another revision',async()=>{
  const left=await headFaceCalibration(repo,{actor:'lila',view:'three-quarter-left'});
  const right=await headFaceCalibration(repo,{actor:'lila'});
  assert.equal(left.bank.id,'lila-left-face-v1');
  assert.equal(left.bank.source.sha256,'0b95893960a2910fa0331db66431bfb828681d3a1b6ce03d9ba901e7d9e2b3a6');
  assert.equal(left.bank.bodyViews[0]!.sourceHash,'ef90f6783d89a8e554c12605065a218faf4e0f6aae4411ae00cccf6825b686bf');
  assert.notEqual(left.bank.fingerprint,right.bank.fingerprint);
  await assert.rejects(headFacePreviewFile(repo,left.selection,'index.html',headFacePreviewRevision(right)),/binding changed/);
  const karo=await headFaceCalibration(repo,{actor:'karo',view:'three-quarter-left'});
  assert.equal(karo.bank.id,'karo-left-face-v1');
  assert.equal(karo.bank.source.sha256,'2d0adfba965b08425d8c0312d674a997f8a7fa60b90d1532b4f62b58a0ac7410');
  assert.equal(karo.bank.bodyViews[0]!.sourceHash,'bfcffe1fac13281de68ca11910407bb22fde02f8f5f5d867054713399166fdf4');
  assert.equal(karo.bank.additionalSources?.[0]?.sha256,'1d439730677e66f9017f2763768470ffa61125f597bf1b496804406ae94b4b95');
  const renamedHeld=JSON.parse(await fs.readFile(path.join(repo,karo.definitionFile),'utf8'));
  const heldSha='1f84f61a4bf5e69c45903626df91517091013f16aa3bbc5bec52aa14609227b2';
  renamedHeld.additionalSources[0].sha256=heldSha;
  renamedHeld.cells[0].face.mouth.rest.source.sha256=heldSha;
  assert.throws(()=>NativeHeadBankDefinitionSchema.parse(renamedHeld),/Held head art/);
  await assert.rejects(headFacePreviewFile(repo,karo.selection,'index.html',headFacePreviewRevision(left)),/binding changed/);
  await assert.rejects(headFaceCalibration(repo,{actor:'lila',view:'profile-left'}));
});

test('preview assets and JS are bound to one source/clock revision and scene generator',async()=>{
  const selection={actor:'lila',action:'point',look:'rest',slice:'second-half'},fixture=await headFaceCalibration(repo,selection),revision=headFacePreviewRevision(fixture);
  const binding=JSON.parse((await headFacePreviewFile(repo,selection,'binding.json')).bytes.toString('utf8'));
  assert.equal(binding.revision,revision);assert.equal(binding.startMs,2000);assert.equal(binding.audioPresent,false);assert.equal(binding.productionReady,false);
  await assert.rejects(headFacePreviewFile(repo,selection,'scene.js'),/explicit current binding/);
  await assert.rejects(headFacePreviewFile(repo,selection,'scene.js','a'.repeat(64)),/binding changed/);
  await assert.rejects(headFacePreviewFile(repo,selection,'../../.env',revision),/Unknown/);
  await assert.rejects(headFacePreviewFile(repo,selection,'assets/rigs/'+'a'.repeat(64)+'.png',revision),/Unknown/);
  const html=(await headFacePreviewFile(repo,selection,'index.html',revision)).bytes.toString('utf8');
  assert.ok(html.includes('scene.js?revision='+revision));assert.ok(html.includes('style.css?revision='+revision));
  assert.ok(html.includes('/preview-bridge.js'));assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('assets/rigs/'+fixture.bank.source.sha256+'.png?revision='+revision));
  const report=JSON.parse((await headFacePreviewFile(repo,selection,'report.json',revision)).bytes.toString('utf8'));
  assert.equal(report.sourceIdentityHash,fixture.clock.sourceIdentityHash);assert.equal(report.revision,revision);
  assert.equal(report.audioPresent,false);assert.equal(report.phonemeLipSync,false);assert.equal(report.motionVerified,false);
  assert.equal(report.compiled.nativeHeadBank.fingerprint,fixture.bank.fingerprint);
  const vendor=await headFacePreviewFile(repo,selection,'vendor/gsap.min.js',revision);
  assert.equal(vendor.type,'application/javascript');assert.ok(vendor.bytes.length<=512*1024);
  assert.equal(hash(vendor.bytes),fixture.vendor.sha256);assert.equal(report.vendorSha256,fixture.vendor.sha256);
  assert.notEqual(headFacePreviewRevision({...fixture,vendor:{...fixture.vendor,sha256:'a'.repeat(64)}}),revision);
  const js=(await headFacePreviewFile(repo,selection,'scene.js',revision)).bytes.toString('utf8');
  assert.ok(js.includes('native-face-0-mouth-aperture'));assert.ok(js.includes('window.__timelines'));
});

test('the exact candidate loader rejects renamed actor, traversal and changed source bytes',async t=>{
  await assert.rejects(headFaceCandidate(repo,'../karo' as 'karo'));
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'face-workbench-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const definition='library/topics/prehistoric-life/head-face-registrations/lila-source-face-v1.json';
  const body=JSON.parse(await fs.readFile(path.join(repo,definition),'utf8'));
  await fs.mkdir(path.dirname(path.join(root,definition)),{recursive:true});
  await fs.writeFile(path.join(root,definition),JSON.stringify({...body,actor:'karo'}));
  await assert.rejects(headFaceCandidate(root,'lila'));
  // A valid opposite-view body binding still cannot replace the catalog view.
  await fs.writeFile(path.join(root,definition),JSON.stringify({...body,bodyViews:[{view:'three-quarter-left',sourceHash:'ef90f6783d89a8e554c12605065a218faf4e0f6aae4411ae00cccf6825b686bf'}]}));
  await assert.rejects(headFaceCandidate(root,'lila'),/compatible body view/);
  await fs.writeFile(path.join(root,definition),JSON.stringify({...body,source:{...body.source,file:'library/topics/prehistoric-life/head-cells/lila-head-source-angle-v1.png'}}));
  await assert.rejects(headFaceCandidate(root,'lila'),/exact fixed source-angle candidate/);
  await fs.writeFile(path.join(root,definition),JSON.stringify(body));
  // Source ownership stays strict even if the advertised registration is valid.
  await fs.mkdir(path.dirname(path.join(root,body.primary.file)),{recursive:true});
  await fs.writeFile(path.join(root,body.primary.file),'changed-source');
  await assert.rejects(headFaceCandidate(root,'lila'),/identity source changed/);
});

test('explicit view routes and legacy nested PNG URLs retain exact resources without route ambiguity',async()=>{
  const app=await buildServer({repoRoot:repo,logger:false});
  try{
    const legacy='/api/topics/prehistoric-life/head-face-preview/lila/rest/rest/whole/';
    const explicitRight='/api/topics/prehistoric-life/head-face-preview/lila/views/three-quarter-right/rest/rest/whole/';
    const fixture=await headFaceCalibration(repo,{actor:'lila'}),resource=fixture.resources.find(r=>r.sha256===fixture.bank.source.sha256)!;
    const a=await app.inject({url:legacy+'binding.json'}),b=await app.inject({url:explicitRight+'binding.json'});
    assert.equal(a.statusCode,200);assert.equal(b.statusCode,200);assert.equal(a.json().revision,b.json().revision);
    for(const base of [legacy,explicitRight]){
      const image=await app.inject({url:base+resource.path+'?revision='+a.json().revision});
      assert.equal(image.statusCode,200);assert.ok(String(image.headers['content-type']).includes('image/png'));
      assert.deepEqual(image.rawPayload,await fs.readFile(path.join(repo,resource.file)));
    }
    const left='/api/topics/prehistoric-life/head-face-preview/lila/views/three-quarter-left/rest/rest/whole/';
    const binding=await app.inject({url:left+'binding.json'});assert.equal(binding.statusCode,200);
    assert.notEqual(binding.json().revision,a.json().revision);
    const report=await app.inject({url:left+'report.json?revision='+binding.json().revision});
    assert.equal(report.statusCode,200);assert.equal(report.json().selection.view,'three-quarter-left');
    const karoBase='/api/topics/prehistoric-life/head-face-preview/karo/views/three-quarter-left/rest/rest/whole/';
    const karoBinding=await app.inject({url:karoBase+'binding.json'});assert.equal(karoBinding.statusCode,200);
    const karoReport=await app.inject({url:karoBase+'report.json?revision='+karoBinding.json().revision});
    assert.equal(karoReport.statusCode,200);assert.equal(karoReport.json().selection.actor,'karo');
    assert.equal(karoReport.json().selection.view,'three-quarter-left');
    const karoFixture=await headFaceCalibration(repo,{actor:'karo',view:'three-quarter-left'});
    for(const raw of karoFixture.resources.filter(r=>r.file.includes('/head-cells/')||r.file.includes('/head-face-plates/'))){
      const image=await app.inject({url:karoBase+raw.path+'?revision='+karoBinding.json().revision});
      assert.equal(image.statusCode,200);assert.deepEqual(image.rawPayload,await fs.readFile(path.join(repo,raw.file)));
    }
    const page=await app.inject({url:'/api/topics/prehistoric-life/head-faces?actor=lila&view=three-quarter-left'});
    assert.equal(page.statusCode,200);assert.ok(page.body.includes('name="view"'));assert.ok(page.body.includes('lila-head-left-dialogue-v1.png'));
    assert.ok(page.body.includes('data-face-base="'+left+'"'));
    const karoPage=await app.inject({url:'/api/topics/prehistoric-life/head-faces?actor=karo&view=three-quarter-left'});
    assert.equal(karoPage.statusCode,200);assert.ok(karoPage.body.includes('head-cells?file=karo-head-left-dialogue-v1.png'));
    assert.ok(!karoPage.body.includes('head-cells?file=lila-head-left-dialogue-v1.png'));
  }finally{await app.close();}
});

test('workbench endpoints expose read-only constrained preview with MIME, CSP, revision and no production promotion',async()=>{
  const app=await buildServer({repoRoot:repo,logger:false});
  try{
    const page=await app.inject({url:'/api/topics/prehistoric-life/head-faces?actor=karo&action=think&look=rest&slice=second-half'});
    assert.equal(page.statusCode,200);assert.equal(page.headers['cache-control'],'no-store');
    assert.ok(page.headers['content-security-policy']?.includes("connect-src 'self'"));
    assert.ok(page.body.includes('sandbox="allow-scripts"'));assert.ok(page.body.includes('data-face-start="2000"'));
    const player=await app.inject({url:'/api/topics/prehistoric-life/head-face-player.js'});
    assert.equal(player.statusCode,200);assert.ok(String(player.headers['content-type']).includes('javascript'));
    const base='/api/topics/prehistoric-life/head-face-preview/lila/rest/rest/whole/';
    const result=await app.inject({url:base+'binding.json'});assert.equal(result.statusCode,200);
    const revision=result.json().revision;
    const report=await app.inject({url:base+'report.json?revision='+revision});assert.equal(report.statusCode,200);
    assert.equal(report.headers['x-content-type-options'],'nosniff');assert.equal(report.json().productionReady,false);
    const stale=await app.inject({url:base+'scene.js?revision='+'f'.repeat(64)});assert.notEqual(stale.statusCode,200);
    for(const url of ['/api/topics/prehistoric-life/head-faces?actor=alien',base+'binding.json?file=.env',base+'arbitrary.js'])
      assert.notEqual((await app.inject({url})).statusCode,200);
  }finally{await app.close();}
});
