import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { FactoryConfig } from '../core/config.js';
import { exists, readJson, safeRealPath, hash, writeAtomic, writeJson } from '../core/utils.js';
import { outputPath } from '../render/process.js';
import type { ModelRouter } from '../models/registry.js';
import { HostProfileSchema, HostRigSchema, type HostProfile, type HostRig } from './schemas.js';
import { parseHostProfile, hostProfileFingerprint } from './profile.js';
import { buildRig, hostSvg, hostPreviewSvg } from './rig.js';
export * from './schemas.js';
export { hostProfilePath, hostProfileFingerprint } from './profile.js';
export { hostSvg } from './rig.js';

export async function compileHost(root: string, config: FactoryConfig, router: ModelRouter): Promise<{ profile: HostProfile; rig: HostRig }> {
  const inputHash=hash({profile:await hostProfileFingerprint(root,config),id:config.host.profile_id}),cache=path.join(root,'work/host-compile-cache.json');
  if(await exists(cache)&&await exists(path.join(root,'previews/host-preview-sheet.png'))){const previous=await readJson<{inputHash:string}>(cache);if(previous.inputHash===inputHash){try{return await loadHost(root);}catch{/* regenerate invalid derived assets */}}}
  const profile = await parseHostProfile(root, config, router), rig = buildRig(profile);
  await writeJson(await outputPath(root, 'work/host-profile.json'), profile);
  await writeJson(await outputPath(root, 'work/host-rig.json'), rig);
  await writeAtomic(await outputPath(root, rig.assetPath), hostSvg(profile));
  await writeJson(await outputPath(root, rig.posePath), { profileId: profile.id, profileVersion: profile.version, rigHash: rig.rigHash, poses: rig.poses });
  const sheet = await outputPath(root, 'previews/host-preview-sheet.png');
  await fs.mkdir(path.dirname(sheet), { recursive: true });
  await sharp(Buffer.from(hostPreviewSvg(profile))).png().toFile(sheet);
  await writeJson(cache,{inputHash});
  return { profile, rig };
}
export async function loadHost(root: string): Promise<{ profile: HostProfile; rig: HostRig }> {
  if (!await exists(path.join(root, 'work/host-profile.json'))) throw new Error('Compile and approve the host before building scenes');
  const profile = await readJson(path.join(root, 'work/host-profile.json'), HostProfileSchema);
  const rig = await readJson(path.join(root, 'work/host-rig.json'), HostRigSchema);
  if (profile.profileHash !== rig.profileHash || buildRig(profile).rigHash !== rig.rigHash) throw new Error('Host rig/profile integrity mismatch');
  const actualSvg = await fs.readFile(await safeRealPath(root, rig.assetPath), 'utf8');
  const actualPoses = await readJson(await safeRealPath(root, rig.posePath));
  if (actualSvg !== hostSvg(profile) || hash(actualPoses) !== hash({ profileId: profile.id, profileVersion: profile.version, rigHash: rig.rigHash, poses: rig.poses })) throw new Error('Approved host SVG/poses changed; rebuild and approve the profile');
  return { profile, rig };
}
