# Kết quả kiểm thử Story-to-Video Factory

Cập nhật03/10/2026: nội dung lịch sử V1 bên dưới giữ nguyên. Code diễn viên source22/animation10 hiện đã triển khai; [audit độc lập mới](docs/validation/2026-10-03-current-runtime.md), [phim authored](docs/validation/2026-10-03-car-workshop-production.md) và [audit hoàn thành](docs/validation/2026-10-03-completion-audit.md) ghi phạm vi riêng. Diagnostics mới, browser/toàn phim/ba luồng hiện hành và live local TTS vẫn còn chờ; không dùng kết quả V1 làm chứng nhận release mới.

Lưu ý phiên bản (2026-10-01): các kết quả lịch sử bên dưới đo **V1**. Code ba luồng/host V2.1 đã bổ sung và build/typecheck qua; thử nghiệm local sau đó chỉ là evidence từng phần, được ghi trong IMPLEMENTATION-STATUS.md. Hệ diễn xuất V2.2 hiện mới có đặc tả/kế hoạch, chưa có code/video nghiệm thu. Xem TEST-HANDOFF.md; không dùng kết quả cũ để khẳng định ba luồng hoặc style mới đạt. Nội dung lịch sử bên dưới được giữ nguyên.

Ngày kiểm thử: 2026-09-30  
Repository: `https://github.com/duongvh86vn/Story-2-video-factory`  
Commit mã được kiểm thử trong vòng tiếp tục: `81bf7b8df9c94cbf1562519ba8ccdfd769c22b51` (`Fix artifact recovery and preview review integrity with regression coverage`)

Đợt kiểm thử đầu: `1ba032e` (`Keep map recipe labels inside canvas`), sau `42d704d` (`Fix HyperFrames registry CSP and static path guards`).

Các mục từ “Môi trường” đến “Phạm vi chưa đạt hoặc chưa chạy” ghi lại đợt đầu. Phần “Vòng tiếp tục” cuối file cập nhật bằng chứng và giới hạn hiện tại.

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
| faster-whisper với model giả và `--allow-downloads` tắt | 4 | Ghi diagnostics, không tạo output giả; exit code đã được xác nhận lại ở vòng tiếp tục |
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

## Vòng tiếp tục — 2026-09-30

Đã hoàn thành phần hồi quy cục bộ và sửa các lỗi tái hiện được. Không gộp HTTP fixture vào kết quả chất lượng của provider thật.

### Lệnh và kết quả

| Lệnh | Exit code | Kết quả |
|---|---:|---|
| `npm test` | 0 | 35/35 test pass; không skip/cancel |
| `npm run test:typecheck` | 0 | Typecheck cả test và hai script acceptance |
| `npm run build` | 0 | Backend, Studio và Vite build pass |
| `npm run test:asr` | 0 | faster-whisper tiny thật, CPU/int8, cache cục bộ, download tắt |
| `npm run test:render` | 0 | HyperFrames tracer 4 giây tới `DONE`, QC pass |
| `git diff --check` | 0 | Không có lỗi whitespace |
| `python scripts/asr.py ... --model acceptance-no-such-model` | 4 | Diagnostics ghi lỗi, không tạo narration output giả |
| `docker info --format '{{.ServerVersion}}'` | 1 | Docker CLI có sẵn; Docker Engine chưa chạy, thiếu pipe `dockerDesktopLinuxEngine` |

### Phạm vi suite 35 test

| Nhóm | Số test | Bằng chứng |
|---|---:|---|
| Model HTTP/journal | 12 | 6 adapter gateway/OpenAI-compatible/DeepSeek/LiteLLM/Gemini/Ollama dùng HTTP server cục bộ; structured JSON, token usage và vision payload; 429, schema feedback, timeout, refusal, truncation, fallback, budget sau restart, cost, secret redaction, torn append, lock PID chết và concurrent reservation |
| Pipeline/resume | 5 | Mất narration, approval characters/storyboard, khóa bible, stale/live/partial project lock, SQLite interrupted job, no-op stage resume, migration preview manifest cũ |
| Scene/review | 5 | Runtime/remote/unscoped CSS/oversize source bị từ chối; identity không tồn tại và numeric claim ngoài source; contact sheet bị sửa, snapshot trùng; vision response sai batch hoặc failed không có issue |
| Studio API | 6 | Optimistic revision, khóa shot, bất biến narration timing, upload nhiều file không commit khi validation lỗi, SVG script, source >2 MB, filename traversal/type mismatch, host/origin, busy mutation, junction escape và HTTP range |
| FFmpeg/media/QC | 7 | Caption `none/burned/soft/both`; duration/stream/loudness; black/freeze/silence/full-scale clipping/true peak; whitelist đầy đủ, BGM ducking, SFX timestamp và normalization |

