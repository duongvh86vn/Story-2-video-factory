import { promises as fs } from 'node:fs';
import path from 'node:path';
import { hash, safePath, safeRealPath, writeAtomic, writeJson } from '../core/utils.js';
import type { AssetRequest } from './providers.js';

export class AssetResolutionError extends Error {
  constructor(public readonly code: string, public readonly assetId?: string) {
    super(`Asset resolution failed (${code})${assetId ? `: ${assetId}` : ''}`);
    this.name = 'AssetResolutionError';
  }
}

export const mediaExtensions = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.mp4', '.mov', '.webm', '.wav', '.mp3', '.flac', '.ogg', '.m4a', '.pdf', '.txt', '.md']);

export function maxAssetBytes(type: AssetRequest['type']): number {
  return (type === 'video' ? 128 : type === 'music' || type === 'sfx' ? 32 : 16) * 1024 * 1024;
}

export function extensionFits(type: AssetRequest['type'], extension: string): boolean {
  if (type === 'video') return ['.mp4', '.mov', '.webm'].includes(extension);
  if (type === 'music' || type === 'sfx') return ['.wav', '.mp3', '.flac', '.ogg', '.m4a'].includes(extension);
  if (type === 'document' && ['.pdf', '.txt', '.md'].includes(extension)) return true;
  return ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'].includes(extension);
}

function xmlValue(value: string): string {
  return value.replace(/&([^;]+);/g, (_, entity: string) => {
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (named[entity]) return named[entity]!;
    const number = /^#x[\da-f]+$/i.test(entity) ? parseInt(entity.slice(2), 16) : /^#\d+$/.test(entity) ? Number(entity.slice(1)) : -1;
    if (number < 0 || number > 0x10ffff || number === 0) throw new AssetResolutionError('unsafe-svg-entity');
    return String.fromCodePoint(number);
  });
}

