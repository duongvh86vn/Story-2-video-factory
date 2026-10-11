import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import sharp from 'sharp';
import {type PreparedDemo} from './prepare.js';

export interface LocalExportOptions {chrome:string;ffmpeg:string;ffprobe:string;onProgress?:(frame:number,total:number)=>void}

async function run(binary:string,args:string[]):Promise<string>{
  const child=spawn(binary,args,{windowsHide:true,stdio:['ignore','pipe','pipe']}),out:Buffer[]=[],err:Buffer[]=[];
  child.stdout.on('data',x=>out.push(x));child.stderr.on('data',x=>err.push(x));
  const code=await new Promise<number|null>((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
  if(code!==0)throw new Error(`${path.basename(binary)} exit ${code}: ${Buffer.concat(err).toString().slice(-2000)}`);
  return Buffer.concat(out).toString();
}

/** Captures the public viewer at exact frame times. No Studio, model or TTS calls. */
export async function exportLocalDemo(prepared:PreparedDemo,options:LocalExportOptions):Promise<Record<string,unknown>> {
  const {directory,demo}=prepared;
  for(const exe of [options.chrome,options.ffmpeg,options.ffprobe])await fs.access(exe);
  const assets=[...new Set(demo.scenes.flatMap(s=>[s.original,s.background,...s.layers.map(l=>l.image)]))],files=new Map<string,Buffer>();
  for(const asset of [...assets,'index.html'])files.set('/'+asset,await fs.readFile(path.join(directory,asset)));
  const server=createServer((req,res)=>{const url=new URL(req.url??'/', 'http://127.0.0.1'),key=url.pathname==='/'?'/index.html':url.pathname,body=files.get(key);if(!body){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':key.endsWith('.html')?'text/html; charset=utf-8':'image/png','Cache-Control':'no-store'});res.end(body);});
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();if(!address||typeof address==='string')throw new Error('Local demo server did not bind');
  const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core') as typeof import('puppeteer-core');
  let browser:Awaited<ReturnType<typeof puppeteer.launch>>|undefined,encoder:ReturnType<typeof spawn>|undefined;
  const errors:string[]=[],started=new Date().toISOString();
  try {
    browser=await puppeteer.launch({executablePath:options.chrome,headless:true,args:['--disable-background-networking','--disable-sync','--no-first-run'],userDataDir:path.join(directory,'browser-profile')});
    const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
    await page.setRequestInterception(true);page.on('request',r=>{if(new URL(r.url()).origin===`http://127.0.0.1:${address.port}`)void r.continue();else{errors.push('Blocked external request '+r.url());void r.abort();}});
    await page.goto(`http://127.0.0.1:${address.port}/`,{waitUntil:'networkidle0'});await page.evaluate(()=> (window as any).ready);
    const frame=async(at:number)=>Buffer.from(await page.evaluate(t=>{(window as any).renderFrame(t);return (document.getElementById('stage') as HTMLCanvasElement).toDataURL('image/png').split(',')[1]!;},at),'base64');
    await fs.mkdir(path.join(directory,'frames'));
    // Motion probes avoid a whole rotation period; returning to the original is valid.
    const pixelChecks:Record<string,unknown>[]=[],snapshots:number[]=[0,600,1250,2700,4700,5000,5600,6250,7700,9800];
    for(const at of snapshots){
      const png=await frame(at);await fs.writeFile(path.join(directory,'frames',String(at).padStart(5,'0')+'.png'),png);
      const s=at<5000?demo.scenes[0]!:demo.scenes[1]!,raw=await sharp(png).removeAlpha().raw().toBuffer(),original=await sharp(path.join(directory,s.original)).removeAlpha().raw().toBuffer();
      let outsideChanged=0,insideChanged=0;
      for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){
        const i=(y*s.width+x)*3;if(raw[i]===original[i]&&raw[i+1]===original[i+1]&&raw[i+2]===original[i+2])continue;
        const inside=s.layers.some(l=>((x-l.cx)/(l.rx+2))**2+((y-l.cy)/(l.ry+2))**2<=1);
        if(inside)insideChanged++;else outsideChanged++;
      }
      pixelChecks.push({atMs:at,scene:s.id,outsideChanged,insideChanged});
      if(outsideChanged!==0||((at%5000)!==0&&insideChanged===0))throw new Error(`Pixel QC failed at ${at}ms`);
    }
    const seekFrame=await frame(6250);await frame(9800);await frame(100);if(!seekFrame.equals(await frame(6250)))throw new Error('Random seek PNG mismatch');
    const fps=demo.fps,totalFrames=Math.round(demo.scenes.reduce((sum,s)=>sum+s.durationMs,0)/1000*fps),movie=path.join(directory,'demo.mp4');
    encoder=spawn(options.ffmpeg,['-hide_banner','-loglevel','error','-n','-f','image2pipe','-framerate',String(fps),'-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',movie],{windowsHide:true,stdio:['pipe','ignore','pipe']});
    const err:Buffer[]=[];encoder.stderr!.on('data',x=>err.push(x));encoder.stdin!.on('error',()=>{});
    const done=new Promise<void>((resolve,reject)=>{encoder!.once('error',reject);encoder!.once('close',code=>code===0?resolve():reject(new Error(`FFmpeg exit ${code}: ${Buffer.concat(err).toString()}`)));});void done.catch(()=>{});
    for(let n=0;n<totalFrames;n++){
      const bytes=await frame(n/fps*1000);if(!encoder.stdin!.write(bytes))await Promise.race([once(encoder.stdin!,'drain'),done.then(()=>{throw new Error('Encoder ended before all frames');})]);
      if(n%60===0)options.onProgress?.(n,totalFrames);
    }
    encoder.stdin!.end();await done;options.onProgress?.(totalFrames,totalFrames);
    const metadata=JSON.parse(await run(options.ffprobe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',movie]));
    await run(options.ffmpeg,['-v','error','-i',movie,'-f','null','-']);
    const video=metadata.streams.find((s:any)=>s.codec_type==='video');
    if(!video||video.width!==1920||video.height!==1080||video.r_frame_rate!=='60/1'||Number(video.nb_read_frames)!==totalFrames||Math.abs(Number(metadata.format.duration)-10)>.02||metadata.streams.some((s:any)=>s.codec_type==='audio'))throw new Error('Encoded media QC failed');
    if(errors.length)throw new Error('Browser errors: '+errors.join('\n'));
    const receipt={scope:'Local original-image motion demo; manual regions; silent; not factory/final acceptance',started,completed:new Date().toISOString(),movie,totalFrames,pixelChecks,randomSeekPngExact:true,decodeErrors:0,media:metadata,sources:prepared.sources,layerPreparation:prepared.gears,browserErrors:errors};
    await fs.writeFile(path.join(directory,'qc-report.json'),JSON.stringify(receipt,null,2)+'\n');return receipt;
  }catch(error){await fs.writeFile(path.join(directory,'failure.json'),JSON.stringify({started,error:String(error),browserErrors:errors},null,2)+'\n');throw error;}
  finally{if(encoder&&encoder.exitCode===null){encoder.stdin?.destroy();encoder.kill();}if(browser)await browser.close();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
