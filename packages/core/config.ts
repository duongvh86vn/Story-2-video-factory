import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { z } from 'zod';
import dotenv from 'dotenv';
import { exists, safePath } from './utils.js';
import { LANGUAGE_TAG, primaryLanguage } from './languages.js';
import {Id} from './identifiers.js';

export const RoleNames = ['planner','storyboard','camera','coder','repair','visual_review','fallback'] as const;
export type ModelRole = typeof RoleNames[number];
export const ModelSettingsSchema = z.object({ provider: z.enum(['gateway','openai-compatible','gemini','deepseek','ollama','litellm','claude-cli','codex-cli','mock']).default('mock'), model: z.string().min(1,'Set a real model ID in the corresponding environment variable or configuration').default('mock'), base_url: z.string().optional(), api_key_env: z.string().default('MODEL_GATEWAY_KEY'), temperature: z.number().min(0).max(2).default(0.2), vision: z.boolean().default(false), timeout_ms: z.number().positive().default(120000), input_cost_per_million: z.number().nonnegative().default(0), output_cost_per_million: z.number().nonnegative().default(0),
  command:z.string().min(1).optional(),max_call_cost_usd:z.number().positive().optional() });
export type ModelSettings = z.infer<typeof ModelSettingsSchema>;
const Profile = z.object({ width: z.number().int().positive(), height: z.number().int().positive(), fps: z.number().positive(), quality: z.enum(['draft','looks','delivery']).default('delivery') });
export const VoiceSettingsSchema = z.object({ source: z.enum(['auto','input','tts']).default('auto'),
  tts_provider: z.enum(['none','windows-speech','azure-speech','http','openai-compatible','omnivoice-studio','command']).nullable().default(null),
  voice_id: z.string().nullable().default(null), base_url: z.string().url().optional(), api_key_env: z.string().default('TTS_API_KEY'),
  speaker_voices:z.array(z.object({speaker_id:Id,voice_id:z.string().trim().min(1).max(500)}).strict()).max(32)
    .refine(rows=>new Set(rows.map(row=>row.speaker_id)).size===rows.length,'Each speaker needs one stable voice mapping').optional(),
  command: z.string().optional(), command_args: z.array(z.string()).default([]), timeout_ms: z.number().positive().default(120000),
  model:z.string().min(1).nullable().optional(), http_extra_body:z.record(z.unknown()).nullable().optional(),
  http_fields:z.object({text:z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/),language:z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/).nullable().optional(),
    voice:z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/).nullable().optional(),model:z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/).nullable().optional(),
    format:z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/).nullable().optional()}).strict().nullable().optional(),
  preserve_input_audio: z.literal(true).default(true), preserve_srt_text: z.literal(true).default(true),
  preserve_srt_timing: z.literal(true).default(true), fit_rate_min: z.number().min(0.5).max(1).default(0.85),
  fit_rate_max: z.number().min(1).max(2).default(1.20) }).strict();
