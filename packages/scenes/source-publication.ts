import path from 'node:path';
import {hash,readJson} from '../core/utils.js';
import {NarrationSchema,StoryboardSchema,type Shot} from '../core/schemas.js';
import {assertRigSpeechPublicationBinding,shotUsesSourceSpeechClock,type RigSpeechPublicationBinding} from '../actors/speech-clock.js';

/** Bind accepted bytes to the snapshot that actually produced the candidate,
 * never to a later board supplied by the caller. Optimistic disk rechecks are
 * run before staging/writes and after writes; they are not a filesystem lock. */
export function nativeSceneSourceGuard(root:string,shot:Shot,expected?:RigSpeechPublicationBinding):(()=>Promise<void>)|undefined{
  if(!shotUsesSourceSpeechClock(shot)&&!shot.cinematic?.sourceWorld&&!expected)return undefined;
  const shotId=shot.id,shotHash=hash(shot),binding=expected&&structuredClone(expected);
  return async()=>{
    const board=await readJson(path.join(root,'work/storyboard.json'),StoryboardSchema),current=board.shots.find(s=>s.id===shotId);
    if(!current||hash(current)!==shotHash)throw new Error(`${shotId}: needs-source-publication: canonical shot changed during scene publication`);
    assertRigSpeechPublicationBinding(current,await readJson(path.join(root,'work/narration.json'),NarrationSchema),board,binding);
  };
}
