import { z } from 'zod';
import { Id } from '../core/identifiers.js';
import { PointSchema, PerformancePlanSchema } from '../animation/schemas.js';
import { SourceRefSchema,SceneIntentSchema } from '../explainer/schemas.js';
import { ArtDirectionSchema } from './art-direction-schemas.js';
import {ActorSceneSchema} from '../actors/schemas.js';
import {SpriteStageSchema} from '../motion/stage-schemas.js';
import {SourceWorldSchema} from './source-world-schemas.js';
import {SourceOwnershipSchema} from './source-ownership-schemas.js';
import {OwnershipPaintSchema} from './ownership-paint-schemas.js';

export const DIRECTION_VERSION='story-direction-2.2.43';
export const CINEMATIC_PLAN_FILES=['story-direction.json','stage-plan.json','performance-plan.json','camera-plan.json','creative-direction-report.json','camera-direction-report.json','actor-cast.json','actor-timeline.json'] as const;
export const CINEMATIC_EXPORT_FILES=[...CINEMATIC_PLAN_FILES,'environment-provenance.json','performance-report.json','animation-library.json'] as const;
export const CinematicModelSchema=z.object({partId:Id,variant:z.enum(['conceptual','historical-note','vehicle-feature-schematic','three-wheel-group','electric-vehicle-schematic','combustion-vehicle-schematic','electric-motor','combustion-engine','steam-old','steam-split']),sourceRefs:z.array(SourceRefSchema).min(1)}).strict();
export type CinematicModel=z.infer<typeof CinematicModelSchema>;
export const CameraSchema=z.object({framing:z.enum(['wide','medium','close']),movement:z.enum(['locked','push-in','pull-out','pan-left','pan-right']),
  focus:z.enum(['ensemble','face','contact','object']).optional(),anchor:PointSchema,
  designIntent:z.string().min(1).max(1000).optional(),
  startScale:z.number().finite().min(.1).max(10),endScale:z.number().finite().min(.1).max(10),
}).strict().superRefine((camera,ctx)=>{
  const limits={wide:[.65,1.12],medium:[1.1,1.7],close:[2,3.4]} as const;
  const [min,max]=limits[camera.framing];
  for(const key of ['startScale','endScale'] as const)if(!camera.designIntent&&(camera[key]<min||camera[key]>max))ctx.addIssue({code:'custom',path:[key],message:`${camera.framing} camera scale must be ${min}–${max}; validate host size and focus inside the safe viewport.`});
  if(camera.framing==='close'&&!['face','contact','object'].includes(camera.focus??''))ctx.addIssue({code:'custom',path:['focus'],message:'Close framing requires intentional face, contact or object focus.'});
  if(camera.framing!=='close'&&camera.focus&&camera.focus!=='ensemble')ctx.addIssue({code:'custom',path:['focus'],message:'Wide/medium framing must use ensemble focus.'});
});
export type CinematicCamera=z.infer<typeof CameraSchema>;
export const CinematicPlanSchema=z.object({
  version:z.literal(22),producer:z.literal(DIRECTION_VERSION),shotId:Id,leadCharacterId:Id,
  motivation:z.string().min(1).max(1000),attentionPartId:Id.optional(),sourceRefs:z.array(SourceRefSchema).min(1),
  setting:z.enum(['workshop','road','neutral','forest','camp','cave','river']),environmentAssetId:Id.optional(),
  provenance:z.literal('illustration'),
  artDirection:ArtDirectionSchema.optional(),
  actorScene:ActorSceneSchema.optional(),
  spriteStage:SpriteStageSchema.optional(),
  sourceWorld:SourceWorldSchema.optional(),
  sourceOwnership:z.array(SourceOwnershipSchema).min(1).max(16).optional(),
  ownershipPaint:z.array(OwnershipPaintSchema).min(1).max(16).optional(),
  sceneIntent:SceneIntentSchema.optional(),
  models:z.array(CinematicModelSchema),
  propBindings:z.array(z.object({propId:Id,partId:Id,ownerId:Id.optional(),role:z.literal('illustrative-model'),sourceRefs:z.array(SourceRefSchema).min(1)}).strict()).default([]),
  continuity:z.object({entry:PointSchema,exit:PointSchema,facing:z.enum(['front','left','right']),carriedProps:z.array(Id),
    models:z.array(z.object({partId:Id,x:z.number().finite(),y:z.number().finite(),width:z.number().positive(),height:z.number().positive()})).default([])}).strict(),
  camera:CameraSchema,
  performance:PerformancePlanSchema,
}).strict().superRefine((c,ctx)=>{
  if(c.ownershipPaint&&!c.sourceOwnership)ctx.addIssue({code:'custom',path:['ownershipPaint'],message:'Ownership paint requires an explicit original ownership timeline; never infer one'});
  if(c.models.length&&!c.attentionPartId)ctx.addIssue({code:'custom',path:['attentionPartId'],message:'A scene with models requires object attention.'});
  if(!c.models.length){
    if(!c.sceneIntent?.participants.length||!(c.actorScene?.primary||c.actorScene?.supporting.length))
      ctx.addIssue({code:'custom',path:['models'],message:'Empty models require a sourced sceneIntent and a real actorScene cast.'});
    if(c.attentionPartId||c.propBindings.length||c.continuity.models.length||c.continuity.carriedProps.length)
      ctx.addIssue({code:'custom',path:['attentionPartId'],message:'Objectless actor scene cannot retain object attention, bindings or model continuity.'});
  }
});
export type CinematicPlan=z.infer<typeof CinematicPlanSchema>;
