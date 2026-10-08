// Declarations only: do not import/execute this file here. The parent owns checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SECONDARY_MOTION_VERSION, SECONDARY_MOTION_DELAYS_MS, SECONDARY_MOTION_WEIGHTS,
  SECONDARY_MOTION_LAG_MS, SECONDARY_MOTION_MAX_DISPLACEMENT_PX,
  SECONDARY_MOTION_MAX_ANGLE_DEG, secondaryMotionDescription, sampleSecondaryMotion,
  type SecondaryMotionInput, type SecondaryMotionPose,
} from '../packages/animation/view-secondary-motion.js';

function near(actual: number, expected: number, tolerance = 1e-12): void {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`);
}

test('published immutable kernel matches isolated head impulses and retains pending metadata', () => {
  assert.equal(SECONDARY_MOTION_VERSION, 'native-secondary-motion-1');
  assert.deepEqual(SECONDARY_MOTION_DELAYS_MS, [0, 40, 80, 120, 160]);
  assert.deepEqual(SECONDARY_MOTION_WEIGHTS, [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16]);
  assert.equal(SECONDARY_MOTION_LAG_MS, 160);
  assert.equal(SECONDARY_MOTION_MAX_DISPLACEMENT_PX, 32);
  assert.equal(SECONDARY_MOTION_MAX_ANGLE_DEG, 8);
  assert.ok(Object.isFrozen(SECONDARY_MOTION_DELAYS_MS));
  assert.ok(Object.isFrozen(SECONDARY_MOTION_WEIGHTS));
  const description = secondaryMotionDescription;
  assert.equal(description.version, SECONDARY_MOTION_VERSION);
  assert.strictEqual(description.delaysMs, SECONDARY_MOTION_DELAYS_MS);
  assert.strictEqual(description.weights, SECONDARY_MOTION_WEIGHTS);
  assert.equal(description.lagMs, 160);
  assert.equal(description.maxDisplacementPx, 32);
  assert.equal(description.maxAngleDeg, 8);
  assert.match(description.fingerprint, /^[a-f0-9]{64}$/);
  assert.ok(description.pending.length > 0);
  assert.ok(Object.isFrozen(description) && Object.isFrozen(description.pending));
  assert.equal(description.verified, false);
  assert.equal(description.productionReady, false);
  assert.equal(description.approved, false);

  // A 16px impulse isolates each historical contribution. A current impulse
  // instead opposes all four historical taps, giving -15px before bounding.
  for (const [impulseMs, displacement] of [[2000, -15], [1960, 4], [1920, 6], [1880, 4], [1840, 1]] as const) {
    const result = sampleSecondaryMotion({ timeMs: 2000, startMs: 1000, endMs: 3000, scale: 1,
      sample: atMs => ({ x: atMs === impulseMs ? 16 : 0, y: 0, angle: 0 }),
    });
    near(result.x, 32 * Math.tanh(displacement / 32));
    assert.equal(result.y, 0);
    assert.equal(result.angle, 0);
  }
});

test('constant head poses have exactly zero drift at fractional times, run edges and any scale', () => {
  for (const pose of [
    { x: 123456789.125, y: -987654321.5, angle: -901.25 },
    { x: Number.MAX_VALUE, y: -Number.MAX_VALUE, angle: 1e300 },
    { x: -0, y: 0, angle: -0 },
  ]) {
    for (const scale of [0.125, 1, 9, Number.MIN_VALUE]) {
      for (const timeMs of [1000, 1000.5, 1080, 1160, 1740.25, 2000]) {
        assert.deepEqual(sampleSecondaryMotion({ timeMs, startMs: 1000, endMs: 2000, scale,
          sample: () => pose,
        }), { x: 0, y: 0, angle: 0 });
      }
    }
  }
});

test('constant velocity gives the analytic 80ms delay before native radial compression', () => {
  // Velocity (3/8, 1/2) world px/ms and scale 2 give (-15,-20)
  // native pixels of lag: radius 25, with direction (-3/5,-4/5).
  const radius = 32 * Math.tanh(25 / 32);
  for (const direction of [1, -1]) {
    const result = sampleSecondaryMotion({ timeMs: 1400, startMs: 1000, endMs: 2000, scale: 2,
      sample: atMs => ({
        x: 17 + direction * (atMs - 1000) * 3 / 8,
        y: 49 + direction * (atMs - 1000) / 2, angle: 0,
      }),
    });
    near(result.x, -direction * 3 / 5 * radius);
    near(result.y, -direction * 4 / 5 * radius);
    assert.equal(result.angle, 0);
  }
});

test('pure rotation gives an analytic signed delay across either 180-degree seam and full turns', () => {
  for (const direction of [1, -1]) {
    for (const fullTurns of [-3, 0, 2]) {
      const result = sampleSecondaryMotion({ timeMs: 1400, startMs: 1000, endMs: 2000, scale: 3,
        sample: atMs => {
          const degrees = direction * (182 + (atMs - 1400) / 40);
          const wrapped = degrees > 180 ? degrees - 360 : degrees < -180 ? degrees + 360 : degrees;
          return { x: 70, y: -30, angle: wrapped + fullTurns * 360 };
        },
      });
      assert.equal(result.x, 0);
      assert.equal(result.y, 0);
      near(result.angle, -direction * 8 * Math.tanh(2 / 8));
    }
  }
  // A held orientation expressed with different complete turns is stationary.
  assert.deepEqual(sampleSecondaryMotion({ timeMs: 1400, startMs: 1000, endMs: 2000, scale: 1,
    sample: atMs => ({ x: 3, y: 4, angle: atMs === 1400 ? 180 : -540 }),
  }), { x: 0, y: 0, angle: 0 });
  for (const halfTurn of [-180, 180]) {
    const result = sampleSecondaryMotion({ timeMs: 1400, startMs: 1000, endMs: 2000, scale: 1,
      sample: atMs => ({ x: 0, y: 0, angle: atMs === 1400 ? 0 : halfTurn }),
    });
    near(result.angle, Math.sign(halfTurn) * 8 * Math.tanh(168.75 / 8));
  }
});

test('translation is resolved in the current head basis using inverse rotation', () => {
  // World lag (-20,-10), rotated by -90 degrees and divided by 2,
  // becomes native (-5,10). Historical angles do not define this basis.
  const radius = Math.sqrt(125), influence = 32 * Math.tanh(radius / 32) / radius;
  for (const currentAngle of [90, 450, -270]) {
    const result = sampleSecondaryMotion({ timeMs: 1400, startMs: 1000, endMs: 2000, scale: 2,
      sample: atMs => ({ x: (atMs - 1000) / 4, y: (atMs - 1000) / 8,
        angle: currentAngle + (atMs - 1400) / 40 }),
    });
    near(result.x, -5 * influence);
    near(result.y, 10 * influence);
    near(result.angle, -8 * Math.tanh(2 / 8));
  }
});

test('native motion is invariant under world translation and matching world/native scale changes', () => {
  const nativePose = (atMs: number): SecondaryMotionPose => ({
    x: (atMs - 1000) / 16, y: (atMs - 1000) ** 2 / 4096,
    angle: 45 + (atMs - 1000) / 80,
  });
  for (const timeMs of [1000, 1040.5, 1160, 1500, 2000]) {
    const expected = sampleSecondaryMotion({ timeMs, startMs: 1000, endMs: 2000, scale: 1, sample: nativePose });
    for (const scale of [0.25, 2, 8]) {
      const actual = sampleSecondaryMotion({ timeMs, startMs: 1000, endMs: 2000, scale,
        sample: atMs => {
          const pose = nativePose(atMs);
          return { x: 512 + pose.x * scale, y: -256 + pose.y * scale, angle: pose.angle };
        },
      });
      near(actual.x, expected.x, 1e-10);
      near(actual.y, expected.y, 1e-10);
      near(actual.angle, expected.angle);
    }
  }
});

test('large diagonal head steps stay within a radial 32px bound and an 8-degree angle bound', () => {
  for (const distance of [1e-6, 32, 320, 1e120]) {
    for (const sign of [-1, 1]) {
      const result = sampleSecondaryMotion({ timeMs: 2000, startMs: 1000, endMs: 3000, scale: 1,
        sample: atMs => atMs === 2000 ? { x: 0, y: 0, angle: 0 }
          : { x: sign * 3 / 5 * distance, y: sign * 4 / 5 * distance, angle: sign * 179 },
      });
      const expectedRadius = 32 * Math.tanh(distance * 15 / 16 / 32);
      near(Math.hypot(result.x, result.y), expectedRadius);
      assert.ok(Math.hypot(result.x, result.y) <= 32 + 1e-12);
      assert.ok(Math.abs(result.angle) <= 8);
      near(result.x, sign * 3 / 5 * expectedRadius);
      near(result.y, sign * 4 / 5 * expectedRadius);
      near(result.angle, sign * 8 * Math.tanh(179 * 15 / 16 / 8));
    }
  }
  // Unequal opposing excursions cancel before either bound is applied.
  // Bounding individual taps first would introduce translation/angle drift.
  assert.deepEqual(sampleSecondaryMotion({ timeMs: 2000, startMs: 1000, endMs: 3000, scale: 1,
    sample: atMs => atMs === 1960 ? { x: 1500, y: 0, angle: 60 }
      : atMs === 1920 ? { x: -1000, y: 0, angle: -40 } : { x: 0, y: 0, angle: 0 },
  }), { x: 0, y: 0, angle: 0 });
});

test('causal windows clamp to the run and sample each unique time exactly once including current', () => {
  const cases: readonly [number, readonly number[]][] = [
    [1000, [1000]],
    [1000.5, [1000, 1000.5]],
    [1040, [1000, 1040]],
    [1060, [1000, 1020, 1060]],
    [1160, [1000, 1040, 1080, 1120, 1160]],
    [2000, [1840, 1880, 1920, 1960, 2000]],
  ];
  for (const [timeMs, expectedReads] of cases) {
    const reads: number[] = [];
    const result = sampleSecondaryMotion({ timeMs, startMs: 1000, endMs: 2000, scale: 1,
      sample: atMs => {
        assert.ok(atMs >= Math.max(1000, timeMs - 160) && atMs <= timeMs);
        assert.ok(!reads.includes(atMs), `duplicate read at ${atMs}`);
        reads.push(atMs);
        return { x: atMs - 1000, y: 0, angle: 0 };
      },
    });
    assert.deepEqual([...reads].sort((a, b) => a - b), expectedReads);
    assert.equal(reads.filter(atMs => atMs === timeMs).length, 1);
    if (timeMs === 1000) assert.deepEqual(result, { x: 0, y: 0, angle: 0 });
    // Repeated clamped taps retain their original weight, not a renormalized
    // weight per unique read: effective delay here is 51.25ms, not 33.33ms.
    if (timeMs === 1060) near(result.x, -32 * Math.tanh(51.25 / 32));
  }
});

test('random and reverse seeks reproduce the same source motion and preserve history at camera cuts', () => {
  const drive = (atMs: number): SecondaryMotionPose => ({
    x: 13 + (atMs - 1000) ** 2 / 4096,
    y: 4 * Math.cos((atMs - 1000) / 160),
    angle: 170 + (atMs - 1000) / 40,
  });
  const run = { startMs: 1000, endMs: 3000, scale: 1.5, sample: drive };
  const times = [1000, 1000.5, 1040, 1159.75, 1160, 1499.5, 1500, 1500.5, 2000, 2500, 3000];
  const baseline = new Map<number, SecondaryMotionPose>(times.map(timeMs => [timeMs, sampleSecondaryMotion({ ...run, timeMs })]));
  for (const order of [
    [...times].reverse(),
    [1500, 1000.5, 3000, 1160, 2000, 1000, 1500.5, 1040, 2500, 1159.75, 1499.5, 1500],
  ]) {
    for (const timeMs of order) {
      // Interleave another source at the same time to expose cross-call caches.
      sampleSecondaryMotion({ ...run, timeMs, scale: 0.5,
        sample: atMs => ({ x: -atMs, y: atMs / 3, angle: -atMs / 100 }),
      });
      assert.deepEqual(sampleSecondaryMotion({ ...run, timeMs }), baseline.get(timeMs));
    }
  }
  const shots = [{ startMs: 1000, endMs: 1500 }, { startMs: 1500, endMs: 3000 }];
  for (const shot of shots) {
    const localTimeMs = shot.startMs === 1000 ? shot.endMs - shot.startMs : 0;
    const reads: number[] = [];
    const atCut = sampleSecondaryMotion({ ...run, timeMs: shot.startMs + localTimeMs,
      sample: atMs => { reads.push(atMs); return drive(atMs); },
    });
    assert.deepEqual(atCut, baseline.get(1500));
    assert.notDeepEqual(atCut, { x: 0, y: 0, angle: 0 });
    assert.deepEqual([...reads].sort((a, b) => a - b), [1340, 1380, 1420, 1460, 1500]);
  }
});

test('invalid times, run bounds and scales fail with the phase marker before sampling', () => {
  const reads: number[] = [];
  const input: SecondaryMotionInput = { timeMs: 1400, startMs: 1000, endMs: 2000, scale: 1,
    sample: atMs => { reads.push(atMs); return { x: 0, y: 0, angle: 0 }; },
  };
  const invalid: Partial<SecondaryMotionInput>[] = [
    ...[NaN, Infinity, -Infinity, 999.999, 2000.001].map(timeMs => ({ timeMs })),
    ...[NaN, Infinity, -Infinity, -1, 1000.5, 2000, 2001].map(startMs => ({ startMs })),
    ...[NaN, Infinity, -Infinity, -1, 999, 1000, 2000.5].map(endMs => ({ endMs })),
    ...[NaN, Infinity, -Infinity, 0, -0, -1].map(scale => ({ scale })),
  ];
  for (const patch of invalid) {
    assert.throws(() => sampleSecondaryMotion({ ...input, ...patch }), /^Error: needs-view-secondary:/);
  }
  assert.throws(() => sampleSecondaryMotion({ ...input, sample: undefined as unknown as SecondaryMotionInput['sample'] }),
    /^Error: needs-view-secondary:/);
  assert.throws(() => sampleSecondaryMotion(null as unknown as SecondaryMotionInput), /^Error: needs-view-secondary:/);
  assert.deepEqual(reads, []);
});

test('every sampled pose rejects nonfinite or missing fields and numeric overflow cannot leak out', () => {
  for (const badTime of [1400, 1360, 1320, 1280, 1240]) {
    for (const field of ['x', 'y', 'angle'] as const) {
      for (const value of [NaN, Infinity, -Infinity, undefined, '1']) {
        assert.throws(() => sampleSecondaryMotion({ timeMs: 1400, startMs: 1000, endMs: 2000, scale: 1,
          sample: atMs => atMs === badTime
            ? { x: 0, y: 0, angle: 0, [field]: value } as unknown as SecondaryMotionPose
            : { x: 0, y: 0, angle: 0 },
        }), /^Error: needs-view-secondary:/);
      }
    }
    for (const pose of [null, undefined, {}]) {
      assert.throws(() => sampleSecondaryMotion({ timeMs: 1400, startMs: 1000, endMs: 2000, scale: 1,
        sample: atMs => atMs === badTime ? pose as SecondaryMotionPose : { x: 0, y: 0, angle: 0 },
      }), /^Error: needs-view-secondary:/);
    }
  }
  // Finite samples can still exceed representable displacement arithmetic.
  assert.throws(() => sampleSecondaryMotion({ timeMs: 1400, startMs: 1000, endMs: 2000, scale: 1,
    sample: atMs => ({ x: atMs === 1400 ? Number.MAX_VALUE : -Number.MAX_VALUE, y: 0, angle: 0 }),
  }), /^Error: needs-view-secondary:/);
  assert.throws(() => sampleSecondaryMotion({ timeMs: 1400, startMs: 1000, endMs: 2000, scale: Number.MIN_VALUE,
    sample: atMs => ({ x: atMs === 1400 ? 0 : 1, y: 0, angle: 0 }),
  }), /^Error: needs-view-secondary:/);
  assert.throws(() => sampleSecondaryMotion({ timeMs: 1400, startMs: 1000, endMs: 2000, scale: 1,
    sample: atMs => atMs === 1400 ? { x: 0, y: 0, angle: 0 }
      : { x: Number.MAX_VALUE, y: Number.MAX_VALUE, angle: 0 },
  }), /^Error: needs-view-secondary:/);
});

test('sampling preserves caller input and frozen poses, snapshots reused objects and owns each result', () => {
  const poses = new Map<number, Readonly<SecondaryMotionPose>>([1400, 1360, 1320, 1280, 1240].map(atMs => [atMs,
    Object.freeze({ x: (atMs - 1000) / 8, y: (atMs - 1000) / 16, angle: 90 }),
  ]));
  const before = [...poses].map(([atMs, pose]) => [atMs, { ...pose }]);
  const input = Object.freeze({ timeMs: 1400, startMs: 1000, endMs: 2000, scale: 2,
    sample: (atMs: number): SecondaryMotionPose => poses.get(atMs)!,
  });
  const inputBefore = { ...input };
  const expected = sampleSecondaryMotion(input);
  assert.deepEqual(input, inputBefore);
  assert.deepEqual([...poses], before);

  const scratch = { x: 0, y: 0, angle: 0 };
  const mutableInput: SecondaryMotionInput = { ...input, sample: atMs => {
    scratch.x = (atMs - 1000) / 8;
    scratch.y = (atMs - 1000) / 16;
    scratch.angle = 90;
    return scratch;
  } };
  const mutableBefore = { ...mutableInput };
  const actual = sampleSecondaryMotion(mutableInput);
  assert.deepEqual(actual, expected);
  assert.deepEqual(mutableInput, mutableBefore);
  assert.equal(Object.isFrozen(mutableInput), false);
  assert.equal(Object.isFrozen(scratch), false);
  actual.x = 999;
  actual.y = -999;
  actual.angle = 999;
  assert.deepEqual(sampleSecondaryMotion(input), expected);
  assert.deepEqual(sampleSecondaryMotion(mutableInput), expected);
  assert.deepEqual([...poses], before);
});
