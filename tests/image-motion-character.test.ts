import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {promises as fs} from 'node:fs';
import sharp from 'sharp';
import path from 'node:path';
import {createImageMotionHtml,type ImageMotionDemo} from '../packages/image-motion/scene.js';
import {prepareCharacterSource,type CharacterSourceRecipe} from '../packages/image-motion/character-source.js';
import {temporary} from './support.js';
import {exportStandaloneClip} from '../packages/image-motion/export-clip.js';

// A child forearm must follow its parent's elbow. Independent rotations around
// fixed world pivots detach it; missing articulated rendering loses both limbs.
test('articulated source parts stay connected at a moving elbow and return on seek',async()=>{
  const png=async(content:string)=>'data:image/png;base64,'+(await sharp(Buffer.from(`<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">${content}</svg>`)).png().toBuffer()).toString('base64');
  const background=await png('<rect width="64" height="64" fill="white"/>'),original=await png('<rect width="64" height="64" fill="white"/><path d="M15 15V55" stroke="black" stroke-width="6" stroke-linecap="round"/>');
  const upper=await png('<path d="M15 15V38" stroke="black" stroke-width="6" stroke-linecap="round"/>'),fore=await png('<path d="M15 32V55" stroke="black" stroke-width="6" stroke-linecap="round"/>');
  const frames=(angle:number)=>[{timeMs:0,angle:0},{timeMs:500,angle:0},{timeMs:1800,angle},{timeMs:2800,angle},{timeMs:4200,angle:0},{timeMs:5000,angle:0}];
  const demo:ImageMotionDemo={version:1,fps:60,scenes:[{id:'arm',width:64,height:64,durationMs:5000,original,background,layers:[],parts:[{id:'upper',image:upper,pivot:{x:15,y:15},frames:frames(-90)},{id:'fore',parent:'upper',image:fore,pivot:{x:15,y:35},frames:frames(90)}]} as any]};
  const chrome=process.env.IMAGE_MOTION_CHROME??'C:/Users/Duongvh-pc/.cache/puppeteer/chrome-headless-shell/win64-154.0.8037.57/chrome-headless-shell-win64/chrome-headless-shell.exe';await fs.access(chrome);
  const browser=await createRequire(import.meta.url)('puppeteer-core').launch({executablePath:chrome,headless:true,args:['--disable-background-networking']});
  try{const page=await browser.newPage();await page.setContent(createImageMotionHtml(demo));await page.evaluate(()=> (window as any).ready);
    const pixels=async(time:number)=>page.evaluate((t:number)=>{(window as any).renderFrame(t);return Array.from(document.querySelector<HTMLCanvasElement>('#stage')!.getContext('2d')!.getImageData(0,0,64,64).data);},time);
    const color=(data:number[],x:number,y:number)=>data.slice((y*64+x)*4,(y*64+x)*4+3),zero=await pixels(0),pose=await pixels(2000);
    assert.deepEqual(color(pose,25,15),[0,0,0],'upper arm must reach toward the moved elbow');
    assert.deepEqual(color(pose,35,25),[0,0,0],'forearm must follow its parent into the moved elbow');
    assert.deepEqual(color(pose,15,45),[255,255,255],'old limb cannot remain below the new one');
    for(let x=16;x<=35;x++)assert.deepEqual(color(pose,x,15),[0,0,0]);
    for(let y=15;y<=34;y++)assert.deepEqual(color(pose,35,y),[0,0,0]);
    await pixels(4100);await pixels(600);assert.deepEqual(await pixels(2000),pose);assert.deepEqual(await pixels(5000),zero,'rest must restore the original source pixels');
  }finally{await browser.close();}
});

