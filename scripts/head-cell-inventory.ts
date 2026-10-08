import {promises as fs} from 'node:fs';
import path from 'node:path';
import {findRepoRoot} from '../packages/core/config.js';
import {hash,writeJson} from '../packages/core/utils.js';
import {HEAD_CELL_FOLDER,HeadCellPromptSchema,HeadCellMaterialSchema,readHeadCellSource,measureHeadCellPng,validateHeadCellPromptSources,headCellInventory,headCellArtDescription} from '../packages/topics/head-cell-art.js';

// Immutable static single-PNG authoring/provenance inventory only. NOT tests,
// masks/landmark inference, compiler evaluation, runtime or video generation.
const repo=await findRepoRoot();
for(const angle of ['front','near-right']){
  const file=`lila-head-${angle}-v1.png`,promptFile=`${HEAD_CELL_FOLDER}/${file.slice(0,-4)}-prompt.json`,promptBytes=await readHeadCellSource(repo,promptFile,200*1024),prompt=HeadCellPromptSchema.parse(JSON.parse(promptBytes.toString('utf8')));
  await validateHeadCellPromptSources(repo,'lila',file,prompt);
  const bytes=await readHeadCellSource(repo,`${HEAD_CELL_FOLDER}/${file}`),measured=await measureHeadCellPng(bytes);
  const record=HeadCellMaterialSchema.parse({version:'native-head-cell-material-1',actor:'lila',file,sha256:hash(bytes),promptFile,promptSha256:hash(promptBytes),references:prompt.referenceImages,...measured,requestedYawDeg:prompt.requestedYawDeg,yawMeasured:false,
    findings:['Primary warmth/closed smile/long hair retained broadly; ink/face identity still need independent source comparison.','This one PNG has no registered neck/skull/eye/chin/mouth/seam/painter geometry or per-cell speech/emotion capabilities.','Requested front or8degree yaw is not measured. Adjacent source shape, hair/tie/eye-line and attachment correspondence remain unapproved.'],
    status:'unreviewed-source-candidate',approved:false,registered:false,productionReady:false,motionVerified:false});
  const target=path.join(repo,HEAD_CELL_FOLDER,file.slice(0,-4)+'.json');
  try{if(hash(JSON.parse(await fs.readFile(target,'utf8')))!==hash(record))throw new Error('Immutable single head record changed; author a new version');}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;await fs.writeFile(target,JSON.stringify(record,null,2)+'\n',{flag:'wx'});}
}
const materials=await headCellInventory(repo);
await writeJson(path.join(repo,HEAD_CELL_FOLDER,'inventory-v1.json'),{...headCellArtDescription,materials,fingerprint:hash(materials),productionRig:null});
console.log(JSON.stringify({materials:materials.length,source:'original-individual-RGBA',yawMeasured:false,registered:false,productionReady:false,motionVerified:false}));
