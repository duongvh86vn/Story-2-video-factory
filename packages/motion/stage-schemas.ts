import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {SourceRefSchema} from '../explainer/schemas.js';
import {MotionHash,SpriteClipSchema,SpritePlacementSchema} from './schemas.js';
import {spriteSeconds} from './clock.js';

export const SPRITE_STAGE_VERSION='sprite-stage-1' as const;
const StageTransform=SpritePlacementSchema.extend({x:z.number().finite().min(-100000).max(100000),y:z.number().finite().min(-100000).max(100000)});
export const SpriteRootKeySchema=z.object({timeMs:z.number().finite().nonnegative().max(120000),transform:StageTransform,ease:z.enum(['none','sine.inOut']).default('none')}).strict();
export const SpriteStageClipSchema=SpriteClipSchema.innerType().extend({
  placement:StageTransform,motionId:Id,fingerprint:MotionHash,
  sourceRefs:z.array(SourceRefSchema).min(1).max(16),root:z.array(SpriteRootKeySchema).min(2).max(64),
}).strict().superRefine((clip,ctx)=>{
  const issue=(message:string)=>ctx.addIssue({code:'custom',message});
  if(clip.endMs<=clip.startMs || spriteSeconds(clip.endMs)<=spriteSeconds(clip.startMs))issue('Invalid sprite clip clock');
  if(clip.root[0]!.timeMs!==clip.startMs || clip.root.at(-1)!.timeMs!==clip.endMs)issue('Root keys must span exactly the clip start/end');
  for(let i=1;i<clip.root.length;i++)if(spriteSeconds(clip.root[i]!.timeMs)<=spriteSeconds(clip.root[i-1]!.timeMs))issue('Root key clocks must strictly increase on the renderer clock');
});
export type SpriteStageClip=z.infer<typeof SpriteStageClipSchema>;
export const SpriteContactSchema=z.object({
  id:Id,actorId:Id,clipId:Id,landmark:z.string().regex(/^[a-z][a-z0-9_]{0,31}$/).refine(s=>!['constructor','prototype','__proto__'].includes(s)),
  targetId:Id,timeMs:z.number().finite().nonnegative().max(120000),effectMs:z.number().finite().nonnegative().max(120000).optional(),
  maxErrorPx:z.number().finite().positive().max(32),sourceRefs:z.array(SourceRefSchema).min(1).max(16),
}).strict();
export const SpriteStageSchema=z.object({
  version:z.literal(1),producer:z.literal(SPRITE_STAGE_VERSION),id:Id,durationMs:z.number().finite().positive().max(120000),
  stage:z.object({width:z.number().int().positive().max(32768),height:z.number().int().positive().max(32768)}).strict(),
  actors:z.array(z.object({actorId:Id,clips:z.array(SpriteStageClipSchema).min(1).max(64)}).strict()).min(1).max(8),
  contacts:z.array(SpriteContactSchema).max(64).default([]),
}).strict().superRefine((plan,ctx)=>{
  const issue=(message:string)=>ctx.addIssue({code:'custom',message});
  if(plan.stage.width*plan.stage.height>64_000_000)issue('Sprite stage exceeds 64 million pixels');
  const clips=plan.actors.flatMap(actor=>actor.clips);
  if(clips.length>64)issue('Sprite stage exceeds 64 clips');
  if(clips.reduce((sum,clip)=>sum+clip.root.length,0)>256)issue('Sprite stage exceeds 256 root keys');
  if(new Set(plan.actors.map(actor=>actor.actorId)).size!==plan.actors.length)issue('Duplicate sprite actor ID');
  if(new Set(clips.map(clip=>clip.id)).size!==clips.length)issue('Duplicate sprite clip ID');
  if(new Set(plan.contacts.map(contact=>contact.id)).size!==plan.contacts.length)issue('Duplicate sprite contact ID');
  for(const actor of plan.actors){
    const ordered=actor.clips.slice().sort((a,b)=>a.startMs-b.startMs);
    for(const [i,clip] of ordered.entries()){
      if(clip.compositionId!==plan.id)issue('Sprite clip composition does not match stage');
      if(clip.endMs>plan.durationMs)issue('Sprite clip escapes scene clock');
      if(i && spriteSeconds(clip.startMs)<spriteSeconds(ordered[i-1]!.endMs))issue('Sprite actor clips overlap');
    }
  }
  for(const contact of plan.contacts){
    const clip=plan.actors.find(actor=>actor.actorId===contact.actorId)?.clips.find(c=>c.id===contact.clipId);
    if(!clip || spriteSeconds(contact.timeMs)<spriteSeconds(clip.startMs) || spriteSeconds(contact.timeMs)>=spriteSeconds(clip.endMs))issue('Sprite contact is outside its actor clip');
    if(contact.effectMs!==undefined && (spriteSeconds(contact.effectMs)<spriteSeconds(contact.timeMs) || spriteSeconds(contact.effectMs)>spriteSeconds(plan.durationMs)))issue('Sprite effect must follow contact within the scene clock');
  }
});
export type SpriteStage=z.infer<typeof SpriteStageSchema>;
