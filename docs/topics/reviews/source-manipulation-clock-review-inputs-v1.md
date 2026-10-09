# Frozen source-manipulation clock review inputs v1

Source-only partial excerpts. Full original source hashes are metadata; the excerpt is not the full file. No runtime, fixture, geometry, compiler, sampler, renderer, browser/server/audio/video or production approval. Native source binding in the production director is intentionally blocked until sourced model/action/continuity projection is implemented. Full product scope remains arbitrary story/script/WAV, EN primary/VI/JA/KO/external-localTTS/resume/finalQC.

## packages/animation/compiler.ts

Full file SHA256 a8f9709a3baf4550e7a89df86dea1a570dc899e915ca81e1363e793e6ec8340f

Lines 143–158

```ts
}
export function validatePerformance(plan: PerformancePlan, profile:HostProfile):void {
  PerformancePlanSchema.parse(plan);
  if(plan.gazes.some(g=>'actorTarget' in g)&&(!usesBodyView(profile)||!hasBodyViewEyes(profile)&&!hasNativeHeadEyes(profile)))throw new Error('needs-actor-gaze: actor references require the registered native eye/body candidate');
  if(plan.sourceManipulation){
    if(!hasBodyViewManipulation(profile))throw new Error('needs-source-manipulation: select the explicit native manipulation candidate');
    validateManipulationSourcePlan(plan);validatePerformance(manipulationSourcePlan(plan),profile);
  }
  if(plan.sourceBody){validateFixedBodyView(plan,profile);validatePerformance(sourceBodyPlan(plan),profile);}
  validateReferenceHead(profile,[plan.headView,...(plan.headTurns??[]).map(turn=>turn.direction)]);
  if(usesReferenceBody(profile)&&plan.turns?.length)throw new Error('needs-body-view: source body v1 has a fixed authored torso; full body turns require side/rear artwork.');
  if(usesReferenceHead(profile)&&plan.headTurns?.some(turn=>turn.endMs-turn.startMs<280))throw new Error('Reference head turn window must be at least 280ms.');
  if(plan.kind!==profile.kind || plan.leadCharacterId!==profile.id || plan.profileHash!==profile.profileHash) throw new Error('Performance identity/profile mismatch');
  if(Math.abs(plan.root.y-plan.stage.groundY)>1e-6) throw new Error('Performer root must use the ground anchor');
  for(const [name, items] of [['locomotion',plan.walks],['expression',plan.expressions],['gaze',plan.gazes]] as const) overlaps(items,name,plan.durationMs);
  for(const hand of ['left','right'] as const)overlaps(plan.gestures.filter(g=>rigHand(g)===hand),`${hand}-arm gesture`,plan.durationMs);
```

Lines 642–667

```ts
  return solveChain(shoulder,point,upper,lower,bend);
}

/** Deterministic gesture-entry body/arm reference. Never selected from the current target or prior frame. */
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
```

Lines 693–742

