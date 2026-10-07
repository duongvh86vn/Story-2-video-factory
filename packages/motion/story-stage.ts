import {ShotSchema,type Shot} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {SourceRefSchema} from '../explainer/schemas.js';
import type {z} from 'zod';
import type {ActorMotion,MotionPoint} from './schemas.js';
import {SpriteStageSchema,type SpriteStage} from './stage-schemas.js';
import {compileSpriteStage} from './stage.js';

const referenceKey=(ref:z.infer<typeof SourceRefSchema>)=>JSON.stringify([ref.kind,ref.segmentId??null,ref.quote]);

/** Binds a candidate actor fragment to an already source-validated story shot.
 * This does not validate narration bytes, stage assets, the world renderer or final QC.
 */
export function compileSpriteStoryActors(shotInput:Shot,planInput:SpriteStage,motions:ReadonlyMap<string,ActorMotion>,targets:ReadonlyMap<string,MotionPoint>){
  const shot=ShotSchema.parse(shotInput),plan=SpriteStageSchema.parse(planInput),cinematic=shot.cinematic,scene=cinematic?.actorScene;
  if(!cinematic || !scene)throw new Error(`${shot.id}: sprite actors require a cinematic actorScene`);
  if(plan.id!==shot.id || plan.durationMs!==shot.endMs-shot.startMs || plan.durationMs!==cinematic.performance.durationMs
    || plan.stage.width!==cinematic.performance.stage.width || plan.stage.height!==cinematic.performance.stage.height)
    throw new Error(`${shot.id}: sprite story stage clock/dimensions mismatch`);
  const cast=[...(scene.primary?[scene.primary]:[]),...scene.supporting.map(actor=>actor.character)];
  const castIds=cast.map(actor=>actor.id),trackIds=plan.actors.map(actor=>actor.actorId);
  if(new Set(castIds).size!==castIds.length || castIds.length!==trackIds.length || castIds.some(id=>!trackIds.includes(id)))
    throw new Error(`${shot.id}: sprite stage must preserve the exact story cast`);
  if(scene.speakingSegmentIds.length || scene.supporting.some(actor=>actor.speakingSegmentIds.length))
    throw new Error(`${shot.id}: needs-sprite-speech: baked sprite actors have no supported mouth/voice synchronization`);

  const verified=new Set((shot.sourceRefs??[]).map(referenceKey));
  if(!verified.size)throw new Error(`${shot.id}: sprite story requires shot source references`);
  for(const item of [...plan.actors.flatMap(actor=>actor.clips),...plan.contacts])for(const ref of item.sourceRefs){
    if(!verified.has(referenceKey(ref)) || (ref.kind==='narration'&&(!ref.segmentId || !shot.narrationSegmentIds?.includes(ref.segmentId))))
      throw new Error(`${shot.id}: sprite acting has unbound story source evidence`);
  }
  for(const contact of plan.contacts)if(!shot.visualization?.parts.some(part=>part.id===contact.targetId))
    throw new Error(`${shot.id}: sprite contact target is outside the story scene: ${contact.targetId}`);

  const compiled=compileSpriteStage(plan,motions,targets);
  return {...compiled,report:{...compiled.report,shotId:shot.id,shotHash:hash(shot),castHash:hash(cast),stageHash:hash(plan),
    shotStartMs:shot.startMs,sourceRefs:shot.sourceRefs!,sourceEvidence:'shot-references-only' as const,
    warnings:[...compiled.report.warnings,'Actor fragment only: caller must validate narration/source text, immutable motion bytes, world targets and camera before canonical scene publication.']}};
}
