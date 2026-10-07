import type { HostProfile } from '../host/schemas.js';
import type { SpeechActivity } from '../voice/schemas.js';
import { hash } from '../core/utils.js';
import { rigHand, type RigHand } from '../core/identifiers.js';
import { rigMetrics,type RigMetrics } from './rig.js';
import { HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION, ANIMATION_VERSION, CONTINUOUS_ANIMATION_VERSION, STORY_ANIMATION_VERSION, SEATED_ANIMATION_VERSION, PREVIOUS_ANIMATION_VERSION, LEGACY_ANIMATION_VERSION, STORY_MOODS, PerformancePlanSchema,isCurrentAnimation, type Gesture, type Mood, type PerformancePlan, type Point, type PostureTarget } from './schemas.js';
import {seatFor,seatWeightsAt,seatedPlacement,seatOccupancy,sourceSupportMotion} from './support.js';
import { selectedClips } from './library.js';
import {sampleAirborne,sampleFallingObject,type AirborneSample} from './airborne.js';
import {runSchedule,sampleRunning,runStepCount,RUN_POSES} from './running.js';
import {sampleSpear} from './spear.js';
import {inkLimb,pathCoordinates} from './ink-limb.js';
import {forestHeadContour} from './forest-tribe-art.js';
import {usesReferenceHead,validateReferenceHead,referenceFaceState,referenceHeadDescription,referenceHeadViewForYaw} from './forest-head-art.js';
import {headProjectionMatrixError} from './forest-head-projection.js';
import {usesCutoutHead,cutoutHeadChin} from './forest-cutout-head.js';
import {sourceArmShape,sourceSpearPairShape,type SourceArmRole} from './source-arm.js';
import {articulatedGestureWindow,articulatedPoseFromDirections,articulatedArmReference,sampleArticulatedArm} from './arm-trajectory.js';
import {usesBodyView,registeredBodyView,bodyViewFacing,validateBodyViewLunge} from './body-view-art.js';
import {hasBodyViewSpeech,registeredBodyViewMouth,sampleBodyViewMouth,validateBodyViewMouthActivity,bodyViewMouthDescription,BODY_VIEW_MOUTH_ATTACK_MS,BODY_VIEW_MOUTH_RELEASE_MS} from './body-view-mouth.js';
import {sampleLunge} from './lunge.js';
import {usesReferenceBody,referenceBodyDescription,referenceBodyHeadAttachment,referenceGarmentMotion} from './forest-body-art.js';
import {legGeometry} from './body-geometry.js';
import {seatedGarmentState,seatedGarmentMatrixError,type GarmentRestPose} from './forest-garment-art.js';
import {SOURCE_WALK_POSES,sourceSwing,sourceKneePole,projectSourceKnee} from './source-walk.js';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const degrees = (n: number) => n * 180 / Math.PI;
const rad = (n: number) => n * Math.PI / 180;
const rotate = (p: Point, angle: number): Point => ({ x: p.x * Math.cos(rad(angle)) - p.y * Math.sin(rad(angle)), y: p.x * Math.sin(rad(angle)) + p.y * Math.cos(rad(angle)) });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const chronological = <T extends {startMs:number}>(items:T[]):T[] => [...items].sort((a,b)=>a.startMs-b.startMs);
export interface BodyPosture { pelvisDropRatio:number; leanDeg:number; seatWeights?:Record<string,number>; }
/** Body transitions finish in a held pose. They do not restart at subtitle boundaries. */
export function postureAt(plan:PerformancePlan,timeMs:number):BodyPosture {
  const target=(pose:PostureTarget):BodyPosture=>{
    const intensity=pose.intensity??1,direction=plan.facing==='left'?-1:1;
    return {pelvisDropRatio:(pose.pose==='crouch'?.42:pose.pose==='lean'?.04:0)*intensity,
      leanDeg:(pose.leanDeg??(pose.pose==='crouch'?8:pose.pose==='lean'?16:0)*direction)*intensity};
  };
  let value=target(plan.entryPosture??{pose:'stand'});
  for(const clip of chronological(plan.postures??[])){
    if(timeMs<clip.startMs)break;
    const next=target(clip),weight=smooth((timeMs-clip.startMs)/(clip.endMs-clip.startMs));
    value={pelvisDropRatio:lerp(value.pelvisDropRatio,next.pelvisDropRatio,weight),leanDeg:lerp(value.leanDeg,next.leanDeg,weight)};
  }
  const seatWeights=seatWeightsAt(plan,timeMs);
  return Object.keys(seatWeights).length?{...value,seatWeights}:value;
}
const recoveryStart = (g:Gesture) => g.releaseMs ?? (g.action==='carry'?g.endMs:g.endMs-Math.min(220,(g.endMs-g.startMs)*.18));
const attaches = (g:Gesture) => g.action==='pick-place'||g.action==='carry'||g.action==='drop';
const contacts = (g:Gesture) => g.action==='operate'||attaches(g);
const CARRY_TRANSITION_MS=250;
const enteringCarry=(g:Gesture)=>(g.action==='carry'||g.action==='drop')&&g.startMs===0&&g.contactMs===0;
const gestureAt=(plan:PerformancePlan,t:number,hand:RigHand='right')=>plan.gestures.find(g=>rigHand(g)===hand&&t>=g.startMs&&(t<g.endMs||g.action==='carry'&&g.releaseMs===undefined&&t===plan.durationMs&&g.endMs===plan.durationMs));
export interface Chain { joint: Point; end: Point; upper: number; lower: number; reachable: boolean; error: number }

/** Fixed lengths, explicit bend direction. Inputs and outputs are all in world space. */
export function solveChain(start: Point, target: Point, upper: number, lower: number, bend = 1): Chain {
  if (!(upper > 0 && lower > 0)) throw new Error('Bone lengths must be positive');
  const dx = target.x-start.x, dy = target.y-start.y, actual = Math.hypot(dx,dy);
  const reach = Math.min(upper+lower-1e-6, Math.max(Math.abs(upper-lower)+1e-6,actual));
  const theta = Math.atan2(dy,dx), alpha = Math.acos(clamp((upper*upper+reach*reach-lower*lower)/(2*upper*reach),-1,1));
  const direction = theta-bend*alpha;
  const joint = { x:start.x+upper*Math.cos(direction), y:start.y+upper*Math.sin(direction) };
  const end = { x:start.x+reach*Math.cos(theta), y:start.y+reach*Math.sin(theta) };
  return { joint, end, upper:degrees(direction)-90, lower:degrees(Math.atan2(end.y-joint.y,end.x-joint.x))-90,
    reachable:actual<=upper+lower && actual>=Math.abs(upper-lower),error:distance(end,target) };
}

