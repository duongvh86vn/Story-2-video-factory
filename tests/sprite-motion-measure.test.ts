// NOT RUN. Static measurement assertions/PNG fixtures execute only in delegated callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {hash} from '../packages/core/utils.js';
import {temporary} from './support.js';
import {MotionMeasureLayoutSchema,measureMotionPixels,motionMeasureWorksheets,writeMotionMeasurement,type MotionMeasureLayout} from '../packages/motion/measure.js';

const layout=():MotionMeasureLayout=>({version:'actor-motion-measure-layout-1',sheetHash:'a'.repeat(64),frames:[
  {id:'position-1',rect:{x:0,y:0,w:4,h:4},regions:[{name:'lower-band',rect:{x:0,y:2,w:4,h:2}}]},
  {id:'position-2',rect:{x:0,y:0,w:4,h:4},regions:[]}]});

test('alpha occupancy uses the explicit native/region coordinates and preserves repeated positions without anatomy inference',()=>{
  const raw=new Uint8Array(4*4*4);for(const [x,y,alpha] of [[1,1,127],[2,1,128],[3,3,255]])raw[(y!*4+x!)*4+3]=alpha!;
  const before=raw.slice(),selected=layout(),measured=measureMotionPixels(raw,{width:4,height:4},selected);
  assert.deepEqual(measured.frames.map(frame=>frame.id),['position-1','position-2']);
  assert.equal(measured.frames[0]!.pixels,2);assert.deepEqual(measured.frames[0]!.bounds,{x:2,y:1,w:2,h:3});
  assert.deepEqual(measured.frames[0]!.regions[0]!.bounds,{x:3,y:3,w:1,h:1});
  assert.deepEqual(measured.frames[0]!.touchesEdges,{left:false,top:false,right:true,bottom:true});
  assert.deepEqual(raw,before);assert.deepEqual(selected,layout());
  assert.equal(measureMotionPixels(raw,{width:4,height:4},selected,1).frames[0]!.pixels,3);
});

test('measurement selection and decode bounds reject ambiguity/oversampling instead of guessing a grid',()=>{
  const selected=layout(),raw=new Uint8Array(4*4*4);
  assert.throws(()=>MotionMeasureLayoutSchema.parse({...selected,frames:[selected.frames[0],selected.frames[0]]}),/Duplicate measurement frame/);
  assert.throws(()=>MotionMeasureLayoutSchema.parse({...selected,frames:[{...selected.frames[0],regions:[selected.frames[0]!.regions[0],selected.frames[0]!.regions[0]]}]}),/Duplicate measurement region/);
  assert.throws(()=>MotionMeasureLayoutSchema.parse({...selected,frames:[{...selected.frames[0],regions:[{name:'outside',rect:{x:3,y:0,w:2,h:1}}]}]}),/escapes its frame/);
  assert.throws(()=>MotionMeasureLayoutSchema.parse({...selected,frames:[{id:'huge',rect:{x:0,y:0,w:10000,h:10000},regions:[]}]}),/64 million/);
  assert.throws(()=>measureMotionPixels(raw.subarray(0,63),{width:4,height:4},selected),/exact decoded RGBA/);
  assert.throws(()=>measureMotionPixels(raw,{width:4,height:4},{...selected,frames:[{...selected.frames[0]!,rect:{x:1,y:0,w:4,h:4}}]}),/escapes PNG/);
  assert.throws(()=>measureMotionPixels(raw,{width:4,height:4},selected,0));
});

test('worksheet pages retain unscaled native coordinates and contain a fixed local source URL plus advisory labels',()=>{
  const selected=layout();selected.frames=Array.from({length:17},(_,index)=>({...selected.frames[0]!,id:`position-${index+1}`}));
  const pages=motionMeasureWorksheets(measureMotionPixels(new Uint8Array(64),{width:4,height:4},selected),{width:4,height:4});
  assert.equal(pages.length,2);assert.match(pages[0]!,/NOT registration\/anatomy\/motion approval/);
  assert.match(pages[0]!,/viewBox="0 0 4 4"/);assert.match(pages[0]!,/href="source.png"/);
  const markup=pages.join('');
  assert.doesNotMatch(markup,/<script|foreignObject|\bon\w+\s*=|@import|url\s*\(/i);
  const resources=Array.from(markup.matchAll(/\b(?:href|src)\s*=\s*["']([^"']*)["']/gi),match=>match[1]);
  assert.equal(resources.length,17);assert.ok(resources.every(resource=>resource==='source.png'));
});

test('offline authoring output is immutable and preserves source bytes, while invalid/production output selections publish nothing',async t=>{
  const root=await temporary(t),bytes=await sharp({create:{width:4,height:4,channels:4,background:{r:10,g:20,b:30,alpha:.5}}}).png().toBuffer();
  const selected={...layout(),sheetHash:hash(bytes)};
  await fs.writeFile(path.join(root,'selected.png'),bytes);await fs.writeFile(path.join(root,'layout.json'),JSON.stringify(selected));
  for(const output of ['assets/measurement','Assets/measurement','input/measurement','SCENES/measurement','output/measurement','renders/measurement','artifacts/measurement',
    'work/measurement','Work/measurement','previews/measurement','Previews/measurement','logs/measurement','LOGS/measurement','../escape','a/../escape'])
    await assert.rejects(writeMotionMeasurement(root,'selected.png','layout.json',output),/separate relative authoring/);
  await assert.rejects(fs.access(path.join(root,'assets')),{code:'ENOENT'});
  await fs.writeFile(path.join(root,'layout.json'),JSON.stringify({...selected,sheetHash:'b'.repeat(64)}));
  await assert.rejects(writeMotionMeasurement(root,'selected.png','layout.json','authoring/v1'),/different PNG version/);
  await assert.rejects(fs.access(path.join(root,'authoring')),{code:'ENOENT'});
  await fs.writeFile(path.join(root,'layout.json'),JSON.stringify(selected));
  const first=await writeMotionMeasurement(root,'selected.png','layout.json','authoring/v1'),report=await fs.readFile(path.join(root,first.report));
  assert.equal(first.sourceHash,hash(bytes));assert.equal(first.productionReady,false);
  assert.deepEqual(await fs.readFile(path.join(root,'authoring/v1/source.png')),bytes);assert.deepEqual(await fs.readFile(path.join(root,'selected.png')),bytes);
  assert.deepEqual(await writeMotionMeasurement(root,'selected.png','layout.json','authoring/v1'),first);
  await assert.rejects(writeMotionMeasurement(root,'selected.png','layout.json','authoring/v1',1),/Immutable/);
  assert.deepEqual(await fs.readFile(path.join(root,first.report)),report);await assert.rejects(fs.access(path.join(root,'project.yaml')),{code:'ENOENT'});
});
