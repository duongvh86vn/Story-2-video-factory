import type { CharacterBible } from '../core/schemas.js';
import { escapeHtml, hash } from '../core/utils.js';
import type { AssetRequest } from './providers.js';

export type Character = CharacterBible['characters'][number];
export const CHARACTER_SVG_VERSION = 1;

export function characterFingerprint(character: Character, versionId?: string, seriesId?: string): string {
  const version = versionId ? character.versions.find(item => item.id === versionId) : undefined;
  return hash({ generator: CHARACTER_SVG_VERSION, seriesId: seriesId ?? '', id: character.id, name: character.name,
    identity: character.identity, wardrobe: character.wardrobe, immutable: character.immutable,
    negativeRules: character.negativeRules, versionId: versionId ?? '', versionDescription: version?.description ?? '' });
}

/** Geometry comes from immutable identity. Poses move limbs, never regenerate a face. */
export function characterSvg(character: Character, request: AssetRequest, seriesId?: string): Buffer {
  const base = characterFingerprint(character, undefined, seriesId);
  const version = characterFingerprint(character, request.versionId, seriesId);
  const seed = parseInt(base.slice(0, 8), 16);
  const identity = character.identity;
  const face = /(?:narrow|long|slender)/i.test(identity.face) ? 39 : /(?:round|wide|broad)/i.test(identity.face) ? 53 : 44 + seed % 6;
  const shoulder = /(?:slender|thin|slim)/i.test(identity.body) ? 53 : /(?:broad|large|muscular)/i.test(identity.body) ? 76 : 62;
  const tall = /tall/i.test(identity.body) ? 15 : /short/i.test(identity.body) ? -12 : 0;
  const old = /(?:old|elder|senior|[6789]0)/i.test(identity.apparentAge);
  const hair = /(?:gray|grey|white)/i.test(identity.hair) || old ? '#b8b6af' : /(?:blond|gold)/i.test(identity.hair) ? '#b99354' : /(?:red|auburn)/i.test(identity.hair) ? '#783b2d' : '#252429';
  const skin = /(?:dark|brown)/i.test(identity.face) ? '#986c52' : /(?:pale|fair)/i.test(identity.face) ? '#e6c6a9' : '#cfa987';
  const wardrobe = `${character.wardrobe.default} ${request.versionId ? character.versions.find(item => item.id === request.versionId)?.description ?? '' : ''}`;
  const coat = /blue/i.test(wardrobe) ? '#304969' : /white/i.test(wardrobe) ? '#d7d6ca' : /brown/i.test(wardrobe) ? '#584238' : '#303640';
  const pose = (request.pose ?? 'standing').toLowerCase();
  const sitting = /(?:sit|working|writing)/.test(pose);
  const thinking = /think/.test(pose);
  const pointing = /(?:point|present|explain)/.test(pose);
  const profile = /profile/.test(pose);
  const angled = /(?:3q|three|quarter)/.test(pose);
  const headX = profile ? 267 : angled ? 260 : 256;
  const bodyY = 260 + tall;
  const hipY = sitting ? 398 : 436 + tall;
  const versionAccent = `#${version.slice(0, 6)}`;
  const metadata = [character.name, request.versionId ?? 'default', request.pose ?? 'standing',
    ...Object.values(identity), character.wardrobe.default,
    ...character.immutable, ...character.negativeRules,
    request.versionId ? character.versions.find(item => item.id === request.versionId)?.description ?? '' : ''].join('; ');
  const noBeard = character.negativeRules.some(rule => /no beard/i.test(rule));
  const beard = !noBeard && /beard/i.test(identity.facialHair) && !/no|none|clean/i.test(identity.facialHair);
  const moustache = /(?:mustache|moustache)/i.test(identity.facialHair) && !/no|none/i.test(identity.facialHair);
  const bald = /(?:bald|no hair)/i.test(identity.hair);
  const armLeft = sitting ? `M${256 - shoulder} ${bodyY + 12} Q150 326 201 363` : `M${256 - shoulder} ${bodyY + 12} L176 397`;
  const armRight = thinking ? `M${256 + shoulder} ${bodyY + 12} Q357 291 292 220` : pointing ? `M${256 + shoulder} ${bodyY + 12} L403 248` : sitting ? `M${256 + shoulder} ${bodyY + 12} Q365 326 309 363` : `M${256 + shoulder} ${bodyY + 12} L336 397`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="640" viewBox="0 0 512 640" role="img" aria-labelledby="title desc">
<title id="title">${escapeHtml(character.name)} — ${escapeHtml(request.pose ?? 'standing')}</title>
<desc id="desc">Deterministic character illustration. ${escapeHtml(metadata)}</desc>
<ellipse cx="256" cy="605" rx="124" ry="14" fill="#000000" opacity="0.12"/>
${sitting ? '<path d="M174 388H335V493H174Z" fill="#66584c"/><path d="M187 491V592M322 491V592" stroke="#51453b" stroke-width="16"/>' : ''}
<path d="M228 ${hipY} L${sitting ? '191 490 L199 586' : '220 585'} M284 ${hipY} L${sitting ? '323 490 L312 586' : '293 585'}" fill="none" stroke="${coat}" stroke-width="41" stroke-linecap="round"/>
<path d="M${256 - shoulder} ${bodyY} Q256 ${bodyY - 24} ${256 + shoulder} ${bodyY} L303 ${hipY} H209Z" fill="${coat}"/>
<path d="M239 ${bodyY - 5} L256 ${bodyY + 74} L273 ${bodyY - 5}" fill="#ded9c9"/>
<path d="M252 ${bodyY + 14} L260 ${bodyY + 14} L265 ${bodyY + 60} L256 ${bodyY + 72} L247 ${bodyY + 60}Z" fill="${versionAccent}"/>
<path d="${armLeft}" fill="none" stroke="${coat}" stroke-width="27" stroke-linecap="round"/>
<path d="${armRight}" fill="none" stroke="${coat}" stroke-width="27" stroke-linecap="round"/>
<circle cx="${sitting ? 201 : 176}" cy="${sitting ? 363 : 397}" r="13" fill="${skin}"/>
<circle cx="${thinking ? 292 : pointing ? 403 : sitting ? 309 : 336}" cy="${thinking ? 220 : pointing ? 248 : sitting ? 363 : 397}" r="13" fill="${skin}"/>
<rect x="241" y="219" width="30" height="${bodyY - 208}" rx="10" fill="${skin}"/>
<ellipse cx="${headX}" cy="173" rx="${face}" ry="65" fill="${skin}"/>
${bald ? '' : `<path d="M${headX - face} 172 Q${headX - face - 10} 101 ${headX} 104 Q${headX + face + 12} 103 ${headX + face} 168 L${headX + face - 12} 139 Q${headX} 130 ${headX - face + 8} 148Z" fill="${hair}"/>`}
${profile ? `<path d="M${headX + face - 6} 165 L${headX + face + 13} 183 L${headX + face - 7} 191" fill="${skin}"/><circle cx="${headX + 23}" cy="169" r="3" fill="#29292d"/>` : `<path d="M${headX - 23} 164H${headX - 10}M${headX + 10} 164H${headX + 23}" stroke="${hair}" stroke-width="3"/><circle cx="${headX - 16}" cy="174" r="3" fill="#29292d"/><circle cx="${headX + 16}" cy="174" r="3" fill="#29292d"/>`}
<path d="M${headX} 179 L${headX - 3} 193 L${headX + 4} 193" fill="none" stroke="#9e7863" stroke-width="2"/>
${moustache ? `<path d="M${headX - 18} 203 Q${headX} 193 ${headX + 18} 203" fill="none" stroke="${hair}" stroke-width="6"/>` : ''}
${beard ? `<path d="M${headX - 30} 205 Q${headX} 265 ${headX + 30} 205 Q${headX} 222 ${headX - 30} 205" fill="${hair}"/>` : ''}
<path d="M${headX - 12} 216Q${headX} 220 ${headX + 12} 216" fill="none" stroke="#835c52" stroke-width="2"/>
${old ? `<path d="M${headX - 26} 185L${headX - 18} 188M${headX + 18} 188L${headX + 26} 185" stroke="#9e7863" fill="none"/>` : ''}
<path d="M182 592H226M287 592H330" stroke="#22242a" stroke-width="19" stroke-linecap="round"/>
</svg>`, 'utf8');
}

/** A labeled schematic, explicitly an illustration rather than documentary evidence. */
export function diagramSvg(request: AssetRequest): Buffer {
  const words = request.description.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words.slice(0, 100)) {
    if (line && line.length + word.length > 52) { lines.push(line); line = ''; }
    line += `${line ? ' ' : ''}${word}`;
  }
  if (line) lines.push(line);
  const description = lines.slice(0, 7).map((value, index) => `<text x="480" y="${390 + index * 31}" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#e8edf5">${escapeHtml(value)}</text>`).join('\n');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640" role="img" aria-labelledby="title desc">
<title id="title">${escapeHtml(request.description)}</title><desc id="desc">Code-built conceptual schematic; not historical evidence.</desc>
<rect width="960" height="640" rx="24" fill="#172334"/>
<text x="480" y="74" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#9eb5d4">CONCEPTUAL SCHEMATIC</text>
<path d="M250 238H375M585 238H710" stroke="#92b4db" stroke-width="6"/>
<path d="M360 222L380 238L360 254M695 222L715 238L695 254" fill="none" stroke="#92b4db" stroke-width="6"/>
<rect x="125" y="167" width="125" height="142" rx="18" fill="#344f70"/><circle cx="480" cy="238" r="96" fill="#456e98"/><rect x="710" y="167" width="125" height="142" rx="18" fill="#344f70"/>
<circle cx="480" cy="238" r="48" fill="none" stroke="#d4e5fa" stroke-width="7"/>
${description}</svg>`, 'utf8');
}