function overlaps(items: Array<{startMs:number;endMs:number}>, label:string, duration:number) {
  let end = 0;
  for (const item of [...items].sort((a,b)=>a.startMs-b.startMs)) {
    if (item.startMs<end || item.endMs<=item.startMs || item.endMs>duration) throw new Error(`${label}: overlapping or invalid interval ${item.startMs}–${item.endMs}`);
    end=item.endMs;
  }
}
/** Applies equally to compiled plans and direct random-access inspection. */
function validateFixedBodyView(plan:PerformancePlan,profile:HostProfile):void {
  if(hasBodyViewSpeech(profile)){
    registeredBodyViewMouth(profile);
    if(![HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION].includes(plan.compilerVersion))throw new Error('needs-view-voice-animation: registered mouth needs animation2.2.13/14/15');
  }
  if(!usesBodyView(profile))return;
  if(plan.headView!==registeredBodyView(profile).view||plan.headTurns?.length||plan.turns?.length)throw new Error('needs-body-registration: candidate uses one matching fixed head/body view');
  if(plan.walks.length||plan.jumps?.length||plan.supports?.length||plan.postures?.length||plan.entryPosture)throw new Error('needs-view-motion: authored-view cloth/locomotion/seated registration is pending');
  if(plan.expressions.some(e=>e.mood!=='happy'))throw new Error('needs-view-expression: authored-view candidate has only its intact happy face');
  if(plan.gazes.length)throw new Error('needs-view-gaze: explicit target gaze is not registered for the fixed authored face');
  if(plan.facing!==undefined&&plan.facing!==bodyViewFacing(profile))throw new Error('needs-body-registration: fixed authored artwork cannot portray the opposite body direction');
  if(plan.gestures.some(g=>g.action!=='point'&&g.action!=='think'))throw new Error('needs-view-motion: this authored view has only point/chin and right-view spear candidates');
  if(bodyViewFacing(profile)==='left'&&(plan.spears?.length||plan.props.some(p=>p.kind==='spear')))throw new Error('needs-view-tool-pose: left-view spear grip and contact have not been authored');
}
export function validatePerformance(plan: PerformancePlan, profile:HostProfile):void {
  PerformancePlanSchema.parse(plan);
  validateReferenceHead(profile,[plan.headView,...(plan.headTurns??[]).map(turn=>turn.direction)]);
  if(usesReferenceBody(profile)&&plan.turns?.length)throw new Error('needs-body-view: source body v1 has a fixed authored torso; full body turns require side/rear artwork.');
  if(usesReferenceHead(profile)&&plan.headTurns?.some(turn=>turn.endMs-turn.startMs<280))throw new Error('Reference head turn window must be at least 280ms.');
  if(plan.kind!==profile.kind || plan.leadCharacterId!==profile.id || plan.profileHash!==profile.profileHash) throw new Error('Performance identity/profile mismatch');
  if(Math.abs(plan.root.y-plan.stage.groundY)>1e-6) throw new Error('Performer root must use the ground anchor');
  for(const [name, items] of [['locomotion',plan.walks],['expression',plan.expressions],['gaze',plan.gazes]] as const) overlaps(items,name,plan.durationMs);
  for(const hand of ['left','right'] as const)overlaps(plan.gestures.filter(g=>rigHand(g)===hand),`${hand}-arm gesture`,plan.durationMs);
  if(new Set(plan.gestures.map(g=>g.id)).size!==plan.gestures.length)throw new Error('Duplicate gesture identity across arm tracks');
  overlaps(plan.turns??[],'turn',plan.durationMs);
  overlaps(plan.headTurns??[],'head turn',plan.durationMs);
  if((plan.headView||plan.headTurns?.length)&&!profile.appearance.characterVariant)throw new Error('Multiple head views require a Forest Tribe actor rig');
  overlaps(plan.postures??[],'body posture',plan.durationMs);
  overlaps(plan.jumps??[],'jump',plan.durationMs);
  if(![HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION].includes(plan.compilerVersion)&&(plan.jumps?.length||plan.gestures.some(g=>g.action==='drop'||g.landingMs!==undefined)))throw new Error('Jump/drop clips require animation2.2.14 or newer');
  if(plan.compilerVersion!==HUNT_ANIMATION_VERSION&&(plan.walks.some(w=>w.gait==='run')||plan.spears?.length||plan.props.some(p=>p.kind==='spear')))throw new Error('Run/spear tracks require animation2.2.15');
  if(plan.lunge)validateBodyViewLunge(profile);
  validateFixedBodyView(plan,profile);
  if(plan.lunge){
    const strike=plan.spears?.find(s=>s.id===plan.lunge!.spearId);
    if(!usesBodyView(profile)||plan.compilerVersion!==HUNT_ANIMATION_VERSION||plan.spears?.length!==1||!strike||strike.action!=='thrust'||!strike.twoHands||!strike.elbowPoles||strike.startMs!==0||strike.endMs!==plan.durationMs)throw new Error('needs-lunge-pose: fixed authored-view stance must own one two-hand thrust with fixed elbow poles for the entire shot');
    if(plan.walks.length||plan.jumps?.length||plan.turns?.length||plan.postures?.length||plan.entryPosture||plan.supports?.length)throw new Error('needs-lunge-pose: prepare the stance before shot entry; conflicting body tracks are not supported');
    for(const foot of Object.values(plan.lunge.soles))if(foot.y!==plan.root.y||foot.x<0||foot.x>plan.stage.width)throw new Error('needs-lunge-pose: fixed entry soles must be on the stage ground');
    if(plan.root.y!==plan.stage.groundY)throw new Error('needs-lunge-pose: planted stance root must be on the stage ground');
  }
  if(plan.compilerVersion!==HUNT_ANIMATION_VERSION&&plan.jumps?.some(j=>j.tuck!==undefined))throw new Error('Authored jump tuck requires animation2.2.15');
  if(plan.compilerVersion===LEGACY_ANIMATION_VERSION&&(plan.entryPosture||plan.postures?.length||plan.gestures.some(g=>g.elbowPole)))throw new Error('Body posture/elbow pole data requires animation2.2.8 or newer');
  if(![HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION,STORY_ANIMATION_VERSION,SEATED_ANIMATION_VERSION,PREVIOUS_ANIMATION_VERSION].includes(plan.compilerVersion)&&(plan.gestures.some(g=>g.hand)||plan.props.some(p=>p.attachedTo==='left-hand')))throw new Error('Hand tracks require animation2.2.9 or newer');
  if(![HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION,STORY_ANIMATION_VERSION,SEATED_ANIMATION_VERSION].includes(plan.compilerVersion)&&(plan.supports?.length||[...(plan.entryPosture?[plan.entryPosture]:[]),...(plan.postures??[])].some(p=>p.pose==='seated'||p.supportId)))throw new Error('Seat supports require animation2.2.10 or newer');
  if(![HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION,STORY_ANIMATION_VERSION].includes(plan.compilerVersion)&&plan.expressions.some(e=>(STORY_MOODS as readonly string[]).includes(e.mood)))throw new Error('Story emotions require animation2.2.11 or newer');
  const supportIds=new Set((plan.supports??[]).map(s=>s.id));
  if(supportIds.size!==(plan.supports?.length??0))throw new Error('Duplicate seat support identity');
  const m=rigMetrics(profile),s=plan.scale;
  for(const seat of plan.supports??[]){
    const hipSpan=m.hips?Math.abs(m.hips.right.x-m.hips.left.x):m.hipOffset*2;
    if(seat.width<(hipSpan+8)*s||seat.center.x-seat.width/2<0||seat.center.x+seat.width/2>plan.stage.width||seat.center.y-(seat.backHeight??0)<0||seat.center.y>=plan.stage.groundY)throw new Error(`${seat.id}: seat support must fit the physical stage and support the pelvis`);
  }
  for(const pose of [...(plan.entryPosture?[plan.entryPosture]:[]),...(plan.postures??[])]){
    if(pose.pose==='stand'&&pose.leanDeg)throw new Error('Standing posture must return to zero body lean; use a lean clip');
    if(pose.pose!=='seated'&&pose.supportId)throw new Error('Only a seated posture can own a seat support');
    if(pose.pose==='seated'){
      const seat=seatFor(plan,pose),time='endMs' in pose?Number(pose.endMs):0,root=rootAt(plan,time),direction=seat.facing==='left'?-1:1;
      if(pose.intensity!==undefined&&pose.intensity!==1)throw new Error(`${seat.id}: seated posture must settle fully on its support`);
      if((root.x-seat.center.x)*direction<=0)throw new Error(`${seat.id}: planted feet must be in front of the seat`);
      const facing=[...(plan.turns??[])].filter(t=>t.endMs<=time).sort((a,b)=>a.endMs-b.endMs).at(-1)?.direction??plan.facing??'front';
      if(facing!==seat.facing)throw new Error(`${seat.id}: seated facing must agree with the seat direction`);
      const sourcePose=usesReferenceBody(profile)?bodyStateAt(plan,profile,time):undefined;
      for(const side of ['left','right'] as const){
        const foot=sourcePose?.walk.feet[side]??{x:root.x+(m.hips?.[side].x??(side==='left'?-1:1)*m.stance)*s,y:root.y};
        const geometry=legGeometry(m,sourcePose?.pelvis??seat.center,foot,side,s,profile.appearance.bodyScale,sourcePose?.lean??0);
        const leg=solveChain(geometry.hip,geometry.ankle,geometry.bones.upper,geometry.bones.lower,direction);
        if(!leg.reachable||leg.error>.01||(leg.joint.x-geometry.hip.x)*direction<=0||Math.abs(leg.joint.y-geometry.hip.y)>geometry.bones.upper*.45||leg.joint.y>=geometry.ankle.y)throw new Error(`${seat.id}: seat/foot geometry cannot form supported thighs and grounded shins`);
      }
    }
  }
  let previousPose:PostureTarget=plan.entryPosture??{pose:'stand'};
  for(const pose of chronological(plan.postures??[])){
    const seating=(pose.pose==='seated')!==(previousPose.pose==='seated');
    if(usesReferenceBody(profile)&&seating&&pose.endMs-pose.startMs<1500)throw new Error('Source sit/stand transition must be at least 1500ms for foot preparation and body transfer');
    if(pose.endMs-pose.startMs<(seating?700:280))throw new Error(seating?'Seat transition must be at least 700ms':'Body posture transition must be at least 280ms');
    if(pose.pose==='seated'&&previousPose.pose==='seated'&&pose.supportId!==previousPose.supportId)throw new Error('Stand up before changing seat supports');
    previousPose=pose;
  }
  for(const turn of plan.turns??[]){
    if(turn.endMs-turn.startMs<280)throw new Error('Turn window must be at least 280ms');
    if(plan.walks.some(w=>w.startMs<turn.endMs&&w.endMs>turn.startMs))throw new Error('Stationary turn overlaps walk locomotion');
    if(plan.gestures.some(g=>contacts(g)&&g.startMs<turn.endMs&&g.endMs>turn.startMs))throw new Error('Turn overlaps hand contact or attachment');
    if(seatOccupancy(plan).some(p=>p.startMs<turn.endMs&&p.endMs>turn.startMs))throw new Error('Stand up before turning the seated body; use gaze for seated attention');
  }
  let rootX=plan.root.x;
  for(const walk of chronological(plan.walks)){
    const body=postureAt(plan,walk.startMs);
    if(body.pelvisDropRatio!==0||body.leanDeg!==0||body.seatWeights||(plan.postures??[]).some(p=>p.startMs<walk.endMs&&p.endMs>walk.startMs))throw new Error('Walking requires a standing body posture; finish returning to stand before locomotion');
    if(Math.abs(walk.fromX-rootX)>.001)throw new Error('Walk entry position breaks continuity');
    const m=rigMetrics(profile), speed=Math.abs(walk.toX-walk.fromX)/plan.scale/((walk.endMs-walk.startMs)/1000);
    if(speed>m.upperLeg*(walk.gait==='run'?5:3))throw new Error('Locomotion window too short for the distance; shorten the path');
    if(walk.gait==='run'&&Math.abs(walk.toX-walk.fromX)<.01)throw new Error('Running needs a nonzero path');
    if(walk.gait==='run'&&(walk.endMs-walk.startMs)/runStepCount(walk,m,plan.scale)<240)throw new Error('Running contact cycle needs at least 240ms per step');
    rootX=walk.toX;
  }
  for(const jump of plan.jumps??[]){
    if(!(jump.startMs<jump.takeoffMs&&jump.takeoffMs<jump.landingMs&&jump.landingMs<jump.endMs)||jump.takeoffMs-jump.startMs<120||jump.landingMs-jump.takeoffMs<180||jump.endMs-jump.landingMs<160)throw new Error('Jump requires preparation, flight and landing clocks');
    const compression=16*jump.height*Math.max(jump.takeoffMs-jump.startMs,jump.endMs-jump.landingMs)/(27*(jump.landingMs-jump.takeoffMs));
    if(compression>m.upperLeg*.6)throw new Error('Jump preparation/landing compression exceeds supported knee flexion');
    if(jump.height>m.upperLeg*.9)throw new Error('Jump height exceeds this standing rig clip; use a different supported motion');
    const body=postureAt(plan,jump.startMs);
    if(body.pelvisDropRatio!==0||body.leanDeg!==0||body.seatWeights||(plan.postures??[]).some(p=>p.startMs<jump.endMs&&p.endMs>jump.startMs))throw new Error('Jump requires standing posture throughout its clip');
    if([...plan.walks,...(plan.turns??[])].some(p=>p.startMs<jump.endMs&&p.endMs>jump.startMs))throw new Error('Standing jump cannot overlap walking or turning');
    if(plan.gestures.some(g=>['operate','pick-place'].includes(g.action)&&g.startMs<jump.endMs&&g.endMs>jump.startMs))throw new Error('Jump cannot overlap fixed-world contact/placement');
    for(const g of plan.gestures.filter(g=>(g.action==='carry'||g.action==='drop')&&g.startMs<jump.endMs&&g.endMs>jump.startMs)){
      if(jump.startMs<g.contactMs!+(enteringCarry(g)?0:CARRY_TRANSITION_MS)||g.action==='carry'&&g.releaseMs!==undefined&&jump.endMs>g.releaseMs-CARRY_TRANSITION_MS)throw new Error('Jump must follow established grip ownership and fit before carry lowering');
    }
  }
  const props=new Set(plan.props.map(p=>p.id));
  if(props.size!==plan.props.length)throw new Error('Duplicate prop identity');
  const spearTracks=plan.spears??[];
  if(new Set(spearTracks.map(c=>c.id)).size!==spearTracks.length)throw new Error('Duplicate spear track identity');
  for(const track of spearTracks){
    const prop=plan.props.find(p=>p.id===track.propId);
    if(!prop||prop.kind!=='spear'||prop.attachedTo!==`${track.hand}-hand`)throw new Error(track.id+': spear requires an entry-owned spear prop in the primary hand');
    if(track.startMs!==0||track.endMs!==plan.durationMs||spearTracks.filter(c=>c.propId===track.propId).length!==1)throw new Error(track.id+': one spear track must retain ownership through the entire shot');
    if(prop.destination||Math.abs(prop.gripOffset?.y??0)>1e-6||Math.abs(prop.gripOffset?.x??0)>(prop.length??120)/2-22)throw new Error(track.id+': grip must lie on the wooden shaft, away from the stone point');
    if((prop.gripOffset?.x??0)+track.secondaryOffset<-(prop.length??120)/2+5)throw new Error(track.id+': second hand lies beyond the shaft butt');
    if(track.twoHands&&(prop.gripOffset?.x??0)+track.secondaryOffset>(prop.length??120)/2-22)throw new Error(track.id+': second hand must remain on wood away from the stone point');
    if(usesReferenceBody(profile)&&!track.elbowPoles)throw new Error(track.id+': needs-arm-pose: source spear requires authored fixed elbow roles');
    const owns=(side:RigHand)=>side===track.hand||track.twoHands;
    if(plan.gestures.some(g=>owns(rigHand(g))))throw new Error(track.id+': spear-owned hand cannot also own a gesture');
    if(spearTracks.some(other=>other!==track&&(owns(other.hand)||other.twoHands)))throw new Error(track.id+': overlapping spear hand ownership');
    if(track.aim.x<0||track.aim.x>plan.stage.width||track.aim.y<0||track.aim.y>plan.stage.groundY)throw new Error(track.id+': aim must be on the stage');
    if(track.action==='thrust'){
      if(!(track.readyMs!==undefined&&track.contactMs!==undefined&&track.recoverMs!==undefined&&track.readyMs-track.startMs>=280&&track.contactMs-track.readyMs>=200&&track.recoverMs-track.contactMs>=80&&track.endMs-track.recoverMs>=280))throw new Error(track.id+': thrust needs ordered windup, extension, contact hold and recovery clocks');
      if(plan.walks.some(w=>w.startMs<track.recoverMs!&&w.endMs>track.readyMs!)||plan.jumps?.some(j=>j.startMs<track.recoverMs!&&j.endMs>track.readyMs!))throw new Error(track.id+': settle locomotion before a fixed-target spear contact');
      if(plan.postures?.some(p=>p.startMs<track.recoverMs!&&p.endMs>track.readyMs!))throw new Error(track.id+': settle body posture before the strike/contact hold');
    }else if(track.readyMs!==undefined||track.contactMs!==undefined||track.recoverMs!==undefined)throw new Error(track.id+': hold has no strike clocks');
  }
  for(const prop of plan.props.filter(p=>p.kind==='spear'))if(!spearTracks.some(c=>c.propId===prop.id))throw new Error(prop.id+': spear prop has no shared grip track');
  for(const hand of ['left','right'] as const)if(plan.props.filter(p=>p.attachedTo===`${hand}-hand`).length>1)throw new Error(`Only one prop can own the ${hand}-hand entry grip`);
  for(const prop of plan.props.filter(p=>p.attachedTo)){
    if(!spearTracks.some(c=>c.propId===prop.id)&&!plan.gestures.some(g=>enteringCarry(g)&&g.propId===prop.id&&`${rigHand(g)}-hand`===prop.attachedTo))throw new Error(`${prop.id}: attached entry prop requires matching hand carry ownership from time zero`);
  }
  const propPoints=new Map(plan.props.map(p=>[p.id,p.origin]));
  for(const g of chronological(plan.gestures)){
    if(['point','inspect','operate','pick-place','carry','drop'].includes(g.action)&&!g.target)throw new Error(`${g.id}: missing gesture target`);
    if(contacts(g) && (g.contactMs===undefined||g.contactMs<=g.startMs&&!enteringCarry(g)||g.contactMs>=g.endMs))throw new Error(`${g.id}: contact must follow approach`);
    if(attaches(g) && (!g.propId||!props.has(g.propId)))throw new Error(`${g.id}: attachment requires a known prop`);
    if(enteringCarry(g)&&plan.props.find(p=>p.id===g.propId)?.attachedTo!==`${rigHand(g)}-hand`)throw new Error(`${g.id}: entry carry requires a prop attached to the same hand`);
    if(attaches(g)&&(g.action==='pick-place'||g.action==='drop'||g.releaseMs!==undefined)&&(!g.destination||g.releaseMs===undefined||g.releaseMs<=g.contactMs!||g.releaseMs>=g.endMs))throw new Error(`${g.id}: released attachment requires destination and release`);
    if(g.action==='carry'&&g.releaseMs===undefined&&(g.endMs!==plan.durationMs||g.destination))throw new Error(`${g.id}: unreleased carry must own the arm through the scene exit`);
    if(g.propId&&!props.has(g.propId))throw new Error(`${g.id}: unknown prop`);
    if(contacts(g)){
      const release=recoveryStart(g);
      if(release-g.contactMs!<80 || (g.action!=='carry'||g.releaseMs!==undefined)&&g.endMs-release<120)throw new Error(`${g.id}: contact schedule needs at least 80ms of hold and 120ms of recovery`);
    }
    if(g.carryOffset&&g.action!=='carry'&&g.action!=='drop')throw new Error(`${g.id}: carry offset requires carry ownership`);
    if(g.landingMs!==undefined&&g.action!=='drop')throw new Error(g.id+': landingMs belongs only to drop');
    if(g.action==='drop'&&(!g.carryOffset||g.landingMs===undefined||g.landingMs<=g.releaseMs!||g.landingMs>plan.durationMs||g.releaseMs!-g.contactMs!<(enteringCarry(g)?0:CARRY_TRANSITION_MS)+80))throw new Error(g.id+': drop needs owned grip, release, falling time and landing');
    if(g.action==='carry'&&(!g.carryOffset||recoveryStart(g)-g.contactMs!<(enteringCarry(g)?0:CARRY_TRANSITION_MS)+(g.releaseMs===undefined?0:CARRY_TRANSITION_MS)+80))throw new Error(`${g.id}: carry needs a lift/hold/lowering window and local grip offset`);
    if(attaches(g)){
      const prop=plan.props.find(p=>p.id===g.propId)!;
      const offset=prop.gripOffset??{x:0,y:0},current=propPoints.get(prop.id)!;
      const grip={x:current.x+offset.x*plan.scale,y:current.y+offset.y*plan.scale};
      if(distance(grip,g.target!)>.01)throw new Error(`${g.id}: prop ${prop.id} grip anchor does not match pickup target`);
      if(g.destination)propPoints.set(prop.id,{x:g.destination.x-offset.x*plan.scale,y:g.destination.y-offset.y*plan.scale});
      if(g.action==='drop'&&plan.gestures.some(next=>next.propId===g.propId&&next!==g&&next.contactMs!>=g.releaseMs!&&next.contactMs!<g.landingMs!))throw new Error(g.id+': cannot pick up a falling prop before landing');
    }
    for(const walk of plan.walks.filter(w=>w.startMs<g.endMs&&w.endMs>g.startMs)){
      if(['operate','pick-place','drop'].includes(g.action))throw new Error(`${g.id}: moving while attached requires a carry clip; not supported by this clip`);
      if(g.action==='carry'&&(walk.startMs<g.contactMs!+(enteringCarry(g)?0:CARRY_TRANSITION_MS)||walk.endMs>recoveryStart(g)-(g.releaseMs===undefined?0:CARRY_TRANSITION_MS)))throw new Error(`${g.id}: carry locomotion must fit after lift and before lowering window`);
    }
  }
  for(const prop of plan.props)overlaps(plan.gestures.filter(g=>attaches(g)&&g.propId===prop.id).map(g=>({startMs:g.contactMs!,endMs:g.releaseMs??g.endMs})),`prop ${prop.id} ownership`,plan.durationMs);
  for(const prop of plan.props.filter(p=>p.attachedTo)){
    const side=prop.attachedTo==='left-hand'?'left':'right';
    const first=samplePerformance(plan,profile,0,{method:'segment-draft',windowMs:20,intervals:[]});
    const hand=first.hands[side],offset=prop.gripOffset??{x:0,y:0};
    if(prop.kind==='spear'?distance(first.props[prop.id]!.point,prop.origin)>.01:distance(hand,{x:prop.origin.x+offset.x*plan.scale,y:prop.origin.y+offset.y*plan.scale})>.01)throw new Error(`${prop.id}: entry grip anchor does not match the carried hand pose`);
  }
}

