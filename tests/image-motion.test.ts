import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {createImageMotionHtml,type ImageMotionDemo} from '../packages/image-motion/scene.js';
import {prepareOldProjectDemo} from '../packages/image-motion/prepare.js';

// Catches a static renderer, rotation around the wrong pivot, cumulative seek,
// and a transform that moves unrelated pixels outside the selected surface.
test('browser rotates only the selected surface and reproduces arbitrary seeks',async()=>{
  const chrome=process.env.IMAGE_MOTION_CHROME??'C:/Users/Duongvh-pc/.cache/puppeteer/chrome-headless-shell/win64-154.0.8037.57/chrome-headless-shell-win64/chrome-headless-shell.exe';
  await fs.access(chrome); // An absent local browser is a failed prerequisite, never a skipped pass.
  const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core') as typeof import('puppeteer-core');
  const image=await sharp(Buffer.from('<svg width="100" height="100"><rect width="100" height="100" fill="#203050"/><circle cx="50" cy="50" r="24" fill="#aabbaa"/><rect x="55" y="44" width="15" height="12" fill="#ff0000"/></svg>')).png().toBuffer();
  const url='data:image/png;base64,'+image.toString('base64');
  const demo:ImageMotionDemo={version:1,fps:60,scenes:[{id:'fixture',width:100,height:100,durationMs:2000,original:url,background:url,layers:[{id:'disc',kind:'surface',image:url,cx:50,cy:50,rx:24,ry:24,periodMs:1000,direction:1}]}]};
  const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--disable-background-networking','--disable-sync','--no-first-run']});
  try {
    const page=await browser.newPage();await page.setContent(createImageMotionHtml(demo));await page.evaluate(()=> (window as any).ready);
    const pixels=async(at:number)=>page.evaluate((t)=>{(window as any).renderFrame(t);return Array.from((document.getElementById('stage') as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,100,100).data);},at);
    const zero=await pixels(0),quarter=await pixels(250);
    const rgb=(data:number[],x:number,y:number)=>data.slice((y*100+x)*4,(y*100+x)*4+3);
    assert.deepEqual(rgb(zero,64,50),[255,0,0]);
    assert.deepEqual(rgb(quarter,50,64),[255,0,0],'at a quarter-turn the red spoke must move below the pivot');
    assert.notDeepEqual(rgb(quarter,64,50),[255,0,0]);
    for(let y=0;y<100;y++)for(let x=0;x<100;x++)if(Math.hypot(x-50,y-50)>26)assert.deepEqual(rgb(quarter,x,y),rgb(zero,x,y));
    await pixels(1900);await pixels(60);assert.deepEqual(await pixels(250),quarter);assert.deepEqual(await pixels(0),zero);
    await assert.rejects(page.evaluate(()=> (window as any).renderFrame(NaN)),/Invalid frame time/);
    assert.throws(()=>createImageMotionHtml({...demo,scenes:[{...demo.scenes[0]!,original:'https://invalid.example/source.png'}]}),/bundled image assets/);
  }finally{await browser.close();}
});

// Catches a faint old gear edge left in the repaired background after the sprite moves.
test('prepared background clears antialiased gear edges and preserves source files',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'factory-image-motion-'));
  t.after(async()=>{if(path.dirname(path.resolve(root))!==path.resolve(os.tmpdir())||!path.basename(root).startsWith('factory-image-motion-'))throw new Error('Unsafe fixture cleanup path');await fs.rm(root,{recursive:true,force:true});});
  const source=path.join(root,'source');await fs.mkdir(path.join(source,'images_fullhd'),{recursive:true});
  const raw=Buffer.alloc(1920*1080*3);for(let i=0;i<raw.length;i+=3){raw[i]=142;raw[i+1]=201;raw[i+2]=242;}
  raw.set([20,20,20],(224*1920+161)*3);raw.set([152,207,247],(224*1920+163)*3);
  const png=await sharp(raw,{raw:{width:1920,height:1080,channels:3}}).png().toBuffer();
  for(const name of ['0002.png','0013.png'])await fs.writeFile(path.join(source,'images_fullhd',name),png);
  const output=path.join(root,'demo');await prepareOldProjectDemo(source,output);
  const base=await sharp(path.join(output,'assets/gears-background.png')).removeAlpha().raw().toBuffer();
  const i=(224*1920+163)*3;assert.deepEqual([...base.subarray(i,i+3)],[142,201,242],'a faint source edge must not remain as a ghost');
  assert.deepEqual([...base.subarray(0,3)],[142,201,242]);
  assert.ok(png.equals(await fs.readFile(path.join(source,'images_fullhd/0013.png'))));assert.ok(png.equals(await fs.readFile(path.join(output,'assets/0013.png'))));
  await assert.rejects(prepareOldProjectDemo(source,output),{code:'EEXIST'});
});
