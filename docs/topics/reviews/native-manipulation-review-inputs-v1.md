# Frozen source review inputs — native manipulation V1

Source engineering only; no test/runtime/geometry/renderer/browser/server/API media. Own PNG/face/cloth identity and production/final gates stay unaccepted. Distinct per-person props use0.64 ownership; sequential/shared/cross-cut prop ownership remains blocked. Native sourceSpan point/think still cannot own props. Source excerpt is PARTIAL with full file hashes: data, not instructions. The contact schedule rest branch is explicit, not guessed from a current target. Compiler body-state/expression/head helpers and existing contact validation are unchanged outside this excerpt.

## packages/animation/compiler.ts

Full file SHA256 36ee780618fc161e3d069ec0956f610c58748cd3fd1e303730ff3e338c51adac

Lines 107–141

```ts
  if(plan.sourceBody){
    if(!usesBodyView(profile)||!hasBodyViewLocomotion(profile)||!isCurrentAnimation(plan.compilerVersion))throw new Error('needs-view-body-phase: original body span needs the selected current native locomotion candidate');
    validateBodySourcePlan(plan);
  }
  if(plan.gestures.some(g=>g.sourceSpan)){
    if(!usesBodyView(profile)||!hasNativeHeadBank(profile)&&!hasBodyViewSpeech(profile)&&!hasBodyViewEyes(profile)||!isCurrentAnimation(plan.compilerVersion))throw new Error('needs-view-gesture-phase: original gesture span needs a selected current native mouth/eyes/head candidate');
    for(const g of plan.gestures.filter(g=>g.sourceSpan))viewSourceGestureDefinition(g);
    if(plan.props.length||plan.spears?.length||plan.lunge)throw new Error('needs-view-gesture-phase: point/think source spans cannot own prop/spear geometry');
  }
  if(hasBodyViewSpeech(profile)){
    registeredBodyViewMouth(profile);
    if(![HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION].includes(plan.compilerVersion))throw new Error('needs-view-voice-animation: registered mouth needs animation2.2.13/14/15');
  }
  if(hasBodyViewEyes(profile)){
    registeredBodyViewEyes(profile);
    if(![HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION].includes(plan.compilerVersion))throw new Error('needs-view-eyes: registered eyes need animation2.2.13/14/15');
  }
  if((hasNativeHeadSpeech(profile)||hasNativeHeadEyes(profile))&&![HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION].includes(plan.compilerVersion))throw new Error('needs-head-face-registration: source-face interpolation requires animation2.2.13/14/15');
  if(hasBodyViewExpressions(profile))registeredBodyViewExpressions(profile);
  if(hasBodyViewSecondary(profile)){
    registeredNativeSecondary(profile,registeredBodyView(profile));
    if(![HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION].includes(plan.compilerVersion))throw new Error('needs-view-secondary: registered secondary motion requires animation2.2.13/14/15');
  }
  if(!usesBodyView(profile))return;
  if(hasBodyViewManipulation(profile))validateNativeManipulation(plan,profile,registeredBodyView(profile));
  if(plan.headTurns?.length)throw new Error('needs-head-turn-registration: authored head cells still need continuity repair, source landmarks and original head-clock registration; see /api/topics/prehistoric-life/head-turn-art');
  if(plan.headView!==registeredBodyView(profile).view||plan.turns?.length)throw new Error('needs-body-registration: candidate uses one matching fixed head/body view');
  if(hasBodyViewLocomotion(profile))validateNativeLocomotion(sourceBodyPlan(plan),profile,registeredBodyView(profile));
  else if(plan.walks.length||plan.jumps?.length||plan.supports?.length||plan.postures?.length||plan.entryPosture)throw new Error('needs-view-motion: authored-view cloth/locomotion/seated registration is pending; select registered-locomotion-v1 for the native candidate');
  if(!hasNativeHeadBank(profile)&&plan.expressions.some(e=>e.mood!=='happy')&&!hasBodyViewExpressions(profile))throw new Error('needs-view-expression: authored-view candidate needs explicit registered expressions for non-happy emotions');
  if(plan.gazes.length&&!hasBodyViewEyes(profile)&&!hasNativeHeadEyes(profile))throw new Error('needs-view-gaze: explicit target gaze needs its registered fixed-view or source-cell eyes');
  if(plan.facing!==undefined&&plan.facing!==bodyViewFacing(profile))throw new Error('needs-body-registration: fixed authored artwork cannot portray the opposite body direction');
  if(plan.gestures.some(g=>g.action!=='point'&&g.action!=='think'&&!(hasBodyViewLocomotion(profile)&&g.action==='react')&&!(hasBodyViewManipulation(profile)&&(isNativeContactGesture(g)||g.action==='inspect'))))throw new Error('needs-view-motion: native gesture requires its registered point/think/react or explicit manipulation candidate');
  if(bodyViewFacing(profile)==='left'&&(plan.spears?.length||plan.props.some(p=>p.kind==='spear')))throw new Error('needs-view-tool-pose: left-view spear grip and contact have not been authored');
}
```

