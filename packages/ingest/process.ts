import { spawn } from 'node:child_process';
import { appendLog } from '../core/utils.js';

export interface IngestCommandOptions { cwd?: string; logFile?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv }
/** No shell expansion. Every attempt, including launch errors/timeouts, is persisted. */
export async function runIngestCommand(command: string, args: string[], options: IngestCommandOptions = {}): Promise<{ stdout: string; stderr: string; code: number }> {
  const startedAt = new Date().toISOString(), start = Date.now();
  const result = await new Promise<{ stdout: string; stderr: string; code: number; signal?: string; error?: string; timedOut: boolean }>(resolve => {
    let stdout = '', stderr = '', error: string | undefined, timedOut = false, oversized = false;
    const limit = 4 * 1024 * 1024;
    const child = spawn(command, args, { cwd: options.cwd, env: options.env ?? process.env, shell: false, windowsHide: true });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, options.timeoutMs ?? 1800000);
    const consume = (kind: 'stdout' | 'stderr', data: Buffer): void => {
      const current = kind === 'stdout' ? stdout : stderr;
      if (current.length + data.length > limit) { oversized = true; child.kill(); }
      const value = (current + data.toString('utf8')).slice(0, limit);
      if (kind === 'stdout') stdout = value; else stderr = value;
    };
    child.stdout.on('data', data => consume('stdout', data as Buffer));
    child.stderr.on('data', data => consume('stderr', data as Buffer));
    child.on('error', failure => { error = failure.message; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? -1, ...(signal ? { signal } : {}), ...(error || oversized ? { error: error || 'command output exceeded 4 MiB' } : {}), timedOut });
    });
  });
  if (options.logFile) await appendLog(options.logFile, { kind: 'command', startedAt, command, args, durationMs: Date.now() - start, ...result });
  if (result.error || result.timedOut || result.code !== 0) throw new Error(command + ' failed (exit ' + result.code + ')' + (result.timedOut ? ': timed out' : result.error ? ': ' + result.error : '\n' + result.stderr.trim()));
  return result;
}
