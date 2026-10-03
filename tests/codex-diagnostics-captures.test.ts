import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ModelSettingsSchema } from '../packages/core/config.js';
import { CodexCliAdapter } from '../packages/models/codex-cli.js';
import { ModelError, type ModelRequest } from '../packages/models/adapter.js';
import { ModelRouter } from '../packages/models/registry.js';
import { ModelJournal } from '../packages/models/journal.js';
import type { ProcessResult } from '../packages/render/process.js';
import { config, temporary } from './support.js';

const request = { system: 'Capture fixture', prompt: 'Return the fixture answer.' };
const privateText = 'PRIVATE_CAPTURE_FIXTURE';
const secret = 'SYNTHETIC_CAPTURE_SECRET';
const completed = { type: 'turn.completed', usage: { input_tokens: 11, output_tokens: 4 } };
const message = (text = 'answer') => ({ type: 'item.completed', item: { type: 'agent_message', text } });
const capture = (events: unknown[], patch: Partial<ProcessResult> = {}): ProcessResult => ({
  code: 0, stdout: events.map(event => JSON.stringify(event)).join('\n'), stderr: '',
  timedOut: false, truncated: false, ...patch,
});
const settings = () => ModelSettingsSchema.parse({
  provider: 'codex-cli', model: 'fixture-primary', command: 'unused-capture-fixture',
});
const failure = (code = 'usage_limit_reached') => capture([
  { type: 'turn.failed', error: { code, message: `${privateText} token=${secret}` } },
], { code: 1 });
const malformed = (result: ProcessResult): ProcessResult => ({ ...result, stdout: `${result.stdout}\n{"partial":` });
const isCode = (code: string) => (error: unknown) => error instanceof ModelError && error.code === code && !error.retryable;

async function diagnostics(root: string) {
  const raw = await fs.readFile(path.join(root, 'logs/model-cli-diagnostics.jsonl'), 'utf8');
  assert.ok(!raw.includes(privateText)); assert.ok(!raw.includes(secret));
  return raw.trim().split('\n').map(line => JSON.parse(line));
}

async function routedCapture(t: TestContext, root: string, initial: ProcessResult) {
  let result = initial, calls = 0;
  const injected = new CodexCliAdapter(settings(), { projectRoot: root }, async () => { calls++; return result; });
  const generateText = CodexCliAdapter.prototype.generateText;
  // The router creates its real adapters. Replace only their public entry point to
  // delegate to the same genuine adapter implementation with an injected process capture.
  t.mock.method(CodexCliAdapter.prototype, 'generateText', async function (this: CodexCliAdapter, input: ModelRequest) {
    try { return await generateText.call(injected, input); }
    finally { this.lastResponse = injected.lastResponse; }
  });
  const configuration = config();
  configuration.models.planner = settings();
  configuration.models.fallback = { ...settings(), model: 'fixture-fallback' };
  configuration.retry.structured_output = 1;
  return {
    router: (retryModelErrors = false) => new ModelRouter(configuration, root, { retryModelErrors }),
    calls: () => calls, set: (next: ProcessResult) => { result = next; }, journal: new ModelJournal(root),
  };
}

test('quota in malformed trailing JSONL stops configured fallback and ordinary resume', async t => {
  const root = await temporary(t), fixture = await routedCapture(t, root, malformed(failure()));
  await assert.rejects(fixture.router().text('planner', request), isCode('cli_usage_limit'));
  assert.equal(fixture.calls(), 1);
  const failed = fixture.journal.read().at(-1)!;
  assert.equal(failed.routedRole, 'planner'); assert.equal(failed.error?.code, 'cli_usage_limit');
  await assert.rejects(fixture.router().text('planner', request), isCode('cli_usage_limit'));
  assert.equal(fixture.calls(), 1);
  assert.equal(fixture.journal.read().filter(record => record.event === 'started').length, 1);
  const [summary] = await diagnostics(root);
  assert.equal(summary.category, 'usage-limit'); assert.equal(summary.malformedLines, 1);
});

test('truncated capture preserves a recognized fatal authentication category', async t => {
  const root = await temporary(t);
  const adapter = new CodexCliAdapter(settings(), { projectRoot: root }, async () => ({ ...failure('invalid_api_key'), truncated: true }));
  await assert.rejects(adapter.generateText(request), isCode('cli_authentication'));
  assert.equal(adapter.lastResponse, undefined);
  const [summary] = await diagnostics(root);
  assert.equal(summary.category, 'authentication'); assert.equal(summary.truncated, true);
});

for (const boundary of ['truncated', 'response_json'] as const) {
  test(`unknown ${boundary} rejects generated output with its original code, message and retryability`, async t => {
    const root = await temporary(t);
    const generated = capture([
      { type: 'item.completed', item: { type: 'reasoning', text: `usage_limit_reached ${privateText}` } },
      message(`invalid_api_key context_length_exceeded model_access_denied ${secret}`), completed,
    ]);
    const result = boundary === 'truncated' ? { ...generated, truncated: true } : malformed(generated);
    const adapter = new CodexCliAdapter(settings(), { projectRoot: root }, async () => result);
    await assert.rejects(adapter.generateText(request), error => {
      assert.ok(error instanceof ModelError);
      assert.equal(error.code, boundary); assert.equal(error.retryable, false);
      assert.equal(error.message, boundary === 'truncated'
        ? 'Codex CLI response exceeded the output limit.' : 'Codex CLI did not return complete JSON events.');
      return true;
    });
    assert.equal(adapter.lastResponse, undefined);
    const [summary] = await diagnostics(root);
    assert.equal(summary.category, 'unknown'); assert.equal(summary.agentMessages, 1);
  });
}

test('restricted journal write failure at a capture boundary requires explicit recovery', async t => {
  const root = await temporary(t), journalPath = path.join(root, 'logs/model-cli-diagnostics.jsonl');
  await fs.mkdir(journalPath, { recursive: true });
  const fixture = await routedCapture(t, root, malformed(failure()));
  await assert.rejects(fixture.router().text('planner', request), isCode('cli_diagnostics'));
  assert.equal(fixture.calls(), 1);
  const prefix = await fs.readFile(fixture.journal.file, 'utf8'), failed = fixture.journal.read().at(-1)!;
  assert.equal(failed.error?.code, 'cli_diagnostics');
  await fs.rmdir(journalPath); fixture.set(capture([message(), completed]));
  await assert.rejects(fixture.router().text('planner', request), isCode('cli_diagnostics'));
  assert.equal(fixture.calls(), 1);
  assert.equal((await fixture.router(true).text('planner', request)).text, 'answer');
  assert.equal(fixture.calls(), 2);
  assert.ok((await fs.readFile(fixture.journal.file, 'utf8')).startsWith(prefix));
  const rows = fixture.journal.read();
  assert.equal(rows[2]!.retryOf, failed.callId); assert.equal(rows[3]!.retryOf, failed.callId);
  assert.ok(rows.every(record => record.routedRole === 'planner'));
});
