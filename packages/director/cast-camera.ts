import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import type {HostProfile} from '../host/schemas.js';
import {hash} from '../core/utils.js';
import {actorProfile} from '../actors/model.js';
import {actorViewActingClock} from '../actors/view-acting-clock.js';
import {CameraFramingError,cameraSourceGeometry,validateCamera} from './camera.js';
import {ownershipScene} from './ownership-scene.js';

export const CAST_CAMERA_VERSION='cast-camera-2';
export type CastCameraRole='primary'|'supporting'|'presenter'|'world'|'object-only';
export interface CastCameraReport{
  version:typeof CAST_CAMERA_VERSION;
  actors:Array<{actorId:string|null;role:CastCameraRole;report:ReturnType<typeof validateCamera>}>;
  issues:Array<{actorId:string|null;role:CastCameraRole;type:'camera-layout'|'camera-source';message:string}>;
  visualAcceptance:false;motionVerified:false;productionApproval:false;
}
/** Camera diagnostics retain the authoritative original world and person clock,
 * even when an unrelated early source/artwork guard rejects the whole shot.
 * Each visible actor gets checked; primary is a camera role, not an owner proxy. */
function cameraSubjects(shot:Shot,base:HostProfile,board:Storyboard){
  const c=shot.cinematic;
  if(!c||c.spriteStage)throw new Error(`${shot.id}: cast camera requires a canonical rig shot`);
  if(board.shots.filter(s=>s.id===shot.id).length!==1||hash(board.shots.find(s=>s.id===shot.id))!==hash(shot))throw new Error(`${shot.id}: cast camera requires the exact shot in its authoritative complete storyboard`);
  const scene=c.actorScene,rows:Array<{id:string|null;role:CastCameraRole;shot:Shot;profile:()=>HostProfile}>=[{
    id:scene?scene.primary?.id??null:base.id,role:scene?scene.primary?'primary':scene.supporting.length?'world':'object-only':'presenter',shot,
    profile:()=>scene?.primary?actorProfile(scene.primary,base):base,
  }];
  for(const actor of scene?.supporting??[])rows.push({id:actor.character.id,role:'supporting',profile:()=>actorProfile(actor.character,base),
    shot:{...shot,host:{...shot.host!,id:actor.character.id,actions:actor.actions},cinematic:{...c,leadCharacterId:actor.character.id,performance:actor.performance,propBindings:[],
      actorScene:{primary:actor.character,speakingSegmentIds:actor.speakingSegmentIds,continuity:scene!.continuity,supporting:[]}}}});
  const visible=rows.filter(row=>row.id!==null),ids=visible.map(row=>row.id);
  if(new Set(ids).size!==ids.length)throw new Error(`${shot.id}: cast camera requires unique visible person IDs`);
  return {c,rows};
}
export function validateCastCameraSources(shot:Shot,base:HostProfile,board:Storyboard,narration?:Narration):void{
  const {c,rows}=cameraSubjects(shot,base,board),errors:string[]=[];
  const ownership=c.sourceOwnership?ownershipScene(shot,board,narration):undefined;
  for(const row of rows)try{
    if(hash(row.shot.cinematic!.performance.stage)!==hash(c.performance.stage))throw new Error('actor and original world require the same physical stage/floor');
    cameraSourceGeometry(row.shot,row.profile(),row.id===null?undefined:actorViewActingClock(board,shot,row.id),{worldShot:shot,board,narration,ownership});
  }catch(error){errors.push(`${row.id??row.role}: ${error instanceof Error?error.message:String(error)}`);}
  if(errors.length)throw new Error(`${shot.id}: needs-camera-source:\n`+errors.join('\n'));
}
export function inspectCastCameras(shot:Shot,base:HostProfile,board:Storyboard,narration?:Narration):CastCameraReport{
  const {c,rows}=cameraSubjects(shot,base,board);
  const result:CastCameraReport={version:CAST_CAMERA_VERSION,actors:[],issues:[],visualAcceptance:false,motionVerified:false,productionApproval:false};
  let ownership:ReturnType<typeof ownershipScene>|undefined;
  try{if(c.sourceOwnership)ownership=ownershipScene(shot,board,narration);}
  catch(error){result.issues.push({actorId:null,role:'world',type:'camera-source',message:error instanceof Error?error.message:String(error)});return result;}
  for(const row of rows){
    try{
      if(hash(row.shot.cinematic!.performance.stage)!==hash(c.performance.stage))throw new Error('actor and original world require the same physical stage/floor');
      const profile=row.profile(),clock=row.id===null?undefined:actorViewActingClock(board,shot,row.id);
      const report=validateCamera(row.shot,profile,clock,{worldShot:shot,board,narration,ownership});
      result.actors.push({actorId:row.id,role:row.role,report});
    }catch(error){result.issues.push({actorId:row.id,role:row.role,type:error instanceof CameraFramingError?'camera-layout':'camera-source',message:error instanceof Error?error.message:String(error)});}
  }
  return result;
}

export function validateCastCameras(shot:Shot,base:HostProfile,board:Storyboard,narration?:Narration):CastCameraReport{
  const result=inspectCastCameras(shot,base,board,narration);
  if(result.issues.length)throw new Error(`${shot.id}: camera cast validation failed:\n`+result.issues.map(issue=>`- ${issue.actorId??issue.role}: ${issue.message}`).join('\n'));
  return result;
}

export const castCameraDescription={version:CAST_CAMERA_VERSION,
  scope:'same original world stage/floor, each visible primary/supporting person and complete original actor clock; object-only camera stays explicit',
  diagnostic:'collect every actor camera defect independently; a separate early source/art guard does not erase camera findings',
  sourcePreflight:'original body/world/prop envelopes validate independently of framing before a camera repair provider request',
  review:'per-person reports are geometry diagnostics, not rendered cinematography or pose/identity acceptance',
  approved:false,productionReady:false,motionVerified:false};
