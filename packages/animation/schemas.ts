import { z } from 'zod';
import { Id, RigHandSchema } from '../core/identifiers.js';

export const ANIMATION_VERSION = 'performance-2.2.13';
// Optional airborne clips use their own version; accepted grounded plans stay exact.
export const AIRBORNE_ANIMATION_VERSION = 'performance-2.2.14';
export const HUNT_ANIMATION_VERSION='performance-2.2.15';
export const isCurrentAnimation=(version:string)=>version===ANIMATION_VERSION||version===AIRBORNE_ANIMATION_VERSION||version===HUNT_ANIMATION_VERSION;
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
export const WalkSchema = z.object({ ...Interval, fromX: z.number().finite(), toX: z.number().finite(),gait:z.enum(['walk','run']).optional() }).strict();
export const JumpSchema=z.object({...Interval,takeoffMs:Time,landingMs:Time,height:z.number().finite().positive(),tuck:z.number().finite().min(0).max(.5).optional()}).strict();
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
/** Complete physical motion in its original run-relative clock. Every camera
 * slice declares this same source; local motion tracks must not approximate it. */
export const BODY_SOURCE_VERSION='native-source-body-1' as const;
export const BODY_SOURCE_SEAT_CLOCK_VERSION='native-source-seat-1' as const;
export const BodySourceSchema=z.object({version:z.literal(BODY_SOURCE_VERSION),id:Id,startMs:Time,endMs:Time,
  walks:z.array(WalkSchema),jumps:z.array(JumpSchema).max(16).optional(),postures:z.array(PostureSchema).optional(),entryPosture:PostureTargetSchema.optional(),
  supports:z.array(SeatSupportSchema).max(12).optional(),
}).strict().superRefine((source,ctx)=>{
  const duration=source.endMs-source.startMs;
  if(duration<=0)ctx.addIssue({code:'custom',message:'Invalid original body source span'});
  const ids=new Set((source.supports??[]).map(s=>s.id));
  if(ids.size!==(source.supports?.length??0))ctx.addIssue({code:'custom',path:['supports'],message:'Duplicate original seat support identity'});
  for(const pose of [...(source.entryPosture?[source.entryPosture]:[]),...(source.postures??[])]){
    if(pose.pose==='seated'&&(!pose.supportId||!ids.has(pose.supportId)))ctx.addIssue({code:'custom',path:['supports'],message:'Original seated posture requires a known seat support'});
    if(pose.pose!=='seated'&&pose.supportId)ctx.addIssue({code:'custom',path:['postures'],message:'Only an original seated posture can own a seat support'});
  }
  for(const [name,clips] of [['walks',source.walks],['jumps',source.jumps??[]],['postures',source.postures??[]]] as const){
    let previousEnd=0;
    for(const clip of [...clips].sort((a,b)=>a.startMs-b.startMs)){
      if(clip.endMs<=clip.startMs||clip.startMs<previousEnd||clip.endMs>duration)ctx.addIssue({code:'custom',path:[name],message:'Original body tracks must fit their complete relative span without overlap'});
      previousEnd=clip.endMs;
    }
  }
});
export type BodySource=z.infer<typeof BodySourceSchema>;
/** Original absolute motion window. It is not a narration or contact clock. */
export const GestureSourceSpanSchema=z.object({...Interval,id:Id,reachMs:Time.optional(),recoverMs:Time.optional()}).strict().superRefine((span,ctx)=>{
  const reach=span.reachMs??span.startMs+Math.min(600,(span.endMs-span.startMs)*.35),recover=span.recoverMs??Math.max(reach,span.endMs-Math.min(400,(span.endMs-span.startMs)*.25));
  if(span.endMs<=span.startMs||reach<=span.startMs||recover<reach||recover>=span.endMs)ctx.addIssue({code:'custom',message:'Invalid source gesture approach/hold/recovery window'});
});
export type GestureSourceSpan=z.infer<typeof GestureSourceSpanSchema>;
export const GestureSchema = z.object({ ...Interval, id: Id,
  action: z.enum(['address-viewer', 'point', 'inspect', 'think', 'operate', 'pick-place', 'carry', 'drop', 'react', 'lead-next']),
  target: PointSchema.optional(), destination: PointSchema.optional(),
  elbowPole:z.enum(['rest','reach']).optional(),
  hand:RigHandSchema.optional(),
  sourceSpan:GestureSourceSpanSchema.optional(),
  propId: Id.optional(), contactMs: Time.optional(), releaseMs: Time.optional(), landingMs:Time.optional(), carryOffset: PointSchema.optional(),
}).strict();
export const SpearTrackSchema=z.object({...Interval,id:Id,propId:Id,hand:RigHandSchema,
  action:z.enum(['hold','thrust']),grip:PointSchema,aim:PointSchema,
  twoHands:z.boolean().default(true),secondaryOffset:z.number().finite().min(-200).max(-10),
  elbowPoles:z.object({primary:z.union([z.literal(-1),z.literal(1)]),secondary:z.union([z.literal(-1),z.literal(1)])}).strict().optional(),
  readyMs:Time.optional(),contactMs:Time.optional(),recoverMs:Time.optional()}).strict();
