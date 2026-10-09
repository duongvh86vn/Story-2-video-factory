import type {Shot,Storyboard} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import type {HostProfile} from '../host/schemas.js';
import {ActorDefinitionSchema} from './schemas.js';
import {PerformancePlanSchema} from '../animation/schemas.js';
import {usesBodyView} from '../animation/body-view-art.js';
import {hasBodyViewSpeech} from '../animation/body-view-mouth.js';
import {hasBodyViewEyes} from '../animation/body-view-eyes.js';
import {hasBodyViewExpressions} from '../animation/body-view-expressions.js';
import {hasBodyViewLocomotion} from '../animation/body-view-cloth.js';
import {hasBodyViewSecondary} from '../animation/body-view-secondary.js';
import {normalizeViewExpressions,projectViewExpressions} from '../animation/view-expression-track.js';
import {VIEW_ACTING_CLOCK_VERSION,normalizeViewGazes,validateViewActingClock,validateViewActingClockSource,type ViewActingClock} from '../animation/view-acting-clock.js';
import {VIEW_ACTOR_GAZE_VERSION,viewGazeTarget} from '../animation/view-gaze-target.js';
import {actorProfile} from './model.js';
import {collectViewSourceGestures} from '../animation/view-source-gesture.js';
import {collectViewSourceBody,validateBodySourcePlan} from '../animation/view-source-body.js';
import {collectViewSourceManipulation,validateManipulationSourcePlan} from '../animation/view-source-manipulation.js';
import {hasBodyViewManipulation} from '../animation/native-contact-arm.js';
import {hasNativeHeadBank,hasNativeHeadSecondary,validateNativeHeadBankTrack} from '../animation/body-head-bank.js';
import {collectNativeHeadTracks} from '../animation/native-head-track.js';

function performer(shot:Shot,actorId:string){
  const scene=shot.cinematic?.actorScene;if(!scene)return undefined;
  const candidates=[...(scene.primary?[{character:scene.primary,performance:shot.cinematic!.performance}]:[]),...scene.supporting].filter(a=>a.character.id===actorId);
  if(candidates.length>1)throw new Error('needs-view-acting-phase: duplicate actor in a shot');
  return candidates[0];
}
export function actorUsesViewActingClock(profile:Pick<HostProfile,'appearance'>):boolean{
  return usesBodyView(profile)&&(hasNativeHeadBank(profile)||hasBodyViewSpeech(profile)||hasBodyViewEyes(profile)||hasBodyViewLocomotion(profile)||hasBodyViewSecondary(profile)||hasBodyViewManipulation(profile));
}
/** Pure board binding. Adjacent clips only share attention/breath when their
 * cast, registered view and stage geometry agree and continuity is explicit. */
