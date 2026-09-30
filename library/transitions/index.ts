import { TransitionTypes } from '../../packages/core/schemas.js';
export { TransitionTypes };
export const transitions = TransitionTypes;
/** Transitions stay inside the immutable narration interval; no overlapping shot durations. */
export function transitionTween(kind: string, selector: string, duration: number, at: number, incoming: boolean): string {
  if (!transitions.includes(kind as typeof transitions[number])) throw new Error(`Unsupported transition: ${kind}`);
  if (kind === 'hard-cut' || kind==='match-cut' || duration <= 0) return '';
  const vars = kind === 'slide-left' ? { x: incoming ? 48 : -48, opacity:0 } : kind === 'slide-right' ? { x: incoming ? -48 : 48, opacity:0 } : kind === 'wipe' ? { scaleX:incoming ? 0.96 : 1.04,opacity:0 } : { opacity:0 };
  return `tl.${incoming ? 'from' : 'to'}(${JSON.stringify(selector)},${JSON.stringify({...vars,duration,ease:'power2.inOut'})},${at});`;
}
