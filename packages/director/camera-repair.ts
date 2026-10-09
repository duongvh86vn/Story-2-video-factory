import path from 'node:path';
import {promises as fs} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {loadConfig,type FactoryConfig} from '../core/config.js';
import {BeatSchema,CharacterBibleSchema,NarrationSchema,StoryboardSchema,type ReviewIssue,type Storyboard} from '../core/schemas.js';
import {exists,hash,readJson,safeRealPath,walk,writeJson} from '../core/utils.js';
import {loadHost} from '../host/index.js';
import type {ModelRouter} from '../models/registry.js';
import {loadState} from '../orchestrator/state-machine.js';
import {lockedShot} from '../scenes/index.js';
import {validateStoryboard} from '../storyboard/validate.js';
import {storyboardMarkdown} from '../storyboard/markdown.js';
import {validateExplainerStoryboard,writeHostTimeline} from '../explainer/storyboard.js';
import {VoiceReportSchema} from '../voice/schemas.js';
import {cameraRepairSourceSnapshot,assertCameraRepairSourceSnapshot} from './camera-repair-source.js';
import {actorAssetHashes,ActorCastManifestSchema} from '../actors/assets.js';
import {assertCameraOnlyChange,directCameraStoryboard} from './camera-direction.js';
import {validateCastCameras,validateCastCameraSources} from './cast-camera.js';
import {publishSceneRevision} from './artwork-repair.js';
import {writeCinematicPlans} from './index.js';

export const CAMERA_REPAIR_VERSION='camera-repair-2';
const cameraIssues=(issues:ReviewIssue[])=>issues.filter(i=>i.severity==='high'&&i.type==='camera-layout');

/** Camera feedback has its own bounded role. It must not reach the SVG artist
 * as permission to restage a body, alter contact or fake a missing view. */
