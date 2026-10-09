import type {Shot} from '../../packages/core/schemas.js';
import {escapeHtml,hash} from '../../packages/core/utils.js';
import {sourceActor} from '../../packages/director/source-actor.js';
import {actorProfile} from '../../packages/actors/model.js';
import {OWNERSHIP_RENDER_VERSION,type CompiledOwnership} from '../../packages/director/ownership-compile.js';
import {ownershipEntityId,ownershipPalmId} from '../../packages/director/ownership-reference.js';
import {ownershipBakeSnapshot} from '../../packages/director/ownership-bake-query.js';
import type {ModelMotionFrame} from '../../packages/director/prop-motion.js';
import {customModelArt,customModelForegroundArt} from '../../packages/director/art-direction.js';
import {cinematicModel} from './cinematic-models.js';
import {ownershipPalmMasks,type OwnershipPalmMask} from '../../packages/director/ownership-palm-mask.js';

const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: canonical ownership layer ${message}`);};
const selector=(shot:Shot,id:string,suffix='')=>`[data-composition-id="${shot.id}"] [id=${JSON.stringify(id)}]${suffix}`;
const xmlRegex=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

export interface OwnershipLayer {
  beforeActors:string;afterActors:string;calls:string[];entities:Array<{partId:string;entityId:string;sourceId:string;plane:string;palmIds:string[]}>;
  aliasIds:string[];slotIds:string[];slotMasks:OwnershipPalmMask[];motionVerified:false;productionApproval:false;
}

/** Serializes a canonical bake into one model and explicit own-source palms.
 * No additional actor/world transforms, alias glyphs or entity scale. Actual
 * actor timelines retain ownership of the referenced palm transformations. */
export function renderOwnershipLayer(shot:Shot,compiled:ReadonlyMap<string,CompiledOwnership>,thermal:(part:NonNullable<Shot['visualization']>['parts'][number],width:number,height:number)=>string):OwnershipLayer {
  const result:OwnershipLayer={beforeActors:'',afterActors:'',calls:[],entities:[],aliasIds:[],slotIds:[],slotMasks:[],motionVerified:false,productionApproval:false};
  const c=shot.cinematic;if(!c?.sourceOwnership||compiled.size!==c.sourceOwnership.length)return fail(shot,'requires every original canonical entity bake');
  const allIds=new Set<string>(),slots=new Set<string>();
  for(const [partId,item] of compiled){
    const bake=ownershipBakeSnapshot(item),source=bake.source,paint=structuredClone(item.paint);
    if(item.version!==OWNERSHIP_RENDER_VERSION||item.shotHash!==hash(shot)||bake.startMs!==shot.startMs||bake.endMs!==shot.endMs||item.motionVerified!==false||item.productionApproval!==false||hash(paint)!==item.paintHash||c.sourceOwnership.filter(s=>s.partId===partId&&hash(s)===hash(item.source)).length!==1||c.ownershipPaint?.filter(p=>p.sourceId===source.id&&hash(p)===item.paintHash).length!==1)
      return fail(shot,'bake/source/paint belongs to a different canonical revision or clock');
    const part=shot.visualization!.parts.find(p=>p.id===partId),model=c.models.find(m=>m.partId===partId),index=shot.visualization!.parts.findIndex(p=>p.id===partId);
    if(!part||!model)return fail(shot,'missing actual canonical entity descriptor or samples');
    const width=part.width*c.performance.stage.width,height=part.height*c.performance.stage.height,entityId=ownershipEntityId(source.id);
    const contactFrame=c.artDirection?.models.find(m=>m.partId===partId)?.contactFrame;
    const front=customModelForegroundArt(shot,partId,width,height),art=customModelArt(shot,partId,width,height,!!contactFrame)??cinematicModel(part,model,width,height).svg;
    const palms=new Map<string,string>();
    for(const grip of source.grips){
      const alias=item.aliases.find(a=>a.actorId===grip.actorId&&a.propId===grip.propId&&a.hand===grip.hand);
      if(!alias)return fail(shot,'original palm alias missing');
      const id=ownershipPalmId(source.id,grip.id),profile=actorProfile(sourceActor(shot,grip.actorId).character);
      if(allIds.has(id))return fail(shot,'palm namespace collision');allIds.add(id);
      palms.set(grip.id,`<g id="${id}" data-original-grip="${escapeHtml(grip.id)}" data-grip-person="${escapeHtml(grip.actorId)}" data-grip-hand="${grip.hand}" opacity="0" fill="none" stroke="${escapeHtml(profile.appearance.outline)}" stroke-width="${profile.appearance.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><use href="#${escapeHtml(alias.handSvgId)}"/></g>`);
      result.aliasIds.push(alias.svgId);slots.add(alias.slotSvgId);
    }
    if(allIds.has(entityId))return fail(shot,'entity namespace collision');allIds.add(entityId);
    const before=paint.grips.filter(g=>g.depth==='before-entity').map(g=>palms.get(g.gripId)).join(''),after=paint.grips.filter(g=>g.depth==='after-entity').map(g=>palms.get(g.gripId)).join('');
    const markup=`<g data-ownership-source="${escapeHtml(source.id)}" data-entity-plane="${paint.entityPlane}">${before}<g id="${entityId}" data-prop-entity="${escapeHtml(partId)}" data-canonical-ownership="true" fill="none" stroke="#644931" stroke-width="${c.performance.stage.height*.003}" stroke-linecap="round" stroke-linejoin="round">${art}${contactFrame?'':thermal(part,width,height)}</g>${after}${front?`<g id="foreground-object-${index}" data-sourced-foreground="${escapeHtml(partId)}">${front}</g>`:''}</g>`;
    if(paint.entityPlane==='behind-actors')result.beforeActors+=markup;else result.afterActors+=markup;
    result.entities.push({partId,entityId,sourceId:source.id,plane:paint.entityPlane,palmIds:source.grips.map(g=>ownershipPalmId(source.id,g.id))});
    for(const [i,sample] of bake.samples.entries()){
      const previous=bake.samples[i-1],at=((previous?.timeMs??shot.startMs)-shot.startMs)/1000,vars={attr:{transform:`translate(${sample.center.x} ${sample.center.y})`},...(previous?{duration:(sample.timeMs-previous.timeMs)/1000,ease:'none'}:{immediateRender:true})};
      result.calls.push(`tl.${previous?'to':'set'}(${JSON.stringify(selector(shot,entityId))},${JSON.stringify(vars)},${at});`);
      if(front)result.calls.push(`tl.${previous?'to':'set'}(${JSON.stringify(selector(shot,'foreground-object-'+index))},${JSON.stringify(vars)},${at});`);
      const x=part.x*c.performance.stage.width,y=part.y*c.performance.stage.height,delta={attr:{transform:`translate(${sample.center.x-x} ${sample.center.y-y})`},...(previous?{duration:(sample.timeMs-previous.timeMs)/1000,ease:'none'}:{immediateRender:true})};
      if(!contactFrame){
        result.calls.push(`tl.${previous?'to':'set'}(${JSON.stringify(selector(shot,'object-'+index))},${JSON.stringify(delta)},${at});`);
        result.calls.push(`tl.${previous?'to':'set'}(${JSON.stringify(selector(shot,'object-'+index,' .bound-model-shadow'))},${JSON.stringify({...delta,attr:{transform:`translate(0 ${y-sample.center.y})`}})},${at});`);
      }
      // Discrete visibility is written at the exact current sample, never
      // tweened from an earlier ownership phase or moved to camera entry.
      for(const grip of source.grips)if(!previous||previous.activeGripIds.includes(grip.id)!==sample.activeGripIds.includes(grip.id))
        result.calls.push(`tl.set(${JSON.stringify(selector(shot,ownershipPalmId(source.id,grip.id)))},{opacity:${sample.activeGripIds.includes(grip.id)?1:0}},${(sample.timeMs-shot.startMs)/1000});`);
    }
  }
  if(new Set(result.aliasIds).size!==result.aliasIds.length)return fail(shot,'physical alias namespace collision');
  result.slotIds=[...slots];result.slotMasks=ownershipPalmMasks(shot,compiled);
  if(result.slotMasks.length!==slots.size||result.slotMasks.some(mask=>!slots.has(mask.slotId)||allIds.has(mask.maskId)))return fail(shot,'original hand mask coverage/namespace differs from its actual grip slots');
  for(const mask of result.slotMasks)for(const state of mask.states)
    result.calls.push(`tl.set(${JSON.stringify(selector(shot,mask.maskId))},{opacity:${state.opacity}},${(state.timeMs-shot.startMs)/1000});`);
  return result;
}

