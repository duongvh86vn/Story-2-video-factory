import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { findRepoRoot,type FactoryConfig } from '../core/config.js';
import {configuredTopicRelease} from '../topics/prehistoric-life.js';
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
export async function prepareCinematicEnvironments(root:string,board:Storyboard,lockedIds:ReadonlySet<string>=new Set(),config?:FactoryConfig):Promise<void> {
  if(config?.topic.id){await prepareCertifiedTopicEnvironments(root,board,lockedIds,config);return;}
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

/** The selected ledger owns exact plate IDs/lighting/bytes. Never substitute a
 * legacy catalogue plate or invent an untested lighting variant. */
async function prepareCertifiedTopicEnvironments(root:string,board:Storyboard,lockedIds:ReadonlySet<string>,config:FactoryConfig){
  const verified=configuredTopicRelease(config);if(!verified)throw new Error('needs-art-direction: current visual QA ledger required for topic scenery');
  const repo=await findRepoRoot(),used=new Map<string,unknown>();
  for(const shot of board.shots){
    const c=shot.cinematic;if(!c)continue;
    const spec=verified.release.environments.find(e=>e.id===c.environmentAssetId);
    if(c.artDirection?.useEnvironment===false||!spec||spec.setting!==c.setting||spec.lighting!==c.environmentLighting)throw new Error(`${shot.id}: needs-art-direction: explicitly select a tested environmentAssetId with its own setting and environmentLighting`);
    const receipt=verified.release.assets.find(a=>a.path.replaceAll('\\','/')===spec.assetPath.replaceAll('\\','/'))!;
    const source=await safeRealPath(repo,spec.assetPath),bytes=await fs.readFile(source);
    if(bytes.length!==receipt.bytes||hash(bytes)!==receipt.sha256)throw new Error(`${shot.id}: needs-art-direction: tested environment bytes changed`);
    const relative=`assets/environments/${receipt.sha256}${path.extname(spec.assetPath).toLowerCase()}`,destination=await outputPath(root,relative);
    const request={id:spec.id,type:'image' as const,description:`Tested ${spec.setting}/${spec.lighting} illustration; not historical evidence`,localPath:relative,required:true,license:'project-generated-illustration'};
    if(lockedIds.has(shot.id)&&hash(shot.assetNeeds.find(a=>a.id===spec.id))!==hash(request))throw new Error(`${shot.id}: locked environment plan needs migration; unlock the shot first`);
    const previous=shot.assetNeeds.find(a=>a.id===spec.id);if(previous&&hash(previous)!==hash(request))throw new Error(`${shot.id}: tested environment request changed`);
    if(await exists(destination)){if(hash(await fs.readFile(destination))!==receipt.sha256)throw new Error(`${shot.id}: tested project environment changed`);}else await writeAtomic(destination,bytes);
    if(!previous)shot.assetNeeds.push(request);
    used.set(spec.id,{...spec,path:relative,sha256:receipt.sha256});
  }
  const current=configuredTopicRelease(config);if(!current||current.fingerprint!==verified.fingerprint)throw new Error('needs-art-direction: visual QA ledger changed during environment staging');
  await writeJson(path.join(root,'work/environment-provenance.json'),{version:22,producer:STAGE_VERSION,storyboardHash:hash(StoryboardSchema.parse(board)),visualReleaseFingerprint:verified.fingerprint,environments:[...used.values()]});
}
