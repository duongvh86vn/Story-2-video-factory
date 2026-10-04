import {z} from 'zod';
import {isDeepStrictEqual} from 'node:util';
import type {Shot} from '../core/schemas.js';
import {Id} from '../core/identifiers.js';
import {PerformancePlanSchema, type PerformancePlan, type Gesture} from '../animation/schemas.js';
import {HostActionSchema, TargetSchema, type ShotHost} from '../host/schemas.js';
import {ArtDirectionSchema} from './art-direction-schemas.js';

type Action=ShotHost['actions'][number];

// Keep the concrete input object visible to provider JSON-schema conversion.
// Strict input rejects extra keys before the canonical action refinement.
const RepairActionSchema=HostActionSchema.innerType().extend({
  target:TargetSchema.strict().optional(),secondTarget:TargetSchema.strict().optional(),
}).strict().pipe(HostActionSchema);
const MotionRepairSchema=z.object({performance:PerformancePlanSchema,actions:z.array(RepairActionSchema)}).strict();
export const ActingRepairSchema=z.object({
  artDirection:ArtDirectionSchema,
  primary:MotionRepairSchema.optional(),
  supporting:z.array(MotionRepairSchema.extend({id:Id}).strict()).optional(),
}).strict().superRefine((repair,ctx)=>{
  const ids=new Set<string>();
  for(const actor of repair.supporting??[]){
    if(ids.has(actor.id))ctx.addIssue({code:'custom',path:['supporting'],message:`Duplicate supporting actor: ${actor.id}`});
    ids.add(actor.id);
  }
});
export type ActingRepair=z.infer<typeof ActingRepairSchema>;

/** Prompt capability information; every other performance field is immutable. */
export const fixedMotionFields=[
  'version','compilerVersion','id','leadCharacterId','profileHash','kind','durationMs','fps',
  'stage','root','scale','facing','walks','turns','entryPosture','props','supports',
] as const satisfies readonly (keyof PerformancePlan)[];

function editableGesture(gesture:Gesture):boolean {
  return gesture.action==='react'&&gesture.target===undefined&&gesture.destination===undefined&&
    gesture.propId===undefined&&gesture.contactMs===undefined&&gesture.releaseMs===undefined&&gesture.carryOffset===undefined;
}
function editableAction(action:Action):boolean {
  return (action.type==='idle'||action.type==='react')&&action.target===undefined&&
    action.secondTarget===undefined&&action.contactMs===undefined;
}

/** Preserve locked entries exactly, including multiplicity and relative order. */
function preserveEntries<T>(previous:readonly T[],next:readonly T[],locked:(entry:T)=>boolean,editable:(entry:T)=>boolean,label:string):void {
  const preserved=new Set<number>();
  let cursor=0;
  for(const entry of previous.filter(locked)){
    let found=-1;
    for(let index=cursor;index<next.length;index++)if(isDeepStrictEqual(entry,next[index])){found=index;break;}
    if(found<0)throw new Error(`Acting repair changed a protected ${label}`);
    preserved.add(found);cursor=found+1;
  }
  for(const [index,entry] of next.entries())if(!preserved.has(index)&&!editable(entry))
    throw new Error(`Acting repair introduced an unsupported ${label}`);
}

function ordered<T extends {startMs:number;endMs:number}>(tracks:readonly T[]):T[] {
  return [...tracks].sort((a,b)=>a.startMs-b.startMs||a.endMs-b.endMs);
}
function motionState(plan:PerformancePlan){
  return {
    expressions:ordered(plan.expressions),gazes:ordered(plan.gazes),postures:ordered(plan.postures??[]),
    // Renaming a gesture or making the implicit right hand explicit does not
    // count as a motion repair. Protected gesture content is checked separately.
    gestures:ordered(plan.gestures.filter(editableGesture).map(({id:_,hand,...gesture})=>({...gesture,hand:hand??'right'}))),
  };
}

function applyMotion(previous:PerformancePlan,actions:Action[],repair:z.infer<typeof MotionRepairSchema>):{performance:PerformancePlan;actions:Action[];changed:boolean} {
  const baseline=PerformancePlanSchema.parse(previous),next=repair.performance;
  for(const field of fixedMotionFields)if(!isDeepStrictEqual(baseline[field],next[field]))
    throw new Error(`Acting repair changed fixed performance field: ${field}`);
  preserveEntries(baseline.gestures,next.gestures,g=>!editableGesture(g),editableGesture,'gesture');
  // Every original non-idle action remains exact, including existing react
  // actions. Only unbound idle intervals may be replaced by idle/react actions.
  preserveEntries(actions,repair.actions,a=>a.type!=='idle'||!editableAction(a),editableAction,'host action');
  return {
    performance:{...previous,expressions:next.expressions,gazes:next.gazes,postures:next.postures,gestures:next.gestures},
    actions:repair.actions,changed:!isDeepStrictEqual(motionState(baseline),motionState(next)),
  };
}

/**
 * Construct a bounded actor-motion candidate; never mutate the accepted shot.
 * The caller MUST validate the full storyboard, canonical hand/clock/contact
 * ownership, artwork/security and actual runtime before publishing this clone.
 * This helper neither normalizes provenance nor commits or renders anything.
 */
export function applyActingRepair(shot:Shot,payload:unknown):Shot {
  const repair=ActingRepairSchema.parse(payload),original=shot.cinematic;
  if(!original?.artDirection||!original.actorScene)throw new Error('Acting repair requires an existing actor scene and art direction');
  if(repair.artDirection.useEnvironment!==original.artDirection.useEnvironment)
    throw new Error('Acting repair changed its environment asset source');
  const candidate=structuredClone(shot),cinematic=candidate.cinematic!,cast=cinematic.actorScene!;
  let changed=false;
  if(repair.primary){
    if(!cast.primary||!candidate.host||candidate.host.presence==='absent')
      throw new Error('Acting repair cannot introduce or replace an absent/null primary actor');
    const motion=applyMotion(cinematic.performance,candidate.host.actions,repair.primary);
    cinematic.performance=motion.performance;candidate.host.actions=motion.actions;changed||=motion.changed;
  }
  for(const repairActor of repair.supporting??[]){
    const actor=cast.supporting.find(actor=>actor.character.id===repairActor.id);
    if(!actor)throw new Error(`Acting repair names an unknown supporting actor: ${repairActor.id}`);
    const motion=applyMotion(actor.performance,actor.actions,repairActor);
    actor.performance=motion.performance;actor.actions=motion.actions;changed||=motion.changed;
  }
  if(!changed)throw new Error('Acting repair requires an actual typed actor motion change, not artwork-only or action-only edits');
  cinematic.artDirection=repair.artDirection;
  return candidate;
}
