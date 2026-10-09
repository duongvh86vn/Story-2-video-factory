import type { Shot } from '../core/schemas.js';
import { rigHand } from '../core/identifiers.js';
import { hash } from '../core/utils.js';
import { fold } from '../explainer/plan.js';
import type {CinematicPlan} from './schemas.js';

/** Bound-model motion/center/support semantics are visual-only cache inputs. */
export const PROP_BINDING_VERSION='bound-model-motion-2.2.3';
export const ACTOR_PROP_OWNERSHIP_DESCRIPTION={version:'actor-prop-ownership-1',bindingVersion:PROP_BINDING_VERSION,
  field:'cinematic.propBindings[].ownerId',identity:'actual visible story-person ID, not rig/model identity',
  selection:'explicit supporting owner; omission retains primary/presenter only',
  motion:'one completed in-shot pickup/carry/drop per sourced entity and one hand owner; different people can manipulate different entities concurrently',
  history:'actual own compiled shot clock/scale for glyph, label, foreground, relation, effects, camera envelope, exit and report',
  pending:['real geometry/render/runtime/film acceptance','cross-person handoff, shared ownership and cross-cut carried source clock','native authored-view tool/contact poses and full art/motion acceptance'],
  runtimeVerified:false,productionAcceptance:false};

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
  const owner=propPerformer(shot,binding),prop=owner.performance.props.find(p=>p.id===binding.propId);
  if(!prop)throw new Error(`${shot.id}: prop ${binding.propId} is missing from its explicit owner ${owner.id}`);
  return {...owner,prop,svgId:`${owner.prefix}prop-${binding.propId}`};
}

// JSON coordinates and normalized-to-stage multiplication may differ by a few
// floating-point units. This is a serialization check, not a spatial tolerance.
function sameSerializedCoordinate(actual:number,expected:number):boolean {
  return Math.abs(actual-expected)<=Number.EPSILON*4*Math.max(1,Math.abs(actual),Math.abs(expected));
}

