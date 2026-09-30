import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { safePath } from '../../packages/core/utils.js';
import { reservation } from '../../packages/orchestrator/reservation.js';

export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public code = 'REQUEST_FAILED') { super(message); }
}

const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
export const ProjectName = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/, 'Use 1–64 letters, digits, underscores or hyphens.').refine(n => !reserved.test(n), 'Reserved filename.');
export const SafeId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/).refine(n => !reserved.test(n) && !n.endsWith('.'));

/** Reject links at every component, including Windows directory junctions. */
export async function boundPath(root: string, relative: string, write = false): Promise<string> {
  if (relative.includes('\\') || relative.includes(':') || relative.split('/').some(p => !p || p === '.' || p === '..' || p.endsWith('.') || p.endsWith(' ') || reserved.test(p))) {
    throw new ApiError(400, 'Invalid project-relative path.', 'INVALID_PATH');
  }
  let target: string;
  try { target = safePath(root, relative); } catch { throw new ApiError(400, 'Path must stay inside this project.', 'INVALID_PATH'); }
  const base = await fs.realpath(root);
  let current = path.resolve(root);
  const parts = relative.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]!);
    try {
      const info = await fs.lstat(current);
      if (info.isSymbolicLink()) throw new ApiError(403, 'Linked files are not served or edited.', 'LINK_FORBIDDEN');
      const real = await fs.realpath(current);
      const rel = path.relative(base, real);
      if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new ApiError(403, 'Path escapes project.', 'INVALID_PATH');
      if (i < parts.length - 1 && !info.isDirectory()) throw new ApiError(400, 'Parent is not a directory.', 'INVALID_PATH');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      if (!write) throw new ApiError(404, 'File is not available yet.', 'NOT_FOUND');
      if (i < parts.length - 1) await fs.mkdir(current);
    }
  }
  return target;
}

export async function projectPath(projectsRoot: string, name: string): Promise<string> {
  ProjectName.parse(name);
  const target = await boundPath(projectsRoot, name);
  if (!(await fs.stat(target)).isDirectory()) throw new ApiError(404, 'Project not found.', 'NOT_FOUND');
  return target;
}

export function uploadFilename(value: string): string {
  if (!value || value.length > 140 || value.includes('..') || /[\\/:\x00-\x1f<>"|?*]/.test(value) || value.endsWith('.') || value.endsWith(' ') || reserved.test(value)) {
    throw new ApiError(400, 'Upload filename must be a plain filename without folders.', 'INVALID_FILENAME');
  }
  return value;
}

export function redact(value: string): string {
  for (const [key, secret] of Object.entries(process.env)) {
    if (/(?:key|token|secret|password|credential)/i.test(key) && secret && secret.length >= 4) value = value.split(secret).join('[redacted]');
  }
  return value
    .replace(/(Bearer\s+)[^\s"']+/gi, '$1[redacted]')
    .replace(/((?:api[_-]?key|authorization|token|secret|password)["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi, '$1[redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[redacted]');
}

export async function ensureIdle(root: string): Promise<boolean> {
  let file: string;
  try { file = await boundPath(root, '.factory.lock'); }
  catch (error) { if (error instanceof ApiError && error.statusCode === 404) return true; throw error; }
  if(!(await reservation(root))?.active)return true;
  throw new ApiError(409, 'Production is running for this project. Wait before editing.', 'PROJECT_BUSY');
}

export const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.srt': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.log': 'text/plain; charset=utf-8', '.jsonl': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff',
};
