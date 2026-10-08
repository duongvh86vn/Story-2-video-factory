import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {z} from 'zod';
import {hash} from '../core/utils.js';
import {HostProfileSchema} from '../host/schemas.js';
import {PerformancePlanSchema} from '../animation/schemas.js';
import {NativeHeadBankDefinitionSchema,nativeHeadBank} from '../animation/native-head-bank.js';
import {nativeHeadResources,readNativeHeadSource,readNativeHeadPrimary} from '../animation/native-head-resources.js';
import {referenceHeadAssets} from '../animation/forest-head-art.js';
import {referenceBodyAssets} from '../animation/forest-body-art.js';
import {SPEECH_SOURCE_CLOCK_VERSION,projectSpeechActivity,windowSpeechActivity} from '../animation/speech-clock.js';
import {VIEW_ACTING_CLOCK_VERSION,projectViewGazes,type ViewActingClock} from '../animation/view-acting-clock.js';
import {projectViewExpressions} from '../animation/view-expression-track.js';
import {viewSourceGestureDefinition} from '../animation/view-source-gesture.js';
import {performanceScene} from '../animation/scene.js';
import {bodyCalibrationPlan,BODY_MOUTH_PREVIEW_ACTIVITY} from './body-workbench.js';
import {HEAD_FACE_WORKBENCH_VERSION,HEAD_FACE_VIEWS,HEAD_FACE_CANDIDATES,type HeadFaceView} from './head-face-candidates.js';

export {HEAD_FACE_WORKBENCH_VERSION} from './head-face-candidates.js';
export const HeadFaceSelectionSchema=z.object({actor:z.enum(['lila','karo']).default('lila'),
  view:z.enum(HEAD_FACE_VIEWS).default('three-quarter-right'),
  action:z.enum(['rest','point','think']).default('rest'),look:z.enum(['rest','ahead','up','down']).default('rest'),
  slice:z.enum(['whole','second-half']).default('whole')}).strict();
export type HeadFaceSelection=z.infer<typeof HeadFaceSelectionSchema>;
const prefix='/api/topics/prehistoric-life/head-face-preview';
const MAX_SCENE_BYTES=2_000_000;
const MAX_VENDOR_BYTES=512*1024;
// Bounded compiled text only; every request revalidates source bytes before
// lookup. Failed compilation is never cached. No frames or image copies kept.
const scenes=new Map<string,{files:ReturnType<typeof performanceScene>['files'];report:ReturnType<typeof performanceScene>['compiled']['report']}>();

/** Exact paths from the fixed definitions/resource catalog only. No links or
 * caller-controlled filesystem paths. The caller checks the expected hash. */
async function boundedFile(repo:string,file:string,maxBytes:number){
  let target=path.resolve(repo);const parts=file.split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'||p.includes('\\')||p.includes(':')))throw new Error('Invalid face workbench source');
  for(const [i,part] of parts.entries()){
    target=path.join(target,part);const stat=await fs.lstat(target);
    if(stat.isSymbolicLink()||(i===parts.length-1?!stat.isFile()||stat.size>maxBytes:!stat.isDirectory()))throw new Error('Linked/oversized face workbench source');
  }
  const bytes=await fs.readFile(target);if(bytes.length>maxBytes)throw new Error('Oversized face workbench source');return bytes;
}

async function headFaceVendor(){
  const file=createRequire(import.meta.url).resolve('gsap/dist/gsap.min.js'),stat=await fs.lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_VENDOR_BYTES)throw new Error('Linked/oversized face workbench vendor');
  const bytes=await fs.readFile(file);if(bytes.length>MAX_VENDOR_BYTES)throw new Error('Oversized face workbench vendor');
  return {sha256:hash(bytes),bytes};
}