Lines 563–595

```ts
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
```

Lines 640–676

```ts
function expressiveArmReference(plan:PerformancePlan,profile:HostProfile,gesture:Gesture,side:RigHand,actingClock?:ViewActingClock,entryTimeMs=gesture.startMs){
  const {m,s,walk,pelvis,lean,pose,emotion,bodyPosture,bend}=bodyStateAt(plan,profile,entryTimeMs,actingClock);
  const toWorld=(point:Point)=>add(pelvis,rotate({x:point.x*s,y:point.y*s},lean));
  const shoulder=toWorld(m.shoulders![side]),lengths=m.arms![side],lower=lengths.lower*s+(m.handAttachment?.[side].length??0)*s;
  const restPole=side==='right'?1:-1,sourceRun=(plan.sourceBody?.walks??plan.walks).some(w=>w.gait==='run'),rest=m.armRest![side];
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
  const chin=add(head,rotate(usesCutoutHead(profile)?{x:sourceChinPoint(plan,profile,entryTimeMs,side,actingClock).x*s*headScale,y:sourceChinPoint(plan,profile,entryTimeMs,side,actingClock).y*s*headScale}
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
```

Lines 801–858

```ts
      // the standing arm vector down beside a foot. Explicit gestures still
      // own the hand and override this default through the same arm solver.
      const lap={x:hip.x+bend*geometry.bones.upper*.55,y:hip.y+8*s};
      neutral=mix(neutral,lap,seatedWeight);
    }
    const {gesture,timeMs:gestureTime,entryTimeMs}=gestureStates[side],chin=chinAt(side);
    const carryAnchor=add(shoulder,rotate({x:(gesture?.carryOffset?.x??(i?50:-50))*s,y:(gesture?.carryOffset?.y??35)*s},lean));
    const spear=spearStates.find(c=>c.track.hand===side||c.track.twoHands);
    const target=spear?(spear.track.hand===side?spear.state.primary:spear.state.secondary):gesture?goal(gesture,neutral,chin,carryAnchor,gestureTime,s,shoulder):neutral;
    // Role poles are authored once for the owned shot, not selected again by
    // per-frame target position. Grip geometry still has to open both elbows;
    // a pole flag cannot by itself repair crowding or invent a profile body.
    const sourceGesture=usesReferenceBody(profile)&&gesture?.action==='think'&&!gesture.elbowPole?{...gesture,elbowPole:'rest' as const}:gesture;
    const spearPole=spear?.track.elbowPoles?.[side===spear?.track.hand?'primary':'secondary']??(spear&&spear.track.aim.x>=plan.root.x?-1:1);
    if(spear&&usesReferenceBody(profile)&&!spear.track.elbowPoles)throw new Error(spear.track.id+': needs-arm-pose: source spear requires authored fixed elbow roles');
    const expressiveSource=usesReferenceBody(profile)&&isCurrentAnimation(plan.compilerVersion)&&gesture&&!contacts(gesture);
    const nativeContact=hasBodyViewManipulation(profile)&&gesture&&isNativeContactGesture(gesture);
    const arm=spear?solveChain(shoulder,target,lengths.upper*s,lowerToGrip,spearPole):authoredRun&&!gesture?authoredRun:nativeContact
      ?sampleNativeContactArm(shoulder,neutral,goal(gesture,neutral,chin,carryAnchor,Math.max(gesture.contactMs!,Math.min(gestureTime,nativeContactWindow(gesture).recoverMs)),s,shoulder),gesture,gestureTime,lengths.upper*s,lowerToGrip,side,expressiveArmReference(plan,profile,gesture,side,actingClock,entryTimeMs),solveChain):expressiveSource
      ?expressiveSourceArm(shoulder,neutral,expressiveAim(gesture,neutral,chin,shoulder,lengths.upper*s+lowerToGrip),gesture,gestureTime,lengths.upper*s,lowerToGrip,side,expressiveArmReference(plan,profile,gesture,side,actingClock,entryTimeMs),authoredRun)
      :armPose(shoulder,neutral,target,sourceGesture,gestureTime,lengths.upper*s,lowerToGrip,side,
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
      const role:SourceArmRole=spear?(side===spear.track.hand?'spear-front':'spear-rear'):gesture?.action==='think'?'chin':gesture?.action==='point'||gesture?.action==='inspect'?'point':nativeContact?'manipulate':gesture?'react':walk.running?'run':seatedWeight>.01?'lap':walk.activation>.01?'walk':'rest';
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
  const activeGestures={right:gestureStates.right.gesture,left:gestureStates.left.gesture};
```