// Human steering: remove the old source arm and install new artwork, including
// the rest poster. Otherwise the old arm pops back in at time0 and after recovery.
test('replacement arm removes the old arm in the rest poster while retaining the source file',async t=>{
  const root=await temporary(t),source=path.join(root,'source.png'),mask=path.join(root,'alpha.png');
  const svg=(body:string)=>sharp(Buffer.from(`<svg width="64" height="64">${body}</svg>`)).png().toBuffer(),old='<path d="M15 15V55" stroke="black" stroke-width="6"/>';
  const bytes=await svg('<rect width="64" height="64" fill="white"/>'+old);await fs.writeFile(source,bytes);await fs.writeFile(mask,await svg(old));
  const recipe={width:64,height:64,durationMs:5000,fps:60,patchSampleX:62,parts:[{id:'arm',image:'assets/arm.png',pivot:{x:15,y:15},polygon:[[10,10],[21,10],[21,60],[10,60]],frames:[{timeMs:0,angle:0},{timeMs:2000,angle:-45},{timeMs:5000,angle:0}],replacement:{type:'ink-arm',from:{x:15,y:15},to:{x:35,y:15},width:6}}]} as CharacterSourceRecipe;
  const p=await prepareCharacterSource(source,mask,path.join(root,'out'),recipe,path.join(root,'cache')),raw=await sharp(path.join(p.directory,p.demo.scenes[0]!.original)).ensureAlpha().raw().toBuffer();
  assert.deepEqual([...raw.subarray((45*64+15)*4,(45*64+15)*4+3)],[255,255,255],'the old vertical arm must be gone even in the new rest image');
  assert.ok([...raw.subarray((15*64+25)*4,(15*64+25)*4+3)].every(v=>v<10),'the new arm must appear in the rest image');assert.ok(bytes.equals(await fs.readFile(source)));
  const cached=await prepareCharacterSource(source,mask,path.join(root,'timing-edit'),{...recipe,parts:recipe.parts.map(p=>({...p,frames:p.frames.map(f=>({...f,angle:f.angle/2}))}))},path.join(root,'cache'));
  assert.equal(cached.layerCacheKey,p.layerCacheKey);assert.deepEqual(cached.assetHashes,p.assetHashes);
  const changed=await prepareCharacterSource(source,mask,path.join(root,'shape-edit'),{...recipe,parts:recipe.parts.map(p=>({...p,replacement:{...p.replacement!,to:{x:40,y:15}}}))},path.join(root,'cache'));
  assert.notEqual(changed.layerCacheKey,p.layerCacheKey,'changing the new arm artwork must invalidate its assets');
  const fore={...recipe.parts[0]!,id:'fore',image:'assets/fore.png',parent:'arm',pivot:{x:35,y:15},replacement:{type:'ink-arm',from:{x:35,y:15},to:{x:35,y:35},width:6}} as CharacterSourceRecipe['parts'][number];
  const invalid={...recipe,parts:[recipe.parts[0]!,{...fore,pivot:{x:36,y:15},replacement:{...fore.replacement!,from:{x:36,y:15}}}]};
  await assert.rejects(prepareCharacterSource(source,mask,path.join(root,'detached'),invalid,path.join(root,'cache')),/shared joint/);
});

// A fractional candidate matte repainted over the original changes baked RGB
// through browser premultiplication. Karo's actual shirt exposed this at 505
// sampled pixels while the face stayed exact; preserve static clothing colors.
test('static clothing remains source-exact in a moving pose despite a fractional candidate matte',async t=>{
  const root=await temporary(t),source=path.join(root,'source.png'),mask=path.join(root,'mask.png'),rgba=Buffer.alloc(64*64*4,255),alpha=Buffer.alloc(rgba.length);
  for(let y=10;y<60;y++)for(let x=12;x<19;x++){rgba.set([0,0,0,255],(y*64+x)*4);alpha[(y*64+x)*4+3]=255;}
  for(let y=32;y<59;y++)for(let x=32;x<59;x++){const i=(y*64+x)*4;rgba.set([149+(x%11),87+(y%9),59+(x%7),255],i);alpha[i+3]=1+(x*7+y*5)%253;}
  await fs.writeFile(source,await sharp(rgba,{raw:{width:64,height:64,channels:4}}).png().toBuffer());await fs.writeFile(mask,await sharp(alpha,{raw:{width:64,height:64,channels:4}}).png().toBuffer());
  const recipe:CharacterSourceRecipe={width:64,height:64,durationMs:5000,fps:60,patchSampleX:62,parts:[
    {id:'arm',image:'assets/arm.png',pivot:{x:15,y:15},polygon:[[10,5],[21,5],[21,62],[10,62]],frames:[{timeMs:0,angle:0},{timeMs:2000,angle:-45},{timeMs:5000,angle:0}],replacement:{type:'ink-arm',from:{x:15,y:15},to:{x:35,y:15},width:6}},
    {id:'cloth',image:'assets/cloth.png',pivot:{x:0,y:0},polygon:[[32,32],[59,32],[59,59],[32,59]],remove:false,frames:[{timeMs:0,angle:0},{timeMs:5000,angle:0}]}
  ]};
  const p=await prepareCharacterSource(source,mask,path.join(root,'out'),recipe,path.join(root,'cache')),demo=structuredClone(p.demo),s=demo.scenes[0]!;
  const png=async(file:string)=>'data:image/png;base64,'+(await fs.readFile(path.join(p.directory,file))).toString('base64');s.original=await png(s.original);s.background=await png(s.background);for(const part of s.parts!)part.image=await png(part.image);
  const chrome=process.env.IMAGE_MOTION_CHROME??'C:/Users/Duongvh-pc/.cache/puppeteer/chrome-headless-shell/win64-154.0.8037.57/chrome-headless-shell-win64/chrome-headless-shell.exe',browser=await createRequire(import.meta.url)('puppeteer-core').launch({executablePath:chrome,headless:true,args:['--disable-background-networking']});
  try{const page=await browser.newPage();await page.setContent(createImageMotionHtml(demo));await page.evaluate(()=> (window as any).ready);const pose=await page.evaluate(()=>{(window as any).renderFrame(2000);return Array.from(document.querySelector<HTMLCanvasElement>('#stage')!.getContext('2d')!.getImageData(0,0,64,64).data);});
    for(let y=34;y<57;y++)for(let x=34;x<57;x++){const i=(y*64+x)*4;assert.deepEqual(pose.slice(i,i+4),[...rgba.subarray(i,i+4)],`clothing color changed at ${x},${y}`);}
  }finally{await browser.close();}
});

