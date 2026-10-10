import {ART_TO_BODY_VIEW} from '../animation/body-view-basic-capabilities.js';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {z} from 'zod';
import {hash,escapeHtml} from '../core/utils.js';
import {bodyCandidateRegistrations} from '../animation/body-view-art.js';

export const VIEW_ART_CATALOG_VERSION='native-view-art-catalog-2';
/** Requested drawing directions are never inferred/measured yaw. */
export const REQUIRED_BODY_VIEWS=['front','three-quarter-left','three-quarter-right','left','right','back-three-quarter-left','back-three-quarter-right'] as const;
export const AUTHORED_BODY_VIEWS=[...REQUIRED_BODY_VIEWS,'back'] as const;
export const viewArtDescription={version:VIEW_ART_CATALOG_VERSION,requiredViews:REQUIRED_BODY_VIEWS,optionalViews:['back'],
  directionAuthority:'requested drawing labels only; actual yaw/identity/pose and continuous turns remain unmeasured/unaccepted',
  provenance:'own primary + optional same-person edit and supplemental source hashes; original raster bytes retained',
  approved:false,registered:false,productionReady:false,productionRig:null,motionVerified:false,productionApproval:false,availableBanks:[]};
const View=z.enum(AUTHORED_BODY_VIEWS),Digest=z.string().regex(/^[a-f0-9]{64}$/);
const ImageName=z.string().max(180).regex(new RegExp(`^(lila|karo)-(${AUTHORED_BODY_VIEWS.join('|')})-v[1-9]\\d*\\.(png|jpg|webp)$`));
const folderRelative='library/topics/prehistoric-life/body-views';
const Reference=z.object({file:z.string().max(240),sha256:Digest,role:z.enum(['primary','supplemental','edit-target'])}).strict();
const Provenance=z.object({tool:z.literal('builtin-imagegen'),generatedImageFile:z.string().regex(/^exec-[a-f0-9-]+\.png$/),
  prompt:z.string().min(1).max(16000),referenceImages:z.array(Reference).min(1).max(4),requestedView:View,measuredYawDeg:z.null()}).strict();
export const ViewArtStudySchema=z.object({actor:z.enum(['lila','karo']),view:View,version:z.string().regex(/^v[1-9]\d*$/),file:ImageName,
  sha256:Digest,model:z.string().max(500),width:z.number().int().positive(),height:z.number().int().positive(),
  status:z.string().max(500),actualTransparency:z.boolean(),approved:z.literal(false),productionReady:z.literal(false),registered:z.literal(false),
  provenance:Provenance.optional(),reviewNotes:z.array(z.string().max(3000)).max(40).default([])}).superRefine((study,ctx)=>{
  if(!study.file.startsWith(`${study.actor}-${study.view}-${study.version}.`))ctx.addIssue({code:'custom',path:['file'],message:'Authored view/file ownership differs'});
  const provenance=study.provenance;if(!provenance)return; // Explicit legacy metadata remains readable.
  if(provenance.requestedView!==study.view)ctx.addIssue({code:'custom',path:['provenance','requestedView'],message:'Requested source direction differs'});
  if(provenance.referenceImages.filter(r=>r.role==='primary').length!==1||new Set(provenance.referenceImages.map(r=>r.file)).size!==provenance.referenceImages.length)
    ctx.addIssue({code:'custom',path:['provenance','referenceImages'],message:'Need one own primary and unique source references'});
  for(const [i,ref] of provenance.referenceImages.entries()){
    const primary=ref.role==='primary'&&ref.file===`docs/topics/assets/reference-${study.actor}-full.png`;
    const supplement=ref.role==='supplemental'&&/^docs\/topics\/assets\/reference-forest-tribe-(stick|detailed)\.png$/.test(ref.file);
    const name=ref.file.startsWith(folderRelative+'/')?ref.file.slice(folderRelative.length+1):'';
    const edit=ref.role==='edit-target'&&ImageName.safeParse(name).success&&name.startsWith(study.actor+'-')&&name!==study.file;
    if(!primary&&!supplement&&!edit)ctx.addIssue({code:'custom',path:['provenance','referenceImages',i,'file'],message:'Unknown/foreign/self-referencing authored view source'});
  }
});
export type ViewArtStudy=z.infer<typeof ViewArtStudySchema>;

/** Decimal version strings have no leading zeros. Keep ordering exact even
 * when a user-authored suffix exceeds JavaScript's safe integer range. */
