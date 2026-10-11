import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {hash} from '../packages/core/utils.js';
import {createTimestampWorkbench} from '../apps/server/image-timestamp.js';
import {readFlowImageTimeline,retimeImageScene} from '../packages/image-motion/flow-timeline.js';
import {createImageMotionHtml,type ImageMotionDemo} from '../packages/image-motion/scene.js';
import {TIMESTAMP_PREPARER_VERSION} from '../packages/image-motion/timestamp-prepare.js';
import {emptyTimestampMotion} from '../packages/image-motion/timestamp-definition.js';

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

test('saved motion survives restart and an edit of another scene retains the verified clip cache',async t=>{
  const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'timestamp-edit-')),source=path.join(cwd,'source'),output=path.join(cwd,'output');
  const png=await sharp(Buffer.from('<svg width="100" height="100"><rect width="100" height="100" fill="skyblue"/></svg>')).png().toBuffer();
  for(const dir of ['images','images_fullhd']){await fs.mkdir(path.join(source,dir),{recursive:true});for(const id of [1,2])await fs.writeFile(path.join(source,dir,'000'+id+'.png'),png);}
  const clips=[1,2].map(id=>({id,srt_index:id,start_ms:(id-1)*1000,end_ms:id*1000,start_frame:(id-1)*30,end_frame:id*30,image:'images/000'+id+'.png',status:'completed'}));
  await fs.writeFile(path.join(source,'timeline.json'),JSON.stringify({version:1,fps:30,rounding:'nearest frame from absolute milliseconds; half up',gaps:'preserved',clips}));
  await fs.writeFile(path.join(source,'job.json'),JSON.stringify({scenes:clips.map(c=>({...c,text:'Story '+c.id,visual:'Image',image_sha256:hash(png)}))}));
  await fs.writeFile(path.join(source,'source.srt'),'1\n00:00:00,000 --> 00:00:01,000\nStory 1\n\n2\n00:00:01,000 --> 00:00:02,000\nStory 2\n');
  const timeline=await readFlowImageTimeline(source);let calls=0;
  // This intentionally supplies receipt fixtures, not a real renderer/video test.
  const worker=async(request:{clipId:number;manifest:string;scene:string;output:string;logFile:string})=>{
    calls++;const clip=timeline.clips.find(c=>c.id===request.clipId)!,prepared=JSON.parse(await fs.readFile(path.join(cwd,request.manifest),'utf8'));
    const scene=retimeImageScene(prepared.demo.scenes.find((s:any)=>s.id===request.scene),clip.clock),demo:ImageMotionDemo={version:1,fps:60,scenes:[scene]},assetHashes={'assets/original.png':hash(png)},html=createImageMotionHtml(demo);
    const identity=hash({version:'timed-clip-2',clock:clip.clock,demo,assetHashes,html:hash(html)}),folder=path.join(request.output,'bundle');await fs.mkdir(path.join(folder,'assets'),{recursive:true});
    await fs.writeFile(path.join(folder,'assets/original.png'),png);await fs.writeFile(path.join(folder,'index.html'),html);
    await fs.writeFile(path.join(folder,'timing.json'),JSON.stringify({identity,clip,assetHashes,sourceHash:clip.selectedHash,timelineHash:timeline.timelineHash}));
    const movie=Buffer.from('Protocol fixture; not playable media');await fs.writeFile(path.join(folder,'demo.mp4'),movie);
    await fs.writeFile(path.join(folder,'qc-report.json'),JSON.stringify({renderIdentity:identity,clock:clip.clock,movieHash:hash(movie),totalFrames:60,decodeErrors:0,randomSeekPngExact:true,browserErrors:[],productionReady:false,qualityAccepted:false,media:{streams:[{codec_type:'video',width:100,height:100,r_frame_rate:'60/1',nb_read_frames:'60'}],format:{duration:'1'}}}));return folder;
  };
  const config={cwd,source,output,bindings:[],worker},service=await createTimestampWorkbench(config);
  const motion={...emptyTimestampMotion(),rotations:[{id:'wheel',cx:50,cy:50,rx:10,ry:10,periodMs:1200,direction:1 as const}]};
  const initial=await service.catalog();await service.prepare(1,{revision:initial.revision,definition:motion});
  const after1=await service.catalog();await service.prepare(2,{revision:after1.revision,definition:motion});
  const before=await service.catalog(),job=await service.start('render-ready',{revision:before.revision});await service.idle();assert.equal((await service.job(job.id)).status,'done');assert.equal(calls,2);
  const ready=await service.catalog(),oldUrl=ready.clips[0]!.clipUrl;assert.ok(oldUrl);
  await service.prepare(2,{revision:ready.revision,definition:{...motion,rotations:[{...motion.rotations[0],periodMs:1600}]}});
  const edited=await service.catalog();assert.ok(edited.clips[0]!.clipUrl);assert.equal(edited.clips[1]!.clipUrl,undefined);assert.notEqual(edited.clips[0]!.clipUrl,oldUrl);
  await assert.rejects(service.prepare(1,{revision:ready.revision,definition:motion}),/changed/);
  await service.start('render',{revision:edited.revision,clipId:1});await service.idle();assert.equal(calls,2);
  const state=await service.definition(2);assert.equal(state.definition.rotations[0]!.periodMs,1600);assert.equal(state.clock.fps,60);
  const key=state.previewUrl!.split('/').at(-2)!;const preview=await service.preview(2,key,'index.html');assert.ok(preview.data.toString().includes('window.renderFrame'));await assert.rejects(service.preview(2,key,'../../outside'),/not found/);
  const withPart={...motion,parts:[{id:'head',polygon:[[10,10],[30,10],[30,30],[10,30]] as [number,number][],pivot:{x:20,y:30},angle:2}]};
  const partial=path.join(output,'motions','2-'+hash({version:TIMESTAMP_PREPARER_VERSION,definition:withPart,sourceHash:timeline.clips[1]!.selectedHash,clock:timeline.clips[1]!.clock}));
  await fs.mkdir(path.join(partial,'assets'),{recursive:true});await fs.writeFile(path.join(partial,'assets/unfinished.png'),'Interrupted preparation fixture');
  const resumedPrep=await service.prepare(2,{revision:(await service.catalog()).revision,definition:withPart});assert.equal(resumedPrep.definition.parts.length,1);
  await assert.rejects(service.background(2,resumedPrep.revision,Buffer.from('not PNG')),(e:any)=>e.statusCode===422);
  await service.close();const resumed=await createTimestampWorkbench(config);t.after(async()=>{await resumed.close();await fs.rm(cwd,{recursive:true,force:true});});assert.equal((await resumed.definition(2)).definition.parts.length,1);assert.ok((await resumed.catalog()).clips[0]!.clipUrl);
});
