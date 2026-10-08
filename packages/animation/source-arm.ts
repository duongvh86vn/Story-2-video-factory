import type {Point} from './schemas.js';
export type SourceArmRole='rest'|'point'|'chin'|'walk'|'run'|'react'|'lap'|'spear-front'|'spear-rear'|'manipulate';
const limits:Partial<Record<SourceArmRole,number>>={point:110,chin:145,run:120,manipulate:125,'spear-front':125,'spear-rear':135};
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
type ArmLandmarks={shoulder:Point;elbow:Point;wrist:Point;grip?:Point;upper:number;lower:number};
/** Two useful arm silhouettes are required as well as two reachable grips.
 * These source-style guards are candidate art constraints, not biomechanical
 * certification. A rear elbow may be raised; it must stay behind its own
 * shoulder along the shaft axis instead of curling beside the front hand. */
export function sourceSpearPairShape(front:ArmLandmarks,rear:ArmLandmarks,shaftAngle:number){
  const angle=shaftAngle*Math.PI/180,axis={x:Math.cos(angle),y:Math.sin(angle)};
  const along=(a:Point,b:Point)=>(a.x-b.x)*axis.x+(a.y-b.y)*axis.y;
  const frontLength=front.upper+front.lower,rearLength=rear.upper+rear.lower;
  const gripSpan=along(front.grip??front.wrist,rear.grip??rear.wrist),minimumSpan=.6*Math.min(frontLength,rearLength);
  const rearElbowAlong=along(rear.elbow,rear.shoulder),rearWristAlong=along(rear.wrist,rear.shoulder);
  if(gripSpan<minimumSpan-.01)throw new Error('needs-arm-pose: spear grips crowd both arm roles in front of the torso');
  if(rearElbowAlong>.01)throw new Error('needs-arm-pose: drive elbow curls forward instead of opening behind its own shoulder');
  if(rearWristAlong>rearLength*.3+.01)throw new Error('needs-arm-pose: both spear wrists are carried in front of the shoulders');
  return {gripSpan,minimumSpan,rearElbowAlong,rearWristAlong};
}
export const sourceArmDescription={version:'forest-arm-role-shape-4',limits,
  handEndpoints:'physical upper/lower chain ends at registered cuff; grip span uses distinct palm points; hand transform is rigid with the forearm tangent',
  shapes:'fixed XYZ lengths; reject excessive role-specific flexion and projected segments below 0.7 of the original; smooth C1 ink is not anatomy acceptance',
  roles:'active clip and current posture only; future run/seat must not change idle arms',
  layer:'chin-contact ink and mitten share explicit foreground slots, each with one physical definition; inactive arms/hands keep normal layers',
  spearPair:'at least 60% of the shorter source chain between grips; rear elbow behind its shoulder on the shaft axis and rear wrist no more than 30% of its chain forward; fixed role poles for an entry-owned track; no universal elbow-below-shoulder rule',
  productionReady:false};
