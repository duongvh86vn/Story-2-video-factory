import {hash} from '../core/utils.js';
import {rigHand,type RigHand} from '../core/identifiers.js';
import {
  BodySourceSchema,ManipulationSourceSchema,SpearSourceSchema,SPEAR_SOURCE_VERSION,
  type BodySource,type ManipulationSource,type SpearSource,type PerformancePlan,
} from './schemas.js';
import {sourceBodyPlan,validateBodySourcePlan} from './view-source-body.js';
import {validateManipulationSourcePlan} from './view-source-manipulation.js';
import type {ViewActingClock} from './view-acting-clock.js';

/** Only the explicit actor-owned physical clock fields are consumed here. */
export type SpearViewClock=Pick<ViewActingClock,
  'ownerId'|'startMs'|'endMs'|'runStartMs'|'runEndMs'|'gestures'|'bodyMotion'|'manipulationMotion'|'spearMotion'
>;

/** Entries must already be resolved to one stable actor, including supporting
 * appearances. The parent retains actor/profile/world identity guards. */
export type ViewSourceSpearEntry={
  ownerId:PerformancePlan['leadCharacterId'];
  startMs:number;endMs:number;
  sourceBody?:BodySource;sourceSpear?:SpearSource;
};

type SourceSpearTrack=SpearSource['spears'][number];
type PhysicalSpearTracks=NonNullable<PerformancePlan['spears']>;

function fail(message:string):never{
  throw new Error('needs-source-spear: '+message);
}
function exactSpan(startMs:number,endMs:number,label:string):void{
  if(!Number.isSafeInteger(startMs)||!Number.isSafeInteger(endMs)||startMs<0||endMs<=startMs)
    fail('invalid exact '+label+' span');
}
function exactDuration(durationMs:number):void{
  if(!Number.isSafeInteger(durationMs)||durationMs<=0)fail('invalid exact local duration');
}
function readSpear(value:SpearSource):SpearSource{
  const parsed=SpearSourceSchema.safeParse(value);
  if(!parsed.success)fail('invalid complete original spear declaration: '+parsed.error.message);
  return parsed.data;
}
function readBody(value:BodySource|undefined):BodySource{
  if(value===undefined)fail('a complete original sourceBody is required');
  const parsed=BodySourceSchema.safeParse(value);
  if(!parsed.success)fail('invalid complete original body declaration: '+parsed.error.message);
  exactSpan(parsed.data.startMs,parsed.data.endMs,'original body');
  return parsed.data;
}
function readManipulation(value:ManipulationSource):ManipulationSource{
  const parsed=ManipulationSourceSchema.safeParse(value);
  if(!parsed.success)fail('invalid companion original manipulation declaration: '+parsed.error.message);
  exactSpan(parsed.data.startMs,parsed.data.endMs,'original manipulation');
  return parsed.data;
}
function intersects(aStart:number,aEnd:number,bStart:number,bEnd:number):boolean{
  return Math.max(aStart,bStart)<Math.min(aEnd,bEnd);
}
function trackHands(track:SourceSpearTrack):readonly RigHand[]{
  return track.twoHand?['left','right']:[track.hand];
}
function ownedHands(source:SpearSource):Set<RigHand>{
  return new Set(source.spears.flatMap(track=>[...trackHands(track)]));
}

/** Track coverage is the full original run, so every owned hand is also owned
 * throughout each participating shot. Source spans retain their global clock. */
function rejectLocalHandConflicts(plan:PerformancePlan,source:SpearSource):void{
  const hands=ownedHands(source);
  for(const gesture of plan.gestures){
    if(!hands.has(rigHand(gesture)))continue;
    const span=gesture.sourceSpan;
    const overlap=span
      ?intersects(span.startMs,span.endMs,source.startMs,source.endMs)
      :intersects(gesture.startMs,gesture.endMs,0,plan.durationMs);
    if(overlap)fail('another local/source gesture owns an original spear hand over a positive intersection');
  }
}

function rejectManipulationConflicts(source:SpearSource,manipulation:ManipulationSource):void{
  if(manipulation.startMs!==source.startMs||manipulation.endMs!==source.endMs)
    fail('companion manipulation must retain the same complete original body clock');
  const props=new Set(source.props.map(prop=>prop.id));
  const tracks=new Set(source.spears.map(track=>track.id));
  if(manipulation.props.some(prop=>props.has(prop.id)))
    fail('original spear and generic manipulation prop identities collide');
  if(manipulation.gestures.some(gesture=>tracks.has(gesture.id)))
    fail('original spear track and generic manipulation gesture identities collide');
  const hands=ownedHands(source),duration=source.endMs-source.startMs;
  for(const gesture of manipulation.gestures)
    if(hands.has(rigHand(gesture))&&intersects(gesture.startMs,gesture.endMs,0,duration))
      fail('generic original manipulation owns an original spear hand over a positive intersection');
}

/** Structural and ownership validation only. Reach, shaft/stage bounds, ink,
 * contact and native-pose acceptance remain the physical compiler's authority. */
