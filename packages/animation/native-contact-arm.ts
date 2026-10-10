import {isBasicBodyView,basicBodyCapabilityError,basicBodyHasUnsupportedOptions} from './body-view-basic-capabilities.js';
import {PROFILE_BODY_MANIPULATION_SELECTION,PROFILE_BODY_MANIPULATION_VERSION,profileManipulationBindings,isProfileManipulationView} from './body-view-profile-manipulation-binding.js';
import {FRONT_BODY_MANIPULATION_SELECTION,FRONT_BODY_MANIPULATION_VERSION,frontManipulationBindings,isFrontManipulationView} from './body-view-front-manipulation-binding.js';
import {bodyFrontRegistration} from './body-view-front-registration.js';
import type {HostProfile} from '../host/schemas.js';
import {hash} from '../core/utils.js';
import {type RigHand} from '../core/identifiers.js';
import {isCurrentAnimation,type Gesture,type PerformancePlan,type Point} from './schemas.js';
import {bodyViewRegistrations,bodyCandidateRegistrations} from './body-view-registration.js';
import {forestHandRegistration,forestHandDescription} from './forest-hand.js';
import {articulatedPoseFromDirections,type ArticulatedArmReference} from './arm-trajectory.js';
import type {ViewActingClock} from './view-acting-clock.js';
import {manipulationSourcePlan} from './view-source-manipulation.js';

export const BODY_VIEW_MANIPULATION_SELECTION='registered-manipulation-v1' as const;
export const NATIVE_CONTACT_ARM_VERSION='native-contact-angle-4' as const;
const contactActions=['operate','pick-place','carry','drop'] as const;
export const isNativeContactGesture=(g:Gesture)=>contactActions.some(action=>action===g.action);
export const hasOwnBodyManipulation=(profile:Pick<HostProfile,'appearance'>)=>profile.appearance.bodyManipulation===PROFILE_BODY_MANIPULATION_SELECTION&&isProfileManipulationView(profile.appearance.bodyView)||profile.appearance.bodyManipulation===FRONT_BODY_MANIPULATION_SELECTION&&isFrontManipulationView(profile.appearance.bodyView);
export const hasBodyViewManipulation=(profile:Pick<HostProfile,'appearance'>)=>profile.appearance.bodyManipulation===BODY_VIEW_MANIPULATION_SELECTION||profile.appearance.bodyManipulation===PROFILE_BODY_MANIPULATION_SELECTION||profile.appearance.bodyManipulation===FRONT_BODY_MANIPULATION_SELECTION;
/** A complete contact clock is still required for a stationary camera run;
 * selecting locomotion is only necessary when original physical tracks exist.
 * Only exact own profile/front modes qualify; the historical helper name is
 * retained for callers. An unregistered fixed view gets no clock capability. */
export function hasStationaryProfileContactSource(plan:PerformancePlan,profile:Pick<HostProfile,'appearance'>){
  const body=plan.sourceBody;
  return hasOwnBodyManipulation(profile)&&!!plan.sourceManipulation&&!!body&&!body.walks.length&&!body.jumps?.length&&!body.postures?.length&&!body.supports?.length&&body.entryPosture===undefined;
}
const handSources={
  lila:{file:'library/topics/prehistoric-life/lila-cutout-v1.png',sha256:'ef8b4a5f1445e0937bb41e661e8dc9de8a8a12a499e2eca87e3367807474d14e',width:939,height:1675,canvas:{width:430,height:766}},
  karo:{file:'library/topics/prehistoric-life/karo-cutout-v1.png',sha256:'f190653ab448f89da80b7156ff7ee677d5788a16dca6126b7796bab3f845b665',width:910,height:1728,canvas:{width:377,height:716}},
} as const;
/** Engineering registration uses the existing own body shoulders, per-side
 * chains and source cuff/palm. It does not invent finger articulation or
 * certify a new texture pose, anatomy or motion. */
