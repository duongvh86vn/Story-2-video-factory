# Kết quả kiểm thử Story-to-Video Factory

Ngày kiểm thử: 2026-09-30  
Repository: `https://github.com/duongvh86vn/Story-2-video-factory`  
Commit mã được kiểm thử: `1ba032e` (`Keep map recipe labels inside canvas`)  
Commit ngay trước đó: `42d704d` (`Fix HyperFrames registry CSP and static path guards`)

## Môi trường

- Windows, PowerShell
- Node `v24.19.0`, npm `11.6.1`
- Python `3.11.0`
- FFmpeg/FFprobe `2025-09-25-git-9970dc32bf-full_build-www.gyan.dev`
- HyperFrames `0.8.96`
- `faster-whisper` đã cài; `whisperx` chưa cài
- Model pipeline: `mock/offline-planner`, `mock/offline-director`; không dùng API key

## Các lệnh đã chạy

| Lệnh | Kết quả | Ghi chú |
|---|---:|---|
| `npm ci --no-audit --no-fund` | 0 | Cài 328 package; npm báo deprecated `glob@11.1.0` |
| `npm run build` | 0 | Backend typecheck, Studio typecheck và Vite production build |
| Python compile `scripts/asr.py` | 0 | Syntax pass |
| `npm run cli -- new acceptance-60s --example` | 0 | Fixture SRT-only 60 giây |
| `npm run cli -- make projects/acceptance-60s` lần đầu | 1 | Phát hiện lỗi registry timeline thật |
| `npm run cli -- make projects/acceptance-60s --force` sau sửa | 0 | Trạng thái cuối `DONE`, `QC_PASSED` |
| `ffprobe -v error -show_streams -show_format -of json projects/acceptance-60s/output/final.mp4` | 0 | Kết quả đo bên dưới |
| `ffmpeg -v error -i .../final.mp4 -f null -` | 0 | Decode toàn file không báo lỗi |
| `npm run cli -- doctor` | 0 | Node, FFmpeg, FFprobe, Python được nhận diện |
| `npm run benchmark -- --count 20` | 0 | 20/20 mẫu offline hoàn tất |
| faster-whisper với model giả và `--allow-downloads` tắt | 1 | Ghi diagnostics, không tạo output giả |
| WhisperX forced alignment | 3 | Ghi diagnostics: thiếu module `whisperx` |

## Tracer 60 giây

Fixture cuối có 12 segment, 12 shot, thời lượng chính xác `60000 ms`, không có gap, leading silence hoặc trailing silence. `project-state.json` kết thúc ở `DONE`, không có lỗi, và `work/scene-repair-budget.json` không phát sinh repair tự động.

Đo bằng ffprobe:

- Video: H.264 High, `1920×1080`, progressive, `30/1 fps`, `1800` frames, `60.000000 s`
- Audio: AAC LC, `48000 Hz`, stereo, `60.000000 s`
- Subtitle: một stream `mov_text`, `60.000000 s`, ngôn ngữ `vie`
- File MP4: `33,773,765` bytes

Đây là input SRT-only nên audio là silent narration bed: QC đo `integratedLufs=-inf`, `truePeak=-inf`, silence từ `0` đến `60000 ms`. QC vẫn đạt theo contract SRT-only và ghi cảnh báo rằng không có giọng nói người dùng; chưa có bằng chứng về chất lượng voice, loudness normalization hoặc ducking.

Bằng chứng trực quan được tạo trong fixture cục bộ, hiện được gitignore để không đưa file media sinh ra vào repository:

- `projects/acceptance-60s/output/final.mp4`
- `projects/acceptance-60s/output/thumbnail.png`
- `projects/acceptance-60s/previews/contact-sheet-global.jpg`
- `projects/acceptance-60s/output/qc-report.json`
- `projects/acceptance-60s/output/production-report.md`

Contact sheet có đủ 5 snapshot cho mỗi shot ở `0/25/50/75/100%`, có nhãn shot và timestamp. Thumbnail, contact sheet và preview iframe đã được mở kiểm tra; frame cuối và các mốc chuyển shot hiển thị được. Chất lượng hình ảnh là mock/rule-based, không phải đánh giá mỹ thuật bằng vision model.

## Recipe và renderer

Đã chạy cả 8 recipe qua static validator và `hyperframes check` thật ở `1920×1080`, thời lượng 5 giây, với HyperFrames `0.8.96`:

| Recipe | Static validator | HyperFrames lint/check |
|---|---:|---:|
| `historical-map` | pass | pass |
| `patent-reveal` | pass | pass |
| `newspaper-headline` | pass | pass |
| `portrait-parallax` | pass | pass |
| `factory-conveyor` | pass | pass |
| `exploded-machine` | pass | pass |
| `timeline-zoom` | pass | pass |
| `before-after` | pass | pass |

