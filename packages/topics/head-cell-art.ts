import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {z} from 'zod';
import {hash} from '../core/utils.js';

export const HEAD_CELL_FOLDER='library/topics/prehistoric-life/head-cells';
export const HeadCellFileSchema=z.string().max(90).regex(/^(lila|karo)-head-[a-z0-9][a-z0-9-]{0,39}-v[1-9]\d*\.png$(?![\s\S])/);
const Sha=z.string().length(64).regex(/^[a-f0-9]{64}$/),Count=z.number().int().nonnegative();
const Ref=z.object({file:z.string().max(250),sha256:Sha,role:z.enum(['primary-character-identity','edit-target'])}).strict();
// Null is an explicit source-angle-preservation request, never an inferred0°.
// No default is supplied; existing finite-angle records keep identical bytes.
export const HeadCellPromptSchema=z.object({version:z.literal('native-head-cell-prompt-1'),actor:z.enum(['lila','karo']),provider:z.literal('builtin-imagegen'),
  prompt:z.string().min(1).max(24000),referenceImages:z.array(Ref).min(1).max(2),generatedOriginal:z.string().min(1).max(4096),requestedYawDeg:z.number().finite().min(-90).max(90).nullable(),
  scope:z.literal('static-art-authoring-only'),approved:z.literal(false),registered:z.literal(false),productionReady:z.literal(false),runtimeVerified:z.literal(false),
}).strict().superRefine((p,ctx)=>{
  const primary=p.referenceImages.filter(r=>r.role==='primary-character-identity'),edit=p.referenceImages.filter(r=>r.role==='edit-target');
  if(primary.length!==1||primary[0]?.file!==`docs/topics/assets/reference-${p.actor}-full.png`||edit.length>1)ctx.addIssue({code:'custom',message:'Single head source needs its one original actor identity reference'});
  for(const r of edit)if(!r.file.startsWith(HEAD_CELL_FOLDER+'/')||!HeadCellFileSchema.safeParse(r.file.slice(HEAD_CELL_FOLDER.length+1)).success||!r.file.startsWith(HEAD_CELL_FOLDER+'/'+p.actor+'-head-'))ctx.addIssue({code:'custom',message:'Single head edit target must belong to the same actor/source folder'});
});
export const HeadCellMaterialSchema=z.object({version:z.literal('native-head-cell-material-1'),actor:z.enum(['lila','karo']),file:HeadCellFileSchema,sha256:Sha,
  promptFile:z.string().max(250),promptSha256:Sha,references:z.array(Ref).min(1).max(2),
  width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192),hasAlpha:z.literal(true),alphaThreshold:z.literal(8),
  transparentPixels:Count,visiblePixels:z.number().int().positive(),opaquePixels:Count,partialPixels:Count,edgePixels:Count,
  alphaHistogram:z.array(Count).length(256),pixelSha256:Sha,
  visibleBounds:z.object({x:Count,y:Count,width:z.number().int().positive(),height:z.number().int().positive()}).strict(),
  requestedYawDeg:z.number().finite().min(-90).max(90).nullable(),yawMeasured:z.literal(false),findings:z.array(z.string().min(1).max(2000)).min(1).max(20),
  status:z.literal('unreviewed-source-candidate'),approved:z.literal(false),registered:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),
}).strict().superRefine((m,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  if(!m.file.startsWith(m.actor+'-head-')||m.promptFile!==`${HEAD_CELL_FOLDER}/${m.file.slice(0,-4)}-prompt.json`)fail('Single head material actor/path differs');
  const total=m.width*m.height,b=m.visibleBounds;
  if(total>20_000_000||m.alphaHistogram.reduce((a,n)=>a+n,0)!==total||m.transparentPixels!==m.alphaHistogram[0]||m.opaquePixels!==m.alphaHistogram[255]||m.partialPixels!==m.alphaHistogram.slice(1,255).reduce((a,n)=>a+n,0)||m.visiblePixels!==m.alphaHistogram.slice(8).reduce((a,n)=>a+n,0)||!m.transparentPixels)fail('Single head alpha measurement differs');
  if(b.x+b.width>m.width||b.y+b.height>m.height||m.visiblePixels>b.width*b.height||m.edgePixels>m.visiblePixels)fail('Single head visible source bounds differ');
});
export type HeadCellMaterial=z.infer<typeof HeadCellMaterialSchema>;
export type HeadCellPrompt=z.infer<typeof HeadCellPromptSchema>;

export async function readHeadCellSource(repo:string,file:string,maxBytes=40*1024*1024){
  const relative=file.startsWith(HEAD_CELL_FOLDER+'/')?file.slice(HEAD_CELL_FOLDER.length+1):undefined;
  const pngName=relative?.replace(/(?:-prompt)?\.json$/,'.png');
  const knownCell=relative!==undefined&&HeadCellFileSchema.safeParse(pngName).success&&[pngName,pngName!.slice(0,-4)+'.json',pngName!.slice(0,-4)+'-prompt.json'].includes(relative);
  if(!/^docs\/topics\/assets\/reference-(lila|karo)-full\.png$(?![\s\S])/.test(file)&&!knownCell)throw new Error('Unknown single head source path');
  let target=path.resolve(repo);const parts=file.split('/');
  for(const [i,part] of parts.entries()){
    target=path.join(target,part);const stat=await fs.lstat(target);
    if(stat.isSymbolicLink()||(i===parts.length-1?!stat.isFile()||stat.size>maxBytes:!stat.isDirectory()))throw new Error('Linked/oversized single head source');
  }
  const bytes=await fs.readFile(target);if(bytes.length>maxBytes)throw new Error('Oversized single head source');return bytes;
}
/** Static raw RGBA inspection only; no raster edit, masks, inferred landmarks,
 * face correspondence, anatomy, yaw measurement, sampler or animation. */
