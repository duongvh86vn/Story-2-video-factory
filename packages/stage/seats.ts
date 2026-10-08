import type {Shot} from '../core/schemas.js';
import {escapeHtml} from '../core/utils.js';
import type {SeatSupport} from '../animation/schemas.js';
import {seatOccupancy,sameSeatSupport} from '../animation/support.js';
import type {PerformancePlan} from '../animation/schemas.js';
import {sourceBodyPlan,bodyTrackOffsetMs} from '../animation/view-source-body.js';

export const SEAT_SUPPORT_VERSION='physical-seat-2.2.2';
/** Project the complete occupancy to this shot; never reserve an off-shot seat.
 * Approach/hold/rise all remain occupied, even if the cut lies in a held pose. */
export function shotSeatOccupancy(plan:PerformancePlan,shotStartMs:number){
  const offset=bodyTrackOffsetMs(plan,shotStartMs);
  return seatOccupancy(sourceBodyPlan(plan)).flatMap(interval=>{
    const startMs=Math.max(0,interval.startMs+offset),endMs=Math.min(plan.durationMs,interval.endMs+offset);
    return endMs>startMs?[{supportId:interval.supportId,startMs,endMs}]:[];
  });
}
export function sceneSeats(shot:Shot):SeatSupport[]{
  const c=shot.cinematic;if(!c)return [];
  const performers=[...(c.actorScene?.primary===null?[]:[{id:c.leadCharacterId,performance:c.performance}]),
    ...(c.actorScene?.supporting??[]).map(a=>({id:a.character.id,performance:a.performance}))];
  const seats=new Map<string,SeatSupport>(),owners=new Map<string,Array<{actorId:string;startMs:number;endMs:number}>>();
  for(const actor of performers){
    const stage=actor.performance.stage,world=c.performance.stage;
    if(stage.width!==world.width||stage.height!==world.height||stage.groundY!==world.groundY)throw new Error(`${shot.id}: actor ${actor.id} must share the physical stage and ground anchor`);
    for(const seat of sourceBodyPlan(actor.performance).supports??[]){
      const previous=seats.get(seat.id);
      if(previous&&!sameSeatSupport(previous,seat))throw new Error(`${shot.id}: seat ${seat.id} changes its world geometry between actors`);
      seats.set(seat.id,seat);
    }
    for(const interval of shotSeatOccupancy(actor.performance,shot.startMs)){
      const existing=owners.get(interval.supportId)??[];
      if(existing.some(p=>p.actorId!==actor.id&&p.startMs<interval.endMs&&p.endMs>interval.startMs))throw new Error(`${shot.id}: seat ${interval.supportId} has overlapping actor owners`);
      owners.set(interval.supportId,[...existing,{...interval,actorId:actor.id}]);
    }
  }
  const list=[...seats.values()];
  for(const [i,seat] of list.entries())for(const other of list.slice(i+1)){
    if(Math.abs(seat.center.y-other.center.y)<8&&Math.abs(seat.center.x-other.center.x)<(seat.width+other.width)/2)throw new Error(`${shot.id}: seats ${seat.id}/${other.id} overlap in the physical stage`);
  }
  return list;
}
/** Passive illustration in the same world as pelvis, feet and manipulated objects. */
export function seatSvg(seat:SeatSupport,groundY:number,palette:{surface:string;ink:string;accent:string}):string{
  const {x,y}=seat.center,w=seat.width,rear=x+(seat.facing==='left'?1:-1)*w*.42,back=seat.backHeight??0;
  return `<g id="support-seat-${escapeHtml(seat.id)}" data-seat-id="${escapeHtml(seat.id)}" data-support-type="seat"><ellipse cx="${x}" cy="${groundY+3}" rx="${w*.6}" ry="6" fill="#000000" opacity=".12"/><g stroke="${palette.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="${palette.surface}">${back?`<path d="M${rear} ${groundY}V${y-back}"/><rect x="${rear-4}" y="${y-back}" width="8" height="${back*.58}" rx="3"/>`:''}<path d="M${x-w*.35} ${y+6}V${groundY}M${x+w*.35} ${y+6}V${groundY}M${x-w*.35} ${y+(groundY-y)*.7}H${x+w*.35}"/><rect x="${x-w/2}" y="${y}" width="${w}" height="8" rx="4" fill="${palette.accent}"/></g></g>`;
}
