import type {SourceProductionAuditDocument} from '../../server/contracts.js';

const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

/** Presentation only: no provider, source repair, approval or publication. */
export function sourceAuditMarkup(report:SourceProductionAuditDocument,locale:'vi'|'en'):string{
  const text=(vi:string,en:string)=>locale==='vi'?vi:en,issues=report.checks.filter(c=>c.status!=='passed');
  const status=(value:string)=>value==='failed'?text('Chưa đạt','Failed'):text('Chưa kiểm tra được','Unavailable');
  return `<section><h2 id="modal-title">${text('Kiểm tra cảnh','Scene checks')}</h2>
    <p>${report.sourceChecksPassed?text('Các quy tắc cảnh đã đạt. Video vẫn cần kiểm tra hình ảnh, chuyển động và âm thanh.', 'Scene rules passed. The video still needs visual, motion and audio review.'):text('Còn lỗi cần xử lý trước khi dựng video.', 'Issues remain before video production.')}</p>
    <p>${escape(report.checks.filter(c=>c.status==='passed').length)} / ${escape(report.checks.length)} ${text('mục kiểm tra đạt','checks passed')}. ${text('Xuất bản chưa được duyệt.','Publication is not approved.')}</p>
    ${issues.length?`<table><thead><tr><th>${text('Cảnh / Diễn viên','Scene / Actor')}</th><th>${text('Trạng thái','Status')}</th><th>${text('Cần xử lý','Issue')}</th></tr></thead><tbody>${issues.map(c=>`<tr><td>${escape([c.shotId,c.actorId].filter(Boolean).join(' / ')||text('Toàn câu chuyện','Whole story'))}</td><td>${escape(status(c.status))}</td><td>${escape(c.message||c.id)}</td></tr>`).join('')}</tbody></table>`:''}
    <p>${text('Cần model test nghiệm thu: diễn xuất và góc quay thực tế; nét vẽ và màu sắc theo mẫu; đồng bộ lời kể; cả ba đầu vào; tiếp tục và dựng lại; video cuối cùng và QC.', 'Test-model acceptance remains: actual acting and cameras; reference artwork and colors; narration synchronization; all three inputs; resume and rebuild; final video and QC.')}</p>
    <details><summary>${text('Dữ liệu cho model test','Data for the test model')}</summary><pre>${escape(JSON.stringify(report,null,2))}</pre></details>
    <footer><button type="button" data-action="close-modal">${text('Đóng','Close')}</button></footer></section>`;
}