/** Clear duplicate entity aliases, but retain the compiler's original palm
 * slots beneath per-hand canonical masks. Earlier/later independent props can
 * reuse the real palm. Native front/back/free-hand painters remain unchanged. */
export function suppressOwnershipCopies(shot:Shot,html:string,layer:OwnershipLayer):string {
  for(const id of layer.aliasIds){
    const regex=new RegExp(`<g\\b([^>]*\\bid="${xmlRegex(id)}"[^>]*)>([\\s\\S]*?)</g>`,'g'),matches=[...html.matchAll(regex)];
    if(matches.length!==1||/<g\b/i.test(matches[0]![2]!))return fail(shot,'generated alias/palm slot missing, duplicated or unexpectedly nested');
    html=html.replace(regex,`<g id="${escapeHtml(id)}" data-canonical-empty-alias="true"></g>`);
  }
  if(layer.slotMasks.length!==layer.slotIds.length||new Set(layer.slotMasks.map(mask=>mask.slotId)).size!==layer.slotIds.length||layer.slotMasks.some(mask=>!layer.slotIds.includes(mask.slotId)))return fail(shot,'palm mask coverage differs from original slots');
  for(const mask of layer.slotMasks){
    const regex=new RegExp(`<g\\b([^>]*\\bid="${xmlRegex(mask.slotId)}"[^>]*)>([\\s\\S]*?)</g>`,'g'),matches=[...html.matchAll(regex)];
    if(matches.length!==1||/<g\b/i.test(matches[0]![2]!)||!mask.states.length||html.includes(`id="${escapeHtml(mask.maskId)}"`))return fail(shot,'original palm slot missing, duplicated, nested or already masked');
    html=html.replace(regex,match=>`<g id="${escapeHtml(mask.maskId)}" data-ownership-slot-mask="${escapeHtml(mask.slotId)}" opacity="${mask.states[0]!.opacity}">${match}</g>`);
  }
  return html;
}

