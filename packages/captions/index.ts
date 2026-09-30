import type { FactoryConfig } from '../core/config.js';
import { NarrationSchema, type Narration } from '../core/schemas.js';
import { writeAtomic } from '../core/utils.js';
import { outputPath } from '../render/process.js';
import { serializeSrt } from '../ingest/srt.js';

export function srtTime(ms:number):string {const n=Math.round(ms);return `${String(Math.floor(n/3600000)).padStart(2,'0')}:${String(Math.floor(n/60000)%60).padStart(2,'0')}:${String(Math.floor(n/1000)%60).padStart(2,'0')},${String(n%1000).padStart(3,'0')}`;}
function captionText(text:string):string {return text.replace(/\u0000/g,'').replace(/\r\n?/g,'\n').replace(/<[^>]*>/g,'').trim();}
export function toSrt(narration:Narration):string {
  NarrationSchema.parse(narration);
  return serializeSrt(narration.segments);
}
function assTime(ms:number):string {const cs=Math.round(ms/10);return `${Math.floor(cs/360000)}:${String(Math.floor(cs/6000)%60).padStart(2,'0')}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;}
export function toAss(narration:Narration,config:FactoryConfig):string {
  if(!/^[\p{L}\p{N} _-]{1,80}$/u.test(config.captions.font)) throw new Error('Caption font must be a plain local font family');
  const {width,height}=config.rendering.final,margin=Math.round(height*.06);
  const header=`[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${config.captions.font},${config.captions.font_size},&H00FFFFFF,&H00FFFFFF,&H00202020,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,${margin},${margin},${margin},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const events=narration.segments.map(segment=>{
    // ASS override delimiters and backslashes in source are plain spoken text.
    const text=captionText(segment.text).replace(/\\/g,'\\\\').replace(/\{/g,'\\{').replace(/\}/g,'\\}').replace(/\n/g,'\\N');
    return `Dialogue: 0,${assTime(segment.startMs)},${assTime(segment.endMs)},Default,,0,0,0,,${text}`;
  }).join('\n');
  return header+events+'\n';
}
export interface CaptionArtifacts { srt:string; ass:string; burn:boolean; soft:boolean; }
export async function writeCaptions(projectRoot:string,config:FactoryConfig,narration:Narration):Promise<CaptionArtifacts> {
  const srt=await outputPath(projectRoot,'output/final.srt'),ass=await outputPath(projectRoot,'work/captions.ass');
  await writeAtomic(srt,toSrt(narration));await writeAtomic(ass,toAss(narration,config));
  return {srt,ass,burn:['burned','both'].includes(config.captions.mode),soft:['soft','both'].includes(config.captions.mode)};
}
