# Trạng thái bàn giao triển khai

Ngày triển khai: 2026-09-30. Yêu cầu nguồn: `BUILD-SPEC.md`.

## Mã đã triển khai

- CLI và pipeline đầy đủ từ ingest đến `DONE`, với checkpoint, PID reservation, SQLite, hash invalidation, bounded retry/repair và báo cáo chi phí.
- MD/SRT/WAV, faster-whisper/WhisperX bridge, narration clock, story/chapter/beat planner, storyboard JSON/Markdown và validators.
- Character bible, identity/version/pose approvals, series inheritance và mở khóa thủ công.
- Asset resolver ưu tiên local, provenance/license, hash continuity, SVG fallback và provider extension contracts.
- Tám recipe, sáu style, camera/transition, code generation/repair, GSAP cục bộ và giới hạn scene contract.
- HyperFrames upstream adapter, master composition, draft/final profiles, năm snapshot mỗi shot, contact sheets, rule/vision review.
- FFmpeg audio mix/duck/normalize, SFX, subtitle modes, thumbnail và QC.
- Studio tiếng Việt/Anh: dự án, upload, preview, timeline, shot/camera/asset/caption, editors, locks/approval, job/log/report/download.
- Example SRT 60 giây, approved SVG poses, JSON Schema library, model configuration và benchmark opt-in, gồm chế độ sinh scene bằng model.

Các engine/vendor tùy chọn được mô tả là later/optional trong đặc tả được giữ ở interface; V1 chạy HyperFrames. Dùng ảnh PNG/JPG để hiển thị trang PDF; PDF/văn bản được giữ làm tư liệu nguồn.

## Bằng chứng biên dịch

- `npm install --no-audit --no-fund`: thành công.
- `npm run schemas`: thành công; chỉ xuất schema, không chạy pipeline.
- `npm run build`: TypeScript backend/Studio và Vite production build thành công.
- Python `compile(...)` cho `scripts/asr.py`: thành công; không thực thi script ASR.

## Chưa xác nhận bằng runtime

Theo yêu cầu của chủ dự án, phiên triển khai không tạo/chạy test suite, không chạy production pipeline, render thử, model/API smoke test, ASR inference hoặc browser test. Chưa có bằng chứng video/audio đầu cuối, scene compile rate, vision accuracy, hiệu năng hay chất lượng mỹ thuật. Build thành công không thay thế các kiểm tra này.

Model được giao test cần tiếp tục từ `TEST-HANDOFF.md`, ghi commit được kiểm tra, command/exit code và media evidence. `IMPLEMENTATION-MAP.md` giúp tìm module theo từng mục của đặc tả.
