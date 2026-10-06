import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {findRepoRoot} from '../packages/core/config.js';
import {hash,writeJson,exists} from '../packages/core/utils.js';
import {PREHISTORIC_TOPIC_VERSION,prehistoricReadiness,prehistoricReferences} from '../packages/topics/prehistoric-life.js';

// Inventory existing artwork. Never regenerate or approve the rejected vector pack.
const repo=await findRepoRoot(),dir=path.join(repo,'library/topics/prehistoric-life');
await fs.mkdir(dir,{recursive:true});
async function describe(relative:string) {
  const bytes=await fs.readFile(path.join(repo,relative)),metadata=await sharp(bytes).metadata();
  return {file:relative,sha256:hash(bytes),width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha};
}
const references=await Promise.all(prehistoricReferences.map(async reference=>({...reference,...await describe(`docs/topics/assets/${reference.file}`)})));
const candidates=await Promise.all(['lila','karo'].flatMap(id=>[
  {file:`${id}-cutout-v1.png`,kind:'full-body-cutout',status:'candidate',approved:false,source:`reference-${id}-full.png`},
  {file:`${id}-parts-candidate-v1.png`,kind:'puppet-parts-atlas',status:id==='karo'?'needs-repair-static-vision-review':'candidate-needs-layout-and-fidelity-review',approved:false,source:`reference-${id}-full.png`},
]).map(async asset=>({...asset,...await describe(`library/topics/prehistoric-life/${asset.file}`)})));
const rejected=[];
for(const file of ['colors-day.png','colors-sunset.png','colors-night.png','lila-views.png','karo-views.png','lila-expressions.png','karo-expressions.png']) {
  if(await exists(path.join(dir,file)))rejected.push({...await describe(`library/topics/prehistoric-life/${file}`),status:'rejected-vector-v0.3',productionAllowed:false});
}
await writeJson(path.join(dir,'manifest.json'),{version:PREHISTORIC_TOPIC_VERSION,...prehistoricReadiness,
  primaryModel:'warm-skin-close-ups',referencePolicy:'Supplemental detailed and white-face sheets do not replace or blend into the primary model.',
  references,candidates,rejectedArtifacts:rejected,productionRig:null,
  restCalibration:{status:'candidate',method:'SVG masks on full cutouts',reconstructedOccludedParts:false,naturalMotion:false,codeHash:hash(await fs.readFile(path.join(repo,'packages/topics/reference-puppet.ts')))},
  staticReview:{file:'docs/topics/reviews/karo-atlas-static-review-v1.json',pass:false,scope:'static-artwork-only',appliesTo:'atlas assembly v1, not revised cutout-mask assembly'},
  limitations:['AI cutouts and part atlases can redraw source details; none is a pixel-exact extraction guarantee.',
    'The atlas generator did not establish exact cell geometry. Define measured crops and pivots before use.',
    'A whole head with baked facial features cannot provide production expressions or proper multi-view turning.',
    'Full-body color frames, layered rig, natural motion and the three complete video flows remain unaccepted.']});
console.log(JSON.stringify({references:references.length,candidates:candidates.length,rejected:rejected.length,productionReady:false}));