// Prevent exporting this slice through the old hardcoded1920x1080/10s encoder,
// and prevent a technical candidate from being declared final production.
test('standalone export encodes the articulated clock and dimensions without claiming production acceptance',async t=>{
  const root=await temporary(t),assets=path.join(root,'assets');await fs.mkdir(assets);
  const png=async(content:string)=>sharp(Buffer.from(`<svg width="64" height="64">${content}</svg>`)).png().toBuffer();
  const base=await png('<rect width="64" height="64" fill="#efdfc0"/>'),arm=await png('<path d="M15 15V55" stroke="black" stroke-width="6"/>');
  await fs.writeFile(path.join(assets,'base.png'),base);await fs.writeFile(path.join(assets,'arm.png'),arm);
  const demo:ImageMotionDemo={version:1,fps:60,scenes:[{id:'clip',width:64,height:64,durationMs:1000,original:'assets/base.png',background:'assets/base.png',layers:[],parts:[{id:'arm',image:'assets/arm.png',pivot:{x:15,y:15},frames:[{timeMs:0,angle:0},{timeMs:250,angle:-60},{timeMs:500,angle:-60},{timeMs:1000,angle:0}]}]}]};
  const options={chrome:process.env.IMAGE_MOTION_CHROME??'C:/Users/Duongvh-pc/.cache/puppeteer/chrome-headless-shell/win64-154.0.8037.57/chrome-headless-shell-win64/chrome-headless-shell.exe',ffmpeg:'C:/ffmpeg/bin/ffmpeg.exe',ffprobe:'C:/ffmpeg/bin/ffprobe.exe'};
  const result=await exportStandaloneClip({directory:root,demo},options);assert.equal(result.totalFrames,60,'export must follow the one-second60fps clock');assert.equal(result.productionReady,false);assert.equal(result.qualityAccepted,false);assert.equal(result.randomSeekPngExact,true);assert.equal(result.decodeErrors,0);
  const media=result.media as any;assert.equal(media.streams[0].width,64);assert.equal(media.streams[0].height,64);assert.equal(media.streams[0].nb_read_frames,'60');assert.equal(media.streams.length,1);
  await assert.rejects(exportStandaloneClip({directory:root,demo},options),/overwrite/i);
});

