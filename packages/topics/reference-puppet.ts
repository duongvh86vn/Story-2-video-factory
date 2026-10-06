import {promises as fs} from 'node:fs';
import path from 'node:path';
import {hash} from '../core/utils.js';
import {inkLimb} from '../animation/ink-limb.js';

type Point={x:number;y:number};
type Limb={start:Point;joint:Point;end:Point};
interface Layout {sha256:string;canvas:[number,number];clips:Record<string,string>;limbs:Limb[];strokeWidth:number;}
const rect=(x:number,y:number,w:number,h:number)=>`M${x} ${y}h${w}v${h}h-${w}Z`;

// Source-unit SVG masks retain the full cutout's actual colors and contours.
// Anatomical RIGHT is screen LEFT in this source view. These are static rest
// calibration layers, not reconstructed occluded parts or production rigs.
const layouts:Record<'lila'|'karo',Layout>={
  lila:{sha256:'ef8b4a5f1445e0937bb41e661e8dc9de8a8a12a499e2eca87e3367807474d14e',canvas:[430,766],strokeWidth:17,
    clips:{
      head:'M0 0H430V250L363 298L337 420L305 365L299 311L281 263L243 263L221 365L160 434H0Z',
      neck:rect(242,236,43,58),
      clothing:'M244 263L276 263L301 324L307 414L330 601H136L150 500L182 415L208 337Z',
      'right-hand':rect(85,466,64,78),'left-hand':rect(348,469,60,77),
      'right-foot':rect(74,704,91,54),'left-foot':rect(258,702,96,57),
    },limbs:[
      {start:{x:188,y:552},joint:{x:160,y:640},end:{x:135,y:719}},
      {start:{x:281,y:552},joint:{x:282,y:639},end:{x:283,y:719}},
      {start:{x:236,y:276},joint:{x:146,y:389},end:{x:113,y:490}},
      {start:{x:294,y:294},joint:{x:340,y:378},end:{x:376,y:500}},
    ]},
  karo:{sha256:'f190653ab448f89da80b7156ff7ee677d5788a16dca6126b7796bab3f845b665',canvas:[377,716],strokeWidth:16,
    clips:{
      head:'M0 0H377V255L283 281L229 291L196 279L165 247H0Z',
      neck:rect(185,250,53,51),
      clothing:'M158 250L228 273L274 275L296 421L304 558H124L140 433Z',
      'right-hand':rect(55,450,54,72),'left-hand':rect(318,450,54,72),
      'right-foot':rect(76,658,96,58),'left-foot':rect(250,657,91,56),
    },limbs:[
      {start:{x:164,y:538},joint:{x:142,y:620},end:{x:128,y:679}},
      {start:{x:261,y:532},joint:{x:264,y:609},end:{x:266,y:680}},
      {start:{x:169,y:252},joint:{x:103,y:365},end:{x:77,y:469}},
      {start:{x:259,y:265},joint:{x:303,y:365},end:{x:343,y:470}},
    ]},
};
export function referencePuppetLayout(id:'lila'|'karo') {return structuredClone(layouts[id]);}
export async function referencePuppetSvg(repo:string,id:'lila'|'karo'):Promise<string> {
  const layout=layouts[id],bytes=await fs.readFile(path.join(repo,`library/topics/prehistoric-life/${id}-cutout-v1.png`));
  if(hash(bytes)!==layout.sha256)throw new Error('Cutout changed: remeasure masks and attachment placements before rendering.');
  const imageId=`${id}-reference-cutout`,parts=Object.keys(layout.clips);
  const part=(name:string)=>`<g data-part="${name}" clip-path="url(#${id}-${name})"><use href="#${imageId}"/></g>`;
  const clips=parts.map(name=>`<clipPath id="${id}-${name}" clipPathUnits="userSpaceOnUse"><path d="${layout.clips[name]}"/></clipPath>`).join('');
  const limbs=layout.limbs.map(limb=>`<path d="${inkLimb(limb.start,limb.joint,limb.end)}" fill="none" stroke="#030302" stroke-width="${layout.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.canvas.join(' ')}"><defs><image id="${imageId}" width="${layout.canvas[0]}" height="${layout.canvas[1]}" preserveAspectRatio="none" href="data:image/png;base64,${bytes.toString('base64')}"/>${clips}</defs>${part('neck')}${limbs}${part('head')}${part('clothing')}${part('right-hand')}${part('left-hand')}${part('right-foot')}${part('left-foot')}</svg>`;
}