```ts
 * palm under the full run/body/head/attention/speech context, never clamp its
 * time to the current cut or invent a release anchor. Props remain immutable. */
function originalManipulationContext(plan:PerformancePlan,clock:ViewActingClock,activity:SpeechActivity,sourceClock?:SpeechSourceClock){
  if(!plan.sourceManipulation)throw new Error('needs-source-manipulation: missing original ownership');
  validateViewActingClock(plan,clock);
  if(activity.intervals.length&&!sourceClock)throw new Error('needs-source-manipulation: original release needs the owned narration activity clock');
  const start=clock.runStartMs,end=clock.runEndMs;
  const full:PerformancePlan={...plan,durationMs:end-start,gazes:projectViewGazes(clock.gazes,start,end),
    gestures:projectViewSourceGestures(clock.gestures,start,end,start,end),expressions:clock.expressions?projectViewExpressions(clock.expressions,start,end):[]};
  return {plan:full,clock:{...clock,startMs:start,endMs:end},sourceClock:sourceClock?{...sourceClock,startMs:start,endMs:end}:undefined,
    activity:sourceClock?projectSpeechActivity(sourceClock.activity,start,end):activity};
}
export function samplePerformance(plan:PerformancePlan,profile:HostProfile,time:number,activity:SpeechActivity,sourceClock?:SpeechSourceClock,actingClock?:ViewActingClock):FrameState {
  return samplePerformanceState(plan,profile,time,activity,sourceClock,actingClock,true);
}
function samplePerformanceState(plan:PerformancePlan,profile:HostProfile,time:number,activity:SpeechActivity,sourceClock:SpeechSourceClock|undefined,actingClock:ViewActingClock|undefined,includeProps:boolean):FrameState {
  if(plan.sourceManipulation){validateManipulationSourcePlan(plan);if(!hasBodyViewManipulation(profile)||!actingClock)throw new Error('needs-source-manipulation: native selection and complete owned clock required');}
  if(plan.lunge)validateBodyViewLunge(profile);
  validateFixedBodyView(plan,profile);
  if(plan.sourceBody&&!actingClock)throw new Error('needs-view-body-phase: source body requires its complete storyboard/run context');
  if(plan.sourceHead&&!actingClock)throw new Error('needs-head-source-phase: source head requires its complete storyboard/run context');
  if(plan.gestures.some(g=>g.sourceSpan)&&!actingClock)throw new Error('needs-view-gesture-phase: source gesture requires its complete storyboard/run context');
  if(actingClock){
    if(!usesBodyView(profile)||!hasNativeHeadBank(profile)&&!hasBodyViewSpeech(profile)&&!hasBodyViewEyes(profile)&&!hasBodyViewLocomotion(profile)&&!hasBodyViewSecondary(profile)&&!hasBodyViewManipulation(profile))throw new Error('needs-view-acting-phase: select a registered native head/mouth/eyes/locomotion/secondary/manipulation candidate');
    if(actingClock.ownerId!==profile.id)throw new Error('needs-view-acting-phase: actor profile mismatch');
    validateViewActingClock(plan,actingClock);
    if((hasBodyViewExpressions(profile)||hasNativeHeadBank(profile))&&!actingClock.expressions)throw new Error('needs-view-expression-phase: selected expressions/head bank need the complete original run track');
    if(sourceClock&&(sourceClock.startMs!==actingClock.startMs||sourceClock.endMs!==actingClock.endMs||sourceClock.ownerId!==actingClock.ownerId))throw new Error('needs-view-acting-phase: speech and acting clocks disagree');
  }
  if((hasBodyViewSpeech(profile)||hasBodyViewEyes(profile))&&sourceClock&&(sourceClock.ownerId!==profile.id||sourceClock.endMs-sourceClock.startMs!==plan.durationMs))throw new Error('needs-speech-phase: source owner or shot span does not match performer');
  if(hasBodyViewEyes(profile)&&sourceClock)validateSpeechSourceClock(activity,sourceClock,profile.id,plan.durationMs);
  if(hasNativeHeadBank(profile)&&(activity.intervals.length||sourceClock?.activity.intervals.length)&&!hasNativeHeadSpeech(profile))throw new Error('needs-head-turn-voice: cell-specific speech artwork is not registered; no silent fallback over supplied narration');
  if(hasNativeHeadSpeech(profile)){validateBodyViewMouthActivity(activity);if(!sourceClock)throw new Error('needs-speech-phase: source-cell speech requires the complete owned narration clock');validateSpeechSourceClock(activity,sourceClock,profile.id,plan.durationMs);}
  if(usesBodyView(profile)&&activity.intervals.length&&!hasBodyViewSpeech(profile)&&!hasNativeHeadSpeech(profile))throw new Error('needs-view-voice-animation: authored-view speech requires an explicit registered mouth candidate');
  if(hasBodyViewManipulation(profile))validateNativeContactBodyClock(plan,actingClock);
  const t=clamp(time,0,plan.durationMs),{physical,m,s,root,walk,emotion,pose,air,orientation,bodyPosture,lean,pelvis,bend,kneeSeatWeight,seatProgress}=bodyStateAt(plan,profile,t,actingClock);
  const propTime=sourceManipulationTime(plan,actingClock,t),propGestures=plan.sourceManipulation?.gestures??plan.gestures;
  const resolvedGesture=(side:RigHand)=>{
    const source=actingClock?sourceViewGestureAt(actingClock.gestures,t+actingClock.startMs,side):undefined,contact=sourceManipulationGestureAt(plan,actingClock,t,side),gesture=source??contact??gestureAt(plan,t,side);
    return {gesture,timeMs:source?t+actingClock!.startMs:contact?propTime:t,entryTimeMs:source?source.startMs-actingClock!.startMs:contact?contact.startMs+plan.sourceManipulation!.startMs-actingClock!.startMs:gesture?.startMs??0};
  };
  const gestureStates={left:resolvedGesture('left'),right:resolvedGesture('right')};
  const transforms:Record<string,string>={},face:FrameState['face']={},hands={} as FrameState['hands'];
  const wrists=m.handAttachment?{} as Record<RigHand,Point>:undefined;
  const paths:Record<string,string>={},drawn=!!profile.appearance.characterVariant;
  const legProjection=usesReferenceBody(profile)?{} as NonNullable<FrameState['legProjection']>:undefined;
  const armProjection={} as NonNullable<FrameState['armProjection']>;
  const armGeometry={} as NonNullable<FrameState['armGeometry']>;
  const spearGeometry={} as NonNullable<FrameState['spearGeometry']>;
  const spearArms:Record<string,Partial<Record<RigHand,Parameters<typeof sourceSpearPairShape>[0]>>>={};
```

