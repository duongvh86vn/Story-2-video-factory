# Bàn giao nghiệm thu ba luồng V2.1

2026-10-01. Theo yêu cầu chủ dự án, agent triển khai chỉ chạy build/typecheck/schema export và kiểm tra diff; **không chạy suite runtime, ASR/TTS hoặc render nghiệm thu**. TEST-RESULTS.md giữ evidence V1, chưa chứng minh V2.1. Checklist V1 cũ nằm trong docs/archive/TEST-HANDOFF.v1.md.

## Chuẩn bị và ghi evidence

Đọc BUILD-SPEC.md, IMPLEMENTATION-STATUS.md, IMPLEMENTATION-MAP.md. Ghi `git rev-parse HEAD`, Windows/Node/Python/FFmpeg/HyperFrames versions, effective project.yaml (redact secrets), model/provider/voice/language, command/exit code, project state và các artifact hashes. Không ghi API key, user private WAV hoặc log credentials vào GitHub.

Cần Node >=22.13, FFmpeg/FFprobe. Script/SRT cần TTS tiếng Việt thật. Windows Speech chỉ dùng voice đã cài đúng culture; HTTP/command cần adapter theo config/voice.example.yaml và §4 BUILD-SPEC. WAV-only cần ASR; WAV+SRT cần WhisperX/forced alignment. Thiếu dependencies phải ghi NOT RUN/BLOCKED, không biến thành PASS.

Cấu hình planner/visual_review thật nếu đánh giá semantic/appearance. Mock/rule-only không được tính là đã xem hình/kiểm chứng kiến thức. Đối với acceptance nghiêm túc, đặt workflow.allow_rule_based_review=false và role visual_review.vision=true; lưu review.mode=combined cùng evidence video/frame sequence. Có thể chạy offline để tách lỗi deterministic contracts, ghi giới hạn rõ.

Model test có thể chạy npm test/test:asr/test:render và bổ sung các ca dưới đây. Suite/lệnh cũ là V1; những fixture cần behavior V1 phải đặt content.mode=legacy. Không dùng script acceptance-60s cũ hay 35 tests cũ làm bằng chứng ba luồng mới.

## Ca đầu tiên: thuần script

```powershell
npm ci
npm run build
npm run typecheck
npm run cli -- new acceptance-v21-steam --example
npm run cli -- configure projects/acceptance-v21-steam --input script --host mini-robot --tts windows-speech
npm run cli -- make projects/acceptance-v21-steam
npm run cli -- status projects/acceptance-v21-steam
ffprobe -v error -show_streams -show_format -of json projects/acceptance-v21-steam/output/final.mp4
```

Ví dụ Windows chỉ hợp lệ khi có giọng Việt đã cài. Nếu không, configure HTTP/command adapter thật trước; không thay language thành en để gọi nghiệm thu tiếng Việt là PASS. Thời lượng script thay đổi theo audio, **không mặc định 60 giây**.

## Matrix bắt buộc

