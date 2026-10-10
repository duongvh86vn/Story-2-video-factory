import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {hash} from '../core/utils.js';
import {HostProfileSchema,type HostProfile} from '../host/schemas.js';
import {referenceHeadAssets} from '../animation/forest-head-art.js';
import {readReferenceHeadAsset} from '../animation/forest-head-art.js';
import {referenceBodyAssets} from '../animation/forest-body-art.js';

export const TOPIC_PRODUCTION_RELEASE_VERSION='topic-production-release-1' as const;
export const TOPIC_RELEASE_CODE_ROOTS=['packages','library/shots','library/prompts'] as const;
const Sha=z.string().regex(/^[a-f0-9]{64}$/),Id=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/);
const Receipt=z.object({path:z.string().trim().min(1).max(2000),sha256:Sha,bytes:z.number().int().positive().max(4*1024*1024*1024)}).strict();
export const TopicProductionReleaseSchema=z.object({version:z.literal(TOPIC_PRODUCTION_RELEASE_VERSION),topic:z.literal('prehistoric-life'),
  sourceVersion:z.string().min(1).max(200),codeFingerprint:Sha,
  profiles:z.array(z.object({id:Id,model:z.enum(['lila','karo','prehistoric-male-bald','prehistoric-female-haired']),profile:HostProfileSchema}).strict()).min(2).max(64),
  defaults:z.object({lila:Id,karo:Id}).strict(),
  assets:z.array(Receipt).min(1).max(512),
  environments:z.array(z.object({id:Id,setting:z.enum(['forest','camp','cave','river','neutral']),lighting:z.enum(['day','sunset','night']),assetPath:z.string().min(1).max(2000)}).strict()).min(3).max(64),
  evidence:z.array(z.object({id:Id,scope:z.enum(['actor-art','actor-motion','environment-art','environment-motion']),status:z.literal('passed'),
    profileIds:z.array(Id).max(64),environmentIds:z.array(Id).max(64),report:Receipt,
    video:Receipt,probe:Receipt,normalSpeedReviewed:z.literal(true),fps:z.number().min(60).max(240),
    reviewer:z.string().trim().min(1).max(200),reviewedAt:z.string().datetime({offset:true})}).strict()).min(4).max(128),
  acceptance:z.object({accepted:z.literal(true),acceptedBy:z.string().trim().min(1).max(200),acceptedAt:z.string().datetime({offset:true}),evidenceIds:z.array(Id).min(4).max(128)}).strict(),
}).strict();
export type TopicProductionRelease=z.infer<typeof TopicProductionReleaseSchema>;
export type VerifiedTopicRelease={readonly release:TopicProductionRelease;readonly fingerprint:string;readonly sourceVersion:string;readonly codeFingerprint:string;readonly releasePath:string};
const verifiedReleases=new WeakSet<VerifiedTopicRelease>();
const fail=(why:string):never=>{throw new Error('needs-art-direction: '+why);};
function boundedBytes(file:string,limit=1024*1024){
  const fd=fs.openSync(file,'r');try{
    const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.size<=0||stat.size>limit)fail('Invalid or oversized release evidence JSON');
    const bytes=Buffer.alloc(stat.size);let offset=0;
    while(offset<bytes.length){const n=fs.readSync(fd,bytes,offset,bytes.length-offset,offset);if(!n)fail('Release evidence became incomplete');offset+=n;}
    if(fs.fstatSync(fd).size!==stat.size)fail('Release evidence changed during reading');return bytes;
  }finally{fs.closeSync(fd);}
}
const boundedJson=(file:string)=>JSON.parse(boundedBytes(file).toString('utf8'));

/** Source tree discovery works in tsx and compiled dist; no provider/render or
 * callback is invoked. It is evaluated only by an explicit runtime caller. */
