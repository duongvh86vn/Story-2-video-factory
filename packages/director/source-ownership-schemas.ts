import { z } from 'zod';
import { Id } from '../core/identifiers.js';
import { SourceRefSchema } from '../explainer/schemas.js';

/** CANDIDATE only: one canonical entity identified by id/partId.
 * Grip propIds are actor-owned source aliases, not additional entities.
 * No registration, pose, narration, geometry or production approval is implied.
 */
const Time = z.number().finite().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const StagePoint = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();
const Interval = { startMs: Time, endMs: Time };
const EvidenceText = z.string().min(1).max(4096)
  .refine(value => /\S/.test(value), 'Evidence text must not be blank');
const Operation = z.enum(['pickup', 'place', 'handoff', 'join', 'release']);

const OwnershipGripSchema = z.object({
  id: Id,
  actorId: Id,
  sourceId: Id,
  gestureId: Id,
  propId: Id,
  hand: z.enum(['left', 'right']),
  // Explicit STAGE-pixel offset; never converted or inferred here.
  gripOffset: StagePoint,
}).strict();

const OwnershipPhaseSchema = z.discriminatedUnion('kind', [
  z.object({
    ...Interval, kind: z.literal('world'),
    center: StagePoint, rotationDeg: z.number().finite(),
  }).strict(),
  z.object({
    ...Interval, kind: z.literal('held'), gripId: Id,
  }).strict(),
  z.object({
    ...Interval, kind: z.literal('shared'),
    gripIds: z.tuple([Id, Id]), authorityGripId: Id,
  }).strict(),
]);

const TransitionSchema = z.object({
  id: Id,
  timeMs: Time,
  sourceRefs: z.array(SourceRefSchema).min(1).max(32),
  narrationAnchor: Id,
  statement: EvidenceText,
  operation: Operation,
}).strict();

export type OwnershipGrip = z.infer<typeof OwnershipGripSchema>;
export type OwnershipPhase = z.infer<typeof OwnershipPhaseSchema>;
type OwnershipOperation = z.infer<typeof Operation>;

/** Validate an explicitly supplied operation; do not choose one for the author.
 * A handoff boundary must touch positive-duration, two-person shared contact.
 */
function operationFits(a: OwnershipPhase, b: OwnershipPhase, operation: OwnershipOperation): boolean {
  if (a.kind === 'world' && b.kind === 'held') return operation === 'pickup';
  if (a.kind === 'held' && b.kind === 'world') return operation === 'place';
  if (a.kind === 'held' && b.kind === 'shared') {
    return b.gripIds.includes(a.gripId) && (operation === 'join' || operation === 'handoff');
  }
  if (a.kind === 'shared' && b.kind === 'held') {
    return a.gripIds.includes(b.gripId) && (operation === 'release' || operation === 'handoff');
  }
  if (a.kind === 'shared' && b.kind === 'shared') {
    return a.gripIds.every(id => b.gripIds.includes(id))
      && a.authorityGripId !== b.authorityGripId && operation === 'handoff';
  }
  // No exclusive-owner swap, world/shared shortcut or unregistered boundary.
  return false;
}

/** All times are in the original global clock, never relative to a camera slice.
 * Transitions are exactly the internal boundaries between consecutive phases.
 * Source endpoints do not imply events outside the declared history.
 */
