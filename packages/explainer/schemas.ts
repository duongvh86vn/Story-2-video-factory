import { z } from 'zod';
import { Id, RigHandSchema } from '../core/identifiers.js';

export const VisualMethods = ['question', 'mechanism', 'process', 'evolution', 'comparison', 'breakdown', 'event-sequence', 'summary'] as const;
export const SourceRefSchema = z.object({ kind: z.enum(['narration', 'source']), segmentId: Id.optional(),
  quote: z.string().min(1).max(2000) });
/** Semantic source assertions, not new dialogue or a promise of unsupported motion. */
export const SceneIntentSchema = z.object({
  participants: z.array(z.object({id:Id,name:z.string().trim().min(1).max(80),
    role:z.string().trim().min(1).max(1000),identity:z.enum(['historical','fictional','illustrative']),
    sourceRefs:z.array(SourceRefSchema).min(1)}).strict()).max(8),
  action:z.string().trim().min(1).max(2000),objective:z.string().trim().min(1).max(2000),
  result:z.string().trim().min(1).max(2000).optional(),sourceRefs:z.array(SourceRefSchema).min(1),
}).strict();
export type SceneIntent=z.infer<typeof SceneIntentSchema>;
export const EntitySchema = z.object({ id: Id, label: z.string().min(1).max(100),
  kind: z.enum(['boiler', 'condenser', 'piston', 'cylinder', 'wheel', 'gear', 'lever', 'car', 'engine', 'battery', 'pipe', 'flow', 'object', 'stage', 'marker']),
  sourceRefs: z.array(SourceRefSchema).min(1),
  configuration:z.enum(['old-cylinder','separate-condenser']).optional().describe('Only for a sourced grouped design: kind=object, visualization type=comparison, exact canonical label and evidence. Omit on cylinder/condenser components. Preserve seed entity identity and states.'),
  states:z.array(z.object({value:z.enum(['hot','cold']),sourceRefs:z.array(SourceRefSchema).min(1)})).max(8).optional() });
export const RelationSchema = z.object({ from: Id, to: Id, kind: z.enum(['sequence', 'cause', 'transfer', 'part-of', 'compare']),
  sourceRefs: z.array(SourceRefSchema).min(1) });
export const ExplanationBeatSchema = z.object({ beatId: Id, explanationGoal: z.string().min(1).max(500),
  narrationSegmentIds: z.array(Id).min(1), sourceRefs: z.array(SourceRefSchema).min(1),
  entities: z.array(EntitySchema).max(8), relations: z.array(RelationSchema).max(16),
  visualMethod: z.enum(VisualMethods), hostIntent: z.string().min(1).max(500),sceneIntent:SceneIntentSchema.optional() });
export type ExplanationBeat = z.infer<typeof ExplanationBeatSchema>;
export const ExplanationPlanSchema = z.object({ version: z.literal(2), hostId: Id, beats: z.array(ExplanationBeatSchema).min(1),
  contentIssues: z.array(z.object({ severity: z.enum(['high', 'medium', 'low']), description: z.string(), sourceRefs: z.array(SourceRefSchema) })).default([]) })
  .superRefine((plan,ctx)=>{for(const [i,beat] of plan.beats.entries())if(!beat.entities.length&&(!beat.sceneIntent?.participants.length||beat.relations.length))
    ctx.addIssue({code:'custom',path:['beats',i,'entities'],message:'Empty entities require sourced actor participants and no object relations.'});});
export type ExplanationPlan = z.infer<typeof ExplanationPlanSchema>;
export const VisualizationPartSchema = EntitySchema.extend({
  x: z.number().min(0).max(1), y: z.number().min(0).max(1),
  width: z.number().positive().max(1), height: z.number().positive().max(1),
});
export const VisualizationEventSchema = z.object({ type: z.enum(['highlight', 'part-motion', 'flow', 'reveal', 'compare','state']),
  targetId: Id, narrationAnchor: Id, startMs: z.number().int().nonnegative(), endMs: z.number().int().positive(),
  contactRequired: z.boolean().default(false), motion: z.enum(['translate', 'rotate', 'pulse', 'none']).default('none'),
  sourceRefs: z.array(SourceRefSchema).min(1),state:z.enum(['hot','cold']).optional(),relationTo:Id.optional(),contactPartId:Id.optional(),
  contactActorId:Id.optional(),contactHands:z.array(RigHandSchema).min(1).max(2).optional() });
export const VisualizationSchema = z.object({ type: z.enum(VisualMethods), modelId: Id,
  parts: z.array(VisualizationPartSchema).max(8), relations: z.array(RelationSchema).max(16),
  events: z.array(VisualizationEventSchema), provenance: z.literal('visualization'),
  fidelity: z.literal('conceptual'),sceneIntent:SceneIntentSchema.optional() }).superRefine((v,ctx)=>{
    if(!v.parts.length&&(!v.sceneIntent?.participants.length||v.events.length||v.relations.length))
      ctx.addIssue({code:'custom',path:['parts'],message:'Objectless visualization requires actor intent and no object events/relations; the cinematic gate also requires a real cast.'});
    if(v.parts.length&&!v.events.length&&!v.sceneIntent)
      ctx.addIssue({code:'custom',path:['events'],message:'Diagram visualization requires an explanatory event.'});
  });
export type Visualization = z.infer<typeof VisualizationSchema>;
