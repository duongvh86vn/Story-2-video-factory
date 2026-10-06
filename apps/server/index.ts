import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import multipart from '@fastify/multipart';
import { promises as fs, createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { findRepoRoot, loadConfig, ConfigSchema,PublicVoicePatchSchema,cleanVoiceSettings } from '../../packages/core/config.js';
import YAML from 'yaml';
import { updateSettings, SettingsPatchSchema, PresentationPatchSchema } from '../../packages/orchestrator/settings.js';
import { parseScript, validateIdea } from '../../packages/ingest/script.js';
import { parseHostProfile } from '../../packages/host/profile.js';
import { hostPreviewSvg } from '../../packages/host/rig.js';
import { ModelRouter } from '../../packages/models/registry.js';
import { ProjectStateSchema, States, ShotSchema, StoryboardSchema, SceneFilesSchema, type ProjectState, type Storyboard } from '../../packages/core/schemas.js';
import { exists, hash, writeAtomic } from '../../packages/core/utils.js';
import { inspectMedia } from '../../packages/assets/files.js';
import { validateSceneFiles, secureSceneFiles, SCENE_FILENAMES } from '../../packages/scenes/security.js';
import { ApiError, ProjectName, SafeId, boundPath, ensureIdle, projectPath, uploadFilename, MIME, redact } from './security.js';
import { ARTIFACTS, DOWNLOADS, LOGS, checkRevision, currentDownload, cinematicMigration, cinematicArtifactStatuses, listDownloads, locate, optionalArtifact, readArtifact, saveArtifact, srtSegments, tailLog } from './artifacts.js';
import { loadCoordinator, ProjectJobs, type Coordinator } from './jobs.js';
import { PREVIEW_BRIDGE, withPreviewBridge } from './preview.js';
import { visualAssetPath } from '../../packages/scenes/assets.js';
import { validateExplainerSources } from '../../packages/scenes/index.js';
import type { ProjectDetail, ProjectSummary, SceneDocument, UploadedAsset } from './contracts.js';
import {ActorDefinitionSchema} from '../../packages/actors/schemas.js';
import {actorDefinitions,actorLockKey} from '../../packages/actors/locks.js';
import {bindActorShot} from '../../packages/actors/model.js';
import {loadHost} from '../../packages/host/index.js';
import {installedWindowsVoices} from '../../packages/voice/catalog.js';
import {LANGUAGE_TAG,primaryLanguage} from '../../packages/core/languages.js';
import {discoverNineRouter} from '../../packages/models/nine-router.js';
import {prehistoricReadiness,prehistoricReferences} from '../../packages/topics/prehistoric-life.js';
import {referencePuppetSvg} from '../../packages/topics/reference-puppet.js';

export interface ServerOptions { repoRoot?: string; projectsRoot?: string; studioRoot?: string; coordinator?: Coordinator; logger?: boolean; }
type Named = { name: string };
const RunBody = z.object({ until: z.enum(States).default('DONE'), force: z.boolean().default(false), shotIds: z.array(SafeId).min(1).max(100).optional(),retryModelErrors:z.boolean().optional(),sceneRepairAttempts:z.number().int().min(0).max(3).optional() }).strict();
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
    return { name, state: state.state, updatedAt: state.updatedAt, approvals: state.approvals, waitingFor:state.waitingFor,busy: job?.status === 'running' || await isBusy(root), job, ...(state.error ? { error: redact(state.error) } : {}) };
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
    const migration=await cinematicMigration(root);
    const scenesCurrent = !migration.required&&completed >= States.indexOf('SCENES_READY'), framesCurrent = !migration.required&&completed >= States.indexOf('DRAFT_RENDERED');
    const storyboard = (raw.artifacts as ProjectDetail['artifacts'] | undefined)?.storyboard;
    const shotPreviews = Object.fromEntries(await Promise.all((storyboard?.shots ?? []).map(async shot => [shot.id, {
      composition: scenesCurrent ? await available([`scenes/${SafeId.parse(shot.id)}/index.html`]) : null,
      frames: framesCurrent ? await available([`previews/${SafeId.parse(shot.id)}/action-sheet.jpg`, `previews/${shot.id}/contact-sheet.jpg`]) : null,
    }])));
    return {
      ...await summary(name), locked: state.locked,
      progress: { completed, total: States.length - 1, percent: Math.round(completed / (States.length - 1) * 100), stage: state.state },
      artifacts: clean({...((raw.artifacts??{}) as Record<string,unknown>),...(await currentDownload(root,'generated-script.txt')?{}:{'script-generation':undefined})}) as ProjectDetail['artifacts'], production: clean(raw.production ?? {}), downloads,
      cinematicArtifacts: await cinematicArtifactStatuses(root),
      cinematicMigration:migration,
      preview: { composition: scenesCurrent ? await available(['scenes/index.html']) : null, draft: framesCurrent ? await available(DOWNLOADS['draft.mp4']!) : null, final: !migration.required&&completed>=States.indexOf('FINAL_RENDERED')?await available(DOWNLOADS['final.mp4']!):null, contactSheet: framesCurrent ? await available([...DOWNLOADS['contact-sheet.jpg']!, ...DOWNLOADS['contact-sheet.png']!]) : null, shots: shotPreviews },
      settings: {revision:hash(await fs.readFile(await boundPath(root,'project.yaml'))),language:config.project.language,contentMode:config.content.mode,topic:config.topic,...(config.topic.id?{topicReadiness:prehistoricReadiness}:{}),input:config.input,host:config.host,
        voice:((({command,command_args,...rest})=>rest)(config.voice)),automatic:config.workflow.automatic,presentation:config.presentation,format:config.rendering.final,
        creativeModel:((({command,...rest})=>rest)(config.models.storyboard)),
        scriptModel:((({command,...rest})=>rest)(config.models.planner)),scriptGeneration:config.script_generation,
        approvalRequired:{storyboard:config.workflow.require_storyboard_approval||!config.workflow.automatic,characters:config.workflow.require_character_approval,host:config.workflow.require_host_approval}},
    };
  };

  app.get('/api/projects', async () => {
    if (!await exists(projectsRoot)) return { projects: [] };
    if ((await fs.lstat(projectsRoot)).isSymbolicLink()) throw new ApiError(403, 'Linked project folders are not supported.', 'LINK_FORBIDDEN');
    const names = (await fs.readdir(projectsRoot, { withFileTypes: true })).filter(d => d.isDirectory() && !d.isSymbolicLink() && ProjectName.safeParse(d.name).success).map(d => d.name);
    const projects = await Promise.all(names.map(summary));
    return { projects: projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) };
  });
  app.get('/api/9router',async()=>{await loadConfig(projectsRoot);try{return await discoverNineRouter();}catch{throw new ApiError(503,'9router unavailable or authentication failed. Configure MODEL_GATEWAY_KEY and start the local service.','ROUTER_UNAVAILABLE');}});
  app.get('/api/topics',async()=>({topics:[{id:'prehistoric-life',name:'Cuộc sống thời tiền sử',cast:['Lila','Karo'],visualAcceptance:'pending',readiness:prehistoricReadiness,inputModes:['script','wav','story'],preview:'/api/topics/prehistoric-life/preview',compare:'/api/topics/prehistoric-life/compare'}]}));
  app.get<{Params:{topic:string};Querystring:{light?:string}}>('/api/topics/:topic/preview',async(request,reply)=>{
    z.literal('prehistoric-life').parse(request.params.topic);const light=z.enum(['day','sunset','night']).default('day').parse(request.query.light);
    const images=await Promise.all(['lila','karo'].map(async id=>{const bytes=await fs.readFile(await boundPath(repo,`library/topics/prehistoric-life/${id}-cutout-v1.png`));return bytes.toString('base64');}));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900" viewBox="0 0 1280 900"><rect width="1280" height="900" fill="#FFF7E5"/><text x="48" y="48" fill="#4A2A18" font-family="Arial" font-size="27">Lila &amp; Karo · reference extraction · rig pending</text>${images.map((data,i)=>`<image x="${i?665:70}" y="80" width="530" height="780" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${data}"/>`).join('')}</svg>`;
    return reply.type('image/svg+xml').header('Content-Security-Policy',"default-src 'none'; img-src data:; style-src 'unsafe-inline'").send(svg);
  });
  app.get<{Params:{id:string}}>('/api/topics/prehistoric-life/assembly/:id',async(request,reply)=>{
    const id=z.enum(['lila','karo']).parse(request.params.id);
    return reply.type('image/svg+xml').header('Content-Security-Policy',"default-src 'none'; img-src data:; style-src 'unsafe-inline'").send(await referencePuppetSvg(repo,id));
  });
  app.get<{Querystring:{variant?:string}}>('/api/topics/prehistoric-life/compare',async(request,reply)=>{
    const variant=z.enum(['cutout','assembly']).default('cutout').parse(request.query.variant);
    const rows=['lila','karo'].map(id=>`<section><h2>${id==='lila'?'Lila':'Karo'}</h2><div class="pair"><figure><img src="/api/topics/prehistoric-life/references/reference-${id}-full.png"><figcaption>Ảnh gốc người dùng</figcaption></figure><figure><img src="/api/topics/prehistoric-life/${variant==='assembly'?`assembly/${id}`:`assets/${id}-cutout-v1.png`}"><figcaption>${variant==='assembly'?'Ráp lớp theo tỷ lệ nguồn — nháp':'Bản tách nền đề xuất — chưa duyệt'}</figcaption></figure></div></section>`).join('');
    const supplements=prehistoricReferences.filter(ref=>ref.role.startsWith('supplemental')).map((ref,i)=>`<figure><img class="sheet" src="/api/topics/prehistoric-life/references/${ref.file}" alt="Bảng tham chiếu bổ sung ${i+1}"><figcaption>${i?'00350 · người que, mặt trắng':'00349 · tay chân màu da, trang phục chi tiết'}</figcaption></figure>`).join('');
    const parts=['lila','karo'].map(id=>`<figure><img class="parts" src="/api/topics/prehistoric-life/assets/${id}-parts-candidate-v1.png" alt="Lớp nháp ${id}"><figcaption>${id==='lila'?'Lila':'Karo'} · lớp nháp, cần chỉnh trước khi làm rig</figcaption></figure>`).join('');
    return reply.type('text/html').header('Content-Security-Policy',"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'").send(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>So sánh tạo hình Lila &amp; Karo</title><style>body{font:16px system-ui;background:#ece5d6;color:#362215;margin:24px}main{max-width:1000px;margin:auto}section{background:#fff7e5;border-radius:16px;padding:20px;margin:20px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0;text-align:center}img{max-width:100%;height:590px;object-fit:contain}.sheet{width:100%;height:auto}.parts{width:100%;height:auto;background:#fffdf7}figcaption{padding:12px}h2{margin:0 0 12px}a{color:#65461b}</style><main><h1>Đối chiếu ảnh gốc và bản tách nền</h1><p>SVG cũ bị loại. Các bản tách là ứng viên; chưa phải rig/chuyển động đã nghiệm thu. AI có thể vẽ lại một số nét nên cần kiểm bằng ảnh gốc.</p><p><a href="#supplemental">Hai bảng tham chiếu mới</a> · <a href="#parts">Các lớp nháp</a></p>${rows}<section id="supplemental"><h2>Hai bảng mẫu bổ sung</h2><p>Dùng góc nhìn, pose, đạo cụ, bối cảnh và màu để tham khảo. Tạo hình chính vẫn là hai ảnh cận có da ấm phía trên; không trộn mặt trắng, ủng, cổ áo lông và trang sức vào chúng. Tên Lila là tên làm việc; các sheet ghi Lira.</p>${supplements}</section><section id="parts"><h2>Lớp chuyển động — bản nháp</h2><p>Cần đo vùng cắt, điểm gắn và tỷ lệ; tiếp tục tách biểu cảm, góc quay và tóc/áo. Bản nháp này chưa được dùng sản xuất tập.</p><div class="pair">${parts}</div></section></main></html>`);
  });
  app.get<{Params:{file:string}}>('/api/topics/prehistoric-life/references/:file',async(request,reply)=>{
    const file=z.enum(['reference-lila-full.png','reference-karo-full.png','reference-expressions.png','reference-palette.png','reference-forest-tribe-detailed.png','reference-forest-tribe-stick.png']).parse(request.params.file);
    return streamFile(request,reply,await boundPath(repo,`docs/topics/assets/${file}`));
  });
  app.get<{Params:{topic:string;file:string}}>('/api/topics/:topic/assets/:file',async(request,reply)=>{
    z.literal('prehistoric-life').parse(request.params.topic);
    const file=z.enum(['lila-cutout-v1.png','karo-cutout-v1.png','lila-parts-candidate-v1.png','karo-parts-candidate-v1.png','manifest.json','parts-prompts-v1.json']).parse(request.params.file);
    return streamFile(request,reply,await boundPath(repo,`library/topics/prehistoric-life/${file}`));
  });
  app.post('/api/projects', async (request, reply) => {
    const body = z.object({ name: ProjectName, example: z.boolean().default(false), topic: z.enum(['prehistoric-life']).optional(), presentation: PresentationPatchSchema.optional() }).strict().parse(request.body);
    if(body.topic&&body.presentation?.mode==='diagram')throw new ApiError(422,'Prehistoric life uses story-cinematic actors.','TOPIC_PRESENTATION');
    const result = await jobs.mutate(body.name, async () => {
      await fs.mkdir(projectsRoot, { recursive: true });
      if ((await fs.lstat(projectsRoot)).isSymbolicLink()) throw new ApiError(403, 'Linked project folders are not supported.', 'LINK_FORBIDDEN');
      const root = await (await coordinator()).createProject(body.name, { root: projectsRoot, example: body.example,topic:body.topic });
      if (body.presentation) await updateSettings(root, { presentation: body.presentation });
      return summary(body.name);
    });
    return reply.code(201).send(result);
  });
  app.get<{ Params: Named }>('/api/projects/:name', request => detail(ProjectName.parse(request.params.name)));
  app.patch<{Params:Named}>('/api/projects/:name/settings',async request=>{
    const body=SettingsPatchSchema.parse(request.body);
    if(body.voice)PublicVoicePatchSchema.parse(body.voice);
    return mutate(request.params.name,async root=>{await checkRevision(await boundPath(root,'project.yaml'),body.revision);await updateSettings(root,body);return detail(request.params.name);});
  });
  app.put<{Params:Named}>('/api/projects/:name/script',async request=>{
    const body=z.object({text:z.string().min(1).max(128*1024),format:z.enum(['txt','md']).default('txt'),revision:z.string().optional(),settingsRevision:z.string().optional()}).strict().parse(request.body);
    return mutate(request.params.name,async(root,core)=>{
      await checkRevision(await boundPath(root,'project.yaml'),body.settingsRevision);
      const relative=`input/script.${body.format}`,file=await boundPath(root,relative,true);await checkRevision(await locate(root,[relative]),body.revision);
      parseScript(body.text,relative);if(!await exists(file)||(await fs.readFile(file,'utf8'))!==body.text){await core.invalidateProject(root,'NEW');await writeAtomic(file,body.text);}
      await updateSettings(root,{input:{mode:'script',script:relative as 'input/script.txt'|'input/script.md'}});return {...await readArtifact(root,`script.${body.format}`),settingsRevision:hash(await fs.readFile(await boundPath(root,'project.yaml')))};
    });
  });
  app.put<{Params:Named}>('/api/projects/:name/idea',async request=>{
    const body=z.object({text:z.string().min(1).max(128*1024),format:z.enum(['txt','md']).default('txt'),revision:z.string().optional(),settingsRevision:z.string().optional()}).strict().parse(request.body);
    return mutate(request.params.name,async(root,core)=>{
      await checkRevision(await boundPath(root,'project.yaml'),body.settingsRevision);
      const relative=`input/idea.${body.format}`,file=await boundPath(root,relative,true);await checkRevision(await locate(root,[relative]),body.revision);
      try{validateIdea(body.text);}catch(error){throw new ApiError(422,error instanceof Error?error.message:'Invalid idea','INVALID_INPUT');}if(!await exists(file)||(await fs.readFile(file,'utf8'))!==body.text){await core.invalidateProject(root,'NEW');await writeAtomic(file,body.text);}
      await updateSettings(root,{input:{mode:'idea',idea:relative as 'input/idea.txt'|'input/idea.md'}});
      return {...await readArtifact(root,`idea.${body.format}`),settingsRevision:hash(await fs.readFile(await boundPath(root,'project.yaml')))};
    });
  });
  app.put<{Params:Named}>('/api/projects/:name/story',async request=>{
    const body=z.object({text:z.string().min(1).max(128*1024),format:z.enum(['txt','md']).default('txt'),revision:z.string().optional(),settingsRevision:z.string().optional()}).strict().parse(request.body);
    return mutate(request.params.name,async(root,core)=>{
      await checkRevision(await boundPath(root,'project.yaml'),body.settingsRevision);
      const relative=`input/story.${body.format}`,file=await boundPath(root,relative,true);await checkRevision(await locate(root,[relative]),body.revision);
      try{validateIdea(body.text);}catch(error){throw new ApiError(422,error instanceof Error?error.message:'Invalid story','INVALID_INPUT');}if(!await exists(file)||(await fs.readFile(file,'utf8'))!==body.text){await core.invalidateProject(root,'NEW');await writeAtomic(file,body.text);}
      await updateSettings(root,{input:{mode:'story',story:relative as 'input/story.txt'|'input/story.md'}});
      return {...await readArtifact(root,`story.${body.format}`),settingsRevision:hash(await fs.readFile(await boundPath(root,'project.yaml')))};
    });
  });
  app.get<{Params:Named &{kind:string}}>('/api/projects/:name/hosts/:kind/preview',async(request,reply)=>{
    const kind=z.enum(['mini-robot','stick-man']).parse(request.params.kind),root=await rootFor(request.params.name),config=await loadConfig(root);
    config.host={...config.host,profile:`library/characters/${kind==='mini-robot'?'MINI-ROBOT':'STICK-MAN'}.md`,profile_id:undefined};
    const profile=await parseHostProfile(root,config,new ModelRouter(config,root));
    return reply.type('image/svg+xml').header('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'").send(hostPreviewSvg(profile));
  });
  app.post('/api/script-preview',async request=>{const body=z.object({text:z.string().min(1).max(128*1024),format:z.enum(['txt','md'])}).strict().parse(request.body);const parsed=parseScript(body.text,`input/script.${body.format}`);return {text:parsed.text,chunks:parsed.chunks.length};});
  app.get('/api/voices',async()=>{
    const file=await boundPath(repo,'config/voice.yaml',true),raw=await exists(file)?YAML.parse(await fs.readFile(file,'utf8'))??{}:{};
    const profiles=ConfigSchema.shape.voice_profiles.removeDefault().parse(raw.voice_profiles??{});
    return {windows:await installedWindowsVoices(),profiles:Object.fromEntries(Object.entries(profiles).map(([language,preset])=>{
      const {command,command_args,...voice}=ConfigSchema.shape.voice.removeDefault().parse({...raw.voice,...preset});return [language,voice];
    }))};
  });
  app.put<{Querystring:{language?:string}}>('/api/settings/voice',async request=>{
    const patch=PublicVoicePatchSchema.parse(request.body),file=await boundPath(repo,'config/voice.yaml',true);
    const language=request.query.language===undefined?undefined:z.string().regex(LANGUAGE_TAG).parse(request.query.language);
    const raw=await exists(file)?YAML.parse(await fs.readFile(file,'utf8'))??{}:{},profiles=ConfigSchema.shape.voice_profiles.removeDefault().parse(raw.voice_profiles??{});
    const current=language?{...raw.voice,...(profiles[language]??profiles[primaryLanguage(language)])}:raw.voice??{};
    const voice=cleanVoiceSettings(ConfigSchema.shape.voice.removeDefault().parse({...current,...patch}));
    if(voice.tts_provider==='command'&&!voice.command)throw new ApiError(422,'Configure the command adapter in config/voice.yaml before selecting it as default.','INVALID_SETTINGS');
    if(voice.base_url){const u=new URL(voice.base_url);if(u.username||u.password)throw new ApiError(422,'Use the API key environment variable for credentials.','INVALID_SETTINGS');}
    await writeAtomic(file,YAML.stringify(language?{...raw,voice_profiles:{...profiles,[language]:voice}}:{...raw,voice}));return {saved:true};
  });
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
    const { kind } = z.object({ kind: z.enum(['storyboard', 'characters','host']) }).strict().parse(request.body);
    return mutate(request.params.name, async (root, core) => {
      if (!await optionalArtifact(root, kind === 'storyboard' ? 'storyboard.json' : kind==='host'?'host-rig.json':'character-bible.json')) throw new ApiError(409, 'Generate this artifact before approving it.', 'ARTIFACT_REQUIRED');
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
      for(const actor of actorDefinitions(board??{shots:[]}))allowed.add(actorLockKey(actor.id));
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
    if((await cinematicMigration(await rootFor(request.params.name))).required)throw new ApiError(409,'Resume production with the current renderer before editing a shot. Locked shots remain protected.','CINEMATIC_MIGRATION_REQUIRED');
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
  app.put<{Params:Named&{id:string}}>('/api/projects/:name/actors/:id',async request=>{
    const id=SafeId.parse(request.params.id),body=z.object({character:ActorDefinitionSchema,revision:z.string()}).strict().parse(request.body);
    if(body.character.id!==id)throw new ApiError(422,'Actor ID is immutable.','VALIDATION_FAILED');
    return mutate(request.params.name,async(root,core)=>{
      const doc=await readArtifact(root,'storyboard.json');
      if(doc.revision!==body.revision)throw new ApiError(409,'Cast changed since this editor was opened. Reload before saving.','REVISION_CONFLICT');
      const board=StoryboardSchema.parse(doc.data),cast=actorDefinitions(board);
      if(!cast.some(a=>a.id===id))throw new ApiError(404,'Actor not found.','NOT_FOUND');
      const {profile,rig}=await loadHost(root);
      for(const shot of board.shots){const scene=shot.cinematic?.actorScene;if(!scene)continue;
        if(scene.primary?.id===id)scene.primary=body.character;
        for(const actor of scene.supporting)if(actor.character.id===id)actor.character=body.character;
        bindActorShot(shot,profile,rig);
      }
      return saveArtifact(root,'storyboard.json',board,body.revision,core);
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
      if (state?.locked.storyboard || (state?.locked[id] ?? state?.locked[`shot:${id}`] ?? shot.locked)) throw new ApiError(423, 'Unlock this shot before changing its scene.', 'LOCKED');
      if (shot.host || shot.cinematic) throw new ApiError(403, 'Production character scenes are read-only. Edit the validated canonical storyboard and rebuild this shot.', 'READ_ONLY');
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
      errors.push(...await validateExplainerSources(root,config,shot,body));
      if (errors.length) throw new ApiError(422, errors.join('\n'), 'INVALID_SCENE');
      const secured = secureSceneFiles(body);
      await core.invalidateProject(root, 'SCENES_READY');
      for (const file of secured.files) await writeAtomic(await boundPath(root, `scenes/${id}/${file.path}`), file.content);
      return sceneDocument(root, id);
    });
  });

  app.post<{ Params: Named;Querystring:{settingsRevision?:string} }>('/api/projects/:name/upload', async (request, reply) => {
    if (!request.isMultipart()) throw new ApiError(415, 'Choose files to upload.', 'MULTIPART_REQUIRED');
    const query=z.object({settingsRevision:z.string().optional()}).strict().parse(request.query);
    const uploaded = await mutate(request.params.name, async (root, core) => {
      await checkRevision(await boundPath(root,'project.yaml'),query.settingsRevision);
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
          if(category==='story'&&['.txt','.md'].includes(extension))relative=`input/story${extension}`;
          else if(category==='idea'&&['.txt','.md'].includes(extension))relative=`input/idea${extension}`;
          else if(category==='script'&&['.txt','.md'].includes(extension))relative=`input/script${extension}`;
          else if(category==='host'&&extension==='.md')relative='input/host.md';
          else if (category === 'source' && extension === '.md') relative = 'input/source.md';
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
          if(category==='story'||category==='idea'||category==='script'||category==='host'){
            if(size>128*1024)throw new ApiError(413,'Script/host exceeds 128 KB.','TOO_LARGE');
            let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(await fs.readFile(staged));}catch{throw new ApiError(422,'Script/host must be UTF-8.','INVALID_INPUT');}
            if(category==='script')parseScript(text,relative);
            if(category==='idea'||category==='story')try{validateIdea(text);}catch(error){throw new ApiError(422,error instanceof Error?error.message:'Invalid idea','INVALID_INPUT');}
          } else if (relative.endsWith('.srt')) {
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
        const writingInputs=pending.filter(item=>/^input\/(?:story|idea|script)\.(?:txt|md)$/.test(item.relative));
        if(writingInputs.length>1)throw new ApiError(422,'Upload one idea or one complete script at a time; choose its input mode explicitly.','AMBIGUOUS_INPUT');
        await checkRevision(await boundPath(root,'project.yaml'),query.settingsRevision);
        // Validate all destinations before touching canonical inputs.
        for (const item of pending) await boundPath(root, item.relative, true);
        const config=await loadConfig(root);await core.invalidateProject(root,pending.some(item=>!item.relative.startsWith('input/assets/')&&item.relative!=='input/host.md'&&(item.relative!=='input/source.md'||config.content.mode==='legacy'))?'NEW':pending.some(item=>['input/host.md','input/source.md'].includes(item.relative))?'TIMED':'STORYBOARDED');
        const result: UploadedAsset[] = [];
        for (const item of pending) {
          await fs.rename(item.staged, await boundPath(root, item.relative, true));
          result.push({ name: item.original, path: item.relative, size: item.size });
        }
        const script=pending.find(item=>/^input\/script\.(?:txt|md)$/.test(item.relative));
        if(script)await updateSettings(root,{input:{mode:'script',script:script.relative as 'input/script.txt'|'input/script.md'}});
        const story=pending.find(item=>/^input\/story\.(?:txt|md)$/.test(item.relative));
        if(story)await updateSettings(root,{input:{mode:'story',story:story.relative as 'input/story.txt'|'input/story.md'}});
        const idea=pending.find(item=>/^input\/idea\.(?:txt|md)$/.test(item.relative));
        if(idea)await updateSettings(root,{input:{mode:'idea',idea:idea.relative as 'input/idea.txt'|'input/idea.md'}});
        if(pending.some(item=>item.relative==='input/host.md'))await updateSettings(root,{host:'custom'});
        return {files:result,settingsRevision:hash(await fs.readFile(await boundPath(root,'project.yaml')))};
      } finally {
        for (const item of await fs.readdir(stage)) await fs.unlink(path.join(stage, item));
        await fs.rmdir(stage);
      }
    });
    return reply.code(201).send(uploaded);
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
    const root=await rootFor(request.params.name);if(!await currentDownload(root,request.params.artifact))throw new ApiError(409,'Artifact is from an earlier revision; resume production to regenerate it.','STALE_ARTIFACT');
    const file = await locate(root, paths); if (!file) throw new ApiError(404, 'Artifact is not available yet.', 'NOT_FOUND');
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
    if((scene||relative.startsWith('previews/'))&&(await cinematicMigration(root)).required)throw new ApiError(409,'The cinematic renderer version changed; resume production.','STALE_ARTIFACT');
    const state = await optionalArtifact<ProjectState>(root,'project-state.json');
    if (scene && (!state || States.indexOf(state.state)<States.indexOf('SCENES_READY'))) throw new ApiError(409,'Scene belongs to an earlier revision; resume production.','STALE_ARTIFACT');
    if (relative.startsWith('previews/') && relative!=='previews/host-preview-sheet.png' && (!state || States.indexOf(state.state)<States.indexOf('DRAFT_RENDERED'))) throw new ApiError(409,'Preview frames require the current production draft.','STALE_ARTIFACT');
    const narration = await optionalArtifact<NonNullable<ProjectDetail['artifacts']['narration']>>(root, 'voiced-narration.json')??await optionalArtifact<NonNullable<ProjectDetail['artifacts']['narration']>>(root, 'narration.json');
    for (const name of ['final.mp4', 'draft.mp4']) if (DOWNLOADS[name]!.includes(relative) && !await currentDownload(root, name)) throw new ApiError(409,'Clip belongs to an earlier revision; resume production.','STALE_ARTIFACT');
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
  const app = await buildServer({ projectsRoot: process.env.STUDIO_PROJECTS_ROOT });
  await app.listen({ host: '127.0.0.1', port });
  console.log(`Story Factory Studio: http://localhost:${port}`);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close().then(() => { process.exitCode = 0; }); });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  void main().catch(() => { console.error('Studio could not start. Check the port and build output.'); process.exitCode = 1; });
}
