/** Pure clocked jump and falling-object kinematics for both performer rigs. */
export interface AirborneClip {
  startMs:number;
  takeoffMs:number;
  landingMs:number;
  endMs:number;
  /** Positive height in rig units, scaled with the performer. */
  height:number;
}
export interface AirborneSample {
  phase:'rest'|'anticipation'|'flight'|'landing';
  airborne:boolean;
  /** World displacement added to the standing pelvis. Down is positive. */
  bodyOffsetY:number;
  /** World displacement of both feet. */
  feetOffsetY:number;
  bodyVelocityY:number;
  shadowScale:number;
}
const rest:AirborneSample={phase:'rest',airborne:false,bodyOffsetY:0,feetOffsetY:0,bodyVelocityY:0,shadowScale:1};
/** The pelvis position and velocity agree at liftoff and touchdown.
 * Feet stay planted during preparation and absorption; flight releases both.
 * Evaluation depends only on local time, so reverse seeks need no reset. */
export function sampleAirborne(clip:AirborneClip,timeMs:number,scale:number):AirborneSample {
  if(![clip.startMs,clip.takeoffMs,clip.landingMs,clip.endMs,clip.height,timeMs,scale].every(Number.isFinite)||
    !(clip.startMs<clip.takeoffMs&&clip.takeoffMs<clip.landingMs&&clip.landingMs<clip.endMs&&clip.height>0&&scale>0))
    throw new Error('Invalid airborne timing/height/scale');
  if(timeMs<=clip.startMs||timeMs>=clip.endMs)return {...rest};
  const height=clip.height*scale,air=(clip.landingMs-clip.takeoffMs)/1000;
  if(timeMs<clip.takeoffMs){
    const duration=(clip.takeoffMs-clip.startMs)/1000,p=(timeMs-clip.startMs)/(clip.takeoffMs-clip.startMs);
    const amplitude=4*height*duration/air;
    return {...rest,phase:'anticipation',bodyOffsetY:amplitude*p*p*(1-p),
      bodyVelocityY:amplitude/duration*(2*p-3*p*p)};
  }
  if(timeMs<clip.landingMs){
    const p=(timeMs-clip.takeoffMs)/(clip.landingMs-clip.takeoffMs),lift=4*height*p*(1-p);
    return {phase:'flight',airborne:true,bodyOffsetY:-lift,feetOffsetY:-lift,
      bodyVelocityY:-4*height/air*(1-2*p),shadowScale:1/(1+lift/(96*scale))};
  }
  const duration=(clip.endMs-clip.landingMs)/1000,p=(timeMs-clip.landingMs)/(clip.endMs-clip.landingMs);
  const amplitude=4*height*duration/air;
  return {...rest,phase:'landing',bodyOffsetY:amplitude*p*(1-p)*(1-p),
    bodyVelocityY:amplitude/duration*(1-4*p+3*p*p)};
}
export interface MotionPoint {x:number;y:number;}
export interface FallingObject {
  releaseMs:number;
  landingMs:number;
  release:MotionPoint;
  destination:MotionPoint;
  /** World velocity measured at the actual held-object release. */
  velocityY:number;
  velocityX:number;
}
/** A release keeps its actual hand position/vertical momentum, then falls.
 * Positive gravity is derived from the chosen clock and landing surface.
 * The caller must validate source ownership, release contact and stage bounds. */
export function sampleFallingObject(clip:FallingObject,timeMs:number):MotionPoint {
  const values=[clip.releaseMs,clip.landingMs,clip.release.x,clip.release.y,clip.destination.x,
    clip.destination.y,clip.velocityY,clip.velocityX,timeMs];
  if(!values.every(Number.isFinite)||clip.landingMs<=clip.releaseMs||clip.destination.y<clip.release.y)
    throw new Error('Invalid falling-object clock or landing surface');
  const duration=(clip.landingMs-clip.releaseMs)/1000;
  if(Math.abs(clip.destination.x-clip.release.x-clip.velocityX*duration)>.01)throw new Error(`Free drop must preserve horizontal hand momentum: landing x must be ${(clip.release.x+clip.velocityX*duration).toFixed(4)}, received ${clip.destination.x}`);
  const gravity=2*(clip.destination.y-clip.release.y-clip.velocityY*duration)/(duration*duration);
  if(!(gravity>0))throw new Error('Falling object requires positive gravity');
  if(timeMs<=clip.releaseMs)return {...clip.release};
  if(timeMs>=clip.landingMs)return {...clip.destination};
  const elapsed=(timeMs-clip.releaseMs)/1000;
  return {x:clip.release.x+clip.velocityX*elapsed,
    y:clip.release.y+clip.velocityY*elapsed+.5*gravity*elapsed*elapsed};
}
