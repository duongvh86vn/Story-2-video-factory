import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {SourceRefSchema} from '../explainer/schemas.js';

export const SOURCE_SPEAR_BINDING_VERSION='source-spear-binding-1' as const;
/** One physical actor-local shaft is one story entity. This deliberately has
 * no alternate glyph, guessed grip, auto approval or new motion clock. */
export const SourceSpearBindingSchema=z.object({version:z.literal(SOURCE_SPEAR_BINDING_VERSION),
  id:Id,ownerId:Id,sourceId:Id,trackId:Id,propId:Id,partId:Id,
  artwork:z.literal('forest-spear-grips-4'),
  sourceRefs:z.array(SourceRefSchema).min(1).max(32),
}).strict();
export type SourceSpearBinding=z.infer<typeof SourceSpearBindingSchema>;
