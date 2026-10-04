import path from 'node:path';
import { promises as fs } from 'node:fs';
import { z } from 'zod';
import type { FactoryConfig } from '../core/config.js';
import { ShotSchema, StoryboardSchema, type Beat, type CharacterBible, type Narration, type Shot, type Story, type Storyboard } from '../core/schemas.js';
import { exists, hash, readJson, writeJson, walk } from '../core/utils.js';
import type { HostProfile, HostRig } from '../host/schemas.js';
import type { ModelRouter } from '../models/registry.js';
import { loadPrompt } from '../story/prompts.js';
import { planWithValidation } from '../story/request.js';
import { validateStoryboard } from '../storyboard/validate.js';
import { validateExplainerStoryboard } from '../explainer/storyboard.js';
import { renderCinematic } from '../../library/shots/cinematic.js';
import { validateSceneFiles, secureSceneFiles } from '../scenes/security.js';
import { DIRECTION_VERSION } from './schemas.js';
import { stageModels } from './models.js';
import { EXPLAINER_RECIPES } from '../explainer/recipes.js';
import { modelExitParts } from './props.js';
import { validateModelContinuity } from './index.js';
import { validateAuthoredVisualSources } from '../explainer/visual-sources.js';
import { ExplanationBeatSchema, SourceRefSchema, VisualizationSchema } from '../explainer/schemas.js';
import { ShotHostSchema } from '../host/schemas.js';
import { CinematicPlanSchema } from './schemas.js';
import { canonicalExplanationEvidence, normalizeCreativeSourceRefs } from '../explainer/citations.js';
import {bindActorShot,shotPerformer} from '../actors/model.js';
import {actorLockKey,assertActorLocks} from '../actors/locks.js';
import type {ActorDefinition} from '../actors/schemas.js';
import {validateCamera} from './camera.js';

/** The general shot contract also supports legacy video; creative production needs these fields. */
export const CreativeStoryboardSchema=z.object({shots:z.array(ShotSchema.innerType().extend({
  explanationGoal:z.string().trim().min(1),sourceRefs:z.array(SourceRefSchema).min(1),
  narrationSegmentIds:z.array(z.string().min(1)).min(1),captionRegion:z.literal('bottom-safe'),
  host:ShotHostSchema,visualization:VisualizationSchema,cinematic:CinematicPlanSchema,
}).refine(shot=>shot.endMs>shot.startMs,'Invalid shot interval')).min(1)});

export const CREATIVE_INPUT='input/art-direction.json';
export function creativeInputIdentity(narration:Narration,beats:Beat[],profile:HostProfile,rig:HostRig){
  return {producer:DIRECTION_VERSION,narrationHash:hash(narration),beatsHash:hash(beats),profileHash:profile.profileHash,rigHash:rig.rigHash};
}
export const AuthoredDirectionSchema=z.object({
  identity:z.object({producer:z.literal(DIRECTION_VERSION),narrationHash:z.string(),beatsHash:z.string(),profileHash:z.string(),rigHash:z.string()}).strict(),
  storyboard:StoryboardSchema,
}).strict();
export interface CreativeContext {story:Story;narration:Narration;beats:Beat[];characters:CharacterBible;profile:HostProfile;rig:HostRig;lockedActors?:ActorDefinition[];}

