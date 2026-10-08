import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {findRepoRoot} from '../packages/core/config.js';
import {hash,writeJson} from '../packages/core/utils.js';
import {HEAD_CELL_FOLDER,HeadCellFileSchema,HeadCellPromptSchema,HeadCellMaterialSchema,readHeadCellSource,measureHeadCellPng,validateHeadCellPromptSources,headCellInventory,headCellMaterial,headCellArtDescription} from '../packages/topics/head-cell-art.js';

// Immutable static PNG authoring only. No inference, sampler, scene or tests.
// requestedYawDeg:null preserves source orientation; unknown is never zero.
const repo=await findRepoRoot(),folder=path.join(repo,HEAD_CELL_FOLDER);
const files=(await fs.readdir(folder)).filter(file=>HeadCellFileSchema.safeParse(file).success).sort();
for(const file of files){
  const target=path.join(folder,file.slice(0,-4)+'.json');
  let existing=false;
  try{await fs.access(target);existing=true;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  if(existing){await headCellMaterial(repo,file);continue;} // Keep old immutable findings.
  const promptFile=`${HEAD_CELL_FOLDER}/${file.slice(0,-4)}-prompt.json`,promptBytes=await readHeadCellSource(repo,promptFile,200*1024);
  const prompt=HeadCellPromptSchema.parse(JSON.parse(promptBytes.toString('utf8')));
  await validateHeadCellPromptSources(repo,prompt.actor,file,prompt);
  const bytes=await readHeadCellSource(repo,`${HEAD_CELL_FOLDER}/${file}`);
  // Only original author outputs may be read; repo API has no external-path IO.
  const outputRoot=path.resolve(process.env.CODEX_HOME??path.join(os.homedir(),'.codex'),'generated_images');
  const original=path.resolve(prompt.generatedOriginal),relative=path.relative(outputRoot,original);
  if(path.isAbsolute(relative)||relative.startsWith('..')||!relative.toLowerCase().endsWith('.png'))throw new Error('Original is outside generated image root');
  const rootStat=await fs.lstat(outputRoot);if(!rootStat.isDirectory()||rootStat.isSymbolicLink())throw new Error('Linked generated image root');
  let cursor=outputRoot;const parts=relative.split(path.sep);
  for(const [i,part] of parts.entries()){
    cursor=path.join(cursor,part);const stat=await fs.lstat(cursor);
    if(stat.isSymbolicLink()||(i===parts.length-1?!stat.isFile()||stat.size>40*1024*1024:!stat.isDirectory()))throw new Error('Linked/oversized generated image source');
  }
  const originalBytes=await fs.readFile(original);if(originalBytes.length>40*1024*1024||!originalBytes.equals(bytes))throw new Error('Single PNG differs from generated original');
  const measured=await measureHeadCellPng(bytes);
  const record=HeadCellMaterialSchema.parse({version:'native-head-cell-material-1',actor:prompt.actor,file,sha256:hash(bytes),promptFile,promptSha256:hash(promptBytes),references:prompt.referenceImages,...measured,requestedYawDeg:prompt.requestedYawDeg,yawMeasured:false,
    findings:['Original generated PNG bytes retained unchanged; identity, colour, ink and face quality require primary comparison.','Source angle is not measured. Null requested yaw means original orientation; no implicit zero-degree front view.','Neck/skull/face/eyes/mouth/seam/masks/adjacent correspondence unregistered; speech/blink/emotion/body compatibility/motion acceptance pending.'],
    status:'unreviewed-source-candidate',approved:false,registered:false,productionReady:false,motionVerified:false});
  await fs.writeFile(target,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
}
const materials=await headCellInventory(repo);
await writeJson(path.join(repo,HEAD_CELL_FOLDER,'inventory-v1.json'),{...headCellArtDescription,materials,fingerprint:hash(materials),productionRig:null});
console.log(JSON.stringify({materials:materials.length,source:'original-individual-RGBA',yawMeasured:false,registered:false,productionReady:false,motionVerified:false}));
