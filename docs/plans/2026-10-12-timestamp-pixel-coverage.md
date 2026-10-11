# Giữ pixel nguồn ở mép tách

Triển khai theo tín hiệu đã tái hiện: global mask sinh từ polygon đã chứa coverage; nhân lại rồi phục hồi nền cứng làm mép source mất màu cả khi gần đứng yên. Bổ sung matteMode:source-pixels ở helper, default alpha giữ nguyên cho luồng mask ngoài cũ. Khi được chọn, pixel có coverage trong mask/polygon lấy RGBA gốc; vùng tĩnh cùng semantics. Cache riêng cho mode mới, không đổi key của mode cũ. Timestamp preparer v3 bật mode này; input definition vẫn v1, API/clock không đổi. Không gọi đây là xử lý nền bị che hoặc animation sinh pose.

TDD public prepareTimestampMotion→fixed Canvas, PNG đục, chuyển động gần0 không tạo pop ở biên; cache góc giữ lớp; legacy alpha/key invariants. Kiểm chứng ảnh0001 với viền hàm chính xác, không giữ mặt tĩnh để giấu lỗi. Giữ file cũ/cache/log; sửa source-boundary recipe sau khi nhìn chẩn đoán. Build/typecheck/test/render60fps đúng clock và báo MD phần chưa đạt.

Coder9router chỉ đề xuất edits helper; orchestrator review/apply, cập nhật preparer/test/recipe/report. Chưa ghép narration/video dài; mục tiêu chung còn active.

Đã thực hiện: red316 channel differences/max239 → green0 với PNG đục; default/explicit alpha cache cùng key, mode mới cache riêng; thay góc giữ layer. 32 test liên quan và build PASS. Nguồn thật contour gần0 có218 pixel lệch trước sửa →0 sau sửa. Polygon collar cũ giữ một phần hàm đã được bỏ; contour mới bao fringe3px. Một clean crop nền cổ từ imagegen được đăng ký bằng CLI mới; resize đúng tỷ lệ, normalize màu nền từ source bất biến, ngoài ROI không đổi. Test cache/corruption/opacity/aspect/bounds đã qua. Không tái sinh head/body/scene.

Clip thật1:1920×1080,60/1fps,346frames,clock0–5760ms,decode0/seek PNG exact; đầu71917 pixel RGBA gốc, thân/outside head ROI0 đổi; clip2/6/13 tái sử dụng MP4 nguyên hash. Đây là chẩn đoán chuyển động cục bộ, không phải diễn xuất/full final. Bàn giao báo cáo riêng trong docs/validation/2026-10-12-timestamp-pixel-coverage; không dùng TEST-RESULTS V1 làm nghiệm thu mới. Còn20 recipe, bánh1 có vật che, UI thao tác trọn luồng, ghép narration/gaps và mục tiêu đầy đủ.
