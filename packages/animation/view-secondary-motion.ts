// Contract metadata is shared with Studio schemas. Hash the identical JSON
// bytes without importing Node fs/crypto/process into the browser graph.
import { jsonSha256 as hash } from '../core/json-sha256.js';

export const SECONDARY_MOTION_VERSION = 'native-secondary-motion-1' as const;
export const SECONDARY_MOTION_DELAYS_MS = Object.freeze([0, 40, 80, 120, 160] as const);
export const SECONDARY_MOTION_WEIGHTS = Object.freeze([1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16] as const);
/** Window extent; the unclamped kernel's mean delay is 80ms. */
export const SECONDARY_MOTION_LAG_MS = 160;
export const SECONDARY_MOTION_MAX_DISPLACEMENT_PX = 32;
export const SECONDARY_MOTION_MAX_ANGLE_DEG = 8;

export type SecondaryMotionPose = { x: number; y: number; angle: number };
export type SecondaryMotionInput = {
  timeMs: number;
  startMs: number;
  endMs: number;
  /** World pixels per native source pixel, excluding the camera transform. */
  scale: number;
  /** Original head pose in world pixels/degrees on the absolute run clock. */
  sample: (atMs: number) => SecondaryMotionPose;
};

function finite(value: number, description: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`needs-view-secondary: ${description} must be finite`);
  }
  return value;
}

/** Preserve the sign of an exact half turn; equivalent full turns give zero. */
function angleDelta(previous: number, current: number): number {
  let delta = (previous % 360 - current % 360) % 360;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

/** Stateless rigid local offsets for original native hair/beard layers.
 * All times refer to the same complete original run, including across cuts.
 * Only unique causal, run-clamped taps are read; neither poses nor input mutate.
 * Differences are averaged before rotation/scale and tanh bounds, so a held
 * head has exactly zero drift. No artwork or face deformation is generated. */
export function sampleSecondaryMotion(input: SecondaryMotionInput): SecondaryMotionPose {
  if (input === null || typeof input !== 'object') {
    throw new Error('needs-view-secondary: expected sampling input');
  }
  // Snapshot the request before invoking caller code.
  const { timeMs, startMs, endMs, scale, sample } = input;
  finite(timeMs, 'absolute time');
  if (!Number.isInteger(startMs) || !Number.isInteger(endMs)
    || startMs < 0 || endMs < 0 || endMs <= startMs) {
    throw new Error('needs-view-secondary: run bounds must be nonnegative integers with positive span');
  }
  if (timeMs < startMs || timeMs > endMs) {
    throw new Error('needs-view-secondary: absolute time is outside the original run');
  }
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('needs-view-secondary: scale must be finite and positive');
  }
  if (typeof sample !== 'function') {
    throw new Error('needs-view-secondary: expected a head pose sampler');
  }

  // Per-evaluation cache, including the current tap. Copy poses because a
  // caller may reuse a scratch object while sampling different times.
  const cache = new Map<number, SecondaryMotionPose>();
  const read = (atMs: number): SecondaryMotionPose => {
    const cached = cache.get(atMs);
    if (cached) return cached;
    const pose = sample(atMs);
    if (pose === null || typeof pose !== 'object') {
      throw new Error('needs-view-secondary: expected a finite head pose');
    }
    const { x, y, angle } = pose;
    const snapshot = {
      x: finite(x, 'head x'), y: finite(y, 'head y'), angle: finite(angle, 'head angle'),
    };
    cache.set(atMs, snapshot);
    return snapshot;
  };

  const current = read(timeMs);
  let worldX = 0, worldY = 0, angle = 0;
  for (const [index, delayMs] of SECONDARY_MOTION_DELAYS_MS.entries()) {
    const previous = read(Math.max(startMs, Math.min(endMs, timeMs - delayMs)));
    const weight = SECONDARY_MOTION_WEIGHTS[index]!;
    worldX += finite(previous.x - current.x, 'head x displacement') * weight;
    worldY += finite(previous.y - current.y, 'head y displacement') * weight;
    angle += angleDelta(previous.angle, current.angle) * weight;
  }
  finite(worldX, 'weighted world x');
  finite(worldY, 'weighted world y');
  const radians = (current.angle % 360) * Math.PI / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  // R(-current.angle), then world pixels -> native source pixels.
  const localX = finite((worldX * cos + worldY * sin) / scale, 'local x displacement');
  const localY = finite((-worldX * sin + worldY * cos) / scale, 'local y displacement');
  const radius = finite(Math.hypot(localX, localY), 'local displacement radius');
  const influence = radius === 0 ? 0
    : SECONDARY_MOTION_MAX_DISPLACEMENT_PX * Math.tanh(radius / SECONDARY_MOTION_MAX_DISPLACEMENT_PX) / radius;
  const x = localX * influence, y = localY * influence;
  const boundedAngle = SECONDARY_MOTION_MAX_ANGLE_DEG * Math.tanh(angle / SECONDARY_MOTION_MAX_ANGLE_DEG);
  // Canonicalize signed zeros, including stationary poses at any orientation.
  return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y, angle: boundedAngle === 0 ? 0 : boundedAngle };
}

const contract = Object.freeze({
  version: SECONDARY_MOTION_VERSION,
  delaysMs: SECONDARY_MOTION_DELAYS_MS,
  weights: SECONDARY_MOTION_WEIGHTS,
  lagMs: SECONDARY_MOTION_LAG_MS,
  maxDisplacementPx: SECONDARY_MOTION_MAX_DISPLACEMENT_PX,
  maxAngleDeg: SECONDARY_MOTION_MAX_ANGLE_DEG,
  clock: 'absolute original run milliseconds; inclusive bounds; no shot reset',
  sampling: 'unique causal clamped taps; current pose shares a per-call snapshot cache',
  displacement: 'weighted previous-current world delta; rotate by negative current head angle; divide by world/native scale; radial tanh',
  angle: 'weighted shortest signed previous-current degrees in [-180,180]; signed half-turn ties; tanh',
  artwork: 'rigid local deltas for original native hair/beard layers; no new artwork or face warp',
});

/** Source contract fingerprint only; runtime and visual acceptance remain pending. */
export const secondaryMotionDescription = Object.freeze({
  ...contract,
  fingerprint: hash(contract),
  pending: Object.freeze([
    'native region/UV seam, face and identity quality acceptance',
    'head/body/expression original clock runtime acceptance',
    'motion, performance and production acceptance',
  ]),
  verified: false,
  productionReady: false,
  approved: false,
});
