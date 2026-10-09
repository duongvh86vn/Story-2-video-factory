import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {VisualizationEventSchema} from '../explainer/schemas.js';
import {SOURCE_WORLD_VERSION} from './source-world-reference.js';

export const SourceWorldContactSchema=z.object({actorId:Id,sourceId:Id,gestureId:Id}).strict();
export const SourceWorldEventSchema=VisualizationEventSchema.omit({sourceWorld:true}).extend({id:Id,contacts:z.array(SourceWorldContactSchema).min(1).max(2).optional()}).strict();
export const SourceWorldSchema=z.object({version:z.literal(SOURCE_WORLD_VERSION),id:Id,startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),events:z.array(SourceWorldEventSchema).max(128)}).strict().superRefine((world,ctx)=>{
  if(world.endMs<=world.startMs)ctx.addIssue({code:'custom',path:['endMs'],message:'Original world interval must be positive'});
  const ids=new Set<string>();
  for(const [i,event] of world.events.entries()){
    if(ids.has(event.id))ctx.addIssue({code:'custom',path:['events',i,'id'],message:'Original world event IDs must be unique'});ids.add(event.id);
    if(event.startMs<world.startMs||event.endMs>world.endMs||event.endMs<=event.startMs)ctx.addIssue({code:'custom',path:['events',i],message:'Original event must be wholly inside its world clock'});
    if(event.contactRequired!==Boolean(event.contacts?.length))ctx.addIssue({code:'custom',path:['events',i,'contacts'],message:'Contact-driven original events require explicit original actor/source/gesture contacts only'});
  }
});
export type SourceWorld=z.infer<typeof SourceWorldSchema>;
export type SourceWorldEvent=z.infer<typeof SourceWorldEventSchema>;