export const SourceOwnershipSchema = z.object({
  version: z.literal('source-ownership-1'),
  id: Id,
  partId: Id,
  startMs: Time,
  endMs: Time,
  grips: z.array(OwnershipGripSchema).min(1).max(64),
  phases: z.array(OwnershipPhaseSchema).min(1).max(256),
  transitions: z.array(TransitionSchema).max(255),
}).strict().superRefine((source, ctx) => {
  const issue = (path: (string | number)[], message: string): void => {
    ctx.addIssue({ code: 'custom', path, message });
  };
  if (source.endMs <= source.startMs) issue(['endMs'], 'Original ownership span must be positive');

  // Declaration IDs are unique within this timeline; reference IDs may repeat.
  const declaredIds = new Set<string>([source.id]);
  const registerId = (id: string, path: (string | number)[]): void => {
    if (declaredIds.has(id)) issue(path, 'Duplicate ownership declaration ID');
    declaredIds.add(id);
  };
  const grips = new Map<string, OwnershipGrip>();
  const physicalAliases = new Set<string>();
  source.grips.forEach((grip, index) => {
    registerId(grip.id, ['grips', index, 'id']);
    grips.set(grip.id, grip);
    const alias=JSON.stringify([grip.actorId,grip.propId]);
    if(physicalAliases.has(alias))issue(['grips',index], 'One physical actor/prop alias cannot have multiple grip declarations');
    physicalAliases.add(alias);
  });

  const used = new Set<string>();
  let expectedStart = source.startMs;
  source.phases.forEach((phase, index) => {
    const path = ['phases', index];
    if (phase.startMs !== expectedStart) {
      issue([...path, 'startMs'], 'Phases must be ordered, contiguous and fully cover the original span');
    }
    if (phase.endMs <= phase.startMs || phase.startMs < source.startMs || phase.endMs > source.endMs) {
      issue(path, 'Phase must be positive and contained in the original span');
    }
    expectedStart = phase.endMs;

    const ids: readonly string[] = phase.kind === 'world' ? []
      : phase.kind === 'held' ? [phase.gripId] : phase.gripIds;
    const active: OwnershipGrip[] = [];
    for (const id of ids) {
      used.add(id);
      const grip = grips.get(id);
      if (!grip) {
        issue(path, `Unknown grip ID: ${id}`);
        continue;
      }
      if (active.some(other => other.actorId === grip.actorId && other.hand === grip.hand && other.id !== grip.id)) {
        issue(path, 'One actor/hand cannot simultaneously use different grip aliases');
      }
      active.push(grip);
    }
    if (phase.kind === 'shared') {
      if (phase.gripIds[0] === phase.gripIds[1]) issue([...path, 'gripIds'], 'Shared grip IDs must be distinct');
      if (!phase.gripIds.includes(phase.authorityGripId)) {
        issue([...path, 'authorityGripId'], 'Shared authority must explicitly name one of its two grips');
      }
      const first = grips.get(phase.gripIds[0]);
      const second = grips.get(phase.gripIds[1]);
      if (first && second && first.actorId === second.actorId) {
        issue([...path, 'gripIds'], 'Shared contact requires two different people');
      }
    }
  });
  if (expectedStart !== source.endMs) issue(['phases'], 'Phases must end at the original endMs');
  source.grips.forEach((grip, index) => {
    if (!used.has(grip.id)) issue(['grips', index], 'Unused grip alias');
    const active=source.phases.map((phase,i)=>({phase,i})).filter(({phase})=>phase.kind==='held'?phase.gripId===grip.id:phase.kind==='shared'&&phase.gripIds.includes(grip.id));
    if(active.some((a,i)=>i>0&&a.i!==active[i-1]!.i+1))issue(['grips',index], 'A released original grip cannot be reused; another attachment requires its own physical source alias');
  });

  if (source.transitions.length !== Math.max(0, source.phases.length - 1)) {
    issue(['transitions'], 'Exactly one transition is required at every internal phase boundary');
  }
  source.transitions.forEach((transition, index) => {
    const path = ['transitions', index];
    registerId(transition.id, [...path, 'id']);
    const before = source.phases[index];
    const after = source.phases[index + 1];
    if (!before || !after) {
      issue(path, 'Transition has no corresponding internal phase boundary');
      return;
    }
    if (transition.timeMs !== before.endMs || transition.timeMs !== after.startMs) {
      issue([...path, 'timeMs'], 'Transition must match its original phase boundary in source order');
    }
    if (!operationFits(before, after, transition.operation)) {
      issue([...path, 'operation'], 'Operation does not describe a supported contact boundary with real shared overlap for handoff');
    }
  });
});

export type SourceOwnership = z.infer<typeof SourceOwnershipSchema>;
