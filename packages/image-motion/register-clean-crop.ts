import {promises as fs} from 'node:fs';import sharp from 'sharp';import {z} from 'zod';import {hash} from '../core/utils.js';import {outputPath} from '../render/process.js';
const Rect=z.object({left:z.number().int().nonnegative(),top:z.number().int().nonnegative(),width:z.number().int().positive(),height:z.number().int().positive()}).strict();
export const CleanCropRegistration=z.object({rect:Rect,background:z.object({sourceColumn:z.number().int().nonnegative(),cropX:z.number().int().nonnegative(),cropY:z.number().int().nonnegative(),tolerance:z.number().finite().positive().max(64)}).strict().optional()}).strict();
export async function registerCleanCropPlate(source:string,crop:string,cacheRoot:string,input:unknown){
 const options=CleanCropRegistration.parse(input),bounded=async(file:string)=>{const s=await fs.stat(file);if(s.size>16*1024*1024)throw Error('PNG exceeds16MB');return fs.readFile(file);},srcBytes=await bounded(source),cropBytes=await bounded(crop),sourceHash=hash(srcBytes),cropHash=hash(cropBytes);
 const sourceMeta=await sharp(srcBytes,{limitInputPixels:64000000}).metadata(),cropMeta=await sharp(cropBytes,{limitInputPixels:64000000}).metadata();
 if(sourceMeta.format!=='png'||cropMeta.format!=='png'||!sourceMeta.width||!sourceMeta.height||!cropMeta.width||!cropMeta.height||(sourceMeta.pages??1)>1||(cropMeta.pages??1)>1)throw Error('Choose matching single PNG images');
 const {rect,background}=options,w=sourceMeta.width,h=sourceMeta.height;
 if(rect.left+rect.width>w||rect.top+rect.height>h)throw Error('Crop registration is outside source');
 if(cropMeta.width*rect.height!==cropMeta.height*rect.width)throw Error('Clean crop aspect ratio must match; registration cannot stretch artwork');
 if(background&&(background.sourceColumn>=w||background.cropX>=rect.width||background.cropY>=rect.height))throw Error('Background sample is outside source/crop');
 await fs.mkdir(cacheRoot,{recursive:true});
 // Registration is explicit, without inferred body geometry. The original is
 // immutable, including when a background sample lies inside the crop region.
 const key=hash({version:'clean-crop-registration-1',sourceHash,cropHash,options}),directory=await outputPath(cacheRoot,key),originalRaw=await sharp(srcBytes).toColourspace('srgb').ensureAlpha().raw().toBuffer(),raw=Buffer.from(originalRaw),patch=await sharp(cropBytes).resize(rect.width,rect.height).toColourspace('srgb').ensureAlpha().raw().toBuffer();
 let normalizedPixels=0;const seed=background?(background.cropY*rect.width+background.cropX)*4:0;
 for(let y=0;y<rect.height;y++)for(let x=0;x<rect.width;x++){
   const i=(y*rect.width+x)*4,at=((y+rect.top)*w+x+rect.left)*4;if(patch[i+3]!==255)throw Error('Clean crop must be opaque');
   if(background){let squared=0;for(let c=0;c<3;c++)squared+=(patch[i+c]!-patch[seed+c]!)**2;
     if(squared<=background.tolerance**2){const sample=((y+rect.top)*w+background.sourceColumn)*4;if(originalRaw[sample+3]!==255)throw Error('Background sample must be opaque');raw.set(originalRaw.subarray(sample,sample+4),at);normalizedPixels++;continue;}
   }
   raw.set(patch.subarray(i,i+4),at);
 }
 const plate=await sharp(raw,{raw:{width:w,height:h,channels:4}}).png().toBuffer();if(plate.length>16*1024*1024)throw Error('Registered plate exceeds16MB');
 const result={version:1,key,directory,sourceHash,cropHash,options,width:w,height:h,plateHash:hash(plate),normalizedPixels,productionReady:false,qualityAccepted:false};await fs.mkdir(directory,{recursive:true});
 const immutable=async(name:string,data:Buffer)=>{const file=await outputPath(directory,name);try{await fs.writeFile(file,data,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||hash(await fs.readFile(file))!==hash(data))throw Error('Clean crop cache integrity changed');}return file;};
 const plateFile=await immutable('clean-plate.png',plate);await immutable('registration.json',Buffer.from(JSON.stringify(result,null,2)+'\n'));return {...result,plateFile};
}
