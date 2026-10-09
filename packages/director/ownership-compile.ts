import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {samplePhysicalPerformance,gestureRecoveryStart} from '../animation/compiler.js';
import {actorProfile} from '../actors/model.js';
import {actorViewActingClock} from '../actors/view-acting-clock.js';
import {sourceActor} from './source-actor.js';
import {boundProp} from './prop-owner.js';
import {validateSourceOwnershipTimelines,sourceOwnershipFrame,sourceOwnershipBoundary} from './source-ownership.js';
import {validateSourceWorld} from './source-world.js';
import {validateSourceGripWorld} from './source-grip-world.js';
import {OwnershipPaintSchema,type OwnershipPaint} from './ownership-paint-schemas.js';
import {bakeOwnership,type OwnershipBake} from './ownership-bake.js';
import type {SourceOwnership} from './source-ownership-schemas.js';
import {OWNERSHIP_RENDER_VERSION} from './ownership-render-version.js';
export {OWNERSHIP_RENDER_VERSION} from './ownership-render-version.js';

export interface CompiledOwnership {
  version:typeof OWNERSHIP_RENDER_VERSION;source:SourceOwnership;paint:OwnershipPaint;bake:OwnershipBake;
  aliases:Array<{actorId:string;propId:string;svgId:string;hand:'left'|'right';handSvgId:string;slotSvgId:string}>;
  shotHash:string;sourceHash:string;paintHash:string;motionVerified:false;productionApproval:false;
}
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: ownership render ${message}`);};

/** Candidate compilation on canonical original source, not a production gate
 * override. Called only when a tester or future complete renderer requests it.
 * Current production entry still rejects unaccepted original ownership. */
export function compileSourceOwnership(shot:Shot,board:Storyboard,narration:Narration,actorBreakpoints:readonly number[]=[]):ReadonlyMap<string,CompiledOwnership>{
  if(!shot.cinematic?.sourceOwnership?.length)return fail(shot,'requires explicit original ownership');
  if(board.shots.filter(s=>s.id===shot.id).length!==1||hash(board.shots.find(s=>s.id===shot.id))!==hash(shot))return fail(shot,'requires the authoritative complete storyboard');
  // This is an immutable in-memory source snapshot for the synchronous bake.
  // No files, providers, approval flags or outside state are changed.
  const original=structuredClone(board),voice=structuredClone(narration),canonical=original.shots.find(s=>s.id===shot.id)!;
  validateSourceOwnershipTimelines(canonical,original,voice);
  validateSourceWorld(canonical,original,voice);
  const sources=canonical.cinematic!.sourceOwnership!,paints=canonical.cinematic!.ownershipPaint??[];
  if(paints.length!==sources.length||new Set(paints.map(p=>p.sourceId)).size!==paints.length)return fail(shot,'every entity requires one explicit depth plan');
  const allAliases=sources.flatMap(s=>s.grips.map(g=>JSON.stringify([g.actorId,g.propId])));
  const propIds=sources.flatMap(s=>s.grips.map(g=>g.propId));
  if(new Set(propIds).size!==propIds.length)return fail(shot,'physical prop alias IDs must be unambiguous across the visible cast');
  if(canonical.cinematic!.propBindings.length!==allAliases.length||canonical.cinematic!.propBindings.some(b=>!b.ownerId||!allAliases.includes(JSON.stringify([b.ownerId,b.propId]))))
    return fail(shot,'mixed unregistered/local prop rendering is not supported by this candidate; preserve and report the missing physical binding');
  const result=new Map<string,CompiledOwnership>();
  for(const source of sources){
    const matches=paints.filter(p=>p.sourceId===source.id);if(matches.length!==1)return fail(shot,'missing entity depth plan');
    const paint=OwnershipPaintSchema.parse(matches[0]),part=canonical.visualization!.parts.find(p=>p.id===source.partId)!;
    if(paint.grips.length!==source.grips.length||paint.grips.some(g=>!source.grips.some(s=>s.id===g.gripId)))return fail(shot,'depth plan must name every actual original grip exactly once');
    for(const painted of paint.grips){
      const grip=source.grips.find(g=>g.id===painted.gripId)!;
      const offset={x:(painted.anchor.x-.5)*part.width*canonical.cinematic!.performance.stage.width,y:(painted.anchor.y-.5)*part.height*canonical.cinematic!.performance.stage.height};
      if(Math.hypot(offset.x-grip.gripOffset.x,offset.y-grip.gripOffset.y)>1e-6)return fail(shot,'own authored viewport grip anchor differs from the actual stage grip offset');
      const actor=sourceActor(canonical,grip.actorId);
      if(actor.actions.filter(a=>a.sourceManipulation?.sourceId===grip.sourceId&&a.sourceManipulation.gestureId===grip.gestureId).some(a=>a.target?.anchor==='center'&&(painted.anchor.x!==.5||painted.anchor.y!==.5)))
        return fail(shot,'an off-center grip cannot claim a center action target');
    }
    if(paint.sourceRefs.some(ref=>!part.sourceRefs.some(r=>hash(r)===hash(ref))))return fail(shot,'depth plan lost canonical entity evidence');
    for(const slice of original.shots.filter(s=>s.startMs<source.endMs&&s.endMs>source.startMs))
      if(slice.cinematic?.ownershipPaint?.filter(p=>p.sourceId===source.id&&hash(p)===hash(paint)).length!==1)return fail(slice,'entity depth plan changed at a camera cut');
    for(const phase of source.phases.filter(p=>p.kind!=='world'))validateSourceGripWorld(canonical,part,phase.startMs,phase.endMs,{startMs:source.startMs,endMs:source.endMs});
    // Check every full-original transfer, even if this camera starts later.
    // Never smooth a source discontinuity or start a new contact at the cut.
    for(const transition of source.transitions)sourceOwnershipBoundary(canonical,source.id,transition.id,original,voice);
    const aliases=source.grips.map(grip=>{
      const binding=canonical.cinematic!.propBindings.find(b=>b.ownerId===grip.actorId&&b.propId===grip.propId&&b.partId===source.partId)!;
      const owned=boundProp(canonical,binding);
      return {actorId:grip.actorId,propId:grip.propId,svgId:owned.svgId,hand:grip.hand,handSvgId:`${owned.prefix}hand-${grip.hand}`,slotSvgId:`${owned.prefix}hand-${grip.hand}-prop-slot`};
    });
    const people=new Map(source.grips.map(g=>{
      const actor=sourceActor(canonical,g.actorId),clock=actorViewActingClock(original,canonical,g.actorId);
      if(!clock?.manipulationMotion)return fail(shot,'missing actual original person clock');
      return [g.actorId,{actor,profile:actorProfile(actor.character),clock}] as const;
    }));
    const resolve=(global:number)=>{
      const frame=sourceOwnershipFrame(canonical,source.id,global,original,voice),frames=new Map<string,ReturnType<typeof samplePhysicalPerformance>>();
      const palms=Object.fromEntries(source.grips.map(g=>{
        let body=frames.get(g.actorId);
        if(!body){const owned=people.get(g.actorId)!;body=samplePhysicalPerformance(owned.actor.performance,owned.profile,global-canonical.startMs,owned.clock);frames.set(g.actorId,body);}
        return [g.id,body.hands[g.hand]] as const;
      }));
      return {timeMs:global,center:frame.center,palms,activeGripIds:frame.grips.map(g=>g.gripId),...(frame.authorityGripId===undefined?{}:{authorityGripId:frame.authorityGripId})};
    };
    // Observation queries (contact and action entry) must be mandatory samples
    // even when a diagnostic has no rendered actor compiler to supply frames.
    const semanticTimes=[...people.values()].flatMap(({actor})=>{
      const original=actor.performance.sourceManipulation!;
      return original.gestures.flatMap(g=>[g.startMs,g.contactMs,g.releaseMs,g.landingMs,g.endMs,gestureRecoveryStart(g)].filter((at):at is number=>at!==undefined).map(at=>original.startMs+at));
    }).filter(at=>at>=source.startMs&&at<=source.endMs);
    const bake=bakeOwnership(source,canonical.startMs,canonical.endMs,canonical.cinematic!.performance.fps,[...actorBreakpoints,...semanticTimes],resolve);
    result.set(source.partId,{version:OWNERSHIP_RENDER_VERSION,source,paint,bake,aliases,shotHash:hash(canonical),sourceHash:hash({source,original,voice}),paintHash:hash(paint),motionVerified:false,productionApproval:false});
  }
  return result;
}

export const ownershipRenderDescription={version:OWNERSHIP_RENDER_VERSION,status:'candidate',
  geometry:'single entity from original ownership; shared palms agree, boundaries checked before interpolation; own original actor compiler breakpoints and a common original fps clock',
  paint:'explicit ownershipPaint for each entity and own original grip; own authored normalized viewport grip anchor matches physical stage offset; entity behind/in front of actors, each palm before/after entity; no inference from left/right, near/far or camera primary',
  interpolation:'measured sampled spatial error <=0.2px at interval probes; discrete grip/authority never tween; bounded refinement fails closed',
  pending:['actual source geometry/bake/SVG/runtime and film acceptance','source observation integration runtime, publication/review/QC and complete production audit','rotating tools/airborne drops and full faithful art/motion/input/voice/resume/final acceptance'],
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false,productionApproval:false};
