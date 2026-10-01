import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import { ShotSchema, type Beat, type Narration, type Shot, type Storyboard } from '../core/schemas.js';
import { hash, writeJson } from '../core/utils.js';
import { HostTimelineSchema, type HostProfile, type HostRig } from '../host/schemas.js';
import type { ExplanationBeat, Visualization } from './schemas.js';
import { ExplanationBeatSchema } from './schemas.js';
import { fold } from './plan.js';

import { EXPLAINER_RECIPES } from './recipes.js';
export { EXPLAINER_RECIPES } from './recipes.js';
export function explainerShot(id: string, startMs: number, endMs: number, beat: Beat, narration: Narration, profile: HostProfile, rig: HostRig): Shot {
  const b = ExplanationBeatSchema.parse({ ...beat, beatId: beat.id });
  const modelId = `${id}.model`, seconds = endMs - startMs;
  const entities = b.entities;
  const columns = entities.length < 3 ? entities.length : Math.min(3, entities.length), rows = Math.ceil(entities.length / columns);
  const parts: Visualization['parts'] = entities.map((e, i) => ({ ...e,
    x: .42 + (i % columns) * (.48 / columns), y: .29 + Math.floor(i / columns) * (.32 / Math.max(1, rows - 1)),
    width: Math.min(.21, .39 / columns), height: Math.min(.17, .27 / rows) }));
  const actions: NonNullable<Shot['host']>['actions'] = [], events: Visualization['events'] = [];
  const anchors = entities.map(entity => {
    const phrase = fold(entity.label).replace(/[^\p{L}\p{N} ]/gu, '');
    const matchingWord = narration.words.find((w, i) => w.startMs >= startMs && w.startMs < endMs &&
      fold(narration.words.slice(i, i + phrase.split(' ').length).map(v => v.text).join(' ')).replace(/[^\p{L}\p{N} ]/gu, '') === phrase);
    const cue = narration.segments.find(s => s.startMs < endMs && s.endMs > startMs && entity.sourceRefs.some(r => r.segmentId === s.id))
      ?? narration.segments.find(s => s.startMs < endMs && s.endMs > startMs) ?? narration.segments.find(s => beat.segmentIds.includes(s.id))!;
    return { entity, cue, time: Math.max(startMs, Math.min(endMs - 1, matchingWord?.startMs ?? cue.startMs)) };
  }).filter((a,_,all)=>!all.some(v=>v.entity.sourceRefs.some(r=>narration.segments.some(s=>s.id===r.segmentId&&s.startMs<endMs&&s.endMs>startMs)))||a.entity.sourceRefs.some(r=>narration.segments.some(s=>s.id===r.segmentId&&s.startMs<endMs&&s.endMs>startMs))).sort((a, b) => a.time - b.time);
  anchors.forEach(({ entity, cue, time }, i) => {
    const anchor = cue.id;
    const group = anchors.filter(a => a.time === time), ordinal = group.findIndex(a => a.entity.id === entity.id);
    const next = anchors.find(a => a.time > time)?.time ?? endMs;
    const aStart = time + Math.floor(ordinal * (next - time) / group.length), slotEnd = time + Math.floor((ordinal + 1) * (next - time) / group.length);
    if (slotEnd <= aStart) return; // Another action on this beat still supplies meaningful explanation.
    const operation = b.visualMethod === 'mechanism' && ['piston', 'wheel', 'gear', 'lever', 'flow'].includes(entity.kind) && slotEnd - aStart >= 650;
    const compare = b.visualMethod === 'comparison' && entities.length >= 2 && slotEnd - aStart >= 500;
    const type = operation ? 'operate-model' : compare ? 'compare' : b.visualMethod === 'evolution' && slotEnd - aStart >= 800 ? 'walk-to-marker'
      : b.visualMethod === 'question' ? 'think' : b.visualMethod === 'summary' ? 'summarize' : 'point';
    const contact = operation ? aStart + Math.min(500, Math.floor((slotEnd - aStart) * .35)) : undefined;
    const target = { modelId, partId: entity.id, anchor: operation ? 'handle' as const : 'center' as const };
    actions.push({ type, startMs: aStart, endMs: slotEnd, narrationAnchor: anchor, target,
      ...(compare ? { secondTarget: { modelId, partId: entities[(i + 1) % entities.length]!.id, anchor: 'center' as const } } : {}),
      ...(contact !== undefined ? { contactMs: contact } : {}) });
    const movement = operation ? entity.kind === 'wheel' || entity.kind === 'gear' || entity.kind === 'lever' ? 'rotate' : entity.kind === 'piston' ? 'translate' : 'pulse' : 'none';
    events.push({ type: operation ? entity.kind === 'flow' ? 'flow' : 'part-motion' : 'highlight', targetId: entity.id,
      narrationAnchor: anchor, startMs: contact !== undefined ? contact + 1 : aStart, endMs: slotEnd,
      contactRequired: operation, motion: movement, sourceRefs: entity.sourceRefs });
  });
  return ShotSchema.parse({ id, startMs, endMs, beatIds: [beat.id], narrationSegmentIds: beat.segmentIds,
    explanationGoal: b.explanationGoal, sourceRefs: b.sourceRefs, subject: entities.map(e => e.label).join(' / '),
    sceneType: ['evolution', 'event-sequence'].includes(b.visualMethod) ? 'timeline' : b.visualMethod === 'comparison' ? 'comparison' : 'technical-diagram',
    characters: [], visualDescription: `${b.explanationGoal}. ${b.hostIntent}. Minh họa khái niệm, không phải tư liệu lịch sử.`,
    camera: { shotSize: 'wide', movement: 'locked', angle: 'eye-level' }, motion: actions.map(a => `${a.type}: ${a.target?.partId}`),
    host: { id: profile.id, profileVersion: profile.version, rigHash: rig.rigHash, presence: 'beside-model', actions },
    visualization: { type: b.visualMethod, modelId, parts, relations: b.relations, events, provenance: 'visualization', fidelity: 'conceptual' },
    captionRegion: 'bottom-safe', recipeId: EXPLAINER_RECIPES[b.visualMethod], renderer: 'hyperframes',
    assetNeeds: [{ id: `${id}.host-rig`, type: 'image', description: `Reusable explainer ${profile.id} v${profile.version}`, localPath: rig.assetPath, required: true }],
  });
}
export function validateExplainerStoryboard(board: Storyboard, narration: Narration, beats: Beat[], profile: HostProfile, rig: HostRig, config: FactoryConfig): void {
  let absent = 0, speech = 0, visible = 0;
  for (const shot of board.shots) {
    const h = shot.host, v = shot.visualization;
    if (!h || !v || !shot.explanationGoal || !shot.narrationSegmentIds?.length || !shot.sourceRefs?.length || shot.captionRegion !== 'bottom-safe') throw new Error(`${shot.id}: incomplete explainer specification`);
    if(shot.characters.length)throw new Error(`${shot.id}: subject character actors are unsupported in the vector explainer renderer; use sourced model entities`);
    if (h.id !== profile.id || h.profileVersion !== profile.version || h.rigHash !== rig.rigHash || shot.characters.includes(profile.id)) throw new Error(`${shot.id}: host identity/role drift`);
    if (shot.recipeId !== EXPLAINER_RECIPES[v.type]) throw new Error(`${shot.id}: wrong host recipe`);
    const ids = new Set(v.parts.map(p => p.id));
    const canonical = beats.filter(b => shot.beatIds.includes(b.id)).map(b => ExplanationBeatSchema.parse({ ...b, beatId: b.id }));
    if (!canonical.length) throw new Error(`${shot.id}: no canonical explanation beat`);
    const refs = canonical.flatMap(b => [...b.sourceRefs, ...b.entities.flatMap(e => e.sourceRefs), ...b.relations.flatMap(r => r.sourceRefs)]);
    const sourced = (references: typeof refs) => references.every(r => refs.some(c => hash(c) === hash(r)) &&
      (r.kind === 'source' || narration.segments.some(s => s.id === r.segmentId && fold(s.text).includes(fold(r.quote)))));
    if (!sourced(shot.sourceRefs)) throw new Error(`${shot.id}: changed/unverifiable narration sources`);
    for (const p of v.parts) {
      const original = canonical.flatMap(b => b.entities).find(e => e.id === p.id);
      if (!original || p.label !== original.label || p.kind !== original.kind || hash(p.sourceRefs) !== hash(original.sourceRefs) || !sourced(p.sourceRefs)) throw new Error(`${shot.id}: model entity changed its sourced identity`);
    }
    for (const r of v.relations) if (!canonical.some(b => b.relations.some(c => hash(c) === hash(r)))) throw new Error(`${shot.id}: unsourced model relation`);
    if (!['wide', 'medium', 'close'].includes(shot.camera.shotSize) || shot.camera.angle !== 'eye-level' || !['locked', 'static', 'push-in', 'pull-out', 'pan-left', 'pan-right'].includes(shot.camera.movement)) throw new Error(`${shot.id}: unsupported explainer camera; use wide/medium/close, eye-level and a supported movement`);
    if (ids.size !== v.parts.length) throw new Error(`${shot.id}: duplicate model parts`);
    for (const p of v.parts) if (p.x + p.width / 2 > .96 || p.y + p.height / 2 > .75 || p.x - p.width / 2 < .32) throw new Error(`${shot.id}: model part crosses safe layout`);
    for (const r of v.relations) if (!ids.has(r.from) || !ids.has(r.to)) throw new Error(`${shot.id}: broken relation`);
    const knownSegments = new Set(narration.segments.map(s => s.id));
    if (shot.narrationSegmentIds.some(id => !knownSegments.has(id))) throw new Error(`${shot.id}: unknown narration segment`);
    if(h.presence==='inset')throw new Error(`${shot.id}: inset presentation is not supported; use beside-model or absent`);
    let actionEnd=shot.startMs;
    for (const a of [...h.actions].sort((a,b)=>a.startMs-b.startMs)) {
      if(a.startMs<actionEnd)throw new Error(`${shot.id}: host actions overlap`);actionEnd=a.endMs;
      if(a.secondTarget&&a.type!=='compare')throw new Error(`${shot.id}: second target is only supported for compare`);
      if(h.presence==='absent'&&a.target)throw new Error(`${shot.id}: an absent host cannot point or operate a model`);
      if (!profile.actions.includes(a.type) || a.startMs < shot.startMs || a.endMs > shot.endMs) throw new Error(`${shot.id}: unsupported/out-of-bounds host action`);
      if (a.narrationAnchor && !knownSegments.has(a.narrationAnchor)) throw new Error(`${shot.id}: invalid gesture narration anchor`);
      for (const t of [a.target, a.secondTarget].filter(Boolean)) if (t!.modelId !== v.modelId || !ids.has(t!.partId)) throw new Error(`${shot.id}: missing gesture target`);
      if (['point', 'operate-model', 'walk-to-marker', 'compare'].includes(a.type) && !a.target) throw new Error(`${shot.id}: targeted action has no target`);
      if (a.type === 'compare' && (!a.secondTarget || a.target?.partId === a.secondTarget.partId)) throw new Error(`${shot.id}: compare requires two different targets`);
      if (a.type === 'operate-model' && (a.contactMs === undefined || a.contactMs <= a.startMs || a.contactMs >= a.endMs)) throw new Error(`${shot.id}: operation requires a contact after approach`);
    }
    for (const e of v.events) {
      const moving=v.parts.find(p=>p.id===e.targetId)?.kind;
      if(e.motion==='rotate'&&!['wheel','gear','lever'].includes(moving??'')||e.motion==='translate'&&!['piston','car'].includes(moving??'')||e.motion==='pulse'&&!['piston','wheel','gear','car','engine','flow','lever'].includes(moving??''))throw new Error(`${shot.id}: unsupported part motion`);
      if (!sourced(e.sourceRefs)) throw new Error(`${shot.id}: unsourced model event`);
      if (!ids.has(e.targetId) || !knownSegments.has(e.narrationAnchor) || e.startMs < shot.startMs || e.endMs > shot.endMs || e.endMs <= e.startMs) throw new Error(`${shot.id}: invalid model event`);
      if (e.contactRequired && !h.actions.some(a => a.type === 'operate-model' && a.target?.partId === e.targetId && a.contactMs !== undefined && a.contactMs < e.startMs && a.endMs >= e.endMs)) throw new Error(`${shot.id}: model reacts before host contact`);
    }
    if (h.presence === 'absent') absent += shot.endMs - shot.startMs; else absent = 0;
    if (absent > config.presentation.maximum_host_absence_seconds * 1000) throw new Error('Host absent longer than configured limit');
    const spoken = narration.segments.reduce((n, s) => n + Math.max(0, Math.min(s.endMs, shot.endMs) - Math.max(s.startMs, shot.startMs)), 0);
    speech += spoken; if (h.presence !== 'absent') visible += spoken;
  }
  if (speech && visible / speech < config.presentation.minimum_host_speech_visibility) throw new Error('Insufficient host visibility during narration');
  if (config.presentation.require_meaningful_host_action_per_beat) for (const beat of beats) {
    if (!board.shots.some(s => s.beatIds.includes(beat.id) && s.host?.presence !== 'absent' && s.host?.actions.some(a => !['idle', 'greet', 'react'].includes(a.type)))) throw new Error(`${beat.id}: no explanatory host action`);
  }
}
export async function writeHostTimeline(root: string, board: Storyboard, narration: Narration, profile: HostProfile, rig: HostRig, synchronization: 'audio-activity' | 'word' | 'segment' = 'segment'): Promise<void> {
  const spoken = narration.segments.reduce((n, s) => n + s.endMs - s.startMs, 0);
  const visible = board.shots.filter(s => s.host?.presence !== 'absent').reduce((n, shot) => n + narration.segments.reduce((sum, s) => sum + Math.max(0, Math.min(s.endMs, shot.endMs) - Math.max(s.startMs, shot.startMs)), 0), 0);
  await writeJson(path.join(root, 'work/host-timeline.json'), HostTimelineSchema.parse({ version: 2, hostId: profile.id, profileVersion: profile.version,
    rigHash: rig.rigHash, durationMs: narration.durationMs, speechVisibility: spoken ? visible / spoken : 1, synchronization,
    shots: board.shots.map(s => ({ shotId: s.id, startMs: s.startMs, endMs: s.endMs, host: s.host })) }));
}