export function validateSpearSourcePlan(plan:PerformancePlan):void{
  if(plan.sourceSpear===undefined)return;
  const source=readSpear(plan.sourceSpear),body=readBody(plan.sourceBody);
  exactDuration(plan.durationMs);
  if(source.ownerId!==plan.leadCharacterId)
    fail('original spear owner differs from the resolved actor');
  if(body.startMs!==source.startMs||body.endMs!==source.endMs||
    source.endMs-source.startMs<plan.durationMs)
    fail('exact complete original body start/end and sufficient coverage are required');
  if(plan.props.length||(plan.spears?.length??0)>0||plan.lunge!==undefined)
    fail('local props/spears/lunge conflict with original spear ownership');
  validateBodySourcePlan(plan);
  if(source.lunge&&(body.walks.length||body.jumps?.length||body.postures?.length||body.entryPosture||body.supports?.length))
    fail('original planted lunge requires a fixed entry stance without conflicting body tracks or supports');
  rejectLocalHandConflicts(plan,source);
  if(plan.sourceManipulation!==undefined){
    validateManipulationSourcePlan(plan);
    rejectManipulationConflicts(source,readManipulation(plan.sourceManipulation));
  }
}

/** Lossless source-only naming adapter. No phase, target, grip, ID or pole is
 * inferred. The existing physical compiler continues to receive its native
 * twoHands and primary/secondary elbow-pole representation. */
function physicalSpears(source:SpearSource):PhysicalSpearTracks{
  return source.spears.map(track=>{
    const secondary:RigHand=track.hand==='left'?'right':'left';
    return {
      id:track.id,propId:track.propId,startMs:track.startMs,endMs:track.endMs,
      hand:track.hand,action:track.action,
      grip:structuredClone(track.grip),aim:structuredClone(track.aim),
      twoHands:track.twoHand,secondaryOffset:track.secondaryOffset,
      elbowPoles:{primary:track.elbowPoles[track.hand],secondary:track.elbowPoles[secondary]},
      readyMs:track.readyMs,contactMs:track.contactMs,recoverMs:track.recoverMs,
    };
  });
}

/** Complete original body and tools for canonical physical validation. Generic
 * transports, when present on disjoint hands, retain their unchanged history.
 * Shot-local gestures, gaze and expression commands are not transplanted into
 * the original run. Every recursive source field is explicitly cleared. */
export function spearSourcePlan(plan:PerformancePlan):PerformancePlan{
  if(plan.sourceSpear===undefined)return plan;
  validateSpearSourcePlan(plan);
  const source=readSpear(plan.sourceSpear);
  const manipulation=plan.sourceManipulation===undefined?undefined:readManipulation(plan.sourceManipulation);
  const physical=sourceBodyPlan(plan);
  return {
    ...physical,
    sourceBody:undefined,sourceManipulation:undefined,sourceHead:undefined,sourceSpear:undefined,
    durationMs:source.endMs-source.startMs,
    gestures:structuredClone(manipulation?.gestures??[]),
    props:structuredClone([...(manipulation?.props??[]),...source.props]),
    spears:physicalSpears(source),
    lunge:source.lunge===undefined?undefined:structuredClone(source.lunge),
    gazes:[],expressions:[],
  };
}

/** Compiler-facing tracks; existing local tracks remain unchanged when no
 * source spear is selected. Prop selection is integrated separately by parent. */
export function performanceSpears(plan:PerformancePlan):PhysicalSpearTracks{
  if(plan.sourceSpear===undefined)return plan.spears??[];
  validateSpearSourcePlan(plan);
  return physicalSpears(readSpear(plan.sourceSpear));
}

/** Every camera slice repeats the same full spear and body definitions. */
export function collectViewSourceSpear(
  entries:readonly ViewSourceSpearEntry[],runStartMs:number,runEndMs:number,
):SpearSource|undefined{
  if(!entries.some(entry=>entry.sourceSpear!==undefined))return undefined;
  exactSpan(runStartMs,runEndMs,'continuous run');
  let source:SpearSource|undefined,sourceHash:string|undefined,bodyHash:string|undefined;
  let coveredEnd=runStartMs;
  for(const entry of [...entries].sort((a,b)=>a.startMs-b.startMs)){
    exactSpan(entry.startMs,entry.endMs,'participating shot');
    if(entry.startMs!==coveredEnd||entry.endMs>runEndMs)
      fail('missing, duplicated or overlapping actor camera coverage');
    if(entry.sourceSpear===undefined)
      fail('a participating actor camera slice lost its complete original spear declaration');
    const declared=readSpear(entry.sourceSpear),body=readBody(entry.sourceBody);
    if(declared.ownerId!==entry.ownerId)
      fail('participating camera slice changed the original spear actor owner');
    if(declared.startMs!==runStartMs||declared.endMs!==runEndMs||
      body.startMs!==runStartMs||body.endMs!==runEndMs)
      fail('original spear and body declarations must exactly span the continuous run');
    const nextSourceHash=hash(declared),nextBodyHash=hash(body);
    if(sourceHash!==undefined&&sourceHash!==nextSourceHash)
      fail('original spear identity/hand/prop/shaft/grip/aim/phase/lunge definition changed between slices');
    if(bodyHash!==undefined&&bodyHash!==nextBodyHash)
      fail('original body definition changed between spear camera slices');
    source=source??declared;
    sourceHash=nextSourceHash;bodyHash=nextBodyHash;coveredEnd=entry.endMs;
  }
  if(coveredEnd!==runEndMs)fail('incomplete original actor spear coverage');
  return source;
}

