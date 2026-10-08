import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {findRepoRoot} from '../packages/core/config.js';
import {hash,writeJson,exists} from '../packages/core/utils.js';
import {PREHISTORIC_TOPIC_VERSION,prehistoricReadiness,prehistoricReferences} from '../packages/topics/prehistoric-life.js';
import {referenceHeadDescription} from '../packages/animation/forest-head-art.js';
import {referenceBodyDescription} from '../packages/animation/forest-body-art.js';
import {poseArtInventory} from '../packages/topics/pose-art-workbench.js';
import {viewArtInventory} from '../packages/topics/view-art-workbench.js';
import {bodyViewDescription} from '../packages/animation/body-view-art.js';
import {nativeSeatArtDescription,nativeSeatArtInventory} from '../packages/topics/native-seat-art.js';
import {nativeSeatSurfaceInventory} from '../packages/topics/native-seat-surface-inventory.js';

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
const poseStudies=await poseArtInventory(repo);
const poseEvidence=await Promise.all(poseStudies.map(async study=>{
  const measured=await describe(`library/topics/prehistoric-life/pose-studies/${study.file}`);
  if(measured.sha256!==study.sha256)throw new Error('Pose artwork changed: '+study.file);
  return {...study,...measured,productionAllowed:false};
}));
const viewStudies=await viewArtInventory(repo);
const viewEvidence=await Promise.all(viewStudies.map(async study=>{
  const measured=await describe(`library/topics/prehistoric-life/body-views/${study.file}`);
  if(measured.sha256!==study.sha256||measured.width!==study.width||measured.height!==study.height)throw new Error('Authored view metadata changed: '+study.file);
  return {...study,...measured,productionAllowed:false};
}));
const nativeSeatedMaterials=await nativeSeatArtInventory(repo);
const nativeSeatedSurface=await nativeSeatSurfaceInventory(repo);
const headReviewFile='docs/topics/reviews/front-head-static-review-v2.json';
const headReview=await fs.readFile(path.join(repo,headReviewFile),'utf8').then(text=>JSON.parse(text) as {scope:string;appliesTo:string;headPackFingerprint:string;result:{pass:boolean}}).catch(()=>undefined);
const headReviewCurrent=headReview?.headPackFingerprint===headPack.fingerprint;
const projectionReviewFile='docs/topics/reviews/source-head-projection-static-review-v1.json';
const projectionReview=await fs.readFile(path.join(repo,projectionReviewFile),'utf8').then(text=>JSON.parse(text) as {scope:string;appliesTo:string;headPackFingerprint:string;result:{pass:boolean}}).catch(()=>undefined);
const projectionReviewCurrent=projectionReview?.headPackFingerprint===headPack.fingerprint;
const bodyPack=referenceBodyDescription(),bodyReviewFile='docs/topics/reviews/source-waist-static-review-v1.json';
const bodyReview=await fs.readFile(path.join(repo,bodyReviewFile),'utf8').then(text=>JSON.parse(text) as {scope:string;appliesTo:string;bodyPackFingerprint:string;result:{pass:boolean}}).catch(()=>undefined);
const bodyReviewCurrent=bodyReview?.bodyPackFingerprint===bodyPack.fingerprint;
const headCandidates=await Promise.all(Object.entries(headPack.assets).flatMap(([actor,views])=>Object.entries(views).map(async([view,asset])=>{
  const measured=await describe(`library/topics/prehistoric-life/rig-v1/${asset.file}`);
  if(measured.sha256!==asset.sha256||measured.width!==asset.width||measured.height!==asset.height||!measured.hasAlpha)throw new Error(`Head asset metadata changed: ${asset.file}`);
  return {...measured,actor,view,approved:false,status:'candidate-layered-head'};
})));
const garmentCandidates=await Promise.all(Object.entries(bodyPack.seatedGarments.assets).map(async([actor,asset])=>{
  const measured=await describe(asset.file);
  if(measured.sha256!==asset.sha256||measured.width!==asset.width||measured.height!==asset.height||!measured.hasAlpha)throw new Error('Seated garment metadata changed: '+asset.file);
  return {...measured,actor,approved:false,status:'candidate-authored-seated-folds'};
}));
await writeJson(path.join(dir,'manifest.json'),{version:PREHISTORIC_TOPIC_VERSION,...prehistoricReadiness,
  primaryModel:'warm-skin-close-ups',referencePolicy:'Supplemental detailed and white-face sheets do not replace or blend into the primary model.',
  nativeSeatedMaterials:{...nativeSeatArtDescription,materials:nativeSeatedMaterials,codeHash:hash(await fs.readFile(path.join(repo,'packages/topics/native-seat-art.ts')))},
  nativeSeatedSurface,
  references,candidates:[...candidates,...headCandidates,...garmentCandidates],rejectedArtifacts:rejected,productionRig:null,
  headPack:{...headPack,prompts:['library/topics/prehistoric-life/rig-v1/head-prompts.json','library/topics/prehistoric-life/rig-v1/front-prompts.json'],codeHash:hash(await fs.readFile(path.join(repo,'packages/animation/forest-head-art.ts'))),cutoutCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/forest-cutout-head.ts'))),projectionCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/forest-head-projection.ts')))},
  bodyPack:{...bodyPack,codeHash:hash(await fs.readFile(path.join(repo,'packages/animation/forest-body-art.ts'))),walkCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/source-walk.ts'))),
    runCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/running.ts'))),spearCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/spear.ts'))),armShapeCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/source-arm.ts'))),compilerCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/compiler.ts'))),rigCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/rig.ts'))),cameraCodeHash:hash(await fs.readFile(path.join(repo,'packages/director/camera.ts'))),
    sourceBodyCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/view-source-body.ts'))),actingClockCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/view-acting-clock.ts'))),actingBindingCodeHash:hash(await fs.readFile(path.join(repo,'packages/actors/view-acting-clock.ts'))),
    secondaryCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/body-view-secondary.ts'))),secondaryMotionCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/view-secondary-motion.ts'))),
    viewCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/body-view-art.ts'))),viewContourCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/body-view-contours.ts'))),viewClothCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/body-view-cloth.ts'))),viewClothGeometryCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/view-cloth-geometry.ts'))),
    viewSeatCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/body-view-seat.ts'))),viewSeatRegistrationCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/native-seat-registration.ts'))),viewSeatCorrespondenceHash:hash(await fs.readFile(path.join(repo,'library/topics/prehistoric-life/native-seat-v1/correspondence-v1.json'))),lungeCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/lunge.ts'))),handCodeHash:hash(await fs.readFile(path.join(repo,'packages/animation/forest-hand.ts')))},
  poseArtwork:{scope:'static-artwork-only',inventory:'library/topics/prehistoric-life/pose-studies/inspection-v1.json',generatedImageCalls:14,staticVisionAdviceCalls:2,
    evidence:poseEvidence,approved:false,productionReady:false,generatedPosesIntegratedAsProductionRig:false,
    reviews:['docs/topics/reviews/gemini-pose-advice-v1.json','docs/topics/reviews/gemini-pose-advice-v3.json'],workflow:'docs/topics/AI-POSE-WORKFLOW.md'},
  authoredViewArtwork:{scope:'static-artwork-only',generatedImageCalls:viewEvidence.length,staticVisionAdviceCalls:2,evidence:viewEvidence,
    registered:false,registrationFlagScope:'all artwork approved/registered for production: false; raw generation metadata remains immutable',engineeringRegistrations:bodyViewDescription,approved:false,productionReady:false,integratedAsProductionRig:false,
    inventory:'library/topics/prehistoric-life/body-views/inspection-v1.json',workflow:'docs/topics/AUTHORED-VIEWS.md',
    reviews:['docs/topics/reviews/gemini-authored-views-advice-v1.json','docs/topics/reviews/gemini-authored-views-advice-v2.json']},
  actionPoseInspection:{file:'docs/topics/reviews/source-wrist-self-inspection-v1.json',scope:'developer-static-pose-inspection-only',pass:null,productionAcceptance:false,
    supersedes:{file:'docs/topics/reviews/source-spear-pose-self-inspection-v2.json',reason:'User rejected other arms and face distortion after 0.15. Earlier snapshots and AI artwork remain studies, not acceptance.'},
    currentRepair:'0.20 registers separate source cuff/palm candidates, migrates fixed arm endpoints independently of targets, keeps palm contact semantics and rotates immutable mittens by the forearm tangent. Developer frontal presets have reach reserve after migration; source poles/shaft offsets are explicit, think painter slots are discrete, interpolation checks cuffs and spear contacts. Static DOM inspection covers 144 actor-clock cards: 138 SVG, six unsupported head-turns. Real grasp, readable joint silhouettes, cloth/hair motion, other views, stance preparation and story integration remain pending; no motion/video acceptance.',
    sourceAdvice:{completedCalls:9,scope:'static-source-and-art-advice-only',reports:['docs/topics/reviews/gemini-arm-source-advice-v1.json','docs/topics/reviews/coder-arm-source-advice-v1.json','docs/topics/reviews/gemini-arm-source-advice-v2.json','docs/topics/reviews/gemini-arm-source-advice-v3.json','docs/topics/reviews/gemini-spear-pair-advice-v1.json','docs/topics/reviews/coder-spear-pair-advice-v1.json','docs/topics/reviews/gemini-view-lunge-advice-v1.json','docs/topics/reviews/coder-view-lunge-advice-v1.json','docs/topics/reviews/coder-wrist-palm-advice-v1.json'],assessment:'docs/topics/WRIST-PALM-IMPLEMENTATION.md',pass:null,productionAcceptance:false},workflow:'docs/topics/ARM-POSE-REPAIR.md'},
  walkPoseInspection:{file:'docs/topics/reviews/source-walk-pose-self-inspection-v1.json',scope:'developer-static-inspection-only',pass:null,productionAcceptance:false,
    currentRepair:'Distance-dependent C2 foot lift, bounded support transfer, speed-dependent arms and inferred XYZ knee projection. Isolated front-body poses only; full gait, seated transitions, authored side/rear body views and production acceptance remain pending.'},
  restCalibration:{status:'candidate',method:'SVG masks on full cutouts',reconstructedOccludedParts:false,naturalMotion:false,codeHash:hash(await fs.readFile(path.join(repo,'packages/topics/reference-puppet.ts')))},
  staticReview:{file:'docs/topics/reviews/karo-atlas-static-review-v1.json',pass:false,scope:'static-artwork-only',appliesTo:'atlas assembly v1, not revised cutout-mask assembly'},
  headStaticReview:{file:headReviewFile,pass:headReviewCurrent&&headReview?.result.pass===true,scope:'static-three-view-head-layer-only',appliesTo:headReview?.appliesTo,
    fingerprintMatches:headReviewCurrent,productionAcceptance:false,history:['docs/topics/reviews/head-layer-static-review-v2.json','docs/topics/reviews/head-layer-static-review-v3.json','docs/topics/reviews/head-layer-static-review-v4.json','docs/topics/reviews/front-head-static-review-v1.json']},
  headProjectionStaticReview:{file:projectionReviewFile,activeForBody:false,pass:false,historicalReviewPass:projectionReview?.result.pass===true,scope:projectionReview?.scope,appliesTo:projectionReview?.appliesTo,fingerprintMatches:projectionReviewCurrent,productionAcceptance:false,
    latestSelfInspection:'docs/topics/reviews/source-pose-art-self-inspection-v1.json',currentRepair:'The inferred yaw mesh and independently generated enlarged face glyphs were rejected by the user and removed from the body. Source cutout face now follows the registered neck/torso as one image. Provisional overlays, independent hair and authored partner-facing/profile/rear views remain pending.'},
  bodyStaticReview:{file:bodyReviewFile,pass:bodyReviewCurrent&&bodyReview?.result.pass===true,scope:bodyReview?.scope??'static-cuffs-and-seat-to-walk-poses-only',appliesTo:bodyReview?.appliesTo,
    fingerprintMatches:bodyReviewCurrent,productionAcceptance:false,history:['docs/topics/reviews/source-seat-static-review-v1.json','docs/topics/reviews/source-seat-static-review-v2.json','docs/topics/reviews/source-fold-static-review-v1.json','docs/topics/reviews/source-fold-static-review-v2.json','docs/topics/reviews/source-cuffs-static-review-v1.json','docs/topics/reviews/source-cuffs-static-review-v2.json'],
    latestSelfInspection:'docs/topics/reviews/source-waist-self-inspection-v2.json',
    currentRepair:'Karo two-cuff artwork v2 and common opaque UV surface now cover ordinary walking as well as seated plans. Pinned waist and a quadratic 25% area governor prevent detachment/inversion. Cuffs review v2 passed six poses on version 5. Waist review v1 on version 6 failed duplicate perimeter ink at 800ms; texture exclusion widened from 1.5 to 3.5 units afterward, with developer static inspection only. No current static or continuous-video acceptance.'},
  limitations:['AI cutouts and part atlases can redraw source details; none is a pixel-exact extraction guarantee.',
    'The atlas generator did not establish exact cell geometry. Define measured crops and pivots before use.',
    'Head-only inspection retains three historical authored drawings. Body uses one registered cutout source orientation without inferred yaw. Happy retains that cutout face, but the AI extraction is not guaranteed pixel identity. Partner-facing/profile/rear body/head views, accepted expressions, secondary layers and continuous motion remain pending.',
    'All 14 AI pose artifacts are unapproved. V1 changes limb style; V2 changes identity; ten V3 poses still require hand/silhouette/anatomy corrections and joint registration. Static model advice is not animation or production acceptance.',
    'Source clothing remains a candidate. Six-pose cuffs PASS applies to version 5 only. Version 6 waist review failed duplicate Karo ink; the subsequent wider texture exclusion has developer static inspection only. Area governor is not physical cloth or anatomy validation. Full clock, body views and final video remain unaccepted.',
    'Full-body color frames, layered rig, natural motion and the three complete video flows remain unaccepted.']});
console.log(JSON.stringify({references:references.length,candidates:candidates.length+headCandidates.length+garmentCandidates.length,headCandidates:headCandidates.length,garmentCandidates:garmentCandidates.length,rejected:rejected.length,productionReady:false}));