/** Legacy presenter pickup follows a literal narration instruction. Story acting uses sourced model bindings. */
export function pickupPart(shot:Shot){
  const v=shot.visualization;if(!v||v.parts.length!==1||v.relations.length)return;
  const part=v.parts[0]!;if(!['battery','wheel','gear'].includes(part.kind))return;
  const label=fold(part.label);
  const ref=part.sourceRefs.find(ref=>{const text=fold(ref.quote);return new RegExp(`\\b(?:ta|chung ta|nguoi dan)\\s+nhac\\s+${label}\\b[^.!?;]*\\bdat\\s+${label}\\b[^.!?;]*\\bsang ben phai\\b`).test(text);});
  return ref?{part,ref}:undefined;
}
export function modelExitParts(shot:Shot):NonNullable<Shot['visualization']>['parts']{
  return (shot.visualization?.parts??[]).map(part=>{
    const binding=shot.cinematic?.propBindings.find(b=>b.partId===part.id),owned=binding&&boundProp(shot,binding),prop=owned?.prop,p=owned?.performance;
    return prop?.destination&&p?{...part,x:prop.destination.x/p.stage.width,y:prop.destination.y/p.stage.height}:part;
  });
}
export function validatePropBindings(shot:Shot):void{
  const c=shot.cinematic;if(!c)return;
  const performances=[c.performance,...(c.actorScene?.supporting.map(a=>a.performance)??[])];
  if(performances.some(p=>p.sourceManipulation))throw new Error(`${shot.id}: needs-source-prop-binding: original contact clock requires sourced model/action/camera continuity binding; an unbound prop cannot enter production`);
  const declared=performances.flatMap(p=>p.props.map(prop=>prop.id));
  if(new Set(declared).size!==declared.length)throw new Error(`${shot.id}: prop IDs must be unique across the entire visible cast`);
  if(c.propBindings.length!==declared.length)throw new Error(`${shot.id}: every animated prop requires a sourced model binding`);
  const svgIds=c.propBindings.map(binding=>boundProp(shot,binding).svgId);
  if(new Set(svgIds).size!==svgIds.length)throw new Error(`${shot.id}: bound prop namespaces collide; use unambiguous actor/prop IDs`);
  const pickup=pickupPart(shot),ids=new Set<string>(),parts=new Set<string>();
  for(const binding of c.propBindings){
    const owned=boundProp(shot,binding),{prop,performance:p}=owned,part=shot.visualization!.parts.find(p=>p.id===binding.partId);
    if(!prop||!part||ids.has(binding.propId))throw new Error(`${shot.id}: prop binding lacks its sourced model pickup`);
    if(hash(p.stage)!==hash(c.performance.stage)||p.durationMs!==shot.endMs-shot.startMs||p.leadCharacterId!==owned.id)throw new Error(`${shot.id}: prop owner has a different scene stage, clock or person identity`);
    if(parts.has(binding.partId))throw new Error(`${shot.id}: model entity ${binding.partId} cannot bind to multiple props`);
    if(owned.character){
      if(!binding.sourceRefs.length||binding.sourceRefs.some(ref=>!part.sourceRefs.some(source=>hash(source)===hash(ref))))throw new Error(`${shot.id}: illustrative actor pickup must retain the manipulated model's source evidence`);
      if(!c.artDirection||!['authored','model'].includes(c.artDirection.origin))throw new Error(`${shot.id}: illustrative pickup needs an authored/model story direction`);
    }else if(!pickup||pickup.part.id!==part.id||hash(binding.sourceRefs)!==hash([pickup.ref]))throw new Error(`${shot.id}: prop binding lacks its narrated model pickup`);
    ids.add(binding.propId);
    parts.add(binding.partId);
    const sourcedEntryDrop=prop.attachedTo&&owned.character&&c.actorScene?.continuity==='cut'&&p.gestures.some(g=>g.propId===prop.id&&g.action==='drop'&&g.startMs===0&&g.contactMs===0)&&c.sceneIntent?.acting?.some(a=>a.participantId===owned.id&&a.kind==='manipulation'&&a.operation==='drop'&&a.targetIds?.includes(part.id));
    if(prop.attachedTo&&!sourcedEntryDrop||c.continuity.carriedProps.length)throw new Error(`${shot.id}: cross-cut carried prop requires a continuity plan; use a completed placement`);
    const placements=p.gestures.filter(g=>g.propId===prop.id);
    if(placements.length!==1)throw new Error(`${shot.id}: bound model ${part.id} requires one completed placement; sequential pickup/handoff is not supported`);
    const gesture=placements[0];
    const otherContact=[...(shot.host?.actions??[]),...(c.actorScene?.supporting.flatMap(a=>a.actions)??[])].filter(a=>a.type==='operate-model'&&a.target?.partId===part.id);
    if(otherContact.length!==1)throw new Error(`${shot.id}: moving model ${part.id} requires one hand owner; joint manipulation is not supported`);
    if(!gesture||!['pick-place','carry','drop'].includes(gesture.action)||!gesture.destination||gesture.releaseMs===undefined||!prop.destination||!sameSerializedCoordinate(prop.origin.x,part.x*p.stage.width)||!sameSerializedCoordinate(prop.origin.y,part.y*p.stage.height))throw new Error(`${shot.id}: prop target/destination changed its world anchor; ${JSON.stringify({modelId:part.id,propId:prop.id,gestureAction:gesture?.action,hasGestureDestination:!!gesture?.destination,hasRelease:gesture?.releaseMs!==undefined,hasPropDestination:!!prop.destination,origin:prop.origin,expectedWorldCenter:{x:part.x*p.stage.width,y:part.y*p.stage.height},originDelta:{x:prop.origin.x-part.x*p.stage.width,y:prop.origin.y-part.y*p.stage.height}})}`);
    const owner=owned.actions.find(a=>a.type==='operate-model'&&a.target?.partId===part.id&&rigHand(a)===rigHand(gesture)&&a.startMs===shot.startMs+gesture.startMs&&a.endMs===shot.startMs+gesture.endMs&&a.contactMs===shot.startMs+gesture.contactMs!);
    if(!owner)throw new Error(`${shot.id}: moving model ${part.id} lacks its explicit person's matching hand/action owner`);
    const staleTarget=[...(shot.host?.actions??[]),...(c.actorScene?.supporting.flatMap(a=>a.actions)??[])].find(a=>a!==owner&&[a.target,a.secondTarget].some(target=>target?.partId===part.id)&&a.endMs>shot.startMs+gesture.contactMs!);
    if(staleTarget)throw new Error(`${shot.id}: fixed ${staleTarget.type} target cannot follow moving model ${part.id}; finish it before pickup or replan the scene`);
    if(['carry','drop'].includes(gesture.action)&&!owned.character)throw new Error(`${shot.id}: carry binding requires a story actor and a completed in-shot placement`);
    const offset=prop.gripOffset??{x:0,y:0},placed={x:gesture.destination.x-offset.x*p.scale,y:gesture.destination.y-offset.y*p.scale};
    if(Math.hypot(placed.x-prop.destination.x,placed.y-prop.destination.y)>1e-6)throw new Error(`${shot.id}: prop destination must be the placed object center, not its hand grip`);
    if(!c.actorScene&&(gesture.destination.x<=prop.origin.x||Math.abs(gesture.destination.y-prop.origin.y)>.01))throw new Error(`${shot.id}: placement must follow its narrated direction`);
    if(c.actorScene&&(prop.destination.x-part.width*p.stage.width*.5<0||prop.destination.x+part.width*p.stage.width*.5>p.stage.width||prop.destination.y-part.height*p.stage.height*.5<0||prop.destination.y+part.height*p.stage.height*.5>p.stage.groundY))throw new Error(`${shot.id}: illustrative placement bounds must stay in the physical stage`);
  }
}
