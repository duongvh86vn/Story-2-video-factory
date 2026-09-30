import type { ZodType, ZodTypeDef } from 'zod';
import path from 'node:path';
import type { FactoryConfig, ModelRole, ModelSettings } from '../core/config.js';
import { hash, writeAtomic } from '../core/utils.js';
import { ModelError, StructuredOutputError, jsonSchemaFor, validateStructured, type AdapterOptions,
  type ModelAdapter, type ModelRequest, type ModelResponse, type VisionRequest } from './adapter.js';
import { GatewayAdapter } from './gateway.js';
import { OpenAICompatibleAdapter } from './openai-compatible.js';
import { DeepSeekAdapter } from './deepseek.js';
import { GeminiAdapter } from './gemini.js';
import { OllamaAdapter } from './ollama.js';
import { LiteLLMAdapter } from './litellm.js';
import { MockAdapter } from './mock.js';
import { ModelJournal, type AttemptRecord, type UsageSummary } from './journal.js';

export function createAdapter(settings: ModelSettings, options: AdapterOptions = {}): ModelAdapter {
  switch (settings.provider) {
    case 'gateway': return new GatewayAdapter(settings, options);
    case 'openai-compatible': return new OpenAICompatibleAdapter(settings, options);
    case 'deepseek': return new DeepSeekAdapter(settings, options);
    case 'gemini': return new GeminiAdapter(settings, options);
    case 'ollama': return new OllamaAdapter(settings, options);
    case 'litellm': return new LiteLLMAdapter(settings, options);
    case 'mock': return new MockAdapter(settings, options);
    default: throw new ModelError('configuration', 'Unknown model provider');
  }
}

