import {
  SourceOwnershipSchema,
  type SourceOwnership,
  type OwnershipPhase,
} from './source-ownership-schemas.js';
import { ownershipPhaseAt } from './source-ownership-projection.js';

export interface OwnershipBakeSample {
  timeMs: number;
  center: { x: number; y: number };
  palms: Record<string, { x: number; y: number }>;
  activeGripIds: string[];
  authorityGripId?: string;
}

export interface OwnershipBake {
  version: 'ownership-bake-1';
  startMs: number;
  endMs: number;
  samples: OwnershipBakeSample[];
  maxMeasuredGapPx: number;
  gapLimitPx: 0.2;
  motionVerified: false;
  productionApproval: false;
}

type Point = { x: number; y: number };

const GAP_LIMIT_PX = 0.2;
const MAX_REFINEMENT_DEPTH = 12;
const MAX_FRAME_COUNT = 12000;
const PROBE_FRACTIONS: readonly number[] = [0.17, 0.5, 0.83];

function fail(message: string): never {
  throw new Error(`needs-source-prop-binding: ownership bake candidate: ${message}`);
}

function requireRecord(value: unknown, label: string): object {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${label} must be a non-array object`);
  }
  return value;
}

/** Never read a dynamic palm key through an object's prototype or an accessor. */
function ownEnumerableData(record: object, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || descriptor.enumerable !== true
    || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    fail(`${label} must be an own enumerable data property`);
  }
  return descriptor.value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${label} must be a finite number`);
  }
  return value;
}

function copyPoint(value: unknown, label: string): Point {
  const point = requireRecord(value, label);
  return {
    x: finiteNumber(ownEnumerableData(point, 'x', `${label}.x`), `${label}.x`),
    y: finiteNumber(ownEnumerableData(point, 'y', `${label}.y`), `${label}.y`),
  };
}

/** Copy only validated data; never repair a resolver's geometry or ownership. */
function copyResolvedSample(
  value: unknown,
  requestedTimeMs: number,
  gripIds: readonly string[],
  gripIdSet: ReadonlySet<string>,
  phase: OwnershipPhase,
): OwnershipBakeSample {
  const record = requireRecord(value, 'resolved sample');
  const timeMs = finiteNumber(
    ownEnumerableData(record, 'timeMs', 'sample.timeMs'),
    'sample.timeMs',
  );
  if (!Object.is(timeMs, requestedTimeMs)) {
    fail('resolver must return the exact requested global time, without tolerance or coercion');
  }

  const center = copyPoint(
    ownEnumerableData(record, 'center', 'sample.center'),
    'sample.center',
  );
  const rawPalms = requireRecord(
    ownEnumerableData(record, 'palms', 'sample.palms'),
    'sample.palms',
  );
  const palmKeys = Reflect.ownKeys(rawPalms);
  if (palmKeys.length !== gripIds.length) {
    fail('palms must contain exactly all original grip IDs, including inactive grips');
  }
  for (const key of palmKeys) {
    if (typeof key !== 'string' || !gripIdSet.has(key)) {
      fail('palms contains an undeclared key');
    }
  }

  // Null-prototype storage is essential: __proto__, constructor and similar
  // strings remain data keys. An inherited or accessor __proto__ is rejected
  // by ownEnumerableData, just like every other grip key.
  const palms = Object.create(null) as Record<string, Point>;
  for (const id of gripIds) {
    palms[id] = copyPoint(
      ownEnumerableData(rawPalms, id, `sample.palms[${id}]`),
      `sample.palms[${id}]`,
    );
  }

  const expectedActive: readonly string[] = phase.kind === 'world' ? []
    : phase.kind === 'held' ? [phase.gripId] : phase.gripIds;
  const rawActive = ownEnumerableData(record, 'activeGripIds', 'sample.activeGripIds');
  if (!Array.isArray(rawActive) || rawActive.length !== expectedActive.length) {
    fail('activeGripIds does not match the exact original phase');
  }
  const activeGripIds: string[] = [];
  const seenActive = new Set<string>();
  for (let index = 0; index < rawActive.length; index += 1) {
    const id = ownEnumerableData(rawActive, String(index), `sample.activeGripIds[${index}]`);
    if (typeof id !== 'string' || !gripIdSet.has(id)) {
      fail('activeGripIds contains a non-string or undeclared grip ID');
    }
    if (seenActive.has(id)) fail('activeGripIds contains a duplicate grip ID');
    if (!expectedActive.includes(id)) {
      fail('activeGripIds contains a grip that is inactive in the original phase');
    }
    seenActive.add(id);
    activeGripIds.push(id);
  }
  // Active IDs are an exact set, not a ranking. Preserve the resolver's order;
  // do not sort, replace or synthesize the supplied IDs.
  for (const id of expectedActive) {
    if (!seenActive.has(id)) fail('activeGripIds is missing an original active grip');
  }

  const authorityDescriptor = Object.getOwnPropertyDescriptor(record, 'authorityGripId');
  let suppliedAuthority: unknown = undefined;
  if (authorityDescriptor !== undefined) {
    suppliedAuthority = ownEnumerableData(record, 'authorityGripId', 'sample.authorityGripId');
  } else if ('authorityGripId' in record) {
    fail('authorityGripId must not be inherited');
  }
  const expectedAuthority = phase.kind === 'world' ? undefined
    : phase.kind === 'held' ? phase.gripId : phase.authorityGripId;
  if (suppliedAuthority !== expectedAuthority) {
    fail('authorityGripId does not match the exact original phase');
  }

  const copied: OwnershipBakeSample = { timeMs, center, palms, activeGripIds };
  if (typeof suppliedAuthority === 'string') {
    copied.authorityGripId = suppliedAuthority;
  }
  return copied;
}

