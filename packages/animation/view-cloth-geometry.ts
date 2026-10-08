export type ClothPoint = { x: number; y: number };
export type ClothTriangle = readonly [ClothPoint, ClothPoint, ClothPoint];

type TriangleEdges = readonly [number, number, number, number];

function finite(value: number, description: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`Cloth ${description} must be finite.`);
  return value;
}

function triangleEdges(triangle: ClothTriangle): TriangleEdges {
  for (const point of triangle) {
    finite(point.x, 'triangle coordinate');
    finite(point.y, 'triangle coordinate');
  }
  const [p, q, r] = triangle;
  return [
    finite(q.x - p.x, 'triangle edge'), finite(q.y - p.y, 'triangle edge'),
    finite(r.x - p.x, 'triangle edge'), finite(r.y - p.y, 'triangle edge'),
  ];
}

function cross(ux: number, uy: number, vx: number, vy: number): number {
  return finite(ux * vy - uy * vx, 'triangle area coefficient');
}

function positiveArea(edges: TriangleEdges, description: string): number {
  const area = cross(...edges);
  if (area <= 0) {
    throw new RangeError(`Cloth ${description} triangle must have positive, nondegenerate area.`);
  }
  return area;
}

/** Signed doubled area; clockwise triangles are negative and collinear ones are zero. */
export function clothTriangleArea(triangle: ClothTriangle): number {
  return cross(...triangleEdges(triangle));
}

/** SVG [a, b, c, d, e, f], mapping x' = ax + cy + e, y' = bx + dy + f.
 * Both source and target must have positive area; inversions are errors. */
export function clothTriangleMatrix(from: ClothTriangle, to: ClothTriangle): number[] {
  const source = triangleEdges(from), target = triangleEdges(to);
  const determinant = positiveArea(source, 'source');
  positiveArea(target, 'target');
  const [ux, uy, vx, vy] = source, [dx, dy, ex, ey] = target;
  const a = cross(dx, ex, uy, vy) / determinant;
  const b = cross(dy, ey, uy, vy) / determinant;
  const c = cross(ex, dx, vx, ux) / determinant;
  const d = cross(ey, dy, vx, ux) / determinant;
  const matrix = [
    a, b, c, d,
    to[0].x - a * from[0].x - c * from[0].y,
    to[0].y - b * from[0].x - d * from[0].y,
  ];
  for (const value of matrix) finite(value, 'affine matrix coefficient');
  return matrix;
}

/** First crossing into a negative interval of quadratic*t^2 + linear*t + constant.
 * The initial value is nonnegative. Touching zero without crossing is safe. */
function firstAreaCrossing(quadratic: number, linear: number, constant: number): number {
  if (constant === 0) {
    if (linear < 0 || (linear === 0 && quadratic < 0)) return 0;
    if (quadratic < 0 && linear < -quadratic) return linear / -quadratic;
    return 1;
  }
  if (quadratic === 0) {
    return linear < 0 && constant < -linear ? constant / -linear : 1;
  }
  if (quadratic > 0 && linear >= 0) return 1;

  // Power-of-two scaling avoids discriminant overflow without introducing
  // rounding into an otherwise exact double root. No epsilon hides shallow
  // folds or turns genuine quadratics into lines.
  const magnitude = Math.max(Math.abs(quadratic), Math.abs(linear), constant);
  const scale = 2 ** Math.min(1023, Math.floor(Math.log2(magnitude)));
  const a = quadratic / scale, b = linear / scale, c = constant / scale;
  if (a === 0 || (linear !== 0 && b === 0) || c === 0) {
    throw new RangeError('Cloth area polynomial exceeds numeric range.');
  }
  const discriminant = b * b - 4 * a * c;
  if (discriminant <= 0) return 1; // Includes a safe double root at the threshold.
  const radical = Math.sqrt(discriminant);
  // Select the descending crossing, using its cancellation-resistant form.
  // For a convex polynomial this also catches a dip with a safe final area.
  const numerator = b < 0 ? 2 * c : b + radical;
  const denominator = b < 0 ? -b + radical : -2 * a;
  return numerator < denominator ? numerator / denominator : 1;
}

/** Largest shared displacement prefix [0, a] preserving every source triangle's
 * positive area at or above minimumAreaRatio of its initial area. Targets may
 * fold or collapse: the returned influence stops at the first unsafe crossing.
 * minimumAreaRatio must be in (0, 1]; an empty set permits full influence. */
export function clothAreaInfluence(
  triangles: readonly { from: ClothTriangle; to: ClothTriangle }[],
  minimumAreaRatio = 0.25,
): number {
  if (!Number.isFinite(minimumAreaRatio) || minimumAreaRatio <= 0 || minimumAreaRatio > 1) {
    throw new RangeError('Cloth minimum area ratio must be finite and in (0, 1].');
  }
  let influence = 1;
  for (const { from, to } of triangles) {
    const source = triangleEdges(from), target = triangleEdges(to);
    const start = positiveArea(source, 'source');
    cross(...target); // A folded target is allowed; a nonfinite target area is not.
    const [ux, uy, vx, vy] = source;
    const dux = finite(target[0] - ux, 'triangle displacement');
    const duy = finite(target[1] - uy, 'triangle displacement');
    const dvx = finite(target[2] - vx, 'triangle displacement');
    const dvy = finite(target[3] - vy, 'triangle displacement');
    // Expanding cross(u + t*du, v + t*dv) gives the exact area polynomial.
    const quadratic = cross(dux, duy, dvx, dvy);
    const linear = finite(cross(dux, duy, vx, vy) + cross(ux, uy, dvx, dvy), 'area polynomial');
    const constant = (1 - minimumAreaRatio) * start;
    if (minimumAreaRatio < 1 && constant === 0) {
      throw new RangeError('Cloth area threshold exceeds numeric range.');
    }
    // Validate all triangles even when an earlier one already forced zero.
    const limit = finite(firstAreaCrossing(quadratic, linear, constant), 'area influence');
    if (limit < 0 || limit > 1) throw new RangeError('Cloth area influence must be in [0, 1].');
    influence = Math.min(influence, limit);
  }
  return influence;
}
