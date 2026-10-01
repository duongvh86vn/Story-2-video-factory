import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import type { Narration, Storyboard } from '../core/schemas.js';
import { exists, readJson, safeRealPath, writeAtomic, writeJson } from '../core/utils.js';
import { outputPath, redact } from '../render/process.js';
import { ffmpeg, probe, type ProbeResult } from '../audio/ffmpeg.js';
import { serializeSrt } from '../ingest/srt.js';
import { requireVoice, VoiceReportSchema } from '../voice/index.js';

export interface QCInterval {startMs:number;endMs:number;}
export interface QCIssue {type:string;severity:'high'|'medium'|'low';description:string;startMs?:number;endMs?:number;}
export interface QCReport {pass:boolean;issues:QCIssue[];video:unknown;warnings:string[];detections:{black:QCInterval[];freeze:QCInterval[];silence:QCInterval[]};}
export function detectedIntervals(log:string,kind:'black'|'freeze'|'silence',durationMs:number):QCInterval[] {
  const intervals:QCInterval[]=[],pattern=new RegExp(`${kind}_(start|end):\\s*(-?\\d+(?:\\.\\d+)?)`,'g');let start:number|undefined;
  for(const match of log.matchAll(pattern)) {
    const value=Math.max(0,Math.min(durationMs,Number(match[2])*1000));
    if(match[1]==='start') {if(start===undefined) start=value;}
    else if(start!==undefined) {if(value>start) intervals.push({startMs:start,endMs:value});start=undefined;}
  }
  if(start!==undefined && start<durationMs) intervals.push({startMs:start,endMs:durationMs});
  return intervals;
}
export function fullyWhitelisted(interval:QCInterval,allowed:QCInterval[],toleranceMs=0):boolean {
  let cursor=interval.startMs;
  for(const range of allowed.slice().sort((a,b)=>a.startMs-b.startMs)) {
    if(range.endMs+toleranceMs<cursor) continue;
    if(range.startMs-toleranceMs>cursor) return false;
    cursor=Math.max(cursor,range.endMs+toleranceMs);if(cursor>=interval.endMs) return true;
  }
  return cursor>=interval.endMs;
}
function narrationGaps(narration:Narration):QCInterval[] {
  const gaps:QCInterval[]=[];let cursor=0;
  for(const segment of narration.segments.slice().sort((a,b)=>a.startMs-b.startMs)) {if(segment.startMs>cursor) gaps.push({startMs:cursor,endMs:segment.startMs});cursor=Math.max(cursor,segment.endMs);}
  if(cursor<narration.durationMs) gaps.push({startMs:cursor,endMs:narration.durationMs});return gaps;
}
function fps(value:string|undefined):number {if(!value) return NaN;const [n,d]=value.split('/').map(Number);return d===undefined?n!:n!/d;}
function loudness(log:string):Record<string,string>|undefined {for(const match of log.matchAll(/\{[^{}]*"input_i"[^{}]*\}/g)){try{return JSON.parse(match[0]) as Record<string,string>;}catch{/* continue */}}return undefined;}

