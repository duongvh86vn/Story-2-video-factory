import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {hash} from '../core/utils.js';
import {outputPath} from '../render/process.js';
import {validateClipClock,type ClipClock} from './flow-timeline.js';
import {prepareCharacterSource,type CharacterSourceRecipe} from './character-source.js';
import {validateDemo,type ImageMotionDemo} from './scene.js';
import {validateTimestampMotion} from './timestamp-definition.js';

export const TIMESTAMP_PREPARER_VERSION='timestamp-parts-1';
export async function prepareTimestampMotion(source:string,directory:string,input:unknown,clock:ClipClock,cacheRoot:string,cleanPlate?:string){
  validateClipClock(clock);if((await fs.stat(source)).size>16*1024*1024)throw Error('Source exceeds 16 MB');
  const sourceBytes=await fs.readFile(source),sourceHash=hash(sourceBytes),meta=await sharp(sourceBytes,{limitInputPixels:64000000}).metadata();
  if(meta.format!=='png'||!meta.width||!meta.height||(meta.pages??1)>1)throw Error('Choose a single PNG source');
  const width=meta.width,height=meta.height,definition=validateTimestampMotion(input,width,height),durationMs=clock.endMs-clock.startMs;
  if(definition.background.mode==='clean-plate'&&!cleanPlate)throw Error('Chọn ảnh nền sạch trước khi chuẩn bị.');
  let layerCacheKey:string|undefined,assetHashes:Record<string,string>,demo:ImageMotionDemo;
  await fs.mkdir(cacheRoot,{recursive:true});
  const immutable=async(root:string,name:string,data:Buffer)=>{const target=await outputPath(root,name);try{await fs.writeFile(target,data,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||hash(await fs.readFile(target))!==hash(data))throw Error('Prepared motion cache integrity changed');}};
  if(definition.parts.length){
    const recipe:CharacterSourceRecipe={width,height,fps:clock.fps,durationMs,patchSampleX:definition.background.mode==='column'?definition.background.sampleX:0,repairRegion:'polygon',repairMargin:0,parts:definition.parts.map(p=>({id:p.id,image:'assets/'+p.id+'.png',polygon:p.polygon,pivot:p.pivot,frames:[{timeMs:0,angle:0},{timeMs:durationMs*.2,angle:0},{timeMs:durationMs*.45,angle:p.angle},{timeMs:durationMs*.65,angle:p.angle},{timeMs:durationMs,angle:0}]}))};
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'">'+recipe.parts.map(p=>'<polygon fill="white" points="'+p.polygon.map(q=>q.join(',')).join(' ')+'"/>').join('')+'</svg>';
    const mask=await outputPath(cacheRoot,hash(svg)+'.png');await immutable(cacheRoot,path.basename(mask),await sharp(Buffer.from(svg)).png().toBuffer());
    const prepared=await prepareCharacterSource(source,mask,directory,recipe,cacheRoot,cleanPlate);layerCacheKey=prepared.layerCacheKey;assetHashes=prepared.assetHashes;demo=structuredClone(prepared.demo);
  }else{
    await fs.mkdir(directory,{recursive:true});await fs.mkdir(await outputPath(directory,'assets'),{recursive:true});await immutable(directory,'assets/original.png',sourceBytes);assetHashes={'assets/original.png':sourceHash};
    demo={version:1,fps:clock.fps,scenes:[{id:'character',width,height,durationMs,original:'assets/original.png',background:'assets/original.png',layers:[]}]};
  }
  demo.scenes[0]!.layers=definition.rotations.map(r=>({...r,kind:'surface',image:'assets/original.png'}));validateDemo(demo);
  const result={version:1,preparer:TIMESTAMP_PREPARER_VERSION,directory:path.resolve(directory),sourceHash,assetHashes,demo,definition,...(layerCacheKey?{layerCacheKey}:{}),productionReady:false,qualityAccepted:false};
  const manifest=await outputPath(directory,'motion.json');await immutable(directory,'motion.json',Buffer.from(JSON.stringify(result,null,2)+'\n'));return {...result,manifest};
}
