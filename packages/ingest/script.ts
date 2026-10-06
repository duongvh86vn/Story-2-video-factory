import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { FactoryConfig } from '../core/config.js';
import { Id } from '../core/identifiers.js';
import { exists, hash, safeRealPath, writeJson } from '../core/utils.js';

export const SCRIPT_PARSER_VERSION = 'script-2';
export const ScriptDocumentSchema = z.object({ version: z.literal(1), parserVersion: z.enum(['script-1',SCRIPT_PARSER_VERSION]), sourcePath: z.string(), sourceHash: z.string(),
  original: z.string(), text: z.string().min(1), paragraphs: z.array(z.object({ index: z.number().int(), text: z.string(), sourceStartLine: z.number().int(), sourceEndLine: z.number().int() })),
  chunks: z.array(z.object({ id: Id, text: z.string().min(1), separatorBefore: z.enum(['',' ']).optional(), paragraphIndex: z.number().int(), sourceStartLine: z.number().int(), sourceEndLine: z.number().int() })).min(1) });
export type ScriptDocument = z.infer<typeof ScriptDocumentSchema>;
export function parseScript(original: string, sourcePath = 'input/script.txt'): ScriptDocument {
  if (Buffer.byteLength(original, 'utf8') > 128 * 1024 || original.includes('\0')) throw new Error('Script must be UTF-8 text without NUL, at most 128 KB');
  const markdown = sourcePath.toLowerCase().endsWith('.md'), lines = original.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
  const paragraphs: ScriptDocument['paragraphs'] = []; let words: string[] = [], start = 1, end = 1, frontmatter = markdown && lines[0]?.trim() === '---';
  const flush = () => { if (words.length) paragraphs.push({ index: paragraphs.length, text: words.join(' ').replace(/\s+/gu, ' ').trim(), sourceStartLine: start, sourceEndLine: end }); words = []; };
  for (const [i, raw] of lines.entries()) {
    if (frontmatter) { if (i > 0 && raw.trim() === '---') frontmatter = false; continue; }
    let line = raw;
    if (markdown) {
      if (/^\s*(?:```|~~~|(?:---+|\*\*\*+)\s*$)/.test(line)) { flush(); continue; }
      line = line.replace(/^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/, '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/(?:\*\*|__)(.+?)(?:\*\*|__)/g, '$1').replace(/`([^`]+)`/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1').replace(/<[^>]*>/g, '');
    }
    line = line.trim(); if (!line) { flush(); continue; }
    if (!words.length) start = i + 1; end = i + 1; words.push(line);
  }
  flush(); if (frontmatter) throw new Error('Unclosed script Markdown frontmatter');
  const chunks: ScriptDocument['chunks'] = [];
  for (const p of paragraphs) {
    let current = '', separatorBefore:''|' ' = '';
    const emit = () => { if (current) chunks.push({ id: `script-${String(chunks.length + 1).padStart(4, '0')}`, text: current, separatorBefore, paragraphIndex: p.index, sourceStartLine: p.sourceStartLine, sourceEndLine: p.sourceEndLine }); current = ''; };
    for (const [i, word] of p.text.split(' ').entries()) {
      // Japanese words are not separated by spaces. ICU finds lexical boundaries,
      // retaining every character, punctuation mark and original separator.
      const units = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(word)
        ? [...new Intl.Segmenter('ja',{granularity:'word'}).segment(word)].map(unit=>unit.segment) : [word];
      for(const [j,unit] of units.entries()){
        const separator = j===0&&i>0?' ':'';
        if ([...unit].length > 120) throw new Error('Script contains a word longer than the 120-character cue limit');
        if ([...current,...separator,...unit].length > 120) emit();
        if(!current)separatorBefore=separator;
        current += current?separator+unit:unit;
        if (/[.!?。！？;]$/.test(unit)) emit();
      }
    }
    emit();
    if(chunks.filter(c=>c.paragraphIndex===p.index).map(c=>(c.separatorBefore??' ')+c.text).join('')!==p.text)throw new Error('Script segmentation changed spoken text');
  }
  const text = paragraphs.map(p => p.text).join('\n\n');
  return ScriptDocumentSchema.parse({ version: 1, parserVersion: SCRIPT_PARSER_VERSION, sourcePath, sourceHash: hash(original), original, text, paragraphs, chunks });
}
export function validateIdea(text: string): void {
  if (!text.trim() || text.includes('\0') || Buffer.byteLength(text,'utf8') > 128 * 1024) throw new Error('Idea/story must be nonempty UTF-8 text without NUL, at most 128 KB');
}
export type InputMode = 'story' | 'idea' | 'script' | 'wav' | 'srt';
export const isAuthoringMode = (mode: string): boolean => mode === 'story' || mode === 'idea';
export async function authoringSource(root: string, config: FactoryConfig): Promise<string> { return await resolveInputMode(root,config) === 'story' ? config.input.story : config.input.idea; }
export async function resolveInputMode(root: string, config: FactoryConfig): Promise<InputMode> {
  const present = async (relative: string) => await exists(path.join(root, relative));
  const story = await present(config.input.story), idea = await present(config.input.idea), script = await present(config.input.script), audio = await present(config.input.narration), subtitles = await present(config.input.subtitles);
  let mode = config.input.mode;
  if (mode === 'auto') {
    if (Number(story) + Number(idea) + Number(script) + Number(audio || subtitles) > 1) throw new Error('Multiple input types found; choose input.mode explicitly');
    mode = story ? 'story' : idea ? 'idea' : script ? 'script' : audio ? 'wav' : subtitles ? 'srt' : 'auto';
  }
  if (mode === 'auto' || mode === 'story' && !story || mode === 'idea' && !idea || mode === 'script' && !script || mode === 'wav' && !audio || mode === 'srt' && !subtitles) throw new Error(`Supply the selected ${mode} input before production`);
  return mode;
}
export async function prepareInput(root: string, config: FactoryConfig): Promise<InputMode> {
  const mode = await resolveInputMode(root, config), subtitles = await exists(path.join(root,config.input.subtitles));
  const relative = mode === 'story' ? config.input.story : mode === 'idea' ? config.input.idea : mode === 'script' ? config.input.script : mode === 'wav' ? config.input.narration : config.input.subtitles;
  const file = await safeRealPath(root, relative), bytes = await fs.readFile(file);
  if (isAuthoringMode(mode)) validateIdea(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  await writeJson(path.join(root, 'work/input-document.json'), { version: 2, mode, sourcePath: relative, sourceHash: hash(bytes),
    companionSubtitles: mode === 'wav' && subtitles ? config.input.subtitles : null });
  if (mode === 'script') await writeJson(path.join(root, 'work/script.json'), parseScript(new TextDecoder('utf-8', { fatal: true }).decode(bytes), relative));
  return mode;
}
