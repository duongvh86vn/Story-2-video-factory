import type {Shot} from '../core/schemas.js';
import type {CinematicPlan} from './schemas.js';
import {performanceProps} from '../animation/view-source-manipulation.js';

/** Actor-local prop names are not identities across a visible cast. */
export const propAliasIdentity=(ownerId:string,propId:string)=>JSON.stringify([ownerId,propId]);

/** Ownership is a story-person ID, independent of lead role, model or rig identity.
 * Omission retains the original primary/presenter contract; never infer a
 * supporting owner from a prop name or whichever gesture happens to match. */
export function propPerformer(shot:Shot,binding:CinematicPlan['propBindings'][number]){
  const c=shot.cinematic;if(!c)throw new Error(`${shot.id}: bound prop requires cinematic data`);
  const id=binding.ownerId??c.actorScene?.primary?.id??c.leadCharacterId;
  if(c.actorScene&&[...(c.actorScene.primary?[c.actorScene.primary.id]:[]),...c.actorScene.supporting.map(a=>a.character.id)].filter(actorId=>actorId===id).length!==1)throw new Error(`${shot.id}: prop ${binding.propId} owner ${id} is not one visible story actor`);
  if(c.actorScene?.primary?.id===id||!c.actorScene&&id===c.leadCharacterId){
    return {id,performance:c.performance,actions:shot.host?.actions??[],prefix:'',character:c.actorScene?.primary??undefined};
  }
  if(binding.ownerId===undefined)throw new Error(`${shot.id}: bound prop has no primary owner; supporting ownership must be explicit`);
  const matches=c.actorScene?.supporting.filter(a=>a.character.id===id)??[];
  if(matches.length!==1)throw new Error(`${shot.id}: prop ${binding.propId} owner ${id} is not one visible story actor`);
  const actor=matches[0]!;
  return {id,performance:actor.performance,actions:actor.actions,prefix:`actor-${id}-`,character:actor.character};
}

export function boundProp(shot:Shot,binding:CinematicPlan['propBindings'][number]){
  const owner=propPerformer(shot,binding),prop=performanceProps(owner.performance).find(p=>p.id===binding.propId);
  if(!prop)throw new Error(`${shot.id}: prop ${binding.propId} is missing from its explicit owner ${owner.id}`);
  return {...owner,prop,svgId:`${owner.prefix}prop-${binding.propId}`};
}

/** Bind every actual person's prop once, without overwriting another person's
 * same local name. Generated SVG namespace collisions still reject. */
export function assertPropAliasCoverage(shot:Shot):void {
  const c=shot.cinematic;if(!c)return;
  const primary=c.actorScene?c.actorScene.primary?.id:c.leadCharacterId;
  const declaredPrimary=performanceProps(c.performance);
  if(!primary&&declaredPrimary.length)throw new Error(`${shot.id}: prop has no visible primary owner`);
  const declared=[...declaredPrimary.map(prop=>propAliasIdentity(primary!,prop.id)),
    ...(c.actorScene?.supporting.flatMap(actor=>performanceProps(actor.performance).map(prop=>propAliasIdentity(actor.character.id,prop.id)))??[])];
  if(new Set(declared).size!==declared.length)throw new Error(`${shot.id}: prop IDs must be unique within each actual actor`);
  const aliases=c.propBindings.map(binding=>{const owner=boundProp(shot,binding);return {identity:propAliasIdentity(owner.id,binding.propId),svgId:owner.svgId};});
  if(aliases.length!==declared.length||new Set(aliases.map(a=>a.identity)).size!==aliases.length||aliases.some(a=>!declared.includes(a.identity)))
    throw new Error(`${shot.id}: every animated actor/prop alias requires exactly one sourced model binding`);
  if(new Set(aliases.map(a=>a.svgId)).size!==aliases.length)throw new Error(`${shot.id}: bound prop namespaces collide; use unambiguous actor/prop IDs`);
}