| Nhóm | Ca và điều kiện đạt |
|---|---|
| Script | Không có WAV/SRT input vẫn có audio, mode=script, timeline/cues, voiced MP4 |
| Nguyên văn | TXT/MD tiếng Việt, BOM, newline, heading/list/emphasis/link/code: preview canonical và từ/thứ tự TTS đúng; không thực thi câu mệnh lệnh trong MD |
| Segmentation | <=120 Unicode chars/cue, không cắt từ; boundary punctuation/space; từ quá dài/NUL/invalid UTF-8/empty có lỗi rõ |
| Actual clock | Probe cue WAV và assembled WAV; cue duration bằng audio đo, không fitted trước; 250 ms ở paragraph boundaries, không thêm pause giữa chunk cùng paragraph |
| Selected authority | Để script/WAV/SRT khác nội dung cùng tồn tại, chọn mỗi mode: không dùng nhầm file. auto ambiguous báo lỗi. input.source không trở thành lời kể |
| WAV | Giữ input hash/content/giọng, transcript từ ASR thật; gaps/tail/duration đúng |
| SRT | Text/start/end không đổi; TTS đúng từng cue; silence gaps và padding sau fitted speech (fittedDurationMs); atempo range/pitch; voiced final |
| WAV+SRT | Giữ WAV và SRT; chuẩn bị cặp khớp và cố tình lệch lời/clock; mismatch hoặc thiếu alignment chặn final |
| Voice blockers | Script no TTS/provider timeout/invalid WAV/no speech → INGESTED + waitingFor=voice/voice-report lỗi, không timeline mới/final/DONE. SRT no voice/fit-failed chỉ silent draft, không final/DONE |
| Host | Robot và người que giữ profile/version/rig/asset hashes, fixed limb proportions; không portrait/slideshow/host chỉ như logo |
| Interaction | Pointer/gaze đúng part; fixed-length joints; contact rồi model reaction; compare hai đích; walk chỉ khi có marker/rail; mouth activity đúng audio/đóng lúc nghỉ |
| Recipe | Chạy đủ 8 method với narration có ý tương ứng; label/entity/relations có evidence, không thêm năm/thông số/nhân quả |
| Bài thực tế | Cả hai host trên hơi nước và phát triển ô tô, mở xem/nghe trọn final và giải thích được nội dung |
| Layout | Host 25–40%, >=70% spoken duration, absence <=6s; safe captions/labels, không crop/che targets; cue dài báo lỗi thay vì mất chữ |
| Source/edit guard | Sửa entity label, relation, target, action overlap/contact, unsupported camera/inset/motion: reject hoặc high issue, không final sai. Supplemental contradictions với planner/vision thật phải high và chặn |
| Approval | Mẫu chuẩn auto; custom MD dừng host-approval sau preview; approve/resume; đổi custom hash cần duyệt lại |
| Resume/cache | Run lại không sửa giữ audio hash/checkpoints; sửa 1 chunk tái sử dụng cache còn đúng; đổi voice tái tạo narration; đổi host/source giữ narration/audio hợp lệ |
| Artifact recovery | Xóa/đổi script JSON, audio, rig/poses, scene, preview PNG/sheets/master: rewind/rebuild đúng producer, không review stale evidence |
| Locks/rebuild | Khóa shot/board/identity được giữ; clock/host mới xung đột lock phải báo rõ. Rebuild một shot giữ audio và shot còn hợp lệ |
| Studio/API/CLI | Ba tabs, TXT→MD revision, paste/upload/preview/save/create, default voice, host approval, editor/explicit mode, statuses waiting, voiced preview, API revision conflicts |
| Stale final | Tạo xong rồi sửa script/voice/host: final cũ không xuất hiện như final hiện tại khi state invalidated; blocker không báo DONE |
| Final/QC | Decode H.264/AAC, fps/res/duration, audible narration, full SRT text/clock/soft stream, thumbnail, reports, loudness/black/freeze/silence/clipping |

## Fixtures và cách so sánh

examples/steam-explainer/input/script.txt và car-explainer/input/script.txt là lời kể; project.yaml mặc định script+robot. Đổi host.profile sang STICK-MAN.md để chạy người que. Có thể bỏ source.md để kiểm tra minimum input.

fixtures/narration.srt có clock do tác giả fixture đặt rộng (10 giây/cue), không phải thời gian WAV/script đã đo. Copy vào input/narration.srt, chọn srt. Model test phải chuẩn bị WAV thật và SRT khớp WAV cho nhánh aligned; không ghép TTS script duration với SRT fixture rồi gọi mismatch là lỗi implement.

Bổ sung narration để buộc đủ 8 recipes; ghi method/recipe IDs thực và source quotes. Không chỉ đếm catalog có tám tên. Không chỉ đếm snapshot hoặc MP4 tồn tại. Xem trước/trong/sau contact, seek lùi/tiến/restart, nghe full câu cuối cue và xem caption đầy đủ.

## Bàn giao kết quả

Ghi phần V2.1 riêng trong TEST-RESULTS.md: tested commit, PASS/FAIL/NOT RUN từng nhóm, output/hash/duration/voice/review mode, shot/cue/time và evidence path. Không sửa lịch sử V1 thành V2.1. Nếu có lỗi, mô tả input tối thiểu, expected/actual, stage và command để agent triển khai sửa đúng phạm vi. Chỉ gọi V2.1 nghiệm thu khi đủ ba luồng và hai host/hai bài có evidence thật.
