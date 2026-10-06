import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import { ChapterSchema, type Chapter, type Narration, type Story } from '../core/schemas.js';
import { writeJson } from '../core/utils.js';
import type { ModelRouter } from '../models/registry.js';
import { loadPrompt } from './prompts.js';
import { planWithValidation } from './request.js';
import { ChapterPlanSchema } from './schemas.js';
import { validateNarration, validatePartition } from './timeline.js';

export async function planChapters(root: string, config: FactoryConfig, router: ModelRouter, story: Story, narration: Narration): Promise<Chapter[]> {
  validateNarration(narration);
  const chapters = await planWithValidation(root, config, router, 'planner', 'chapters', {
    system: await loadPrompt('chapter-planner'),
    prompt: 'Group the supplied narration into semantic chapters. Return {chapters:[{id,title,summary,narrativePurpose,segmentIds}]}. Reference every segment exactly once in original order. No timestamp fields.',
    context: { task: 'chapters', story, segments: narration.segments, durationMs: narration.durationMs },
  }, ChapterPlanSchema, result => {
    validatePartition(result.chapters, narration.segments, 'chapters');
    return result.chapters.map((chapter, i) => ChapterSchema.parse({ ...chapter,
      startMs: i === 0 ? 0 : narration.segments.find(segment => segment.id === chapter.segmentIds[0])!.startMs,
      endMs: i + 1 === result.chapters.length ? narration.durationMs : narration.segments.find(segment => segment.id === result.chapters[i + 1]!.segmentIds[0])!.startMs,
    }));
  },undefined,undefined,{reuseAccepted:true});
  await writeJson(path.join(root, 'work', 'chapters.json'), chapters);
  return chapters;
}
