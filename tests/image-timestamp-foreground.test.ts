import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {createRequire} from 'node:module';
import {temporary} from './support.js';
import {emptyTimestampMotion,validateTimestampMotion} from '../packages/image-motion/timestamp-definition.js';
import {prepareTimestampMotion} from '../packages/image-motion/timestamp-prepare.js';
import {createImageMotionHtml} from '../packages/image-motion/scene.js';
import {hash} from '../packages/core/utils.js';
const foreground={id:'frame',polygon:[[42,10],[48,10],[48,54],[42,54]]};
const rotation={id:'wheel',cx:32,cy:32,rx:20,ry:20,periodMs:1200,direction:1};
const clock={startMs:0,endMs:1000,startFrame:0,endFrame:60,fps:60};

test('foreground rejects invalid polygons and requires a clean rotation texture only on overlap',()=>{
 const old={...emptyTimestampMotion(),rotations:[rotation]};assert.deepEqual(validateTimestampMotion(old,64,64),old);
 assert.throws(()=>validateTimestampMotion({...old,occlusions:[foreground]},64,64),/needs-motion-source/);
 assert.throws(()=>validateTimestampMotion({...old,rotationSource:'clean-plate'},64,64),/needs-motion-source/);
 const d={...old,occlusions:[foreground],rotationSource:'clean-plate',background:{mode:'clean-plate',cleanPlateId:'0'.repeat(64)}};
 assert.equal(validateTimestampMotion(d,64,64).occlusions!.length,1);
 assert.throws(()=>validateTimestampMotion({...d,occlusions:[{...foreground,id:'wheel'}]},64,64));
 assert.throws(()=>validateTimestampMotion({...d,occlusions:[{...foreground,polygon:[[1,1],[2,2],[3,3]]}]},64,64),/diện tích/);
 assert.throws(()=>validateTimestampMotion({...d,occlusions:[{...foreground,polygon:[[1,1],[70,1],[2,2]]}]},64,64),/nằm trong/);
 assert.equal(validateTimestampMotion({...old,occlusions:[{id:'label',polygon:[[0,0],[4,0],[4,4],[0,4]]}]},64,64).occlusions!.length,1);
});

