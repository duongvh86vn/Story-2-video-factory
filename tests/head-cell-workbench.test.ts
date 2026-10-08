// DECLARED ONLY, NOT RUN. No server/browser tests executed by implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildServer} from '../apps/server/index.js';
import {headCellMaterial,headCellInventory} from '../packages/topics/head-cell-art.js';
import {headCellWorkbench} from '../packages/topics/head-cell-workbench.js';
import {headCellDraft,headCellSourceBinding} from '../packages/topics/head-cell-landmarks.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('workbench binds one whole PNG and original reference without atlas geometry or inferred angles',async()=>{
  const html=await headCellWorkbench(repo,'lila-head-near-right-v1.png');
  assert.ok(html.includes('viewBox="0 0 1024 1536"'));
  assert.ok(html.includes('/api/topics/prehistoric-life/head-cells/lila-head-near-right-v1.png'));
  assert.ok(html.includes('reference-lila-full.png'));assert.ok(html.includes('Karo chưa có'));
  await assert.rejects(headCellWorkbench(repo,'karo-head-front-v1.png'),/No such/);
  await assert.rejects(headCellWorkbench(repo,'lila-head-front-v1.png\n'));
});
test('source-bound draft API serves protected MIME/CSP and preserves blank incomplete draft',async()=>{
  const app=await buildServer({repoRoot:repo,logger:false});
  try{
    const response=await app.inject({method:'GET',url:'/api/topics/prehistoric-life/head-cells?file=lila-head-front-v1.png'});
    assert.equal(response.statusCode,200);assert.ok(response.headers['content-security-policy']?.includes("script-src 'self'"));
    assert.equal(response.headers['cache-control'],'no-store');
    const script=await app.inject({method:'GET',url:'/api/topics/prehistoric-life/head-cell-editor.js'});
    assert.equal(script.statusCode,200);assert.ok(String(script.headers['content-type']).includes('javascript'));
    assert.equal(script.headers['x-content-type-options'],'nosniff');
    const {record}=await headCellMaterial(repo,'lila-head-front-v1.png'),draft=headCellDraft(record);
    const check=await app.inject({method:'POST',url:'/api/topics/prehistoric-life/head-cell-draft/check',payload:{source:headCellSourceBinding(record),draft}});
    assert.equal(check.statusCode,200);assert.equal(check.headers['cache-control'],'no-store');
    const result=check.json();assert.equal(result.landmarksComplete,false);assert.deepEqual(result.draft,draft);
    for(const flag of ['approved','registered','productionReady','motionVerified'])assert.equal(result[flag],false);
  }finally{await app.close();}
});
test('API rejects a different displayed PNG and fabricated approval while material remains unchanged',async()=>{
  const app=await buildServer({repoRoot:repo,logger:false});
  try{
    const before=await headCellInventory(repo),{record}=await headCellMaterial(repo,'lila-head-front-v1.png'),{record:other}=await headCellMaterial(repo,'lila-head-near-right-v1.png'),draft=headCellDraft(record);
    for(const payload of [{source:headCellSourceBinding(other),draft},{source:headCellSourceBinding(record),draft:{...draft,approved:true}},
      {source:headCellSourceBinding(record),draft:{...draft,source:{...draft.source,sha256:'0'.repeat(64)}}}]){
      const result=await app.inject({method:'POST',url:'/api/topics/prehistoric-life/head-cell-draft/check',payload});
      assert.notEqual(result.statusCode,200);
    }
    const large=await app.inject({method:'POST',url:'/api/topics/prehistoric-life/head-cell-draft/check',headers:{'content-type':'application/json'},payload:'{"notes":"'+('x'.repeat(210*1024))+'"}'});
    assert.equal(large.statusCode,413);assert.deepEqual(await headCellInventory(repo),before);
  }finally{await app.close();}
});
