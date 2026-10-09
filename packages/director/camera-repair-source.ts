import type {Narration,Storyboard} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding,type RigSpeechPublicationBinding} from '../actors/speech-clock.js';

export const CAMERA_REPAIR_SOURCE_VERSION='camera-repair-source-1';
export interface CameraRepairSourceSnapshot {
  readonly version:typeof CAMERA_REPAIR_SOURCE_VERSION;
  readonly storyboardHash:string;
  readonly narrationHash:string;
  readonly shots:readonly Readonly<{shotId:string;binding:Readonly<RigSpeechPublicationBinding>|undefined}>[];
}

/** Planning revisions have distinct camera-sensitive source identities. These
 * snapshots bind publication to each revision; they never rebind rendered scenes
 * or transfer a review/approval from the old storyboard to the new one. */
export function cameraRepairSourceSnapshot(board:Storyboard,narration:Narration):CameraRepairSourceSnapshot {
  return Object.freeze({version:CAMERA_REPAIR_SOURCE_VERSION,storyboardHash:hash(board),narrationHash:hash(narration),
    shots:Object.freeze(board.shots.map(shot=>{
      const binding=rigSpeechPublicationBinding(shot,narration,board);
      return Object.freeze({shotId:shot.id,binding:binding?Object.freeze(binding):undefined});
    }))});
}

export function assertCameraRepairSourceSnapshot(board:Storyboard,narration:Narration,expected:CameraRepairSourceSnapshot):void {
  if(expected.version!==CAMERA_REPAIR_SOURCE_VERSION||hash(board)!==expected.storyboardHash||hash(narration)!==expected.narrationHash||board.shots.length!==expected.shots.length)
    throw new Error('needs-camera-direction: canonical storyboard/narration revision changed during camera repair publication');
  for(const [index,shot] of board.shots.entries()){
    const source=expected.shots[index]!;
    if(source.shotId!==shot.id)throw new Error('needs-camera-direction: camera repair source shot identity changed');
    assertRigSpeechPublicationBinding(shot,narration,board,source.binding);
  }
}
