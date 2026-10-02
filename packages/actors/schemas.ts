import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {HostProfileSchema,HostActionSchema} from '../host/schemas.js';
import {SourceRefSchema} from '../explainer/schemas.js';
import {PerformancePlanSchema} from '../animation/schemas.js';

export const ActorDefinitionSchema=z.object({
  id:Id,name:z.string().min(1).max(80).refine(value=>value.trim().length>0,'Actor name must contain text'),role:z.string().min(1).max(1000).refine(value=>value.trim().length>0,'Actor role must contain text'),kind:z.enum(['stick-man','mini-robot']),
  identity:z.enum(['historical','illustrative']),sourceRefs:z.array(SourceRefSchema).min(1),
  appearance:HostProfileSchema.shape.appearance,
  costume:HostProfileSchema.shape.costume,
}).strict();
export const ActorSceneSchema=z.object({
  primary:ActorDefinitionSchema.nullable(),
  speakingSegmentIds:z.array(Id).default([]),
  continuity:z.enum(['continuous','cut']).default('cut'),
  supporting:z.array(z.object({character:ActorDefinitionSchema,performance:PerformancePlanSchema,
    actions:z.array(HostActionSchema),speakingSegmentIds:z.array(Id).default([])}).strict()).default([]),
}).strict();
export type ActorDefinition=z.infer<typeof ActorDefinitionSchema>;
export type ActorScene=z.infer<typeof ActorSceneSchema>;
