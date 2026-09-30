import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import { NarrationSchema, AssetManifestSchema, StoryboardSchema, type Asset, type AssetManifest, type Narration, type Storyboard } from '../core/schemas.js';
import { exists, hash, readJson, safeRealPath, writeJson } from '../core/utils.js';
import { outputPath } from '../render/process.js';
import { writeCaptions } from '../captions/index.js';
import { ffmpeg, probe, seconds } from './ffmpeg.js';
export { ffmpeg, probe } from './ffmpeg.js';

async function approvedFile(root:string,asset:Asset):Promise<string> {
  if(asset.status!=='approved') throw new Error(`Audio asset ${asset.id} is not approved`);
  const file=await safeRealPath(root,asset.path);
  if(hash(await fs.readFile(file))!==asset.hash) throw new Error(`Approved audio asset changed: ${asset.id}`);
  return file;
}
interface LoudnessMeasurement { input_i:string; input_tp:string; input_lra:string; input_thresh:string; target_offset:string; }
function loudnessJson(stderr:string):LoudnessMeasurement|undefined {
  for(const match of stderr.matchAll(/\{[^{}]*"input_i"[^{}]*\}/g)) {try{return JSON.parse(match[0]) as LoudnessMeasurement;}catch{/* continue */}}
  return undefined;
}
/** FFmpeg alone mixes, normalizes, muxes captions and extracts the production thumbnail. */
export async function produceMedia(projectRoot:string,config:FactoryConfig,narration:Narration,storyboard:Storyboard,assets:AssetManifest):Promise<void> {
  NarrationSchema.parse(narration);StoryboardSchema.parse(storyboard);AssetManifestSchema.parse(assets);
  const rendered=await safeRealPath(projectRoot,'work/rendered.mp4'),duration=narration.durationMs/1000,rate=config.audio.sample_rate;
  const output=await outputPath(projectRoot,'output/final.mp4'),raw=await outputPath(projectRoot,'work/audio-mix.wav'),master=await outputPath(projectRoot,'work/audio-master.wav');
  await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(path.dirname(raw),{recursive:true});
  const warnings:string[]=[],inputs:string[]=[],filters:string[]=[],mixLabels:string[]=[];
  let inputIndex=0,voice=false;
  if(narration.audioPath) {
    const file=await safeRealPath(projectRoot,narration.audioPath),metadata=await probe(projectRoot,config,file);
    const stream=metadata.streams.find(stream=>stream.codec_type==='audio');
    if(!stream) throw new Error('Narration input has no audio stream');
    const voiceDuration=Number(stream.duration??metadata.format.duration)*1000;
    if(!Number.isFinite(voiceDuration)||Math.abs(voiceDuration-narration.durationMs)>config.audio.duration_tolerance_ms) throw new Error(`Narration audio duration ${voiceDuration}ms does not match narration ${narration.durationMs}ms`);
    inputs.push('-i',file);voice=true;
  } else {
    if(narration.mode!=='srt') throw new Error('WAV/aligned narration requires a real audioPath');
    warnings.push('SRT-only input has no spoken voice. A silent narration bed preserves the master duration.');
    inputs.push('-f','lavfi','-i',`anullsrc=channel_layout=stereo:sample_rate=${rate}`);
  }
  filters.push(`[${inputIndex++}:a]aresample=${rate},aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=duration=${seconds(duration)},asetpts=PTS-STARTPTS[voice]`);
  const music=assets.assets.find(asset=>asset.type==='music'&&asset.status==='approved');
  if(music && config.audio.music_volume>0) {
    const file=await approvedFile(projectRoot,music);inputs.push('-stream_loop','-1','-i',file);
    filters.push(`[${inputIndex++}:a]aresample=${rate},aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=duration=${seconds(duration)},asetpts=PTS-STARTPTS,volume=${config.audio.music_volume},afade=t=in:d=${seconds(Math.min(1,duration/4))},afade=t=out:st=${seconds(Math.max(0,duration-1))}:d=${seconds(Math.min(1,duration))}[music]`);
    if(voice) {filters.push('[voice]asplit=2[voice_mix][voice_sidechain]');filters.push('[music][voice_sidechain]sidechaincompress=threshold=0.025:ratio=8:attack=20:release=300:makeup=1[ducked_music]');mixLabels.push('[voice_mix]','[ducked_music]');}
    else mixLabels.push('[voice]','[music]');
  } else mixLabels.push('[voice]');
  let sfxCount=0;
  for(const shot of storyboard.shots) for(const event of shot.sfx) {
    if(event.timeMs<shot.startMs || event.timeMs>=shot.endMs) throw new Error(`${shot.id}: SFX time ${event.timeMs}ms is outside the shot; SFX timestamps are absolute`);
    const asset=event.assetId?assets.assets.find(asset=>asset.id===event.assetId):assets.assets.find(asset=>asset.type==='sfx'&&asset.status==='approved'&&asset.shotIds.includes(shot.id));
    if(!asset || asset.status!=='approved') {warnings.push(`${shot.id}: SFX ${event.type} has no approved local asset and was omitted.`);continue;}
    if(asset.type!=='sfx') throw new Error(`SFX asset ${asset.id} has incompatible type ${asset.type}`);
    const file=await approvedFile(projectRoot,asset),label=`sfx_${sfxCount++}`,remaining=(shot.endMs-event.timeMs)/1000;
    inputs.push('-i',file);
    const delay=Math.round(event.timeMs*rate/1000);
    filters.push(`[${inputIndex++}:a]aresample=${rate},aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=duration=${seconds(remaining)},asetpts=PTS-STARTPTS,volume=${config.audio.sfx_volume*event.intensity},adelay=${delay}S:all=1[${label}]`);
    mixLabels.push(`[${label}]`);
  }
  filters.push(`${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=longest:dropout_transition=0:normalize=0,apad,atrim=duration=${seconds(duration)}[mixed]`);
  // Float PCM preserves voice/music/SFX summing headroom until loudnorm limits the final signal.
  await ffmpeg(projectRoot,config,['-y',...inputs,'-filter_complex',filters.join(';'),'-map','[mixed]','-t',seconds(duration),'-ar',String(rate),'-c:a','pcm_f32le',raw]);
  const norm=`loudnorm=I=${config.audio.target_lufs}:TP=${config.audio.true_peak}:LRA=11`;
  const measured=await ffmpeg(projectRoot,config,['-i',raw,'-vn','-af',`${norm}:print_format=json`,'-f','null','-']);
  const measurement=loudnessJson(measured.stderr),finite=measurement && (['input_i','input_tp','input_lra','input_thresh','target_offset'] as const).every(key=>Number.isFinite(Number(measurement[key])));
  if(!measurement) throw new Error('FFmpeg loudnorm did not return a measurement');
  if(finite) {
    const numeric=(key:keyof LoudnessMeasurement)=>String(Number(measurement[key]));
    const linear=`${norm}:measured_I=${numeric('input_i')}:measured_TP=${numeric('input_tp')}:measured_LRA=${numeric('input_lra')}:measured_thresh=${numeric('input_thresh')}:offset=${numeric('target_offset')}:linear=true:print_format=json`;
    await ffmpeg(projectRoot,config,['-y','-i',raw,'-af',`${linear},aresample=${rate}`,'-ar',String(rate),'-c:a','pcm_s24le',master]);
  } else {
    if(voice) throw new Error('Narration/audio mix is silent or loudness statistics are invalid');
    await fs.copyFile(raw,master);warnings.push('Silent SRT-only audio cannot be loudness-normalized; silence was preserved.');
  }
  const captions=await writeCaptions(projectRoot,config,narration);
  const masterMetadata=await exists(path.join(projectRoot,'work/master.json'))?await readJson<{captionsBurned?:boolean}>(await safeRealPath(projectRoot,'work/master.json')):undefined;
  const needsBurn=captions.burn&&!masterMetadata?.captionsBurned;
  const mux=['-y','-i',rendered,'-i',master];
  if(captions.soft) mux.push('-i',captions.srt);
  mux.push('-map','0:v:0','-map','1:a:0');
  if(captions.soft) mux.push('-map','2:s:0','-c:s','mov_text','-metadata:s:s:0',`language=${({vi:'vie',en:'eng',zh:'zho',ja:'jpn',ko:'kor'} as Record<string,string>)[config.project.language]??'und'}`,'-disposition:s:0','default');
  if(needsBurn) mux.push('-vf',"ass=filename='work/captions.ass'",'-c:v','libx264','-crf','18','-pix_fmt','yuv420p');
  else mux.push('-c:v','copy');
  mux.push('-c:a','aac','-b:a','192k','-ar',String(rate),'-t',seconds(duration),'-movflags','+faststart',output);
  await ffmpeg(projectRoot,config,mux);
  const thumbnail=await outputPath(projectRoot,'output/thumbnail.png');
  const representative=storyboard.shots.find(shot=>!shot.intentionalBlack)??storyboard.shots[0]!;
  const time=Math.min(duration-.001,(representative.startMs+(representative.endMs-representative.startMs)*.5)/1000);
  await ffmpeg(projectRoot,config,['-y','-ss',seconds(Math.max(0,time)),'-i',output,'-map','0:v:0','-frames:v','1','-update','1',thumbnail]);
  await writeJson(await outputPath(projectRoot,'work/media-report.json'),{durationMs:narration.durationMs,voicePresent:voice,musicAsset:music?.id,sfxCount,captionMode:config.captions.mode,captionsBurnedByMaster:!!masterMetadata?.captionsBurned,captionsBurnedByFfmpeg:needsBurn,normalization:{targetLufs:config.audio.target_lufs,truePeak:config.audio.true_peak,measurement,applied:!!finite},paths:{video:'output/final.mp4',srt:'output/final.srt',thumbnail:'output/thumbnail.png',audio:'work/audio-master.wav'},warnings});
}
