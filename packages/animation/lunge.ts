import type {PerformancePlan} from './schemas.js';

const c2=(t:number)=>{const p=Math.max(0,Math.min(1,t));return p*p*p*(10+p*(-15+6*p));};
/** A planted pose owned from shot entry, not a teleport from a default stance.
 * Spear and body share the same clocks. No accumulated simulation/IK state. */
export function sampleLunge(plan:PerformancePlan,timeMs:number){
  const clip=plan.lunge;if(!clip)return undefined;
  const spear=plan.spears?.find(s=>s.id===clip.spearId);
  if(!spear||spear.action!=='thrust'||spear.readyMs===undefined||spear.contactMs===undefined||spear.recoverMs===undefined)throw new Error('needs-lunge-pose: stance requires its owned thrust clock');
  const advance=c2((timeMs-spear.readyMs!)/(spear.contactMs!-spear.readyMs!));
  const recover=1-c2((timeMs-spear.recoverMs!)/(spear.endMs-spear.recoverMs!));
  const weight=advance*recover;
  return {weight,advanceX:clip.advanceX*plan.scale*weight,dropY:clip.dropY*plan.scale*weight,
    leanDeg:clip.entryLeanDeg+(clip.contactLeanDeg-clip.entryLeanDeg)*weight,soles:clip.soles,kneePoles:clip.kneePoles};
}
export const lungeDescription={version:'forest-planted-lunge-1',productionReady:false,
  method:'fixed entry-owned world soles, original bones, minimum pelvis reach drop plus authored transfer, C2 quintic advance/recovery on the spear clock; same shared evaluator as scenes',
  pending:['stance preparation in story shots','rigid authored-view garment acceptance','head/arm/hair clearance','continuous motion acceptance']};
