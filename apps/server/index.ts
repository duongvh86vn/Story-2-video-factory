import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import multipart from '@fastify/multipart';
import { promises as fs, createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { findRepoRoot, loadConfig } from '../../packages/core/config.js';
import { ProjectStateSchema, States, ShotSchema, StoryboardSchema, SceneFilesSchema, type ProjectState, type Storyboard } from '../../packages/core/schemas.js';
import { exists, hash, writeAtomic } from '../../packages/core/utils.js';
import { inspectMedia } from '../../packages/assets/files.js';
import { validateSceneFiles, secureSceneFiles, SCENE_FILENAMES } from '../../packages/scenes/security.js';
import { ApiError, ProjectName, SafeId, boundPath, ensureIdle, projectPath, uploadFilename, MIME, redact } from './security.js';
import { ARTIFACTS, DOWNLOADS, LOGS, checkRevision, listDownloads, locate, optionalArtifact, readArtifact, saveArtifact, srtSegments, tailLog } from './artifacts.js';
import { loadCoordinator, ProjectJobs, type Coordinator } from './jobs.js';
import { PREVIEW_BRIDGE, withPreviewBridge } from './preview.js';
import { visualAssetPath } from '../../packages/scenes/assets.js';
import type { ProjectDetail, ProjectSummary, SceneDocument, UploadedAsset } from './contracts.js';

export interface ServerOptions { repoRoot?: string; projectsRoot?: string; studioRoot?: string; coordinator?: Coordinator; logger?: boolean; }
type Named = { name: string };
const RunBody = z.object({ until: z.enum(States).default('DONE'), force: z.boolean().default(false), shotIds: z.array(SafeId).min(1).max(100).optional() }).strict();
const loopback = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function clean(value: unknown): unknown {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !/^(?:api[_-]?key|authorization|password|secret|access[_-]?token|projectRoot)$/i.test(key)).map(([key, item]) => [key, clean(item)]));
  return value;
}

async function safeLayout(root: string): Promise<void> {
  // Coordinator reads these fixed files; validate them before handing it a root.
  for (const relative of ['project.yaml', 'project-state.json', '.factory.lock', 'work/production.sqlite', ...Object.values(ARTIFACTS).flatMap(spec => spec.paths)]) {
    try { await boundPath(root, relative); } catch (error) { if (!(error instanceof ApiError && error.statusCode === 404)) throw error; }
  }
}

async function isBusy(root: string): Promise<boolean> {
  try { await ensureIdle(root); return false; } catch (error) { if (error instanceof ApiError && error.code === 'PROJECT_BUSY') return true; throw error; }
}

async function streamFile(request: FastifyRequest, reply: FastifyReply, file: string, download?: string): Promise<FastifyReply> {
  const stat = await fs.stat(file);
  if (!stat.isFile()) throw new ApiError(404, 'File not found.', 'NOT_FOUND');
  reply.type(MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream').header('Accept-Ranges', 'bytes').header('Cache-Control', 'no-cache');
  if (download) reply.header('Content-Disposition', `attachment; filename="${download}"`);
  const range = request.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return reply.code(416).header('Content-Range', `bytes */${stat.size}`).send();
    const start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
    const end = match[1] ? (match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1) : stat.size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= stat.size) return reply.code(416).header('Content-Range', `bytes */${stat.size}`).send();
    return reply.code(206).header('Content-Range', `bytes ${start}-${end}/${stat.size}`).header('Content-Length', end - start + 1).send(createReadStream(file, { start, end }));
  }
  return reply.header('Content-Length', stat.size).send(createReadStream(file));
}

