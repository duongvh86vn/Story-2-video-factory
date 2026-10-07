import type {Point,Gesture} from './schemas.js';

export interface ArticulatedArmPose {shoulderDeg:number;elbowDeg:number;}
export interface ArticulatedArmWindow {startMs:number;reachMs:number;recoverMs:number;endMs:number;}
export interface ArticulatedArmReference {shoulderArcDeg:number;}
const finite=(values:number[],message:string)=>{if(values.some(value=>!Number.isFinite(value)))throw new Error('needs-arm-keypose: '+message);};
const wrap=(angle:number)=>Math.atan2(Math.sin(angle*Math.PI/180),Math.cos(angle*Math.PI/180))*180/Math.PI;
const ease=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*t*(t*(t*6-15)+10);};
function validatePose(pose:ArticulatedArmPose){
  finite([pose.shoulderDeg,pose.elbowDeg],'nonfinite joint angle');
  if(Math.abs(pose.shoulderDeg)>360||Math.abs(pose.elbowDeg)>170)throw new Error('needs-arm-keypose: joint angle outside candidate pose range');
}
/** Source-specific creative timing inside the original gesture interval. No audio/cue clock is changed. */
export function articulatedGestureWindow(gesture:Pick<Gesture,'startMs'|'endMs'|'contactMs'|'releaseMs'>):ArticulatedArmWindow{
  finite([gesture.startMs,gesture.endMs,...(gesture.contactMs===undefined?[]:[gesture.contactMs]),...(gesture.releaseMs===undefined?[]:[gesture.releaseMs])],'nonfinite gesture clock');
  const duration=gesture.endMs-gesture.startMs;
  const reachMs=gesture.contactMs??gesture.startMs+Math.min(600,duration*.35);
  const recoverMs=gesture.releaseMs??Math.max(reachMs,gesture.endMs-Math.min(400,duration*.25));
  const window={startMs:gesture.startMs,reachMs,recoverMs,endMs:gesture.endMs};
  validateWindow(window);return window;
}
function validateWindow(window:ArticulatedArmWindow){
  finite(Object.values(window),'nonfinite trajectory window');
  if(window.startMs<0||window.reachMs<=window.startMs||window.recoverMs<window.reachMs||window.endMs<=window.recoverMs)throw new Error('needs-arm-keypose: invalid trajectory window');
}
/** Convert absolute source-chain directions into shoulder + signed elbow angles. */
export function articulatedPoseFromDirections(upperDeg:number,lowerDeg:number):ArticulatedArmPose{
  finite([upperDeg,lowerDeg],'nonfinite chain direction');
  const pose={shoulderDeg:wrap(upperDeg),elbowDeg:wrap(lowerDeg-upperDeg)};validatePose(pose);return pose;
}
/** Capture the angular branch once from a deterministic gesture-entry reference. */
export function articulatedArmReference(rest:ArticulatedArmPose,active:ArticulatedArmPose):ArticulatedArmReference{
  validatePose(rest);validatePose(active);
  const delta=wrap(active.shoulderDeg-rest.shoulderDeg);
  return {shoulderArcDeg:Math.abs(Math.abs(delta)-180)<1e-8?180:delta};
}
/** C2 motion for fixed keyposes. A deliberately different elbow pole passes through zero flexion,
 * never teleports between the two IK solutions. Current body-relative keyposes may themselves move. */
export function sampleArticulatedArm(start:Point,upper:number,lower:number,rest:ArticulatedArmPose,active:ArticulatedArmPose,window:ArticulatedArmWindow,timeMs:number,reference:ArticulatedArmReference){
  finite([start.x,start.y,upper,lower,timeMs],'nonfinite arm input');validatePose(rest);validatePose(active);validateWindow(window);
  if(upper<.000001||lower<.000001||upper>1_000_000||lower>1_000_000)throw new Error('needs-arm-keypose: invalid fixed bone length');
  if(Math.abs(start.x)>1_000_000||Math.abs(start.y)>1_000_000)throw new Error('needs-arm-keypose: coordinate outside authoring precision range');
  finite([reference.shoulderArcDeg],'nonfinite shoulder branch');
  if(Math.abs(reference.shoulderArcDeg)>180)throw new Error('needs-arm-keypose: invalid shoulder branch reference');
  const relative=wrap(active.shoulderDeg-rest.shoulderDeg-reference.shoulderArcDeg);
  // A bounded corridor rejects unsupported moving-keypose branch crossings before the next antipode.
  if(Math.abs(relative)>90)throw new Error('needs-arm-keypose: moving shoulder arc leaves its registered branch corridor');
  const weight=timeMs<=window.startMs||timeMs>=window.endMs?0:timeMs<window.reachMs?ease((timeMs-window.startMs)/(window.reachMs-window.startMs))
    :timeMs>window.recoverMs?1-ease((timeMs-window.recoverMs)/(window.endMs-window.recoverMs)):1;
  const shoulder=rest.shoulderDeg+(reference.shoulderArcDeg+relative)*weight;
  const elbow=rest.elbowDeg+(active.elbowDeg-rest.elbowDeg)*weight;
  const radians=(angle:number)=>angle*Math.PI/180;
  const joint={x:start.x+Math.cos(radians(shoulder))*upper,y:start.y+Math.sin(radians(shoulder))*upper};
  const end={x:joint.x+Math.cos(radians(shoulder+elbow))*lower,y:joint.y+Math.sin(radians(shoulder+elbow))*lower};
  finite([joint.x,joint.y,end.x,end.y],'arm coordinates overflow');
  return {joint,end,upper:shoulder-90,lower:shoulder+elbow-90,reachable:true,error:0};
}
export const sourceArmTrajectoryDescription={version:'forest-arm-angle-trajectory-3',productionReady:false,
  scope:'current source-body expressive gestures only; contact/carry/drop/spear and legacy/generic arms retain their solvers',
  interpolation:'fixed-length forward kinematics; gesture-entry registered shoulder branch with 90deg drift corridor and signed elbow angle; quintic entry/exit in original clip',
  defaults:'keep actual gesture-entry elbow branch, including running, unless rest/reach pole is explicitly authored; approach up to 600ms/35%, recovery up to 400ms/25%; default reactions scale from each arm reach',
  limitations:['Candidate pose constraints, not anatomy or motion acceptance.','Moving body keyposes need full runtime/clearance/velocity review.','No source bitmap, speech, mouth, narration or native sprite timing is altered.']};
