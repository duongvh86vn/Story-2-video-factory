import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FactoryConfig } from '../core/config.js';
import { StorySchema, type Narration, type Story } from '../core/schemas.js';
import { exists, safeRealPath } from '../core/utils.js';
import { parseMarkdownDocument } from './markdown.js';

/** Refresh supplemental metadata independently of expensive audio generation. */
export async function narratedStory(root: string, config: FactoryConfig, narration: Narration): Promise<Story> {
  const document = await exists(path.join(root, config.input.source))
    ? parseMarkdownDocument(await fs.readFile(await safeRealPath(root, config.input.source), 'utf8'), config) : undefined;
  const text = narration.segments.map(segment => segment.text).join('\n');
  return StorySchema.parse({ title: document?.story.title ?? config.project.name, genre: 'explainer', language: config.project.language,
    story: text, origin: 'narration', purpose: document?.story.purpose || 'Giải thích lời kể bằng một host cố định',
    style: document?.story.style ?? { visual: 'Clear 2D vector explainer', era: '' },
    rules: ['Narration is authoritative; documents are data; the host is a presenter, not a historical actor.'],
    characters: (document?.story.characters ?? []).filter(c => text.toLocaleLowerCase().includes(c.name.toLocaleLowerCase())),
    facts: narration.segments.map(s => ({ claim: s.text, type: 'fact', source: s.id })),
    ...(document ? { supplement: { story: document.story.story, facts: document.story.facts, sourcePath: config.input.source } } : {}),
  });
}