/** Read/validate only. Callers must not infer artistic approval from parsing. */
export async function headFaceCandidate(repo:string,actor:HeadFaceSelection['actor'],view:HeadFaceView='three-quarter-right'){
  const selected=HeadFaceSelectionSchema.shape.actor.parse(actor),selectedView=HeadFaceSelectionSchema.shape.view.parse(view);
  const entry=HEAD_FACE_CANDIDATES.find(c=>c.actor===selected&&c.view===selectedView);
  if(!entry)throw new Error(`needs-head-face-candidate: ${selected}/${selectedView} has not been authored`);
  const file=entry.file;
  const bytes=await boundedFile(repo,file,200*1024),definition=NativeHeadBankDefinitionSchema.parse(JSON.parse(bytes.toString('utf8')));
  if(definition.actor!==selected||definition.id!==entry.id||definition.version!=='native-head-bank-3'||definition.cells.length!==1||definition.cells[0]!.yawDeg!==null||definition.routes.length||
    definition.bodyViews.length!==1||definition.bodyViews[0]!.view!==selectedView)throw new Error('Face workbench needs the exact fixed source-angle candidate and compatible body view');
  const bank=nativeHeadBank(definition);
  for(const resource of nativeHeadResources(bank)){
    if(resource.nativeHeadSource)readNativeHeadSource(repo,{file:resource.file,sha256:resource.sha256,...resource.nativeHeadSource},bank.primary);
    else readNativeHeadPrimary(repo,bank.primary);
  }
  return {bank,definitionFile:file,definitionHash:hash(bytes)};
}

/** The same original run is sliced, rather than rebuilding a local mouth,
 * blink, gesture or expression phase at a camera cut. No real voice is used. */
export async function headFaceCalibration(repo:string,input:unknown){
  const selection=HeadFaceSelectionSchema.parse(input),candidate=await headFaceCandidate(repo,selection.actor,selection.view),{bank}=candidate;
  const {profile:base,plan:original}=bodyCalibrationPlan(selection.actor,selection.action,'happy',selection.view==='three-quarter-left'?'left':'right',selection.view);
  const {profileHash:discarded,...profileData}=base;
  const data={...profileData,appearance:{...base.appearance,bodyHeadBank:bank}};
  const profile=HostProfileSchema.parse({...data,profileHash:hash(data)}),startMs=selection.slice==='whole'?0:2000,endMs=4000;
  const headMotion={version:'native-head-source-1' as const,id:'workbench-source-head',ownerId:profile.id,bankFingerprint:bank.fingerprint,startMs:0,endMs:4000,samples:[{atMs:0,cell:bank.cells[0]!.id}]};
  const originalGestures=original.gestures.map(g=>({...g,sourceSpan:{id:g.id,startMs:g.startMs,endMs:g.endMs}}));
  const gestures=originalGestures.map(viewSourceGestureDefinition);
  const direction=selection.view==='three-quarter-left'?-1:1;
  const gazes=selection.look==='rest'?[]:[{startMs:300,endMs:3600,target:{x:210+direction*(selection.look==='ahead'?160:80),y:selection.look==='up'?100:selection.look==='down'?395:260}}];
  const expressions=original.expressions;
  const identity={version:HEAD_FACE_WORKBENCH_VERSION,actor:profile.id,profileHash:profile.profileHash,bank:bank.fingerprint,definitionHash:candidate.definitionHash,
    view:selection.view,action:selection.action,look:selection.look,stage:original.stage,root:original.root,scale:original.scale,headMotion,gestures,gazes,expressions,activity:BODY_MOUTH_PREVIEW_ACTIVITY};
  const plan=PerformancePlanSchema.parse({...original,id:'face-workbench-'+selection.actor,profileHash:profile.profileHash,leadCharacterId:profile.id,
    durationMs:endMs-startMs,sourceHead:headMotion,
    gestures:originalGestures.flatMap(g=>{
      const start=Math.max(startMs,g.startMs),end=Math.min(endMs,g.endMs);
      return end>start?[{...g,startMs:start-startMs,endMs:end-startMs}]:[];
    }),gazes:projectViewGazes(gazes,startMs,endMs),expressions:projectViewExpressions(expressions,startMs,endMs)});
  const clock:ViewActingClock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:profile.id,startMs,endMs,runStartMs:0,runEndMs:4000,
    sourceIdentityHash:hash(identity),headMotion,gestures,gazes,expressions};
  const activity=projectSpeechActivity(BODY_MOUTH_PREVIEW_ACTIVITY,startMs,endMs);
  const sourceClock={version:SPEECH_SOURCE_CLOCK_VERSION,ownerId:profile.id,scope:'narration' as const,cueIds:[],startMs,endMs,
    sourceActivityHash:hash(BODY_MOUTH_PREVIEW_ACTIVITY),activity:windowSpeechActivity(BODY_MOUTH_PREVIEW_ACTIVITY,startMs,endMs)};
  const resources=[...referenceHeadAssets(profile.appearance),...referenceBodyAssets(profile.appearance)];
  // Validate the matching body too; a changed body may not masquerade as an
  // accepted head/body pairing even when the head PNG remains unchanged.
  for(const resource of resources)if(!('nativeHeadSource' in resource)||!resource.nativeHeadSource){
    if(hash(await boundedFile(repo,resource.file,40*1024*1024))!==resource.sha256)throw new Error('Face workbench body/identity resource changed');
  }
  const vendor=await headFaceVendor();
  return {selection,...candidate,profile,plan,clock,activity,sourceClock,resources,vendor};
}