Lines 1255–1262

```ts
    ...(hasBodyViewSecondary(profile)?{bodySecondary:{...nativeSecondaryDescription,actor:profile.appearance.characterVariant,view:profile.appearance.bodyView,
      clock:actingClock?'original continuous actor run; causal head history before camera slice':'shot-local diagnostic head history',sourcePhase:actingClock?viewActingClockDescription(actingClock):null,motionVerified:false,audioVerified:false}}:{}),
    ...(hasBodyViewManipulation(profile)?{bodyManipulation:{...nativeManipulationDescription,actor:profile.appearance.characterVariant,view:profile.appearance.bodyView,
      clock:'shot-local contact/release with current original body state; no cross-cut prop clock',contacts:plan.gestures.filter(isNativeContactGesture).map(g=>({id:g.id,hand:rigHand(g),action:g.action,window:nativeContactWindow(g)})),motionVerified:false}}:{}),
    ...(hasBodyViewSeat(profile)?{bodySeat:{...nativeSeatDescription,actor:profile.appearance.characterVariant,view:profile.appearance.bodyView,
      supportTrackHash:hash({supports:physical.supports??[],postures:physical.postures??[],entryPosture:physical.entryPosture??null}),clock:plan.sourceBody?'complete original physical support/body transfer through explicit continuous camera slices':'shot-local physical support transfer',sourceBody:plan.sourceBody??null,motionVerified:false,audioVerified:false}}:{}),
    ...(hasBodyViewLocomotion(profile)?{bodyMotion:{...nativeClothDescription,actor:profile.appearance.characterVariant,view:profile.appearance.bodyView,
      clock:plan.sourceBody?'complete original body tracks through explicitly continuous camera slices':'complete shot-local walk/run/jump/posture; moving cuts require explicit sourceBody',sourceTrackHash:hash(plan.sourceBody??{walks:plan.walks,jumps:plan.jumps??[],postures:plan.postures??[],entryPosture:plan.entryPosture??null}),sourceBody:plan.sourceBody??null,motionVerified:false,audioVerified:false}}:{}),
```

## packages/host/schemas.ts

Full file SHA256 ce505440d4aaf32bddd7a29fbd70d89438349a49d694a3b044c647fe8d9b8df7

Lines 18–39