export const PublicVoicePatchSchema=VoiceSettingsSchema.omit({command:true,command_args:true}).partial().strict();
export function cleanVoiceSettings(voice:z.infer<typeof VoiceSettingsSchema>):z.infer<typeof VoiceSettingsSchema>{
  if(voice.tts_provider==='command')return voice;
  const {command,command_args,...rest}=voice;
  return {...rest,command_args:[]};
}
export const ConfigSchema = z.object({
  project: z.object({ name: z.string().default('untitled'), language: z.string().regex(LANGUAGE_TAG).default('vi'), series: z.string().optional() }).default({}),
  content: z.object({ mode: z.enum(['narrated-explainer','legacy']).default('narrated-explainer') }).strict().default({}),
  host: z.object({ profile: z.string().default('library/characters/MINI-ROBOT.md'), profile_id: z.string().optional(),
    reuse_rig: z.literal(true).default(true), identity_locked: z.literal(true).default(true) }).strict().default({}),
  presentation: z.object({ mode: z.enum(['diagram','story-cinematic']).default('diagram'),
    character_mode:z.enum(['actors','presenter']).default('presenter'),
    actor_renderer:z.enum(['rig','sprite']).optional(),
    design_brief:z.string().max(6000).optional(),
    camera_agent:z.boolean().default(true),
    minimum_host_speech_visibility: z.number().min(0).max(1).default(0.70),
    maximum_host_absence_seconds: z.number().nonnegative().default(6),
    require_meaningful_host_action_per_beat: z.boolean().default(true) }).strict().default({}),
  voice: VoiceSettingsSchema.default({}),
  voice_profiles: z.record(z.string().regex(LANGUAGE_TAG), VoiceSettingsSchema.partial()).default({}),
  topic: z.object({ id: z.enum(['prehistoric-life']).nullable().default(null) }).strict().default({}),
  input: z.object({ mode: z.enum(['auto','story','idea','script','wav','srt']).default('auto'), story: z.string().default('input/story.txt'), idea: z.string().default('input/idea.txt'), script: z.string().default('input/script.txt'),
    script_format:z.enum(['narration','dialogue']).optional(),
    source: z.string().default('input/source.md'), narration: z.string().default('input/narration.wav'), subtitles: z.string().default('input/narration.srt') }).strict().default({}),
  script_generation: z.object({ kind: z.enum(['auto','factual','fiction']).default('auto'),
    target_seconds: z.number().int().min(10).max(300).default(60), brief: z.string().max(6000).default('') }).strict().default({}),
  models: z.object({planner:ModelSettingsSchema.default({}),storyboard:ModelSettingsSchema.default({}),camera:ModelSettingsSchema.nullish(),coder:ModelSettingsSchema.default({}),repair:ModelSettingsSchema.default({}),visual_review:ModelSettingsSchema.default({}),fallback:ModelSettingsSchema.default({})}).default({}).transform(models=>({...models,camera:models.camera??structuredClone(models.storyboard)})),
  rendering: z.object({ engine: z.literal('hyperframes').default('hyperframes'), draft: Profile.default({ width: 960, height: 540, fps: 15, quality: 'draft' }), final: Profile.default({ width: 1920, height: 1080, fps: 30, quality: 'delivery' }), timeout_ms: z.number().positive().default(1800000), docker: z.boolean().default(false), max_duration_seconds: z.number().positive().default(300), max_shots: z.number().int().positive().default(100), workers: z.number().int().positive().default(2) }).default({}),
  workflow: z.object({ automatic: z.boolean().default(true), require_host_approval: z.literal(true).default(true), require_storyboard_approval: z.boolean().default(false), require_character_approval: z.boolean().default(false), max_review_iterations: z.number().int().nonnegative().default(2), max_model_calls: z.number().int().positive().default(250), max_model_cost_usd: z.number().nonnegative().optional(), max_generated_assets_per_shot: z.number().int().nonnegative().default(3), max_scene_bytes: z.number().int().positive().default(2000000), allow_rule_based_review: z.boolean().default(true) }).default({}),
  retry: z.object({ structured_output: z.number().int().nonnegative().default(2), scene_generation: z.number().int().nonnegative().default(2), scene_repair: z.number().int().nonnegative().default(3), render: z.number().int().nonnegative().default(1) }).default({}),
  audio: z.object({ target_lufs: z.number().min(-70).max(-5).default(-16), true_peak: z.number().min(-9).max(0).default(-1.5), music_volume: z.number().min(0).max(1).default(0.15), sfx_volume: z.number().min(0).max(1).default(0.5), sample_rate: z.number().int().positive().default(48000), duration_tolerance_ms: z.number().nonnegative().default(500), silence_min_seconds: z.number().positive().default(2) }).default({}),
  captions: z.object({ mode: z.enum(['none','burned','soft','both']).default('both'), font: z.string().default('Arial'), font_size: z.number().positive().default(24) }).default({}),
  asr: z.object({ engine: z.enum(['faster-whisper','whisperx']).default('faster-whisper'), model: z.string().default('small'), device: z.string().default('cpu'), compute_type: z.string().default('int8'), language: z.string().optional(), align: z.boolean().default(false), allow_downloads: z.boolean().default(true) }).default({}),
  style: z.object({ preset: z.string().default('technical-clean'), overrides: z.record(z.unknown()).default({}) }).default({}),
  visual_rules: z.object({ max_static_seconds: z.number().positive().default(4), max_same_camera_seconds: z.number().positive().default(7), preferred_shot_seconds: z.object({ min: z.number().positive().default(2), max: z.number().positive().default(6) }).default({}), minimum_changes_per_10_seconds: z.number().int().positive().default(2) }).default({}),
  research: z.object({ enabled: z.boolean().default(false), sources: z.array(z.string().url()).default([]) }).default({}),
  qc: z.object({ duration_tolerance_ms: z.number().nonnegative().default(250), black_min_seconds: z.number().positive().default(0.5), freeze_min_seconds: z.number().positive().default(4), allowed_black: z.array(z.object({ startMs: z.number().nonnegative(), endMs: z.number().positive() })).default([]) }).default({})
});
export type FactoryConfig = z.infer<typeof ConfigSchema>;
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export async function findRepoRoot(): Promise<string> { let p = REPO_ROOT; for (let i=0;i<5;i++) { if (await exists(path.join(p,'config','models.yaml'))) return p; p = path.dirname(p); } return process.cwd(); }
export function deepMerge(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> { const result = { ...base }; for (const [k,v] of Object.entries(overrides)) result[k] = v && typeof v === 'object' && !Array.isArray(v) && result[k] && typeof result[k] === 'object' ? deepMerge(result[k] as Record<string,unknown>,v as Record<string,unknown>) : v; return result; }
function interpolate(value: unknown): unknown { if (typeof value === 'string') return value.replace(/\$\{([A-Z_][A-Z0-9_]*)(?::-([^}]*))?\}/g, (_,key:string,fallback:string) => process.env[key] || fallback || ''); if (Array.isArray(value)) return value.map(interpolate); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,interpolate(v)])); return value; }
export async function loadConfig(projectRoot: string, projectOverrides: Record<string,unknown> = {}): Promise<FactoryConfig> {
  const root = await findRepoRoot(); dotenv.config({ path: process.env.STORY_FACTORY_ENV_FILE || path.join(root,'.env'), quiet: true });
  let data: Record<string,unknown> = { models: {} };
  for (const name of ['models','rendering','audio','workflow','voice']) { const file=path.join(root,'config',`${name}.yaml`); if (await exists(file)) data=deepMerge(data,YAML.parse(await fs.readFile(file,'utf8')) ?? {}); }
  const projectFile=path.join(projectRoot,'project.yaml'); const episode=deepMerge(await exists(projectFile) ? YAML.parse(await fs.readFile(projectFile,'utf8')) ?? {} : {}, projectOverrides);
  const series=(episode.project as { series?: string } | undefined)?.series;
  let seriesData:Record<string,unknown>={};
  if (series) { const dir=safePath(path.join(root,'series'),series); const file=path.join(dir,'series.yaml'); if (await exists(file)) seriesData=YAML.parse(await fs.readFile(file,'utf8')) ?? {}; }
  const combined=deepMerge(deepMerge(data,seriesData),episode), language=(combined.project as {language?:string}|undefined)?.language??'vi';
  const profiles=combined.voice_profiles as Record<string,Record<string,unknown>>|undefined;
  const preset=profiles?.[language]??profiles?.[primaryLanguage(language)];
  if(preset)data=deepMerge(data,{voice:preset});
  data=deepMerge(data,seriesData);
  data=deepMerge(data,episode);
  if (data.video) data=deepMerge(data,{ rendering: { final: data.video } });
  if (data.renderer) data=deepMerge(data,{ rendering: data.renderer });
  if (data.models && typeof data.models==='object') { const roles=data.models as Record<string,unknown>; if (roles.reviewer) roles.visual_review=roles.reviewer; for (const [role,value] of Object.entries(roles)) if (typeof value==='string') roles[role]={ provider:'gateway',model:value }; }
  const config=ConfigSchema.parse(interpolate(data));
  config.voice=cleanVoiceSettings(config.voice);
  if(config.content.mode==='legacy'&&['idea','story'].includes(config.input.mode))throw new Error('Story authoring requires narrated-explainer content; select the modern story pipeline.');
  if(config.topic.id && (config.content.mode!=='narrated-explainer'||config.presentation.mode!=='story-cinematic'||config.presentation.character_mode!=='actors'))throw new Error('A story topic requires story-cinematic actors.');
  if(config.presentation.actor_renderer==='sprite'&&(config.content.mode!=='narrated-explainer'||config.presentation.mode!=='story-cinematic'||config.presentation.character_mode!=='actors'))
    throw new z.ZodError([{code:'custom',path:['presentation','actor_renderer'],message:'Image motion requires narrated story-cinematic actors.'}]);
  if(config.content.mode==='legacy'&&config.presentation.mode==='story-cinematic')
    throw new z.ZodError([{code:'custom',path:['presentation','mode'],message:'story-cinematic requires narrated-explainer content; choose diagram for the legacy renderer.'}]);
  if (config.rendering.final.width % 2 || config.rendering.final.height % 2) throw new Error('Video dimensions must be even for H.264');
  return config;
}
