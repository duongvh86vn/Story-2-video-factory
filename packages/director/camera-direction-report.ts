import type {Storyboard} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {CAMERA_DIRECTION_VERSION} from './camera-direction-schemas.js';

/** Edits/repairs publish current canonical cameras, never relabel an older
 * agent decision as acceptance of newly authored acting, art or geography. */
export function currentCameraDirectionReport(board:Storyboard,previous:Record<string,unknown>={}):Record<string,unknown>{
  const storyboardHash=hash(board),limits={visualAcceptance:false,motionVerified:false,productionApproval:false};
  if(previous.storyboardHash===storyboardHash)return {...previous,...limits};
  return {version:CAMERA_DIRECTION_VERSION,status:previous.storyboardHash?'canonical-revised':'canonical-cameras',storyboardHash,
    directorRole:'storyboard',cameraRole:'camera',providerCalled:false,agentDecisionCurrent:false,...limits,
    previousReportHash:Object.keys(previous).length?hash(previous):null,
    priorDirectedStoryboardHash:previous.direction?previous.storyboardHash:previous.priorDirectedStoryboardHash??null,
    priorDirection:previous.direction??previous.priorDirection??null,
    cameras:board.shots.filter(s=>s.cinematic).map(s=>({shotId:s.id,camera:s.cinematic!.camera})),
    warning:'These cameras belong to the current canonical storyboard. A prior agent direction is historical only; no camera provider was called for this revision and no film/art/motion acceptance is granted.'};
}
