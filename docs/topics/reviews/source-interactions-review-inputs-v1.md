# Frozen source interaction wiring — source0.70

Source data only. Partial wiring excerpts; not execution or acceptance evidence. Original transport production guard remains, fixed operate geometry/API continuity still pending.

## library/shots/cinematic.ts lines 200–233

~~~ts
      else if(c.actorScene?.primary)authored=authored.replace('<g id="performer"',`<g data-actor-id="${escapeHtml(c.actorScene.primary.id)}" id="performer"`);
      return {...file,content:authored};
    }
    if(file.path==='scene.js')return {...file,content:`${file.content}\n${calls.join('\n')}`};
    if(file.path==='style.css'&&background){const bounds=cameraEnvironmentBounds(c.camera,p.stage,p.durationMs);return {...file,content:`${file.content}\n${scope} .environment{left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px;}`};}
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
  }
    }
  if(c.actorScene?.primary!==null)actorReports.unshift({actorId:profile.id,profileHash:profile.profileHash,rigHash:rig.rigHash,report:result.compiled.report});
  return {files,geometry,report:{...result.compiled.report,...(worldFrames?{sourceWorld:{version:c.sourceWorld!.version,id:c.sourceWorld!.id,originalStartMs:c.sourceWorld!.startMs,originalEndMs:c.sourceWorld!.endMs,sourceHash:hash(c.sourceWorld),entry:worldFrames[0]!.phase,exit:worldFrames.at(-1)!.phase,scope:"original-global-phase-candidate",motionVerified:false}}:{}),camera:validateCamera(shot,profile,primaryActingClock,{worldShot:shot,board}),actors:actorReports,...(foregroundParts.size?{modelForegroundVersion:MODEL_FOREGROUND_VERSION,foregroundModels:[...foregroundParts].map(partId=>({partId,...(c.propBindings.find(binding=>binding.partId===partId)?{propId:c.propBindings.find(binding=>binding.partId===partId)!.propId}:{})}))}:{}),...(seats.length?{seatSupportVersion:SEAT_SUPPORT_VERSION,seatSupports:seats}:{}),...(c.propBindings.length?{boundModelMotionVersion:PROP_BINDING_VERSION,boundModels:c.propBindings.map(binding=>{
    const owner=originalPropGesture(shot,binding),prop=owner.prop,g=owner.gesture,source=owner.performance.sourceManipulation;
    return {...binding,actorId:owner.id,ownerScale:owner.performance.scale,gestureId:g.id,action:g.action,hand:rigHand(g),gripOffset:prop.gripOffset??{x:0,y:0},origin:prop.origin,gripDestination:g.destination,placedCenter:prop.destination,contactMs:g.contactMs,releaseMs:g.releaseMs,
      ...(source?{originalSource:{sourceId:source.id,sourceHash:hash(source),originalStartMs:source.startMs,originalEndMs:source.endMs,contactGlobalMs:source.startMs+g.contactMs!,releaseGlobalMs:g.releaseMs===undefined?null:source.startMs+g.releaseMs,clock:'reported clip times are original source-relative; sampled positions follow the actual shot slice',motionVerified:false}}:{})};
  })}:{})}};
}

~~~

## packages/review/index.ts lines 108–121

~~~ts
      const timeMs=Math.min(localMs,shot.endMs-shot.startMs-1);
      const file=`previews/${shot.id}/f${String(Math.round(fraction*100)).padStart(3,'0')}.png`;
      frames.push({shotId:shot.id,fraction,timeMs:shot.startMs+timeMs,path:file,hash:''});
    }
    if(shot.host){
      const geometry=await readJson<SceneGeometry>(path.join(projectRoot,`scenes/${shot.id}/host-geometry.json`)),times=new Set<number>(),step=Math.ceil(1000/config.rendering.final.fps);
      for(const time of interactionPreviewTimes(shot,geometry.interactions,step))times.add(time);
      for(const time of eventPreviewTimes(shot))times.add(time);
      for(const timeMs of [...times].sort((a,b)=>a-b)){
        const file=`previews/${shot.id}/action-${timeMs}.png`;
        actions.push({shotId:shot.id,fraction:(timeMs-shot.startMs)/(shot.endMs-shot.startMs),timeMs,path:file,hash:''});
      }
    }
  }
~~~

## packages/review/index.ts lines 224–237

