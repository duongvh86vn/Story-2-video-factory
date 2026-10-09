import type {Shot} from '../core/schemas.js';
import {SourceWorldSchema,type SourceWorld} from './source-world-schemas.js';

/** Exact global event intersection. Original contacts/history stay in source. */
export function projectSourceWorldEvents(world:SourceWorld,startMs:number,endMs:number):NonNullable<Shot['visualization']>['events']{
  SourceWorldSchema.parse(world);
  if(!Number.isSafeInteger(startMs)||!Number.isSafeInteger(endMs)||startMs<world.startMs||endMs>world.endMs||endMs<=startMs)throw new Error('needs-source-prop-binding: invalid original world camera slice');
  return world.events.flatMap(({id,contacts:_,spearContact:__,...event})=>{
    const start=Math.max(event.startMs,startMs),end=Math.min(event.endMs,endMs);
    return start<end?[{...event,startMs:start,endMs:end,sourceWorld:{sourceId:world.id,eventId:id}}]:[];
  });
}
