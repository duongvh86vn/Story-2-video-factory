import {hash} from '../core/utils.js';
import {prehistoricSupportingModels,prehistoricSupportingDescription} from './supporting-models.js';
import {SUPPORTING_FACE_CANDIDATES,supportingFaceDescription} from './supporting-face-candidates.js';
import {boundedHeadFaceFile} from './head-face-source.js';
/** Exact fixed catalog lookup; no user path or model-supplied URL is fetched. */
export async function supportingActorImage(repo:string,file:string){
  const model=Object.values(prehistoricSupportingModels).find(m=>m.file.split('/').at(-1)===file)??
    SUPPORTING_FACE_CANDIDATES.filter(c=>c.headFile===file).map(c=>({...c,file:'library/topics/prehistoric-life/head-cells/'+c.headFile}))[0];
  if(!model)throw new Error('Unknown supporting actor image');
  const bytes=await boundedHeadFaceFile(repo,model.file,8*1024*1024);
  if(bytes.length>8*1024*1024||hash(bytes)!==model.sha256)throw new Error('Supporting actor image changed; remeasure and version before rendering');
  return bytes;
}
export function supportingActorWorkbench(){
  const rows=Object.values(prehistoricSupportingModels).map(m=>{
    const face=SUPPORTING_FACE_CANDIDATES.find(c=>c.actor===m.id);
    return `<figure><h2>${m.label}</h2><img src="/api/topics/prehistoric-life/supporting-actors/${m.file.split('/').at(-1)}" alt="${m.label}"><figcaption>${m.bodyTemplate==='karo'?'Áo, thắt lưng và quần hai ống theo Karo':'Váy một vai và thắt lưng theo Lila'}</figcaption>${face?`<p><a href="/api/topics/prehistoric-life/head-faces?actor=${face.actor}&amp;view=${face.view}">Xem ứng viên đầu riêng trên thân</a></p>`:''}</figure>`;
  }).join('');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diễn viên phụ thời tiền sử</title><style>body{margin:0;padding:24px;background:#eadfca;color:#362215;font:16px system-ui}main{max-width:1000px;margin:auto}.models{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}figure{margin:0;padding:20px;background:#fff7e5;border-radius:16px;text-align:center}img{width:100%;height:620px;object-fit:contain;background:#fff7e5}h2{font-size:21px}figcaption{padding-top:12px}a{color:#70451e}</style><main><h1>Quần chúng · Cuộc sống thời tiền sử</h1><p>Hai mẫu người que dùng cho các vai phụ trong câu chuyện. Nhiều nhân vật có thể dùng cùng mẫu, mỗi người giữ tên và vai riêng.</p><p>Tạo hình đề xuất, chưa duyệt chuyển động. Trong rig, trang phục dùng lại asset Lila/Karo; ảnh dưới là mẫu toàn thân, không phải video diễn xuất.</p><div class="models">${rows}</div><p><a href="/api/topics/prehistoric-life/compare">Lila và Karo</a></p></main></html>`;
}
export function supportingActorManifest(){return {...prehistoricSupportingDescription,nativeFaces:supportingFaceDescription,preview:'/api/topics/prehistoric-life/supporting-actors',runtimeVerified:false};}
