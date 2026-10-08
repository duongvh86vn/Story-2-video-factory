// NOT RUN by this implementation sidecar. Runtime acceptance belongs to the parent's test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Moods } from '../packages/animation/schemas.js';
import {
  VIEW_EXPRESSION_RAMP_MS, ViewExpressionSchema,
  normalizeViewExpressions, projectViewExpressions, type ViewExpression,
} from '../packages/animation/view-expression-track.js';

test('expression schema accepts every existing mood and exposes the compiler ramp bound', () => {
  assert.equal(VIEW_EXPRESSION_RAMP_MS, 140);
  for (const mood of Moods) {
    const expression = { startMs: 0, endMs: 1, mood };
    assert.deepEqual(ViewExpressionSchema.parse(expression), expression);
  }
});

test('normalization sorts and merges without mutating or aliasing caller data', () => {
  const track: readonly ViewExpression[] = Object.freeze([
    Object.freeze({ startMs: 200, endMs: 300, mood: 'happy' as const }),
    Object.freeze({ startMs: 0, endMs: 100, mood: 'curious' as const }),
    Object.freeze({ startMs: 100, endMs: 200, mood: 'happy' as const }),
  ]);
  const before = JSON.stringify(track);
  const normalized = normalizeViewExpressions(track);
  assert.deepEqual(normalized, [
    { startMs: 0, endMs: 100, mood: 'curious' },
    { startMs: 100, endMs: 300, mood: 'happy' },
  ]);
  assert.equal(JSON.stringify(track), before);
  assert.notStrictEqual(normalized, track);
  for (const expression of normalized) assert.ok(!track.includes(expression));
  normalized[0]!.endMs = 50;
  normalized[1]!.mood = 'sad';
  assert.equal(JSON.stringify(track), before);
});

test('adjacent equal moods form a held interval while different moods retain their boundaries', () => {
  const track: ViewExpression[] = [
    { startMs: 300, endMs: 400, mood: 'sad' },
    { startMs: 100, endMs: 200, mood: 'happy' },
    { startMs: 400, endMs: 500, mood: 'sad' },
    { startMs: 0, endMs: 100, mood: 'happy' },
    { startMs: 200, endMs: 300, mood: 'happy' },
  ];
  const normalized = normalizeViewExpressions(track);
  assert.deepEqual(normalized, [
    { startMs: 0, endMs: 300, mood: 'happy' },
    { startMs: 300, endMs: 500, mood: 'sad' },
  ]);
  assert.deepEqual(normalizeViewExpressions(normalized), normalized);
});

test('empty tracks and real gaps are preserved without inventing neutral expressions', () => {
  assert.deepEqual(normalizeViewExpressions([]), []);
  assert.deepEqual(projectViewExpressions([], 0, 100), []);
  const track: ViewExpression[] = [
    { startMs: 10, endMs: 20, mood: 'happy' },
    { startMs: 21, endMs: 30, mood: 'happy' },
  ];
  assert.deepEqual(normalizeViewExpressions(track), track);
  assert.deepEqual(projectViewExpressions(track, 15, 25), [
    { startMs: 0, endMs: 5, mood: 'happy' },
    { startMs: 6, endMs: 10, mood: 'happy' },
  ]);
  assert.deepEqual(projectViewExpressions(track, 20, 21), []);
});

test('projection excludes intervals touching only the half-open shot boundaries', () => {
  const track: ViewExpression[] = [
    { startMs: 0, endMs: 100, mood: 'happy' },
    { startMs: 100, endMs: 200, mood: 'sad' },
    { startMs: 200, endMs: 300, mood: 'angry' },
  ];
  assert.deepEqual(projectViewExpressions(track, 100, 200), [
    { startMs: 0, endMs: 100, mood: 'sad' },
  ]);
  assert.deepEqual(projectViewExpressions(track, 300, 400), []);
});

test('cross-cut projections retain exact intersections, gaps and mood transitions', () => {
  const track: ViewExpression[] = [
    { startMs: 1400, endMs: 2200, mood: 'relieved' },
    { startMs: 400, endMs: 1400, mood: 'concerned' },
    { startMs: 2400, endMs: 2800, mood: 'happy' },
  ];
  const before = structuredClone(track);
  assert.deepEqual(projectViewExpressions(track, 900, 1700), [
    { startMs: 0, endMs: 500, mood: 'concerned' },
    { startMs: 500, endMs: 800, mood: 'relieved' },
  ]);
  assert.deepEqual(projectViewExpressions(track, 1700, 2600), [
    { startMs: 0, endMs: 500, mood: 'relieved' },
    { startMs: 700, endMs: 900, mood: 'happy' },
  ]);
  assert.deepEqual(track, before);
});

