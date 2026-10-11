# Chuẩn bị ảnh trong project

Phạm vi đã triển khai: ảnh gốc → chọn bề mặt xoay → preview → lưu/reopen. Người dùng đã chọn giữ hướng ảnh gốc, sau đó yêu cầu riêng chuyển động nhân vật; ellipse rotation chưa đáp ứng yêu cầu đó.

- [x] API PNG/JPG, giữ nguyên bytes/hash, preview orientation/size, tái sử dụng ảnh trùng nội dung, kiểm bounds/revision/integrity/busy.
- [x] Editor Canvas dùng cùng painter với demo; drag/điền số/tốc độ/hướng, play/seek, save/reload, cảnh báo mất thay đổi, responsive375/800/1280.
- [x] Nút Studio và script mở server riêng8858; import ảnh thật0002 và mở editor từ nút Studio bằng browser.
- [ ] Layer/mask/clean plate nhân vật; hành động phối hợp đầu/thân/tay.
- [ ] Gắn ảnh với shot và narration clock; voice/subtitle/export/resume/final QC.

API dưới `/api/projects/:name/image-motion`: GET catalog; POST `/images?revision=...` với multipart field `image`; PUT `/regions` với `{revision,imageId,regions}`; GET `/images/:id/original`, `/images/:id/preview`, `/editor`. Manifest chỉ chứa dữ liệu. Không cho model đưa JS tùy ý hoặc nới scene-security hiện có. Editor chưa thay đổi trạng thái/lock của video sản xuất.

Lệnh thật: `node --import tsx scripts/image-motion-editor.ts`. Báo cáo: `docs/validation/2026-10-11-image-motion-editor/REPORT.md`. Không dùng test V1 hay renderer rig cũ để nghiệm thu luồng này.