Lines 836–856

```ts
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
    if(gesture&&contacts(gesture)&&gestureTime>=gesture.contactMs!&&gestureTime<=recoveryStart(gesture)&&arm.error>1)throw new Error(`${gesture.id}: hand cannot reach contact at ${t}ms (${arm.error.toFixed(2)}px)`);
    // Frontal candidates use the full planar arm, with no knee-style depth
    // shortening to disguise a folded elbow. Authored depth/profile arms are
    // still pending; the shape guard rejects an unconvincing reachable chain.
```

Lines 1030–1086

```ts
  for(const prop of includeProps?performanceProps(plan):[]){
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
    for(const g of chronological(propGestures).filter(g=>attaches(g)&&g.propId===prop.id)){
      if(g.releaseMs!==undefined&&propTime>=g.releaseMs){
        if(g.action==='drop'){
          // Evaluate the actual hand without prop recursion; no assumed release anchor.
          const original=plan.sourceManipulation?originalManipulationContext(plan,actingClock!,activity,sourceClock):{plan,clock:actingClock,activity,sourceClock};
          const release=samplePerformanceState(original.plan,profile,g.releaseMs,original.activity,original.sourceClock,original.clock,false).hands[rigHand(g)];
          const prior=samplePerformanceState(original.plan,profile,Math.max(0,g.releaseMs-1),original.activity,original.sourceClock,original.clock,false).hands[rigHand(g)];
          const releasePoint={x:release.x-offset.x*s,y:release.y-offset.y*s},destination={x:g.destination!.x-offset.x*s,y:g.destination!.y-offset.y*s};
          point=sampleFallingObject({releaseMs:g.releaseMs,landingMs:g.landingMs!,release:releasePoint,destination,velocityY:(release.y-prior.y)*1000,velocityX:(release.x-prior.x)*1000},propTime);
          if(point.x<0||point.x>plan.stage.width||point.y<0||point.y>plan.stage.groundY)throw new Error(g.id+': falling prop leaves the physical stage');
        }else point={x:g.destination!.x-offset.x*s,y:g.destination!.y-offset.y*s};
        attached=false;
      }
      else if(propTime>=g.contactMs!){const hand=hands[rigHand(g)];point={x:hand.x-offset.x*s,y:hand.y-offset.y*s};attached=true;}
    }
    props[prop.id]={point,attached};transforms[`prop-${prop.id}`]=transform(point,0,s);
  }
  // Reuse this physical source palm above its real owned glyph while held.
  // Other arm/hand depth remains unchanged, and release restores that depth.
  if(hasBodyViewManipulation(profile))for(const side of ['left','right'] as const){
    const held=propGestures.some(g=>attaches(g)&&rigHand(g)===side&&g.propId&&props[g.propId]?.attached&&propTime>=g.contactMs!&&
      (g.releaseMs===undefined?propTime<=g.endMs:propTime<g.releaseMs));
    face[`hand-${side}-prop-slot`]={opacity:held?1:0};
    if(held){face[`hand-${side}-front-slot`]={opacity:0};face[`hand-${side}-back-slot`]={opacity:0};}
  }
  for(const side of ['left','right'] as const){const gesture=activeGestures[side],contactTime=gestureStates[side].timeMs;
  if(gesture&&contacts(gesture)&&contactTime>=gesture.contactMs!&&contactTime<=recoveryStart(gesture)){
    const sourceShoulder=m.shoulders?.[side];
    const shoulder=toWorld(sourceShoulder?.x??m.shoulderOffset*(side==='left'?-1:1),sourceShoulder?.y??m.shoulderY-m.pelvisY);
    const anchor=add(shoulder,rotate({x:(gesture.carryOffset?.x??(side==='left'?-50:50))*s,y:(gesture.carryOffset?.y??35)*s},lean));
    const expected=(gesture.action==='carry'||gesture.action==='drop')?goal(gesture,hands[side],chinAt(side),anchor,contactTime,s,shoulder):gesture.action==='operate'?gesture.target!:mix(gesture.target!,gesture.destination!,smooth((contactTime-gesture.contactMs!)/(gesture.releaseMs!-gesture.contactMs!)));
    contactErrors[side]=distance(hands[side],expected);contactError=Math.max(contactError,contactErrors[side]);
    if(contactErrors[side]>1)throw new Error(`${gesture.id}: ${side} hand misses contact anchor at ${t}ms (${contactErrors[side].toFixed(2)}px)`);
  }
  }
  const heldSeat=Object.entries(bodyPosture.seatWeights??{}).find(([,weight])=>weight===1)?.[0],seat=physical.supports?.find(s=>s.id===heldSeat);
  const seatOffset=m.seatContactOffset?rotate({x:-bend*m.seatContactOffset.x*s,y:m.seatContactOffset.y*s},lean):{x:0,y:0};
  return {timeMs:t,...(actorGaze?{actorGaze}:{}),...(air?{airborne:{phase:air.phase,bodyVelocityY:air.bodyVelocityY}}:{}),root,feet:walk.feet,stance:walk.stance,bodyPosture,...(legProjection?{legProjection}:{}),...(Object.keys(armProjection).length?{armProjection}:{}),...(Object.keys(armGeometry).length?{armGeometry}:{}),...(Object.keys(spearGeometry).length?{spearGeometry}:{}),hands,...(wrists?{wrists}:{}),transforms,...(drawn?{paths}:{}),face,props,mood:emotion.mood,contactError,contactErrors,...(seat?{seatContact:{supportId:seat.id,errorPx:distance(add(pelvis,seatOffset),seat.center)}}:{})};
}

function transformNumbers(value:string):number[] {return value.match(/-?\d+(?:\.\d+)?/g)!.map(Number);}
function unwrapFrame(frame:FrameState,previous:FrameState):FrameState {
  const transforms={...frame.transforms};
  for(const [id,value] of Object.entries(transforms)){
    const prior=previous.transforms[id];if(!prior)continue;
    const angle=transformNumbers(value)[2]!,reference=transformNumbers(prior)[2]!;
```

