import {z} from 'zod';
import {hash} from '../core/utils.js';
import {ActorDefinitionSchema,type ActorDefinition} from './schemas.js';

/** Lock keys fit the shared ID contract even for a maximum-length actor ID. */
export const actorLockKey=(id:string):string=>`actor.${hash(id)}`;
const CastEnvelope=z.object({shots:z.array(z.object({cinematic:z.object({actorScene:z.object({
  primary:ActorDefinitionSchema.nullable(),supporting:z.array(z.object({character:ActorDefinitionSchema})).default([]),
}).optional()}).optional()}))});
/** Read identities independently of renderer versions so migration cannot erase a lock. */
export function actorDefinitions(value:unknown):ActorDefinition[]{
  const board=CastEnvelope.parse(value),cast=new Map<string,ActorDefinition>();
  for(const shot of board.shots){const scene=shot.cinematic?.actorScene;if(!scene)continue;
    for(const character of [...(scene.primary?[scene.primary]:[]),...scene.supporting.map(a=>a.character)]){
      const previous=cast.get(character.id);
      if(previous&&hash(previous)!==hash(character))throw new Error(`Actor ${character.id} has conflicting identities`);
      cast.set(character.id,character);
    }
  }
  return [...cast.values()];
}
export function assertActorLocks(previous:unknown,next:unknown,locks:Record<string,boolean>):void{
  const before=actorDefinitions(previous),after=actorDefinitions(next);
  for(const actor of before)if(locks[actorLockKey(actor.id)]&&hash(actor)!==hash(after.find(a=>a.id===actor.id)))throw new Error(`Unlock actor ${actor.id} before changing or removing its identity`);
  for(const [key,locked] of Object.entries(locks))if(locked&&key.startsWith('actor.')&&!before.some(a=>actorLockKey(a.id)===key))throw new Error(`Approved actor lock ${key} has no retained cast definition`);
}
