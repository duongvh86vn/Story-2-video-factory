import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists } from '../core/utils.js';

/** Works in the source checkout and compiled dist/packages layout. */
export async function libraryRoot(): Promise<string> {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 7; depth++) {
    const candidate = path.join(dir, 'library');
    if (await exists(path.join(candidate, 'prompts', 'story-analyst.md'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Cannot locate library/prompts relative to the installed factory');
}

export async function loadPrompt(name: string): Promise<string> {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`Invalid prompt name: ${name}`);
  return fs.readFile(path.join(await libraryRoot(), 'prompts', `${name}.md`), 'utf8');
}