export async function runQC(projectRoot:string,config:FactoryConfig,narration:Narration,storyboard:Storyboard):Promise<{pass:boolean;issues:unknown[];video:unknown}> {
  const issues:QCIssue[]=[],warnings:string[]=[],detections:QCReport['detections']={black:[],freeze:[],silence:[]};
  let video:unknown=null,metadata:ProbeResult|undefined;
  const add=(type:string,description:string,interval?:QCInterval,severity:QCIssue['severity']='high')=>issues.push({type,severity,description,...interval});
  const srtOnly=narration.mode==='srt'&&!narration.audioPath;
  if(config.content.mode==='narrated-explainer'){try{await requireVoice(projectRoot,narration);}catch(error){add('voice',error instanceof Error?error.message:String(error));}}
  if(srtOnly) warnings.push('SRT-only source has no voice recording. Missing narration and planned silence are not QC failures.');
  try {
    const file=await safeRealPath(projectRoot,'output/final.mp4');metadata=await probe(projectRoot,config,file);
    const visual=metadata.streams.find(stream=>stream.codec_type==='video'),audio=metadata.streams.find(stream=>stream.codec_type==='audio');
    if(!visual) add('video-stream','Final output has no video stream');
    const durationMs=Number(visual?.duration??metadata.format.duration)*1000,frameRate=fps(visual?.avg_frame_rate??visual?.r_frame_rate),settings=config.rendering.final;
    video={duration:durationMs/1000,durationMs,width:visual?.width,height:visual?.height,fps:frameRate,codec:visual?.codec_name,audio:audio?{codec:audio.codec_name,sampleRate:Number(audio.sample_rate),channels:audio.channels,duration:Number(audio.duration??metadata.format.duration)}:null,subtitleStreams:metadata.streams.filter(stream=>stream.codec_type==='subtitle').length};
    if(!Number.isFinite(durationMs)||Math.abs(durationMs-narration.durationMs)>config.qc.duration_tolerance_ms) add('duration',`Video duration ${durationMs}ms differs from narration ${narration.durationMs}ms`);
    if(visual?.width!==settings.width || visual?.height!==settings.height) add('resolution',`Expected ${settings.width}x${settings.height}; got ${visual?.width}x${visual?.height}`);
    if(!Number.isFinite(frameRate)||Math.abs(frameRate-settings.fps)>.02) add('fps',`Expected ${settings.fps}fps; got ${frameRate}`);
    if(visual?.codec_name!=='h264') add('video-codec',`Expected H.264; got ${visual?.codec_name}`);
    if(!audio&&!srtOnly) add('missing-narration','Final output has no audio stream');
    if(!audio&&srtOnly) warnings.push('The SRT-only video has no audio stream.');
    if(audio) {
      if(audio.codec_name!=='aac') add('audio-codec',`Expected AAC audio; got ${audio.codec_name}`);
      if(Number(audio.sample_rate)!==config.audio.sample_rate) add('sample-rate',`Expected ${config.audio.sample_rate}Hz; got ${audio.sample_rate}`);
      const audioDurationMs=Number(audio.duration??metadata.format.duration)*1000;
      if(!Number.isFinite(audioDurationMs)||Math.abs(audioDurationMs-narration.durationMs)>config.audio.duration_tolerance_ms) add('audio-duration',`Audio duration ${audioDurationMs}ms differs from narration`);
    }
    const detectDuration=Number.isFinite(durationMs)?durationMs:narration.durationMs;
    if(visual) {
      const detection=await ffmpeg(projectRoot,config,['-i',file,'-map','0:v:0','-an','-vf',`blackdetect=d=${config.qc.black_min_seconds}:pix_th=0.10,freezedetect=n=-60dB:d=${config.qc.freeze_min_seconds}`,'-f','null','-']);
      detections.black=detectedIntervals(detection.stderr,'black',detectDuration);detections.freeze=detectedIntervals(detection.stderr,'freeze',detectDuration);
      const blackAllowed=[...config.qc.allowed_black,...storyboard.shots.filter(shot=>shot.intentionalBlack).map(shot=>({startMs:shot.startMs,endMs:shot.endMs}))];
      // Only explicitly planned static shots with no moving camera/objects qualify.
      const staticAllowed=storyboard.shots.filter(shot=>shot.intentionalStatic&&!shot.motion.length&&/^(?:static|none|locked|still)$/i.test(shot.camera.movement)).map(shot=>({startMs:shot.startMs,endMs:shot.endMs}));
      const toleranceMs=1000/settings.fps;
      for(const interval of detections.black) if(!fullyWhitelisted(interval,blackAllowed,toleranceMs)) add('black-frames','Unexpected black interval; whitelist does not cover the full detected span',interval);
      for(const interval of detections.freeze) if(!fullyWhitelisted(interval,staticAllowed,toleranceMs)) add('frozen-frames','Unexpected freeze; only explicitly planned static intervals are allowed',interval);
    }
    if(audio) {
      const stats=await ffmpeg(projectRoot,config,['-i',file,'-map','0:a:0','-vn','-af',`silencedetect=n=-50dB:d=${config.audio.silence_min_seconds},astats=metadata=1:reset=0,loudnorm=I=${config.audio.target_lufs}:TP=${config.audio.true_peak}:print_format=json`,'-f','null','-']);
      detections.silence=detectedIntervals(stats.stderr,'silence',detectDuration);
      const allowed=srtOnly?[{startMs:0,endMs:detectDuration}]:narrationGaps(narration);
      if(config.content.mode==='narrated-explainer'&&narration.mode==='srt'){const voice=await readJson(path.join(projectRoot,'work/voice-report.json'),VoiceReportSchema);if(voice.source==='tts'&&voice.status==='ready')for(const cue of voice.cues){if(cue.fittedDurationMs!==undefined&&cue.startMs+cue.fittedDurationMs<cue.endMs)allowed.push({startMs:Math.ceil(cue.startMs+cue.fittedDurationMs),endMs:cue.endMs});}}
      for(const interval of detections.silence) if(!fullyWhitelisted(interval,allowed,120)) add('unexpected-silence','Silence overlaps a spoken narration interval',interval);
      const peaks=[...stats.stderr.matchAll(/Peak level dB:\s*(-?(?:\d+(?:\.\d+)?|inf))/gi)].map(match=>Number(match[1]));
      if(!peaks.length) add('audio-analysis','FFmpeg did not report peak statistics');
      else if(peaks.some(peak=>peak>=0)) add('audio-clipping','Decoded output reaches/exceeds digital full scale');
      const measured=loudness(stats.stderr);
      if(!measured) add('audio-analysis','FFmpeg did not report loudness/true-peak measurements');
      else {
        const inputI=Number(measured.input_i),inputTP=Number(measured.input_tp);
        if(!srtOnly && !Number.isFinite(inputI)) add('missing-narration','The final audio stream is completely silent');
        if(Number.isFinite(inputI)&&Math.abs(inputI-config.audio.target_lufs)>2) add('loudness',`Measured ${inputI} LUFS differs from target ${config.audio.target_lufs}`);
        if(Number.isFinite(inputTP)&&inputTP>config.audio.true_peak+.7) add('true-peak',`Measured ${inputTP}dBTP exceeds target ${config.audio.true_peak}dBTP`);
        video={...(video as Record<string,unknown>),audioAnalysis:{integratedLufs:measured.input_i,truePeak:measured.input_tp,peakLevels:peaks}};
      }
    }
    const soft=['soft','both'].includes(config.captions.mode),subtitleCount=metadata.streams.filter(stream=>stream.codec_type==='subtitle').length;
    if(soft&&!subtitleCount) add('captions','Requested soft subtitles are missing');
    if(!soft&&subtitleCount) add('captions','Unexpected soft subtitle stream');
    if(await exists(path.join(projectRoot,'output/final.srt'))&&(await fs.readFile(await safeRealPath(projectRoot,'output/final.srt'),'utf8'))!==serializeSrt(narration.segments))add('subtitle-integrity','Exported subtitle text/clock differ from canonical narration');
    for(const artifact of ['output/final.srt','output/thumbnail.png']) if(!await exists(path.join(projectRoot,artifact))) add('artifact',`Missing required production artifact: ${artifact}`);
  } catch(error) {add('qc-execution',redact(error instanceof Error?error.message:String(error)));}
  if(await exists(path.join(projectRoot,'work/media-report.json'))) {
    const media=await readJson<{warnings?:string[]}>(await safeRealPath(projectRoot,'work/media-report.json'));warnings.push(...media.warnings??[]);
  }
  const report:QCReport={pass:!issues.some(issue=>issue.severity==='high'),issues,video,warnings:[...new Set(warnings)],detections};
  await writeJson(await outputPath(projectRoot,'output/qc-report.json'),report);await writeJson(await outputPath(projectRoot,'work/qc-report.json'),report);
  const rows=issues.length?issues.map(issue=>`- ${issue.severity.toUpperCase()} ${issue.type}: ${issue.description}`).join('\n'):'No QC failures detected.';
  const markdown=`# Production Report\n\nQC: **${report.pass?'PASS':'FAIL'}**\n\n## Video\n\n\`\`\`json\n${JSON.stringify(video,null,2)}\n\`\`\`\n\n## Production\n\n${storyboard.shots.length} shots; ${(narration.durationMs/1000).toFixed(3)} seconds; captions: ${config.captions.mode}. Renderer: HyperFrames 0.8.96.\n\n## QC findings\n\n${rows}\n\n## Warnings\n\n${report.warnings.length?report.warnings.map(warning=>`- ${warning}`).join('\n'):'None.'}\n\nDetailed media measurements and process commands/exit codes are retained in work/media-report.json and work/logs/.\n`;
  await writeAtomic(await outputPath(projectRoot,'output/production-report.md'),markdown);
  return report;
}
