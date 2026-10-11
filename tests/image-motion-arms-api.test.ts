import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {buildServer} from '../apps/server/index.js';
import {temporary} from './support.js';
import {createRequire} from 'node:module';

const base='/api/projects/fixture/image-motion';
export const definition={backgroundMode:'paper',arms:[{id:'arm-1',erasePolygon:[[65,18],[78,18],[78,92],[65,92]],shoulder:{x:55,y:25},elbow:{x:65,y:50},wrist:{x:71,y:80},width:6,handWidth:14,handHeight:18,upperAngle:-60,foreAngle:15,occlusionPolygons:[]}]};
async function fixture(t:test.TestContext){const projectsRoot=await temporary(t),root=path.join(projectsRoot,'fixture');await fs.mkdir(root);await fs.writeFile(path.join(root,'project.yaml'),'project:\n  name: fixture\n');const app=await buildServer({projectsRoot,coordinatorLoader:async()=>{throw Error('Forbidden model/TTS/production access');}});t.after(()=>app.close());
  const png=async(body:string)=>sharp(Buffer.from(`<svg width="100" height="100"><rect width="100" height="100" fill="#f9efdb"/>${body}</svg>`)).png().toBuffer(),bytes=await png('<path d="M71 20V85" stroke="black" stroke-width="6"/>');
  const upload=async(input=bytes,revision='new')=>{const boundary='arm-test';return app.inject({method:'POST',url:base+'/images?revision='+revision,headers:{'content-type':'multipart/form-data; boundary='+boundary},payload:Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="source.png"\r\n\r\n`),input,Buffer.from(`\r\n--${boundary}--\r\n`)])});};return {app,root,bytes,png,upload};}

test('project arm definitions prepare a replacement, reopen it and keep original bytes',async t=>{
  const f=await fixture(t),book=(await f.upload()).json(),id=book.images[0].id;
  const saved=await f.app.inject({method:'PUT',url:base+'/arms',payload:{revision:book.revision,imageId:id,definition}});assert.equal(saved.statusCode,200,saved.body);const next=saved.json();assert.equal(next.productionReady,false);assert.deepEqual(next.images[0].armMotion.definition,definition);
  const preview=await f.app.inject({url:base+'/arms/'+id+'/scene'});assert.equal(preview.statusCode,200,preview.body);const p=preview.json();assert.equal(p.demo.scenes[0].parts.length,2);assert.equal(p.productionReady,false);
  const old=(await f.app.inject({url:base+'/images/'+id+'/original'})).rawPayload;assert.ok(old.equals(f.bytes));
  const background=await f.app.inject({url:p.assets['assets/background.png']}),rgba=await sharp(background.rawPayload).ensureAlpha().raw().toBuffer();assert.deepEqual([...rgba.subarray((75*100+71)*4,(75*100+71)*4+3)],[249,239,219],'old arm removed on paper');
  const same=await f.app.inject({method:'PUT',url:base+'/arms',payload:{revision:next.revision,imageId:id,definition}});assert.equal(same.statusCode,200,same.body);assert.equal(same.json().images[0].armMotion.key,next.images[0].armMotion.key);
  assert.deepEqual((await f.app.inject({url:base})).json(),same.json());
});

test('arm preparation rejects stale, invalid and busy edits and detects corrupted assets',async t=>{
  const f=await fixture(t),book=(await f.upload()).json(),id=book.images[0].id,put=(revision:string,input:any)=>f.app.inject({method:'PUT',url:base+'/arms',payload:{revision,imageId:id,definition:input}});
  const invalid=structuredClone(definition);invalid.arms[0]!.wrist.x=101;assert.equal((await put(book.revision,invalid)).statusCode,422);
  const flat=structuredClone(definition);flat.arms[0]!.erasePolygon=[[1,1],[2,2],[3,3]];assert.equal((await put(book.revision,flat)).statusCode,422);
  assert.equal((await put(book.revision,{...definition,code:'arbitrary JS'})).statusCode,422);
  assert.equal((await put(book.revision,{...definition,backgroundMode:'clean-plate',cleanPlateImageId:'a'.repeat(64)})).statusCode,422);
  await fs.writeFile(path.join(f.root,'.factory.lock'),JSON.stringify({pid:process.pid}));assert.equal((await put(book.revision,definition)).statusCode,409);await fs.unlink(path.join(f.root,'.factory.lock'));assert.deepEqual((await f.app.inject({url:base})).json(),book);
  const saved=await put(book.revision,definition);assert.equal(saved.statusCode,200,saved.body);const next=saved.json();assert.equal((await put(book.revision,definition)).statusCode,409);
  const scene=(await f.app.inject({url:base+'/arms/'+id+'/scene'})).json();await fs.writeFile(path.join(f.root,'input/image-motion/arm-previews',id,next.images[0].armMotion.key,'assets/arm-1-fore.png'),'bad');
  assert.equal((await f.app.inject({url:scene.assets['assets/arm-1-fore.png']})).statusCode,409);
  await fs.writeFile(path.join(f.root,'input/image-motion/'+id+'.png'),'corrupt');assert.equal((await f.app.inject({url:base+'/arms/'+id+'/scene'})).statusCode,409);assert.deepEqual((await f.app.inject({url:base})).json(),next);
});

test('clean plate fills only the erased region and removing the definition preserves source art',async t=>{
  const f=await fixture(t),first=(await f.upload()).json(),id=first.images[0].id,plate=await f.png('<rect width="100" height="100" fill="#175bb2"/>'),book=(await f.upload(plate,first.revision)).json(),plateId=book.images.find((i:any)=>i.id!==id).id;
  const input={...definition,backgroundMode:'clean-plate',cleanPlateImageId:plateId},saved=await f.app.inject({method:'PUT',url:base+'/arms',payload:{revision:book.revision,imageId:id,definition:input}});assert.equal(saved.statusCode,200,saved.body);const next=saved.json();
  const scene=(await f.app.inject({url:base+'/arms/'+id+'/scene'})).json(),background=await f.app.inject({url:scene.assets['assets/background.png']}),raw=await sharp(background.rawPayload).ensureAlpha().raw().toBuffer();
  const pixel=(x:number,y:number)=>[...raw.subarray((y*100+x)*4,(y*100+x)*4+3)];assert.deepEqual(pixel(71,75),[23,91,178]);assert.deepEqual(pixel(20,20),[249,239,219],'clean plate cannot recolor outside the deletion region');
  const cleared=await f.app.inject({method:'PUT',url:base+'/arms',payload:{revision:next.revision,imageId:id,definition:{backgroundMode:'paper',arms:[]}}});assert.equal(cleared.statusCode,200,cleared.body);assert.equal(cleared.json().images[0].armMotion,undefined);assert.equal((await f.app.inject({url:base+'/arms/'+id+'/scene'})).statusCode,404);assert.ok((await f.app.inject({url:base+'/images/'+id+'/original'})).rawPayload.equals(f.bytes));
});

test('background preparation stops for missing paper or transparent clean plate',async t=>{
  const f=await fixture(t),first=(await f.upload()).json();
  const dark=await f.png('<rect width="100" height="100" fill="#13283a"/>'),second=(await f.upload(dark,first.revision)).json(),id=second.images.find((i:any)=>i.id!==first.images[0].id).id;
  const put=(imageId:string,input:any)=>f.app.inject({method:'PUT',url:base+'/arms',payload:{revision:second.revision,imageId,definition:input}});
  const noPaper=await put(id,definition);assert.equal(noPaper.statusCode,422,noPaper.body);assert.equal(noPaper.json().error.code,'NEEDS_BACKGROUND');assert.deepEqual((await f.app.inject({url:base})).json(),second,'failed repair cannot save a definition');
  const transparent=await sharp({create:{width:100,height:100,channels:4,background:{r:249,g:239,b:219,alpha:0}}}).png().toBuffer(),book=(await f.upload(transparent,second.revision)).json(),plateId=book.images[2].id;
  const missing=await f.app.inject({method:'PUT',url:base+'/arms',payload:{revision:book.revision,imageId:first.images[0].id,definition:{...definition,backgroundMode:'clean-plate',cleanPlateImageId:plateId}}});assert.equal(missing.statusCode,422,missing.body);assert.equal(missing.json().error.code,'NEEDS_BACKGROUND');assert.deepEqual((await f.app.inject({url:base})).json(),book,'transparent repair cannot save a definition');
});

test('browser authors polygon and joints, saves under lock, compares source, seeks and restores clean plate',{timeout:60000},async t=>{
  const f=await fixture(t);await f.app.listen({host:'127.0.0.1',port:0});const address=f.app.server.address();assert.ok(address&&typeof address!=='string');
  const puppeteer=createRequire(import.meta.url)('puppeteer-core') as typeof import('puppeteer-core');const browser=await puppeteer.launch({executablePath:process.env.IMAGE_MOTION_CHROME??'C:/Users/Duongvh-pc/.cache/puppeteer/chrome-headless-shell/win64-154.0.8037.57/chrome-headless-shell-win64/chrome-headless-shell.exe',headless:true,args:['--disable-background-networking']});t.after(()=>browser.close());const page=await browser.newPage(),errors:string[]=[];page.on('pageerror',e=>{errors.push(e instanceof Error?e.message:String(e));});page.setDefaultTimeout(10000);await page.setViewport({width:1280,height:800});const origin=`http://127.0.0.1:${address.port}`;
  await page.goto(origin+base+'/editor');assert.equal(await page.$eval('a[href$="/arms/editor"]',e=>e.textContent),'Thay tay cho nhân vật');await page.click('a[href$="/arms/editor"]');assert.match(page.url(),/arms\/editor$/);
  const source=path.join(f.root,'upload.png');await fs.writeFile(source,f.bytes);await (await page.$('input#upload'))!.uploadFile(source);try{await page.waitForFunction(()=>document.querySelector<HTMLCanvasElement>('#stage')!.width===100&&!document.querySelector<HTMLButtonElement>('#add')!.disabled);}catch(e){throw Error(String(e)+' '+JSON.stringify({errors,state:await page.evaluate(()=>({status:document.querySelector('#status')!.textContent,width:document.querySelector<HTMLCanvasElement>('#stage')!.width,uploadDisabled:document.querySelector<HTMLInputElement>('#upload')!.disabled}))}));}
  await page.click('#add');await page.$eval('#guide',e=>e.scrollIntoView({block:'center'}));const box=(await (await page.$('#guide'))!.boundingBox())!;
  for(const [x,y]of definition.arms[0]!.erasePolygon)await page.mouse.click(box.x+box.width*x!/100,box.y+box.height*y!/100);
  assert.equal(await page.$eval('#finishErase',e=>(e as HTMLButtonElement).disabled),false);await page.click('#finishErase');assert.equal((await page.$eval('#erase',e=>(e as HTMLTextAreaElement).value)).split('\n').length,4);
  const input=async(id:string,value:string)=>page.$eval('#'+id,(e,v)=>{(e as HTMLInputElement).value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
  for(const [id,value]of Object.entries({shoulderX:55,shoulderY:25,elbowX:65,elbowY:50,wristX:71,wristY:80,width:6,handWidth:14,handHeight:18,upperAngle:-60,foreAngle:15}))await input(id,String(value));
  await page.$eval('#guide',e=>e.scrollIntoView({block:'center'}));const draftBox=(await (await page.$('#guide'))!.boundingBox())!;await page.mouse.click(draftBox.x+draftBox.width*.25,draftBox.y+draftBox.height*.25);assert.equal(await page.$eval('#save',e=>(e as HTMLButtonElement).disabled),true,'unfinished polygon cannot be saved');assert.equal(await page.$eval('#arm',e=>(e as HTMLSelectElement).disabled),true,'unfinished polygon cannot be silently discarded by switching arms');await page.click('#undoErase');assert.equal(await page.$eval('#save',e=>(e as HTMLButtonElement).disabled),false,'undoing the last draft point restores a valid saved polygon');
  await input('erase','broken');await input('width','7');assert.equal(await page.$eval('#save',e=>(e as HTMLButtonElement).disabled),true,'another field cannot hide an invalid polygon');await input('erase','65,18\n78,18\n78,92\n65,92');await input('width','6');
  assert.equal(await page.$eval('#preview',e=>(e as HTMLButtonElement).disabled),true,'old preview must be unavailable for a dirty draft');
  await page.setRequestInterception(true);let held:any;const heldRequest=new Promise<any>(resolve=>{held=resolve;});const intercept=(r:any)=>{if(r.url().endsWith('/arms')&&r.method()==='PUT')held(r);else void r.continue();};page.on('request',intercept);await page.click('#save');const request=await heldRequest;
  try{for(const id of ['upload','image','width','add'])assert.equal(await page.$eval('#'+id,e=>(e as HTMLInputElement).disabled),true,'save must lock '+id);}finally{await request.continue();}
  await page.waitForFunction(()=>document.querySelector('#status')!.textContent!.startsWith('Đã lưu tay'));page.off('request',intercept);await page.setRequestInterception(false);assert.equal(await page.$eval('#preview',e=>(e as HTMLButtonElement).disabled),false);
  await page.click('#preview');const pixels=async(time:number)=>{await input('seek',String(time));return page.$eval('#stage',e=>Array.from((e as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,100,100).data));};
  const neutral=await pixels(0),pixel=(p:number[],x:number,y:number)=>p.slice((y*100+x)*4,(y*100+x)*4+3);assert.deepEqual(pixel(neutral,71,35),[249,239,219]);const pose=await pixels(2500);assert.notDeepEqual(pose,neutral);await pixels(700);assert.deepEqual(await pixels(2500),pose);
  await page.click('#original');assert.deepEqual(await page.$eval('#stage',e=>Array.from((e as HTMLCanvasElement).getContext('2d')!.getImageData(71,35,1,1).data).slice(0,3)),[0,0,0]);
  await page.reload();await page.waitForFunction(()=>!document.querySelector<HTMLButtonElement>('#preview')!.disabled);assert.equal(await page.$eval('#shoulderX',e=>(e as HTMLInputElement).value),'55');
  const book=(await f.app.inject({url:base})).json(),plate=(await f.upload(await f.png('<rect width="100" height="100" fill="#175bb2"/>'),book.revision)).json().images[1];await page.reload();await page.waitForFunction(()=>!document.querySelector<HTMLButtonElement>('#preview')!.disabled);await page.select('#backgroundMode','clean-plate');await page.select('#clean',plate.id);await page.click('#save');await page.waitForFunction(()=>document.querySelector('#status')!.textContent!.startsWith('Đã lưu tay'));await page.reload();await page.waitForFunction(()=>!document.querySelector<HTMLButtonElement>('#preview')!.disabled);assert.equal(await page.$eval('#clean',e=>(e as HTMLSelectElement).value),plate.id);assert.equal(await page.$eval('#backgroundMode',e=>(e as HTMLSelectElement).value),'clean-plate');
  const evidence=path.resolve('runtime/image-motion/arm-editor-evidence');await fs.mkdir(evidence,{recursive:true});for(const width of [1280,800,375]){await page.setViewport({width,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);await page.screenshot({path:path.join(evidence,`arm-editor-${width}.png`),fullPage:true});}
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.reload();await page.waitForFunction(()=>!document.querySelector<HTMLButtonElement>('#preview')!.disabled);assert.equal(await page.$eval('#play',e=>e.textContent),'Phát');assert.deepEqual(errors,[]);
});