export const nativeManipulationBindings={bodyViews:bodyViewRegistrations,hands:handSources,palms:forestHandRegistration};
type NativeSource={view:'front'|'three-quarter-left'|'three-quarter-right'|'left'|'right';sha256:string;width:number;height:number};
export function registeredNativeManipulation(profile:Pick<HostProfile,'appearance'>,source:NativeSource){
  const a=profile.appearance;
  if(isBasicBodyView(a.bodyView)){
    if(!hasOwnBodyManipulation(profile)||!isProfileManipulationView(a.bodyView)&&!isFrontManipulationView(a.bodyView)||basicBodyHasUnsupportedOptions(a)||a.artworkVersion!=='forest-body-view-1'||a.characterVariant!=='lila'&&a.characterVariant!=='karo'||a.sourceColour)throw basicBodyCapabilityError(a.bodyView,'manipulation');
    const own=isFrontManipulationView(a.bodyView)?frontManipulationBindings[a.characterVariant]:profileManipulationBindings[a.characterVariant][a.bodyView],body=isFrontManipulationView(a.bodyView)?bodyFrontRegistration[a.characterVariant]:bodyCandidateRegistrations[a.characterVariant][a.bodyView];
    if(source.view!==a.bodyView||source.sha256!==own.sha256||source.width!==own.width||source.height!==own.height||body.file!==own.file||body.sha256!==own.sha256||body.width!==own.width||body.height!==own.height)throw new Error('needs-view-manipulation: own body source registration differs');
    return {body,hands:handSources[a.characterVariant],palms:forestHandRegistration[a.characterVariant]};
  }
  if(a.bodyManipulation!==BODY_VIEW_MANIPULATION_SELECTION)throw new Error('needs-view-manipulation: legacy detail requires its exact manipulation selection');
  if(!hasBodyViewManipulation(profile)||a.artworkVersion!=='forest-body-view-1'||!a.characterVariant||!a.bodyView||a.sourceColour)
    throw new Error('needs-view-manipulation: select an explicit native actor/view manipulation candidate');
  const binding=bodyViewRegistrations[a.characterVariant][a.bodyView];
  if(source.view!==a.bodyView||source.sha256!==binding.sha256||source.width!==binding.width||source.height!==binding.height)
    throw new Error('needs-view-manipulation: native body source registration differs');
  return {body:binding,hands:handSources[a.characterVariant],palms:forestHandRegistration[a.characterVariant]};
}
export function nativeContactWindow(g:Gesture){
  if(!isNativeContactGesture(g)||g.contactMs===undefined)throw new Error('needs-view-manipulation: an explicit contact clock is required');
  if((g.action==='pick-place'||g.action==='drop')&&(g.releaseMs===undefined||!g.destination)||g.action==='carry'&&g.releaseMs!==undefined&&!g.destination||g.action==='carry'&&g.releaseMs===undefined&&g.destination)
    throw new Error('needs-view-manipulation: placement/drop needs explicit release and destination; owned-exit carry has no destination');
  const recoverMs=g.releaseMs??(g.action==='carry'?g.endMs:g.endMs-Math.min(220,(g.endMs-g.startMs)*.18));
  const ownsExit=g.action==='carry'&&g.releaseMs===undefined;
  const entering=(g.action==='carry'||g.action==='drop')&&g.startMs===0&&g.contactMs===0;
  if(![g.startMs,g.contactMs,recoverMs,g.endMs].every(Number.isFinite)||g.startMs<0||g.contactMs<g.startMs||
    g.contactMs===g.startMs&&!entering||recoverMs<=g.contactMs||recoverMs>g.endMs||!ownsExit&&recoverMs>=g.endMs)
    throw new Error('needs-view-manipulation: invalid approach/contact/release/recovery clock');
  return {startMs:g.startMs,contactMs:g.contactMs,recoverMs,endMs:g.endMs,ownsExit,entering};
}
export function validateNativeManipulation(plan:PerformancePlan,profile:Pick<HostProfile,'appearance'>,source:NativeSource){
  registeredNativeManipulation(profile,source);
  if(!isCurrentAnimation(plan.compilerVersion))throw new Error('needs-view-manipulation: current animation contract required');
  for(const g of plan.gestures.filter(isNativeContactGesture)){
    nativeContactWindow(g);
    if(g.elbowPole!=='rest')throw new Error('needs-view-manipulation: author elbowPole=rest; another contact branch is not registered');
    if(g.sourceSpan)throw new Error('needs-view-manipulation: source point/think timing cannot replace a prop contact clock');
    if(!g.target)throw new Error('needs-view-manipulation: missing sourced hand target');
  }
  if(!plan.sourceBody)validateNativeContactBodyClock(plan);
}

/** Local contact windows must also agree with the actual original body run.
 * sourceBody has global run bounds and relative inner clips, whereas gestures
 * remain local to the current shot. Inspecting only plan.walks/jumps would
 * silently miss movements intentionally stored outside those local arrays. */
