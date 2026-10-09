import type { CompiledOwnership } from './ownership-compile.js';
import type { OwnershipBakeSample } from './ownership-bake.js';
import { SourceOwnershipSchema, type SourceOwnership } from './source-ownership-schemas.js';
import { ownershipPhaseAt } from './source-ownership-projection.js';
import { OWNERSHIP_RENDER_VERSION } from './ownership-render-version.js';

type Point = OwnershipBakeSample['center'];

function fail(message: string): never {
  throw new Error(`needs-source-prop-binding: ownership bake query: ${message}`);
}

function record(value: unknown, label: string): object {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${label} must be a non-array data record`);
  }
  return value;
}

function own(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !descriptor.enumerable
    || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    fail(`${key} must be an own enumerable data property`);
  }
  return descriptor.value;
}

function finite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${label} must be finite`);
  return value;
}

function point(value: unknown, label: string): Point {
  const raw = record(value, label);
  return { x: finite(own(raw, 'x'), `${label}.x`), y: finite(own(raw, 'y'), `${label}.y`) };
}

/** Descriptor-only source snapshot, before parsing or using any grip as a key. */
function sourceData(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null || typeof value !== 'object') {
    if (value !== undefined && value !== null && typeof value !== 'string'
      && typeof value !== 'number' && typeof value !== 'boolean') fail('source must contain only data');
    return value;
  }
  if (ancestors.has(value)) fail('source must not be cyclic');
  ancestors.add(value);
  let result: unknown;
  if (Array.isArray(value)) {
    if (Reflect.ownKeys(value).length !== value.length + 1) fail('source arrays must be dense data arrays');
    const copy: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      copy.push(sourceData(own(value, String(index)), ancestors));
    }
    result = copy;
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype) fail('source must use data records');
    const copy = Object.create(null) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') fail('source must not contain symbol keys');
      copy[key] = sourceData(own(value, key), ancestors);
    }
    result = copy;
  }
  ancestors.delete(value);
  return result;
}

function phaseState(source: SourceOwnership, timeMs: number) {
  const phase = ownershipPhaseAt(source, timeMs);
  return {
    activeGripIds: phase.kind === 'world' ? []
      : phase.kind === 'held' ? [phase.gripId] : [...phase.gripIds],
    authorityGripId: phase.kind === 'world' ? undefined
      : phase.kind === 'held' ? phase.gripId : phase.authorityGripId,
  };
}

/** Revalidate and copy on every consumer entry. Renderer serialization,
 * relations and observations must reject the same malformed candidate bake.
 * This snapshot owns its source/points/phase data; it does not certify contact,
 * bind a complete storyboard or confer art/motion/production acceptance. */
export function ownershipBakeSnapshot(item: CompiledOwnership) {
  const root = record(item, 'compiled ownership');
  if (own(root, 'version') !== OWNERSHIP_RENDER_VERSION) {
    fail('stale ownership render version');
  }
  let source: SourceOwnership;
  try {
    source = SourceOwnershipSchema.parse(sourceData(own(root, 'source')));
  } catch {
    fail('invalid original source schema or non-data source');
  }
  const paint = record(own(root, 'paint'), 'paint');
  if (own(paint, 'sourceId') !== source.id) fail('paint sourceId differs from the original source');
  const bake = record(own(root, 'bake'), 'bake');
  if (own(bake, 'version') !== ('ownership-bake-1' satisfies CompiledOwnership['bake']['version'])) {
    fail('stale bake version');
  }
  for (const candidate of [root, bake]) {
    if (own(candidate, 'motionVerified') !== false || own(candidate, 'productionApproval') !== false) {
      fail('candidate motionVerified and productionApproval must remain false');
    }
  }
  const gapLimitPx = own(bake, 'gapLimitPx');
  if (gapLimitPx !== (0.2 satisfies CompiledOwnership['bake']['gapLimitPx'])) fail('invalid gap limit');
  const maxMeasuredGapPx = finite(own(bake, 'maxMeasuredGapPx'), 'maxMeasuredGapPx');
  if (maxMeasuredGapPx < 0 || maxMeasuredGapPx > gapLimitPx) fail('invalid measured gap metadata');
  const startMs = finite(own(bake, 'startMs'), 'bake.startMs');
  const endMs = finite(own(bake, 'endMs'), 'bake.endMs');
  if (endMs <= startMs || startMs < source.startMs || endMs > source.endMs) {
    fail('bake must have a positive global span inside the original source');
  }
  const rawSamples = own(bake, 'samples');
  if (!Array.isArray(rawSamples) || rawSamples.length < 2) fail('bake requires retained endpoints');
  const gripIds: string[] = [];
  for (const grip of source.grips) gripIds.push(grip.id);
  const gripSet = new Set(gripIds);
  const samples: OwnershipBakeSample[] = [];
  const retainedTimes = new Set<number>();
  for (let index = 0; index < rawSamples.length; index += 1) {
    const raw = record(own(rawSamples, String(index)), 'sample');
    const timeMs = finite(own(raw, 'timeMs'), 'sample.timeMs');
    if (timeMs < startMs || timeMs > endMs
      || (index > 0 && timeMs <= samples[index - 1]!.timeMs)) fail('sample times must be strictly ordered inside the bake');
    const center = point(own(raw, 'center'), 'sample.center');
    const rawPalms = record(own(raw, 'palms'), 'sample.palms');
    const keys = Reflect.ownKeys(rawPalms);
    if (keys.length !== gripIds.length) fail('palms must contain exactly every original grip');
    for (const key of keys) {
      if (typeof key !== 'string' || !gripSet.has(key)) fail('palms contains an undeclared key');
    }
    const palms = Object.create(null) as Record<string, Point>;
    for (const id of gripIds) palms[id] = point(own(rawPalms, id), `sample.palms[${id}]`);
    const expected = phaseState(source, timeMs);
    const rawActive = own(raw, 'activeGripIds');
    if (!Array.isArray(rawActive) || rawActive.length !== expected.activeGripIds.length) {
      fail('activeGripIds differs from the original phase');
    }
    const activeGripIds: string[] = [];
    const seen = new Set<string>();
    for (let activeIndex = 0; activeIndex < rawActive.length; activeIndex += 1) {
      const id = own(rawActive, String(activeIndex));
      if (typeof id !== 'string' || seen.has(id) || !expected.activeGripIds.includes(id)) {
        fail('activeGripIds is not the exact original active set');
      }
      seen.add(id);
      activeGripIds.push(id);
    }
    const authorityDescriptor = Object.getOwnPropertyDescriptor(raw, 'authorityGripId');
    if (!authorityDescriptor && 'authorityGripId' in raw) fail('authorityGripId must not be inherited');
    const authority = authorityDescriptor ? own(raw, 'authorityGripId') : undefined;
    if (authority !== expected.authorityGripId) fail('authorityGripId differs from the original phase');
    const sample: OwnershipBakeSample = { timeMs, center, palms, activeGripIds };
    if (typeof authority === 'string') sample.authorityGripId = authority;
    samples.push(sample);
    retainedTimes.add(timeMs);
  }
  if (!Object.is(samples[0]!.timeMs, startMs) || !Object.is(samples[samples.length - 1]!.timeMs, endMs)) {
    fail('retained endpoints must exactly match bake endpoints');
  }
  // The baker retains original phase boundaries. Their geometry may be an
  // interval endpoint, but their discrete annotation must never be tweened.
  for (const phase of source.phases) {
    for (const boundary of [phase.startMs, phase.endMs]) {
      if (boundary >= startMs && boundary <= endMs && !retainedTimes.has(boundary)) {
        fail('bake is missing an original phase boundary');
      }
    }
  }
  return { source, startMs, endMs, samples, gripIds };
}

