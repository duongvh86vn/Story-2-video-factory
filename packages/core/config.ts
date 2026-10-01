import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { z } from 'zod';
import dotenv from 'dotenv';
import { exists, safePath } from './utils.js';

export const RoleNames = ['planner','storyboard','coder','repair','visual_review','fallback'] as const;
export type ModelRole = typeof RoleNames[number];
export const ModelSettingsSchema = z.object({ provider: z.enum(['gateway','openai-compatible','gemini','deepseek','ollama','litellm','mock']).default('mock'), model: z.string().min(1,'Set a real model ID in the corresponding environment variable or configuration').default('mock'), base_url: z.string().optional(), api_key_env: z.string().default('MODEL_GATEWAY_KEY'), temperature: z.number().min(0).max(2).default(0.2), vision: z.boolean().default(false), timeout_ms: z.number().positive().default(120000), input_cost_per_million: z.number().nonnegative().default(0), output_cost_per_million: z.number().nonnegative().default(0) });
export type ModelSettings = z.infer<typeof ModelSettingsSchema>;
const Profile = z.object({ width: z.number().int().positive(), height: z.number().int().positive(), fps: z.number().positive(), quality: z.enum(['draft','looks','delivery']).default('delivery') });
export const ConfigSchema = z.object({
  project: z.object({ name: z.string().default('untitled'), language: z.string().default('vi'), series: z.string().optional() }).default({}),
  content: z.object({ mode: z.enum(['narrated-explainer','legacy']).default('narrated-explainer') }).strict().default({}),
  host: z.object({ profile: z.string().default('library/characters/MINI-ROBOT.md'), profile_id: z.string().optional(),
    reuse_rig: z.literal(true).default(true), identity_locked: z.literal(true).default(true) }).strict().default({}),
  presentation: z.object({ minimum_host_speech_visibility: z.number().min(0).max(1).default(0.70),
    maximum_host_absence_seconds: z.number().nonnegative().default(6),
    require_meaningful_host_action_per_beat: z.boolean().default(true) }).strict().default({}),
  voice: z.object({ source: z.enum(['auto','input','tts']).default('auto'),
    tts_provider: z.enum(['none','windows-speech','http','command']).nullable().default(null),
    voice_id: z.string().nullable().default(null), base_url: z.string().url().optional(), api_key_env: z.string().default('TTS_API_KEY'),
    command: z.string().optional(), command_args: z.array(z.string()).default([]), timeout_ms: z.number().positive().default(120000),
    preserve_input_audio: z.literal(true).default(true), preserve_srt_text: z.literal(true).default(true),
    preserve_srt_timing: z.literal(true).default(true), fit_rate_min: z.number().min(0.5).max(1).default(0.85),
    fit_rate_max: z.number().min(1).max(2).default(1.20) }).strict().default({}),
  input: z.object({ mode: z.enum(['auto','script','wav','srt']).default('auto'), script: z.string().default('input/script.txt'),
    source: z.string().default('input/source.md'), narration: z.string().default('input/narration.wav'), subtitles: z.string().default('input/narration.srt') }).strict().default({}),
  models: z.object({planner:ModelSettingsSchema.default({}),storyboard:ModelSettingsSchema.default({}),coder:ModelSettingsSchema.default({}),repair:ModelSettingsSchema.default({}),visual_review:ModelSettingsSchema.default({}),fallback:ModelSettingsSchema.default({})}).default({}),
  rendering: z.object({ engine: z.literal('hyperframes').default('hyperframes'), draft: Profile.default({ width: 960, height: 540, fps: 15, quality: 'draft' }), final: Profile.default({ width: 1920, height: 1080, fps: 30, quality: 'delivery' }), timeout_ms: z.number().positive().default(1800000), docker: z.boolean().default(false), max_duration_seconds: z.number().positive().default(300), max_shots: z.number().int().positive().default(100), workers: z.number().int().positive().default(2) }).default({}),
  workflow: z.object({ automatic: z.boolean().default(true), require_host_approval: z.literal(true).default(true), require_storyboard_approval: z.boolean().default(false), require_character_approval: z.boolean().default(false), max_review_iterations: z.number().int().nonnegative().default(2), max_model_calls: z.number().int().positive().default(250), max_model_cost_usd: z.number().nonnegative().optional(), max_generated_assets_per_shot: z.number().int().nonnegative().default(3), max_scene_bytes: z.number().int().positive().default(500000), allow_rule_based_review: z.boolean().default(true) }).default({}),
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
export async function loadConfig(projectRoot: string): Promise<FactoryConfig> {
  const root = await findRepoRoot(); dotenv.config({ path: path.join(root,'.env'), quiet: true });
  let data: Record<string,unknown> = { models: {} };
  for (const name of ['models','rendering','audio','workflow','voice']) { const file=path.join(root,'config',`${name}.yaml`); if (await exists(file)) data=deepMerge(data,YAML.parse(await fs.readFile(file,'utf8')) ?? {}); }
  const projectFile=path.join(projectRoot,'project.yaml'); const episode=await exists(projectFile) ? YAML.parse(await fs.readFile(projectFile,'utf8')) as Record<string,unknown> : {};
  const series=(episode.project as { series?: string } | undefined)?.series;
  if (series) { const dir=safePath(path.join(root,'series'),series); const file=path.join(dir,'series.yaml'); if (await exists(file)) data=deepMerge(data,YAML.parse(await fs.readFile(file,'utf8'))); }
  data=deepMerge(data,episode);
  if (data.video) data=deepMerge(data,{ rendering: { final: data.video } });
  if (data.renderer) data=deepMerge(data,{ rendering: data.renderer });
  if (data.models && typeof data.models==='object') { const roles=data.models as Record<string,unknown>; if (roles.reviewer) roles.visual_review=roles.reviewer; for (const [role,value] of Object.entries(roles)) if (typeof value==='string') roles[role]={ provider:'gateway',model:value }; }
  const config=ConfigSchema.parse(interpolate(data));
  if (config.rendering.final.width % 2 || config.rendering.final.height % 2) throw new Error('Video dimensions must be even for H.264');
  return config;
}
