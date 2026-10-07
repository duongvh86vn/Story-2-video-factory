import type {Point,PerformancePlan} from './schemas.js';
import type {RigHand} from '../core/identifiers.js';

export const SOURCE_WALK_VERSION='forest-walk-poses-2-depth-knee';
/** Poses are constraints on one continuous rig, not independently redrawn
 * frames. The stance foot stays in world space throughout the other foot's
 * load, passing and landing. Both first and second derivatives vanish when
 * the swing leaves/returns to the floor. */
export const SOURCE_WALK_POSES=[
  {id:'load',phase:0,label:'Chuyển lực · hai chân chạm đất'},
  {id:'toe-off',phase:.12,label:'Rời đất'},
  {id:'passing',phase:.47,label:'Đưa chân qua'},
  {id:'contact',phase:.82,label:'Đặt chân'},
  {id:'settle',phase:1,label:'Nhận lực · hai chân chạm đất'},
] as const;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const poseEase=(v:number)=>{const p=clamp(v);return p*p*p*(10+p*(-15+6*p));};

/** Lift follows the actual step distance, capped relative to the shorter
 * thigh. The old .25 * upperLeg lift made even a tiny step look like limping.
 * The sixth-degree arch has zero velocity AND acceleration at floor contact. */
export function sourceSwing(from:Point,landingX:number,groundY:number,phase:number,upperLeg:number,scale:number){
  const p=clamp((phase-.12)/.70),travel=Math.abs(landingX-from.x);
  if(travel<1e-8)return {point:{x:from.x,y:groundY},planted:true,lift:0,supportWeight:0};
  const lift=Math.min(upperLeg*.10*scale,travel*.18),arch=64*p*p*p*(1-p)*(1-p)*(1-p);
  const supportWeight=poseEase(phase/.12)*(1-poseEase((phase-.82)/.18));
  return {point:{x:from.x+(landingX-from.x)*poseEase(p),y:groundY-arch*lift},planted:p===0||p===1,lift,supportWeight};
}

/** These source torsos are still front artwork. Their knees open toward their
 * respective screen sides; using one positive pole for both made one standing
 * leg bow inward. A seated plan retains its support-facing branch for its
 * whole clock, including approach, rise and a subsequent walk. Switching a
 * bent branch on a cue boundary would snap the knee. */
export function sourceKneePole(plan:PerformancePlan,side:RigHand,supportBend:number):number {
  const seated=[...(plan.entryPosture?[plan.entryPosture]:[]),...(plan.postures??[])].some(p=>p.pose==='seated');
  return seated?supportBend:side==='left'?-1:1;
}

/** Orthographic front-leg projection. The hidden physical knee can flex
 * toward the viewer (Z) instead of showing its entire bend sideways. Bone
 * lengths stay constant in XYZ; only their drawn lengths shorten. In a held
 * seated view the plane weight is 1 and the original side-plane solver is
 * recovered. This is inferred leg geometry, not a reconstructed 3D actor. */
export function projectSourceKnee(start:Point,end:Point,planarJoint:Point,upper:number,lower:number,seatWeight:number){
  const dx=end.x-start.x,dy=end.y-start.y,d=Math.hypot(dx,dy);
  if(d<1e-8)throw new Error('Source knee projection requires distinct hip and ankle');
  const along=(upper*upper+d*d-lower*lower)/(2*d),center={x:start.x+dx/d*along,y:start.y+dy/d*along};
  const planar=.16+.84*clamp(seatWeight),offset={x:planarJoint.x-center.x,y:planarJoint.y-center.y};
  const joint={x:center.x+offset.x*planar,y:center.y+offset.y*planar},depth=Math.hypot(offset.x,offset.y)*Math.sqrt(Math.max(0,1-planar*planar));
  const upperRatio=Math.hypot(joint.x-start.x,joint.y-start.y)/upper,lowerRatio=Math.hypot(end.x-joint.x,end.y-joint.y)/lower;
  return {joint,depth,upperRatio,lowerRatio,
    upper:Math.atan2(joint.y-start.y,joint.x-start.x)*180/Math.PI-90,
    lower:Math.atan2(end.y-joint.y,end.x-joint.x)*180/Math.PI-90};
}

export const sourceWalkDescription={version:SOURCE_WALK_VERSION,poses:SOURCE_WALK_POSES,
  lift:'min(actual foot travel * 0.18, upperLeg * scale * 0.10)',
  interpolation:'quintic horizontal; sixth-degree arch with zero velocity and acceleration at contact',
  kneePoles:'front artwork: left -1, right +1; seat plans retain their support branch',
  kneeProjection:'orthographic inferred XYZ chain; front planar weight 0.16, smoothly reaches 1 on the seated support; physical XYZ bone lengths unchanged',
  armSwing:'distance/elapsed-speed dependent, maximum 16 degrees',
  support:'fixed sole in world coordinates, minimum reach drop; at least one planted foot',
  weightTransfer:'pelvis shifts toward the planted sole during load/swing, capped at 0.08 * thigh; candidate acting offset, not measured biomechanics',
  bodyViews:'front torso only; sideways travel does not establish an authored profile gait',
  productionAcceptance:false};
