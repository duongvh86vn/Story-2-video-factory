import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { z } from 'zod';
import { createAdapter, ModelRouter } from '../packages/models/registry.js';
import { ModelJournal } from '../packages/models/journal.js';
import { ModelError, encodeImages } from '../packages/models/adapter.js';
import { config, model, temporary } from './support.js';

type Request = { url: string; body: any; headers: IncomingMessage['headers'] };
async function provider(t: TestContext, handler: (req: Request, res: ServerResponse) => void) {
  const received: Request[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const request = { url: req.url!, body: JSON.parse(Buffer.concat(chunks).toString()), headers: req.headers };
    received.push(request); res.setHeader('content-type', 'application/json'); handler(request, res);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address() as { port: number };
  return { base: `http://127.0.0.1:${address.port}`, received };
}
const input = { system: 'Fixture instructions', prompt: 'Return an answer.', context: { note: 'data only' } };
const schema = z.object({ answer: z.number() });
const openai = (text: string, tokens = 10) => ({ choices: [{ message: { content: text }, finish_reason: 'stop' }], usage: { prompt_tokens: tokens, completion_tokens: 5 } });
const errorCode = (code: string) => (error: unknown) => error instanceof ModelError && error.code === code;

for (const name of ['gateway', 'openai-compatible', 'deepseek', 'litellm', 'gemini', 'ollama']) {
  test(`${name}: HTTP structured-output, token and vision contracts`, async t => {
    const root = await temporary(t); await fs.writeFile(path.join(root, 'frame.png'), Buffer.from('fixture-image'));
    const fixture = await provider(t, (_req, res) => res.end(JSON.stringify(name === 'gemini'
      ? { candidates: [{ content: { parts: [{ text: '{"answer":42}' }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 2 } }
      : name === 'ollama' ? { message: { content: '{"answer":42}' }, prompt_eval_count: 10, eval_count: 5 }
      : openai('{"answer":42}'))));
    const adapter = createAdapter(model(name, fixture.base, { vision: true }), { projectRoot: root });
    assert.deepEqual(await adapter.generateStructured(input, schema), { answer: 42 });
    assert.equal(adapter.lastResponse?.usage?.inputTokens, 10);
    assert.equal(adapter.lastResponse?.usage?.outputTokens, name === 'gemini' ? 7 : 5);
    await adapter.analyzeImages({ ...input, images: [{ path: 'frame.png' }] });
    const [structured, vision] = fixture.received;
    assert.equal(fixture.received.length, 2);
    if (name === 'gemini') {
      assert.match(structured!.url, /models\/fixture-model:generateContent$/);
      assert.equal(structured!.body.generationConfig.responseMimeType, 'application/json');
      assert.equal(vision!.body.contents[0].parts[1].inlineData.mimeType, 'image/png');
    } else if (name === 'ollama') {
      assert.equal(structured!.url, '/api/chat'); assert.equal(structured!.body.format.type, 'object');
      assert.equal(vision!.body.messages[1].images.length, 1);
    } else {
      assert.equal(structured!.url, '/chat/completions'); assert.equal(structured!.body.response_format.type, 'json_object');
      assert.match(vision!.body.messages[1].content[1].image_url.url, /^data:image\/png;base64,/);
    }
  });
}

test('router retries 429 and invalid schema with feedback, cost and redacted evidence', async t => {
  const root = await temporary(t);
  const fixture = await provider(t, (_req, res) => {
    if (fixture.received.length === 1) { res.statusCode = 429; res.setHeader('retry-after', '0'); res.end('{}'); }
    else res.end(JSON.stringify(openai(fixture.received.length === 2 ? '{"answer":"wrong"}' : '{"answer":42}')));
  });
  const settings = config(); settings.models.planner = model('gateway', fixture.base, { api_key_env: 'FACTORY_TEST_SECRET', input_cost_per_million: 1, output_cost_per_million: 2 });
  process.env.FACTORY_TEST_SECRET = 'fixture-private-value'; t.after(() => { delete process.env.FACTORY_TEST_SECRET; });
  const router = new ModelRouter(settings, root);
  assert.deepEqual(await router.structured('planner', { ...input, context: { api_key: process.env.FACTORY_TEST_SECRET } }, schema), { answer: 42 });
  assert.match(fixture.received[2]!.body.messages[1].content, /CORRECTION REQUIRED/);
  assert.equal(fixture.received[0]!.headers.authorization, 'Bearer fixture-private-value');
  const usage = router.usageSummary();
  assert.equal(usage.calls, 3); assert.equal(usage.failures, 2); assert.equal(usage.successes, 1);
  assert.equal(usage.totalTokens, 30); assert.equal(usage.costUsd, 0.00004);
  for (const file of await fs.readdir(path.join(root, 'work/model-attempts'))) {
    assert.doesNotMatch(await fs.readFile(path.join(root, 'work/model-attempts', file), 'utf8'), /fixture-private-value/);
  }
});

test('fatal primary failure routes once to real fallback; never to mock', async t => {
  const root = await temporary(t);
  const fixture = await provider(t, (req, res) => { if (req.body.model === 'primary') { res.statusCode = 401; res.end('{}'); } else res.end(JSON.stringify(openai('{"answer":42}'))); });
  const settings = config(); settings.models.planner = model('gateway', fixture.base, { model: 'primary' });
  settings.models.fallback = model('gateway', fixture.base, { model: 'backup' });
  assert.deepEqual(await new ModelRouter(settings, root).structured('planner', input, schema), { answer: 42 });
  assert.deepEqual(fixture.received.map(req => req.body.model), ['primary', 'backup']);
  const other = await temporary(t); settings.models.fallback = config().models.fallback;
  await assert.rejects(new ModelRouter(settings, other).structured('planner', input, schema), errorCode('http'));
  assert.equal(fixture.received.length, 3);
});

test('attempt and call budgets survive restart and prevent extra HTTP requests', async t => {
  const root = await temporary(t);
  const fixture = await provider(t, (_req, res) => res.end(JSON.stringify(openai('not JSON'))));
  const settings = config(); settings.models.planner = model('gateway', fixture.base); settings.retry.structured_output = 0;
  await assert.rejects(new ModelRouter(settings, root).structured('planner', input, schema), errorCode('structured_output'));
  await assert.rejects(new ModelRouter(settings, root).structured('planner', input, schema), errorCode('attempt_budget'));
  assert.equal(fixture.received.length, 1);
  settings.workflow.max_model_calls = 1;
  await assert.rejects(new ModelRouter(settings, root).text('planner', { ...input, prompt: 'Different request' }), errorCode('call_budget'));
  assert.equal(fixture.received.length, 1);
});

test('timeout, refusal, truncation and missing vision fail explicitly', async t => {
  const fixture = await provider(t, (_req, res) => { /* deliberately leave request pending */ });
  const adapter = createAdapter(model('gateway', fixture.base, { timeout_ms: 40 }));
  await assert.rejects(adapter.generateText(input), errorCode('timeout'));
  await assert.rejects(adapter.analyzeImages({ ...input, images: [] }), errorCode('vision_unsupported'));
  for (const [finish_reason, code] of [['content_filter', 'refusal'], ['length', 'truncated']]) {
    const next = await provider(t, (_req, res) => res.end(JSON.stringify({ choices: [{ message: { content: 'partial' }, finish_reason }] })));
    await assert.rejects(createAdapter(model('gateway', next.base)).generateText(input), errorCode(code!));
  }
});

test('journal recovers torn append and stale lock; concurrent reservations honor budget', async t => {
  const root = await temporary(t); const journal = new ModelJournal(root);
  await fs.mkdir(path.join(root, 'logs')); await fs.writeFile(journal.file, '{"torn":');
  await fs.writeFile(`${journal.file}.lock`, '{"pid":2147483647}');
  const select = () => ({ role: 'planner' as const, routedRole: 'planner' as const, provider: 'gateway', model: 'fixture', operation: 'text' as const, promptHash: 'fixture' });
  const results = await Promise.allSettled([journal.reserve('one', select, 1, 1), new ModelJournal(root).reserve('two', select, 1, 1)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(journal.usageSummary().calls, 1); assert.equal(journal.usageSummary().pendingCalls, 1);
  const record = journal.read()[0]!; await journal.complete(record, { status: 'success', costUsd: 0.5 });
  await assert.rejects(journal.reserve('three', select, 10, 1, 0.5), errorCode('cost_budget'));
});

test('vision image realpath cannot escape project through a junction', async t => {
  const root = await temporary(t), outside = await temporary(t);
  await fs.writeFile(path.join(outside, 'frame.png'), 'private');
  await fs.symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(encodeImages({ ...input, images: [{ path: 'linked/frame.png' }] }, root), errorCode('images'));
});
