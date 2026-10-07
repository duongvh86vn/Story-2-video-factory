import {promises as fs} from 'node:fs';
import {hash,safeRealPath,writeAtomic} from '../core/utils.js';
import {outputPath} from '../render/process.js';
import type {Storyboard,Shot} from '../core/schemas.js';
import {loadActorMotion} from './import.js';
import {SPRITE_CATALOG_VERSION,SpriteMotionCatalogSchema,type SpriteMotionCatalog,type MotionCapability} from './catalog-schemas.js';
import type {ActorMotion} from './schemas.js';
import {spriteMotionKey} from './stage.js';

export const SPRITE_CATALOG_INPUT='input/motion-catalog.json';
const LIMIT=2*1024*1024;
export function describeCatalogMotion(motion:ActorMotion,annotation:SpriteMotionCatalog['entries'][number]){
  const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
  let common=Object.keys(motion.frames[0]!.landmarks);
  for(const frame of motion.frames){
    bounds.left=Math.min(bounds.left,-frame.anchor.x);bounds.right=Math.max(bounds.right,frame.rect.w-frame.anchor.x);
    bounds.top=Math.min(bounds.top,-frame.anchor.y);bounds.bottom=Math.max(bounds.bottom,frame.rect.h-frame.anchor.y);
    common=common.filter(name=>frame.landmarks[name]!==undefined);
  }
  return {...annotation,actorId:motion.actorId,state:motion.state,view:motion.view,referenceHash:motion.source.referenceHash,
    nativeDurationMs:motion.frames.reduce((sum,frame)=>sum+frame.durationMs,0),frameCount:motion.frames.length,playback:motion.playback,
    frameBounds:bounds,commonLandmarks:common.sort(),productionReady:false as const,status:'candidate' as const};
}
export interface SpriteMotionCatalogSnapshot {
  document:SpriteMotionCatalog;revision:string|null;snapshotHash:string;
  entries:Array<ReturnType<typeof describeCatalogMotion>>;
}
async function catalogBytes(root:string):Promise<Buffer|null>{
  let file:string;
  try{file=await safeRealPath(root,SPRITE_CATALOG_INPUT);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
  const handle=await fs.open(file,'r');
  try{
    const stat=await handle.stat();if(!stat.isFile()||stat.size>LIMIT)throw new Error('Motion catalog exceeds 2 MiB');
    const bytes=Buffer.alloc(LIMIT+1);let size=0;
    while(size<bytes.length){const result=await handle.read(bytes,size,bytes.length-size,null);if(!result.bytesRead)break;size+=result.bytesRead;}
    if(size>LIMIT)throw new Error('Motion catalog exceeds 2 MiB');return bytes.subarray(0,size);
  }finally{await handle.close();}
}
async function snapshot(root:string,document:SpriteMotionCatalog,revision:string|null):Promise<SpriteMotionCatalogSnapshot>{
  const entries=[];
  for(const annotation of document.entries)entries.push(describeCatalogMotion(await loadActorMotion(root,annotation.motionId,annotation.fingerprint),annotation));
  return {document,revision,entries,snapshotHash:hash({producer:SPRITE_CATALOG_VERSION,document,entries})};
}
export async function readSpriteMotionCatalogDocument(root:string){
  const bytes=await catalogBytes(root);
  const document=SpriteMotionCatalogSchema.parse(bytes?JSON.parse(bytes.toString('utf8')):{version:SPRITE_CATALOG_VERSION,entries:[]});
  return {document,revision:bytes?hash(bytes):null};
}
export async function loadSpriteMotionCatalog(root:string):Promise<SpriteMotionCatalogSnapshot>{
  const {document,revision}=await readSpriteMotionCatalogDocument(root);
  return snapshot(root,document,revision);
}
/** Scene callers already verified exactly the referenced immutable assets. Avoid
 * decoding every unused catalog PNG again for every scene validation. */
export async function validateLoadedSpriteCatalog(root:string,shot:Shot,motions:ReadonlyMap<string,ActorMotion>):Promise<string|null>{
  const {document,revision}=await readSpriteMotionCatalogDocument(root);
  if(revision===null)return null;
  const entries=document.entries.flatMap(annotation=>{
    const motion=motions.get(spriteMotionKey(annotation.motionId,annotation.fingerprint));
    return motion?[describeCatalogMotion(motion,annotation)]:[];
  });
  const snapshotHash=hash(document);
  validateSpriteCatalogSelection({shots:[shot]},{document,revision,entries,snapshotHash});
  return snapshotHash;
}
/** Caller serializes project mutations; revision protects edits made outside Studio. */
export async function saveSpriteMotionCatalog(root:string,value:SpriteMotionCatalog,revision:string|null):Promise<SpriteMotionCatalogSnapshot>{
  const document=SpriteMotionCatalogSchema.parse(value),bytes=Buffer.from(JSON.stringify(document,null,2)+'\n');
  if(bytes.length>LIMIT)throw new Error('Motion catalog exceeds 2 MiB');
  const current=await catalogBytes(root);
  if((current?hash(current):null)!==revision)throw new Error('REVISION_CONFLICT: motion catalog changed; reload before saving');
  const verified=await snapshot(root,document,hash(bytes));
  const latest=await catalogBytes(root);
  if((latest?hash(latest):null)!==revision)throw new Error('REVISION_CONFLICT: motion catalog changed while verifying assets');
  await writeAtomic(await outputPath(root,SPRITE_CATALOG_INPUT),bytes);
  return verified;
}
const matches=(a:MotionCapability,b:MotionCapability)=>a.kind===b.kind&&a.movement===b.movement&&a.operation===b.operation;
/** Candidate selection is source binding, never art/motion approval. */
export function validateSpriteCatalogSelection(board:Storyboard,catalog:SpriteMotionCatalogSnapshot,renderer?:'rig'|'sprite'):void{
  if(renderer==='sprite'&&!catalog.entries.length)throw new Error('needs-motion-library: register imported actor motions before selecting image motion');
  const entries=new Map(catalog.entries.map(entry=>[spriteMotionKey(entry.motionId,entry.fingerprint),entry]));
  for(const shot of board.shots){
    const c=shot.cinematic,plan=c?.spriteStage,cast=c?.actorScene;
    const hasActors=Boolean(cast?.primary||cast?.supporting.length);
    if(renderer==='rig'&&plan)throw new Error(`${shot.id}: rig selection cannot use a sprite stage`);
    if(renderer==='sprite'&&hasActors&&!plan)throw new Error(`${shot.id}: needs-motion-library: image motion requires a sprite plan; no rig fallback`);
    if(!plan||renderer===undefined&&catalog.revision===null)continue;
    for(const actor of plan.actors)for(const clip of actor.clips){
      const entry=entries.get(spriteMotionKey(clip.motionId,clip.fingerprint)),action=clip.sourcedAction;
      if(!entry||entry.actorId!==actor.actorId)throw new Error(`${shot.id}: sprite clip is outside its actor's registered motion catalog`);
      if(!action||action.motionState!==entry.state||!entry.capabilities.some(capability=>matches(capability,action)))
        throw new Error(`${shot.id}: sprite clip lacks the registered source action capability`);
    }
  }
}