~~~ts
      // Cinematic geometry records world body size; the camera validator measures visible framing.
      const heightInvalid=cinematic
        ?!Number.isFinite(geometry.hostHeightRatio)||Math.abs(geometry.hostHeightRatio-rigMetrics(performer.profile).height*cinematic.performance.scale/cinematic.performance.stage.height)>1e-6
        :geometry.hostHeightRatio<.25||geometry.hostHeightRatio>.4;
      if(cinematic)cameraReports.set(shot.id,validateCamera(shot,performer.profile,actorViewActingClock(storyboard,shot,performer.profile.id)));
      if(geometry.rigHash!==performer.rig.rigHash||geometry.profileHash!==performer.profile.profileHash||heightInvalid)issues.push(issue(shot,cinematic?.actorScene?'actor-identity':'host-identity','high','Performer geometry/profile identity is inconsistent.','Recompile the actor and shot.'));
      try{validateSourceInteractionGeometry(shot,storyboard,n,geometry.interactions);}catch(error){issues.push(issue(shot,'host-contact','high',String(error),'Rebuild from the complete original actor/model/contact source.'));}
      for(const action of geometry.interactions)if(!action.sourceManipulation&&action.type==='operate-model'&&(action.errorPx>2||action.contactMs===undefined||action.contactMs!==action.reachMs))issues.push(issue(shot,'host-contact','high',`${action.partId}: invalid contact geometry/timing`,'Adjust the model anchor or host action and rebuild.'));
    }
    if(voice?.status!=='ready')warnings.push(`Silent draft only: ${voice?.status}. Final requires a ready voice.`);
  }
  const hasVision=router.supportsVision();
  if(!hasVision && !config.workflow.allow_rule_based_review) throw new Error('No real vision model is configured and rule-based review is disabled');
  {
~~~

## packages/review/index.ts lines 254–269

~~~ts
      for(const frame of manifest.actions){const shot=shots.get(frame.shotId);if(!shot||frame.timeMs<shot.startMs||frame.timeMs>=shot.endMs)throw new Error('Invalid action snapshot time');
        if(hash(await fs.readFile(await safeRealPath(projectRoot,frame.path)))!==frame.hash)throw new Error(`Action snapshot changed: ${frame.path}`);actionTimes.add(`${frame.shotId}:${frame.timeMs}`);}
      const step=Math.ceil(1000/config.rendering.final.fps);
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
      if(hash(await fs.readFile(await safeRealPath(projectRoot,relative)))!==manifest.sheetHashes[relative]) throw new Error(`Preview contact sheet changed: ${relative}`);
    }
  }
~~~

## packages/director/index.ts lines 264–282

~~~ts
    }
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
    const exactTarget=expected&&g.target&&Math.hypot(g.target.x-expected.x,g.target.y-expected.y)<=1e-6;
    const roundedTarget=expected&&g.target&&Math.hypot(g.target.x-Math.round(expected.x*1000)/1000,g.target.y-Math.round(expected.y*1000)/1000)<=1e-6;
    if(Boolean(expected)!==Boolean(g.target)||expected&&g.target&&!exactTarget&&!roundedTarget)throw new Error(`${shot.id}: gesture ${g.id} points at the wrong world target for ${a.type}; expected ${expected?JSON.stringify(expected):'no gesture.target (omit it because this action has no object target; a walking destination belongs in performance.walks)'}, received ${g.target?JSON.stringify(g.target):'no gesture.target'}${target?`; object ${target.partId}, anchor ${target.anchor}`:''}`);
~~~

## packages/explainer/storyboard.ts lines 143–163

~~~ts
    for (const a of [...performer.actions].sort((a,b)=>a.startMs-b.startMs)) {
      if(!shot.cinematic&&a.hand==='left')throw new Error(`${shot.id}: left-hand actions require the cinematic renderer`);
      const hands=a.type==='idle'&&!a.hand?['left','right'] as const:[rigHand(a)];
      for(const hand of hands){if(a.startMs<actionEnd[hand])throw new Error(`${shot.id}: ${hand} host actions overlap`);actionEnd[hand]=a.endMs;}
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
    for (const e of v.events) {
      const moving=v.parts.find(p=>p.id===e.targetId)?.kind;
~~~

## packages/explainer/storyboard.ts lines 173–197

~~~ts
        }else if(e.type!=='flow')throw new Error(`${shot.id}: relation endpoint is supported only for flow or comparison`);
        else if(!v.relations.some(r=>(r.kind==='transfer'||shot.cinematic?.artDirection&&r.kind==='cause')&&r.from===e.targetId&&r.to===e.relationTo&&(shot.cinematic?.artDirection||hash(r.sourceRefs)===hash(e.sourceRefs))))throw new Error(`${shot.id}: flow event has no sourced transfer`);
      }
      if(e.contactPartId&&!ids.has(e.contactPartId))throw new Error(`${shot.id}: missing control target`);
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
        }
      }
    }
    if (h.presence === 'absent') absent += shot.endMs - shot.startMs; else absent = 0;
    if (!shot.cinematic?.actorScene&&absent > config.presentation.maximum_host_absence_seconds * 1000) throw new Error('Host absent longer than configured limit');
    const spoken = narration.segments.reduce((n, s) => n + Math.max(0, Math.min(s.endMs, shot.endMs) - Math.max(s.startMs, shot.startMs)), 0);
