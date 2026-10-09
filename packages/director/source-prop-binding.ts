import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import type {Gesture} from '../animation/schemas.js';
import type {CinematicPlan} from './schemas.js';
import {rigHand} from '../core/identifiers.js';
import {hash} from '../core/utils.js';
import {isWholeSourceStatement} from '../explainer/plan.js';
import {actorProfile} from '../actors/model.js';
import {actorViewActingClock} from '../actors/view-acting-clock.js';
import {samplePhysicalPerformance} from '../animation/compiler.js';
import {performanceProps} from '../animation/view-source-manipulation.js';
import {hasBodyViewManipulation} from '../animation/native-contact-arm.js';
import {validateManipulationActionSlices} from './source-manipulation-actions.js';
import {boundProp,propPerformer} from './prop-owner.js';
import {SOURCE_PROP_BINDING_VERSION} from './source-prop-identity.js';

type Binding=CinematicPlan['propBindings'][number];
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: ${message}`);};
export function originalPropGesture(shot:Shot,binding:Binding){
  const owner=boundProp(shot,binding),gestures=owner.performance.sourceManipulation?.gestures??owner.performance.gestures;
  const matches=gestures.filter(g=>g.propId===binding.propId&&g.action!=='operate');
  if(matches.length!==1)return fail(shot,`model ${binding.partId} needs exactly one original attachment`);
  return {...owner,gesture:matches[0]!};
}
/** Real original geometry at a shot-local boundary. No audio, destination
 * shortcut, guessed palm, local contact reset or physical history mutation. */
export function sourceBoundPropFrame(shot:Shot,binding:Binding,timeMs:number,board:Storyboard|undefined){
  const owner=boundProp(shot,binding);
  if(!owner.performance.sourceManipulation||!owner.character||binding.ownerId!==owner.id||!board)
    return fail(shot,'original model geometry needs the explicit story owner and complete storyboard');
  const clock=actorViewActingClock(board,shot,owner.id);
  if(!clock?.manipulationMotion)return fail(shot,'missing complete original contact/body/head clock');
  const frame=samplePhysicalPerformance(owner.performance,actorProfile(owner.character),timeMs,clock),state=frame.props[binding.propId];
  if(!state)return fail(shot,'original model has no physical state');
  return {owner,clock,frame,state};
}
function descriptor(shot:Shot,binding:Binding){
  const owner=originalPropGesture(shot,binding),part=shot.visualization?.parts.find(p=>p.id===binding.partId),model=shot.cinematic?.models.find(m=>m.partId===binding.partId),art=shot.cinematic?.artDirection?.models.find(m=>m.partId===binding.partId);
  if(!part||!model)return fail(shot,'missing original model/entity descriptor');
  return {owner,part,model,art,identity:{ownerId:owner.id,propId:binding.propId,part,model,art:art??null,role:binding.role,sourceRefs:binding.sourceRefs}};
}
function citedContact(shot:Shot,ownerId:string,gesture:Gesture,partId:string,narration:Narration,startMs:number){
  const operation=gesture.action==='operate'?'contact':gesture.action;
  const evidence=shot.cinematic?.sceneIntent?.acting?.filter(a=>a.participantId===ownerId&&a.kind==='manipulation'&&a.operation===operation&&a.targetIds?.includes(partId))??[];
  const witnesses=evidence.flatMap(expected=>expected.sourceRefs.flatMap(ref=>{
    if(ref.kind!=='narration'||!isWholeSourceStatement(expected.statement,ref.quote))return [];
    const cue=narration.segments.find(s=>s.id===ref.segmentId&&s.text.normalize('NFC').includes(ref.quote.normalize('NFC')));
    if(!cue||!isWholeSourceStatement(expected.statement,cue.text)||startMs+gesture.contactMs!<cue.startMs||startMs+gesture.contactMs!>=cue.endMs)return [];
    if(gesture.releaseMs!==undefined&&startMs+gesture.releaseMs>cue.endMs||gesture.landingMs!==undefined&&startMs+gesture.landingMs>cue.endMs)return [];
    return [{cueId:cue.id,sourceRef:ref,statement:expected.statement}];
  }));
  return witnesses;
}
/** Validate the real complete original actor/model history, including every
 * camera slice and primary/supporting swap. Does not approve artwork or open
 * the still-pending world/event/effect renderer contract. */
export function validateSourcePropBindings(shot:Shot,board:Storyboard|undefined,narration:Narration|undefined):void{
  const c=shot.cinematic;if(!c)return;
  const sourceOwners=[...(c.actorScene?.primary&&c.performance.sourceManipulation?[{id:c.actorScene.primary.id,performance:c.performance}]:[]),
    ...(c.actorScene?.supporting.filter(a=>a.performance.sourceManipulation).map(a=>({id:a.character.id,performance:a.performance}))??[])];
  if(!sourceOwners.length){if(c.performance.sourceManipulation)return fail(shot,'original contact requires a visible sourced story actor');return;}
  if(!board||!narration)return fail(shot,'complete storyboard and original narration are required for model evidence');
  if(board.shots.filter(s=>s.id===shot.id).length!==1||hash(board.shots.find(s=>s.id===shot.id))!==hash(shot))return fail(shot,'candidate differs from its authoritative complete storyboard');
  for(const sourceOwner of sourceOwners){
    const source=sourceOwner.performance.sourceManipulation!,clock=actorViewActingClock(board,shot,sourceOwner.id);
    if(!clock?.manipulationMotion)return fail(shot,'missing complete original actor contact clock');
    const slices=board.shots.filter(s=>s.startMs>=source.startMs&&s.endMs<=source.endMs).sort((a,b)=>a.startMs-b.startMs);
    let end=source.startMs;
    for(const slice of slices){if(slice.startMs!==end)return fail(shot,'model source camera coverage has a gap');end=slice.endMs;}
    if(end!==source.endMs)return fail(shot,'model source camera coverage is incomplete');
    for(const slice of slices){
      const plans=[slice.cinematic!.performance,...(slice.cinematic!.actorScene?.supporting.map(a=>a.performance)??[])],ids=plans.flatMap(p=>performanceProps(p).map(prop=>prop.id)),bindings=slice.cinematic!.propBindings;
      if(new Set(ids).size!==ids.length||bindings.length!==ids.length||new Set(bindings.map(b=>b.partId)).size!==bindings.length||new Set(bindings.map(b=>boundProp(slice,b).svgId)).size!==bindings.length)return fail(slice,'ambiguous visible prop/model/painter ownership');
    }
    for(const prop of performanceProps(sourceOwner.performance)){
      const current=c.propBindings.filter(b=>b.propId===prop.id&&b.ownerId===sourceOwner.id);
      if(current.length!==1)return fail(shot,'each original prop needs exactly one explicit person/model binding');
      const canonical=descriptor(shot,current[0]!),p=canonical.owner.performance,offset=prop.gripOffset??{x:0,y:0};
      if(canonical.owner.id!==sourceOwner.id||!canonical.owner.character)return fail(shot,'original model person is not visible');
      if(!hasBodyViewManipulation(actorProfile(canonical.owner.character)))return fail(shot,'original model requires explicit own native manipulation selection');
      if(Math.abs(prop.origin.x-canonical.part.x*p.stage.width)>Number.EPSILON*4*Math.max(1,p.stage.width)||Math.abs(prop.origin.y-canonical.part.y*p.stage.height)>Number.EPSILON*4*Math.max(1,p.stage.height))return fail(shot,'model canonical origin differs from the original prop center');
      if(Math.hypot(canonical.owner.gesture.target!.x-prop.origin.x-offset.x*p.scale,canonical.owner.gesture.target!.y-prop.origin.y-offset.y*p.scale)>1e-6)return fail(shot,'original grip target differs from its actual model center/offset');
      if(canonical.owner.gesture.destination&&(!prop.destination||Math.hypot(canonical.owner.gesture.destination.x-offset.x*p.scale-prop.destination.x,canonical.owner.gesture.destination.y-offset.y*p.scale-prop.destination.y)>1e-6))return fail(shot,'original placed center differs from the original grip destination');
      for(const slice of slices){
        const matches=slice.cinematic?.propBindings.filter(b=>b.propId===prop.id&&b.ownerId===sourceOwner.id)??[];
        if(matches.length!==1)return fail(slice,'original model binding missing, duplicated or assigned to another person');
        const binding=matches[0]!,next=descriptor(slice,binding),owned=next.owner;
        if(hash(owned.performance.stage)!==hash(slice.cinematic!.performance.stage)||owned.performance.durationMs!==slice.endMs-slice.startMs||owned.performance.leadCharacterId!==owned.id)return fail(slice,'original model has a different scene stage/clock/person');
        if(hash(next.identity)!==hash(canonical.identity))return fail(slice,'original entity/model/art/source/size/origin identity changed at a cut');
        if(!owned.performance.sourceManipulation||hash(owned.performance.sourceManipulation)!==hash(source)||owned.id!==sourceOwner.id)return fail(slice,'original contact source/person changed at a cut');
        if(!slice.cinematic?.artDirection||!['authored','model'].includes(slice.cinematic.artDirection.origin))return fail(slice,'original model requires sourced authored/model direction');
        if(!binding.sourceRefs.length||binding.sourceRefs.some(ref=>!next.part.sourceRefs.some(r=>hash(r)===hash(ref)))||next.art&&binding.sourceRefs.some(ref=>!next.art!.sourceRefs.some(r=>hash(r)===hash(ref))))return fail(slice,'original binding lost its entity/art source evidence');
        for(const ref of binding.sourceRefs)if(ref.kind==='narration'&&!narration.segments.some(s=>s.id===ref.segmentId&&s.text.normalize('NFC').includes(ref.quote.normalize('NFC'))))return fail(slice,'model source quote is not in the original narration');
        validateManipulationActionSlices(owned.performance,owned.actions,slice.startMs);
        const actions=owned.actions.filter(a=>a.sourceManipulation?.sourceId===source.id&&a.sourceManipulation.gestureId===owned.gesture.id);
        if(actions.some(a=>a.target?.partId!==binding.partId||a.target.modelId!==slice.visualization!.modelId||a.target.anchor!=='center'||rigHand(a)!==rigHand(owned.gesture)))return fail(slice,'original contact action targets a different sourced entity/hand');
        const other=[...(slice.host?.actions??[]),...(slice.cinematic?.actorScene?.supporting.flatMap(a=>a.actions)??[])].filter(a=>[a.target,a.secondTarget].some(t=>t?.partId===binding.partId)&&!actions.includes(a));
        if(other.some(a=>a.endMs>source.startMs+owned.gesture.contactMs!))return fail(slice,'another fixed target/action cannot follow an original moving model');
        // The full source statement can be declared on the contact-owning slice;
        // later slices retain its real witness, never a new cue or contact.
        const evidence=slices.flatMap(s=>{const actor=propPerformer(s,(s.cinematic!.propBindings.find(b=>b.ownerId===sourceOwner.id&&b.propId===prop.id))!);return (s.cinematic?.sceneIntent?.acting??[]).some(a=>a.participantId===actor.id&&a.kind==='manipulation'&&a.operation===owned.gesture.action&&a.targetIds?.includes(binding.partId))?[s]:[];});
        let witnesses:ReturnType<typeof citedContact>=[];
        for(const s of evidence)witnesses.push(...citedContact(s,owned.id,owned.gesture,binding.partId,narration,source.startMs));
        if(!witnesses.length)return fail(slice,'original action lacks a complete narration witness in its source run');
        for(const action of actions){const cue=narration.segments.find(s=>s.id===action.narrationAnchor);
          if(!cue||!slice.narrationSegmentIds?.includes(cue.id)||cue.startMs>=action.endMs||cue.endMs<=action.startMs||!witnesses.some(w=>w.cueId===cue.id))return fail(slice,'camera action cue is not the original contact statement witness');}
      }
    }
  }
}
export const sourcePropBindingDescription={version:SOURCE_PROP_BINDING_VERSION,
  scope:'complete original story-person/model/entity/art/source/action/clock binding and physical entry/exit candidate',
  rule:'explicit binding ownerId on every source slice; stable canonical model origin/size/art/evidence and complete original narration witness; physical positions from actual original prop frame',
  pending:['source event/reaction/effect/thermal/control timelines','canonical source action group/interaction renderer and acting coverage','full runtime/art/motion/video/input/resume acceptance'],
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false};