Lines 1144–1160

```ts
  if(actingClock)validateViewActingClock(plan,actingClock);
  const times=new Set<number>([0,plan.durationMs]);
  if(actingClock?.headMotion)for(const global of nativeHeadTrackTimes(actingClock.headMotion))for(const delta of [-.01,0,.01])times.add(global-actingClock.startMs+delta);
  if(plan.sourceManipulation)for(const g of plan.sourceManipulation.gestures){
    const offset=plan.sourceManipulation.startMs-actingClock!.startMs;
    for(const at of [g.startMs,g.contactMs,g.releaseMs,g.landingMs,g.endMs,recoveryStart(g),g.action==='carry'||g.action==='drop'?g.contactMs!+CARRY_TRANSITION_MS:undefined,g.action==='carry'&&g.releaseMs!==undefined?g.releaseMs-CARRY_TRANSITION_MS:undefined])
      if(at!==undefined)for(const delta of [-.01,0,.01])times.add(at+offset+delta);
  }
  const physical=sourceBodyPlan(plan),motionOffset=plan.sourceBody?plan.sourceBody.startMs-actingClock!.startMs:0;
  const addSecondaryTime=(at:number)=>{times.add(at);if(hasBodyViewSecondary(profile)||hasNativeHeadSecondary(profile))for(const delay of SECONDARY_MOTION_DELAYS_MS)times.add(at+delay);};
  const addMotionTime=(at:number)=>{addSecondaryTime(at+motionOffset);if(hasBodyViewLocomotion(profile))times.add(at+motionOffset+VIEW_CLOTH_LAG_MS);};
  for(const at of supportMotionTimes(physical))for(const near of [at-.01,at,at+.01])addMotionTime(near);
  if(plan.sourceBody||hasBodyViewSecondary(profile)||hasNativeHeadSecondary(profile))for(const clip of [...physical.walks,...(physical.jumps??[]),...(physical.postures??[])])for(const at of [clip.startMs,clip.endMs,clip.startMs+140,clip.endMs-140])if(at>=clip.startMs&&at<=clip.endMs)addMotionTime(at);
  for(let ms=0;ms<plan.durationMs;ms+=1000/plan.fps)times.add(Number(ms.toFixed(4)));
  for(const clip of [...plan.gestures,...(plan.spears??[]),...plan.walks,...(plan.jumps??[]),...(plan.turns??[]),...(plan.headTurns??[]),...(plan.postures??[]),...plan.expressions,...plan.gazes,...activity.intervals]){
    for(const at of [clip.startMs,clip.endMs,clip.startMs+140,clip.endMs-140])if(at>=clip.startMs&&at<=clip.endMs)times.add(at);
  }
```