function latestStudy(inventory:ReadonlyArray<ViewArtStudy>,actor:ViewArtStudy['actor'],view:ViewArtStudy['view']){
  return inventory.filter(s=>s.actor===actor&&s.view===view).sort((a,b)=>{
    const left=a.version.slice(1),right=b.version.slice(1);
    return right.length-left.length||(left===right?0:left>right?-1:1);
  })[0];
}

/** Check every descendant: neither artwork, metadata nor referenced folders
 * may follow a link. No source image is modified or interpreted as code. */
async function readSource(repo:string,relative:string,maxBytes:number):Promise<Buffer>{
  let target=path.resolve(repo);const parts=relative.split('/');
  for(const [i,part] of parts.entries()){
    if(!part||part==='.'||part==='..'||part.includes('\\')||part.includes(':'))throw new Error('Invalid authored view source path');
    target=path.join(target,part);const stat=await fs.lstat(target);
    if(stat.isSymbolicLink()||(i===parts.length-1?!stat.isFile()||stat.size>maxBytes:!stat.isDirectory()))throw new Error('Linked/invalid/oversized authored view source: '+relative);
  }
  const bytes=await fs.readFile(target);if(bytes.length>maxBytes)throw new Error('Oversized authored view source');return bytes;
}
async function readDirectorySource(repo:string){
  let current=path.resolve(repo);
  for(const part of folderRelative.split('/')){current=path.join(current,part);const stat=await fs.lstat(current);if(stat.isSymbolicLink()||!stat.isDirectory())throw new Error('Linked/invalid authored view folder');}
}
export async function viewArtInventory(repo:string):Promise<ViewArtStudy[]>{
  const dir=path.join(repo,folderRelative);let names:string[];
  try{await readDirectorySource(repo);names=await fs.readdir(dir);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
  const items:ViewArtStudy[]=[];
  for(const name of names.filter(n=>n.endsWith('.json')&&ImageName.safeParse(n.slice(0,-5)+'.png').success).sort()){
    const study=ViewArtStudySchema.parse(JSON.parse((await readSource(repo,folderRelative+'/'+name,200*1024)).toString('utf8')));
    if(name!==study.file.replace(/\.(png|jpg|webp)$/,'.json'))throw new Error('Authored view metadata filename differs');
    items.push(study);
  }
  return items;
}
export function viewArtCoverage(inventory:ReadonlyArray<ViewArtStudy>){
  const actors=(['lila','karo'] as const).map(actor=>({actor,views:REQUIRED_BODY_VIEWS.map(view=>{
    const study=latestStudy(inventory,actor,view);
    const registration=bodyCandidateRegistrations[actor][ART_TO_BODY_VIEW[view]];
    return {view,file:study?.file??null,sha256:study?.sha256??null,sourceCandidatePresent:!!study,
      engineeringRegistrationMatches:!!study&&study.sha256===registration?.sha256,artApproved:false,productionReady:false,registeredForProduction:false};
  })}));
  return {version:VIEW_ART_CATALOG_VERSION,scope:'requested-view source metadata and separate engineering registration matches; no yaw/identity/pose/rig/motion acceptance',requiredViews:[...REQUIRED_BODY_VIEWS],
    requiredSlots:14,sourceCandidateSlots:actors.flatMap(a=>a.views).filter(v=>v.sourceCandidatePresent).length,productionReadySlots:0,
    missingSources:actors.flatMap(a=>a.views.filter(v=>!v.sourceCandidatePresent).map(v=>({actor:a.actor,view:v.view}))),actors,productionReady:false,productionRig:null,availableBanks:[]};
}
export async function viewArtImage(repo:string,name:string){
  ImageName.parse(name);
  const study=(await viewArtInventory(repo)).find(s=>s.file===name);if(!study)throw new Error('Unknown authored view candidate');
  const bytes=await readSource(repo,folderRelative+'/'+name,40*1024*1024);
  if(hash(bytes)!==study.sha256)throw new Error('Authored view changed; create a new version');
  for(const ref of study.provenance?.referenceImages??[])if(hash(await readSource(repo,ref.file,40*1024*1024))!==ref.sha256)throw new Error('Authored view primary/edit/supplement source changed: '+ref.file);
  const metadata=await sharp(bytes,{limitInputPixels:20_000_000}).metadata();
  const type=metadata.format==='jpeg'?'image/jpeg':metadata.format==='png'?'image/png':metadata.format==='webp'?'image/webp':undefined;
  if(!type||metadata.width!==study.width||metadata.height!==study.height||metadata.pages&&metadata.pages!==1)throw new Error('Authored view image header/canvas differs from source record');
  return {bytes,type}; // JPEG bytes historically named .png receive actual MIME.
}
export async function viewArtWorkbench(repo:string){
  const inventory=await viewArtInventory(repo),coverage=viewArtCoverage(inventory);
  const labels:Record<typeof AUTHORED_BODY_VIEWS[number],string>={front:'Chính diện','three-quarter-left':'3/4 nhìn trái','three-quarter-right':'3/4 nhìn phải',left:'Profile trái',right:'Profile phải','back-three-quarter-left':'3/4 từ sau trái','back-three-quarter-right':'3/4 từ sau phải',back:'Lưng thẳng — bổ sung'};
  const cards=AUTHORED_BODY_VIEWS.map(view=>`<section id="${view}"><h2>${labels[view]}</h2><div class="pair">${(['lila','karo'] as const).map(actor=>{
    const study=latestStudy(inventory,actor,view);
    const registered=coverage.actors.find(a=>a.actor===actor)?.views.find(v=>v.view===view)?.engineeringRegistrationMatches??false;
    return study?`<figure><h3>${actor==='lila'?'Lila':'Karo'}</h3><img src="/api/topics/prehistoric-life/view-art/${study.file}" alt="${actor} ${labels[view]}"><figcaption>${escapeHtml(study.model)} · ${escapeHtml(study.file)}<br>Trạng thái nguồn: ${escapeHtml(study.status)}<br>${study.actualTransparency?'Nguồn ghi nhận alpha thật':'Chưa có alpha thật'}; ${registered?'khớp đăng ký kỹ thuật ứng viên':'chưa đăng ký khớp'}; chưa duyệt identity hoặc production. ${study.reviewNotes.map(n=>`<p>${escapeHtml(n)}</p>`).join('')}${study.provenance?`<details><summary>Nguồn và yêu cầu vẽ</summary><p>Hướng yêu cầu: ${labels[study.provenance.requestedView]}; yaw chưa đo. Hash nguồn: ${study.sha256}</p><ul>${study.provenance.referenceImages.map(r=>`<li>${escapeHtml(r.role)}: ${escapeHtml(r.file)} · ${r.sha256}</li>`).join('')}</ul><pre>${escapeHtml(study.provenance.prompt)}</pre></details>`:''}</figcaption></figure>`:`<figure class="pending"><h3>${actor==='lila'?'Lila':'Karo'}</h3><p>Chưa có artwork riêng cho hướng này. Ảnh gốc có góc nguồn, không tự gán thành chính diện hoặc mirror để lấp góc thiếu.</p></figure>`;
  }).join('')}</div></section>`).join('');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bảy hướng tạo hình — Lila/Karo</title><style>body{font:16px system-ui;background:#ece5d6;color:#362215;margin:24px}main{max-width:1100px;margin:auto}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0;padding:20px;background:#fff7e5;border-radius:14px;min-width:0}img{height:540px;width:100%;object-fit:contain}figcaption{margin-top:14px}a{color:#65461b}.pending{border:2px dashed #b77737}section{margin-top:32px;scroll-margin:20px}pre,li{white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:650px){.pair{grid-template-columns:1fr}}</style><main><h1>Bảy hướng tạo hình — artwork ứng viên</h1><p>${coverage.sourceCandidateSlots}/${coverage.requiredSlots} vị trí có nguồn theo hướng được yêu cầu; 0 vị trí được nghiệm thu sản xuất. Có nguồn không chứng minh góc đo, identity, pose, chuyển hướng hoặc độ mượt. Cả14 vị trí có đăng ký kỹ thuật ứng viên riêng; profile/front chỉ fixed happy/rigid rest/point/think, góc lưng không có think/chin. Mask/pose/occlusion/turn chưa được duyệt. Không tự chọn artwork mới vào video. <a href="/api/topics/prehistoric-life/view-registration">Xem landmark/mask</a> · <a href="/api/topics/prehistoric-life/view-art/inventory">Hồ sơ nguồn và phần thiếu</a>.</p><nav>${AUTHORED_BODY_VIEWS.map(v=>`<a href="#${v}">${labels[v]}</a>`).join(' · ')}</nav><section><h2>Chuẩn gốc — giữ nguyên góc nguồn</h2><div class="pair">${['lila','karo'].map(actor=>`<figure><img src="/api/topics/prehistoric-life/references/reference-${actor}-full.png" alt="Ảnh gốc ${actor}"><figcaption>${actor} — chuẩn tóc, mặt, trang phục, màu và silhouette</figcaption></figure>`).join('')}</div></section>${cards}<p><a href="/api/topics/prehistoric-life/pose-art">Pose hành động</a> · <a href="/api/topics/prehistoric-life/arm-audit">Rà soát rig hiện tại</a></p></main></html>`;
}
