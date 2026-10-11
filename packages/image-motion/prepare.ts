import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {type ImageMotionDemo,type RotationLayer,createImageMotionHtml} from './scene.js';

export interface SourceReceipt {source:string;copy:string;sha256:string;width:number;height:number}
export interface GearReceipt {id:string;region:{cx:number;cy:number;radius:number};repair:string;backgroundRGB:number[];foregroundPixels:number}
export interface PreparedDemo {demo:ImageMotionDemo;sources:SourceReceipt[];gears:GearReceipt[];directory:string}
const digest=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');

/** Measured demo recipe for this image set, not an arbitrary-image segmentation API. */
export async function prepareOldProjectDemo(sourceRoot:string,directory:string):Promise<PreparedDemo> {
  // Exclusive creation: a rerun cannot overwrite the user's images or an earlier demo.
  await fs.mkdir(directory,{recursive:false});await fs.mkdir(path.join(directory,'assets'));
  const sources:SourceReceipt[]=[];
  for(const name of ['0002.png','0013.png']){
    const source=path.resolve(sourceRoot,'images_fullhd',name),bytes=await fs.readFile(source),meta=await sharp(bytes).metadata();
    if(meta.width!==1920||meta.height!==1080)throw new Error(`${name}: this measured recipe requires 1920×1080 originals`);
    const copy='assets/'+name;await fs.writeFile(path.join(directory,copy),bytes,{flag:'wx'});
    sources.push({source,copy,sha256:digest(bytes),width:meta.width,height:meta.height});
  }
  const {data,info}=await sharp(path.join(directory,'assets/0013.png')).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const base=Buffer.from(data),gears:GearReceipt[]=[],layers:RotationLayer[]=[];
  const presets=[
    {id:'silver-left',cx:161,cy:224,radius:62,periodMs:3400,direction:1 as const},
    {id:'orange-left',cx:176,cy:937,radius:76,periodMs:4400,direction:-1 as const},
    {id:'silver-right-top',cx:1619,cy:219,radius:53,periodMs:3000,direction:-1 as const},
    {id:'silver-right-bottom',cx:1389,cy:812,radius:73,periodMs:4000,direction:1 as const}
  ];
  for(const p of presets){
    const size=p.radius*2+8,x=p.cx-p.radius-4,y=p.cy-p.radius-4,sprite=Buffer.alloc(size*size*4);
    // Use the local background sampled outside the gear. Existing colors, no generated art.
    const samples:number[][]=[];
    for(let k=0;k<32;k++){const a=k/32*Math.PI*2,sx=Math.round(p.cx+Math.cos(a)*(p.radius+7)),sy=Math.round(p.cy+Math.sin(a)*(p.radius+7)),i=(sy*info.width+sx)*3;samples.push([data[i]!,data[i+1]!,data[i+2]!]);}
    const bg=[0,1,2].map(c=>Math.round(samples.reduce((v,pixel)=>v+pixel[c]!,0)/samples.length));
    let foregroundPixels=0;
    for(let dy=0;dy<size;dy++)for(let dx=0;dx<size;dx++){
      const sx=x+dx,sy=y+dy,i=(sy*info.width+sx)*3,j=(dy*size+dx)*4;
      if(Math.hypot(sx-p.cx,sy-p.cy)>p.radius)continue;
      const rgb=[data[i]!,data[i+1]!,data[i+2]!],distance=Math.sqrt(rgb.reduce((v,c,index)=>v+(c-bg[index]!)**2,0));
      const alpha=Math.max(0,Math.min(1,(distance-14)/18));
      if(alpha===0)continue;
      foregroundPixels++;
      // Unmix the sampled blue from edge pixels so it does not rotate as a blue fringe.
      for(let c=0;c<3;c++){
        sprite[j+c]=Math.round(Math.max(0,Math.min(255,(rgb[c]!-(1-alpha)*bg[c]!)/alpha)));
      }
      sprite[j+3]=Math.round(alpha*255);
    }
    // Fully clear the old footprint, including a two-pixel antialias fringe.
    // Partial alpha blending here would leave the old outline visible after rotation.
    for(let dy=0;dy<size;dy++)for(let dx=0;dx<size;dx++)if(sprite[(dy*size+dx)*4+3]!>0){
      for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++)if(ox*ox+oy*oy<=4){
        const sx=x+dx+ox,sy=y+dy+oy,i=(sy*info.width+sx)*3;
        for(let c=0;c<3;c++)base[i+c]=bg[c]!;
      }
    }
    const image=`assets/${p.id}.png`;await sharp(sprite,{raw:{width:size,height:size,channels:4}}).png().toFile(path.join(directory,image));
    gears.push({id:p.id,region:{cx:p.cx,cy:p.cy,radius:p.radius},backgroundRGB:bg,foregroundPixels,repair:'Only the old visible gear footprint is filled with RGB sampled from its neighboring source background; hidden geometry is not inferred.'});
    layers.push({id:p.id,image,kind:'cutout',cx:p.cx,cy:p.cy,rx:p.radius,ry:p.radius,periodMs:p.periodMs,direction:p.direction,rect:{x,y,width:size,height:size}});
  }
  await sharp(base,{raw:{width:info.width,height:info.height,channels:3}}).png().toFile(path.join(directory,'assets/gears-background.png'));
  const demo:ImageMotionDemo={version:1,fps:60,scenes:[
    {id:'drive-disc',width:1920,height:1080,durationMs:5000,original:'assets/0002.png',background:'assets/0002.png',layers:[{id:'drive-disc',image:'assets/0002.png',kind:'surface',cx:1172,cy:667,rx:103,ry:111,periodMs:2400,direction:-1}]},
    {id:'isolated-gears',width:1920,height:1080,durationMs:5000,original:'assets/0013.png',background:'assets/gears-background.png',layers}
  ]};
  const result={demo,sources,gears,directory};
  await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(result,null,2)+'\n');
  await fs.writeFile(path.join(directory,'index.html'),createImageMotionHtml(demo));
  return result;
}
