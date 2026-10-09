import path from 'node:path';
import type {FactoryConfig} from '../core/config.js';
import type {Beat,Narration,Shot,Storyboard} from '../core/schemas.js';
import {hash,writeJson} from '../core/utils.js';
import type {HostProfile,HostRig} from '../host/schemas.js';
import type {ModelRouter} from '../models/registry.js';
import {loadPrompt} from '../story/prompts.js';
import {planWithValidation} from '../story/request.js';
import {CAMERA_VIEWPORT} from './camera.js';
import {CAMERA_DIRECTION_VERSION,CameraDirectionSchema,type CameraDirection,cameraDirectionDescription} from './camera-direction-schemas.js';

/** Camera authority is structural, not an instruction the model may override. */
export function applyCameraDirection(board:Storyboard,value:CameraDirection,locks:Shot[]):Storyboard{
  const plan=CameraDirectionSchema.parse(value),locked=new Set(locks.map(s=>s.id));
  const unlocked=board.shots.filter(s=>!locked.has(s.id)),ids=new Set<string>();
  for(const entry of plan.shots){
    if(ids.has(entry.shotId)||!unlocked.some(s=>s.id===entry.shotId))throw new Error('needs-camera-direction: unknown, locked or duplicate shot '+entry.shotId);
    ids.add(entry.shotId);
  }
  if(ids.size!==unlocked.length)throw new Error('needs-camera-direction: supply every unlocked shot exactly once');
  const result=structuredClone(board);
  for(const entry of plan.shots){
    const shot=result.shots.find(s=>s.id===entry.shotId)!;
    if(!shot.cinematic?.artDirection)throw new Error('needs-camera-direction: camera requires canonical cinematic art direction');
    shot.cinematic.camera=structuredClone(entry.camera);
    shot.camera={shotSize:entry.camera.framing,movement:entry.camera.movement,angle:'eye-level'};
  }
  assertCameraOnlyChange(board,result,locks);
  return result;
}

/** Also check the domain normalizer: it must not restage a source to fit a crop. */
export function assertCameraOnlyChange(before:Storyboard,after:Storyboard,locks:Shot[]):void{
  const strip=(board:Storyboard)=>({shots:board.shots.map(shot=>{
    const {camera:_camera,cinematic,...rest}=shot;
    if(!cinematic)return rest;
    const {camera:_cinematicCamera,...world}=cinematic;
    return {...rest,cinematic:world};
  })});
  if(hash(strip(before))!==hash(strip(after)))throw new Error('needs-camera-direction: camera cannot change story, cuts, cast, acting, artwork, source or clock');
  for(const lock of locks){const prior=before.shots.find(s=>s.id===lock.id),next=after.shots.find(s=>s.id===lock.id);
    if(!prior||hash(prior)!==hash(lock)||hash(prior)!==hash(next))throw new Error('needs-camera-direction: approved shot lock changed');
  }
}

export interface CameraDirectionContext{
  narration:Narration;beats:Beat[];profile:HostProfile;rig:HostRig;
  origin:'model'|'authored'|'offline';
  validate:(board:Storyboard)=>Storyboard|Promise<Storyboard>;
}
export async function directCameraStoryboard(root:string,config:FactoryConfig,router:ModelRouter,board:Storyboard,locks:Shot[],context:CameraDirectionContext):Promise<Storyboard>{
  const file=path.join(root,'work/camera-direction-report.json');
  const base={version:CAMERA_DIRECTION_VERSION,directorRole:'storyboard',cameraRole:'camera',inputStoryboardHash:hash(board),
    narrationHash:hash(context.narration),beatsHash:hash(context.beats),locksHash:hash(locks),configuredProvider:config.models.camera.provider,configuredModel:config.models.camera.model,
    visualAcceptance:false,motionVerified:false,productionApproval:false};
  const skip=context.origin==='authored'?'authored-cameras':!config.presentation.camera_agent?'disabled':context.origin==='offline'||router.isMock('camera')?'offline':board.shots.every(s=>locks.some(lock=>lock.id===s.id))?'all-shots-locked':undefined;
  if(skip){await writeJson(file,{...base,status:skip,providerCalled:false,storyboardHash:hash(board),warning:'Existing cameras retained; no camera model quality or video acceptance is claimed.'});return board;}
  const system=await loadPrompt('camera-director');
  const request={system,prompt:'Return camera-only direction for every unlocked shot. Keep all other canonical fields unchanged. Match the supported camera schema, act on the specific story, preserve locks and original acting/contact clocks, and explain shot purpose and continuity. The complete storyboard is authoritative data.',
    context:{task:'camera-direction',contract:cameraDirectionDescription,storyboard:board,narration:context.narration,beats:context.beats,
      lockedShots:locks,profile:context.profile,rigHash:context.rig.rigHash,dimensions:config.rendering.final,viewport:CAMERA_VIEWPORT,
      designBrief:config.presentation.design_brief??'',characterMode:config.presentation.character_mode}};
  const binding={producer:CAMERA_DIRECTION_VERSION,storyboardHash:hash(board),narrationHash:hash(context.narration),
    profileHash:context.profile.profileHash,rigHash:context.rig.rigHash,locksHash:hash(locks)};
  let direction:CameraDirection|undefined;
  const callsBefore=router.usageSummary().calls;
  try{
    const result=await planWithValidation(root,config,router,'camera','camera-direction',request,CameraDirectionSchema,async value=>{
      const candidate=applyCameraDirection(board,value,locks),validated=await context.validate(candidate);
      assertCameraOnlyChange(board,validated,locks);direction=value;return validated;
    },binding,undefined,{reuseAccepted:true});
    await writeJson(file,{...base,status:'domain-validated',agentDecisionCurrent:true,requestHash:hash(request),bindingHash:hash(binding),direction,
      providerCalled:router.usageSummary().calls>callsBefore,storyboardHash:hash(result),
      warning:'Current canonical validation passed; final frames, fluid acting, audio sync and cinematic quality still require actual review.'});
    return result;
  }catch(error){
    await writeJson(file,{...base,status:'needs-camera-direction',providerCalled:router.usageSummary().calls>callsBefore,storyboardHash:hash(board),
      warning:'Camera planning failed. Original director storyboard is retained in its checkpoint; no camera output or final approval is accepted.'});
    throw error;
  }
}