function coordinate(a: number, b: number, fraction: number): number {
  const value = (a < 0) !== (b < 0)
    ? (1 - fraction) * a + fraction * b
    : a + (b - a) * fraction;
  if (!Number.isFinite(value)) fail('interpolated coordinate is not finite');
  return value;
}

function interpolate(a: Point, b: Point, fraction: number): Point {
  return { x: coordinate(a.x, b.x, fraction), y: coordinate(a.y, b.y, fraction) };
}

/** Candidate-only DRAWN geometry; no physical sampling, contact proof or approval. */
export function ownershipBakeAt(item: CompiledOwnership, globalTimeMs: number): OwnershipBakeSample {
  finite(globalTimeMs, 'globalTimeMs');
  const bake = ownershipBakeSnapshot(item);
  if (globalTimeMs < bake.startMs || globalTimeMs > bake.endMs) fail('query time is outside the bake');
  let upper = 0;
  while (bake.samples[upper]!.timeMs < globalTimeMs) upper += 1;
  const right = bake.samples[upper]!;
  let center = right.center;
  let palms = right.palms;
  if (right.timeMs !== globalTimeMs) {
    const left = bake.samples[upper - 1]!;
    const duration = right.timeMs - left.timeMs;
    const fraction = (globalTimeMs - left.timeMs) / duration;
    if (!Number.isFinite(duration) || duration <= 0
      || !Number.isFinite(fraction) || fraction <= 0 || fraction >= 1) {
      fail('query has no representable interior interpolation fraction');
    }
    center = interpolate(left.center, right.center, fraction);
    palms = Object.create(null) as Record<string, Point>;
    for (const id of bake.gripIds) palms[id] = interpolate(left.palms[id]!, right.palms[id]!, fraction);
  }
  // Query the complete original timeline, including its terminal endpoint rule.
  // Even a right endpoint belonging to the next phase contributes geometry only.
  const state = phaseState(bake.source, globalTimeMs);
  return {
    timeMs: globalTimeMs, center, palms, activeGripIds: state.activeGripIds,
    ...(state.authorityGripId === undefined ? {} : { authorityGripId: state.authorityGripId }),
  };
}

/** Extrema of canonical retained centers, not physical/artwork/contact bounds. */
export function ownershipBakeCenterBounds(item: CompiledOwnership): {
  left: number; right: number; top: number; bottom: number;
} {
  const { samples } = ownershipBakeSnapshot(item);
  const first = samples[0]!.center;
  let left = first.x, right = first.x, top = first.y, bottom = first.y;
  for (const sample of samples) {
    left = Math.min(left, sample.center.x);
    right = Math.max(right, sample.center.x);
    top = Math.min(top, sample.center.y);
    bottom = Math.max(bottom, sample.center.y);
  }
  return { left, right, top, bottom };
}
