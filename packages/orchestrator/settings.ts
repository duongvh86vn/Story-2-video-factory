import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import { ConfigSchema, loadConfig, deepMerge } from '../core/config.js';
import { exists, hash, safeRealPath, writeAtomic } from '../core/utils.js';
import { reservation } from './reservation.js';
import { invalidateProject } from './index.js';

export const SettingsPatchSchema = z.object({ revision: z.string().optional(),
  input: z.object({ mode: z.enum(['auto','script','wav','srt']), script: z.enum(['input/script.txt','input/script.md']).optional() }).strict().optional(),
  host: z.enum(['mini-robot','stick-man','custom']).optional(), language: z.string().regex(/^[a-z]{2}(?:-[A-Za-z]{2,4})?$/).optional(),
  voice: ConfigSchema.shape.voice.removeDefault().partial().strict().optional(), automatic: z.boolean().optional(),
}).strict();
export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;
export async function updateSettings(root: string, update: SettingsPatch): Promise<void> {
  const patch = SettingsPatchSchema.parse(update);
  if ((await reservation(root))?.active) throw new Error('Cannot change settings during production');
  const file = await safeRealPath(root,'project.yaml'), contents = await fs.readFile(file,'utf8');
  if (patch.revision && patch.revision !== hash(contents)) throw new Error('REVISION_CONFLICT: settings changed; reload before saving');
  const config = await loadConfig(root), changes: Record<string,unknown> = {};
  if (patch.input) changes.input = patch.input;
  if (patch.language) changes.project = { language: patch.language };
  if (patch.voice) changes.voice = patch.voice;
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
  ConfigSchema.parse(deepMerge(config as unknown as Record<string,unknown>, changes));
  const nextConfig=ConfigSchema.parse(deepMerge(config as unknown as Record<string,unknown>, changes));
  const effectiveMode=nextConfig.input.mode==='auto'?(await exists(path.join(root,nextConfig.input.script))?'script':await exists(path.join(root,nextConfig.input.narration))?'wav':'srt'):nextConfig.input.mode;
  const changedNarration=hash({input:config.input,voice:effectiveMode==='wav'?undefined:config.voice,language:config.project.language})!==hash({input:nextConfig.input,voice:effectiveMode==='wav'?undefined:nextConfig.voice,language:nextConfig.project.language});
  const changedHost=hash(config.host)!==hash(nextConfig.host);
  if(changedNarration||changedHost||patch.automatic!==undefined&&patch.automatic!==config.workflow.automatic)await invalidateProject(root,changedNarration?'NEW':changedHost?'TIMED':'STORYBOARDED');
  await writeAtomic(file,YAML.stringify(merged));
}
