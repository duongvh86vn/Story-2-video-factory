import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import { ShotSchema, type Beat, type Narration, type Shot, type Storyboard } from '../core/schemas.js';
import { hash, writeJson } from '../core/utils.js';
import {rigHand,type RigHand} from '../core/identifiers.js';
import { HostTimelineSchema, type HostProfile, type HostRig } from '../host/schemas.js';
import {rigHashMatchesProfile} from '../host/rig.js';
import type { ExplanationBeat, Visualization } from './schemas.js';
import { ExplanationBeatSchema } from './schemas.js';
import { fold } from './plan.js';
import { thermalEvidence } from './thermal.js';
import { validateCinematicShot, validateModelContinuity } from '../director/index.js';

import { EXPLAINER_RECIPES } from './recipes.js';
import { validateAuthoredVisualSources } from './visual-sources.js';
import { canonicalExplanationEvidence } from './citations.js';
import {actorProfile,shotPerformer,validateActorCast} from '../actors/model.js';
export { EXPLAINER_RECIPES } from './recipes.js';
export function explainerShot(id: string, startMs: number, endMs: number, beat: Beat, narration: Narration, profile: HostProfile, rig: HostRig): Shot {
  const b = ExplanationBeatSchema.parse({ ...beat, beatId: beat.id });
  const modelId = `${id}.model`, seconds = endMs - startMs;
  const entities = b.entities;
  const columns = entities.length < 3 ? entities.length : Math.min(3, entities.length), rows = Math.ceil(entities.length / columns);
  const parts: Visualization['parts'] = entities.map((e, i) => ({ ...e,
    x: .43 + (i % columns) * (.48 / columns), y: .29 + Math.floor(i / columns) * (.32 / Math.max(1, rows - 1)),
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
    const transfer=b.relations.find(r=>r.kind==='transfer'&&(r.from===entity.id||r.to===entity.id)&&r.sourceRefs.some(ref=>ref.segmentId===cue.id));
    const operation = b.visualMethod!=='question' && slotEnd - aStart >= 800 && (transfer ? transfer.from===entity.id
      :b.visualMethod === 'mechanism' && ['piston', 'wheel', 'gear', 'lever', 'flow'].includes(entity.kind));
    const compare = !operation && b.visualMethod === 'comparison' && anchors.length >= 2 && slotEnd - aStart >= 500;
    const second=anchors.find(other=>other.entity.id!==entity.id&&other.entity.kind===entity.kind)?.entity??anchors[(i+1)%anchors.length]!.entity;
    const type = operation ? 'operate-model' : compare ? 'compare' : b.visualMethod === 'evolution' && slotEnd - aStart >= 800 ? 'walk-to-marker'
      : b.visualMethod === 'question' ? 'think' : b.visualMethod === 'summary' ? 'summarize' : 'point';
    const contact = operation ? aStart + Math.min(500, Math.floor((slotEnd - aStart) * .35)) : undefined;
    const target = { modelId, partId: entity.id, anchor: operation ? 'handle' as const : 'center' as const };
    actions.push({ type, startMs: aStart, endMs: slotEnd, narrationAnchor: anchor, target,
      ...(compare ? { secondTarget: { modelId, partId: second.id, anchor: 'center' as const } } : {}),
      ...(contact !== undefined ? { contactMs: contact } : {}) });
    const movement = operation && !transfer ? entity.kind === 'wheel' || entity.kind === 'gear' || entity.kind === 'lever' ? 'rotate' : entity.kind === 'piston' ? 'translate' : 'pulse' : 'none';
    events.push({ type: operation ? entity.kind === 'flow' ? 'flow' : 'part-motion' : 'highlight', targetId: entity.id,
      narrationAnchor: anchor, startMs: contact !== undefined ? contact + 1 : aStart, endMs: slotEnd,
      contactRequired: operation, motion: movement, sourceRefs: entity.sourceRefs });
  });
  for(const entity of entities)for(const ref of entity.sourceRefs){
    const cue=narration.segments.find(s=>s.id===ref.segmentId);if(!cue||cue.startMs>=endMs)continue;
    const states=thermalEvidence(entity,ref.quote,entities.filter(e=>e.id!==entity.id));
    if(cue.endMs<=startMs){
      const state=states.at(-1);if(state)events.push({type:'state',state:state.value,targetId:entity.id,narrationAnchor:cue.id,startMs,endMs,contactRequired:false,motion:'none',sourceRefs:[ref]});
      continue;
    }
    for(const [i,state] of states.entries()){
      // Segment-level staging only; no phoneme/word timing is invented when alignment is absent.
      const begin=Math.max(startMs,cue.startMs+Math.floor((cue.endMs-cue.startMs)*i/Math.max(1,states.length)));
      const finish=Math.min(endMs,cue.startMs+Math.floor((cue.endMs-cue.startMs)*(i+1)/Math.max(1,states.length)));
      if(finish>begin)events.push({type:'state',state:state.value,targetId:entity.id,narrationAnchor:cue.id,startMs:begin,endMs:finish,contactRequired:false,motion:'none',sourceRefs:[ref]});
    }
  }
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
export function validateExplainerStoryboard(board: Storyboard, narration: Narration, beats: Beat[], baseProfile: HostProfile, baseRig: HostRig, config: FactoryConfig): void {
  validateActorCast(board,narration,beats.flatMap(b=>ExplanationBeatSchema.parse({...b,beatId:b.id}).sourceRefs));
  let absent = 0, speech = 0, visible = 0;
  for (const shot of board.shots) {
    if(config.presentation.mode==='story-cinematic'&&config.presentation.character_mode==='actors'&&!shot.cinematic?.actorScene)throw new Error(`${shot.id}: actors mode requires a story actor scene; replan the old presenter storyboard`);
    const {profile,rig}=shotPerformer(shot,baseProfile,baseRig);
    const h = shot.host, v = shot.visualization;
    if(config.presentation.mode==='story-cinematic')validateCinematicShot(shot,profile,config);
    else if(shot.cinematic)throw new Error(`${shot.id}: cinematic shot requires story-cinematic presentation`);
    if (!h || !v || !shot.explanationGoal || !shot.narrationSegmentIds?.length || !shot.sourceRefs?.length || shot.captionRegion !== 'bottom-safe') throw new Error(`${shot.id}: incomplete explainer specification`);
    if(shot.characters.length&&!shot.cinematic?.actorScene)throw new Error(`${shot.id}: character actors require an actor scene`);
    if (h.id !== profile.id || h.profileVersion !== profile.version || !rigHashMatchesProfile(profile,rig.rigHash) || !rigHashMatchesProfile(profile,h.rigHash) || !shot.cinematic?.actorScene&&shot.characters.includes(profile.id)) throw new Error(`${shot.id}: performer identity/role drift`);
    if (shot.recipeId !== EXPLAINER_RECIPES[v.type]) throw new Error(`${shot.id}: wrong host recipe`);
    const ids = new Set(v.parts.map(p => p.id));
    const canonical = beats.filter(b => shot.beatIds.includes(b.id)).map(b => ExplanationBeatSchema.parse({ ...b, beatId: b.id }));
    if (!canonical.length) throw new Error(`${shot.id}: no canonical explanation beat`);
    const world=shot.cinematic?.artDirection?canonicalExplanationEvidence(beats.map(b=>ExplanationBeatSchema.parse({...b,beatId:b.id})),narration):canonical;
    const refs = world.flatMap(b => [...b.sourceRefs, ...b.entities.flatMap(e => e.sourceRefs), ...b.relations.flatMap(r => r.sourceRefs)]);
    const sourced = (references: typeof refs) => references.every(r => refs.some(c => hash(c) === hash(r)) &&
      (r.kind === 'source' || narration.segments.some(s => s.id === r.segmentId && fold(s.text).includes(fold(r.quote)))));
    if (!sourced(shot.sourceRefs)) throw new Error(`${shot.id}: changed/unverifiable narration sources`);
    if(shot.cinematic?.artDirection)validateAuthoredVisualSources(shot,world,narration,profile.id);
    else for (const p of v.parts) {
      const original = canonical.flatMap(b => b.entities).find(e => e.id === p.id);
      if (!original || p.label !== original.label || p.kind !== original.kind || p.configuration!==original.configuration || hash(p.sourceRefs) !== hash(original.sourceRefs) || hash(p.states??[])!==hash(original.states??[]) || !sourced(p.sourceRefs)) throw new Error(`${shot.id}: model entity changed its sourced identity`);
    }
    if(!shot.cinematic?.artDirection)for (const r of v.relations) if (!canonical.some(b => b.relations.some(c => hash(c) === hash(r)))) throw new Error(`${shot.id}: unsourced model relation`);
    if (!['wide', 'medium', 'close'].includes(shot.camera.shotSize) || shot.camera.angle !== 'eye-level' || !['locked', 'static', 'push-in', 'pull-out', 'pan-left', 'pan-right'].includes(shot.camera.movement)) throw new Error(`${shot.id}: unsupported explainer camera; use wide/medium/close, eye-level and a supported movement`);
    if (ids.size !== v.parts.length) throw new Error(`${shot.id}: duplicate model parts`);
    for (const p of v.parts) if (!shot.cinematic?.artDirection&&(p.x + p.width / 2 > .96 || p.y + p.height / 2 > .75 || p.x - p.width / 2 < (shot.cinematic ? .10 : .32))) throw new Error(`${shot.id}: model part crosses safe layout`);
    for (const r of v.relations) if (!ids.has(r.from) || !ids.has(r.to)) throw new Error(`${shot.id}: broken relation`);
    const knownSegments = new Set(narration.segments.map(s => s.id));
    if (shot.narrationSegmentIds.some(id => !knownSegments.has(id))) throw new Error(`${shot.id}: unknown narration segment`);
    if(h.presence==='inset')throw new Error(`${shot.id}: inset presentation is not supported; use beside-model or absent`);
    const performers=[{actions:h.actions,profile,presence:h.presence},...(shot.cinematic?.actorScene?.supporting??[]).map(actor=>({actions:actor.actions,profile:actorProfile(actor.character),presence:'beside-model'}))];
    for(const performer of performers){const actionEnd:Record<RigHand,number>={left:shot.startMs,right:shot.startMs};
    for (const a of [...performer.actions].sort((a,b)=>a.startMs-b.startMs)) {
      if(!shot.cinematic&&a.hand==='left')throw new Error(`${shot.id}: left-hand actions require the cinematic renderer`);
      const hands=a.type==='idle'&&!a.hand?['left','right'] as const:[rigHand(a)];
      for(const hand of hands){if(a.startMs<actionEnd[hand])throw new Error(`${shot.id}: ${hand} host actions overlap`);actionEnd[hand]=a.endMs;}
      if(a.secondTarget&&a.type!=='compare')throw new Error(`${shot.id}: second target is only supported for compare`);
      if(performer.presence==='absent'&&a.target)throw new Error(`${shot.id}: an absent actor cannot point or operate a model`);
      if (!performer.profile.actions.includes(a.type) || a.startMs < shot.startMs || a.endMs > shot.endMs) throw new Error(`${shot.id}: unsupported/out-of-bounds actor action`);
      if (a.narrationAnchor && !knownSegments.has(a.narrationAnchor)) throw new Error(`${shot.id}: invalid gesture narration anchor`);
      if(a.narrationAnchor){const cue=narration.segments.find(s=>s.id===a.narrationAnchor)!;
        if(!shot.narrationSegmentIds.includes(cue.id)||cue.startMs>=a.endMs||cue.endMs<=a.startMs)throw new Error(`${shot.id}: action narration anchor is outside its cue clock`);
        if(a.contactMs!==undefined&&(a.contactMs<cue.startMs||a.contactMs>=cue.endMs))throw new Error(`${shot.id}: contact occurs outside its assigned narration cue clock`);
      }
      for (const t of [a.target, a.secondTarget].filter(Boolean)) if (t!.modelId !== v.modelId || !ids.has(t!.partId)) throw new Error(`${shot.id}: missing gesture target`);
      if (['point', 'operate-model', 'walk-to-marker', 'compare'].includes(a.type) && !a.target) throw new Error(`${shot.id}: targeted action has no target`);
      if (a.type === 'compare' && (!a.secondTarget || a.target?.partId === a.secondTarget.partId)) throw new Error(`${shot.id}: compare requires two different targets`);
      if (a.type === 'operate-model' && (a.contactMs === undefined || a.contactMs <= a.startMs || a.contactMs >= a.endMs)) throw new Error(`${shot.id}: operation requires a contact after approach`);
    }}
    for (const e of v.events) {
      const moving=v.parts.find(p=>p.id===e.targetId)?.kind;
      const customMotion=shot.cinematic?.artDirection?.models.some(model=>model.partId===e.targetId);
      if(!customMotion&&(e.motion==='rotate'&&!['wheel','gear','lever'].includes(moving??'')||e.motion==='translate'&&!['piston','car'].includes(moving??'')||e.motion==='pulse'&&!['piston','wheel','gear','car','engine','flow','lever'].includes(moving??'')))throw new Error(`${shot.id}: unsupported part motion`);
      if (!sourced(e.sourceRefs)) throw new Error(`${shot.id}: unsourced model event`);
      if (!ids.has(e.targetId) || !knownSegments.has(e.narrationAnchor) || e.startMs < shot.startMs || e.endMs > shot.endMs || e.endMs <= e.startMs) throw new Error(`${shot.id}: invalid model event`);
      if(e.type==='state'&&(!e.state||e.contactRequired||e.motion!=='none'||!v.parts.find(p=>p.id===e.targetId)?.states?.some(state=>state.value===e.state&&hash(state.sourceRefs)===hash(e.sourceRefs))))throw new Error(`${shot.id}: unsourced thermal state`);
      if(e.state&&e.type!=='state')throw new Error(`${shot.id}: thermal state requires a state event`);
      if(e.relationTo){
        if(e.type==='compare'){
          if(!ids.has(e.relationTo)||e.relationTo===e.targetId)throw new Error(`${shot.id}: comparison requires two different existing subjects`);
        }else if(e.type!=='flow')throw new Error(`${shot.id}: relation endpoint is supported only for flow or comparison`);
        else if(!v.relations.some(r=>(r.kind==='transfer'||shot.cinematic?.artDirection&&r.kind==='cause')&&r.from===e.targetId&&r.to===e.relationTo&&(shot.cinematic?.artDirection||hash(r.sourceRefs)===hash(e.sourceRefs))))throw new Error(`${shot.id}: flow event has no sourced transfer`);
      }
      if(e.contactPartId&&!ids.has(e.contactPartId))throw new Error(`${shot.id}: missing control target`);
      if(!e.contactRequired&&(e.contactActorId||e.contactHands))throw new Error(`${shot.id}: contact owner/hands require a contact-driven event`);
      if(e.contactHands&&new Set(e.contactHands).size!==e.contactHands.length)throw new Error(`${shot.id}: duplicate required contact hand`);
      if(e.contactActorId&&!performers.some(performer=>performer.profile.id===e.contactActorId))throw new Error(`${shot.id}: unknown contact actor ${e.contactActorId}`);
      if(!shot.cinematic&&e.contactHands?.includes('left'))throw new Error(`${shot.id}: left-hand contact requires the cinematic renderer`);
      if(e.contactRequired){
        const eligible=performers.filter(performer=>!e.contactActorId||performer.profile.id===e.contactActorId);
        const contacted=eligible.some(performer=>{
          const actions=performer.actions.filter(a=>a.type==='operate-model'&&a.target?.partId===(e.contactPartId??e.targetId)&&a.contactMs!==undefined&&a.contactMs<e.startMs&&a.endMs>=e.endMs);
          return e.contactHands?e.contactHands.every(hand=>actions.some(a=>rigHand(a)===hand)):actions.length>0;
        });
        if(!contacted)throw new Error(`${shot.id}: model reacts before actor contact${e.contactActorId||e.contactHands?`; required ${e.contactActorId??'one present actor'}, ${e.contactHands?.join('+')??'any hand'}`:''}`);
      }
    }
    if (h.presence === 'absent') absent += shot.endMs - shot.startMs; else absent = 0;
    if (!shot.cinematic?.actorScene&&absent > config.presentation.maximum_host_absence_seconds * 1000) throw new Error('Host absent longer than configured limit');
    const spoken = narration.segments.reduce((n, s) => n + Math.max(0, Math.min(s.endMs, shot.endMs) - Math.max(s.startMs, shot.startMs)), 0);
    speech += spoken; if (h.presence !== 'absent') visible += spoken;
  }
  if(config.presentation.mode==='story-cinematic')for(const [i,shot] of board.shots.entries())validateModelContinuity(board.shots[i-1],shot);
  if (!board.shots.some(s=>s.cinematic?.actorScene)&&speech && visible / speech < config.presentation.minimum_host_speech_visibility) throw new Error('Insufficient host visibility during narration');
  if (!board.shots.some(s=>s.cinematic?.actorScene)&&config.presentation.require_meaningful_host_action_per_beat) for (const beat of beats) {
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
