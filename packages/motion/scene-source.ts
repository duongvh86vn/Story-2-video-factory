import {promises as fs} from 'node:fs';
import type {Shot} from '../core/schemas.js';
import {safeRealPath,hash} from '../core/utils.js';
import {loadActorMotion} from './import.js';
import type {ActorMotion} from './schemas.js';
import {spriteMotionKey} from './stage.js';
import {validateSpriteScenePlan} from './scene-validation.js';

export async function loadSpriteSceneMotions(root:string,shot:Shot):Promise<ReadonlyMap<string,ActorMotion>|undefined>{
  if(!shot.cinematic?.spriteStage)return undefined;
  const plan=validateSpriteScenePlan(shot),motions=new Map<string,ActorMotion>();
  for(const actor of plan.actors)for(const clip of actor.clips){
    const key=spriteMotionKey(clip.motionId,clip.fingerprint);
    if(!motions.has(key))motions.set(key,await loadActorMotion(root,clip.motionId,clip.fingerprint));
  }
  return motions;
}

/** Hash the exact bounded Buffer that will be staged, not a previously checked path. */
export async function spriteSceneSheetBytes(root:string,motion:ActorMotion):Promise<Buffer>{
  const current=await loadActorMotion(root,motion.id,motion.fingerprint);
  if(hash(current)!==hash(motion))throw new Error('Sprite descriptor changed before scene staging');
  const file=await safeRealPath(root,current.sheet.path),handle=await fs.open(file,'r'),limit=16*1024*1024;
  try{
    const stat=await handle.stat();if(!stat.isFile()||stat.size>limit)throw new Error('Sprite sheet exceeds scene byte limit');
    const bytes=Buffer.alloc(limit+1);let size=0;
    while(size<bytes.length){const result=await handle.read(bytes,size,bytes.length-size,null);if(!result.bytesRead)break;size+=result.bytesRead;}
    if(size>limit)throw new Error('Sprite sheet grew beyond scene byte limit');
    const exact=bytes.subarray(0,size);
    if(hash(exact)!==current.sheet.hash)throw new Error('Sprite sheet changed before scene staging');
    return exact;
  }finally{await handle.close();}
}