export function topicReleaseRepoRoot(){let at=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');for(let i=0;i<6;i++){if(fs.existsSync(path.join(at,'packages/animation'))&&fs.existsSync(path.join(at,'library/shots')))return at;at=path.dirname(at);}return fail('Visual source tree is unavailable for release verification');}
export function topicReleaseCodeFingerprint(repo=topicReleaseRepoRoot()){
  const files:string[]=[];
  const walk=(folder:string)=>{for(const entry of fs.readdirSync(path.join(repo,folder),{withFileTypes:true})){const file=folder+'/'+entry.name;if(entry.isSymbolicLink())fail('Symlink visual source is not a certified release');if(entry.isDirectory())walk(file);else if(entry.isFile()&&/\.(ts|md)$/.test(file))files.push(file);}};
  for(const folder of TOPIC_RELEASE_CODE_ROOTS)walk(folder);
  files.sort();return hash(files.map(file=>[file,hash(fs.readFileSync(path.join(repo,file)))]));
}
function receiptFile(receipt:z.infer<typeof Receipt>,base:string){
  if(/^[a-z]+:\/\//i.test(receipt.path)||receipt.path.includes('\0'))fail('Release evidence must be a local file');
  const file=path.resolve(base,receipt.path),stat=fs.statSync(file);if(!stat.isFile()||stat.size!==receipt.bytes)fail('Release artifact size changed');
  const fd=fs.openSync(file,'r'),digest=crypto.createHash('sha256'),buffer=Buffer.alloc(1024*1024);let offset=0;
  try{while(offset<stat.size){const n=fs.readSync(fd,buffer,0,Math.min(buffer.length,stat.size-offset),offset);if(!n)fail('Release artifact became incomplete');digest.update(buffer.subarray(0,n));offset+=n;}if(fs.fstatSync(fd).size!==stat.size)fail('Release artifact changed while reading');}finally{fs.closeSync(fd);}
  if(digest.digest('hex')!==receipt.sha256)fail('Release artifact bytes changed');return file;
}
function assetKey(file:string){return file.replaceAll('\\','/');}
function sameAppearance(a:HostProfile['appearance'],b:HostProfile['appearance']){return hash(HostProfileSchema.shape.appearance.parse(a))===hash(HostProfileSchema.shape.appearance.parse(b));}
function ownAssetPath(file:string,repo:string){
  const key=assetKey(file);
  if(!key.startsWith('library/')||key.split('/').some(p=>p==='..'||p==='.'||!p)||path.isAbsolute(file)||file.includes('\0'))fail('Rig/world assets must be own repository library files');
  const base=fs.realpathSync(repo),relative=path.relative(base,fs.realpathSync(path.resolve(base,file)));
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))fail('Rig/world asset escapes its own repository');
}
function freezeRelease<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))freezeRelease(child);Object.freeze(value);}return value;}

/** Accepts only an external, explicit QA ledger bound to actual current files.
 * It never creates reports/acceptance, executes tests/probe/render, opens media,
 * changes catalog approvals or certifies the original-story source pipeline. */
