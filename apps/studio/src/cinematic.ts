import type { Shot } from '../../../packages/core/schemas.js';
import {rigHand} from '../../../packages/core/identifiers.js';
import {cinematicActionGroups} from '../../../packages/director/actions.js';

const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]!);
const point = (p: { x: number; y: number }) => `${p.x.toFixed(1)}, ${p.y.toFixed(1)}`;
const seconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`;
export function cinematicReview(input: { shot: Shot; narration: string; locale: 'vi' | 'en'; preview: { composition: string | null; frames: string | null }; clip: 'draft' | 'final' | null; missingAssets: string[] }): string {
  const { shot, narration, locale, preview, clip, missingAssets } = input, c = shot.cinematic!;
  const label = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const parts = shot.visualization?.parts ?? [];
  const art=c.artDirection,origin=art?.origin??'offline';
  const originLabel=origin==='model'?label('Model thiết kế','Model directed'):origin==='authored'?label('Thiết kế riêng','Authored'):label('Bản dựng quy tắc ngoại tuyến','Offline rule seed');
  const design=`<section aria-label="${label('Thiết kế cảnh','Art direction')}"><h3>${label('Thiết kế cảnh','Art direction')}</h3><p>${escape(originLabel)}</p>${art?`<p>${escape(art.brief)}</p><p>${art.layers.length} ${label('lớp hình','art layers')} · ${art.models.length} ${label('hình mô hình riêng','custom model glyphs')}</p><p>${label('Bảng màu','Palette')}: ${Object.values(art.palette).map(escape).join(' · ')}</p>`:''}<p class="muted">${label('Đánh giá chất lượng bằng clip production; kiểm tra kỹ thuật không thay cho duyệt hình ảnh.','Judge quality from the production clip; technical checks do not replace visual review.')}</p></section>`;
  const poseLabel=(pose:string)=>({stand:label('Đứng','Standing'),crouch:label('Cúi thấp','Crouching'),lean:label('Nghiêng người','Leaning'),seated:label('Ngồi','Seated')}[pose]??pose);
  const performers=[...(c.actorScene?.primary===null?[]:[{name:c.actorScene?.primary?.name??c.leadCharacterId,p:c.performance,actions:shot.host?.actions??[]}]),...(c.actorScene?.supporting??[]).map(a=>({name:a.character.name,p:a.performance,actions:a.actions}))];
  const body=performers.filter(a=>a.p.entryPosture||a.p.postures?.length||a.p.supports?.length).map(a=>`<p>${escape(a.name)} · ${label('Tư thế','Body posture')}: ${escape(poseLabel(a.p.entryPosture?.pose??'stand'))}${(a.p.postures??[]).map(p=>` → ${escape(poseLabel(p.pose))} (${seconds(p.startMs)}–${seconds(p.endMs)})`).join('')}${a.p.supports?.length?` · ${label('Ghế có điểm tựa','Supported seats')}: ${a.p.supports.length}`:''}</p>`).join('');
  const actions = performers.flatMap(actor=>cinematicActionGroups(actor.actions,actor.p,shot.startMs).flatMap(group=>group.gestures.map(g => {
    const a=group.action,source=group.sourceManipulation;
    const id=a.secondTarget&&group.gestures.indexOf(g)===1?a.secondTarget.partId:a.target?.partId;
    const target=parts.find(p=>p.id===id)?.label??label('Người xem','Viewer');
    const hand=rigHand(g)==='left'?label('Tay phía trái','Left rig hand'):label('Tay phía phải','Right rig hand');
    const start=source?.startMs??g.startMs,end=source?.endMs??g.endMs,contact=source?.contactMs??g.contactMs;
    return `<li>${escape(actor.name)} · ${escape(hand)} · ${escape(g.action)} → ${escape(target)} · ${seconds(start)}–${seconds(end)}${contact===undefined?'':` · ${label('tiếp xúc','contact')} ${seconds(contact)}`}${source?` · ${label('hành động xuyên cảnh, đoạn đang xem','original action, visible slice')} ${seconds(a.startMs-shot.startMs)}–${seconds(a.endMs-shot.startMs)}`:''}</li>`;
  }))).join('');
  return `<div class="cinematic-review">
    ${design}${body}
    <section aria-label="${label('Lời kể','Narration')}"><h3>${label('Lời kể','Narration')}</h3><p>${escape(narration)}</p><details><summary>${label('Nguồn','Sources')}</summary><ul>${c.sourceRefs.map(ref => `<li>${escape(ref.kind)} · ${escape(ref.segmentId ?? '')}<p>${escape(ref.quote)}</p></li>`).join('')}</ul></details></section>
    <section aria-label="${label('Dàn cảnh và diễn xuất','Staging and performance')}"><h3>${label('Dàn cảnh và diễn xuất','Staging and performance')}</h3><p>${escape(c.motivation)}</p><p>${label('Bối cảnh','Setting')}: ${escape(c.setting)} · ${label('Minh họa','Illustration')}</p><p>${label('Tâm trạng','Mood')}: ${c.performance.expressions.map(e => `${escape(e.mood)} (${seconds(e.startMs)}–${seconds(e.endMs)})`).join(' → ')}</p><ul>${actions}</ul>${c.performance.walks.map(w => `<p>${label('Đi bộ','Walk')}: ${w.fromX.toFixed(1)} → ${w.toX.toFixed(1)} · ${seconds(w.startMs)}–${seconds(w.endMs)}</p>`).join('')}<p>Camera: ${escape(c.camera.framing)} · ${escape(c.camera.movement)} · ${c.camera.startScale} → ${c.camera.endScale}</p><p>${label('Liên tục','Continuity')}: (${point(c.continuity.entry)}) → (${point(c.continuity.exit)}) · ${escape(c.continuity.facing)}</p>${missingAssets.length ? `<p class="job-error">${label('Asset chưa được giải quyết','Unresolved assets')}: ${missingAssets.map(escape).join(', ')}</p>` : ''}</section>
    <section aria-label="Preview clip"><h3>Preview clip</h3>${preview.frames ? `<a href="${escape(preview.frames)}" target="_blank" rel="noopener"><img class="cinematic-frames" src="${escape(preview.frames)}" alt="${label('Các frame production của shot','Production frames for this shot')}"></a>` : ''}${preview.composition ? `<button type="button" data-action="preview-shot">${label('Xem cảnh production','View production scene')}</button>` : `<p>${label('Dựng scene để xem preview production.','Build scenes to preview production.')}</p>`}${clip ? `<button type="button" data-action="preview-clip" data-mode="${clip}">${label('Xem clip đã render','View rendered clip')}</button>` : ''}<p class="muted">${label('Dùng khung preview và clock lời kể ở trên.','Uses the preview panel and narration clock above.')}</p><details><summary>${label('Mô hình và nguồn (chỉ đọc)','Models and sources (read-only)')}</summary><ul>${c.models.map(m => `<li>${escape(parts.find(p => p.id === m.partId)?.label ?? m.partId)} · ${escape(m.variant)}<p>${m.sourceRefs.map(r => escape(r.quote)).join(' · ')}</p></li>`).join('')}</ul></details></section>
  </div>`;
}