Tracer thực tế có 12/12 scene được đánh dấu `validated=true`, không có scene fallback ở lần chạy cuối. Lịch sử attempts vẫn giữ lại các lỗi đã phát hiện trong những vòng chạy trước.

Seek determinism được kiểm tra bằng cách snapshot cùng master tại `30s` hai lần; hai file PNG có cùng SHA-256:

`33284DD826CB56EAAE08FE4EE303AE03461AC6DFB64E8823A166C0A145E6145D`

## Studio và API

Đã chạy `npm run studio` ở `http://127.0.0.1:8787` sau build và kiểm tra:

- `GET /` → `200`, Studio CSP hiện diện
- `GET /api/projects` → `200`
- `GET /api/projects/acceptance-60s` → `200`
- artifact storyboard và scene → `200`, ETag có mặt cho storyboard
- MP4 range `bytes=0-15` → `206`
- preview HTML → `200`, sandbox CSP và `connect-src 'none'`
- origin ngoài localhost → `403`
- Console browser Studio → không có error
- UI hiển thị project list, 12 shot, scene preview, QC panel và các link artifact
- Scrub slider tới cuối → chọn shot `ch004.s001`, thời gian `01:00.0`, đúng tổng duration

API traversal được kiểm tra bằng `curl.exe --path-as-is` với `%2e%2e` và encoded slash; cả hai trả `400 INVALID_PATH`. Lỗi này đã được sửa bằng kiểm tra raw request URL trước khi router chuẩn hóa dot segment. CSP scene/preview cũng đã cho phép `data:` image/font mà HyperFrames tự nhúng, trong khi vẫn cấm remote network.

Lock CLI đã được chạy với `ch001.s001`, xác nhận lock trong state rồi unlock lại; state cuối vẫn `DONE`, `error=null`, không để lại lock hoạt động.

## Benchmark

`npm run benchmark -- --count 20` chạy 20 mẫu cùng fixture, cùng số thứ tự và sáu style: `historical-cinematic`, `technical-clean`, `industrial-documentary`, `watercolor-story`, `dark-tech`, `educational-flat`.

- Completed: `20/20`
- Failed: `0`
- Elapsed: `1324–1485 ms/mẫu`, trung bình `1391 ms`
- Storyboard samples có shot count hợp lệ: `20/20`
- Scene compile, repair, real vision, final render và QC trong benchmark: `null` vì benchmark này không bật `--full`/`--render`

Không dùng kết quả này để suy ra tỷ lệ compile scene hoặc chất lượng semantic/factual.

## Lỗi đã tìm và đã sửa

1. HyperFrames static guard yêu cầu `window.__timelines` xuất hiện trong `index.html`; registry trước đây chỉ nằm trong `scene.js`. Đã thêm một inline initializer cố định cho shot và master, đồng thời validator chỉ cho phép chính xác initializer này.
2. Validator coi initializer hợp lệ là script thiếu `src`; đã tách inline registry khỏi danh sách external script bắt buộc.
3. HyperFrames compiler tự nhúng SVG/font bằng `data:`; CSP cũ chặn chúng và làm `check` trả 15 runtime errors. Đã thêm `data:` cho `img-src` và `font-src` ở scene và preview server.
4. `portrait-caption` nhận toàn bộ prompt dài và tạo overflow; mô tả hiển thị được giới hạn còn 220 ký tự.
5. `historical-map` dùng label dài gây content overlap/canvas overflow; label bản đồ được giới hạn 24 ký tự và đã chạy lại recipe pass.
6. Static file route cho phép URL encoded dot segment đi qua sau khi router normalize. Đã kiểm tra raw URL và trả `400 INVALID_PATH`.

## Phạm vi chưa đạt hoặc chưa chạy

Các mục sau chưa được tính là pass:

- WAV-only transcription với model Whisper thật; chỉ kiểm tra được đường lỗi faster-whisper khi model không hợp lệ.
- WhisperX precision và SRT+WAV forced alignment; môi trường thiếu `whisperx`.
- Gateway/OpenAI-compatible, Gemini, DeepSeek, Ollama, LiteLLM, retry 429/timeout/fallback với provider thật; không có model ID/key được cấp.
- Vision review thật, injected wrong character/costume/crop/contradiction và đo detection ratio; review hiện báo rõ `mode=rule-based`.
- Benchmark `--full`, 20 generated scene compile/repair và final-render benchmark.
- Docker isolation, symlink/upload extension-size attack, full failure injection cho black/freeze/clipping/silence, BGM/SFX/ducking/loudness, caption modes `none/burned/soft/both`.
- Ngắt tiến trình ở từng state, stale lock recovery, SQLite job recovery, artifact invalidation matrix, approval gates đầy đủ và API mutation/upload optimistic revision.

Model tiếp theo nên bắt đầu từ nhóm WAV/WhisperX và provider/vision thật nếu có credentials, sau đó chạy failure-injection/QC và Docker isolation. Các kết quả `null` ở trên là chưa chạy, không phải pass.
