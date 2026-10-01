# Trạng thái triển khai và khoảng cách tới V2.2

2026-10-01. **Đợt hiện tại hoàn thành việc viết lại đặc tả/kịch bản hình ảnh; chưa triển khai hệ diễn xuất V2.2.** Code đã bàn giao ở nền V2.1, commit `df3a0fe`; working tree còn sửa runtime/thử nghiệm local từ đợt trước. Commit tài liệu mới không có nghĩa các sửa đó đã được bàn giao.

## Code hiện có V2.1

| Hạng mục | Mức hiện có | Giới hạn |
|---|---|---|
| Input | Script paste/upload/normalize, WAV/SRT/selected authority | Chưa đủ matrix runtime ba luồng |
| Voice/clock | TTS measured clock/250-ms paragraph pause/cache; Windows/HTTP/command, SRT fit/gate | Cần provider thật và đầy đủ failure/mismatch cases |
| Host | Hai rig SVG/hash/pose/preview/approval | Rig cơ bản, đổi pose/point; chưa có diễn xuất V2.2 |
| Giải thích | Source refs/relations và tám recipe | Chủ yếu schematic và vocabulary hữu hạn |
| Interaction | IK tay/target/contact, gaze, mouth RMS | Chưa có gait/foot plant, face layers, props/track blend đầy đủ |
| Product | Studio/API/CLI, pipeline, caches/resume/locks/rebuild/exports | Cần nghiệm thu UI/edit matrix và bài hoàn chỉnh |
| Render/review | HyperFrames/GSAP/FFmpeg, snapshots/rule/vision contracts và QC | Năm ảnh/shot và rule geometry không chứng minh diễn xuất mượt |

Build/typecheck đã qua ở lần bàn giao V2.1. Không suy từ biên dịch rằng narration tiếng Việt, ASR, semantic review hoặc animation đã đạt.

## Thử nghiệm local V2.1 từ đợt trước

Các evidence sau ở **working tree**, không phải bộ nghiệm thu hoàn chỉnh trên một release đã chốt:

| Evidence | Kết quả | Giới hạn |
|---|---|---|
| temp/acceptance-v21/unit-legacy-adapted.log | 35/35 tests qua sau chỉnh fixture legacy | Hồi quy nền V1; không chứng minh ba luồng/style mới |
| temp/acceptance-v21/explainer-tests.log | 10/10 ca bổ sung qua | Audio fixture gồm tone; không thay nghe giọng/ASR/video thật |
| Piper tiếng Việt local | Đã tạo giọng từ vi_VN-vais1000-medium qua command adapter | Runtime/model local; không mặc định có trên mọi máy |
| temp/acceptance-v21/smoke/output/final.mp4 | Clip script ngắn có giọng, H.264/AAC, 30fps, technical QC qua sau sửa | Khoảng 2.8 giây; chưa đạt hướng diễn xuất người que mới |
| temp/acceptance-v21/steam/work/qc-report.json | Bài hơi nước ~37.13 giây có audio; QC fail | frozen-frames 4600–9400 ms; chưa nghiệm thu bài đầy đủ |

WhisperX/Piper và một số kiểm tra alignment đã được chuẩn bị local; chưa đủ evidence WAV/WAV+SRT mismatch, SRT thật, Studio/resume và hai nhân vật/hai bài. Không đổi failure thành PASS chỉ vì nghi detector báo dư. Log/media local được ignore; không đưa runtime/models hoặc dữ liệu project riêng lên GitHub.

## Mục tiêu V2.2 theo hai video tham khảo

| Hạng mục mới | Trạng thái |
|---|---|
| Nhân vật chính sống trong bối cảnh và dẫn xuyên câu chuyện | Đã viết đặc tả; chưa triển khai director |
| Rig pelvis/chest/head, face/mày/mí/miệng, locomotion/foot plant | Chưa triển khai |
| Multi-track blending/ownership/IK/prop attachment, deterministic seek | Chưa triển khai |
| Story/stage/performance/camera plans và schema | Đã mô tả contract dự kiến; chưa có module/artifacts chạy |
| Layered stage/props/occlusion và cinematic renderer | Chưa triển khai; có nền xưởng concept draft |
| Preview diễn xuất 30fps và hai storyboard mẫu | Storyboard đã soạn; chưa có preview mới |
| Studio clip review/cache/resume/report mới | Chưa triển khai |
| Robot và người que trên ba luồng/hai bài | Chưa nghiệm thu V2.2 |

Kế hoạch từng bước ở [V2-IMPLEMENTATION-PLAN.md](V2-IMPLEMENTATION-PLAN.md); đặc tả diễn xuất ở [STICKMAN-STORY-DIRECTION.md](STICKMAN-STORY-DIRECTION.md). Không có runtime hoặc video V2.2 mới được tạo trong lượt lập kịch bản này.

## Giới hạn cần ghi đúng khi bàn giao

- Mouth theo RMS/speech activity, không phải phoneme/viseme lip-sync.
- Custom MD hiện giới hạn hai rig vector; sửa văn xuôi trong profile không tự tạo gait/face mới trong compiler.
- Rule/mock kiểm tra contracts/geometry, không kiểm chứng kiến thức hoặc thẩm mỹ; cần xem/nghe video/chuỗi frame để nghiệm thu diễn xuất.
- HTTP/command là adapter protocol, cần provider/voice đúng ngôn ngữ; không tự thay giọng Việt bằng tiếng Anh.
- story-cinematic, action mới và needs-asset/needs-animation là contract dự kiến, chưa phải field/state hiện có.
- TEST-RESULTS.md giữ lịch sử V1 riêng. Các ca local V2.1 và tài liệu V2.2 không phải chứng nhận sản phẩm đã hoàn thành.