Lines 1294–1305

```ts
    ...(hasBodyViewSecondary(profile)?{bodySecondary:{...nativeSecondaryDescription,actor:profile.appearance.characterVariant,view:profile.appearance.bodyView,
      clock:actingClock?'original continuous actor run; causal head history before camera slice':'shot-local diagnostic head history',sourcePhase:actingClock?viewActingClockDescription(actingClock):null,motionVerified:false,audioVerified:false}}:{}),
    ...(plan.sourceManipulation?{sourceManipulation:{...sourceManipulationDescription,sourceHash:hash(plan.sourceManipulation),offsetMs:plan.sourceManipulation.startMs-actingClock!.startMs,source:plan.sourceManipulation}}:{}),
    ...(hasBodyViewManipulation(profile)?{bodyManipulation:{...nativeManipulationDescription,actor:profile.appearance.characterVariant,view:profile.appearance.bodyView,
      clock:'shot-local contact/release with current original body state; no cross-cut prop clock',contacts:plan.gestures.filter(isNativeContactGesture).map(g=>({id:g.id,hand:rigHand(g),action:g.action,window:nativeContactWindow(g)})),motionVerified:false}}:{}),
    ...(hasBodyViewSeat(profile)?{bodySeat:{...nativeSeatDescription,actor:profile.appearance.characterVariant,view:profile.appearance.bodyView,
      supportTrackHash:hash({supports:physical.supports??[],postures:physical.postures??[],entryPosture:physical.entryPosture??null}),clock:plan.sourceBody?'complete original physical support/body transfer through explicit continuous camera slices':'shot-local physical support transfer',sourceBody:plan.sourceBody??null,motionVerified:false,audioVerified:false}}:{}),
    ...(hasBodyViewLocomotion(profile)?{bodyMotion:{...nativeClothDescription,actor:profile.appearance.characterVariant,view:profile.appearance.bodyView,
      clock:plan.sourceBody?'complete original body tracks through explicitly continuous camera slices':'complete shot-local walk/run/jump/posture; moving cuts require explicit sourceBody',sourceTrackHash:hash(plan.sourceBody??{walks:plan.walks,jumps:plan.jumps??[],postures:plan.postures??[],entryPosture:plan.entryPosture??null}),sourceBody:plan.sourceBody??null,motionVerified:false,audioVerified:false}}:{}),
    source:'compiled-fixed-length-bones',synchronization:activity.method,phonemeLipSync:false}};
}

```

