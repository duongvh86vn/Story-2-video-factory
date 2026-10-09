import type {Shot} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import type {CompiledOwnership} from './ownership-compile.js';
import {ownershipBakeSnapshot} from './ownership-bake-query.js';
import {ownershipPhaseAt} from './source-ownership-projection.js';
import type {SourceOwnership} from './source-ownership-schemas.js';
import {boundProp} from './prop-owner.js';

export interface OwnershipPalmMask {
  slotId:string;maskId:string;states:Array<{timeMs:number;opacity:0|1}>;
}
export const ownershipPalmMaskId=(slotId:string)=>'ownership-slot-mask-'+hash(['slot',slotId]);
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: ownership palm mask ${message}`);};

/** Mask only the generic prop-depth painter, only while this actual hand is
 * painted by a canonical entity. The compiler still owns the inner slot and
 * the original hand definition, so later/earlier independent props retain it.
 * Aggregate all entities before emitting one discrete schedule per hand. */
export function ownershipPalmMasks(shot:Shot,compiled:ReadonlyMap<string,CompiledOwnership>):OwnershipPalmMask[]{
  const sources=shot.cinematic?.sourceOwnership;
  if(!sources?.length||compiled.size!==sources.length)return fail(shot,'requires every canonical entity');
  const slots=new Map<string,Array<{source:SourceOwnership;gripId:string}>>();
  for(const [partId,item]of compiled){
    const bake=ownershipBakeSnapshot(item),source=bake.source;
    if(bake.startMs!==shot.startMs||bake.endMs!==shot.endMs||item.shotHash!==hash(shot)||sources.filter(s=>s.partId===partId&&hash(s)===hash(item.source)).length!==1)return fail(shot,'source/shot/clock differs from its canonical bake');
    for(const grip of source.grips){
      const bindings=shot.cinematic!.propBindings.filter(b=>b.ownerId===grip.actorId&&b.propId===grip.propId&&b.partId===partId);
      if(bindings.length!==1)return fail(shot,'original grip has no unique actual person binding');
      const owner=boundProp(shot,bindings[0]!),slotId=`${owner.prefix}hand-${grip.hand}-prop-slot`;
      const aliases=item.aliases.filter(a=>a.actorId===grip.actorId&&a.propId===grip.propId&&a.hand===grip.hand);
      if(aliases.length!==1||aliases[0]!.slotSvgId!==slotId||aliases[0]!.handSvgId!==`${owner.prefix}hand-${grip.hand}`)return fail(shot,'slot does not reference its own original person hand');
      const entries=slots.get(slotId)??[];entries.push({source,gripId:grip.id});slots.set(slotId,entries);
    }
  }
  return [...slots].map(([slotId,entries])=>{
    const times=new Set<number>([shot.startMs,shot.endMs]);
    for(const {source}of entries)for(const phase of source.phases)for(const at of [phase.startMs,phase.endMs])if(at>=shot.startMs&&at<=shot.endMs)times.add(at);
    const states:OwnershipPalmMask['states']=[];
    for(const timeMs of [...times].sort((a,b)=>a-b)){
      const occupied=entries.some(({source,gripId})=>{const phase=ownershipPhaseAt(source,timeMs);return phase.kind==='held'?phase.gripId===gripId:phase.kind==='shared'&&phase.gripIds.includes(gripId);});
      const opacity=occupied?0:1;
      if(!states.length||states.at(-1)!.opacity!==opacity)states.push({timeMs,opacity});
    }
    return {slotId,maskId:ownershipPalmMaskId(slotId),states};
  });
}