/** Avoid overflowing b - a for finite coordinates of opposite signs. */
function interpolateCoordinate(a: number, b: number, fraction: number): number {
  const value = (a < 0) !== (b < 0)
    ? (1 - fraction) * a + fraction * b
    : a + (b - a) * fraction;
  if (!Number.isFinite(value)) fail('interpolated geometry is not finite');
  return value;
}

function pointInterpolationGap(
  left: Point,
  right: Point,
  actual: Point,
  fraction: number,
): number {
  const x = interpolateCoordinate(left.x, right.x, fraction);
  const y = interpolateCoordinate(left.y, right.y, fraction);
  const gap = Math.hypot(actual.x - x, actual.y - y);
  if (!Number.isFinite(gap)) fail('measured interpolation gap is not finite');
  return gap;
}

/** Only continuous geometry participates. No discrete ownership is tweened. */
function geometryInterpolationGap(
  left: OwnershipBakeSample,
  right: OwnershipBakeSample,
  actual: OwnershipBakeSample,
  gripIds: readonly string[],
): number {
  // Use the actual representable probe time, not its nominal fraction, when
  // evaluating the line between the two retained global-time samples.
  const fraction = (actual.timeMs - left.timeMs) / (right.timeMs - left.timeMs);
  if (!Number.isFinite(fraction) || fraction <= 0 || fraction >= 1) {
    fail('probe has no distinct representable interior interpolation fraction');
  }
  let gap = pointInterpolationGap(left.center, right.center, actual.center, fraction);
  for (const id of gripIds) {
    gap = Math.max(gap, pointInterpolationGap(
      left.palms[id]!, right.palms[id]!, actual.palms[id]!, fraction,
    ));
  }
  return gap;
}

/**
 * CANDIDATE source proposal: all clocks remain GLOBAL and original.
 *
 * The parent supplies its actual resolver, complete original actor/compiler
 * breakpoints, and independent original geometry/contact/boundary validation.
 * This module does not establish contact, continuity, native registration,
 * one-entity integration, motion acceptance or production approval.
 *
 * Discrete sample fields annotate their exact times. Consumers must retain the
 * original half-open phase semantics rather than interpolate those fields.
 * The original source's terminal time selects its final phase.
 *
 * maxMeasuredGapPx covers only the three probes of each final retained
 * interval. It is sampled interpolation candidate evidence, not a proof of
 * continuous correctness between probes.
 *
 * The conservative 12000-frame budget includes every distinct resolved time,
 * including probe-only records. Only mandatory and refinement times are
 * emitted. Failed validation, exhausted budgets or indistinct double times
 * throw; no partial bake or fallback is returned.
 */
