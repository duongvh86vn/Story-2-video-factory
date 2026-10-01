import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import { StorySchema, type Beat, type Chapter, type CharacterBible, type Narration, type Story } from '../core/schemas.js';
import { writeJson } from '../core/utils.js';
import type { ModelRouter } from '../models/registry.js';
import { buildCharacterBible, loadSeriesContext } from './characters.js';
import { planChapters } from './chapters.js';
import { planBeats } from './beats.js';
import { loadPrompt } from './prompts.js';
import { planWithValidation } from './request.js';
import { uniqueIds, validateNarration, validatePlanning } from './timeline.js';

const normalized = (text: string): string => text.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

export async function analyzeProject(projectRoot: string, config: FactoryConfig, router: ModelRouter, source: Story, narration: Narration): Promise<{ story: Story; characters: CharacterBible; chapters: Chapter[]; beats: Beat[] }> {
  source = StorySchema.parse(source);
  validateNarration(narration);
  const series = await loadSeriesContext(projectRoot, config);
  const sourceCharacters = new Map(config.content.mode === 'legacy' ? series.source?.characters.map(character => [character.id, character]) ?? [] : []);
  for (const inherited of config.content.mode === 'legacy' ? series.bible.characters : []) {
    sourceCharacters.set(inherited.id, { id: inherited.id, name: inherited.name,
      description: Object.values(inherited.identity).filter(Boolean).join('; '),
      immutableTraits: inherited.immutable, mutableTraits: inherited.mutable });
  }
  for (const character of source.characters) {
    const inherited = sourceCharacters.get(character.id);
    if (inherited && inherited.name !== character.name) throw new Error(`Episode character ${character.id} conflicts with series name`);
    sourceCharacters.set(character.id, inherited ? { ...character,
      immutableTraits: [...new Set([...inherited.immutableTraits, ...character.immutableTraits])],
      mutableTraits: [...new Set([...inherited.mutableTraits, ...character.mutableTraits])],
    } : character);
  }
  const inheritedVisual = series.source?.style.visual;
  const base: Story = { ...source, characters: [...sourceCharacters.values()], rules: [...new Set([...(series.source?.rules ?? []), ...source.rules])],
    style: { visual: inheritedVisual && !source.style.visual.includes(inheritedVisual) ? `${inheritedVisual}\n\n${source.style.visual}` : source.style.visual,
      era: source.style.era || series.source?.style.era || '' },
  };
  const story = await planWithValidation(projectRoot, config, router, 'planner', 'story-analysis', {
    system: await loadPrompt('story-analyst'),
    prompt: 'Analyze chronology, cause/effect, source facts and explicitly named entities. Return a canonical Story JSON. Keep all source fields and IDs. Facts must quote exact source excerpts and use source="source.md", source="narration", or a narration segment ID. Never add factual knowledge.',
    context: { task: 'story-analysis', story: base, narration: { segments: narration.segments }, seriesSource: series.source },
  }, StorySchema, result => {
    uniqueIds(result.characters, 'source character');
    const allText = normalized(`${base.story}\n${narration.segments.map(segment => segment.text).join('\n')}`);
    const characters = new Map(base.characters.map(character => [character.id, character]));
    for (const character of result.characters) {
      if (characters.has(character.id)) continue;
      if (!allText.includes(normalized(character.name)) || !character.name.trim()) throw new Error(`Ungrounded named character: ${character.name}`);
      if ([...characters.values()].some(existing => normalized(existing.name) === normalized(character.name))) throw new Error(`Named character ${character.name} duplicates another ID`);
      const groundedDescription = [base.story, ...narration.segments.map(segment => segment.text)].flatMap(text => text.split(/\r?\n/)).find(text => normalized(text).includes(normalized(character.name))) ?? character.name;
      // Entity discovery may add a named source reference, never unsupported appearance traits.
      characters.set(character.id, { ...character, description: groundedDescription, immutableTraits: [], mutableTraits: [] });
    }
    for (const fact of result.facts) {
      const segment = narration.segments.find(item => item.id === fact.source || `segment:${item.id}` === fact.source);
      const text = fact.source === 'source.md' ? config.content.mode==='legacy'?base.story:base.supplement?.story : fact.source === 'narration' ? narration.segments.map(item => item.text).join('\n') : segment?.text;
      if (!text || !fact.claim.trim() || !normalized(text).includes(normalized(fact.claim))) throw new Error(`Fact must be a grounded source excerpt: ${fact.claim} (${fact.source})`);
    }
    return StorySchema.parse({ ...base, purpose: base.purpose || result.purpose,
      facts: [...base.facts, ...result.facts.filter(fact => !base.facts.some(existing => existing.claim === fact.claim && existing.source === fact.source))],
      chronology: result.chronology, causalChain: result.causalChain, characters: [...characters.values()],
    });
  });
  await writeJson(path.join(projectRoot, 'work', 'story.json'), story);
  const characters = await buildCharacterBible(projectRoot, config, router, story, narration, series);
  const chapters = await planChapters(projectRoot, config, router, story, narration);
  const beats = await planBeats(projectRoot, config, router, story, narration, chapters);
  validatePlanning(narration, chapters, beats);
  await writeJson(path.join(projectRoot, 'work', 'analysis.json'), { story, characters, chapters, beats });
  return { story, characters, chapters, beats };
}