export interface FrameState {
  timeMs:number; airborne?:{phase:string;bodyVelocityY:number}; root:Point; feet:Record<'left'|'right',Point>; stance:Record<'left'|'right',boolean>;
  bodyPosture:BodyPosture;
  seatContact?:{supportId:string;errorPx:number};
  legProjection?:Record<RigHand,{kneeDepth:number;upperRatio:number;lowerRatio:number}>;
  armProjection?:Partial<Record<RigHand,{elbowDepth:number;upperRatio:number;lowerRatio:number}>>;
  armGeometry?:Partial<Record<RigHand,ReturnType<typeof sourceArmShape>>>;
  spearGeometry?:Record<string,ReturnType<typeof sourceSpearPairShape>>;
  /** Physical lower-arm endpoints. hands retain palm/grip contact semantics. */
  wrists?:Record<RigHand,Point>;
  hands:Record<'left'|'right',Point>; contactError:number; contactErrors:Record<RigHand,number>; mood:Mood;
  transforms:Record<string,string>; paths?:Record<string,string>; face:Record<string,{opacity?:number;scaleX?:number;scaleY?:number;rotation?:number;x?:number;y?:number;attr?:{transform:string}}>;
  props:Record<string,{point:Point;attached:boolean;angle?:number;tip?:Point;phase?:string}>;
}
const number = (n:number)=>String(Number(n.toFixed(4)));
function transform(p:Point,angle=0,scale=1):string {return `translate(${number(p.x)} ${number(p.y)}) rotate(${number(angle)}) scale(${number(scale)})`;}
function rootAt(plan:PerformancePlan,timeMs:number):Point {
  let x=plan.root.x;
  for(const walk of chronological(plan.walks)){ if(timeMs<walk.startMs)break; x=lerp(walk.fromX,walk.toX,smooth((timeMs-walk.startMs)/(walk.endMs-walk.startMs))); }
  return {x,y:plan.root.y};
}
function walkSteps(plan:PerformancePlan,profile:HostProfile,walk:PerformancePlan['walks'][number]){
  const m=rigMetrics(profile),stepLength=Math.max(8,m.upperLeg*.32)*plan.scale;
  const steps=walk.gait==='run'?runStepCount(walk,m,plan.scale):Math.max(2,Math.ceil(Math.abs(walk.toX-walk.fromX)/stepLength)),span=(walk.endMs-walk.startMs)/steps;
  return Array.from({length:steps},(_,i)=>{
    const startMs=walk.startMs+i*span,endMs=i===steps-1?walk.endMs:walk.startMs+(i+1)*span,side=i%2?'right' as const:'left' as const;
    const landing=(i>=steps-2?walk.toX:rootAt(plan,endMs).x)+(m.footOffsets?.[side]??(side==='left'?-m.stance:m.stance))*plan.scale;
    return {i,startMs,endMs,side,landing};
  });
}
function gait(plan:PerformancePlan,profile:HostProfile,timeMs:number) {
  const m=rigMetrics(profile), scale=plan.scale;
  let feet={left:{x:plan.root.x+(m.footOffsets?.left??-m.stance)*scale,y:plan.root.y},right:{x:plan.root.x+(m.footOffsets?.right??m.stance)*scale,y:plan.root.y}};
  const stance={left:true,right:true};let activation=0,phase=0,direction=1,armSwing=25,supportShiftX=0,runAir:AirborneSample|undefined,running=false;
  for(const walk of chronological(plan.walks)){
    if(timeMs<walk.startMs)break;
    direction=Math.sign(walk.toX-walk.fromX)||1;
    if(walk.gait==='run'){
      const schedule=runSchedule(walk,m,scale,feet,t=>rootAt(plan,t)),running=sampleRunning(schedule,timeMs,scale,m.upperLeg);
      feet=running.feet;Object.assign(stance,running.stance);
      if(timeMs<walk.endMs){
        const transition=Math.min(180,(walk.endMs-walk.startMs)/4);
        activation=smooth((timeMs-walk.startMs)/transition)*smooth((walk.endMs-timeMs)/transition);
        phase=(timeMs-walk.startMs)/schedule.span;armSwing=30;runAir=running.air;
      }
      continue;
    }
    for(const {i,startMs:start,endMs:end,side,landing} of walkSteps(plan,profile,walk)){
      if(timeMs<start)break;
      // Last two placements establish the final balanced stance, preserving shot-boundary continuity.
      const p=clamp((timeMs-start)/(end-start));
      if(usesReferenceBody(profile)){
        const sampled=sourceSwing(feet[side],landing,plan.root.y,p,m.upperLeg,scale);
        feet={...feet,[side]:sampled.point};
        if(p<1){
          stance[side]=sampled.planted;phase=i+p;
          const support=feet[side==='left'?'right':'left'];
          supportShiftX=clamp(support.x-rootAt(plan,timeMs).x,-m.upperLeg*.08*scale,m.upperLeg*.08*scale)*sampled.supportWeight;
        }
      }else{
        feet={...feet,[side]:{x:lerp(feet[side].x,landing,smooth(p)),y:plan.root.y-Math.sin(Math.PI*p)*m.upperLeg*.25*scale}};
        if(p<1){stance[side]=false;phase=i+p;}
      }
    }
    if(timeMs<walk.endMs){
      const transition=Math.min(180,(walk.endMs-walk.startMs)/4);
      activation=smooth((timeMs-walk.startMs)/transition)*smooth((walk.endMs-timeMs)/transition);
      if(usesReferenceBody(profile)){
        const progress=clamp((timeMs-walk.startMs)/(walk.endMs-walk.startMs));
        const speed=Math.abs(walk.toX-walk.fromX)/scale/((walk.endMs-walk.startMs)/1000)*6*progress*(1-progress);
        armSwing=clamp(speed/Math.max(1,m.upperLeg),0,1)*16;
      }
    }
  }
  running=!!runAir;
  return {feet,stance,activation,phase,direction,armSwing,supportShiftX,runAir,running};
}
/** Lower the source pelvis only as far as the fixed limbs require, including
 * a planted actor leaning into an expression. A generic fraction of its long
 * hidden thigh would produce a deep crouch every step. */
function sourceWalkDrop(root:Point,walk:ReturnType<typeof gait>,metrics:RigMetrics,profile:HostProfile,scale:number,lean:number,bodyOffsetY=0):number {
  let needed=0;
  for(const side of ['left','right'] as const){
    const base={x:root.x+walk.supportShiftX,y:root.y+metrics.pelvisY*scale+bodyOffsetY},geometry=legGeometry(metrics,base,walk.feet[side],side,scale,profile.appearance.bodyScale,lean);
    const dx=geometry.ankle.x-geometry.hip.x,length=geometry.bones.upper+geometry.bones.lower-1e-6;
    if(Math.abs(dx)>=length)throw new Error('needs-source-motion: stride exceeds source leg reach.');
    needed=Math.max(needed,geometry.ankle.y-Math.sqrt(length*length-dx*dx)-geometry.hip.y);
  }
  return needed+walk.activation*(1.1+.5*Math.sin(walk.phase*Math.PI*2))*scale;
}
function bodyStateAt(plan:PerformancePlan,profile:HostProfile,t:number){
  const m=rigMetrics(profile),s=plan.scale,root=rootAt(plan,t),walk=gait(plan,profile,t),emotion=expressionAt(plan,t),pose=emotion.pose;
  const lunge=sampleLunge(plan,t);
  if(lunge){walk.feet={left:{...lunge.soles.left},right:{...lunge.soles.right}};walk.stance={left:true,right:true};}
  const jump=plan.jumps?.find(j=>t>=j.startMs&&t<=j.endMs),air=jump?sampleAirborne(jump,t,s):walk.runAir;
  if(air)for(const side of ['left','right'] as const){walk.feet[side].y+=air.feetOffsetY;walk.stance[side]=walk.runAir?walk.stance[side]&&!air.airborne:!air.airborne;}
  if(jump?.tuck&&air?.airborne){
    const p=clamp((t-jump.takeoffMs)/(jump.landingMs-jump.takeoffMs)),arch=64*p*p*p*(1-p)*(1-p)*(1-p);
    for(const side of ['left','right'] as const)walk.feet[side].y-=m.upperLeg*jump.tuck*s*arch;
  }
  const orientation=orientationAt(plan,t),bodyPosture=postureAt(plan,t),source=usesReferenceBody(profile);
  const breath=source?Math.sin((t+(profile.appearance.characterVariant==='karo'?1100:0))*Math.PI*2/4300)*.55*smooth(t/200)*smooth((plan.durationMs-t)/200):0;
  const sourceSupported=source&&plan.supports?.length?sourceSupportMotion(plan,profile,t,root,walk.feet):undefined;
  const supported=sourceSupported??(plan.supports?.length?seatedPlacement(plan,profile,t,root):undefined);
  if(sourceSupported?.ownsFeet&&!walk.activation){walk.feet=sourceSupported.feet;walk.stance=sourceSupported.stance;}
  const lean=lunge?lunge.leanDeg:bodyPosture.leanDeg+pose.lean*emotion.weight+Math.sin(walk.phase*Math.PI)*walk.activation*1.5+orientation*3+breath+(sourceSupported?.leanOffset??0)+(source&&walk.running?walk.direction*10*walk.activation:0);
  const postureDrop=Math.abs(m.pelvisY)*bodyPosture.pelvisDropRatio*s+(lunge?.dropY??0);
  // Seats have their own contact solver. For unsupported/planted poses, rotate
  // the hips before measuring required leg reach; never lengthen a leg or relax
  // the reach tolerance when a leaning emotion moves its hip away from a sole.
  const pelvisRoot={x:root.x+(lunge?.advanceX??0),y:root.y};
  const walkDrop=source?(supported&&!walk.activation?0:sourceWalkDrop(pelvisRoot,walk,m,profile,s,lean,(air?.bodyOffsetY??0)+postureDrop)):walk.activation*m.upperLeg*.23*s;
  const pelvis=supported?.pelvis??{x:pelvisRoot.x+walk.supportShiftX,y:root.y+m.pelvisY*s+postureDrop+walkDrop};
  if(sourceSupported){
    // A seated hip is below/behind the belt. Counter the body's lean around
    // this attachment so the contact stays on the support rather than orbiting.
    const rotated=rotate(sourceSupported.contactOffset,lean),weight=sourceSupported.supportWeight;
    pelvis.x+=(sourceSupported.contactOffset.x-rotated.x)*weight;
    pelvis.y+=(sourceSupported.contactOffset.y-rotated.y)*weight;
    if(weight<1){
      // Feet are prepared before the hip reaches the seat. During that free
      // transfer, a leaning asymmetric hip can otherwise sit 1–2px above its
      // fixed leg reach. Lower the FREE pelvis, not a sole or a bone. Once the
      // seat owns the full contact, its anchor is immutable and reach errors
      // remain errors instead of being hidden by this compensation.
      let drop=0;
      for(const side of ['left','right'] as const){
        const g=legGeometry(m,pelvis,walk.feet[side],side,s,profile.appearance.bodyScale,lean),dx=g.ankle.x-g.hip.x,length=g.bones.upper+g.bones.lower-1e-6;
        if(Math.abs(dx)>=length)throw new Error('needs-source-motion: seat foot preparation exceeds fixed leg reach');
        drop=Math.max(drop,g.ankle.y-Math.sqrt(length*length-dx*dx)-g.hip.y);
      }
      pelvis.y+=drop;
    }
  }
  if(supported&&walk.activation){pelvis.x+=walk.supportShiftX;pelvis.y+=walkDrop;}
  if(air)pelvis.y+=air.bodyOffsetY;
  return {m,s,root,walk,emotion,pose,air,orientation,bodyPosture,lean,pelvis,bend:supported?.bend??1,
    kneeSeatWeight:usesBodyView(profile)?1:sourceSupported?.supportWeight??Object.values(bodyPosture.seatWeights??{}).reduce((sum,weight)=>sum+weight,0)};
}
/** Shared body landmarks for authoring a tool target without invoking arm IK.
 * Does not advance a scene, render a video or accept the resulting pose. */
