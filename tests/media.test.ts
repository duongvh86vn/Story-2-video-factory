import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { produceMedia, ffmpeg, probe } from '../packages/audio/index.js';
import { runQC, fullyWhitelisted } from '../packages/qc/index.js';
import { hash } from '../packages/core/utils.js';
import type { Asset, Narration, Storyboard } from '../packages/core/schemas.js';
import { config, shot, temporary } from './support.js';

async function fixture(t: TestContext) {
  const root = await temporary(t), settings = config();
  settings.rendering.final = { width: 320, height: 180, fps: 15, quality: 'delivery' };
  settings.captions.mode = 'none'; settings.qc.freeze_min_seconds = 1;
  await fs.mkdir(path.join(root, 'work')); await fs.mkdir(path.join(root, 'input')); await fs.mkdir(path.join(root, 'output'));
  await ffmpeg(root, settings, ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=15:duration=6', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(root, 'work/rendered.mp4')]);
  await ffmpeg(root, settings, ['-y', '-f', 'lavfi', '-i', "aevalsrc=exprs='if(between(t,1,2)+between(t,3,4),0.2*sin(2*PI*220*t),0)':s=48000:d=6", '-c:a', 'pcm_s16le', path.join(root, 'input/narration.wav')]);
  const narration: Narration = { mode: 'wav', durationMs: 6000, audioPath: 'input/narration.wav', words: [],
    segments: [{ id: 'seg001', startMs: 1000, endMs: 2000, text: 'A caption fixture.' }, { id: 'seg002', startMs: 3000, endMs: 4000, text: 'Second caption fixture.' }] };
  const storyboard: Storyboard = { shots: [shot({ endMs: 6000, motion: ['Animated test pattern'] })] };
  return { root, settings, narration, storyboard };
}

for (const mode of ['none', 'burned', 'soft', 'both'] as const) {
  test(`FFmpeg media: ${mode} captions, duration, loudness and QC`, async t => {
    const { root, settings, narration, storyboard } = await fixture(t); settings.captions.mode = mode;
    await produceMedia(root, settings, narration, storyboard, { assets: [] });
    const metadata = await probe(root, settings, path.join(root, 'output/final.mp4'));
    assert.equal(metadata.streams.filter(stream => stream.codec_type === 'subtitle').length, ['soft', 'both'].includes(mode) ? 1 : 0);
    const report = JSON.parse(await fs.readFile(path.join(root, 'work/media-report.json'), 'utf8'));
    assert.equal(report.captionsBurnedByFfmpeg, ['burned', 'both'].includes(mode)); assert.equal(report.normalization.applied, true);
    const qc = await runQC(root, settings, narration, storyboard);
    assert.equal(qc.pass, true, JSON.stringify(qc.issues));
    const audio = (qc.video as any).audioAnalysis; assert.ok(Math.abs(Number(audio.integratedLufs) + 16) <= 2);
    if (['burned', 'both'].includes(mode)) {
      const frames: Buffer[] = [];
      for (const file of ['work/rendered.mp4', 'output/final.mp4']) {
        const result = await ffmpeg(root, settings, ['-ss', '1.5', '-i', path.join(root, file), '-map', '0:v:0', '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'ppm', '-']);
        frames.push(Buffer.from(result.stdout));
      }
      assert.notEqual(hash(frames[0]!), hash(frames[1]!));
    }
  });
}

test('QC detects injected black/freeze/silence and accepts only complete explicit whitelists', async t => {
  const { root, settings, narration, storyboard } = await fixture(t);
  await produceMedia(root, settings, narration, storyboard, { assets: [] });
  await ffmpeg(root, settings, ['-y', '-f', 'lavfi', '-i', 'color=black:size=320x180:rate=15:duration=6', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '6', '-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p', path.join(root, 'output/final.mp4')]);
  const failed = await runQC(root, settings, narration, storyboard);
  const types = (failed.issues as Array<{ type: string }>).map(issue => issue.type);
  for (const type of ['black-frames', 'frozen-frames', 'unexpected-silence', 'missing-narration']) assert.ok(types.includes(type), type);
  storyboard.shots[0]!.intentionalBlack = true; storyboard.shots[0]!.intentionalStatic = true; storyboard.shots[0]!.motion = [];
  const intentional = { ...narration, mode: 'srt' as const, audioPath: undefined };
  assert.equal((await runQC(root, settings, intentional, storyboard)).pass, true);
  assert.equal(fullyWhitelisted({ startMs: 0, endMs: 6000 }, [{ startMs: 0, endMs: 2000 }, { startMs: 3000, endMs: 6000 }]), false);
  storyboard.shots[0]!.intentionalBlack = false; settings.qc.allowed_black = [{ startMs: 0, endMs: 2000 }];
  assert.equal((await runQC(root, settings, intentional, storyboard)).pass, false);
});

test('QC rejects decoded full-scale clipping and excessive true peak', async t => {
  const { root, settings, narration, storyboard } = await fixture(t);
  await produceMedia(root, settings, narration, storyboard, { assets: [] });
  await ffmpeg(root, settings, ['-y', '-i', path.join(root, 'work/rendered.mp4'), '-f', 'lavfi', '-i', "aevalsrc=exprs='sgn(sin(2*PI*1000*t))':s=48000:d=6", '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-t', '6', path.join(root, 'output/final.mp4')]);
  const qc = await runQC(root, settings, narration, storyboard); const types = (qc.issues as Array<{ type: string }>).map(issue => issue.type);
  assert.equal(qc.pass, false); assert.ok(types.includes('audio-clipping')); assert.ok(types.includes('true-peak'));
});

test('approved BGM/SFX mix uses absolute SFX timing, ducking and normalization', async t => {
  const { root, settings, narration, storyboard } = await fixture(t);
  await fs.mkdir(path.join(root, 'assets'));
  const assets: Asset[] = [];
  for (const [id, type, frequency, duration] of [['music', 'music', 880, 6], ['impact', 'sfx', 1760, 0.2]] as const) {
    const relative = `assets/${id}.wav`;
    await ffmpeg(root, settings, ['-y', '-f', 'lavfi', '-i', `sine=frequency=${frequency}:sample_rate=48000:duration=${duration}`, '-c:a', 'pcm_s16le', path.join(root, relative)]);
    assets.push({ id, type, path: relative, source: 'user', status: 'approved', hash: hash(await fs.readFile(path.join(root, relative))), shotIds: ['shot001'] });
  }
  storyboard.shots[0]!.sfx = [{ timeMs: 2500, type: 'impact', assetId: 'impact', intensity: 0.5 }];
  await produceMedia(root, settings, narration, storyboard, { assets });
  const report = JSON.parse(await fs.readFile(path.join(root, 'work/media-report.json'), 'utf8'));
  assert.equal(report.musicAsset, 'music'); assert.equal(report.sfxCount, 1); assert.equal(report.normalization.applied, true);
  const logs = await fs.readFile(path.join(root, 'work/logs/ffmpeg.jsonl'), 'utf8');
  assert.match(logs, /sidechaincompress/); assert.match(logs, /adelay=120000S/);
  // Measure the music frequency alone before mastering: it must be quieter while voice is present.
  const rms = async (start: number) => {
    const result = await ffmpeg(root, settings, ['-ss', String(start), '-t', '0.3', '-i', path.join(root, 'work/audio-mix.wav'), '-af', 'bandpass=f=880:width_type=h:w=40,astats=reset=0', '-f', 'null', '-']);
    return Number([...result.stderr.matchAll(/RMS level dB:\s*(-?[\d.]+)/g)].at(-1)?.[1]);
  };
  assert.ok(await rms(1.5) < await rms(4.7) - 3, 'Music should duck by more than 3 dB during voice');
  assert.equal((await runQC(root, settings, narration, storyboard)).pass, true);
  storyboard.shots[0]!.sfx[0]!.timeMs = 6000;
  await assert.rejects(produceMedia(root, settings, narration, storyboard, { assets }), /outside the shot/);
});
