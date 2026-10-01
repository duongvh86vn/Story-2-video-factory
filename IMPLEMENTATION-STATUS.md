# Trạng thái triển khai và định hướng sản phẩm

Cập nhật tài liệu: **2026-10-01**. Đặc tả hiện hành: [BUILD-SPEC.md](BUILD-SPEC.md), V2 — robot mini/người que dẫn chuyện giải thích từ WAV/SRT.

## Đã hoàn thành trong lần chỉnh yêu cầu này

- Viết lại đặc tả theo video giải thích sự vật, sự việc, cơ chế, quy trình và tiến trình phát triển.
- Tạo hồ sơ Markdown cho [robot mini](library/characters/MINI-ROBOT.md) và [người que](library/characters/STICK-MAN.md), gồm nhận dạng, part IDs, khớp, pose/actions, gaze/pointer, speech sync và điều kiện duyệt.
- Chốt WAV/SRT là nguồn chính, source MD bổ trợ tùy chọn, host tách khỏi đối tượng được kể.
- Chốt final SRT-only cần voice; silent draft không đại diện cho sản phẩm cuối đạt yêu cầu.
- Định nghĩa recipe host, interaction/visualization plan, review/QC và acceptance cho hơi nước/ô tô.
- Lưu [đặc tả V1](docs/archive/STORY-TO-VIDEO-FACTORY.v1.md) và cập nhật bản đồ/bàn giao để tránh nhầm trạng thái.

Đây là thay đổi tài liệu. Chưa thay code/prompt runtime, chưa dựng SVG rig từ hai hồ sơ mới và chưa chạy test cho V2 trong lần này.

## Nền tảng V1 đã có

CLI/Studio/API; ingest MD/SRT/WAV và ASR bridge; planner/storyboard/character bible; asset resolver; tám recipe tổng quát; HyperFrames/GSAP; preview/contact sheets/review; FFmpeg audio/caption/QC; checkpoint/SQLite/resume/locks/hash; model adapter/retry/budget và log redaction.

Các lỗi recovery, Windows path, preview integrity và upload filename đã được sửa trong vòng trước. `TEST-RESULTS.md` ghi 35 test hồi quy, WAV tiny tiếng Anh và tracer HyperFrames 4 giây trên mã V1. Các kết quả này không chứng minh host-driven explainer V2 đã được triển khai.

## Những khoảng cách cần xử lý cho V2

| Hạng mục | Hiện trạng |
|---|---|
| Nhận WAV/SRT không cần source MD | Ingest hiện còn yêu cầu `source.md`; cần sửa |
| Đọc host MD thành rig điều khiển được | Hai hồ sơ đã có; compiler/controller và SVG rig chưa có |
| Host riêng, không trộn với nhân vật/sự vật trong narration | Character pipeline V1 còn tổng quát; cần schema và role separation |
| Explanation goals, model part IDs, anchors, host interactions | Chưa có contract đầy đủ trong storyboard/scene schema |
| Recipe có host giải thích, chỉ/thao tác/so sánh | Tám recipe V1 chưa đáp ứng yêu cầu này |
| SRT-only final có giọng | Runtime hiện tạo silent bed, chưa có TTS/needs-voice gate V2 |
| Speech activity/gaze/gesture/contact sync | Chưa triển khai cho host rig |
| Studio chọn/duyệt host và trạng thái voice | Chưa có luồng V2 |
| Review nội dung giải thích và target interactions | Guard/hash/timing V1 có thể reuse; semantic/temporal checks V2 cần bổ sung |
| Nghiệm thu hơi nước/ô tô, hai host, nhiều tập | Chưa chạy, giao cho tester sau khi triển khai |

Kế hoạch sửa theo P0–P5 trong §16 của `BUILD-SPEC.md`. Bản đồ module và phạm vi tái sử dụng xem `IMPLEMENTATION-MAP.md`.