export function bodyPoseAnchors(plan:PerformancePlan,profile:HostProfile,timeMs:number){
  if(plan.lunge)validateBodyViewLunge(profile);
  validateFixedBodyView(plan,profile);
  const {m,s,pelvis,lean}=bodyStateAt(plan,profile,clamp(timeMs,0,plan.durationMs));
  const shoulders=Object.fromEntries((['left','right'] as const).map(side=>{
    const p=m.shoulders?.[side]??{x:m.shoulderOffset*(side==='left'?-1:1),y:m.shoulderY-m.pelvisY};
    return [side,add(pelvis,rotate({x:p.x*s,y:p.y*s},lean))];
  })) as Record<RigHand,Point>;
  return {pelvis,lean,shoulders};
}
function moodAt(plan:PerformancePlan,time:number):{mood:Mood;weight:number} {
  const e=plan.expressions.find(e=>time>=e.startMs&&time<e.endMs);
  if(!e)return {mood:'neutral',weight:0};
  return {mood:e.mood,weight:smooth((time-e.startMs)/140)*smooth((e.endMs-time)/140)};
}
function orientationAt(plan:PerformancePlan,time:number):number {
  const value={front:0,left:-1,right:1};let current=value[plan.facing??'front'];
  for(const turn of chronological(plan.turns??[])){
    if(time<turn.startMs)break;
    const next=value[turn.direction];
    if(time<turn.endMs)return lerp(current,next,smooth((time-turn.startMs)/(turn.endMs-turn.startMs)));
    current=next;
  }
  return current;
}
function headViewAt(plan:PerformancePlan,time:number):{yaw:number;back:number} {
  const views={front:{yaw:0,back:0},left:{yaw:-1,back:0},right:{yaw:1,back:0},
    'three-quarter-left':{yaw:-.65,back:0},'three-quarter-right':{yaw:.65,back:0},
    'back-left':{yaw:-.65,back:1},'back-right':{yaw:.65,back:1},back:{yaw:0,back:1}};
  let current=views[plan.headView??plan.facing??'front'];
  for(const turn of chronological(plan.headTurns??[])){
    if(time<turn.startMs)break;
    const next=views[turn.direction],w=smooth((time-turn.startMs)/(turn.endMs-turn.startMs));
    current={yaw:lerp(current.yaw,next.yaw,w),back:lerp(current.back,next.back,w)};
    if(time<turn.endMs)break;
  }
  return current;
}
const moodPoses:Record<Mood,{brow:number;tilt:number;lean:number;smile:number;round:number;lid:number;frown?:number;browAngle?:number;eyeOpen?:number}>={
  neutral:{brow:0,tilt:0,lean:0,smile:0,round:0,lid:0},curious:{brow:-4,tilt:-7,lean:4,smile:0,round:0,lid:0},
  thinking:{brow:2,tilt:7,lean:-2,smile:0,round:0,lid:.3},concerned:{brow:4,tilt:-4,lean:-3,smile:0,round:0,lid:.25},
  effort:{brow:4,tilt:2,lean:5,smile:0,round:0,lid:.25},surprised:{brow:-7,tilt:-5,lean:-6,smile:0,round:1,lid:0},
  understanding:{brow:-1,tilt:3,lean:0,smile:1,round:0,lid:0},confident:{brow:-1,tilt:0,lean:0,smile:.7,round:0,lid:0},
  happy:{brow:-3,tilt:3,lean:0,smile:1,round:0,lid:.1,browAngle:-5},
  sad:{brow:1,tilt:9,lean:-3,smile:0,round:0,lid:.35,frown:1,browAngle:20,eyeOpen:.8},
  angry:{brow:3,tilt:-3,lean:3,smile:0,round:0,lid:.15,frown:.65,browAngle:-24,eyeOpen:.75},
  afraid:{brow:-5,tilt:-8,lean:-6,smile:0,round:.8,lid:0,browAngle:18,eyeOpen:1.2},
  excited:{brow:-6,tilt:4,lean:3,smile:1,round:0,lid:0,browAngle:-6,eyeOpen:1.15},
  disappointed:{brow:2,tilt:6,lean:-2,smile:0,round:0,lid:.4,frown:.8,browAngle:12,eyeOpen:.85},
  relieved:{brow:0,tilt:2,lean:0,smile:.8,round:0,lid:.3,browAngle:6,eyeOpen:.9},
  tired:{brow:2,tilt:8,lean:-4,smile:0,round:0,lid:.7,browAngle:5,eyeOpen:.55},
};
/** Contiguous identical emotion clips are one held performance, not cue resets. */
function expressionRanges(plan:PerformancePlan):PerformancePlan['expressions'] {
  const ranges:PerformancePlan['expressions']=[];
  for(const clip of chronological(plan.expressions)){
    const last=ranges.at(-1);
    if(last?.endMs===clip.startMs&&last.mood===clip.mood)last.endMs=clip.endMs;
    else ranges.push({...clip});
  }
  return ranges;
}
const expressionBlendMs=(clip:PerformancePlan['expressions'][number])=>Math.min(140,(clip.endMs-clip.startMs)/2);
const expressionPose=(mood:Mood)=>({...moodPoses[mood],frown:moodPoses[mood].frown??0,
  browAngle:moodPoses[mood].browAngle??(mood==='concerned'?12:mood==='effort'?-12:0),eyeOpen:moodPoses[mood].eyeOpen??1});
type ExpressionPose=ReturnType<typeof expressionPose>;
function blendExpression(a:ExpressionPose,b:ExpressionPose,weight:number):ExpressionPose {
  return {brow:lerp(a.brow,b.brow,weight),tilt:lerp(a.tilt,b.tilt,weight),lean:lerp(a.lean,b.lean,weight),
    smile:lerp(a.smile,b.smile,weight),round:lerp(a.round,b.round,weight),lid:lerp(a.lid,b.lid,weight),
    frown:lerp(a.frown,b.frown,weight),browAngle:lerp(a.browAngle,b.browAngle,weight),eyeOpen:lerp(a.eyeOpen,b.eyeOpen,weight)};
}
function expressionAt(plan:PerformancePlan,time:number) {
  if(![HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION].includes(plan.compilerVersion)){
    const legacy=moodAt(plan,time);return {...legacy,pose:moodPoses[legacy.mood]};
  }
  const ranges=expressionRanges(plan),index=ranges.findIndex(clip=>time>=clip.startMs&&time<clip.endMs),neutral=expressionPose('neutral');
  if(index<0)return {mood:'neutral' as const,weight:0,pose:neutral};
  const clip=ranges[index]!,previous=ranges[index-1],next=ranges[index+1],window=expressionBlendMs(clip);
  const from=previous?.endMs===clip.startMs?expressionPose(previous.mood):neutral;
  let pose=blendExpression(from,expressionPose(clip.mood),smooth((time-clip.startMs)/window));
  // Adjacent reactions blend directly after the new cue begins. Actual gaps and
  // the end of the last clip still recover to neutral without extending clocks.
  if(next?.startMs!==clip.endMs)pose=blendExpression(neutral,pose,smooth((clip.endMs-time)/window));
  return {mood:clip.mood,weight:1,pose};
}
function expressiveAim(g:Gesture,neutral:Point,chin:Point,shoulder:Point,sourceReach?:number):Point{
  if(g.action==='think')return chin;
  if(g.target)return g.target;
  const side=rigHand(g)==='left'?-1:1;
  if(sourceReach!==undefined)return {x:shoulder.x+sourceReach*(g.action==='react'?.7:.8)*side,y:shoulder.y+sourceReach*(g.action==='react'?-.15:.2)};
  return g.action==='react'?{x:neutral.x+25*side,y:neutral.y-110}:{x:neutral.x+55*side,y:neutral.y-45};
}
function goal(g:Gesture,neutral:Point,chin:Point,carryAnchor:Point,time:number,scale:number,shoulder:Point):Point {
  const side=rigHand(g)==='left'?-1:1;
  const settle=Math.min(220,(g.endMs-g.startMs)*.18),recover=smooth((g.endMs-time)/settle);
  if(g.action==='pick-place'){
    const contact=g.contactMs!,release=g.releaseMs!,source=g.target!,dest=g.destination!;
    if(time<contact)return mix(neutral,source,smooth((time-g.startMs)/(contact-g.startMs)));
    if(time<release)return mix(source,dest,smooth((time-contact)/(release-contact)));
    return mix(dest,neutral,smooth((time-release)/(g.endMs-release)));
  }
  if(g.action==='drop'){
    const contact=g.contactMs!,release=g.releaseMs!;
    if(time<contact)return mix(neutral,g.target!,smooth((time-g.startMs)/(contact-g.startMs)));
    if(!enteringCarry(g)&&time<contact+CARRY_TRANSITION_MS)return mix(g.target!,carryAnchor,smooth((time-contact)/CARRY_TRANSITION_MS));
    if(time<=release)return carryAnchor;
    return mix(carryAnchor,neutral,smooth((time-release)/(g.endMs-release)));
  }
  if(g.action==='carry'){
    const contact=g.contactMs!,release=g.releaseMs,source=g.target!,dest=g.destination;
    if(time<contact)return mix(neutral,source,smooth((time-g.startMs)/(contact-g.startMs)));
    if(!enteringCarry(g)&&time<contact+CARRY_TRANSITION_MS)return mix(source,carryAnchor,smooth((time-contact)/CARRY_TRANSITION_MS));
    if(release===undefined)return carryAnchor;
    if(time<release-CARRY_TRANSITION_MS)return carryAnchor;
    if(time<release)return mix(carryAnchor,dest!,smooth((time-release+CARRY_TRANSITION_MS)/CARRY_TRANSITION_MS));
    return mix(dest!,neutral,smooth((time-release)/(g.endMs-release)));
  }
  // A think target owns attention, while the hand owns the thoughtful chin pose.
  const aim=expressiveAim(g,neutral,chin,shoulder);
  if(g.action==='operate'){
    const contact=g.contactMs!,release=recoveryStart(g);
    return time<contact?mix(neutral,aim,smooth((time-g.startMs)/(contact-g.startMs))):time<=release?aim:mix(aim,neutral,smooth((time-release)/(g.endMs-release)));
  }
  const reach=g.contactMs??Math.min(g.endMs-settle,g.startMs+Math.min(320,(g.endMs-g.startMs)*.3));
  const progress=smooth((time-g.startMs)/(reach-g.startMs))*recover;
  if(g.action==='think'){
    // Follow an outward arc in shoulder space. A Cartesian curve can pass
    // almost through the shoulder on custom rigs and spin the IK elbow.
    if(progress===0)return neutral;
    if(progress===1)return chin;
    const start=Math.atan2(neutral.y-shoulder.y,neutral.x-shoulder.x);
    let end=Math.atan2(chin.y-shoulder.y,chin.x-shoulder.x);
    if(side===1){while(end>start)end-=Math.PI*2;}else{while(end<start)end+=Math.PI*2;}
    const angle=lerp(start,end,progress),radius=lerp(distance(shoulder,neutral),distance(shoulder,chin),progress);
    return {x:shoulder.x+Math.cos(angle)*radius,y:shoulder.y+Math.sin(angle)*radius};
  }
  return mix(neutral,aim,progress);
}

/** Rest elbows open away from the torso. Changing the IK pole passes through
 * extension; flipping two bent solutions directly would teleport the elbow. */
