import {
  SourceOwnershipSchema,
  type SourceOwnership,
  type OwnershipPhase,
} from './source-ownership-schemas.js';

/** CANDIDATE data projection only; no poses, contact tracks or entities created.
 * startMs/endMs are clipped GLOBAL times. phase retains its original interval.
 * null authority means world placement; held authority is its explicit gripId.
 */
export type OwnershipPhaseWindow = {
  ownershipId: string;
  partId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  phaseIndex: number;
  phase: OwnershipPhase;
  startMs: number;
  endMs: number;
  authorityGripId: string | null;
};

/** Select [startMs,endMs); the complete source's terminal time selects its last
 * phase. Invalid, outside or uncovered times fail instead of guessing a phase.
 */
export function ownershipPhaseAt(source: SourceOwnership, timeMs: number): OwnershipPhase {
  const original = SourceOwnershipSchema.parse(source);
  if (!Number.isFinite(timeMs) || timeMs < original.startMs || timeMs > original.endMs) {
    throw new RangeError('CANDIDATE source ownership: seek is outside the original clock');
  }
  if (timeMs === original.endMs) return original.phases[original.phases.length - 1]!;
  for (const phase of original.phases) {
    if (timeMs >= phase.startMs && timeMs < phase.endMs) return phase;
  }
  throw new Error('CANDIDATE source ownership: no explicitly declared phase at seek time');
}

/** A camera slice must be positive and wholly inside the original span.
 * Only the window is clipped: phase index, original clock and explicit authority
 * remain unchanged. No slice-local contact start, cue or transition is invented.
 */
export function projectOwnershipPhases(
  source: SourceOwnership,
  startMs: number,
  endMs: number,
): OwnershipPhaseWindow[] {
  const original = SourceOwnershipSchema.parse(source);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs
    || startMs < original.startMs || endMs > original.endMs) {
    throw new RangeError('CANDIDATE source ownership: invalid camera slice in the original clock');
  }
  const windows: OwnershipPhaseWindow[] = [];
  for (let phaseIndex = 0; phaseIndex < original.phases.length; phaseIndex += 1) {
    const phase = original.phases[phaseIndex]!;
    const clippedStart = Math.max(startMs, phase.startMs);
    const clippedEnd = Math.min(endMs, phase.endMs);
    if (clippedStart >= clippedEnd) continue;
    windows.push({
      ownershipId: original.id,
      partId: original.partId,
      sourceStartMs: original.startMs,
      sourceEndMs: original.endMs,
      phaseIndex,
      phase,
      startMs: clippedStart,
      endMs: clippedEnd,
      authorityGripId: phase.kind === 'world' ? null
        : phase.kind === 'held' ? phase.gripId : phase.authorityGripId,
    });
  }
  return windows;
}
