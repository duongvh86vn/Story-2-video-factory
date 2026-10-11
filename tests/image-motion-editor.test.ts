import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {createRequire} from 'node:module';
import {temporary} from './support.js';
import {buildServer} from '../apps/server/index.js';

const url='/api/projects/fixture/image-motion';
async function fixture(t:test.TestContext){
  const projectsRoot=await temporary(t),root=path.join(projectsRoot,'fixture');await fs.mkdir(root);await fs.writeFile(path.join(root,'project.yaml'),'project:\n  name: fixture\n');
  const app=await buildServer({projectsRoot,coordinatorLoader:async()=>{throw new Error('Forbidden production/model/voice call');}});t.after(()=>app.close());
  const bytes=await sharp(Buffer.from('<svg width="100" height="80"><rect width="100" height="80" fill="#8ec9f2"/><circle cx="50" cy="40" r="22" fill="#bbaa77"/><rect x="55" y="37" width="13" height="6" fill="red"/></svg>')).png().toBuffer();
  const upload=async(revision='new',input=bytes)=>{
    const boundary='factory-image-motion-boundary';return app.inject({method:'POST',url:url+'/images?revision='+revision,headers:{'content-type':'multipart/form-data; boundary='+boundary},payload:Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="source.png"\r\nContent-Type: image/png\r\n\r\n`),input,Buffer.from(`\r\n--${boundary}--\r\n`)])});
  };
  return {app,root,bytes,upload};
}

// Catches an absent intake route, modified source bytes, regenerated duplicate input,
// lost saved geometry, and a stale editor overwriting a newer motion definition.
test('uploads original image once and saves editable regions with revision protection',async t=>{
  const f=await fixture(t),first=await f.upload();assert.equal(first.statusCode,201,first.body);
  const book=first.json(),image=book.images[0];assert.equal(book.images.length,1);assert.equal(image.width,100);assert.equal(image.height,80);
  const original=await f.app.inject({url:url+'/images/'+image.id+'/original'});assert.equal(original.statusCode,200);assert.ok(original.rawPayload.equals(f.bytes));
  const region={id:'disc',cx:50,cy:40,rx:20,ry:24,periodMs:2400,direction:1};
  const saved=await f.app.inject({method:'PUT',url:url+'/regions',payload:{revision:book.revision,imageId:image.id,regions:[region]}});assert.equal(saved.statusCode,200,saved.body);
  const next=saved.json();assert.deepEqual(next.images[0].regions,[region]);assert.notEqual(next.revision,book.revision);
  const duplicate=await f.upload(next.revision);assert.equal(duplicate.statusCode,201,duplicate.body);assert.deepEqual(duplicate.json(),next);
  assert.deepEqual((await f.app.inject({url})).json(),next);
  const conflict=await f.app.inject({method:'PUT',url:url+'/regions',payload:{revision:book.revision,imageId:image.id,regions:[]}});assert.equal(conflict.statusCode,409);assert.deepEqual((await f.app.inject({url})).json(),next);
});

// Catches a missing/inert editor, loss on reload, accumulation after seek, and
// canvas selection that is scaled incorrectly at responsive viewport sizes.
test('browser uploads, draws and saves a region, then reloads and seeks the same pixels',{timeout:45000},async t=>{
  const f=await fixture(t),chrome=process.env.IMAGE_MOTION_CHROME??'C:/Users/Duongvh-pc/.cache/puppeteer/chrome-headless-shell/win64-154.0.8037.57/chrome-headless-shell-win64/chrome-headless-shell.exe';await fs.access(chrome);
  await f.app.listen({host:'127.0.0.1',port:0});const address=f.app.server.address();assert.ok(address&&typeof address!=='string');
  const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core') as typeof import('puppeteer-core');
  const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--disable-background-networking','--disable-sync','--no-first-run']});t.after(()=>browser.close());
  const page=await browser.newPage();await page.setViewport({width:1280,height:800});await page.goto(`http://127.0.0.1:${address.port}${url}/editor`);
  assert.equal(await page.$eval('body',e=>e.querySelectorAll('input[type=file]').length),1,'editor must expose an image upload control');
  const source=path.join(f.root,'test-upload.png');await fs.writeFile(source,f.bytes);await (await page.$('input[type=file]'))!.uploadFile(source);
  await page.waitForFunction(()=>document.querySelector<HTMLSelectElement>('#image')!.options.length===1);
  await page.waitForFunction(()=>document.querySelector<HTMLCanvasElement>('#stage')!.width===100);
  const box=(await (await page.$('#guide'))!.boundingBox())!;
  await page.mouse.move(box.x+box.width*.30,box.y+box.height*.25);await page.mouse.down();await page.mouse.move(box.x+box.width*.70,box.y+box.height*.75);await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector<HTMLSelectElement>('#region')!.options.length===1);
  await page.$eval('#periodMs',e=>{(e as HTMLInputElement).value='1000';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.click('#save');await page.waitForFunction(()=>document.querySelector('#status')!.textContent==='Đã lưu vùng chuyển động.');
  const saved=(await f.app.inject({url})).json();assert.equal(saved.images[0].regions.length,1);assert.ok(Math.abs(saved.images[0].regions[0].cx-50)<.1);assert.ok(Math.abs(saved.images[0].regions[0].cy-40)<.1);
  // Keep a real save request in flight: switching/editing while it completes
  // would otherwise allow the response to mark newer local changes as saved.
  await page.setRequestInterception(true);let held:any,release:()=>void;
  const heldRequest=new Promise<void>(resolve=>{release=resolve;});
  const intercept=(request:import('puppeteer-core').HTTPRequest)=>{if(request.method()==='PUT'&&request.url().endsWith('/regions')){held=request;release();}else void request.continue();};page.on('request',intercept);
  await page.$eval('#periodMs',e=>{(e as HTMLInputElement).value='1100';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.click('#save');await heldRequest;
  try{assert.equal(await page.$eval('#image',e=>(e as HTMLSelectElement).disabled),true,'source switching must be disabled during a save');assert.equal(await page.$eval('#periodMs',e=>(e as HTMLInputElement).disabled),true);}finally{await held.continue();}
  await page.waitForFunction(()=>document.querySelector('#status')!.textContent==='Đã lưu vùng chuyển động.');page.off('request',intercept);await page.setRequestInterception(false);
  await page.reload();await page.waitForFunction(()=>document.querySelector<HTMLSelectElement>('#region')!.options.length===1);
  const at=async(time:number)=>page.$eval('#seek',(e,t)=>{(e as HTMLInputElement).value=String(t);e.dispatchEvent(new Event('input',{bubbles:true}));const ctx=document.querySelector<HTMLCanvasElement>('#stage')!.getContext('2d')!;return Array.from(ctx.getImageData(0,0,100,80).data);},time);
  const a=await at(250),zero=await at(0);assert.notDeepEqual(a,zero);await at(3000);await at(150);assert.deepEqual(await at(250),a);
  const evidence=path.resolve('runtime/image-motion/editor-evidence');await fs.mkdir(evidence,{recursive:true});
  for(const width of [1280,800,375]){await page.setViewport({width,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow at ${width}`);await page.screenshot({path:path.join(evidence,`editor-${width}.png`),fullPage:true});}
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.reload();await page.waitForSelector('#play');assert.equal(await page.$eval('#play',e=>e.textContent),'Phát');
  await page.waitForFunction(()=>document.querySelector<HTMLSelectElement>('#region')!.options.length===1);
  const edge=(await (await page.$('#guide'))!.boundingBox())!;await page.mouse.move(edge.x+2,edge.y+2);await page.mouse.down();await page.mouse.move(edge.x+edge.width+20,edge.y+edge.height+20);await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector<HTMLSelectElement>('#region')!.options.length===2);await page.click('#save');await page.waitForFunction(()=>document.querySelector('#status')!.textContent==='Đã lưu vùng chuyển động.');
  const bounded=(await f.app.inject({url})).json().images[0].regions[1];assert.ok(bounded.cx-bounded.rx>=0&&bounded.cy-bounded.ry>=0&&bounded.cx+bounded.rx<=100&&bounded.cy+bounded.ry<=80);
  // Interrupted movement must still warn before discarding the changed position.
  await page.$eval('#region',e=>{(e as HTMLSelectElement).value='region-1';e.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.$eval('#guide',e=>e.scrollIntoView({block:'center'}));const moved=(await (await page.$('#guide'))!.boundingBox())!;
  await page.mouse.move(moved.x+moved.width*.5,moved.y+moved.height*.5);await page.mouse.down();await page.mouse.move(moved.x+moved.width*.55,moved.y+moved.height*.5);await page.$eval('#guide',e=>e.dispatchEvent(new PointerEvent('pointercancel')));await page.mouse.up();
  const prompted=new Promise<string>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Discard prompt did not appear')),5000);page.once('dialog',async d=>{clearTimeout(timeout);resolve(d.message());await d.dismiss();});});await page.click('#reload');assert.match(await prompted,/chưa lưu/);
  // Reusing an older source must select that source, not the last catalog entry.
  page.once('dialog',d=>void d.accept());
  const second=path.join(f.root,'second.png');await fs.writeFile(second,await sharp(f.bytes).negate().png().toBuffer());
  await (await page.$('input#upload'))!.uploadFile(second);
  await page.waitForFunction(()=>document.querySelector<HTMLSelectElement>('#image')!.options.length===2&&!document.querySelector<HTMLInputElement>('#upload')!.disabled);
  await (await page.$('input#upload'))!.uploadFile(source);
  await page.waitForFunction(()=>!document.querySelector<HTMLInputElement>('#upload')!.disabled);
  assert.equal(await page.$eval('#image',e=>(e as HTMLSelectElement).value),saved.images[0].id,'duplicate upload must reopen its saved regions');
});

test('matching orphaned image files are reused when a publication is retried',async t=>{
  const f=await fixture(t),first=await f.upload();assert.equal(first.statusCode,201);const initial=first.json();await fs.unlink(path.join(f.root,'input/image-motion/catalog.json'));
  const retry=await f.upload();assert.equal(retry.statusCode,201,retry.body);assert.deepEqual(retry.json(),initial);
});

// Catches out-of-bounds crops, mutation while production owns the project, and
// a corrupt cached image being silently treated as usable source artwork.
test('rejects invalid regions and busy or corrupt sources without changing the saved book',async t=>{
  const f=await fixture(t),response=await f.upload();assert.equal(response.statusCode,201,response.body);const book=response.json(),id=book.images[0].id;
  const payload={revision:book.revision,imageId:id,regions:[{id:'disc',cx:90,cy:40,rx:20,ry:20,periodMs:2400,direction:1}]};
  assert.equal((await f.app.inject({method:'PUT',url:url+'/regions',payload})).statusCode,422);
  await fs.writeFile(path.join(f.root,'.factory.lock'),JSON.stringify({pid:process.pid}));assert.equal((await f.upload(book.revision)).statusCode,409);await fs.unlink(path.join(f.root,'.factory.lock'));
  assert.deepEqual((await f.app.inject({url})).json(),book);
  await fs.writeFile(path.join(f.root,'input/image-motion/'+id+'.png'),'corrupt');
  assert.equal((await f.app.inject({url:url+'/images/'+id+'/preview'})).statusCode,409);
  assert.equal((await f.app.inject({method:'PUT',url:url+'/regions',payload:{revision:book.revision,imageId:id,regions:[]}})).statusCode,409);
  assert.deepEqual((await f.app.inject({url})).json(),book);
});
