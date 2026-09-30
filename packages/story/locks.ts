import path from 'node:path';
import { ProjectStateSchema } from '../core/schemas.js';
import { exists, readJson } from '../core/utils.js';

export async function readProjectLocks(root: string): Promise<Record<string, boolean>> {
  const file = path.join(root, 'project-state.json');
  return await exists(file) ? (await readJson(file, ProjectStateSchema)).locked : {};
}
