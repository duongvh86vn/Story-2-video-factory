import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import sharp from 'sharp';
import {hash,safeRealPath,writeAtomic} from '../../packages/core/utils.js';
import {execute,outputPath,parseEnvelope,redact} from '../../packages/render/process.js';
import {readFlowImageTimeline,retimeImageScene,validateTimedClipCache,type FlowImageClip} from '../../packages/image-motion/flow-timeline.js';
import {createImageMotionHtml,validateDemo,type ImageMotionDemo} from '../../packages/image-motion/scene.js';
import {ApiError,boundPath} from './security.js';
import {emptyTimestampMotion,TimestampMotionDefinition,validateTimestampMotion} from '../../packages/image-motion/timestamp-definition.js';
import {prepareTimestampMotion,TIMESTAMP_PREPARER_VERSION} from '../../packages/image-motion/timestamp-prepare.js';

export const TimestampBinding=z.object({clipId:z.number().int().positive(),manifest:z.string().min(1),scene:z.string().min(1),seedClip:z.string().optional()}).strict();
export type TimestampBinding=z.infer<typeof TimestampBinding>;
export interface TimestampJob {id:string;status:'queued'|'running'|'done'|'failed';clipIds:number[];completed:number;resultClips:{id:number;url:string}[];error?:string}
interface BindingState {binding:TimestampBinding;demo:ImageMotionDemo;assetHashes:Record<string,string>;identity:string;signature:string}
interface SavedClip {revision:string;signature:string;directory:string}
interface MotionOverride {sourceHash:string;definition:TimestampMotionDefinition;manifest:string;scene:string}
interface Ledger {version:1;jobs:TimestampJob[];clips:Record<string,SavedClip>;overrides?:Record<string,MotionOverride>}
export interface TimestampWorkbenchOptions {
  cwd:string;source:string;output:string;fps?:number;variant?:'original'|'fullhd';bindings:TimestampBinding[];
  chrome?:string;ffmpeg?:string;ffprobe?:string;
  /** Tests inject a bounded worker; production always invokes the fixed local CLI. */
  worker?:(request:{clipId:number;manifest:string;scene:string;output:string;logFile:string})=>Promise<string>;
}
const requestOne=z.object({revision:z.string().regex(/^[a-f0-9]{64}$/),clipId:z.number().int().positive()}).strict();
const requestReady=z.object({revision:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const prefix='/api/image-timestamp/';
const inside=(base:string,target:string)=>{const rel=path.relative(base,target);return !rel||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
async function bytes(file:string,limit:number){if((await fs.stat(file)).size>limit)throw Error('File exceeds local media limit');return fs.readFile(file);}
async function processIdentity(pid:number,cwd:string,logFile:string):Promise<string|undefined>{
  if(!Number.isSafeInteger(pid)||pid<1)throw Error('Invalid lease process');
  if(process.platform==='win32'){
    const command=`$p = Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}'; if ($p) { $p.CreationDate.ToUniversalTime().Ticks.ToString() }`;
    const result=await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{cwd,logFile,timeoutMs:15000,maxOutputBytes:4096,logOutput:false});
    const value=result.stdout.trim();if(value&&!/^\d+$/.test(value))throw Error('Cannot identify lease process');return value||undefined;
  }
  if(process.platform==='linux'){try{const stat=await fs.readFile(`/proc/${pid}/stat`,'utf8');return stat.slice(stat.lastIndexOf(')')+2).split(' ')[19];}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw e;}}
  throw Error('Process lease identity is supported on Windows and Linux');
}

/** Local scene workbench. Source export is read-only; every render has its own output attempt. */
export async function createTimestampWorkbench(options:TimestampWorkbenchOptions){
  const requestedCwd=path.resolve(options.cwd),requestedOutput=path.resolve(options.output);
  if(!inside(requestedCwd,requestedOutput))throw Error('Choose an output inside the workspace and outside the source export');
  const cwd=await fs.realpath(requestedCwd),source=await fs.realpath(options.source),output=path.resolve(cwd,path.relative(requestedCwd,requestedOutput));
  if(inside(source,output))throw Error('Choose an output inside the workspace and outside the source export');
  const relative=path.relative(cwd,output).split(path.sep).join('/');await boundPath(cwd,relative,true);await fs.mkdir(output,{recursive:true});
  if(inside(source,await fs.realpath(output)))throw Error('Output resolves inside source export');
  const bindings=options.bindings.map(b=>TimestampBinding.parse(b));
  if(new Set(bindings.map(b=>b.clipId)).size!==bindings.length)throw Error('Duplicate motion binding');
  const leaseFile=await outputPath(output,'studio-lease.json'),owner=randomUUID(),leaseLog=await outputPath(output,'lease-process.log');
  try{const lease=JSON.parse(await fs.readFile(leaseFile,'utf8')),identity=await processIdentity(lease.pid,cwd,leaseLog);if(identity&&(!lease.processStart||identity===lease.processStart))throw Error('This output already has a live workbench');await fs.unlink(leaseFile);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  const processStart=await processIdentity(process.pid,cwd,leaseLog);if(!processStart)throw Error('Cannot confirm this studio process');
  await fs.writeFile(leaseFile,JSON.stringify({pid:process.pid,processStart,owner}),{flag:'wx'});
  let ledger:Ledger={version:1,jobs:[],clips:{}},active:TimestampJob|undefined,pending=false,work:Promise<void>|undefined,closed=false;
  const ledgerFile=await outputPath(output,'workbench.json');
  const save=()=>writeAtomic(ledgerFile,JSON.stringify(ledger,null,2)+'\n');
  try{
    try{ledger=JSON.parse(await fs.readFile(ledgerFile,'utf8'));if(ledger.version!==1||!Array.isArray(ledger.jobs)||!ledger.clips)throw Error('Invalid workbench ledger');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    // A dead studio cannot supply a successful receipt for unfinished work.
    ledger.overrides??={};
    for(const job of ledger.jobs)if(['queued','running'].includes(job.status)){job.status='failed';job.error='Lượt xuất bị gián đoạn trước khi có kết quả xác nhận. Có thể xuất lại.';}
    await save();
  }catch(e){await fs.unlink(leaseFile);throw e;}
  async function bindingState(binding:TimestampBinding,clip:FlowImageClip):Promise<BindingState>{
    const manifest=await boundPath(cwd,binding.manifest),base=path.dirname(manifest),prepared=JSON.parse((await bytes(manifest,4*1024*1024)).toString());
    validateDemo(prepared.demo);const original=prepared.demo.scenes.find((s:any)=>s.id===binding.scene);if(!original)throw Error('Missing bound scene');
    const scene=retimeImageScene(original,clip.clock),demo:ImageMotionDemo={version:1,fps:clip.clock.fps,scenes:[scene]},assetHashes:Record<string,string>={};
    for(const name of new Set<string>([scene.original,scene.background,...scene.layers.map(l=>l.image),...(scene.parts??[]).map(p=>p.image)])){
      const data=await bytes(await boundPath(base,name),16*1024*1024);assetHashes[name]=hash(data);if(prepared.assetHashes&&prepared.assetHashes[name]!==assetHashes[name])throw Error('Motion asset integrity changed');
    }
    let rawHash=assetHashes[scene.original];if(rawHash!==clip.selectedHash){rawHash=hash(await bytes(await boundPath(base,'assets/source-original.png'),16*1024*1024));if(rawHash!==prepared.sourceHash||rawHash!==prepared.assetHashes?.['assets/source-original.png'])throw Error('Raw motion source integrity changed');}
    if(rawHash!==clip.selectedHash)throw Error('Motion does not match the timeline image');
    const identity=hash({version:'timed-clip-2',clock:clip.clock,demo,assetHashes,html:hash(createImageMotionHtml(demo))});
    return {binding,demo,assetHashes,identity,signature:hash({manifest:hash(prepared),identity})};
  }
  async function snapshot(){
    const timeline=await readFlowImageTimeline(source,{fps:options.fps??60,variant:options.variant??'fullhd'}),states=new Map<number,BindingState>(),errors=new Map<number,string>();
    const effective=new Map(bindings.map(b=>[b.clipId,b]));for(const [id,o]of Object.entries(ledger.overrides??{}))effective.set(Number(id),{clipId:Number(id),manifest:o.manifest,scene:o.scene});
    const currentBindings=[...effective.values()];
    for(const binding of currentBindings){const clip=timeline.clips.find(c=>c.id===binding.clipId);if(!clip)throw Error('Binding is absent from source timeline');try{const o=ledger.overrides?.[String(clip.id)];if(o&&o.sourceHash!==clip.selectedHash)throw Error('Ảnh nguồn đã đổi. Chuẩn bị lại chuyển động.');states.set(clip.id,await bindingState(binding,clip));}catch(e){errors.set(clip.id,redact((e as Error).message));}}
    const revision=hash({timeline,bindings:currentBindings.map(b=>({binding:b,signature:states.get(b.clipId)?.signature,error:errors.get(b.clipId)}))});return {timeline,states,errors,revision};
  }
  async function verified(directory:string,clip:FlowImageClip,state:BindingState,timelineHash:string){
    const base=await boundPath(cwd,path.relative(cwd,directory).split(path.sep).join('/'));
    const timing=JSON.parse((await bytes(await boundPath(base,'timing.json'),4*1024*1024)).toString());
    // Receipt keeps its original full-timeline provenance; another scene's edit
    // cannot change the pixels, clock or descriptor of this already-verified clip.
    if(timing.identity!==state.identity||hash(timing.clip)!==hash(clip)||hash(timing.assetHashes)!==hash(state.assetHashes)||timing.sourceHash!==clip.selectedHash)throw Error('Clip no longer matches the source timeline or motion');
    for(const [name,digest]of Object.entries(state.assetHashes))if(hash(await bytes(await boundPath(base,name),16*1024*1024))!==digest)throw Error('Rendered clip asset changed');
    if(hash(await bytes(await boundPath(base,'index.html'),4*1024*1024))!==hash(createImageMotionHtml(state.demo)))throw Error('Rendered motion changed');
    const movie=await bytes(await boundPath(base,'demo.mp4'),256*1024*1024),report=JSON.parse((await bytes(await boundPath(base,'qc-report.json'),4*1024*1024)).toString());
    validateTimedClipCache(report,movie,{clock:clip.clock,identity:state.identity,width:state.demo.scenes[0]!.width,height:state.demo.scenes[0]!.height});return movie;
  }
  async function findClip(clip:FlowImageClip,state:BindingState,revision:string,timelineHash:string){
    const saved=ledger.clips[String(clip.id)];
    if(saved?.signature===state.signature){try{await verified(saved.directory,clip,state,timelineHash);return saved.directory;}catch{/* An invalid artifact is never shown as exported. */}}
    if(state.binding.seedClip){const seed=await boundPath(cwd,state.binding.seedClip);try{await verified(seed,clip,state,timelineHash);return seed;}catch{/* Seed is optional; failure requires a fresh render. */}}
    return undefined;
  }
  const url=(id:number,revision:string)=>prefix+'clip/'+id+'?revision='+revision;
  async function catalog(){
    const s=await snapshot(),clips=[];
    for(const c of s.timeline.clips){const state=s.states.get(c.id),directory=state?await findClip(c,state,s.revision,s.timeline.timelineHash):undefined;
      clips.push({id:c.id,...c.clock,text:c.text,visual:c.visual,imageUrl:prefix+'image/'+c.id+'?revision='+s.revision,editUrl:prefix+'edit/'+c.id,hasMotion:!!state,clipUrl:directory?url(c.id,s.revision):undefined,status:directory?'exported':state?'ready':s.errors.has(c.id)?'invalid-motion':'needs-motion'});
    }
    return {revision:s.revision,fps:s.timeline.outputFps,durationMs:s.timeline.durationMs,gaps:s.timeline.gaps,clips,activeJob:active?structuredClone(active):undefined,productionReady:false,qualityAccepted:false};
  }
  async function run(job:TimestampJob,s:Awaited<ReturnType<typeof snapshot>>){
    try{
      job.status='running';await save();
      for(const id of job.clipIds){
        if((await snapshot()).revision!==s.revision)throw Error('Source or motion changed during export');
        const clip=s.timeline.clips.find(c=>c.id===id)!,state=s.states.get(id)!;
        let directory=await findClip(clip,state,s.revision,s.timeline.timelineHash);
        if(!directory){
          const attempt=await outputPath(output,'attempts/'+job.id+'/'+id);await fs.mkdir(attempt,{recursive:true});const logFile=await outputPath(attempt,'worker.log');
          if(options.worker)directory=await options.worker({clipId:id,manifest:state.binding.manifest,scene:state.binding.scene,output:attempt,logFile});
          else{
            const args=['--import','tsx','scripts/image-motion-timestamp.ts','--source',source,'--output',attempt,'--fps',String(s.timeline.outputFps),'--variant',s.timeline.variant,'--manifest',state.binding.manifest,'--scene',state.binding.scene,'--clip',String(id),'--render'];
            for(const key of ['chrome','ffmpeg','ffprobe'] as const)if(options[key])args.push('--'+key,options[key]!);
            const result=await execute(process.execPath,args,{cwd,logFile,timeoutMs:600000,maxOutputBytes:65536});const envelope=parseEnvelope(result.stdout);
            if(typeof envelope?.directory!=='string'||envelope.clip!==id||envelope.status!=='silent-clip')throw Error('Worker did not return a verified clip');directory=envelope.directory;
          }
        }
        await verified(directory,clip,state,s.timeline.timelineHash);
        if((await snapshot()).revision!==s.revision)throw Error('Source or motion changed before publishing the result');
        ledger.clips[String(id)]={revision:s.revision,signature:state.signature,directory};job.resultClips.push({id,url:url(id,s.revision)});job.completed++;await save();
      }
      job.status='done';
    }catch(e){job.status='failed';job.error=redact((e as Error).message);}finally{try{await save();}finally{active=undefined;}}
  }
  async function start(kind:'render'|'render-ready',body:unknown){
    if(closed)throw new ApiError(503,'Workbench is closing');if(pending||active)throw new ApiError(409,'A render is already running','BUSY');pending=true;
    try{
      // Report stale revisions consistently, even if an old client sends a malformed revision.
      const s=await snapshot();if((body as any)?.revision!==s.revision)throw new ApiError(409,'Source or motion changed; reload the catalog','STALE_REVISION');
      const ids:number[]=kind==='render'?[requestOne.parse(body).clipId]:(requestReady.parse(body),s.timeline.clips.filter(c=>s.states.has(c.id)).map(c=>c.id));
      if(!ids.length||ids.some(id=>!s.states.has(id)))throw new ApiError(422,'This scene has no valid prepared motion','NEEDS_MOTION');
      const job:TimestampJob={id:randomUUID(),status:'queued',clipIds:ids,completed:0,resultClips:[]};ledger.jobs.push(job);active=job;
      try{await save();}catch(e){active=undefined;ledger.jobs.pop();throw e;}
      work=run(job,s);void work.catch(()=>{});return structuredClone(job);
    }finally{pending=false;}
  }
  async function job(id:string){const value=ledger.jobs.find(j=>j.id===id);if(!value)throw new ApiError(404,'Lượt xuất không còn trong danh mục. Tải lại danh mục để kiểm tra.','JOB_NOT_FOUND');return structuredClone(value);}
  async function media(kind:'image'|'clip',id:number,revision:string){
    const s=await snapshot();if(s.revision!==revision)throw new ApiError(409,'Nguồn đã thay đổi. Tải lại danh mục.','STALE_REVISION');const clip=s.timeline.clips.find(c=>c.id===id);if(!clip)throw new ApiError(404,'Scene not found');
    if(kind==='image')return bytes(await safeRealPath(source,clip.selectedImage),16*1024*1024);
    const state=s.states.get(id);if(!state)throw new ApiError(422,'Scene needs motion');const directory=await findClip(clip,state,s.revision,s.timeline.timelineHash);if(!directory)throw new ApiError(404,'Clip is not verified yet');return verified(directory,clip,state,s.timeline.timelineHash);
  }
  async function definition(id:number){
    const s=await snapshot(),clip=s.timeline.clips.find(c=>c.id===id);if(!clip)throw new ApiError(404,'Scene not found');
    const file=await safeRealPath(source,clip.selectedImage),meta=await sharp(await bytes(file,16*1024*1024),{limitInputPixels:64000000}).metadata(),state=s.states.get(id);
    return {clipId:id,revision:s.revision,width:meta.width!,height:meta.height!,clock:clip.clock,imageUrl:prefix+'image/'+id+'?revision='+s.revision,text:clip.text,definition:ledger.overrides?.[String(id)]?.definition??emptyTimestampMotion(),previewUrl:state?prefix+'prepared/'+id+'/'+state.signature+'/index.html':undefined,sourceChanged:!!ledger.overrides?.[String(id)]&&ledger.overrides[String(id)]!.sourceHash!==clip.selectedHash,productionReady:false,qualityAccepted:false};
  }
  async function prepare(id:number,body:unknown){
    if(closed)throw new ApiError(503,'Workbench is closing');if(pending||active)throw new ApiError(409,'A render or preparation is already running','BUSY');pending=true;
    try{
      const input=z.object({revision:z.string().regex(/^[a-f0-9]{64}$/),definition:TimestampMotionDefinition}).strict().parse(body),s=await snapshot();
      if(input.revision!==s.revision)throw new ApiError(409,'Source or motion changed; reload the editor','STALE_REVISION');const clip=s.timeline.clips.find(c=>c.id===id);if(!clip)throw new ApiError(404,'Scene not found');
      const sourceFile=await safeRealPath(source,clip.selectedImage),meta=await sharp(await bytes(sourceFile,16*1024*1024),{limitInputPixels:64000000}).metadata();
      let d:TimestampMotionDefinition;try{d=validateTimestampMotion(input.definition,meta.width!,meta.height!);}catch(e){throw new ApiError(422,(e as Error).message,'MOTION_GEOMETRY');}
      let plate:string|undefined;if(d.background.mode==='clean-plate'){
        const receipt=JSON.parse((await bytes(await boundPath(output,'backgrounds/'+id+'-'+clip.selectedHash+'-'+d.background.cleanPlateId+'.json'),4096)).toString());
        plate=await boundPath(output,'backgrounds/'+d.background.cleanPlateId+'.png');if(receipt.sourceHash!==clip.selectedHash||receipt.width!==meta.width||receipt.height!==meta.height||hash(await bytes(plate,16*1024*1024))!==d.background.cleanPlateId)throw new ApiError(409,'Nền sạch không còn khớp ảnh nguồn.','STALE_BACKGROUND');
      }
      const key=hash({version:TIMESTAMP_PREPARER_VERSION,definition:d,sourceHash:clip.selectedHash,clock:clip.clock});let folder=await outputPath(output,'motions/'+id+'-'+key);await fs.mkdir(path.dirname(folder),{recursive:true});
      // Preserve incomplete attempts; rebuild their manifest using the same verified layer cache.
      const existing=ledger.overrides?.[String(id)];if(existing?.sourceHash===clip.selectedHash&&hash(existing.definition)===hash(d)){const previousFolder=path.dirname(await boundPath(cwd,existing.manifest));try{const previous=JSON.parse((await bytes(await boundPath(previousFolder,'motion.json'),128*1024)).toString());if(previous.demo?.fps===clip.clock.fps&&previous.demo?.scenes?.[0]?.durationMs===clip.clock.endMs-clip.clock.startMs)folder=previousFolder;}catch{}}
      try{await fs.stat(folder);try{await fs.stat(path.join(folder,'motion.json'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;folder=await outputPath(output,'motions/'+id+'-'+key+'-'+randomUUID());}}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
      const prepared=await prepareTimestampMotion(sourceFile,folder,d,clip.clock,await outputPath(output,'layer-cache'),plate);
      const {manifest:preparedManifest,...preparedMetadata}=prepared;const recorded=JSON.parse((await bytes(await boundPath(cwd,path.relative(cwd,preparedManifest).split(path.sep).join('/')),128*1024)).toString());
      if(hash(recorded)!==hash(preparedMetadata)||hash(prepared.definition)!==hash(d)||prepared.demo.fps!==clip.clock.fps||prepared.demo.scenes[0]?.durationMs!==clip.clock.endMs-clip.clock.startMs)throw new ApiError(409,'Prepared motion receipt changed.','MOTION_INTEGRITY');
      for(const [name,expected]of Object.entries(prepared.assetHashes)){const asset=await boundPath(path.dirname(preparedManifest),name);if(hash(await bytes(asset,16*1024*1024))!==expected)throw new ApiError(409,'Prepared motion asset changed.','MOTION_INTEGRITY');}
      if(prepared.sourceHash!==clip.selectedHash||(await snapshot()).revision!==s.revision)throw new ApiError(409,'Source changed during preparation','STALE_REVISION');
      const previous=ledger.overrides?.[String(id)];ledger.overrides![String(id)]={sourceHash:clip.selectedHash,definition:d,manifest:path.relative(cwd,prepared.manifest).split(path.sep).join('/'),scene:'character'};
      try{await save();}catch(e){if(previous)ledger.overrides![String(id)]=previous;else delete ledger.overrides![String(id)];throw e;}
      return definition(id);
    }finally{pending=false;}
  }
  async function background(id:number,revision:string,data:Buffer){
    if(closed)throw new ApiError(503,'Workbench is closing');if(pending||active)throw new ApiError(409,'A render or preparation is already running','BUSY');pending=true;
    try{
      if(data.length>16*1024*1024)throw new ApiError(413,'PNG exceeds 16 MB');const s=await snapshot();if(s.revision!==revision)throw new ApiError(409,'Source changed; reload the editor','STALE_REVISION');const clip=s.timeline.clips.find(c=>c.id===id);if(!clip)throw new ApiError(404,'Scene not found');
      let meta:sharp.Metadata;try{meta=await sharp(data,{limitInputPixels:64000000}).metadata();await sharp(data,{limitInputPixels:64000000}).png().toBuffer();}catch{throw new ApiError(422,'Ảnh nền sạch phải là PNG đọc được.','NEEDS_BACKGROUND');}
      const original=await sharp(await bytes(await safeRealPath(source,clip.selectedImage),16*1024*1024)).metadata(),idHash=hash(data);
      if(meta.format!=='png'||(meta.pages??1)!==1||meta.width!==original.width||meta.height!==original.height||idHash===clip.selectedHash)throw new ApiError(422,'Chọn PNG nền sạch khác ảnh nguồn và cùng kích thước.','NEEDS_BACKGROUND');
      const folder=await outputPath(output,'backgrounds');await fs.mkdir(folder,{recursive:true});
      const immutable=async(name:string,value:Buffer)=>{const file=await outputPath(folder,name);try{await fs.writeFile(file,value,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||hash(await fs.readFile(file))!==hash(value))throw Error('Background cache integrity changed');}};
      await immutable(idHash+'.png',data);await immutable(id+'-'+clip.selectedHash+'-'+idHash+'.json',Buffer.from(JSON.stringify({sourceHash:clip.selectedHash,cleanPlateId:idHash,width:meta.width,height:meta.height})+'\n'));
      if((await snapshot()).revision!==s.revision)throw new ApiError(409,'Source changed during background upload','STALE_REVISION');return {cleanPlateId:idHash,revision:s.revision};
    }finally{pending=false;}
  }
  async function preview(id:number,key:string,name:string){
    const s=await snapshot(),state=s.states.get(id);if(!state||state.signature!==key)throw new ApiError(409,'Preview no longer matches the source or motion','STALE_MOTION');
    if(name==='index.html')return {type:'text/html; charset=utf-8',data:Buffer.from(createImageMotionHtml(state.demo).replace('</style>','main{max-width:100%}nav{flex-wrap:wrap}input{min-width:100px;flex:1 1 160px}output{min-width:72px}</style>'))};
    if(!Object.hasOwn(state.assetHashes,name))throw new ApiError(404,'Asset not found');const file=await boundPath(path.dirname(await boundPath(cwd,state.binding.manifest)),name),data=await bytes(file,16*1024*1024);
    if(hash(data)!==state.assetHashes[name])throw new ApiError(409,'Preview asset changed','MOTION_INTEGRITY');return {type:'image/png',data};
  }
  async function close(){closed=true;await work;const lease=JSON.parse(await fs.readFile(leaseFile,'utf8'));if(lease.owner===owner)await fs.unlink(leaseFile);}
  return {catalog,start,job,media,definition,prepare,background,preview,idle:async()=>{await work;},close};
}
