import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import {hash} from '../core/utils.js';
export const SOURCE_PROP_BINDING_VERSION='source-prop-binding-1';
/** Structural cache input only. It never samples geometry, approves binding,
 * rewrites narration or treats source/final gates as satisfied. A sibling
 * model/role/cue/art/action/clock edit invalidates every affected source slice. */
export function sourcePropBindingIdentity(shot:Shot,board:Storyboard,narration:Narration){
  const c=shot.cinematic,owners=[...(c?.actorScene?.primary&&c.performance.sourceManipulation?[{id:c.actorScene.primary.id,source:c.performance.sourceManipulation}]:[]),
    ...(c?.actorScene?.supporting.filter(a=>a.performance.sourceManipulation).map(a=>({id:a.character.id,source:a.performance.sourceManipulation!}))??[])];
  if(!owners.length)return undefined;
  const original=board.shots.filter(s=>s.id!==shot.id).concat(shot).filter(s=>owners.some(o=>s.startMs<o.source.endMs&&s.endMs>o.source.startMs)).sort((a,b)=>a.startMs-b.startMs);
  return {version:SOURCE_PROP_BINDING_VERSION,scope:'structural-cache-input-only',fingerprint:hash({owners,original,narration}),approved:false,motionVerified:false};
}
