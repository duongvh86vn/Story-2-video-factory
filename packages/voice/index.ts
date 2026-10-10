import { promises as fs } from 'node:fs';
import path from 'node:path';
import { findRepoRoot, type FactoryConfig } from '../core/config.js';
import { NarrationSchema, type Narration } from '../core/schemas.js';
import { exists, hash, readJson, safeRealPath, writeAtomic, writeJson } from '../core/utils.js';
import { execute, outputPath, redact } from '../render/process.js';
import { ffmpeg, probe, seconds } from '../audio/ffmpeg.js';
import { ActivitySchema, VoiceReportSchema, type SpeechActivity, type VoiceReport } from './schemas.js';
import { ScriptDocumentSchema, type ScriptDocument } from '../ingest/script.js';
import { primaryLanguage } from '../core/languages.js';
import { azureVoiceId, synthesizeAzure } from './azure.js';
import { synthesizeExternal } from './external.js';
import {scriptVoiceSelections,MissingSpeakerVoiceError} from './dialogue.js';
export * from './schemas.js';

/** A second output bound protects PCM writers even if a filter mishandles EOF. */
function pcmBounds(durationMs:number,sampleRate:number):string[] {
  if(!Number.isFinite(durationMs)||durationMs<=0)throw new Error('PCM duration must be finite and positive');
  return ['-t',seconds(durationMs/1000),'-fs',String(Math.ceil(durationMs*sampleRate/1000)*2+65536),'-ar',String(sampleRate),'-ac','1'];
}

