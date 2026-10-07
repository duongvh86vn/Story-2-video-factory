import type {Point} from './schemas.js';
export type SourceArmRole='rest'|'point'|'chin'|'walk'|'run'|'react'|'lap'|'spear-front'|'spear-rear';
const limits:Partial<Record<SourceArmRole,number>>={point:110,chin:145,run:120,'spear-front':125,'spear-rear':135};
/** Candidate art limits, not a claim of human biomechanics. A reachable wrist
 * can still produce a tightly folded hook. Never shorten bones or move a
 * locked contact to satisfy these limits; reject and re-author the pose. */
export function sourceArmShape(role:SourceArmRole,shoulder:Point,elbow:Point,wrist:Point,upper:number,lower:number,depth=0){
  const a=Math.hypot(elbow.x-shoulder.x,elbow.y-shoulder.y,depth),b=Math.hypot(wrist.x-elbow.x,wrist.y-elbow.y,depth);
  const d=Math.hypot(wrist.x-shoulder.x,wrist.y-shoulder.y);
  const interior=Math.acos(Math.max(-1,Math.min(1,(upper*upper+lower*lower-d*d)/(2*upper*lower))))*180/Math.PI;
  const flexionDeg=180-interior,upperRatio=Math.hypot(elbow.x-shoulder.x,elbow.y-shoulder.y)/upper,lowerRatio=Math.hypot(wrist.x-elbow.x,wrist.y-elbow.y)/lower;
  if(Math.abs(a-upper)>.02||Math.abs(b-lower)>.02)throw new Error('needs-arm-pose: physical source arm lengths changed');
  if(limits[role]!==undefined&&flexionDeg>limits[role]!+.01)throw new Error(`needs-arm-pose: ${role} elbow folds ${flexionDeg.toFixed(1)}deg, beyond its ${limits[role]}deg candidate art limit`);
  if(upperRatio<.7||lowerRatio<.7)throw new Error('needs-arm-pose: a drawn arm segment collapses without an authored depth view');
  return {role,flexionDeg,interiorDeg:interior,upperRatio,lowerRatio};
}
export const sourceArmDescription={version:'forest-arm-role-shape-1',limits,
  shapes:'fixed XYZ lengths; reject excessive role-specific flexion and projected segments below 0.7 of the original; smooth C1 ink is not anatomy acceptance',
  roles:'active clip and current posture only; future run/seat must not change idle arms',
  layer:'chin-contact ink and mitten share explicit foreground slots, each with one physical definition; inactive arms/hands keep normal layers',
  productionReady:false};
