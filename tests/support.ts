import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TestContext } from 'node:test';
import { ConfigSchema, ModelSettingsSchema } from '../packages/core/config.js';
import { ShotSchema } from '../packages/core/schemas.js';

export async function temporary(t: TestContext): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'story-factory-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
export const config = () => ConfigSchema.parse({});
export const model = (provider: string, base_url: string, overrides = {}) =>
  ModelSettingsSchema.parse({ provider, base_url, model: 'fixture-model', timeout_ms: 2000, ...overrides });
export const shot = (overrides = {}) => ShotSchema.parse({ id: 'shot001', startMs: 0, endMs: 4000,
  beatIds: ['beat001'], sceneType: 'technical-diagram', subject: 'A mechanism',
  visualDescription: 'The mechanism moves.', camera: { shotSize: 'wide', movement: 'static', angle: 'front' }, ...overrides });
