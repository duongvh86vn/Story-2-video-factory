import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {hash} from '../packages/core/utils.js';
import {frameAt,validateClipClock,retimeImageScene,readFlowImageTimeline,validateTimedClipCache} from '../packages/image-motion/flow-timeline.js';
import {temporary} from './support.js';

test('absolute frame boundaries avoid accumulated per-image rounding drift',()=>{
  const boundaries=[0,40,80,120];
  const frames=boundaries.slice(1).map((endMs,i)=>validateClipClock({startMs:boundaries[i]!,endMs,startFrame:frameAt(boundaries[i]!,30),endFrame:frameAt(endMs,30),fps:30}));
  assert.deepEqual(frames,[1,1,2]);assert.equal(frames.reduce((a,b)=>a+b,0),frameAt(120,30));
  assert.throws(()=>validateClipClock({startMs:40,endMs:80,startFrame:0,endFrame:2,fps:30}),/clock/);
  for(const fps of [0,61,NaN])assert.throws(()=>validateClipClock({startMs:0,endMs:1000,startFrame:0,endFrame:30,fps}),/clock/);
});
test('retiming fits the supplied interval while retaining pixels, proportions and rotation speed',()=>{
  const original={id:'arm',width:100,height:100,durationMs:6000,original:'assets/source.png',background:'assets/source.png',layers:[{id:'wheel',image:'assets/source.png',kind:'surface' as const,cx:50,cy:50,rx:10,ry:10,periodMs:2400,direction:1 as const}],parts:[{id:'hand',image:'assets/hand.png',pivot:{x:20,y:20},frames:[{timeMs:0,angle:0},{timeMs:3000,angle:20},{timeMs:6000,angle:0}]}]},before=structuredClone(original);
  const clock={startMs:5760,endMs:9600,startFrame:346,endFrame:576,fps:60},scene=retimeImageScene(original,clock);
  assert.equal(scene.durationMs,3840);assert.deepEqual(scene.parts![0]!.frames,[{timeMs:0,angle:0},{timeMs:1920,angle:20},{timeMs:3840,angle:0}]);assert.equal(scene.layers[0]!.periodMs,2400);assert.deepEqual(original,before);assert.equal(scene.original,original.original);
});
test('cache reuse requires the same rendered motion, bytes and successful media receipt',()=>{
  const movie=Buffer.from('fixture bytes; not runtime media'),clock={startMs:5760,endMs:9600,startFrame:346,endFrame:576,fps:60},identity=hash('motion'),expected={clock,identity,width:1920,height:1080};
  const report={renderIdentity:identity,clock,movieHash:hash(movie),totalFrames:230,decodeErrors:0,randomSeekPngExact:true,browserErrors:[],productionReady:false,qualityAccepted:false,media:{streams:[{codec_type:'video',width:1920,height:1080,r_frame_rate:'60/1',nb_read_frames:'230'}],format:{duration:'3.833333'}}};
  validateTimedClipCache(report,movie,expected);
  for(const patch of [{renderIdentity:hash('other motion')},{totalFrames:229},{decodeErrors:1},{randomSeekPngExact:false},{browserErrors:['error']},{qualityAccepted:true},{media:{streams:report.media.streams,format:{duration:'3.9'}}}])assert.throws(()=>validateTimedClipCache({...report,...patch},movie,expected),/integrity/);
  assert.throws(()=>validateTimedClipCache(report,Buffer.from('modified bytes'),expected),/integrity/);
});
test('Flow import verifies all images and SRT clocks, preserves gaps, and never edits the supplied export',async t=>{
  const root=await temporary(t);await fs.mkdir(path.join(root,'images'));await fs.mkdir(path.join(root,'images_fullhd'));
  const image=await sharp(Buffer.from('<svg width="100" height="100"><rect width="100" height="100" fill="#a4cff1"/></svg>')).png().toBuffer();
  for(const dir of ['images','images_fullhd'])for(const name of ['0001.png','0002.png'])await fs.writeFile(path.join(root,dir,name),image);
  const clips=[{id:1,srt_index:1,start_ms:0,end_ms:1000,start_frame:0,end_frame:30,image:'images/0001.png',status:'completed'},{id:2,srt_index:2,start_ms:1250,end_ms:2400,start_frame:38,end_frame:72,image:'images/0002.png',status:'completed'}];
  const job={scenes:clips.map(c=>({...c,text:'Original story '+c.id,visual:'Image '+c.id,image_sha256:hash(image)}))},srt='1\n00:00:00.000 -> 00:00:01.000\n Original story 1\n\n2\n00:00:01.250 -> 00:00:02.400\n Original story 2\n';
  await fs.writeFile(path.join(root,'timeline.json'),JSON.stringify({version:1,fps:'30',rounding:'nearest frame from absolute milliseconds; half up',gaps:'preserved',clips}));await fs.writeFile(path.join(root,'job.json'),JSON.stringify(job));await fs.writeFile(path.join(root,'source.srt'),srt);
  const result=await readFlowImageTimeline(root);assert.equal(result.outputFps,60);assert.deepEqual(result.gaps,[{startMs:1000,endMs:1250,startFrame:60,endFrame:75}]);assert.equal(result.clips[1]!.clock.startFrame,75);assert.equal(result.clips[1]!.selectedImage,'images_fullhd/0002.png');assert.equal(await fs.readFile(path.join(root,'source.srt'),'utf8'),srt);
  await fs.writeFile(path.join(root,'images/0002.png'),'changed');await assert.rejects(readFlowImageTimeline(root),/integrity/);await fs.writeFile(path.join(root,'images/0002.png'),image);
  await fs.writeFile(path.join(root,'source.srt'),srt.replace('02.400','02.500'));await assert.rejects(readFlowImageTimeline(root),/mismatch/);
  await fs.writeFile(path.join(root,'source.srt'),srt);job.scenes[1]!.id=1;await fs.writeFile(path.join(root,'job.json'),JSON.stringify(job));await assert.rejects(readFlowImageTimeline(root),/Duplicate job/);
});
