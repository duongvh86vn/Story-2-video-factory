import { z } from 'zod';
import { Id } from '../core/identifiers.js';
import type { Shot } from '../core/schemas.js';
import { SourceRefSchema } from '../explainer/schemas.js';

const Color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const ArtKeyframeSchema=z.object({atMs:z.number().finite().nonnegative(),x:z.number().finite(),y:z.number().finite(),
  scale:z.number().finite().positive(),rotation:z.number().finite(),opacity:z.number().min(0).max(1)}).strict();
export const ArtDirectionSchema=z.object({
  origin:z.enum(['authored','model','offline']),brief:z.string().min(1).max(4000),useEnvironment:z.boolean(),
  palette:z.object({background:Color,surface:Color,ink:Color,accent:Color}).strict(),showHeading:z.boolean(),
  layers:z.array(z.object({id:Id,plane:z.enum(['background','midground','foreground','overlay']),
    role:z.enum(['decoration','explanation']),svg:z.string().min(1).max(150000),sourceRefs:z.array(SourceRefSchema).optional(),
    keyframes:z.array(ArtKeyframeSchema).min(1).max(200)}).strict()).max(40),
  models:z.array(z.object({partId:Id,svg:z.string().min(1).max(150000),foregroundSvg:z.string().min(1).max(150000).optional(),sourceRefs:z.array(SourceRefSchema).min(1),
    projection:z.enum(['normalized-stretch','model-viewport']).optional(),
    labelMode:z.enum(['renderer','artwork','none']).optional(),motionOrigin:z.object({x:z.number().finite(),y:z.number().finite()}).strict().optional(),
    controlMode:z.enum(['renderer','none']).optional(),
  }).strict()).max(40),
}).strict();
export type ArtDirection=z.infer<typeof ArtDirectionSchema>;
export type ArtKeyframe=z.infer<typeof ArtKeyframeSchema>;
export function rendersModelLabel(shot:Shot,partId:string):boolean{
  return (shot.cinematic?.artDirection?.models.find(model=>model.partId===partId)?.labelMode??'renderer')==='renderer';
}
export function rendersModelControl(shot:Shot,partId:string):boolean{
  const override=shot.cinematic?.artDirection?.models.find(model=>model.partId===partId)?.controlMode;
  if(override!==undefined)return override==='renderer';
  const part=shot.visualization?.parts.find(part=>part.id===partId);
  // Story props are touched or carried using the planned anchors; that does not
  // make a scarf, book or ordinary stage object into a machine with a control knob.
  if(shot.cinematic?.actorScene&&part&&['object','stage','marker'].includes(part.kind))return false;
  return true;
}
