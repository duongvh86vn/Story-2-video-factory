import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import type { FactoryConfig } from '../core/config.js';
import { ShotSchema, StoryboardSchema, type Beat, type Chapter, type CharacterBible, type Narration, type Shot, type Story, type Storyboard, SceneTypes, TransitionTypes } from '../core/schemas.js';
import { exists, hash, readJson, walk, writeAtomic, writeJson } from '../core/utils.js';
import type { ModelRouter } from '../models/registry.js';
import { validatePlanning, uniqueIds } from '../story/timeline.js';
import { readProjectLocks } from '../story/locks.js';
import { libraryRoot, loadPrompt } from '../story/prompts.js';
import { planWithValidation } from '../story/request.js';
import { narrationBoundaries, validateShotReferences, validateStoryboard } from './validate.js';
import { storyboardMarkdown } from './markdown.js';
import { recipes as builtInRecipes } from '../../library/shots/index.js';
import { loadHost } from '../host/index.js';
import { explainerShot, validateExplainerStoryboard, writeHostTimeline } from '../explainer/storyboard.js';
import { cinematicSetting, directCinematicShot, validateCinematicShot, validateModelContinuity, writeCinematicPlans } from '../director/index.js';
import { prepareCinematicEnvironments } from '../stage/index.js';
import { DIRECTION_VERSION } from '../director/schemas.js';
import { isCurrentAnimation } from '../animation/schemas.js';
import { modelExitParts } from '../director/props.js';
import { createCreativeStoryboard } from '../director/creative.js';
import {seedActorStoryboard} from '../actors/model.js';
import {actorDefinitions,actorLockKey,assertActorLocks} from '../actors/locks.js';

/** Discard obsolete derived data only on unlocked shots; never relabel an old plan as current. */
export async function readStoryboardForDirection(file:string,stateLocks:Record<string,boolean>):Promise<Storyboard>{
  const envelope=z.object({shots:z.array(ShotSchema.innerType().omit({cinematic:true}).extend({cinematic:z.unknown().optional()}))}).parse(await readJson(file));
  const shots=envelope.shots.map(shot=>{
    if(shot.cinematic){
      const version=z.object({producer:z.string(),performance:z.object({compilerVersion:z.string()}).passthrough()}).passthrough().parse(shot.cinematic);
      if(version.producer!==DIRECTION_VERSION||!isCurrentAnimation(version.performance.compilerVersion)){
        if(!/^story-direction-2\.2\.\d+$/.test(version.producer)||!/^performance-2\.2\.\d+$/.test(version.performance.compilerVersion))throw new Error(`${shot.id}: unrecognized cinematic plan version`);
        if(stateLocks.storyboard||stateLocks.scenes||stateLocks[shot.id]||stateLocks[`shot:${shot.id}`]||stateLocks[`scene:${shot.id}`]||stateLocks[`shots.${shot.id}`]||shot.locked)throw new Error(`${shot.id}: locked cinematic plan version requires migration; unlock the shot or restore its compiler`);
        return {...shot,cinematic:undefined};
      }
    }
    return shot;
  });
  return StoryboardSchema.parse({shots});
}

async function recipeCatalog(): Promise<Array<Record<string, unknown>>> {
  const files = await walk(path.join(await libraryRoot(), 'shots'));
  const recipes: Array<Record<string, unknown>> = builtInRecipes.filter(recipe=>!recipe.id.startsWith('host-')).map(recipe => ({ ...recipe }));
  for (const file of files.filter(file => /(?:recipe|manifest)\.(?:ya?ml|json)$/i.test(file))) {
    const text = await fs.readFile(file, 'utf8');
    const data: unknown = file.endsWith('.json') ? JSON.parse(text) : YAML.parse(text);
    if (data && typeof data === 'object' && !Array.isArray(data) && typeof (data as Record<string, unknown>).id === 'string') {
      const recipe = data as Record<string, unknown>;
      const existing = recipes.findIndex(item => item.id === recipe.id);
      if (existing >= 0) recipes[existing] = recipe; else recipes.push(recipe);
    }
  }
  return recipes;
}

