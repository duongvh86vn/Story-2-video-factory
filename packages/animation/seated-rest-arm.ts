import type {Point} from './schemas.js';
import {articulatedPoseFromDirections} from './arm-trajectory.js';

export interface SeatedRestChain {
  joint:Point;end:Point;upper:number;lower:number;reachable:boolean;error:number;
}
type Solver=(start:Point,target:Point,upper:number,lower:number,pole:number)=>SeatedRestChain;
const wrap=(angle:number)=>Math.atan2(Math.sin(angle*Math.PI/180),Math.cos(angle*Math.PI/180))*180/Math.PI;
const fail=(reason:string):never=>{throw new Error('needs-seated-arm-pose: '+reason);};

/** The seat clock already supplies its eased weight. Interpolate joint angles,
 * not wrist positions: a line between reachable grips can cross the shoulder's
 * unreachable inner annulus. Keep the actor's own elbow branch and bone sizes.
 * Chain directions use the compiler's SVG convention: actual direction - 90deg. */
export function seatedRestArm(shoulder:Point,standingGrip:Point,lapGrip:Point,upper:number,lowerToGrip:number,
  weight:number,pole:number,solve:Solver):SeatedRestChain {
  if(![shoulder.x,shoulder.y,standingGrip.x,standingGrip.y,upper,lowerToGrip,weight].every(Number.isFinite)||
    upper<=1e-6||lowerToGrip<=1e-6||upper>1e6||lowerToGrip>1e6||weight<0||weight>1||(pole!==-1&&pole!==1))
    fail('invalid fixed chain, seat weight or authored elbow branch');
  const standing=solve(shoulder,standingGrip,upper,lowerToGrip,pole);
  // An inactive seat must not inspect its lap target or change standing output.
  if(weight===0)return standing;
  if(![lapGrip.x,lapGrip.y].every(Number.isFinite))fail('invalid lap keypose');
  const lap=solve(shoulder,lapGrip,upper,lowerToGrip,pole);
  for(const [chain,target] of [[standing,standingGrip],[lap,lapGrip]] as const){
    if(!chain.reachable||![chain.joint.x,chain.joint.y,chain.end.x,chain.end.y,chain.upper,chain.lower,chain.error].every(Number.isFinite)||
      chain.error<0||chain.error>.001||Math.hypot(chain.end.x-target.x,chain.end.y-target.y)>.001||
      Math.abs(Math.hypot(chain.joint.x-shoulder.x,chain.joint.y-shoulder.y)-upper)>.001||
      Math.abs(Math.hypot(chain.end.x-chain.joint.x,chain.end.y-chain.joint.y)-lowerToGrip)>.001)
      fail('own standing/lap keypose cannot be reached with fixed bones');
  }
  const rest=articulatedPoseFromDirections(standing.upper+90,standing.lower+90);
  const seated=articulatedPoseFromDirections(lap.upper+90,lap.lower+90);
  const arc=wrap(seated.shoulderDeg-rest.shoulderDeg);
  if(Math.abs(arc)>90+1e-8)fail('standing/lap shoulder arc exceeds its 90deg corridor');
  if(rest.elbowDeg*pole< -1e-8||seated.elbowDeg*pole< -1e-8)fail('own keypose changes the authored elbow branch');
  // Keep the standing solver's actual angle branch. Returning a wrapped lap
  // angle at weight=1 would introduce a numeric 360deg jump into baked tracks.
  const upperDeg=standing.upper+arc*weight;
  const lowerDeg=standing.lower+(arc+seated.elbowDeg-rest.elbowDeg)*weight;
  if(weight===1)return {...lap,upper:upperDeg,lower:lowerDeg};
  const direction=(start:Point,length:number,degrees:number):Point=>({x:start.x+Math.cos(degrees*Math.PI/180)*length,y:start.y+Math.sin(degrees*Math.PI/180)*length});
  const joint=direction(shoulder,upper,upperDeg+90),end=direction(joint,lowerToGrip,lowerDeg+90);
  if(![joint.x,joint.y,end.x,end.y].every(Number.isFinite))fail('blended chain overflows');
  return {joint,end,upper:upperDeg,lower:lowerDeg,reachable:true,error:0};
}

export const seatedRestArmDescription={version:'forest-seated-rest-arm-1',
  scope:'current source-body standing/lap rest transition and matching original gesture-entry reference',
  method:'same own elbow pole, fixed upper/forearm/palm chain, signed angular blend with <=90deg shoulder arc',
  clock:'existing original support/body seat weight; no additional ease, local reset or simulation state',
  unchanged:'legacy compiler paths, inactive seat, authored gestures/contacts/spear, source raster pixels and narration',
  limitations:['Own endpoints and intermediates still need torso/garment/prop clearance and normal-speed visual QA.','No new body/head view or anatomical/production acceptance.'],
  approved:false,motionVerified:false,productionReady:false};
