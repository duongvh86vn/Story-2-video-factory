import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {z} from 'zod';
import {StoryboardSchema,type Storyboard} from '../core/schemas.js';
import {exists,hash,readJson,safePath,safeRealPath,writeAtomic,writeJson} from '../core/utils.js';
import {HostProfileSchema,HostRigSchema} from '../host/schemas.js';
import {actorPoseSvg,buildRig,hostPreviewSvg} from '../host/rig.js';
import {actorProfile} from './model.js';
import {ActorDefinitionSchema} from './schemas.js';
import {actorDefinitions,actorLockKey} from './locks.js';

const AssetPath=z.string().regex(/^assets\/actors\/[a-zA-Z0-9][a-zA-Z0-9_.-]*\/[a-f0-9]{64}\/(?:actor\.svg|preview\.png|poses\.json|profile\.json)$/);
export const ActorCastManifestSchema=z.object({version:z.literal(1),storyboardHash:z.string(),provenance:z.string(),actors:z.array(z.object({
  character:ActorDefinitionSchema,profile:HostProfileSchema,rig:HostRigSchema,lockKey:z.string(),
  assetPath:AssetPath,previewPath:AssetPath,posePath:AssetPath,profilePath:AssetPath,
  assetHash:z.string(),previewHash:z.string(),poseHash:z.string(),profileFileHash:z.string(),
}))});
export async function writeActorAssets(root:string,board:Storyboard):Promise<void>{
  // The resolver hashes the schema-normalized storyboard it reads from disk.
  // Hash the same canonical contract here so omitted Zod defaults cannot make
  // a freshly written cast manifest look stale on the next resume.
  const canonical=StoryboardSchema.parse(board);
  const actors=[];
  for(const character of actorDefinitions(canonical)){
    const profile=actorProfile(character),directory=`assets/actors/${character.id}/${profile.profileHash}`;
    const assetPath=`${directory}/actor.svg`,previewPath=`${directory}/preview.png`,posePath=`${directory}/poses.json`,profilePath=`${directory}/profile.json`;
    await fs.mkdir(safePath(root,directory),{recursive:true});await safeRealPath(root,directory);
    const rig={...buildRig(profile),assetPath,posePath};
    await writeAtomic(safePath(root,assetPath),actorPoseSvg(profile));
    await writeAtomic(safePath(root,previewPath),await sharp(Buffer.from(hostPreviewSvg(profile))).png().toBuffer());
    await writeJson(safePath(root,posePath),rig.poses);await writeJson(safePath(root,profilePath),profile);
    const digest=async(relative:string)=>hash(await fs.readFile(await safeRealPath(root,relative)));
    actors.push({character,profile,rig,lockKey:actorLockKey(character.id),assetPath,previewPath,posePath,profilePath,assetHash:await digest(assetPath),previewHash:await digest(previewPath),poseHash:await digest(posePath),profileFileHash:await digest(profilePath)});
  }
  await writeJson(path.join(root,'work/actor-cast.json'),{version:1,storyboardHash:hash(canonical),actors,provenance:'stylized story illustration'});
}
export async function actorAssetHashes(root:string):Promise<Record<string,string>>{
  const file=path.join(root,'work/actor-cast.json');if(!await exists(file))return {};
  const cast=await readJson(file,ActorCastManifestSchema);
  return Object.fromEntries(cast.actors.flatMap(a=>[[a.assetPath,a.assetHash],[a.previewPath,a.previewHash],[a.posePath,a.poseHash],[a.profilePath,a.profileFileHash]]));
}
/** output/ is self-contained: cast references resolve unchanged after copying the directory. */
export async function exportActorAssets(root:string):Promise<void>{
  for(const [relative,expected] of Object.entries(await actorAssetHashes(root))){
    const content=await fs.readFile(await safeRealPath(root,relative));
    if(hash(content)!==expected)throw new Error(`Actor asset changed after approval: ${relative}`);
    const target=safePath(root,`output/${relative}`);
    await fs.mkdir(path.dirname(target),{recursive:true});await safeRealPath(root,path.relative(root,path.dirname(target)));
    await writeAtomic(target,content);
  }
}