```ts
    artworkVersion: z.enum(['forest-head-1','forest-body-1','forest-body-view-1']).optional(),
    bodyView:z.enum(['three-quarter-right','three-quarter-left']).optional(),
    bodyHeadBank:NativeHeadBankSchema.optional(),
    bodySpeech:z.enum(['registered-mouth-v1','registered-rest-mouth-v1']).optional(),bodyEyes:z.literal('registered-eyes-v1').optional(),bodyExpressions:z.literal('registered-expressions-v1').optional(),bodyMotion:z.literal('registered-locomotion-v1').optional(),bodySeat:z.literal('registered-seated-v1').optional(),bodySecondary:z.literal('registered-secondary-v1').optional(),bodyManipulation:z.literal('registered-manipulation-v1').optional(),sourceColour:z.literal('original-rgb-v2').optional() }).strict().superRefine((a,ctx)=>{
      if(a.supportingModel){
        const matchingCostume=a.characterVariant===prehistoricSupportingModel(a.supportingModel).bodyTemplate;
        const legacy=a.artworkVersion==='forest-body-1'&&!a.bodyView&&!a.bodyHeadBank&&!a.bodyMotion&&!a.bodySeat&&!a.bodyManipulation;
        const native=a.artworkVersion==='forest-body-view-1'&&!!a.bodyView&&!!a.bodyHeadBank&&isSupportingNativeHeadVersion(a.bodyHeadBank.version)&&a.bodyHeadBank.actor===a.supportingModel;
        if(!matchingCostume||!legacy&&!native||a.bodySpeech||a.bodyEyes||a.bodyExpressions||a.bodySecondary||a.sourceColour)ctx.addIssue({code:'custom',message:'Supporting model requires its matching source costume and own version 4/5 head; principal/fixed-view face and hair registrations cannot be reused'});
      }
      if(a.artworkVersion==='forest-body-view-1'&&(!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Authored body candidate requires its actor and registered view'});
      if(a.bodyView&&a.artworkVersion!=='forest-body-view-1')ctx.addIssue({code:'custom',message:'bodyView requires the authored body candidate artwork version'});
      if(a.bodyHeadBank&&(a.artworkVersion!=='forest-body-view-1'||!nativeHeadIdentityMatches(a,a.bodyHeadBank.actor)||!a.bodyHeadBank.bodyViews.some(v=>v.view===a.bodyView)||a.bodySpeech||a.bodyEyes||a.bodyExpressions||a.bodySecondary))ctx.addIssue({code:'custom',message:'Head bank requires its actor/body source and independent cell capabilities; fixed-view face/hair overlays cannot be reused'});
      if(a.bodySpeech&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Registered mouth requires its authored actor and body view'});
      if(a.bodyEyes&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Registered eyes require their authored actor and body view'});
      if(a.bodyExpressions&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant||a.bodyEyes!=='registered-eyes-v1'||a.bodySpeech!=='registered-rest-mouth-v1'))ctx.addIssue({code:'custom',message:'Registered expressions require native actor/view, registered eyes and resting speech'});
      if(a.bodyMotion&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Registered locomotion requires its native actor and body view'});
      if(a.bodySeat&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant||a.bodyMotion!=='registered-locomotion-v1'))ctx.addIssue({code:'custom',message:'Registered seating requires its native actor/view and registered locomotion'});
      if(a.bodyManipulation&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Registered manipulation requires its native actor and body view'});
      if(a.bodySecondary&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Registered secondary motion requires its native actor and body view'});
      if(a.sourceColour&&(a.artworkVersion!=='forest-body-1'||!a.characterVariant))ctx.addIssue({code:'custom',message:'Original source colour requires the source body and its actor; authored views are separate artwork'});
    }),
```

## packages/animation/body-view-registration.ts

Full file SHA256 2d35572ef6dee60b782da4a34c15ea1b073d73e3e4e5dd57379a99d68133675d

Lines 1–50

