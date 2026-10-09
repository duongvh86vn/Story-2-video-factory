import type {Shot} from '../core/schemas.js';
import {hash} from '../core/utils.js';

/** Exact visible story-person ownership; camera lead is never an identity. */
export function sourceActor(shot:Shot,id:string){
  const c=shot.cinematic,scene=c?.actorScene;
  const all=[...(scene?.primary?[{character:scene.primary,performance:c!.performance,actions:shot.host?.actions??[]}]:[]),...(scene?.supporting??[])];
  const matches=all.filter(a=>a.character.id===id);
  if(matches.length!==1||scene?.primary?.id===id&&(!shot.host||shot.host.id!==id||shot.host.presence==='absent'))throw new Error(shot.id+': needs-source-prop-binding: original interaction requires one explicit visible person with its own action record');
  if(hash(matches[0]!.performance.stage)!==hash(c!.performance.stage))throw new Error(shot.id+': needs-source-prop-binding: original interaction person and model must share the same stage and physical world floor');
  return matches[0]!;
}