export function validateNativeContactBodyClock(plan:PerformancePlan,clock?:ViewActingClock){
  if(plan.sourceBody&&(!clock||clock.ownerId!==plan.leadCharacterId||clock.endMs-clock.startMs!==plan.durationMs||clock.startMs<plan.sourceBody.startMs||clock.endMs>plan.sourceBody.endMs))
    throw new Error('needs-view-manipulation: original body contact needs its complete owned shot clock');
  if(plan.sourceManipulation)validateNativeContactBodyClock(manipulationSourcePlan(plan));
  const body=plan.sourceBody,offset=body?body.startMs-clock!.startMs:0;
  for(const g of plan.gestures.filter(isNativeContactGesture)){
    const window=nativeContactWindow(g),lift=window.entering?0:250,lower=window.ownsExit?0:250;
    const overlaps=(clip:{startMs:number;endMs:number})=>clip.startMs+offset<g.endMs&&clip.endMs+offset>g.startMs;
    for(const walk of (body?.walks??plan.walks).filter(overlaps)){
      if(g.action!=='carry')throw new Error('needs-view-manipulation: actual body locomotion requires carry ownership, not fixed-world contact/placement/drop');
      if(walk.startMs+offset<window.contactMs+lift||walk.endMs+offset>window.recoverMs-lower)
        throw new Error('needs-view-manipulation: actual body carry locomotion must fit after lift and before lowering');
    }
    for(const jump of (body?.jumps??plan.jumps??[]).filter(overlaps)){
      if(g.action==='operate'||g.action==='pick-place')throw new Error('needs-view-manipulation: actual jump overlaps fixed-world contact/placement');
      if(jump.startMs+offset<window.contactMs+lift||g.action==='carry'&&!window.ownsExit&&jump.endMs+offset>window.recoverMs-250)
        throw new Error('needs-view-manipulation: actual jump must follow established grip ownership and precede carry lowering');
    }
  }
}

export type NativeContactChain={joint:Point;end:Point;upper:number;lower:number;reachable:boolean;error:number};
type Solver=(start:Point,target:Point,upper:number,lower:number,bend:number)=>NativeContactChain;
type Reference={pole:number;restPole?:number;shoulder:ArticulatedArmReference};
const wrap=(v:number)=>Math.atan2(Math.sin(v*Math.PI/180),Math.cos(v*Math.PI/180))*180/Math.PI;
const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*t*(t*(t*6-15)+10);};
/** C2 angular approach/recovery; the owned phase reaches the actual moving
 * grip exactly. One deterministic entry branch, fixed lengths and rigid palm
 * continuation replace Cartesian approach through the shoulder and the old
 * 80ms pole flip. No contact target is clamped, shifted or stretched. */
