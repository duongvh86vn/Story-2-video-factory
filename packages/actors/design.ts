import type { Storyboard } from '../core/schemas.js';
import { hash } from '../core/utils.js';
import { artworkSvg } from '../director/art-direction.js';
import type { ActorDefinition } from './schemas.js';

export interface CastDesignAdvisory {
  type: 'cast-design-similarity';
  severity: 'medium';
  actorIds: [string, string];
  names: [string, string];
  shotId: string;
  shotIds: string[];
  description: string;
  repair: string;
}

const costumeJoints = ['head', 'chest', 'pelvis', 'hand-left', 'hand-right'] as const;
const compare = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;

/** Compares rendered inputs, not pixels; actor data and local SVG IDs stay unchanged. */
export function actorVisualFingerprint(actor: ActorDefinition): string {
  const appearance = actor.appearance;
  const costume = costumeJoints.flatMap(joint => (actor.costume ?? [])
    .filter(layer => layer.joint === joint)
    .map(layer => ({ joint, svg: artworkSvg(layer.svg, 'cast-design') })));
  return hash({
    kind: actor.kind,
    appearance: {
      outline: appearance.outline.toLowerCase(), shell: appearance.shell.toLowerCase(),
      screen: appearance.screen.toLowerCase(), accent: appearance.accent.toLowerCase(),
      badge: appearance.badge.toLowerCase(), headScale: appearance.headScale,
      bodyScale: appearance.bodyScale, strokeWidth: appearance.strokeWidth,
      characterVariant: appearance.characterVariant,
      supportingModel: appearance.supportingModel,
      artworkVersion: appearance.artworkVersion,
    },
    costume,
  });
}

/** Aggregate only pairs that share a shot; an intentional resemblance is permitted. */
export function castDesignAdvisories(board: Storyboard): CastDesignAdvisory[] {
  const pairs = new Map<string, {
    actorIds: [string, string]; names: [string, string]; shotIds: Set<string>;
  }>();
  for (const shot of [...board.shots].sort((left, right) => compare(left.id, right.id))) {
    const scene = shot.cinematic?.actorScene;
    if (!scene) continue;
    const actors = new Map([
      ...(scene.primary ? [scene.primary] : []),
      ...scene.supporting.map(actor => actor.character),
    ].map(actor => [actor.id, actor]));
    const groups = new Map<string, ActorDefinition[]>();
    for (const actor of [...actors.values()].sort((left, right) => compare(left.id, right.id))) {
      const fingerprint = actorVisualFingerprint(actor), group = groups.get(fingerprint) ?? [];
      group.push(actor); groups.set(fingerprint, group);
    }
    for (const group of groups.values()) {
      for (let left = 0; left < group.length; left++) for (let right = left + 1; right < group.length; right++) {
        const first = group[left]!, second = group[right]!;
        const actorIds: [string, string] = [first.id, second.id], key = JSON.stringify(actorIds);
        const pair = pairs.get(key) ?? { actorIds, names: [first.name, second.name] as [string, string], shotIds: new Set<string>() };
        pair.shotIds.add(shot.id); pairs.set(key, pair);
      }
    }
  }
  return [...pairs.entries()].sort(([left], [right]) => compare(left, right)).map(([, pair]) => {
    const shotIds = [...pair.shotIds].sort(compare);
    return {
      type: 'cast-design-similarity', severity: 'medium',
      actorIds: pair.actorIds, names: pair.names, shotId: shotIds[0]!, shotIds,
      description: `${pair.names[0]} (${pair.actorIds[0]}) and ${pair.names[1]} (${pair.actorIds[1]}) share identical normalized kind, appearance and passive costume inputs in co-present shots ${shotIds.join(', ')}. This input comparison does not establish pixel equivalence.`,
      repair: 'Inspect cast readability in actual frames. If similarity is unintended, ask the creative director for story-appropriate distinctions while preserving sourced identity and approved locks. Deliberate resemblance or a uniform style may remain.',
    };
  });
}