export function readTopicProductionRelease(file:string,sourceVersion:string,repo=topicReleaseRepoRoot()):VerifiedTopicRelease{
  try{
    if(!path.isAbsolute(file))fail('topic.production_release must name an absolute local QA ledger path');
    const releasePath=path.resolve(file),raw=boundedBytes(releasePath);
    const release=TopicProductionReleaseSchema.parse(JSON.parse(raw.toString('utf8'))),codeFingerprint=topicReleaseCodeFingerprint(repo);
    // Deduplicate receipts only within this verification pass; never retain a
    // cache across requests, versions or the final authority recheck below.
    const checked=new Map<string,{sha256:string;bytes:number}>();
    const verifyReceipt=(receipt:z.infer<typeof Receipt>,base:string)=>{const absolute=path.resolve(base,receipt.path),previous=checked.get(absolute);
      if(previous){if(previous.sha256!==receipt.sha256||previous.bytes!==receipt.bytes)fail('Conflicting receipts for one visual evidence file');return absolute;}
      const result=receiptFile(receipt,base);checked.set(absolute,{sha256:receipt.sha256,bytes:receipt.bytes});return result;};
    if(release.sourceVersion!==sourceVersion||release.codeFingerprint!==codeFingerprint)fail('QA ledger does not match the current visual source version');
    const unique=(ids:string[],kind:string)=>{if(new Set(ids).size!==ids.length)fail('Duplicate '+kind+' in QA ledger');};
    unique(release.profiles.map(p=>p.id),'profile');unique(release.environments.map(p=>p.id),'environment');unique(release.evidence.map(p=>p.id),'evidence');unique(release.assets.map(p=>assetKey(p.path)),'asset');unique(release.acceptance.evidenceIds,'accepted evidence');
    const assets=new Map(release.assets.map(a=>[assetKey(a.path),a])),profileIds=new Set(release.profiles.map(p=>p.id)),environmentIds=new Set(release.environments.map(e=>e.id));
    for(const [model,id]of Object.entries(release.defaults)){const p=release.profiles.find(p=>p.id===id);if(!p||p.model!==model)fail('Principal default must refer to its own tested model');}
    for(const asset of release.assets){ownAssetPath(asset.path,repo);verifyReceipt(asset,repo);}
    for(const entry of release.profiles){
      const a=entry.profile.appearance,body=entry.model==='lila'||entry.model==='prehistoric-female-haired'?'lila':'karo',supporting=entry.model.startsWith('prehistoric-')?entry.model:undefined;
      if(entry.profile.kind!=='stick-man'||entry.profile.role!=='story-actor'||a.characterVariant!==body||a.supportingModel!==supporting||!['forest-body-1','forest-body-view-1'].includes(a.artworkVersion??''))fail('Certified profile must retain its own actor identity/body/head');
      const resources=[...referenceHeadAssets(a),...referenceBodyAssets(a)];if(!resources.length)fail('Certified profile has no actual source resources');
      for(const resource of resources){const asset=assets.get(assetKey(resource.file));if(!asset||asset.sha256!==resource.sha256)fail('Certified profile is missing an exact canonical rig resource');readReferenceHeadAsset(resource);}
    }
    for(const environment of release.environments)if(!assets.has(assetKey(environment.assetPath))||!/\.(png|jpe?g|webp)$/i.test(environment.assetPath))fail('Certified environment needs a bound own raster plate');
    for(const lighting of ['day','sunset','night'])if(!release.environments.some(e=>e.lighting===lighting))fail('A certified day/sunset/night environment is missing');
    const accepted=new Set(release.acceptance.evidenceIds);
    for(const id of accepted)if(!release.evidence.some(e=>e.id===id))fail('Acceptance references missing evidence');
    for(const row of release.evidence){
      unique(row.profileIds,'tested profile');unique(row.environmentIds,'tested environment');
      if(row.profileIds.some(id=>!profileIds.has(id))||row.environmentIds.some(id=>!environmentIds.has(id)))fail('Evidence references an unknown model/environment');
      const base=path.dirname(releasePath),reportFile=verifyReceipt(row.report,base),videoFile=verifyReceipt(row.video,base),probeFile=verifyReceipt(row.probe,base);
      if(!/\.mp4$/i.test(videoFile))fail('Normal-speed visual evidence must include its local MP4');
      const report=z.object({sourceVersion:z.string(),codeFingerprint:Sha,evidenceId:Id,scope:z.string(),status:z.literal('passed'),testsExecuted:z.number().int().positive(),failed:z.literal(0),profileIds:z.array(Id),environmentIds:z.array(Id),videoSha256:Sha,probeSha256:Sha,normalSpeedReviewed:z.literal(true),fps:z.number().min(60).max(240),reviewer:z.string(),reviewedAt:z.string()}).passthrough().parse(boundedJson(reportFile));
      if(report.sourceVersion!==sourceVersion||report.codeFingerprint!==codeFingerprint||report.evidenceId!==row.id||report.scope!==row.scope||report.videoSha256!==row.video.sha256||report.probeSha256!==row.probe.sha256||report.fps!==row.fps||report.reviewer!==row.reviewer||report.reviewedAt!==row.reviewedAt||hash(report.profileIds)!==hash(row.profileIds)||hash(report.environmentIds)!==hash(row.environmentIds))fail('Runtime report is not bound to this actual visual evidence');
      const fd=fs.openSync(videoFile,'r'),header=Buffer.alloc(12);try{if(fs.readSync(fd,header,0,12,0)!==12||header.subarray(4,8).toString()!=='ftyp')fail('Evidence video is not an MP4 container');}finally{fs.closeSync(fd);}
      const probe=boundedJson(probeFile) as {streams?:Array<{codec_type?:string;avg_frame_rate?:string;duration?:string;nb_frames?:string;nb_read_frames?:string;width?:number;height?:number}>;format?:{duration?:string}};
      const stream=probe.streams?.find(s=>s.codec_type==='video'),rate=stream?.avg_frame_rate?.split('/').map(Number),fps=rate?.length===2?rate[0]!/rate[1]!:NaN;
      const duration=Number(stream?.duration??probe.format?.duration),frames=Number(stream?.nb_read_frames??stream?.nb_frames);
      if(!stream||!Number.isFinite(fps)||Math.abs(fps-row.fps)>.001||!Number.isFinite(duration)||duration<=0||!Number.isInteger(frames)||frames<=1||Math.abs(frames-duration*fps)>2||!Number.isInteger(stream.width)||!Number.isInteger(stream.height)||stream.width!<=0||stream.height!<=0)fail('Actual probe does not establish the required normal-speed video/fps/frames');
      if(row.scope.startsWith('actor-')&&!row.profileIds.length||row.scope.startsWith('environment-')&&!row.environmentIds.length)fail('Visual evidence has no targets in its own scope');
    }
    const covered=(scope:string,id:string,kind:'profileIds'|'environmentIds')=>release.evidence.some(e=>accepted.has(e.id)&&e.scope===scope&&e[kind].includes(id));
    for(const p of release.profiles)if(!covered('actor-art',p.id,'profileIds')||!covered('actor-motion',p.id,'profileIds'))fail('Every certified profile needs accepted art and motion evidence');
    for(const e of release.environments)if(!covered('environment-art',e.id,'environmentIds')||!covered('environment-motion',e.id,'environmentIds'))fail('Every certified environment needs accepted art and motion evidence');
    // Re-read the entire authority after receipts. A concurrent replacement is
    // a failure, not an opportunity to use a mixture of accepted revisions.
    if(hash(boundedBytes(releasePath))!==hash(raw)||topicReleaseCodeFingerprint(repo)!==codeFingerprint)fail('Visual release authority changed during verification');
    checked.clear();
    for(const asset of release.assets)verifyReceipt(asset,repo);
    for(const row of release.evidence)for(const receipt of [row.report,row.video,row.probe])verifyReceipt(receipt,path.dirname(releasePath));
    const verified=freezeRelease({release,fingerprint:hash({ledger:hash(raw),codeFingerprint}),sourceVersion,codeFingerprint,releasePath});verifiedReleases.add(verified);return verified;
  }catch(error){if(error instanceof Error&&error.message.startsWith('needs-art-direction:'))throw error;return fail('QA ledger is missing, malformed, stale or unverifiable');}
}
export function certifiedTopicAppearance(verified:VerifiedTopicRelease,model:string,appearance:HostProfile['appearance']){
  if(!verifiedReleases.has(verified))fail('Release must be freshly verified by the intake');
  if(!verified.release.profiles.some(p=>p.model===model&&sameAppearance(p.profile.appearance,appearance)))fail('Actor appearance was not certified by this exact QA ledger');return structuredClone(appearance);
}
export function certifiedTopicDefault(verified:VerifiedTopicRelease,model:'lila'|'karo'){
  if(!verifiedReleases.has(verified))fail('Release must be freshly verified by the intake');
  return structuredClone(verified.release.profiles.find(p=>p.id===verified.release.defaults[model])!.profile.appearance);
}
export const topicProductionReleaseDescription={version:TOPIC_PRODUCTION_RELEASE_VERSION,
  scope:'explicit external current visual QA ledger; actual runtime reports/normal-speed60fps videos/probes and exact rig/world/source bytes',
  sourceAuthority:TOPIC_RELEASE_CODE_ROOTS,writer:'none; intake never executes tests/render or manufactures acceptance',
  defaultState:'needs-art-direction',configuredState:'verified ledger permits model/TTS preflight only; story/source/voice/render/review/final gates still apply',
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,productionRig:null,availableBanks:[],motionVerified:false,productionApproval:false};
