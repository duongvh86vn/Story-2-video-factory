import { z } from 'zod';
export const ActivitySchema = z.object({ method: z.enum(['audio-rms', 'segment-draft']), audioHash: z.string().optional(),
  windowMs: z.number().positive(), intervals: z.array(z.object({ startMs: z.number().int().nonnegative(), endMs: z.number().int().positive(), level: z.number().min(0).max(1) })) });
export type SpeechActivity = z.infer<typeof ActivitySchema>;
export const VoiceReportSchema = z.object({ version: z.literal(2), status: z.enum(['ready', 'needs-voice', 'fit-failed', 'provider-failed']),
  source: z.enum(['input', 'tts', 'silent-draft']), provider: z.string().nullable(), voiceId: z.string().nullable(),
  language:z.string().optional(),
  narrationHash: z.string(), audioPath: z.string().optional(), audioHash: z.string().optional(),
  textPreserved: z.literal(true), timingPreserved: z.literal(true), inputAudioPreserved: z.boolean(),
  synchronization: z.enum(['audio-activity', 'segment']), cues: z.array(z.object({ id: z.string(), textHash: z.string(), startMs: z.number(), endMs: z.number(),
    rawDurationMs: z.number().optional(), fittedDurationMs: z.number().positive().optional(), rate: z.number().optional(), audioHash: z.string().optional() })), warnings: z.array(z.string()), error: z.string().optional() });
export type VoiceReport = z.infer<typeof VoiceReportSchema>;