function actorViewActingClockSource(board:Storyboard,current:Shot,actorId:string):ViewActingClock|undefined{
  const currentActor=performer(current,actorId);if(!currentActor||!actorUsesViewActingClock(currentActor.character))return undefined;
  const shots=board.shots.filter(s=>s.id!==current.id).concat(current).sort((a,b)=>a.startMs-b.startMs);
  if(new Set(shots.map(s=>s.id)).size!==shots.length)throw new Error('needs-view-acting-phase: duplicate storyboard shot');
  for(let i=0;i<shots.length;i++)if(shots[i]!.endMs<=shots[i]!.startMs||i&&shots[i]!.startMs<shots[i-1]!.endMs)throw new Error('needs-view-acting-phase: overlapping or invalid storyboard clock');
  const at=shots.findIndex(s=>s.id===current.id);
  const entry=(s:Shot)=>{const a=performer(s,actorId);if(!a)return undefined;
    const p=PerformancePlanSchema.parse(a.performance);
    validateBodySourcePlan(p);
    validateManipulationSourcePlan(p);
    validateNativeHeadBankTrack(p,a.character);
    if(p.sourceHead&&s.cinematic!.actorScene!.primary?.id===actorId&&s.host?.presence==='absent')throw new Error('needs-head-source-phase: source head actor is hidden in a declared camera slice');
    if(p.sourceBody&&s.cinematic!.actorScene!.primary?.id===actorId&&s.host?.presence==='absent')throw new Error('needs-view-body-phase: source body actor is hidden in a declared camera slice');
    if(p.leadCharacterId!==actorId||p.durationMs!==s.endMs-s.startMs)throw new Error('needs-view-acting-phase: performer does not cover its shot');
    if(normalizeViewGazes(p.gazes).some(g=>g.endMs>p.durationMs))throw new Error('needs-view-acting-phase: gaze outside authored shot');
    const scene=s.cinematic!.actorScene!,cast=[...(scene.primary?[scene.primary]:[]),...scene.supporting.map(actor=>actor.character)].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
    return {shotId:s.id,startMs:s.startMs,endMs:s.endMs,continuity:scene.continuity??'cut',
      castHash:hash(cast.map(character=>ActorDefinitionSchema.parse(character))),geometryHash:hash({stage:p.stage,root:p.root,scale:p.scale,facing:p.facing??'front',headView:p.headView??null,kind:p.kind,profileHash:p.profileHash}),gazes:p.gazes,gestures:p.gestures,
      ...(hasBodyViewExpressions(currentActor.character)||hasNativeHeadBank(currentActor.character)?{expressions:p.expressions}:{}),
      sourceBody:p.sourceBody,
      sourceManipulation:p.sourceManipulation,
      sourceHead:p.sourceHead,
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
    return true;
  };
  let first=at,last=at;
  while(linked(first))first--;
  while(last+1<shots.length&&linked(last+1))last++;
  const run=entries.slice(first,last+1).map(e=>e!);
  const bodyMotion=collectViewSourceBody(run,run[0]!.startMs,run.at(-1)!.endMs);
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
  if(references.includes(actorId))throw new Error('needs-actor-gaze: actor cannot look at itself');
  if(references.length){
    clock.actorTargets=references.sort().map(id=>{
      const target=performer(current,id);if(!target)throw new Error('needs-actor-gaze: target actor is missing from the current cast');
      const raw=actorViewActingClockSource(board,current,id);
      if(!raw?.expressions)throw new Error('needs-actor-gaze: target needs its complete registered body/eye/expression run');
      if(hash(target.performance.stage)!==hash(owner.performance.stage))throw new Error('needs-actor-gaze: target is in another world/stage');
      for(const gaze of clock.gazes.filter(g=>'actorTarget' in g&&g.actorTarget.id===id)){
        if(gaze.startMs<raw.runStartMs||gaze.endMs>raw.runEndMs)throw new Error('needs-actor-gaze: target run does not cover the gaze');
        for(const shot of board.shots.filter(s=>s.id!==current.id).concat(current).filter(s=>s.startMs<gaze.endMs&&s.endMs>gaze.startMs)){
          if(!performer(shot,id)||shot.cinematic?.actorScene?.primary?.id===id&&shot.host?.presence==='absent')throw new Error('needs-actor-gaze: target is missing or hidden during the gaze');
        }
      }
      // Use one original run entry, never slice fps/id or other shot metadata.
      const first=board.shots.filter(s=>s.id!==current.id).concat(current).find(s=>s.startMs===raw.runStartMs);
      const original=first&&performer(first,id);if(!original)throw new Error('needs-actor-gaze: missing original target run entry');
      const p=structuredClone(original.performance);p.id=id;p.fps=60;p.durationMs=raw.runEndMs-raw.runStartMs;
      const thrust=p.lunge&&p.spears?.find(s=>s.id===p.lunge!.spearId);
      if(p.lunge&&(!thrust||thrust.action!=='thrust'||thrust.readyMs===undefined||thrust.contactMs===undefined||thrust.recoverMs===undefined))throw new Error('needs-actor-gaze: lunge target lost its owned original thrust clock');
      const lungeClock=thrust?{spearId:thrust.id,readyMs:thrust.readyMs!,contactMs:thrust.contactMs!,recoverMs:thrust.recoverMs!,endMs:thrust.endMs}:undefined;
      p.expressions=projectViewExpressions(raw.expressions,raw.runStartMs,raw.runEndMs);p.gazes=[];p.gestures=[];p.props=[];p.spears=[];p.sourceManipulation=undefined;
      return viewGazeTarget({version:VIEW_ACTOR_GAZE_VERSION,actorId:id,startMs:raw.runStartMs,endMs:raw.runEndMs,sourceIdentityHash:raw.sourceIdentityHash,profile:actorProfile(target.character),performance:p,...(lungeClock?{lungeClock}:{})});
    });
    clock.sourceIdentityHash=hash({sourceIdentityHash:clock.sourceIdentityHash,actorTargets:clock.actorTargets.map(s=>({actorId:s.actorId,fingerprint:s.fingerprint}))});
  }
  validateViewActingClock(owner.performance,clock);return clock;
}
