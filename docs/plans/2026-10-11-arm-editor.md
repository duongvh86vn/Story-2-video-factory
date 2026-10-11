# Editor thay tay trong project ảnh

Luồng đầy đủ vẫn là nội dung/kịch bản/WAV → narration/cảnh → video. Milestone này đưa primitive tay đã có vào công cụ thao tác trên ảnh bất kỳ; không thay mục tiêu bằng demo một nhân vật.

Chọn page riêng `/api/projects/:name/image-motion/arms/editor`, liên kết từ editor vùng xoay. Phương án thêm toàn bộ form tay vào panel ellipse bị loại vì trộn hai mô hình thao tác. API lưu definition, tạo source layers và trả demo dữ liệu; không nhận mã SVG/JS từ model.

## Contract UI/API

GET `/api/projects/:name/image-motion`: catalog hiện có; mỗi image thêm tùy chọn `armMotion:{definition,key}`.

Definition:
```json
{"backgroundMode":"paper","arms":[{"id":"arm-1","erasePolygon":[[10,10],[30,10],[30,80],[10,80]],"shoulder":{"x":20,"y":15},"elbow":{"x":20,"y":40},"wrist":{"x":20,"y":70},"width":10,"handWidth":28,"handHeight":38,"upperAngle":-60,"foreAngle":15,"occlusionPolygons":[]}]}
```

`backgroundMode` là `paper` hoặc `clean-plate`; mode sau yêu cầu `cleanPlateImageId` thuộc cùng catalog, khác ảnh nguồn và cùng width/height preview. Tải ảnh nền sạch bằng upload ảnh hiện có. `arms` tối đa4; polygon3–128 points; mỗi arm tối đa2 occlusion polygons. Góc từ-130 đến130. Tọa độ thuộc preview; mọi số hữu hạn và nằm trong bounds. Arm id riêng không phải left/right giải phẫu, tránh gọi nhầm tay.

PUT `/arms` body `{revision,imageId,definition}`: kiểm stale/busy/source/background/geometry, chuẩn bị/cache, rồi mới lưu catalog. `arms:[]` gỡ cấu hình tay. Trả catalog mới với `productionReady:false`.

GET `/arms/:imageId/scene`: trả `{demo,assets,productionReady:false}`. `demo` giữ đường dẫn `assets/<filename>.png`; `assets` map đường dẫn đó sang URL cùng origin `/arms/:imageId/assets/:key/:filename`. UI preload image Map rồi gọi painter có sẵn. GET asset kiểm key hiện hành, source và hash asset; không đọc đường dẫn tùy ý.

Recipe luôn6 giây60fps, không tự nối narration. Source PNG/JPG byte gốc vẫn trong catalog; source preparation dùng preview PNG đã normalize và matte alpha opaque chỉ để giữ phần tĩnh do người dùng khoanh, không gọi đó là semantic segmentation. Clean plate chỉ thay vùng xóa, giữ RGB ngoài vùng.

## UI direction / frozen verification

Người làm video dùng ảnh gốc làm trung tâm. Giữ hệ thống editor hiện có: page#f3f4f6, white panels, ink#1f2937 (13.34:1 trên page), muted#374151 (10.31:1 trên white), blue#1d4ed8 (6.70:1 trên white), border#6b7280 (4.83:1). Arial16/1.5, h1 24/1.2; spacing8/16/24, panel radius8. Không trang trí hoặc autoplay.

Desktop1280: canvas ở cột chính, panel340px bên phải; mobile375 và intermediate800: canvas trước, form xếp bên dưới, gutter16px và controls trong max-width100%. Signature là ảnh thật với polygon và ba điểm có nhãn vai/khuỷu/cổ tay; bỏ nó thì mất thao tác quan trọng. Không dùng hero/card metrics giả. Bối cảnh đối chiếu: editor bánh răng cần ellipse nhưng không cần điểm khớp; editor tay cần điểm khớp và vùng xóa. Giữ form ellipse riêng.

Tác vụ: upload/chọn ảnh; thêm/bỏ tay; click hoặc điền textarea polygon; chọn vai/khuỷu/cổ tay bằng click và fields số; tùy chọn occlusion polygon; chọn paper/clean plate; width/hand/góc; chuẩn bị và lưu; xem gốc/xem tay mới/play/seek; reload. Tất cả controls có label, focus3px, trạng thái loading/busy/error/empty, dirty discard warning. Khi save đang chạy, chặn mọi chỉnh/switch/upload; ảnh load/scene generation không đè source chọn sau. Reduced motion bắt đầu dừng.

Checklist đóng trước render: upload/save/reopen; old pixels cleared/source bytes unchanged; hierarchy/seek pixels; stale/busy/bounds/missing background/tampered asset rejection; original/new comparison; keyboard numeric fallback; readable375/800/1280, nooverflow; paused reduced-motion; actual Lila source preview; screenshot không thay nghiệm thu mỹ thuật.

- [x] Backend schema, clean plate prep, save/read/assets/hash/revision.
- [x] Editor riêng và entry từ ellipse editor.
- [x] Focused API/browser tests và ảnh nguồn thật; bản Lila sửa lại vai/vùng xóa và xuất clip im lặng6 giây.
- [x] Build và ghi kết quả typecheck. Typecheck tổng còn hai lỗi TS18048 ở test gait cũ ngoài slice; không báo toàn suite PASS.
- [x] Docs/evidence và mốc bàn giao; kết quả push/commit được xác nhận riêng khi bàn giao. Tiến độ phạm vi triển khai ước lượng45%, không phải điểm mỹ thuật/nghiệm thu.

Evidence: `../validation/2026-10-11-arm-editor/REPORT.md`. Mẫu thử ban đầu lộ mép xóa sát tóc và cắt tay ở cạnh ảnh; sửa polygon, điểm gắn vai và góc thành bản Lila03. Nét mặt giữ từ ảnh nguồn; mỹ thuật vai/tóc/bàn tay vẫn chờ người dùng đánh giá.

Chưa thuộc milestone: tự phân đoạn semantic từ ảnh, diễn xuất toàn thân/góc mặt mới, dùng ảnh/layer trong shot-narration-final/resume của toàn pipeline. Các phần này vẫn còn trong mục tiêu tổng.