test('source foreground stays RGB-exact over a clean rotating texture and never rotates into another region',async t=>{
 const root=await temporary(t),source=path.join(root,'source.png'),plate=path.join(root,'plate.png');
 const svg=async(body:string)=>sharp(Buffer.from('<svg width="64" height="64">'+body+'</svg>')).png().toBuffer();
 const wheel='<rect width="64" height="64" fill="white"/><circle cx="32" cy="32" r="20" stroke="black" stroke-width="2" fill="white"/><path d="M12 32H52M32 12V52M18 18L46 46" stroke="black" stroke-width="2"/>';
 const clean=await svg(wheel),original=await svg(wheel+'<rect x="42" y="10" width="6" height="44" fill="#e62020"/>');await fs.writeFile(source,original);await fs.writeFile(plate,clean);
 const definition={...emptyTimestampMotion(),rotations:[rotation],occlusions:[foreground],rotationSource:'clean-plate',background:{mode:'clean-plate',cleanPlateId:hash(clean)}};
 const p=await prepareTimestampMotion(source,path.join(root,'out'),definition,clock,path.join(root,'cache'),plate);
 assert.equal(p.demo.scenes[0]!.parts!.at(-1)!.id,'frame');assert.ok(p.demo.scenes[0]!.parts!.at(-1)!.frames.every(f=>f.angle===0));assert.equal(p.assetHashes['assets/rotation-source.png'],hash(clean));
 const re=await prepareTimestampMotion(source,path.join(root,'other'),{...definition,rotations:[{...rotation,periodMs:1800}]},clock,path.join(root,'cache'),plate);assert.equal(re.layerCacheKey,p.layerCacheKey);assert.equal(re.assetHashes['assets/frame.png'],p.assetHashes['assets/frame.png']);assert.ok(original.equals(await fs.readFile(source)));
 const demo=structuredClone(p.demo),scene=demo.scenes[0]!;const data=async(file:string)=>'data:image/png;base64,'+(await fs.readFile(path.join(p.directory,file))).toString('base64');scene.original=await data(scene.original);scene.background=await data(scene.background);for(const l of scene.layers)l.image=await data(l.image);for(const part of scene.parts!)part.image=await data(part.image);
 const browser=await createRequire(import.meta.url)('puppeteer-core').launch({executablePath:process.env.IMAGE_MOTION_CHROME??'C:/Users/Duongvh-pc/.cache/puppeteer/chrome-headless-shell/win64-154.0.8037.57/chrome-headless-shell-win64/chrome-headless-shell.exe',headless:true,args:['--disable-background-networking']});
 try{const page=await browser.newPage();await page.setContent(createImageMotionHtml(demo));await page.evaluate(()=>(window as any).ready);const pixels=async(ms:number)=>page.evaluate((time:number)=>{(window as any).renderFrame(time);return Array.from(document.querySelector<HTMLCanvasElement>('#stage')!.getContext('2d')!.getImageData(0,0,64,64).data);},ms);const before=await pixels(0),pose=await pixels(500);assert.ok(Buffer.from(before).equals(await sharp(original).ensureAlpha().raw().toBuffer()));
 for(let y=12;y<52;y++)for(let x=43;x<47;x++){const i=(y*64+x)*4;assert.deepEqual(pose.slice(i,i+4),before.slice(i,i+4));}
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;if(x>=41&&x<=49&&y>=9&&y<=55)continue;assert.ok(!(pose[i]!>160&&pose[i+1]!<80&&pose[i+2]!<80),'frame color leaked into the rotating wheel');}
 assert.notDeepEqual(pose,before);await pixels(900);assert.deepEqual(await pixels(500),pose);
 }finally{await browser.close();}
 const translucent=await svg('<rect width="64" height="64" fill="white" fill-opacity="0.5"/>');await fs.writeFile(plate,translucent);await assert.rejects(prepareTimestampMotion(source,path.join(root,'transparent'),{...definition,background:{mode:'clean-plate',cleanPlateId:hash(translucent)}},clock,path.join(root,'cache'),plate),/needs-motion-source/);
});

test('protected source pixels are excluded from a moving part alpha and source body is restored over it',async t=>{
 const root=await temporary(t),source=path.join(root,'source.png'),original=await sharp(Buffer.from('<svg width="64" height="64"><rect width="64" height="64" fill="white"/><rect x="25" y="10" width="10" height="40" fill="black"/><rect x="20" y="35" width="30" height="15" fill="#9f692c"/></svg>')).png().toBuffer();await fs.writeFile(source,original);
 const def={...emptyTimestampMotion(),parts:[{id:'arm',polygon:[[24,8],[36,8],[36,52],[24,52]],pivot:{x:30,y:15},angle:-20}],occlusions:[{id:'cloth',polygon:[[20,35],[50,35],[50,50],[20,50]]}]};
 const result=await prepareTimestampMotion(source,path.join(root,'first'),def,clock,path.join(root,'cache'));const arm=await sharp(path.join(result.directory,'assets/arm.png')).ensureAlpha().raw().toBuffer();assert.equal(arm[(40*64+30)*4+3],0,'protected clothing cannot be carried by the arm');const cloth=await sharp(path.join(result.directory,'assets/cloth.png')).ensureAlpha().raw().toBuffer();assert.deepEqual([...cloth.subarray((40*64+30)*4,(40*64+30)*4+4)],[159,105,44,255]);
 const second=await prepareTimestampMotion(source,path.join(root,'second'),{...def,parts:[{...def.parts[0],angle:15}]},clock,path.join(root,'cache'));assert.equal(result.layerCacheKey,second.layerCacheKey);assert.equal(result.assetHashes['assets/arm.png'],second.assetHashes['assets/arm.png']);
});