export function sampleNativeContactArm(shoulder:Point,neutral:Point,activeTarget:Point,gesture:Gesture,timeMs:number,
  upper:number,lower:number,hand:RigHand,reference:Reference,solve:Solver):NativeContactChain{
  // The compiler supplies the exact own-view authored rest branch. Legacy
  // callers without it retain their existing per-hand branch; neither branch
  // is inferred from a moving target or flipped during approach/contact.
  const w=nativeContactWindow(gesture),restPole=reference.restPole??(hand==='right'?1:-1);
  if((restPole!==-1&&restPole!==1)||gesture.elbowPole!=='rest'||reference.pole!==restPole)throw new Error('needs-view-manipulation: contact elbow branch changed');
  if(![shoulder.x,shoulder.y,neutral.x,neutral.y,activeTarget.x,activeTarget.y,timeMs,upper,lower,reference.shoulder.shoulderArcDeg].every(Number.isFinite)||
    upper<=1e-6||lower<=1e-6||upper>1e6||lower>1e6||[shoulder.x,shoulder.y,neutral.x,neutral.y,activeTarget.x,activeTarget.y].some(v=>Math.abs(v)>1e6)||
    Math.abs(reference.shoulder.shoulderArcDeg)>180)throw new Error('needs-view-manipulation: invalid fixed-chain geometry');
  const rest=solve(shoulder,neutral,upper,lower,restPole),active=solve(shoulder,activeTarget,upper,lower,reference.pole);
  if(!rest.reachable||!active.reachable||rest.error>.001||active.error>.001)
    throw new Error('needs-view-manipulation: fixed source arm cannot reach its authored palm');
  const r=articulatedPoseFromDirections(rest.upper+90,rest.lower+90),a=articulatedPoseFromDirections(active.upper+90,active.lower+90);
  const drift=wrap(a.shoulderDeg-r.shoulderDeg-reference.shoulder.shoulderArcDeg);
  if(Math.abs(drift)>90)throw new Error('needs-view-manipulation: moving contact leaves the entry shoulder branch corridor');
  const weight=timeMs<=w.startMs&&!w.entering||timeMs>=w.endMs&&!w.ownsExit?0:timeMs<w.contactMs
    ?ease((timeMs-w.startMs)/(w.contactMs-w.startMs)):timeMs>w.recoverMs&&!w.ownsExit
      ?1-ease((timeMs-w.recoverMs)/(w.endMs-w.recoverMs)):1;
  const ua=r.shoulderDeg+(reference.shoulder.shoulderArcDeg+drift)*weight,la=ua+r.elbowDeg+(a.elbowDeg-r.elbowDeg)*weight;
  const point=(start:Point,length:number,angle:number)=>({x:start.x+Math.cos(angle*Math.PI/180)*length,y:start.y+Math.sin(angle*Math.PI/180)*length});
  const joint=point(shoulder,upper,ua),end=point(joint,lower,la);
  const error=weight===1?Math.hypot(end.x-activeTarget.x,end.y-activeTarget.y):0;
  if(error>.001)throw new Error('needs-view-manipulation: owned hand lost its exact grip');
  return {joint,end,upper:ua-90,lower:la-90,reachable:true,error};
}
export const nativeManipulationDescription={version:NATIVE_CONTACT_ARM_VERSION,selection:BODY_VIEW_MANIPULATION_SELECTION,
  selections:[BODY_VIEW_MANIPULATION_SELECTION,PROFILE_BODY_MANIPULATION_SELECTION,FRONT_BODY_MANIPULATION_SELECTION],
  ownFront:{version:FRONT_BODY_MANIPULATION_VERSION,selection:FRONT_BODY_MANIPULATION_SELECTION,bindings:frontManipulationBindings,sourceCount:2,views:['front'],coordinateAuthority:'own authored frontal body shoulders/rest/depth; canonical same-person cuff/palm/bones reused; not accepted anatomy/art',locomotion:'separate registered-front-motion-v1 and explicit lateral sidestep for actual original body travel; stationary contact does not auto-select motion',sourceContact:'explicit identical complete sourceManipulation plus sourceBody on each continuous camera slice',profileManipulation:false,rearManipulation:false,forwardWalking:false,depthTravel:false,spear:false,seat:false,handoff:false,headBank:false,supportingModel:false,continuousTurns:false,approved:false,artApproved:false,motionVerified:false,productionReady:false,productionRig:null,availableBanks:[]},
  ownProfile:{version:PROFILE_BODY_MANIPULATION_VERSION,selection:PROFILE_BODY_MANIPULATION_SELECTION,bindings:profileManipulationBindings,sourceCount:4,views:['left','right'],coordinateAuthority:'own authored body shoulders/rest/depth; canonical same-person cuff/palm/bones reused; not accepted anatomy/art',locomotion:'separate registered-profile-locomotion-v1 for actual original body tracks; stationary contact does not auto-select motion',sourceContact:'explicit identical complete sourceManipulation plus sourceBody on each continuous camera slice',frontManipulation:false,rearManipulation:false,spear:false,seat:false,handoff:false,headBank:false,supportingModel:false,continuousTurns:false,approved:false,artApproved:false,motionVerified:false,productionReady:false,productionRig:null,availableBanks:[]},
  fingerprint:hash({version:NATIVE_CONTACT_ARM_VERSION,bindings:nativeManipulationBindings,profileManipulationBindings,frontManipulationBindings,handContract:forestHandDescription,branch:'explicit-own-authored-rest-entry; legacy per-hand default unchanged',approach:'quintic-angular',corridorDeg:90,bodyClock:'original body run/shot offset; same lift/lower/jump ownership rules',sourceContactClock:'native-source-manipulation-1; unchanged full history and actual original release palm',painter:'one stepped own palm slot after actual prop glyph',shapeFlexionDeg:125,contactTolerancePx:.001}),
  bindings:nativeManipulationBindings,supported:['inspect','operate','pick-place','carry','drop'],
  contract:'Explicit own native body/view; each per-side source cuff/palm and fixed chain retained. elbowPole=rest is required for contact. C2 angle approach/recovery; the owned phase follows the real world/body-relative grip with fixed lengths. Shape limits and exact contact still apply. Body movement requires its own separately selected motion/seat capability; frontal travel is explicit lateral sidestep.',
  scope:'single-person shot-local contact or explicitly owned complete original sourceManipulation with matching sourceBody; bound story models retain complete action/target/source obligations',
  limitations:['unapproved anatomy, silhouette, grip/ink/painter, smoothness and real film quality','no articulated fingers, wrist flexion or newly painted pinch grip','no new spear stance or profile spear; no shared/sequential/cross-person handoff; cuts need identical complete sourceManipulation/sourceBody and actor clock','identity/art/voice/source/final acceptance remains separate'],
  approved:false,productionReady:false,motionVerified:false};
