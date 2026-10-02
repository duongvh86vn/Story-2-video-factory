import { z } from 'zod';
import { Id } from '../core/identifiers.js';

export const ANIMATION_VERSION = 'performance-2.2.7';
export const Moods = ['neutral', 'curious', 'thinking', 'concerned', 'effort', 'surprised', 'understanding', 'confident'] as const;
const Time = z.number().int().nonnegative();
export const PointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();
const Interval = { startMs: Time, endMs: Time };
export const WalkSchema = z.object({ ...Interval, fromX: z.number().finite(), toX: z.number().finite() }).strict();
export const FacingSchema=z.enum(['front','left','right']);
export const TurnSchema=z.object({...Interval,direction:FacingSchema}).strict();
export const GestureSchema = z.object({ ...Interval, id: Id,
  action: z.enum(['address-viewer', 'point', 'inspect', 'think', 'operate', 'pick-place', 'carry', 'react', 'lead-next']),
  target: PointSchema.optional(), destination: PointSchema.optional(),
  propId: Id.optional(), contactMs: Time.optional(), releaseMs: Time.optional(), carryOffset: PointSchema.optional(),
}).strict();
export const PerformancePlanSchema = z.object({
  version: z.literal(22), compilerVersion: z.literal(ANIMATION_VERSION), id: Id,
  leadCharacterId: Id, profileHash: z.string().min(1), kind: z.enum(['stick-man', 'mini-robot']),
  durationMs: Time.refine(n => n > 0), fps: z.number().int().min(24).max(60),
  stage: z.object({ width: z.number().finite().positive(), height: z.number().finite().positive(), groundY: z.number().finite() }).strict(),
  root: PointSchema, scale: z.number().min(.25).max(4),
  facing:FacingSchema.optional(),turns:z.array(TurnSchema).optional(),
  walks: z.array(WalkSchema), gestures: z.array(GestureSchema),
  expressions: z.array(z.object({ ...Interval, mood: z.enum(Moods) }).strict()),
  gazes: z.array(z.object({ ...Interval, target: PointSchema }).strict()),
  props: z.array(z.object({ id: Id, origin: PointSchema, destination: PointSchema.optional(), gripOffset: PointSchema.optional(), attachedTo:z.literal('right-hand').optional() }).strict()),
}).strict();
export type PerformancePlan = z.infer<typeof PerformancePlanSchema>;
export type Gesture = z.infer<typeof GestureSchema>;
export type Point = z.infer<typeof PointSchema>;
export type Mood = typeof Moods[number];
