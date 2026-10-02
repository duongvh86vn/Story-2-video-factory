import { z } from 'zod';
import { Id } from '../core/identifiers.js';

export const VisualMethods = ['question', 'mechanism', 'process', 'evolution', 'comparison', 'breakdown', 'event-sequence', 'summary'] as const;
export const SourceRefSchema = z.object({ kind: z.enum(['narration', 'source']), segmentId: Id.optional(),
  quote: z.string().min(1).max(2000) });
export const EntitySchema = z.object({ id: Id, label: z.string().min(1).max(100),
  kind: z.enum(['boiler', 'condenser', 'piston', 'cylinder', 'wheel', 'gear', 'lever', 'car', 'engine', 'battery', 'pipe', 'flow', 'object', 'stage', 'marker']),
  sourceRefs: z.array(SourceRefSchema).min(1),
  configuration:z.enum(['old-cylinder','separate-condenser']).optional(),
  states:z.array(z.object({value:z.enum(['hot','cold']),sourceRefs:z.array(SourceRefSchema).min(1)})).max(8).optional() });
export const RelationSchema = z.object({ from: Id, to: Id, kind: z.enum(['sequence', 'cause', 'transfer', 'part-of', 'compare']),
  sourceRefs: z.array(SourceRefSchema).min(1) });
export const ExplanationBeatSchema = z.object({ beatId: Id, explanationGoal: z.string().min(1).max(500),
  narrationSegmentIds: z.array(Id).min(1), sourceRefs: z.array(SourceRefSchema).min(1),
  entities: z.array(EntitySchema).min(1).max(8), relations: z.array(RelationSchema).max(16),
  visualMethod: z.enum(VisualMethods), hostIntent: z.string().min(1).max(500) });
export type ExplanationBeat = z.infer<typeof ExplanationBeatSchema>;
export const ExplanationPlanSchema = z.object({ version: z.literal(2), hostId: Id, beats: z.array(ExplanationBeatSchema).min(1),
  contentIssues: z.array(z.object({ severity: z.enum(['high', 'medium', 'low']), description: z.string(), sourceRefs: z.array(SourceRefSchema) })).default([]) });
export type ExplanationPlan = z.infer<typeof ExplanationPlanSchema>;
export const VisualizationPartSchema = EntitySchema.extend({
  x: z.number().min(0).max(1), y: z.number().min(0).max(1),
  width: z.number().positive().max(1), height: z.number().positive().max(1),
});
export const VisualizationEventSchema = z.object({ type: z.enum(['highlight', 'part-motion', 'flow', 'reveal', 'compare','state']),
  targetId: Id, narrationAnchor: Id, startMs: z.number().int().nonnegative(), endMs: z.number().int().positive(),
  contactRequired: z.boolean().default(false), motion: z.enum(['translate', 'rotate', 'pulse', 'none']).default('none'),
  sourceRefs: z.array(SourceRefSchema).min(1),state:z.enum(['hot','cold']).optional(),relationTo:Id.optional(),contactPartId:Id.optional() });
export const VisualizationSchema = z.object({ type: z.enum(VisualMethods), modelId: Id,
  parts: z.array(VisualizationPartSchema).min(1).max(8), relations: z.array(RelationSchema).max(16),
  events: z.array(VisualizationEventSchema).min(1), provenance: z.literal('visualization'),
  fidelity: z.literal('conceptual') });
export type Visualization = z.infer<typeof VisualizationSchema>;
