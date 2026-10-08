import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {hash} from '../packages/core/utils.js';
import {headTurnInventory,headTurnMaterial,validateHeadTurnPromptSources} from '../packages/topics/head-turn-art.js';
import {headTurnDraft,headTurnSourceBinding,checkHeadTurnDraft,checkBoundHeadTurnDraft} from '../packages/topics/head-turn-landmarks.js';
import {HeadTurnDraftSchema,HeadTurnMaterialSchema,HeadTurnPromptSchema,headTurnCellRegion,HEAD_TURN_FOLDER} from '../packages/topics/head-turn-schemas.js';
import {headTurnEditorScript,headTurnWorkbench} from '../packages/topics/head-turn-workbench.js';
import inventory from '../library/topics/prehistoric-life/head-turn-studies/inventory-v1.json' with {type:'json'};

// DECLARED ONLY by implementation agent; runtime execution delegated.
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lila=HeadTurnMaterialSchema.parse(inventory.materials.find(m=>m.file==='lila-head-turn-v1.png'));
async function withArtCopy(run:(root:string)=>Promise<void>){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'native-head-turn-'));
  try{
    const files=new Set(inventory.materials.flatMap(m=>[`${HEAD_TURN_FOLDER}/${m.file}`,`${HEAD_TURN_FOLDER}/${m.file.slice(0,-4)}.json`,m.promptFile,...m.references.map(r=>r.file)]));
    for(const relative of files){await fs.mkdir(path.dirname(path.join(root,relative)),{recursive:true});await fs.copyFile(path.join(repo,relative),path.join(root,relative));}
    await run(root);
  }finally{await fs.rm(root,{recursive:true,force:true});}
}
test('measured head material inventory retains all64 unregistered source cells',async()=>{
  const materials=await headTurnInventory(repo);
  assert.equal(materials.length,4);assert.equal(materials.reduce((n,m)=>n+m.cells.length,0),64);
  for(const m of materials){assert.equal(m.width,1254);assert.equal(m.height,1254);assert.equal(m.registered,false);assert.equal(m.productionReady,false);assert.equal(m.yawMeasured,false);assert.ok(m.transparentPixels>0);}
});
test('odd canvas partition uses original integer pixels without resizing or gaps',()=>{
  const regions=Array.from({length:16},(_,i)=>headTurnCellRegion(1254,1254,i+1));
  assert.deepEqual(regions.slice(0,4).map(r=>r.width),[313,314,313,314]);
  assert.equal(regions.reduce((n,r)=>n+r.width*r.height,0),1254*1254);
  for(let row=0;row<4;row++)for(let col=1;col<4;col++){const left=regions[row*4+col-1]!,right=regions[row*4+col]!;assert.equal(left.x+left.width,right.x);}
});
test('material and draft records cannot claim approved or registered motion',()=>{
  for(const key of ['approved','registered','productionReady','motionVerified','yawMeasured'])assert.equal(HeadTurnMaterialSchema.safeParse({...lila,[key]:true}).success,false);
  const draft=headTurnDraft(lila);
  for(const key of ['approved','registered','productionReady','motionVerified'])assert.equal(HeadTurnDraftSchema.safeParse({...draft,[key]:true}).success,false);
});
test('prompt requested geometry is never seeded into a blank measured draft',()=>{
  const draft=headTurnDraft(lila),report=checkHeadTurnDraft(draft,lila);
  assert.ok(draft.cells.every(c=>c.yawDeg===undefined&&c.neck===undefined&&c.eyes===undefined));
  assert.equal(report.landmarksComplete,false);assert.equal(report.registered,false);assert.equal(report.productionReady,false);
  assert.ok(report.pending.some(p=>p.reason==='missing measured yawDeg'));
});
test('draft source binding rejects stale image, material, actor and canvas',()=>{
  const draft=headTurnDraft(lila);
  for(const update of [{sha256:'1'.repeat(64)},{materialFingerprint:'1'.repeat(64)},{file:'lila-head-turn-v2.png'},{actor:'karo',file:'karo-head-turn-v1.png'},{width:1256}])assert.throws(()=>checkHeadTurnDraft({...draft,...update},lila),/stale|another image/);
});
test('check request cannot import a different actor into the displayed source',()=>{
  const karo=HeadTurnMaterialSchema.parse(inventory.materials.find(m=>m.file==='karo-head-turn-v1.png'));
  assert.throws(()=>checkBoundHeadTurnDraft({source:headTurnSourceBinding(lila),draft:headTurnDraft(karo)},lila),/another image/);
  assert.throws(()=>checkBoundHeadTurnDraft({source:headTurnSourceBinding(karo),draft:headTurnDraft(karo)},lila),/displayed source/);
  assert.equal(checkBoundHeadTurnDraft({source:headTurnSourceBinding(lila),draft:headTurnDraft(lila)},lila).registered,false);
});
test('source cell ownership and eye slots reject off-cell coordinates and swaps',()=>{
  const draft=headTurnDraft(lila),first=draft.cells[0]!;
  first.neck={x:314,y:250};assert.equal(HeadTurnDraftSchema.safeParse(draft).success,false);delete first.neck;
  first.eyes={'screen-left':{visible:true,center:{x:220,y:160}},'screen-right':{visible:true,center:{x:140,y:160}}};
  assert.equal(HeadTurnDraftSchema.safeParse(draft).success,false);
});
test('landmark completeness requires explicit eye occlusion and monotonic measured yaw',()=>{
  const draft=headTurnDraft(lila);draft.cells[0]!.yawDeg=5;draft.cells[1]!.yawDeg=-10;
  const report=checkHeadTurnDraft(draft,lila);
  assert.ok(report.pending.some(p=>p.cell===2&&p.reason.includes('yaw')));
  assert.ok(report.pending.some(p=>p.reason.includes('explicit occlusion')));
});
test('contour checking rejects markers outside the manually declared face',()=>{
  const draft=headTurnDraft(lila),c=draft.cells[0]!;
  c.faceContour=[{x:100,y:100},{x:170,y:100},{x:170,y:200},{x:100,y:200}];c.nose={x:210,y:150};
  assert.ok(checkHeadTurnDraft(draft,lila).pending.some(p=>p.reason==='nose lies outside the manually drawn face contour'));
});
test('prompt provenance must use same-actor primary and repair target',async()=>{
  const prompt=JSON.parse(await fs.readFile(path.join(repo,lila.promptFile),'utf8')) as Record<string,unknown>;
  assert.equal(HeadTurnPromptSchema.safeParse({...prompt,referenceImages:[{file:'docs/topics/assets/reference-karo-full.png',sha256:'0'.repeat(64),role:'primary-character-identity'}]}).success,false);
});
test('writer source precondition rejects wrong prompt ownership before persistence',async()=>{
  const prompt=HeadTurnPromptSchema.parse(JSON.parse(await fs.readFile(path.join(repo,lila.promptFile),'utf8')));
  await assert.rejects(validateHeadTurnPromptSources(repo,'karo','karo-head-turn-v1.png',prompt),/ownership/);
  const stale={...prompt,referenceImages:prompt.referenceImages.map(r=>({...r,sha256:'0'.repeat(64)}))};
  await assert.rejects(validateHeadTurnPromptSources(repo,'lila',lila.file,stale),/reference changed/);
});
test('changed raw PNG or reference bytes cannot pass material delivery',async()=>{
  await withArtCopy(async root=>{await fs.appendFile(path.join(root,HEAD_TURN_FOLDER,lila.file),'changed');await assert.rejects(headTurnMaterial(root,lila.file),/image changed/);});
  await withArtCopy(async root=>{await fs.appendFile(path.join(root,'docs/topics/assets/reference-lila-full.png'),'changed');await assert.rejects(headTurnMaterial(root,lila.file),/reference changed/);});
});
test('changed material metadata cannot masquerade as source measurements',async()=>{
  await withArtCopy(async root=>{
    const altered=structuredClone(lila);altered.cells[0]!.pixelSha256='0'.repeat(64);
    await fs.writeFile(path.join(root,HEAD_TURN_FOLDER,lila.file.slice(0,-4)+'.json'),JSON.stringify(altered));
    await assert.rejects(headTurnMaterial(root,lila.file),/metadata differs/);
  });
});
test('browser editor source parses and workbench retains held-state controls',async()=>{
  // Syntax parsing is not browser interaction or proof of coordinate mapping.
  assert.doesNotThrow(()=>new Script(headTurnEditorScript));
  const html=await headTurnWorkbench(repo,lila.file);
  assert.ok(html.includes('data-head-turn='));assert.ok(html.includes('absolute-source-pixels'));assert.ok(html.includes('head-turn-editor.js'));assert.ok(html.includes('không duyệt production'));
  assert.equal(hash(lila).length,64);
});
