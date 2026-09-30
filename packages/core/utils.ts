import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { ZodTypeAny, output as ZodOutput } from 'zod';

export const hash = (value: string | Buffer | unknown): string => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value) ?? 'undefined').digest('hex');
export async function exists(file: string): Promise<boolean> { try { await fs.access(file); return true; } catch { return false; } }
export function readJson<S extends ZodTypeAny>(file: string, schema: S): Promise<ZodOutput<S>>;
export function readJson<T>(file: string): Promise<T>;
export async function readJson(file: string, schema?: ZodTypeAny): Promise<unknown> { const data: unknown = JSON.parse(await fs.readFile(file, 'utf8')); return schema ? schema.parse(data) : data; }
export async function writeJson(file: string, data: unknown): Promise<void> { await writeAtomic(file, JSON.stringify(data, null, 2) + '\n'); }
export async function writeAtomic(file: string, content: string | Buffer): Promise<void> { await fs.mkdir(path.dirname(file), { recursive: true }); const tmp = `${file}.${process.pid}.tmp`; await fs.writeFile(tmp, content); await fs.rename(tmp, file); }
export async function appendLog(file: string, data: unknown): Promise<void> { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.appendFile(file, JSON.stringify(data) + '\n'); }
export function safePath(root: string, relative: string): string { if (path.isAbsolute(relative) || /^[a-z]:/i.test(relative) || relative.includes('\0')) throw new Error(`Absolute or invalid path forbidden: ${relative}`); const target = path.resolve(root, relative); const rel = path.relative(path.resolve(root), target); if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error(`Path escapes project: ${relative}`); return target; }
export async function safeRealPath(root: string, relative: string): Promise<string> { const target = safePath(root, relative); const base = await fs.realpath(root); const real = await fs.realpath(target); const rel = path.relative(base, real); if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`Symlink escapes project: ${relative}`); return real; }
export async function walk(root: string): Promise<string[]> { if (!await exists(root)) return []; const result: string[] = []; for (const item of await fs.readdir(root, { withFileTypes: true })) { const file = path.join(root, item.name); if (item.isSymbolicLink()) continue; if (item.isDirectory()) result.push(...await walk(file)); else result.push(file); } return result.sort(); }
export function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]!); }
export function timestamp(ms: number): string { const n = Math.round(ms); return `${String(Math.floor(n / 3600000)).padStart(2,'0')}:${String(Math.floor(n / 60000) % 60).padStart(2,'0')}:${String(Math.floor(n / 1000) % 60).padStart(2,'0')}.${String(n % 1000).padStart(3,'0')}`; }
export interface CommandResult { stdout: string; stderr: string; code: number; }
export async function runCommand(command: string, args: string[], options: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv; logFile?: string; allowFailure?: boolean } = {}): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env ?? process.env, shell: false, windowsHide: true });
    let stdout = '', stderr = ''; let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, options.timeoutMs ?? 600000);
    child.stdout.on('data', chunk => { stdout += String(chunk); }); child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); const result = { stdout, stderr, code: code ?? -1 }; void (async () => { if (options.logFile) await appendLog(options.logFile, { command, args, ...result }); if (timedOut) throw new Error(`${command} timed out`); if (result.code !== 0 && !options.allowFailure) throw new Error(`${command} exited ${result.code}\n${stderr}\n${stdout}`); return result; })().then(resolve, reject); });
  });
}