~~~

## packages/director/props.ts lines 49–67

~~~ts
export function modelExitParts(shot:Shot,board?:Storyboard){return modelPartsAt(shot,true,board);}
export function modelEntryParts(shot:Shot,board?:Storyboard){return modelPartsAt(shot,false,board);}
export function validatePropBindings(shot:Shot,board?:Storyboard,narration?:Narration):void{
  const c=shot.cinematic;if(!c)return;
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
  for(const binding of c.propBindings){
~~~

## packages/actors/speech-clock.ts lines 36–66

~~~ts
  validateSpeechActivityTrack(source);
  const local=projectSpeechActivity(actorSpeech(activity,narration,cueIds,0,narration.durationMs),startMs,endMs);
  const sourceClock:SpeechSourceClock={version:SPEECH_SOURCE_CLOCK_VERSION,ownerId,scope:allOwnedCueIds?'storyboard-cues':'shot-cues',
    cueIds:ownedIds,startMs,endMs,sourceActivityHash:hash(source),activity:windowSpeechActivity(source,startMs,endMs)};
  validateSpeechSourceClock(local,sourceClock,ownerId,endMs-startMs);
  return {activity:local,sourceClock};
}
export function rigSpeechInputIdentity(shot:Shot,narration:Narration,board:Storyboard){
  const world=sourceWorldIdentity(shot,board,narration);
  if(!shotUsesSourceSpeechClock(shot)&&!world)return undefined;
  const scene=shot.cinematic?.actorScene;if(!scene)throw new Error('needs-source-prop-binding: world publication requires a canonical actor scene');
  const owners=narrationCueOwners(board,shot,narration);
  const selected=[...(scene.primary?[scene.primary]:[]),...scene.supporting.map(a=>a.character)].filter(actorUsesViewActingClock);
  const sourceModels=sourcePropBindingIdentity(shot,board,narration);
  return {version:SPEECH_SOURCE_CLOCK_VERSION,narrationHash:hash(NarrationSchema.parse(narration)),owners:selected.map(a=>({actorId:a.id,cueIds:owners.get(a.id)??[]})),
    viewActing:selected.flatMap(a=>{const clock=actorViewActingClock(board,shot,a.id);return clock?[clock]:[]}),
    ...(sourceModels?{sourcePropBinding:sourceModels}:{}),...(world?{sourceWorld:world}:{})};
}
export type RigSpeechPublicationBinding={version:typeof SPEECH_SOURCE_CLOCK_VERSION;identityHash:string};
export function rigSpeechPublicationBinding(shot:Shot,narration:Narration,board:Storyboard):RigSpeechPublicationBinding|undefined{
  const identity=rigSpeechInputIdentity(shot,narration,board);
  return identity?{version:SPEECH_SOURCE_CLOCK_VERSION,identityHash:hash(identity)}:undefined;
}
/** Acceptance uses the board actually being committed, with the repaired shot
 * substituted. Nonlocal ownership/narration changes must not approve a scene
 * compiled with another source phase. This is not waveform verification. */
export function assertRigSpeechPublicationBinding(shot:Shot,narration:Narration,board:Storyboard,expected?:RigSpeechPublicationBinding):void{
  const current=rigSpeechPublicationBinding(shot,narration,board);
  if(!current&&!expected)return;
  if(!current||!expected||current.version!==expected.version||current.identityHash!==expected.identityHash)throw new Error('needs-speech-phase: storyboard/narration source identity changed before repair publication');
}
~~~

## packages/director/source-prop-identity.ts lines 1–14

~~~ts
import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import {hash} from '../core/utils.js';
export const SOURCE_PROP_BINDING_VERSION='source-prop-binding-1';
/** Structural cache input only. It never samples geometry, approves binding,
 * rewrites narration or treats source/final gates as satisfied. A sibling
 * model/role/cue/art/action/clock edit invalidates every affected source slice. */
export function sourcePropBindingIdentity(shot:Shot,board:Storyboard,narration:Narration){
  const c=shot.cinematic,owners=[...(c?.actorScene?.primary&&c.performance.sourceManipulation?[{id:c.actorScene.primary.id,source:c.performance.sourceManipulation}]:[]),
    ...(c?.actorScene?.supporting.filter(a=>a.performance.sourceManipulation).map(a=>({id:a.character.id,source:a.performance.sourceManipulation!}))??[])];
  if(!owners.length)return undefined;
  const original=board.shots.filter(s=>s.id!==shot.id).concat(shot).filter(s=>owners.some(o=>s.startMs<o.source.endMs&&s.endMs>o.source.startMs)).sort((a,b)=>a.startMs-b.startMs);
  return {version:SOURCE_PROP_BINDING_VERSION,scope:'structural-cache-input-only',fingerprint:hash({owners,original,narration}),approved:false,motionVerified:false};
}

~~~