function armPose(shoulder:Point,neutral:Point,target:Point,gesture:Gesture|undefined,time:number,upper:number,lower:number,side:'left'|'right',aimAt:(time:number)=>Point,restPole?:number):Chain{
  const restBend=restPole??(side==='right'?1:-1);
  if(!gesture)return solveChain(shoulder,target,upper,lower,restBend);
  const activeBend=gesture.elbowPole==='rest'?restBend:-restBend;
  // Reaching below the shoulder can keep the outward rest elbow. Its fixed
  // pole needs no extension transition because it never changes branch.
  if(activeBend===restBend)return solveChain(shoulder,target,upper,lower,restBend);
  // Carried entry/exit must preserve the established grip at the cut.
  if(enteringCarry(gesture)&&time<gesture.startMs+80||gesture.action==='carry'&&gesture.releaseMs===undefined&&time>=gesture.endMs-80)
    return solveChain(shoulder,target,upper,lower,activeBend);
  const approachEnd=gesture.contactMs??gesture.startMs+(gesture.endMs-gesture.startMs)*.3;
  const enter=Math.min(80,(approachEnd-gesture.startMs)*.3);
  const exit=Math.min(80,(gesture.endMs-recoveryStart(gesture))*.5,(gesture.endMs-gesture.startMs)*.2);
  const dx=neutral.x-shoulder.x,dy=neutral.y-shoulder.y,r=Math.hypot(dx,dy);
  const extended={x:shoulder.x+dx/r*(upper+lower-1e-6),y:shoulder.y+dy/r*(upper+lower-1e-6)};
  let point=target,bend=activeBend;
  if(!enteringCarry(gesture)&&enter>0&&time<gesture.startMs+enter){
    const phase=(time-gesture.startMs)/enter;
    point=phase<.5?mix(neutral,extended,smooth(phase*2)):mix(extended,aimAt(gesture.startMs+enter),smooth((phase-.5)*2));
    bend=phase<.5?restBend:activeBend;
  }else if(exit>0&&time>gesture.endMs-exit){
    const phase=(time-gesture.endMs+exit)/exit;
    point=phase<.5?mix(aimAt(gesture.endMs-exit),extended,smooth(phase*2)):mix(extended,neutral,smooth((phase-.5)*2));
    bend=phase<.5?activeBend:restBend;
  }
  return solveChain(shoulder,point,upper,lower,bend);
}

/** Deterministic gesture-entry body/arm reference. Never selected from the current target or prior frame. */
function expressiveArmReference(plan:PerformancePlan,profile:HostProfile,gesture:Gesture,side:RigHand){
  const {m,s,walk,pelvis,lean,pose,emotion,bodyPosture,bend}=bodyStateAt(plan,profile,gesture.startMs);
  const toWorld=(point:Point)=>add(pelvis,rotate({x:point.x*s,y:point.y*s},lean));
  const shoulder=toWorld(m.shoulders![side]),lengths=m.arms![side],lower=lengths.lower*s+(m.handAttachment?.[side].length??0)*s;
  const restPole=side==='right'?1:-1,sourceRun=plan.walks.some(w=>w.gait==='run'),rest=m.armRest![side];
  const swing=walk.running&&sourceRun?0:Math.sin(walk.phase*Math.PI)*(side==='right'?-1:1)*walk.armSwing*walk.activation;
  let neutral=add(shoulder,rotate({x:rest.x*s,y:rest.y*s},swing+lean)),runningChain:Chain|undefined;
  if(sourceRun&&walk.running){
    const drive=Math.sin(walk.phase*Math.PI)*(side==='right'?-1:1),upperAngle=90-walk.direction*35*drive,lowerAngle=upperAngle-walk.direction*(60+15*drive);
    const base=solveChain({x:0,y:0},{x:rest.x*s,y:rest.y*s},lengths.upper*s,lower,restPole);
    const blend=(from:number,to:number)=>from+(((to-from+180)%360+360)%360-180)*walk.activation;
    const ua=blend(base.upper+90,upperAngle)+lean,la=blend(base.lower+90,lowerAngle)+lean;
    const joint=add(shoulder,rotate({x:lengths.upper*s,y:0},ua)),end=add(joint,rotate({x:lower,y:0},la));
    runningChain={joint,end,upper:ua-90,lower:la-90,reachable:true,error:0};neutral=end;
  }
  const seated=clamp(Object.values(bodyPosture.seatWeights??{}).reduce((sum,weight)=>sum+weight,0));
  const hip=toWorld(m.hips![side]),lap={x:hip.x+bend*m.legs![side].upper*s*.55,y:hip.y+8*s};neutral=mix(neutral,lap,seated);
  const entry=runningChain??solveChain(shoulder,neutral,lengths.upper*s,lower,restPole);
  const entryPose=articulatedPoseFromDirections(entry.upper+90,entry.lower+90);
  const pole=gesture.elbowPole==='reach'?-restPole:gesture.elbowPole==='rest'?restPole:Math.abs(entryPose.elbowDeg)<.0001?restPole:Math.sign(entryPose.elbowDeg);
  const headScale=profile.appearance.headScale*(usesCutoutHead(profile)?profile.appearance.bodyScale:m.headArtworkScale??1);
  const headBottom=(usesCutoutHead(profile)?0:referenceBodyHeadAttachment(profile,'three-quarter-right').y)*headScale;
  const torsoTop=m.torsoTop??-92*profile.appearance.bodyScale;
  const neck=toWorld({x:m.neckX??0,y:usesBodyView(profile)?torsoTop:torsoTop-2*profile.appearance.bodyScale});
  const headAngle=lean+(usesBodyView(profile)?0:pose.tilt*emotion.weight);
  const head=add(neck,rotate({x:0,y:-headBottom*s},headAngle));
  const chin=add(head,rotate(usesCutoutHead(profile)?{x:cutoutHeadChin(profile,side).x*s*headScale,y:cutoutHeadChin(profile,side).y*s*headScale}
    :{x:m.headRadius*.3*s*(side==='left'?-1:1),y:headBottom*.85*s},headAngle));
  const aim=expressiveAim(gesture,neutral,chin,shoulder,lengths.upper*s+lower),active=solveChain(shoulder,aim,lengths.upper*s,lower,pole);
  if(entry.error>.001||active.error>.001)throw new Error('needs-arm-keypose: gesture-entry reference cannot reach its authored grip with fixed lengths');
  return {pole,shoulder:articulatedArmReference(entryPose,articulatedPoseFromDirections(active.upper+90,active.lower+90))};
}
function expressiveSourceArm(shoulder:Point,neutral:Point,aim:Point,gesture:Gesture,time:number,upper:number,lower:number,side:RigHand,reference:ReturnType<typeof expressiveArmReference>,currentRun?:Chain):Chain{
  const rest= currentRun??solveChain(shoulder,neutral,upper,lower,side==='right'?1:-1),active=solveChain(shoulder,aim,upper,lower,reference.pole);
  if(rest.error>.001||active.error>.001)throw new Error('needs-arm-keypose: expressive source pose cannot reach its authored grip with fixed lengths');
  return sampleArticulatedArm(shoulder,upper,lower,articulatedPoseFromDirections(rest.upper+90,rest.lower+90),
    articulatedPoseFromDirections(active.upper+90,active.lower+90),articulatedGestureWindow(gesture),time,reference.shoulder);
}

