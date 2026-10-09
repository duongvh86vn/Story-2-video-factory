import {z} from 'zod';
import {Id} from '../core/identifiers.js';

export const SOURCE_WORLD_VERSION='source-world-timeline-1';
export const SourceWorldRefSchema=z.object({sourceId:Id,eventId:Id}).strict();
