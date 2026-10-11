import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {hash} from '../core/utils.js';
import {outputPath} from '../render/process.js';
import {validateClipClock,type ClipClock} from './flow-timeline.js';
import {prepareCharacterSource,type CharacterSourceRecipe} from './character-source.js';
import {validateDemo,type ImageMotionDemo} from './scene.js';
import {validateTimestampMotion} from './timestamp-definition.js';

export const TIMESTAMP_PREPARER_VERSION='timestamp-parts-3';

export async function prepareTimestampMotion(source:string,directory:string,input:unknown,clock:ClipClock,cacheRoot:string,cleanPlate?:string){
  validateClipClock(clock);
  const sourceStat=await fs.stat(source);
  if(sourceStat.size>16*1024*1024)throw Error('Source exceeds 16 MB');
  const sourceBytes=await fs.readFile(source),sourceHash=hash(sourceBytes),meta=await sharp(sourceBytes,{limitInputPixels:64000000}).metadata();
  if(meta.format!=='png'||!meta.width||!meta.height||(meta.pages??1)>1)throw Error('Choose a single PNG source');
  const width=meta.width,height=meta.height,definition=validateTimestampMotion(input,width,height),durationMs=clock.endMs-clock.startMs;
  if(definition.rotationSource==='clean-plate'&&!cleanPlate)throw Error('needs-motion-source: Chọn PNG bề mặt quay sạch trước khi chuẩn bị.');
  if(definition.background.mode==='clean-plate'&&!cleanPlate)throw Error('Chọn ảnh nền sạch trước khi chuẩn bị.');

  let plateBytes:Buffer|undefined,plateHash:string|undefined;
  if(cleanPlate){
    try{
      const stat=await fs.stat(cleanPlate);
      if(stat.size>16*1024*1024)throw Error('invalid');
      plateBytes=await fs.readFile(cleanPlate);
      const plateMeta=await sharp(plateBytes,{limitInputPixels:64000000}).metadata();
      if(plateMeta.format!=='png'||!plateMeta.width||!plateMeta.height||(plateMeta.pages??1)>1||plateMeta.width!==width||plateMeta.height!==height)throw Error('invalid');
      plateHash=hash(plateBytes);
    }catch{
      if(definition.rotationSource==='clean-plate')throw Error('needs-motion-source: Chọn PNG bề mặt quay sạch cùng kích thước ảnh nguồn.');
      throw Error('Clean plate must be a matching single PNG no larger than 16 MB');
    }
  }

  if(definition.rotationSource==='clean-plate'){
    if(!plateBytes||definition.background.mode!=='clean-plate'||plateHash!==definition.background.cleanPlateId)throw Error('needs-motion-source: PNG bề mặt quay phải khớp cleanPlateId.');
    try{
      const raw=await sharp(plateBytes).toColourspace('srgb').ensureAlpha().raw().toBuffer();
      for(const r of definition.rotations){
        const x0=Math.max(0,Math.ceil(r.cx-r.rx)),x1=Math.min(width-1,Math.floor(r.cx+r.rx));
        const y0=Math.max(0,Math.ceil(r.cy-r.ry)),y1=Math.min(height-1,Math.floor(r.cy+r.ry));
        for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
          const dx=(x-r.cx)/r.rx,dy=(y-r.cy)/r.ry;
          if(dx*dx+dy*dy<=1&&raw[(y*width+x)*4+3]!==255)throw Error('transparent');
        }
      }
    }catch{throw Error('needs-motion-source: PNG bề mặt quay phải đục hoàn toàn bên trong mỗi ellipse.');}
  }

  let layerCacheKey:string|undefined,assetHashes:Record<string,string>,demo:ImageMotionDemo;
  await fs.mkdir(cacheRoot,{recursive:true});
  const immutable=async(root:string,name:string,data:Buffer)=>{
    const target=await outputPath(root,name);
    try{await fs.writeFile(target,data,{flag:'wx'});}
    catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||hash(await fs.readFile(target))!==hash(data))throw Error('Prepared motion cache integrity changed');}
  };

  const allParts=[...definition.parts,...(definition.occlusions??[])];
  if(allParts.length){
    const recipe:CharacterSourceRecipe={
      width,height,fps:clock.fps,durationMs,
      patchSampleX:definition.background.mode==='column'?definition.background.sampleX:0,
      repairRegion:'polygon',repairMargin:0,matteMode:'source-pixels',
      parts:[
        ...definition.parts.map(p=>({id:p.id,image:'assets/'+p.id+'.png',polygon:p.polygon,pivot:p.pivot,frames:[{timeMs:0,angle:0},{timeMs:durationMs*.2,angle:0},{timeMs:durationMs*.45,angle:p.angle},{timeMs:durationMs*.65,angle:p.angle},{timeMs:durationMs,angle:0}]})),
        ...(definition.occlusions??[]).map(p=>({id:p.id,image:'assets/'+p.id+'.png',polygon:p.polygon,pivot:{x:0,y:0},remove:false as const,frames:[{timeMs:0,angle:0},{timeMs:durationMs,angle:0}]}))
      ]
    };
    const occlusions=definition.occlusions??[];
    const white=definition.parts.map(p=>'<polygon fill="white" points="'+p.polygon.map(q=>q.join(',')).join(' ')+'"/>').join('');
    const header='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'">';
    // Legacy mask bytes stay identical. A black PNG polygon is opaque; use SVG luminance masking to make protected pixels transparent.
    const svg=occlusions.length?header+'<defs><mask id="moving" maskUnits="userSpaceOnUse" x="0" y="0" width="'+width+'" height="'+height+'" style="mask-type:luminance">'+white+occlusions.map(p=>'<polygon fill="black" points="'+p.polygon.map(q=>q.join(',')).join(' ')+'"/>').join('')+'</mask></defs><rect width="'+width+'" height="'+height+'" fill="white" mask="url(#moving)"/></svg>':header+white+'</svg>';
    const mask=await outputPath(cacheRoot,hash(svg)+'.png');
    await immutable(cacheRoot,path.basename(mask),await sharp(Buffer.from(svg)).png().toBuffer());
    const prepared=await prepareCharacterSource(source,mask,directory,recipe,cacheRoot,cleanPlate);
    layerCacheKey=prepared.layerCacheKey;assetHashes={...prepared.assetHashes};demo=structuredClone(prepared.demo);
  }else{
    await fs.mkdir(directory,{recursive:true});
    await fs.mkdir(await outputPath(directory,'assets'),{recursive:true});
    await immutable(directory,'assets/original.png',sourceBytes);
    assetHashes={'assets/original.png':sourceHash};
    demo={version:1,fps:clock.fps,scenes:[{id:'character',width,height,durationMs,original:'assets/original.png',background:'assets/original.png',layers:[]}]};
  }

  if(definition.rotationSource==='clean-plate'){
    const name='assets/rotation-source.png';
    await immutable(directory,name,plateBytes!);
    assetHashes={...assetHashes,[name]:plateHash!};
  }
  demo.scenes[0]!.layers=definition.rotations.map(r=>({...r,kind:'surface',image:definition.rotationSource==='clean-plate'?'assets/rotation-source.png':'assets/original.png'}));
  validateDemo(demo);
  const result={version:1,preparer:TIMESTAMP_PREPARER_VERSION,directory:path.resolve(directory),sourceHash,assetHashes,demo,definition,...(layerCacheKey?{layerCacheKey}:{}),productionReady:false,qualityAccepted:false};
  const manifest=await outputPath(directory,'motion.json');
  await immutable(directory,'motion.json',Buffer.from(JSON.stringify(result,null,2)+'\n'));
  return {...result,manifest};
}
