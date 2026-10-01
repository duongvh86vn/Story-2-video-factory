import { CharacterBibleSchema, CharacterSchema, SegmentSchema, StorySchema, type CharacterBible, type Story } from '../core/schemas.js';
import { ModelError, object } from './adapter.js';

export type MockContext = Record<string, unknown>;
export function contextOf(value: unknown): MockContext {
  const context = object(value);
  if (!Object.keys(context).length) throw new ModelError('mock_context', 'Mock generation requires a task context');
  return context;
}
export function storyOf(context: MockContext): Story {
  const parsed = StorySchema.safeParse(context.story);
  if (!parsed.success) throw new ModelError('mock_context', 'Task context requires a canonical Story');
  return parsed.data;
}
export function segmentsOf(context: MockContext): Array<{ id: string; startMs: number; endMs: number; text: string }> {
  const input = context.segments ?? object(context.narration).segments;
  if (!Array.isArray(input) || !input.length) throw new ModelError('mock_context', 'Planning requires supplied narration segments');
  const segments = input.map(value => {
    const result = SegmentSchema.safeParse(value);
    if (!result.success) throw new ModelError('mock_context', 'Invalid narration segment in mock context');
    return result.data;
  }).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  if (new Set(segments.map(segment => segment.id)).size !== segments.length) throw new ModelError('mock_context', 'Narration segment IDs must be unique');
  return segments;
}
export function excerpt(text: string, maxWords = 16): string {
  const words = text.trim().split(/\s+/);
  return words.slice(0, maxWords).join(' ') + (words.length > maxWords ? '…' : '');
}
/** Exact source spans: no whitespace normalization in fact claims. */
function sentences(text: string): string[] {
  return (text.match(/[^.!?。！？\n]+(?:[.!?。！？]+|$)/gu) ?? [text]).map(span => span.trim()).filter(Boolean);
}
export function phase(text: string): 'problem' | 'person' | 'experiment' | 'failure' | 'solution' | 'process' | 'evidence' | 'conclusion' | 'context' {
  if (/thất bại|quá nhiệt|hỏng|không thành|tuy nhiên|nhưng|failed|failure|overheat|broke|however|but\b/i.test(text)) return 'failure';
  if (/đột phá|thành công|giải pháp|cuối cùng|cải tiến|breakthrough|success|solution|finally|improv/i.test(text)) return 'solution';
  if (/vấn đề|khó khăn|thách thức|nhu cầu|problem|challenge|needed|limitation/i.test(text)) return 'problem';
  if (/nguyên mẫu|thử nghiệm|thiết kế|rotor|động cơ|prototype|experiment|test|invent|design/i.test(text)) return 'experiment';
  if (/bằng sáng chế|tài liệu|chứng minh|số liệu|patent|document|evidence|data|percent|\d\s*%/i.test(text)) return 'evidence';
  if (/quy trình|nhà máy|sản xuất|lắp ráp|process|factory|manufactur|assembl/i.test(text)) return 'process';
  if (/di sản|ngày nay|kết luận|ảnh hưởng|legacy|today|conclu|impact/i.test(text)) return 'conclusion';
  if (/\b(ông|bà|anh|cô|he|she|inventor|engineer)\b|nhà phát minh|kỹ sư/i.test(text)) return 'person';
  return 'context';
}
const purpose: Record<ReturnType<typeof phase>, string> = {
  problem: 'Establish the concrete need and the constraint the story must resolve',
  person: 'Connect the named person to their actions while preserving identity and source details',
  experiment: 'Explain the design or experiment through its visible parts and cause-and-effect sequence',
  failure: 'Make the stated obstacle or failed attempt visible without adding unsupported events',
  solution: 'Reveal the stated change and show how the result addresses the earlier constraint',
  process: 'Show the narrated production steps in order and explain the role of each step',
  evidence: 'Anchor the narrated claim to the supplied document, measurement, or source excerpt',
  conclusion: 'Connect the stated result to its narrated consequence and close the argument',
  context: 'Orient the viewer to the supplied setting and preserve the sequence of narrated ideas'
};

