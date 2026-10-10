// Local asset authoring. RGB stays unchanged; only a separately inferred alpha
// is added. This is not a pose/render/test or production approval entry point.
import fs from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import sharp from 'sharp';

const root=process.cwd(),dir=path.join(root,'library/topics/prehistoric-life/head-source-studies');
const runtime=path.join(root,'runtime/asset-tools'),modelId='onnx-community/BiRefNet_lite-ONNX',revision='de15b22ba131738a16dff04aab8bdf8dc32e3ac1';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function noLinks(p){
  const relative=path.relative(root,p);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Outside workspace');
  for(let current=root,parts=relative.split(path.sep),i=0;i<parts.length;i++){
    current=path.join(current,parts[i]);try{if((await fs.lstat(current)).isSymbolicLink())throw Error('Linked path');}catch(e){if(e.code!=='ENOENT')throw e;}
  }
}
async function readOwned(p,max){
  await noLinks(p);const before=await fs.lstat(p);if(!before.isFile()||before.size>max)throw Error('Invalid source');
  const handle=await fs.open(p,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  try{const current=await handle.stat();if(current.dev!==before.dev||current.ino!==before.ino||current.size>max)throw Error('Changed source');const bytes=await handle.readFile();if(bytes.length>max)throw Error('Oversized source');return bytes;}finally{await handle.close();}
}
async function main(){
  const {values:v}=parseArgs({options:{input:{type:'string'},version:{type:'string'},generate:{type:'boolean',default:false}}});
  if(!v.generate||!v.input||!/^(lila|karo)-profile-(left|right)-v[1-9]\d*$/.test(v.input)||!v.version||!/^v[1-9]\d*$/.test(v.version))throw Error('Invalid arguments');
  const sourceReceiptBytes=await readOwned(path.join(dir,v.input+'.json'),100*1024),sourceReceipt=JSON.parse(sourceReceiptBytes);
  const image=sourceReceipt.image,ext=typeof image==='string'?path.extname(image):'';
  if(!['.jpg','.png','.webp'].includes(ext)||image!==v.input+ext||!['held','generated-needs-source-review'].includes(sourceReceipt.status)||!/^[a-f0-9]{64}$/.test(sourceReceipt.sha256??''))throw Error('Invalid source receipt');
  for(const k of ['approved','registered','productionReady','motionVerified'])if(sourceReceipt[k]!==false)throw Error('Invalid source flags');
  const input=await readOwned(path.join(dir,image),40*1024*1024);if(hash(input)!==sourceReceipt.sha256)throw Error('Changed source');
  const {data:rgb,info}=await sharp(input,{limitInputPixels:20_000_000}).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.channels!==3||info.width>8192||info.height>8192)throw Error('Invalid source dimensions');
  await noLinks(runtime);await noLinks(path.join(runtime,'node_modules'));await noLinks(path.join(runtime,'models'));
  const dependency=JSON.parse(await readOwned(path.join(runtime,'node_modules/@huggingface/transformers/package.json'),100*1024));
  if(dependency.version!=='4.3.1')throw Error('Unexpected dependency version');
  const require=createRequire(path.join(runtime,'package.json')),modulePath=require.resolve('@huggingface/transformers');await noLinks(modulePath);
  const base=v.input+'-matte-'+v.version,outputPath=path.join(dir,base+'.png'),maskPath=path.join(dir,base+'-mask.png'),receiptPath=path.join(dir,base+'.json');
  for(const p of [outputPath,maskPath,receiptPath]){await noLinks(p);try{await fs.lstat(p);throw Error('Existing output');}catch(e){if(e.code!=='ENOENT')throw e;}}
  await fs.writeFile(path.join(dir,base+'.reserved'),'reserved\n',{flag:'wx'});
  const handle=await fs.open(receiptPath,'wx'),owned=await handle.stat();
  const initial={version:'native-profile-matte-1',scope:'static-art-authoring-only',source:{receipt:v.input+'.json',receiptSha256:hash(sourceReceiptBytes),image,sha256:hash(input)},model:modelId,revision,license:'MIT',dependency:{name:dependency.name,version:dependency.version},device:'cpu',yawMeasured:false,approved:false,registered:false,productionReady:false,motionVerified:false,status:'requested',requestedAt:new Date().toISOString()};
  async function receipt(value){
    const now=await fs.lstat(receiptPath);if(now.isSymbolicLink()||now.dev!==owned.dev||now.ino!==owned.ino)throw Error('Receipt ownership changed');
    const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');let offset=0;
    while(offset<bytes.length){const {bytesWritten}=await handle.write(bytes,offset,bytes.length-offset,offset);if(!bytesWritten)throw Error('Receipt write failed');offset+=bytesWritten;}
    await handle.truncate(bytes.length);await handle.sync();
  }
  let model;
  try{
    await receipt(initial);
    const {env,AutoModel,AutoProcessor,RawImage}=await import(pathToFileURL(modulePath).href);
    env.cacheDir=path.join(runtime,'models');
    const processor=await AutoProcessor.from_pretrained(modelId,{revision});
    const progress=new Map();
    model=await AutoModel.from_pretrained(modelId,{revision,dtype:'fp32',device:'cpu',progress_callback:p=>{
      if(p.status!=='progress'||!Number.isFinite(p.progress))return;const percent=Math.floor(p.progress/25)*25;
      if(progress.get(p.file)!==percent){progress.set(p.file,percent);console.log(JSON.stringify({stage:'local-model-download',percent}));}
    }});
    const processed=await processor(new RawImage(rgb,info.width,info.height,3));
    console.log(JSON.stringify({stage:'local-alpha-inference'}));
    const prediction=await model({input_image:processed.pixel_values});
    const mask=await RawImage.fromTensor(prediction.output_image[0].sigmoid().mul(255).to('uint8')).resize(info.width,info.height);
    const alpha=Buffer.from(mask.data);if(mask.width!==info.width||mask.height!==info.height||mask.channels!==1||alpha.length!==info.width*info.height)throw Error('Invalid alpha mask');
    const rgba=Buffer.alloc(alpha.length*4),after=Buffer.alloc(rgb.length),histogram=Array(256).fill(0);let left=info.width,top=info.height,right=-1,bottom=-1,visible=0,border=0;
    for(let i=0;i<alpha.length;i++){
      for(let c=0;c<3;c++)after[i*3+c]=rgba[i*4+c]=rgb[i*3+c];rgba[i*4+3]=alpha[i];histogram[alpha[i]]++;
      if(alpha[i]>=8){const x=i%info.width,y=Math.floor(i/info.width);visible++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);if(!x||x===info.width-1||!y||y===info.height-1)border++;}
    }
    if(hash(rgb)!==hash(after))throw Error('RGB changed');
    const maskBytes=await sharp(alpha,{raw:{width:info.width,height:info.height,channels:1}}).png().toBuffer(),output=await sharp(rgba,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
    await fs.writeFile(maskPath,maskBytes,{flag:'wx'});await fs.writeFile(outputPath,output,{flag:'wx'});
    // Re-decode the actual persisted-format bytes, not just the pre-encode buffer.
    const decoded=await sharp(output).removeAlpha().raw().toBuffer();if(hash(decoded)!==hash(rgb))throw Error('Encoded output RGB changed');
    const status=histogram[0]>0&&visible>0&&visible<alpha.length?'candidate-needs-identity-and-edge-review':'held';
    await receipt({...initial,status,mask:{file:path.basename(maskPath),sha256:hash(maskBytes)},output:{file:path.basename(outputPath),sha256:hash(output)},rgbSha256Before:hash(rgb),rgbSha256After:hash(decoded),dimensions:{width:info.width,height:info.height},alpha:{threshold:8,histogram,transparentPixels:histogram[0],visiblePixels:visible,opaquePixels:histogram[255],borderVisiblePixels:border,visibleBounds:visible?{x:left,y:top,width:right-left+1,height:bottom-top+1}:null},generatedAt:new Date().toISOString()});
    console.log(JSON.stringify({file:path.relative(root,outputPath),status,sha256:hash(output),rgbUnchanged:true}));
  }catch(e){await receipt({...initial,status:'failed',endedAt:new Date().toISOString()}).catch(()=>{});throw e;}
  finally{try{if(model)await model.dispose();}finally{await handle.close();}}
}
main().catch(()=>{process.exitCode=1;console.error('Local profile matte failed; no automatic retry.');});
