import path from 'node:path';
import { writeJson } from '../core/utils.js';
import type { FactoryConfig } from '../core/config.js';

// Explicit user-configured sources are archived independently of the director.
// No factual additions are silently inferred from research pages.
export async function collectResearch(projectRoot:string,config:FactoryConfig):Promise<void> {
  if (!config.research.enabled) return;
  const sources:unknown[]=[];
  for (const source of config.research.sources) {
    const url=new URL(source); if (url.protocol!=='https:') throw new Error('Research sources must use HTTPS');
    const response=await fetch(url,{signal:AbortSignal.timeout(30000),redirect:'error'});
    if (!response.ok) throw new Error(`Research source returned ${response.status}: ${url}`);
    const length=Number(response.headers.get('content-length') ?? 0); if (length>2000000) throw new Error('Research page exceeds 2 MB');
    const text=await response.text(); if (Buffer.byteLength(text)>2000000) throw new Error('Research page exceeds 2 MB');
    sources.push({sourceUrl:source,retrievedAt:new Date().toISOString(),content:text,usage:'reference-only; approve factual additions in source.md'});
  }
  await writeJson(path.join(projectRoot,'work','research.json'),{sources});
}
