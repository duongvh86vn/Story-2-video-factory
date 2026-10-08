import {promises as fs} from 'node:fs';
import {hash,safeRealPath} from '../core/utils.js';
import {prehistoricSupportingModels,prehistoricSupportingDescription} from './supporting-models.js';
/** Exact fixed catalog lookup; no user path or model-supplied URL is fetched. */
export async function supportingActorImage(repo:string,file:string){
  const model=Object.values(prehistoricSupportingModels).find(m=>m.file.split('/').at(-1)===file);
  if(!model)throw new Error('Unknown supporting actor image');
  const target=await safeRealPath(repo,model.file),stat=await fs.stat(target);
  if(!stat.isFile()||stat.size>8*1024*1024)throw new Error('Supporting actor image exceeds bounded size');
  const bytes=await fs.readFile(target);
  if(bytes.length>8*1024*1024||hash(bytes)!==model.sha256)throw new Error('Supporting actor image changed; remeasure and version before rendering');
  return bytes;
}
export function supportingActorWorkbench(){
  const rows=Object.values(prehistoricSupportingModels).map(m=>`<figure><h2>${m.label}</h2><img src="/api/topics/prehistoric-life/supporting-actors/${m.file.split('/').at(-1)}" alt="${m.label}"><figcaption>${m.bodyTemplate==='karo'?'Áo, thắt lưng và quần hai ống theo Karo':'Váy một vai và thắt lưng theo Lila'}</figcaption></figure>`).join('');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diễn viên phụ thời tiền sử</title><style>body{margin:0;padding:24px;background:#eadfca;color:#362215;font:16px system-ui}main{max-width:1000px;margin:auto}.models{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}figure{margin:0;padding:20px;background:#fff7e5;border-radius:16px;text-align:center}img{width:100%;height:620px;object-fit:contain;background:#fff7e5}h2{font-size:21px}figcaption{padding-top:12px}a{color:#70451e}</style><main><h1>Quần chúng · Cuộc sống thời tiền sử</h1><p>Hai mẫu người que dùng cho các vai phụ trong câu chuyện. Nhiều nhân vật có thể dùng cùng mẫu, mỗi người giữ tên và vai riêng.</p><p>Tạo hình đề xuất, chưa duyệt chuyển động. Trong rig, trang phục dùng lại asset Lila/Karo; ảnh dưới là mẫu toàn thân, không phải video diễn xuất.</p><div class="models">${rows}</div><p><a href="/api/topics/prehistoric-life/compare">Lila và Karo</a></p></main></html>`;
}
export function supportingActorManifest(){return {...prehistoricSupportingDescription,preview:'/api/topics/prehistoric-life/supporting-actors',runtimeVerified:false};}
