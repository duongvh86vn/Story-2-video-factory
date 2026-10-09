import type {Shot} from '../core/schemas.js';
import {hash} from '../core/utils.js';

/** Full tuple hashes avoid ambiguous concatenated actor/source/grip IDs. */
export function ownershipEntityId(sourceId:string):string{return 'ownership-entity-'+hash(['entity',sourceId]);}
export function ownershipPalmId(sourceId:string,gripId:string):string{return 'ownership-palm-'+hash(['palm',sourceId,gripId]);}
export function ownershipGlyph(shot:Shot,partId:string):string|undefined {
  const matches=shot.cinematic?.sourceOwnership?.filter(s=>s.partId===partId)??[];
  if(matches.length>1)throw new Error(`${shot.id}: needs-source-prop-binding: duplicated canonical ownership entity`);
  return matches.length?ownershipEntityId(matches[0]!.id):undefined;
}
