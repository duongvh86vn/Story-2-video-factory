# Frozen source0.68 wiring excerpts

These are source data only. Each line range is from the full file hash recorded below. No callbacks, geometry, server, renderer, audio/video or production pipeline executed. Existing final needs-source-prop-binding remains intentionally blocking the unfinished source world/events/interaction/coverage. Original male bald v2 and female v1 assets are unchanged. rigHand defaults to right and never throws. The actor clock collector owns the complete original body/head/manipulation history; only its return wiring is included here.

## packages/core/identifiers.ts:1-6
Full file SHA256 7d5d65506ca7e11c92f4bf5232f8ac9fe894eb0a73f3226986ac2e17c3c14fad

~~~ts
import { z } from 'zod';

/** Rig-space sides, not anatomical left/right after a camera turn. */
export const RigHandSchema=z.enum(['left','right']);
export type RigHand=z.infer<typeof RigHandSchema>;
export const rigHand=(value:{hand?:RigHand}):RigHand=>value.hand??'right';
~~~

## packages/actors/view-acting-clock.ts:73-90
Full file SHA256 62953cbce054fc8c2f4024f783a62cfe5ce134d470c2ee57ab8653a90a3c9bc8

~~~ts
  const manipulationMotion=collectViewSourceManipulation(run,run[0]!.startMs,run.at(-1)!.endMs);
  const headMotion=collectNativeHeadTracks(run,run[0]!.startMs,run.at(-1)!.endMs);
  const clock:ViewActingClock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:actorId,startMs:current.startMs,endMs:current.endMs,
    runStartMs:run[0]!.startMs,runEndMs:run.at(-1)!.endMs,sourceIdentityHash:hash({version:VIEW_ACTING_CLOCK_VERSION,actorId,run}),
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
~~~

## packages/actors/speech-clock.ts:42-56
Full file SHA256 a053773e915aede27110baec0d1d426ea74d6cc361896f6c6fcba32275140970

