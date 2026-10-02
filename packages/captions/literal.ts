import {promises as fs} from 'node:fs';
import type {FactoryConfig} from '../core/config.js';
import {NarrationSchema,type Narration} from '../core/schemas.js';
import {writeAtomic} from '../core/utils.js';
import {execute,outputPath,parseEnvelope} from '../render/process.js';
import {ffmpeg,ffprobeExecutable} from '../audio/ffmpeg.js';
import {serializeSrt} from '../ingest/srt.js';

export const MEDIA_TEXT_VERSION='literal-tx3g-1';
interface TextPacket {pos:string;size:string;pts_time:string;duration_time:string;}
async function packets(root:string,config:FactoryConfig,file:string):Promise<TextPacket[]>{
  const result=await execute(ffprobeExecutable(),['-v','error','-select_streams','s:0','-show_packets','-show_entries','packet=pos,size,pts_time,duration_time','-of','json',file],
    {cwd:root,logFile:await outputPath(root,'work/logs/ffprobe.jsonl'),timeoutMs:Math.min(config.rendering.timeout_ms,60000)});
  const envelope=parseEnvelope(result.stdout);
  if(!envelope||!Array.isArray(envelope.packets))throw new Error('Cannot inspect timed-text subtitle packets');
  return envelope.packets as TextPacket[];
}
function packetBounds(packet:TextPacket,fileSize:number){
  const pos=Number(packet.pos),size=Number(packet.size),startMs=Math.round(Number(packet.pts_time)*1000),endMs=startMs+Math.round(Number(packet.duration_time)*1000);
  if(!Number.isSafeInteger(pos)||!Number.isSafeInteger(size)||pos<0||size<2||size>65537||pos+size>fileSize||!Number.isSafeInteger(startMs)||!Number.isSafeInteger(endMs)||startMs<0||endMs<=startMs)
    throw new Error('Invalid timed-text subtitle packet bounds or clock');
  return {pos,size,startMs,endMs};
}
function cueBytes(narration:Narration):Buffer[]{
  NarrationSchema.parse(narration);
  return narration.segments.map(cue=>{const bytes=Buffer.from(cue.text,'utf8');
    if(!bytes.length||bytes.length>65535||cue.text.includes('\0'))throw new Error(`${cue.id}: MP4 timed text requires 1–65535 UTF-8 bytes without NUL`);
    return bytes;
  });
}

function placeholderBytes(length:number):Buffer {
  const bytes=Buffer.alloc(length,0x78);
  // The SRT demuxer splits physical lines at its 4096-byte read buffer and
  // inserts LF. Keep placeholder lines short and count their explicit LF in
  // the reserved byte length. A trailing LF would be stripped, so avoid it.
  for(let offset=1000;offset<length-1;offset+=1001)bytes[offset]=0x0a;
  return bytes;
}

/** FFmpeg builds only the container/clock using plain ASCII placeholders.
 * Replace equal-length tx3g payloads so source text never enters the lossy ASS parser.
 * Video/audio are later stream-copied by FFmpeg; their bytes are never patched here. */
export async function literalSubtitleTrack(root:string,config:FactoryConfig,narration:Narration):Promise<string>{
  const texts=cueBytes(narration),placeholder=await outputPath(root,'work/captions-placeholder.srt'),track=await outputPath(root,'work/captions-literal.mp4');
  const placeholders=texts.map(text=>placeholderBytes(text.length));
  await writeAtomic(placeholder,serializeSrt(narration.segments.map((cue,i)=>({...cue,text:placeholders[i]!.toString('ascii')}))));
  await ffmpeg(root,config,['-y','-i',placeholder,'-map','0:s:0','-c:s','mov_text',track]);
  const raw=await fs.readFile(track),rows=await packets(root,config,track);let index=0,lastEnd=0;
  for(const packet of rows){
    // MP4 has two-byte empty samples for gaps and the terminal clear event.
    if(Number(packet.size)===2)continue;
    const bounds=packetBounds(packet,raw.length),cue=narration.segments[index],text=texts[index];
    if(!cue||!text||bounds.startMs!==cue.startMs||bounds.endMs!==cue.endMs||bounds.pos<lastEnd||bounds.size!==text.length+2
      ||raw.readUInt16BE(bounds.pos)!==text.length||!raw.subarray(bounds.pos+2,bounds.pos+bounds.size).equals(placeholders[index]!))
      throw new Error('FFmpeg changed the literal subtitle placeholder samples or cue clock');
    text.copy(raw,bounds.pos+2);lastEnd=bounds.pos+bounds.size;index++;
  }
  if(index!==texts.length)throw new Error('Literal subtitle track does not cover every cue');
  await writeAtomic(track,raw);
  await verifyLiteralSubtitles(root,config,track,narration);
  return track;
}

/** Verify the stored samples directly: FFmpeg text extraction itself interprets ASS controls. */
export async function verifyLiteralSubtitles(root:string,config:FactoryConfig,file:string,narration:Narration):Promise<void>{
  const texts=cueBytes(narration),rows=await packets(root,config,file),handle=await fs.open(file,'r');let index=0;
  try{const {size:fileSize}=await handle.stat();
    for(const packet of rows){
      if(Number(packet.size)===2)continue;
      const bounds=packetBounds(packet,fileSize),cue=narration.segments[index],text=texts[index],stored=Buffer.alloc(bounds.size);
      const read=await handle.read(stored,0,stored.length,bounds.pos);
      if(!cue||!text||bounds.startMs!==cue.startMs||bounds.endMs!==cue.endMs||read.bytesRead!==stored.length||stored.length!==text.length+2
        ||stored.readUInt16BE(0)!==text.length||!stored.subarray(2).equals(text))throw new Error('Final MP4 subtitle text or cue clock differs from canonical narration');
      index++;
    }
    if(index!==texts.length)throw new Error('Final MP4 subtitle track is missing canonical cues');
  }finally{await handle.close();}
}
