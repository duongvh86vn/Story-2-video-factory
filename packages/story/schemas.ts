import { z } from 'zod';
import { Id } from '../core/schemas.js';

// Models select semantics and segment membership. Code alone owns timing.
export const ChapterPlanSchema = z.object({ chapters: z.array(z.object({
  id: Id, title: z.string().min(1), summary: z.string().min(1),
  narrativePurpose: z.string().min(1), segmentIds: z.array(Id).min(1),
}).strict()).min(1) }).strict();
export const BeatPlanSchema = z.object({ beats: z.array(z.object({
  id: Id, meaning: z.string().min(1), visualGoal: z.string().min(1),
  importance: z.number().min(0).max(1), segmentIds: z.array(Id).min(1),
}).strict()).min(1) }).strict();
