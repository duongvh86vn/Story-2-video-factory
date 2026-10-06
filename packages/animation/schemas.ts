import { z } from 'zod';
import { Id, RigHandSchema } from '../core/identifiers.js';

export const ANIMATION_VERSION = 'performance-2.2.13';
// Optional airborne clips use their own version; accepted grounded plans stay exact.
export const AIRBORNE_ANIMATION_VERSION = 'performance-2.2.14';
export const isCurrentAnimation=(version:string)=>version===ANIMATION_VERSION||version===AIRBORNE_ANIMATION_VERSION;
export const CONTINUOUS_ANIMATION_VERSION = 'performance-2.2.12';
export const STORY_ANIMATION_VERSION = 'performance-2.2.11';
export const SEATED_ANIMATION_VERSION = 'performance-2.2.10';
export const PREVIOUS_ANIMATION_VERSION = 'performance-2.2.9';
export const BODY_ANIMATION_VERSION = 'performance-2.2.8';
export const LEGACY_ANIMATION_VERSION = 'performance-2.2.7';
export const LEGACY_MOODS = ['neutral', 'curious', 'thinking', 'concerned', 'effort', 'surprised', 'understanding', 'confident'] as const;
export const STORY_MOODS = ['happy', 'sad', 'angry', 'afraid', 'excited', 'disappointed', 'relieved', 'tired'] as const;
export const Moods = [...LEGACY_MOODS, ...STORY_MOODS] as const;
const Time = z.number().int().nonnegative();
export const PointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();
const Interval = { startMs: Time, endMs: Time };
export const WalkSchema = z.object({ ...Interval, fromX: z.number().finite(), toX: z.number().finite() }).strict();
export const JumpSchema=z.object({...Interval,takeoffMs:Time,landingMs:Time,height:z.number().finite().positive()}).strict();
export const FacingSchema=z.enum(['front','left','right']);
export const TurnSchema=z.object({...Interval,direction:FacingSchema}).strict();
export const HeadViewSchema=z.enum(['front','three-quarter-left','three-quarter-right','left','right','back-left','back-right','back']);
export type HeadView=z.infer<typeof HeadViewSchema>;
export const HeadTurnSchema=z.object({...Interval,direction:HeadViewSchema}).strict();
const PostureTarget = {
  pose:z.enum(['stand','crouch','lean','seated']),
  intensity:z.number().finite().min(0).max(1).optional(),
  leanDeg:z.number().finite().min(-25).max(25).optional(),
  supportId:Id.optional(),
};
export const PostureTargetSchema=z.object(PostureTarget).strict();
export const PostureSchema=z.object({...Interval,...PostureTarget}).strict();
export const SeatSupportSchema=z.object({id:Id,kind:z.literal('seat'),center:PointSchema,width:z.number().finite().positive(),
  facing:z.enum(['left','right']),backHeight:z.number().finite().nonnegative().optional()}).strict();
export const GestureSchema = z.object({ ...Interval, id: Id,
  action: z.enum(['address-viewer', 'point', 'inspect', 'think', 'operate', 'pick-place', 'carry', 'drop', 'react', 'lead-next']),
  target: PointSchema.optional(), destination: PointSchema.optional(),
  elbowPole:z.enum(['rest','reach']).optional(),
  hand:RigHandSchema.optional(),
  propId: Id.optional(), contactMs: Time.optional(), releaseMs: Time.optional(), landingMs:Time.optional(), carryOffset: PointSchema.optional(),
}).strict();
export const PerformancePlanSchema = z.object({
  version: z.literal(22), compilerVersion: z.enum([AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION,STORY_ANIMATION_VERSION,SEATED_ANIMATION_VERSION,PREVIOUS_ANIMATION_VERSION,BODY_ANIMATION_VERSION,LEGACY_ANIMATION_VERSION]), id: Id,
  leadCharacterId: Id, profileHash: z.string().min(1), kind: z.enum(['stick-man', 'mini-robot']),
  durationMs: Time.refine(n => n > 0), fps: z.number().int().min(24).max(60),
  stage: z.object({ width: z.number().finite().positive(), height: z.number().finite().positive(), groundY: z.number().finite() }).strict(),
  root: PointSchema, scale: z.number().min(.25).max(4),
  facing:FacingSchema.optional(),turns:z.array(TurnSchema).optional(),
  headView:HeadViewSchema.optional(),headTurns:z.array(HeadTurnSchema).max(40).optional(),
  entryPosture:PostureTargetSchema.optional(),postures:z.array(PostureSchema).optional(),
  supports:z.array(SeatSupportSchema).max(12).optional(),
  walks: z.array(WalkSchema), jumps:z.array(JumpSchema).max(16).optional(), gestures: z.array(GestureSchema),
  expressions: z.array(z.object({ ...Interval, mood: z.enum(Moods) }).strict()),
  gazes: z.array(z.object({ ...Interval, target: PointSchema }).strict()),
  props: z.array(z.object({ id: Id, origin: PointSchema, destination: PointSchema.optional(), gripOffset: PointSchema.optional(), attachedTo:z.enum(['left-hand','right-hand']).optional() }).strict()),
}).strict();
export type PerformancePlan = z.infer<typeof PerformancePlanSchema>;
export type Gesture = z.infer<typeof GestureSchema>;
export type Point = z.infer<typeof PointSchema>;
export type Mood = typeof Moods[number];
export type PostureTarget = z.infer<typeof PostureTargetSchema>;
export type SeatSupport = z.infer<typeof SeatSupportSchema>;
