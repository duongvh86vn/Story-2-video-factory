import { NarrationSchema, type Narration } from '../core/schemas.js';

export interface SrtDiagnostic { severity: 'warning'; line: number; message: string }
export interface SrtCue { id: string; startMs: number; endMs: number; text: string; sourceIndex?: number; line: number }
export interface SrtDocument { cues: SrtCue[]; diagnostics: SrtDiagnostic[]; sourceText: string }
export class SrtParseError extends Error {
  constructor(message: string, readonly line: number, readonly cue?: number) {
    super('SRT line ' + line + (cue === undefined ? '' : ', cue ' + cue) + ': ' + message);
    this.name = 'SrtParseError';
  }
}
const stamp = '(\\d{1,}:\\d{2}:\\d{2}[,.]\\d{1,3})';
const timing = new RegExp('^\\s*' + stamp + '\\s*-->\\s*' + stamp + '\\s*$');
export function parseSrtTimestamp(value: string, line = 1): number {
  const match = /^(\d+):(\d{2}):(\d{2})[,.](\d{1,3})$/.exec(value.trim());
  if (!match) throw new SrtParseError('invalid timestamp ' + JSON.stringify(value), line);
  const hours = Number(match[1]), minutes = Number(match[2]), seconds = Number(match[3]);
  const result = hours * 3600000 + minutes * 60000 + seconds * 1000 + Number(match[4]!.padEnd(3, '0'));
  if (minutes > 59 || seconds > 59 || !Number.isSafeInteger(result)) throw new SrtParseError('timestamp is out of range: ' + value, line);
  return result;
}
export function parseSrtDocument(sourceText: string): SrtDocument {
  const lines = sourceText.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const cues: SrtCue[] = [], diagnostics: SrtDiagnostic[] = [];
  const seenIndexes = new Set<number>();
  const timingAt = (offset: number): { match: RegExpExecArray; count: number } | undefined => {
    let candidate = '';
    for (let count = 1; count <= 3 && offset + count <= lines.length; count++) {
      candidate += (count > 1 ? ' ' : '') + lines[offset + count - 1]!.trim();
      const match = timing.exec(candidate);
      if (match) return { match, count };
      if (!/^[\d\s:,.>\-]*$/.test(candidate)) break;
    }
    return undefined;
  };
  let i = 0;
  while (i < lines.length) {
    while (i < lines.length && !lines[i]!.trim()) i++;
    if (i >= lines.length) break;
    const cueNumber = cues.length + 1, line = i + 1;
    let sourceIndex: number | undefined;
    if (/^\s*\d+\s*$/.test(lines[i]!) && timingAt(i + 1)) {
      sourceIndex = Number(lines[i]!.trim());
      if (!Number.isSafeInteger(sourceIndex) || sourceIndex < 1) throw new SrtParseError('index must be a positive safe integer', line, cueNumber);
      if (seenIndexes.has(sourceIndex)) diagnostics.push({ severity: 'warning', line, message: 'duplicate source index ' + sourceIndex + '; canonical IDs follow cue order' });
      if (sourceIndex !== cueNumber) diagnostics.push({ severity: 'warning', line, message: 'non-sequential source index ' + sourceIndex });
      seenIndexes.add(sourceIndex); i++;
    }
    const record = timingAt(i);
    if (!record) throw new SrtParseError('expected HH:MM:SS,mmm --> HH:MM:SS,mmm (comma or dot)', i + 1, cueNumber);
    const startMs = parseSrtTimestamp(record.match[1]!, i + 1), endMs = parseSrtTimestamp(record.match[2]!, i + 1);
    if (endMs <= startMs) throw new SrtParseError('end must be greater than start', i + 1, cueNumber);
    const previous = cues[cues.length - 1];
    if (previous && startMs < previous.endMs) throw new SrtParseError('overlap or out-of-order timing with previous cue ' + previous.id, i + 1, cueNumber);
    if (record.count > 1) diagnostics.push({ severity: 'warning', line: i + 1, message: 'timestamp record spans ' + record.count + ' lines' });
    i += record.count;
    const textLines: string[] = [];
    while (i < lines.length && lines[i]!.trim()) {
      if (timingAt(i) || (/^\s*\d+\s*$/.test(lines[i]!) && timingAt(i + 1))) {
        diagnostics.push({ severity: 'warning', line: i + 1, message: 'missing blank separator before next cue' }); break;
      }
      if (lines[i]!.includes('-->')) throw new SrtParseError('malformed timestamp inside cue', i + 1, cueNumber);
      textLines.push(lines[i]!); i++;
    }
    const text = textLines.join('\n');
    if (!text.trim()) throw new SrtParseError('cue has no subtitle text', i + 1, cueNumber);
    cues.push({ id: 'seg' + String(cueNumber).padStart(3, '0'), startMs, endMs, text, line, ...(sourceIndex === undefined ? {} : { sourceIndex }) });
  }
  if (!cues.length) throw new SrtParseError('no subtitle cues', 1);
  return { cues, diagnostics, sourceText };
}
export function parseSrt(source: string): Narration {
  const { cues } = parseSrtDocument(source);
  return NarrationSchema.parse({ durationMs: cues[cues.length - 1]!.endMs, segments: cues.map(({ id, startMs, endMs, text }) => ({ id, startMs, endMs, text })), words: [], mode: 'srt' });
}
export function formatSrtTimestamp(ms: number): string {
  if (!Number.isSafeInteger(ms) || ms < 0) throw new Error('SRT time must be a nonnegative integer');
  return String(Math.floor(ms / 3600000)).padStart(2, '0') + ':' + String(Math.floor(ms / 60000) % 60).padStart(2, '0') + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') + ',' + String(ms % 1000).padStart(3, '0');
}
export function serializeSrt(segments: Narration['segments']): string {
  return segments.map((s, i) => String(i + 1) + '\n' + formatSrtTimestamp(s.startMs) + ' --> ' + formatSrtTimestamp(s.endMs) + '\n' + s.text + '\n').join('\n');
}
