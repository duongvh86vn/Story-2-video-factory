import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {hash} from '../packages/core/utils.js';
import {createTimestampWorkbench} from '../apps/server/image-timestamp.js';

test('workbench rejects stale, absent and overlapping work; survives reload without inventing success',async t=>{
  const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'timestamp-ui-'));
  const source=path.join(cwd,'source'),output=path.join(cwd,'output');await fs.mkdir(path.join(source,'images'),{recursive:true});await fs.mkdir(path.join(source,'images_fullhd'));
  const png=await sharp(Buffer.from('<svg width="100" height="100"><rect width="100" height="100" fill="skyblue"/></svg>')).png().toBuffer();
  const clips=[1,2].map(id=>({id,srt_index:id,start_ms:(id-1)*1000,end_ms:id*1000,start_frame:(id-1)*30,end_frame:id*30,image:'images/000'+id+'.png',status:'completed'}));
  for(const c of clips)for(const dir of ['images','images_fullhd'])await fs.writeFile(path.join(source,dir,path.basename(c.image)),png);
  await fs.writeFile(path.join(source,'timeline.json'),JSON.stringify({version:1,fps:30,rounding:'nearest frame from absolute milliseconds; half up',gaps:'preserved',clips}));
  await fs.writeFile(path.join(source,'job.json'),JSON.stringify({scenes:clips.map(c=>({...c,text:'Story '+c.id,visual:'Image',image_sha256:hash(png)}))}));
  await fs.writeFile(path.join(source,'source.srt'),'1\n00:00:00,000 --> 00:00:01,000\nStory 1\n\n2\n00:00:01,000 --> 00:00:02,000\nStory 2\n');
  await fs.mkdir(path.join(cwd,'motion/assets'),{recursive:true});await fs.writeFile(path.join(cwd,'motion/assets/original.png'),png);
  const scene={id:'wheel',width:100,height:100,durationMs:1000,original:'assets/original.png',background:'assets/original.png',layers:[{id:'disc',image:'assets/original.png',kind:'surface',cx:50,cy:50,rx:10,ry:10,periodMs:1000,direction:1}]};
  await fs.writeFile(path.join(cwd,'motion/manifest.json'),JSON.stringify({demo:{version:1,fps:60,scenes:[scene]}}));
  let release!:()=>void,calls=0;const pause=new Promise<void>(r=>{release=r;});
  const config={cwd,source,output,bindings:[{clipId:1,manifest:'motion/manifest.json',scene:'wheel'}],worker:async()=>{calls++;await pause;throw Error('Fixture worker failed; no real media');}};
  const service=await createTimestampWorkbench(config);
  await assert.rejects(createTimestampWorkbench(config),/live workbench/);
  const catalog=await service.catalog();assert.equal(catalog.fps,60);assert.equal(catalog.clips.length,2);assert.equal(catalog.clips[1]!.hasMotion,false);
  await assert.rejects(service.start('render',{revision:'old',clipId:1}),/changed/);
  await assert.rejects(service.start('render',{revision:catalog.revision,clipId:2}),/prepared/);
  const job=await service.start('render-ready',{revision:catalog.revision});assert.deepEqual(job.clipIds,[1]);
  await assert.rejects(service.start('render',{revision:catalog.revision,clipId:1}),/running/);
  assert.equal((await service.catalog()).activeJob?.id,job.id);assert.ok(['queued','running'].includes((await service.job(job.id)).status));
  release();await service.idle();assert.equal((await service.job(job.id)).status,'failed');assert.equal((await service.job(job.id)).completed,0);assert.equal(calls,1);await service.close();
  // A recycled PID with a different process start is not the previous studio.
  await fs.writeFile(path.join(output,'studio-lease.json'),JSON.stringify({pid:process.pid,processStart:'1',owner:'stale fixture'}));
  const resumed=await createTimestampWorkbench(config);t.after(async()=>{await resumed.close();await fs.rm(cwd,{recursive:true,force:true});});assert.equal((await resumed.job(job.id)).status,'failed');assert.equal((await resumed.catalog()).clips[0]!.clipUrl,undefined);
  await fs.writeFile(path.join(cwd,'motion/assets/original.png'),'tampered');assert.equal((await resumed.catalog()).clips[0]!.hasMotion,false);
  await assert.rejects(resumed.start('render',{revision:catalog.revision,clipId:1}),/changed/);
});
