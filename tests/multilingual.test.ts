import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import test, { type TestContext } from 'node:test';
import YAML from 'yaml';
import { ConfigSchema, loadConfig } from '../packages/core/config.js';
import { NARRATION_LANGUAGES, primaryLanguage, speechLocale } from '../packages/core/languages.js';
import { parseScript, type ScriptDocument } from '../packages/ingest/script.js';
import { ingestProject } from '../packages/ingest/index.js';
import { ModelRouter } from '../packages/models/registry.js';
import { updateSettings } from '../packages/orchestrator/settings.js';
import { loadState, saveState } from '../packages/orchestrator/state-machine.js';
import { createProject, runPipeline } from '../packages/orchestrator/index.js';
import { narrateScript, resolveVoice } from '../packages/voice/index.js';
import { NarrationSchema } from '../packages/core/schemas.js';
import { externalSpeechRequest, synthesizeExternal } from '../packages/voice/external.js';
import { azureVoiceId, synthesizeAzure, writeSpeechResponse } from '../packages/voice/azure.js';
import { matchingWindowsVoices } from '../packages/voice/catalog.js';
import { buildServer } from '../apps/server/index.js';
import { exists, hash, readJson } from '../packages/core/utils.js';
import { temporary } from './support.js';

function rebuiltParagraph(document: ScriptDocument, index: number): string {
  return document.chunks.filter(c => c.paragraphIndex === index).map(c => (c.separatorBefore ?? ' ') + c.text).join('');
}
function exactChunks(original: string): ScriptDocument {
  const document = parseScript(original);
  assert.equal(document.original, original);
  assert.equal(document.sourceHash, hash(original));
  assert.ok(document.chunks.every(c => [...c.text].length > 0 && [...c.text].length <= 120));
  for (const paragraph of document.paragraphs) {
    assert.equal(rebuiltParagraph(document, paragraph.index), paragraph.text);
    for (const chunk of document.chunks.filter(c => c.paragraphIndex === paragraph.index)) {
      assert.equal(chunk.sourceStartLine, paragraph.sourceStartLine);
      assert.equal(chunk.sourceEndLine, paragraph.sourceEndLine);
    }
  }
  return document;
}

test('Japanese unspaced paragraphs longer than 120 retain every character and punctuation across cue boundaries', () => {
  const first = '蒸気は別の凝縮器へ導かれシリンダーは熱いまま保たれる'.repeat(12) + '。本当ですか？はい！';
  assert.ok([...first].length > 120);
  const original = first + '\n\n東京では研究者が機械を調べます。';
  const document = exactChunks(original);
  assert.equal(document.text, original);
  assert.ok(document.chunks.filter(c => c.paragraphIndex === 0).length > 1);
  assert.deepEqual(document.paragraphs.map(p => [p.sourceStartLine, p.sourceEndLine]), [[1, 1], [3, 3]]);
});

test('mixed Latin/Japanese preserves existing spaces, Latin tokens, CJK punctuation and Unicode code points', () => {
  const original = ('TokyoでGPUを調べます。AI2026の結果は正確ですか？ A&Bを確認！ '.repeat(15)).trim() + '終わり。';
  const document = exactChunks(original);
  assert.equal(rebuiltParagraph(document, 0), original);
  assert.equal(document.text, original);
  assert.throws(() => parseScript('日本語' + 'x'.repeat(121)), /word longer than the 120-character cue limit/);
});

test('Korean Unicode words and emoji stay intact at measured 120-code-point boundaries', () => {
  const original = ('증기는 별도 응축기로 이동하고 실린더는 뜨겁게 유지됩니다. 연구자는 결과를 확인합니다! 🚀 '.repeat(12)).trim();
  const document = exactChunks(original);
  assert.equal(document.text, original);
  assert.deepEqual(document.chunks.flatMap(c => c.text.split(' ')), original.split(' '));
  assert.throws(() => parseScript('한'.repeat(121)), /word longer than the 120-character cue limit/);
});

for (const [language, original] of [
  ['en', 'Steam reaches a separate condenser. ' + Array(65).fill('cylinder').join(' ') + ' stays hot!'],
  ['vi', 'Hơi nước tới bình ngưng riêng. ' + Array(65).fill('pít-tông').join(' ') + ' vẫn nóng!'],
] as const) test(`${language}: spaced-word segmentation keeps the original backward-compatible text and word limit`, () => {
  const document = exactChunks(original);
  assert.equal(document.chunks.map(c => c.text).join(' '), original);
  assert.throws(() => parseScript((language === 'en' ? 'x' : 'ế').repeat(121)), /word longer than the 120-character cue limit/);
});

