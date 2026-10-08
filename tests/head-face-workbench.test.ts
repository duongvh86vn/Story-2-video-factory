// DECLARED ONLY, NOT RUN. Runtime/render/browser belongs to the user's model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {buildServer} from '../apps/server/index.js';
import {samplePerformance} from '../packages/animation/compiler.js';
import {headFaceCalibration,headFaceCandidate,headFacePreviewFile,headFacePreviewRevision} from '../packages/topics/head-face-workbench.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('full and camera-sliced face previews keep original mouth/blink/gesture phase for both actors',async()=>{
  for(const actor of ['lila','karo'] as const)for(const action of ['rest','point','think'] as const){
    const full=await headFaceCalibration(repo,{actor,action,look:'ahead',slice:'whole'}),slice=await headFaceCalibration(repo,{actor,action,look:'ahead',slice:'second-half'});
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
  await fs.writeFile(path.join(root,definition),JSON.stringify(body));
  // Source ownership stays strict even if the advertised registration is valid.
  await fs.mkdir(path.dirname(path.join(root,body.primary.file)),{recursive:true});
  await fs.writeFile(path.join(root,body.primary.file),'changed-source');
  await assert.rejects(headFaceCandidate(root,'lila'),/identity source changed/);
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
