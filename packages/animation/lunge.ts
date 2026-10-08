import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import type {PerformancePlan} from './schemas.js';

export const PhysicalLungeClockSchema=z.object({spearId:Id,readyMs:z.number().int().nonnegative(),contactMs:z.number().int().positive(),recoverMs:z.number().int().positive(),endMs:z.number().int().positive()}).strict().superRefine((c,ctx)=>{
  if(!(c.readyMs<c.contactMs&&c.contactMs<=c.recoverMs&&c.recoverMs<c.endMs))ctx.addIssue({code:'custom',message:'Invalid original physical lunge clock'});
});
export type PhysicalLungeClock=z.infer<typeof PhysicalLungeClockSchema>;

const c2=(t:number)=>{const p=Math.max(0,Math.min(1,t));return p*p*p*(10+p*(-15+6*p));};
/** A planted pose owned from shot entry, not a teleport from a default stance.
 * Spear and body share the same clocks. No accumulated simulation/IK state. */
export function sampleLunge(plan:PerformancePlan,timeMs:number){
  const clip=plan.lunge;if(!clip)return undefined;
  const spear=plan.spears?.find(s=>s.id===clip.spearId);
  if(!spear||spear.action!=='thrust'||spear.readyMs===undefined||spear.contactMs===undefined||spear.recoverMs===undefined)throw new Error('needs-lunge-pose: stance requires its owned thrust clock');
  return samplePhysicalLunge(clip,plan.scale,timeMs,{spearId:spear.id,readyMs:spear.readyMs,contactMs:spear.contactMs,recoverMs:spear.recoverMs,endMs:spear.endMs});
}
/** Body-only evaluation of the original owned thrust clock. No arm/tool IK. */
export function samplePhysicalLunge(clip:NonNullable<PerformancePlan['lunge']>,scale:number,timeMs:number,clock:PhysicalLungeClock){
  if(clip.spearId!==clock.spearId)throw new Error('needs-lunge-pose: physical clock belongs to another thrust');
  const advance=c2((timeMs-clock.readyMs)/(clock.contactMs-clock.readyMs));
  const recover=1-c2((timeMs-clock.recoverMs)/(clock.endMs-clock.recoverMs));
  const weight=advance*recover;
  return {weight,advanceX:clip.advanceX*scale*weight,dropY:clip.dropY*scale*weight,
    leanDeg:clip.entryLeanDeg+(clip.contactLeanDeg-clip.entryLeanDeg)*weight,soles:clip.soles,kneePoles:clip.kneePoles};
}
export const lungeDescription={version:'forest-planted-lunge-1',productionReady:false,
  method:'fixed entry-owned world soles, original bones, minimum pelvis reach drop plus authored transfer, C2 quintic advance/recovery on the spear clock; same shared evaluator as scenes',
  pending:['stance preparation in story shots','rigid authored-view garment acceptance','head/arm/hair clearance','continuous motion acceptance']};
