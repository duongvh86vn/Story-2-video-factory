import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {hash} from '../core/utils.js';
import {HEAD_TURN_FOLDER,HEAD_TURN_MATERIAL_VERSION,HeadTurnFileSchema,HeadTurnMaterialSchema,HeadTurnPromptSchema,headTurnCellRegion,type HeadTurnMaterial,type HeadTurnPrompt} from './head-turn-schemas.js';

const MAX_IMAGE_BYTES=40*1024*1024,MAX_JSON_BYTES=200*1024;
/** Known repository-relative files only, with every descendant checked. Never
 * follow a linked candidate folder/file or read arbitrary prompt paths. */
export async function readHeadTurnSource(repo:string,file:string,maxBytes=MAX_IMAGE_BYTES){
  if(!/^docs\/topics\/assets\/reference-(lila|karo)-full\.png$/.test(file)&&!new RegExp(`^${HEAD_TURN_FOLDER}/(lila|karo)-head-turn-v[1-9]\\d*(?:-prompt)?\\.(png|json)$`).test(file))throw new Error('Unknown head turn source path');
  let target=path.resolve(repo);
  for(const [i,part] of file.split('/').entries()){
    target=path.join(target,part);const stat=await fs.lstat(target);
    if(stat.isSymbolicLink()||(i===file.split('/').length-1?!stat.isFile()||stat.size>maxBytes:!stat.isDirectory()))throw new Error('Invalid linked/oversized head turn source: '+file);
  }
  return fs.readFile(target);
}
export const headTurnMaterialPath=(file:string)=>`${HEAD_TURN_FOLDER}/${HeadTurnFileSchema.parse(file).slice(0,-4)}.json`;
export const headTurnPromptPath=(file:string)=>`${HEAD_TURN_FOLDER}/${HeadTurnFileSchema.parse(file).slice(0,-4)}-prompt.json`;
/** Writer and reader share this precondition. Persisting an immutable material
 * before validating source ownership would leave an unusable stale record. */
export async function validateHeadTurnPromptSources(repo:string,actor:'lila'|'karo',file:string,prompt:HeadTurnPrompt){
  HeadTurnFileSchema.parse(file);
  if(prompt.actor!==actor||!file.startsWith(actor+'-head-turn-'))throw new Error('Head turn prompt/material ownership differs');
  for(const ref of prompt.referenceImages){
    if(ref.role==='edit-target'&&ref.file===`${HEAD_TURN_FOLDER}/${file}`)throw new Error('Head turn repair cannot use its output as the edit target');
    if(hash(await readHeadTurnSource(repo,ref.file))!==ref.sha256)throw new Error('Head turn reference changed: '+ref.file);
  }
}

/** Static original RGBA measurement only. No image rewrite, crop asset, body
 * sampler, animation evaluator, render, video or semantic yaw inference. */
export async function measureHeadTurnPng(bytes:Buffer){
  if(bytes.length>MAX_IMAGE_BYTES)throw new Error('Head turn image is oversized');
  const image=sharp(bytes,{limitInputPixels:20_000_000}),m=await image.metadata();
  if(m.format!=='png'||!m.width||!m.height||!m.hasAlpha||m.width<4||m.height<4||m.pages&&m.pages!==1)throw new Error('Head turn source must be a single RGBA PNG with a4x4 canvas');
  const {data,info}=await image.raw().toBuffer({resolveWithObject:true});
  if(info.channels!==4||info.width!==m.width||info.height!==m.height)throw new Error('Head turn source must retain RGBA');
  const width=m.width,height=m.height;
  let transparentPixels=0,opaquePixels=0,visiblePixels=0;
  for(let a=3;a<data.length;a+=4){if(data[a]===0)transparentPixels++;if(data[a]===255)opaquePixels++;if(data[a]!>=8)visiblePixels++;}
  if(!transparentPixels||!visiblePixels)throw new Error('Head turn PNG has no real transparent margin/visible artwork');
  const cells=[];
  for(let i=0;i<16;i++){
    const {x,y,width:cw,height:ch}=headTurnCellRegion(width,height,i+1),cellBytes=Buffer.alloc(cw*ch*4);
    let left=width,right=-1,top=height,bottom=-1,pixels=0,edgePixels=0;
    for(let row=0;row<ch;row++){
      data.copy(cellBytes,row*cw*4,((y+row)*width+x)*4,((y+row)*width+x+cw)*4);
      for(let col=0;col<cw;col++)if(data[((y+row)*width+x+col)*4+3]!>=8){
        pixels++;left=Math.min(left,x+col);right=Math.max(right,x+col);top=Math.min(top,y+row);bottom=Math.max(bottom,y+row);
        if(row===0||row===ch-1||col===0||col===cw-1)edgePixels++;
      }
    }
    if(!pixels)throw new Error('Empty head turn cell: '+(i+1));
    cells.push({index:i+1,region:{x,y,width:cw,height:ch},visibleBounds:{x:left,y:top,width:right-left+1,height:bottom-top+1},visiblePixels:pixels,edgePixels,pixelSha256:hash(cellBytes)});
  }
  return {width,height,columns:4 as const,rows:4 as const,hasAlpha:true as const,alphaThreshold:8 as const,transparentPixels,visiblePixels,opaquePixels,cells};
}

