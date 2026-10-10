// Source proposal via 9router coder, corrected during integration. Read-only
// provenance/pixel checks; never inference, identity approval or rig registration.
import {promises as fs,constants} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {z} from 'zod';
import {hash} from '../core/utils.js';

export const HEAD_PROFILE_FOLDER='library/topics/prehistoric-life/head-source-studies';
const generationPath=/^library\/topics\/prehistoric-life\/head-source-studies\/(lila|karo)-profile-(left|right)-v[1-9]\d*\.json$(?![\s\S])/;
const mattePath=/^library\/topics\/prehistoric-life\/head-source-studies\/(lila|karo)-profile-(left|right)-v[1-9]\d*-matte-v[1-9]\d*\.json$(?![\s\S])/;
const Sha=z.string().regex(/^[a-f0-9]{64}$(?![\s\S])/),Count=z.number().int().nonnegative().max(20_000_000);
const Descriptor=z.object({file:z.string().max(250),sha256:Sha}).strict();
export const GeminiHeadProvenanceSchema=z.object({generation:Descriptor.extend({file:z.string().max(250).regex(generationPath)}),matte:Descriptor.extend({file:z.string().max(250).regex(mattePath)}).optional()}).strict();
const Flags={approved:z.literal(false),registered:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),yawMeasured:z.literal(false)};
const Dimensions=z.object({width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192)}).strict();
const Bounds=z.object({x:Count,y:Count,width:z.number().int().positive(),height:z.number().int().positive()}).strict().nullable();
const Alpha=z.object({threshold:z.literal(8),transparentPixels:Count,visiblePixels:Count,opaquePixels:Count,borderVisiblePixels:Count,visibleBounds:Bounds}).strict();
const Generation=z.object({version:z.literal('native-profile-art-request-1'),actor:z.enum(['lila','karo']),view:z.enum(['left','right']),scope:z.literal('static-art-authoring-only'),prompt:z.string().min(1).max(24000),
  referencePath:z.string().max(250),referenceSha256:Sha,model:z.literal('ag/gemini-3.1-flash-image'),...Flags,requestedYawDeg:z.number().finite().min(-90).max(90),
  status:z.enum(['held','generated-needs-source-review']),image:z.string().max(100),sha256:Sha,dimensions:Dimensions,hasAlpha:z.boolean(),alpha:Alpha.extend({marginFraction:z.number().finite().min(0).max(1)}),
  usage:z.unknown().nullable(),requestedAt:z.string().min(1).max(100),generatedAt:z.string().min(1).max(100)}).strict();
const Matte=z.object({version:z.literal('native-profile-matte-1'),scope:z.literal('static-art-authoring-only'),...Flags,model:z.literal('onnx-community/BiRefNet_lite-ONNX'),revision:z.literal('de15b22ba131738a16dff04aab8bdf8dc32e3ac1'),license:z.literal('MIT'),
  dependency:z.object({name:z.literal('@huggingface/transformers'),version:z.literal('4.3.1')}).strict(),device:z.literal('cpu'),status:z.enum(['candidate-needs-identity-and-edge-review','held']),
  source:z.object({receipt:z.string().max(100),receiptSha256:Sha,image:z.string().max(100),sha256:Sha}).strict(),mask:Descriptor,output:Descriptor,rgbSha256Before:Sha,rgbSha256After:Sha,dimensions:Dimensions,
  alpha:Alpha.extend({histogram:z.array(Count).length(256)}),requestedAt:z.string().min(1).max(100),generatedAt:z.string().min(1).max(100)}).strict();
export type GeminiHeadProvenance=z.infer<typeof GeminiHeadProvenanceSchema>;
type Input={actor:'lila'|'karo';prompt:string;requestedYawDeg:number|null;referenceImages:Array<{file:string;sha256:string;role:string}>;generatedOriginal:string;provenance:GeminiHeadProvenance};
const maxFile=40*1024*1024,maxReceipt=200*1024;
function requireMatch(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message);}