export const LungeSchema=z.object({version:z.literal('forest-planted-lunge-1'),spearId:Id,
  soles:z.object({left:PointSchema,right:PointSchema}).strict(),
  kneePoles:z.object({left:z.union([z.literal(-1),z.literal(1)]),right:z.union([z.literal(-1),z.literal(1)])}).strict(),
  advanceX:z.number().finite().min(-20).max(20),dropY:z.number().finite().min(0).max(12),
  entryLeanDeg:z.number().finite().min(-20).max(20),contactLeanDeg:z.number().finite().min(-25).max(25)}).strict();
export const PerformancePlanSchema = z.object({
  version: z.literal(22), compilerVersion: z.enum([HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION,STORY_ANIMATION_VERSION,SEATED_ANIMATION_VERSION,PREVIOUS_ANIMATION_VERSION,BODY_ANIMATION_VERSION,LEGACY_ANIMATION_VERSION]), id: Id,
  leadCharacterId: Id, profileHash: z.string().min(1), kind: z.enum(['stick-man', 'mini-robot']),
  durationMs: Time.refine(n => n > 0), fps: z.number().int().min(24).max(60),
  stage: z.object({ width: z.number().finite().positive(), height: z.number().finite().positive(), groundY: z.number().finite() }).strict(),
  root: PointSchema, scale: z.number().min(.25).max(4),
  facing:FacingSchema.optional(),turns:z.array(TurnSchema).optional(),
  headView:HeadViewSchema.optional(),headTurns:z.array(HeadTurnSchema).max(40).optional(),
  entryPosture:PostureTargetSchema.optional(),postures:z.array(PostureSchema).optional(),
  supports:z.array(SeatSupportSchema).max(12).optional(),
  walks: z.array(WalkSchema), jumps:z.array(JumpSchema).max(16).optional(), gestures: z.array(GestureSchema),spears:z.array(SpearTrackSchema).max(8).optional(),
  sourceBody:BodySourceSchema.optional(),
  lunge:LungeSchema.optional(),
  expressions: z.array(z.object({ ...Interval, mood: z.enum(Moods) }).strict()),
  gazes: z.array(z.object({ ...Interval, target: PointSchema }).strict()),
  props: z.array(z.object({ id: Id, origin: PointSchema, destination: PointSchema.optional(), gripOffset: PointSchema.optional(), attachedTo:z.enum(['left-hand','right-hand']).optional(),kind:z.enum(['generic','spear']).optional(),length:z.number().finite().min(50).max(600).optional() }).strict().superRefine((prop,ctx)=>{
    if(prop.kind!=='spear'&&(prop.length??0)>200)ctx.addIssue({code:'custom',path:['length'],message:'Only a spear has the extended 600-unit shaft range.'});
  })),
}).strict();
export type PerformancePlan = z.infer<typeof PerformancePlanSchema>;
export type Gesture = z.infer<typeof GestureSchema>;
export type Point = z.infer<typeof PointSchema>;
export type Mood = typeof Moods[number];
export type PostureTarget = z.infer<typeof PostureTargetSchema>;
export type SeatSupport = z.infer<typeof SeatSupportSchema>;
