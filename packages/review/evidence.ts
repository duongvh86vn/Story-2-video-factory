import path from 'node:path';
import {promises as fs} from 'node:fs';
import {randomUUID} from 'node:crypto';
import type {FactoryConfig} from '../core/config.js';
import {AssetManifestSchema,CharacterBibleSchema,NarrationSchema,ReviewSchema,StoryboardSchema,StorySchema,type AssetManifest,type CharacterBible,type Review,type Story,type Storyboard} from '../core/schemas.js';
import {exists,hash,readJson,safeRealPath,walk,writeJson} from '../core/utils.js';
import {outputPath,redact} from '../render/process.js';
import {FinalEvidenceSchema,ReviewAttemptSchema,ReviewEvidenceSchema,ReviewSourceSchema,ReviewInputSchema,RELEASE_EVIDENCE_VERSION,type ReviewEvidence,type ReviewInput,type ReviewSource,type ReviewSession,type FinalEvidence} from './evidence-schemas.js';

const limits={visualAcceptance:false,motionVerified:false,productionApproval:false} as const;
const sourcePaths=['project.yaml','work/input-document.json','work/script.json','work/generated-script.txt','work/script-generation.json','work/story.json','work/narration.json','work/voiced-narration.json','work/timeline.json','work/chapters.json','work/beats.json','work/character-bible.json','work/asset-manifest.json','work/host-profile.json','work/host-rig.json','work/host-timeline.json','work/explanation-plan.json','work/voice-report.json','work/speech-activity.json','work/actor-cast.json','work/actor-timeline.json','work/creative-direction-report.json','work/camera-direction-report.json','work/environment-provenance.json','work/animation-library.json','work/master.json','work/performance-report.json'] as const;
const finalPaths=['work/rendered.mp4','output/final.mp4','output/final.srt','output/thumbnail.png'] as const;
const fail=(message:string):never=>{throw new Error('needs-current-review: '+message);};
async function digest(root:string,file:string,optional=false):Promise<string|null>{
  if(file==='__proto__')return fail('reserved source record key is forbidden');
  if(optional&&!await exists(path.join(root,file)))return null;
  const real=await safeRealPath(root,file);
  if([file,real].some(value=>/(?:^|[\\/])\.env(?:$|[.\\/])/i.test(value)))return fail('credential files cannot be review sources');
  return hash(await fs.readFile(real));
}
async function requireAttempt(root:string,attemptId:string):Promise<void>{
  try{const active=await readJson(path.join(root,'work/review-attempt.json'),ReviewAttemptSchema);if(active.attemptId===attemptId)return;}
  catch{/* missing/malformed active generation never authorizes publication */}
  return fail('review attempt was superseded or is missing');
}

/** Read-only snapshot. Scene resources include actual staged image/font/audio
 * bytes, not just the small HTML/scene record previously checked by review. */
