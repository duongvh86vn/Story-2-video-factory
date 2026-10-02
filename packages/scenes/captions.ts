import sharp from 'sharp';
import { escapeHtml } from '../core/utils.js';

/** Measure local font glyphs, then use the same CSS line box budget as the master. */
export async function captionFits(text:string,font:string,fontSize:number,width:number,height:number):Promise<boolean>{
  const maxLines=Math.floor((height*.14-24)/(fontSize*1.35));
  if(maxLines<1)return false;
  const contentWidth=Math.floor((width*.85-36)*.98),cache=new Map<string,number>();
  if(contentWidth<1)return false;
  const measure=async(value:string)=>{
    if(!value.trim())return 0;
    if(cache.has(value))return cache.get(value)!;
    const metrics=await sharp({text:{text:escapeHtml(value),font:`${font} ${fontSize}`,dpi:72,rgba:true}}).metadata();
    const result=metrics.width??0;cache.set(value,result);return result;
  };
  let lines=0;
  for(const row of text.split(/\r?\n/)){
    lines++;if(lines>maxLines)return false;let line='';
    for(const word of row.split(/\s+/).filter(Boolean)){
      const candidate=line?`${line} ${word}`:word;
      if(await measure(candidate)<=contentWidth){line=candidate;continue;}
      if(line){lines++;if(lines>maxLines)return false;line='';}
      // Match overflow-wrap:anywhere for a long unbroken token, retaining the original cue.
      for(const char of word){if(line&&await measure(line+char)>contentWidth){lines++;if(lines>maxLines)return false;line='';}line+=char;}
      if(await measure(line)>contentWidth)return false;
    }
  }
  return true;
}
