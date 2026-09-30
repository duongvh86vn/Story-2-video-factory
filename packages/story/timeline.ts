import { BeatSchema, ChapterSchema, NarrationSchema, type Beat, type Chapter, type Narration } from '../core/schemas.js';

export function uniqueIds(items: Array<{ id: string }>, label: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`Duplicate ${label} ID: ${item.id}`);
    seen.add(item.id);
  }
}

export function validateNarration(narration: Narration): void {
  NarrationSchema.parse(narration);
  uniqueIds(narration.segments, 'segment');
  let end = 0;
  for (const segment of narration.segments) {
    if (segment.startMs < end) throw new Error(`Narration segment ${segment.id} overlaps or is out of order`);
    if (segment.endMs > narration.durationMs) throw new Error(`Narration segment ${segment.id} exceeds duration`);
    end = segment.endMs;
  }
  let previousStart = -1;
  for (const word of narration.words) {
    if (word.endMs < word.startMs || word.endMs > narration.durationMs || word.startMs < previousStart) {
      throw new Error(`Invalid or out-of-order word timing: ${word.text}`);
    }
    previousStart = word.startMs;
  }
}

/** Membership must be an ordered, lossless partition, never a set-only check. */
export function validatePartition(groups: Array<{ id: string; segmentIds: string[] }>, expected: Narration['segments'], label: string): void {
  if (!groups.length) throw new Error(`${label}: empty partition`);
  uniqueIds(groups, label);
  const actual = groups.flatMap(group => {
    if (!group.segmentIds.length) throw new Error(`${label} ${group.id} has no narration`);
    return group.segmentIds;
  });
  if (actual.length !== expected.length) throw new Error(`${label}: expected ${expected.length} segment references, received ${actual.length}; every segment must appear exactly once`);
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]!.id) throw new Error(`${label}: segment ${i + 1} must be ${expected[i]!.id}, received ${actual[i]}`);
  }
}

export function validatePlanning(narration: Narration, chapters: Chapter[], beats: Beat[]): void {
  validateNarration(narration);
  chapters.forEach(chapter => ChapterSchema.parse(chapter));
  beats.forEach(beat => BeatSchema.parse(beat));
  validatePartition(chapters, narration.segments, 'chapters');
  validatePartition(beats, narration.segments, 'beats');
  uniqueIds(beats, 'beat');
  let chapterCursor = 0;
  let beatIndex = 0;
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]!;
    const next = chapters[i + 1];
    const expectedEnd = next ? narration.segments.find(segment => segment.id === next.segmentIds[0])!.startMs : narration.durationMs;
    if (chapter.startMs !== chapterCursor || chapter.endMs !== expectedEnd || chapter.endMs <= chapter.startMs) throw new Error(`Chapter ${chapter.id} changes narration boundaries`);
    const members = beats.filter(beat => beat.chapterId === chapter.id);
    const segments = narration.segments.filter(segment => chapter.segmentIds.includes(segment.id));
    validatePartition(members, segments, `beats in ${chapter.id}`);
    let cursor = chapter.startMs;
    for (let j = 0; j < members.length; j++) {
      const beat = members[j]!;
      if (beats[beatIndex++]?.id !== beat.id) throw new Error(`Beat ${beat.id} is outside chapter order`);
      const nextBeat = members[j + 1];
      const expectedBeatEnd = nextBeat ? segments.find(segment => segment.id === nextBeat.segmentIds[0])!.startMs : chapter.endMs;
      const text = segments.filter(segment => beat.segmentIds.includes(segment.id)).map(segment => segment.text).join('\n');
      if (beat.startMs !== cursor || beat.endMs !== expectedBeatEnd || beat.endMs <= beat.startMs || beat.narrationText !== text) throw new Error(`Beat ${beat.id} changes narration text or boundaries`);
      cursor = beat.endMs;
    }
    chapterCursor = chapter.endMs;
  }
  if (beatIndex !== beats.length) throw new Error('Beats reference unknown chapters');
}