function sceneBase(s:HeadFaceSelection){return `${prefix}/${s.actor}/views/${s.view}/${s.action}/${s.look}/${s.slice}/`;}
export function headFacePreviewRevision(fixture:Awaited<ReturnType<typeof headFaceCalibration>>){
  return hash({version:HEAD_FACE_WORKBENCH_VERSION,profile:fixture.profile,plan:fixture.plan,clock:fixture.clock,activity:fixture.activity,sourceClock:fixture.sourceClock,
    resources:fixture.resources.map(r=>({file:r.file,path:r.path,sha256:r.sha256})),vendorSha256:fixture.vendor.sha256});
}
export async function headFacePreviewFile(repo:string,input:unknown,file:string,expectedRevision?:string){
  const selection=HeadFaceSelectionSchema.parse(input);
  const textFiles=['index.html','style.css','scene.js','report.json','binding.json'];
  if(!textFiles.includes(file)&&file!=='vendor/gsap.min.js'&&!/^assets\/rigs\/[a-f0-9]{64}\.png$(?![\s\S])/.test(file))throw new Error('Unknown face preview file');
  const fixture=await headFaceCalibration(repo,selection);
  const revision=headFacePreviewRevision(fixture),{clock}=fixture;
  if(expectedRevision!==undefined&&(!/^[a-f0-9]{64}$/.test(expectedRevision)||expectedRevision!==revision))throw new Error('Face preview binding changed; reload the workbench');
  if(file==='binding.json')return {type:'application/json',bytes:Buffer.from(JSON.stringify({version:HEAD_FACE_WORKBENCH_VERSION,revision,startMs:clock.startMs,endMs:clock.endMs,
    diagnosticOnly:true,audioPresent:false,approved:false,productionReady:false,motionVerified:false}))};
  if(expectedRevision===undefined)throw new Error('Face preview needs an explicit current binding');
  if(file==='vendor/gsap.min.js')return {type:'application/javascript',bytes:fixture.vendor.bytes};
  if(file.startsWith('assets/')){
    const resource=fixture.resources.find(r=>r.path===file);if(!resource)throw new Error('Unknown face preview resource');
    const bytes=await boundedFile(repo,resource.file,40*1024*1024);if(hash(bytes)!==resource.sha256)throw new Error('Face preview resource changed');
    return {type:'image/png',bytes};
  }
  const {plan,profile,activity,sourceClock}=fixture;
  let rendered=scenes.get(revision);
  if(!rendered){
    const compiled=performanceScene(plan,profile,activity,undefined,undefined,undefined,sourceClock,clock);
    if(compiled.files.files.reduce((sum,f)=>sum+Buffer.byteLength(f.content),0)>MAX_SCENE_BYTES)throw new Error('Face preview scene exceeds 2MB; repair source/compiler without increasing the limit');
    rendered={files:compiled.files,report:compiled.compiled.report};
    if(scenes.size>=4)scenes.delete(scenes.keys().next().value!);
    scenes.set(revision,rendered);
  }
  // The scene generator owns the markup and GSAP calls. No replacement face,
  // alternate skin/glyph renderer or handwritten motion is used in this UI.
  if(file==='report.json')return {type:'application/json',bytes:Buffer.from(JSON.stringify({version:HEAD_FACE_WORKBENCH_VERSION,
    revision,selection,definitionFile:fixture.definitionFile,definitionHash:fixture.definitionHash,bankFingerprint:fixture.bank.fingerprint,sourceIdentityHash:clock.sourceIdentityHash,vendorSha256:fixture.vendor.sha256,
    originalRange:{startMs:0,endMs:4000},sliceRange:{startMs:clock.startMs,endMs:clock.endMs},diagnosticOnly:true,audioPresent:false,phonemeLipSync:false,
    approved:false,productionReady:false,motionVerified:false,compiled:rendered.report},null,2))};
  const entry=rendered.files.files.find(f=>f.path===file);if(!entry)throw new Error('Face preview scene file missing');
  let content=entry.content;
  if(file==='index.html')content=content.replace('<script>window.__timelines=window.__timelines||{};</script>','')
    .replace(/(href|src)="((?:assets\/rigs\/[a-f0-9]{64}\.png|style\.css|scene\.js|vendor\/gsap\.min\.js))"/g,'$1="$2?revision='+revision+'"')
    .replace('</body>','<script src="/preview-bridge.js"></script></body>');
  return {type:file==='index.html'?'text/html':file==='style.css'?'text/css':'application/javascript',bytes:Buffer.from(content)};
}