## packages/animation/view-source-body.ts

Full file SHA256 57a34a4593c922c9c66f93fcf767dd8aec5e7f900b91ed815e9fced0852b677e

Lines 7–34

```ts
  const parsed=BodySourceSchema.safeParse(plan.sourceBody);
  if(!parsed.success)throw new Error('needs-view-body-phase: invalid original body source: '+parsed.error.message);
  const source=parsed.data;
  if(!Number.isInteger(plan.durationMs)||plan.durationMs<=0||source.endMs-source.startMs<plan.durationMs)throw new Error('needs-view-body-phase: original body source is shorter than the local plan duration');
  for(const name of ['walks','jumps','postures','supports','props','spears','turns','headTurns'] as const){
    if((plan[name]?.length??0)>0)throw new Error('needs-view-body-phase: source body conflicts with local '+name);
  }
  if(plan.entryPosture!==undefined||plan.lunge!==undefined)throw new Error('needs-view-body-phase: source body conflicts with local entryPosture/lunge');
}

/** Retain the complete original relative tracks for physical validation/sampling. */
export function sourceBodyPlan(plan:PerformancePlan):PerformancePlan{
  if(plan.sourceBody===undefined)return plan;
  validateBodySourcePlan(plan);
  const source=plan.sourceBody;
  return {...plan,sourceBody:undefined,sourceManipulation:undefined,durationMs:source.endMs-source.startMs,
    walks:source.walks,jumps:source.jumps,postures:source.postures,entryPosture:source.entryPosture,supports:source.supports,
    gestures:[],gazes:[],expressions:[]};
}

/** Original physical track start expressed in the participating shot's clock. */
export function bodyTrackOffsetMs(plan:PerformancePlan,shotStartMs:number):number{
  if(!Number.isInteger(shotStartMs)||shotStartMs<0||!Number.isInteger(plan.durationMs)||plan.durationMs<=0||!Number.isInteger(shotStartMs+plan.durationMs))throw new Error('needs-view-body-phase: invalid participating shot span');
  if(plan.sourceBody===undefined)return 0;
  validateBodySourcePlan(plan);
  const source=plan.sourceBody;
  if(shotStartMs<source.startMs||shotStartMs+plan.durationMs>source.endMs)throw new Error('needs-view-body-phase: participating shot is outside its original body source coverage');
  return source.startMs-shotStartMs;
```

## packages/animation/view-acting-clock.ts

Full file SHA256 0ef35a8989470a8333df620517c6a2064215c122a973d4772af47fb8142a4e4c

Lines 14–25

