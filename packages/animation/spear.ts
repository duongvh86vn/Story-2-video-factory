import type {PerformancePlan,Point} from './schemas.js';
import {poseEase} from './source-walk.js';
export type SpearTrack=NonNullable<PerformancePlan['spears']>[number];
export type SpearProp=PerformancePlan['props'][number];
const rotate=(p:Point,a:number)=>{const r=a*Math.PI/180;return {x:p.x*Math.cos(r)-p.y*Math.sin(r),y:p.x*Math.sin(r)+p.y*Math.cos(r)};};
/** Grip is in primary-shoulder rig units. Both hands and the prop are solved
 * from one shaft frame, never independently tweened toward three anchors. */
export function sampleSpear(track:SpearTrack,prop:SpearProp,time:number,scale:number,shoulder:Point,lean:number){
  const local=rotate({x:track.grip.x*scale,y:track.grip.y*scale},lean),held={x:shoulder.x+local.x,y:shoulder.y+local.y};
  const dx=track.aim.x-held.x,dy=track.aim.y-held.y,distance=Math.hypot(dx,dy);
  if(distance<1e-6)throw new Error(track.id+': spear aim cannot coincide with grip');
  const direction={x:dx/distance,y:dy/distance},angle=Math.atan2(dy,dx)*180/Math.PI;
  const offset=prop.gripOffset?.x??0,tipDistance=((prop.length??120)/2-offset)*scale;
  let travel=0,phase:'hold'|'windup'|'extend'|'contact'|'recover'='hold';
  if(track.action==='thrust'){
    const ready=track.readyMs!,contact=track.contactMs!,recover=track.recoverMs!,windup=8*scale;
    const extension=distance-tipDistance;
    if(time<ready){travel=-windup*poseEase((time-track.startMs)/(ready-track.startMs));phase='windup';}
    else if(time<contact){travel=-windup+(extension+windup)*poseEase((time-ready)/(contact-ready));phase='extend';}
    else if(time<recover){travel=extension;phase='contact';}
    else {travel=extension*(1-poseEase((time-recover)/(track.endMs-recover)));phase='recover';}
  }
  const primary={x:held.x+direction.x*travel,y:held.y+direction.y*travel};
  const secondary={x:primary.x+direction.x*track.secondaryOffset*scale,y:primary.y+direction.y*track.secondaryOffset*scale};
  const center={x:primary.x-direction.x*offset*scale,y:primary.y-direction.y*offset*scale};
  const tip={x:center.x+direction.x*(prop.length??120)*scale/2,y:center.y+direction.y*(prop.length??120)*scale/2};
  return {primary,secondary,center,tip,angle,phase,extension:distance-tipDistance};
}
/** Code-native tool artwork: wood shaft, tied stone point and warm source ink. */
export function spearSvg(prop:SpearProp):string {
  const half=(prop.length??120)/2;
  return `<g id="prop-${prop.id}" stroke="#29170F" stroke-linecap="round" stroke-linejoin="round"><path d="M${-half} 0H${half-15}" stroke-width="5"/><path d="M${-half+2} -1H${half-15}" stroke="#A76632" stroke-width="2.5"/><path d="M${half-18} -6L${half} 0L${half-18} 6L${half-14} 0Z" fill="#8A8880" stroke-width="1.8"/><path d="M${half-22} -3l2 6m2 -6l2 6m2 -6l2 6" stroke="#D7B777" stroke-width="1.7"/></g>`;
}
export const spearDescription={version:'forest-spear-grips-1',grip:'primary shoulder-local rig units; second hand owns a point on the same shaft',
  ownership:'one entry-owned tool track covers the shot; no unsupported pickup, throw or cross-cut handoff',
  clocks:'windup → ready → extension → contact hold → recovery; quintic translation',
  target:'world-space aim; thrust tip reaches it only at contact, unreachable arms or out-of-stage shaft rejected',productionReady:false};
