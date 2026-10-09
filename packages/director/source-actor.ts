import type {Shot} from '../core/schemas.js';

/** Exact visible story-person ownership; camera lead is never an identity. */
export function sourceActor(shot:Shot,id:string){
  const c=shot.cinematic,scene=c?.actorScene;
  const all=[...(scene?.primary?[{character:scene.primary,performance:c!.performance,actions:shot.host?.actions??[]}]:[]),...(scene?.supporting??[])];
  const matches=all.filter(a=>a.character.id===id);
  if(matches.length!==1||scene?.primary?.id===id&&(!shot.host||shot.host.id!==id||shot.host.presence==='absent'))throw new Error(shot.id+': needs-source-prop-binding: original interaction requires one explicit visible person with its own action record');
  return matches[0]!;
}
