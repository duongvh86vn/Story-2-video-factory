import type { Shot } from '../core/schemas.js';
import { rigHand } from '../core/identifiers.js';
import { hash } from '../core/utils.js';
import { fold } from '../explainer/plan.js';

/** Bound-model motion/center/support semantics are visual-only cache inputs. */
export const PROP_BINDING_VERSION='bound-model-motion-2.2.1';

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
  const p=shot.cinematic?.performance;
  return (shot.visualization?.parts??[]).map(part=>{
    const binding=shot.cinematic?.propBindings.find(b=>b.partId===part.id),prop=binding&&p?.props.find(prop=>prop.id===binding.propId);
    return prop?.destination&&p?{...part,x:prop.destination.x/p.stage.width,y:prop.destination.y/p.stage.height}:part;
  });
}
export function validatePropBindings(shot:Shot):void{
  const c=shot.cinematic;if(!c)return;
  if(c.propBindings.length!==c.performance.props.length)throw new Error(`${shot.id}: every animated prop requires a sourced model binding`);
  const pickup=pickupPart(shot),ids=new Set<string>(),parts=new Set<string>();
  for(const binding of c.propBindings){
    const prop=c.performance.props.find(p=>p.id===binding.propId),part=shot.visualization!.parts.find(p=>p.id===binding.partId);
    if(!prop||!part||ids.has(binding.propId))throw new Error(`${shot.id}: prop binding lacks its sourced model pickup`);
    if(parts.has(binding.partId))throw new Error(`${shot.id}: model entity ${binding.partId} cannot bind to multiple props`);
    if(c.actorScene?.primary){
      if(!binding.sourceRefs.length||binding.sourceRefs.some(ref=>!part.sourceRefs.some(source=>hash(source)===hash(ref))))throw new Error(`${shot.id}: illustrative actor pickup must retain the manipulated model's source evidence`);
      if(!c.artDirection||!['authored','model'].includes(c.artDirection.origin))throw new Error(`${shot.id}: illustrative pickup needs an authored/model story direction`);
    }else if(!pickup||pickup.part.id!==part.id||hash(binding.sourceRefs)!==hash([pickup.ref]))throw new Error(`${shot.id}: prop binding lacks its narrated model pickup`);
    ids.add(binding.propId);
    parts.add(binding.partId);
    const sourcedEntryDrop=prop.attachedTo&&c.actorScene?.primary&&c.actorScene.continuity==='cut'&&c.performance.gestures.some(g=>g.propId===prop.id&&g.action==='drop'&&g.startMs===0&&g.contactMs===0)&&c.sceneIntent?.acting?.some(a=>a.participantId===c.actorScene!.primary!.id&&a.kind==='manipulation'&&a.operation==='drop'&&a.targetIds?.includes(part.id));
    if(prop.attachedTo&&!sourcedEntryDrop||c.continuity.carriedProps.length)throw new Error(`${shot.id}: cross-cut carried prop requires a continuity plan; use a completed placement`);
    const placements=c.performance.gestures.filter(g=>g.propId===prop.id);
    if(placements.length!==1)throw new Error(`${shot.id}: bound model ${part.id} requires one completed placement; sequential pickup/handoff is not supported`);
    const gesture=placements[0];
    const otherContact=[...(shot.host?.actions??[]),...(c.actorScene?.supporting.flatMap(a=>a.actions)??[])].filter(a=>a.type==='operate-model'&&a.target?.partId===part.id);
    if(otherContact.length!==1)throw new Error(`${shot.id}: moving model ${part.id} requires one hand owner; joint manipulation is not supported`);
    if(!gesture||!['pick-place','carry','drop'].includes(gesture.action)||!gesture.destination||gesture.releaseMs===undefined||!prop.destination||!sameSerializedCoordinate(prop.origin.x,part.x*c.performance.stage.width)||!sameSerializedCoordinate(prop.origin.y,part.y*c.performance.stage.height))throw new Error(`${shot.id}: prop target/destination changed its world anchor; ${JSON.stringify({modelId:part.id,propId:prop.id,gestureAction:gesture?.action,hasGestureDestination:!!gesture?.destination,hasRelease:gesture?.releaseMs!==undefined,hasPropDestination:!!prop.destination,origin:prop.origin,expectedWorldCenter:{x:part.x*c.performance.stage.width,y:part.y*c.performance.stage.height},originDelta:{x:prop.origin.x-part.x*c.performance.stage.width,y:prop.origin.y-part.y*c.performance.stage.height}})}`);
    const owner=shot.host?.actions.find(a=>a.type==='operate-model'&&a.target?.partId===part.id&&rigHand(a)===rigHand(gesture)&&a.startMs===shot.startMs+gesture.startMs&&a.endMs===shot.startMs+gesture.endMs&&a.contactMs===shot.startMs+gesture.contactMs!);
    if(!owner)throw new Error(`${shot.id}: moving model ${part.id} lacks its primary gesture's matching hand/action owner`);
    const staleTarget=[...(shot.host?.actions??[]),...(c.actorScene?.supporting.flatMap(a=>a.actions)??[])].find(a=>a!==owner&&[a.target,a.secondTarget].some(target=>target?.partId===part.id)&&a.endMs>shot.startMs+gesture.contactMs!);
    if(staleTarget)throw new Error(`${shot.id}: fixed ${staleTarget.type} target cannot follow moving model ${part.id}; finish it before pickup or replan the scene`);
    if(['carry','drop'].includes(gesture.action)&&!c.actorScene?.primary)throw new Error(`${shot.id}: carry binding requires a story actor and a completed in-shot placement`);
    const offset=prop.gripOffset??{x:0,y:0},placed={x:gesture.destination.x-offset.x*c.performance.scale,y:gesture.destination.y-offset.y*c.performance.scale};
    if(Math.hypot(placed.x-prop.destination.x,placed.y-prop.destination.y)>1e-6)throw new Error(`${shot.id}: prop destination must be the placed object center, not its hand grip`);
    if(!c.actorScene&&(gesture.destination.x<=prop.origin.x||Math.abs(gesture.destination.y-prop.origin.y)>.01))throw new Error(`${shot.id}: placement must follow its narrated direction`);
    if(c.actorScene&&(prop.destination.x-part.width*c.performance.stage.width*.5<0||prop.destination.x+part.width*c.performance.stage.width*.5>c.performance.stage.width||prop.destination.y-part.height*c.performance.stage.height*.5<0||prop.destination.y+part.height*c.performance.stage.height*.5>c.performance.stage.groundY))throw new Error(`${shot.id}: illustrative placement bounds must stay in the physical stage`);
  }
}
