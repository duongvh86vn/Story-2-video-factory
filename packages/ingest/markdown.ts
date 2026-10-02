import { createHash } from 'node:crypto';
import YAML from 'yaml';
import type { FactoryConfig } from '../core/config.js';
import { StorySchema, type Story } from '../core/schemas.js';

type Role = 'title' | 'purpose' | 'story' | 'characters' | 'rules' | 'visual' | 'era' | 'genre' | 'language' | 'facts' | 'chronology' | 'causalChain';
interface Heading { start: number; bodyStart: number; end: number; level: number; text: string; role?: Role; value?: string }
export interface MarkdownDocument { story: Story; authoredStyle: Story['style']; sourceMarkdown: string; sections: Array<{ heading: string; start: number; end: number; role: string }> }

const aliases: Record<Role, string[]> = {
  title: ['title', 'tieu de', 'ten', 'series'],
  purpose: ['purpose', 'goal', 'goals', 'objective', 'muc dich', 'muc tieu'],
  story: ['story', 'narrative', 'content', 'script', 'synopsis', 'summary', 'noi dung', 'cau chuyen', 'cot truyen', 'kich ban', 'tom tat'],
  characters: ['character', 'characters', 'character descriptions', 'character bible', 'cast', 'nhan vat', 'mo ta nhan vat', 'recurring host character', 'host character', 'recurring characters', 'nguoi dan chuyen'],
  rules: ['rule', 'rules', 'constraints', 'requirements', 'forbidden', 'negative rules', 'quy tac', 'quy dinh', 'cam', 'dieu cam', 'yeu cau', 'forbidden elements'],
  visual: ['visual style', 'style', 'visual identity', 'visuals', 'phong cach', 'phong cach hinh anh', 'camera language', 'ngon ngu may quay'],
  era: ['era', 'period', 'setting', 'boi canh', 'thoi dai'],
  genre: ['genre', 'type', 'the loai'], language: ['language', 'ngon ngu'],
  facts: ['facts', 'key facts', 'important facts', 'du kien', 'du kien quan trong', 'su kien'],
  chronology: ['chronology', 'chronological order', 'trinh tu thoi gian', 'dien bien'],
  causalChain: ['causal chain', 'causality', 'cause and effect', 'chuoi nhan qua', 'nhan qua'],
};
function fold(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
}
function plain(value: string): string { return value.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim(); }
function roleOf(text: string): { role?: Role; value?: string } {
  const colon = text.search(/[:：]/u);
  const key = fold(colon < 0 ? text : text.slice(0, colon));
  for (const role of Object.keys(aliases) as Role[]) {
    if (aliases[role].includes(key)) return { role, ...(colon < 0 ? {} : { value: plain(text.slice(colon + 1)) }) };
  }
  return {};
}
function linesWithOffsets(source: string): Array<{ text: string; start: number; end: number }> {
  const result: Array<{ text: string; start: number; end: number }> = [];
  const pattern = /[^\r\n]*(?:\r\n|\r|\n|$)/g;
  for (const match of source.matchAll(pattern)) {
    if (!match[0]) continue;
    result.push({ text: match[0].replace(/[\r\n]+$/, ''), start: match.index!, end: match.index! + match[0].length });
  }
  return result;
}
function scanHeadings(source: string, from: number): Heading[] {
  const lines = linesWithOffsets(source);
  const headings: Heading[] = [];
  let fence: { char: string; length: number } | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.start < from) continue;
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line.text);
    if (fence) {
      if (marker && marker[1]![0] === fence.char && marker[1]!.length >= fence.length && /^ {0,3}(?:`+|~+)\s*$/.test(line.text)) fence = undefined;
      continue;
    }
    if (marker) { fence = { char: marker[1]![0]!, length: marker[1]!.length }; continue; }
    const atx = /^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/.exec(line.text);
    if (atx) {
      const text = atx[2]!.replace(/[ \t]+#+[ \t]*$/, '').trim();
      headings.push({ start: line.start, bodyStart: line.end, end: source.length, level: atx[1]!.length, text, ...roleOf(text) });
      continue;
    }
    const next = lines[i + 1];
    if (line.text.trim() && !/^ {0,3}(?:>|[-+*]\s|\d+[.)]\s)/.test(line.text) && next && /^ {0,3}(?:=+|-+)\s*$/.test(next.text)) {
      const text = line.text.trim();
      headings.push({ start: line.start, bodyStart: next.end, end: source.length, level: next.text.trim()[0] === '=' ? 1 : 2, text, ...roleOf(text) });
      i++;
    }
  }
  for (let i = 0; i < headings.length; i++) {
    headings[i]!.end = headings.find((candidate, j) => j > i && candidate.level <= headings[i]!.level)?.start ?? source.length;
  }
  return headings;
}
function items(body: string): string[] {
  const result: string[] = [];
  for (const line of body.split(/\r\n|\r|\n/)) {
    if (!line.trim() || /^\s*#{1,6}\s/.test(line)) continue;
    const bullet = /^\s*(?:[-+*]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) result.push(plain(bullet[1]!));
    else if (/^\s{2,}\S/.test(line) && result.length) result[result.length - 1] += '\n' + line.trim();
    else result.push(plain(line));
  }
  return result.filter(Boolean);
}
const immutableLabels = ['immutable', 'immutable traits', 'fixed traits', 'identity lock', 'bat bien', 'dac diem bat bien', 'co dinh', 'khong thay doi'];
const mutableLabels = ['mutable', 'mutable traits', 'can change', 'allowed changes', 'co the thay doi', 'duoc thay doi'];
function traitLabel(text: string): 'immutable' | 'mutable' | undefined {
  const key = fold(text).replace(/[:：]\s*$/, '');
  return immutableLabels.includes(key) ? 'immutable' : mutableLabels.includes(key) ? 'mutable' : undefined;
}
function looksLikeName(value: string | undefined): value is string {
  if (!value) return false;
  const candidate = plain(value);
  return candidate.length <= 80 && candidate.split(/\s+/).length <= 6 && /[\p{L}]/u.test(candidate)
    && !/[.!?;:：]/u.test(candidate) && !/^(?:use|keep|maintain|do|don't|must|should|never|always|allow|ensure|su dung|giu|khong|hay)\b/.test(fold(candidate));
}
function referencedHost(body: string): string | undefined {
  // Names are grounded in an explicit asset reference, never an instruction line.
  const normalized = plain(body);
  const asset = /\b(?:use|reuse|using)\s+(?:the\s+)?(?:approved|existing)\s+([\p{L}\p{N}][\p{L}\p{N} '’\-]{0,70}?)\s+(?:(?:SVG|PNG|JPEG|JPG|WebP)\s+)?(?:poses|assets|images)\b/iu.exec(normalized)?.[1];
  return looksLikeName(asset) ? asset.trim() : undefined;
}
/** ASCII IDs satisfy the shared Id schema, including stable code-point IDs for CJK names. */
export function characterId(name: string): string {
  const digest = createHash('sha256').update(name.normalize('NFC')).digest('hex').slice(0, 10);
  const normalized = fold(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (normalized) return normalized.length > 70 ? normalized.slice(0, 60) + '-' + digest : normalized;
  const points = Array.from(name.normalize('NFC')).filter(c => /[\p{L}\p{N}]/u.test(c)).map(c => c.codePointAt(0)!.toString(16));
  const id = 'u-' + points.join('-');
  return points.length ? (id.length > 70 ? id.slice(0, 60) + '-' + digest : id) : 'character-' + digest;
}
function makeCharacter(nameInput: string, body: string, used: Set<string>): Story['characters'][number] {
  const headingId = /\s*\{#([^}]+)\}\s*$/.exec(nameInput);
  const name = plain(headingId ? nameInput.slice(0, headingId.index) : nameInput);
  const fields = body.split(/\r\n|\r|\n/).map(line => /^\s*(?:[-+*]\s+)?(?:\*\*)?([^:：]+?)(?:\*\*)?\s*[:：]\s*(.*?)\s*$/.exec(line));
  const explicit = fields.find(f => f && ['id', 'character id', 'ma nhan vat'].includes(fold(f[1]!)))?.[2] ?? headingId?.[1];
  const explicitId = explicit?.trim().replace(/^`(.*)`$/, '$1').replace(/^\*\*(.*)\*\*$/, '$1');
  const base = explicitId ? (/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(explicitId) ? explicitId : characterId(explicitId)) : characterId(name);
  let id = base; let suffix = 2;
  while (used.has(id)) id = base + '-' + suffix++;
  used.add(id);
  const immutableTraits: string[] = [], mutableTraits: string[] = [];
  let target: string[] | undefined;
  for (const line of body.split(/\r\n|\r|\n/)) {
    const stripped = line.replace(/^\s*(?:#{1,6}\s+|[-+*]\s+)?/, '');
    const colon = stripped.search(/[:：]/u);
    const label = traitLabel(plain(colon < 0 ? stripped : stripped.slice(0, colon)));
    if (label) {
      target = label === 'immutable' ? immutableTraits : mutableTraits;
      const inline = colon < 0 ? '' : plain(stripped.slice(colon + 1));
      if (inline) target.push(inline);
    } else if (target && line.trim()) {
      if (/^\s*#{1,6}\s/.test(line) || (colon >= 0 && !/^\s*[-+*]/.test(line))) target = undefined;
      else target.push(plain(stripped));
    }
  }
  const fixedInstruction = /(?:^|[.!?]\s+)(Keep\s+[^.!?\r\n]+\s+fixed\.?)/iu.exec(body)?.[1];
  if (fixedInstruction && !immutableTraits.includes(fixedInstruction)) immutableTraits.push(fixedInstruction);
  return { id, name, description: body.trim(), immutableTraits, mutableTraits };
}
/** Deterministic structural Markdown parsing; no model calls or source paraphrasing. */
export function parseMarkdownDocument(source: string, config?: FactoryConfig): MarkdownDocument {
  if (!source.replace(/^\uFEFF/, '').trim()) throw new Error('source.md is empty');
  let from = source.startsWith('\uFEFF') ? 1 : 0;
  let metadata: Record<string, unknown> = {};
  const front = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(source.slice(from));
  if (front) {
    const value: unknown = YAML.parse(front[1]!);
    if (value && typeof value === 'object' && !Array.isArray(value)) metadata = value as Record<string, unknown>;
    from += front[0].length;
  }
  const headings = scanHeadings(source, from);
  const sections = headings.filter(h => h.role && !headings.some(parent => parent.role && parent.start < h.start && parent.end > h.start && parent.role === 'characters'));
  // Natural documents may use a level-one template title followed by level-two
  // metadata sections. A recognized section closes at the next recognized section.
  for (let i = 0; i < sections.length; i++) {
    const next = sections[i + 1];
    if (next) sections[i]!.end = Math.min(sections[i]!.end, next.start);
  }
  const bodyOf = (h: Heading): string => source.slice(h.bodyStart, h.end).trim();
  const values = (role: Role): string[] => sections.filter(h => h.role === role).map(h => h.value || bodyOf(h)).filter(Boolean);
  const metaString = (key: string): string => typeof metadata[key] === 'string' ? metadata[key] as string : '';
  const naturalTitle = headings.find(h => h.level === 1 && !h.role);
  const title = values('title')[0]?.split(/\r\n|\r|\n/)[0]?.trim() || metaString('title') || (naturalTitle && plain(naturalTitle.text)) || config?.project.name || 'Untitled';
  const characters: Story['characters'] = [];
  const usedIds = new Set<string>();
  for (const section of sections.filter(h => h.role === 'characters')) {
    const children = headings.filter(h => h.start >= section.bodyStart && h.start < section.end && !headings.some(p => p.start >= section.bodyStart && p.start < h.start && p.end > h.start && p.level < h.level));
    const characterHeads = children.filter(h => !traitLabel(h.text) && !['description', 'appearance', 'mo ta', 'ngoai hinh', 'identity', 'wardrobe', 'negative rules', 'poses', 'reference assets'].includes(fold(h.text)));
    if (characterHeads.length) for (const child of characterHeads) characters.push(makeCharacter(child.text, source.slice(child.bodyStart, child.end), usedIds));
    else {
      const body = bodyOf(section);
      const fieldName = /(?:^|\n)\s*(?:[-+*]\s+)?(?:\*\*)?(?:name|ten|ten nhan vat|tên|tên nhân vật)(?:\*\*)?\s*[:：]\s*(.+)/iu.exec(body)?.[1];
      const firstLine = body.split(/\r\n|\r|\n/).find(line => line.trim() && !/^\s*(?:[-+*]|#{1,6})\s/.test(line) && !line.includes(':'));
      const hostName = fold(section.text).includes('host') ? referencedHost(body) : undefined;
      const name = [section.value, fieldName, hostName, firstLine].find(looksLikeName);
      if (name) characters.push(makeCharacter(name, body, usedIds));
    }
  }
  if (Array.isArray(metadata.characters)) {
    for (const value of metadata.characters) {
      if (!value || typeof value !== 'object') continue;
      const c = value as Record<string, unknown>;
      if (typeof c.name !== 'string') continue;
      const parsed = makeCharacter(c.name, typeof c.description === 'string' ? c.description : '', usedIds);
      if (typeof c.id === 'string') { usedIds.delete(parsed.id); parsed.id = makeCharacter(c.name, 'id: ' + c.id, usedIds).id; }
      for (const key of ['immutableTraits', 'mutableTraits'] as const) if (Array.isArray(c[key])) parsed[key] = c[key].filter((t): t is string => typeof t === 'string');
      characters.push(parsed);
    }
  }
  // Remove only known metadata intervals. Unknown chapter headings and prose stay verbatim.
  const excluded = sections.filter(h => h.role !== 'story').map(h => ({ start: h.start, end: h.end }));
  if (naturalTitle) excluded.push({ start: naturalTitle.start, end: naturalTitle.bodyStart });
  for (const h of sections.filter(h => h.role === 'story')) excluded.push({ start: h.start, end: h.bodyStart });
  const ranges = excluded.sort((a, b) => a.start - b.start);
  const narrative: string[] = []; let cursor = from;
  for (const range of ranges) {
    if (range.start > cursor) narrative.push(source.slice(cursor, range.start));
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < source.length) narrative.push(source.slice(cursor));
  const storyText = narrative.join('').trim() || metaString('story') || source.slice(from).trim();
  const metadataRules = Array.isArray(metadata.rules) ? metadata.rules.filter((r): r is string => typeof r === 'string') : [];
  const styleMeta = metadata.style && typeof metadata.style === 'object' ? metadata.style as Record<string, unknown> : {};
  const authoredStyle = {
    visual: values('visual').join('\n\n') || (typeof styleMeta.visual === 'string' ? styleMeta.visual : ''),
    era: values('era').join('\n\n') || (typeof styleMeta.era === 'string' ? styleMeta.era : ''),
  };
  const story = StorySchema.parse({
    title, story: storyText, genre: values('genre')[0] || metaString('genre') || 'documentary',
    language: values('language')[0] || metaString('language') || config?.project.language || 'vi',
    purpose: values('purpose').join('\n\n') || metaString('purpose'),
    style: { visual: authoredStyle.visual || config?.style.preset || 'documentary', era: authoredStyle.era },
    rules: [...metadataRules, ...values('rules').flatMap(items)], characters,
    facts: values('facts').flatMap(items).map(claim => ({ claim, type: 'fact', source: config?.input.source || 'source.md' })),
    chronology: values('chronology').flatMap(items), causalChain: values('causalChain').flatMap(items),
  });
  return { story, authoredStyle, sourceMarkdown: source, sections: headings.map(h => ({ heading: h.text, start: h.start, end: h.end, role: h.role || 'narrative' })) };
}
export function parseMarkdown(source: string, config?: FactoryConfig): Story { return parseMarkdownDocument(source, config).story; }