/** The source clock is authoritative; the seed's visual style and choreography are editable. */
export async function createCreativeStoryboard(root:string,config:FactoryConfig,router:ModelRouter,context:CreativeContext,seed:Storyboard,locks:Shot[]):Promise<Storyboard>{
  const lockIds=new Set(locks.map(shot=>shot.id)),system=await loadPrompt('creative-director');
  const identity=creativeInputIdentity(context.narration,context.beats,context.profile,context.rig);
  const reportFile=path.join(root,'work/creative-direction-report.json');
  const normalize=(value:Storyboard,origin:'model'|'authored'):Storyboard=>{
    const unlocked=normalizeCreativeSourceRefs({shots:value.shots.filter(s=>!lockIds.has(s.id))},context.narration);
    const board=StoryboardSchema.parse({shots:[...unlocked.shots,...locks].sort((a,b)=>a.startMs-b.startMs)});
    if(board.shots.length>config.rendering.max_shots)throw new Error('Creative storyboard exceeds configured shot limit');
    const failures=new Set<string>();
    const check=(operation:()=>unknown)=>{try{operation();}catch(error){failures.add(error instanceof Error?error.message:String(error));}};
    if(context.lockedActors?.length)check(()=>assertActorLocks({shots:context.lockedActors!.map(primary=>({cinematic:{actorScene:{primary,supporting:[]}}}))},board,Object.fromEntries(context.lockedActors!.map(a=>[actorLockKey(a.id),true]))));
    for(const [i,shot] of board.shots.entries()){
      const c=shot.cinematic;
      if(!c){failures.add(`${shot.id}: creative direction requires a canonical cinematic plan`);continue;}
      if(!lockIds.has(shot.id)){
        if(config.presentation.character_mode==='actors'&&!c.actorScene)failures.add(`${shot.id}: story actors mode requires actorScene; assign sourced roles or use a mechanism-only shot`);
        if(c.actorScene)bindActorShot(shot,context.profile,context.rig);
        if(!c.artDirection)failures.add(`${shot.id}: creative direction requires an authored brief and artwork contract`);
        else c.artDirection.origin=origin;
        c.sourceRefs=shot.sourceRefs!;
        // The scene owns this operational ID; it is derived metadata, not host identity.
        if(origin==='model'){
          c.performance.id=shot.id;check(()=>{c.models=stageModels(shot);});
          shot.camera={shotSize:c.camera.framing,movement:c.camera.movement,angle:'eye-level'};
          shot.sceneType='character-scene';shot.recipeId=EXPLAINER_RECIPES[shot.visualization!.type];
          c.continuity.entry={...c.performance.root};
          c.continuity.exit={x:c.performance.walks.at(-1)?.toX??c.performance.root.x,y:c.performance.stage.groundY};
          c.continuity.facing=[...(c.performance.turns??[])].sort((a,b)=>a.startMs-b.startMs).at(-1)?.direction??c.performance.facing??'front';
          c.continuity.models=modelExitParts(shot).map(part=>({partId:part.id,x:part.x,y:part.y,width:part.width,height:part.height}));
        }
      }
      const prior=board.shots[i-1]?.cinematic;
      if(prior&&c.actorScene?.continuity!=='cut'&&(prior.leadCharacterId!==c.leadCharacterId||hash(prior.continuity.exit)!==hash(c.continuity.entry)||prior.continuity.facing!==(c.performance.facing??'front')||prior.performance.scale!==c.performance.scale))failures.add(`${shot.id}: creative character position/facing/scale continuity changed at the cut`);
    }
    check(()=>validateStoryboard(board,context.narration,context.beats,context.characters));
    check(()=>validateExplainerStoryboard(board,context.narration,context.beats,context.profile,context.rig,config));
    for(const shot of board.shots){
      // Per-shot diagnostics retain the full canonical world for persistent subjects and recaps.
      check(()=>validateExplainerStoryboard({shots:[shot]},context.narration,context.beats,context.profile,context.rig,{...config,presentation:{...config.presentation,require_meaningful_host_action_per_beat:false}}));
      if(shot.cinematic?.artDirection&&shot.visualization?.parts.length)check(()=>validateAuthoredVisualSources(shot,canonicalExplanationEvidence(context.beats.map(beat=>ExplanationBeatSchema.parse({...beat,beatId:beat.id})),context.narration),context.narration,context.profile.id));
      check(()=>validateModelContinuity(board.shots[board.shots.indexOf(shot)-1],shot));
      // Camera diagnostics must survive a separate early artwork/rendering failure.
      check(()=>validateCamera(shot,shotPerformer(shot,context.profile,context.rig).profile));
      check(()=>{
        const rendered=renderCinematic(shot,context.profile,context.rig,{method:'segment-draft',windowMs:20,intervals:[]},config,undefined,context.narration);
        const errors=validateSceneFiles(secureSceneFiles(rendered.files),shot,config.workflow.max_scene_bytes,[],config.rendering.final);
        for(const error of errors)failures.add(`${shot.id}: creative artwork/security: ${error}`);
      });
    }
    if(failures.size)throw new Error(`Creative storyboard validation failed:\n${[...failures].map(error=>`- ${error}`).join('\n')}`);
    return board;
  };
  const report=async (board:Storyboard,origin:'model'|'authored'|'offline',inputHash:string)=>{
    await writeJson(reportFile,{version:22,producer:DIRECTION_VERSION,origin,inputHash,storyboardHash:hash(board),
      configuredProvider:origin==='model'?config.models.storyboard.provider:null,configuredModel:origin==='model'?config.models.storyboard.model:null,
      canonicalFields:origin==='model'?['literal narration citations resolved to full original cues; static artwork citations included in shot provenance','scene/performance IDs and renderer recipe','model variants/evidence from sourced visualization','2D camera metadata','continuity from actual performance/model exit transforms']:[],
      warning:origin==='offline'?'Rule seed only; no creative model was called. Visual acceptance is pending.':'Technical validation does not constitute visual acceptance.'});
    return board;
  };
  const authoredFile=path.join(root,CREATIVE_INPUT);
  if(await exists(authoredFile)){
    const authored=await readJson(authoredFile,AuthoredDirectionSchema);
    if(hash(authored.identity)!==hash(identity))throw new Error('needs-art-direction: authored direction belongs to a different narration, explanation, host or producer; re-author input/art-direction.json');
    return report(normalize(authored.storyboard,'authored'),'authored',hash(authored));
  }
  const requestContext={task:'creative-storyboard',story:{title:context.story.title,style:context.story.style,genre:context.story.genre,authoring:context.story.authoring},narration:{durationMs:context.narration.durationMs,segments:context.narration.segments,words:context.narration.words},
    characterMode:config.presentation.character_mode,characters:context.characters.characters,
    beats:context.beats,host:context.profile,rig:{rigHash:context.rig.rigHash},seed:seed.shots,lockedShots:locks,...(context.lockedActors?.length?{lockedActors:context.lockedActors}:{}),
    dimensions:config.rendering.final,...(config.presentation.design_brief?{designBrief:config.presentation.design_brief}:{}),artworkCoordinates:'Layers use stage pixels. Models default to normalized-stretch: centered 100x100 is scaled independently into part width/height, including text. Use sourced stage-pixel labels or explicit projection=model-viewport with one complete valid SVG viewBox to preserve its authored aspect policy in the actual part viewport. Recheck geometry and contact if letterboxing changes the illustration. Keyframes use the local shot clock.',
    creativeFreedom:'Choose a visual language for this story. The seed is editable, not a mandatory layout, mood schedule, palette or recipe sequence.'};
  const inputHash=hash({identity,system,context:requestContext,models:config.models.storyboard,fallback:config.models.fallback,retry:config.retry.structured_output,schema:DIRECTION_VERSION});
  const binding={modelsHash:hash({primary:config.models.storyboard,fallback:config.models.fallback})};
  if(router.isMock('storyboard'))return report(seed,'offline',inputHash);
  const cacheFile=path.join(root,'work/creative-storyboard-cache.json');
  if(await exists(cacheFile)){
    const cached=await readJson<{inputHash:string;storyboard:unknown}>(cacheFile);
    if(cached.inputHash===inputHash){try{return await report(normalize(StoryboardSchema.parse(cached.storyboard),'model'),'model',inputHash);}catch{/* Invalid edits are regenerated through the configured real role. */}}
  }
  // A model response rejected by an earlier validator can become valid after a renderer repair.
  // Reuse only matching current request data/instructions; never relabel edited or unrelated output.
  const attemptsDir=path.join(root,'work/attempts/creative-storyboard');
  let initialRepair:{previous:unknown;feedback:string}|undefined;
  if(await exists(attemptsDir)){
    const files=(await Promise.all((await walk(attemptsDir)).filter(file=>file.endsWith('.json')).map(async file=>({file,mtime:(await fs.stat(file)).mtimeMs})))).sort((a,b)=>b.mtime-a.mtime).map(item=>item.file);
    for(const file of files){
      const attempt=await readJson<{status:string;request?:{system:string;context:unknown};response?:unknown;binding?:unknown}>(file);
      if(attempt.status!=='domain-rejected'||!attempt.response||hash(attempt.binding)!==hash(binding)||hash(attempt.request?.context)!==hash(requestContext)||attempt.request?.system!==system)continue;
      try{
        const board=normalize(StoryboardSchema.parse(attempt.response),'model');
        await writeJson(cacheFile,{inputHash,storyboard:board,revalidatedAttempt:path.relative(root,file).split(path.sep).join('/')});
        return report(board,'model',inputHash);
      }catch(error){
        // Resume a matching rejected design with every current failure, keeping its creative work.
        // No response is edited or accepted here; the configured model still supplies the repair.
        initialRepair??={previous:attempt.response,feedback:error instanceof Error?error.message:String(error)};
      }
    }
  }
  const board=await planWithValidation(root,config,router,'storyboard','creative-storyboard',{system,
    prompt:'Return the complete {shots:[...]} production storyboard. Design the scenes with purposeful acting, explanatory motion and a coherent visual language. Keep exact narration, sourced object identity, contact order and approved locks. You may change cuts, world composition, art layers, model SVG, performance, expressions and camera within the canonical schema. Supply artDirection for every unlocked shot. Review visibility and readability before returning.',context:requestContext},
    CreativeStoryboardSchema,value=>normalize(value,'model'),binding,initialRepair);
  await writeJson(cacheFile,{inputHash,storyboard:board});
  return report(board,'model',inputHash);
}
