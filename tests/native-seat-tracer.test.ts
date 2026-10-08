// NOT RUN by implementation agents. User's model executes these declarations.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {nativeSeatTracerOptions,checkNativeSeatTracerMedia,reserveNativeSeatTracerRoot} from '../scripts/native-seat-tracer.js';
import type {ProbeResult} from '../packages/audio/ffmpeg.js';
import {temporary} from './support.js';

test('tracer media is opt-in, strict and cannot request final or overwrite a project',()=>{
  assert.deepEqual(nativeSeatTracerOptions([]),{validate:false,frames:false,render:false,wav:undefined,help:false});
  for(const option of ['--frames','--render','--validate'])assert.equal(nativeSeatTracerOptions([option]).validate,true);
  for(const args of [['--final'],['--output','existing-project'],['--wav','relative.wav'],['--wav',path.resolve('audio.mp3')],['--render','extra']])assert.throws(()=>nativeSeatTracerOptions(args));
  assert.equal(nativeSeatTracerOptions(['--wav',path.resolve('diagnostic.wav')]).wav,path.resolve('diagnostic.wav'));
});

test('tracer media probe requires real 60fps H264 dimensions, original clock and explicit audio presence',()=>{
  const media:ProbeResult={streams:[{index:0,codec_type:'video',codec_name:'h264',width:1280,height:720,avg_frame_rate:'60/1',duration:'7.2'}],format:{duration:'7.2'}};
  assert.deepEqual(checkNativeSeatTracerMedia(media,false),[]);assert.ok(checkNativeSeatTracerMedia(media,true).length);
  assert.deepEqual(checkNativeSeatTracerMedia({...media,streams:[...media.streams,{index:1,codec_type:'audio',codec_name:'aac',duration:'7.2'}]},true),[]);
  const masked={...media,streams:[{...media.streams[0]!,duration:'6'},{index:1,codec_type:'audio',codec_name:'aac',duration:'7.2'}]};
  assert.ok(checkNativeSeatTracerMedia(masked,true).some(error=>error.startsWith('Video-stream')));
  assert.ok(checkNativeSeatTracerMedia({...media,streams:[...media.streams,{index:1,codec_type:'audio',duration:'6'}]},true).some(error=>error.startsWith('Audio-stream')));
  assert.ok(checkNativeSeatTracerMedia({...media,streams:[{...media.streams[0]!,duration:undefined}]},false).some(error=>error.startsWith('Video-stream')));
  for(const rate of ['30/1','0/0','60/0','invalid',undefined])assert.ok(checkNativeSeatTracerMedia({...media,streams:[{...media.streams[0]!,avg_frame_rate:rate}]},false).length);
  for(const duration of ['7.18','7.3','unknown',undefined])assert.ok(checkNativeSeatTracerMedia({...media,format:{duration}},false).length);
  assert.ok(checkNativeSeatTracerMedia({...media,streams:[{...media.streams[0]!,width:960}]},false).length);
  assert.ok(checkNativeSeatTracerMedia({...media,streams:[...media.streams,...media.streams]},false).length);
});

test('tracer reserves unique runtime folders and preserves existing output',async t=>{
  const repo=await temporary(t),a=await reserveNativeSeatTracerRoot(repo),sentinel=path.join(a,'keep.txt');await fs.writeFile(sentinel,'existing run');
  const b=await reserveNativeSeatTracerRoot(repo);assert.notEqual(a,b);assert.equal(await fs.readFile(sentinel,'utf8'),'existing run');
  for(const root of [a,b]){assert.equal(path.dirname(root),path.join(repo,'runtime','prehistoric-life','native-seat-tracers'));assert.match(path.basename(root),/^tracer-/);assert.equal((await fs.stat(root)).isDirectory(),true);}
});
