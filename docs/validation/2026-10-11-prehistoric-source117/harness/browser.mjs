import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const base='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1',require=createRequire(base+'/package.json'),puppeteer=require('puppeteer-core');
const roots={original:base+'/runtime/prehistoric-life/qa/source116-chin/render-lila-left/shot-1/scenes',packed:base+'/runtime/prehistoric-life/qa/source117-binary/left-shot-1/scenes'},out=base+'/runtime/prehistoric-life/qa/source117-binary/browser-compare';await fs.mkdir(out,{recursive:true});
const report={scope:'EXACT SCENE TRANSPORT/SEEK COMPARISON; NOT MOTION/ART ACCEPTANCE',productionAcceptance:false,paidCalls:0,variants:{}};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1'),parts=decodeURIComponent(u.pathname).split('/').filter(Boolean),root=roots[parts.shift()],file=path.resolve(root||out,parts.join('/'));if(!root||!file.startsWith(path.resolve(root)+path.sep))throw Error('Invalid path');res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','svg':'image/svg+xml','png':'image/png'})[file.split('.').at(-1)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('Not found');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:'C:/Users/Duongvh-pc/.cache/puppeteer/chrome-headless-shell/win64-154.0.8037.57/chrome-headless-shell-win64/chrome-headless-shell.exe',headless:true,args:['--no-sandbox']});
const save=()=>fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)),hash=b=>createHash('sha256').update(b).digest('hex');
try{
 for(const variant of Object.keys(roots)){
  const page=await browser.newPage();await page.setViewport({width:1280,height:720,deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(String(e)));const start=performance.now();
  await page.goto(`http://127.0.0.1:${server.address().port}/${variant}/index.html`,{waitUntil:'networkidle0',timeout:120000});
  const init=await page.evaluate(()=>({timelines:Object.keys(window.__timelines||{}),duration:window.__timelines?.['native-seat-canonical-1']?.duration()}));if(!init.timelines.includes('native-seat-canonical-1'))throw Error('Timeline unavailable');
  const loadMs=Math.round(performance.now()-start),frames=[];
  for(const [index,timeMs]of [0,800,1499,300,0,1499,800].entries()){
   const state=await page.evaluate(async time=>{const tl=window.__timelines['native-seat-canonical-1'];tl.pause();tl.totalTime(time/1000,false);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return [...document.querySelectorAll('svg *')].map(e=>[e.tagName,e.id,e.getAttribute('transform'),e.getAttribute('d'),e.getAttribute('opacity'),e.style.cssText]);},timeMs);
   const file=`${variant}-${index}-${timeMs}.png`,png=await page.screenshot({path:out+'/'+file});frames.push({index,timeMs,file,domSha256:hash(JSON.stringify(state)),pngSha256:hash(png)});
  }
  report.variants[variant]={init,loadMs,onePageMetrics:await page.metrics(),errors,frames};await page.close();await save();
 }
 report.equal=report.variants.original.frames.every((f,i)=>f.domSha256===report.variants.packed.frames[i].domSha256&&f.pngSha256===report.variants.packed.frames[i].pngSha256);
 report.repeatedSeeksStable=Object.values(report.variants).every(v=>v.frames.every(f=>v.frames.filter(g=>g.timeMs===f.timeMs).every(g=>f.domSha256===g.domSha256&&f.pngSha256===g.pngSha256)));
 await save();if(!report.equal||!report.repeatedSeeksStable||Object.values(report.variants).some(v=>v.errors.length))throw Error('Browser transport/seek mismatch');console.log(JSON.stringify({equal:report.equal,repeatedSeeksStable:report.repeatedSeeksStable,seeks:7}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
