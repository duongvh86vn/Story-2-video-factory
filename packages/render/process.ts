import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { appendLog, safePath } from '../core/utils.js';

export interface ProcessResult { code: number; stdout: string; stderr: string; timedOut: boolean; truncated?: boolean; }
export class ProcessTimeoutError extends Error {
  readonly result?:ProcessResult;
  constructor(command:string,result?:ProcessResult){
    super(`${path.basename(command)} exceeded its execution timeout.`);this.name='ProcessTimeoutError';
    Object.defineProperty(this,'result',{value:result,enumerable:false});
  }
}
/** Strip credentials from diagnostics without passing a model's context to a process. */
export function redact(value: string): string {
  let result = value.replace(/(Bearer\s+)[\w.\-]+/gi, '$1[REDACTED]')
    .replace(/("(?:api[_-]?key|access[_-]?token|auth[_-]?token|token|secret|password)"\s*:\s*)"(?:\\.|[^"\\])*"/gi,'$1"[REDACTED]"')
    .replace(/((?:api[_-]?key|access[_-]?token|auth[_-]?token|token|secret|password)\s*[=:]\s*)[^\s,"}]+/gi, '$1[REDACTED]');
  for (const [key, secret] of Object.entries(process.env)) {
    if (/(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(key) && secret && secret.length >= 4) result = result.split(secret).join('[REDACTED]');
  }
  return result.replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTED]@');
}
export function mediaEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ['PATH','Path','PATHEXT','SystemRoot','WINDIR','TEMP','TMP','HOME','USERPROFILE','LOCALAPPDATA','APPDATA','PROGRAMFILES','PROGRAMFILES(X86)','CHROME_PATH','PUPPETEER_EXECUTABLE_PATH','FFMPEG_PATH','FFPROBE_PATH']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, { CI: '1', NO_COLOR: '1', DO_NOT_TRACK: '1', HYPERFRAMES_NO_UPDATE_CHECK: '1' });
  return env;
}
async function terminateProcessTree(pid:number):Promise<void> {
  if(process.platform!=='win32') {
    try {process.kill(-pid,'SIGTERM');}catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH') throw error;}
    // Escalate only this spawned process group; descendants can outlive their root.
    await new Promise<void>(resolve=>setTimeout(resolve,200));
    try {process.kill(-pid,'SIGKILL');}catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH') throw error;}
    return;
  }
  await new Promise<void>((resolve,reject)=>{
    const killer=spawn('taskkill',['/PID',String(pid),'/T','/F'],{windowsHide:true,shell:false,stdio:'ignore',env:mediaEnvironment()});
    const timer=setTimeout(()=>{killer.kill();reject(new Error(`Timed out terminating process tree ${pid}`));},10000);
    killer.on('error',error=>{clearTimeout(timer);reject(error);});
    killer.on('close',code=>{clearTimeout(timer);if(code===0) resolve();else reject(new Error(`taskkill could not confirm termination of process tree ${pid} (exit ${code})`));});
  });
}
export async function execute(command: string, args: string[], options: { cwd: string; logFile: string; timeoutMs?: number; allowFailure?: boolean; input?:string; env?:NodeJS.ProcessEnv; maxOutputBytes?:number; logOutput?:boolean }): Promise<ProcessResult> {
  const startedAt = new Date().toISOString();
  let result: ProcessResult;
  try {
    result = await new Promise<ProcessResult>((resolve, reject) => {
      const child = spawn(command, args, { cwd: options.cwd, env: options.env??mediaEnvironment(), shell: false, windowsHide: true, detached:process.platform!=='win32', stdio: ['pipe','pipe','pipe'] });
      let stdout:Buffer=Buffer.alloc(0),stderr:Buffer=Buffer.alloc(0),timedOut=false,truncated=false;
      let termination:Promise<void>|undefined;
      const cap=options.maxOutputBytes??1024*1024;
      const capture=(current:Buffer,chunk:Buffer):Buffer=>{const combined=Buffer.concat([current,chunk]);if(combined.length>cap){truncated=true;return Buffer.from(combined.subarray(combined.length-cap));}return combined;};
      const timer = setTimeout(() => { timedOut = true;if(child.pid){termination=terminateProcessTree(child.pid);void termination.catch(()=>{});}else child.kill(); }, options.timeoutMs ?? 600000);
      child.stdout.on('data', (chunk: Buffer) => { stdout=capture(stdout,chunk); });
      child.stderr.on('data', (chunk: Buffer) => { stderr=capture(stderr,chunk); });
      // Prompt bytes never become shell text or command-line arguments.
      child.stdin.on('error',error=>{if((error as NodeJS.ErrnoException).code!=='EPIPE'){clearTimeout(timer);child.kill();reject(error);}});
      child.stdin.end(options.input??'','utf8');
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('close', code => { clearTimeout(timer);void (async()=>{if(termination) await termination;resolve({code:code??-1,stdout:stdout.toString('utf8'),stderr:stderr.toString('utf8'),timedOut,truncated});})().catch(reject); });
    });
  } catch (error) {
    const message = redact(error instanceof Error ? error.message : String(error));
    await appendLog(options.logFile, { startedAt, command, args: args.map(redact), code: -1, error: message });
    throw new Error(`Cannot start ${path.basename(command)}: ${message}`);
  }
  // Return unmodified diagnostics for exact repair; persist only redacted diagnostics.
  await appendLog(options.logFile, { startedAt, command, args: args.map(redact), code: result.code, timedOut: result.timedOut,truncated:result.truncated, stdout: options.logOutput===false?'[provider response journaled separately]':redact(result.stdout), stderr: options.logOutput===false?'[provider diagnostics withheld]':redact(result.stderr) });
  if(result.timedOut)throw new ProcessTimeoutError(command,result);
  if(result.code!==0&&!options.allowFailure)throw new Error(redact(`${path.basename(command)} exited ${result.code}\n${result.stderr}\n${result.stdout}`));
  return result;
}
export function parseEnvelope(output: string): Record<string, unknown> | undefined {
  const clean = output.replace(/\u001b\[[0-9;]*m/g, '').trim();
  try { return JSON.parse(clean) as Record<string, unknown>; } catch { /* CLI may prefix progress text. */ }
  for (let i = clean.indexOf('{'); i >= 0; i = clean.indexOf('{', i + 1)) {
    try { return JSON.parse(clean.slice(i)) as Record<string, unknown>; } catch { /* Try next JSON envelope. */ }
  }
  return undefined;
}
/** Verify even new output paths against every existing ancestor, including Windows junctions. */
export async function outputPath(root: string, relative: string): Promise<string> {
  const target = safePath(root, relative), base = await fs.realpath(root);
  let ancestor = target;
  while (true) {
    try {
      const real = await fs.realpath(ancestor), rel = path.relative(base, real);
      if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error(`Output symlink escapes project: ${relative}`);
      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = path.dirname(ancestor); if (parent === ancestor) throw error; ancestor = parent;
    }
  }
}