Các ca traversal URL dùng HTTP request giữ nguyên raw path; `app.inject` có thể tự normalize encoded dot segment. Junction được tạo thật bằng `fs.symlink(..., 'junction')` trên Windows. Bộ test dùng thư mục tạm riêng và không sửa project của người dùng.

Media suite dùng test pattern và tone để đo filter/mux/QC, không dùng tone làm bằng chứng nhận dạng giọng nói. Đã đo thành phần BGM 880 Hz trước mastering: RMS trong đoạn có voice thấp hơn đoạn không voice ít nhất 3 dB. SFX tại 2500 ms dùng delay 120000 sample ở 48 kHz; timestamp ngoài shot bị từ chối. Output normalization và QC pass ở cả bốn chế độ caption. Black/freeze/silence/clipping được chèn vào MP4 thật và bị QC phát hiện; intentional black/static cùng SRT-only silence được chấp nhận khi whitelist phủ đủ khoảng.

### WAV-only thật

Fixture: giọng tổng hợp **Microsoft David Desktop**, tiếng Anh; không tải model. Model **faster-whisper tiny**, CPU/int8.

- Audio probe: `12288 ms`.
- Ingest trả `mode=wav`, `audioPath=input/narration.wav`, 4 segment, 27 word timing hợp lệ và SRT sinh từ transcription.
- Transcript: “the inventor built a new machine. The machine helped workers in the factory. Each part moved in a clear sequence. The story ends with a useful invention.”
- Timing dùng `faster-whisper-attention`; đây không phải forced alignment CTC của WhisperX.
- Chưa đo WER/precision trên bộ dữ liệu tiếng Việt hoặc giọng người thật.

### Tracer sau sửa

Fixture cuối: `temp/acceptance-render/tracer-1790779942030/` (gitignore, giữ evidence cục bộ).

- `project-state.json`: `DONE`, không có `error`.
- MP4: H.264, `1920×1080`, `30 fps`, `4.000 s`.
- Audio: AAC, 48 kHz, stereo, `4.000 s`; SRT-only nên giữ silent bed và cảnh báo không có voice.
- Một stream subtitle; caption mode `both`.
- 5 snapshot riêng biệt tại `0/25/50/75/100%`, 2 contact sheet có hash trong manifest.
- QC pass; draft/review/final và production artifacts được tạo bằng HyperFrames/FFmpeg thật.

Video: `temp/acceptance-render/tracer-1790779942030/output/final.mp4`; báo cáo: `output/qc-report.json`, `output/production-report.md`; preview: `previews/manifest.json`, `previews/contact-sheet-global.jpg` trong cùng fixture.

### Lỗi và sửa đổi

1. Mất `work/narration.json` khi resume từ `TIMED` trước đây quay về `INGESTED` rồi đọc file đã mất. Reconcile hiện quay về trước bước ingest để tạo lại narration và timeline.
2. Windows short path như `DUONGV~1` làm `path.relative` tạo tham chiếu asset ngoài namespace. Pipeline hiện canonicalize project root bằng `realpath` trước khi tạo đường dẫn tương đối.
3. Review trước đây kiểm tra PNG nhưng không kiểm tra contact sheet thực sự gửi cho vision. Manifest hiện lưu và xác minh hash từng sheet.
4. Review trước đây chỉ đếm tổng 5 ảnh/shot, có thể nhận snapshot trùng hoặc sai timestamp. Hiện kiểm tra ID, fraction riêng biệt và mốc thời gian theo narration.
5. Preview manifest/PNG/JPG nay được theo dõi để invalidate draft khi mất hoặc bị sửa. Manifest cũ thiếu sheet hash được tạo lại khi resume; test xác nhận rewind về `SCENES_READY`.
6. Multipart bật `preservePath` để filename validator có thể từ chối đường dẫn upload nguyên gốc, thay vì parser âm thầm cắt basename.

### Phần còn cần kiểm thử riêng

