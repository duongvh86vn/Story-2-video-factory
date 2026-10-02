import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TestContext } from 'node:test';
import { ConfigSchema, ModelSettingsSchema } from '../packages/core/config.js';
import { ShotSchema } from '../packages/core/schemas.js';
import { findRepoRoot } from '../packages/core/config.js';
import { createProject } from '../packages/orchestrator/index.js';
import YAML from 'yaml';

export async function temporary(t: TestContext): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'story-factory-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
// These existing fixtures cover the V1 contract. V2.1 fixtures use explicit explainer settings.
export const config = () => ConfigSchema.parse({content:{mode:'legacy'},presentation:{mode:'diagram',character_mode:'presenter'}});
export async function createLegacyProject(name:string, options:{root:string;example?:boolean}):Promise<string>{
  const root=await createProject(name,{root:options.root});
  const repo=await findRepoRoot();
  if(options.example)await fs.cp(path.join(repo,'examples/invention-demo/input'),path.join(root,'input'),{recursive:true});
  const file=path.join(root,'project.yaml'),settings=YAML.parse(await fs.readFile(file,'utf8'));
  settings.content={mode:'legacy'};
  settings.presentation={...settings.presentation,mode:'diagram',character_mode:'presenter'};
  await fs.writeFile(file,YAML.stringify(settings));
  return root;
}
export const model = (provider: string, base_url: string, overrides = {}) =>
  ModelSettingsSchema.parse({ provider, base_url, model: 'fixture-model', timeout_ms: 2000, ...overrides });
export const shot = (overrides = {}) => ShotSchema.parse({ id: 'shot001', startMs: 0, endMs: 4000,
  beatIds: ['beat001'], sceneType: 'technical-diagram', subject: 'A mechanism',
  visualDescription: 'The mechanism moves.', camera: { shotSize: 'wide', movement: 'static', angle: 'front' }, ...overrides });
