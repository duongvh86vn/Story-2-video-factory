import type { FactoryConfig } from '../../packages/core/config.js';
import { ShotSchema, type Storyboard } from '../../packages/core/schemas.js';
import { z } from 'zod';
import { CinematicPlanSchema, DIRECTION_VERSION } from '../../packages/director/schemas.js';
import { ANIMATION_VERSION, PerformancePlanSchema } from '../../packages/animation/schemas.js';
import { hash } from '../../packages/core/utils.js';
import { ApiError } from './security.js';
import { validateModelContinuity, CINEMATIC_CLIPS } from '../../packages/director/index.js';
import { validateArtDirection } from '../../packages/director/art-direction.js';

// This schema is for inspection only. Production and edits still use current literals.
const inspectionSchema=z.object({shots:z.array(ShotSchema.innerType().extend({
  cinematic:CinematicPlanSchema.extend({
    producer:z.string().regex(/^story-direction-2\.2\.\d+$/),
    performance:PerformancePlanSchema.extend({compilerVersion:z.string().regex(/^performance-2\.2\.\d+$/)}),
  }).optional(),
}))}).strict();
export function inspectCinematicStoryboard(value:unknown,locks:Record<string,boolean>={}){
  const board=inspectionSchema.parse(value);
  const obsolete=board.shots.filter(s=>s.cinematic&&(s.cinematic.producer!==DIRECTION_VERSION||s.cinematic.performance.compilerVersion!==ANIMATION_VERSION));
  return {board,migration:{required:obsolete.length>0,shotIds:obsolete.map(s=>s.id),
    lockedShotIds:obsolete.filter(s=>locks.storyboard||(locks[s.id]??locks[`shot:${s.id}`]??s.locked)).map(s=>s.id)}};
}

/** Bound editing to values the current production scene actually consumes. */
export function validateCinematicEdit(board: Storyboard, config: FactoryConfig, previous?: Storyboard | null): void {
  if (!board.shots.some(s => s.cinematic) && config.presentation.mode !== 'story-cinematic') return;
  if (config.content.mode !== 'narrated-explainer') throw new ApiError(422, 'The legacy renderer does not support cinematic performance.', 'CINEMATIC_UNSUPPORTED');
  if (previous) {
    const clock = (b: Storyboard) => b.shots.map(s => ({ id: s.id, startMs: s.startMs, endMs: s.endMs, narrationSegmentIds: s.narrationSegmentIds }));
    if (hash(clock(board)) !== hash(clock(previous))) throw new ApiError(422, 'Cinematic edits must preserve shot IDs, narration anchors and timing. Replan through production for new cuts.', 'TIMESTAMP_IMMUTABLE');
  }
  for (const [i, shot] of board.shots.entries()) {
    const c = shot.cinematic;
    if (!c) throw new ApiError(422, `${shot.id}: cinematic plan is missing. Replan in story-cinematic mode.`, 'CINEMATIC_INVALID');
    try{validateArtDirection(shot);}catch(error){throw new ApiError(422,error instanceof Error?error.message:String(error),'CINEMATIC_INVALID');}
    const unsupported = (message: string): never => { throw new ApiError(422, `${shot.id}: ${message}`, 'CINEMATIC_UNSUPPORTED'); };
    if (shot.camera.angle !== 'eye-level') unsupported('The cinematic camera supports only eye-level 2D framing; other angles require a different renderer.');
    if (c.continuity.carriedProps.length) unsupported('Carried props are not supported by the current cinematic clips.');
    if (shot.host?.presence !== 'beside-model'&&!(c.actorScene?.primary===null&&shot.host?.presence==='absent')) unsupported('Absent performance requires an explicit mechanism-only actor scene.');
    if (c.performance.props.length!==c.propBindings.length || c.performance.gestures.some(g => !CINEMATIC_CLIPS.includes(g.action))) {
      unsupported('Animated props need a sourced model binding. Unsupported clips and cross-cut carry require a production continuity plan.');
    }
    const old = previous?.shots.find(s => s.id === shot.id)?.cinematic;
    if(old&&old.artDirection?.useEnvironment!==c.artDirection?.useEnvironment&&old.environmentAssetId)unsupported('Changing the background asset source requires production replanning; preserve the environment setting during direct edits.');
    if (old && (old.setting !== c.setting || old.environmentAssetId !== c.environmentAssetId)) unsupported('Environment changes require replanning through the production asset resolver; direct environment replacement is not supported.');
    if (Math.abs(c.continuity.exit.y - c.performance.stage.groundY) > .01) throw new ApiError(422, `${shot.id}: exit continuity must use the ground anchor.`, 'CINEMATIC_INVALID');
    const prior = board.shots[i - 1]?.cinematic;
    try{validateModelContinuity(board.shots[i-1],shot);}catch(error){throw new ApiError(422,error instanceof Error?error.message:String(error),'CINEMATIC_INVALID');}
    if (prior && c.actorScene?.continuity!=='cut'&&(Math.hypot(prior.continuity.exit.x - c.continuity.entry.x, prior.continuity.exit.y - c.continuity.entry.y) > .01 || prior.continuity.facing!==(c.performance.facing??'front') || prior.leadCharacterId !== c.leadCharacterId || prior.performance.scale !== c.performance.scale)) {
      throw new ApiError(422, `${shot.id}: continuity must continue the previous shot's lead character, position and scale.`, 'CINEMATIC_INVALID');
    }
    const camera = c.camera, delta = camera.endScale - camera.startScale;
    if (camera.movement === 'push-in' && delta <= 0 || camera.movement === 'pull-out' && delta >= 0 || ['locked','pan-left','pan-right'].includes(camera.movement) && delta !== 0) {
      throw new ApiError(422, `${shot.id}: camera movement contradicts its start/end scale.`, 'CINEMATIC_INVALID');
    }
  }
}