/** Relations consume the exact canonical piecewise-linear drawn centers.
 * One center channel per entity, never actor-local grip aliases or free props.
 * This is not a resampled actor body/face or a second physical world clock. */
export function ownershipRelationFrames(shot:Shot,compiled:ReadonlyMap<string,CompiledOwnership>):ModelMotionFrame[]{
  const sources=shot.cinematic?.sourceOwnership;
  if(!sources?.length||compiled.size!==sources.length)return fail(shot,'relations require every canonical entity of the supplied shot');
  const snapshots=[...compiled].map(([partId,item])=>{
    const bake=ownershipBakeSnapshot(item);
    if(partId!==bake.source.partId||bake.startMs!==shot.startMs||bake.endMs!==shot.endMs||item.shotHash!==hash(shot)||sources.filter(s=>s.partId===partId&&hash(s)===hash(item.source)).length!==1)return fail(shot,'relation entity source/revision/clock differs from its canonical bake');
    return {partId,bake};
  });
  const times=[...new Set(snapshots.flatMap(({bake})=>bake.samples.map(s=>s.timeMs)))].sort((a,b)=>a-b);
  return times.map(global=>{
    const centers:ModelMotionFrame['centers']=Object.create(null);
    for(const {partId,bake} of snapshots){
      const samples=bake.samples;let index=0;while(index<samples.length-1&&samples[index]!.timeMs<global)index++;
      const b=samples[index]!,a=samples[Math.max(0,index-1)]!,weight=a.timeMs===b.timeMs?0:(global-a.timeMs)/(b.timeMs-a.timeMs);
      if(global<bake.startMs||global>bake.endMs||weight<0||weight>1)return fail(shot,'relation query is outside its canonical bake');
      const point={x:a.center.x+(b.center.x-a.center.x)*weight,y:a.center.y+(b.center.y-a.center.y)*weight};
      if(![point.x,point.y].every(Number.isFinite)||Object.hasOwn(centers,partId))return fail(shot,'relation has missing or duplicated canonical entity centers');
      centers[partId]=point;
    }
    return {timeMs:global-shot.startMs,centers};
  });
}
