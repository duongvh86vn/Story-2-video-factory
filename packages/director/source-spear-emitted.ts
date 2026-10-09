import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import type {compilePerformance} from '../animation/compiler.js';
import {emittedTransformTrack,EMITTED_TRANSFORM_VERSION} from '../animation/svg-transform-track.js';
import {hash} from '../core/utils.js';
import {partAnchor} from '../host/controller.js';
import {actorProfile} from '../actors/model.js';
import {sourceActor} from './source-actor.js';
import {boundProp} from './prop-owner.js';
import {sourceSpearOperation} from './source-spear-interactions.js';
import {modelContactPoint} from './model-contact-motion.js';
import {ownershipScene,type OwnershipScene} from './ownership-scene.js';
import {ownershipBakeAt} from './ownership-bake-query.js';

export const SOURCE_SPEAR_EMITTED_VERSION='source-spear-emitted-1';
export type ActorCompilations=ReadonlyMap<string,ReturnType<typeof compilePerformance>>;
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: emitted original spear ${message}`);};
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
/** Renderer passes its actual actor compilations and canonical bake. This
 * observer never invokes a compiler and never fabricates another camera's
 * contact. Geometry diagnostics do not approve contours, depth or motion. */
export function inspectEmittedSpearActions(shot:Shot,board:Storyboard|undefined,narration:Narration|undefined,compilations:ActorCompilations,ownership?:OwnershipScene){
  const c=shot.cinematic;if(!c?.actorScene)return [];
  const people=[...(c.actorScene.primary?[c.actorScene.primary.id]:[]),...c.actorScene.supporting.map(a=>a.character.id)];
  if(!people.some(id=>sourceActor(shot,id).performance.sourceSpear))return [];
  if(!board||!narration)return fail(shot,'requires complete original storyboard and narration');
  const readers=new Map<string,ReturnType<typeof emittedTransformTrack>>();
  const reader=(id:string)=>{
    const existing=readers.get(id);if(existing)return existing;
    const owner=sourceActor(shot,id),compiled=compilations.get(id),prefix=c.actorScene!.primary?.id===id?'':`actor-${id}-`;
    if(!compiled)return fail(shot,'missing actual visible owner compilation');
    const props=c.propBindings.filter(b=>boundProp(shot,b).id===id).map(b=>`prop-${b.propId}`);
    const next=emittedTransformTrack(owner.performance,actorProfile(owner.character).profileHash,prefix,['hand-left','hand-right',...props],compiled);
    readers.set(id,next);return next;
  };
  const target=(partId:string,anchor:'center'|'handle'|'label',global:number)=>{
    const part=shot.visualization!.parts.find(p=>p.id===partId);if(!part)return fail(shot,'actual target entity is missing');
    const canonical=c.sourceOwnership?.find(s=>s.partId===partId),binding=c.propBindings.find(b=>b.partId===partId),art=c.artDirection?.models.find(m=>m.partId===partId),owner=binding&&!canonical?boundProp(shot,binding):undefined;
    const width=part.width*c.performance.stage.width,height=part.height*c.performance.stage.height,scale=owner?.performance.scale??1;
    const declared=partAnchor(shot,partId,anchor,c.performance.stage.width,c.performance.stage.height);
    const projected=art?.contactFrame?modelContactPoint(shot,partId,anchor,global,width/scale,height/scale):undefined;
    if(projected&&(projected.visible!==1||projected.opacity<=0))return fail(shot,'actual projected target is hidden at contact');
    const local=projected?.point??{x:(declared.x-part.x*c.performance.stage.width)/scale,y:(declared.y-part.y*c.performance.stage.height)/scale};
    if(canonical){
      if(!ownership)return fail(shot,'needs the renderer supplied canonical bake, never a replacement physical compilation');
      const item=ownershipScene(shot,board,narration,ownership).get(partId)!,at=ownershipBakeAt(item,global);
      return {x:at.center.x+local.x,y:at.center.y+local.y};
    }
    if(owner)return reader(owner.id).pointAt(`prop-${binding!.propId}`,global-shot.startMs,local);
    return {x:part.x*c.performance.stage.width+local.x,y:part.y*c.performance.stage.height+local.y};
  };
  return people.flatMap(id=>sourceActor(shot,id).actions.filter(a=>a.sourceSpear).map(action=>{
    const d=sourceSpearOperation(shot,id,action,board,narration),actual=reader(id),prop=d.source.props.find(p=>p.id===d.track.propId)!,hands=d.track.twoHand?['left','right'] as const:[d.track.hand];
    const sourceKey=`prop-${d.track.propId}`,start=Math.max(0,d.startMs-shot.startMs),end=Math.min(shot.endMs-shot.startMs,d.endMs-shot.startMs);
    const base=[start,...actual.times.filter(t=>t>start&&t<end),end],times=[...new Set([...base,...base.slice(1).map((t,i)=>(base[i]!+t)/2),...[d.contactMs,d.recoverMs].filter((t):t is number=>t!==undefined&&t>=shot.startMs&&t<=shot.endMs).map(t=>t-shot.startMs)])].sort((a,b)=>a-b);
    let maxGripErrorPx=0;
    for(const at of times)for(const hand of hands){
      const offset=prop.gripOffset.x+(hand===d.track.hand?0:d.track.secondaryOffset),shaft=actual.pointAt(sourceKey,at,{x:offset,y:0}),palm=actual.pointAt(`hand-${hand}`,at,{x:0,y:0}),error=distance(shaft,palm);
      if(!Number.isFinite(error)||error>1)return fail(shot,'actual emitted gripping palm misses its own shaft');maxGripErrorPx=Math.max(maxGripErrorPx,error);
    }
    let contact:null|{sampleMs:number;tip:{x:number;y:number};target:{x:number;y:number};errorPx:number}=null;
    if(d.contactMs!==undefined&&d.contactMs>=shot.startMs&&d.contactMs<shot.endMs){
      const tip=actual.pointAt(sourceKey,d.contactMs-shot.startMs,{x:prop.length/2,y:0}),point=target(action.target!.partId,action.target!.anchor,d.contactMs),errorPx=distance(tip,point);
      if(!Number.isFinite(errorPx)||errorPx>1)return fail(shot,'actual emitted tip misses its independently drawn original target');
      contact={sampleMs:d.contactMs,tip,target:point,errorPx};
    }
    return {version:SOURCE_SPEAR_EMITTED_VERSION,transformVersion:EMITTED_TRANSFORM_VERSION,actorId:id,sourceId:d.source.id,trackId:d.track.id,shaftPartId:d.binding.partId,partId:action.target!.partId,
      operation:d.operation,originalContactMs:d.contactMs??null,inheritedContact:d.contactMs!==undefined&&d.contactMs<shot.startMs,
      scope:'renderer-supplied-emitted-channel-candidate' as const,samples:times.length,gripHands:[...hands],maxGripErrorPx,contact,
      contactCameraInspected:contact!==null,otherCameraContact:'NOT INSPECTED: this camera does not own the original contact',
      fingerprint:hash({source:d.fingerprint,actual:actual.fingerprint,shot,contact,readers:[...readers].map(([actor,r])=>({actor,fingerprint:r.fingerprint})),ownership:ownership?[...ownership].map(([partId,item])=>({partId,bake:item.bake,sourceHash:item.sourceHash,paintHash:item.paintHash})):null}),
      continuousGeometryVerified:false as const,contactVerified:false as const,motionVerified:false as const,productionApproval:false as const};
  }));
}
export const sourceSpearEmittedDescription={version:SOURCE_SPEAR_EMITTED_VERSION,transformVersion:EMITTED_TRANSFORM_VERSION,
  authority:'actual renderer supplied per-person compiled JS/frames bound to original plan/profile/namespace/clock; unwrapped rotations, serialized scale and GSAP complex-string rounding; canonical target uses actual supplied ownership bake',
  inspection:'both original shaft grips at actual emitted keyframes and midpoints; actual tip versus independent rendered target only in its original half-open contact camera; other cuts never claim another contact',
  limits:'finite sampled diagnostics only, not continuous/pixel/contour/depth/seek/native art/film acceptance; supplied channels are not a cryptographic provenance proof',
  pending:['actual SVG/GSAP/runtime seek and contact/depth/60fps film acceptance','native art/acting and integrated source production audit/full factory'],
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false,productionApproval:false};
