import type { FactoryConfig } from '../core/config.js';
import { execute, outputPath, parseEnvelope } from '../render/process.js';

export interface ProbeStream { index:number; codec_type?:string; codec_name?:string; width?:number; height?:number; avg_frame_rate?:string; r_frame_rate?:string; duration?:string; sample_rate?:string; channels?:number; tags?:Record<string,string>; }
export interface ProbeResult { streams:ProbeStream[]; format:{duration?:string;size?:string;format_name?:string;}; }
export const ffmpegExecutable=():string=>process.env.FFMPEG_PATH||'ffmpeg';
export const ffprobeExecutable=():string=>process.env.FFPROBE_PATH||'ffprobe';
export async function ffmpeg(root:string,config:FactoryConfig,args:string[],allowFailure=false) {
  return execute(ffmpegExecutable(),['-hide_banner','-nostdin',...args],{cwd:root,logFile:await outputPath(root,'work/logs/ffmpeg.jsonl'),timeoutMs:config.rendering.timeout_ms,allowFailure});
}
export async function probe(root:string,config:FactoryConfig,file:string):Promise<ProbeResult> {
  const result=await execute(ffprobeExecutable(),['-v','error','-show_streams','-show_format','-of','json',file],{cwd:root,logFile:await outputPath(root,'work/logs/ffprobe.jsonl'),timeoutMs:Math.min(config.rendering.timeout_ms,60000)});
  const json=parseEnvelope(result.stdout);
  if(!json || !Array.isArray(json.streams) || !json.format || typeof json.format!=='object') throw new Error('ffprobe did not return a valid media envelope');
  return json as unknown as ProbeResult;
}
export function seconds(n:number):string {if(!Number.isFinite(n)||n<0) throw new Error('Invalid media time');return String(Number(n.toFixed(6)));}