// A distant flat color leaves a bright silhouette on shaded paper. A candidate
// matte may omit source fingers, so ink selection must preserve the actual ink.
test('paper repair follows nearby shading and ink layers do not lose source pixels to a candidate matte',async t=>{
  const root=await temporary(t),source=path.join(root,'source.png'),mask=path.join(root,'alpha.png');
  const raw=Buffer.alloc(64*64*3);for(let y=0;y<64;y++)for(let x=0;x<64;x++)raw.set([230+Math.floor(x/8),210+Math.floor(x/8),170+Math.floor(x/8)],(y*64+x)*3);
  for(let y=15;y<56;y++)for(let x=12;x<19;x++)raw.set([0,0,0],(y*64+x)*3);await fs.writeFile(source,await sharp(raw,{raw:{width:64,height:64,channels:3}}).png().toBuffer());
  await fs.writeFile(mask,await sharp(Buffer.from('<svg width="64" height="64"><path d="M15 15V49" stroke="black" stroke-width="6"/></svg>')).png().toBuffer());
  const frames=[{timeMs:0,angle:0},{timeMs:2000,angle:-60},{timeMs:5000,angle:0}];
  const recipe={width:64,height:64,durationMs:5000,fps:60,patchSampleX:62,patchMode:'paper-interpolate',parts:[{id:'arm',image:'assets/arm.png',pivot:{x:15,y:15},polygon:[[10,10],[21,10],[21,60],[10,60]],frames,inkOnly:true}]} as CharacterSourceRecipe;
  const p=await prepareCharacterSource(source,mask,path.join(root,'out'),recipe,path.join(root,'cache'));
  const base=await sharp(path.join(p.directory,'assets/background.png')).ensureAlpha().raw().toBuffer(),rgb=[...base.subarray((45*64+15)*4,(45*64+15)*4+3)];assert.ok(rgb.every((v,i)=>Math.abs(v-[231,211,171][i]!)<=1),'repair must match nearby shaded paper, not the brighter far column');
  const arm=await sharp(path.join(p.directory,'assets/arm.png')).ensureAlpha().raw().toBuffer();assert.equal(arm[(53*64+15)*4+3],255,'visible source ink cannot disappear because the old candidate matte is short');
});

// Original artwork must not be overwritten; moving limbs need a clean old
// location. Timing changes must reuse prepared pixels rather than regenerate art.
test('source preparation clears the old limb and reuses immutable layers across timing edits',async t=>{
  const root=await temporary(t),source=path.join(root,'source.png'),mask=path.join(root,'alpha.png'),cache=path.join(root,'cache');
  const svg=(body:string)=>sharp(Buffer.from(`<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">${body}</svg>`)).png().toBuffer();
  const line='<path d="M15 15V55" stroke="black" stroke-width="6" stroke-linecap="round"/>';
  const bytes=await svg('<rect width="64" height="64" fill="white"/>'+line);await fs.writeFile(source,bytes);await fs.writeFile(mask,await svg(line));
  const frames=[{timeMs:0,angle:0},{timeMs:2000,angle:-65},{timeMs:5000,angle:0}];
  const recipe:CharacterSourceRecipe={width:64,height:64,durationMs:5000,fps:60,patchSampleX:62,parts:[{id:'upper',image:'assets/upper.png',pivot:{x:15,y:15},polygon:[[10,10],[21,10],[21,39],[10,39]],frames},{id:'fore',parent:'upper',image:'assets/fore.png',pivot:{x:15,y:35},polygon:[[10,31],[21,31],[21,60],[10,60]],frames:frames.map(f=>({...f,angle:-f.angle/3}))}]};
  const first=await prepareCharacterSource(source,mask,path.join(root,'first'),recipe,cache);
  assert.equal(first.demo.scenes[0]?.parts?.length??0,2,'preparation must emit both source layers');
  const base=await sharp(path.join(first.directory,first.demo.scenes[0]!.background)).ensureAlpha().raw().toBuffer();assert.deepEqual([...base.subarray((45*64+15)*4,(45*64+15)*4+3)],[255,255,255],'the old limb must be cleared');
  assert.ok(bytes.equals(await fs.readFile(source)));assert.ok(bytes.equals(await fs.readFile(path.join(first.directory,'assets/source-original.png'))));
  const cached=path.join(cache,first.layerCacheKey,'assets/upper.png'),before=await fs.stat(cached);
  const second=await prepareCharacterSource(source,mask,path.join(root,'second'),{...recipe,parts:recipe.parts.map(p=>({...p,frames:p.frames.map(f=>({...f,angle:f.angle/2}))}))},cache);
  assert.equal(second.layerCacheKey,first.layerCacheKey);assert.deepEqual(second.assetHashes,first.assetHashes);assert.equal((await fs.stat(cached)).mtimeMs,before.mtimeMs);
  await fs.writeFile(cached,'corrupt');await assert.rejects(prepareCharacterSource(source,mask,path.join(root,'third'),recipe,cache),/integrity/i);assert.ok(bytes.equals(await fs.readFile(source)));
});