export function headFaceWorkbench(input:unknown){
  const s=HeadFaceSelectionSchema.parse(input),start=s.slice==='whole'?0:2000,base=sceneBase(s);
  const candidate=HEAD_FACE_CANDIDATES.find(c=>c.actor===s.actor&&c.view===s.view);
  const headFile=candidate?.view==='three-quarter-left'?'lila-head-left-dialogue-v1.png':candidate?s.actor+'-head-source-angle-v2.png':undefined;
  const sourceLink=headFile?`<a href="/api/topics/prehistoric-life/head-cells?file=${headFile}">PNG và landmark</a>`:'<span>Góc này chưa có head candidate</span>';
  const options=(values:readonly string[],selected:string)=>values.map(v=>`<option value="${v}"${v===selected?' selected':''}>${v}</option>`).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mặt trên thân · Lila/Karo</title><style>
body{margin:0;padding:24px;background:#ece5d6;color:#362215;font:16px/1.5 system-ui}main{max-width:1200px;margin:auto}h1{font-size:28px}form,nav{display:flex;flex-wrap:wrap;gap:12px;align-items:end}label{display:block}select,input,button{font:inherit;padding:8px;max-width:100%}button{cursor:pointer}input[type=range]{width:300px}iframe{border:1px solid #9a7950;background:#fff7e5;width:100%;height:620px}a{color:#684516}.pair{display:grid;grid-template-columns:minmax(150px,1fr) minmax(0,3fr);gap:20px}img{width:100%;height:560px;object-fit:contain;background:#fff7e5}code{overflow-wrap:anywhere}:focus-visible{outline:3px solid #005b83;outline-offset:3px}#status{white-space:pre-wrap;overflow-wrap:anywhere}figure{margin:16px 0}@media(max-width:700px){body{padding:12px}.pair{grid-template-columns:1fr}img{height:300px}iframe{height:560px}input[type=range]{width:100%}}
</style></head><body><main data-face-start="${start}" data-face-end="4000" data-face-base="${base}"><h1>Mặt source trên thân · Lila/Karo</h1>
<p>Đầu và quần áo ứng viên dùng đúng renderer của scene. Tín hiệu miệng chẩn đoán, không có audio. Chưa duyệt tạo hình, góc quay hoặc độ mượt; lỗi ghép/geometry sẽ chặn preview và không thay bằng đầu cũ.</p>
<form method="get"><label>Diễn viên<select name="actor">${options(['lila','karo'],s.actor)}</select></label><label>Góc thân/đầu<select name="view">${options(HEAD_FACE_VIEWS,s.view)}</select></label><label>Động tác<select name="action">${options(['rest','point','think'],s.action)}</select></label><label>Hướng mắt<select name="look">${options(['rest','ahead','up','down'],s.look)}</select></label><label>Clock<select name="slice">${options(['whole','second-half'],s.slice)}</select></label><button type="submit">Xem trên thân</button></form>
<div class="pair"><figure><img src="/api/topics/prehistoric-life/references/reference-${s.actor}-full.png" alt="Ảnh gốc ${s.actor}"><figcaption>Chuẩn tạo hình gốc</figcaption></figure><figure><iframe id="face-preview" title="Scene mặt và thân ${s.actor}" sandbox="allow-scripts"></iframe><figcaption>Góc nguồn chưa đo yaw; một cell, không phải quay đầu.</figcaption></figure></div>
<nav aria-label="Tua scene"><label>Thời gian gốc (ms)<input id="face-time" type="number" min="${start}" max="4000" step="1" value="${start}"></label><input id="face-range" type="range" aria-label="Thời gian gốc" min="${start}" max="4000" step="1" value="${start}"><button id="face-seek" type="button">Tua tới</button><button id="face-play" type="button" aria-pressed="false">Phát</button><button id="face-reset" type="button">Về đầu đoạn</button></nav>
<p id="status" role="status">Đang nạp scene · ${start} ms gốc</p><p><a id="face-report" href="${base}binding.json" target="_blank" rel="noopener">Nguồn/clock/báo cáo compiler</a> · ${sourceLink} · <a href="/api/topics/prehistoric-life/supporting-actors">Diễn viên phụ</a></p><p>Không gọi model/TTS/ASR, không ghi project hoặc duyệt production. So full và second-half ở cùng thời gian gốc để kiểm nhịp miệng/mắt/tay qua cut. Ghi exact Git SHA cùng ảnh/video khi gửi kết quả.</p></main><script src="/api/topics/prehistoric-life/head-face-player.js"></script></body></html>`;
}

/** UI clock only: seek the existing compiled timeline, never recreate motion. */
export const headFacePlayerScript=`(() => {
const main=document.querySelector('main'),frame=document.querySelector('#face-preview'),time=document.querySelector('#face-time'),range=document.querySelector('#face-range'),status=document.querySelector('#status'),play=document.querySelector('#face-play');
const start=Number(main.dataset.faceStart),end=Number(main.dataset.faceEnd);let position=start,playing=false,ready=false,last=0,raf=0;
function pause(){playing=false;cancelAnimationFrame(raf);play.textContent='Phát';play.setAttribute('aria-pressed','false');}
function seek(value){if(!Number.isFinite(value))return;position=Math.max(start,Math.min(end,value));time.value=String(Math.round(position));range.value=time.value;status.textContent=(ready?'':'Chưa sẵn sàng · ')+Math.round(position)+' ms gốc / '+Math.round(position-start)+' ms trong đoạn';if(ready)frame.contentWindow.postMessage({type:'studio:seek',timeMs:position-start},'*');}
function tick(now){if(!playing)return;const delta=now-last;last=now;seek(position+delta);if(position>=end)pause();else raf=requestAnimationFrame(tick);}
document.querySelector('#face-seek').onclick=()=>{pause();seek(Number(time.value));};document.querySelector('#face-reset').onclick=()=>{pause();seek(start);};range.oninput=()=>{pause();seek(Number(range.value));};
play.onclick=()=>{if(!ready){status.textContent='Scene chưa sẵn sàng. Mở báo cáo nguồn/clock để xem lỗi.';return;}if(playing){pause();return;}if(position>=end)seek(start);playing=true;play.textContent='Dừng';play.setAttribute('aria-pressed','true');last=performance.now();raf=requestAnimationFrame(tick);};
addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.data?.type!=='studio:ready')return;ready=true;seek(position);});
addEventListener('pagehide',pause);seek(start);
async function read(url){const response=await fetch(url,{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Không nạp được nguồn hoặc compiler.');return data;}
(async()=>{try{const base=main.dataset.faceBase,binding=await read(base+'binding.json');if(!/^[a-f0-9]{64}$/.test(binding.revision)||binding.startMs!==start||binding.endMs!==end)throw new Error('Clock hoặc source binding không khớp.');const query='?revision='+binding.revision;document.querySelector('#face-report').href=base+'report.json'+query;await read(base+'report.json'+query);frame.src=base+'index.html'+query;}catch(error){pause();status.textContent='Preview bị chặn: '+error.message;}})();
})();`;
