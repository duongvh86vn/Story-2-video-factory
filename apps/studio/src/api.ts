import type { ArtifactDocument, ProjectDetail, ProjectSummary, SceneDocument, UploadedAsset,VoiceCatalog,SourceProductionAuditDocument } from '../../server/contracts.js';
import type { Job } from '../../server/jobs.js';
import type { ProjectStatus } from '../../../packages/core/schemas.js';
import type {ActorDefinition} from '../../../packages/actors/schemas.js';
import type {ActorMotion} from '../../../packages/motion/schemas.js';
import type {SpriteMotionCatalogSnapshot} from '../../../packages/motion/catalog.js';
import type {SpriteMotionCatalog} from '../../../packages/motion/catalog-schemas.js';
import type {ActorSpeech} from '../../../packages/motion/speech-schemas.js';

export class RequestError extends Error {
  constructor(message: string, public status: number, public code: string, public issues: Array<{ path: string; message: string }> = []) { super(message); }
}

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-Studio-Request', '1');
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
  const data = await response.json() as { error?: { message: string; code: string; issues?: Array<{ path: string; message: string }> } };
  if (!response.ok) throw new RequestError(data.error?.message ?? `Request failed (${response.status})`, response.status, data.error?.code ?? 'REQUEST_FAILED', data.error?.issues);
  return data as T;
}

export const projectUrl = (name: string) => `/api/projects/${encodeURIComponent(name)}`;
export const staticUrl = (name: string, relative: string) => `/project-static/${encodeURIComponent(name)}/${relative.split('/').map(encodeURIComponent).join('/')}`;
export const api = {
  projects: () => request<{ projects: ProjectSummary[] }>('/api/projects'),
  motions:(name:string)=>request<{motions:ActorMotion[]}>(`${projectUrl(name)}/motions`),
  speechVariants:(name:string)=>request<{variants:ActorSpeech[]}>(`${projectUrl(name)}/motions/speech`),
  importSpeech:(name:string,sheet:string,registration:string)=>request<ActorSpeech>(`${projectUrl(name)}/motions/speech/import`,{method:'POST',body:JSON.stringify({sheet,registration})}),
  motionCatalog:(name:string)=>request<SpriteMotionCatalogSnapshot>(`${projectUrl(name)}/motions/catalog`),
  saveMotionCatalog:(name:string,catalog:SpriteMotionCatalog,revision:string|null)=>request<SpriteMotionCatalogSnapshot>(`${projectUrl(name)}/motions/catalog`,{method:'PUT',body:JSON.stringify({catalog,revision})}),
  create: (name: string, example: boolean, mode: 'diagram' | 'story-cinematic',topic?:'prehistoric-life') => request<ProjectSummary>('/api/projects', { method: 'POST', body: JSON.stringify({ name, example, topic,presentation: { mode } }) }),
  project: (name: string) => request<ProjectDetail>(projectUrl(name)),
  sourceAudit:(name:string)=>request<SourceProductionAuditDocument>(`${projectUrl(name)}/source-audit`),
  run: (name: string, until: ProjectStatus, shotIds?: string[],retryModelErrors=false,sceneRepairAttempts?:number) => request<{ job: Job }>(`${projectUrl(name)}/run`, { method: 'POST', body: JSON.stringify({ until, ...(shotIds ? { shotIds } : {}),...(retryModelErrors?{retryModelErrors:true}:{}),...(sceneRepairAttempts===undefined?{}:{sceneRepairAttempts}) }) }),
  approve: (name: string, kind: 'storyboard' | 'characters' | 'host') => request<ProjectSummary>(`${projectUrl(name)}/approve`, { method: 'POST', body: JSON.stringify({ kind }) }),
  locks: (name: string, locked: Record<string, boolean>) => request<ProjectSummary>(`${projectUrl(name)}/locks`, { method: 'PATCH', body: JSON.stringify({ locked }) }),
  artifact: <T = unknown>(name: string, artifact: string) => request<ArtifactDocument<T>>(`${projectUrl(name)}/artifacts/${encodeURIComponent(artifact)}`),
  save: <T = unknown>(name: string, artifact: string, data: T, revision: string) => request<ArtifactDocument<T>>(`${projectUrl(name)}/artifacts/${encodeURIComponent(artifact)}`, { method: 'PUT', body: JSON.stringify({ data, revision }) }),
  actor:(name:string,id:string,character:ActorDefinition,revision:string)=>request<ArtifactDocument<unknown>>(`${projectUrl(name)}/actors/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify({character,revision})}),
  scene: (name: string, id: string) => request<SceneDocument>(`${projectUrl(name)}/scenes/${encodeURIComponent(id)}`),
  saveScene: (name: string, doc: SceneDocument) => request<SceneDocument>(`${projectUrl(name)}/scenes/${encodeURIComponent(doc.shotId)}`, { method: 'PUT', body: JSON.stringify({ files: doc.files, revision: doc.revision }) }),
  assets: (name: string) => request<{ files: UploadedAsset[] }>(`${projectUrl(name)}/assets`),
  log: (name: string, key: string) => request<{ text: string; truncated: boolean }>(`${projectUrl(name)}/logs/${encodeURIComponent(key)}`),
  upload: (name: string, data: FormData,settingsRevision?:string,scriptFormat?:'narration'|'dialogue') => request<{ files: UploadedAsset[];settingsRevision:string }>(`${projectUrl(name)}/upload${settingsRevision||scriptFormat?`?${new URLSearchParams({...settingsRevision?{settingsRevision}:{},...scriptFormat?{scriptFormat}:{}})}`:''}`, { method: 'POST', body: data }),
  settings: (name:string,data:unknown)=>request<ProjectDetail>(`${projectUrl(name)}/settings`,{method:'PATCH',body:JSON.stringify(data)}),
  script: (name:string,text:string,format:'txt'|'md',revision?:string,settingsRevision?:string,scriptFormat?:'narration'|'dialogue')=>request<ArtifactDocument>(`${projectUrl(name)}/script`,{method:'PUT',body:JSON.stringify({text,format,revision,settingsRevision,scriptFormat})}),
  story: (name:string,text:string,format:'txt'|'md',revision?:string,settingsRevision?:string)=>request<ArtifactDocument>(`${projectUrl(name)}/story`,{method:'PUT',body:JSON.stringify({text,format,revision,settingsRevision})}),
  idea: (name:string,text:string,format:'txt'|'md',revision?:string,settingsRevision?:string)=>request<ArtifactDocument>(`${projectUrl(name)}/idea`,{method:'PUT',body:JSON.stringify({text,format,revision,settingsRevision})}),
  voices:()=>request<VoiceCatalog>('/api/voices'),
  voiceDefaults: (voice:unknown,language?:string)=>request<{saved:boolean}>(`/api/settings/voice${language?`?language=${encodeURIComponent(language)}`:''}`,{method:'PUT',body:JSON.stringify(voice)}),
};