```ts
import {bodyViewClothingContours} from './body-view-contours.js';
import {bodyViewLeftRegistration} from './body-view-left-registration.js';
export const REGISTERED_BODY_VIEWS=['three-quarter-right','three-quarter-left'] as const;
export type RegisteredBodyView=typeof REGISTERED_BODY_VIEWS[number];
export const bodyViewRegistration={
  lila:{view:'three-quarter-right',file:'library/topics/prehistoric-life/body-views/lila-three-quarter-right-v2.png',
    sha256:'c11b0aeddf06e42d0e8363df9167c87fc4a94262606565a0c1bee55c950e43a9',width:1173,height:1341,
    bodyScale:66.8/246,headScale:113.8/428,pelvis:{x:627,y:742},neck:{x:620,y:496},
    shoulders:{left:{x:542,y:509},right:{x:675,y:535}},hips:{left:{x:586,y:754},right:{x:665,y:754}},
    // Source rig-left is anatomical right (bare shoulder); that assignment is
    // retained through this view rather than inferred from screen direction.
    nearHand:'left',farHand:'right',
    clothing:bodyViewClothingContours.lila,inkPad:7,
    headClip:'M0 0H1173V451L815 451L749 507L689 504L635 456L585 456L555 516L540 650L494 753H0Z',
    headBounds:{left:295,right:858,top:60,bottom:753},chin:{left:{x:751,y:429},right:{x:592,y:438}}},
  karo:{view:'three-quarter-right',file:'library/topics/prehistoric-life/body-views/karo-three-quarter-right-v1.png',
    sha256:'eefa90341b6a39138b163c173b3d6072b56c4bed4015bd431345691e8088e182',width:910,height:1729,
    bodyScale:66.2/376,headScale:124/512,pelvis:{x:475,y:983},neck:{x:486,y:607},
    shoulders:{left:{x:365,y:620},right:{x:545,y:661}},hips:{left:{x:422,y:1000},right:{x:525,y:1000}},
    nearHand:'left',farHand:'right',
    clothing:bodyViewClothingContours.karo,inkPad:7,
    headClip:'M0 0H910V558L642 558L601 619L548 635L501 625L457 635L409 617L363 579H0Z',
    headBounds:{left:287,right:710,top:95,bottom:635},chin:{left:{x:622,y:538},right:{x:378,y:551}}},
} as const;
/** Retain bodyViewRegistration[actor] as the existing right-view API. New
 * callers select explicit native artwork; neither view reflects the other. */
export const bodyViewRegistrations={
  lila:{'three-quarter-right':bodyViewRegistration.lila,'three-quarter-left':bodyViewLeftRegistration.lila},
  karo:{'three-quarter-right':bodyViewRegistration.karo,'three-quarter-left':bodyViewLeftRegistration.karo},
} as const;

```

## packages/animation/forest-hand.ts

Full file SHA256 c90de3360f131ff90ba71e8b9eb19bee97fa4365e0fcbfa2752d1993e7afa0d1

Lines 1–26

```ts
import type {RigHand} from '../core/identifiers.js';
import type {Point} from './schemas.js';

/** Candidate landmarks measured in the existing source SVG canvases, NOT the
 * larger PNG pixel grids. A cuff is where the 16–19px arm widens into mitten.
 * Grip lies in the solid palm; the former anchor was closer to a thumb/lobe.
 * Source pixels stay immutable. These measurements are not anatomy approval. */
export const forestHandRegistration={
  lila:{
    left:{wrist:{x:117,y:474},grip:{x:113,y:501},clip:'M82 468H141V548H82Z'},
    right:{wrist:{x:373,y:474},grip:{x:376,y:501},clip:'M344 467H409V549H344Z'},
  },
  karo:{
    left:{wrist:{x:77,y:453},grip:{x:76,y:480},clip:'M49 447H105V522H49Z'},
    right:{wrist:{x:335,y:450},grip:{x:340,y:479},clip:'M314 444H375V522H314Z'},
  },
} as const;

export function forestHandMetrics(actor:keyof typeof forestHandRegistration,unitScale:number,bodyScale:number){
  return Object.fromEntries((['left','right'] as const).map(side=>{
    const {wrist,grip}=forestHandRegistration[actor][side];
    const dx=grip.x-wrist.x,dy=grip.y-wrist.y;
    return [side,{length:Math.hypot(dx,dy)*unitScale*bodyScale,
      angleDeg:Math.atan2(dy,dx)*180/Math.PI,
      // Hand artwork transform already contains bodyScale; do not apply it twice.
      wristOffset:{x:-dx*unitScale,y:-dy*unitScale}}];
```

## packages/topics/body-workbench.ts

Full file SHA256 843f260670f9499b46f0f7e56733b97676eb08c1db1cba30ee7dc9376fba3b87

Lines 97–126

