import { createHash, randomUUID } from 'node:crypto';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { RoleNames, type ModelRole } from '../core/config.js';
import { ModelError, object, tokenCount, type ModelResponse } from './adapter.js';

export interface AttemptRecord {
  version: 1; event: 'started' | 'completed'; id: string; callId: string; requestHash: string;
  timestamp: string; role: ModelRole; routedRole: ModelRole; provider: string; model: string;
  operation: 'structured' | 'text' | 'review'; attempt: number; promptHash: string;
  status: 'pending' | 'success' | 'error'; durationMs?: number; responseHash?: string;
  retryOf?: string;
  tokens?: ModelResponse['usage']; costUsd?: number; error?: { code: string; status?: number; retryable?: boolean; feedback?: string };
}
export interface UsageTotals {
  calls: number; successes: number; failures: number; pendingCalls: number;
  inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number; unknownUsageCalls: number;
}
export interface UsageSummary extends UsageTotals {
  byRole: Partial<Record<ModelRole, UsageTotals>>; byModel: Record<string, UsageTotals>;
}
const emptyTotals = (): UsageTotals => ({ calls: 0, successes: 0, failures: 0, pendingCalls: 0,
  inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, unknownUsageCalls: 0 });

function parseJournal(content: string): AttemptRecord[] {
  const lines = content.split('\n');
  const records: AttemptRecord[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (!line.trim()) continue;
    let data: AttemptRecord;
    try { data = JSON.parse(line) as AttemptRecord; }
    catch { if (index === lines.length - 1 && !content.endsWith('\n')) break; throw new ModelError('journal', 'Model call journal contains a corrupt committed record'); }
    if (!data || typeof data !== 'object') throw new ModelError('journal', 'Model call journal contains an invalid record');
    // Hydrate earlier single-row logs, including started rows left after a crash.
    if (data.version !== 1 || !['started', 'completed'].includes(data.event)) {
      const legacy = data as unknown as Record<string, unknown>;
      if (!RoleNames.includes(legacy.role as ModelRole) || typeof legacy.model !== 'string') continue;
      const id = typeof legacy.callId === 'string' ? legacy.callId : typeof legacy.id === 'string' ? legacy.id
        : `legacy-${createHash('sha256').update(line).digest('hex')}`;
      const status = ['started', 'pending'].includes(String(legacy.status)) ? 'pending' : ['error', 'failed', 'failure'].includes(String(legacy.status)) ? 'error' : 'success';
      const usage = object(legacy.tokens ?? legacy.usage);
      data = { version: 1, id, callId: id, event: status === 'pending' ? 'started' : 'completed',
        requestHash: typeof legacy.requestHash === 'string' ? legacy.requestHash : `legacy:${id}`,
        timestamp: typeof legacy.timestamp === 'string' ? legacy.timestamp : '', role: legacy.role as ModelRole,
        routedRole: (legacy.routedRole ?? legacy.role) as ModelRole, provider: typeof legacy.provider === 'string' ? legacy.provider : 'legacy', model: legacy.model,
        operation: 'structured', attempt: typeof legacy.attempt === 'number' ? legacy.attempt : 1,
        promptHash: typeof legacy.promptHash === 'string' ? legacy.promptHash : '', status,
        ...(Object.keys(usage).length ? { tokens: { inputTokens: tokenCount(usage.inputTokens ?? usage.prompt_tokens), outputTokens: tokenCount(usage.outputTokens ?? usage.completion_tokens) } } : {}),
        costUsd: typeof (legacy.costUsd ?? legacy.cost_usd) === 'number' && Number.isFinite(Number(legacy.costUsd ?? legacy.cost_usd))
          ? Math.max(0, Number(legacy.costUsd ?? legacy.cost_usd)) : 0 };
    }
    if (!data.callId || !data.requestHash || !Number.isInteger(data.attempt) || data.attempt < 1) {
      throw new ModelError('journal', 'Model call journal contains an invalid attempt record');
    }
    if (!RoleNames.includes(data.role) || !RoleNames.includes(data.routedRole) || typeof data.model !== 'string'
      || !['pending', 'success', 'error'].includes(data.status)) throw new ModelError('journal', 'Model call journal contains invalid usage metadata');
    if (data.tokens) data.tokens = { inputTokens: tokenCount(data.tokens.inputTokens), outputTokens: tokenCount(data.tokens.outputTokens) };
    if (data.costUsd !== undefined && (!Number.isFinite(data.costUsd) || data.costUsd < 0)) throw new ModelError('journal', 'Model call journal contains invalid cost metadata');
    const retryStart = data.event === 'completed'
      ? records.find(record => record.event === 'started' && record.callId === data.callId) : undefined;
    if (retryStart?.retryOf !== undefined
      && (data.retryOf !== retryStart.retryOf || data.requestHash !== retryStart.requestHash)) {
      throw new ModelError('journal', 'Model retry completion does not match its started boundary');
    }
    if (data.retryOf!==undefined) {
      const previous=records.find(record=>record.callId===(data.event==='started'?data.retryOf:data.callId)&&
        record.event===(data.event==='started'?'completed':'started')&&record.requestHash===data.requestHash);
      if(typeof data.retryOf!=='string'||!data.retryOf||data.attempt!==1||!previous||
        (data.event==='started'?previous.status!=='error':previous.retryOf!==data.retryOf))throw new ModelError('journal','Model retry boundary does not reference a completed failed request');
    }
    records.push(data);
  }
  return records;
}
export function summarize(records: AttemptRecord[]): UsageSummary {
  const calls = new Map<string, AttemptRecord>();
  for (const record of records) {
    const previous = calls.get(record.callId);
    if (!previous || record.event === 'completed' || previous.event !== 'completed') calls.set(record.callId, record);
  }
  const result: UsageSummary = { ...emptyTotals(), byRole: {}, byModel: {} };
  for (const record of calls.values()) {
    const role = result.byRole[record.role] ??= emptyTotals();
    const key = `${record.provider}/${record.model}`;
    const model = Object.hasOwn(result.byModel, key) ? result.byModel[key]! : (result.byModel[key] = emptyTotals());
    for (const total of [result, role, model]) {
      total.calls++;
      if (record.status === 'success') total.successes++;
      else if (record.status === 'error') total.failures++;
      else total.pendingCalls++;
      if (record.tokens) { total.inputTokens += record.tokens.inputTokens; total.outputTokens += record.tokens.outputTokens; }
      else total.unknownUsageCalls++;
      total.totalTokens = total.inputTokens + total.outputTokens;
      total.costUsd += record.costUsd ?? 0;
    }
  }
  return result;
}

