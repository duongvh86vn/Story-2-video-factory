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
import {normalizeViewExpressions} from '../animation/view-expression-track.js';
import {VIEW_ACTING_CLOCK_VERSION,normalizeViewGazes,validateViewActingClock,type ViewActingClock} from '../animation/view-acting-clock.js';
import {collectViewSourceGestures} from '../animation/view-source-gesture.js';

function performer(shot:Shot,actorId:string){
  const scene=shot.cinematic?.actorScene;if(!scene)return undefined;
  const candidates=[...(scene.primary?[{character:scene.primary,performance:shot.cinematic!.performance}]:[]),...scene.supporting].filter(a=>a.character.id===actorId);
  if(candidates.length>1)throw new Error('needs-view-acting-phase: duplicate actor in a shot');
  return candidates[0];
}
export function actorUsesViewActingClock(profile:Pick<HostProfile,'appearance'>):boolean{
  return usesBodyView(profile)&&(hasBodyViewSpeech(profile)||hasBodyViewEyes(profile)||hasBodyViewLocomotion(profile));
}
/** Pure board binding. Adjacent clips only share attention/breath when their
 * cast, registered view and stage geometry agree and continuity is explicit. */
export function actorViewActingClock(board:Storyboard,current:Shot,actorId:string):ViewActingClock|undefined{
  const currentActor=performer(current,actorId);if(!currentActor||!actorUsesViewActingClock(currentActor.character))return undefined;
  const shots=board.shots.filter(s=>s.id!==current.id).concat(current).sort((a,b)=>a.startMs-b.startMs);
  if(new Set(shots.map(s=>s.id)).size!==shots.length)throw new Error('needs-view-acting-phase: duplicate storyboard shot');
  for(let i=0;i<shots.length;i++)if(shots[i]!.endMs<=shots[i]!.startMs||i&&shots[i]!.startMs<shots[i-1]!.endMs)throw new Error('needs-view-acting-phase: overlapping or invalid storyboard clock');
  const at=shots.findIndex(s=>s.id===current.id);
  const entry=(s:Shot)=>{const a=performer(s,actorId);if(!a)return undefined;
    const p=PerformancePlanSchema.parse(a.performance);
    if(p.leadCharacterId!==actorId||p.durationMs!==s.endMs-s.startMs)throw new Error('needs-view-acting-phase: performer does not cover its shot');
    if(normalizeViewGazes(p.gazes).some(g=>g.endMs>p.durationMs))throw new Error('needs-view-acting-phase: gaze outside authored shot');
    const scene=s.cinematic!.actorScene!,cast=[...(scene.primary?[scene.primary]:[]),...scene.supporting.map(actor=>actor.character)].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
    return {shotId:s.id,startMs:s.startMs,endMs:s.endMs,continuity:scene.continuity??'cut',
      castHash:hash(cast.map(character=>ActorDefinitionSchema.parse(character))),geometryHash:hash({stage:p.stage,root:p.root,scale:p.scale,facing:p.facing??'front',headView:p.headView??null,kind:p.kind,profileHash:p.profileHash}),gazes:p.gazes,gestures:p.gestures,
      ...(hasBodyViewExpressions(currentActor.character)?{expressions:p.expressions}:{}),
      ...(hasBodyViewLocomotion(currentActor.character)?{locomotion:{walks:p.walks,jumps:p.jumps??[],postures:p.postures??[],entryPosture:p.entryPosture??null}}:{})};
  };
  const entries=shots.map(entry);
  const linked=(i:number)=>{
    if(i<=0||shots[i]!.cinematic?.actorScene?.continuity!=='continuous')return false;
    const a=entries[i-1],b=entries[i];
    if([a,b].some(e=>e?.locomotion&&(e.locomotion.walks.length||e.locomotion.jumps.length||e.locomotion.postures.length||e.locomotion.entryPosture)))throw new Error('needs-view-locomotion-cut: native locomotion must remain in one complete shot; original source motion clock is not registered');
    if(!a||!b||a.endMs!==b.startMs||a.castHash!==b.castHash||a.geometryHash!==b.geometryHash)throw new Error('needs-view-acting-phase: declared continuous native actor changed clock, cast/view or geometry');
    return true;
  };
  let first=at,last=at;
  while(linked(first))first--;
  while(last+1<shots.length&&linked(last+1))last++;
  const run=entries.slice(first,last+1).map(e=>e!);
  const clock:ViewActingClock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:actorId,startMs:current.startMs,endMs:current.endMs,
    runStartMs:run[0]!.startMs,runEndMs:run.at(-1)!.endMs,sourceIdentityHash:hash({version:VIEW_ACTING_CLOCK_VERSION,actorId,run}),
    gazes:normalizeViewGazes(run.flatMap(e=>e.gazes.map(g=>({...g,startMs:g.startMs+e.startMs,endMs:g.endMs+e.startMs})))),
    gestures:collectViewSourceGestures(run,run[0]!.startMs,run.at(-1)!.endMs),
    ...(hasBodyViewExpressions(currentActor.character)?{expressions:normalizeViewExpressions(run.flatMap(e=>(e.expressions??[]).map(expression=>({...expression,startMs:expression.startMs+e.startMs,endMs:expression.endMs+e.startMs}))))}:{})};
  validateViewActingClock(currentActor.performance,clock);return clock;
}