```ts
    plan.gestures=[{id:'point-target',action:'point',hand:gestureHand,startMs:300,endMs:3600,target:{x:210+shoulder.x+(gestureHand==='right'?reach:-reach),y:410+m.pelvisY+shoulder.y+16}}];
  }
  if(action==='think')plan.gestures=[{id:'think-source',action:'think',hand:gestureHand,startMs:300,endMs:3600}];
  if(manipulationActions.includes(action)){
    const shoulder=m.shoulders![gestureHand],chain=m.arms![gestureHand],reach=chain.upper+chain.lower+(m.handAttachment?.[gestureHand].length??0),side=gestureHand==='left'?-1:1;
    const target={x:plan.root.x+shoulder.x+side*reach*.55,y:plan.root.y+m.pelvisY+shoulder.y+reach*.48};
    const direction=selectedView==='three-quarter-left'?-1:1,moved=action==='carry'&&motion===BODY_VIEW_LOCOMOTION_SELECTION?direction*18:0;
    const destination={x:plan.root.x+shoulder.x+moved+side*reach*.72,y:plan.root.y+m.pelvisY+shoulder.y+reach*.35};
    const clip={id:'native-object-'+action,action:action as 'inspect'|'operate'|'pick-place'|'carry'|'drop',hand:gestureHand,elbowPole:'rest' as const,startMs:300,endMs:3700,target};
    if(action==='inspect')plan.gestures=[clip];
    else if(action==='operate')plan.gestures=[{...clip,contactMs:1000,releaseMs:2800}];
    else{
      plan.compilerVersion=HUNT_ANIMATION_VERSION;
      const landing=action==='drop'?{x:destination.x,y:plan.stage.groundY-10}:destination;
      plan.props=[{id:'native-object',origin:target,destination:landing,gripOffset:{x:0,y:0}}];
      plan.gestures=[{...clip,propId:'native-object',contactMs:1000,releaseMs:2800,destination:landing,
        ...(action==='carry'||action==='drop'?{carryOffset:{x:side*reach*.55,y:reach*.42}}:{}),...(action==='drop'?{landingMs:3300}:{})}];
      if(moved)plan.walks=[{startMs:1450,endMs:2350,fromX:plan.root.x,toX:plan.root.x+moved}];
    }
  }
  if(action==='crouch')plan.postures=[{pose:'crouch',intensity:.6,startMs:300,endMs:1000},{pose:'stand',startMs:3000,endMs:3700}];
  if(action==='walk'||action==='walk-left'){delete plan.headView;plan.facing=action==='walk-left'?'left':'right';plan.walks=[{startMs:300,endMs:3600,fromX:210,toX:210+(action==='walk-left'?-55:55)}];}
  if(HUNT_ACTIONS.includes(action))plan.compilerVersion=HUNT_ANIMATION_VERSION;
  if(action==='run'||action==='run-left'||action==='hunt-chase'){
    delete plan.headView;const direction=action==='run-left'?-1:1;
    plan.facing=direction===1?'right':'left';plan.walks=[{startMs:300,endMs:2100,fromX:210,toX:210+direction*100,gait:'run'}];
  }
  if(action==='jump'){
    delete plan.headView;plan.jumps=[{startMs:400,takeoffMs:850,landingMs:1500,endMs:2000,height:24,tuck:.28}];
    plan.gestures=[{id:'jump-arm-response',action:'react',hand:'right',startMs:400,endMs:2000},{id:'jump-left-response',action:'react',hand:'left',startMs:400,endMs:2000}];
```

## packages/topics/cast-appearance.ts

Full file SHA256 be07731452c0c95606e9e061ddab5406bf3a08d3636cc7d4e42ee8d7ad4be14c

Lines 5–10

```ts
export const TOPIC_CAST_NORMALIZATION_VERSION='topic-cast-source-3';
export const TOPIC_RENDER_SELECTION_KEYS=['bodyView','bodyHeadBank','bodySpeech','bodyEyes','bodyExpressions','bodyMotion','bodySeat','bodySecondary','bodyManipulation','sourceColour'] as const;
export const topicCastNormalizationDescription={version:TOPIC_CAST_NORMALIZATION_VERSION,sourceFields:TOPIC_RENDER_SELECTION_KEYS,
  facePaths:{fixedBodyView:'bodySpeech/bodyEyes/bodyExpressions/bodySecondary use that fixed drawing only',independentHead:'bodyHeadBank uses its own registered source-face capabilities; fixed-view facial/hair flags cannot be mixed',sharedBody:'bodyMotion/bodySeat/bodyManipulation may accompany either valid head path'},
  rule:'Preserve explicitly selected valid own-model artwork, source faces, body views and motion controls. Canonical topic palette/proportions/costume remain fixed. Reject foreign or incomplete selections; never silently replace them with a legacy face. Validate the complete unlocked cast before committing any actor changes.',
  approval:'No automatic bank/view/motion selection or production approval; narration IDs/names/roles/source evidence/speaker assignments and clocks remain authoritative.'};
```
