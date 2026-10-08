// Declarations only: execution and typechecking belong to the parent task.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clothTriangleArea, clothTriangleMatrix, clothAreaInfluence,
  type ClothPoint, type ClothTriangle,
} from '../packages/animation/view-cloth-geometry.js';

test('triangle area is signed doubled area, including zero for a collinear triangle', () => {
  const triangle: ClothTriangle = [{ x: 2, y: 3 }, { x: 5, y: 3 }, { x: 2, y: 5 }];
  assert.equal(clothTriangleArea(triangle), 6);
  assert.equal(clothTriangleArea([triangle[0], triangle[2], triangle[1]]), -6);
  assert.equal(clothTriangleArea([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]), 0);
});

test('affine SVG coefficients map all vertices of a translated scalene triangle', () => {
  const from: ClothTriangle = [{ x: 1, y: 2 }, { x: 4, y: 3 }, { x: 2, y: 6 }];
  const to: ClothTriangle = [{ x: 8, y: 3 }, { x: 13.5, y: 9 }, { x: 8, y: 16 }];
  const matrix = clothTriangleMatrix(from, to);
  assert.deepEqual(matrix, [2, 1, -0.5, 3, 7, -4]);
  for (const index of [0, 1, 2] as const) {
    const point = from[index];
    const mapped: ClothPoint = {
      x: matrix[0]! * point.x + matrix[2]! * point.y + matrix[4]!,
      y: matrix[1]! * point.x + matrix[3]! * point.y + matrix[5]!,
    };
    assert.ok(Math.abs(mapped.x - to[index].x) < 1e-12);
    assert.ok(Math.abs(mapped.y - to[index].y) < 1e-12);
  }
});

test('matrix endpoints include identity and pure translation', () => {
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 3 }];
  const translated: ClothTriangle = [{ x: 7, y: -4 }, { x: 9, y: -4 }, { x: 7, y: -1 }];
  assert.deepEqual(clothTriangleMatrix(from, from), [1, 0, 0, 1, 0, 0]);
  assert.deepEqual(clothTriangleMatrix(from, translated), [1, 0, 0, 1, 7, -4]);
});

test('matrix rejects collapsed or reversed source and target triangles', () => {
  const valid: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const collapsed: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
  const reversed: ClothTriangle = [valid[0], valid[2], valid[1]];
  for (const invalid of [collapsed, reversed]) {
    assert.throws(() => clothTriangleMatrix(invalid, valid), /source.*positive, nondegenerate/);
    assert.throws(() => clothTriangleMatrix(valid, invalid), /target.*positive, nondegenerate/);
  }
});

test('all coordinates of source and target reject NaN and infinities', () => {
  const valid: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  for (const index of [0, 1, 2] as const) {
    for (const coordinate of ['x', 'y'] as const) {
      for (const value of [NaN, Infinity, -Infinity]) {
        const invalid: ClothTriangle = [{ ...valid[0] }, { ...valid[1] }, { ...valid[2] }];
        invalid[index][coordinate] = value;
        assert.throws(() => clothTriangleArea(invalid), /finite/);
        assert.throws(() => clothTriangleMatrix(invalid, valid), /finite/);
        assert.throws(() => clothTriangleMatrix(valid, invalid), /finite/);
        assert.throws(() => clothAreaInfluence([{ from: invalid, to: valid }]), /finite/);
        assert.throws(() => clothAreaInfluence([{ from: valid, to: invalid }]), /finite/);
      }
    }
  }
});

test('finite input coordinates cannot leak overflowing area, edge or matrix coefficients', () => {
  const valid: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const huge: ClothTriangle = [{ x: 0, y: 0 }, { x: Number.MAX_VALUE, y: 0 }, { x: 0, y: 2 }];
  const overflowingEdge: ClothTriangle = [
    { x: -Number.MAX_VALUE, y: 0 }, { x: Number.MAX_VALUE, y: 0 }, { x: 0, y: 1 },
  ];
  const tiny: ClothTriangle = [{ x: 0, y: 0 }, { x: Number.MIN_VALUE, y: 0 }, { x: 0, y: 1 }];
  for (const invalid of [huge, overflowingEdge]) {
    assert.throws(() => clothTriangleArea(invalid), /finite/);
    assert.throws(() => clothTriangleMatrix(invalid, valid), /finite/);
    assert.throws(() => clothTriangleMatrix(valid, invalid), /finite/);
    assert.throws(() => clothAreaInfluence([{ from: invalid, to: valid }]), /finite/);
    assert.throws(() => clothAreaInfluence([{ from: valid, to: invalid }]), /finite/);
  }
  assert.equal(clothTriangleArea(tiny), Number.MIN_VALUE);
  assert.throws(() => clothTriangleMatrix(tiny, valid), /matrix coefficient.*finite/);
});