export async function measureHeadCellPng(bytes:Buffer){
  if(bytes.length>40*1024*1024)throw new Error('Oversized single head image');
  const image=sharp(bytes,{limitInputPixels:20_000_000}),m=await image.metadata();
  if(m.format!=='png'||!m.width||!m.height||!m.hasAlpha||m.pages&&m.pages!==1)throw new Error('Single head source must be one RGBA PNG');
  const {data,info}=await image.raw().toBuffer({resolveWithObject:true});if(info.channels!==4)throw new Error('Single head source must retain RGBA');
  const alphaHistogram=Array<number>(256).fill(0);let left=info.width,right=-1,top=info.height,bottom=-1,edgePixels=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const alpha=data[(y*info.width+x)*4+3]!;alphaHistogram[alpha]=alphaHistogram[alpha]!+1;
    if(alpha>=8){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);if(!x||!y||x===info.width-1||y===info.height-1)edgePixels++;}
  }
  const visiblePixels=alphaHistogram.slice(8).reduce((a,n)=>a+n,0);if(!alphaHistogram[0]||!visiblePixels)throw new Error('Single head image needs real transparent margin and visible ink');
  return {width:info.width,height:info.height,hasAlpha:true as const,alphaThreshold:8 as const,transparentPixels:alphaHistogram[0]!,visiblePixels,opaquePixels:alphaHistogram[255]!,partialPixels:alphaHistogram.slice(1,255).reduce((a,n)=>a+n,0),edgePixels,alphaHistogram,pixelSha256:hash(data),visibleBounds:{x:left,y:top,width:right-left+1,height:bottom-top+1}};
}
export async function headCellMaterial(repo:string,file:string){
  HeadCellFileSchema.parse(file);
  const record=HeadCellMaterialSchema.parse(JSON.parse((await readHeadCellSource(repo,`${HEAD_CELL_FOLDER}/${file.slice(0,-4)}.json`,200*1024)).toString('utf8')));
  if(record.file!==file)throw new Error('Single head record/file differs');
  const bytes=await readHeadCellSource(repo,`${HEAD_CELL_FOLDER}/${file}`);if(hash(bytes)!==record.sha256)throw new Error('Single head source changed; author a new version');
  const measured=await measureHeadCellPng(bytes);for(const key of Object.keys(measured) as (keyof typeof measured)[])if(hash(measured[key])!==hash(record[key]))throw new Error('Single head source measurement differs: '+key);
  const promptBytes=await readHeadCellSource(repo,record.promptFile,200*1024);if(hash(promptBytes)!==record.promptSha256)throw new Error('Single head prompt changed');
  const prompt=HeadCellPromptSchema.parse(JSON.parse(promptBytes.toString('utf8')));
  if(prompt.actor!==record.actor||hash(prompt.referenceImages)!==hash(record.references)||prompt.requestedYawDeg!==record.requestedYawDeg)throw new Error('Single head prompt/source ownership differs');
  await validateHeadCellPromptSources(repo,record.actor,file,prompt);return {record,bytes};
}
export async function validateHeadCellPromptSources(repo:string,actor:'lila'|'karo',file:string,prompt:HeadCellPrompt){
  HeadCellFileSchema.parse(file);if(prompt.actor!==actor||!file.startsWith(actor+'-head-'))throw new Error('Single head prompt actor differs');
  for(const ref of prompt.referenceImages){if(ref.file===`${HEAD_CELL_FOLDER}/${file}`)throw new Error('Single head edit cannot refer to its own output');if(hash(await readHeadCellSource(repo,ref.file))!==ref.sha256)throw new Error('Single head reference changed');}
}
export async function headCellInventory(repo:string){
  const folder=path.join(repo,HEAD_CELL_FOLDER),stat=await fs.lstat(folder);if(stat.isSymbolicLink()||!stat.isDirectory())throw new Error('Linked single head folder');
  const files=(await fs.readdir(folder)).filter(file=>HeadCellFileSchema.safeParse(file.replace(/\.json$/,'.png')).success&&file.endsWith('.json')&&!file.endsWith('-prompt.json')).sort();
  return Promise.all(files.map(async file=>(await headCellMaterial(repo,file.replace(/\.json$/,'.png'))).record));
}
export const headCellArtDescription={version:'native-head-cell-material-1',method:'individual original PNGs with immutable raw RGBA/provenance measurement; explicit angle request or null preserving primary orientation, never inferred registration',registered:false,approved:false,productionReady:false,motionVerified:false,availableBanks:[],pending:['identity and adjacent-view correspondence','source neck/eye/chin/mouth/seam/mask registrations','full speech/emotion/body turn and normal-speed whole-factory acceptance']};
