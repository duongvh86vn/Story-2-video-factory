// DECLARED ONLY; NOT RUN. Raw-source measurements are not motion acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {hash} from '../packages/core/utils.js';
import {HEAD_CELL_FOLDER,HeadCellFileSchema,HeadCellMaterialSchema,HeadCellPromptSchema,headCellArtDescription,headCellInventory,headCellMaterial,readHeadCellSource,validateHeadCellPromptSources} from '../packages/topics/head-cell-art.js';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const front='lila-head-front-v1.png',side='lila-head-near-right-v1.png';
async function withArtCopy(run:(root:string)=>Promise<void>){
  const parent=path.resolve(os.tmpdir()),root=await fs.mkdtemp(path.join(parent,'head-cell-art-'));
  try{
    const materials=await headCellInventory(repo),files=new Set(materials.flatMap(m=>[`${HEAD_CELL_FOLDER}/${m.file}`,`${HEAD_CELL_FOLDER}/${m.file.slice(0,-4)}.json`,m.promptFile,...m.references.map(r=>r.file)]));
    for(const relative of files){await fs.mkdir(path.dirname(path.join(root,relative)),{recursive:true});await fs.copyFile(path.join(repo,relative),path.join(root,relative));}
    await run(root);
  }finally{assert.equal(path.dirname(root),parent);assert.ok(path.basename(root).startsWith('head-cell-art-'));await fs.rm(root,{recursive:true,force:true});}
}

test('individual raw PNG inventory binds the two unapproved sources and their actual alpha',async()=>{
  const materials=await headCellInventory(repo);
  assert.deepEqual(materials.map(m=>m.file),[front,side]);
  assert.deepEqual(materials.map(m=>m.sha256),['9fe7c077165da2483af272f0ec70a9e01fb3e467203e46ee8019af23a104e552','299a47ecbb78536f314884159c7a3c2736d8b166715f74b20d41412c7d0e9c57']);
  assert.deepEqual(materials.map(m=>m.requestedYawDeg),[0,8]);
  for(const m of materials){
    assert.equal(m.width,1024);assert.equal(m.height,1536);assert.equal(m.edgePixels,0);
    assert.equal(m.opaquePixels,0);assert.ok(m.partialPixels>0&&m.transparentPixels>0);
    assert.equal(m.alphaHistogram.reduce((a,n)=>a+n,0),m.width*m.height);
    assert.equal(m.status,'unreviewed-source-candidate');
    for(const key of ['approved','registered','productionReady','motionVerified','yawMeasured'] as const)assert.equal(m[key],false);
  }
  assert.equal(headCellArtDescription.availableBanks.length,0);
});

test('PNG/prompt/material paths reject newline, foreign source, traversal and noncanonical filenames before reading',async()=>{
  for(const file of [front+'\n','../'+front,'karo-head--left-v1.png','lila-head-'+('a'.repeat(41))+'-v1.png','lila-head-front-v01.png','lila-head-front-v1.PNG','lila-head-front-v1-prompt.png'])assert.equal(HeadCellFileSchema.safeParse(file).success,false);
  for(const file of [`${HEAD_CELL_FOLDER}/${front}\n`,`${HEAD_CELL_FOLDER}/../${front}`,`${HEAD_CELL_FOLDER}/inventory-v1.json`,`${HEAD_CELL_FOLDER}/lila-head-front-v1-prompt.png`,'docs/topics/assets/reference-lila-full.png\n','C:/private.png'])await assert.rejects(readHeadCellSource(repo,file),/Unknown single head source path/);
});

test('individual source schema forbids fabricated measured yaw, approval or alpha claims',async()=>{
  const {record}=await headCellMaterial(repo,front);
  for(const key of ['approved','registered','productionReady','motionVerified','yawMeasured'])assert.equal(HeadCellMaterialSchema.safeParse({...record,[key]:true}).success,false);
  for(const altered of [{...record,visiblePixels:record.visiblePixels+1},{...record,partialPixels:record.partialPixels-1},{...record,opaquePixels:1},{...record,visibleBounds:{...record.visibleBounds,width:record.width+1}},{...record,actor:'karo'}])assert.equal(HeadCellMaterialSchema.safeParse(altered).success,false);
  const prompt=JSON.parse((await readHeadCellSource(repo,record.promptFile)).toString('utf8'));
  for(const key of ['approved','registered','productionReady','runtimeVerified'])assert.equal(HeadCellPromptSchema.safeParse({...prompt,[key]:true}).success,false);
  assert.equal(HeadCellPromptSchema.safeParse({...prompt,referenceImages:[{file:'docs/topics/assets/reference-karo-full.png',sha256:'0'.repeat(64),role:'primary-character-identity'}]}).success,false);
});

test('raw PNG and primary identity changes cannot pass either individual source delivery',async()=>{
  await withArtCopy(async root=>{await fs.appendFile(path.join(root,HEAD_CELL_FOLDER,side),'changed');await assert.rejects(headCellMaterial(root,side),/source changed/);});
  await withArtCopy(async root=>{await fs.appendFile(path.join(root,'docs/topics/assets/reference-lila-full.png'),'changed');for(const file of [front,side])await assert.rejects(headCellMaterial(root,file),/reference changed/);});
});

test('a near-right edit remains bound to front bytes and exact prompt provenance',async()=>{
  await withArtCopy(async root=>{await fs.appendFile(path.join(root,HEAD_CELL_FOLDER,front),'changed');await assert.rejects(headCellMaterial(root,side),/reference changed/);});
  await withArtCopy(async root=>{await fs.appendFile(path.join(root,HEAD_CELL_FOLDER,'lila-head-near-right-v1-prompt.json'),' ');await assert.rejects(headCellMaterial(root,side),/prompt changed/);});
});

test('forged RGBA hash, visible bounds or prompt refs cannot masquerade as immutable measurement',async()=>{
  for(const alter of [(m:Awaited<ReturnType<typeof headCellMaterial>>['record'])=>({...m,pixelSha256:'0'.repeat(64)}),(m:Awaited<ReturnType<typeof headCellMaterial>>['record'])=>({...m,edgePixels:m.edgePixels+1}),(m:Awaited<ReturnType<typeof headCellMaterial>>['record'])=>({...m,references:m.references.map(r=>({...r,sha256:'0'.repeat(64)}))})])await withArtCopy(async root=>{
    const {record}=await headCellMaterial(root,side);
    await fs.writeFile(path.join(root,HEAD_CELL_FOLDER,side.slice(0,-4)+'.json'),JSON.stringify(alter(record)));
    await assert.rejects(headCellMaterial(root,side),/measurement differs|ownership differs/);
  });
});

test('ownership and self-output edits fail before a material can be persisted',async()=>{
  const {record}=await headCellMaterial(repo,side),prompt=HeadCellPromptSchema.parse(JSON.parse((await readHeadCellSource(repo,record.promptFile)).toString('utf8')));
  await assert.rejects(validateHeadCellPromptSources(repo,'karo','karo-head-front-v1.png',prompt),/actor differs/);
  const self={...prompt,referenceImages:prompt.referenceImages.map(r=>r.role==='edit-target'?{...r,file:`${HEAD_CELL_FOLDER}/${side}`}:r)};
  await assert.rejects(validateHeadCellPromptSources(repo,'lila',side,self),/own output/);
  const stale={...prompt,referenceImages:prompt.referenceImages.map(r=>({...r,sha256:'0'.repeat(64)}))};
  await assert.rejects(validateHeadCellPromptSources(repo,'lila',side,stale),/reference changed/);
  assert.equal(hash(prompt.referenceImages).length,64);
});
