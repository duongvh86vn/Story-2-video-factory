import {promises as fs} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {hash,safeRealPath} from '../core/utils.js';
import {parseSrtDocument} from '../ingest/srt.js';
import {validateDemo,type ImageMotionScene} from './scene.js';

export interface ClipClock {startMs:number;endMs:number;startFrame:number;endFrame:number;fps:number}
export const frameAt=(ms:number,fps:number)=>Math.floor(ms*fps/1000+.5);
export function validateClipClock(clock:ClipClock):number {
  const {startMs,endMs,startFrame,endFrame,fps}=clock;
  if(![startMs,endMs,startFrame,endFrame,fps].every(Number.isSafeInteger)||startMs<0||endMs<=startMs||fps<1||fps>60||startFrame!==frameAt(startMs,fps)||endFrame!==frameAt(endMs,fps)||endFrame<=startFrame)throw Error('Invalid absolute clip clock');
  return endFrame-startFrame;
}
export function retimeImageScene(source:ImageMotionScene,clock:ClipClock):ImageMotionScene {
  validateClipClock(clock);validateDemo({version:1,fps:clock.fps,scenes:[source]});
  const durationMs=clock.endMs-clock.startMs,scene=structuredClone(source);
  scene.durationMs=durationMs;
  for(const p of scene.parts??[])for(const f of p.frames)f.timeMs=f.timeMs/source.durationMs*durationMs;
  validateDemo({version:1,fps:clock.fps,scenes:[scene]});return scene;
}

/** Reuse only the same encoded bytes and the successful renderer receipt. */
export function validateTimedClipCache(report:Record<string,any>,movie:Buffer,expected:{clock:ClipClock;identity:string;width:number;height:number}):void {
  const frames=validateClipClock(expected.clock),streams=report.media?.streams;
  const video=Array.isArray(streams)?streams.find(s=>s?.codec_type==='video'):undefined;
  if(report.renderIdentity!==expected.identity||!report.clock||hash(report.clock)!==hash(expected.clock)||report.movieHash!==hash(movie)||report.productionReady!==false||report.qualityAccepted!==false||report.totalFrames!==frames||report.decodeErrors!==0||report.randomSeekPngExact!==true||!Array.isArray(report.browserErrors)||report.browserErrors.length||!video||video.width!==expected.width||video.height!==expected.height||video.r_frame_rate!==expected.clock.fps+'/1'||Number(video.nb_read_frames)!==frames||streams.some((s:any)=>s?.codec_type==='audio')||!Number.isFinite(Number(report.media?.format?.duration))||Math.abs(Number(report.media.format.duration)-frames/expected.clock.fps)>.02)throw Error('Timed video cache integrity changed');
}

const Clip=z.object({id:z.number().int().positive(),srt_index:z.number().int().positive(),start_ms:z.number().int().nonnegative(),end_ms:z.number().int().positive(),start_frame:z.number().int().nonnegative(),end_frame:z.number().int().positive(),image:z.string().regex(/^images\/[a-zA-Z0-9_-]+\.png$/),status:z.literal('completed')}).strict();
const Timeline=z.object({version:z.literal(1),fps:z.coerce.number().int().min(1).max(60),rounding:z.literal('nearest frame from absolute milliseconds; half up'),gaps:z.literal('preserved'),clips:z.array(Clip).min(1).max(2000)}).strict();
const Job=z.object({scenes:z.array(z.object({id:z.number().int(),srt_index:z.number().int(),start_ms:z.number(),end_ms:z.number(),image:z.string(),image_sha256:z.string().regex(/^[a-f0-9]{64}$/),text:z.string(),visual:z.string()}).passthrough())}).passthrough();
export interface FlowImageClip {id:number;srtIndex:number;image:string;selectedImage:string;sourceHash:string;selectedHash:string;text:string;visual:string;clock:ClipClock}
export interface FlowImageTimeline {version:1;sourceFps:number;outputFps:number;variant:'original'|'fullhd';timelineHash:string;srtHash:string;jobHash:string;durationMs:number;clips:FlowImageClip[];gaps:{startMs:number;endMs:number;startFrame:number;endFrame:number}[]}