export function bakeOwnership(
  source: SourceOwnership,
  startMs: number,
  endMs: number,
  fps: number,
  extraTimes: readonly number[],
  resolve: (globalTimeMs: number) => OwnershipBakeSample,
): OwnershipBake {
  // Structural validation preserves the complete original source. It does
  // not replace the parent's source/actor/contact/transition context gates.
  const original = SourceOwnershipSchema.parse(source);
  if (typeof startMs !== 'number' || typeof endMs !== 'number'
    || !Number.isFinite(startMs) || !Number.isFinite(endMs)
    || endMs <= startMs || startMs < original.startMs || endMs > original.endMs) {
    fail('the complete selected clock must be positive and inside the original source');
  }
  if (typeof fps !== 'number' || !Number.isFinite(fps) || fps <= 0 || fps > 120) {
    fail('fps must be finite, positive and at most 120');
  }
  if (!Array.isArray(extraTimes)) fail('extraTimes must be an array of original global times');
  if (typeof resolve !== 'function') fail('an explicit actual parent resolver is required');

  // Validate and snapshot ALL supplied breakpoints before filtering any of
  // them to the slice, and before making any resolver request.
  const validatedExtraTimes: number[] = [];
  for (let index = 0; index < extraTimes.length; index += 1) {
    const timeMs = finiteNumber(extraTimes[index], `extraTimes[${index}]`);
    if (timeMs < original.startMs || timeMs > original.endMs) {
      fail(`extraTimes[${index}] is outside the full original source`);
    }
    validatedExtraTimes.push(timeMs);
  }

  const gripIds = original.grips.map(grip => grip.id);
  const gripIdSet = new Set<string>(gripIds);
  // Map values preserve the first supplied numeric representation, including
  // a possible -0 endpoint; keys deduplicate coincident numeric times.
  const mandatory = new Map<number, number>();
  function addMandatory(timeMs: number): void {
    if (!Number.isFinite(timeMs) || timeMs < startMs || timeMs > endMs) {
      fail('internal mandatory time is outside the selected global clock');
    }
    if (mandatory.has(timeMs)) return;
    if (mandatory.size >= MAX_FRAME_COUNT) fail('mandatory times exceed the 12000-frame cap');
    mandatory.set(timeMs, timeMs);
  }

  addMandatory(startMs);
  addMandatory(endMs);
  for (const phase of original.phases) {
    if (phase.startMs >= startMs && phase.startMs <= endMs) addMandatory(phase.startMs);
    if (phase.endMs >= startMs && phase.endMs <= endMs) addMandatory(phase.endMs);
  }
  for (const timeMs of validatedExtraTimes) {
    if (timeMs >= startMs && timeMs <= endMs) addMandatory(timeMs);
  }

  // GLOBAL grid definition: original.startMs + (k * 1000) / fps, k >= 0.
  // Calculate each point independently; a camera cut never restarts the grid.
  // Scan one neighboring index on either side of the estimated index range
  // to handle floating-point rounding at the slice endpoints. Filtering never
  // changes a grid value or moves a supplied time onto the grid.
  const firstEstimate = Math.floor(((startMs - original.startMs) * fps) / 1000);
  const lastEstimate = Math.ceil(((endMs - original.startMs) * fps) / 1000);
  const firstIndex = firstEstimate > 0 ? firstEstimate - 1 : 0;
  const lastIndex = lastEstimate + 1;
  if (!Number.isSafeInteger(firstIndex) || !Number.isSafeInteger(lastIndex)) {
    fail('global fps-grid indices are not safely representable');
  }
  let previousGridTime: number | undefined;
  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const timeMs = original.startMs + (index * 1000) / fps;
    // A tiny positive fps can put the first positive grid index at infinity.
    // No such index can lie inside the finite original source; later indices
    // cannot return to it. This is not a replacement or clamping of a time.
    if (!Number.isFinite(timeMs)) break;
    if (previousGridTime !== undefined && timeMs <= previousGridTime) {
      fail('global fps-grid times are not distinct increasing doubles');
    }
    previousGridTime = timeMs;
    if (timeMs > endMs) break;
    if (timeMs >= startMs) addMandatory(timeMs);
  }

  const orderedTimes = Array.from(mandatory.values()).sort((a, b) => a - b);
  const cache = new Map<number, OwnershipBakeSample>();
  function resolvedAt(timeMs: number): OwnershipBakeSample {
    if (!Number.isFinite(timeMs) || timeMs < startMs || timeMs > endMs) {
      fail('internal resolver request is outside the selected global clock');
    }
    const cached = cache.get(timeMs);
    if (cached !== undefined) {
      if (!Object.is(cached.timeMs, timeMs)) fail('cached time representation does not match the request');
      return cached;
    }
    if (cache.size >= MAX_FRAME_COUNT) {
      fail('distinct resolved frames, including probes, exceed the 12000-frame cap');
    }
    const phase = ownershipPhaseAt(original, timeMs);
    const copied = copyResolvedSample(resolve(timeMs), timeMs, gripIds, gripIdSet, phase);
    cache.set(timeMs, copied);
    return copied;
  }

  const samples: OwnershipBakeSample[] = [resolvedAt(orderedTimes[0]!)];
  let maxMeasuredGapPx = 0;

  function refine(
    left: OwnershipBakeSample,
    right: OwnershipBakeSample,
    depth: number,
  ): void {
    const durationMs = right.timeMs - left.timeMs;
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      fail('interval endpoints are not distinct increasing finite times');
    }

    const probeTimes: number[] = [];
    let previousTimeMs = left.timeMs;
    for (const fraction of PROBE_FRACTIONS) {
      const timeMs = left.timeMs + durationMs * fraction;
      if (!Number.isFinite(timeMs) || timeMs <= previousTimeMs || timeMs >= right.timeMs) {
        fail('interval is too small for distinct .17/.5/.83 double-time probes');
      }
      probeTimes.push(timeMs);
      previousTimeMs = timeMs;
    }

    const probes: OwnershipBakeSample[] = [];
    let intervalGapPx = 0;
    for (const timeMs of probeTimes) {
      const actual = resolvedAt(timeMs);
      probes.push(actual);
      intervalGapPx = Math.max(
        intervalGapPx,
        geometryInterpolationGap(left, right, actual, gripIds),
      );
    }

    if (intervalGapPx <= GAP_LIMIT_PX) {
      // Rejected coarse-interval errors are intentionally not reported as the
      // maximum error of the final, refined piecewise-linear candidate.
      maxMeasuredGapPx = Math.max(maxMeasuredGapPx, intervalGapPx);
      if (samples.length >= MAX_FRAME_COUNT) fail('retained samples exceed the 12000-frame cap');
      samples.push(right);
      return;
    }
    if (depth >= MAX_REFINEMENT_DEPTH) {
      fail('spatial interpolation error still exceeds 0.2px at refinement depth 12');
    }

    // The .5 record was already resolved, validated and cached. Split only at
    // this exact midpoint; do not move geometry, ownership or source events.
    const midpoint = probes[1]!;
    refine(left, midpoint, depth + 1);
    refine(midpoint, right, depth + 1);
  }

  for (let index = 1; index < orderedTimes.length; index += 1) {
    const left = resolvedAt(orderedTimes[index - 1]!);
    const right = resolvedAt(orderedTimes[index]!);
    refine(left, right, 0);
  }

  return {
    version: 'ownership-bake-1',
    startMs,
    endMs,
    samples,
    maxMeasuredGapPx,
    gapLimitPx: 0.2,
    motionVerified: false,
    productionApproval: false,
  };
}
