import {z} from 'zod';
import {StoryboardSchema,NarrationSchema,BeatSchema,CharacterBibleSchema,type Storyboard,type Narration,type Beat,type CharacterBible} from '../core/schemas.js';
import {ConfigSchema,type FactoryConfig} from '../core/config.js';
import {HostProfileSchema,HostRigSchema,type HostProfile,type HostRig} from '../host/schemas.js';
import {hash} from '../core/utils.js';
import {validateStoryboard} from '../storyboard/validate.js';
import {validateActorContinuity} from '../actors/model.js';
import {validateStoryActingCoverage,requireFinalStoryDirection} from './story-coverage.js';
import {validateSourceCandidateStoryboard} from '../explainer/storyboard.js';
import {inspectCastCameras} from './cast-camera.js';
import {validateSourceModelContinuity} from './index.js';
import {assertOriginalAuditContext,hasOriginalSource} from './source-audit-context.js';
import {validateSourceSpearBindings} from './source-spear-bindings.js';
import {validateSourceSpearActions} from './source-spear-interactions.js';
import {validateSourceWorld} from './source-world.js';

export const SOURCE_PRODUCTION_AUDIT_VERSION='original-source-audit-2';
export interface SourceProductionAuditInput {
  board:Storyboard;narration:Narration;beats:Beat[];characters:CharacterBible;
  profile:HostProfile;rig:HostRig;config:FactoryConfig;
}
export interface SourceAuditCheck {
  id:string;shotId?:string;actorId?:string|null;
  status:'passed'|'failed'|'unavailable';message?:string;
}
export interface SourceProductionAudit {
  version:typeof SOURCE_PRODUCTION_AUDIT_VERSION;
  scope:'original-source-candidate-diagnostics';binding:Record<string,string>;fingerprint:string;
  sourceChecksPassed:boolean;checks:SourceAuditCheck[];
  pendingAcceptance:string[];
  productionBinding:'needs-source-prop-binding';canPublish:false;approved:false;
  productionReady:false;productionRig:null;availableBanks:[];motionVerified:false;productionApproval:false;
}

/** Read and clone before checking. Original scripts, cues, poses, artwork and
 * caller records are never edited, retimed, upgraded or approved here. Schema
 * failures remain failures, rather than a partial "passed" diagnostic. */
export function snapshotSourceProductionCandidate(input:SourceProductionAuditInput):SourceProductionAuditInput{
  const copy=structuredClone(input);
  return {board:StoryboardSchema.parse(copy.board),narration:NarrationSchema.parse(copy.narration),beats:z.array(BeatSchema).parse(copy.beats),
    characters:CharacterBibleSchema.parse(copy.characters),profile:HostProfileSchema.parse(copy.profile),rig:HostRigSchema.parse(copy.rig),config:ConfigSchema.parse(copy.config)};
}

/** This deliberately executes existing semantic/physical validators only when
 * a human/test runtime requests diagnostics. It does not run providers, render
 * scenes/media, save artifacts, issue approval or substitute for final QC. */