/** Bind a local declaration to an explicit actor-owned full-run clock. Only
 * positive intersections on spear-owned hands are conflicts. */
export function validateViewSourceSpear(plan:PerformancePlan,clock:SpearViewClock):void{
  if(plan.sourceSpear===undefined&&clock.spearMotion===undefined)return;
  validateSpearSourcePlan(plan);
  if(plan.sourceSpear===undefined||clock.spearMotion===undefined)
    fail('missing local original spear declaration or complete clock context');
  exactDuration(plan.durationMs);
  exactSpan(clock.startMs,clock.endMs,'owned shot');
  exactSpan(clock.runStartMs,clock.runEndMs,'owned continuous run');
  const source=readSpear(plan.sourceSpear),context=readSpear(clock.spearMotion);
  if(clock.ownerId!==plan.leadCharacterId||clock.ownerId!==source.ownerId||
    clock.endMs-clock.startMs!==plan.durationMs)
    fail('actor or exact shot duration differs from the owned clock');
  if(source.startMs!==clock.runStartMs||source.endMs!==clock.runEndMs||
    clock.startMs<source.startMs||clock.endMs>source.endMs||hash(source)!==hash(context))
    fail('local original spear declaration differs from its complete owned run');
  const body=readBody(clock.bodyMotion),localBody=readBody(plan.sourceBody);
  if(body.startMs!==source.startMs||body.endMs!==source.endMs||hash(body)!==hash(localBody))
    fail('owned body context differs from the exact original spear body');
  if((plan.sourceManipulation===undefined)!==(clock.manipulationMotion===undefined))
    fail('companion original manipulation declaration/context mismatch');
  if(plan.sourceManipulation!==undefined&&clock.manipulationMotion!==undefined){
    const manipulation=readManipulation(plan.sourceManipulation);
    const manipulationContext=readManipulation(clock.manipulationMotion);
    if(hash(manipulation)!==hash(manipulationContext))
      fail('companion original manipulation changed in the owned clock');
    rejectManipulationConflicts(source,manipulationContext);
  }
  const hands=ownedHands(source);
  for(const gesture of clock.gestures)
    if(hands.has(gesture.hand)&&intersects(gesture.startMs,gesture.endMs,source.startMs,source.endMs))
      fail('another complete source gesture owns an original spear hand over a positive intersection');
}

/** Exact shot-relative to original-run-relative translation. No clamp, reset,
 * modulo, crop or phase normalization. Subtract global integer origins before
 * adding local time, avoiding avoidable large-global-clock cancellation. */
export function sourceSpearTime(
  plan:PerformancePlan,clock:SpearViewClock|undefined,timeMs:number,
):number{
  exactDuration(plan.durationMs);
  if(!Number.isFinite(timeMs)||timeMs<0||timeMs>plan.durationMs)
    fail('seek is outside the owned shot');
  if(plan.sourceSpear===undefined){
    if(clock?.spearMotion!==undefined)validateViewSourceSpear(plan,clock);
    return timeMs;
  }
  if(clock===undefined)fail('missing explicit owned shot clock');
  validateViewSourceSpear(plan,clock);
  const source=plan.sourceSpear;
  const originalTimeMs=(clock.startMs-source.startMs)+timeMs;
  if(!Number.isFinite(originalTimeMs)||originalTimeMs<0||originalTimeMs>source.endMs-source.startMs)
    fail('seek is outside the complete original spear run');
  return originalTimeMs;
}

export const sourceSpearDescription={
  version:SPEAR_SOURCE_VERSION,
  selection:'explicit performance.sourceSpear; no automatic illustrative model or asset binding',
  bindingGate:'needs-source-prop-binding',
  clock:'complete original body and entry-attached spear run repeated identically across every resolved actor camera slice, including primary/supporting swaps',
  invariant:'stable actor/prop/track identities, explicit primary hand/twoHand/per-hand poles, shaft/grips/aim and original thrust/lunge phases; no local restart or approximation',
  scope:'hold or one complete thrust per entry-owned spear; no implicit pickup/drop/throw/handoff; generic transports remain separate and may coexist only on disjoint hands',
  physicalAuthority:'existing compiler reach/bounds/ink/contact and native-pose acceptance gates',
  approved:false,productionReady:false,motionVerified:false,nativePoseAccepted:false,
} as const;
