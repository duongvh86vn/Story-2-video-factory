/** User-QA opt-in only. Implementation agents do not execute this exporter.
 * Existing real project -> isolated silent HTML5 source preview; no fixture,
 * provider, TTS/ASR, browser/server, media renderer or production publication. */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {parseArgs} from 'node:util';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {findRepoRoot} from '../packages/core/config.js';
import {hash,writeAtomic,writeJson} from '../packages/core/utils.js';
import {outputPath,redact} from '../packages/render/process.js';
import {actorRigResourcePaths} from '../packages/actors/rig-resources.js';
import {referenceHeadAssets,readReferenceHeadAsset} from '../packages/animation/forest-head-art.js';
import {referenceBodyAssets} from '../packages/animation/forest-body-art.js';
import {renderSourceCinematicPreview} from '../library/shots/cinematic.js';
import {secureSceneFiles,validateSourcePreviewFiles,SCENE_SECURITY_VERSION} from '../packages/scenes/security.js';
import {SOURCE_PREVIEW_SCOPE} from '../packages/scenes/source-preview-scope.js';
import {readSourcePreviewProject,assertSourcePreviewProjectCurrent,readPreviewBytes,previewRasterPath,MAX_PREVIEW_RESOURCE_BYTES} from '../packages/scenes/source-preview-project.js';

const require=createRequire(import.meta.url),execFileAsync=promisify(execFile);
export function sourcePreviewOptions(args:string[]){
  const {values}=parseArgs({args,strict:true,allowPositionals:false,options:{project:{type:'string'},shot:{type:'string'},help:{type:'boolean'}}});
  if(!values.help&&(!values.project||!path.isAbsolute(values.project)||!values.shot||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(values.shot)))throw new Error('Use --project <absolute existing project path> --shot <original shot ID>');
  return {project:values.project,shot:values.shot,help:!!values.help};
}

