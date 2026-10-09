import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import type {ShotHost} from '../host/schemas.js';
import type {HostGeometry,Anchor} from '../host/controller.js';
import {partAnchor} from '../host/controller.js';
import {hash} from '../core/utils.js';
import {isWholeSourceStatement} from '../explainer/plan.js';
import {sourceActor} from './source-actor.js';
import {boundProp} from './prop-owner.js';
import {sourceSpearBinding,validateSourceSpearBindings} from './source-spear-bindings.js';
import {validateSpearActionSlices} from './source-spear-actions.js';
import {actorProfile} from '../actors/model.js';
import {actorViewActingClock} from '../actors/view-acting-clock.js';
import {samplePhysicalPerformance,validatePerformance} from '../animation/compiler.js';
import {validateSourceGripWorld} from './source-grip-world.js';
import {sourceOwnershipFrame} from './source-ownership.js';
import {SOURCE_SPEAR_ACTION_VERSION} from './source-spear-action-reference.js';
import type {SourceWorldEvent} from './source-world-schemas.js';

type Action=ShotHost['actions'][number];
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: original spear interaction ${message}`);};
const distance=(a:Anchor,b:Anchor)=>Math.hypot(a.x-b.x,a.y-b.y);
const rotate=(p:Anchor,angle:number)=>{const a=angle*Math.PI/180;return {x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)};};
function targetDescriptor(shot:Shot,partId:string,anchor:'center'|'handle'|'label',narration:Narration){
  const c=shot.cinematic!,parts=shot.visualization!.parts.filter(p=>p.id===partId),models=c.models.filter(m=>m.partId===partId),art=c.artDirection?.models.filter(m=>m.partId===partId)??[];
  if(parts.length!==1||models.length!==1||art.length>1||anchor==='label')return fail(shot,'target requires one original entity/model and a physical center/handle');
  const part=parts[0]!,model=models[0]!,drawing=art[0];
  if(anchor==='handle'&&!drawing?.handleAnchor)return fail(shot,'handle needs an explicit authored anchor; no guessed handle');
  for(const refs of [part.sourceRefs,model.sourceRefs,...(drawing?[drawing.sourceRefs]:[])]){
    if(!refs.length||refs.some(r=>!part.sourceRefs.some(p=>hash(p)===hash(r))))return fail(shot,'target model/art lost original entity evidence');
    for(const ref of refs)if(ref.kind==='narration'&&!narration.segments.some(s=>s.id===ref.segmentId&&s.text.normalize('NFC').includes(ref.quote.normalize('NFC'))))return fail(shot,'target evidence is absent from original narration');
  }
  const canonical=c.sourceOwnership?.find(s=>s.partId===partId),bindings=c.propBindings.filter(b=>b.partId===partId);
  if(!canonical&&bindings.length>1)return fail(shot,'independent target has multiple physical owners');
  return {part,model,art:drawing,canonical,binding:bindings[0],identity:hash({part,model,art:drawing??null,canonical:canonical??null,bindings,stage:c.performance.stage,sourceWorld:c.sourceWorld??null})};
}
/** Original physical geometry only, not emitted-bake or pixel acceptance.
 * Moving owned/canonical centers retain their real actor/source clocks. Fixed
 * anchors cannot silently borrow a transformed glyph's old coordinates. */
function targetAt(shot:Shot,partId:string,anchor:'center'|'handle'|'label',globalMs:number,board:Storyboard,narration:Narration){
  const d=targetDescriptor(shot,partId,anchor,narration),p=shot.cinematic!.performance,base=partAnchor(shot,partId,anchor,p.stage.width,p.stage.height);
  let center={x:d.part.x*p.stage.width,y:d.part.y*p.stage.height},angle=0,kind:'fixed-model'|'owned-prop'|'canonical-entity'='fixed-model';
  if(d.canonical){
    const at=sourceOwnershipFrame(shot,d.canonical.id,globalMs,board,narration);center=at.center;angle=at.rotationDeg;kind='canonical-entity';
  }else if(d.binding){
    const owner=boundProp(shot,d.binding);
    if(!owner.character||d.binding.ownerId!==owner.id||!owner.performance.sourceManipulation&&!owner.performance.sourceSpear)return fail(shot,'moving target requires its actual visible original actor/source');
    const clock=actorViewActingClock(board,shot,owner.id);
    if(!clock)return fail(shot,'moving target lost its original actor clock');
    const profile=actorProfile(owner.character);validatePerformance(owner.performance,profile);
    const at=samplePhysicalPerformance(owner.performance,profile,globalMs-shot.startMs,clock).props[d.binding.propId];
    if(!at||![at.point.x,at.point.y,at.angle??0].every(Number.isFinite))return fail(shot,'moving target has no physical original entity state');
    center=at.point;angle=at.angle??0;kind='owned-prop';
    const span=owner.performance.sourceSpear??owner.performance.sourceManipulation!;
    validateSourceGripWorld(shot,d.part,span.startMs,span.endMs,{startMs:span.startMs,endMs:span.endMs});
  }else{
    // A one-time strike permits a later reaction. Any retained rotation or
    // current whole-glyph motion before contact needs its own anchor contract.
    validateSourceGripWorld(shot,d.part,globalMs,globalMs+0.0001);
  }
  const offset=rotate({x:base.x-d.part.x*p.stage.width,y:base.y-d.part.y*p.stage.height},angle);
  return {...d,kind,center,point:{x:center.x+offset.x,y:center.y+offset.y}};
}
export interface SourceSpearInteractionRecord {
  version:typeof SOURCE_SPEAR_ACTION_VERSION;actorId:string;sourceId:string;sourceHash:string;trackId:string;propId:string;shaftPartId:string;partId:string;operation:'hold-tool'|'thrust-tool';narrationAnchor:string;cueHash:string;modelHash:string;
  startMs:number;endMs:number;readyMs?:number;contactMs?:number;recoverMs?:number;sliceStartMs:number;sliceEndMs:number;inheritedContact:boolean;
  sampleMs:number;phase:string;tip:Anchor;shaftCenter:Anchor;gripHands:Array<'left'|'right'>;gripConstraintErrors:Record<string,number>;
  originalContact:null|{shotId:string;sampleMs:number;target:Anchor;tip:Anchor;errorPx:number};sampleTargetBasis:'current-physical-grip'|'original-contact-point';fingerprint:string;
  scope:'original-physical-tip-geometry-candidate';contactVerified:false;motionVerified:false;productionApproval:false;
}
/** Full original semantic witness and action history. Coordinates alone do
 * not invent a story action or a contact when a later camera begins. */
export function sourceSpearOperation(shot:Shot,actorId:string,action:Action,board:Storyboard|undefined,narration:Narration|undefined){
  if(!board||!narration)return fail(shot,'requires complete original storyboard and narration');
  validateSourceSpearBindings(shot,board,narration);
  const owner=sourceActor(shot,actorId),source=owner.performance.sourceSpear,ref=action.sourceSpear;
  if(!source||!ref||ref.sourceId!==source.id||owner.actions.filter(a=>hash(a)===hash(action)).length!==1)return fail(shot,'action is not the actual original person-owned slice');
  validateSpearActionSlices(owner.performance,owner.actions,shot.startMs);
  const track=source.spears.find(t=>t.id===ref.trackId),binding=shot.cinematic!.propBindings.find(b=>b.ownerId===actorId&&b.partId===ref.shaftPartId&&b.propId===track?.propId);
  if(!track||!binding||!sourceSpearBinding(shot,binding)||!action.target||!action.narrationAnchor)return fail(shot,'track, bound shaft entity, target or cue is absent');
  const operation=track.action==='hold'?'hold-tool':'thrust-tool',cue=narration.segments.find(s=>s.id===action.narrationAnchor);
  if(!cue)return fail(shot,'original narration cue is absent');
  const startMs=source.startMs+track.startMs,endMs=source.startMs+track.endMs,contactMs=track.contactMs===undefined?undefined:source.startMs+track.contactMs,recoverMs=track.recoverMs===undefined?undefined:source.startMs+track.recoverMs;
  if(operation==='thrust-tool'&&(action.target.partId===ref.shaftPartId||contactMs===undefined||recoverMs===undefined||contactMs<cue.startMs||contactMs>=cue.endMs||recoverMs>cue.endMs))return fail(shot,'thrust needs a different struck entity and original contact/hold inside its actual cue');
  const run=board.shots.filter(s=>s.startMs<source.endMs&&s.endMs>source.startMs),canonical=targetDescriptor(shot,action.target.partId,action.target.anchor,narration);
  let witness=false;
  for(const slice of run){
    const next=sourceActor(slice,actorId);validateSpearActionSlices(next.performance,next.actions,slice.startMs);
    if(hash(next.performance.sourceSpear)!==hash(source)||hash(targetDescriptor(slice,action.target.partId,action.target.anchor,narration).identity)!==hash(canonical.identity))return fail(slice,'original source or target model/art/ownership/world identity changed at a cut');
    for(const local of next.actions.filter(a=>a.sourceSpear?.sourceId===source.id&&a.sourceSpear.trackId===track.id))
      if(local.sourceSpear!.shaftPartId!==ref.shaftPartId||local.target?.modelId!==slice.visualization!.modelId||local.target.partId!==action.target.partId||local.target.anchor!==action.target.anchor||local.narrationAnchor!==cue.id)return fail(slice,'shaft/target/anchor/cue changed at a camera cut');
    witness ||= (slice.cinematic!.sceneIntent?.acting??[]).some(a=>a.participantId===actorId&&a.kind==='manipulation'&&a.operation===operation&&a.targetIds?.includes(action.target!.partId)&&isWholeSourceStatement(a.statement,cue.text)&&a.sourceRefs.some(r=>r.kind==='narration'&&r.segmentId===cue.id&&isWholeSourceStatement(a.statement,r.quote)));
  }
  if(!witness||operation==='hold-tool'&&(startMs>=cue.endMs||endMs<=cue.startMs))return fail(shot,'full original narrated tool-action statement is missing');
  return {owner,source,track,binding,run,cue,operation:operation as 'hold-tool'|'thrust-tool',startMs,endMs,contactMs,recoverMs,modelHash:canonical.identity,
    fingerprint:hash({actorId,source,ref,run,narration})};
}
export function sourceSpearInteractionGeometry(shot:Shot,actorId:string,action:Action,board:Storyboard|undefined,narration:Narration|undefined):HostGeometry['interactions'][number]{
  const d=sourceSpearOperation(shot,actorId,action,board,narration),sample=(slice:Shot,global:number)=>{
    const owner=sourceActor(slice,actorId),clock=actorViewActingClock(board!,slice,actorId);
    if(!clock?.spearMotion)return fail(slice,'physical original shaft clock is missing');
    const frame=samplePhysicalPerformance(owner.performance,actorProfile(owner.character),global-slice.startMs,clock),state=frame.props[d.track.propId];
    if(!state?.attached||state.angle===undefined||!state.tip)return fail(slice,'physical shaft center/angle/tip is missing');
    const hands:Array<'left'|'right'>=d.track.twoHand?['left','right']:[d.track.hand],errors:Record<string,number>={};
    for(const hand of hands){const error=frame.contactErrors[hand];if(!Number.isFinite(error)||error>1)return fail(slice,'actual gripping palm misses its original shaft');errors[hand]=error;}
    return {owner,frame,state,hands,errors};
  };
  let originalContact:SourceSpearInteractionRecord['originalContact']=null;
  if(d.contactMs!==undefined){
    const camera=board!.shots.find(s=>s.startMs<=d.contactMs!&&s.endMs>d.contactMs!);
    if(!camera)return fail(shot,'original contact has no actual half-open camera');
    const at=sample(camera,d.contactMs),target=targetAt(camera,action.target!.partId,action.target!.anchor,d.contactMs,board!,narration!),errorPx=distance(at.state.tip!,target.point);
    if(distance(d.track.aim,target.point)>1e-6&&distance(d.track.aim,{x:Math.round(target.point.x*1000)/1000,y:Math.round(target.point.y*1000)/1000})>1e-6)return fail(shot,'physical aim differs from its independently sourced target at contact');
    if(!Number.isFinite(errorPx)||errorPx>1)return fail(shot,'actual original tip misses its target');
    originalContact={shotId:camera.id,sampleMs:d.contactMs,target:target.point,tip:at.state.tip!,errorPx};
  }
  const sampleMs=action.contactMs??action.startMs,at=sample(shot,sampleMs),offset=rotate({x:d.source.props.find(p=>p.id===d.track.propId)!.gripOffset.x*at.owner.performance.scale,y:0},at.state.angle!);
  // The later camera reports distance to the already validated original strike
  // point. It does not claim another contact or a stationary target after a
  // reaction. A moving target's emitted geometry still needs runtime evidence.
  const target=d.operation==='hold-tool'?{x:at.state.point.x+offset.x,y:at.state.point.y+offset.y}:originalContact!.target;
  const effector=d.operation==='hold-tool'?at.frame.hands[d.track.hand]:at.state.tip!,errorPx=distance(effector,target);
  const record:SourceSpearInteractionRecord={version:SOURCE_SPEAR_ACTION_VERSION,actorId,sourceId:d.source.id,sourceHash:hash(d.source),trackId:d.track.id,propId:d.track.propId,shaftPartId:action.sourceSpear!.shaftPartId,partId:action.target!.partId,operation:d.operation,narrationAnchor:d.cue.id,cueHash:hash(d.cue),modelHash:d.modelHash,
    startMs:d.startMs,endMs:d.endMs,...(d.track.readyMs===undefined?{}:{readyMs:d.source.startMs+d.track.readyMs}),...(d.contactMs===undefined?{}:{contactMs:d.contactMs}),...(d.recoverMs===undefined?{}:{recoverMs:d.recoverMs}),sliceStartMs:action.startMs,sliceEndMs:action.endMs,
    inheritedContact:d.contactMs!==undefined&&d.contactMs<action.startMs,sampleMs,phase:at.state.phase??'hold',tip:at.state.tip!,shaftCenter:at.state.point,gripHands:at.hands,gripConstraintErrors:at.errors,originalContact,sampleTargetBasis:d.operation==='hold-tool'?'current-physical-grip':'original-contact-point',fingerprint:d.fingerprint,
    scope:'original-physical-tip-geometry-candidate',contactVerified:false,motionVerified:false,productionApproval:false};
  return {actorId,handSide:d.track.hand,type:action.type,startMs:action.startMs,reachMs:sampleMs,endMs:action.endMs,partId:action.target!.partId,target,hand:at.frame.hands[d.track.hand],errorPx,root:at.frame.root,gaze:target,
    ...(action.contactMs===undefined?{}:{contactMs:action.contactMs}),sourceSpear:record};
}
export function validateSourceSpearActions(shot:Shot,board:Storyboard,narration:Narration):void{
  const c=shot.cinematic;if(!c)return;
  const ids=[...(c.actorScene?.primary?[c.actorScene.primary.id]:[]),...(c.actorScene?.supporting.map(a=>a.character.id)??[])];
  if(!ids.length&&[...(shot.host?.actions??[]),...(c.actorScene?.supporting.flatMap(a=>a.actions)??[])].some(a=>a.sourceSpear))return fail(shot,'invisible actor owns a tool action');
  for(const id of ids){const owner=sourceActor(shot,id);validateSpearActionSlices(owner.performance,owner.actions,shot.startMs);
    for(const action of owner.actions.filter(a=>a.sourceSpear))sourceSpearInteractionGeometry(shot,id,action,board,narration);
  }
}
export function sourceSpearReaction(shot:Shot,event:SourceWorldEvent,board:Storyboard,narration:Narration){
  const ref=event.spearContact;
  if(![event.startMs,event.endMs].every(Number.isSafeInteger)||event.endMs<=event.startMs||shot.cinematic?.sourceWorld?.events.filter(e=>hash(e)===hash(event)).length!==1)return fail(shot,'reaction is not an exact positive original world event');
  if(!ref||event.contactEffector!=='spear-tip'||!event.contactRequired||event.contacts||event.contactHands||event.contactActorId!==ref.actorId)return fail(shot,'tip reaction cannot claim generic palm contacts');
  const contactCameras=board.shots.filter(s=>{
    const scene=s.cinematic?.actorScene,people=[...(scene?.primary?[{id:scene.primary.id,p:s.cinematic!.performance}]:[]),...(scene?.supporting.map(a=>({id:a.character.id,p:a.performance}))??[])];
    return people.some(p=>p.id===ref.actorId&&p.p.sourceSpear?.id===ref.sourceId&&p.p.sourceSpear.spears.some(t=>t.id===ref.trackId&&t.contactMs!==undefined&&s.startMs<=p.p.sourceSpear!.startMs+t.contactMs&&s.endMs>p.p.sourceSpear!.startMs+t.contactMs));
  });
  if(contactCameras.length!==1)return fail(shot,'reaction has no unique actual original contact camera/person/track');
  const camera=contactCameras[0]!,owner=sourceActor(camera,ref.actorId),actions=owner.actions.filter(a=>hash(a.sourceSpear)===hash({sourceId:ref.sourceId,trackId:ref.trackId,shaftPartId:ref.shaftPartId}));
  if(actions.length!==1)return fail(shot,'reaction lost its exact original tool action');
  const record=sourceSpearInteractionGeometry(camera,ref.actorId,actions[0]!,board,narration).sourceSpear!;
  if(record.operation!=='thrust-tool'||!record.originalContact||record.contactMs!>=event.startMs||record.narrationAnchor!==event.narrationAnchor||(event.contactPartId??event.targetId)!==record.partId)return fail(shot,'reaction precedes actual original tip contact or differs from its target/cue');
  if(event.targetId!==record.partId&&!shot.visualization!.relations.some(r=>r.kind==='cause'&&r.from===record.partId&&r.to===event.targetId&&r.sourceRefs.length&&r.sourceRefs.every(ref=>ref.kind!=='narration'||narration.segments.some(s=>s.id===ref.segmentId&&s.text.normalize('NFC').includes(ref.quote.normalize('NFC'))))))return fail(shot,'different reaction subject lacks its sourced causal relation');
  return {record,scope:'original-physical-tip-reaction-candidate' as const,contactVerified:false as const,motionVerified:false as const,productionApproval:false as const};
}
export const sourceSpearInteractionDescription={version:SOURCE_SPEAR_ACTION_VERSION,
  rule:'actual original tool person/track/shaft/entity/model/target/whole narration witness and exact action slice; palms grip shaft, thrust contact uses actual tip, reaction strictly follows its original contact',
  target:'physical independent fixed center/authored handle, complete original owned-prop or canonical moving center; never a target replaced by the current palm/tip or a clock reset',
  pending:['emitted SVG/GSAP versus physical target/shaft contact, dynamic fixed artwork anchor contracts and geometry/runtime/film acceptance','native tool art/motion and integrated source production audit/factory acceptance'],
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false,productionApproval:false};