export async function headTurnMaterial(repo:string,file:string){
  HeadTurnFileSchema.parse(file);
  const record=HeadTurnMaterialSchema.parse(JSON.parse((await readHeadTurnSource(repo,headTurnMaterialPath(file),MAX_JSON_BYTES)).toString('utf8')));
  if(record.file!==file)throw new Error('Head turn material/file ownership differs');
  const bytes=await readHeadTurnSource(repo,`${HEAD_TURN_FOLDER}/${file}`);
  if(hash(bytes)!==record.sha256)throw new Error('Head turn image changed; create a new version');
  const measured=await measureHeadTurnPng(bytes);
  for(const key of Object.keys(measured) as (keyof typeof measured)[])if(hash(measured[key])!==hash(record[key]))throw new Error('Head turn measured metadata differs: '+key);
  const promptBytes=await readHeadTurnSource(repo,record.promptFile,MAX_JSON_BYTES);
  if(hash(promptBytes)!==record.promptSha256)throw new Error('Head turn prompt provenance changed');
  const prompt=HeadTurnPromptSchema.parse(JSON.parse(promptBytes.toString('utf8')));
  if(prompt.actor!==record.actor||hash(prompt.referenceImages)!==hash(record.references)||hash(prompt.requestedYawDeg)!==hash(record.requestedYawDeg))throw new Error('Head turn prompt/material ownership differs');
  await validateHeadTurnPromptSources(repo,record.actor,record.file,prompt);
  return {record,bytes};
}
export async function headTurnInventory(repo:string):Promise<HeadTurnMaterial[]>{
  const folder=path.join(repo,HEAD_TURN_FOLDER),stat=await fs.lstat(folder);
  if(stat.isSymbolicLink()||!stat.isDirectory())throw new Error('Invalid head turn folder');
  const names=(await fs.readdir(folder)).filter(n=>/^(lila|karo)-head-turn-v[1-9]\d*\.json$/.test(n)).sort();
  return Promise.all(names.map(async n=>(await headTurnMaterial(repo,n.slice(0,-5)+'.png')).record));
}
export const headTurnArtDescription={version:HEAD_TURN_MATERIAL_VERSION,
  workbench:'/api/topics/prehistoric-life/head-turn-art',handoff:'docs/topics/NATIVE-HEAD-TURN-HANDOFF.md',
  method:'immutable authored16-cell heads; measured original RGBA grid/hash/alpha; manual source landmarks and independent anatomical/identity review required',
  selection:null,registered:false,approved:false,productionReady:false,motionVerified:false,
  limits:['requested yaw/neck alignment in a prompt is not measured source geometry','latest front-to-profile studies improve directional range but repeat late angles, change hair/beard identity and touch cell margins; static inspection is not acceptance','no accepted turn rig or registered available bank; Lila V1-V4 and Karo V1-V3 are held','source0.46 has a separately selected original head-clock/registered-cell renderer contract for future registered art; it is not selected by a draft or inventory','per-cell mouth/eye/occlusion registration and runtime head-clock equivalence still required; bank7/face3 source occlusion is not an authored or accepted cell','single-face native source and current fixed3/4 head/body remain unchanged']};
