# Bàn giao test cho model khác

Trong giai đoạn triển khai ban đầu, chủ dự án giao phần test cho model khác. Kết quả kiểm thử và vòng sửa lỗi tiếp theo đã được ghi tại `TEST-RESULTS.md`; đọc báo cáo đó trước khi tiếp tục checklist bên dưới. Repository hiện có suite hồi quy cục bộ qua `npm test`, cùng hai lệnh opt-in `npm run test:asr` và `npm run test:render`. Các mục checklist chưa có bằng chứng vẫn cần được kiểm thử riêng.

## Nghiệm thu định hướng V2 — 2026-10-01

`BUILD-SPEC.md` đã được viết lại theo robot mini/người que dẫn chuyện giải thích WAV/SRT. Lần cập nhật này chỉ sửa MD; chưa triển khai hoặc test V2. Suite và số liệu hiện tại là nền tảng V1.

Sau khi triển khai, tester cần ưu tiên:

- Hai bài đầu vào thật: hệ thống hơi nước và quá trình phát triển ô tô; giữ nội dung người dùng, không thay bằng truyện hư cấu của nhân vật An.
- Chạy cả `MINI-ROBOT.md` và `STICK-MAN.md`: compiler thật sự dựng rig với part IDs/khớp/actions, không chỉ lưu text hoặc dùng ảnh chân dung.
- WAV-only/SRT-only/WAV+SRT; thiếu `source.md` vẫn ingest; SRT-only final có TTS/WAV, thiếu voice chỉ ra nháp và needs-voice.
- Host identity/rig hash giữ qua shot/tập, có đủ hiện diện và hành động giải thích. Host không bị gán vai nhà phát minh/lịch sử.
- Đối chiếu pointer, gaze, contact, part motion và cue/word anchor; kiểm tra frame sequence quanh action, không chỉ tổng số snapshot.
- Cơ chế/quy trình/timeline/compare đúng lời kể; nhãn/caption không che host và target. Không dùng portrait/slideshow/idle loop làm substitute.
- Fallback vẫn giữ host và quan hệ chính; lỗi voice/identity/nội dung/target nghiêm trọng phải chặn final.
- Studio chọn/duyệt host, voice status và storyboard lời kể/hình/hành động; edit/lock/resume invalidate đúng phụ thuộc.

Các tiêu chí đo và thứ tự P0–P5 nằm trong §14–16 của đặc tả V2. Checklist kỹ thuật V1 dưới đây dùng làm hồi quy, không thay cho nghiệm thu V2.

## Chuẩn bị

- Đọc `BUILD-SPEC.md`, `README.md`, `IMPLEMENTATION-MAP.md` và code hiện tại.
- `npm ci`, `npm run build`. Node 22.13+, FFmpeg/ffprobe.
- Cài Python ASR requirements nếu test WAV. Dùng môi trường riêng cho WhisperX.
- Cấu hình model ID thật và key ở `.env`; không commit key hoặc log request header.
- Default mock được dùng cho dữ liệu offline; vision thật cần role `visual_review` có `vision: true`. Không tính review mock/rule-based như vision pass.

## Tracer đầu tiên

```powershell
npm run cli -- new acceptance-60s --example
npm run cli -- make projects/acceptance-60s
ffprobe -v error -show_streams -show_format -of json projects/acceptance-60s/output/final.mp4
```

Xác nhận tất cả artifact cuối, 60 giây trong tolerance, 1920×1080/30 fps, subtitle, các cảnh và pose nhân vật. SRT-only không có giọng đọc; cần thêm WAV để đánh giá narration/mix. Không chấp nhận MP4 tồn tại như đủ bằng chứng: mở xem thực tế, đối chiếu các snapshot và nghe audio.

## Ingest và đồng hồ

- SRT BOM, CRLF/LF, multiline, dấu phẩy/chấm millisecond, giờ dài, index không liên tiếp.
- Timestamp âm, end≤start, cue overlap, cue rỗng, input thiếu, audio duration lệch: báo lỗi đúng vị trí.
- Leading/trailing silence và gap giữa cues: visual coverage vẫn toàn duration, không đổi cue timestamps.
- WAV-only faster-whisper, WhisperX precision, SRT+WAV forced alignment: SRT text/interval không đổi, word timing hợp lệ.
- Python/FFmpeg thiếu, ASR model tải thất bại, timeout: lưu attempt/error, resume không nhân đôi side effect.

## Planning và model

