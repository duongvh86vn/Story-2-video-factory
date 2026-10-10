// Explicit static asset authoring. No model call, matting, rig registration or
// renderer execution. A held study can only become another unreviewed candidate.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {findRepoRoot} from '../packages/core/config.js';
import {hash,writeJson} from '../packages/core/utils.js';
import {HEAD_PROFILE_FOLDER,readHeadProfileArtifact,validateGeminiHeadProvenance} from '../packages/topics/head-profile-provenance.js';
import {HEAD_CELL_FOLDER,HeadCellPromptSchema,HeadCellFileSchema,HeadCellMaterialSchema,measureHeadCellPng,headCellInventory,headCellArtDescription} from '../packages/topics/head-cell-art.js';

async function main(){
  const {values:v}=parseArgs({options:{generation:{type:'string'},matte:{type:'string'},version:{type:'string'},import:{type:'boolean',default:false}}});
  const match=v.generation?.match(/^(lila|karo)-profile-(left|right)-v[1-9]\d*$(?![\s\S])/);
  if(!v.import||!match||!v.version||!/^v[1-9]\d*$(?![\s\S])/.test(v.version)||(v.matte!==undefined&&!/^v[1-9]\d*$(?![\s\S])/.test(v.matte)))throw Error('Use --generation <actor-profile-side-vN> --version vN [--matte vN] --import');
  const repo=await findRepoRoot(),generationFile=`${HEAD_PROFILE_FOLDER}/${v.generation}.json`,generationBytes=await readHeadProfileArtifact(repo,generationFile,200*1024),generation=JSON.parse(generationBytes.toString('utf8'));
  const matteFile=v.matte?`${HEAD_PROFILE_FOLDER}/${v.generation}-matte-${v.matte}.json`:undefined;
  const matteBytes=matteFile?await readHeadProfileArtifact(repo,matteFile,200*1024):undefined;
  const matte=matteBytes?JSON.parse(matteBytes.toString('utf8')):undefined;
  const file=HeadCellFileSchema.parse(`${match[1]}-head-profile-${match[2]}-${v.version}.png`),stem=file.slice(0,-4),folder=path.join(repo,HEAD_CELL_FOLDER);
  const prompt=HeadCellPromptSchema.parse({version:'native-head-cell-prompt-2',actor:match[1],provider:'9router-gemini',model:'ag/gemini-3.1-flash-image',prompt:generation.prompt,
    referenceImages:[{file:generation.referencePath,sha256:generation.referenceSha256,role:'primary-character-identity'}],generatedOriginal:HEAD_PROFILE_FOLDER+'/'+(matte?matte.output?.file:generation.image),requestedYawDeg:generation.requestedYawDeg,
    provenance:{generation:{file:generationFile,sha256:hash(generationBytes)},...(matteFile&&matteBytes?{matte:{file:matteFile,sha256:hash(matteBytes)}}:{})},
    scope:'static-art-authoring-only',approved:false,registered:false,productionReady:false,runtimeVerified:false});
  if(prompt.version!=='native-head-cell-prompt-2')throw Error('Unexpected source contract');
  const bytes=await validateGeminiHeadProvenance(repo,prompt),measured=await measureHeadCellPng(bytes),promptBytes=Buffer.from(JSON.stringify(prompt,null,2)+'\n');
  const record=HeadCellMaterialSchema.parse({version:'native-head-cell-material-1',actor:prompt.actor,file,sha256:hash(bytes),promptFile:`${HEAD_CELL_FOLDER}/${stem}-prompt.json`,promptSha256:hash(promptBytes),references:prompt.referenceImages,...measured,requestedYawDeg:prompt.requestedYawDeg,yawMeasured:false,
    findings:['Gemini generation and optional CPU matte chain verified against copied PNG bytes; provenance does not certify artwork.','Underlying study may be held for identity/edge/margin issues. Primary comparison and correction remain required.','Requested profile is intent only. Own landmarks/neck/body/face/adjacent-view/speech/motion registration and acceptance pending.'],status:'unreviewed-source-candidate',approved:false,registered:false,productionReady:false,motionVerified:false});
  // Existing output directories must be real repository directories, not links.
  let cursor=repo;for(const part of HEAD_CELL_FOLDER.split('/')){cursor=path.join(cursor,part);const s=await fs.lstat(cursor);if(s.isSymbolicLink()||!s.isDirectory())throw Error('Linked head-cell directory refused');}
  for(const name of [file,stem+'-prompt.json',stem+'.json'])try{await fs.lstat(path.join(folder,name));throw Error('Existing head-cell version refused');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  await fs.writeFile(path.join(folder,stem+'.reserved'),'reserved\n',{flag:'wx'});
  await fs.writeFile(path.join(folder,file),bytes,{flag:'wx'});
  await fs.writeFile(path.join(folder,stem+'-prompt.json'),promptBytes,{flag:'wx'});
  await fs.writeFile(path.join(folder,stem+'.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  const materials=await headCellInventory(repo);
  await writeJson(path.join(folder,'inventory-v1.json'),{...headCellArtDescription,materials,fingerprint:hash(materials),productionRig:null});
  console.log(JSON.stringify({file:`${HEAD_CELL_FOLDER}/${file}`,status:record.status,sha256:record.sha256,registered:false,productionReady:false,motionVerified:false}));
}
main().catch(()=>{process.exitCode=1;console.error('Head-cell import failed; inspect sources/receipts and partial outputs before choosing a new version. No automatic retry.');});