/** Append-only start/completion records reserve budget before issuing a provider call. */
export class ModelJournal {
  readonly file: string;
  private readonly lockFile: string;
  private hydration?: Promise<void>;
  constructor(projectRoot: string) {
    this.file = path.join(path.resolve(projectRoot), 'logs', 'model-calls.jsonl');
    this.lockFile = `${this.file}.lock`;
  }
  read(): AttemptRecord[] {
    try { return parseJournal(readFileSync(this.file, 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  }
  usageSummary(): UsageSummary { return summarize(this.read()); }
  async hydrate(): Promise<void> {
    this.hydration ??= (async () => {
      try { parseJournal(await fs.readFile(this.file, 'utf8')); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    })();
    return this.hydration;
  }
  async reserve(requestHash: string,
    select: (attempt: number, cycle: AttemptRecord[]) => Omit<AttemptRecord, 'version' | 'event' | 'id' | 'callId' | 'requestHash' | 'timestamp' | 'status' | 'attempt'>,
    maxCalls: number, maxAttempts: number, maxCostUsd?: number, restartFailedCycle=false): Promise<AttemptRecord> {
    await this.hydrate();
    return this.withLock(async () => {
      const records = this.read();
      const summary = summarize(records);
      if (summary.calls >= maxCalls) throw new ModelError('call_budget', `Model call budget exhausted (${maxCalls})`);
      if (maxCostUsd !== undefined && summary.costUsd >= maxCostUsd) throw new ModelError('cost_budget', 'Model cost budget exhausted');
      // Failed/pending attempts survive ordinary restarts. Explicit retries retain
      // all usage/history and start only after a completed failure, never pending work.
      const matching = records.filter(record => record.requestHash === requestHash);
      let boundary = -1;
      for (let i = 0; i < matching.length; i++) {
        if (matching[i]!.status === 'success') boundary = i;
        else if(matching[i]!.event==='started'&&matching[i]!.retryOf)boundary=i-1;
      }
      const latest=matching.at(-1);
      if(restartFailedCycle&&latest?.status==='pending')throw new ModelError('request_pending','A pending model request cannot be restarted as a failed request');
      const retryOf=restartFailedCycle&&latest?.event==='completed'&&latest.status==='error'?latest.callId:undefined;
      const cycle = retryOf?[]:matching.slice(boundary + 1);
      const attempt = new Set(cycle.filter(record => record.event === 'started').map(record => record.callId)).size + 1;
      if (attempt > maxAttempts) throw new ModelError('attempt_budget', 'Persistent model attempt budget exhausted for this request');
      const details = select(attempt, cycle); const id = randomUUID();
      const record: AttemptRecord = { ...details, requestHash, version: 1, event: 'started', id, callId: id,
        timestamp: new Date().toISOString(), status: 'pending', attempt,...(retryOf?{retryOf}:{}) };
      await this.append(record);
      return record;
    });
  }
  async complete(start: AttemptRecord, result: Pick<AttemptRecord, 'status' | 'durationMs' | 'responseHash' | 'tokens' | 'costUsd' | 'error'>): Promise<void> {
    await this.withLock(async () => {
      await this.append({ ...start, ...result, event: 'completed', timestamp: new Date().toISOString() });
    });
  }
  private async append(record: AttemptRecord): Promise<void> {
    let content = '';
    try { content = await fs.readFile(this.file, 'utf8'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (content && !content.endsWith('\n')) {
      try { JSON.parse(content.slice(content.lastIndexOf('\n') + 1)); await fs.appendFile(this.file, '\n'); }
      catch { await fs.truncate(this.file, Buffer.byteLength(content.slice(0, content.lastIndexOf('\n') + 1))); }
    }
    const handle = await fs.open(this.file, 'a');
    try { await handle.writeFile(`${JSON.stringify(record)}\n`); await handle.sync(); } finally { await handle.close(); }
  }
  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const started = Date.now();
    let handle: Awaited<ReturnType<typeof fs.open>>;
    for (;;) {
      try { handle = await fs.open(this.lockFile, 'wx'); break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw new ModelError('journal', 'Could not lock the model call journal');
        // Recover a lock owned by a process that has exited; never steal a live process's lock.
        try {
          const owner = JSON.parse(await fs.readFile(this.lockFile, 'utf8')) as { pid?: number };
          if (Number.isInteger(owner.pid) && owner.pid! > 0) {
            try { process.kill(owner.pid!, 0); }
            catch (probe) { if ((probe as NodeJS.ErrnoException).code === 'ESRCH') await fs.unlink(this.lockFile); }
          }
        } catch { /* Another writer may still be creating/removing the lock. */ }
        if (Date.now() - started > 10000) throw new ModelError('journal_lock', 'Timed out acquiring the model journal lock');
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    }
    try { await handle.writeFile(JSON.stringify({ pid: process.pid })); return await operation(); }
    finally { await handle.close(); await fs.unlink(this.lockFile); }
  }
}