/** Pure random-access evaluation: no state accumulated from previous frames. */
export function samplePerformance(plan:PerformancePlan,profile:HostProfile,time:number,activity:SpeechActivity):FrameState {
  if(plan.lunge)validateBodyViewLunge(profile);
  validateFixedBodyView(plan,profile);
  if(usesBodyView(profile)&&activity.intervals.length&&!hasBodyViewSpeech(profile))throw new Error('needs-view-voice-animation: authored-view speech requires explicit registered-mouth-v1 candidate');
  const t=clamp(time,0,plan.durationMs),{m,s,root,walk,emotion,pose,air,orientation,bodyPosture,lean,pelvis,bend,kneeSeatWeight}=bodyStateAt(plan,profile,t);
  const transforms:Record<string,string>={},face:FrameState['face']={},hands={} as FrameState['hands'];
  const wrists=m.handAttachment?{} as Record<RigHand,Point>:undefined;
  const paths:Record<string,string>={},drawn=!!profile.appearance.characterVariant;
  const legProjection=usesReferenceBody(profile)?{} as NonNullable<FrameState['legProjection']>:undefined;
  const armProjection={} as NonNullable<FrameState['armProjection']>;
  const armGeometry={} as NonNullable<FrameState['armGeometry']>;
  const spearGeometry={} as NonNullable<FrameState['spearGeometry']>;
  const spearArms:Record<string,Partial<Record<RigHand,Parameters<typeof sourceSpearPairShape>[0]>>>={};
  const sourceRun=usesReferenceBody(profile)&&plan.walks.some(w=>w.gait==='run');
  const kneeProjection=(state:{kneeSeatWeight:number},geometry:ReturnType<typeof legGeometry>,chain:Chain)=>projectSourceKnee(geometry.hip,chain.end,chain.joint,geometry.bones.upper,geometry.bones.lower,state.kneeSeatWeight);
  transforms['ground-shadow']=transform({x:root.x,y:root.y+4},0,air?.shadowScale??1);
  transforms.pelvis=transform(pelvis);transforms.chest=transform(pelvis,lean,s*profile.appearance.bodyScale);
  const toWorld=(x:number,y:number)=>add(pelvis,rotate({x:x*s,y:y*s},lean));
  const spearStates=(plan.spears??[]).map(track=>{
    const point=m.shoulders?.[track.hand],shoulder=toWorld(point?.x??m.shoulderOffset*(track.hand==='left'?-1:1),point?.y??m.shoulderY-m.pelvisY);
    const state=sampleSpear(track,plan.props.find(p=>p.id===track.propId)!,t,s,shoulder,lean);
    if(track.action==='thrust'&&(state.extension<0||state.extension>m.upperArm*s*.6))throw new Error(track.id+': aim must require a forward strike within rig reach');
    const half=(plan.props.find(p=>p.id===track.propId)!.length??120)*s/2,angle=state.angle*Math.PI/180;
    for(const end of [-1,1]){const p={x:state.center.x+end*half*Math.cos(angle),y:state.center.y+end*half*Math.sin(angle)};if(p.x<0||p.x>plan.stage.width||p.y<0||p.y>plan.stage.groundY)throw new Error(track.id+': spear shaft leaves the physical stage');}
    return {track,state};
  });
  const headArtScale=profile.appearance.headScale*(usesCutoutHead(profile)?profile.appearance.bodyScale:m.headArtworkScale??1);
  const headAngle=lean+(usesBodyView(profile)?0:pose.tilt*emotion.weight),headBottom=(usesCutoutHead(profile)?0:usesReferenceBody(profile)?referenceBodyHeadAttachment(profile,'three-quarter-right').y:profile.kind==='mini-robot'?42:40)*headArtScale;
  const torsoTop=m.torsoTop??(profile.kind==='mini-robot'?-94:-92)*profile.appearance.bodyScale;
  const neckStart=toWorld(m.neckX??0,torsoTop);
  const neckEnd=toWorld(m.neckX??0,usesBodyView(profile)?torsoTop:usesReferenceBody(profile)?torsoTop-2*profile.appearance.bodyScale:Math.min(m.headY-m.pelvisY+headBottom,torsoTop-10*profile.appearance.bodyScale));
  if(usesReferenceBody(profile))transforms['neck-art']=transform(neckStart,lean,s*profile.appearance.bodyScale);
  const head=add(neckEnd,rotate({x:0,y:-headBottom*s},headAngle));
  transforms.neck=`translate(${number(neckStart.x)} ${number(neckStart.y)}) rotate(${number(degrees(Math.atan2(neckEnd.y-neckStart.y,neckEnd.x-neckStart.x))-90)}) scale(${number(s)} ${number(distance(neckStart,neckEnd))})`;
  transforms.head=transform(head,headAngle,s*headArtScale);
  transforms['face-orientation']=transform({x:orientation*5,y:0},0,1-Math.abs(orientation)*.1);
  const chinAt=(side:RigHand)=>add(head,rotate(usesCutoutHead(profile)?{x:cutoutHeadChin(profile,side).x*s*headArtScale,y:cutoutHeadChin(profile,side).y*s*headArtScale}:{x:m.headRadius*.3*s*(side==='left'?-1:1),y:(usesReferenceBody(profile)?headBottom*.85:m.headRadius*.875)*s},headAngle));
  const garment=usesReferenceBody(profile)&&!usesBodyView(profile)?referenceGarmentMotion(profile):undefined,lagged=garment?bodyStateAt(plan,profile,Math.max(0,t-garment.lagMs)):undefined;
  const thighAngles:number[]=[];
  const restCloth={} as GarmentRestPose;
  for(const [i,side] of (['left','right'] as const).entries()){
    // One continuous bend branch, including rest, walk entry and recovery.
    const geometry=legGeometry(m,pelvis,walk.feet[side],side,s,profile.appearance.bodyScale,lean),{hip,ankle}=geometry;
    const pole=plan.lunge?.kneePoles[side]??(usesBodyView(profile)?bodyViewFacing(profile)==='left'?-1:1:usesReferenceBody(profile)?sourceKneePole(plan,side,bend):bend);
    const leg=solveChain(hip,ankle,geometry.bones.upper,geometry.bones.lower,pole);
    const projected=legProjection?kneeProjection({kneeSeatWeight},geometry,leg):undefined;
    thighAngles.push(projected?.upper??leg.upper);
    if(leg.error>1)throw new Error(`${plan.id}: ${side} foot cannot reach ground at ${t}ms (${leg.error.toFixed(2)}px)`);
    if(projected){
      transforms[`leg-${side}-upper`]=`translate(${number(hip.x)} ${number(hip.y)}) rotate(${number(projected.upper)}) scale(${number(s)} ${number(s*projected.upperRatio)})`;
      transforms[`leg-${side}-lower`]=`translate(${number(projected.joint.x)} ${number(projected.joint.y)}) rotate(${number(projected.lower)}) scale(${number(s)} ${number(s*projected.lowerRatio)})`;
      legProjection![side]={kneeDepth:projected.depth,upperRatio:projected.upperRatio,lowerRatio:projected.lowerRatio};
    }else{transforms[`leg-${side}-upper`]=transform(hip,leg.upper,s);transforms[`leg-${side}-lower`]=transform(leg.joint,leg.lower,s);}
    if(drawn)paths[`ink-leg-${side}`]=inkLimb(hip,projected?.joint??leg.joint,ankle,usesReferenceBody(profile)?.28:.17);
    transforms[`foot-${side}`]=transform(walk.feet[side],0,s*(usesReferenceBody(profile)?profile.appearance.bodyScale:1));
    if(garment&&lagged){
      const prior=legGeometry(m,lagged.pelvis,lagged.walk.feet[side],side,s,profile.appearance.bodyScale,lagged.lean);
      const lagLeg=solveChain(prior.hip,prior.ankle,prior.bones.upper,prior.bones.lower,sourceKneePole(plan,side,lagged.bend));
      const rest=legGeometry(m,{x:0,y:m.pelvisY*s},{x:m.footOffsets![side]*s,y:0},side,s,profile.appearance.bodyScale);
      const restLeg=solveChain(rest.hip,rest.ankle,rest.bones.upper,rest.bones.lower,pole);
      const priorProjected=kneeProjection(lagged,prior,lagLeg),restProjected=kneeProjection({kneeSeatWeight:0},rest,restLeg);
      const angle=lean+clamp((priorProjected.upper-lagged.lean-restProjected.upper)*garment.follow,-garment.maxRotation,garment.maxRotation);
      transforms[`garment-${side}`]=transform(hip,angle,s*profile.appearance.bodyScale);
      restCloth[side]={hip:{x:m.hips![side].x/profile.appearance.bodyScale,y:m.hips![side].y/profile.appearance.bodyScale},angle:angle-lean};
    }
    const sourceShoulder=m.shoulders?.[side];
    const shoulder=toWorld(sourceShoulder?.x??(i?1:-1)*m.shoulderOffset,sourceShoulder?.y??m.shoulderY-m.pelvisY);
    const swing=walk.running&&sourceRun?0:Math.sin(walk.phase*Math.PI)*(i?-1:1)*walk.armSwing*walk.activation;
    const rest=m.armRest?.[side],lengths=m.arms?.[side]??{upper:m.upperArm,lower:m.lowerArm};
    const handAttachment=m.handAttachment?.[side],handLength=(handAttachment?.length??0)*s,lowerToGrip=lengths.lower*s+handLength;
    let neutral=add(shoulder,rotate({x:(rest?.x??(i?12:-12))*s,y:(rest?.y??(m.upperArm+m.lowerArm-8))*s},swing+(usesReferenceBody(profile)?lean:0)));
    let authoredRun:Chain|undefined;
    if(sourceRun&&walk.running){
      // Drive the upper arm first, then flex the forearm on one continuous
      // branch. Arbitrary symmetric wrist targets lifted the trailing elbow
      // above the shoulder. This pendulum keeps the elbow below the shoulder
      // in torso coordinates; the recovery wrist passes low beside the hip.
      const drive=Math.sin(walk.phase*Math.PI)*(i?-1:1),upperAngle=90-walk.direction*35*drive;
      const lowerAngle=upperAngle-walk.direction*(60+15*drive);
      const restChain=solveChain({x:0,y:0},{x:rest!.x*s,y:rest!.y*s},lengths.upper*s,lowerToGrip,i?1:-1);
      const blendAngle=(from:number,to:number)=>from+(((to-from+180)%360+360)%360-180)*walk.activation;
      const ua=blendAngle(restChain.upper+90,upperAngle)+lean,la=blendAngle(restChain.lower+90,lowerAngle)+lean;
      const joint=add(shoulder,rotate({x:lengths.upper*s,y:0},ua)),end=add(joint,rotate({x:lowerToGrip,y:0},la));
      authoredRun={joint,end,upper:ua-90,lower:la-90,reachable:true,error:0};neutral=end;
    }
    if(usesReferenceBody(profile)){
      const seatedWeight=clamp(Object.values(bodyPosture.seatWeights??{}).reduce((sum,weight)=>sum+weight,0));
      // A listening actor rests its hands on its own lap instead of carrying
      // the standing arm vector down beside a foot. Explicit gestures still
      // own the hand and override this default through the same arm solver.
      const lap={x:hip.x+bend*geometry.bones.upper*.55,y:hip.y+8*s};
      neutral=mix(neutral,lap,seatedWeight);
    }
    const gesture=gestureAt(plan,t,side),chin=chinAt(side);
    const carryAnchor=add(shoulder,rotate({x:(gesture?.carryOffset?.x??(i?50:-50))*s,y:(gesture?.carryOffset?.y??35)*s},lean));
    const spear=spearStates.find(c=>c.track.hand===side||c.track.twoHands);
    const target=spear?(spear.track.hand===side?spear.state.primary:spear.state.secondary):gesture?goal(gesture,neutral,chin,carryAnchor,t,s,shoulder):neutral;
    // Role poles are authored once for the owned shot, not selected again by
    // per-frame target position. Grip geometry still has to open both elbows;
    // a pole flag cannot by itself repair crowding or invent a profile body.
    const sourceGesture=usesReferenceBody(profile)&&gesture?.action==='think'&&!gesture.elbowPole?{...gesture,elbowPole:'rest' as const}:gesture;
    const spearPole=spear?.track.elbowPoles?.[side===spear?.track.hand?'primary':'secondary']??(spear&&spear.track.aim.x>=plan.root.x?-1:1);
    if(spear&&usesReferenceBody(profile)&&!spear.track.elbowPoles)throw new Error(spear.track.id+': needs-arm-pose: source spear requires authored fixed elbow roles');
    const expressiveSource=usesReferenceBody(profile)&&isCurrentAnimation(plan.compilerVersion)&&gesture&&!contacts(gesture);
    const arm=spear?solveChain(shoulder,target,lengths.upper*s,lowerToGrip,spearPole):authoredRun&&!gesture?authoredRun:expressiveSource
      ?expressiveSourceArm(shoulder,neutral,expressiveAim(gesture,neutral,chin,shoulder,lengths.upper*s+lowerToGrip),gesture,t,lengths.upper*s,lowerToGrip,side,expressiveArmReference(plan,profile,gesture,side),authoredRun)
      :armPose(shoulder,neutral,target,sourceGesture,t,lengths.upper*s,lowerToGrip,side,
      at=>goal(gesture!,neutral,chin,carryAnchor,at,s,shoulder));
    // Grip is a rigid continuation of the forearm, not a bone endpoint or a
    // second independently solved contact. This preserves the existing palm
    // contract while making ink/bones stop at the measured source cuff.
    const wrist=handAttachment?mix(arm.joint,arm.end,lengths.lower*s/lowerToGrip):arm.end;
    if(spear&&arm.error>.01)throw new Error(`${spear.track.id}: ${side} hand cannot reach spear grip at ${t}ms (${arm.error.toFixed(2)}px)`);
    if(gesture&&contacts(gesture)&&t>=gesture.contactMs!&&t<=recoveryStart(gesture)&&arm.error>1)throw new Error(`${gesture.id}: hand cannot reach contact at ${t}ms (${arm.error.toFixed(2)}px)`);
    // Frontal candidates use the full planar arm, with no knee-style depth
    // shortening to disguise a folded elbow. Authored depth/profile arms are
    // still pending; the shape guard rejects an unconvincing reachable chain.
    const projectedArm=(spear&&usesReferenceBody(profile)||authoredRun)?{
      joint:arm.joint,depth:0,upperRatio:1,lowerRatio:1,upper:arm.upper,lower:arm.lower,
    }:undefined;
    if(projectedArm){
      transforms[`arm-${side}-upper`]=`translate(${number(shoulder.x)} ${number(shoulder.y)}) rotate(${number(projectedArm.upper)}) scale(${number(s)} ${number(s*projectedArm.upperRatio)})`;
      transforms[`arm-${side}-lower`]=`translate(${number(projectedArm.joint.x)} ${number(projectedArm.joint.y)}) rotate(${number(projectedArm.lower)}) scale(${number(s)} ${number(s*projectedArm.lowerRatio)})`;
      armProjection[side]={elbowDepth:projectedArm.depth,upperRatio:projectedArm.upperRatio,lowerRatio:projectedArm.lowerRatio};
    }else{transforms[`arm-${side}-upper`]=transform(shoulder,arm.upper,s);transforms[`arm-${side}-lower`]=transform(arm.joint,arm.lower,s);}
    if(drawn)paths[`ink-arm-${side}`]=inkLimb(shoulder,projectedArm?.joint??arm.joint,wrist,usesReferenceBody(profile)?.28:.17);
    const forearmAngle=m.handRestRotation?(projectedArm?.lower??arm.lower)-m.handRestRotation[side]:0;
    const handAngle=handAttachment?(projectedArm?.lower??arm.lower)+90-handAttachment.angleDeg:forearmAngle;
    transforms[`hand-${side}`]=transform(arm.end,handAngle,s*(usesReferenceBody(profile)?profile.appearance.bodyScale:1));hands[side]=arm.end;
    if(wrists)wrists[side]=wrist;
    if(usesReferenceBody(profile)){
      const seatedWeight=Object.values(bodyPosture.seatWeights??{}).reduce((sum,w)=>sum+w,0);
      const role:SourceArmRole=spear?(side===spear.track.hand?'spear-front':'spear-rear'):gesture?.action==='think'?'chin':gesture?.action==='point'?'point':gesture?'react':walk.running?'run':seatedWeight>.01?'lap':walk.activation>.01?'walk':'rest';
      armGeometry[side]=sourceArmShape(role,shoulder,projectedArm?.joint??arm.joint,wrist,lengths.upper*s,lengths.lower*s,projectedArm?.depth??0);
      if(spear){
        (spearArms[spear.track.id]??={})[side]={shoulder,elbow:projectedArm?.joint??arm.joint,wrist,grip:arm.end,upper:lengths.upper*s,lower:lengths.lower*s};
      }
    }
  }
  for(const {track,state} of spearStates)if(usesReferenceBody(profile)&&track.twoHands){
    const pair=spearArms[track.id]!,other=track.hand==='left'?'right':'left';
    spearGeometry[track.id]=sourceSpearPairShape(pair[track.hand]!,pair[other]!,state.angle);
  }
  const activeGestures={right:gestureAt(plan,t,'right'),left:gestureAt(plan,t,'left')};
  const activeGesture=activeGestures.right?.target?activeGestures.right:activeGestures.left??activeGestures.right,explicitGaze=plan.gazes.find(g=>t>=g.startMs&&t<g.endMs);
  const gazeOffset=(target:Point)=>{const angle=Math.atan2(target.y-head.y,target.x-head.x);return {x:Math.cos(angle)*3,y:Math.sin(angle)*2};};
  const gazeWeight=(cue:{startMs:number;endMs:number})=>smooth((t-cue.startMs)/140)*smooth((cue.endMs-t)/140);
  let gaze={x:0,y:0};
  if(spearStates[0])gaze=gazeOffset(spearStates[0].track.aim);
  if(activeGesture?.target)gaze=mix(gaze,gazeOffset(activeGesture.target),gazeWeight(activeGesture));
  if(explicitGaze)gaze=mix(gaze,gazeOffset(explicitGaze.target),gazeWeight(explicitGaze));
  if(drawn&&!usesReferenceHead(profile)){
    const view=headViewAt(plan,t),look=explicitGaze??activeGesture;
    const yaw=plan.headView||plan.headTurns?.length?view.yaw:look?.target?lerp(orientation,clamp((look.target.x-head.x)/70,-.85,.85),gazeWeight(look)):orientation;
    face['head-front']={opacity:1-view.back};face['head-back-view']={opacity:view.back};
    face['head-face-plane']={x:yaw*12,scaleX:1-Math.abs(yaw)*.42};
    face['head-fringe']={x:yaw*5,scaleX:1-Math.abs(yaw)*.1};
    face['head-nose']={opacity:0};
    paths['head-contour']=forestHeadContour(yaw);
    transforms['face-orientation']=transform({x:0,y:0});
  }
  const blinkPhase=(t+800+(usesReferenceBody(profile)&&profile.appearance.characterVariant==='karo'?520:0))%3500,blink=blinkPhase<140?Math.sin(Math.PI*blinkPhase/140):0;
  for(const [i,side] of (['left','right'] as const).entries()){
    face[`eye-${side}`]={x:gaze.x,y:gaze.y,scaleY:Math.max(.05,(1-blink)*lerp(1,pose.eyeOpen??1,emotion.weight))};
    face[`brow-${side}`]={y:pose.brow*emotion.weight,rotation:(i?-1:1)*(pose.browAngle??(emotion.mood==='concerned'?12:emotion.mood==='effort'?-12:0))*emotion.weight};
    face[`lid-${side}`]={opacity:pose.lid*emotion.weight};
    if(drawn&&!usesReferenceHead(profile)){const yaw=(face['head-face-plane']!.x??0)/12,far=i===0?Math.max(0,yaw):Math.max(0,-yaw),visible=1-smooth((far-.65)/.35);
      face[`eye-${side}`]!.opacity=visible;face[`brow-${side}`]!.opacity=visible;face[`lid-${side}`]!.opacity=visible*pose.lid*emotion.weight;}
  }
  const speech=activity.intervals.find(a=>t>=a.startMs&&t<a.endMs);
  face['mouth-talk']={opacity:speech?1:1-Math.max(pose.smile,pose.round,pose.frown??0)*emotion.weight,scaleY:speech?1+speech.level*2.3:.2};
  // Reflect the approved mouth curve about its own y=18 anchor. Explicit SVG
  // matrices seek deterministically and preserve the exact existing rig artwork.
  const frown=(pose.frown??0)*emotion.weight;
  face['mouth-smile']={opacity:Math.max(pose.smile,pose.frown??0)*emotion.weight,
    ...([HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION,STORY_ANIMATION_VERSION].includes(plan.compilerVersion)?{attr:{transform:`translate(0 ${number(36*frown)}) scale(1 ${number(1-2*frown)})`}}:{})};
  face['mouth-round']={opacity:pose.round*emotion.weight};
  if(usesReferenceHead(profile)){
    const look=explicitGaze??activeGesture;
    const bodyHead=usesReferenceBody(profile);
    const yaw=plan.headView||plan.headTurns?.length?headViewAt(plan,t).yaw:look?.target?
      (bodyHead?lerp(orientation,clamp((look.target.x-head.x)/70,-1,1),gazeWeight(look)):clamp((look.target.x-head.x)/70,-1,1)):spearStates[0]?clamp((spearStates[0].track.aim.x-head.x)/70,-.65,.65):orientation;
    // The body retains its complete registered source face without inferred
    // yaw. Head-only studies retain their discrete authored views. Independent
    // hair motion and partner-facing body/head artwork are still pending.
    const sourceFace=referenceFaceState({view:referenceHeadViewForYaw(yaw),gaze,blink,
      // Source eyebrows rotate about their own center in SVG's downward Y:
      // angry inner ends move down, worried/sad inner ends move up.
      browY:pose.brow*emotion.weight,browAngle:-(pose.browAngle??0)*emotion.weight,
      eyeOpen:lerp(1,pose.eyeOpen??1,emotion.weight),smile:pose.smile*emotion.weight,
      round:pose.round*emotion.weight,frown:(pose.frown??0)*emotion.weight,speechLevel:speech?.level??null,
      ...(bodyHead?{sourceBody:true}:{})});
    for(const id of Object.keys(face))delete face[id];
    if(hasBodyViewSpeech(profile)){
      const mouth=sampleBodyViewMouth(profile,activity,t);Object.assign(face,mouth.face);Object.assign(paths,mouth.paths);
    }else Object.assign(face,usesBodyView(profile)?{'head-view-front':{opacity:1}}:sourceFace);
    if(usesReferenceBody(profile))for(const side of ['left','right'] as const){
      const cue=activeGestures[side];
      // Use the same physical hand once in either painter slot, never a new
      // offset clone. The slot is chosen for the whole chin gesture so entry
      // and recovery do not teleport an occluded hand between layers.
      face[`hand-${side}-front-slot`]={opacity:cue?.action==='think'?1:0};
      face[`hand-${side}-back-slot`]={opacity:cue?.action==='think'?0:1};
      face[`ink-arm-${side}-front-slot`]={opacity:cue?.action==='think'?1:0};
      face[`ink-arm-${side}-back-slot`]={opacity:cue?.action==='think'?0:1};
    }
    delete transforms['face-orientation'];
  }
  if(usesReferenceBody(profile)&&!usesBodyView(profile)){
    const weight=clamp(Object.values(bodyPosture.seatWeights??{}).reduce((sum,n)=>sum+n,0));
    const flex=Math.abs(thighAngles.reduce((sum,n)=>sum+n,0)/thighAngles.length-lean);
    const folded=smooth((weight-.2)/.35)*smooth((flex-35)/35);
    const hasSeat=[...(plan.entryPosture?[plan.entryPosture]:[]),...(plan.postures??[])].some(p=>p.pose==='seated');
    for(const side of ['left','right'] as const){
      transforms['garment-seated-'+side]=transform(pelvis,lean,s*profile.appearance.bodyScale);
      const chosen=side===(bend===1?'right':'left'),surface=seatedGarmentState(profile,side,hasSeat&&chosen?folded:0,chosen?restCloth:undefined);
      Object.assign(face,surface.face);Object.assign(paths,surface.paths);
      face['garment-fold-'+side]={opacity:chosen?1:0};
      face['garment-standing-'+side]={opacity:0};
    }
  }
  const props:FrameState['props']={},contactErrors:FrameState['contactErrors']={left:0,right:0};let contactError=0;
  for(const prop of plan.props){
    const spear=spearStates.find(c=>c.track.propId===prop.id);
    if(spear){
      const state=spear.state;
      props[prop.id]={point:state.center,attached:true,angle:state.angle,tip:state.tip,phase:state.phase};
      transforms[`prop-${prop.id}`]=transform(state.center,state.angle,s);
      for(const side of ['left','right'] as const)if(side===spear.track.hand||spear.track.twoHands){contactErrors[side]=distance(hands[side],side===spear.track.hand?state.primary:state.secondary);contactError=Math.max(contactError,contactErrors[side]);}
      continue;
    }
    let point=prop.origin,attached=false;
    const offset=prop.gripOffset??{x:0,y:0};
    for(const g of chronological(plan.gestures).filter(g=>attaches(g)&&g.propId===prop.id)){
      if(g.releaseMs!==undefined&&t>=g.releaseMs){
        if(g.action==='drop'){
          // Evaluate the actual hand without prop recursion; no assumed release anchor.
          const bare={...plan,props:[]},release=samplePerformance(bare,profile,g.releaseMs,activity).hands[rigHand(g)];
          const prior=samplePerformance(bare,profile,Math.max(0,g.releaseMs-1),activity).hands[rigHand(g)];
          const releasePoint={x:release.x-offset.x*s,y:release.y-offset.y*s},destination={x:g.destination!.x-offset.x*s,y:g.destination!.y-offset.y*s};
          point=sampleFallingObject({releaseMs:g.releaseMs,landingMs:g.landingMs!,release:releasePoint,destination,velocityY:(release.y-prior.y)*1000,velocityX:(release.x-prior.x)*1000},t);
          if(point.x<0||point.x>plan.stage.width||point.y<0||point.y>plan.stage.groundY)throw new Error(g.id+': falling prop leaves the physical stage');
        }else point={x:g.destination!.x-offset.x*s,y:g.destination!.y-offset.y*s};
        attached=false;
      }
      else if(t>=g.contactMs!){const hand=hands[rigHand(g)];point={x:hand.x-offset.x*s,y:hand.y-offset.y*s};attached=true;}
    }
    props[prop.id]={point,attached};transforms[`prop-${prop.id}`]=transform(point,0,s);
  }
  for(const side of ['left','right'] as const){const gesture=activeGestures[side];
  if(gesture&&contacts(gesture)&&t>=gesture.contactMs!&&t<=recoveryStart(gesture)){
    const sourceShoulder=m.shoulders?.[side];
    const shoulder=toWorld(sourceShoulder?.x??m.shoulderOffset*(side==='left'?-1:1),sourceShoulder?.y??m.shoulderY-m.pelvisY);
    const anchor=add(shoulder,rotate({x:(gesture.carryOffset?.x??(side==='left'?-50:50))*s,y:(gesture.carryOffset?.y??35)*s},lean));
    const expected=(gesture.action==='carry'||gesture.action==='drop')?goal(gesture,hands[side],chinAt(side),anchor,t,s,shoulder):gesture.action==='operate'?gesture.target!:mix(gesture.target!,gesture.destination!,smooth((t-gesture.contactMs!)/(gesture.releaseMs!-gesture.contactMs!)));
    contactErrors[side]=distance(hands[side],expected);contactError=Math.max(contactError,contactErrors[side]);
    if(contactErrors[side]>1)throw new Error(`${gesture.id}: ${side} hand misses contact anchor at ${t}ms (${contactErrors[side].toFixed(2)}px)`);
  }
  }
  const heldSeat=Object.entries(bodyPosture.seatWeights??{}).find(([,weight])=>weight===1)?.[0],seat=plan.supports?.find(s=>s.id===heldSeat);
  const seatOffset=m.seatContactOffset?rotate({x:-bend*m.seatContactOffset.x*s,y:m.seatContactOffset.y*s},lean):{x:0,y:0};
  return {timeMs:t,...(air?{airborne:{phase:air.phase,bodyVelocityY:air.bodyVelocityY}}:{}),root,feet:walk.feet,stance:walk.stance,bodyPosture,...(legProjection?{legProjection}:{}),...(Object.keys(armProjection).length?{armProjection}:{}),...(Object.keys(armGeometry).length?{armGeometry}:{}),...(Object.keys(spearGeometry).length?{spearGeometry}:{}),hands,...(wrists?{wrists}:{}),transforms,...(drawn?{paths}:{}),face,props,mood:emotion.mood,contactError,contactErrors,...(seat?{seatContact:{supportId:seat.id,errorPx:distance(add(pelvis,seatOffset),seat.center)}}:{})};
}

