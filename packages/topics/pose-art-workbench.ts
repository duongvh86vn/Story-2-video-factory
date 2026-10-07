import {promises as fs} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {hash,escapeHtml} from '../core/utils.js';
const ImageName=z.string().regex(/^(?:lila|karo)-(?:poses|point|think|run-left|jump|spear-lunge-left)-v\d+\.(?:png|jpg|webp)$/);
const Study=z.object({actor:z.enum(['lila','karo']),action:z.enum(['sheet','point','think','run-left','jump','spear-lunge-left']).default('sheet'),model:z.string(),file:ImageName,sha256:z.string().regex(/^[a-f0-9]{64}$/),status:z.string(),approved:z.literal(false),reviewNotes:z.array(z.string()).default([])});
const folder=(repo:string)=>path.join(repo,'library/topics/prehistoric-life/pose-studies');
export async function poseArtInventory(repo:string){
  const dir=folder(repo),names=await fs.readdir(dir).catch(()=>[]),studies=[];
  for(const name of names.filter(n=>/^(lila|karo)-.+-v\d+\.json$/.test(n)).sort()){
    // Generation can be writing a new metadata file. A partial candidate must
    // not take down the gallery or expose a resource before its hash is saved.
    const json=await fs.readFile(path.join(dir,name),'utf8').then(text=>JSON.parse(text) as unknown).catch(()=>undefined);
    const parsed=Study.safeParse(json);
    if(parsed.success)studies.push(parsed.data);
  }
  return studies;
}
export async function poseArtImage(repo:string,name:string){
  ImageName.parse(name);
  const study=(await poseArtInventory(repo)).find(s=>s.file===name);
  if(!study)throw new Error('Unknown pose study.');
  const file=path.join(folder(repo),name),stat=await fs.lstat(file);
  if(stat.isSymbolicLink()||!stat.isFile()||stat.size>40*1024*1024)throw new Error('Invalid pose study resource.');
  const bytes=await fs.readFile(file);
  if(hash(bytes)!==study.sha256)throw new Error('Pose study changed; version and review it again.');
  return {bytes,type:name.endsWith('.jpg')?'image/jpeg':name.endsWith('.webp')?'image/webp':'image/png'};
}
export async function poseArtWorkbench(repo:string){
  const studies=await poseArtInventory(repo);
  const actions=['point','think','run-left','jump','spear-lunge-left'],labels:Record<string,string>={point:'Chỉ tay',think:'Suy nghĩ','run-left':'Chạy',jump:'Nhảy','spear-lunge-left':'Chùng người cầm giáo',sheet:'Sheet bị loại'};
  const rejected=studies.filter(s=>s.status.includes('rejected')),candidates=studies.filter(s=>!s.status.includes('rejected'));
  const cards=(items:typeof studies)=>items.map(s=>`<figure><img src="/api/topics/prehistoric-life/pose-art/${s.file}" alt="${escapeHtml(s.actor+' '+s.action+' '+s.model)}"><figcaption><strong>${escapeHtml(s.actor+' · '+labels[s.action])}</strong><br>${escapeHtml(s.file)} · ${escapeHtml(s.model)}<p>${s.status.includes('rejected')?'Đã loại tạo hình; chỉ giữ để đối chiếu.':'Chưa duyệt tạo hình/khớp; chưa tích hợp thành pose sản xuất.'}</p>${s.reviewNotes.map(note=>`<p>${escapeHtml(note)}</p>`).join('')}</figcaption></figure>`).join('');
  const groups=actions.map(action=>{const items=candidates.filter(s=>s.action===action).sort((a,b)=>a.actor===b.actor?b.file.localeCompare(a.file,undefined,{numeric:true}):a.actor==='lila'?-1:1);
    return items.length?`<section id="${action}"><h2>${labels[action]}</h2><div class="studies">${cards(items)}</div></section>`:'';}).join('');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pose từ AI — Lila &amp; Karo</title><style>body{font:16px system-ui;margin:24px;background:#ece5d6;color:#362215}main{max-width:1150px;margin:auto}.refs,.studies{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}figure{margin:0;padding:16px;background:#fff7e5;border-radius:16px}img{width:100%;height:480px;object-fit:contain}figcaption{padding:12px}a{color:#65461b}summary{cursor:pointer;padding:20px;font-weight:bold}section{scroll-margin:20px}@media(max-width:700px){.refs,.studies{grid-template-columns:1fr}}</style><main><h1>Pose từ AI — bản tham khảo cho rig</h1><p>Ảnh tạo qua API 9router bằng Gemini và model ảnh khác. Ảnh gốc dưới đây là chuẩn tóc, mặt, trang phục, màu và tay chân đen. Bộ v1/v2 bị loại tạo hình. ${candidates.length} pose rời vẫn cần sửa theo ghi chú, đăng ký khớp và kiểm chuyển động; ảnh đẹp không chứng minh chuyển động mượt.</p><nav>${actions.map(action=>`<a href="#${action}">${labels[action]}</a>`).join(' · ')}</nav><div class="refs">${['lila','karo'].map(actor=>`<figure><img src="/api/topics/prehistoric-life/references/reference-${actor}-full.png" alt="Ảnh gốc ${actor}"><figcaption>Ảnh gốc ${actor} — chuẩn tạo hình</figcaption></figure>`).join('')}</div>${groups}<details><summary>${rejected.length} ảnh bị loại — lịch sử đối chiếu</summary><div class="studies">${cards(rejected)}</div></details><p><a href="/api/topics/prehistoric-life/body?action=run-left&amp;timeMs=500&amp;mood=happy">Rig động tác</a> · <a href="/api/topics/prehistoric-life/compare">So sánh tạo hình</a></p></main></html>`;
}
