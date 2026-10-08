import {escapeHtml} from '../core/utils.js';
import {HeadCellFileSchema,headCellInventory} from './head-cell-art.js';
import {headCellDraft,headCellSourceBinding} from './head-cell-landmarks.js';

/** Source pixels and manual draft only; no animation or library mutation. */
export async function headCellWorkbench(repo:string,selected?:string){
  if(selected!==undefined)HeadCellFileSchema.parse(selected);
  const inventory=await headCellInventory(repo),material=selected?inventory.find(m=>m.file===selected):inventory[0];
  if(!material)throw new Error('No such individual head source');
  const links=inventory.map(m=>`<a href="?file=${m.file}">${escapeHtml(m.file)}</a>`).join(' · ');
  const missingKaro=inventory.some(m=>m.actor==='karo')?'':' Karo chưa có ảnh đầu riêng trong bộ này.';
  const angleIntent=material.requestedYawDeg===null?'Giữ góc ảnh gốc; chưa đo góc. Không tự gọi là chính diện0°.':'Góc yêu cầu '+material.requestedYawDeg+'° trong prompt chưa được đo.';
  const data=escapeHtml(JSON.stringify({source:headCellSourceBinding(material),draft:headCellDraft(material)}));
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đo từng góc đầu — Lila/Karo</title><style>
:root{--bg:#ece5d6;--paper:#fff7e5;--ink:#362215;--muted:#574838;--accent:#684516;--border:#9a7950;--selection:#005b83;--danger:#842817;--s1:8px;--s2:12px;--s3:16px;--s4:24px;--radius:8px}
*,*::before,*::after{box-sizing:border-box}body{margin:0;padding:var(--s3);background:var(--bg);color:var(--ink);font:16px/1.5 system-ui}
main{max-width:1280px;margin:auto;min-width:0}h1{font-size:28px;line-height:1.25}h2{font-size:20px}section{padding:var(--s3);margin:var(--s4) 0;background:var(--paper);border:1px solid var(--border)}
a{color:var(--accent)}p{margin:var(--s2) 0}.panel>*{min-width:0}label{display:block;margin:var(--s2) 0}
input,select,textarea,button{font:inherit;max-width:100%;min-width:0;padding:var(--s1);border:1px solid var(--border);border-radius:var(--radius);background:var(--paper);color:var(--ink)}
input,select,textarea{display:block;width:100%}button{margin:var(--s1) var(--s1) var(--s1) 0;cursor:pointer}
:focus-visible{outline:3px solid var(--selection);outline-offset:3px}button:disabled{cursor:wait}
textarea{font:14px/1.5 monospace;min-height:360px;resize:vertical}code,pre{overflow-wrap:anywhere;white-space:pre-wrap}pre{font:14px/1.5 monospace;max-height:480px;overflow:auto}
#source-view{display:block;width:100%;height:560px;border:1px solid var(--border);background:var(--paper);touch-action:manipulation}
.reference{display:block;max-width:100%;max-height:320px;margin:auto}
#markers circle{fill:var(--selection);stroke:var(--paper);stroke-width:3px}#markers text{font:18px system-ui;fill:var(--selection);paint-order:stroke;stroke:var(--paper);stroke-width:4px}
#markers polyline{stroke:var(--selection);stroke-width:3px;fill:none}
.muted{color:var(--muted)}.error{color:var(--danger)}
@media(min-width:880px){.panel{display:grid;grid-template-columns:minmax(0,2fr) minmax(260px,1fr);gap:var(--s4)}section{padding:var(--s4)}}
@media(max-width:639px){#source-view{height:400px}button{display:block;width:100%}}
</style></head><body><main><h1>Đo từng góc đầu Lila/Karo</h1><p>Ảnh tĩnh chưa duyệt. Điểm đo thuộc đúng PNG đang mở; không tự gán góc đầu từ prompt.${missingKaro}</p><nav aria-label="Chọn PNG nguồn">${links}</nav>
<section id="editor" data-head-cell="${data}"><h2>${escapeHtml(material.file)}</h2><p>${escapeHtml(angleIntent)}</p><p class="muted">${material.width} × ${material.height} pixel · SHA256 <code>${material.sha256}</code></p>
<div class="panel"><div><svg id="source-view" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${material.width} ${material.height}" role="img" aria-label="PNG đầu và các điểm đo theo pixel nguồn"><image width="${material.width}" height="${material.height}" href="/api/topics/prehistoric-life/head-cells/${material.file}"/><g id="markers"></g></svg><p>Bấm ảnh để ghi điểm. Có thể sửa tất cả tọa độ bằng bàn phím trong JSON bên dưới.</p></div>
<div><img class="reference" src="/api/topics/prehistoric-life/references/reference-${material.actor}-full.png" alt="Tạo hình gốc ${material.actor}"><label for="landmark">Điểm hoặc viền cần đo</label><select id="landmark"><option value="neck">Điểm gắn cổ</option><option value="neckTop">Trục cổ phía trên</option><option value="chin">Cằm</option><option value="nose">Mũi</option><option value="mouth">Tâm miệng</option><option value="screen-left">Mắt phía trái ảnh</option><option value="screen-right">Mắt phía phải ảnh</option><option value="faceContour">Viền mặt</option><option value="seam">Vùng nối cổ</option><option value="mouthContour">Viền miệng</option><option value="mouthEditMask">Mask miệng</option><option value="eye-left-mask">Mask mắt trái ảnh</option><option value="eye-right-mask">Mask mắt phải ảnh</option><option value="protected-paint">Viền vùng màu cần giữ</option></select>
<button id="clear-point" type="button">Xóa mục đang chọn</button><label for="occlusion">Mắt đang chọn bị che bởi</label><select id="occlusion"><option value="nose">Mũi</option><option value="face-contour">Viền mặt</option><option value="hair">Tóc</option></select><button id="set-occlusion" type="button">Ghi mắt bị che</button>
<p>Trái/phải chỉ vị trí trên ảnh. Viền cần ít nhất ba điểm, theo thứ tự quanh vùng; bấm thêm điểm rồi kiểm tra. Mask chỉ là bản đo, chưa kích hoạt miệng hoặc mắt.</p></div></div>
<label for="draft-json">Bản đo JSON — chỉnh bằng bàn phím</label><textarea id="draft-json" spellcheck="false" aria-describedby="draft-help"></textarea><p id="draft-help">Đo thêm <code>crop</code>/<code>skull</code> bằng hình chữ nhật <code>{x,y,width,height}</code>, <code>yawDeg</code>, <code>pixelScale</code>, <code>ponytailSide</code> và <code>review</code> trong JSON. Tọa độ tuyệt đối theo PNG nguồn; crop phải giữ toàn bộ nét. Không lấy góc từ prompt. Cổ có thể nằm dưới viền mặt.</p>
<button id="check" type="button">Kiểm tra bản đo</button><button id="download" type="button">Tải JSON đã kiểm</button><label for="import">Nạp JSON bản đo của PNG này</label><input id="import" type="file" accept=".json,application/json">
<p>Kiểm tra giữ ảnh nguyên bản và báo chỗ còn thiếu/sai. Bản đo không ghi thư viện, không đăng ký rig, không duyệt tạo hình hoặc chuyển động.</p><pre id="result" role="status" aria-live="polite">Chưa kiểm tra bản đo.</pre></section>
<p><a href="/api/topics/prehistoric-life/head-turn-art">Atlas cũ và lý do còn giữ lại</a> · <a href="/api/topics/prehistoric-life/view-registration">Góc thân hiện có</a></p></main><script src="/api/topics/prehistoric-life/head-cell-editor.js" defer></script></body></html>`;
}

export const headCellEditorScript=String.raw`(()=>{
'use strict';
const $=id=>document.getElementById(id),initial=JSON.parse($('editor').dataset.headCell),svg=$('source-view'),ns='http://www.w3.org/2000/svg';
let revision=0,importTicket=0,checkTicket=0;
const sameSource=s=>s&&Object.entries(initial.source).every(([key,value])=>s[key]===value)&&Object.keys(s).length===Object.keys(initial.source).length;
function parsed(){const d=JSON.parse($('draft-json').value);if(!sameSource(d.source))throw new Error('JSON khác PNG/nhân vật đang mở.');return d;}
function report(message,error=false){$('result').textContent=message;$('result').classList.toggle('error',error);}
function fail(error){report(error instanceof Error?error.message:String(error),true);}
function paint(d){
 $('markers').replaceChildren();const points=[];
 for(const key of ['neck','neckTop','chin','nose','mouth'])if(d[key])points.push([key,d[key]]);
 for(const [key,e] of Object.entries(d.eyes??{}))if(e.visible)points.push([key,e.center]);
 const contours=['faceContour','seam','mouthContour','mouthEditMask'].map(k=>[k,d[k]]).concat(Object.entries(d.eyeEditMasks??{}),(d.protectedContours??[]).map((p,i)=>['protected'+i,p]));
 for(const [label,p] of points){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;const circle=document.createElementNS(ns,'circle'),text=document.createElementNS(ns,'text');circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);circle.setAttribute('r',8);text.setAttribute('x',p.x+12);text.setAttribute('y',p.y-12);text.textContent=label;$('markers').append(circle,text);}
 for(const [,poly] of contours)if(Array.isArray(poly)&&poly.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y))){const line=document.createElementNS(ns,'polyline');line.setAttribute('points',poly.map(p=>p.x+','+p.y).join(' '));if(poly.length>=3)line.setAttribute('points',line.getAttribute('points')+' '+poly[0].x+','+poly[0].y);$('markers').prepend(line);}
}
function commit(d){$('draft-json').value=JSON.stringify(d,null,2);revision++;paint(d);}
const eyeSlot=key=>key==='eye-left-mask'?'screen-left':'screen-right';
function append(poly,p){if(poly.length>=32)throw new Error('Viền tối đa32 điểm.');poly.push(p);}
svg.addEventListener('pointerdown',event=>{try{
 const d=parsed(),matrix=svg.getScreenCTM();if(!matrix)throw new Error('Không đọc được tọa độ ảnh.');
 const q=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()),p={x:Math.round(q.x*100)/100,y:Math.round(q.y*100)/100};
 if(p.x<0||p.y<0||p.x>=initial.source.width||p.y>=initial.source.height)return;
 const key=$('landmark').value;
 if(['faceContour','seam','mouthContour','mouthEditMask'].includes(key)){d[key]??=[];append(d[key],p);}
 else if(key.startsWith('eye-')){d.eyeEditMasks??={};const side=eyeSlot(key);d.eyeEditMasks[side]??=[];append(d.eyeEditMasks[side],p);}
 else if(key==='protected-paint'){d.protectedContours??=[[]];d.protectedContours[0]??=[];append(d.protectedContours[0],p);}
 else if(['screen-left','screen-right'].includes(key)){d.eyes??={};d.eyes[key]={visible:true,center:p};}
 else d[key]=p;commit(d);report('Đã ghi điểm; bản đo chưa kiểm.');
 }catch(error){fail(error);}
});
$('clear-point').addEventListener('click',()=>{try{const d=parsed(),key=$('landmark').value;if(key.startsWith('eye-')){if(d.eyeEditMasks)delete d.eyeEditMasks[eyeSlot(key)];}else if(['screen-left','screen-right'].includes(key)){if(d.eyes)delete d.eyes[key];}else if(key==='protected-paint')delete d.protectedContours;else delete d[key];commit(d);report('Đã xóa mục; bản đo chưa kiểm.');}catch(error){fail(error);}});
$('set-occlusion').addEventListener('click',()=>{try{const d=parsed(),side=$('landmark').value;if(!['screen-left','screen-right'].includes(side))throw new Error('Chọn một mắt trước.');d.eyes??={};d.eyes[side]={visible:false,occludedBy:$('occlusion').value};if(d.eyeEditMasks)delete d.eyeEditMasks[side];commit(d);report('Đã ghi mắt bị che; bản đo chưa kiểm.');}catch(error){fail(error);}});
$('draft-json').addEventListener('input',()=>{revision++;try{paint(parsed());report('Đã chỉnh JSON; bản đo chưa kiểm.');}catch(error){$('markers').replaceChildren();fail(error);}});
async function checked(d){
 if(!sameSource(d.source))throw new Error('Bản đo khác nguồn đang mở.');
 const response=await fetch('/api/topics/prehistoric-life/head-cell-draft/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:initial.source,draft:d})});
 const result=await response.json();if(!response.ok)throw new Error(result.message??'Bản đo không hợp lệ.');
 if(!sameSource(result.draft?.source))throw new Error('Kết quả khác nguồn đang hiển thị.');return result;
}
$('check').addEventListener('click',async()=>{const ticket=++checkTicket,start=revision;try{report('Đang kiểm tra snapshot bản đo.');const r=await checked(parsed());if(ticket!==checkTicket)return;report((revision!==start?'Kết quả snapshot cũ; các chỉnh sửa mới được giữ.\n':'')+JSON.stringify(r,null,2));}catch(error){if(ticket===checkTicket)fail(error);}});
$('download').addEventListener('click',async()=>{const button=$('download');button.disabled=true;try{const r=await checked(parsed()),url=URL.createObjectURL(new Blob([JSON.stringify(r.draft,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=initial.source.file.replace('.png','-landmarks-draft.json');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);report('Đã tải snapshot được kiểm; còn '+r.pending.length+' mục. Chưa đăng ký hoặc duyệt rig.');}catch(error){fail(error);}finally{button.disabled=false;}});
$('import').addEventListener('change',async()=>{const ticket=++importTicket,start=revision;try{const file=$('import').files?.[0];if(!file)return;if(file.size>200*1024)throw new Error('JSON vượt200KB.');const r=await checked(JSON.parse(await file.text()));if(ticket!==importTicket||revision!==start)throw new Error('Đã chỉnh trong lúc nạp; giữ bản đang sửa. Hãy nạp lại nếu cần.');commit(r.draft);report(JSON.stringify(r,null,2));}catch(error){if(ticket===importTicket)fail(error);}finally{if(ticket===importTicket)$('import').value='';}});
commit(initial.draft);
})();`;
