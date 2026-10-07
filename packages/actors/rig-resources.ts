import type {Shot} from '../core/schemas.js';
import type {HostProfile} from '../host/schemas.js';
import {referenceHeadAssets} from '../animation/forest-head-art.js';
import {referenceBodyAssets} from '../animation/forest-body-art.js';

/** Exact registered local paths for this cast, never arbitrary artwork URLs.
 * Asset bytes/hashes are still checked by scene staging; this is a source allowlist. */
export function actorRigResourcePaths(shot:Shot,base:HostProfile):string[]{
  if(shot.cinematic?.spriteStage)return [];
  const scene=shot.cinematic?.actorScene;
  const appearances=scene?[...(scene.primary?[scene.primary.appearance]:[]),...scene.supporting.map(a=>a.character.appearance)]:[base.appearance];
  return [...new Set(appearances.flatMap(a=>[...referenceHeadAssets(a),...referenceBodyAssets(a)].map(asset=>asset.path)))];
}