export function inspectSourceProductionCandidate(input:SourceProductionAuditInput):SourceProductionAudit{
  const {board,narration,beats,characters,profile,rig,config}=snapshotSourceProductionCandidate(input);
  if(!board.shots.some(hasOriginalSource))
    throw new Error('needs-source-prop-binding: source audit requires an explicit original world, ownership or manipulation');
  if(config.content.mode!=='narrated-explainer'||config.presentation.mode!=='story-cinematic'||config.presentation.character_mode!=='actors'||(config.presentation.actor_renderer??'rig')!=='rig')
    throw new Error('needs-source-prop-binding: original source audit requires narrated story-cinematic rig actors');
  const binding={storyboard:hash(board),narration:hash(narration),beats:hash(beats),characters:hash(characters),profile:hash(profile),rig:hash(rig),
    // Only settings consumed by the validators. Provider credentials, commands
    // and voice defaults are outside this geometry/semantic diagnostic.
    settings:hash({content:config.content,presentation:config.presentation,topic:config.topic,final:config.rendering.final})};
  const report:SourceProductionAudit={version:SOURCE_PRODUCTION_AUDIT_VERSION,scope:'original-source-candidate-diagnostics',binding,fingerprint:hash({version:SOURCE_PRODUCTION_AUDIT_VERSION,binding}),sourceChecksPassed:false,checks:[],
    pendingAcceptance:['actual emitted SVG/GSAP, preflight versus renderer geometry/contact and seeking','faithful own native faces/hair/costumes/limbs/tool poses, vivid environment and film quality','rotating tools/canonical airborne ownership/changing depth contracts where required by the story','all story/script/WAV inputs, EN/VI/JA/KO and external/local TTS','resume/rebuild/locks and current MP4/audio/subtitle/thumbnail/review/final QC'],
    productionBinding:'needs-source-prop-binding',canPublish:false,approved:false,productionReady:false,productionRig:null,availableBanks:[],motionVerified:false,productionApproval:false};
  const check=(id:string,validate:()=>void,shotId?:string)=>{
    try{validate();report.checks.push({id,...(shotId?{shotId}:{}),status:'passed'});}
    catch(error){report.checks.push({id,...(shotId?{shotId}:{}),status:'failed',message:error instanceof Error?error.message:String(error)});}
  };
  check('storyboard-clock-source',()=>validateStoryboard(board,narration,beats,characters));
  check('complete-original-context',()=>assertOriginalAuditContext(board,narration,board.shots));
  check('actor-continuity',()=>validateActorContinuity(board));
  check('story-acting-coverage',()=>validateStoryActingCoverage(board,beats,narration));
  check('final-direction-source',()=>requireFinalStoryDirection(board,beats));
  for(const [index,shot] of board.shots.entries()){
    const scene=shot.cinematic?.actorScene,actual=[...new Set([...(scene?.primary?[scene.primary.id]:[]),...(scene?.supporting.map(a=>a.character.id)??[])])];
    check('model-continuity',()=>validateSourceModelContinuity(board.shots[index-1],shot,board,narration),shot.id);
    check('original-spear-model-binding',()=>validateSourceSpearBindings(shot,board,narration),shot.id);
    check('original-spear-action-tip',()=>validateSourceSpearActions(shot,board,narration),shot.id);
    check('original-world-contact',()=>validateSourceWorld(shot,board,narration),shot.id);
    check('explainer-original-candidate',()=>{validateSourceCandidateStoryboard({shots:[shot]},narration,beats,profile,rig,config,board);},shot.id);
    // A source/art failure in one checker must not erase camera findings for
    // other actual people. The camera checker itself names dependency failures.
    try{
      const cameras=inspectCastCameras(shot,profile,board,narration);
      for(const row of cameras.actors)report.checks.push({id:'cast-camera',shotId:shot.id,actorId:row.actorId,status:'passed'});
      for(const issue of cameras.issues)report.checks.push({id:'cast-camera',shotId:shot.id,actorId:issue.actorId,status:issue.type==='camera-source'?'unavailable':'failed',message:issue.message});
      for(const actorId of actual)if(!cameras.actors.some(row=>row.actorId===actorId)&&!cameras.issues.some(row=>row.actorId===actorId))
        report.checks.push({id:'cast-camera',shotId:shot.id,actorId,status:'unavailable',message:'Original world/source dependency prevented inspection of this actual actor'});
      if(!cameras.actors.length&&!cameras.issues.length)report.checks.push({id:'cast-camera',shotId:shot.id,status:'unavailable',message:'No actual camera subject was inspected'});
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      for(const actorId of actual)report.checks.push({id:'cast-camera',shotId:shot.id,actorId,status:'unavailable',message});
      if(!actual.length)report.checks.push({id:'cast-camera',shotId:shot.id,status:'unavailable',message});
    }
  }
  report.sourceChecksPassed=report.checks.length>0&&report.checks.every(c=>c.status==='passed');
  return report;
}

export const sourceProductionAuditDescription={version:SOURCE_PRODUCTION_AUDIT_VERSION,
  scope:'read-only explicit original source candidate; complete storyboard/narration/beat/cast/settings snapshot; same semantic, physical, acting and camera validators; per-group issues survive production acceptance blockers',
  receipt:'diagnostic fingerprint only; not a scene/review/final/approval receipt; no source migration, providers, assets or media produced',
  productionBinding:'needs-source-prop-binding',canPublish:false,approved:false,productionReady:false,productionRig:null,availableBanks:[],motionVerified:false,productionApproval:false};