export class ModelRouter {
  private readonly journal: ModelJournal;
  constructor(private readonly config: FactoryConfig, private readonly projectRoot: string) {
    this.journal = new ModelJournal(projectRoot);
  }
  isMock(role: ModelRole): boolean { return this.config.models[role].provider === 'mock'; }
  supportsVision(): boolean {
    return this.visionCapable('visual_review') || this.visionCapable('fallback');
  }
  usageSummary(): UsageSummary { return this.journal.usageSummary(); }
  async structured<T>(role: ModelRole, input: ModelRequest, schema: ZodType<T, ZodTypeDef, any>): Promise<T> {
    return this.run(role, input, 'structured', (adapter, request) => adapter.generateStructured(request, schema), jsonSchemaFor(schema));
  }
  async text(role: ModelRole, input: ModelRequest): Promise<ModelResponse> {
    return this.run(role, input, 'text', (adapter, request) => adapter.generateText(request));
  }
  async review(input: VisionRequest): Promise<ModelResponse> {
    if (!this.supportsVision()) throw new ModelError('vision_unsupported', 'No configured real model supports vision; use the rule-based reviewer');
    // Review responses are validated too, before they can be reported as successful calls.
    const { ReviewSchema } = await import('../core/schemas.js');
    const request = { ...input, system: `${input.system}\nReturn only JSON describing objective issues using the supplied schema.`,
      prompt: `${input.prompt}\n\nOUTPUT JSON SCHEMA:\n${JSON.stringify(jsonSchemaFor(ReviewSchema))}` };
    return this.run('visual_review', request, 'review', async (adapter, next) => {
      const response = await adapter.analyzeImages({ ...next, images: input.images });
      const review = validateStructured(response, ReviewSchema);
      return { ...response, text: JSON.stringify(review) };
    }, jsonSchemaFor(ReviewSchema));
  }
  private visionCapable(role: ModelRole): boolean {
    return !this.isMock(role) && this.config.models[role].vision;
  }
  private async run<T>(role: ModelRole, input: ModelRequest, operation: AttemptRecord['operation'],
    execute: (adapter: ModelAdapter, request: ModelRequest) => Promise<T>, schema?: unknown): Promise<T> {
    await this.journal.hydrate();
    const retries = operation === 'structured' && role === 'coder' ? this.config.retry.scene_generation
      : operation === 'structured' && role === 'repair' ? this.config.retry.scene_repair : this.config.retry.structured_output;
    const candidates: ModelRole[] = operation === 'review'
      ? (['visual_review', 'fallback'] as ModelRole[]).filter(candidate => this.visionCapable(candidate)) : [role];
    if (operation !== 'review' && role !== 'fallback') {
      const primary = this.config.models[role]; const fallback = this.config.models.fallback;
      // A real provider failure must not silently turn a production request into mock output.
      if (fallback.provider !== 'mock' && (primary.provider !== fallback.provider || primary.model !== fallback.model || primary.base_url !== fallback.base_url)) candidates.push('fallback');
    }
    const maxAttempts = retries + 1 + (candidates.length > 1 ? 1 : 0);
    const requestHash = hash({ role, operation, input, schema,
      routing: candidates.map(candidate => { const { provider, model, base_url } = this.config.models[candidate]; return { provider, model, base_url }; }) });
    for (;;) {
      let request = input;
      const start = await this.journal.reserve(requestHash, (attempt, cycle) => {
        const last = cycle.filter(record => record.event === 'completed').at(-1);
        const alreadyEscalated = candidates.length > 1 && cycle.some(record => record.routedRole === candidates[1]);
        if (alreadyEscalated) throw new ModelError('attempt_budget', 'Persistent fallback attempt budget exhausted for this request');
        const fatal = last?.error?.retryable === false;
        if (fatal && candidates.length < 2) throw new ModelError('attempt_budget', 'The persisted provider error cannot be retried');
        const routedRole = candidates.length > 1 && (attempt > retries + 1 || fatal) ? candidates[1]! : candidates[0]!;
        const settings = this.config.models[routedRole];
        const feedback = last?.error?.feedback;
        request = feedback ? { ...input, prompt: `${input.prompt}\n\nCORRECTION REQUIRED:\n${feedback}\nReturn the complete corrected output.` } : input;
        return { role, routedRole, provider: settings.provider, model: this.redact(settings.model), operation, promptHash: hash(request) };
      }, this.config.workflow.max_model_calls, maxAttempts, this.config.workflow.max_model_cost_usd);
      const settings = this.config.models[start.routedRole];
      const began = Date.now();
      let adapter: ModelAdapter | undefined;
      let value: T;
      try {
        await this.persistAttempt(start, request, schema);
        adapter = createAdapter(settings, { projectRoot: this.projectRoot });
        value = await execute(adapter, request);
      } catch (error) {
        const response = adapter?.lastResponse;
        const failure = error instanceof ModelError ? error : new ModelError('generation_failed', 'Model generation failed');
        const feedback = this.redact(error instanceof StructuredOutputError ? error.feedback
          : `Provider attempt failed (${failure.code}). Follow the original request and schema.`);
        const completion: Parameters<ModelJournal['complete']>[1] = { status: 'error', durationMs: Date.now() - began,
          ...(response ? { responseHash: hash(response.text), tokens: response.usage, costUsd: this.cost(settings, response) } : {}),
          error: { code: failure.code, retryable: failure.retryable, feedback, ...(failure.status ? { status: failure.status } : {}) } };
        // Persist raw invalid output as well as successful output, with secrets redacted.
        try { await this.persistAttempt({ ...start, ...completion }, request, schema, response, completion.error); }
        finally { await this.journal.complete(start, completion); }
        if (failure.code === 'attempt_artifact' || start.attempt >= maxAttempts
          || (candidates.length > 1 && start.routedRole === candidates[1]) || (!failure.retryable && candidates.length < 2)) throw failure;
        if (failure.retryable && !(error instanceof StructuredOutputError)) {
          const waitMs = failure.retryAfterMs ?? Math.min(4000, 250 * 2 ** (start.attempt - 1));
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
        continue;
      }
      const response = adapter.lastResponse;
      const completion: Parameters<ModelJournal['complete']>[1] = { status: 'success', durationMs: Date.now() - began,
        responseHash: hash(response?.text ?? value), tokens: response?.usage, costUsd: response ? this.cost(settings, response) : 0 };
      // Once a provider has succeeded, a local artifact failure must not issue another billed call.
      try { await this.persistAttempt({ ...start, ...completion }, request, schema, response); }
      finally { await this.journal.complete(start, completion); }
      return value;
    }
  }
  private async persistAttempt(record: AttemptRecord, request: ModelRequest, schema?: unknown,
    response?: ModelResponse, error?: AttemptRecord['error']): Promise<void> {
    try {
      const artifact = this.redactValue({ ...record, request, schema, response, error });
      await writeAtomic(path.join(this.projectRoot, 'work', 'model-attempts', `${record.callId}.json`), `${JSON.stringify(artifact, null, 2)}\n`);
    } catch { throw new ModelError('attempt_artifact', 'Could not persist the redacted model attempt artifact'); }
  }
  private cost(settings: ModelSettings, response: ModelResponse): number {
    if (settings.provider === 'mock' || !response.usage) return 0;
    return (response.usage.inputTokens * settings.input_cost_per_million + response.usage.outputTokens * settings.output_cost_per_million) / 1_000_000;
  }
  private redact(value: string): string {
    let result = value;
    const names = new Set([...Object.values(this.config.models).map(settings => settings.api_key_env),
      ...Object.keys(process.env).filter(name => /key|token|secret|password|credential/i.test(name))]);
    for (const name of names) {
      const secret = process.env[name];
      if (secret) result = result.split(secret).join('[redacted]');
    }
    return result.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [redacted]')
      .replace(/\bsk-[A-Za-z0-9_-]+/g, '[redacted]')
      .replace(/([?&](?:key|api_key|token|access_token)=)[^\s&#"']+/gi, '$1[redacted]')
      .replace(/((?:["']?(?:api[_-]?key|password|secret|access[_-]?token|refresh[_-]?token|authorization)["']?)\s*[:=]\s*["']?)[^"'\s,}\]]+/gi, '$1[redacted]');
  }
  private redactValue(value: unknown): unknown {
    if (typeof value === 'string') return this.redact(value);
    if (Array.isArray(value)) return value.map(item => this.redactValue(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [this.redact(key),
      /^(?:api[_-]?key|authorization|password|secret|access[_-]?token|refresh[_-]?token|credential)$/i.test(key) ? '[redacted]' : this.redactValue(item)]));
    return value;
  }
}