export async function buildServer(options: ServerOptions = {}) {
  const repo = path.resolve(options.repoRoot ?? await findRepoRoot());
  const projectsRoot = path.resolve(options.projectsRoot ?? path.join(repo, 'projects'));
  const studioRoot = path.resolve(options.studioRoot ?? path.join(repo, 'dist/studio'));
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 2 * 1024 * 1024, requestTimeout: 120000 });
  const jobs = new ProjectJobs();
  const coordinator = () => options.coordinator ? Promise.resolve(options.coordinator) : loadCoordinator();
  const rootFor = async (name: string) => {
    try { return await projectPath(projectsRoot, name); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new ApiError(404, 'Project not found.', 'NOT_FOUND'); throw error; }
  };
  const mutate = async <T>(name: string, action: (root: string, core: Coordinator) => Promise<T>) => jobs.mutate(name, async () => {
    const root = await rootFor(name);
    await safeLayout(root);
    await ensureIdle(root);
    return action(root, await coordinator());
  });

  await app.register(multipart, { preservePath: true, limits: { fileSize: 128 * 1024 * 1024, files: 12, fields: 2, fieldSize: 200, parts: 14 }, throwFileSizeLimit: true });
  app.addHook('onRequest', async (request, reply) => {
    const host = request.headers.host;
    let hostname = '';
    try { hostname = new URL(`http://${host}`).hostname.toLowerCase(); } catch { /* rejected below */ }
    if (!loopback.has(hostname)) throw new ApiError(403, 'Studio is available on localhost only.', 'HOST_FORBIDDEN');
    if (request.headers.origin) {
      let origin: URL;
      try { origin = new URL(request.headers.origin); } catch { throw new ApiError(403, 'Origin is not allowed.', 'ORIGIN_FORBIDDEN'); }
      if (origin.protocol !== 'http:' || !loopback.has(origin.hostname.toLowerCase()) || !['5173', new URL(`http://${host}`).port || '80'].includes(origin.port || '80')) throw new ApiError(403, 'Origin is not allowed.', 'ORIGIN_FORBIDDEN');
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers['sec-fetch-site'] === 'cross-site') throw new ApiError(403, 'Cross-site changes are not allowed.', 'ORIGIN_FORBIDDEN');
    reply.header('X-Content-Type-Options', 'nosniff').header('Referrer-Policy', 'no-referrer').header('Cache-Control', 'no-store');
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof z.ZodError) return reply.code(422).send({ error: { code: 'VALIDATION_FAILED', message: 'Please check the values and try again.', issues: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) } });
    const candidate = error as { statusCode?: number; code?: string };
    const status = error instanceof ApiError ? error.statusCode : candidate.statusCode && candidate.statusCode >= 400 && candidate.statusCode < 500 ? candidate.statusCode : candidate.code === 'EEXIST' ? 409 : 500;
    const message = error instanceof ApiError ? redact(error.message) : status === 409 ? 'A project with this name already exists.' : status === 413 ? 'Upload or document exceeds the size limit.' : status < 500 ? 'The request could not be read. Check its format.' : 'The operation failed. Check the production log, then retry.';
    // Do not print raw model/config errors, payloads or filesystem paths.
    request.log.warn({ status, code: error instanceof ApiError ? error.code : 'REQUEST_FAILED' }, 'Studio request failed');
    return reply.code(status).send({ error: { code: error instanceof ApiError ? error.code : 'REQUEST_FAILED', message } });
  });

  const summary = async (name: string): Promise<ProjectSummary> => {
    const root = await rootFor(name);
    const state = await optionalArtifact<ProjectState>(root, 'project-state.json') ?? ProjectStateSchema.parse({ version: 1, name, state: 'NEW', updatedAt: (await fs.stat(root)).mtime.toISOString(), inputHash: '' });
    const job = jobs.current(name);
    return { name, state: state.state, updatedAt: state.updatedAt, approvals: state.approvals, busy: job?.status === 'running' || await isBusy(root), job, ...(state.error ? { error: redact(state.error) } : {}) };
  };
  const detail = async (name: string): Promise<ProjectDetail> => {
    const root = await rootFor(name);
    await safeLayout(root);
    const raw = await (await coordinator()).getProjectStatus(root) as Record<string, unknown>;
    const state = ProjectStateSchema.parse(raw);
    const config = await loadConfig(root);
    const downloads = await listDownloads(root) as ProjectDetail['downloads'];
    const url = (relative: string) => `/project-static/${encodeURIComponent(name)}/${relative.split('/').map(encodeURIComponent).join('/')}`;
    const available = async (paths: string[]) => { const file = await locate(root, paths); return file ? url(path.relative(root, file).split(path.sep).join('/')) : null; };
    const completed = States.indexOf(state.state);
    return {
      ...await summary(name), locked: state.locked,
      progress: { completed, total: States.length - 1, percent: Math.round(completed / (States.length - 1) * 100), stage: state.state },
      artifacts: clean(raw.artifacts ?? {}) as ProjectDetail['artifacts'], production: clean(raw.production ?? {}), downloads,
      preview: { composition: await available(['scenes/index.html']), draft: await available(DOWNLOADS['draft.mp4']!), final: await available(DOWNLOADS['final.mp4']!), contactSheet: await available([...DOWNLOADS['contact-sheet.jpg']!, ...DOWNLOADS['contact-sheet.png']!]) },
      settings: { language: config.project.language, format: config.rendering.final, approvalRequired: { storyboard: config.workflow.require_storyboard_approval || !config.workflow.automatic, characters: config.workflow.require_character_approval } },
    };
  };

  app.get('/api/projects', async () => {
    if (!await exists(projectsRoot)) return { projects: [] };
    if ((await fs.lstat(projectsRoot)).isSymbolicLink()) throw new ApiError(403, 'Linked project folders are not supported.', 'LINK_FORBIDDEN');
    const names = (await fs.readdir(projectsRoot, { withFileTypes: true })).filter(d => d.isDirectory() && !d.isSymbolicLink() && ProjectName.safeParse(d.name).success).map(d => d.name);
    const projects = await Promise.all(names.map(summary));
    return { projects: projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) };
  });
  app.post('/api/projects', async (request, reply) => {
    const body = z.object({ name: ProjectName, example: z.boolean().default(false) }).strict().parse(request.body);
    const result = await jobs.mutate(body.name, async () => {
      await fs.mkdir(projectsRoot, { recursive: true });
      if ((await fs.lstat(projectsRoot)).isSymbolicLink()) throw new ApiError(403, 'Linked project folders are not supported.', 'LINK_FORBIDDEN');
      await (await coordinator()).createProject(body.name, { root: projectsRoot, example: body.example });
      return summary(body.name);
    });
    return reply.code(201).send(result);
  });
  app.get<{ Params: Named }>('/api/projects/:name', request => detail(ProjectName.parse(request.params.name)));
  app.post<{ Params: Named }>('/api/projects/:name/run', async (request, reply) => {
    const name = ProjectName.parse(request.params.name), body = RunBody.parse(request.body ?? {}), root = await rootFor(name);
    await safeLayout(root); await ensureIdle(root);
    const core = await coordinator();
    if (body.shotIds) {
      if (body.force) throw new ApiError(422, 'Selected shot rebuilds cannot reset the whole project.', 'INVALID_RUN');
      const state = await optionalArtifact<ProjectState>(root, 'project-state.json');
      if (!state || States.indexOf(state.state) < States.indexOf('SCENES_READY')) throw new ApiError(409, 'Build scenes before rebuilding individual shots.', 'SCENES_REQUIRED');
      const board = await optionalArtifact<Storyboard>(root, 'storyboard.json');
      for (const id of body.shotIds) if (!board?.shots.some(s => s.id === id)) throw new ApiError(422, 'Selected shot does not exist.', 'UNKNOWN_SHOT');
      if (States.indexOf(body.until) < States.indexOf('SCENES_READY')) throw new ApiError(422, 'Stop after scenes or a later stage for shot rebuilds.', 'INVALID_RUN');
    }
    return reply.code(202).send({ job: jobs.start(name, body.until, body.shotIds, () => core.runPipeline(root, body)) });
  });
  app.get<{ Params: Named & { id: string } }>('/api/projects/:name/jobs/:id', async request => {
    const name = ProjectName.parse(request.params.name); await rootFor(name);
    return { job: jobs.get(name, request.params.id) };
  });
  app.post<{ Params: Named }>('/api/projects/:name/approve', async request => {
    const { kind } = z.object({ kind: z.enum(['storyboard', 'characters']) }).strict().parse(request.body);
    return mutate(request.params.name, async (root, core) => {
      if (!await optionalArtifact(root, kind === 'storyboard' ? 'storyboard.json' : 'character-bible.json')) throw new ApiError(409, 'Generate this artifact before approving it.', 'ARTIFACT_REQUIRED');
      await core.approveProject(root, kind); return summary(request.params.name);
    });
  });
  app.patch<{ Params: Named }>('/api/projects/:name/locks', async request => {
    const { locked } = z.object({ locked: z.record(SafeId, z.boolean()) }).strict().parse(request.body);
    if (Object.keys(locked).length > 200) throw new ApiError(422, 'Too many lock updates.', 'VALIDATION_FAILED');
    return mutate(request.params.name, async (root, core) => {
      const board = await optionalArtifact<Storyboard>(root, 'storyboard.json');
      const bible = await optionalArtifact<ProjectDetail['artifacts']['character-bible']>(root, 'character-bible.json');
      const allowed = new Set(['storyboard', 'characterBible', ...board?.shots.map(s => s.id) ?? [], ...bible?.characters.map(c => c.id) ?? []]);
      if (Object.keys(locked).some(id => !allowed.has(id))) throw new ApiError(422, 'Unknown item to lock.', 'UNKNOWN_LOCK');
      await core.updateLocks(root, locked); return summary(request.params.name);
    });
  });
  app.get<{ Params: Named & { artifact: string } }>('/api/projects/:name/artifacts/:artifact', async (request, reply) => {
    const doc = await readArtifact(await rootFor(request.params.name), request.params.artifact);
    reply.header('ETag', `"${doc.revision}"`); return doc;
  });
  app.put<{ Params: Named & { artifact: string } }>('/api/projects/:name/artifacts/:artifact', async request => {
    const body = z.object({ data: z.unknown(), revision: z.string().optional() }).strict().parse(request.body);
    return mutate(request.params.name, (root, core) => saveArtifact(root, request.params.artifact, body.data, body.revision ?? request.headers['if-match'], core));
  });
  app.patch<{ Params: Named & { id: string } }>('/api/projects/:name/shots/:id', async request => {
    const id = SafeId.parse(request.params.id);
    const body = z.object({ shot: ShotSchema, revision: z.string().optional() }).strict().parse(request.body);
    if (body.shot.id !== id) throw new ApiError(422, 'Shot ID cannot be changed.', 'VALIDATION_FAILED');
    return mutate(request.params.name, async (root, core) => {
      const doc = await readArtifact(root, 'storyboard.json'), board = StoryboardSchema.parse(doc.data);
      const index = board.shots.findIndex(s => s.id === id);
      if (index < 0) throw new ApiError(404, 'Shot not found.', 'NOT_FOUND');
      board.shots[index] = body.shot;
      return saveArtifact(root, 'storyboard.json', board, body.revision, core);
    });
  });

  const sceneDocument = async (root: string, id: string): Promise<SceneDocument> => {
    const dir = await boundPath(root, `scenes/${SafeId.parse(id)}`);
    const files: SceneDocument['files'] = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !(SCENE_FILENAMES as readonly string[]).includes(entry.name)) continue;
      const file = await boundPath(root, `scenes/${id}/${entry.name}`);
      if ((await fs.stat(file)).size > 500000) throw new ApiError(413, 'Scene file exceeds editor limits.', 'TOO_LARGE');
      files.push({ path: entry.name, content: await fs.readFile(file, 'utf8') });
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { shotId: id, files, revision: hash(files) };
  };
  app.get<{ Params: Named & { id: string } }>('/api/projects/:name/scenes/:id', request => rootFor(request.params.name).then(root => sceneDocument(root, request.params.id)));
  app.put<{ Params: Named & { id: string } }>('/api/projects/:name/scenes/:id', async request => {
    const id = SafeId.parse(request.params.id);
    const body = SceneFilesSchema.and(z.object({ revision: z.string().optional() })).parse(request.body);
    return mutate(request.params.name, async (root, core) => {
      const previous = await sceneDocument(root, id);
      if (body.revision && body.revision !== previous.revision) throw new ApiError(409, 'Scene changed. Reload before saving.', 'REVISION_CONFLICT');
      const state = await optionalArtifact<ProjectState>(root, 'project-state.json'), board = await optionalArtifact<Storyboard>(root, 'storyboard.json');
      const shot = board?.shots.find(s => s.id === id);
      if (!shot) throw new ApiError(404, 'Shot not found.', 'NOT_FOUND');
      if (state?.locked.storyboard || (state?.locked[id] ?? shot.locked)) throw new ApiError(423, 'Unlock this shot before changing its scene.', 'LOCKED');
      const allowed = new Set(previous.files.map(f => f.path));
      if (body.files.some(f => !allowed.has(f.path)) || new Set(body.files.map(f => f.path)).size !== body.files.length || body.files.length !== previous.files.length) throw new ApiError(422, 'Edit existing scene files without adding, removing or renaming them.', 'INVALID_SCENE');
      if (body.files.reduce((sum, f) => sum + Buffer.byteLength(f.content), 0) > 500000) throw new ApiError(413, 'Scene exceeds the size limit.', 'TOO_LARGE');
      // Source checks only. Browser/renderer execution belongs to production.
      const manifest = await optionalArtifact<NonNullable<ProjectDetail['artifacts']['asset-manifest']>>(root, 'asset-manifest.json');
      const approved = (manifest?.assets ?? []).filter(a => a.status === 'approved' && !['music','sfx'].includes(a.type) && (a.shotIds.includes(id) || shot.assetNeeds.some(need => need.id === a.id)));
      for (const asset of approved) await boundPath(root, asset.path);
      const assets = approved.map(visualAssetPath).filter((value):value is string=>Boolean(value));
      const config = await loadConfig(root);
      const errors = validateSceneFiles(body, shot, config.workflow.max_scene_bytes, assets, config.rendering.final);
      if (errors.length) throw new ApiError(422, errors.join('\n'), 'INVALID_SCENE');
      const secured = secureSceneFiles(body);
      await core.invalidateProject(root, 'SCENES_READY');
      for (const file of secured.files) await writeAtomic(await boundPath(root, `scenes/${id}/${file.path}`), file.content);
      return sceneDocument(root, id);
    });
  });

  app.post<{ Params: Named }>('/api/projects/:name/upload', async (request, reply) => {
    if (!request.isMultipart()) throw new ApiError(415, 'Choose files to upload.', 'MULTIPART_REQUIRED');
    const uploaded = await mutate(request.params.name, async (root, core) => {
      const stageName = `.studio-upload-${randomUUID()}`;
      const stage = await boundPath(root, stageName, true); await fs.mkdir(stage);
      const pending: Array<{ staged: string; relative: string; original: string; size: number }> = [];
      let total = 0;
      try {
        for await (const part of request.parts()) {
          if (part.type !== 'file') throw new ApiError(422, 'Upload contains an unexpected field.', 'INVALID_UPLOAD');
          const original = uploadFilename(part.filename), extension = path.extname(original).toLowerCase();
          const category = part.fieldname;
          let relative: string;
          if (category === 'source' && extension === '.md') relative = 'input/source.md';
          else if ((category === 'subtitles' || category === 'srt') && extension === '.srt') relative = 'input/narration.srt';
          else if ((category === 'narration' || category === 'audio') && extension === '.wav') relative = 'input/narration.wav';
          else if (category === 'assets' && ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg', '.mp4', '.webm', '.mov', '.wav', '.mp3', '.flac', '.ogg', '.m4a', '.pdf', '.txt', '.md'].includes(extension)) relative = `input/assets/${original}`;
          else { part.file.resume(); throw new ApiError(422, 'Unsupported file type for this upload category.', 'INVALID_UPLOAD'); }
          if (pending.some(p => p.relative.toLowerCase() === relative.toLowerCase())) { part.file.resume(); throw new ApiError(422, 'Duplicate upload destination.', 'INVALID_UPLOAD'); }
          const staged = path.join(stage, String(pending.length));
          let size = 0;
          const counter = new Transform({ transform(chunk: Buffer, _encoding, callback) {
            size += chunk.length; total += chunk.length;
            callback(total > 256 * 1024 * 1024 ? new ApiError(413, 'Combined upload exceeds 256 MB.', 'TOO_LARGE') : null, chunk);
          } });
          await pipeline(part.file, counter, createWriteStream(staged, { flags: 'wx' }));
          if (part.file.truncated || !size) throw new ApiError(413, 'File is empty or exceeds the upload limit.', 'TOO_LARGE');
          if (relative.endsWith('.srt')) {
            if (size > 2 * 1024 * 1024) throw new ApiError(413, 'Subtitles exceed 2 MB.', 'TOO_LARGE');
            srtSegments(await fs.readFile(staged, 'utf8'));
          } else if (category === 'source') {
            if (size > 2 * 1024 * 1024) throw new ApiError(413, 'Source exceeds 2 MB.', 'TOO_LARGE');
            try { new TextDecoder('utf-8', { fatal: true }).decode(await fs.readFile(staged)); } catch { throw new ApiError(422, 'Source must be UTF-8 text.', 'INVALID_SOURCE'); }
          } else {
            const type = ['.mp4', '.webm', '.mov'].includes(extension) ? 'video' : ['.wav', '.mp3', '.flac', '.ogg', '.m4a'].includes(extension) ? 'music' : ['.pdf', '.txt', '.md'].includes(extension) ? 'document' : 'image';
            // Narration WAV is permitted up to 128 MB; assets use the shared worker limits.
            if (relative === 'input/narration.wav') {
              const handle = await fs.open(staged, 'r'); const header = Buffer.alloc(12);
              try { await handle.read(header, 0, 12, 0); } finally { await handle.close(); }
              if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') throw new ApiError(422, 'Narration must be a WAV file.', 'INVALID_AUDIO');
            } else {
              try { inspectMedia(await fs.readFile(staged), type, extension); } catch { throw new ApiError(422, 'Asset contents do not match an allowed media format or size.', 'INVALID_ASSET'); }
            }
          }
          pending.push({ staged, relative, original, size });
        }
        if (!pending.length) throw new ApiError(422, 'Choose at least one file.', 'EMPTY_UPLOAD');
        // Validate all destinations before touching canonical inputs.
        for (const item of pending) await boundPath(root, item.relative, true);
        await core.invalidateProject(root, pending.some(item => !item.relative.startsWith('input/assets/')) ? 'NEW' : 'STORYBOARDED');
        const result: UploadedAsset[] = [];
        for (const item of pending) {
          await fs.rename(item.staged, await boundPath(root, item.relative, true));
          result.push({ name: item.original, path: item.relative, size: item.size });
        }
        return result;
      } finally {
        for (const item of await fs.readdir(stage)) await fs.unlink(path.join(stage, item));
        await fs.rmdir(stage);
      }
    });
    return reply.code(201).send({ files: uploaded });
  });
  app.get<{ Params: Named }>('/api/projects/:name/assets', async request => {
    const root = await rootFor(request.params.name), files: UploadedAsset[] = [];
    const scan = async (relative: string, depth: number) => {
      let directory: string;
      try { directory = await boundPath(root, relative); } catch (error) { if (error instanceof ApiError && error.statusCode === 404) return; throw error; }
      for (const item of await fs.readdir(directory, { withFileTypes: true })) {
        if (files.length >= 1000 || item.isSymbolicLink()) continue;
        const child = `${relative}/${item.name}`;
        if (item.isDirectory() && depth < 5) await scan(child, depth + 1);
        else if (item.isFile()) { const file = await boundPath(root, child); files.push({ name: item.name, path: child, size: (await fs.stat(file)).size }); }
      }
    };
    await scan('input/assets', 0); await scan('assets', 0); await scan('work/series-assets', 0); await scan('scenes/assets', 0); return { files };
  });
  app.get<{ Params: Named & { key: string } }>('/api/projects/:name/logs/:key', async request => tailLog(await rootFor(request.params.name), request.params.key));
  app.get<{ Params: Named & { artifact: string } }>('/api/projects/:name/downloads/:artifact', async (request, reply) => {
    const paths = DOWNLOADS[request.params.artifact]; if (!paths) throw new ApiError(404, 'Download is not allowed.', 'NOT_FOUND');
    const file = await locate(await rootFor(request.params.name), paths); if (!file) throw new ApiError(404, 'Artifact is not available yet.', 'NOT_FOUND');
    return streamFile(request, reply, file, request.params.artifact);
  });

  app.get('/preview-bridge.js', async (_request, reply) => reply.type('text/javascript').send(PREVIEW_BRIDGE));
  app.get<{ Params: Named & { '*': string } }>('/project-static/:name/*', async (request, reply) => {
    const rawPath = (request.raw.url ?? '').split('?')[0]!;
    let decodedPath: string;
    try { decodedPath = decodeURIComponent(rawPath); }
    catch { throw new ApiError(400, 'Invalid project-relative path.', 'INVALID_PATH'); }
    if (decodedPath.split('/').some(segment => segment === '.' || segment === '..' || segment.includes('\\') || segment.includes('\0'))) {
      throw new ApiError(400, 'Invalid project-relative path.', 'INVALID_PATH');
    }
    const root = await rootFor(request.params.name), relative = request.params['*'], extension = path.extname(relative).toLowerCase();
    const scene = relative.startsWith('scenes/');
    const narration = await optionalArtifact<NonNullable<ProjectDetail['artifacts']['narration']>>(root, 'narration.json');
    const allowed = scene || relative === narration?.audioPath || relative.startsWith('input/assets/') || relative.startsWith('assets/') || relative.startsWith('work/series-assets/') || relative.startsWith('previews/') || Object.values(DOWNLOADS).flat().includes(relative);
    if (!allowed || !MIME[extension] || (!scene && ['.html', '.js', '.css'].includes(extension))) throw new ApiError(404, 'Preview file is not allowed.', 'NOT_FOUND');
    const file = await boundPath(root, relative);
    if (extension === '.html') {
      reply.header('Content-Security-Policy', "sandbox allow-scripts; default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self' data:; frame-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self' http://localhost:5173 http://127.0.0.1:5173");
      return reply.type(MIME['.html']!).send(withPreviewBridge(await fs.readFile(file, 'utf8')));
    }
    if (extension === '.svg') reply.header('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'");
    return streamFile(request, reply, file);
  });
  app.get<{ Params: { '*': string } }>('/assets/*', async (request, reply) => {
    const file = await boundPath(studioRoot, `assets/${request.params['*']}`);
    return streamFile(request, reply, file);
  });
  app.get('/', async (_request, reply) => {
    if (!await exists(path.join(studioRoot, 'index.html'))) return reply.code(503).type('text/plain').send('Studio build is not available. Run npm run build, or use npm run studio:dev.');
    reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; frame-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    return streamFile(_request, reply, await boundPath(studioRoot, 'index.html'));
  });
  app.addHook('onClose', async () => jobs.drain());
  return app;
}

export async function main(): Promise<void> {
  const port = z.coerce.number().int().min(1).max(65535).parse(process.env.STUDIO_PORT ?? 8787);
  const app = await buildServer();
  await app.listen({ host: '127.0.0.1', port });
  console.log(`Story Factory Studio: http://localhost:${port}`);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close().then(() => { process.exitCode = 0; }); });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  void main().catch(() => { console.error('Studio could not start. Check the port and build output.'); process.exitCode = 1; });
}
