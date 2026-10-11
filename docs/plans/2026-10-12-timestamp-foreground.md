# Giữ vật che trước chuyển động ảnh

Tiếp tục mục tiêu tool ảnh có clock, không đổi phạm vi story/script/WAV/final của dự án. Mục tiêu chặng này: pixel khung xe/cổ áo đứng yên khi bộ phận phía sau chuyển động, màu/nét nguồn vẫn giữ. Không tuyên bố suy ra phần ảnh bị che hoặc nghiệm thu art bằng test fixture.

- Definition version1 thêm occlusions? [{id,polygon}] tối đa16; phần này là layer nguồn đứng yên nằm trên các chuyển động. IDs chung với rotations/parts, polygon finite/bounds/area. Definition cũ không bị thêm field mặc định khi parse.
- rotationSource? chỉ nhận clean-plate. PNG nền sạch cùng kích thước được chọn qua cơ chế hiện có. Nếu polygon vật che giao vùng quay, source texture phải là clean PNG; không xoay red/frame đã nằm trong source rồi chỉ đè layer để giấu lỗi. Thiếu texture báo needs-motion-source, không tạo final.
- prepare v2: moving alpha loại vùng giữ nguyên; static polygon dùng source RGB, remove:false, zero frames, cuối draw order. Clean plate chỉ sửa vùng xóa; nguyên cảnh giữ nguyên. Texture quay được copy riêng, kiểm tra hash/kích thước/PNG/độ đục trong ellipse. Scene/painter hiện có, không đổi HTML renderer của các clip cũ.
- Cache layer loại góc/pivot/tốc độ như trước, bind geometry/source/plate; preparer version2 tạo manifest mới. Backend không chọn lại folder v1 khi lưu v2; clip cảnh khác và ledger hợp lệ vẫn giữ.
- Editor thêm mode vật che và vùng chọn/polygon bằng bàn phím; trường quay sạch dùng PNG đã chọn, ghi rõ phần ảnh bị che cần texture sạch được duyệt. Vùng giữ nguyên hiện bằng nét khác màu nhưng không vào MP4. Không dùng confirm/beforeunload native.
- TDD fixture: giữ màu khung xe nguồn mọi frame, không kéo màu frame vào texture quay, excluded alpha ở cổ áo, seek deterministic, source unchanged, layer cache reused; legacy/stale/busy/corrupt invariants. Render chẩn đoán local từ source0001 để xem mép cổ, không gọi TTS/model trong renderer.

Phân công: coder9router chỉ đề xuất timestamp-prepare.ts theo schema và test; orchestrator thực hiện schema/UI/backend/gates, kiểm tra code trước apply. Model review không được thay nghiệm thu runtime/visual. Build/typecheck, MD/báo cáo, GitHub kèm % chức năng ước lượng; fullGoalComplete:false đến khi toàn luồng được chứng minh.

Trạng thái: schema/preparer/editor/API triển khai, 28 test liên quan và build/typecheck đạt; mapping API mới có 2 ca service kiểm tra lại. Clip0001 thật60fps346frame, vùng cổ áo0 pixel đổi, cache2/6/13 giữ nguyên qua upgrade/restart. Mép cổ còn đường nối, chưa nghiệm thu art. Bánh thực0001 chưa có clean texture. UI chọn vùng được xác minh, click/save/play/download còn chờ do browser thử cũ kẹt. Báo cáo: docs/validation/2026-10-12-timestamp-foreground/REPORT.md. Tiến độ chức năng ước lượng49%; fullGoalComplete:false.
