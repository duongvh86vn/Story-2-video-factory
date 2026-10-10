import {bodyCandidateRegistrations,BODY_CANDIDATE_VIEWS,BODY_VIEW_REGISTRATION_VERSION} from '../animation/body-view-art.js';
import {referenceImageUrl} from '../animation/forest-head-art.js';
import {referenceBodyDescription} from '../animation/forest-body-art.js';
import {forestHandRegistration,forestHandDescription} from '../animation/forest-hand.js';
/** Static authoring overlay, in original output pixel coordinates. Rendering
 * vector masks never rewrites the source/generated PNG. */
export function viewRegistrationWorkbench(){
  const handCards=(['lila','karo'] as const).map(actor=>{
    const source=referenceBodyDescription().sources[actor],url=referenceImageUrl(source.file,source.sha256);
    const hands=(['left','right'] as const).map(side=>{
      const c=forestHandRegistration[actor][side],x=Math.min(c.wrist.x,c.grip.x)-43,y=c.wrist.y-20;
      return `<figure><h3>rig-${side}</h3><svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} 86 105"><image width="${source.width}" height="${source.height}" href="${url}"/><path d="${c.clip}" fill="none" stroke="#666" stroke-width=".6"/><path d="M${c.wrist.x} ${c.wrist.y}L${c.grip.x} ${c.grip.y}" stroke="#267cb8" stroke-width="1"/><circle cx="${c.wrist.x}" cy="${c.wrist.y}" r="2" fill="#df3429"/><circle cx="${c.grip.x}" cy="${c.grip.y}" r="2" fill="#267cb8"/></svg><figcaption>Cuff đỏ (${c.wrist.x},${c.wrist.y}); palm/grip xanh (${c.grip.x},${c.grip.y}). Tọa độ canvas SVG nguồn; PNG bất biến.</figcaption></figure>`;
    }).join('');
    return `<section class="hands"><h2>${actor} — ${forestHandDescription.version}</h2><div class="pair">${hands}</div></section>`;
  }).join('');
  const cards=(['lila','karo'] as const).flatMap(actor=>BODY_CANDIDATE_VIEWS.map(view=>{
    const c=bodyCandidateRegistrations[actor][view],url=referenceImageUrl(c.file,c.sha256),clothId='cloth-'+actor+'-'+view;
    const points=[['neck',c.neck],['belt/pelvis',c.pelvis],...Object.entries(c.shoulders).map(([side,p])=>['shoulder-'+side,p] as const),...Object.entries(c.hips).map(([side,p])=>['hip-'+side,p] as const)] as const;
    const dots=points.map(([name,p])=>`<circle cx="${p.x}" cy="${p.y}" r="9" fill="#d63734"/><text x="${p.x+12}" y="${p.y}" font-size="23" fill="#920916">${name} (${p.x},${p.y})</text>`).join('');
    const grid=Array.from({length:Math.ceil(c.height/100)},(_,i)=>`<path d="M0 ${i*100}H${c.width}"/><text x="2" y="${i*100+25}" font-size="23">${i*100}</text>`).join('')+Array.from({length:Math.ceil(c.width/100)},(_,i)=>`<path d="M${i*100} 0V${c.height}"/>`).join('');
    const svg=(content:string)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.width} ${c.height}">${content}</svg>`;
    const image=`<image width="${c.width}" height="${c.height}" href="${url}"/>`;
    return `<section><h2>${actor} — ${view}</h2><div class="pair"><figure>${svg(image+`<g stroke="#929292" stroke-width="1" opacity=".4">${grid}</g><path d="${c.clothing}" stroke="#cc2244" stroke-width="5" fill="none"/><path d="${c.headClip}" stroke="#235bcc" stroke-width="4" fill="none"/>`+dots)}<figcaption>Ảnh bất biến + landmark/mask kỹ thuật, chưa duyệt. ${c.view==='front'?'Front: hai tay đồng phẳng; tọa độ/mask tác giả dựng, chưa đo/duyệt.':`Tay gần: rig-${c.nearHand}; tay xa: rig-${c.farHand}.`}</figcaption></figure><figure>${svg(`<defs><mask id="${clothId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${c.width}" height="${c.height}"><path d="${c.clothing}" fill="white" stroke="white" stroke-width="${c.inkPad*2}" stroke-linejoin="round"/></mask></defs><g mask="url(#${clothId})">${image}</g>`)}<figcaption>Chỉ mask áo/da cổ. Phải giữ đường viền, không giữ tay/đầu nguồn.</figcaption></figure></div></section>`;
  })).join('');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Đăng ký view — Lila/Karo</title><style>body{font:16px system-ui;background:#ece5d6;color:#362215;margin:24px}main{max-width:1200px;margin:auto}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{background:#fff7e5;margin:0;padding:16px}svg{width:100%;height:800px}.hands svg{height:300px}a{color:#65461b}</style><main><h1>Registration ${BODY_VIEW_REGISTRATION_VERSION}</h1><p>Landmark/mask tác giả dựng trên canvas output thật; front là xấp xỉ thủ công, chưa đo anatomy/yaw. Mọi view còn chờ identity, mask, pose và motion. Không lật artwork để đổi hướng. Wrist migration đo trên nguồn, không theo target; phải rebuild cache và giao regression cho model test.</p>${handCards}${cards}<p><a href="/api/topics/prehistoric-life/body?action=rest&amp;view=three-quarter-left&amp;timeMs=0&amp;mood=happy">Ứng viên góc trái im lặng</a> · <a href="/api/topics/prehistoric-life/body?action=spear-lunge&amp;view=three-quarter-right&amp;timeMs=1800&amp;mood=happy">Ứng viên lunge phải qua evaluator chung</a> · <a href="/api/topics/prehistoric-life/view-art">Gallery view</a></p></main></html>`;
}