test('narration catalog and Windows matching distinguish a primary language from an explicitly chosen locale', () => {
  assert.deepEqual(NARRATION_LANGUAGES.map(item => item.id), ['en', 'vi', 'ja', 'ko']);
  for (const [locale, primary] of [['en-US', 'en'], ['vi-VN', 'vi'], ['ja-JP', 'ja'], ['ko-KR', 'ko']] as const) {
    assert.equal(primaryLanguage(locale), primary); assert.equal(speechLocale(primary), locale);
  }
  const voices = [
    { id: 'US', language: 'en-US', gender: 'Female' }, { id: 'GB', language: 'en-GB', gender: 'Male' },
    { id: 'JP', language: 'ja-JP', gender: 'Female' }, { id: 'KR', language: 'ko-KR', gender: 'Female' },
  ];
  assert.deepEqual(matchingWindowsVoices(voices, 'en').map(v => v.id), ['US', 'GB']);
  assert.deepEqual(matchingWindowsVoices(voices, 'en-GB').map(v => v.id), ['GB']);
  assert.deepEqual(matchingWindowsVoices(voices, 'ja-JP').map(v => v.id), ['JP']);
  assert.deepEqual(matchingWindowsVoices(voices, 'ko').map(v => v.id), ['KR']);
  assert.deepEqual(matchingWindowsVoices(voices, 'vi'), []);
});

async function settingsFixture(t: TestContext, settings: Record<string, unknown>) {
  const root = await temporary(t);
  await fs.mkdir(path.join(root, 'input')); await fs.mkdir(path.join(root, 'work'));
  await fs.writeFile(path.join(root, 'project.yaml'), YAML.stringify(settings));
  return root;
}

test('exact locale voice preset wins primary preset; explicit project voice wins preset without mutating project bytes', async t => {
  const root = await settingsFixture(t, {
    project: { name: 'profiles', language: 'en-GB' },
    voice_profiles: {
      en: { tts_provider: 'windows-speech', voice_id: 'primary-English', command: '', command_args: [] },
      'en-GB': { tts_provider: 'azure-speech', voice_id: 'en-GB-SoniaNeural', base_url: 'https://fixture.invalid', command: '', command_args: [] },
    },
  });
  const file = path.join(root, 'project.yaml'), before = await fs.readFile(file);
  const exact = await loadConfig(root);
  assert.equal(exact.voice.tts_provider, 'azure-speech'); assert.equal(exact.voice.voice_id, 'en-GB-SoniaNeural');
  const explicit = await loadConfig(root, { voice: { tts_provider: 'http', voice_id: 'project-English', base_url: 'http://127.0.0.1:1' } });
  assert.equal(explicit.voice.tts_provider, 'http'); assert.equal(explicit.voice.voice_id, 'project-English');
  assert.equal(explicit.voice.base_url, 'http://127.0.0.1:1');
  assert.deepEqual(await fs.readFile(file), before);
});

test('switching a inherited command profile to a non-command provider cannot retain its executable or arguments', async t => {
  const root = await settingsFixture(t, {
    project: { name: 'provider-switch', language: 'ja-JP' },
    voice_profiles: { ja: { tts_provider: 'azure-speech', voice_id: 'ja-JP-NanamiNeural', base_url: 'https://fixture.invalid' } },
  });
  const config = await loadConfig(root);
  assert.equal(config.voice.tts_provider, 'azure-speech'); assert.equal(config.voice.voice_id, 'ja-JP-NanamiNeural');
  assert.equal(config.voice.command, undefined); assert.deepEqual(config.voice.command_args, []);
});

async function voiceApi(t: TestContext) {
  const repoRoot = await temporary(t), projectsRoot = await temporary(t);
  await fs.mkdir(path.join(repoRoot, 'config'));
  const original = {
    voice: { tts_provider: 'command', voice_id: 'existing-Vietnamese', command: 'private-command-sentinel', command_args: ['private-argument-sentinel', '{request}'] },
    voice_profiles: {
      en: { tts_provider: 'windows-speech', voice_id: 'local-English' },
      vi: { tts_provider: 'command', voice_id: 'keep-Vietnamese', command: 'private-command-sentinel', command_args: ['{request}'] },
      ja: { tts_provider: 'azure-speech', voice_id: 'ja-JP-NanamiNeural', base_url: 'https://fixture.invalid' },
    },
    localMetadata: { preserve: 'existing local settings' },
  };
  const file = path.join(repoRoot, 'config/voice.yaml'); await fs.writeFile(file, YAML.stringify(original));
  const app = await buildServer({ repoRoot, projectsRoot }); t.after(() => app.close());
  return { app, file, original, projectsRoot };
}

test('public voice catalog exposes language profiles without executable fields or private command values and GET preserves bytes', async t => {
  const { app, file } = await voiceApi(t), before = await fs.readFile(file);
  const response = await app.inject({ url: '/api/voices' });
  assert.equal(response.statusCode, 200, response.body);
  const catalog = response.json(); assert.ok(['available', 'unavailable'].includes(catalog.windows.status));
  assert.equal(catalog.profiles.en.voice_id, 'local-English'); assert.equal(catalog.profiles.ja.voice_id, 'ja-JP-NanamiNeural');
  for (const profile of Object.values(catalog.profiles) as Record<string, unknown>[]) {
    assert.equal(Object.hasOwn(profile, 'command'), false); assert.equal(Object.hasOwn(profile, 'command_args'), false);
  }
  assert.doesNotMatch(response.body, /private-command-sentinel|private-argument-sentinel/);
  assert.deepEqual(await fs.readFile(file), before);
});

