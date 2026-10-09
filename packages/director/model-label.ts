import type {Shot} from '../core/schemas.js';
/** Shared by authored markup and camera clearance. No measured text claim. */
export function cameraModelLabel(part:NonNullable<Shot['visualization']>['parts'][number],height:number,width:number){
  const font=height*.021,maxChars=Math.max(12,Math.floor(part.width*width/font*1.6)),lines:string[]=[];let line='';
  for(const word of part.label.split(/\s+/)){if(line&&line.length+word.length+1>maxChars){lines.push(line);line='';}line=line?`${line} ${word}`:word;}if(line)lines.push(line);
  return {font,lines,labelY:part.y*height+part.height*height*.56,labelHeight:lines.length*font*1.15};
}
