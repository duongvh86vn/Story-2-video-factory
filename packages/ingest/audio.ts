import { z } from 'zod';
import type { FactoryConfig } from '../core/config.js';
import { NarrationSchema, type Narration } from '../core/schemas.js';
import { runIngestCommand, type IngestCommandOptions } from './process.js';

export interface AudioProbe { durationMs: number; sampleRate?: number; channels?: number; codec?: string; startTimeMs: number; raw: unknown }
function finitePositive(value: unknown): number | undefined {
  const n = typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
export async function probeAudio(audioPath: string, options: IngestCommandOptions = {}): Promise<AudioProbe> {
  const result = await runIngestCommand(process.env.VIDEO_FACTORY_FFPROBE || process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'format=duration:stream=index,codec_type,codec_name,duration,duration_ts,time_base,start_time,sample_rate,channels', '-of', 'json', audioPath], { ...options, timeoutMs: options.timeoutMs ?? 60000 });
  const raw: unknown = JSON.parse(result.stdout);
  const doc = z.object({ streams: z.array(z.object({ codec_type: z.string().optional(), codec_name: z.string().optional(), duration: z.union([z.string(), z.number()]).optional(), duration_ts: z.union([z.string(), z.number()]).optional(), time_base: z.string().optional(), start_time: z.union([z.string(), z.number()]).optional(), sample_rate: z.union([z.string(), z.number()]).optional(), channels: z.number().optional() }).passthrough()), format: z.object({ duration: z.union([z.string(), z.number()]).optional() }).passthrough().optional() }).parse(raw);
  const stream = doc.streams.find(s => s.codec_type === 'audio');
  if (!stream) throw new Error('ffprobe found no audio stream in ' + audioPath);
  const timeBase = stream.time_base?.split('/').map(Number);
  const rationalDuration = timeBase?.length === 2 && timeBase[1]! > 0 ? finitePositive(Number(stream.duration_ts) * timeBase[0]! / timeBase[1]!) : undefined;
  const seconds = rationalDuration ?? finitePositive(stream.duration) ?? finitePositive(doc.format?.duration);
  if (!seconds) throw new Error('ffprobe did not return a finite positive audio duration for ' + audioPath);
  const durationMs = Math.round(seconds * 1000);
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0) throw new Error('Audio duration is outside supported millisecond range');
  const start = Number(stream.start_time ?? 0);
  return { durationMs, sampleRate: finitePositive(stream.sample_rate), channels: stream.channels, codec: stream.codec_name, startTimeMs: Number.isFinite(start) ? Math.round(start * 1000) : 0, raw };
}
/** Audio may extend past the last cue: preserve leading silence and every tail sample. */
export function reconcileAudioDuration(cueEndMs: number, audioDurationMs: number, toleranceMs: number): number {
  if (![cueEndMs, audioDurationMs, toleranceMs].every(n => Number.isFinite(n) && n >= 0) || !Number.isSafeInteger(cueEndMs) || !Number.isSafeInteger(audioDurationMs) || audioDurationMs <= 0) throw new Error('Invalid duration or tolerance');
  if (cueEndMs > audioDurationMs + toleranceMs) throw new Error('Subtitle end ' + cueEndMs + ' ms exceeds audio duration ' + audioDurationMs + ' ms by more than tolerance ' + toleranceMs + ' ms');
  return Math.max(cueEndMs, audioDurationMs);
}
export function validateNarration(value: unknown, config?: FactoryConfig): Narration {
  const narration = NarrationSchema.parse(value);
  const ids = new Set<string>(); let previousEnd = 0;
  for (const s of narration.segments) {
    if (![s.startMs, s.endMs].every(Number.isSafeInteger) || s.startMs < previousEnd || !s.text.trim() || ids.has(s.id)) throw new Error('Invalid, overlapping, empty, or duplicate narration segment ' + s.id);
    if (s.endMs > narration.durationMs) throw new Error('Segment extends beyond narration duration: ' + s.id);
    ids.add(s.id); previousEnd = s.endMs;
  }
  previousEnd = 0; let cue = 0;
  for (const word of narration.words) {
    while (cue < narration.segments.length && narration.segments[cue]!.endMs < word.endMs) cue++;
    const segment = narration.segments[cue];
    if (!Number.isSafeInteger(word.startMs) || !Number.isSafeInteger(word.endMs) || word.endMs <= word.startMs || word.startMs < previousEnd || !word.text.trim() || !segment || word.startMs < segment.startMs || word.endMs > segment.endMs) throw new Error('Invalid or out-of-cue word timing: ' + JSON.stringify(word));
    previousEnd = word.endMs;
  }
  if (config && narration.durationMs > config.rendering.max_duration_seconds * 1000) throw new Error('Narration duration ' + narration.durationMs + ' ms exceeds rendering.max_duration_seconds=' + config.rendering.max_duration_seconds);
  return narration;
}