test('saving a language default preserves global voice, other profiles and metadata without copying a command into Azure', async t => {
  const { app, file, original } = await voiceApi(t);
  const response = await app.inject({ method: 'PUT', url: '/api/settings/voice?language=ko', payload: {
    tts_provider: 'azure-speech', voice_id: 'ko-KR-SunHiNeural', base_url: 'https://fixture.invalid', api_key_env: 'MULTILINGUAL_UNIT_AZURE_KEY',
  } });
  assert.equal(response.statusCode, 200, response.body);
  const saved = YAML.parse(await fs.readFile(file, 'utf8'));
  assert.deepEqual(saved.voice, original.voice); assert.deepEqual(saved.localMetadata, original.localMetadata);
  for (const language of ['en', 'vi', 'ja'] as const) assert.deepEqual(saved.voice_profiles[language], original.voice_profiles[language]);
  assert.equal(saved.voice_profiles.ko.voice_id, 'ko-KR-SunHiNeural');
  assert.equal(saved.voice_profiles.ko.command, undefined); assert.deepEqual(saved.voice_profiles.ko.command_args ?? [], []);
  assert.doesNotMatch(response.body, /private-command-sentinel|private-argument-sentinel/);
});

test('saving a global default keeps every per-language profile and clears an inherited command on provider switch', async t => {
  const { app, file, original } = await voiceApi(t);
  const response = await app.inject({ method: 'PUT', url: '/api/settings/voice', payload: { tts_provider: 'windows-speech', voice_id: 'local-English' } });
  assert.equal(response.statusCode, 200, response.body);
  const saved = YAML.parse(await fs.readFile(file, 'utf8'));
  assert.deepEqual(saved.voice_profiles, original.voice_profiles); assert.deepEqual(saved.localMetadata, original.localMetadata);
  assert.equal(saved.voice.tts_provider, 'windows-speech'); assert.equal(saved.voice.command, undefined);
  assert.deepEqual(saved.voice.command_args ?? [], []);
});

test('public default voice edits reject executable injection and URL credentials atomically', async t => {
  const { app, file } = await voiceApi(t), before = await fs.readFile(file);
  for (const payload of [
    { command: 'injected-executable' }, { command_args: ['injected-argument'] },
    { tts_provider: 'http', base_url: 'https://username:password@fixture.invalid' },
  ]) {
    const response = await app.inject({ method: 'PUT', url: '/api/settings/voice?language=en', payload });
    assert.equal(response.statusCode, 422, response.body);
    assert.deepEqual(await fs.readFile(file), before);
  }
});

test('public project voice settings reject executable fields atomically for every provider', async t => {
  const { app, file, projectsRoot } = await voiceApi(t), root = await createProject('fixture', { root: projectsRoot });
  await fs.writeFile(path.join(root, 'input/script.txt'), 'Keep this canonical narration.');
  const state = await loadState(root); state.state = 'SCENES_READY'; state.narrationInputHash = 'unchanged-narration';
  state.locked = { 'shot:approved': true }; await saveState(root, state);
  const files = [file, path.join(root, 'project.yaml'), path.join(root, 'project-state.json'), path.join(root, 'input/script.txt')];
  const before = await Promise.all(files.map(name => fs.readFile(name)));
  for (const voice of [
    { tts_provider: 'command', command: 'injected-executable' },
    { command_args: ['injected-argument', '{request}'] },
    { tts_provider: 'windows-speech', command: 'injected-unused-executable' },
  ]) {
    const response = await app.inject({ method: 'PATCH', url: '/api/projects/fixture/settings', payload: { voice } });
    assert.equal(response.statusCode, 422, response.body);
    assert.equal(response.json().error.code, 'VALIDATION_FAILED');
    assert.doesNotMatch(response.body, /injected-executable|injected-argument|injected-unused-executable/);
    assert.deepEqual(await Promise.all(files.map(name => fs.readFile(name))), before);
  }
});

test('public project details redact command voice fields while retaining the narration language', async t => {
  const { app, projectsRoot } = await voiceApi(t), root = await createProject('fixture', { root: projectsRoot });
  const file = path.join(root, 'project.yaml'), raw = YAML.parse(await fs.readFile(file, 'utf8'));
  raw.project.language = 'ja-JP'; raw.voice = { tts_provider: 'command', voice_id: 'private-local-voice', command: 'private-command-sentinel', command_args: ['private-argument-sentinel', '{request}'] };
  await fs.writeFile(file, YAML.stringify(raw)); const before = await fs.readFile(file);
  const response = await app.inject({ url: '/api/projects/fixture' });
  assert.equal(response.statusCode, 200, response.body); const detail = response.json();
  assert.equal(detail.settings.language, 'ja-JP'); assert.equal(detail.settings.voice.tts_provider, 'command');
  assert.equal(Object.hasOwn(detail.settings.voice, 'command'), false); assert.equal(Object.hasOwn(detail.settings.voice, 'command_args'), false);
  assert.doesNotMatch(response.body, /private-command-sentinel|private-argument-sentinel/);
  assert.deepEqual(await fs.readFile(file), before);
});