/** Fixed repository artifacts only; callers cannot select arbitrary local files. */
export async function readHeadProfileArtifact(repo:string,file:string,limit=maxFile):Promise<Buffer>{
  requireMatch(file.length<=250&&Number.isSafeInteger(limit)&&limit>0&&limit<=maxFile,'Invalid profile read bounds');
  requireMatch(/^(?:library\/topics\/prehistoric-life\/head-source-studies\/(?:lila|karo)-profile-(?:left|right)-v[1-9]\d*(?:-matte-v[1-9]\d*(?:-mask)?)?\.(?:json|png|jpg|webp)|docs\/topics\/assets\/reference-(?:lila|karo)-full\.png)$(?![\s\S])/.test(file),'Disallowed profile provenance path');
  const root=path.resolve(repo),parts=file.split('/'),checked=[];let current=root;
  for(const [i,part] of parts.entries()){
    current=path.join(current,part);const stat=await fs.lstat(current);
    requireMatch(!stat.isSymbolicLink()&&(i===parts.length-1?stat.isFile()&&stat.size<=limit:stat.isDirectory()),'Linked/non-file/oversized profile source');
    checked.push({file:current,stat});
  }
  const before=checked.at(-1)!.stat,handle=await fs.open(current,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  try{const opened=await handle.stat();requireMatch(opened.isFile()&&opened.dev===before.dev&&opened.ino===before.ino&&opened.size<=limit,'Profile source changed');for(const entry of checked){const now=await fs.lstat(entry.file);requireMatch(!now.isSymbolicLink()&&now.dev===entry.stat.dev&&now.ino===entry.stat.ino,'Linked/changed profile source path');}const bytes=await handle.readFile();requireMatch(bytes.length<=limit,'Oversized profile source');return bytes;}finally{await handle.close();}
}
async function decode(bytes:Buffer,requirePng=false){
  requireMatch(bytes.length<=maxFile,'Oversized profile image');
  const image=sharp(bytes,{failOn:'error',limitInputPixels:20_000_000}),metadata=await image.metadata();
  requireMatch((requirePng?metadata.format==='png':['png','jpeg','webp'].includes(metadata.format??''))&&metadata.width&&metadata.height&&metadata.width<=8192&&metadata.height<=8192&&metadata.width*metadata.height<=20_000_000&&(metadata.pages??1)===1,'Invalid profile image format/dimensions');
  const {data,info}=await image.toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});requireMatch(info.channels===4,'Invalid profile RGBA');
  return {data,width:info.width,height:info.height,hasAlpha:!!metadata.hasAlpha,format:metadata.format};
}
function measure(d:Awaited<ReturnType<typeof decode>>){
  const histogram=Array<number>(256).fill(0);let visible=0,border=0,left=d.width,top=d.height,right=-1,bottom=-1;
  for(let i=0;i<d.width*d.height;i++){const a=d.data[i*4+3]!;histogram[a]=histogram[a]!+1;if(a>=8){visible++;const x=i%d.width,y=Math.floor(i/d.width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);if(!x||!y||x===d.width-1||y===d.height-1)border++;}}
  return {threshold:8 as const,histogram,transparentPixels:histogram[0]!,visiblePixels:visible,opaquePixels:histogram[255]!,borderVisiblePixels:border,visibleBounds:visible?{x:left,y:top,width:right-left+1,height:bottom-top+1}:null,marginFraction:visible?Math.min(left/d.width,top/d.height,(d.width-right-1)/d.width,(d.height-bottom-1)/d.height):0};
}
function sameAlpha(actual:ReturnType<typeof measure>,claimed:z.infer<typeof Alpha>){
  for(const key of ['threshold','transparentPixels','visiblePixels','opaquePixels','borderVisiblePixels'] as const)requireMatch(actual[key]===claimed[key],'Profile alpha measurement differs: '+key);
  requireMatch(actual.visibleBounds===null?claimed.visibleBounds===null:claimed.visibleBounds&&(['x','y','width','height'] as const).every(k=>actual.visibleBounds![k]===claimed.visibleBounds![k]),'Profile visible bounds differ');
}
function rgb(data:Buffer){const out=Buffer.alloc(data.length/4*3);for(let i=0,j=0;i<data.length;i+=4){out[j++]=data[i]!;out[j++]=data[i+1]!;out[j++]=data[i+2]!;}return out;}
function sameDimensions(d:{width:number;height:number},claimed:z.infer<typeof Dimensions>){requireMatch(d.width===claimed.width&&d.height===claimed.height,'Profile dimensions differ');}
function genuine(d:Awaited<ReturnType<typeof decode>>,a:ReturnType<typeof measure>){requireMatch(d.hasAlpha&&a.transparentPixels>0&&a.visiblePixels>0,'Profile PNG needs real alpha and visible ink');}

