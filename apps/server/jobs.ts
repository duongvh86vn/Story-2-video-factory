import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import type { ProjectStatus } from '../../packages/core/schemas.js';
import { ApiError, redact } from './security.js';

export interface Coordinator {
  createProject(name: string, options?: { root?: string; example?: boolean; topic?:'prehistoric-life' }): Promise<string>;
  getProjectStatus(projectRoot: string): Promise<unknown>;
  runPipeline(projectRoot: string, options?: { until?: ProjectStatus; force?: boolean; shotIds?: string[]; retryModelErrors?:boolean }): Promise<unknown>;
  approveProject(projectRoot: string, kind: 'storyboard' | 'characters' | 'host'): Promise<void>;
  updateLocks(projectRoot: string, locked: Record<string, boolean>): Promise<void>;
  invalidateProject(projectRoot: string, from: ProjectStatus): Promise<void>;
}

export async function loadCoordinator(): Promise<Coordinator> {
  let url = new URL('../../packages/orchestrator/index.js', import.meta.url);
  try { await fs.access(fileURLToPath(url)); } catch { url = new URL('../../packages/orchestrator/index.ts', import.meta.url); }
  try {
    const module = await import(url.href) as Coordinator;
    for (const key of ['createProject', 'getProjectStatus', 'runPipeline', 'approveProject', 'updateLocks', 'invalidateProject'] as const) {
      if (typeof module[key] !== 'function') throw new Error(`Missing ${key}`);
    }
    return module;
  } catch {
    throw new ApiError(503, 'The production service is unavailable. Rebuild the application, then retry.', 'COORDINATOR_UNAVAILABLE');
  }
}

export interface Job {
  id: string;
  project: string;
  status: 'running' | 'waiting' | 'completed' | 'failed';
  until: ProjectStatus;
  shotIds?: string[];
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

/** Mutations and production share one synchronous reservation per project. */
export class ProjectJobs {
  private busy = new Set<string>();
  private jobs = new Map<string, Job>();
  private latest = new Map<string, Job>();
  private tasks = new Set<Promise<void>>();

  reserve(name: string): () => void {
    if (this.busy.has(name)) throw new ApiError(409, 'This project is busy. Wait for the current operation to finish.', 'PROJECT_BUSY');
    this.busy.add(name);
    return () => { this.busy.delete(name); };
  }

  async mutate<T>(name: string, action: () => Promise<T>): Promise<T> {
    const release = this.reserve(name);
    try { return await action(); } finally { release(); }
  }

  start(name: string, until: ProjectStatus, shotIds: string[] | undefined, action: () => Promise<unknown>): Job {
    const release = this.reserve(name);
    const job: Job = { id: randomUUID(), project: name, status: 'running', until, ...(shotIds ? { shotIds } : {}), startedAt: new Date().toISOString() };
    this.jobs.set(job.id, job);
    this.latest.set(name, job);
    const task = Promise.resolve().then(action).then(
      result => { const error=result && typeof result==='object' && 'error' in result ? result.error : undefined; if(typeof error==='string'){job.status='waiting';job.error=redact(error);}else job.status='completed'; },
      error => { job.status = 'failed'; job.error = redact(error instanceof Error ? error.message : String(error)); },
    ).finally(() => {
      job.finishedAt = new Date().toISOString();
      release();
      this.tasks.delete(task);
      // Keep recent jobs while bounding memory in a long-lived desktop session.
      if (this.jobs.size > 200) for (const [id, old] of this.jobs) {
        if (old.status !== 'running' && this.latest.get(old.project)?.id !== id) this.jobs.delete(id);
        if (this.jobs.size <= 200) break;
      }
    });
    this.tasks.add(task);
    return { ...job };
  }

  current(name: string): Job | null { const job = this.latest.get(name); return job ? { ...job } : null; }
  get(name: string, id: string): Job {
    const job = this.jobs.get(id);
    if (!job || job.project !== name) throw new ApiError(404, 'Job not found.', 'NOT_FOUND');
    return { ...job };
  }
  async drain(): Promise<void> { await Promise.allSettled(this.tasks); }
}
