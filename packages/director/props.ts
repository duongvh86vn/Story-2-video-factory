import type { Shot,Storyboard,Narration } from '../core/schemas.js';
import { rigHand } from '../core/identifiers.js';
import { hash } from '../core/utils.js';
import { fold } from '../explainer/plan.js';
import type {CinematicPlan} from './schemas.js';
import {boundProp} from './prop-owner.js';
import {performanceProps} from '../animation/view-source-manipulation.js';
import {sourceBoundPropFrame,validateSourcePropBindings} from './source-prop-binding.js';

/** Bound-model motion/center/support semantics are visual-only cache inputs. */
export const PROP_BINDING_VERSION='bound-model-motion-2.2.4';
export const ACTOR_PROP_OWNERSHIP_DESCRIPTION={version:'actor-prop-ownership-1',bindingVersion:PROP_BINDING_VERSION,
  field:'cinematic.propBindings[].ownerId',identity:'actual visible story-person ID, not rig/model identity',
  selection:'explicit supporting owner; omission retains legacy primary/presenter only; original source props require explicit person on every slice',
  motion:'one completed local attachment or candidate complete original actor/model attachment clock; different people can own different entities concurrently',
  history:'actual own shot clock/scale; original model entry/exit uses the complete source geometry through primary/supporting camera swaps',
  pending:['real geometry/render/runtime/film acceptance','source world/event/effect/interaction/coverage integration','cross-person handoff and shared/sequential ownership','native authored-view tool/contact poses and full art/motion acceptance'],
  runtimeVerified:false,productionAcceptance:false};

export {propPerformer,boundProp} from './prop-owner.js';

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
function modelPartsAt(shot:Shot,exit:boolean,board?:Storyboard):NonNullable<Shot['visualization']>['parts']{
  const owners=new Map<string,ReturnType<typeof sourceBoundPropFrame>['frame']>();
  return (shot.visualization?.parts??[]).map(part=>{
    const binding=shot.cinematic?.propBindings.find(b=>b.partId===part.id),owned=binding&&boundProp(shot,binding),prop=owned?.prop,p=owned?.performance;
    if(binding&&owned&&p?.sourceManipulation){
      let frame=owners.get(owned.id);if(!frame){frame=sourceBoundPropFrame(shot,binding,exit?p.durationMs:0,board).frame;owners.set(owned.id,frame);}
      const state=frame.props[binding.propId];if(!state)throw new Error(`${shot.id}: needs-source-prop-binding: actual model state missing`);
      return {...part,x:state.point.x/p.stage.width,y:state.point.y/p.stage.height};
    }
    return exit&&prop?.destination&&p?{...part,x:prop.destination.x/p.stage.width,y:prop.destination.y/p.stage.height}:part;
  });
}
export function modelExitParts(shot:Shot,board?:Storyboard){return modelPartsAt(shot,true,board);}
export function modelEntryParts(shot:Shot,board?:Storyboard){return modelPartsAt(shot,false,board);}
export function validatePropBindings(shot:Shot,board?:Storyboard,narration?:Narration):void{
  const c=shot.cinematic;if(!c)return;
  const performances=[c.performance,...(c.actorScene?.supporting.map(a=>a.performance)??[])];
  const sourceSelected=performances.some(p=>p.sourceManipulation);
  if(sourceSelected){
    if(!board||!narration)throw new Error(`${shot.id}: needs-source-prop-binding: original contact requires complete storyboard and original narration`);
    validateSourcePropBindings(shot,board,narration);
  }
  const declared=performances.flatMap(p=>performanceProps(p).map(prop=>prop.id));
  if(new Set(declared).size!==declared.length)throw new Error(`${shot.id}: prop IDs must be unique across the entire visible cast`);
  if(c.propBindings.length!==declared.length)throw new Error(`${shot.id}: every animated prop requires a sourced model binding`);
  const svgIds=c.propBindings.map(binding=>boundProp(shot,binding).svgId);
  if(new Set(svgIds).size!==svgIds.length)throw new Error(`${shot.id}: bound prop namespaces collide; use unambiguous actor/prop IDs`);
  if(sourceSelected)throw new Error(`${shot.id}: needs-source-prop-binding: original entity/action/evidence binding is checked; source event/effect/interaction/coverage world contract remains pending and cannot enter production`);
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