export function mockStoryAnalysis(context: MockContext): Story {
  const story = storyOf(context);
  const narration = object(context.narration);
  const spoken = Array.isArray(narration.segments) ? narration.segments.map(value => object(value).text).filter((text): text is string => typeof text === 'string') : [];
  const sourceSpans = sentences(story.story);
  const narrationSpans = spoken.flatMap(sentences);
  const claims = new Map<string, Story['facts'][number]>();
  for (const fact of story.facts) {
    if (story.story.includes(fact.claim)) claims.set(fact.claim, { ...fact, source: story.origin==='narration'?'narration':'source.md' });
    else if (spoken.some(text => text.includes(fact.claim))) claims.set(fact.claim, { ...fact, source: 'narration' });
  }
  for (const span of sourceSpans.slice(0, 16)) if (!claims.has(span)) claims.set(span, { claim: span, type: 'fact', source: story.origin==='narration'?'narration':'source.md' });
  for (const span of narrationSpans.slice(0, 12)) if (!claims.has(span)) claims.set(span, { claim: span, type: 'fact', source: 'narration' });
  const events = (narrationSpans.length ? narrationSpans : sourceSpans).slice(0, 16);
  const explicitCauses = [...sourceSpans, ...narrationSpans].filter(span => /vì|do đó|nên|khiến|dẫn đến|nhờ|because|therefore|result|caus|led to|so that/i.test(span));
  return { ...story, facts: [...claims.values()],
    chronology: story.chronology.length ? [...story.chronology] : events.map((event, index) => `${index + 1}. ${event}`),
    causalChain: story.causalChain.length ? [...story.causalChain] : explicitCauses.length ? [...new Set(explicitCauses)].slice(0, 10)
      : events.slice(0, -1).map((event, index) => `Narrated sequence; causal link unspecified: ${event} → ${events[index + 1]}`) };
}
export function mockCharacterBible(context: MockContext): CharacterBible {
  const story = storyOf(context);
  const inherited = CharacterBibleSchema.parse(context.inherited ?? { characters: [] });
  const existing = CharacterBibleSchema.parse(context.existing ?? { characters: [] });
  const characters = new Map<string, CharacterBible['characters'][number]>();
  for (const character of inherited.characters) characters.set(character.id, structuredClone(character));
  for (const character of existing.characters) {
    const canonical = characters.get(character.id);
    if (canonical && character.locked && JSON.stringify(canonical) !== JSON.stringify(character)) {
      throw new ModelError('character_conflict', 'Inherited and existing locked character records disagree');
    }
    if (!canonical) characters.set(character.id, structuredClone(character));
  }
  for (const source of story.characters) {
    if (characters.has(source.id)) continue;
    const approvedInput = context.approvedCharacters;
    const approvedList = Array.isArray(approvedInput) ? approvedInput : Array.isArray(object(approvedInput).characters)
      ? object(approvedInput).characters as unknown[] : Object.entries(object(approvedInput)).map(([id, value]) => ({ id, ...object(value) }));
    const approved = object(approvedList.find(value => object(value).id === source.id || object(value).characterId === source.id));
    const canonical = CharacterSchema.safeParse(approved);
    if (canonical.success) {
      if (canonical.data.name !== source.name || source.immutableTraits.some(trait => !canonical.data.immutable.includes(trait))
        || source.mutableTraits.some(trait => !canonical.data.mutable.includes(trait))) throw new ModelError('character_conflict', 'Approved character conflicts with source identity or traits');
      characters.set(source.id, structuredClone(canonical.data));
      continue;
    }
    const description = source.description || `Use only supplied references for ${source.name}`;
    characters.set(source.id, {
      id: source.id, name: source.name,
      identity: { genderPresentation: 'Unspecified in source; preserve supplied reference', apparentAge: 'Unspecified in source',
        body: description, face: 'Preserve reference proportions; do not invent a different identity',
        hair: 'Use source description or supplied reference consistently', facialHair: 'Use source description or supplied reference consistently' },
      wardrobe: { default: `Follow the source description: ${description}`, eraRules: story.style.era ? [`Keep all wardrobe and props consistent with ${story.style.era}`] : ['Use only wardrobe supported by the source or reference'] },
      immutable: [...new Set([...source.immutableTraits, 'character ID and name', 'reference face proportions', 'reference silhouette'])],
      mutable: source.mutableTraits.length ? [...source.mutableTraits] : ['pose', 'expression', 'camera angle', 'lighting'],
      negativeRules: [...new Set([...story.rules, 'Do not change locked identity traits between shots', 'Do not infer undocumented identity or costume details'])],
      referenceAssets: Array.isArray(approved.referenceAssets) ? approved.referenceAssets.filter((value): value is string => typeof value === 'string') : [],
      locked: true,
      versions: Array.isArray(approved.versions) ? approved.versions as CharacterBible['characters'][number]['versions'] : [{
        id: typeof approved.versionId === 'string' ? approved.versionId : `${source.id}.default`, description: `Canonical source appearance: ${description}`,
        assets: Array.isArray(approved.assets) ? approved.assets.filter((value): value is string => typeof value === 'string') : [] }],
      poses: Object.fromEntries(Object.entries(object(approved.poses)).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    });
  }
  return { characters: [...characters.values()], ...(inherited.seriesId ?? existing.seriesId ? { seriesId: inherited.seriesId ?? existing.seriesId } : {}) };
}
export function mockChapters(context: MockContext): unknown {
  const story = storyOf(context); const segments = segmentsOf(context);
  const groups: typeof segments[] = []; let group: typeof segments = [];
  for (const segment of segments) {
    const previous = group.at(-1);
    const elapsed = group.length ? segment.endMs - group[0]!.startMs : 0;
    const boundary = previous && group.length >= 2 && phase(segment.text) !== phase(previous.text) && phase(segment.text) !== 'context';
    if (group.length && (boundary || elapsed > 35000 || group.length >= 7)) { groups.push(group); group = []; }
    group.push(segment);
  }
  if (group.length) groups.push(group);
  return { chapters: groups.map((items, index) => {
    const text = items.map(segment => segment.text).join(' ');
    return { id: `ch${String(index + 1).padStart(3, '0')}`, title: excerpt(items[0]!.text, 9),
      summary: `${story.title}: ${excerpt(text, 55)}`, narrativePurpose: purpose[phase(text)], segmentIds: items.map(segment => segment.id) };
  }) };
}
export function mockBeats(context: MockContext): unknown {
  const story = storyOf(context); const chapter = object(context.chapter);
  if (typeof chapter.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(chapter.id)) throw new ModelError('mock_context', 'Beat planning requires a valid chapter ID');
  const requested = Array.isArray(chapter.segmentIds) ? new Set(chapter.segmentIds) : undefined;
  const segments = segmentsOf(context).filter(segment => !requested || requested.has(segment.id));
  if (!segments.length) throw new ModelError('mock_context', 'Chapter has no supplied narration segments');
  const groups: typeof segments[] = []; let group: typeof segments = [];
  for (const segment of segments) {
    if (group.length && (phase(segment.text) !== phase(group.at(-1)!.text) || segment.endMs - group[0]!.startMs > 8000 || group.length >= 2)) {
      groups.push(group); group = [];
    }
    group.push(segment);
  }
  if (group.length) groups.push(group);
  return { beats: groups.map((items, index) => {
    const text = items.map(segment => segment.text).join(' '); const kind = phase(text);
    return { id: `${chapter.id}.b${String(index + 1).padStart(3, '0')}`,
      meaning: `${purpose[kind]}. Narrated idea: ${excerpt(text, 32)}`,
      visualGoal: `${visualGoal(kind)} Depict only this supplied content: ${excerpt(text, 24)}. Apply ${story.style.visual}.`,
      importance: kind === 'failure' || kind === 'solution' ? 0.95 : kind === 'evidence' || kind === 'experiment' ? 0.85 : index === 0 ? 0.8 : 0.65,
      segmentIds: items.map(segment => segment.id) };
  }) };
}
function visualGoal(kind: ReturnType<typeof phase>): string {
  const goals = { problem: 'Establish the constraint with a readable comparison and a highlighted limitation.',
    person: 'Show the named character interacting with the narrated object and keep the locked silhouette consistent.',
    experiment: 'Reveal component relationships, trace the narrated action, and show the resulting change.',
    failure: 'Focus on the stated failure point and use a measured warning accent to explain its consequence.',
    solution: 'Contrast the earlier constraint with the stated improvement and reveal the successful mechanism.',
    process: 'Animate each narrated step in sequence with persistent labels and visible material flow.',
    evidence: 'Reveal a source excerpt or supported measurement and highlight the precise claim.',
    conclusion: 'Show the stated outcome in a wide composition and carry the established visual motif into the closing image.',
    context: 'Build an establishing composition around the supplied setting and introduce the central visual motif.' };
  return goals[kind];
}
