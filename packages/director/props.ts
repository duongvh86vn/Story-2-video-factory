import type { Shot } from '../core/schemas.js';
import type { PerformancePlan } from '../animation/schemas.js';
import { hash } from '../core/utils.js';
import { fold } from '../explainer/plan.js';

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
  const pickup=pickupPart(shot),ids=new Set<string>();
  for(const binding of c.propBindings){
    const prop=c.performance.props.find(p=>p.id===binding.propId),part=shot.visualization!.parts.find(p=>p.id===binding.partId);
    if(!prop||!part||ids.has(binding.propId))throw new Error(`${shot.id}: prop binding lacks its sourced model pickup`);
    if(c.actorScene?.primary){
      if(!binding.sourceRefs.length||binding.sourceRefs.some(ref=>!part.sourceRefs.some(source=>hash(source)===hash(ref))))throw new Error(`${shot.id}: illustrative actor pickup must retain the manipulated model's source evidence`);
      if(!c.artDirection||!['authored','model'].includes(c.artDirection.origin))throw new Error(`${shot.id}: illustrative pickup needs an authored/model story direction`);
    }else if(!pickup||pickup.part.id!==part.id||hash(binding.sourceRefs)!==hash([pickup.ref]))throw new Error(`${shot.id}: prop binding lacks its narrated model pickup`);
    ids.add(binding.propId);
    if(prop.attachedTo||c.continuity.carriedProps.length)throw new Error(`${shot.id}: cross-cut carried prop requires a continuity plan; use a completed placement`);
    const gesture=c.performance.gestures.find(g=>g.propId===prop.id);
    if(!gesture||gesture.action!=='pick-place'||!gesture.destination||!prop.destination||hash(gesture.destination)!==hash(prop.destination)||prop.origin.x!==part.x*c.performance.stage.width||prop.origin.y!==part.y*c.performance.stage.height)throw new Error(`${shot.id}: prop target/destination changed its world anchor`);
    if(!c.actorScene&&(gesture.destination.x<=prop.origin.x||Math.abs(gesture.destination.y-prop.origin.y)>.01))throw new Error(`${shot.id}: placement must follow its narrated direction`);
    if(c.actorScene&&(gesture.destination.x<0||gesture.destination.x>c.performance.stage.width||gesture.destination.y<0||gesture.destination.y>c.performance.stage.groundY))throw new Error(`${shot.id}: illustrative placement must stay in the physical stage`);
  }
}
