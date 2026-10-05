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
import {castDesignAdvisories} from '../actors/design.js';
import {actorDefinitions,actorLockKey,assertActorLocks} from '../actors/locks.js';
import type {ActorDefinition} from '../actors/schemas.js';
import {validateCamera} from './camera.js';
import {supportedArtworkTags} from './art-direction.js';

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
        if(config.presentation.character_mode==='actors'&&context.beats.some(beat=>beat.sceneIntent)&&!c.sceneIntent)failures.add(`${shot.id}: story actors mode requires an explicit sourced sceneIntent, including cutaways`);
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
      check(()=>validateExplainerStoryboard({shots:[shot]},context.narration,context.beats,context.profile,context.rig,{...config,presentation:{...config.presentation,require_meaningful_host_action_per_beat:false}},{fragment:true}));
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
      visualAdvisories:castDesignAdvisories(board),
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
    beats:context.beats,host:context.profile,rig:{rigHash:context.rig.rigHash},seed:seed.shots,seedVisualAdvisories:castDesignAdvisories(seed),lockedShots:locks,...(context.lockedActors?.length?{lockedActors:context.lockedActors}:{}),
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
  // Explain actual approval authority at generation time. Seed preview approval
  // and profile immutable fields do not lock every story actor to the mascot.
  // Accepted designs retain their cache/approval identity and are not redesigned.
  const designBrief=config.presentation.character_mode==='actors'?{
    task:'Design a film of this story, including its cast, world, readable acting and shot composition.',
    approvalAuthority:{actorIds:[...new Set([...(context.lockedActors??[]),...actorDefinitions({shots:locks})].map(actor=>actor.id))],shotIds:[...lockIds],
      rule:'Preserve these explicit actor and shot locks. An empty list means there are no approved locks of that kind. The seed host immutable fields and preview describe the base rig, not approved appearances for every story role. Narrated name, role and identity evidence remain immutable for all actors.'},
    cast:'Choose a coherent illustrative design for each sourced role using the selected rig family, passive costume layers and supported proportions. Keep that design identical across their shots. Make co-present roles readable through silhouette, hair, clothing, proportion, shape or color when appropriate; intentional resemblance remains allowed. Seed clones are placeholders, not a required wardrobe. Do not invent biographical facts to justify visual choices.',
    staging:'Choose composition for what the viewer must understand at this moment. Establish place where needed; give meaningful faces, hand work and interactions enough screen space to read. Medium, face detail, object detail and wide shots are available within their canonical focus contracts. A distant full-body view is useful for location or walking, but may conceal a small expression. Recompose across cuts when it improves the story; no shot-size quota or fixed actor percentage applies.',
    world:'Use story-specific passive SVG sets, depth, light, textures, gradients and foreground layers where useful. Distinguish background atmosphere from sourced objects participating in an action. Rain, shadows and camera motion supplement acting, they do not replace it. Do not use a flat seed stage or a machine diagram merely because it was supplied as a scaffold.',
    acting:'Build preparation, change, response and recovery for the actual sourced situation using typed expressions, gaze, body posture, walking and hand gestures. Match meaningful changes to the narration clock, preserve pauses with purpose, and make the decisive action readable. A moving caption, decorative blink or pan is not a substitute for the narrated actor action. Preserve source statements, contact, bone and capability constraints.',
    worldCoordinates:'Layer geometry uses stage pixels; distinguish depth from coordinate space. Background layers without coordinateSpace stay fixed in the frame for compatibility. Set coordinateSpace=world on a background layer for a floor, road, wall or scenery that should share the actors and objects camera. Its own local keyframes compose inside that camera, behind midground and actors. Use frame for intentionally fixed atmosphere/backdrops; overlay stays frame space. Midground and foreground already share the world camera; do not set coordinateSpace on those or on overlay. Align visual ground with the actual actor groundY and model anchors before projection, and inspect the projected camera move, clipping and subtitle safe area. This does not impose a palette, setting, floor or shot-size quota.',
    motionTiming:'Choose keyframe ease for the actual motion: none means constant rate, sine.in accelerates, sine.out settles, sine.inOut starts and settles. The optional ease belongs to the destination keyframe and affects only its incoming local-clock interval; missing ease keeps the previous smooth curve. Continuous environmental or causal motion should not be stretched into a barely changing full-shot drift. Use sourced geometry and deliberate local phases; preserve actor performance and contact. No loop, callback, wall-clock animation or automatic movement quota is implied.',
    selfReview:'Before returning, inspect the planned key moments: can a viewer identify the roles, read the expression or operation, follow the causal action and locate the scene? Correct scale, staging or costume in the design if not. Return the complete canonical storyboard; design commentary belongs in artDirection.brief. Do not assert an approval or rendered quality result that did not occur.'
  }:undefined;
  const board=await planWithValidation(root,config,router,'storyboard','creative-storyboard',{system,
    prompt:(designBrief?JSON.stringify(designBrief)+'\n\n':'')+'Return the complete {shots:[...]} production storyboard. Design the scenes with purposeful acting, explanatory motion and a coherent visual language. Keep exact narration, sourced object identity, contact order and approved locks. You may change cuts, world composition, art layers, model SVG, performance, expressions and camera within the canonical schema. Supply artDirection for every unlocked shot. Review visibility and readability before returning. Calculate gesture targets from the actual part bounds and declared anchor in stage pixels. A host react action requires its matching timed react gesture; for a facial-only reaction use an idle arm action with the expressive face track. Keep the intended emotion. Retain the manipulated part sourceRefs in pickup bindings and keep all sceneIntent evidence within verified scene sources. Bound props currently support one completed in-shot pick-place or carry: omit prop.attachedTo and keep continuity.carriedProps empty, retain the matching destination/release/contact/hand clocks, and do not pretend an unreleased or cross-cut attachment is supported. Check the projected actor feet and visual ground throughout the camera move against the frame and subtitle safe area. Fit walk distance to the available time and rig leg length. When repairing, return the complete design with these constraints resolved; preserve story-specific acting and artwork rather than replacing the scene with a generic presentation.'+`\nRenderer-supported passive SVG tags: ${supportedArtworkTags().join(', ')}. SVG pattern, filter, use, image, style and animate are not supported. Repeated details can use primitive geometry in stage-pixel art layers and existing local-clock keyframes. This capability list does not prescribe a visual style.`,context:requestContext},
    CreativeStoryboardSchema,value=>normalize(value,'model'),binding,initialRepair);
  await writeJson(cacheFile,{inputHash,storyboard:board});
  return report(board,'model',inputHash);
}