/** Returns original immutable PNG bytes. Provenance is not art acceptance. */
export async function validateGeminiHeadProvenance(repo:string,input:Input):Promise<Buffer>{
  const provenance=GeminiHeadProvenanceSchema.parse(input.provenance),match=provenance.generation.file.match(generationPath);
  requireMatch(match&&match[1]===input.actor,'Generation receipt actor/path mismatch');
  const stem=provenance.generation.file.slice(0,-5),name=path.posix.basename(stem),view=match[2];
  const generationBytes=await readHeadProfileArtifact(repo,provenance.generation.file,maxReceipt);requireMatch(hash(generationBytes)===provenance.generation.sha256,'Generation receipt hash mismatch');
  const generation=Generation.parse(JSON.parse(generationBytes.toString('utf8')));
  requireMatch(generation.actor===input.actor&&generation.view===view&&generation.prompt===input.prompt&&generation.requestedYawDeg===input.requestedYawDeg&&generation.requestedYawDeg===(view==='left'?-90:90),'Generation request differs from head-cell intent');
  const ref=input.referenceImages[0];requireMatch(input.referenceImages.length===1&&ref?.role==='primary-character-identity'&&ref.file===generation.referencePath&&ref.sha256===generation.referenceSha256&&ref.file===`docs/topics/assets/reference-${input.actor}-full.png`,'Gemini profile requires its one original primary reference');
  requireMatch(hash(await readHeadProfileArtifact(repo,ref.file,8*1024*1024))===ref.sha256,'Primary reference changed');
  const extension=generation.image.slice(name.length);requireMatch(generation.image.startsWith(name)&&['.jpg','.png','.webp'].includes(extension),'Generation image stem differs');
  const sourcePath=HEAD_PROFILE_FOLDER+'/'+generation.image,sourceBytes=await readHeadProfileArtifact(repo,sourcePath),source=await decode(sourceBytes);
  requireMatch(hash(sourceBytes)===generation.sha256&&source.format===(extension==='.jpg'?'jpeg':extension.slice(1))&&source.hasAlpha===generation.hasAlpha,'Generation image bytes/format differ');
  sameDimensions(source,generation.dimensions);const sourceAlpha=measure(source);sameAlpha(sourceAlpha,generation.alpha);requireMatch(sourceAlpha.marginFraction===generation.alpha.marginFraction,'Generation alpha margin differs');
  if(!provenance.matte){requireMatch(input.generatedOriginal===sourcePath&&source.format==='png','Unmatted source must be its original PNG');genuine(source,sourceAlpha);return sourceBytes;}
  requireMatch(provenance.matte.file.startsWith(stem+'-matte-v'),'Matte receipt belongs to another generation');
  const matteBytes=await readHeadProfileArtifact(repo,provenance.matte.file,maxReceipt);requireMatch(hash(matteBytes)===provenance.matte.sha256,'Matte receipt hash mismatch');
  const matte=Matte.parse(JSON.parse(matteBytes.toString('utf8'))),matteName=path.posix.basename(provenance.matte.file,'.json');
  requireMatch(matte.source.receipt===name+'.json'&&matte.source.receiptSha256===provenance.generation.sha256&&matte.source.image===generation.image&&matte.source.sha256===generation.sha256,'Matte source binding differs');
  const outputPath=HEAD_PROFILE_FOLDER+'/'+matteName+'.png',maskPath=HEAD_PROFILE_FOLDER+'/'+matteName+'-mask.png';
  requireMatch(matte.output.file===matteName+'.png'&&matte.mask.file===matteName+'-mask.png'&&input.generatedOriginal===outputPath,'Matte output path differs');
  const outputBytes=await readHeadProfileArtifact(repo,outputPath),maskBytes=await readHeadProfileArtifact(repo,maskPath);
  requireMatch(hash(outputBytes)===matte.output.sha256&&hash(maskBytes)===matte.mask.sha256,'Matte output/mask hash mismatch');
  const output=await decode(outputBytes,true),mask=await decode(maskBytes,true);sameDimensions(output,source);sameDimensions(mask,source);sameDimensions(output,matte.dimensions);
  const before=rgb(source.data),after=rgb(output.data);requireMatch(before.equals(after)&&hash(before)===matte.rgbSha256Before&&hash(after)===matte.rgbSha256After,'Matte changed source RGB');
  for(let i=0;i<output.data.length;i+=4)requireMatch(mask.data[i]===mask.data[i+1]&&mask.data[i]===mask.data[i+2]&&mask.data[i+3]===255&&mask.data[i]===output.data[i+3],'Mask grey pixels differ from output alpha');
  const alpha=measure(output);sameAlpha(alpha,matte.alpha);requireMatch(alpha.histogram.every((n,i)=>n===matte.alpha.histogram[i]),'Matte alpha histogram differs');genuine(output,alpha);
  return outputBytes;
}