export async function repairCinematicCameras(root:string,config:FactoryConfig,router:ModelRouter,board:Storyboard,issues:ReviewIssue[]):Promise<{board:Storyboard;shotIds:string[];remainingIssues:ReviewIssue[]}>{
  const feedback=cameraIssues(issues),remainingIssues=issues.filter(i=>!feedback.includes(i));
  if(issues.some(i=>i.severity==='high'&&i.type==='camera-source'))throw new Error('needs-camera-source: restore original cast/world/clock/geometry before spending a camera repair call');
  if(!feedback.length)return {board,shotIds:[],remainingIssues};
  if(config.content.mode!=='narrated-explainer'||config.presentation.mode!=='story-cinematic'||!config.presentation.camera_agent||router.isMock('camera'))throw new Error('needs-camera-direction: camera review requires an enabled real camera agent or an authored camera edit');
  const inputs=async()=>{
    const [current,settings,state,narration,beats,characters,host,voice]=await Promise.all([
      readJson(path.join(root,'work/storyboard.json'),StoryboardSchema),loadConfig(root),loadState(root),
      readJson(path.join(root,'work/narration.json'),NarrationSchema),readJson(path.join(root,'work/beats.json'),z.array(BeatSchema)),
      readJson(path.join(root,'work/character-bible.json'),CharacterBibleSchema),loadHost(root),readJson(path.join(root,'work/voice-report.json'),VoiceReportSchema),
    ]);
    const declared=await actorAssetHashes(root);
    const actorAssets=Object.fromEntries(await Promise.all(Object.entries(declared).map(async([file,expected])=>{
      const actual=hash(await fs.readFile(await safeRealPath(root,file)));
      if(actual!==expected)throw new Error('needs-camera-direction: actor asset changed '+file);
      return [file,actual];
    })));
    const cast=await readJson(path.join(root,'work/actor-cast.json'),ActorCastManifestSchema);
    return {current,settings,state,narration,beats,characters,host,voice,actorAssets,cast:{...cast,storyboardHash:undefined}};
  };
  const original=await inputs();
  if(hash(original.current)!==hash(board)||hash(original.settings)!==hash(config))throw new Error('needs-camera-direction: canonical storyboard or configuration changed before camera repair');
  // Reject the entire blocked batch before spending any camera/artist call.
  for(const issue of issues.filter(i=>i.severity==='high')){
    const shot=board.shots.find(s=>s.id===issue.shotId);
    if(!shot)throw new Error('Camera repair review references unknown shot '+issue.shotId);
    if(lockedShot(original.state,shot))throw new Error(`${shot.id}: scene is locked; camera repair requires an explicit unlock`);
  }
  const targets=new Set(feedback.map(i=>i.shotId));
  for(const id of targets){const shot=board.shots.find(s=>s.id===id)!;
    if(!shot.cinematic?.artDirection||shot.cinematic.spriteStage)throw new Error(`${id}: needs-camera-direction: automatic camera repair requires the canonical rig camera contract`);
  }
  const protectedShots=board.shots.filter(s=>!targets.has(s.id)||lockedShot(original.state,s));
  // Validate original person/world geometry independently of a bad crop, before
  // entering a provider request. A framing error cannot mask missing source.
  for(const shot of board.shots)if(shot.cinematic&&!shot.cinematic.spriteStage)validateCastCameraSources(shot,original.host.profile,board,original.narration);
  const originalSource=cameraRepairSourceSnapshot(board,original.narration);
  const stagedRoot=path.join(root,'work/artwork-transactions',randomUUID());
  const stagedReport=path.relative(root,path.join(stagedRoot,'work/camera-direction-report.json')).split(path.sep).join('/');
  const candidate=await directCameraStoryboard(root,config,router,board,protectedShots,{
    narration:original.narration,beats:original.beats,profile:original.host.profile,rig:original.host.rig,origin:'model',repairFeedback:feedback,
    validate:value=>{
      assertCameraOnlyChange(board,value,protectedShots);
      validateStoryboard(value,original.narration,original.beats,original.characters);
      validateExplainerStoryboard(value,original.narration,original.beats,original.host.profile,original.host.rig,config);
      for(const shot of value.shots){
        if(shot.cinematic&&!shot.cinematic.spriteStage)validateCastCameras(shot,original.host.profile,value,original.narration);
      }
      return value;
    },
  },{reportPath:stagedReport});
  // Full source identities include original camera slices. A permitted camera
  // edit therefore gets a new planning identity, not an old scene's receipt.
  assertCameraOnlyChange(board,candidate,protectedShots);
  const candidateSource=cameraRepairSourceSnapshot(candidate,original.narration);
  const changed=candidate.shots.filter(s=>hash(s)!==hash(board.shots.find(prior=>prior.id===s.id))).map(s=>s.id);
  // A camera plan alone is not a repaired film. Render and review must follow.
  if(!changed.length)throw new Error('needs-camera-direction: repair retained every camera; feedback remains unresolved');
  const creativeFile=path.join(root,'work/creative-direction-report.json');
  if(await exists(creativeFile))await writeJson(path.join(stagedRoot,'work/creative-direction-report.json'),await readJson(creativeFile));
  const cast=await readJson(path.join(root,'work/actor-cast.json'),ActorCastManifestSchema);
  await writeCinematicPlans(stagedRoot,candidate,{actorCast:cast});
  await writeHostTimeline(stagedRoot,candidate,original.narration,original.host.profile,original.host.rig,original.voice.synchronization);
  const reportFile=path.join(stagedRoot,'work/camera-direction-report.json'),report=await readJson<Record<string,unknown>>(reportFile);
  await writeJson(reportFile,{...report,repairVersion:CAMERA_REPAIR_VERSION,repairShotIds:changed,sourceRevisions:{before:originalSource,after:candidateSource},runtimeValidation:'pending',renderReviewRequired:true});
  const json=(value:unknown)=>JSON.stringify(value,null,2)+'\n',pending=new Map<string,string>([
    ['work/storyboard.json',json(candidate)],['work/storyboard.md',storyboardMarkdown(candidate,original.beats)],
  ]);
  for(const file of await walk(path.join(stagedRoot,'work')))pending.set(path.relative(stagedRoot,file).split(path.sep).join('/'),await fs.readFile(file,'utf8'));
  const originalIdentity=hash({...original,current:undefined});
  await publishSceneRevision(root,pending,stagedRoot,async phase=>{
    const current=await inputs();
    if(hash(current.current)!==hash(phase==='before'?board:candidate)||hash({...current,current:undefined})!==originalIdentity)throw new Error('needs-camera-direction: source, assets, narration, settings or locks changed during camera repair publication');
    assertCameraOnlyChange(board,candidate,protectedShots);
    assertCameraRepairSourceSnapshot(current.current,current.narration,phase==='before'?originalSource:candidateSource);
  });
  return {board:candidate,shotIds:changed,remainingIssues};
}

export const cameraRepairDescription={version:CAMERA_REPAIR_VERSION,
  feedback:'high camera-layout review issues route to models.camera within the existing review/call/cost budgets',
  authority:'selected unlocked cameras only; complete source/story/cast/clock/world and other shot cameras remain unchanged',
  publication:'canonical storyboard, camera report and derived plans publish together; source/configuration/assets/locks are checked before and after',
  sourceRevisions:'old canonical revision before publication; newly validated camera-only planning revision after publication; old rendered scenes and review receipts are never rebound',
  acceptance:'camera changes require scene rebuild, fresh draft and review; geometry or provider success is not film acceptance',
  approved:false,productionReady:false,motionVerified:false};