// A deliberately small static SVG vocabulary: no scripts, CSS, foreignObject,
// animation, image embedding, external entities, or external references.
const svgTags = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'title', 'desc', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'pattern', 'use']);
const svgAttributes = new Set(['id', 'xmlns', 'xmlns:xlink', 'version', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'dx', 'dy', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'transform', 'fill', 'fill-rule', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'letter-spacing', 'word-spacing', 'textLength', 'lengthAdjust', 'preserveAspectRatio', 'gradientUnits', 'gradientTransform', 'spreadMethod', 'offset', 'stop-color', 'stop-opacity', 'clip-path', 'clip-rule', 'clipPathUnits', 'mask', 'maskUnits', 'maskContentUnits', 'patternUnits', 'patternContentUnits', 'patternTransform', 'href', 'xlink:href', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby', 'focusable', 'display', 'visibility', 'vector-effect']);

function inspectSvg(bytes: Buffer): void {
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''); }
  catch { throw new AssetResolutionError('invalid-svg-encoding'); }
  text = text.replace(/^\s*<\?xml\s+version=["']1\.[01]["'](?:\s+encoding=["']UTF-8["'])?(?:\s+standalone=["'](?:yes|no)["'])?\s*\?>/i, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  if (/<[!?]|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new AssetResolutionError('active-svg');
  const stack: string[] = [];
  let offset = 0;
  let roots = 0;
  const tags = /<([^<>]*)>/g;
  for (const match of text.matchAll(tags)) {
    const preceding = text.slice(offset, match.index);
    if (preceding.includes('<') || (stack.length === 0 && preceding.trim())) throw new AssetResolutionError('malformed-svg');
    xmlValue(preceding);
    offset = match.index! + match[0].length;
    const token = match[1]!;
    if (token.startsWith('/')) {
      const name = token.slice(1).trim();
      if (stack.pop() !== name) throw new AssetResolutionError('malformed-svg');
      continue;
    }
    const element = /^([A-Za-z][\w-]*)([\s\S]*)$/.exec(token);
    if (!element || !svgTags.has(element[1]!)) throw new AssetResolutionError('active-svg-element');
    const name = element[1]!;
    if (stack.length === 0 && (name !== 'svg' || ++roots > 1)) throw new AssetResolutionError('malformed-svg');
    let attributes = element[2]!;
    const selfClosing = /\/\s*$/.test(attributes);
    if (selfClosing) attributes = attributes.replace(/\/\s*$/, '');
    const seen = new Set<string>();
    while (attributes.trim()) {
      const attribute = /^\s+([A-Za-z][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/.exec(attributes);
      if (!attribute) throw new AssetResolutionError('malformed-svg-attribute');
      const key = attribute[1]!;
      const value = xmlValue(attribute[2]!.slice(1, -1));
      if (!svgAttributes.has(key) || seen.has(key) || /[<\\\u0000-\u001f]/.test(value)) throw new AssetResolutionError('active-svg-attribute');
      seen.add(key);
      if (key === 'xmlns' && value !== 'http://www.w3.org/2000/svg') throw new AssetResolutionError('unsafe-svg-namespace');
      if (key === 'xmlns:xlink' && value !== 'http://www.w3.org/1999/xlink') throw new AssetResolutionError('unsafe-svg-namespace');
      if ((key === 'href' || key === 'xlink:href') && !/^#[A-Za-z_][\w:.-]*$/.test(value)) throw new AssetResolutionError('external-svg-reference');
      if (/url\s*\(/i.test(value) && !/^url\(\s*['"]?#[A-Za-z_][\w:.-]*['"]?\s*\)$/i.test(value)) throw new AssetResolutionError('external-svg-reference');
      if (/(?:https?:|file:|data:|javascript:|vbscript:|\/\/)/i.test(value) && key !== 'xmlns' && key !== 'xmlns:xlink') throw new AssetResolutionError('external-svg-reference');
      attributes = attributes.slice(attribute[0].length);
    }
    if (!selfClosing) stack.push(name);
  }
  if (roots !== 1 || stack.length || text.slice(offset).trim()) throw new AssetResolutionError('malformed-svg');
}

export function inspectMedia(bytes: Buffer, type: AssetRequest['type'], extension: string): void {
  if (!bytes.length || bytes.length > maxAssetBytes(type)) throw new AssetResolutionError('asset-size-limit');
  if (!extensionFits(type, extension)) throw new AssetResolutionError('asset-format-mismatch');
  const start = bytes.subarray(0, 16);
  const ascii = start.toString('latin1');
  const signatures: Record<string, boolean> = {
    '.png': start.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    '.jpg': start[0] === 255 && start[1] === 216 && start[2] === 255,
    '.jpeg': start[0] === 255 && start[1] === 216 && start[2] === 255,
    '.gif': /^GIF8[79]a/.test(ascii),
    '.webp': ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP',
    '.avif': ascii.slice(4, 8) === 'ftyp' && /avif|avis/.test(bytes.subarray(8, 64).toString('latin1')),
    '.mp4': ascii.slice(4, 8) === 'ftyp',
    '.mov': ['ftyp', 'moov', 'mdat', 'wide', 'free'].includes(ascii.slice(4, 8)),
    '.webm': start.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])),
    '.wav': ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE',
    '.mp3': ascii.startsWith('ID3') || (start[0] === 255 && ((start[1] ?? 0) & 224) === 224),
    '.flac': ascii.startsWith('fLaC'),
    '.ogg': ascii.startsWith('OggS'),
    '.m4a': ascii.slice(4, 8) === 'ftyp',
    '.pdf': ascii.startsWith('%PDF-'),
  };
  if (extension === '.svg') inspectSvg(bytes);
  else if (extension === '.txt' || extension === '.md') {
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { throw new AssetResolutionError('invalid-document-encoding'); }
  } else if (!signatures[extension]) throw new AssetResolutionError('asset-content-mismatch');
}

export async function readAsset(root: string, relative: string, type: AssetRequest['type']): Promise<{ path: string; bytes: Buffer; hash: string }> {
  const file = await safeRealPath(root, relative);
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > maxAssetBytes(type)) throw new AssetResolutionError('asset-size-limit');
  const bytes = await fs.readFile(file);
  inspectMedia(bytes, type, path.extname(file).toLowerCase());
  return { path: path.relative(root, file).split(path.sep).join('/'), bytes, hash: hash(bytes) };
}

/** Resolve each parent before writing, including when work/ or output/ exist. */
export async function managedFile(root: string, relative: string): Promise<string> {
  const target = safePath(root, relative);
  const parts = path.relative(root, path.dirname(target)).split(path.sep).filter(Boolean);
  let directory = root;
  for (const part of parts) {
    directory = path.join(directory, part);
    try { await fs.mkdir(directory); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    const stat = await fs.lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new AssetResolutionError('unsafe-output-directory');
    await safeRealPath(root, path.relative(root, directory));
  }
  for (const file of [target, `${target}.${process.pid}.tmp`]) {
    try {
      const stat = await fs.lstat(file);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new AssetResolutionError('unsafe-output-file');
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  return target;
}

export async function writeAsset(root: string, relative: string, bytes: Buffer, type: AssetRequest['type']): Promise<string> {
  inspectMedia(bytes, type, path.extname(relative).toLowerCase());
  await writeAtomic(await managedFile(root, relative), bytes);
  return relative.split(path.sep).join('/');
}

export async function writeAssetJson(root: string, relative: string, data: unknown): Promise<void> {
  await writeJson(await managedFile(root, relative), data);
}