- WhisperX chưa cài; `torch`/`torchaudio` chưa có. SRT+WAV forced alignment, CTC precision và tiếng Việt chưa được xác nhận.
- Không có `.env` chứa cấu hình provider thật. HTTP contract cục bộ đã pass nhưng latency, compatibility với dịch vụ triển khai, semantic quality, billing và real vision chưa được đo.
- Vision fixtures chỉ kiểm tra schema/batch/failure guard; chưa có detection ratio cho sai người/trang phục/crop/mâu thuẫn hình ảnh.
- Docker isolation chưa chạy vì Engine chưa hoạt động.
- Chưa chạy benchmark 20 generated scene với provider thật, `--full`/`--render`, hoặc SIGKILL tại từng stage. SQLite/project lock recovery đã kiểm tra bằng persisted interrupted/stale state.
- API đã kiểm tra limit source 2 MB, junction và format attack; chưa stream thử file 128 MB/combined 256 MB và chưa kiểm tra toàn bộ upload limit matrix.

Các giới hạn trên không được tính là pass. `TEST-HANDOFF.md` giữ checklist để model test tiếp tục khi có môi trường và cấu hình tương ứng.


## Triển khai V2.1 — kiểm tra biên dịch, chưa nghiệm thu runtime

Ngày 2026-10-01. Source ba luồng script/WAV/SRT, voice/host/explainer pipeline và Studio/API/CLI đã được bổ sung. Commit bàn giao là commit GitHub có tiêu đề `Implement three narration flows with reusable explainer hosts`; model test phải ghi SHA thực đã chạy ở phần nghiệm thu tiếp theo.

| Kiểm tra | Kết quả | Phạm vi |
|---|---|---|
| npm run typecheck | PASS | TypeScript backend/CLI và Studio |
| npm run build | PASS | Backend/CLI compile + Studio Vite production bundle |
| npm run schemas | Đã sinh | JSON Schema từ shared contracts, không là runtime test |
| npm test / test:asr / test:render | NOT RUN trong lượt V2.1 | Theo yêu cầu giao test model khác |
| TTS/ASR/alignment/render/video host V2.1 | NOT RUN | Chưa có evidence nghiệm thu mới |

Mẫu script/SRT và matrix acceptance nằm trong TEST-HANDOFF.md. Cần provider tiếng Việt thật, alignment backend và planner/vision phù hợp để ghi evidence audio/video/source/contact/layout. Rule-only pass, schema generation, compilation hoặc kết quả V1 không thay thế các ca này.


<!-- RAINY-NATIVE-RESUME-20261005 -->
### Một ca native đã DONE/QC PASS; chất lượng toàn tool vẫn mở

Ca tiếng Anh trạm xe buýt public resume exit0/QC PASS, giữ nguyên nguồn/audio/clock,
journal13started12completed1oldpending và không gọi provider mới. Cảnh đầu dùng
lại đúng completed response, qua browser/full merged-board trước khi xuất.
Review/scene budget2/2, lỗi/phim cũ được giữ; không reset/clone/force.

Model test hết hạn mức trước báo cáo đánh giá cuối; parent chỉ đọc artifact đã có.
Ảnh preview còn diễn viên nhỏ, hai vai gần giống và nền sơ sài. Chưa nghiệm thu
visual design/normal-speed watch/full audio/real vision hoặc matrix toàn sản phẩm.
Source3718:205PASS1SKIP,18PASS và14PASS synthetic ở các lần kiểm riêng; typecheck0.
[Report có phạm vi và bộ kiểm tiếp](docs/validation/2026-10-05-rainy-native-resume.md).

## Checkpoint05/10 — độc lập rainy PARTIAL; birthday source candidate

Retained rainy đã kiểm chỉ đọc: technical decode PASS, story PASS_SAMPLED,
cast/framing PARTIAL, planted feet/floor alignment FAIL; full watch/listen NOTRUN.
[Scope](docs/validation/2026-10-05-rainy-readonly-acceptance.md).
Birthday rawtopic→writer→ENZira51.421s/12cues PASS technical, nhưng source-review
chặn trước phim:11callscomplete/0pending, nativevisionNOTRUN. Source lexical/rig
fix build/typecheckPASS, runtime regression/resumePENDING.
[Raw failures và giới hạn](docs/validation/2026-10-05-birthday-garden-source.md).

### Follow-up15:14UTC

Candidate ddfe672: build/typecheck PASS only. Independent lexical/budget/cache/rig
regressions and original-case resume NOTRUN after helper parse failure and
actual account usage limit. Native vision/video NOTRUN.11call history and16
protectedcasefiles unchanged; no parent test/provider substitution.
[Scope](docs/validation/2026-10-05-birthday-garden-source.md).
