import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { findRepoRoot } from '../core/config.js';
import { StoryboardSchema, type Storyboard } from '../core/schemas.js';
import { exists, hash, safeRealPath, writeAtomic, writeJson } from '../core/utils.js';
import { outputPath } from '../render/process.js';

const CatalogSchema=z.object({version:z.literal(1),environments:z.array(z.object({id:z.string(),setting:z.enum(['workshop','road','forest','camp','cave','river']),
  file:z.string().regex(/^[a-z0-9-]+\.png$/),hash:z.string().regex(/^[a-f0-9]{64}$/),
  provenance:z.literal('generated-illustration'),status:z.literal('curated-illustration'),historicalEvidence:z.literal(false)}).strict())}).strict();
export const STAGE_VERSION='environment-stage-2.2.0';

export async function environmentLibraryFingerprint():Promise<string> {
  const repo=await findRepoRoot(),file=await safeRealPath(repo,'library/environments/catalog.json'),bytes=await fs.readFile(file);
  const catalog=CatalogSchema.parse(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,'')));
  const images=await Promise.all(catalog.environments.map(async spec=>{
    const digest=hash(await fs.readFile(await safeRealPath(repo,`library/environments/${spec.file}`)));
    if(digest!==spec.hash)throw new Error(`Built-in environment integrity mismatch: ${spec.id}`);
    return [spec.id,digest];
  }));
  return hash({producer:STAGE_VERSION,catalog:hash(bytes),images});
}

/** Curated background plates are illustrations; every story object still comes from source refs. */
export async function prepareCinematicEnvironments(root:string,board:Storyboard,lockedIds:ReadonlySet<string>=new Set()):Promise<void> {
  const repo=await findRepoRoot(),catalogFile=await safeRealPath(repo,'library/environments/catalog.json');
  const catalog=CatalogSchema.parse(JSON.parse((await fs.readFile(catalogFile,'utf8')).replace(/^\uFEFF/,''))),used=new Map<string,unknown>();
  for(const shot of board.shots){
    const c=shot.cinematic;if(!c)continue;
    if(c.artDirection?.useEnvironment===false){
      if(lockedIds.has(shot.id)&&c.environmentAssetId)throw new Error(`${shot.id}: locked environment needs migration before authored scenery`);
      if(c.environmentAssetId){shot.assetNeeds=shot.assetNeeds.filter(a=>a.id!==c.environmentAssetId);delete c.environmentAssetId;}
      continue;
    }
    if(c.setting==='neutral')continue;
    const spec=catalog.environments.find(e=>e.setting===c.setting);
    if(!spec)throw new Error(`${shot.id}: needs-asset: no curated ${c.setting} environment`);
    const source=await safeRealPath(repo,`library/environments/${spec.file}`),bytes=await fs.readFile(source);
    if(hash(bytes)!==spec.hash)throw new Error(`${shot.id}: built-in environment integrity mismatch`);
    const relative=`assets/environments/${spec.file}`,destination=await outputPath(root,relative);
    if(await exists(destination)){
      if(hash(await fs.readFile(destination))!==spec.hash)throw new Error(`${shot.id}: curated project environment changed; select a different asset instead of replacing its identity`);
    }else await writeAtomic(destination,bytes);
    const request={id:spec.id,type:'image' as const,description:`Curated ${spec.setting} background illustration; not historical evidence`,localPath:relative,required:true,license:'project-generated-illustration'};
    if(lockedIds.has(shot.id)&&(c.environmentAssetId!==spec.id||hash(shot.assetNeeds.find(a=>a.id===spec.id))!==hash(request)))throw new Error(`${shot.id}: locked environment plan needs migration; unlock the shot first`);
    c.environmentAssetId=spec.id;
    const previous=shot.assetNeeds.find(a=>a.id===spec.id);
    if(previous&&hash(previous)!==hash(request))throw new Error(`${shot.id}: curated environment request changed`);
    if(!previous)shot.assetNeeds.push(request);
    used.set(spec.id,{...spec,path:relative});
  }
  await writeJson(path.join(root,'work/environment-provenance.json'),{version:22,producer:STAGE_VERSION,storyboardHash:hash(StoryboardSchema.parse(board)),catalogHash:hash(await fs.readFile(catalogFile)),environments:[...used.values()]});
}