export async function captureReviewSource(root:string,config:FactoryConfig,board:Storyboard,context?:{story:Story;characters:CharacterBible;assets:AssetManifest}):Promise<ReviewSource>{
  const canonical=await readJson(path.join(root,'work/storyboard.json'),StoryboardSchema);
  if(hash(canonical)!==hash(StoryboardSchema.parse(board)))return fail('canonical storyboard changed before review');
  if(context){
    const documents=[['work/story.json',StorySchema,context.story],['work/character-bible.json',CharacterBibleSchema,context.characters],['work/asset-manifest.json',AssetManifestSchema,context.assets]] as const;
    for(const[file,schema,value]of documents)if(hash(await readJson(path.join(root,file),schema))!==hash(schema.parse(value)))return fail('review context differs from '+file);
  }
  const sourceFiles:Record<string,string|null>={'work/storyboard.json':await digest(root,'work/storyboard.json')};
  for(const file of sourcePaths)sourceFiles[file]=await digest(root,file,true);
  for(const file of ['work/narration.json','work/voiced-narration.json'])if(await exists(path.join(root,file))){
    const narration=await readJson(path.join(root,file),NarrationSchema);
    if(narration.audioPath)sourceFiles[narration.audioPath]=await digest(root,narration.audioPath);
  }
  const assets=await readJson(path.join(root,'work/asset-manifest.json'),AssetManifestSchema);
  for(const asset of assets.assets.filter(a=>a.status==='approved'))sourceFiles[asset.path]=await digest(root,asset.path);
  for(const file of [config.input.source,config.input.story,config.input.idea,config.input.script,config.input.narration,config.input.subtitles])sourceFiles[file]=await digest(root,file,true);
  // Raw credentials and .env are never read or captured by this contract.
  const sceneFiles:Record<string,string>={};
  for(const file of (await walk(path.join(root,'scenes'))).sort()){
    const relative=path.relative(root,file).split(path.sep).join('/');sceneFiles[relative]=(await digest(root,relative))!;
  }
  if(!sceneFiles['scenes/index.html']||!sceneFiles['scenes/master.js'])return fail('complete master scenes are required');
  return ReviewSourceSchema.parse({version:RELEASE_EVIDENCE_VERSION,configurationHash:hash(config),storyboardHash:hash(canonical),sourceFiles,sceneFiles});
}
export async function captureReviewInput(root:string,config:FactoryConfig,board:Storyboard,context?:{story:Story;characters:CharacterBible;assets:AssetManifest}):Promise<ReviewInput>{
  const source=await captureReviewSource(root,config,board,context);
  const manifest=await readJson<{sourceInputHash?:string;frames:Array<{path:string}>;actions?:Array<{path:string}>;sheetHashes:Record<string,string>;global?:string}>(path.join(root,'previews/manifest.json'));
  if(manifest.sourceInputHash!==hash(source))return fail('previews were not captured from the current complete scene resources; recreate previews');
  const paths=new Set(['previews/manifest.json',...manifest.frames.map(f=>f.path),...(manifest.actions??[]).map(f=>f.path),...Object.keys(manifest.sheetHashes),...(manifest.global?[manifest.global]:[])]);
  const previewFiles:Record<string,string>={};
  for(const file of [...paths].sort()){
    if(!file.startsWith('previews/'))return fail('preview evidence must belong to previews/');
    previewFiles[file]=(await digest(root,file))!;
  }
  return ReviewInputSchema.parse({...source,previewFiles});
}
export async function beginReviewEvidence(root:string,config:FactoryConfig,board:Storyboard,context?:{story:Story;characters:CharacterBible;assets:AssetManifest}):Promise<ReviewSession>{
  const attemptId=randomUUID();
  // Only begin advances the active generation. A late provider cannot adopt a
  // newer attempt even if its source/preview bytes happen to be identical.
  await writeJson(await outputPath(root,'work/review-attempt.json'),{version:RELEASE_EVIDENCE_VERSION,attemptId});
  await writeJson(await outputPath(root,'work/review-evidence.json'),{version:RELEASE_EVIDENCE_VERSION,attemptId,status:'reviewing',...limits});
  const input=await captureReviewInput(root,config,board,context);await requireAttempt(root,attemptId);
  return {attemptId,input};
}
export async function commitReviewEvidence(root:string,config:FactoryConfig,board:Storyboard,session:ReviewSession,value:Review):Promise<Review>{
  const {attemptId,input}=session;await requireAttempt(root,attemptId);
  const current=await captureReviewInput(root,config,board);
  if(hash(current)!==hash(input))return fail('source, scene resources or previews changed while reviewing; recreate previews and review');
  const review=ReviewSchema.parse(JSON.parse(redact(JSON.stringify(value))));
  await requireAttempt(root,attemptId);
  await writeJson(await outputPath(root,'work/review.json'),review);
  // Failure or interruption leaves a non-accepted marker; an earlier PASS
  // cannot authorize this new attempt. The receipt binds the sanitized file.
  await requireAttempt(root,attemptId);
  const receipt=ReviewEvidenceSchema.parse({version:RELEASE_EVIDENCE_VERSION,attemptId,status:'accepted',reviewHash:hash(review),inputHash:hash(input),input,...limits});
  await writeJson(await outputPath(root,'work/review-evidence.json'),receipt);
  if(hash(await captureReviewInput(root,config,board))!==hash(input)){
    await requireAttempt(root,attemptId);
    await writeJson(await outputPath(root,'work/review-evidence.json'),{version:RELEASE_EVIDENCE_VERSION,attemptId,status:'stale',...limits});
    return fail('source changed during review publication');
  }
  await requireCurrentReview(root,config,board,receipt);
  return review;
}
export async function requireCurrentReview(root:string,config:FactoryConfig,board:Storyboard,expected?:ReviewEvidence):Promise<ReviewEvidence>{
  const review=await readJson(path.join(root,'work/review.json'),ReviewSchema);
  let evidence:ReviewEvidence;
  try{evidence=await readJson(path.join(root,'work/review-evidence.json'),ReviewEvidenceSchema);}catch{return fail('missing or unfinished review evidence; recreate previews and review');}
  await requireAttempt(root,evidence.attemptId);
  if(expected&&hash(evidence)!==hash(expected))return fail('review evidence changed during final production');
  if(evidence.reviewHash!==hash(review)||evidence.inputHash!==hash(evidence.input)||hash(await captureReviewInput(root,config,board))!==evidence.inputHash)return fail('review belongs to a different source, scenes or preview revision');
  await requireAttempt(root,evidence.attemptId);
  if(hash(await readJson(path.join(root,'work/review.json'),ReviewSchema))!==evidence.reviewHash||hash(await readJson(path.join(root,'work/review-evidence.json'),ReviewEvidenceSchema))!==hash(evidence))return fail('review publication changed during verification');
  return evidence;
}
export async function requireCurrentPassingReview(root:string,config:FactoryConfig,board:Storyboard,expected?:ReviewEvidence):Promise<ReviewEvidence>{
  const evidence=await requireCurrentReview(root,config,board,expected),review=await readJson(path.join(root,'work/review.json'),ReviewSchema);
  if(!review.pass||review.issues.some(i=>i.severity==='high')||hash(review)!==evidence.reviewHash)return fail('a current passing draft review is required');
  await requireAttempt(root,evidence.attemptId);
  return evidence;
}
export async function recordFinalEvidence(root:string,config:FactoryConfig,board:Storyboard,review:ReviewEvidence):Promise<void>{
  await requireCurrentPassingReview(root,config,board,review);
  const artifacts=Object.fromEntries(await Promise.all(finalPaths.map(async file=>[file,(await digest(root,file))!])));
  const record=FinalEvidenceSchema.parse({version:RELEASE_EVIDENCE_VERSION,status:'produced',reviewEvidenceHash:hash(review),reviewHash:review.reviewHash,inputHash:review.inputHash,artifacts,...limits});
  await requireCurrentPassingReview(root,config,board,review);
  await writeJson(await outputPath(root,'work/final-evidence.json'),record);
  await requireCurrentFinalEvidence(root,config,board,record);
}
export async function requireCurrentFinalEvidence(root:string,config:FactoryConfig,board:Storyboard,expected?:FinalEvidence):Promise<FinalEvidence>{
  const review=await requireCurrentPassingReview(root,config,board);
  let final:ReturnType<typeof FinalEvidenceSchema.parse>;
  try{final=await readJson(path.join(root,'work/final-evidence.json'),FinalEvidenceSchema);}catch{return fail('missing final evidence; render and postprocess from the current review');}
  if(expected&&hash(final)!==hash(expected))return fail('final evidence changed during QC/export');
  if(final.reviewEvidenceHash!==hash(review)||final.reviewHash!==review.reviewHash||final.inputHash!==review.inputHash)return fail('final video belongs to a different review/source revision');
  for(const file of finalPaths)if(await digest(root,file)!==final.artifacts[file])return fail('final artifact bytes changed after production: '+file);
  await requireCurrentPassingReview(root,config,board,review);
  return final;
}
