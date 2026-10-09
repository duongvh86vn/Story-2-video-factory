# Frozen source interaction wiring v2 — source0.70

Data only. Partial wiring excerpts, no runtime/whole-patch/film acceptance. Source actions still blocked from production pending fixed operation geometry/API continuity. Existing sourcePropBindingIdentity includes complete sibling source shots, narration and original actions in rigSpeechPhase; those unchanged implementations are outside this bounded packet. All test callbacks remain unexecuted.

## library/shots/cinematic.ts lines 205–223

~~~ts
    return file;
  }),notes:[`${p.compilerVersion}; story-cinematic; illustration`, `Speech activity: ${activity.method}; no phoneme lip-sync.`]};
  const geometry:HostGeometry={controllerVersion:p.compilerVersion,profileHash:profile.profileHash,rigHash:rig.rigHash,shotId:shot.id,
    hostHeightRatio:rigMetrics(profile).height*p.scale/height,interactions:[]};
  const performers=[...(c.actorScene?.primary===null?[]:[{id:profile.id,profile,performance:p,actions:shot.host!.actions,activity:localActivity,sourceClock:primaryClock,actingClock:primaryActingClock}]),
    ...(c.actorScene?.supporting??[]).map(actor=>({id:actor.character.id,profile:actorProfile(actor.character),performance:actor.performance,actions:actor.actions,
      activity:performerSpeech.get(actor.character.id)!.activity,sourceClock:performerSpeech.get(actor.character.id)!.sourceClock,actingClock:performerSpeech.get(actor.character.id)!.actingClock}))];
  for(const performer of performers)for(const {action:a,gestures,sourceManipulation} of cinematicActionGroups(performer.actions,performer.performance,shot.startMs)){
    if(sourceManipulation){geometry.interactions.push(sourceInteractionGeometry(shot,performer.id,a,board,narration));continue;}
    if(a.target)for(const [index,g] of gestures.entries()){
    const target=index===1?a.secondTarget!:a.target;
    const sourceGesture=g.sourceSpan?viewSourceGestureDefinition(g):undefined;
    const reach=sourceGesture?Math.max(g.startMs,Math.min(g.endMs,sourceGesture.reachMs-shot.startMs)):g.contactMs??Math.min(g.endMs-1,g.startMs+Math.min(320,(g.endMs-g.startMs)*.3));
    const f=samplePerformance(performer.performance,performer.profile,reach,performer.activity,performer.sourceClock,performer.actingClock),anchor=g.target!,handSide=rigHand(g),hand=f.hands[handSide];
    geometry.interactions.push({actorId:performer.id,handSide,type:a.type,startMs:g.startMs+shot.startMs,reachMs:Math.round(reach)+shot.startMs,endMs:g.endMs+shot.startMs,partId:target.partId,
      target:anchor,hand,errorPx:Math.hypot(hand.x-anchor.x,hand.y-anchor.y),root:f.root,gaze:anchor,
      ...(sourceGesture?{sourceGesture:{id:sourceGesture.id,originalReachMs:sourceGesture.reachMs,originalRecoverMs:sourceGesture.recoverMs,
        samplePhase:reach+shot.startMs<sourceGesture.reachMs?'approach' as const:reach+shot.startMs>sourceGesture.recoverMs?'recovery' as const:'hold' as const,contactVerified:false as const}}:{}),
      ...(a.contactMs===undefined?{}:{contactMs:a.contactMs})});
~~~

## packages/review/index.ts lines 111–118

~~~ts
    }
    if(shot.host){
      const geometry=await readJson<SceneGeometry>(path.join(projectRoot,`scenes/${shot.id}/host-geometry.json`)),times=new Set<number>(),step=Math.ceil(1000/config.rendering.final.fps);
      for(const time of interactionPreviewTimes(shot,geometry.interactions,step))times.add(time);
      for(const time of eventPreviewTimes(shot))times.add(time);
      for(const timeMs of [...times].sort((a,b)=>a-b)){
        const file=`previews/${shot.id}/action-${timeMs}.png`;
        actions.push({shotId:shot.id,fraction:(timeMs-shot.startMs)/(shot.endMs-shot.startMs),timeMs,path:file,hash:''});
~~~

## packages/review/index.ts lines 228–234

~~~ts
      if(cinematic)cameraReports.set(shot.id,validateCamera(shot,performer.profile,actorViewActingClock(storyboard,shot,performer.profile.id)));
      if(geometry.rigHash!==performer.rig.rigHash||geometry.profileHash!==performer.profile.profileHash||heightInvalid)issues.push(issue(shot,cinematic?.actorScene?'actor-identity':'host-identity','high','Performer geometry/profile identity is inconsistent.','Recompile the actor and shot.'));
      try{validateSourceInteractionGeometry(shot,storyboard,n,geometry.interactions);}catch(error){issues.push(issue(shot,'host-contact','high',String(error),'Rebuild from the complete original actor/model/contact source.'));}
      for(const action of geometry.interactions)if(!action.sourceManipulation&&action.type==='operate-model'&&(action.errorPx>2||action.contactMs===undefined||action.contactMs!==action.reachMs))issues.push(issue(shot,'host-contact','high',`${action.partId}: invalid contact geometry/timing`,'Adjust the model anchor or host action and rebuild.'));
    }
    if(voice?.status!=='ready')warnings.push(`Silent draft only: ${voice?.status}. Final requires a ready voice.`);
  }
~~~

## packages/review/index.ts lines 257–266

~~~ts
      for(const shot of storyboard.shots){const geometry=await readJson<SceneGeometry>(path.join(projectRoot,`scenes/${shot.id}/host-geometry.json`));
        for(const sample of interactionPreviewTimes(shot,geometry.interactions,step))if(!actionTimes.has(`${shot.id}:${sample}`))throw new Error(`${shot.id}: missing before/during/after target evidence`);
        const eventTimes=eventPreviewTimes(shot);
        for(const sample of eventTimes)if(!actionTimes.has(`${shot.id}:${sample}`))throw new Error(`${shot.id}: missing timed event evidence`);
        const sheet=`previews/${shot.id}/action-sheet.jpg`;if((geometry.interactions.length||eventTimes.length)&&(!manifest.sheetHashes[sheet]||hash(await fs.readFile(await safeRealPath(projectRoot,sheet)))!==manifest.sheetHashes[sheet]))throw new Error(`${shot.id}: missing/stale action sheet`);
      }
    }
    // Vision reads sheets, so checking only their constituent PNGs cannot detect stale edits.
    for(const relative of ['previews/contact-sheet-global.jpg',...storyboard.shots.map(shot=>`previews/${shot.id}/contact-sheet.jpg`)]) {
      if(!manifest.sheetHashes?.[relative]) throw new Error('Preview contact sheet hashes are missing; recreate previews before visual review');
~~~

## packages/director/index.ts lines 265–279

~~~ts
    if(a.type==='idle'){
      if(a.target||a.secondTarget||a.contactMs!==undefined||p.gestures.some(g=>(!a.hand||rigHand(g)===a.hand)&&g.startMs<a.endMs-shot.startMs&&g.endMs>a.startMs-shot.startMs))throw new Error(`${shot.id}: idle interval cannot own an arm gesture, target or contact; use performance.walks/postures for body motion`);
      continue;
    }
    if(group.length!==(a.type==='compare'?2:1))throw new Error(`${shot.id}: missing performance action for ${a.type} at shot-local ${a.startMs-shot.startMs}–${a.endMs-shot.startMs}ms; expected ${a.type==='compare'?2:1} contained gesture(s), received ${group.length}`);
    for(const [index,g] of group.entries()){
    consumed.add(g.id);
    const target=index===1?a.secondTarget:a.target;
    const midpoint=Math.floor((a.startMs+a.endMs-2*shot.startMs)/2);
    const expectedStart=index===1?midpoint:a.startMs-shot.startMs,expectedEnd=a.type==='compare'&&index===0?midpoint:a.endMs-shot.startMs;
    if(g.startMs!==expectedStart||g.endMs!==expectedEnd)throw new Error(`${shot.id}: gesture/action clock mismatch for ${g.id} (${a.type}); expected shot-local ${expectedStart}–${expectedEnd}ms, received ${g.startMs}–${g.endMs}ms`);
    const expected=target?partAnchor(shot,target.partId,target.anchor,p.stage.width,p.stage.height):undefined;
    // Keep the existing 1e-6px comparison. Also recognize the canonical anchor
    // rounded to three stage-pixel decimals after normalized-coordinate input.
    // This accepts 419.999976 -> 420, not arbitrary nearby shifted targets.
~~~

## packages/explainer/storyboard.ts lines 147–161

~~~ts
      if(a.secondTarget&&a.type!=='compare')throw new Error(`${shot.id}: second target is only supported for compare`);
      if(performer.presence==='absent'&&a.target)throw new Error(`${shot.id}: an absent actor cannot point or operate a model`);
      if (!performer.profile.actions.includes(a.type) || a.startMs < shot.startMs || a.endMs > shot.endMs) throw new Error(`${shot.id}: unsupported/out-of-bounds actor action`);
      if (a.narrationAnchor && !knownSegments.has(a.narrationAnchor)) throw new Error(`${shot.id}: invalid gesture narration anchor`);
      if(a.narrationAnchor){const cue=narration.segments.find(s=>s.id===a.narrationAnchor)!;
        if(!shot.narrationSegmentIds.includes(cue.id)||cue.startMs>=a.endMs||cue.endMs<=a.startMs)throw new Error(`${shot.id}: action narration anchor is outside its cue clock`);
        if(a.contactMs!==undefined&&(a.contactMs<cue.startMs||a.contactMs>=cue.endMs))throw new Error(`${shot.id}: contact occurs outside its assigned narration cue clock`);
      }
      for (const t of [a.target, a.secondTarget].filter(Boolean)) if (t!.modelId !== v.modelId || !ids.has(t!.partId)) throw new Error(`${shot.id}: missing gesture target`);
      if (['point', 'operate-model', 'walk-to-marker', 'compare'].includes(a.type) && !a.target) throw new Error(`${shot.id}: targeted action has no target`);
      if (a.type === 'compare' && (!a.secondTarget || a.target?.partId === a.secondTarget.partId)) throw new Error(`${shot.id}: compare requires two different targets`);
      if(a.sourceManipulation){sourceInteractionDescriptor(shot,performer.profile.id,a,phaseBoard,narration);continue;}
      const entryDrop=performer.performance?.gestures.some(g=>g.action==='drop'&&g.startMs===0&&g.contactMs===0&&a.startMs===shot.startMs&&a.contactMs===shot.startMs&&g.endMs+shot.startMs===a.endMs&&rigHand(g)===rigHand(a));
      if (a.type === 'operate-model' && (a.contactMs === undefined || a.contactMs < a.startMs || a.contactMs === a.startMs&&!entryDrop || a.contactMs >= a.endMs)) throw new Error(`${shot.id}: operation requires a contact after approach`);
    }}
