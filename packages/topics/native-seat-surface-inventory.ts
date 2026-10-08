import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {hash} from '../core/utils.js';
import {NativeSeatCorrespondenceSchema,nativeSeatRegistrationFingerprint} from '../animation/native-seat-registration.js';
import {nativeSeatDescription} from '../animation/body-view-seat.js';

/** Static bytes/metadata/registration only. No surface state, body/pose sampler,
 * compiler, renderer, server, tests or video invocation. Never rewrites PNGs. */
export async function nativeSeatSurfaceInventory(repo:string){
  const file='library/topics/prehistoric-life/native-seat-v1/correspondence-v1.json',bytes=await fs.readFile(path.join(repo,file)),geometry=NativeSeatCorrespondenceSchema.parse(JSON.parse(bytes.toString('utf8')));
  if(hash(geometry)!==nativeSeatRegistrationFingerprint)throw new Error('Native seated correspondence differs from active source registration');
  for(const actor of ['lila','karo'] as const){
    const c=geometry.actors[actor];if(hash(await fs.readFile(path.join(repo,c.primary.file)))!==c.primary.sha256)throw new Error('Native seated primary identity changed: '+actor);
    for(const image of [c.material,...Object.values(c.views).map(v=>v.standing)]){
      const pixels=await fs.readFile(path.join(repo,image.file));if(hash(pixels)!==image.sha256)throw new Error('Native seated source bytes differ: '+image.file);
      const info=await sharp(pixels).metadata();if(info.width!==image.width||info.height!==image.height||!info.hasAlpha)throw new Error('Native seated source dimensions/alpha differ: '+image.file);
    }
  }
  return {version:nativeSeatDescription.version,selection:nativeSeatDescription.selection,status:'candidate-source-registration',file,sha256:hash(bytes),fingerprint:nativeSeatDescription.fingerprint,registrationFingerprint:nativeSeatRegistrationFingerprint,
    bindings:nativeSeatDescription.bindings,approved:false,productionReady:false,motionVerified:false,productionAllowed:false,limitations:nativeSeatDescription.limitations};
}
