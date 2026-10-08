import { z } from 'zod';
import { Moods } from './schemas.js';

/** Maximum ramp for the existing compiler expression curve. */
export const VIEW_EXPRESSION_RAMP_MS = 140;

/** An original expression interval on the continuous source clock. */
export const ViewExpressionSchema = z.object({
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  mood: z.enum(Moods),
}).strict();
export type ViewExpression = z.infer<typeof ViewExpressionSchema>;

/** Sort and coalesce a source track, preserving gaps and caller-owned data. */
export function normalizeViewExpressions(track: readonly ViewExpression[]): ViewExpression[] {
  const sorted = track.map(expression => ViewExpressionSchema.parse(expression))
    .sort((a, b) => a.startMs - b.startMs);
  const result: ViewExpression[] = [];
  for (const expression of sorted) {
    const prior = result.at(-1);
    if (expression.endMs <= expression.startMs || (prior && expression.startMs < prior.endMs)) {
      throw new Error('needs-view-expression-phase: invalid or overlapping expression intervals');
    }
    if (prior && prior.endMs === expression.startMs && prior.mood === expression.mood) {
      prior.endMs = expression.endMs;
    } else {
      result.push(expression);
    }
  }
  return result;
}

/** Intersect [startMs, endMs) exactly and translate to the shot's local clock. */
export function projectViewExpressions(
  track: readonly ViewExpression[], startMs: number, endMs: number,
): ViewExpression[] {
  if (!Number.isInteger(startMs) || !Number.isInteger(endMs) || startMs < 0 || endMs <= startMs) {
    throw new Error('needs-view-expression-phase: invalid expression projection span');
  }
  // Validate the entire original track, including intervals outside this shot.
  const projected = normalizeViewExpressions(track).flatMap(expression => {
    const start = Math.max(expression.startMs, startMs);
    const end = Math.min(expression.endMs, endMs);
    return end > start
      ? [{ startMs: start - startMs, endMs: end - startMs, mood: expression.mood }]
      : [];
  });
  return normalizeViewExpressions(projected);
}
