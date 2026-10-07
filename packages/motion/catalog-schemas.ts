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
  capabilities:z.array(MotionCapabilitySchema).min(1).max(16)}).strict();
export const SpriteMotionCatalogSchema=z.object({version:z.literal(SPRITE_CATALOG_VERSION),entries:z.array(MotionCatalogEntrySchema).max(256)}).strict().superRefine((catalog,ctx)=>{
  const keys=catalog.entries.map(entry=>`${entry.motionId}:${entry.fingerprint}`);
  if(new Set(keys).size!==keys.length)ctx.addIssue({code:'custom',path:['entries'],message:'Duplicate motion version in catalog'});
  for(const [i,entry] of catalog.entries.entries()){
    const kinds=entry.capabilities.map(capability=>JSON.stringify([capability.kind,capability.movement??null,capability.operation??null]));
    if(new Set(kinds).size!==kinds.length)ctx.addIssue({code:'custom',path:['entries',i,'capabilities'],message:'Duplicate motion capability'});
  }
});
export type SpriteMotionCatalog=z.infer<typeof SpriteMotionCatalogSchema>;
export const MotionCatalogSaveSchema=z.object({catalog:SpriteMotionCatalogSchema,revision:MotionHash.nullable()}).strict();
