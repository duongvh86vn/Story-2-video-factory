import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import type {ShotHost} from '../host/schemas.js';
import {partAnchor} from '../host/controller.js';
import {hash} from '../core/utils.js';
import {rigHand} from '../core/identifiers.js';
import {actorProfile} from '../actors/model.js';
import {actorViewActingClock} from '../actors/view-acting-clock.js';
import {hasBodyViewManipulation} from '../animation/native-contact-arm.js';
import {gestureRecoveryStart} from '../animation/compiler.js';
import {validateManipulationActionSlices} from './source-manipulation-actions.js';
import {isWholeSourceStatement} from '../explainer/plan.js';
import {sourceActor} from './source-actor.js';
import {validateSourceGripWorld} from './source-grip-world.js';

type Action=ShotHost['actions'][number];
export const SOURCE_FIXED_OPERATION_VERSION='source-fixed-operation-1';
const fail=(shot:Shot,message:string):never=>{throw new Error(shot.id+': needs-source-prop-binding: fixed original operation '+message);};
/** Full original fixed entity/anchor/contact evidence. Coordinates do not
 * supply story semantics; the authored action and complete cue do. */
export function sourceFixedOperation(shot:Shot,actorId:string,action:Action,board:Storyboard|undefined,narration:Narration|undefined){
  if(!board||!narration||board.shots.filter(s=>s.id===shot.id).length!==1||hash(board.shots.find(s=>s.id===shot.id))!==hash(shot))return fail(shot,'requires the authoritative complete storyboard and original narration');
  const owner=sourceActor(shot,actorId),source=owner.performance.sourceManipulation,ref=action.sourceManipulation;
  if(!source||!ref||ref.sourceId!==source.id||owner.actions.filter(a=>hash(a)===hash(action)).length!==1)return fail(shot,'action is not the actual original person-owned slice');
  validateManipulationActionSlices(owner.performance,owner.actions,shot.startMs);
  const g=source.gestures.find(g=>g.id===ref.gestureId);
  if(!g||g.action!=='operate'||g.propId||g.destination||g.carryOffset||g.landingMs!==undefined||!g.target||g.contactMs===undefined||!action.target||action.target.anchor==='label'||!action.narrationAnchor)return fail(shot,'requires one explicit fixed center/handle gesture, without attachment/placement');
  if(!hasBodyViewManipulation(actorProfile(owner.character))||!actorViewActingClock(board,shot,actorId)?.manipulationMotion)return fail(shot,'requires the actual own-model native selection and complete actor clock');
  const partId=action.target.partId,run=board.shots.filter(s=>s.startMs<source.endMs&&s.endMs>source.startMs).sort((a,b)=>a.startMs-b.startMs);
  const contactMs=source.startMs+g.contactMs,recoverMs=source.startMs+gestureRecoveryStart(g);
  if(recoverMs<=contactMs||recoverMs>=source.startMs+g.endMs)return fail(shot,'contact and recovery do not fit the original operation');
  const cue=narration.segments.find(c=>c.id===action.narrationAnchor);
  if(!cue||contactMs<cue.startMs||recoverMs>cue.endMs)return fail(shot,'original contact/hold is outside its complete actual cue');
  const model=(slice:Shot)=>{
    const c=slice.cinematic,p=slice.visualization?.parts.filter(p=>p.id===partId),m=c?.models.filter(m=>m.partId===partId),art=c?.artDirection?.models.filter(m=>m.partId===partId);
    if(!c||p?.length!==1||m?.length!==1||!c.artDirection||!['authored','model'].includes(c.artDirection.origin))return fail(slice,'requires a unique sourced original fixed entity/model and authored direction');
    const sliceOwner=sourceActor(slice,actorId),stage=sliceOwner.performance.stage;
    if(stage.width!==c.performance.stage.width||stage.height!==c.performance.stage.height)return fail(slice,'person and fixed entity do not share world frame dimensions');
    const part=p[0]!,model=m[0]!,drawing=art?.[0];
    if((art?.length??0)>1||c.propBindings.some(b=>b.partId===partId))return fail(slice,'fixed entity is duplicated or owned as a moving prop');
    if(action.target!.anchor==='handle'&&!drawing?.handleAnchor)return fail(slice,'handle requires its explicit authored artwork anchor; no guessed grip');
    for(const refs of [part.sourceRefs,model.sourceRefs,...(drawing?[drawing.sourceRefs]:[])]){
      if(!refs.length||refs.some(ref=>!part.sourceRefs.some(r=>hash(r)===hash(ref))))return fail(slice,'model/art lost its original entity source');
      for(const ref of refs)if(ref.kind==='narration'&&!narration.segments.some(n=>n.id===ref.segmentId&&n.text.normalize('NFC').includes(ref.quote.normalize('NFC'))))return fail(slice,'entity quote is absent from original narration');
    }
    if(hash(c.sourceWorld)!==hash(shot.cinematic!.sourceWorld))return fail(slice,'fixed target lost its original world history at a cut');
    validateSourceGripWorld(slice,part,contactMs,recoverMs);
    const anchor=partAnchor(slice,partId,action.target!.anchor,stage.width,stage.height);
    if(Math.hypot(anchor.x-g.target!.x,anchor.y-g.target!.y)>1e-6&&Math.hypot(Math.round(anchor.x*1000)/1000-g.target!.x,Math.round(anchor.y*1000)/1000-g.target!.y)>1e-6)return fail(slice,'declared model anchor differs from the original physical hand target');
    return {part,model,art:drawing??null,anchor,identity:{part,model,art:drawing??null,stage,setting:c.setting,environmentAssetId:c.environmentAssetId,palette:c.artDirection.palette,useEnvironment:c.artDirection.useEnvironment}};
  };
  const canonical=model(shot);let end=source.startMs,witness=false;
  for(const slice of run){
    if(slice.startMs!==end||slice.endMs>source.endMs)return fail(slice,'missing or overlapping original camera coverage');end=slice.endMs;
    const next=sourceActor(slice,actorId),c=slice.cinematic!;
    if(hash(next.performance.sourceManipulation)!==hash(source)||hash(next.performance.stage)!==hash(owner.performance.stage)||next.performance.durationMs!==slice.endMs-slice.startMs||next.performance.leadCharacterId!==actorId)return fail(slice,'person/source/stage/action clock changed at cut');
    validateManipulationActionSlices(next.performance,next.actions,slice.startMs);
    if(hash(model(slice).identity)!==hash(canonical.identity))return fail(slice,'original model/entity/art/environment identity changed at cut');
    for(const local of next.actions.filter(a=>a.sourceManipulation?.sourceId===source.id&&a.sourceManipulation.gestureId===g.id))
      if(local.target?.modelId!==slice.visualization!.modelId||local.target?.partId!==partId||local.target.anchor!==action.target.anchor||rigHand(local)!==rigHand(g)||local.narrationAnchor!==cue.id||!slice.narrationSegmentIds?.includes(cue.id)||local.startMs>=cue.endMs||local.endMs<=cue.startMs)return fail(slice,'camera action lost its original entity/anchor/hand/cue');
    witness ||= (c.sceneIntent?.acting??[]).some(a=>a.participantId===actorId&&a.kind==='manipulation'&&a.operation==='contact'&&a.targetIds?.includes(partId)&&isWholeSourceStatement(a.statement,cue.text)&&a.sourceRefs.some(r=>r.kind==='narration'&&r.segmentId===cue.id&&isWholeSourceStatement(a.statement,r.quote)));
  }
  if(end!==source.endMs||!witness)return fail(shot,'complete source coverage and full original contact statement are required');
  return {owner,source,gesture:g,run,cue,...canonical,contactMs,recoverMs,modelHash:hash(canonical.identity),fingerprint:hash({actorId,source,gestureId:g.id,run,narration})};
}
export const sourceFixedOperationDescription={version:SOURCE_FIXED_OPERATION_VERSION,
  rule:'explicit original person/gesture/hand, stable fixed entity/model/art center or handle and complete original narration contact witness across all source camera slices',
  geometry:'independent fixed world anchor at original contact/hold; no moving prop, changing anchor or model transform while contact is held; recovery uses the canonical compiler schedule',
  pending:['full integrated source production audit and runtime/geometry/art/motion/film acceptance','shared/sequential ownership and complete factory acceptance'],
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false};
