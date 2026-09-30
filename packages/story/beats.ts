import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import { BeatSchema, type Beat, type Chapter, type Narration, type Story } from '../core/schemas.js';
import { writeJson } from '../core/utils.js';
import type { ModelRouter } from '../models/registry.js';
import { loadPrompt } from './prompts.js';
import { planWithValidation } from './request.js';
import { BeatPlanSchema } from './schemas.js';
import { uniqueIds, validatePartition, validatePlanning } from './timeline.js';

export async function planBeats(root: string, config: FactoryConfig, router: ModelRouter, story: Story, narration: Narration, chapters: Chapter[]): Promise<Beat[]> {
  const beats: Beat[] = [];
  for (const chapter of chapters) {
    const segments = narration.segments.filter(segment => chapter.segmentIds.includes(segment.id));
    const batch = await planWithValidation(root, config, router, 'planner', `beats-${chapter.id}`, {
      system: await loadPrompt('beat-planner'),
      prompt: 'Create meaningful visual beats for this chapter. Return {beats:[{id,meaning,visualGoal,importance,segmentIds}]}. IDs must begin with this chapter ID; no timestamps. Every chapter segment must appear exactly once in original order.',
      context: { task: 'beats', story, chapter, segments },
    }, BeatPlanSchema, result => {
      validatePartition(result.beats, segments, `beats in ${chapter.id}`);
      if (result.beats.some(beat => !beat.id.startsWith(`${chapter.id}.`) && !beat.id.startsWith(`${chapter.id}_`))) throw new Error(`Beat IDs must be namespaced with ${chapter.id}. or ${chapter.id}_`);
      return result.beats.map((beat, i) => BeatSchema.parse({ ...beat, chapterId: chapter.id,
        startMs: i === 0 ? chapter.startMs : segments.find(segment => segment.id === beat.segmentIds[0])!.startMs,
        endMs: i + 1 === result.beats.length ? chapter.endMs : segments.find(segment => segment.id === result.beats[i + 1]!.segmentIds[0])!.startMs,
        narrationText: segments.filter(segment => beat.segmentIds.includes(segment.id)).map(segment => segment.text).join('\n'),
      }));
    });
    beats.push(...batch);
    uniqueIds(beats, 'beat');
    await writeJson(path.join(root, 'work', 'planning', `beats-${chapter.id}.json`), batch);
  }
  validatePlanning(narration, chapters, beats);
  await writeJson(path.join(root, 'work', 'beats.json'), beats);
  return beats;
}
