import type {Shot} from '../core/schemas.js';
import type {CinematicPlan} from './schemas.js';
import {performanceProps} from '../animation/view-source-manipulation.js';

/** Ownership is a story-person ID, independent of lead role, model or rig identity.
 * Omission retains the original primary/presenter contract; never infer a
 * supporting owner from a prop name or whichever gesture happens to match. */
export function propPerformer(shot:Shot,binding:CinematicPlan['propBindings'][number]){
  const c=shot.cinematic;if(!c)throw new Error(`${shot.id}: bound prop requires cinematic data`);
  const id=binding.ownerId??c.actorScene?.primary?.id??c.leadCharacterId;
  if(c.actorScene&&[...(c.actorScene.primary?[c.actorScene.primary.id]:[]),...c.actorScene.supporting.map(a=>a.character.id)].filter(actorId=>actorId===id).length!==1)throw new Error(`${shot.id}: prop ${binding.propId} owner ${id} is not one visible story actor`);
  if(c.actorScene?.primary?.id===id||!c.actorScene&&binding.ownerId===undefined){
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
