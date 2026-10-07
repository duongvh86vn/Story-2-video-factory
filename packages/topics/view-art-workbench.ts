import {promises as fs} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {hash,escapeHtml} from '../core/utils.js';
import {bodyViewRegistrations} from '../animation/body-view-art.js';

export const AUTHORED_BODY_VIEWS=['three-quarter-left','three-quarter-right','left','right','back'] as const;
const ImageName=z.string().regex(/^(lila|karo)-(three-quarter-left|three-quarter-right|left|right|back)-v\d+\.(png|jpg|webp)$/);
const Study=z.object({actor:z.enum(['lila','karo']),view:z.enum(AUTHORED_BODY_VIEWS),version:z.string().regex(/^v\d+$/),file:ImageName,
  sha256:z.string().regex(/^[a-f0-9]{64}$/),model:z.string(),width:z.number().int().positive(),height:z.number().int().positive(),
  status:z.string(),actualTransparency:z.boolean(),approved:z.literal(false),productionReady:z.literal(false),registered:z.literal(false),reviewNotes:z.array(z.string()).default([])});
const folder=(repo:string)=>path.join(repo,'library/topics/prehistoric-life/body-views');
export async function viewArtInventory(repo:string){
  const dir=folder(repo),names=await fs.readdir(dir).catch(()=>[]),items=[];
  for(const name of names.filter(n=>/^(lila|karo)-(three-quarter-left|three-quarter-right|left|right|back)-v\d+\.json$/.test(n)).sort()){
    const raw=await fs.readFile(path.join(dir,name),'utf8').then(s=>JSON.parse(s) as unknown).catch(()=>undefined),parsed=Study.safeParse(raw);
    if(parsed.success)items.push(parsed.data);
  }
  return items;
}
export async function viewArtImage(repo:string,name:string){
  ImageName.parse(name);
  const study=(await viewArtInventory(repo)).find(s=>s.file===name);if(!study)throw new Error('Unknown authored view candidate');
  const file=path.join(folder(repo),name),stat=await fs.lstat(file);
  if(stat.isSymbolicLink()||!stat.isFile()||stat.size>40*1024*1024)throw new Error('Invalid authored view image');
  const bytes=await fs.readFile(file);if(hash(bytes)!==study.sha256)throw new Error('Authored view changed; create a new version');
  return {bytes,type:name.endsWith('.jpg')?'image/jpeg':name.endsWith('.webp')?'image/webp':'image/png'};
}
export async function viewArtWorkbench(repo:string){
  const inventory=await viewArtInventory(repo),labels:Record<typeof AUTHORED_BODY_VIEWS[number],string>={'three-quarter-left':'3/4 nhìn trái','three-quarter-right':'3/4 nhìn phải',left:'Profile trái',right:'Profile phải',back:'Nhìn từ sau'};
  const cards=AUTHORED_BODY_VIEWS.map(view=>`<section id="${view}"><h2>${labels[view]}</h2><div class="pair">${(['lila','karo'] as const).map(actor=>{
    const study=inventory.filter(s=>s.actor===actor&&s.view===view).sort((a,b)=>Number(b.version.slice(1))-Number(a.version.slice(1)))[0];
    const registration=view==='three-quarter-left'||view==='three-quarter-right'?bodyViewRegistrations[actor][view]:undefined;
    const registered=!!study&&study.sha256===registration?.sha256;
    return study?`<figure><h3>${actor==='lila'?'Lila':'Karo'}</h3><img src="/api/topics/prehistoric-life/view-art/${study.file}" alt="${actor} ${labels[view]}"><figcaption>${escapeHtml(study.model)} · ${escapeHtml(study.file)}<br>${study.actualTransparency?'Có alpha thật':'Chưa có alpha thật'}; ${registered?'có đăng ký kỹ thuật ứng viên':'chưa đăng ký khớp'}; chưa duyệt identity hoặc production. ${study.reviewNotes.map(n=>`<p>${escapeHtml(n)}</p>`).join('')}</figcaption></figure>`:`<figure class="pending"><h3>${actor==='lila'?'Lila':'Karo'}</h3><p>Chưa có artwork góc này; không mirror ảnh gốc để giả góc quay.</p></figure>`;
  }).join('')}</div></section>`).join('');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Góc thân và đầu — Lila/Karo</title><style>body{font:16px system-ui;background:#ece5d6;color:#362215;margin:24px}main{max-width:1100px;margin:auto}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0;padding:20px;background:#fff7e5;border-radius:14px}img{height:540px;width:100%;object-fit:contain}figcaption{margin-top:14px}a{color:#65461b}.pending{border:2px dashed #b77737}section{margin-top:32px;scroll-margin:20px}@media(max-width:650px){.pair{grid-template-columns:1fr}}</style><main><h1>Góc thân và đầu — artwork ứng viên</h1><p>Các góc mới được vẽ thật qua 9router từ ảnh gốc, giữ màu ấm và tay chân nét đen. Bốn view 3/4 trái/phải có đăng ký kỹ thuật ứng viên; các góc profile và sau chưa đăng ký. Tất cả chưa duyệt identity/biểu cảm hoặc dùng làm rig sản xuất. <a href="/api/topics/prehistoric-life/view-registration">Xem landmark/mask</a>. Ảnh tĩnh không chứng minh chuyển động. Các vị trí còn thiếu được ghi rõ.</p><nav>${AUTHORED_BODY_VIEWS.map(v=>`<a href="#${v}">${labels[v]}</a>`).join(' · ')}</nav><section><h2>Chuẩn gốc</h2><div class="pair">${['lila','karo'].map(actor=>`<figure><img src="/api/topics/prehistoric-life/references/reference-${actor}-full.png" alt="Ảnh gốc ${actor}"><figcaption>${actor} — chuẩn tóc, mặt, trang phục, màu và silhouette</figcaption></figure>`).join('')}</div></section>${cards}<p><a href="/api/topics/prehistoric-life/pose-art">Pose hành động</a> · <a href="/api/topics/prehistoric-life/arm-audit">Rà soát rig hiện tại</a></p></main></html>`;
}