test('finite endpoint areas cannot hide overflowing vertex displacement', () => {
  const from: ClothTriangle = [
    { x: 0, y: 0 }, { x: Number.MAX_VALUE, y: 0 }, { x: 0, y: 1 / Number.MAX_VALUE },
  ];
  const to: ClothTriangle = [
    { x: 0, y: 0 }, { x: -Number.MAX_VALUE, y: 0 }, { x: 0, y: 1 / Number.MAX_VALUE },
  ];
  assert.ok(Number.isFinite(clothTriangleArea(from)));
  assert.ok(Number.isFinite(clothTriangleArea(to)));
  assert.throws(() => clothAreaInfluence([{ from, to }]), /displacement.*finite/);
});

test('empty, unchanged, translated, expanding and threshold endpoint constraints allow full influence', () => {
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const translated: ClothTriangle = [{ x: 3, y: 4 }, { x: 4, y: 4 }, { x: 3, y: 5 }];
  const expanded: ClothTriangle = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }];
  const threshold: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0.25 }];
  assert.equal(clothAreaInfluence([]), 1);
  assert.equal(clothAreaInfluence([{ from, to: from }]), 1);
  assert.equal(clothAreaInfluence([{ from, to: translated }]), 1);
  assert.equal(clothAreaInfluence([{ from, to: expanded }]), 1);
  assert.equal(clothAreaInfluence([{ from, to: threshold }]), 1);
});

test('linear collapse and inversion stop exactly at the requested positive area threshold', () => {
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const collapsed: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }];
  const inverted: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }];
  assert.equal(clothAreaInfluence([{ from, to: collapsed }]), 0.75);
  assert.equal(clothAreaInfluence([{ from, to: inverted }]), 0.375);
  assert.equal(clothAreaInfluence([{ from, to: inverted }], 0.5), 0.25);
  assert.equal(clothAreaInfluence([{ from, to: inverted }], 1), 0);
});

test('a concave quadratic with zero initial slope stops at its first descending crossing', () => {
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const to: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 1 }];
  const influence = clothAreaInfluence([{ from, to }]); // Area(t) = 1 - t^2.
  assert.ok(Math.abs(influence - Math.sqrt(0.75)) < 1e-12);
  assert.ok(Math.abs(1 - influence * influence - 0.25) < 1e-12);
  assert.equal(clothAreaInfluence([{ from, to }], 1), 0);
});

test('positive endpoint area cannot hide an inverted interior interval or a later recovery', () => {
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const to: ClothTriangle = [{ x: 0, y: 0 }, { x: -3, y: 0 }, { x: 0, y: -1 }];
  const at = (t: number): ClothTriangle => [
    { x: 0, y: 0 }, { x: 1 - 4 * t, y: 0 }, { x: 0, y: 1 - 2 * t },
  ];
  const influence = clothAreaInfluence([{ from, to }]); // Area(t) = 1 - 6t + 8t^2.
  assert.ok(clothTriangleArea(to) > 0);
  assert.ok(clothTriangleArea(at(0.375)) < 0);
  assert.ok(Math.abs(influence - (3 - Math.sqrt(3)) / 8) < 1e-12);
  assert.ok(Math.abs(clothTriangleArea(at(influence)) - 0.25) < 1e-12);
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    assert.ok(clothTriangleArea(at(influence * fraction)) >= 0.25 - 1e-12);
  }
  assert.ok(clothTriangleArea(at(influence + 1e-5)) < 0.25);
});

test('a tangent double root at the threshold retains the full displacement prefix', () => {
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const to: ClothTriangle = [{ x: 0, y: 0 }, { x: -0.5, y: 0.75 }, { x: -1, y: -0.5 }];
  const midpoint: ClothTriangle = [{ x: 0, y: 0 }, { x: 0.25, y: 0.375 }, { x: -0.5, y: 0.25 }];
  // Area(t) = 1 - 3t + 3t^2 has its minimum, exactly 0.25, at t = 0.5.
  assert.equal(clothTriangleArea(midpoint), 0.25);
  assert.equal(clothAreaInfluence([{ from, to }]), 1);
});

test('coefficient normalization cannot turn an exact tangent into a false crossing', () => {
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const to: ClothTriangle = [{ x: 0, y: 0 }, { x: -6.5, y: 3.75 }, { x: -5, y: -6.5 }];
  // Area(t) = 1 - 15t + 75t^2 touches 0.25 at t = 0.1. Dividing all
  // coefficients by 75 rounds (-0.2)^2 above 4*0.01, inventing two roots.
  assert.equal(clothTriangleArea(to), 61);
  assert.equal(clothAreaInfluence([{ from, to }]), 1);
});