test('language changes reset stale ASR primary language and narration state without changing original WAV bytes or locks', async t => {
  const root = await settingsFixture(t, { project: { name: 'asr-reset', language: 'vi' }, input: { mode: 'wav' }, asr: { language: 'vi' }, voice: { source: 'input' } });
  const input = Buffer.from('original input bytes'), file = path.join(root, 'input/narration.wav'); await fs.writeFile(file, input);
  const state = await loadState(root); state.state = 'SCENES_READY'; state.narrationInputHash = 'old-Vietnamese'; state.locked = { 'shot:keep': true };
  await saveState(root, state);
  for (const locale of ['en-US', 'ja-JP', 'ko-KR', 'vi-VN']) {
    await updateSettings(root, { language: locale }); const config = await loadConfig(root);
    assert.equal(config.project.language, locale); assert.equal(config.asr.language, primaryLanguage(locale));
    const changed = await loadState(root); assert.equal(changed.state, 'NEW'); assert.deepEqual(changed.locked, { 'shot:keep': true });
    assert.notEqual(changed.narrationInputHash, 'old-Vietnamese'); assert.deepEqual(await fs.readFile(file), input);
  }
});

function environment(t: TestContext, values: Record<string, string | undefined>) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}

function pcmWave(): Buffer {
  const rate = 24000, samples = rate * .4, data = Buffer.alloc(44 + samples * 2);
  data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) data.writeInt16LE(Math.round(6000 * Math.sin(2 * Math.PI * 440 * i / rate)), 44 + i * 2);
  return data;
}

for (const locale of ['en-US', 'vi-VN', 'ja-JP', 'ko-KR']) test(`${locale}: ingest passes only the primary ASR language without invoking a real recognizer`, async t => {
  const root = await settingsFixture(t, { project: { name: 'locale-ingest', language: locale } }), script = path.join(root, 'capture-asr.cjs');
  await fs.writeFile(path.join(root, 'input/narration.wav'), pcmWave());
  await fs.writeFile(script, `const fs=require('node:fs'); const args=process.argv.slice(2); const value=k=>args[args.indexOf(k)+1];
fs.writeFileSync('asr-arguments.json',JSON.stringify(args)); const endMs=Number(value('--duration-ms'));
fs.writeFileSync(value('--output'),JSON.stringify({mode:'wav',durationMs:endMs,segments:[{id:'seg001',startMs:0,endMs,text:'Locale fixture'}],words:[{text:'Locale',startMs:0,endMs}]}));
fs.writeFileSync(value('--diagnostics'),JSON.stringify({operation:'unit-fixture',downloadsAllowed:false}));`);
  environment(t, { VIDEO_FACTORY_PYTHON: process.execPath, VIDEO_FACTORY_ASR_SCRIPT: script, VIDEO_FACTORY_ALIGN_MODEL: undefined });
  const config = ConfigSchema.parse({ project: { language: locale }, input: { mode: 'wav' }, asr: { allow_downloads: false } });
  const original = await fs.readFile(path.join(root, 'input/narration.wav'));
  const result = await ingestProject(root, config, new ModelRouter(config, root));
  assert.equal(result.narration.mode, 'wav'); assert.equal(result.story.language, locale);
  const args = await readJson<string[]>(path.join(root, 'asr-arguments.json'));
  assert.equal(args[args.indexOf('--language') + 1], primaryLanguage(locale)); assert.equal(args.includes('--allow-downloads'), false);
  assert.deepEqual(await fs.readFile(path.join(root, 'input/narration.wav')), original);
});

test('Azure default voice IDs match EN/VI/JA/KO language while explicit IDs remain explicit', () => {
  for (const [language, voice] of [['en', 'en-US-JennyNeural'], ['vi', 'vi-VN-HoaiMyNeural'], ['ja', 'ja-JP-NanamiNeural'], ['ko', 'ko-KR-SunHiNeural']] as const) {
    assert.equal(azureVoiceId(ConfigSchema.parse({ project: { language }, voice: { tts_provider: 'azure-speech' } })), voice);
  }
  assert.equal(azureVoiceId(ConfigSchema.parse({ project: { language: 'ja-JP' }, voice: { voice_id: 'ja-JP-KeitaNeural' } })), 'ja-JP-KeitaNeural');
});

test('Azure SSML sends escaped verbatim UTF-8 text, matching locale/voice, PCM format and no redirects; response bytes stay exact', async t => {
  const root = await temporary(t), output = path.join(root, 'response.wav'), wave = pcmWave();
  const text = `東京 & 서울 <steam> "quoted" '声'\n  Hơi nước 🚀`;
  const keyName = 'MULTILINGUAL_UNIT_AZURE_KEY'; environment(t, { [keyName]: 'unit-only-value' });
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init }); return new Response(new Uint8Array(wave), { headers: { 'content-type': 'audio/wav' } });
  });
  const config = ConfigSchema.parse({ project: { language: 'ja-JP' }, voice: { tts_provider: 'azure-speech', voice_id: 'ja-JP-NanamiNeural', base_url: 'https://fixture.invalid', api_key_env: keyName } });
  await synthesizeAzure(config, text, output); assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, 'https://fixture.invalid/cognitiveservices/v1');
  const init = calls[0]!.init!, headers = new Headers(init.headers);
  assert.equal(init.method, 'POST'); assert.equal(init.redirect, 'error');
  assert.equal(headers.get('Content-Type'), 'application/ssml+xml');
  assert.equal(headers.get('Ocp-Apim-Subscription-Key'), 'unit-only-value');
  assert.equal(headers.get('X-Microsoft-OutputFormat'), 'riff-24khz-16bit-mono-pcm');
  const expected = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP"><voice name="ja-JP-NanamiNeural">東京 &amp; 서울 &lt;steam&gt; &quot;quoted&quot; &apos;声&apos;\n  Hơi nước 🚀</voice></speak>`;
  assert.deepEqual(Buffer.from(String(init.body), 'utf8'), Buffer.from(expected, 'utf8'));
  assert.deepEqual(await fs.readFile(output), wave);
});