async function synthesize(root: string, config: FactoryConfig, text: string, output: string, requestPath: string): Promise<void> {
  const v = config.voice;
  await writeJson(requestPath, { text, language: primaryLanguage(config.project.language), locale: config.project.language, provider:v.tts_provider,model:v.model,voiceId: v.voice_id, output });
  if (v.tts_provider === 'windows-speech') {
    if (process.platform !== 'win32') throw new Error('windows-speech requires Windows');
    await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(await findRepoRoot(), 'scripts/windows-tts.ps1'), '-RequestPath', requestPath],
      { cwd: root, logFile: await outputPath(root, 'work/logs/tts.jsonl'), timeoutMs: v.timeout_ms });
  } else if (v.tts_provider === 'azure-speech') {
    await synthesizeAzure(config,text,output);
  } else if (v.tts_provider === 'http'||v.tts_provider==='openai-compatible'||v.tts_provider==='omnivoice-studio') {
    await synthesizeExternal(config,text,output);
  } else if (v.tts_provider === 'command') {
    if (!v.command || !v.command_args.some(arg => arg.includes('{request}'))) throw new Error('Command TTS requires executable and a {request} argument');
    const args = v.command_args.map(arg => arg.replaceAll('{request}', requestPath).replaceAll('{output}', output));
    await execute(v.command, args, { cwd: root, logFile: await outputPath(root, 'work/logs/tts.jsonl'), timeoutMs: v.timeout_ms });
  } else throw new Error('No TTS provider configured');
  const bytes = await fs.readFile(output);
  if (bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WAVE') throw new Error('TTS provider did not produce a WAV file');
}
async function cachedSpeech(root: string, config: FactoryConfig, id: string, text: string): Promise<string> {
  const dir = await outputPath(root, `work/voice/cues/${id}`); await fs.mkdir(dir, { recursive: true });
  const raw = path.join(dir, 'raw.wav'), recordPath = path.join(dir, 'cache.json'), v = config.voice;
  const requestHash = hash({ text, provider: v.tts_provider, voice: v.voice_id, language: config.project.language,
    endpoint: v.base_url, model:v.model,fields:v.http_fields,options:v.http_extra_body,command: v.command, args: v.command_args, rate: 'default' });
  if (await exists(raw) && await exists(recordPath)) {
    const record = await readJson<{ requestHash: string; audioHash: string }>(recordPath);
    if (record.requestHash === requestHash && record.audioHash === hash(await fs.readFile(raw))) return raw;
  }
  await synthesize(root, config, text, raw, path.join(dir, 'request.json'));
  await writeJson(recordPath, { requestHash, audioHash: hash(await fs.readFile(raw)) }); return raw;
}
export async function narrateScript(root: string, config: FactoryConfig, script: ScriptDocument): Promise<Narration | undefined> {
  ScriptDocumentSchema.parse(script);
  const report: VoiceReport = { version: 2, status: 'needs-voice', source: 'tts', provider: config.voice.tts_provider, voiceId: config.voice.voice_id,
    language:config.project.language,narrationHash: hash(script), textPreserved: true, timingPreserved: true, inputAudioPreserved: false, synchronization: 'segment', cues: [], warnings: [] };
  let narration: Narration | undefined;
  try {
    if(config.voice.tts_provider==='azure-speech')report.voiceId=azureVoiceId(config);
    if (!config.voice.tts_provider || config.voice.tts_provider === 'none' || config.voice.source === 'input') throw new Error('Script requires a configured TTS voice before creating its timeline');
    const selections=scriptVoiceSelections(script,config);
    if(script.format==='dialogue')report.speakerVoices=[...selections].map(([speakerId,c])=>({speakerId,provider:c.voice.tts_provider,voiceId:c.voice.tts_provider==='azure-speech'?azureVoiceId(c):c.voice.voice_id}));
    const pieces: string[] = [], segments: Narration['segments'] = []; let clock = 0;
    for (const [i, chunk] of script.chunks.entries()) {
      const selected=selections.get(chunk.speakerId??'narrator')!;
      const raw = await cachedSpeech(root, selected, chunk.id, chunk.text), normalized = path.join(path.dirname(raw), 'script-normalized.wav');
      await ffmpeg(root, config, ['-y', '-i', raw, '-ar', String(config.audio.sample_rate), '-ac', '1', '-c:a', 'pcm_s16le', normalized]);
      const metadata = await probe(root, config, normalized), duration = Number(metadata.format.duration) * 1000;
      if (!Number.isFinite(duration) || duration <= 0 || !metadata.streams.some(s => s.codec_type === 'audio')) throw new Error(`${chunk.id}: invalid generated speech`);
      const startMs = Math.round(clock), endMs = Math.round(clock + duration);
      if (endMs <= startMs) throw new Error(`${chunk.id}: empty generated speech`);
      segments.push({ id: chunk.id, text: chunk.text, startMs, endMs,...(chunk.speakerId?{speakerId:chunk.speakerId}:{}) });
      report.cues.push({ id: chunk.id, textHash: hash(chunk.text), startMs, endMs, rawDurationMs: duration, rate: 1, audioHash: hash(await fs.readFile(raw)),...(chunk.speakerId?{speakerId:chunk.speakerId,voiceId:selected.voice.tts_provider==='azure-speech'?azureVoiceId(selected):selected.voice.voice_id}:{}) });
      const next = script.chunks[i + 1], pause = next && next.paragraphIndex !== chunk.paragraphIndex ? 250 : 0;
      const piece = path.join(path.dirname(raw), 'script-piece.wav');
      await ffmpeg(root, config, ['-y', '-i', normalized, '-af', `apad=whole_dur=${seconds((duration + pause) / 1000)},atrim=duration=${seconds((duration + pause) / 1000)}`, ...pcmBounds(duration+pause,config.audio.sample_rate), '-c:a', 'pcm_s16le', piece]);
      pieces.push(piece); clock += duration + pause;
      if (clock > config.rendering.max_duration_seconds * 1000) throw new Error('Generated script narration exceeds configured video duration limit');
    }
    let concatenated = pieces;
    for (let pass = 0; concatenated.length > 1; pass++) {
      const next: string[] = [];
      for (let i = 0; i < concatenated.length; i += 24) {
        const group = concatenated.slice(i, i + 24), output = await outputPath(root, `work/voice/script-concat-${pass}-${i}.wav`);
        await ffmpeg(root, config, ['-y', ...group.flatMap(f => ['-i', f]), '-filter_complex', `${group.map((_, j) => `[${j}:a]`).join('')}concat=n=${group.length}:v=0:a=1[a]`, '-map', '[a]', '-c:a', 'pcm_s16le', output]);
        next.push(output);
      }
      concatenated = next;
    }
    const relative = 'work/voice/script-narration.wav', audio = await outputPath(root, relative);
    await writeAtomic(audio, await fs.readFile(concatenated[0]!));
    const durationMs = Math.round(Number((await probe(root, config, audio)).format.duration) * 1000);
    if (Math.abs(durationMs - clock) > 2 || segments.at(-1)!.endMs > durationMs + 1) throw new Error('Generated narration assembly changed measured cue timing');
    narration = NarrationSchema.parse({ mode: 'script', audioPath: relative, durationMs: Math.max(durationMs, segments.at(-1)!.endMs), segments, words: [] });
    report.narrationHash = hash(narration); report.audioPath = relative; report.audioHash = hash(await fs.readFile(audio)); report.status = 'ready';
    const activity = await measureSpeech(root, config, narration);
    if (!activity.intervals.length) throw new Error('Generated narration has no measured speech activity');
    report.synchronization = 'audio-activity';
    await writeJson(await outputPath(root, 'work/speech-activity.json'), activity);
    await writeJson(await outputPath(root, 'work/script-timing.json'), { scriptHash: script.sourceHash, audioHash: report.audioHash,
      chunks: script.chunks.map((c, i) => ({ ...c, startMs: segments[i]!.startMs, endMs: segments[i]!.endMs })), paragraphPauseMs: 250 });
  } catch (error) {
    report.status = error instanceof MissingSpeakerVoiceError||!config.voice.tts_provider || config.voice.tts_provider === 'none' || config.voice.source === 'input' ? 'needs-voice' : 'provider-failed';
    report.error = redact(error instanceof Error ? error.message : String(error)); narration = undefined;
  }
  await writeJson(await outputPath(root, 'work/voice-report.json'), VoiceReportSchema.parse(report));
  if (narration) await writeJson(await outputPath(root, 'work/voiced-narration.json'), narration);
  return narration;
}
export async function measureSpeech(root: string, config: FactoryConfig, narration: Narration): Promise<SpeechActivity> {
  if (!narration.audioPath) return ActivitySchema.parse({ method: 'segment-draft', windowMs: 20,
    intervals: narration.segments.map(s => ({ startMs: s.startMs, endMs: s.endMs, level: .5 })) });
  const audio = await safeRealPath(root, narration.audioPath), pcm = await outputPath(root, 'work/voice/activity.s16');
  await fs.mkdir(path.dirname(pcm), { recursive: true });
  await ffmpeg(root, config, ['-y', '-i', audio, '-map', '0:a:0', '-ac', '1', '-ar', '16000', '-t', seconds(narration.durationMs / 1000), '-f', 's16le', pcm]);
  const bytes = await fs.readFile(pcm), intervals: SpeechActivity['intervals'] = [];
  let active: SpeechActivity['intervals'][number] | undefined;
  const samples = 320;
  for (let offset = 0; offset < bytes.length; offset += samples * 2) {
    let sum = 0, count = 0;
    for (let i = offset; i + 1 < Math.min(bytes.length, offset + samples * 2); i += 2) { const n = bytes.readInt16LE(i) / 32768; sum += n * n; count++; }
    const rms = Math.sqrt(sum / Math.max(1, count)), start = Math.round(offset / 32), end = Math.min(narration.durationMs, start + 20);
    if (rms >= .008 && end > start) {
      if (active && start - active.endMs <= 20 && end - active.startMs <= 120 && Math.abs(active.level - Math.min(1, rms * 5)) < .2) { active.endMs = end; active.level = Math.max(active.level, Math.min(1, rms * 5)); }
      else { active = { startMs: start, endMs: end, level: Math.min(1, rms * 5) }; intervals.push(active); }
    }
  }
  return ActivitySchema.parse({ method: 'audio-rms', audioHash: hash(await fs.readFile(audio)), windowMs: 20, intervals });
}
export async function resolveVoice(root: string, config: FactoryConfig, narration: Narration): Promise<{ narration: Narration; report: VoiceReport; activity: SpeechActivity }> {
  NarrationSchema.parse(narration);
  const narrationHash = hash(narration), v = config.voice;
  const report: VoiceReport = { version: 2, status: 'needs-voice', source: 'silent-draft', provider: v.tts_provider, voiceId: v.voice_id,
    language:config.project.language,narrationHash, textPreserved: true, timingPreserved: true, inputAudioPreserved: Boolean(narration.audioPath), synchronization: 'segment',
    cues: narration.segments.map(s => ({ id: s.id, textHash: hash(s.text), startMs: s.startMs, endMs: s.endMs })), warnings: [] };
  let resolved = narration;
  if (narration.audioPath) {
    const audio = await safeRealPath(root, narration.audioPath);
    report.status = 'ready'; report.source = 'input'; report.provider = null; report.voiceId = null;
    report.audioPath = narration.audioPath; report.audioHash = hash(await fs.readFile(audio));
    if (v.source === 'tts') report.warnings.push('Input WAV remains authoritative; TTS was not used to replace it.');
  } else if (v.source !== 'input' && v.tts_provider && v.tts_provider !== 'none') {
    report.source = 'tts';
    try {
      if(v.tts_provider==='azure-speech')report.voiceId=azureVoiceId(config);
      const cueFiles: string[] = [];
      for (const [i, segment] of narration.segments.entries()) {
        const dir = await outputPath(root, `work/voice/cues/${segment.id}`); await fs.mkdir(dir, { recursive: true });
        const raw = path.join(dir, 'raw.wav'), rawReport = path.join(dir, 'cache.json');
        const requestHash = hash({ text: segment.text, provider: v.tts_provider, voice: v.voice_id, language: config.project.language,
          endpoint: v.base_url, model:v.model,fields:v.http_fields,options:v.http_extra_body,command: v.command, args: v.command_args });
        let cached = false;
        if (await exists(raw) && await exists(rawReport)) {
          const record = await readJson<{ requestHash: string; audioHash: string }>(rawReport);
          cached = record.requestHash === requestHash && record.audioHash === hash(await fs.readFile(raw));
        }
        if (!cached) { await synthesize(root, config, segment.text, raw, path.join(dir, 'request.json')); await writeJson(rawReport, { requestHash, audioHash: hash(await fs.readFile(raw)) }); }
        const metadata = await probe(root, config, raw), duration = Number(metadata.format.duration) * 1000, window = segment.endMs - segment.startMs;
        if (!metadata.streams.some(s => s.codec_type === 'audio') || !Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid TTS audio for ${segment.id}`);
        const rate = duration > window - 30 ? duration / Math.max(1, window - 30) : 1;
        report.cues[i]!.rawDurationMs = duration; report.cues[i]!.rate = rate;
        if (rate > v.fit_rate_max || rate < v.fit_rate_min) { report.status = 'fit-failed'; throw new Error(`${segment.id}: required tempo ${rate.toFixed(3)} exceeds configured fit range; cue text/timing were preserved`); }
        const fitted = path.join(dir, 'fitted.wav');
        await ffmpeg(root, config, ['-y', '-i', raw, '-af', `atempo=${rate},aresample=${config.audio.sample_rate}`, '-ac', '1', '-c:a', 'pcm_s16le', fitted]);
        const fittedDuration = Number((await probe(root, config, fitted)).format.duration) * 1000;
        if(!Number.isFinite(fittedDuration)||fittedDuration<=0)throw new Error(`${segment.id}: invalid fitted speech duration`);
        report.cues[i]!.fittedDurationMs=fittedDuration;
        if (fittedDuration > window + 1) { report.status = 'fit-failed'; throw new Error(`${segment.id}: fitted speech would be truncated by cue boundary`); }
        const placed = path.join(dir, 'placed.wav');
        await ffmpeg(root, config, ['-y', '-i', fitted, '-af', `apad=whole_dur=${seconds(window / 1000)},atrim=duration=${seconds(window / 1000)},adelay=${segment.startMs}:all=1`, ...pcmBounds(segment.endMs,config.audio.sample_rate), '-c:a', 'pcm_s16le', placed]);
        report.cues[i]!.audioHash = hash(await fs.readFile(raw)); cueFiles.push(placed);
      }
      const output = await outputPath(root, 'work/voice/narration.wav');
      // Mix in bounded batches to avoid operating-system argument and open-file limits on long narration.
      let mixed = cueFiles;
      for (let pass = 0; mixed.length > 1; pass++) {
        const next: string[] = [];
        for (let i = 0; i < mixed.length; i += 24) {
          const group = mixed.slice(i, i + 24), target = await outputPath(root, `work/voice/mix-${pass}-${i}.wav`);
          await ffmpeg(root, config, ['-y', ...group.flatMap(f => ['-i', f]), '-filter_complex', `${group.map((_, j) => `[${j}:a]`).join('')}amix=inputs=${group.length}:normalize=0:duration=longest,apad=whole_dur=${seconds(narration.durationMs / 1000)},atrim=duration=${seconds(narration.durationMs / 1000)}[mix]`, '-map', '[mix]', ...pcmBounds(narration.durationMs,config.audio.sample_rate), '-c:a', 'pcm_s16le', target]);
          next.push(target);
        }
        mixed = next;
      }
      await ffmpeg(root, config, ['-y', '-i', mixed[0]!, '-af', `apad=whole_dur=${seconds(narration.durationMs / 1000)},atrim=duration=${seconds(narration.durationMs / 1000)}`, ...pcmBounds(narration.durationMs,config.audio.sample_rate), '-c:a', 'pcm_s16le', output]);
      const assembled=await probe(root,config,output),assembledMs=Number(assembled.format.duration)*1000;
      if(!Number.isFinite(assembledMs)||Math.abs(assembledMs-narration.durationMs)>1)throw new Error('SRT voice assembly changed the original cue clock');
      resolved = NarrationSchema.parse({ ...narration, audioPath: 'work/voice/narration.wav' });
      report.status = 'ready'; report.audioPath = resolved.audioPath; report.audioHash = hash(await fs.readFile(output));
    } catch (error) { if (report.status !== 'fit-failed') report.status = 'provider-failed'; report.error = redact(error instanceof Error ? error.message : String(error)); resolved = narration; }
  } else report.warnings.push('Silent draft only. Supply WAV or configure TTS before final export.');
  const activity = await measureSpeech(root, config, resolved);
  report.synchronization = activity.method === 'audio-rms' ? 'audio-activity' : 'segment';
  if (report.status === 'ready' && !activity.intervals.length) { report.status = 'provider-failed'; report.error = 'Narration audio contains no measured speech activity'; }
  await writeJson(await outputPath(root, 'work/voiced-narration.json'), resolved);
  await writeJson(await outputPath(root, 'work/voice-report.json'), VoiceReportSchema.parse(report));
  await writeJson(await outputPath(root, 'work/speech-activity.json'), activity);
  return { narration: resolved, report, activity };
}
export async function requireVoice(root: string, narration: Narration): Promise<VoiceReport> {
  const report = await readJson(path.join(root, 'work/voice-report.json'), VoiceReportSchema);
  if (report.status !== 'ready' || !narration.audioPath || report.audioPath !== narration.audioPath) throw new Error('Final export requires a ready narration voice; silent drafts cannot be DONE');
  if (hash(await fs.readFile(await safeRealPath(root, narration.audioPath))) !== report.audioHash) throw new Error('Voice hash changed after approval/resolution');
  const original = await readJson(path.join(root, 'work/narration.json'), NarrationSchema);
  if (hash(original) !== report.narrationHash || hash(narration.segments) !== hash(original.segments) || narration.durationMs !== original.durationMs) throw new Error('Resolved voice changed canonical narration');
  return report;
}