```ts
export const VIEW_GAZE_RAMP_MS=140,VIEW_BREATH_RAMP_MS=200;
export type ViewGaze=z.infer<typeof GazeSchema>;
/** Renderer context only; never changes narration, persisted activity or authored clips. */
export const ViewActingClockSchema=z.object({version:z.literal(VIEW_ACTING_CLOCK_VERSION),ownerId:Id,
  startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),
  runStartMs:z.number().int().nonnegative(),runEndMs:z.number().int().positive(),
  sourceIdentityHash:z.string().regex(/^[a-f0-9]{64}$/),gazes:z.array(GazeSchema),gestures:z.array(ViewSourceGestureSchema),expressions:z.array(ViewExpressionSchema).optional(),bodyMotion:BodySourceSchema.optional(),manipulationMotion:ManipulationSourceSchema.optional(),
  actorTargets:z.array(ViewGazeTargetSchema).max(8).optional(),
  headMotion:NativeHeadTrackSchema.optional(),
}).strict().superRefine((c,ctx)=>{
  if(c.endMs<=c.startMs||c.runStartMs>c.startMs||c.runEndMs<c.endMs)ctx.addIssue({code:'custom',message:'Invalid continuous run/shot span'});
});
```

Lines 48–57

```ts
  const parsed=ViewActingClockSchema.parse(clock),normalized=normalizeViewGazes(parsed.gazes);
  if(clock.ownerId!==plan.leadCharacterId||clock.endMs-clock.startMs!==plan.durationMs)throw new Error('needs-view-acting-phase: actor or shot span mismatch');
  validateViewSourceBody(plan,parsed.bodyMotion,clock.startMs,clock.endMs,clock.runStartMs,clock.runEndMs);
  validateViewSourceManipulation(plan,parsed);
  validateNativeHeadSource(plan,parsed.headMotion,clock.startMs,clock.endMs,clock.runStartMs,clock.runEndMs);
  if(hash(normalized)!==hash(parsed.gazes)||normalized.some(g=>g.startMs<clock.runStartMs||g.endMs>clock.runEndMs))throw new Error('needs-view-acting-phase: source gaze is not a normalized run track');
  if(plan.gazes.some(g=>g.startMs<0||g.endMs>plan.durationMs)||hash(projectViewGazes(normalized,clock.startMs,clock.endMs))!==hash(normalizeViewGazes(plan.gazes)))throw new Error('needs-view-acting-phase: authored gaze differs from source projection');
  if(parsed.expressions){
    const expressions=normalizeViewExpressions(parsed.expressions);
    if(hash(expressions)!==hash(parsed.expressions)||expressions.some(e=>e.startMs<clock.runStartMs||e.endMs>clock.runEndMs))throw new Error('needs-view-expression-phase: source expression is not a normalized run track');
```

Lines 68–76

```ts
    if(pieces.filter(g=>g.sourceSpan!.id===source.id).length!==1)throw new Error('needs-view-gesture-phase: missing/duplicate local source piece');
    if(plan.gestures.some(g=>!g.sourceSpan&&rigHand(g)===source.hand&&g.startMs+clock.startMs<end&&g.endMs+clock.startMs>start))throw new Error('needs-view-gesture-phase: ordinary clip conflicts with the source-owned hand');
  }
}
/** Render consumers require every actor reference to have a verified physical
 * source; the raw binding above is never a fallback for evaluation. */
export function validateViewActingClock(plan:PerformancePlan,clock:ViewActingClock):void{
  validateViewActingClockSource(plan,clock);
  const sources=clock.actorTargets??[],ids=new Set(sources.map(s=>s.actorId));
```

## packages/actors/view-acting-clock.ts

Full file SHA256 62953cbce054fc8c2f4024f783a62cfe5ce134d470c2ee57ab8653a90a3c9bc8

Lines 56–65