test('Azure rejects wrong primary language, wrong explicit locale, unsafe endpoints and missing key before network or output writes', async t => {
  const root = await temporary(t), output = path.join(root, 'keep.wav'), original = Buffer.from('unchanged bytes'); await fs.writeFile(output, original);
  const keyName = 'MULTILINGUAL_UNIT_MISSING_AZURE_KEY'; environment(t, { [keyName]: undefined }); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('network must not be reached'); });
  for (const [language, voice, endpoint, message] of [
    ['ja-JP', 'en-US-JennyNeural', 'https://fixture.invalid', /voice language does not match/],
    ['en-GB', 'en-US-JennyNeural', 'https://fixture.invalid', /voice language does not match/],
    ['ja-JP', 'ja-JP-NanamiNeural', 'http://fixture.invalid', /HTTPS endpoint/],
    ['ja-JP', 'ja-JP-NanamiNeural', 'https://name:password@fixture.invalid', /HTTPS endpoint/],
    ['ja-JP', 'ja-JP-NanamiNeural', 'https://fixture.invalid', /MULTILINGUAL_UNIT_MISSING_AZURE_KEY environment variable/],
  ] as const) {
    const config = ConfigSchema.parse({ project: { language }, voice: { tts_provider: 'azure-speech', voice_id: voice, base_url: endpoint, api_key_env: keyName } });
    await assert.rejects(synthesizeAzure(config, '保存する本文。', output), message);
    assert.deepEqual(await fs.readFile(output), original);
  }
  assert.equal(calls, 0);
});

test('speech HTTP status/type/empty-body/size failures leave an existing output byte-identical', async t => {
  const root = await temporary(t), output = path.join(root, 'keep.wav'), original = pcmWave(); await fs.writeFile(output, original);
  for (const [response, error] of [
    [new Response('failure', { status: 503 }), /TTS HTTP 503/],
    [new Response('not audio', { headers: { 'content-type': 'text/html' } }), /must return WAV bytes/],
    [new Response(null, { headers: { 'content-type': 'audio/wav' } }), /Empty TTS response/],
    [new Response(new Uint8Array(32 * 1024 * 1024 + 1), { headers: { 'content-type': 'audio/wav' } }), /exceeds 32 MB/],
  ] as const) {
    await assert.rejects(writeSpeechResponse(response, output), error); assert.deepEqual(await fs.readFile(output), original);
  }
});

for (const failure of ['missing-key', 'wrong-locale', 'HTTP-503', 'invalid-WAV', 'network-failure'] as const)
  test(`Azure ${failure} blocks an official script clock, reports provider-failed, and preserves source text`, async t => {
    const root = await createProject('azure-gate', { root: await temporary(t) }), file = path.join(root, 'project.yaml');
    const raw = YAML.parse(await fs.readFile(file, 'utf8'));
    raw.project.language = 'ja-JP'; raw.input.mode = 'script';
    raw.voice = { tts_provider: 'azure-speech', voice_id: failure === 'wrong-locale' ? 'en-US-JennyNeural' : 'ja-JP-NanamiNeural', base_url: 'https://fixture.invalid', api_key_env: 'MULTILINGUAL_UNIT_AZURE_GATE_KEY' };
    await fs.writeFile(file, YAML.stringify(raw));
    const text = '蒸気は凝縮器へ進む。'; await fs.writeFile(path.join(root, 'input/script.txt'), text);
    environment(t, { MULTILINGUAL_UNIT_AZURE_GATE_KEY: failure === 'missing-key' ? undefined : 'unit-only-value' });
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => {
      calls++;
      if (failure === 'network-failure') throw new Error('fixture network failure');
      return failure === 'HTTP-503' ? new Response('unavailable', { status: 503 })
        : new Response('not RIFF/WAVE audio', { headers: { 'content-type': 'audio/wav' } });
    });
    const state = await runPipeline(root, { until: 'TIMED' });
    assert.equal(state.state, 'INGESTED'); assert.equal(state.waitingFor, 'voice');
    const report = await readJson<{ status: string; error: string; language: string }>(path.join(root, 'work/voice-report.json'));
    assert.equal(report.status, 'provider-failed'); assert.equal(report.language, 'ja-JP');
    assert.match(report.error, failure === 'missing-key' ? /MULTILINGUAL_UNIT_AZURE_GATE_KEY environment variable/
      : failure === 'wrong-locale' ? /voice language does not match/ : failure === 'HTTP-503' ? /TTS HTTP 503/
      : failure === 'invalid-WAV' ? /did not produce a WAV file/ : /fixture network failure/);
    assert.equal(calls, ['missing-key', 'wrong-locale'].includes(failure) ? 0 : 1);
    assert.equal(await fs.readFile(path.join(root, 'input/script.txt'), 'utf8'), text);
    const document = await readJson<ScriptDocument>(path.join(root, 'work/script.json'));
    assert.equal(document.original, text); assert.equal(rebuiltParagraph(document, 0), text);
    for (const absent of ['work/narration.json', 'work/timeline.json', 'output/final.mp4']) assert.equal(await exists(path.join(root, absent)), false);
  });

