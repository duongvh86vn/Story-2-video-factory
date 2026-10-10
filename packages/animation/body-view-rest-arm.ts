type Point={x:number;y:number};
export type AuthoredRestDirections={upper:number;lower:number};
/** Screen-space drawing cues (0=right,90=down), not measured yaw/anatomy.
 * Rebuild the grip with canonical physical lengths, rather than copying an
 * old view's neutral hand offset or silently shortening an unreachable arm.
 * The pole follows the authored elbow, independent of current gesture target. */
export function authoredRestArm(upper:number,lowerToGrip:number,directions:AuthoredRestDirections):{grip:Point;pole:-1|1}{
  if(!Number.isFinite(upper)||!Number.isFinite(lowerToGrip)||upper<=0||lowerToGrip<=0||!Number.isFinite(directions.upper)||!Number.isFinite(directions.lower))throw new Error('needs-rest-arm-registration: finite angles and positive canonical chain lengths required');
  const u=directions.upper*Math.PI/180,l=directions.lower*Math.PI/180,cross=Math.sin(l-u);
  if(Math.abs(cross)<1e-6)throw new Error('needs-rest-arm-registration: collinear authoring cues cannot establish a stable elbow side');
  return {grip:{x:upper*Math.cos(u)+lowerToGrip*Math.cos(l),y:upper*Math.sin(u)+lowerToGrip*Math.sin(l)},pole:cross>0?1:-1};
}
