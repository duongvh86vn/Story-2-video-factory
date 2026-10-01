import type { ArtifactDocument, ProjectDetail, ProjectSummary, SceneDocument, UploadedAsset } from '../../server/contracts.js';
import type { Job } from '../../server/jobs.js';
import type { ProjectStatus } from '../../../packages/core/schemas.js';

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
  create: (name: string, example: boolean) => request<ProjectSummary>('/api/projects', { method: 'POST', body: JSON.stringify({ name, example }) }),
  project: (name: string) => request<ProjectDetail>(projectUrl(name)),
  run: (name: string, until: ProjectStatus, shotIds?: string[]) => request<{ job: Job }>(`${projectUrl(name)}/run`, { method: 'POST', body: JSON.stringify({ until, ...(shotIds ? { shotIds } : {}) }) }),
  approve: (name: string, kind: 'storyboard' | 'characters' | 'host') => request<ProjectSummary>(`${projectUrl(name)}/approve`, { method: 'POST', body: JSON.stringify({ kind }) }),
  locks: (name: string, locked: Record<string, boolean>) => request<ProjectSummary>(`${projectUrl(name)}/locks`, { method: 'PATCH', body: JSON.stringify({ locked }) }),
  artifact: <T = unknown>(name: string, artifact: string) => request<ArtifactDocument<T>>(`${projectUrl(name)}/artifacts/${encodeURIComponent(artifact)}`),
  save: <T = unknown>(name: string, artifact: string, data: T, revision: string) => request<ArtifactDocument<T>>(`${projectUrl(name)}/artifacts/${encodeURIComponent(artifact)}`, { method: 'PUT', body: JSON.stringify({ data, revision }) }),
  scene: (name: string, id: string) => request<SceneDocument>(`${projectUrl(name)}/scenes/${encodeURIComponent(id)}`),
  saveScene: (name: string, doc: SceneDocument) => request<SceneDocument>(`${projectUrl(name)}/scenes/${encodeURIComponent(doc.shotId)}`, { method: 'PUT', body: JSON.stringify({ files: doc.files, revision: doc.revision }) }),
  assets: (name: string) => request<{ files: UploadedAsset[] }>(`${projectUrl(name)}/assets`),
  log: (name: string, key: string) => request<{ text: string; truncated: boolean }>(`${projectUrl(name)}/logs/${encodeURIComponent(key)}`),
  upload: (name: string, data: FormData) => request<{ files: UploadedAsset[] }>(`${projectUrl(name)}/upload`, { method: 'POST', body: data }),
  settings: (name:string,data:unknown)=>request<ProjectDetail>(`${projectUrl(name)}/settings`,{method:'PATCH',body:JSON.stringify(data)}),
  script: (name:string,text:string,format:'txt'|'md',revision?:string)=>request<ArtifactDocument>(`${projectUrl(name)}/script`,{method:'PUT',body:JSON.stringify({text,format,revision})}),
  voiceDefaults: (voice:unknown)=>request<{saved:boolean}>('/api/settings/voice',{method:'PUT',body:JSON.stringify(voice)}),
};