test('existing HTTP TTS posts each EN/VI/JA/KO narration locale and exact script text with the selected voice', async t => {
  const wave = pcmWave(), requests: Array<{ text: string; language: string; voice: string; format: string }> = [];
  const server = http.createServer(async (request, response) => {
    let body = ''; for await (const part of request) body += part;
    requests.push(JSON.parse(body)); response.writeHead(200, { 'content-type': 'audio/wav' }); response.end(wave);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  for (const [language, text] of [
    ['en-US', 'Steam & energy remain distinct.'], ['vi-VN', 'Hơi nước và năng lượng khác nhau.'],
    ['ja-JP', '東京の蒸気は凝縮器へ進みます。'], ['ko-KR', '증기는 별도 응축기로 이동합니다.'],
  ] as const) {
    const root = await temporary(t); await fs.mkdir(path.join(root, 'work'));
    const config = ConfigSchema.parse({ project: { language }, voice: { tts_provider: 'http', base_url: url, voice_id: 'language-fixture', api_key_env: 'MULTILINGUAL_UNIT_HTTP_UNUSED' } });
    environment(t, { MULTILINGUAL_UNIT_HTTP_UNUSED: undefined });
    const document = parseScript(text), before = structuredClone(document), narration = await narrateScript(root, config, document);
    assert.ok(narration, JSON.stringify(await readJson(path.join(root, 'work/voice-report.json'))));
    assert.deepEqual(document, before); assert.deepEqual(narration.segments.map(s => s.text), document.chunks.map(c => c.text));
    assert.deepEqual(requests.at(-1), { text, language, voice: 'language-fixture', format: 'wav' });
    const report = await readJson<{ status: string; language: string; textPreserved: boolean }>(path.join(root, 'work/voice-report.json'));
    assert.equal(report.status, 'ready'); assert.equal(report.language, language); assert.equal(report.textPreserved, true);
  }
  assert.equal(requests.length, 4);
});

test('HTTP field mapping preserves verbatim narration and nullable fields without allowing protected overrides', () => {
  const text = '東京 & Seoul\n  Steam "quoted"';
  const config = ConfigSchema.parse({ project: { language: 'ja-JP' }, voice: {
    tts_provider: 'http', base_url: 'http://127.0.0.1:1234/speak', model: 'local-model', voice_id: 'speaker',
    http_fields: { text: 'utterance', language: 'locale', voice: 'speaker', model: 'engine', format: 'encoding' },
    http_extra_body: { temperature: .4, nested: { preserve: true } },
  } });
  assert.deepEqual(externalSpeechRequest(config, text), { endpoint: 'http://127.0.0.1:1234/speak', body: {
    temperature: .4, nested: { preserve: true }, utterance: text, locale: 'ja-JP', speaker: 'speaker', engine: 'local-model', encoding: 'wav',
  } });
  for (const name of ['utterance', 'locale', 'speaker', 'engine', 'encoding']) {
    const changed = structuredClone(config); changed.voice.http_extra_body = { [name]: 'replace' };
    assert.throws(() => externalSpeechRequest(changed, text), /cannot override/);
  }
  const nullable = structuredClone(config); nullable.voice.http_fields = { text: 'utterance', language: null, voice: null, model: null, format: null };
  nullable.voice.http_extra_body = null; assert.deepEqual(externalSpeechRequest(nullable, text).body, { utterance: text });
  nullable.voice.http_fields = null;
  assert.deepEqual(externalSpeechRequest(nullable, text).body, { text, language: 'ja-JP', voice: 'speaker', model: 'local-model', format: 'wav' });
  const duplicate = structuredClone(config); duplicate.voice.http_fields = { text: 'same', language: 'same' };
  assert.throws(() => externalSpeechRequest(duplicate, text), /must be distinct/);
  assert.equal(ConfigSchema.safeParse({ voice: { http_fields: { language: 'locale' } } }).success, false);
});

for (const provider of ['openai-compatible', 'omnivoice-studio'] as const)
  test(`${provider}: root/v1/speech routes, model/default voice and protected WAV contract are exact`, () => {
    const text = '한국어とEnglish & tiếng Việt';
    for (const route of ['', '/v1', '/v1/', '/v1/audio/speech']) {
      const config = ConfigSchema.parse({ project: { language: 'ko-KR' }, voice: {
        tts_provider: provider, base_url: 'http://127.0.0.1:1234' + route,
        ...(provider === 'openai-compatible' ? { model: 'own-api' } : {}), http_extra_body: { seed: 7 },
      } });
      assert.deepEqual(externalSpeechRequest(config, text), { endpoint: 'http://127.0.0.1:1234/v1/audio/speech', body: {
        seed: 7, input: text, model: provider === 'openai-compatible' ? 'own-api' : 'omnivoice', voice: 'default', response_format: 'wav', speed: 1,
        ...(provider === 'omnivoice-studio' ? { language: 'ko' } : {}),
      } });
      for (const field of ['input', 'model', 'voice', 'response_format', 'speed', 'stream_format', 'language']) {
        const changed = structuredClone(config); changed.voice.http_extra_body = { [field]: 'override' };
        assert.throws(() => externalSpeechRequest(changed, text), /cannot override/);
      }
    }
    if (provider === 'openai-compatible') assert.throws(() => externalSpeechRequest(ConfigSchema.parse({ voice: {
      tts_provider: provider, base_url: 'http://127.0.0.1:1234', model: null,
    } }), text), /requires voice.model/);
  });

test('external endpoint validation rejects credentials and non-HTTP protocols before synthesis', () => {
  for (const url of ['https://user:password@fixture.invalid', 'file:///tmp/speech']) {
    assert.throws(() => externalSpeechRequest(ConfigSchema.parse({ voice: { tts_provider: 'http', base_url: url } }), 'keep'), /without URL credentials/);
  }
});

async function localSpeechStub(t: TestContext) {
  const requests: Array<{ route: string; body: Record<string, unknown>; authorization: string | undefined }> = [];
  const server = http.createServer(async (request, response) => {
    let body = ''; for await (const part of request) body += part;
    requests.push({ route: request.url!, body: JSON.parse(body), authorization: request.headers.authorization });
    response.writeHead(200, { 'content-type': 'audio/wav' }); response.end(pcmWave());
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  return { requests, url: `http://127.0.0.1:${(server.address() as { port: number }).port}` };
}

test('all three external protocols send exact JSON to a real local stub and preserve returned WAV bytes', async t => {
  const { requests, url } = await localSpeechStub(t), root = await temporary(t), text = 'Steam & 蒸気\n  증기.';
  environment(t, { MULTILINGUAL_UNIT_EXTERNAL_KEY: 'fixture-only-key' });
  for (const provider of ['http', 'openai-compatible', 'omnivoice-studio'] as const) {
    const config = ConfigSchema.parse({ project: { language: 'ja-JP' }, voice: {
      tts_provider: provider, base_url: url, model: 'local-speech', voice_id: 'speaker-A', api_key_env: 'MULTILINGUAL_UNIT_EXTERNAL_KEY',
      http_extra_body: { seed: 42 },
    } });
    const output = path.join(root, provider + '.wav'); await synthesizeExternal(config, text, output);
    const expected = externalSpeechRequest(config, text), actual = requests.at(-1)!;
    assert.equal(actual.route, new URL(expected.endpoint).pathname); assert.deepEqual(actual.body, expected.body);
    assert.equal(actual.authorization, 'Bearer fixture-only-key'); assert.deepEqual(await fs.readFile(output), pcmWave());
  }
  assert.equal(requests.length, 3);
});

for (const mode of ['script', 'srt'] as const) test(`${mode}: audio cache regenerates on model/options/voice/language/fields and reuses identical requests`, async t => {
  const { requests, url } = await localSpeechStub(t), root = await temporary(t); await fs.mkdir(path.join(root, 'work'));
  environment(t, { MULTILINGUAL_UNIT_CACHE_KEY: undefined });
  const config = ConfigSchema.parse({ project: { language: 'en' }, voice: {
    tts_provider: 'http', base_url: url, model: 'model-A', voice_id: 'voice-A', api_key_env: 'MULTILINGUAL_UNIT_CACHE_KEY',
  } });
  const document = parseScript('Steam carries heat.'), original = structuredClone(document);
  const canonical = NarrationSchema.parse({ mode: 'srt', durationMs: 1000, segments: [{ id: 'seg001', text: document.text, startMs: 0, endMs: 1000 }], words: [] });
  const invoke = async () => {
    if (mode === 'script') {
      const narration = await narrateScript(root, config, document); assert.ok(narration);
      assert.deepEqual(document, original); assert.deepEqual(narration.segments.map(s => s.text), document.chunks.map(c => c.text));
      assert.equal(narration.durationMs, 400);
    } else {
      const result = await resolveVoice(root, config, canonical); assert.equal(result.report.status, 'ready', result.report.error);
      assert.deepEqual(result.narration.segments, canonical.segments); assert.equal(result.narration.durationMs, canonical.durationMs);
      assert.equal(canonical.audioPath, undefined); assert.ok(result.activity.intervals.length);
    }
  };
  await invoke(); assert.equal(requests.length, 1); await invoke(); assert.equal(requests.length, 1);
  const mutations = [
    () => { config.voice.model = 'model-B'; }, () => { config.voice.http_extra_body = { seed: 2 }; },
    () => { config.voice.voice_id = 'voice-B'; }, () => { config.project.language = 'ko-KR'; },
    () => { config.voice.http_fields = { text: 'utterance', language: 'locale', voice: 'speaker', model: 'engine', format: 'encoding' }; },
  ];
  for (const [index, change] of mutations.entries()) {
    change(); await invoke(); assert.equal(requests.length, index + 2);
    assert.deepEqual(requests.at(-1)!.body, externalSpeechRequest(config, document.text).body);
  }
});

// Source0.89 DECLARED / NOT RUN: the human test model alone executes this callback.
test('dialogue TTS keeps actor voices, measured clocks and per-cue cache; missing role stops before requests',async t=>{
  const {requests,url}=await localSpeechStub(t),root=await temporary(t);
  await fs.mkdir(path.join(root,'work'));environment(t,{DIALOGUE_UNIT_TTS_KEY:undefined});
  const config=ConfigSchema.parse({project:{language:'en'},input:{script_format:'dialogue'},voice:{
    tts_provider:'http',base_url:url,voice_id:'narrator-A',api_key_env:'DIALOGUE_UNIT_TTS_KEY',
    speaker_voices:[{speaker_id:'lila',voice_id:'lila-A'},{speaker_id:'karo',voice_id:'karo-A'}],
  }});
  const document=parseScript('[lila] Is the soup ready?\n[karo] Almost!\n[narrator] They wait.','input/script.txt','dialogue'),original=structuredClone(document);
  const first=await narrateScript(root,config,document);assert.ok(first);
  assert.deepEqual(requests.map(r=>[r.body.text,r.body.voice]),[['Is the soup ready?','lila-A'],['Almost!','karo-A'],['They wait.','narrator-A']]);
  assert.deepEqual(first.segments.map(c=>[c.speakerId,c.startMs,c.endMs]),[['lila',0,400],['karo',650,1050],['narrator',1300,1700]]);
  assert.equal(first.durationMs,1700);assert.deepEqual(document,original);
  const report=await readJson<{status:string;cues:Array<{speakerId:string;voiceId:string;rawDurationMs:number}>}>(path.join(root,'work/voice-report.json'));
  assert.equal(report.status,'ready');assert.deepEqual(report.cues.map(c=>[c.speakerId,c.voiceId,c.rawDurationMs]),[['lila','lila-A',400],['karo','karo-A',400],['narrator','narrator-A',400]]);
  await narrateScript(root,config,document);assert.equal(requests.length,3);
  config.voice.speaker_voices![0]!.voice_id='lila-B';
  assert.ok(await narrateScript(root,config,document));assert.equal(requests.length,4);
  assert.deepEqual([requests.at(-1)!.body.text,requests.at(-1)!.body.voice],['Is the soup ready?','lila-B']);
  config.voice.speaker_voices=config.voice.speaker_voices!.slice(0,1);
  assert.equal(await narrateScript(root,config,document),undefined);assert.equal(requests.length,4);
  const missing=await readJson<{status:string;error:string}>(path.join(root,'work/voice-report.json'));
  assert.equal(missing.status,'needs-voice');assert.match(missing.error,/karo/);assert.deepEqual(document,original);
});

for (const failure of ['timeout', 'malformed-audio', 'not-WAV', 'HTTP-503'] as const)
  test(`external ${failure}: no canonical narration/timeline/final output escapes the voice gate`, async t => {
    const root = await createProject('external-gate', { root: await temporary(t) }), file = path.join(root, 'project.yaml');
    const raw = YAML.parse(await fs.readFile(file, 'utf8')), text = 'Steam carries heat.';
    raw.project.language = 'en'; raw.input.mode = 'script'; raw.voice = {
      tts_provider: 'openai-compatible', base_url: 'http://fixture.invalid', model: 'local-model', timeout_ms: 80, api_key_env: 'MULTILINGUAL_UNIT_GATE_UNUSED',
    };
    await fs.writeFile(file, YAML.stringify(raw)); await fs.writeFile(path.join(root, 'input/script.txt'), text);
    environment(t, { MULTILINGUAL_UNIT_GATE_UNUSED: undefined }); let calls = 0;
    t.mock.method(globalThis, 'fetch', async (_input: unknown, init?: RequestInit): Promise<Response> => {
      calls++;
      if (failure === 'timeout') return new Promise((_, reject) => {
        const keepAlive = setTimeout(() => reject(new Error('fixture abort signal was not delivered')), 2000);
        t.after(() => clearTimeout(keepAlive));
        const signal = init!.signal!; if (signal.aborted) reject(signal.reason); else signal.addEventListener('abort', () => { clearTimeout(keepAlive); reject(signal.reason); }, { once: true });
      });
      if (failure === 'HTTP-503') return new Response('unavailable', { status: 503 });
      const bytes = failure === 'not-WAV' ? Buffer.from('not a WAV') : Buffer.from('RIFF0000WAVEbroken');
      return new Response(new Uint8Array(bytes), { headers: { 'content-type': 'audio/wav' } });
    });
    const state = await runPipeline(root, { until: 'TIMED' }); assert.equal(state.state, 'INGESTED'); assert.equal(state.waitingFor, 'voice');
    const report = await readJson<{ status: string; language: string; error: string }>(path.join(root, 'work/voice-report.json'));
    assert.equal(report.status, 'provider-failed'); assert.equal(report.language, 'en'); assert.equal(calls, 1);
    assert.ok(report.error.length > 0);
    if (failure === 'timeout') assert.match(report.error, /timeout|timed out|aborted/i);
    if (failure === 'not-WAV') assert.match(report.error, /did not produce a WAV file/);
    if (failure === 'HTTP-503') assert.match(report.error, /TTS HTTP 503/);
    assert.equal(await fs.readFile(path.join(root, 'input/script.txt'), 'utf8'), text);
    const document = await readJson<ScriptDocument>(path.join(root, 'work/script.json')); assert.equal(document.original, text);
    for (const absent of ['work/narration.json', 'work/timeline.json', 'output/final.mp4']) assert.equal(await exists(path.join(root, absent)), false);
  });