function transformNumbers(value:string):number[] {return value.match(/-?\d+(?:\.\d+)?/g)!.map(Number);}
function unwrapFrame(frame:FrameState,previous:FrameState):FrameState {
  const transforms={...frame.transforms};
  for(const [id,value] of Object.entries(transforms)){
    const prior=previous.transforms[id];if(!prior)continue;
    const angle=transformNumbers(value)[2]!,reference=transformNumbers(prior)[2]!;
    const unwrapped=angle+Math.round((reference-angle)/360)*360;
    transforms[id]=value.replace(/rotate\([^)]*\)/,`rotate(${number(unwrapped)})`);
  }
  return {...frame,transforms};
}
function interpolationGap(a:FrameState,b:FrameState,profile:HostProfile,plan:PerformancePlan):number {
  const m=rigMetrics(profile);let gap=0;
  for(const progress of [.17,.5,.83]){
    const at=(id:string)=>{const x=transformNumbers(a.transforms[id]!),y=transformNumbers(b.transforms[id]!);return x.map((n,i)=>lerp(n,y[i]!,progress));};
    const end=(values:number[],length:number)=>({x:values[0]!-Math.sin(rad(values[2]!))*length*(values[4]??values[3]!),y:values[1]!+Math.cos(rad(values[2]!))*length*(values[4]??values[3]!)});
    const origin=(values:number[])=>({x:values[0]!,y:values[1]!});
    for(const side of ['left','right'] as const){
      for(const part of ['arm','leg']){
        const upper=at(`${part}-${side}-upper`),lower=at(`${part}-${side}-lower`),tip=at(`${part==='arm'?'hand':'foot'}-${side}`);
        const armLengths=m.arms?.[side]??{upper:m.upperArm,lower:m.lowerArm};
        const legLengths=m.legs?.[side]??{upper:m.upperLeg,lower:m.lowerLeg};
        const attachment=part==='arm'?m.handAttachment?.[side]:undefined;
        const offset=attachment?rotate({x:attachment.wristOffset.x*tip[3]!,y:attachment.wristOffset.y*tip[3]!},tip[2]!):undefined;
        const tipPoint=offset?add(origin(tip),offset):part==='leg'&&m.footSoleOffset?{x:tip[0]!,y:tip[1]!-m.footSoleOffset[side]*tip[3]!}:origin(tip);
        gap=Math.max(gap,distance(end(upper,part==='arm'?armLengths.upper:legLengths.upper),origin(lower)),
          distance(end(lower,part==='arm'?armLengths.lower:legLengths.lower),tipPoint));
      }
    }
    // Palm origins and the shaft frame are tweened separately. Connected bones
    // alone cannot bound grip slip during a changing shaft angle. Reconstruct
    // the actual interpolated wood contact and refine using the same gap limit.
    for(const track of plan.spears??[]){
      const prop=plan.props.find(p=>p.id===track.propId)!,tool=at(`prop-${prop.id}`),center=origin(tool);
      for(const side of ['left','right'] as const)if(side===track.hand||track.twoHands){
        const localX=(prop.gripOffset?.x??0)+(side===track.hand?0:track.secondaryOffset);
        const grip=add(center,rotate({x:localX*tool[3]!,y:0},tool[2]!));
        gap=Math.max(gap,distance(grip,origin(at(`hand-${side}`))));
      }
      if(a.props[prop.id]!.phase==='contact'&&b.props[prop.id]!.phase==='contact'){
        const tip=add(center,rotate({x:(prop.length??120)/2*tool[3]!,y:0},tool[2]!));
        gap=Math.max(gap,distance(tip,track.aim));
      }
    }
    const neck=at('neck'),head=at('head'),bottom=(usesCutoutHead(profile)?0:usesReferenceBody(profile)?referenceBodyHeadAttachment(profile,'three-quarter-right').y:profile.kind==='mini-robot'?42:40)*head[3]!;
    gap=Math.max(gap,distance({x:neck[0]!-Math.sin(rad(neck[2]!))*neck[4]!,y:neck[1]!+Math.cos(rad(neck[2]!))*neck[4]!},
      {x:head[0]!-Math.sin(rad(head[2]!))*bottom,y:head[1]!+Math.cos(rad(head[2]!))*bottom}));
  }
  return gap;
}

// Painter ownership changes at authored gesture boundaries, not as a fade
// between duplicate appearances of the same physical arm or hand.
const isPainterSlot=(id:string)=>/^(?:hand|ink-arm)-(?:left|right)-(?:front|back)-slot$/.test(id);

