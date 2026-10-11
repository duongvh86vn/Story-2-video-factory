import {createServer} from 'node:http';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {z} from 'zod';
import {createTimestampWorkbench,TimestampBinding} from '../apps/server/image-timestamp.js';
import {ApiError,redact} from '../apps/server/security.js';
import {imageTimestampWorkbench} from '../packages/image-motion/timestamp-workbench.js';
import {imageTimestampMotionEditor} from '../packages/image-motion/timestamp-motion-editor.js';

const {values}=parseArgs({options:{source:{type:'string'},bindings:{type:'string'},output:{type:'string'},port:{type:'string'},fps:{type:'string'},variant:{type:'string'},chrome:{type:'string'},ffmpeg:{type:'string'},ffprobe:{type:'string'}}});
if(!values.source||!values.bindings)throw Error('--source and --bindings are required');
const port=Number(values.port??8860);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
const registry=z.object({bindings:z.array(TimestampBinding).max(2000)}).strict().parse(JSON.parse(await fs.readFile(values.bindings,'utf8')));
if(values.variant&&!['original','fullhd'].includes(values.variant))throw Error('Invalid image variant');
const service=await createTimestampWorkbench({cwd:process.cwd(),source:path.resolve(values.source),output:path.resolve(values.output??'runtime/image-motion/timestamp-studio'),bindings:registry.bindings,fps:Number(values.fps??60),variant:values.variant as 'original'|'fullhd'|undefined,chrome:values.chrome,ffmpeg:values.ffmpeg,ffprobe:values.ffprobe});
const origin='http://127.0.0.1:'+port;
const server=createServer(async(req,res)=>{
  try{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'");
    if(req.headers.host!=='127.0.0.1:'+port||req.headers.origin&&req.headers.origin!==origin)throw new ApiError(403,'Use the local studio address');
    const url=new URL(req.url??'/',origin),route=url.pathname;
    const json=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
    const bodyBytes=async(limit:number)=>{let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>limit)throw new ApiError(413,'Request exceeds limit');chunks.push(chunk);}return Buffer.concat(chunks);};
    if(req.method==='GET'&&route==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(imageTimestampWorkbench());return;}
    if(req.method==='GET'&&route==='/api/image-timestamp/catalog'){json(200,await service.catalog());return;}
    const edit=route.match(/^\/api\/image-timestamp\/edit\/([1-9]\d*)$/);
    if(req.method==='GET'&&edit){const id=Number(edit[1]);if(!Number.isSafeInteger(id))throw new ApiError(400,'Invalid scene');await service.definition(id);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(imageTimestampMotionEditor(id));return;}
    const definition=route.match(/^\/api\/image-timestamp\/definition\/([1-9]\d*)$/);
    if(definition&&['GET','POST'].includes(req.method??'')){
      const id=Number(definition[1]);if(!Number.isSafeInteger(id))throw new ApiError(400,'Invalid scene');
      if(req.method==='GET'){json(200,await service.definition(id));return;}
      if(!req.headers['content-type']?.startsWith('application/json'))throw new ApiError(415,'Send JSON');let body:unknown;try{body=JSON.parse((await bodyBytes(128*1024)).toString());}catch(e){if(e instanceof ApiError)throw e;throw new ApiError(400,'Invalid JSON');}json(200,await service.prepare(id,body));return;
    }
    const background=route.match(/^\/api\/image-timestamp\/background\/([1-9]\d*)$/);
    if(req.method==='POST'&&background){const id=Number(background[1]);if(!Number.isSafeInteger(id))throw new ApiError(400,'Invalid scene');if(!req.headers['content-type']?.startsWith('image/png'))throw new ApiError(415,'Send PNG background');json(201,await service.background(id,url.searchParams.get('revision')??'',await bodyBytes(16*1024*1024)));return;}
    const prepared=route.match(/^\/api\/image-timestamp\/prepared\/([1-9]\d*)\/([a-f0-9]{64})\/(index\.html|assets\/[A-Za-z0-9_.-]+\.png)$/);
    if(req.method==='GET'&&prepared){const id=Number(prepared[1]);if(!Number.isSafeInteger(id))throw new ApiError(400,'Invalid scene');const result=await service.preview(id,prepared[2]!,prepared[3]!);res.setHeader('Content-Security-Policy',"default-src 'none'; img-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");res.writeHead(200,{'Content-Type':result.type});res.end(result.data);return;}
    const job=route.match(/^\/api\/image-timestamp\/job\/([a-f0-9-]{36})$/);
    if(req.method==='GET'&&job){json(200,await service.job(job[1]!));return;}
    if(req.method==='POST'&&['/api/image-timestamp/render','/api/image-timestamp/render-ready'].includes(route)){
      if(!req.headers['content-type']?.startsWith('application/json'))throw new ApiError(415,'Send JSON');
      let body:unknown;try{body=JSON.parse((await bodyBytes(4096)).toString());}catch(e){if(e instanceof ApiError)throw e;throw new ApiError(400,'Invalid JSON');}
      json(202,await service.start(route.endsWith('render-ready')?'render-ready':'render',body));return;
    }
    const media=route.match(/^\/api\/image-timestamp\/(image|clip)\/([1-9]\d*)$/);
    if(req.method==='GET'&&media){
      const kind=media[1] as 'image'|'clip',id=Number(media[2]);if(!Number.isSafeInteger(id))throw new ApiError(400,'Invalid scene');const data=await service.media(kind,id,url.searchParams.get('revision')??'');
      res.setHeader('Content-Type',kind==='image'?'image/png':'video/mp4');res.setHeader('Accept-Ranges','bytes');
      if(kind==='clip')res.setHeader('Content-Disposition','inline; filename="clip-'+id+'.mp4"');
      const range=req.headers.range;if(range){const match=range.match(/^bytes=(\d+)-(\d*)$/);if(!match)throw new ApiError(416,'Invalid byte range');const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),data.length-1):data.length-1;if(!Number.isSafeInteger(start)||start>end)throw new ApiError(416,'Invalid byte range');res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));return;}
      res.writeHead(200,{'Content-Length':data.length});res.end(data);return;
    }
    throw new ApiError(404,'Route not found');
  }catch(e){const status=e instanceof ApiError?e.statusCode:e instanceof z.ZodError?400:500;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:{message:redact((e as Error).message),code:e instanceof ApiError?e.code:'REQUEST_FAILED'}}));}
});
server.on('error',async error=>{await service.close();console.error(redact(error.message));process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:origin,fps:Number(values.fps??60),sourceReadOnly:true,productionReady:false})));
let closing=false;for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{if(closing)return;closing=true;server.close(async()=>{await service.close();process.exitCode=0;});});
