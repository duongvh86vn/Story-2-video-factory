import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test, { type TestContext } from 'node:test';
import { literalSubtitleTrack, verifyLiteralSubtitles } from '../packages/captions/literal.js';
import { toSrt } from '../packages/captions/index.js';
import { produceMedia, ffmpeg } from '../packages/audio/index.js';
import type { Narration } from '../packages/core/schemas.js';
import { parseSrtDocument } from '../packages/ingest/srt.js';
import { createLegacyProject, temporary, config, shot } from './support.js';
import { runPipeline } from '../packages/orchestrator/index.js';
import { loadState, saveState } from '../packages/orchestrator/state-machine.js';
import { hash } from '../packages/core/utils.js';
import { ProductionStore } from '../packages/orchestrator/store.js';

const executeFile = promisify(execFile);
const texts = [
  'Steam, heat and a cylinder.', ' Hơn nhất được sẵn đến bình cường siên, siên được sự nóng.',
  '   Steam stays hot.', 'Steam stays hot.   ', '  Steam stays hot.  ', ' first line \n  second line  ',
  '“Steam”: 2+2=4; [literal] & <>?!', 'Literal {braces} and {\\an8} override-looking.',
  'C:\\voices\\name; \\N \\n \\h \\\\ end', '<b>bold</b> <i>italic</i> <u>under</u> <font color="red">red</font>',
  '<steam>name</steam> <not-a-tag>', ' 日本語、한국어 và tiếng Việt 🚀 ',
];
const allCues = (): Narration => ({ mode: 'srt', durationMs: 9000, words: [], segments: texts.map((text, index) => ({
  id: `cue${String(index + 1).padStart(3, '0')}`, startMs: index * 700 + 13, endMs: index * 700 + 567, text,
})) });
const single = (text = texts[1]!): Narration => ({ mode: 'srt', durationMs: 2520, words: [], segments: [{ id: 'cue001', startMs: 0, endMs: 2520, text }] });
async function workspace(t: TestContext, label: string) {
  const evidence = process.env.LITERAL_SUBTITLE_TEST_EVIDENCE;
  if (!evidence) return temporary(t);
  await fs.mkdir(evidence, { recursive: true }); return fs.mkdtemp(path.join(evidence, label + '-'));
}
async function inspect(file: string, selector?: string) {
  const { stdout } = await executeFile(process.env.FFPROBE_PATH || 'ffprobe', [
    '-v', 'error', ...(selector ? ['-select_streams', selector] : []), '-show_streams', '-show_packets',
    '-show_data_hash', 'sha256', '-of', 'json', file,
  ], { windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  return JSON.parse(stdout) as { streams: Array<{ time_base: string; codec_type: string; codec_name: string; tags?: Record<string, string> }>;
    packets: Array<{ pos: string; size: string; pts: number; duration: number; data_hash: string }> };
}
/** Independent file reads and rational timestamp arithmetic, without the candidate verifier. */
async function storedSamples(file: string, narration: Narration) {
  const envelope = await inspect(file, 's:0'), bytes = await fs.readFile(file);
  assert.equal(envelope.streams.length, 1); assert.equal(envelope.streams[0]!.codec_name, 'mov_text');
  const [numerator, denominator] = envelope.streams[0]!.time_base.split('/').map(value => BigInt(value));
  const rows: Array<{ id: string; offset: number; length: number; utf8Hex: string; text: string; pts: number; duration: number }> = [];
  for (const packet of envelope.packets) {
    const offset = Number(packet.pos), length = Number(packet.size);
    assert.ok(Number.isSafeInteger(offset) && Number.isSafeInteger(length) && offset >= 0 && length >= 2 && offset + length <= bytes.length);
    const payload = bytes.subarray(offset, offset + length), textLength = payload.readUInt16BE(0);
    if (length === 2) { assert.equal(textLength, 0); continue; }
    const cue = narration.segments[rows.length]; assert.ok(cue, 'Unexpected nonempty subtitle sample');
    const expected = Buffer.from(cue.text, 'utf8');
    assert.equal(textLength, expected.length); assert.equal(length, expected.length + 2);
    assert.deepEqual(payload.subarray(2), expected); assert.equal(payload.subarray(2).toString('utf8'), cue.text);
    assert.equal(BigInt(packet.pts) * numerator! * 1000n, BigInt(cue.startMs) * denominator!);
    assert.equal(BigInt(packet.duration) * numerator! * 1000n, BigInt(cue.endMs - cue.startMs) * denominator!);
    rows.push({ id: cue.id, offset, length, utf8Hex: payload.subarray(2).toString('hex'), text: cue.text, pts: packet.pts, duration: packet.duration });
  }
  assert.equal(rows.length, narration.segments.length);
  return { rows, timeBase: envelope.streams[0]!.time_base, language: envelope.streams[0]!.tags?.language, fileHash: hash(bytes) };
}
async function save(root: string, name: string, value: unknown) { await fs.writeFile(path.join(root, name), JSON.stringify(value, null, 2) + '\n'); }

test('original v227 leading whitespace exists in stored samples at the original 0–2520 ms clock; extraction is recorded independently', async t => {
  const root = await workspace(t, 'original'), settings = config(), narration = single(), before = structuredClone(narration);
  await fs.mkdir(path.join(root, 'work')); const canonical = toSrt(narration); await fs.writeFile(path.join(root, 'canonical.srt'), canonical);
  const track = await literalSubtitleTrack(root, settings, narration), audit = await storedSamples(track, narration);
  assert.deepEqual(narration, before); assert.equal(audit.rows[0]!.utf8Hex.slice(0, 2), '20');
  await ffmpeg(root, settings, ['-y', '-i', track, '-map', '0:s:0', '-c:s', 'srt', path.join(root, 'extracted.srt')]);
  const extracted = await fs.readFile(path.join(root, 'extracted.srt'), 'utf8'), actual = parseSrtDocument(extracted).cues[0]!;
  assert.equal(actual.startMs, 0); assert.equal(actual.endMs, 2520);
  assert.equal(await fs.readFile(path.join(root, 'canonical.srt'), 'utf8'), canonical);
  await save(root, 'independent-audit.json', { stored: audit, exportedCanonical: canonical, extracted, extractedText: actual.text, extractedExact: actual.text === narration.segments[0]!.text });
});

test('all 12 diagnostic literals and non-centisecond clocks survive placeholder replacement as exact UTF-8 samples', async t => {
  const root = await workspace(t, 'twelve'), settings = config(), narration = allCues(), before = structuredClone(narration);
  const track = await literalSubtitleTrack(root, settings, narration);
  await save(root, 'independent-audit.json', await storedSamples(track, narration)); assert.deepEqual(narration, before);
});

async function mediaFixture(t: TestContext, label: string) {
  const root = await workspace(t, label), settings = config(), narration = { ...allCues(), mode: 'wav' as const, audioPath: 'input/narration.wav' };
  settings.rendering.final = { width: 320, height: 180, fps: 30, quality: 'delivery' }; settings.captions.font_size = 12;
  for (const dir of ['work', 'input', 'output']) await fs.mkdir(path.join(root, dir));
  await ffmpeg(root, settings, ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30:duration=9', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', path.join(root, 'work/rendered.mp4')]);
  await ffmpeg(root, settings, ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=9', '-c:a', 'pcm_s16le', path.join(root, 'input/narration.wav')]);
  return { root, settings, narration, storyboard: { shots: [shot({ endMs: 9000 })] } };
}

test('a literal subtitle stream-copy mux leaves both existing video and AAC packet bodies intact and fully decodable', async t => {
  const { root, settings, narration } = await mediaFixture(t, 'packet-copy');
  const base = path.join(root, 'base.mp4'), final = path.join(root, 'copy.mp4');
  await ffmpeg(root, settings, ['-y', '-i', path.join(root, 'work/rendered.mp4'), '-i', path.join(root, narration.audioPath), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', base]);
  const track = await literalSubtitleTrack(root, settings, narration);
  await ffmpeg(root, settings, ['-y', '-i', base, '-i', track, '-map', '0:v', '-map', '0:a', '-map', '1:s', '-c', 'copy', final]);
  for (const selector of ['v:0', 'a:0']) {
    const before = await inspect(base, selector), after = await inspect(final, selector);
    assert.ok(before.packets.length); assert.deepEqual(after.packets.map(p => p.data_hash), before.packets.map(p => p.data_hash));
    await save(root, selector.startsWith('v') ? 'video-packet-hashes.json' : 'audio-packet-hashes.json', { before, after });
  }
  await ffmpeg(root, settings, ['-i', final, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-']);
  await save(root, 'independent-audit.json', await storedSamples(final, narration));
});

for (const [language, tag] of [['en-US', 'eng'], ['ja-JP', 'jpn'], ['ko-KR', 'kor']] as const)
  for (const mode of ['soft', 'both'] as const) test(`produceMedia ${mode}/${language}: exact literal samples/SRT, correct locale tag, finite decodable audio/video`, async t => {
    const { root, settings, narration, storyboard } = await mediaFixture(t, mode + '-' + language);
    settings.project.language = language; settings.captions.mode = mode;
    const before = structuredClone(narration), source = Buffer.from(toSrt(narration));
    await fs.writeFile(path.join(root, 'input/canonical.srt'), source); const voice = await fs.readFile(path.join(root, narration.audioPath));
    await produceMedia(root, settings, narration, storyboard, { assets: [] });
    const final = path.join(root, 'output/final.mp4'), audit = await storedSamples(final, narration);
    assert.equal(audit.language, tag); assert.deepEqual(narration, before);
    assert.deepEqual(await fs.readFile(path.join(root, 'output/final.srt')), source);
    assert.deepEqual(await fs.readFile(path.join(root, 'input/canonical.srt')), source);
    assert.deepEqual(await fs.readFile(path.join(root, narration.audioPath)), voice);
    const video = await inspect(final, 'v:0'), audio = await inspect(final, 'a:0');
    assert.equal(video.streams[0]!.codec_name, 'h264'); assert.equal(audio.streams[0]!.codec_name, 'aac');
    assert.ok(video.packets.length && audio.packets.length);
    if (mode === 'soft') assert.deepEqual(video.packets.map(p => p.data_hash), (await inspect(path.join(root, 'work/rendered.mp4'), 'v:0')).packets.map(p => p.data_hash));
    await ffmpeg(root, settings, ['-i', final, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-']);
    await save(root, 'independent-audit.json', { samples: audit, sourceSrtHash: hash(source), outputSrtHash: hash(await fs.readFile(path.join(root, 'output/final.srt'))), inputAudioHash: hash(voice), video, audio });
  });

for (const corruption of ['length', 'text', 'bounds'] as const) test(`actual MP4 ${corruption} tampering is rejected without rewriting the tampered bytes`, async t => {
  const root = await workspace(t, 'tamper-' + corruption), settings = config(), narration = single(' A literal cue. ');
  const track = await literalSubtitleTrack(root, settings, narration), audit = await storedSamples(track, narration), bytes = await fs.readFile(track);
  if (corruption === 'length') bytes.writeUInt16BE(1, audit.rows[0]!.offset);
  if (corruption === 'text') bytes[audit.rows[0]!.offset + 2] = 0x58;
  if (corruption === 'bounds') {
    const atom = bytes.indexOf(Buffer.from('stco')); assert.ok(atom >= 4); assert.ok(bytes.readUInt32BE(atom + 8) > 0);
    bytes.writeUInt32BE(bytes.length + 4096, atom + 12);
  }
  await fs.writeFile(track, bytes); await assert.rejects(verifyLiteralSubtitles(root, settings, track, narration));
  assert.deepEqual(await fs.readFile(track), bytes);
});

test('a one-millisecond canonical clock mismatch rejects an otherwise byte-identical real subtitle track', async t => {
  const root = await workspace(t, 'clock'), settings = config(), narration = single(' literal ');
  const track = await literalSubtitleTrack(root, settings, narration), before = await fs.readFile(track), changed = structuredClone(narration);
  changed.segments[0]!.endMs--; await assert.rejects(verifyLiteralSubtitles(root, settings, track, changed), /clock differs/);
  assert.deepEqual(await fs.readFile(track), before);
});

for (const [label, text] of [['NUL', 'Steam\0heat'], ['oversized-UTF8', 'あ'.repeat(21846)]] as const)
  test(`${label} blocks media publication and preserves an existing final and the canonical source`, async t => {
    const { root, settings, narration, storyboard } = await mediaFixture(t, 'invalid-' + label); settings.captions.mode = 'soft';
    narration.segments = [{ id: 'cue001', startMs: 13, endMs: 567, text }];
    const sentinel = Buffer.from('previous accepted final bytes'), source = Buffer.from(toSrt(narration));
    await fs.writeFile(path.join(root, 'output/final.mp4'), sentinel); await fs.writeFile(path.join(root, 'input/canonical.srt'), source);
    await assert.rejects(produceMedia(root, settings, narration, storyboard, { assets: [] }), /1–65535 UTF-8 bytes without NUL/);
    assert.deepEqual(await fs.readFile(path.join(root, 'output/final.mp4')), sentinel);
    assert.deepEqual(await fs.readFile(path.join(root, 'input/canonical.srt')), source);
  });

test('the 65535-byte UTF-8 boundary remains supported by actual placeholder generation and independent packet verification', async t => {
  const root = await workspace(t, 'maximum'), settings = config(), narration = single('あ'.repeat(21845));
  const track = await literalSubtitleTrack(root, settings, narration), audit = await storedSamples(track, narration);
  assert.equal(audit.rows[0]!.length, 65537); await save(root, 'independent-audit.json', audit);
});

test('a stale media fingerprint resumes from the existing narration clock without another ingest', async t => {
  const root = await createLegacyProject('media-fingerprint', { root: await workspace(t, 'fingerprint'), example: true });
  await runPipeline(root, { until: 'TIMED' }); const file = path.join(root, 'work/narration.json'), before = await fs.readFile(file);
  const state = await loadState(root), narrationHash = state.narrationInputHash; state.inputHash = 'obsolete-media-version'; state.state = 'DONE'; await saveState(root, state);
  const result = await runPipeline(root, { until: 'TIMED' }); assert.equal(result.state, 'TIMED'); assert.equal(result.narrationInputHash, narrationHash);
  assert.deepEqual(await fs.readFile(file), before);
  const store = new ProductionStore(root); const summary = store.summary() as { jobs: Array<{ stage: string }> }; store.close();
  assert.equal(summary.jobs.filter(job => job.stage === 'INGESTED').length, 1);
});

test('the distinct 65534-byte UTF-8 boundary preserves the complete literal sample without style padding', async t => {
  const root = await workspace(t, 'near-maximum'), settings = config(), narration = single('あ'.repeat(21844) + 'xx');
  assert.equal(Buffer.byteLength(narration.segments[0]!.text, 'utf8'), 65534);
  const track = await literalSubtitleTrack(root, settings, narration), audit = await storedSamples(track, narration);
  assert.equal(audit.rows[0]!.length, 65536); await save(root, 'independent-audit.json', audit);
});

test('the distinct 65536-byte UTF-8 boundary is rejected before overwriting an existing subtitle track', async t => {
  const root = await workspace(t, 'over-maximum'), settings = config(), narration = single('あ'.repeat(21845) + 'x');
  assert.equal(Buffer.byteLength(narration.segments[0]!.text, 'utf8'), 65536);
  const track = path.join(root, 'work/captions-literal.mp4'), sentinel = Buffer.from('previous accepted subtitle track');
  await fs.mkdir(path.dirname(track), { recursive: true }); await fs.writeFile(track, sentinel);
  await assert.rejects(literalSubtitleTrack(root, settings, narration), /1–65535 UTF-8 bytes without NUL/);
  assert.deepEqual(await fs.readFile(track), sentinel);
});

for (const length of [1000, 1001, 4094, 4095, 4096, 8191, 8192])
  test(`${length}-byte cue crosses placeholder line/chunk edges with exact Unicode bytes and millisecond clock`, async t => {
    const root = await workspace(t, 'linebound-' + length), settings = config();
    const prefix = ' あ🔬<b>{\\an8}\\N\n', suffix = '  ';
    const text = prefix + 'z'.repeat(length - Buffer.byteLength(prefix + suffix, 'utf8')) + suffix;
    const narration = single(text); narration.durationMs = 2600;
    narration.segments[0]!.startMs = 13; narration.segments[0]!.endMs = 2521;
    const before = structuredClone(narration), canonical = Buffer.from(toSrt(narration));
    assert.equal(Buffer.byteLength(text, 'utf8'), length);
    const track = await literalSubtitleTrack(root, settings, narration), audit = await storedSamples(track, narration);
    assert.equal(audit.rows[0]!.length, length + 2); assert.deepEqual(narration, before);
    assert.deepEqual(Buffer.from(toSrt(narration)), canonical);
    const placeholderSource = await fs.readFile(path.join(root, 'work/captions-placeholder.srt'), 'utf8');
    const placeholder = parseSrtDocument(placeholderSource).cues[0]!;
    assert.equal(placeholder.startMs, 13); assert.equal(placeholder.endMs, 2521);
    assert.equal(Buffer.byteLength(placeholder.text, 'ascii'), length);
    assert.match(placeholder.text, /^x+(?:\nx+)*$/);
    assert.ok(placeholder.text.split('\n').every(line => Buffer.byteLength(line, 'ascii') <= 1001));
    await save(root, 'independent-audit.json', { samples: audit, canonicalSrtHash: hash(canonical), placeholderSource });
  });
