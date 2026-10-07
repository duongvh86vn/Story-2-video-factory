import {z} from 'zod';
import {Id} from '../core/identifiers.js';

export const ACTOR_MOTION_VERSION='actor-motion-1' as const;
export const SPRITE_PLAYER_VERSION='sprite-timeline-1' as const;
export const MotionHash=z.string().regex(/^[a-f0-9]{64}$/);
export const MotionPoint=z.object({x:z.number().finite(),y:z.number().finite()}).strict();
export type MotionPoint=z.infer<typeof MotionPoint>;
export const MotionRect=z.object({x:z.number().int().nonnegative(),y:z.number().int().nonnegative(),w:z.number().int().positive(),h:z.number().int().positive()}).strict();
export const MotionView=z.enum(['front','back','left','right','three-quarter-left','three-quarter-right','back-three-quarter-left','back-three-quarter-right']);
const LandmarkName=z.string().regex(/^[a-z][a-z0-9_]{0,31}$/).refine(s=>!['constructor','prototype','__proto__'].includes(s));
const LocalPath=z.string().min(1).max(240).refine(s=>!s.includes('\\')&&!s.includes('\0')&&!s.includes(':')&&!s.startsWith('/')&&!s.split('/').some(p=>!p||p==='.'||p==='..'),'Expected a local relative path');
export const MotionRegistrationSchema=z.object({
  version:z.literal('actor-motion-registration-1'),id:Id,actorId:Id,state:Id,view:MotionView,
  referenceHash:MotionHash,
  playback:z.object({mode:z.enum(['once','loop']),end:z.enum(['hold','first','hide'])}).strict(),
  /** Source-frame pixels; required, never inferred from empty canvas margins. */
  anchor:MotionPoint,
  /** Optional explicit anchor for every playback position, in its frame pixels.
   * When absent, the shared anchor retains the existing registration contract. */
  anchors:z.array(MotionPoint).min(1).max(512).optional(),
  requiredLandmarks:z.array(LandmarkName).max(32).default([]),
  /** Optional per-play-position registration, overriding declared source landmarks. */
  landmarks:z.array(z.record(LandmarkName,MotionPoint)).max(512).optional(),
  notes:z.array(z.string().max(1000)).max(20).default([]),
}).strict();
export type MotionRegistration=z.infer<typeof MotionRegistrationSchema>;
export const MotionFrameSchema=z.object({rect:MotionRect,durationMs:z.number().finite().min(1).max(60000),anchor:MotionPoint,landmarks:z.record(LandmarkName,MotionPoint)}).strict();
export const ActorMotionSchema=z.object({
  version:z.literal(ACTOR_MOTION_VERSION),id:Id,actorId:Id,state:Id,view:MotionView,
  fingerprint:MotionHash,
  source:z.object({kind:z.enum(['sprite-gen-atlas','sprite-gen-strip']),metadataHash:MotionHash,sheetHash:MotionHash,registrationHash:MotionHash,referenceHash:MotionHash,loop:z.boolean()}).strict(),
  sheet:z.object({path:LocalPath,hash:MotionHash,width:z.number().int().positive().max(32768),height:z.number().int().positive().max(32768)}).strict(),
  playback:MotionRegistrationSchema.shape.playback,
  frames:z.array(MotionFrameSchema).min(1).max(512),
  review:z.object({status:z.literal('candidate'),productionReady:z.literal(false),warnings:z.array(z.string()).max(32)}).strict(),
}).strict().superRefine((motion,ctx)=>{
  if(motion.frames.reduce((sum,f)=>sum+f.durationMs,0)>120000)ctx.addIssue({code:'custom',path:['frames'],message:'Motion cycle exceeds 120 seconds'});
  if(motion.sheet.width*motion.sheet.height>64_000_000)ctx.addIssue({code:'custom',path:['sheet'],message:'Motion sheet exceeds 64 million pixels'});
  for(const [i,f] of motion.frames.entries()){
    if(f.rect.x+f.rect.w>motion.sheet.width||f.rect.y+f.rect.h>motion.sheet.height)ctx.addIssue({code:'custom',path:['frames',i,'rect'],message:'Frame escapes sheet'});
    const points=[f.anchor,...Object.values(f.landmarks)];
    if(points.some(p=>p.x<0||p.y<0||p.x>f.rect.w||p.y>f.rect.h))ctx.addIssue({code:'custom',path:['frames',i],message:'Anchor/landmark escapes frame'});
  }
});
export type ActorMotion=z.infer<typeof ActorMotionSchema>;
export const SpritePlacementSchema=z.object({x:z.number().finite(),y:z.number().finite(),scale:z.number().finite().min(.01).max(8),rotation:z.number().finite().min(-180).max(180)}).strict();
export type SpritePlacement=z.infer<typeof SpritePlacementSchema>;
export const SpriteClipSchema=z.object({id:Id,compositionId:Id,startMs:z.number().finite().nonnegative(),endMs:z.number().finite().positive().max(120000),rate:z.number().finite().min(.5).max(2).default(1),placement:SpritePlacementSchema}).strict()
  .refine(clip=>clip.endMs>clip.startMs,'Invalid sprite clip clock');
export type SpriteClip=z.infer<typeof SpriteClipSchema>;