test('projection coalesces source fragments and never aliases caller intervals', () => {
  const track: readonly ViewExpression[] = Object.freeze([
    Object.freeze({ startMs: 200, endMs: 500, mood: 'thinking' as const }),
    Object.freeze({ startMs: 0, endMs: 200, mood: 'thinking' as const }),
  ]);
  const before = JSON.stringify(track);
  const projected = projectViewExpressions(track, 100, 400);
  assert.deepEqual(projected, [{ startMs: 0, endMs: 300, mood: 'thinking' }]);
  assert.ok(!track.includes(projected[0]!));
  projected[0]!.endMs = 1;
  assert.equal(JSON.stringify(track), before);
  assert.deepEqual(projectViewExpressions(track, 99, 100), [
    { startMs: 0, endMs: 1, mood: 'thinking' },
  ]);
});

test('strict expression schema rejects invalid fields, unknown moods and nonfinite times', () => {
  const expression: ViewExpression = { startMs: 0, endMs: 100, mood: 'happy' };
  for (const field of ['startMs', 'endMs'] as const) {
    for (const value of [NaN, Infinity, -Infinity, -1, 0.5, '100', null, undefined]) {
      const invalid = { ...expression, [field]: value };
      assert.equal(ViewExpressionSchema.safeParse(invalid).success, false);
      assert.throws(() => normalizeViewExpressions([invalid as unknown as ViewExpression]));
    }
  }
  for (const invalid of [
    { ...expression, endMs: 0 },
    { ...expression, mood: 'unknown' },
    { ...expression, mood: 'Happy' },
    { ...expression, mood: undefined },
    { ...expression, extra: true },
  ]) {
    assert.equal(ViewExpressionSchema.safeParse(invalid).success, false);
    assert.throws(() => normalizeViewExpressions([invalid as unknown as ViewExpression]));
  }
});

test('normalization rejects zero or reversed duration and all overlaps, including equal moods', () => {
  const invalidTracks: ViewExpression[][] = [
    [{ startMs: 100, endMs: 100, mood: 'happy' }],
    [{ startMs: 100, endMs: 50, mood: 'happy' }],
    [{ startMs: 100, endMs: 200, mood: 'sad' }, { startMs: 0, endMs: 101, mood: 'happy' }],
    [{ startMs: 0, endMs: 300, mood: 'happy' }, { startMs: 100, endMs: 200, mood: 'happy' }],
    [{ startMs: 0, endMs: 100, mood: 'happy' }, { startMs: 0, endMs: 100, mood: 'happy' }],
    [
      { startMs: 0, endMs: 100, mood: 'happy' },
      { startMs: 100, endMs: 200, mood: 'happy' },
      { startMs: 150, endMs: 300, mood: 'happy' },
    ],
  ];
  for (const track of invalidTracks) {
    const before = structuredClone(track);
    assert.throws(() => normalizeViewExpressions(track), /invalid or overlapping expression intervals/);
    assert.deepEqual(track, before);
  }
});

test('projection validates the whole source track even when invalid data falls outside the shot', () => {
  const invalidTracks = [
    [{ startMs: 0, endMs: 100, mood: 'happy' }, { startMs: 50, endMs: 150, mood: 'sad' }],
    [{ startMs: 10, endMs: 10, mood: 'happy' }],
    [{ startMs: 0, endMs: 100, mood: 'unknown' }],
    [{ startMs: 0.5, endMs: 100, mood: 'happy' }],
    [{ startMs: NaN, endMs: 100, mood: 'happy' }],
    [{ startMs: 3000, endMs: Infinity, mood: 'happy' }],
    [{ startMs: 0, endMs: 100, mood: 'happy', extra: true }],
  ];
  for (const track of invalidTracks) {
    assert.throws(() => projectViewExpressions(track as unknown as ViewExpression[], 1000, 2000));
  }
});

test('projection rejects negative, empty, reversed, fractional and nonfinite shot spans', () => {
  const invalidSpans = [
    [-1, 100], [0, 0], [100, 100], [100, 50], [0.5, 100], [0, 100.5],
    [NaN, 100], [0, NaN], [Infinity, 100], [0, Infinity], [-Infinity, 100], [0, -Infinity],
  ];
  for (const [startMs, endMs] of invalidSpans) {
    assert.throws(() => projectViewExpressions([], startMs!, endMs!), /invalid expression projection span/);
  }
});