export function compilePerformance(plan:PerformancePlan,profile:HostProfile,activity:SpeechActivity,namespace='') {
  validatePerformance(plan,profile);
  if(hasBodyViewSpeech(profile))validateBodyViewMouthActivity(activity);
  const times=new Set<number>([0,plan.durationMs]);
  for(let ms=0;ms<plan.durationMs;ms+=1000/plan.fps)times.add(Number(ms.toFixed(4)));
  for(const clip of [...plan.gestures,...(plan.spears??[]),...plan.walks,...(plan.jumps??[]),...(plan.turns??[]),...(plan.headTurns??[]),...(plan.postures??[]),...plan.expressions,...plan.gazes,...activity.intervals]){
    for(const at of [clip.startMs,clip.endMs,clip.startMs+140,clip.endMs-140])if(at>=clip.startMs&&at<=clip.endMs)times.add(at);
  }
  if([HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION].includes(plan.compilerVersion))for(const clip of expressionRanges(plan)){
    const window=expressionBlendMs(clip);times.add(clip.startMs+window);times.add(clip.endMs-window);
  }
  for(const jump of plan.jumps??[])for(const at of [jump.startMs,jump.takeoffMs,jump.landingMs,jump.endMs,(jump.takeoffMs+jump.landingMs)/2,jump.startMs+(jump.takeoffMs-jump.startMs)*2/3,jump.landingMs+(jump.endMs-jump.landingMs)/3])for(const near of [at-.01,at,at+.01])times.add(near);
  for(const g of plan.gestures.filter(g=>g.action==='drop')){times.add(g.landingMs!);times.add(g.landingMs!-.01);times.add(g.landingMs!+.01);}
  for(const clip of plan.postures??[])for(const at of [(clip.startMs+clip.endMs)/2,(clip.startMs+clip.endMs)/2-.01,(clip.startMs+clip.endMs)/2+.01])times.add(at);
  for(const g of plan.gestures)for(const at of [g.contactMs,g.releaseMs,recoveryStart(g)])if(at!==undefined){times.add(at);times.add(at-.01);times.add(at+.01);}
  if(usesReferenceBody(profile)&&isCurrentAnimation(plan.compilerVersion))for(const gesture of plan.gestures.filter(g=>!contacts(g))){
    const window=articulatedGestureWindow(gesture);
    for(const at of [window.reachMs,window.recoverMs])for(const near of [at-.01,at,at+.01])times.add(near);
  }
  for(const g of plan.spears??[])for(const at of [g.readyMs,g.contactMs,g.recoverMs])if(at!==undefined)for(const near of [at-.01,at,at+.01])times.add(near);
  for(const g of plan.gestures.filter(g=>g.action==='carry')){
    if(!enteringCarry(g))times.add(g.contactMs!+CARRY_TRANSITION_MS);
    if(g.releaseMs!==undefined)times.add(g.releaseMs-CARRY_TRANSITION_MS);
  }
  for(const walk of plan.walks)for(const step of walkSteps(plan,profile,walk)){
    for(const at of [step.startMs,step.endMs])times.add(at);
    if(usesReferenceBody(profile)||walk.gait==='run')for(const pose of walk.gait==='run'?RUN_POSES:SOURCE_WALK_POSES)times.add(step.startMs+(step.endMs-step.startMs)*pose.phase);
  }
  for(const walk of plan.walks.filter(w=>w.gait==='run')){
    const schedule=runSchedule(walk,rigMetrics(profile),plan.scale,gait(plan,profile,walk.startMs).feet,at=>rootAt(plan,at));
    for(const track of schedule.tracks)for(const clip of track.clips)for(const at of [clip.start,clip.end])times.add(at);
    for(const hop of schedule.hops)for(const at of [hop.startMs,hop.takeoffMs,hop.landingMs,hop.endMs])for(const near of [at-.01,at,at+.01])times.add(near);
  }
  // Audio RMS is a sampled signal: its boundaries are explicit, without blending across silence.
  for(const cue of activity.intervals)for(const at of [cue.startMs,cue.endMs]){times.add(at);times.add(at-.01);}
  if(hasBodyViewSpeech(profile))for(const cue of activity.intervals)for(const at of [cue.startMs+BODY_VIEW_MOUTH_ATTACK_MS,cue.endMs-BODY_VIEW_MOUTH_RELEASE_MS,(cue.startMs+cue.endMs)/2])if(at>=cue.startMs&&at<=cue.endMs)times.add(at);
  const samples=[...new Set([...times].filter(t=>t>=0&&t<=plan.durationMs).map(t=>Number(t.toFixed(4))))].sort((a,b)=>a-b).map(t=>samplePerformance(plan,profile,t,activity));
  const frames:FrameState[]=[samples[0]!];
  const precise=plan.compilerVersion===HUNT_ANIMATION_VERSION||plan.compilerVersion===ANIMATION_VERSION||plan.compilerVersion===AIRBORNE_ANIMATION_VERSION;
  // Bone connectivity alone does not bound a curved brow/eye expression between
  // baked frames. Keep the face close to the same pure evaluator used by preview.
  const faceError=(a:FrameState,b:FrameState):number=>{
    let error=0;
    for(const progress of [.17,.5,.83]){
      const actual=samplePerformance(plan,profile,lerp(a.timeMs,b.timeMs,progress),activity);
      if(usesReferenceBody(profile)&&!usesBodyView(profile))error=Math.max(error,seatedGarmentMatrixError(profile,a.face,b.face,actual.face,progress)*plan.scale*profile.appearance.bodyScale/.2);
      if(usesReferenceBody(profile)&&!usesCutoutHead(profile))error=Math.max(error,headProjectionMatrixError(profile.appearance.characterVariant!,a.face,b.face,actual.face,progress)*plan.scale*profile.appearance.headScale*rigMetrics(profile).headArtworkScale!/.2);
      for(const [id,from] of Object.entries(a.face)){
        // Audio activity is intentionally stepped at its own explicit boundaries.
        if(id==='mouth-talk'||isPainterSlot(id))continue;
        // Authored-view swaps and voice-gated mouth selection are discrete. Eye
        // and brow interpolation is still checked against the pure evaluator.
        if(usesReferenceHead(profile)&&(id.startsWith('head-view-')||id.startsWith('mouth-')))continue;
        const to=b.face[id]!,wanted=actual.face[id]!;
        for(const key of ['opacity','scaleX','scaleY','rotation','x','y'] as const){
          if(from[key]===undefined||to[key]===undefined||wanted[key]===undefined)continue;
          const limit=key==='rotation'||key==='x'||key==='y'?.02:.002;
          error=Math.max(error,Math.abs(lerp(from[key]!,to[key]!,progress)-wanted[key]!)/limit);
        }
      }
    }
    return error;
  };
  const refine=(a:FrameState,raw:FrameState,depth=0):FrameState[]=>{
    const b=unwrapFrame(raw,a),gap=interpolationGap(a,b,profile,plan),face=precise?faceError(a,b):0;
    let curveError=0;
    if(a.paths)for(const progress of [.17,.5,.83]){
      const actual=samplePerformance(plan,profile,lerp(a.timeMs,b.timeMs,progress),activity);
      for(const [id,d] of Object.entries(a.paths)){
        const from=pathCoordinates(d),to=pathCoordinates(b.paths![id]!),wanted=pathCoordinates(actual.paths![id]!);
        curveError=Math.max(curveError,...from.map((n,i)=>Math.abs(lerp(n,to[i]!,progress)-wanted[i]!)));
      }
    }
    if(gap<=.2&&face<=1&&curveError<=.2)return [b];
    const middle=Number(((a.timeMs+b.timeMs)/2).toFixed(4));
    if(depth>=12||middle<=a.timeMs||middle>=b.timeMs)throw new Error(`${plan.id}: needs-animation: interpolation cannot maintain bones/expression near ${middle}ms (${gap.toFixed(2)}px, face error ${face.toFixed(2)})`);
    const left=refine(a,samplePerformance(plan,profile,middle,activity),depth+1);
    return [...left,...refine(left.at(-1)!,raw,depth+1)];
  };
  for(const sample of samples.slice(1))frames.push(...refine(frames.at(-1)!,sample));
  const calls:string[]=[],scope=`[data-composition-id="${plan.id}"]`,selector=(id:string)=>JSON.stringify(`${scope} [id=${JSON.stringify(namespace+id)}]`);
  for(const [i,f] of frames.entries()){
    const at=i?(frames[i-1]!.timeMs/1000):0,interval=i?(f.timeMs-frames[i-1]!.timeMs)/1000:0,
      duration=precise?interval:Number(interval.toFixed(6)),position=precise?at:Number(at.toFixed(6)),method=i?'to':'set';
    for(const [id,value] of Object.entries(f.transforms))if(!i||value!==frames[i-1]!.transforms[id])calls.push(`tl.${method}(${selector(id)},${JSON.stringify({attr:{transform:value},...(i?{duration,ease:'none'}:{immediateRender:true})})},${position});`);
    for(const [id,value] of Object.entries(f.paths??{}))if(!i||value!==frames[i-1]!.paths?.[id])calls.push(`tl.${method}(${selector(id)},${JSON.stringify({attr:{d:value,...(id.startsWith('ink-')?{'stroke-width':profile.appearance.strokeWidth*plan.scale*(usesReferenceBody(profile)?profile.appearance.bodyScale:1)}:{})},...(i?{duration,ease:'none'}:{immediateRender:true})})},${position});`);
    for(const [id,value] of Object.entries(f.face))if(!i||JSON.stringify(value)!==JSON.stringify(frames[i-1]!.face[id])){
      if(!usesReferenceHead(profile)){calls.push(`tl.${method}(${selector(id)},${JSON.stringify({...value,...(i?{duration,ease:'none'}:{immediateRender:true})})},${position});`);continue;}
      const voiceChange=i&&Object.keys(f.face).some(key=>key.startsWith('mouth-talk-')&&f.face[key]!.opacity!==frames[i-1]!.face[key]!.opacity);
      const discrete=isPainterSlot(id)||id.startsWith('head-view-')||id.startsWith('mouth-talk-')||id.startsWith('mouth-')&&voiceChange;
      const attrs={...value.attr,...(value.x!==undefined||value.y!==undefined||value.rotation!==undefined||value.scaleX!==undefined||value.scaleY!==undefined?
        {transform:`translate(${number(value.x??0)} ${number(value.y??0)}) rotate(${number(value.rotation??0)}) scale(${number(value.scaleX??1)} ${number(value.scaleY??1)})`}:{})};
      // SVG matrices are local to the fixed feature anchor. GSAP's CSS transform
      // origin/bounding-box inference cannot displace eyes or move the mouth.
      calls.push(`tl.${discrete?'set':method}(${selector(id)},${JSON.stringify({...(Object.keys(attrs).length?{attr:attrs}:{}),...(value.opacity===undefined?{}:{opacity:value.opacity}),
        ...(i&&!discrete?{duration,ease:'none'}:{immediateRender:!i})})},${discrete?f.timeMs/1000:position});`);
    }
  }
  return {js:calls.join('\n'),frames,report:{compilerVersion:plan.compilerVersion===HUNT_ANIMATION_VERSION?HUNT_ANIMATION_VERSION:plan.compilerVersion===AIRBORNE_ANIMATION_VERSION?AIRBORNE_ANIMATION_VERSION:ANIMATION_VERSION,planHash:hash(plan),profileHash:profile.profileHash,
    durationMs:plan.durationMs,fps:plan.fps,frames:frames.length,maxContactError:Math.max(...frames.map(f=>f.contactError)),
    maxHandContactError:{left:Math.max(...frames.map(f=>f.contactErrors.left)),right:Math.max(...frames.map(f=>f.contactErrors.right))},gestureHands:[...new Set(plan.gestures.map(rigHand))],
    maxInterpolationGapPx:Math.max(...frames.slice(1).map((f,i)=>interpolationGap(frames[i]!,f,profile,plan))),interpolationGapLimitPx:.2,interpolationIncludes:['bones/cuff','spear palms/shared shaft','tip during contact hold'],selectedClips:selectedClips(plan),
    ...(plan.supports?.length?{seatSupports:plan.supports,maxSeatContactErrorPx:Math.max(0,...frames.flatMap(f=>f.seatContact?[f.seatContact.errorPx]:[]))}:{}),
    ...(usesReferenceHead(profile)?{headArtwork:{version:referenceHeadDescription().version,fingerprint:referenceHeadDescription().fingerprint,
      availableViews:usesBodyView(profile)?[registeredBodyView(profile).view]:usesCutoutHead(profile)?['source-orientation']:referenceHeadDescription().views,turnRendering:usesBodyView(profile)?'fixed-authored-body-view-candidate':usesCutoutHead(profile)?'registered-cutout-source-orientation':'stepped-authored-views-with-front',fullBodyReplacement:usesReferenceBody(profile),productionAcceptance:false}}:{}),
    ...(usesReferenceBody(profile)?{bodyArtwork:referenceBodyDescription()}:{}),
    ...(hasBodyViewSpeech(profile)?{bodySpeech:{...bodyViewMouthDescription,actor:profile.appearance.characterVariant,view:profile.appearance.bodyView,
      activityMethod:activity.method,sourceAudioHash:activity.audioHash??null,audioVerified:false,clock:'supplied activity windows in shot-local time; actor ownership validated upstream'}}:{}),
    source:'compiled-fixed-length-bones',synchronization:activity.method,phonemeLipSync:false}};
}
