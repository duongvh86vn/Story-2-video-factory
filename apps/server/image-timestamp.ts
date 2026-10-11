import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {hash,safeRealPath,writeAtomic} from '../../packages/core/utils.js';
import {execute,outputPath,parseEnvelope,redact} from '../../packages/render/process.js';
import {readFlowImageTimeline,retimeImageScene,validateTimedClipCache,type FlowImageClip} from '../../packages/image-motion/flow-timeline.js';
import {createImageMotionHtml,validateDemo,type ImageMotionDemo} from '../../packages/image-motion/scene.js';
import {ApiError,boundPath} from './security.js';

export const TimestampBinding=z.object({clipId:z.number().int().positive(),manifest:z.string().min(1),scene:z.string().min(1),seedClip:z.string().optional()}).strict();
export type TimestampBinding=z.infer<typeof TimestampBinding>;
export interface TimestampJob {id:string;status:'queued'|'running'|'done'|'failed';clipIds:number[];completed:number;resultClips:{id:number;url:string}[];error?:string}
interface BindingState {binding:TimestampBinding;demo:ImageMotionDemo;assetHashes:Record<string,string>;identity:string;signature:string}
interface SavedClip {revision:string;signature:string;directory:string}
interface Ledger {version:1;jobs:TimestampJob[];clips:Record<string,SavedClip>}
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
    for(const binding of bindings){const clip=timeline.clips.find(c=>c.id===binding.clipId);if(!clip)throw Error('Binding is absent from source timeline');try{states.set(clip.id,await bindingState(binding,clip));}catch(e){errors.set(clip.id,redact((e as Error).message));}}
    const revision=hash({timeline,bindings:bindings.map(b=>({binding:b,signature:states.get(b.clipId)?.signature,error:errors.get(b.clipId)}))});return {timeline,states,errors,revision};
  }
  async function verified(directory:string,clip:FlowImageClip,state:BindingState,timelineHash:string){
    const base=await boundPath(cwd,path.relative(cwd,directory).split(path.sep).join('/'));
    const timing=JSON.parse((await bytes(await boundPath(base,'timing.json'),4*1024*1024)).toString());
    if(timing.identity!==state.identity||hash(timing.clip)!==hash(clip)||timing.timelineHash!==timelineHash||hash(timing.assetHashes)!==hash(state.assetHashes)||timing.sourceHash!==clip.selectedHash)throw Error('Clip no longer matches the source timeline or motion');
    for(const [name,digest]of Object.entries(state.assetHashes))if(hash(await bytes(await boundPath(base,name),16*1024*1024))!==digest)throw Error('Rendered clip asset changed');
    if(hash(await bytes(await boundPath(base,'index.html'),4*1024*1024))!==hash(createImageMotionHtml(state.demo)))throw Error('Rendered motion changed');
    const movie=await bytes(await boundPath(base,'demo.mp4'),256*1024*1024),report=JSON.parse((await bytes(await boundPath(base,'qc-report.json'),4*1024*1024)).toString());
    validateTimedClipCache(report,movie,{clock:clip.clock,identity:state.identity,width:state.demo.scenes[0]!.width,height:state.demo.scenes[0]!.height});return movie;
  }
  async function findClip(clip:FlowImageClip,state:BindingState,revision:string,timelineHash:string){
    const saved=ledger.clips[String(clip.id)];
    if(saved?.revision===revision&&saved.signature===state.signature){try{await verified(saved.directory,clip,state,timelineHash);return saved.directory;}catch{/* An invalid artifact is never shown as exported. */}}
    if(state.binding.seedClip){const seed=await boundPath(cwd,state.binding.seedClip);try{await verified(seed,clip,state,timelineHash);return seed;}catch{/* Seed is optional; failure requires a fresh render. */}}
    return undefined;
  }
  const url=(id:number,revision:string)=>prefix+'clip/'+id+'?revision='+revision;
  async function catalog(){
    const s=await snapshot(),clips=[];
    for(const c of s.timeline.clips){const state=s.states.get(c.id),directory=state?await findClip(c,state,s.revision,s.timeline.timelineHash):undefined;
      clips.push({id:c.id,...c.clock,text:c.text,visual:c.visual,imageUrl:prefix+'image/'+c.id+'?revision='+s.revision,hasMotion:!!state,clipUrl:directory?url(c.id,s.revision):undefined,status:directory?'exported':state?'ready':s.errors.has(c.id)?'invalid-motion':'needs-motion'});
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
  async function close(){closed=true;await work;const lease=JSON.parse(await fs.readFile(leaseFile,'utf8'));if(lease.owner===owner)await fs.unlink(leaseFile);}
  return {catalog,start,job,media,idle:async()=>{await work;},close};
}