~~~

## packages/explainer/storyboard.ts lines 177–191

~~~ts
      if(!e.contactRequired&&(e.contactActorId||e.contactHands))throw new Error(`${shot.id}: contact owner/hands require a contact-driven event`);
      if(e.contactHands&&new Set(e.contactHands).size!==e.contactHands.length)throw new Error(`${shot.id}: duplicate required contact hand`);
      if(e.contactActorId&&!performers.some(performer=>performer.profile.id===e.contactActorId))throw new Error(`${shot.id}: unknown contact actor ${e.contactActorId}`);
      if(!shot.cinematic&&e.contactHands?.includes('left'))throw new Error(`${shot.id}: left-hand contact requires the cinematic renderer`);
      if(e.sourceWorld){sourceWorldEvent(shot,e);continue;}
      if(e.contactRequired&&!shot.cinematic?.spriteStage){
        const eligible=performers.filter(performer=>!e.contactActorId||performer.profile.id===e.contactActorId);
        const contacted=eligible.some(performer=>{
          const actions=performer.actions.filter(a=>a.type==='operate-model'&&a.target?.partId===(e.contactPartId??e.targetId)&&a.contactMs!==undefined&&a.contactMs<e.startMs&&a.endMs>=e.endMs);
          return e.contactHands?e.contactHands.every(hand=>actions.some(a=>rigHand(a)===hand)):actions.length>0;
        });
        if(!contacted){
          const candidates=eligible.flatMap(performer=>performer.actions.filter(a=>a.type==='operate-model'&&a.target?.partId===(e.contactPartId??e.targetId))
            .map(a=>({actorId:performer.profile.id,hand:rigHand(a),startMs:a.startMs,contactMs:a.contactMs,endMs:a.endMs})));
          throw new Error(`${shot.id}: model reacts before actor contact${e.contactActorId||e.contactHands?`; required ${e.contactActorId??'one present actor'}, ${e.contactHands?.join('+')??'any hand'}`:''}; ${JSON.stringify({event:e.type,targetId:e.targetId,contactPartId:e.contactPartId??e.targetId,eventStartMs:e.startMs,eventEndMs:e.endMs,requirement:'contactMs < eventStartMs and action.endMs >= eventEndMs (global milliseconds)',candidates})}`);
~~~

## packages/director/props.ts lines 53–66

~~~ts
  validateSourceWorld(shot,board,narration);
  const performances=[c.performance,...(c.actorScene?.supporting.map(a=>a.performance)??[])];
  const sourceSelected=performances.some(p=>p.sourceManipulation);
  if(sourceSelected){
    if(!board||!narration)throw new Error(`${shot.id}: needs-source-prop-binding: original contact requires complete storyboard and original narration`);
    validateSourcePropBindings(shot,board,narration);
  }
  const declared=performances.flatMap(p=>performanceProps(p).map(prop=>prop.id));
  if(new Set(declared).size!==declared.length)throw new Error(`${shot.id}: prop IDs must be unique across the entire visible cast`);
  if(c.propBindings.length!==declared.length)throw new Error(`${shot.id}: every animated prop requires a sourced model binding`);
  const svgIds=c.propBindings.map(binding=>boundProp(shot,binding).svgId);
  if(new Set(svgIds).size!==svgIds.length)throw new Error(`${shot.id}: bound prop namespaces collide; use unambiguous actor/prop IDs`);
  if(sourceSelected)throw new Error(`${shot.id}: needs-source-prop-binding: original entity/action/evidence binding is checked; source event/effect/interaction/coverage production still requires fixed operate geometry and API continuity; cannot enter production`);
  const pickup=pickupPart(shot),ids=new Set<string>(),parts=new Set<string>();
~~~