```ts
      ...(hasBodyViewSecondary(currentActor.character)||hasNativeHeadSecondary(currentActor.character)?{secondaryLunge:p.lunge??null}:{}),
      ...(hasBodyViewLocomotion(currentActor.character)?{locomotion:{walks:p.walks,jumps:p.jumps??[],postures:p.postures??[],entryPosture:p.entryPosture??null}}:{})};
  };
  const entries=shots.map(entry);
  const linked=(i:number)=>{
    if(i<=0||shots[i]!.cinematic?.actorScene?.continuity!=='continuous')return false;
    const a=entries[i-1],b=entries[i];
    if([a,b].some(e=>e?.secondaryLunge))throw new Error('needs-view-secondary-phase: a shot-local lunge cannot share secondary history across a continuous camera cut; its complete original body/tool track is not registered');
    if([a,b].some(e=>e?.locomotion&&(e.locomotion.walks.length||e.locomotion.jumps.length||e.locomotion.postures.length||e.locomotion.entryPosture)))throw new Error('needs-view-locomotion-cut: shot-local native motion cannot cross a cut; declare the identical complete sourceBody on every shot in the continuous run');
    if(!a||!b||a.endMs!==b.startMs||a.castHash!==b.castHash||a.geometryHash!==b.geometryHash)throw new Error('needs-view-acting-phase: declared continuous native actor changed clock, cast/view or geometry');
```

Lines 77–97

```ts
    gazes:normalizeViewGazes(run.flatMap(e=>e.gazes.map(g=>({...g,startMs:g.startMs+e.startMs,endMs:g.endMs+e.startMs})))),
    gestures:collectViewSourceGestures(run,run[0]!.startMs,run.at(-1)!.endMs),
    ...(bodyMotion?{bodyMotion}:{}),
    ...(manipulationMotion?{manipulationMotion}:{}),
    ...(headMotion?{headMotion}:{}),
    ...(hasBodyViewExpressions(currentActor.character)||hasNativeHeadBank(currentActor.character)?{expressions:normalizeViewExpressions(run.flatMap(e=>(e.expressions??[]).map(expression=>({...expression,startMs:expression.startMs+e.startMs,endMs:expression.endMs+e.startMs}))))}:{})};
  validateViewActingClockSource(currentActor.performance,clock);return clock;
}

/** Resolve complete source actors once without recursively evaluating their
 * attention. A and B may look at one another; neither gaze moves a body. */
export function actorViewActingClock(board:Storyboard,current:Shot,actorId:string):ViewActingClock|undefined{
  const clock=actorViewActingClockSource(board,current,actorId);if(!clock)return undefined;
  const owner=performer(current,actorId)!,references=[...new Set(clock.gazes.flatMap(g=>'actorTarget' in g?[g.actorTarget.id]:[]))];
  if(references.includes(actorId))throw new Error('needs-actor-gaze: actor cannot look at itself');
  if(references.length){
    clock.actorTargets=references.sort().map(id=>{
      const target=performer(current,id);if(!target)throw new Error('needs-actor-gaze: target actor is missing from the current cast');
      const raw=actorViewActingClockSource(board,current,id);
      if(!raw?.expressions)throw new Error('needs-actor-gaze: target needs its complete registered body/eye/expression run');
      if(hash(target.performance.stage)!==hash(owner.performance.stage))throw new Error('needs-actor-gaze: target is in another world/stage');
```

## packages/director/props.ts

Full file SHA256 435610d1391c0dab61a3e08ad8a9dd28f6e010f8502a0c1fcf102a51466bd9e4

Lines 60–66

```ts
export function validatePropBindings(shot:Shot):void{
  const c=shot.cinematic;if(!c)return;
  const performances=[c.performance,...(c.actorScene?.supporting.map(a=>a.performance)??[])];
  if(performances.some(p=>p.sourceManipulation))throw new Error(`${shot.id}: needs-source-prop-binding: original contact clock requires sourced model/action/camera continuity binding; an unbound prop cannot enter production`);
  const declared=performances.flatMap(p=>p.props.map(prop=>prop.id));
  if(new Set(declared).size!==declared.length)throw new Error(`${shot.id}: prop IDs must be unique across the entire visible cast`);
  if(c.propBindings.length!==declared.length)throw new Error(`${shot.id}: every animated prop requires a sourced model binding`);
```

## packages/animation/native-contact-arm.ts

Full file SHA256 c8a44bd1b3365cab8f239b82de3ff8cf886d872fc9fbce5cced2aac02125da27

Lines 68–83

```ts
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
```
