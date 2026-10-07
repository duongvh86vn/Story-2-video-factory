import type {ActorMotion} from '../../../packages/motion/schemas.js';
import type {SpriteMotionCatalogSnapshot} from '../../../packages/motion/catalog.js';
import type {MotionCapability,SpriteMotionCatalog} from '../../../packages/motion/catalog-schemas.js';
import {projectUrl} from './api.js';

const escape=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const capabilities:Array<{value:MotionCapability;vi:string;en:string}>=[
  {value:{kind:'hold'},vi:'Đứng / chờ',en:'Stand / wait'},
  {value:{kind:'locomotion'},vi:'Di chuyển (chưa phân loại)',en:'Locomotion (unspecified)'},
  {value:{kind:'locomotion',movement:'walk'},vi:'Đi bộ',en:'Walk'},
  {value:{kind:'locomotion',movement:'run'},vi:'Chạy',en:'Run'},
  {value:{kind:'locomotion',movement:'jump'},vi:'Nhảy',en:'Jump'},
  {value:{kind:'posture'},vi:'Đổi tư thế',en:'Change posture'},
  {value:{kind:'observation'},vi:'Quan sát',en:'Observe'},
  {value:{kind:'indication'},vi:'Chỉ đối tượng',en:'Indicate'},
  {value:{kind:'reaction'},vi:'Phản ứng',en:'React'},
  {value:{kind:'manipulation'},vi:'Thao tác (chưa phân loại)',en:'Manipulation (unspecified)'},
  {value:{kind:'manipulation',operation:'contact'},vi:'Chạm / vận hành',en:'Touch / operate'},
  {value:{kind:'manipulation',operation:'pick-place'},vi:'Nhặt / đặt',en:'Pick / place'},
  {value:{kind:'manipulation',operation:'carry'},vi:'Cầm / mang',en:'Hold / carry'},
  {value:{kind:'manipulation',operation:'drop'},vi:'Thả',en:'Drop'},
];
const key=(value:MotionCapability)=>JSON.stringify([value.kind,value.movement??null,value.operation??null]);
export function motionLibraryMarkup(name:string,snapshot:SpriteMotionCatalogSnapshot,motions:ActorMotion[],locale:'vi'|'en'):string{
  const v=(vi:string,en:string)=>locale==='vi'?vi:en;
  // These GETs can complete on opposite sides of an import/catalog update.
  // Never build a form that silently removes an entry the user cannot see.
  if(snapshot.document.entries.some(entry=>!motions.some(motion=>motion.id===entry.motionId&&motion.fingerprint===entry.fingerprint)))
    throw new Error(v('Thư viện đã đổi trong lúc mở; tải lại trước khi chỉnh sửa.','The library changed while opening; reload before editing.'));
  return `<form id="motion-library-form"><p class="eyebrow">${escape(name)}</p><h2 id="modal-title">${v('Thư viện chuyển động','Movement library')}</h2><p>${v('Xem từng chuyển động trước, rồi chọn khả năng để Director dùng trong câu chuyện. Bỏ hết lựa chọn để loại khỏi thư viện.','Preview each motion, then select its capabilities for story direction. Clear all selections to remove it from the library.')}</p><p class="muted">${v('Tất cả vẫn là ứng viên. Gắn nhãn không duyệt chất lượng hình/chuyển động và chưa mở xuất final. Đồng bộ miệng và một số tương tác còn đang triển khai.','All motions remain candidates. Labels do not approve art/motion quality or unlock final delivery. Mouth synchronization and some interactions are still being implemented.')}</p>${motions.length?'':`<p>${v('Chưa có chuyển động được nhập. Nhập atlas hoặc motion strip trước khi chọn cách diễn từ ảnh.','No imported motions yet. Import an atlas or motion strip before selecting image motion.')}</p>`}${motions.map((motion,index)=>{
    const entry=snapshot.document.entries.find(entry=>entry.motionId===motion.id&&entry.fingerprint===motion.fingerprint),selected=new Set(entry?.capabilities.map(key));
    const duration=motion.frames.reduce((sum,frame)=>sum+frame.durationMs,0)/1000;
    return `<fieldset class="voice-settings"><legend>${escape(motion.actorId)} · ${escape(motion.state)} · ${escape(motion.view)}</legend><label>${v('Tên chuyển động','Motion label')}<input name="motion-label-${index}" maxlength="200" value="${escape(entry?.label??`${motion.actorId} — ${motion.state} (${motion.view})`.slice(0,200))}"></label><p>${duration.toFixed(3)} s · ${motion.frames.length} ${v('frame','frames')} · ${escape(motion.playback.mode)} <a href="${projectUrl(name)}/motions/${encodeURIComponent(motion.id)}/${encodeURIComponent(motion.fingerprint)}/preview" target="_blank" rel="noopener">${v('Xem chuyển động','Preview motion')}</a></p><div class="upload-grid">${capabilities.map((capability,n)=>`<label class="check"><input type="checkbox" name="motion-capability-${index}" value="${n}" ${selected.has(key(capability.value))?'checked':''}>${escape(capability[locale])}</label>`).join('')}</div><details><summary>${v('Thông tin phiên bản','Version details')}</summary><code>${escape(motion.id)} / ${escape(motion.fingerprint)}</code></details></fieldset>`;
  }).join('')}<footer><button type="button" data-action="close-modal">${v('Hủy','Cancel')}</button><button type="submit" class="primary">${v('Lưu thư viện','Save library')}</button></footer></form>`;
}
export function motionLibraryDocument(form:HTMLFormElement,motions:ActorMotion[]):SpriteMotionCatalog{
  const data=new FormData(form);
  return {version:'actor-motion-catalog-1',entries:motions.flatMap((motion,index)=>{
    const selected=data.getAll(`motion-capability-${index}`).map(value=>{
      const choice=capabilities[Number(value)];if(!choice)throw new Error('Invalid movement capability');return {...choice.value};
    });
    return selected.length?[{motionId:motion.id,fingerprint:motion.fingerprint,label:String(data.get(`motion-label-${index}`)??''),capabilities:selected}]:[];
  })};
}
