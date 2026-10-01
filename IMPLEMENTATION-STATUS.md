# Trạng thái V2.1 — 2026-10-01

Đã triển khai code và tài liệu cho kế hoạch ba luồng. Backend/CLI/Studio build và typecheck qua; schema JSON đã bổ sung. Runtime tests, giọng thật, ASR/alignment, render và nghiệm thu video **chưa chạy trong lượt này**, theo chỉ đạo giao cho model khác.

| Hạng mục | Code | Nghiệm thu runtime |
|---|---|---|
| Script paste/upload/normalize/120-char cues/source lines | Đã bổ sung | Chờ |
| TTS actual durations/250-ms paragraph pauses/cache | Đã bổ sung | Chờ TTS thật |
| WAV/SRT/WAV+SRT, explicit selected authority | Đã tích hợp nền V1 và mode mới | Chờ hồi quy ba luồng |
| Windows/HTTP/command voice; SRT fit/gate | Đã bổ sung | Chờ tiếng Việt/provider/failure cases |
| Robot/stick SVG rigs/MD/hash/poses/preview/approval | Đã bổ sung | Chờ xem identity và khớp |
| Tám recipe, explanation source refs/parts/relations | Đã bổ sung | Chờ hai bài và semantic review |
| Target/gaze/IK/contact/audio-activity mouth | Đã bổ sung | Chờ animation/seek/contact thực tế |
| Pipeline automatic, reports/exports/QC gates | Đã nối | Chờ final thật |
| Studio/API/CLI/settings/upload/editor | Đã bổ sung | Chờ thao tác UI và API |
| Resume/caches/locks/selected-shot rebuild | Đã nối | Chờ mất artifact và edit matrix |

Giới hạn cần được nghiệm thu minh bạch:

- HTTP/command là adapter protocol chung; phải cấu hình provider thật. Windows kiểm tra culture; adapter ngoài nhận language nhưng cần nghe/xác nhận chất lượng/ngôn ngữ thực tế.
- Chỉ có hai rig vector và vocabulary diagram hữu hạn; custom MD không tạo tùy ý mọi nhân vật/3D. Hướng trái/phải trong preview là sơ đồ 2D.
- Mouth đo RMS/audio activity; không có phoneme/viseme alignment. Short silence RMS threshold cần được kiểm tra trên audio thật.
- Rule review kiểm tra contract/geometry/hash; không chứng minh tính đúng vật lý, mức dễ hiểu, crop hoặc thẩm mỹ. Planner/vision thật và xem/nghe final là evidence nghiệm thu.
- Camera có tập giá trị hỗ trợ rõ; inset chưa hỗ trợ, bị từ chối. Scene source V2.1 do renderer sinh; edit storyboard và rebuild để bảo toàn guarantees.
- Môi trường đã biết chưa có WhisperX/giọng TTS Việt/API model được xác nhận. Không tự coi cài thư viện/encode/build là chất lượng video đạt.

TEST-RESULTS.md giữ nguyên lịch sử V1 và ghi riêng kiểm tra biên dịch V2.1. Chỉ cập nhật cột nghiệm thu khi model test giao evidence mới. Định nghĩa DONE của project được nêu trong BUILD-SPEC.md; không dùng checkpoint này để tự tuyên bố sản phẩm mới đã được nghiệm thu.