- Mỗi segment nằm trong beat; mỗi beat được shot bao phủ; chapter/beat/shot không chồng lấn hoặc hở timeline.
- JSON sai schema, prose thay JSON, ID nhân vật lạ, factual addition: reject/repair với feedback và budget.
- Gateway/OpenAI-compatible, Gemini native, DeepSeek, Ollama, LiteLLM: kiểm tra URL/envelope, usage/cost, vision input.
- 429/retry-after, timeout, HTTP 4xx/5xx, fallback khác provider: không vô hạn, không chuyển production lỗi sang mock âm thầm.
- Resume vẫn tính call/cost budget từ journal. Giá chưa cấu hình phải phân biệt chi phí đo thực.
- Dùng 20 mẫu cùng số thứ tự/style qua `benchmarks/run.ts`; đo schema pass, scene compile, repair, continuity, cost, latency. Đánh giá semantic/factual quality độc lập với schema.

## Scene, render và bảo vệ

- Từng recipe: map, document, newspaper/text/quote, portrait parallax, conveyor/process, exploded machine, timeline, before/after.
- Lint/check upstream phải chạy thật, không dựa vào file existence. Seek theo thứ tự ngẫu nhiên để xác nhận deterministic frames.
- 20 scene có model code: đo mục tiêu ≥90% compile tự động; không báo tỷ lệ trước khi đo.
- Sinh scene lỗi, repair tối đa ba lần, fallback recipe; lưu toàn bộ attempts. Shot khóa không bị tự sửa.
- Master subcomposition: selector/style namespace, timeline registration, media relative path, transitions và profile scaling draft/final.
- Bắt access env, filesystem/shell, URL remote, path traversal, symlink, nondeterminism và source quá lớn. Chạy untrusted scenes trong Docker ở bài test isolation.
- Browser request/runtime error, missing asset, network disabled, shader/media edge cases: xác nhận validator không bỏ qua.

## Review

- Năm snapshot 0/25/50/75/100% cho mỗi shot; per-shot/global contact sheets, nhãn timestamp.
- Inject wrong character/version/costume, blank crop, text overflow, subtitle overlap, contradiction, repetition; dùng vision thật và đo khả năng bắt lỗi.
- Chỉ high severity được auto repair. Regenerate draft/snapshot/review sau repair; không final render khi review fail.
- Không có vision: report ghi rõ rule-based; `allow_rule_based_review:false` phải dừng.
- Loop budget bị hết và shot khóa bị lỗi: báo nguyên nhân, không ghi DONE.

## Audio/caption/QC

- Narration + BGM + SFX local; offset SFX đúng shot; ducking nghe được; normalize LUFS/true peak theo config.
- `none`, `burned`, `soft`, `both`; tiếng Việt Unicode/font/escaping đường dẫn Windows.
- Đo đúng codec, fps, resolution, sample rate, duration. SRT-only không bị coi là missing user voice.
- Inject black/freeze/silence/clipping: QC báo đúng. Opening fade whitelist, shot intentionalStatic và silence có chủ ý không bị false positive.
- Lỗi QC giữ report và production report nhưng không chuyển QC_PASSED/DONE.

## Resume, khóa, Studio

- Ngắt tiến trình ở mỗi state, xác nhận PID lock, stale lock recovery, SQLite jobs và state JSON nhất quán.
- Sửa shot 1: chỉ regenerate shot 1 và master. Sửa scene source trực tiếp: giữ nội dung, validate/render/review lại.
- Input/config/asset hash đổi, file artifact mất hoặc bị sửa: invalidation đúng stage, không tiếp tục với artifact cũ.
- Khóa storyboard/characterBible/shot, approve gates, identity/version/pose series và override episode.
- CLI mọi lệnh; API upload, source/SRT/JSON/scene editing, optimistic revision, duplicate jobs, status/log/cost/QC/download.
- Web Studio: project list, timeline scrub, preview scene/video, manual camera/asset/caption, locks/approval, responsive keyboard/focus.
- API path traversal, symlink, upload extension/size, local host/origin handling, CSP preview. Không hiển thị key.

## Báo cáo cần trả

Ghi commit được test, lệnh thực chạy và exit code, fixture/model/renderer version, lỗi tái hiện, screenshot/video/audio evidence, tỷ lệ đo được và giới hạn chưa test. Phân biệt lỗi code, môi trường và chất lượng model. Không đổi hoặc thu hẹp đặc tả để làm test xanh. Sửa lỗi có bằng chứng rồi chạy lại đúng checks liên quan.
