import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {SourceRefSchema} from '../explainer/schemas.js';

/** Explicit illustration depth, independent of anatomy, hand side and camera
 * primary. No inferred depth, pose registration or production approval. */
export const OwnershipPaintSchema=z.object({version:z.literal('ownership-paint-1'),sourceId:Id,
  entityPlane:z.enum(['behind-actors','in-front-of-actors']),
  grips:z.array(z.object({gripId:Id,depth:z.enum(['before-entity','after-entity']),
    anchor:z.object({x:z.number().finite().min(0).max(1),y:z.number().finite().min(0).max(1)}).strict(),
  }).strict()).min(1).max(64),
  sourceRefs:z.array(SourceRefSchema).min(1).max(32),
}).strict().superRefine((paint,ctx)=>{
  const ids=new Set<string>();
  for(const [i,grip] of paint.grips.entries()){
    if(ids.has(grip.gripId))ctx.addIssue({code:'custom',path:['grips',i,'gripId'],message:'Each original grip has exactly one explicit painter'});
    ids.add(grip.gripId);
  }
});
export type OwnershipPaint=z.infer<typeof OwnershipPaintSchema>;
