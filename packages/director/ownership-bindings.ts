import type {Shot} from '../core/schemas.js';
import type {CinematicPlan} from './schemas.js';
import {assertPropAliasCoverage,boundProp,propAliasIdentity} from './prop-owner.js';

type Binding=CinematicPlan['propBindings'][number];
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: ownership binding partition ${message}`);};

/** Structural partition only. Callers must still validate the complete original
 * canonical timelines AND every independent source entity. A local alias is
 * never permission to skip native/contact/art/cue/world validation. */
export function ownershipBindingPartition(shot:Shot):{canonical:Binding[];local:Binding[]}{
  const c=shot.cinematic,sources=c?.sourceOwnership;
  if(!c||!sources?.length)return fail(shot,'requires explicit original canonical ownership');
  assertPropAliasCoverage(shot);
  const parts=new Set<string>(),sourceIds=new Set<string>(),expected=new Map<string,string>();
  for(const source of sources){
    if(parts.has(source.partId)||sourceIds.has(source.id))return fail(shot,'canonical entity or source is duplicated');
    parts.add(source.partId);sourceIds.add(source.id);
    for(const grip of source.grips){
      const alias=propAliasIdentity(grip.actorId,grip.propId);
      if(expected.has(alias))return fail(shot,'one original actor/prop alias belongs to multiple canonical grips');
      expected.set(alias,source.partId);
    }
  }
  const result:{canonical:Binding[];local:Binding[]}={canonical:[],local:[]},seen=new Set<string>(),localParts=new Set<string>();
  for(const binding of c.propBindings){
    const owner=boundProp(shot,binding),alias=propAliasIdentity(owner.id,binding.propId);
    if(binding.ownerId!==owner.id||!owner.character||!owner.performance.sourceManipulation)return fail(shot,'every mixed-scene alias needs its explicit visible original-source person');
    if(parts.has(binding.partId)){
      if(expected.get(alias)!==binding.partId||seen.has(alias))return fail(shot,'canonical binding does not match its exact original person/prop/entity grip');
      seen.add(alias);result.canonical.push(binding);
    }else{
      if(expected.has(alias)||localParts.has(binding.partId))return fail(shot,'canonical alias was reassigned or an independent entity has multiple owners');
      localParts.add(binding.partId);result.local.push(binding);
    }
  }
  if(seen.size!==expected.size)return fail(shot,'an original canonical grip binding is missing');
  return result;
}
