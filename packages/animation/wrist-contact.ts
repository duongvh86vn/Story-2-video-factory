import type {Point} from './schemas.js';
import type {Chain} from './compiler.js';

/** Authored terminal wrist hinge. The registered palm remains the contact;
 * upper arm, forearm and wrist-to-palm lengths are all unchanged. */
export function solveWristContact(shoulder:Point,palm:Point,upper:number,forearm:number,hand:number,curlDeg:number,pole:number,solve:(s:Point,t:Point,u:number,l:number,p:number)=>Chain):Chain{
 if(![upper,forearm,hand,curlDeg,pole].every(Number.isFinite)||Math.min(upper,forearm,hand)<=0||curlDeg<0||curlDeg>70||Math.abs(pole)!==1)throw new Error('needs-wrist-pose: invalid authored wrist hinge');
 const curl=pole*curlDeg*Math.PI/180,x=forearm+hand*Math.cos(curl),y=hand*Math.sin(curl),effective=Math.hypot(x,y),offset=Math.atan2(y,x);
 const chain=solve(shoulder,palm,upper,effective,pole),lower=chain.lower-offset*180/Math.PI;
 const angle=(lower+90)*Math.PI/180,wrist={x:chain.joint.x+forearm*Math.cos(angle),y:chain.joint.y+forearm*Math.sin(angle)};
 return {...chain,lower,wrist,wristCurlDeg:pole*curlDeg};
}

export function wristPalm(wrist:Point,forearmDirectionDeg:number,hand:number,curlDeg:number):Point{
 const angle=(forearmDirectionDeg+curlDeg)*Math.PI/180;return {x:wrist.x+hand*Math.cos(angle),y:wrist.y+hand*Math.sin(angle)};
}

export const wristContactDescription={version:'source-chin-wrist-1',productionReady:false,
 field:'Optional gesture.wristCurlDeg, 0–70 degrees, only an explicitly authored current source-body think gesture with registered hand attachment.',
 geometry:'Three fixed segments: upper arm, forearm to measured source cuff, then wrist-to-palm. Curl follows the fixed entry-owned elbow pole. Actual palm touches the same registered chin; no contact offset, bone shortening or elbow-limit relaxation.',
 timing:'C2 shoulder/elbow/wrist angles in the same original gesture window; zero wrist curl at entry/exit. No inferred selection on old source commands.',
 otherActions:'Spear, manipulation, run, point and unspecified wrist retain their existing rigid palm contract.',
 pending:'Source artwork, whole motion and final acceptance still required.'};