export async function createStoryboard(projectRoot: string, config: FactoryConfig, router: ModelRouter, story: Story, narration: Narration, characters: CharacterBible, chapters: Chapter[], beats: Beat[]): Promise<Storyboard> {
  validatePlanning(narration, chapters, beats);
  const file = path.join(projectRoot, 'work', 'storyboard.json');
  const stateLocks = await readProjectLocks(projectRoot);
  const retained=await exists(file)?await readJson(file):{shots:[]};
  const lockedActors=actorDefinitions(retained).filter(a=>stateLocks[actorLockKey(a.id)]);
  const existing = await exists(file) ? await readStoryboardForDirection(file,stateLocks) : undefined;
  if (config.content.mode === 'narrated-explainer') {
    const { profile, rig } = await loadHost(projectRoot);
    let storyboard: Storyboard;
    if (stateLocks.storyboard) {
      if (!existing) throw new Error('Locked storyboard is missing');
      storyboard = existing;
    } else {
      const locks = existing?.shots.filter(s => stateLocks.scenes||stateLocks[s.id]||stateLocks[`shot:${s.id}`]||stateLocks[`scene:${s.id}`]||stateLocks[`shots.${s.id}`]||s.locked) ?? [];
      const anchors = [...narrationBoundaries(narration, beats)].sort((a, b) => a - b);
      const endpoints = [...new Set([0, narration.durationMs, ...beats.flatMap(b => [b.startMs, b.endMs]), ...locks.flatMap(s => [s.startMs, s.endMs])])].sort((a, b) => a - b);
      const planned: Shot[] = []; let serial = 0;
      for (let i = 0; i < endpoints.length - 1; i++) {
        const start = endpoints[i]!, end = endpoints[i + 1]!, lock = locks.find(s => s.startMs <= start && s.endMs >= end);
        if (lock) { if (!planned.some(s => s.id === lock.id)) planned.push(lock); continue; }
        const beat = beats.find(b => b.startMs <= start && b.endMs >= end);
        if (!beat) throw new Error('An unlocked explainer interval crosses a beat');
        let cursor = start;
        while (cursor < end) {
          const limit = cursor + config.visual_rules.preferred_shot_seconds.max * 1000;
          const cut = end <= limit ? end : anchors.filter(a => a > cursor && a <= limit).at(-1) ?? end;
          let id: string; do { id = `${beat.chapterId}.s${String(++serial).padStart(3, '0')}`; } while (locks.some(s => s.id === id));
          planned.push(explainerShot(id, cursor, cut, beat, narration, profile, rig)); cursor = cut;
        }
      }
      const ordered=planned.sort((a,b)=>a.startMs-b.startMs);
      if(config.presentation.mode==='story-cinematic'){
        let entry: {x:number;y:number}|undefined;
        let setting=cinematicSetting(narration.segments.map(s=>s.text).join(' ')),facing:'front'|'left'|'right'='front';
        for(const [i,shot] of ordered.entries()){
          if(locks.some(s=>s.id===shot.id)){
            if(!shot.cinematic)throw new Error(`${shot.id}: locked diagram shot cannot become cinematic; unlock the shot or keep diagram mode`);
            validateCinematicShot(shot,profile,config,{shots:ordered},narration);
          }else ordered[i]=directCinematicShot(shot,beats.find(b=>shot.beatIds.includes(b.id))!,profile,config,entry,{setting,facing,seed:config.presentation.character_mode==='actors',parts:ordered[i-1]?modelExitParts(ordered[i-1]!,{shots:ordered}):undefined,nextControlId:ordered[i+1]?.host?.actions.find(a=>a.type==='operate-model')?.target?.partId});
          validateModelContinuity(ordered[i-1],ordered[i]!,{shots:ordered});
          const next=ordered[i]!.cinematic!;
          if(entry&&hash(next.continuity.entry)!==hash(entry))throw new Error(`${shot.id}: locked entry breaks character continuity`);
          entry=next.continuity.exit;
          setting=next.setting;facing=next.continuity.facing;
        }
      }
      storyboard = StoryboardSchema.parse({ shots: ordered });
      if(config.presentation.character_mode==='actors'&&config.presentation.mode==='story-cinematic'){
        const converted=seedActorStoryboard({shots:storyboard.shots.filter(s=>!locks.some(lock=>lock.id===s.id))},profile,rig,narration);
        storyboard={shots:[...converted.shots,...locks].sort((a,b)=>a.startMs-b.startMs)};
      }
      if(config.presentation.mode==='story-cinematic')storyboard=await createCreativeStoryboard(projectRoot,config,router,{story,narration,characters,beats,profile,rig,lockedActors},storyboard,locks);
    }
    assertActorLocks(retained,storyboard,stateLocks);
    if(config.presentation.mode==='story-cinematic')await prepareCinematicEnvironments(projectRoot,storyboard,new Set(stateLocks.storyboard?storyboard.shots.map(s=>s.id):storyboard.shots.filter(s=>stateLocks.scenes||stateLocks[s.id]||stateLocks[`shot:${s.id}`]||stateLocks[`scene:${s.id}`]||stateLocks[`shots.${s.id}`]||s.locked).map(s=>s.id)));
    storyboard=StoryboardSchema.parse(storyboard);
    validateStoryboard(storyboard, narration, beats, characters);
    validateExplainerStoryboard(storyboard, narration, beats, profile, rig, config);
    if (storyboard.shots.length > config.rendering.max_shots) throw new Error('Explainer exceeds configured shot limit');
    const markdown = storyboardMarkdown(storyboard, beats);
    await writeJson(file, storyboard); await writeAtomic(path.join(projectRoot, 'work/storyboard.md'), markdown);
    await writeJson(path.join(projectRoot, 'output/storyboard.json'), storyboard); await writeAtomic(path.join(projectRoot, 'output/storyboard.md'), markdown);
    await writeHostTimeline(projectRoot, storyboard, narration, profile, rig);
    if(config.presentation.mode==='story-cinematic')await writeCinematicPlans(projectRoot,storyboard);
    return storyboard;
  }
  if (stateLocks.storyboard) {
    if (!existing) throw new Error('Storyboard is locked but work/storyboard.json is missing');
    validateStoryboard(existing, narration, beats, characters);
    if (existing.shots.length > config.rendering.max_shots) throw new Error(`Locked storyboard exceeds ${config.rendering.max_shots} configured shots`);
    const markdown = storyboardMarkdown(existing, beats);
    await writeAtomic(path.join(projectRoot, 'work', 'storyboard.md'), markdown);
    await writeJson(path.join(projectRoot, 'output', 'storyboard.json'), existing);
    await writeAtomic(path.join(projectRoot, 'output', 'storyboard.md'), markdown);
    return existing;
  }
  for (const [id, locked] of Object.entries(stateLocks)) {
    const shotKey = /^(?:shot(?:[_.-]|\d)|s\d+$|ch[\w.-]*[._]s\d)/i.test(id);
    if (locked && shotKey && !existing?.shots.some(shot => shot.id === id)) {
      throw new Error(`Project lock ${id} has no existing shot specification`);
    }
  }
  const lockedShots = existing?.shots.filter(shot => stateLocks[shot.id] ?? shot.locked) ?? [];
  const boundaries = narrationBoundaries(narration, beats);
  for (const shot of lockedShots) { boundaries.add(shot.startMs); boundaries.add(shot.endMs); }
  uniqueIds(lockedShots, 'locked shot');
  let previousEnd = 0;
  for (const shot of [...lockedShots].sort((a, b) => a.startMs - b.startMs)) {
    validateShotReferences(shot, beats, characters);
    if (shot.startMs < previousEnd || shot.endMs > narration.durationMs) throw new Error(`Locked shot ${shot.id} overlaps another lock or exceeds narration`);
    if (!chapters.some(chapter => shot.startMs >= chapter.startMs && shot.endMs <= chapter.endMs)) throw new Error(`Locked shot ${shot.id} crosses a new chapter boundary; restore the previous chapter partition or unlock the shot`);
    previousEnd = shot.endMs;
  }
  const recipes = await recipeCatalog();
  const recipeIds = new Set(recipes.map(recipe => recipe.id as string));
  const system = await loadPrompt('storyboard-director');
  const shots: Shot[] = [];
  for (const chapter of chapters) {
    const chapterBeats = beats.filter(beat => beat.chapterId === chapter.id);
    const locks = lockedShots.filter(shot => shot.startMs >= chapter.startMs && shot.endMs <= chapter.endMs);
    const allowedBoundaries = [...boundaries].filter(time => time >= chapter.startMs && time <= chapter.endMs).sort((a, b) => a - b);
    const context = { task: 'storyboard', story: { ...story, story: chapter.summary },
      chapter, beats: chapterBeats, characters, sceneTypes: SceneTypes, allowedTransitions: TransitionTypes, recipes, visualRules: config.visual_rules,
      style: config.style, allowedBoundaries, lockedShots: locks, lockedShotIds: locks.map(shot => shot.id),
    };
    const inputHash = hash({ system, context });
    const batchFile = path.join(projectRoot, 'work', 'storyboard-batches', `${chapter.id}.json`);
    const normalize = (result: Storyboard): Storyboard => {
      // Locked specifications are supplied to the model but restored from disk as the authority.
      const lockIds = new Set(locks.map(shot => shot.id));
      const batch = { shots: [...result.shots.filter(shot => !lockIds.has(shot.id)), ...locks].sort((a, b) => a.startMs - b.startMs) };
      StoryboardSchema.parse(batch);
      uniqueIds(batch.shots, `shot in ${chapter.id}`);
      let cursor = chapter.startMs;
      for (const shot of batch.shots) {
        if (shot.startMs !== cursor || shot.endMs > chapter.endMs) throw new Error(`Chapter ${chapter.id}: shot ${shot.id} leaves a gap/overlap or leaves chapter bounds at ${cursor}ms`);
        if (shots.some(previous => previous.id === shot.id)) throw new Error(`Shot ID ${shot.id} duplicates a previous chapter`);
        validateShotReferences(shot, chapterBeats, characters, boundaries);
        if (shot.recipeId && !recipeIds.has(shot.recipeId)) throw new Error(`Shot ${shot.id}: unavailable recipe ${shot.recipeId}; choose a catalog ID or null`);
        cursor = shot.endMs;
      }
      if (cursor !== chapter.endMs) throw new Error(`Chapter ${chapter.id} lacks complete shot coverage`);
      return batch;
    };
    let batch: Storyboard | undefined;
    if (await exists(batchFile)) {
      const cached = await readJson<{ inputHash: string; storyboard: Storyboard }>(batchFile);
      if (cached.inputHash === inputHash) {
        try { batch = normalize(StoryboardSchema.parse(cached.storyboard)); } catch { /* Changed or invalid cached output is regenerated and audited. */ }
      }
    }
    if (!batch) batch = await planWithValidation(projectRoot, config, router, 'storyboard', `storyboard-${chapter.id}`, {
      system, prompt: 'Direct this chapter as {shots:[...]}. Cover the complete chapter with no gaps/overlaps. Reference every overlapping beat. Use only supplied allowedBoundaries for all cuts, chapter-namespaced shot IDs, known characters and catalog recipes. Include locked shots exactly and design neighboring shots around their immutable intervals.', context,
    }, StoryboardSchema, normalize);
    await writeJson(batchFile, { inputHash, storyboard: batch });
    shots.push(...batch.shots);
    if (shots.length > config.rendering.max_shots) throw new Error(`Storyboard exceeds ${config.rendering.max_shots} configured shots`);
  }
  const storyboard = StoryboardSchema.parse({ shots });
  validateStoryboard(storyboard, narration, beats, characters);
  for (const locked of lockedShots) {
    if (hash(storyboard.shots.find(shot => shot.id === locked.id)) !== hash(locked)) throw new Error(`Locked shot ${locked.id} changed during generation`);
  }
  const markdown = storyboardMarkdown(storyboard, beats);
  await writeJson(file, storyboard);
  await writeAtomic(path.join(projectRoot, 'work', 'storyboard.md'), markdown);
  await writeJson(path.join(projectRoot, 'output', 'storyboard.json'), storyboard);
  await writeAtomic(path.join(projectRoot, 'output', 'storyboard.md'), markdown);
  return storyboard;
}