~~~ts
export function rigSpeechInputIdentity(shot:Shot,narration:Narration,board:Storyboard){
  if(!shotUsesSourceSpeechClock(shot))return undefined;
  const owners=narrationCueOwners(board,shot,narration),scene=shot.cinematic!.actorScene!;
  const selected=[...(scene.primary?[scene.primary]:[]),...scene.supporting.map(a=>a.character)].filter(actorUsesViewActingClock);
  const sourceModels=sourcePropBindingIdentity(shot,board,narration);
  return {version:SPEECH_SOURCE_CLOCK_VERSION,narrationHash:hash(NarrationSchema.parse(narration)),owners:selected.map(a=>({actorId:a.id,cueIds:owners.get(a.id)??[]})),
    viewActing:selected.flatMap(a=>{const clock=actorViewActingClock(board,shot,a.id);return clock?[clock]:[]}),
    ...(sourceModels?{sourcePropBinding:sourceModels}:{})};
}
export type RigSpeechPublicationBinding={version:typeof SPEECH_SOURCE_CLOCK_VERSION;identityHash:string};
export function rigSpeechPublicationBinding(shot:Shot,narration:Narration,board:Storyboard):RigSpeechPublicationBinding|undefined{
  const identity=rigSpeechInputIdentity(shot,narration,board);
  return identity?{version:SPEECH_SOURCE_CLOCK_VERSION,identityHash:hash(identity)}:undefined;
}
/** Acceptance uses the board actually being committed, with the repaired shot
~~~

## apps/server/cinematic.ts:41-49
Full file SHA256 29c0904852a4e7614393c6354292c0eabfde0cd238f896ce275a6d8474531677

~~~ts
    if (c.continuity.carriedProps.length) unsupported('Carried props are not supported by the current cinematic clips.');
    if (shot.host?.presence !== 'beside-model'&&!(c.actorScene?.primary===null&&shot.host?.presence==='absent')) unsupported('Absent performance requires an explicit mechanism-only actor scene.');
    const performances=[c.performance,...(c.actorScene?.supporting.map(actor=>actor.performance)??[])];
    if (performances.reduce((count,p)=>count+performanceProps(p).length,0)!==c.propBindings.length || performances.some(p=>[...p.gestures,...(p.sourceManipulation?.gestures??[])].some(g => !CINEMATIC_CLIPS.includes(g.action)))) {
      unsupported('Animated props need a sourced model binding. Unsupported clips and cross-cut carry require a production continuity plan.');
    }
    try{validatePropBindings(shot,board,narration);}catch(error){throw new ApiError(422,error instanceof Error?error.message:String(error),'CINEMATIC_INVALID');}
    const old = previous?.shots.find(s => s.id === shot.id)?.cinematic;
    if(old&&old.artDirection?.useEnvironment!==c.artDirection?.useEnvironment&&old.environmentAssetId)unsupported('Changing the background asset source requires production replanning; preserve the environment setting during direct edits.');
~~~

## packages/director/index.ts:283-291
Full file SHA256 6c73e039b21316dfc9fa58657007121c87390d44f8ea1c2a1ba2e44349d94f6a

~~~ts
}

export function validateModelContinuity(previous:Shot|undefined,next:Shot,board?:Storyboard):void{
  if(!previous?.cinematic||!next.cinematic)return;
  if(next.cinematic.actorScene?.continuity==='cut')return;
  const priorParts=modelExitParts(previous,board);
  for(const part of modelEntryParts(next,board)){const prior=priorParts.find(p=>p.id===part.id);if(prior&&hash([part.x,part.y,part.width,part.height])!==hash([prior.x,prior.y,prior.width,prior.height]))throw new Error(`${next.id}: model ${part.id} teleports at the cut; preserve its world transform`);}
}

~~~

## library/shots/cinematic.ts:219-231
Full file SHA256 63db9c9730773fddda497987c17953883d09f7423b4d1c6bc17b45f666513474

~~~ts
  if(c.actorScene?.primary!==null)actorReports.unshift({actorId:profile.id,profileHash:profile.profileHash,rigHash:rig.rigHash,report:result.compiled.report});
  return {files,geometry,report:{...result.compiled.report,camera:validateCamera(shot,profile,primaryActingClock,{worldShot:shot,board}),actors:actorReports,...(foregroundParts.size?{modelForegroundVersion:MODEL_FOREGROUND_VERSION,foregroundModels:[...foregroundParts].map(partId=>({partId,...(c.propBindings.find(binding=>binding.partId===partId)?{propId:c.propBindings.find(binding=>binding.partId===partId)!.propId}:{})}))}:{}),...(seats.length?{seatSupportVersion:SEAT_SUPPORT_VERSION,seatSupports:seats}:{}),...(c.propBindings.length?{boundModelMotionVersion:PROP_BINDING_VERSION,boundModels:c.propBindings.map(binding=>{
    const owner=originalPropGesture(shot,binding),prop=owner.prop,g=owner.gesture,source=owner.performance.sourceManipulation;
    return {...binding,actorId:owner.id,ownerScale:owner.performance.scale,gestureId:g.id,action:g.action,hand:rigHand(g),gripOffset:prop.gripOffset??{x:0,y:0},origin:prop.origin,gripDestination:g.destination,placedCenter:prop.destination,contactMs:g.contactMs,releaseMs:g.releaseMs,
      ...(source?{originalSource:{sourceId:source.id,sourceHash:hash(source),originalStartMs:source.startMs,originalEndMs:source.endMs,contactGlobalMs:source.startMs+g.contactMs!,releaseGlobalMs:g.releaseMs===undefined?null:source.startMs+g.releaseMs,clock:'reported clip times are original source-relative; sampled positions follow the actual shot slice',motionVerified:false}}:{})};
  })}:{})}};
}

// Legacy seven-argument callers retain the rig report type and byte contract.
export function renderCinematic(shot:Shot,profile:HostProfile,rig:HostRig,activity:SpeechActivity,config:FactoryConfig,background?:string,narration?:Narration):ReturnType<typeof renderRigCinematic>;
export function renderCinematic(shot:Shot,profile:HostProfile,rig:HostRig,activity:SpeechActivity,config:FactoryConfig,background:string|undefined,narration:Narration|undefined,motions:ReadonlyMap<string,ActorMotion>|undefined,speech?:ReadonlyMap<string,import('../../packages/motion/speech-schemas.js').ActorSpeech>,board?:Storyboard):ReturnType<typeof renderRigCinematic>|ReturnType<typeof renderSpriteScene>;
export function renderCinematic(shot:Shot,profile:HostProfile,rig:HostRig,activity:SpeechActivity,config:FactoryConfig,background?:string,narration?:Narration,motions?:ReadonlyMap<string,ActorMotion>,speech?:ReadonlyMap<string,import('../../packages/motion/speech-schemas.js').ActorSpeech>,board?:Storyboard){
  const cast=shot.cinematic?.actorScene,renderer=config.presentation.actor_renderer;
~~~