export async function exportSourcePreview(projectRoot:string,shotId:string):Promise<string>{
  const repo=await fs.realpath(await findRepoRoot()),snapshot=await readSourcePreviewProject(projectRoot),{input,activity,manifest}=snapshot;
  const shots=input.board.shots.filter(s=>s.id===shotId);if(shots.length!==1)throw new Error('needs-source-preview-context: original shot not found or duplicated');
  const shot=shots[0]!,scene=shot.cinematic?.actorScene;
  const appearances=scene?[...(scene.primary?[scene.primary.appearance]:[]),...scene.supporting.map(a=>a.character.appearance)]:[input.profile.appearance];
  const resources=new Map(appearances.flatMap(a=>[...referenceHeadAssets(a),...referenceBodyAssets(a)]).map(r=>[r.path,r]));
  const allowed=actorRigResourcePaths(shot,input.profile);
  if(resources.size!==allowed.length||allowed.some(p=>!resources.has(p)))throw new Error('needs-source-preview-context: canonical rig resource allowlist differs');
  const staged=new Map<string,Buffer>(),resourceReceipts:Array<{path:string;sha256:string;bytes:number;scope:string}>=[];
  const stage=(relative:string,bytes:Buffer,scope:string)=>{if(staged.has(relative)&&hash(staged.get(relative))!==hash(bytes))throw new Error('needs-source-preview-context: conflicting resource path');staged.set(relative,bytes);resourceReceipts.push({path:relative,sha256:hash(bytes),bytes:bytes.length,scope});};
  for(const resource of resources.values())stage(resource.path,readReferenceHeadAsset(resource),'registered own rig resource');
  const selected=manifest.assets.filter(a=>a.shotIds.includes(shot.id)||shot.assetNeeds.some(n=>n.id===a.id)||a.id===shot.cinematic?.environmentAssetId);
  const projectResources=new Map<string,{bytes:Buffer;sha256:string}>();
  for(const need of shot.assetNeeds.filter(n=>n.required))if(selected.filter(a=>a.id===need.id&&a.status==='approved').length!==1)throw new Error(`needs-source-preview-context: required original asset ${need.id} is missing/ambiguous/unapproved`);
  for(const asset of selected.filter(a=>a.status==='approved')){
    const bytes=(await readPreviewBytes(snapshot.root,asset.path,MAX_PREVIEW_RESOURCE_BYTES))!;
    if(hash(bytes)!==asset.hash)throw new Error(`needs-source-preview-context: original asset changed: ${asset.id}`);
    projectResources.set(asset.path,{bytes,sha256:asset.hash});
  }
  let environment:{assetId:string;path:string;sha256:string}|undefined;
  if(shot.cinematic?.environmentAssetId){
    const matches=manifest.assets.filter(a=>a.id===shot.cinematic!.environmentAssetId&&a.status==='approved');
    if(matches.length!==1)throw new Error('needs-source-preview-context: original environment missing/ambiguous/unapproved');
    const asset=matches[0]!,bytes=projectResources.get(asset.path)!.bytes,background=previewRasterPath(asset.path,bytes,asset.hash);environment={assetId:asset.id,path:background,sha256:asset.hash};stage(background,bytes,'unchanged original environment raster');allowed.push(background);
  }
  let audioReceipt:{path:string;sha256:string;bytes:number}|null=null;
  if(activity.method==='audio-rms'){
    if(!input.narration.audioPath||!activity.audioHash)throw new Error('needs-source-preview-context: measured activity needs its original audio receipt');
    const bytes=(await readPreviewBytes(snapshot.root,input.narration.audioPath,256*1024*1024))!;
    if(hash(bytes)!==activity.audioHash)throw new Error('needs-source-preview-context: original audio differs from speech activity');
    audioReceipt={path:input.narration.audioPath,sha256:hash(bytes),bytes:bytes.length};
  }
  const rendered=renderSourceCinematicPreview(input,shotId,activity,environment),files=secureSceneFiles(rendered.files);
  const errors=validateSourcePreviewFiles(files,shot,input.config.workflow.max_scene_bytes,allowed,input.config.rendering.final);
  if(errors.length)throw new Error(`needs-source-preview-context: diagnostic scene validation failed: ${errors.join('; ')}`);
  const gsap=await fs.readFile(require.resolve('gsap/dist/gsap.min.js'));stage('vendor/gsap.min.js',gsap,'local GSAP runtime');
  await assertSourcePreviewProjectCurrent(snapshot);
  const parent=await outputPath(repo,'runtime/prehistoric-life/source-previews');
  const relativeToProject=path.relative(snapshot.root,parent);
  if(relativeToProject===''||relativeToProject!=='..'&&!relativeToProject.startsWith('..'+path.sep)&&!path.isAbsolute(relativeToProject))throw new Error('Source preview destination must be outside the input project');
  await fs.mkdir(parent,{recursive:true});
  const output=await outputPath(repo,'runtime/prehistoric-life/source-previews/preview-'+randomUUID());await fs.mkdir(output);
  let sourceSHA:string|null=null,trackedSourceDirty:boolean|null=null;
  try{const sha=(await execFileAsync('git',['rev-parse','HEAD'],{cwd:repo,timeout:10000,windowsHide:true})).stdout.trim();if(/^[a-f0-9]{40}$/.test(sha))sourceSHA=sha;
    trackedSourceDirty=!!(await execFileAsync('git',['status','--porcelain','--untracked-files=no'],{cwd:repo,timeout:10000,windowsHide:true})).stdout.trim();}catch{/* Archive builds have no Git receipt. */}
  const report={...rendered.preview,status:'exporting',sourceSHA,trackedSourceDirty,securityVersion:SCENE_SECURITY_VERSION,
    narrationFile:snapshot.narrationFile,fileReceipts:snapshot.fileReceipts,resourceReceipts,audioReceipt,
    sceneReceipts:Object.fromEntries(files.files.map(f=>[f.path,hash(f.content)])),
    freshness:'optimistic source/host/settings/project-resource/rig/GSAP re-read; not an OS snapshot or publication authority',
    runtimePlayback:'NOT RUN',artMotionReview:'NOT RUN',fullFactoryAcceptance:'NOT RUN',audioIncluded:false,outputRoot:output};
  const save=async(status:string,error?:string)=>writeJson(await outputPath(output,'preview-report.json'),{...report,status,...(error?{error}:{} )});
  try{
    for(const file of files.files)await writeAtomic(await outputPath(output,file.path),file.content);
    for(const [file,bytes]of staged)await writeAtomic(await outputPath(output,file),bytes);
    await writeJson(await outputPath(output,'source-snapshot.json'),{scope:SOURCE_PREVIEW_SCOPE,board:input.board,narration:input.narration,beats:input.beats,characters:input.characters,profile:input.profile,rig:input.rig,activity});
    await writeJson(await outputPath(output,'emission-report.json'),{scope:SOURCE_PREVIEW_SCOPE,geometry:rendered.geometry,performance:rendered.report,productionApproval:false,motionVerified:false});
    await assertSourcePreviewProjectCurrent(snapshot);
    for(const [file,resource]of projectResources)if(hash((await readPreviewBytes(snapshot.root,file,MAX_PREVIEW_RESOURCE_BYTES))!)!==resource.sha256)throw new Error('Original project asset changed during preview export');
    if(audioReceipt&&hash((await readPreviewBytes(snapshot.root,audioReceipt.path,256*1024*1024))!)!==audioReceipt.sha256)throw new Error('Original audio changed during preview export');
    for(const resource of resources.values())if(hash(readReferenceHeadAsset(resource))!==hash(staged.get(resource.path)))throw new Error('Own rig resource changed during preview export');
    if(hash(await fs.readFile(require.resolve('gsap/dist/gsap.min.js')))!==hash(gsap))throw new Error('Local GSAP runtime changed during preview export');
    for(const file of files.files)if(hash(await fs.readFile(await outputPath(output,file.path)))!==hash(file.content))throw new Error('Diagnostic scene bytes changed during export');
    for(const [file,bytes]of staged)if(hash(await fs.readFile(await outputPath(output,file)))!==hash(bytes))throw new Error('Diagnostic resource bytes changed during export');
    await save('exported');return output;
  }catch(error){await save('failed',redact(error instanceof Error?error.message:String(error)));throw error;}
}
async function main(){
  const options=sourcePreviewOptions(process.argv.slice(2));
  if(options.help){process.stdout.write('User QA only: npm run source:preview -- --project <absolute project path> --shot <original shot ID>\nExports silent unapproved HTML5 only; no server/browser/providers/audio/video/final.\n');return;}
  const output=await exportSourcePreview(options.project!,options.shot!);
  process.stdout.write(JSON.stringify({scope:SOURCE_PREVIEW_SCOPE,outputRoot:output,report:path.join(output,'preview-report.json'),canPublish:false,audioIncluded:false})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{process.stderr.write(redact(error instanceof Error?error.message:String(error))+'\n');process.exitCode=1;});
