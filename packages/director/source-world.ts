import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {rigHand} from '../core/identifiers.js';
import {actorProfile} from '../actors/model.js';
import {actorViewActingClock} from '../actors/view-acting-clock.js';
import {hasBodyViewManipulation} from '../animation/native-contact-arm.js';
import {isWholeSourceStatement} from '../explainer/plan.js';
import {validateManipulationActionSlices} from './source-manipulation-actions.js';
import {SourceWorldSchema,type SourceWorld,type SourceWorldEvent} from './source-world-schemas.js';
import {SOURCE_WORLD_VERSION} from './source-world-reference.js';

type Event=NonNullable<Shot['visualization']>['events'][number];
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: original world ${message}`);};
function actor(shot:Shot,id:string){
  const c=shot.cinematic,scene=c?.actorScene;
  const all=[...(scene?.primary?[{character:scene.primary,performance:c!.performance,actions:shot.host?.actions??[]}]:[]),...(scene?.supporting??[])];
  const matches=all.filter(a=>a.character.id===id);
  if(matches.length!==1)return fail(shot,'requires one explicit visible contact person');
  return matches[0]!;
}
/** Exact global event intersection. Contacts and phase stay in sourceWorld;
 * no new contact, rewritten cue or reconstructed history at a camera cut. */
export function projectSourceWorldEvents(world:SourceWorld,startMs:number,endMs:number):Event[]{
  SourceWorldSchema.parse(world);
  if(!Number.isSafeInteger(startMs)||!Number.isSafeInteger(endMs)||startMs<world.startMs||endMs>world.endMs||endMs<=startMs)throw new Error('needs-source-prop-binding: invalid original world camera slice');
  return world.events.flatMap(({id,contacts:_,...event})=>{
    const start=Math.max(event.startMs,startMs),end=Math.min(event.endMs,endMs);
    return start<end?[{...event,startMs:start,endMs:end,sourceWorld:{sourceId:world.id,eventId:id}}]:[];
  });
}
export function sourceWorldEvent(shot:Shot,event:Event):SourceWorldEvent{
  const world=shot.cinematic?.sourceWorld,ref=event.sourceWorld,original=world?.events.find(e=>e.id===ref?.eventId);
  if(!world||!ref||ref.sourceId!==world.id||!original)return fail(shot,'event has no exact original source');
  const projected=projectSourceWorldEvents(world,shot.startMs,shot.endMs).find(e=>e.sourceWorld?.eventId===ref.eventId);
  if(!projected||hash(projected)!==hash(event))return fail(shot,'event clock/identity/evidence differs from its original projection');
  return original;
}
/** Structural validation only. Original contact geometry is still checked by
 * the native compiler; this never invents a palm or approves art/motion. */
export function validateSourceWorld(shot:Shot,board?:Storyboard,narration?:Narration):void{
  const c=shot.cinematic,world=c?.sourceWorld;
  if(!world){if(shot.visualization?.events.some(e=>e.sourceWorld))return fail(shot,'reference has no complete timeline');return;}
  SourceWorldSchema.parse(world);
  if(!c.actorScene||c.spriteStage||!board||!narration)return fail(shot,'requires a canonical actor scene, complete storyboard and original narration');
  if(board.shots.filter(s=>s.id===shot.id).length!==1||hash(board.shots.find(s=>s.id===shot.id))!==hash(shot))return fail(shot,'candidate differs from its authoritative storyboard');
  const slices=board.shots.filter(s=>s.startMs<world.endMs&&s.endMs>world.startMs).sort((a,b)=>a.startMs-b.startMs);
  let end=world.startMs;
  const identity=(s:Shot)=>({stage:s.cinematic?.performance.stage,setting:s.cinematic?.setting,environmentAssetId:s.cinematic?.environmentAssetId,palette:s.cinematic?.artDirection?.palette,useEnvironment:s.cinematic?.artDirection?.useEnvironment,parts:[...(s.visualization?.parts??[])].sort((a,b)=>a.id.localeCompare(b.id)),relations:s.visualization?.relations,models:[...(s.cinematic?.models??[])].sort((a,b)=>a.partId.localeCompare(b.partId)),art:[...(s.cinematic?.artDirection?.models??[])].sort((a,b)=>a.partId.localeCompare(b.partId))});
  for(const slice of slices){
    if(slice.startMs!==end||slice.endMs>world.endMs)return fail(slice,'camera coverage is incomplete or crosses an original boundary');end=slice.endMs;
    if(!slice.cinematic?.actorScene||slice.cinematic.spriteStage||hash(slice.cinematic.sourceWorld)!==hash(world))return fail(slice,'timeline changed or was lost at a cut');
    if(hash(identity(slice))!==hash(identity(shot)))return fail(slice,'model/entity/art/relation/palette/environment/stage identity changed at a cut');
    if(hash(slice.visualization?.events)!==hash(projectSourceWorldEvents(world,slice.startMs,slice.endMs)))return fail(slice,'events must be exact original projections, with no added local reaction/reset');
  }
  if(end!==world.endMs)return fail(shot,'camera coverage does not complete the original timeline');
  const v=shot.visualization!;
  for(const event of world.events){
    const part=v.parts.find(p=>p.id===event.targetId),cue=narration.segments.find(s=>s.id===event.narrationAnchor);
    if(!part||!cue||event.startMs<cue.startMs||event.endMs>cue.endMs||!event.sourceRefs.some(r=>r.kind==='narration'&&r.segmentId===cue.id))return fail(shot,'event lacks its actual narrated subject and full original cue clock');
    for(const ref of event.sourceRefs)if(ref.kind==='narration'&&!narration.segments.some(s=>s.id===ref.segmentId&&s.text.normalize('NFC').includes(ref.quote.normalize('NFC'))))return fail(shot,'event quote is absent from the original narration');
    if(event.type==='flow'&&(!event.relationTo||!v.relations.some(r=>['transfer','cause'].includes(r.kind)&&r.from===event.targetId&&r.to===event.relationTo)))return fail(shot,'flow lacks its original directed relation');
    if(event.type==='state'&&(!event.state||event.contactRequired||event.motion!=='none'||!part.states?.some(s=>s.value===event.state&&hash(s.sourceRefs)===hash(event.sourceRefs))))return fail(shot,'thermal state is not the actual sourced state');
    if(event.state&&event.type!=='state')return fail(shot,'thermal value requires a state event');
    if(world.events.some(other=>other!==event&&other.targetId===event.targetId&&other.startMs<event.endMs&&other.endMs>event.startMs&&((event.motion!=='none'&&other.motion===event.motion)||(event.type==='state'&&other.type==='state')||(event.type==='flow'&&other.type==='flow'&&event.relationTo===other.relationTo))))return fail(shot,'overlapping events own the same model property');
    if(!event.contactRequired){if(event.contacts||event.contactActorId||event.contactHands)return fail(shot,'passive event cannot claim contact ownership');continue;}
    if(!event.contactActorId||!event.contactHands?.length||new Set(event.contactHands).size!==event.contactHands.length||event.contacts?.length!==event.contactHands.length)return fail(shot,'reaction requires explicit original person and exact required hands');
    const hands=new Set<string>();
    for(const contact of event.contacts!){
      if(contact.actorId!==event.contactActorId)return fail(shot,'reaction was assigned to another person');
      const first=slices.find(s=>[s.cinematic?.actorScene?.primary?.id,...(s.cinematic?.actorScene?.supporting.map(a=>a.character.id)??[])].includes(contact.actorId));
      if(!first)return fail(shot,'contact person is not visible');
      const owner=actor(first,contact.actorId),source=owner.performance.sourceManipulation,g=source?.gestures.find(g=>g.id===contact.gestureId);
      if(!source||source.id!==contact.sourceId||!g||g.contactMs===undefined||!hasBodyViewManipulation(actorProfile(owner.character)))return fail(shot,'reaction lost its explicit original native contact');
      const clock=actorViewActingClock(board,first,contact.actorId);
      if(!clock?.manipulationMotion)return fail(shot,'contact lacks its complete original body/head/hand history');
      const hand=rigHand(g),contactMs=source.startMs+g.contactMs;
      if(hands.has(hand)||!event.contactHands.includes(hand)||contactMs>=event.startMs||source.startMs+g.endMs<event.endMs)return fail(shot,'reaction precedes contact or exceeds its original hand action');hands.add(hand);
      const contactPart=event.contactPartId??event.targetId;
      const run=board.shots.filter(s=>s.startMs>=source.startMs&&s.endMs<=source.endMs).sort((a,b)=>a.startMs-b.startMs);
      let statement=false;
      for(const slice of run){
        const owned=actor(slice,contact.actorId);
        if(hash(owned.performance.sourceManipulation)!==hash(source))return fail(slice,'contact source changed at a cut');
        validateManipulationActionSlices(owned.performance,owned.actions,slice.startMs);
        const actions=owned.actions.filter(a=>a.sourceManipulation?.sourceId===source.id&&a.sourceManipulation.gestureId===g.id);
        if(actions.some(a=>a.target?.modelId!==slice.visualization?.modelId||a.target?.partId!==contactPart||a.narrationAnchor!==event.narrationAnchor))return fail(slice,'reaction target/cue differs from its actual original contact action');
        const operation=g.action==='operate'?'contact':g.action;
        statement ||= (slice.cinematic?.sceneIntent?.acting??[]).some(a=>a.participantId===contact.actorId&&a.kind==='manipulation'&&a.operation===operation&&a.targetIds?.includes(contactPart)&&isWholeSourceStatement(a.statement,cue.text)&&a.sourceRefs.some(r=>r.kind==='narration'&&r.segmentId===cue.id&&isWholeSourceStatement(a.statement,r.quote)));
      }
      if(!statement||contactMs<cue.startMs||contactMs>=cue.endMs)return fail(shot,'reaction is not bound to its complete original narrated contact statement');
      // The target geometry/grip/source for carried entities is validated by
      // validateSourcePropBindings; fixed operate targets remain a separate
      // production contract until source action groups/coverage are integrated.
    }
  }
}
export function sourceWorldIdentity(shot:Shot,board:Storyboard,narration:Narration){
  const world=shot.cinematic?.sourceWorld;if(!world)return undefined;
  const original=board.shots.filter(s=>s.id!==shot.id).concat(shot).filter(s=>s.startMs<world.endMs&&s.endMs>world.startMs).sort((a,b)=>a.startMs-b.startMs);
  return {version:SOURCE_WORLD_VERSION,scope:'structural-cache-input-only',fingerprint:hash({world,original,narration}),approved:false,motionVerified:false};
}
export const sourceWorldDescription={version:SOURCE_WORLD_VERSION,selection:'explicit cinematic.sourceWorld with complete original global events; visualization.events are exact sourceId/eventId camera intersections',
  statePolicy:'thermal paint persists until the next sourced state; reveals persist after first appearance; highlight/particle windows remain bounded',
  history:'thermal/control/effect/flow/motion phase uses original global time, including history before a camera cut; no re-contact or local event restart',
  evidence:'complete original storyboard/model/entity/art/relation/stage identity and exact native person/source/gesture/hand/narration contact witnesses',
  pending:['source action groups, interaction geometry, fixed-operate targets and acting coverage production contract','world/render/cache/resume geometry/runtime/film acceptance'],
  approved:false,productionReady:false,motionVerified:false,productionBinding:'needs-source-prop-binding'};
