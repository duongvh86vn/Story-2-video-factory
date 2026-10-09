import type {Shot} from '../core/schemas.js';
import {ModelContactFrameSchema,type ModelContactFrame} from './model-contact-reference.js';

export const PROJECTED_MODEL_OVERLAY_VERSION='projected-model-overlays-1';
export type ProjectedBounds={left:number;right:number;top:number;bottom:number};
type Part=NonNullable<Shot['visualization']>['parts'][number];
const fail=(message:string):never=>{throw new Error(`needs-source-prop-binding: projected model decorations ${message}`);};
export function modelThermal(part:Part,w:number,h:number):string{
  return part.states?.length?`<g class="thermal-coat">${(['hot','cold'] as const).map(state=>`<rect class="thermal-${state}-coat" x="${-w*.36}" y="${-h*.33}" width="${w*.72}" height="${h*.66}" rx="8" fill="${state==='hot'?'#D65332':'#3394C5'}" opacity="0" stroke="none"/>`).join('')}</g><g class="thermal-hot" opacity="0" stroke="#BF482B">${[-.2,0,.2].map(px=>`<path d="M${w*px} ${-h*.4}q${w*.08} ${-h*.08} 0 ${-h*.16}"/>`).join('')}</g><g class="thermal-cold" opacity="0" stroke="#237CA6"><path d="M0 ${-h*.37}V${-h*.58}M${-w*.08} ${-h*.43}L${w*.08} ${-h*.53}M${-w*.08} ${-h*.53}L${w*.08} ${-h*.43}"/></g>`:'';
}
function spec(part:Part,frame:ModelContactFrame){
  const b=frame.bounds,center=frame.anchors.center;
  return {focus:{x:(b.left+b.right)/2,y:(b.top+b.bottom)/2,rx:(b.right-b.left)/2+.03,ry:(b.bottom-b.top)/2+.1},energy:{x:center.x,y:center.y,rx:.4,ry:.4},thermal:!!part.states?.length};
}
/** Same explicit extents drive trusted generated markup and camera envelopes.
 * Fractions are post-projection, including aspect padding. Not contact ROIs. */
export function modelDecorationBounds(part:Part,frame:ModelContactFrame):ProjectedBounds{
  const f=spec(part,ModelContactFrameSchema.parse(frame));
  return {left:Math.min(frame.bounds.left,f.focus.x-f.focus.rx,f.energy.x-f.energy.rx,f.thermal? .14:Infinity),
    right:Math.max(frame.bounds.right,f.focus.x+f.focus.rx,f.energy.x+f.energy.rx,f.thermal? .86:-Infinity),
    top:Math.min(frame.bounds.top,f.focus.y-f.focus.ry,f.energy.y-f.energy.ry,f.thermal?-.14:Infinity),
    bottom:Math.max(frame.bounds.bottom,f.focus.y+f.focus.ry,f.energy.y+f.energy.ry,f.thermal? .83:-Infinity)};
}
/** Only source-owned scalar data enters this factory; no caller-supplied SVG
 * decorator string can bypass the passive artwork sanitizer. */
export function modelProjectedDecorations(shot:Shot,partId:string,w:number,h:number){
  const c=shot.cinematic,parts=shot.visualization?.parts.filter(p=>p.id===partId)??[],models=c?.artDirection?.models.filter(m=>m.partId===partId)??[];
  if(!c||parts.length!==1||models.length!==1||!models[0]!.contactFrame||![w,h].every(Number.isFinite)||w<=0||h<=0)return fail('requires one actual whole projected model and positive local dimensions');
  const part=parts[0]!,frame=ModelContactFrameSchema.parse(models[0]!.contactFrame),index=shot.visualization!.parts.indexOf(part),accent=c.artDirection?.palette.accent??'#F4CD68';
  if(!/^#[\da-f]{6}$/i.test(accent))return fail('requires a plain six-digit palette color');
  const f=spec(part,frame),ellipse=(v:typeof f.focus)=>`cx="${(v.x-.5)*w}" cy="${(v.y-.5)*h}" rx="${v.rx*w}" ry="${v.ry*h}"`;
  return {underlay:`<g class="contact-model-underlay"><g class="focus-${index}" opacity="0"><ellipse ${ellipse(f.focus)} fill="${accent}" opacity=".35" stroke="none"/></g></g>`,
    overlay:`<g class="contact-model-effects">${modelThermal(part,w,h)}<ellipse class="energy-effect" ${ellipse(f.energy)} fill="#F0C545" opacity="0" stroke="none"/></g>`,
    bounds:modelDecorationBounds(part,frame),version:PROJECTED_MODEL_OVERLAY_VERSION};
}
