# Source-face compiler excerpts — parent final record

Data only. Final file SHA256 37ab0f82e801c30c9fb92eedf996662d138834456dcf232847258af7063f379b. Reviewers saw narrower snapshots whose SHA is bound in proposal report, not this final file. First snapshot omitted matrix-error line1149; second omitted the following ALL-path refinement loop. Final excerpt includes both. Parent verified these claims against source; no execution. Parent only added parentheses to the tolerance test after review, preserving operator semantics.

## packages/animation/compiler.ts:108–144

~~~ts
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
  if(plan.headTurns?.length)throw new Error('needs-head-turn-registration: authored head cells still need continuity repair, source landmarks and original head-clock registration; see /api/topics/prehistoric-life/head-turn-art');
  if(plan.headView!==registeredBodyView(profile).view||plan.turns?.length)throw new Error('needs-body-registration: candidate uses one matching fixed head/body view');
  if(hasBodyViewLocomotion(profile))validateNativeLocomotion(sourceBodyPlan(plan),profile,registeredBodyView(profile));
  else if(plan.walks.length||plan.jumps?.length||plan.supports?.length||plan.postures?.length||plan.entryPosture)throw new Error('needs-view-motion: authored-view cloth/locomotion/seated registration is pending; select registered-locomotion-v1 for the native candidate');
  if(!hasNativeHeadBank(profile)&&plan.expressions.some(e=>e.mood!=='happy')&&!hasBodyViewExpressions(profile))throw new Error('needs-view-expression: authored-view candidate needs explicit registered expressions for non-happy emotions');
  if(plan.gazes.length&&!hasBodyViewEyes(profile)&&!hasNativeHeadEyes(profile))throw new Error('needs-view-gaze: explicit target gaze needs its registered fixed-view or source-cell eyes');
  if(plan.facing!==undefined&&plan.facing!==bodyViewFacing(profile))throw new Error('needs-body-registration: fixed authored artwork cannot portray the opposite body direction');
  if(plan.gestures.some(g=>g.action!=='point'&&g.action!=='think'&&!(hasBodyViewLocomotion(profile)&&g.action==='react')))throw new Error('needs-view-motion: native gesture has no registered point/think/react candidate');
  if(bodyViewFacing(profile)==='left'&&(plan.spears?.length||plan.props.some(p=>p.kind==='spear')))throw new Error('needs-view-tool-pose: left-view spear grip and contact have not been authored');
}
export function validatePerformance(plan: PerformancePlan, profile:HostProfile):void {
  PerformancePlanSchema.parse(plan);
  if(plan.gazes.some(g=>'actorTarget' in g)&&(!usesBodyView(profile)||!hasBodyViewEyes(profile)&&!hasNativeHeadEyes(profile)))throw new Error('needs-actor-gaze: actor references require the registered native eye/body candidate');
  if(plan.sourceBody){validateFixedBodyView(plan,profile);validatePerformance(sourceBodyPlan(plan),profile);}
  validateReferenceHead(profile,[plan.headView,...(plan.headTurns??[]).map(turn=>turn.direction)]);
  if(usesReferenceBody(profile)&&plan.turns?.length)throw new Error('needs-body-view: source body v1 has a fixed authored torso; full body turns require side/rear artwork.');
  if(usesReferenceHead(profile)&&plan.headTurns?.some(turn=>turn.endMs-turn.startMs<280))throw new Error('Reference head turn window must be at least 280ms.');
  if(plan.kind!==profile.kind || plan.leadCharacterId!==profile.id || plan.profileHash!==profile.profileHash) throw new Error('Performance identity/profile mismatch');
  if(Math.abs(plan.root.y-plan.stage.groundY)>1e-6) throw new Error('Performer root must use the ground anchor');
  for(const [name, items] of [['locomotion',plan.walks],['expression',plan.expressions],['gaze',plan.gazes]] as const) overlaps(items,name,plan.durationMs);
~~~

## packages/animation/compiler.ts:686–701

~~~ts
    if(!usesBodyView(profile)||!hasNativeHeadBank(profile)&&!hasBodyViewSpeech(profile)&&!hasBodyViewEyes(profile)&&!hasBodyViewLocomotion(profile)&&!hasBodyViewSecondary(profile))throw new Error('needs-view-acting-phase: select a registered native head/mouth/eyes/locomotion/secondary candidate');
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
  const t=clamp(time,0,plan.durationMs),{physical,m,s,root,walk,emotion,pose,air,orientation,bodyPosture,lean,pelvis,bend,kneeSeatWeight,seatProgress}=bodyStateAt(plan,profile,t,actingClock);
  const resolvedGesture=(side:RigHand)=>{
    const source=actingClock?sourceViewGestureAt(actingClock.gestures,t+actingClock.startMs,side):undefined,gesture=source??gestureAt(plan,t,side);
    return {gesture,timeMs:source?t+actingClock!.startMs:t,entryTimeMs:source?source.startMs-actingClock!.startMs:gesture?.startMs??0};
  };
~~~

## packages/animation/compiler.ts:895–916

~~~ts
  face['mouth-round']={opacity:pose.round*emotion.weight};
  if(usesReferenceHead(profile)){
    if(hasNativeHeadBank(profile)){
      const {bank,cell}=nativeHeadBankCell(plan,profile,t,actingClock);
      for(const id of Object.keys(face))delete face[id];
      Object.assign(face,nativeHeadBankFace(bank,cell.id));
      if(bank.capabilities.speech&&bank.capabilities.directionalEyes){
        const origin=nativeEyeOrigin(profile,headState,s,{plan,timeMs:t,clock:actingClock!});
        const direction=(target:Point)=>{const local=rotate({x:target.x-origin.x,y:target.y-origin.y},-headAngle),length=Math.hypot(local.x,local.y);return length?{x:local.x/length,y:local.y/length}:{x:0,y:0};};
        let look={x:0,y:0};if(spearStates[0])look=direction(spearStates[0].track.aim);if(activeGesture?.target)look=mix(look,direction(activeGesture.target),activeGestureWeight);
        if(explicitGaze){const to=direction(explicitGaze.target),forward=registeredBodyView(profile).view==='three-quarter-left'?-1:1;if(to.x*forward<-.01)throw new Error('needs-head-turn-eyes: target is behind the registered source/body view');look=mix(look,to,explicitGazeWeight(explicitGaze));}
        const state=nativeHeadBankFacialState(bank,{aperture:bodyViewMouthLevel(activity,t,sourceClock),blink,look});Object.assign(face,state.face);Object.assign(paths,state.paths);
      }
    }else{
    const look=explicitGaze??activeGesture;
    const bodyHead=usesReferenceBody(profile);
    const yaw=plan.headView||plan.headTurns?.length?headViewAt(plan,t).yaw:look?.target?
      (bodyHead?lerp(orientation,clamp((look.target.x-head.x)/70,-1,1),gazeWeight(look)):clamp((look.target.x-head.x)/70,-1,1)):spearStates[0]?clamp((spearStates[0].track.aim.x-head.x)/70,-.65,.65):orientation;
    // The body retains its complete registered source face without inferred
    // yaw. Head-only studies retain their discrete authored views. Independent
    // hair motion and partner-facing body/head artwork are still pending.
    const sourceFace=referenceFaceState({view:referenceHeadViewForYaw(yaw),gaze,blink,
~~~

## packages/animation/compiler.ts:1119–1182

~~~ts
    for(const track of schedule.tracks)for(const clip of track.clips)for(const at of [clip.start,clip.end])addMotionTime(at);
    for(const hop of schedule.hops)for(const at of [hop.startMs,hop.takeoffMs,hop.landingMs,hop.endMs])for(const near of [at-.01,at,at+.01])addMotionTime(near);
  }
  // Audio RMS is a sampled signal: its boundaries are explicit, without blending across silence.
  for(const cue of activity.intervals)for(const at of [cue.startMs,cue.endMs]){times.add(at);times.add(at-.01);}
  if(hasBodyViewSpeech(profile)||hasNativeHeadSpeech(profile))for(const cue of activity.intervals)for(const at of [cue.startMs+BODY_VIEW_MOUTH_ATTACK_MS,cue.endMs-BODY_VIEW_MOUTH_RELEASE_MS,(cue.startMs+cue.endMs)/2])if(at>=cue.startMs&&at<=cue.endMs)times.add(at);
  if((hasBodyViewSpeech(profile)||hasNativeHeadSpeech(profile))&&sourceClock)for(const cue of sourceClock.activity.intervals)for(const at of [cue.startMs,cue.endMs,cue.startMs+BODY_VIEW_MOUTH_ATTACK_MS,cue.endMs-BODY_VIEW_MOUTH_RELEASE_MS,(cue.startMs+cue.endMs)/2])times.add(at-sourceClock.startMs);
  if(hasBodyViewEyes(profile)||hasNativeHeadEyes(profile)){
    const offset=sourceClock?.startMs??actingClock?.startMs??0,phase=800+(profile.appearance.characterVariant==='karo'?520:0);
    for(let start=Math.floor((offset+phase)/3500)*3500-phase-offset;start<=plan.durationMs;start+=3500)for(const at of [start,start+35,start+70,start+105,start+140])times.add(at);
    for(const g of plan.gazes)for(const at of [g.startMs+140,g.endMs-140])times.add(at);
  }
  if(actingClock){
    for(const source of actingClock.actorTargets??[])for(const at of viewGazeTargetTimes(source))for(const delta of [-.01,0,.01])times.add(at+delta-actingClock.startMs);
    if(hasBodyViewExpressions(profile)||hasNativeHeadBank(profile))for(const clip of actingClock.expressions??[]){const window=expressionBlendMs(clip);for(const at of [clip.startMs,clip.startMs+window,clip.endMs-window,clip.endMs])addSecondaryTime(at-actingClock.startMs);}
    for(const g of actingClock.gestures)for(const at of [g.startMs,g.reachMs,g.recoverMs,g.endMs])for(const near of [at-.01,at,at+.01])times.add(near-actingClock.startMs);
    for(const g of actingClock.gazes)for(const at of [g.startMs,g.startMs+VIEW_GAZE_RAMP_MS,g.endMs-VIEW_GAZE_RAMP_MS,g.endMs])times.add(at-actingClock.startMs);
    for(const at of [actingClock.runStartMs,actingClock.runStartMs+VIEW_BREATH_RAMP_MS,actingClock.runEndMs-VIEW_BREATH_RAMP_MS,actingClock.runEndMs])addSecondaryTime(at-actingClock.startMs);
  }
  const frameAt=(t:number)=>samplePerformance(plan,profile,t,activity,sourceClock,actingClock);
  const samples=[...new Set([...times].filter(t=>t>=0&&t<=plan.durationMs).map(t=>Number(t.toFixed(4))))].sort((a,b)=>a-b).map(frameAt);
  const frames:FrameState[]=[samples[0]!];
  const precise=plan.compilerVersion===HUNT_ANIMATION_VERSION||plan.compilerVersion===ANIMATION_VERSION||plan.compilerVersion===AIRBORNE_ANIMATION_VERSION;
  // Bone connectivity alone does not bound a curved brow/eye expression between
  // baked frames. Keep the face close to the same pure evaluator used by preview.
  const faceError=(a:FrameState,b:FrameState):number=>{
    let error=0;
    for(const progress of [.17,.5,.83]){
      const actual=frameAt(lerp(a.timeMs,b.timeMs,progress));
      if(hasBodyViewEyes(profile))error=Math.max(error,bodyViewEyesMatrixError(registeredBodyViewEyes(profile),a.face,b.face,actual.face,progress)*registeredBodyView(profile).headScale*plan.scale*profile.appearance.headScale*profile.appearance.bodyScale/.2);
      if(hasNativeHeadEyes(profile))error=Math.max(error,nativeHeadBankFacialError(registeredNativeHeadBank(profile),a.face,b.face,actual.face,progress)*plan.scale*profile.appearance.headScale*profile.appearance.bodyScale/.2);
      if(hasBodyViewSeat(profile))error=Math.max(error,nativeSeatMatrixError(profile,registeredBodyView(profile),a.face,b.face,actual.face,progress)*registeredBodyView(profile).bodyScale*plan.scale*profile.appearance.bodyScale/.2);
      else if(hasBodyViewLocomotion(profile))error=Math.max(error,nativeClothMatrixError(profile,registeredBodyView(profile),a.face,b.face,actual.face,progress)*registeredBodyView(profile).bodyScale*plan.scale*profile.appearance.bodyScale/.2);
      if(hasBodyViewSecondary(profile))error=Math.max(error,nativeSecondaryMatrixError(profile,registeredBodyView(profile),a.face,b.face,actual.face,progress)*registeredBodyView(profile).headScale*plan.scale*profile.appearance.headScale*profile.appearance.bodyScale/.2);
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
          const limit=(key==='rotation'||key==='x'||key==='y')?.02:.002;
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
      const actual=frameAt(lerp(a.timeMs,b.timeMs,progress));
      for(const [id,d] of Object.entries(a.paths)){
        const from=pathCoordinates(d),to=pathCoordinates(b.paths![id]!),wanted=pathCoordinates(actual.paths![id]!);
        curveError=Math.max(curveError,...from.map((n,i)=>Math.abs(lerp(n,to[i]!,progress)-wanted[i]!)));
      }
    }
    if(gap<=.2&&face<=1&&curveError<=.2)return [b];
    const middle=Number(((a.timeMs+b.timeMs)/2).toFixed(4));
~~~
