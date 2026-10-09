import {z} from 'zod';
import {Id} from '../core/identifiers.js';

export const SOURCE_SPEAR_ACTION_VERSION='source-spear-action-1' as const;
/** Exact original physical track and its bound shaft entity. The struck
 * target is the separate HostAction.target; a hand does not touch that target. */
export const SpearActionRefSchema=z.object({sourceId:Id,trackId:Id,shaftPartId:Id}).strict();
export const SpearWorldContactSchema=SpearActionRefSchema.extend({actorId:Id}).strict();
