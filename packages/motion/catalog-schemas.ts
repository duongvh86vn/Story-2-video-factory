import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {SceneIntentSchema} from '../explainer/schemas.js';
import {MotionHash} from './schemas.js';

export const SPRITE_CATALOG_VERSION='actor-motion-catalog-1' as const;
const acting=SceneIntentSchema.shape.acting.unwrap().element;
export const MotionCapabilitySchema=acting.pick({kind:true,movement:true,operation:true}).strict().superRefine((capability,ctx)=>{
  const issue=(message:string)=>ctx.addIssue({code:'custom',message});
  if(['speech','unsupported'].includes(capability.kind))issue('Baked motion catalog does not provide speech or unsupported acting');
  if(capability.movement!==undefined&&capability.kind!=='locomotion')issue('Movement belongs to locomotion');
  if(capability.operation!==undefined&&capability.kind!=='manipulation')issue('Operation belongs to manipulation');
});
export type MotionCapability=z.infer<typeof MotionCapabilitySchema>;
export const MotionCatalogEntrySchema=z.object({motionId:Id,fingerprint:MotionHash,label:z.string().trim().min(1).max(200),
  capabilities:z.array(MotionCapabilitySchema).min(1).max(16),
  speechVariants:z.array(z.object({variantId:Id,fingerprint:MotionHash}).strict()).min(1).max(16).optional()}).strict();
export const SpriteMotionCatalogSchema=z.object({version:z.literal(SPRITE_CATALOG_VERSION),entries:z.array(MotionCatalogEntrySchema).max(256)}).strict().superRefine((catalog,ctx)=>{
  const keys=catalog.entries.map(entry=>`${entry.motionId}:${entry.fingerprint}`);
  if(new Set(keys).size!==keys.length)ctx.addIssue({code:'custom',path:['entries'],message:'Duplicate motion version in catalog'});
  if(catalog.entries.reduce((sum,entry)=>sum+(entry.speechVariants?.length??0),0)>256)ctx.addIssue({code:'custom',path:['entries'],message:'Catalog exceeds 256 speech variant links'});
  for(const [i,entry] of catalog.entries.entries()){
    const kinds=entry.capabilities.map(capability=>JSON.stringify([capability.kind,capability.movement??null,capability.operation??null]));
    if(new Set(kinds).size!==kinds.length)ctx.addIssue({code:'custom',path:['entries',i,'capabilities'],message:'Duplicate motion capability'});
    const variants=entry.speechVariants?.map(variant=>`${variant.variantId}:${variant.fingerprint}`)??[];
    if(new Set(variants).size!==variants.length)ctx.addIssue({code:'custom',path:['entries',i,'speechVariants'],message:'Duplicate speech version in catalog'});
  }
});
export type SpriteMotionCatalog=z.infer<typeof SpriteMotionCatalogSchema>;
export const MotionCatalogSaveSchema=z.object({catalog:SpriteMotionCatalogSchema,revision:MotionHash.nullable()}).strict();
