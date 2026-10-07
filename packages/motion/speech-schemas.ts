import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {ActorMotionSchema,MotionHash,MotionRect,MotionView,type ActorMotion} from './schemas.js';

export const ACTOR_SPEECH_VERSION='actor-speech-1' as const;
export const ActorSpeechRegistrationSchema=z.object({version:z.literal('actor-speech-registration-1'),id:Id,
  motionId:Id,motionFingerprint:MotionHash,regions:z.array(MotionRect).min(1).max(512),notes:z.array(z.string().max(1000)).max(20).default([])}).strict();
export type ActorSpeechRegistration=z.infer<typeof ActorSpeechRegistrationSchema>;
export const ActorSpeechSchema=z.object({version:z.literal(ACTOR_SPEECH_VERSION),id:Id,actorId:Id,
  motionId:Id,motionFingerprint:MotionHash,view:MotionView,referenceHash:MotionHash,fingerprint:MotionHash,
  source:z.object({registrationHash:MotionHash,baseSheetHash:MotionHash}).strict(),sheet:ActorMotionSchema.innerType().shape.sheet,
  regions:ActorSpeechRegistrationSchema.shape.regions,
  review:z.object({status:z.literal('candidate'),productionReady:z.literal(false),warnings:z.array(z.string().max(1000)).max(32)}).strict(),
}).strict().superRefine((variant,ctx)=>{
  if(variant.sheet.width*variant.sheet.height>64_000_000)ctx.addIssue({code:'custom',path:['sheet'],message:'Speech sheet exceeds 64 million pixels'});
});
export type ActorSpeech=z.infer<typeof ActorSpeechSchema>;

/** Metadata protection, not proof that the landmarks describe the true face. */
export function bindActorSpeech(input:ActorMotion,speech:ActorSpeech){
  const motion=ActorMotionSchema.parse(input),variant=ActorSpeechSchema.parse(speech);
  if(variant.motionId!==motion.id||variant.motionFingerprint!==motion.fingerprint||variant.actorId!==motion.actorId
    ||variant.view!==motion.view||variant.referenceHash!==motion.source.referenceHash||variant.source.baseSheetHash!==motion.sheet.hash
    ||variant.sheet.width!==motion.sheet.width||variant.sheet.height!==motion.sheet.height||variant.regions.length!==motion.frames.length)
    throw new Error('Speech variant does not match the exact native motion identity/layout');
  if(motion.frames.reduce((sum,frame)=>sum+frame.rect.w*frame.rect.h,0)>64_000_000)throw new Error('Speech frame comparisons exceed 64 million pixels');
  for(const [index,frame] of motion.frames.entries()){
    const region=variant.regions[index]!,points=frame.landmarks;
    for(const name of ['face_left','face_right','face_top','face_bottom','mouth_center','nose'])
      if(!points[name])throw new Error(`needs-sprite-mouth-registration: frame ${index} is missing ${name}`);
    const eyes=Object.entries(points).filter(([name])=>/^eye(?:_[a-z]+)?$/.test(name));
    if(!eyes.length)throw new Error(`needs-sprite-mouth-registration: frame ${index} needs a visible eye`);
    const left=points.face_left!.x,right=points.face_right!.x,top=points.face_top!.y,bottom=points.face_bottom!.y;
    if(!(left<right&&top<bottom)||region.x<left||region.y<top||region.x+region.w>right||region.y+region.h>bottom
      ||region.x+region.w>frame.rect.w||region.y+region.h>frame.rect.h)
      throw new Error(`Speech mouth region escapes the registered face/frame: ${index}`);
    const inside=(point:{x:number;y:number},pad=0)=>point.x>=region.x-pad&&point.x<region.x+region.w+pad&&point.y>=region.y-pad&&point.y<region.y+region.h+pad;
    if(!inside(points.mouth_center!))throw new Error(`Speech region does not contain mouth centre: ${index}`);
    const protectedPoints=[points.nose!,...eyes.map(([,point])=>point),...Object.entries(points).filter(([name])=>/^brow(?:_[a-z]+)?$/.test(name)).map(([,point])=>point)];
    const pad=Math.max(1,Math.min(right-left,bottom-top)*.04);
    if(protectedPoints.some(point=>inside(point,pad)))throw new Error(`Speech mouth region intersects protected eye/nose/brow registration: ${index}`);
  }
  return {motion,variant};
}
