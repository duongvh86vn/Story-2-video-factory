import type { Shot } from '../core/schemas.js';
import type { HostProfile } from '../host/schemas.js';
import { cameraHostBounds, cameraModelLabel } from './camera.js';

type Box={left:number;right:number;top:number;bottom:number};
const overlaps=(a:Box,b:Box)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+.01&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+.01;
/** Check the authored two-vehicle stage on the entire walk clock, not just its exit pose. */
export function validateComparisonReadability(shot:Shot,profile:HostProfile):void{
  const parts=shot.visualization?.parts??[],p=shot.cinematic?.performance;
  if(!p||parts.filter(part=>part.kind==='car').length!==2||!parts.every(part=>['car','engine','battery'].includes(part.kind)))return;
  const bounds=cameraHostBounds(p,profile),{width,height}=p.stage;
  const modelBox=(part:typeof parts[number]):Box=>({left:(part.x-part.width*.5)*width,right:(part.x+part.width*.5)*width,top:(part.y-part.height*.5)*height,bottom:(part.y+part.height*.5)*height});
  for(const part of parts){
    const label=cameraModelLabel(part,height,width),box={left:(part.x-part.width*.56)*width,right:(part.x+part.width*.56)*width,top:label.labelY-label.font,bottom:label.labelY+label.labelHeight};
    if(overlaps(box,bounds.head))throw new Error(`${shot.id}: comparison label ${part.id} covers the face`);
    for(const other of parts)if(other.id!==part.id&&overlaps(box,modelBox(other)))throw new Error(`${shot.id}: comparison label ${part.id} covers model ${other.id}`);
    if(part.kind==='car'&&!shot.host?.actions.some(a=>a.type==='operate-model'&&a.target?.partId===part.id)&&overlaps(modelBox(part),bounds.body))throw new Error(`${shot.id}: passive comparison car ${part.id} is hidden behind the actor`);
  }
}
