import type {Shot} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {bodyRootAt} from '../animation/view-source-body.js';

/** One authority for declared entry/exit versus the actual primary body path.
 * Cast continuity is separately checked by actual person ID, not lead role. */
export function validatePerformanceContinuity(shot:Shot):void{
  const c=shot.cinematic;
  if(!c)throw new Error(shot.id+': cinematic continuity needs its performance');
  const p=c.performance;
  if(hash(c.continuity.entry)!==hash(bodyRootAt(p,shot.startMs,0))||Math.abs(c.continuity.exit.x-bodyRootAt(p,shot.startMs,p.durationMs).x)>.01||c.continuity.exit.y!==p.stage.groundY)throw new Error(shot.id+': cinematic continuity disagrees with locomotion');
  const facing=[...(p.turns??[])].sort((a,b)=>a.startMs-b.startMs).at(-1)?.direction??p.facing??'front';
  if(c.continuity.facing!==facing)throw new Error(shot.id+': cinematic facing disagrees with turn exit');
}