/** Reads the supplied export without changing images, captions or timestamps. */
export async function readFlowImageTimeline(root:string,options:{fps?:number;variant?:'original'|'fullhd'}={}):Promise<FlowImageTimeline> {
  const bounded=async(name:string)=>{const file=await safeRealPath(root,name);if((await fs.stat(file)).size>8*1024*1024)throw Error('Timeline metadata exceeds 8 MB');return fs.readFile(file);};
  const [timelineBytes,srtBytes,jobBytes]=await Promise.all([bounded('timeline.json'),bounded('source.srt'),bounded('job.json')]);
  const timeline=Timeline.parse(JSON.parse(timelineBytes.toString('utf8'))),job=Job.parse(JSON.parse(jobBytes.toString('utf8'))),fps=options.fps??60,variant=options.variant??'fullhd';
  // This exporter used "->". Normalize only timestamp lines in memory.
  const normalized=srtBytes.toString('utf8').replace(/^(\s*\d+:\d{2}:\d{2}[,.]\d{1,3}\s*)->(\s*\d+:\d{2}:\d{2}[,.]\d{1,3}\s*)$/gm,'$1-->$2');
  const cues=parseSrtDocument(normalized).cues;
  if(cues.length!==timeline.clips.length||job.scenes.length!==timeline.clips.length)throw Error('Timeline/SRT/scene count mismatch');
  const scenes=new Map(job.scenes.map(s=>[s.id,s]));if(scenes.size!==job.scenes.length)throw Error('Duplicate job scene ID');
  const clips:FlowImageClip[]=[],gaps:FlowImageTimeline['gaps']=[],ids=new Set<number>(),cueIds=new Set<number>();let previousEnd=0;
  for(const c of timeline.clips){
    validateClipClock({startMs:c.start_ms,endMs:c.end_ms,startFrame:c.start_frame,endFrame:c.end_frame,fps:timeline.fps});
    if(ids.has(c.id)||cueIds.has(c.srt_index)||c.start_ms<previousEnd)throw Error('Duplicate or overlapping image timeline');ids.add(c.id);cueIds.add(c.srt_index);
    const cue=cues.find(v=>v.sourceIndex===c.srt_index),scene=scenes.get(c.id);
    if(!cue||!scene||scene.srt_index!==c.srt_index||cue.startMs!==c.start_ms||cue.endMs!==c.end_ms||scene.start_ms!==c.start_ms||scene.end_ms!==c.end_ms||scene.image!==c.image||cue.text.trim()!==scene.text.trim())throw Error('Timeline/SRT/scene mismatch at '+c.id);
    const sourceFile=await safeRealPath(root,c.image);if((await fs.stat(sourceFile)).size>16*1024*1024)throw Error('Source image exceeds 16 MB');const sourceHash=hash(await fs.readFile(sourceFile));if(sourceHash!==scene.image_sha256)throw Error('Source image integrity changed at '+c.id);
    const selectedImage=variant==='fullhd'?'images_fullhd/'+path.posix.basename(c.image):c.image,selectedFile=await safeRealPath(root,selectedImage);if((await fs.stat(selectedFile)).size>16*1024*1024)throw Error('Selected image exceeds 16 MB');
    const clock={startMs:c.start_ms,endMs:c.end_ms,startFrame:frameAt(c.start_ms,fps),endFrame:frameAt(c.end_ms,fps),fps};validateClipClock(clock);
    if(c.start_ms>previousEnd)gaps.push({startMs:previousEnd,endMs:c.start_ms,startFrame:frameAt(previousEnd,fps),endFrame:clock.startFrame});
    clips.push({id:c.id,srtIndex:c.srt_index,image:c.image,selectedImage,sourceHash,selectedHash:hash(await fs.readFile(selectedFile)),text:scene.text,visual:scene.visual,clock});previousEnd=c.end_ms;
  }
  return {version:1,sourceFps:timeline.fps,outputFps:fps,variant,timelineHash:hash(timelineBytes),srtHash:hash(srtBytes),jobHash:hash(jobBytes),durationMs:previousEnd,clips,gaps};
}
