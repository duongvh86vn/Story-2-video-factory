import path from 'node:path';
import type { Asset } from '../core/schemas.js';

/** Original hashes name deterministic local render derivatives. */
export function visualAssetPath(asset: Pick<Asset,'type'|'hash'|'path'>): string | undefined {
  if(['music','sfx'].includes(asset.type))return undefined;
  const extension=path.extname(asset.path).toLowerCase();
  if(asset.type==='document' && ['.pdf','.txt','.md','.json'].includes(extension))return undefined;
  const rendered=asset.type==='video'?'.mp4':['.png','.jpg','.jpeg','.webp','.gif','.avif'].includes(extension)?'.png':extension;
  if(!['.svg','.png','.jpg','.jpeg','.webp','.gif','.mp4','.webm'].includes(rendered))throw new Error(`Unsupported visual asset format: ${asset.type} ${extension}`);
  return `assets/${asset.hash}${rendered}`;
}
