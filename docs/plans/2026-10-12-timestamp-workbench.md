# Bàn làm việc ảnh theo timestamp

Giữ mục tiêu đầy đủ trong durable state. Chặng này nối timeline đã kiểm, ảnh nguồn và các motion manifest vào UI + worker xuất clip; không mở final/voice hoặc nghiệm thu ảnh.

- API local độc lập, source export read-only, output dưới runtime/image-motion. Server dùng timeline importer + CLI hiện có làm authority; worker chỉ chạy command cố định, không nhận code/model/prompt. Mỗi server một render worker; lỗi có artifact/log, retry attempt mới; cache hit giữ MP4.
- Catalog trả {revision,fps,durationMs,gaps,clips:[{id,startMs,endMs,startFrame,endFrame,text,visual,imageUrl,hasMotion,clipUrl?,status}]}. GET /api/image-timestamp/catalog. POST /api/image-timestamp/render {revision,clipId}; POST /api/image-timestamp/render-ready {revision}; GET /api/image-timestamp/job/:id. API render chỉ chọn binding manifest do server cấu hình, không nhận path từ browser.
- Job {id,status:queued|running|done|failed,clipIds,completed,resultClips:[{id,url}],error?}. One active job; stale revision409. Manifest source/motion changed must not return old media.
- UI new packages/image-motion/timestamp-workbench.ts exports imageTimestampWorkbench():string. Source data rendered as textContent. 24 scenes, show exact ms/frame, image preview, choose clip, render current/ready subset, job progress, video preview/download. State needs-motion distinct; no label pretending24finished. 60fps; no inserted caption.
- Orchestrator owns server/worker/script and tests. Bounded9router coder proposes UI only; review before apply. Existing8858 server/projects and parked narration edits stay preserved. New isolated port8860.
- Actual0006 head+arm candidate: source cutout, small joint/prop-target motion, background repaired only selected region. Verify source hashes, changed-pixel extent, random seek, decode and frame timing; visual acceptance remains pending.

Checks: integration endpoints reject stale/busy/source mismatch; cached clip route never arbitraryfile; job resume/failed-retry doesn’t overwrite old clip; real60fps export through UI; responsive desktop/mobile and keyboard controls; build/focused tests; exact GitHub SHA and implementation progress per commit.

Still pending: remaining21motion recipes, all accepted actor gestures, full narration/voice/final/QC and all original criteria.
# Kết quả triển khai trong lượt này

- Đã có `image-timestamp` service và CLI Studio riêng 8860, HTML workbench từ coder đã sửa/review, danh mục 24 cảnh và clock 60fps.
- Đã chạy worker thật, xuất nhóm ba cảnh, dùng lại ba clip sau restart, phát/tải MP4 và kiểm tra stale/busy/missing-motion. 22 test liên quan + build + typecheck entry point mới pass.
- Đã thêm `--clean-plate` vào source-part CLI và recipe tay 0006. Matte/clean plate là artifact local, không phải AI tự tách mọi ảnh. Còn phải duyệt mép vai/bảng và chất lượng động tác.
- UI đọc timestamp gốc; chưa có editor đổi timestamp/gán recipe hay chuyển động cho 21 ảnh còn lại. Mục tiêu toàn bộ story/script/WAV → video có tiếng/final/QC còn đang mở.
- Bằng chứng: `docs/validation/2026-10-12-timestamp-workbench/REPORT.md`; không dùng kết quả V1 để xác nhận luồng mới.
