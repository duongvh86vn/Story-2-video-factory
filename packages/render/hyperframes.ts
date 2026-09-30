import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { FactoryConfig } from '../core/config.js';
import { exists, safeRealPath, writeJson, hash, walk } from '../core/utils.js';
import { execute, parseEnvelope, outputPath, redact } from './process.js';
import type { VideoEngine, ValidationResult, RenderResult } from './engine.js';
export type { ValidationResult, RenderResult } from './engine.js';

export const HYPERFRAMES_VERSION = '0.8.96';
const require = createRequire(import.meta.url);

export class HyperFramesEngine implements VideoEngine {
  constructor(public readonly config: FactoryConfig, public readonly projectRoot: string) {}
  private async cli(): Promise<string> {
    const packagePath = require.resolve('hyperframes/package.json');
    const metadata = JSON.parse(await fs.readFile(packagePath, 'utf8')) as { version: string };
    if (metadata.version !== HYPERFRAMES_VERSION) throw new Error(`HyperFrames ${HYPERFRAMES_VERSION} required; installed ${metadata.version}`);
    return path.join(path.dirname(packagePath), 'bin', 'hyperframes.mjs');
  }
  private async project(project?: string): Promise<string> {
    const candidate = project ? (path.isAbsolute(project) ? path.relative(this.projectRoot, project) : project) : 'scenes';
    const real = await safeRealPath(this.projectRoot, candidate);
    if (!(await fs.stat(real)).isDirectory() || !await exists(path.join(real, 'index.html'))) throw new Error(`HyperFrames project requires an index.html: ${candidate}`);
    return real;
  }
  private async command(args: string[], allowFailure = false) {
    const logFile = await outputPath(this.projectRoot, 'work/logs/hyperframes.jsonl');
    return execute(process.execPath, [await this.cli(), ...args], { cwd: this.projectRoot, logFile, timeoutMs: this.config.rendering.timeout_ms, allowFailure });
  }
  async validate(project?: string): Promise<ValidationResult> {
    const dir = await this.project(project), errors: string[] = [], diagnostics: unknown[] = [];
    for (const command of ['lint', 'check']) {
      const result = await this.command([command, dir, '--json', ...(command === 'check' ? ['--no-browser-gpu', '--no-proxy'] : [])], true);
      const envelope = parseEnvelope(result.stdout);
      diagnostics.push({ command, ...result, envelope });
      if (result.timedOut || result.code !== 0 || !envelope || envelope.ok === false || envelope.pass === false || envelope.status === 'fail' || Number(envelope.errorCount ?? 0) > 0) {
        errors.push(`${command} exited ${result.code}${result.timedOut ? ' (timeout)' : ''}\n${result.stdout}\n${result.stderr}`);
      }
    }
    const validation = { pass: errors.length === 0, errors, diagnostics };
    // Raw diagnostics already logged with redaction by command(); don't persist raw secret values again.
    return validation;
  }
  async snapshot(request: { project: string; timeMs: number; output: string }): Promise<string> {
    if (!Number.isFinite(request.timeMs) || request.timeMs < 0) throw new Error('snapshot timeMs must be finite and nonnegative');
    const dir = await this.project(request.project);
    const relative = path.isAbsolute(request.output) ? path.relative(this.projectRoot, request.output) : request.output;
    const destination = await outputPath(this.projectRoot, relative);
    const stage = await outputPath(this.projectRoot, `work/snapshots/${hash({ dir, timeMs: request.timeMs, relative })}`);
    await fs.mkdir(stage, { recursive: true });
    // --no-end prevents the default extra final frame; --describe false prevents implicit Gemini calls.
    await this.command(['snapshot', dir, '--at', String(request.timeMs / 1000), '--no-end', '--output', stage, '--describe', 'false', '--no-browser-gpu', '--no-proxy']);
    const files = (await fs.readdir(stage)).filter(file => /^frame-\d+-at-.*\.png$/.test(file)).sort();
    if (files.length !== 1) throw new Error(`HyperFrames snapshot produced ${files.length} frames; expected one`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(stage, files[0]!), destination);
    return destination;
  }
  private async render(profile: 'draft' | 'final', project?: string): Promise<RenderResult> {
    const source = await this.project(project), settings = this.config.rendering[profile];
    if (settings.width % 2 || settings.height % 2) throw new Error('H.264 output dimensions must be even');
    const files = await walk(source), fileHashes: [string,string][] = [];
    for (const file of files) fileHashes.push([path.relative(source,file), hash(await fs.readFile(file))]);
    const cacheKey = hash({ fileHashes, settings, version: HYPERFRAMES_VERSION });
    const stage = await outputPath(this.projectRoot, `work/render-projects/${profile}-${cacheKey.slice(0,16)}`);
    await fs.mkdir(stage, { recursive: true });
    for (const file of files) {
      const dest = path.join(stage, path.relative(source,file));
      await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.copyFile(file,dest);
    }
    const indexFile = path.join(stage,'index.html');
    let html = await fs.readFile(indexFile,'utf8');
    const root = /<[^>]+data-composition-id=["'][^"']+["'][^>]*>/i.exec(html);
    if (!root) throw new Error('Master composition metadata missing');
    const width = Number(/data-width=["']([\d.]+)["']/.exec(root[0])?.[1]);
    const height = Number(/data-height=["']([\d.]+)["']/.exec(root[0])?.[1]);
    if (!(width > 0 && height > 0)) throw new Error('Master data-width/data-height missing');
    if ((width !== settings.width || height !== settings.height) && !html.includes('factory-stage')) throw new Error('Profile scaling requires the factory-stage master wrapper');
    const resized = root[0].replace(/data-width=["'][^"']+["']/, `data-width="${settings.width}"`).replace(/data-height=["'][^"']+["']/, `data-height="${settings.height}"`);
    html = html.replace(root[0], resized).replace('</head>', `<style>html,body{width:${settings.width}px!important;height:${settings.height}px!important}.factory-stage{transform-origin:0 0!important;transform:scale(${settings.width/width},${settings.height/height})!important}</style></head>`);
    await fs.writeFile(indexFile,html);
    const output = await outputPath(this.projectRoot, profile === 'draft' ? 'work/draft.mp4' : 'work/rendered.mp4');
    await fs.mkdir(path.dirname(output), { recursive: true });
    const args = ['render',stage,'--output',output,'--fps',String(settings.fps),'--quality',settings.quality,'--workers',String(this.config.rendering.workers),'--format','mp4','--strict','--no-best-effort','--no-browser-gpu'];
    if (this.config.rendering.docker) args.push('--docker');
    // The coordinator owns the one project-wide retry budget.
    const result = await this.command(args,true);
    if (result.code !== 0 || result.timedOut) throw new Error(redact(`HyperFrames render failed\n${result.stderr}\n${result.stdout}`));
    if (!await exists(output) || !(await fs.stat(output)).size) throw new Error('HyperFrames exited successfully without a nonempty video');
    const renderResult: RenderResult = { path: output, profile, renderer: 'hyperframes', version: HYPERFRAMES_VERSION, code: result.code, cacheKey };
    await writeJson(await outputPath(this.projectRoot,`work/render-${profile}.json`),renderResult);
    return renderResult;
  }
  renderDraft(project?: string): Promise<RenderResult> { return this.render('draft',project); }
  renderFinal(project?: string): Promise<RenderResult> { return this.render('final',project); }
  async preview(project?: string): Promise<unknown> {
    const dir = await this.project(project);
    const result = await this.command(['preview', dir, '--background', '--json', '--no-open']);
    return parseEnvelope(result.stdout) ?? { code: result.code, stdout: result.stdout };
  }
}
