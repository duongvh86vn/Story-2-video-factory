import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import { ConfigSchema, ModelSettingsSchema, loadConfig, deepMerge } from '../core/config.js';
import { exists, hash, safeRealPath, writeAtomic } from '../core/utils.js';
import { reservation } from './reservation.js';
import { invalidateProject } from './index.js';
import { LANGUAGE_TAG, primaryLanguage } from '../core/languages.js';
import {topicNarrativeContext} from '../topics/prehistoric-life.js';

export const PresentationPatchSchema = z.object({ mode: ConfigSchema.shape.presentation.removeDefault().shape.mode.removeDefault().optional(),
  character_mode:ConfigSchema.shape.presentation.removeDefault().shape.character_mode.removeDefault().optional(),
  actor_renderer:ConfigSchema.shape.presentation.removeDefault().shape.actor_renderer,
  camera_agent:ConfigSchema.shape.presentation.removeDefault().shape.camera_agent.removeDefault().optional(),
  design_brief:ConfigSchema.shape.presentation.removeDefault().shape.design_brief }).strict().refine(patch=>patch.mode!==undefined||patch.character_mode!==undefined||patch.actor_renderer!==undefined||patch.design_brief!==undefined||patch.camera_agent!==undefined,'Choose presentation, character, movement renderer, camera agent or supply a design brief');
export const CreativeModelPatchSchema=ModelSettingsSchema.pick({provider:true,model:true,base_url:true,api_key_env:true,temperature:true,timeout_ms:true,vision:true}).partial().strict();
export const SettingsPatchSchema = z.object({ revision: z.string().optional(),
  input: z.object({ mode: z.enum(['auto','story','idea','script','wav','srt']), script_format:ConfigSchema.shape.input.removeDefault().shape.script_format, story: z.enum(['input/story.txt','input/story.md']).optional(), idea: z.enum(['input/idea.txt','input/idea.md']).optional(), script: z.enum(['input/script.txt','input/script.md']).optional() }).strict().optional(),
  topic: ConfigSchema.shape.topic.removeDefault().partial().strict().optional(),
  script_generation: ConfigSchema.shape.script_generation.removeDefault().partial().strict().optional(),
  host: z.enum(['mini-robot','stick-man','custom']).optional(), language: z.string().regex(LANGUAGE_TAG).optional(),
  voice: ConfigSchema.shape.voice.removeDefault().partial().strict().optional(), automatic: z.boolean().optional(),
  presentation: PresentationPatchSchema.optional(),
  models:z.object({storyboard:CreativeModelPatchSchema.optional(),camera:CreativeModelPatchSchema.nullish(),planner:CreativeModelPatchSchema.optional(),coder:CreativeModelPatchSchema.optional(),repair:CreativeModelPatchSchema.optional(),visual_review:CreativeModelPatchSchema.optional(),fallback:CreativeModelPatchSchema.optional()}).strict().optional(),
}).strict();
export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;
export async function updateSettings(root: string, update: SettingsPatch): Promise<void> {
  const patch = SettingsPatchSchema.parse(update);
  if ((await reservation(root))?.active) throw new Error('Cannot change settings during production');
  const file = await safeRealPath(root,'project.yaml'), contents = await fs.readFile(file,'utf8');
  if (patch.revision && patch.revision !== hash(contents)) throw new Error('REVISION_CONFLICT: settings changed; reload before saving');
  const config = await loadConfig(root), changes: Record<string,unknown> = {};
  if (patch.topic) { changes.topic=patch.topic; if(patch.topic.id) { changes.presentation={mode:'story-cinematic',character_mode:'actors'}; changes.host={profile:'library/characters/STICK-MAN.md',profile_id:'stick-man-01'}; } }
  if (patch.input) changes.input = patch.input;
  if (patch.script_generation) changes.script_generation=patch.script_generation;
  if (patch.language) { changes.project = { language: patch.language }; if(patch.language!==config.project.language)changes.asr={language:primaryLanguage(patch.language)}; }
  if (patch.voice) changes.voice = patch.voice;
  if (patch.presentation) changes.presentation = {...changes.presentation as object,...patch.presentation};
  if (patch.models) changes.models=patch.models;
  if (patch.automatic !== undefined) changes.workflow = { automatic: patch.automatic };
  if (patch.host) changes.host = { profile: patch.host==='mini-robot'?'library/characters/MINI-ROBOT.md':patch.host==='stick-man'?'library/characters/STICK-MAN.md':'input/host.md' };
  if (patch.host) {
    if (patch.host !== 'custom') {
      // Preserve the authored custom profile. A selected standard profile takes precedence through configuration.
      changes.host = { ...(changes.host as object), profile_id: patch.host==='mini-robot'?'mini-robot-01':'stick-man-01' };
    } else { await safeRealPath(root,'input/host.md'); changes.host = {profile:'input/host.md'}; }
  }
  const raw = YAML.parse(contents) as Record<string,unknown>, merged = deepMerge(raw,changes);
  if(patch.host==='custom' && merged.host && typeof merged.host==='object') delete (merged.host as Record<string,unknown>).profile_id;
  const nextConfig=await loadConfig(root,changes);
  if (patch.presentation?.mode === 'story-cinematic' && nextConfig.content.mode !== 'narrated-explainer') {
    throw new z.ZodError([{ code: 'custom', path: ['presentation','mode'], message: 'story-cinematic requires narrated-explainer content; the legacy renderer does not support it.' }]);
  }
  const effectiveMode=nextConfig.input.mode==='auto'?(await exists(path.join(root,nextConfig.input.story))?'story':await exists(path.join(root,nextConfig.input.idea))?'idea':await exists(path.join(root,nextConfig.input.script))?'script':await exists(path.join(root,nextConfig.input.narration))?'wav':'srt'):nextConfig.input.mode;
  const changedNarration=hash({input:config.input,authoring:['idea','story'].includes(effectiveMode)?{topic:topicNarrativeContext(config),settings:config.script_generation,model:config.models.planner}:undefined,voice:effectiveMode==='wav'?undefined:config.voice,language:config.project.language})!==hash({input:nextConfig.input,authoring:['idea','story'].includes(effectiveMode)?{topic:topicNarrativeContext(nextConfig),settings:nextConfig.script_generation,model:nextConfig.models.planner}:undefined,voice:effectiveMode==='wav'?undefined:nextConfig.voice,language:nextConfig.project.language});
  const changedHost=hash(config.host)!==hash(nextConfig.host);
  const changedPresentation=hash({presentation:config.presentation,topic:config.topic})!==hash({presentation:nextConfig.presentation,topic:nextConfig.topic});
  const changedDirector=hash({director:config.models.storyboard,camera:config.models.camera})!==hash({director:nextConfig.models.storyboard,camera:nextConfig.models.camera});
  if(changedNarration||changedHost||changedPresentation||changedDirector||patch.automatic!==undefined&&patch.automatic!==config.workflow.automatic)await invalidateProject(root,changedNarration?'NEW':changedHost||changedPresentation||changedDirector?'TIMED':'STORYBOARDED');
  await writeAtomic(file,YAML.stringify(merged));
}
