import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {findRepoRoot} from '../packages/core/config.js';
import {hash,writeJson,exists} from '../packages/core/utils.js';
import {PREHISTORIC_TOPIC_VERSION,prehistoricReadiness,prehistoricReferences} from '../packages/topics/prehistoric-life.js';
import {referenceHeadDescription} from '../packages/animation/forest-head-art.js';
import {referenceBodyDescription} from '../packages/animation/forest-body-art.js';

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
const headPack=referenceHeadDescription();
const headReviewFile='docs/topics/reviews/front-head-static-review-v2.json';
const headReview=await fs.readFile(path.join(repo,headReviewFile),'utf8').then(text=>JSON.parse(text) as {scope:string;appliesTo:string;headPackFingerprint:string;result:{pass:boolean}}).catch(()=>undefined);
const headReviewCurrent=headReview?.headPackFingerprint===headPack.fingerprint;
const bodyPack=referenceBodyDescription(),bodyReviewFile='docs/topics/reviews/source-seat-static-review-v2.json';
const bodyReview=await fs.readFile(path.join(repo,bodyReviewFile),'utf8').then(text=>JSON.parse(text) as {appliesTo:string;bodyPackFingerprint:string;result:{pass:boolean}}).catch(()=>undefined);
const bodyReviewCurrent=bodyReview?.bodyPackFingerprint===bodyPack.fingerprint;
const headCandidates=await Promise.all(Object.entries(headPack.assets).flatMap(([actor,views])=>Object.entries(views).map(async([view,asset])=>{
  const measured=await describe(`library/topics/prehistoric-life/rig-v1/${asset.file}`);
  if(measured.sha256!==asset.sha256||measured.width!==asset.width||measured.height!==asset.height||!measured.hasAlpha)throw new Error(`Head asset metadata changed: ${asset.file}`);
  return {...measured,actor,view,approved:false,status:'candidate-layered-head'};
})));
await writeJson(path.join(dir,'manifest.json'),{version:PREHISTORIC_TOPIC_VERSION,...prehistoricReadiness,
  primaryModel:'warm-skin-close-ups',referencePolicy:'Supplemental detailed and white-face sheets do not replace or blend into the primary model.',
  references,candidates:[...candidates,...headCandidates],rejectedArtifacts:rejected,productionRig:null,
  headPack:{...headPack,prompts:['library/topics/prehistoric-life/rig-v1/head-prompts.json','library/topics/prehistoric-life/rig-v1/front-prompts.json'],codeHash:hash(await fs.readFile(path.join(repo,'packages/animation/forest-head-art.ts')))},
  bodyPack:{...bodyPack,codeHash:hash(await fs.readFile(path.join(repo,'packages/animation/forest-body-art.ts')))},
  restCalibration:{status:'candidate',method:'SVG masks on full cutouts',reconstructedOccludedParts:false,naturalMotion:false,codeHash:hash(await fs.readFile(path.join(repo,'packages/topics/reference-puppet.ts')))},
  staticReview:{file:'docs/topics/reviews/karo-atlas-static-review-v1.json',pass:false,scope:'static-artwork-only',appliesTo:'atlas assembly v1, not revised cutout-mask assembly'},
  headStaticReview:{file:headReviewFile,pass:headReviewCurrent&&headReview?.result.pass===true,scope:'static-three-view-head-layer-only',appliesTo:headReview?.appliesTo,
    fingerprintMatches:headReviewCurrent,productionAcceptance:false,history:['docs/topics/reviews/head-layer-static-review-v2.json','docs/topics/reviews/head-layer-static-review-v3.json','docs/topics/reviews/head-layer-static-review-v4.json','docs/topics/reviews/front-head-static-review-v1.json']},
  bodyStaticReview:{file:bodyReviewFile,pass:bodyReviewCurrent&&bodyReview?.result.pass===true,scope:'static-source-body-seated-poses-only',appliesTo:bodyReview?.appliesTo,
    fingerprintMatches:bodyReviewCurrent,productionAcceptance:false,history:['docs/topics/reviews/source-seat-static-review-v1.json'],
    currentRepair:'Warm source neck layer and Karo shoulder repair; latest self-inspection source-seat-right-v3.jpg is not a model PASS. Seated garment drape still needs new authored folds.'},
  limitations:['AI cutouts and part atlases can redraw source details; none is a pixel-exact extraction guarantee.',
    'The atlas generator did not establish exact cell geometry. Define measured crops and pivots before use.',
    'Layered heads support front and two authored three-quarter views; turns are stepped through three drawings. Further inbetweens, profile/rear/body views and other secondary layers remain pending.',
    'Seated source motion and hip-attached garment panels are candidates. Static source-seat reviews failed; shoulder repair and especially authored clothing folds remain unaccepted.',
    'Full-body color frames, layered rig, natural motion and the three complete video flows remain unaccepted.']});
console.log(JSON.stringify({references:references.length,candidates:candidates.length+headCandidates.length,headCandidates:headCandidates.length,rejected:rejected.length,productionReady:false}));