test('a shallow genuine dip below the threshold is not treated as a safe tangent', () => {
  const delta = 2 ** -30;
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const to: ClothTriangle = [{ x: 0, y: 0 }, { x: -0.5, y: 0.75 - delta }, { x: -1, y: -0.5 }];
  const influence = clothAreaInfluence([{ from, to }]);
  const expected = (3 - Math.sqrt(3 * delta)) / (2 * (3 - delta));
  assert.ok(influence < 0.5);
  assert.ok(Math.abs(influence - expected) < 1e-10);
  assert.ok(Math.abs(1 - 3 * influence + (3 - delta) * influence ** 2 - 0.25) < 1e-12);
});

test('unit ratio permits initial growth until its later crossing and allows safe initial tangency', () => {
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const growthThenCollapse: ClothTriangle = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 0 }];
  const growsFromTangent: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
  assert.equal(clothAreaInfluence([{ from, to: from }], 1), 1);
  assert.equal(clothAreaInfluence([{ from, to: growthThenCollapse }], 1), 2 / 3);
  assert.equal(clothAreaInfluence([{ from, to: growsFromTangent }], 1), 1);
});

test('large finite area coefficients use the same first crossing without discriminant overflow', () => {
  const scale = 1e100;
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: scale, y: 0 }, { x: 0, y: scale }];
  const to: ClothTriangle = [{ x: 0, y: 0 }, { x: -3 * scale, y: 0 }, { x: 0, y: -scale }];
  const influence = clothAreaInfluence([{ from, to }]);
  assert.ok(Number.isFinite(influence));
  assert.ok(Math.abs(influence - (3 - Math.sqrt(3)) / 8) < 1e-12);
});

test('shared influence is the minimum per-triangle prefix regardless of order and initial area', () => {
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const to: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }];
  const largeFrom: ClothTriangle = [{ x: 2, y: 3 }, { x: 6, y: 3 }, { x: 2, y: 5 }];
  const largeTo: ClothTriangle = [{ x: 2, y: 3 }, { x: 6, y: 3 }, { x: 2, y: -3 }];
  const triangles = [{ from, to }, { from: largeFrom, to: largeTo }, { from, to: from }];
  assert.equal(clothAreaInfluence([{ from, to }]), 0.375);
  assert.equal(clothAreaInfluence([{ from: largeFrom, to: largeTo }]), 0.1875);
  assert.equal(clothAreaInfluence(triangles), 0.1875);
  assert.equal(clothAreaInfluence([...triangles].reverse()), 0.1875);
});

test('governor rejects invalid sources and ratios, including ratios on an empty input', () => {
  const valid: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const collapsed: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
  const reversed: ClothTriangle = [valid[0], valid[2], valid[1]];
  for (const from of [collapsed, reversed]) {
    assert.throws(() => clothAreaInfluence([{ from, to: valid }]), /source.*positive, nondegenerate/);
  }
  for (const ratio of [0, -0.25, 1.01, NaN, Infinity, -Infinity]) {
    assert.throws(() => clothAreaInfluence([], ratio), /ratio/);
    assert.throws(() => clothAreaInfluence([{ from: valid, to: valid }], ratio), /ratio/);
  }
});

test('a zero influence from an early triangle does not hide later invalid geometry', () => {
  const from: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const contracted: ClothTriangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0.5 }];
  const collapsed: ClothTriangle = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
  const nonfinite: ClothTriangle = [{ x: 0, y: 0 }, { x: Infinity, y: 0 }, { x: 0, y: 1 }];
  assert.throws(() => clothAreaInfluence([{ from, to: contracted }, { from: collapsed, to: from }], 1), /source/);
  assert.throws(() => clothAreaInfluence([{ from, to: contracted }, { from, to: nonfinite }], 1), /finite/);
});

test('area, matrix and governor do not mutate frozen caller triangles or retain a returned matrix', () => {
  const from: ClothTriangle = Object.freeze<ClothTriangle>([
    Object.freeze({ x: 0, y: 0 }), Object.freeze({ x: 1, y: 0 }), Object.freeze({ x: 0, y: 1 }),
  ]);
  const to: ClothTriangle = Object.freeze<ClothTriangle>([
    Object.freeze({ x: 2, y: 3 }), Object.freeze({ x: 4, y: 3 }), Object.freeze({ x: 2, y: 4 }),
  ]);
  const triangles = Object.freeze([Object.freeze({ from, to })]);
  const before = JSON.stringify(triangles);
  assert.equal(clothTriangleArea(from), 1);
  assert.equal(clothTriangleArea(to), 2);
  const matrix = clothTriangleMatrix(from, to);
  assert.deepEqual(matrix, [2, 0, 0, 1, 2, 3]);
  assert.equal(clothAreaInfluence(triangles), 1);
  matrix[0] = 999;
  assert.deepEqual(clothTriangleMatrix(from, to), [2, 0, 0, 1, 2, 3]);
  assert.equal(JSON.stringify(triangles), before);
});
