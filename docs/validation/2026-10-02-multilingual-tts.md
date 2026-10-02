# Kiểm tra đa ngôn ngữ và TTS bên ngoài

Snapshot mới trên nhánh `codex/stickman-acting-v22`, ngày 02/10/2026. Runtime do model Descartes kiểm tra độc lập; parent sửa production và chạy build/typecheck. Đây là nghiệm thu hợp đồng narration/TTS, chưa nghiệm thu toàn bộ video hoặc backend local của người dùng.

## Vòng đầu — FAIL được giữ lại

Một lần `npm.cmd test`, 10:05:06–10:10:42 UTC: **442 test, 437 PASS, 5 FAIL**, không skip/cancel/retry. 403 test cũ qua; 39 test mới gồm 34 qua và 5 lỗi. `npm.cmd run test:typecheck` exit0. Báo cáo gốc ngoài repo: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/independent-multilingual-runtime-en-vi-ja-ko.md`, thư mục evidence `multilingual-evidence-20261002-095816`.

Các lỗi nguyên bản:

1. Preset JA Azure còn executable/arguments từ mặc định VI command.
2. Lưu preset KO còn executable từ default command.
3. Đổi default sang Windows vẫn giữ executable cũ.
4. API lưu voice default nhận command injection với HTTP200, yêu cầu HTTP422 và giữ nguyên file.
5. Đổi VI → en-US đã reset ASR/state nhưng còn `narrationInputHash` cũ.

Parent sửa cleanup theo provider, schema voice công khai không nhận executable/arguments, và invalidation về NEW đặt fingerprint narration về chuỗi rỗng đúng schema. Build/typecheck sau sửa exit0; vòng kiểm tra lại do cùng model thực hiện, giữ nguyên assertions. Các thay đổi này không reset voice ID ghi rõ trong project; project vẫn ưu tiên hơn preset.

## Giọng English thật

Chạy Windows Speech trong project riêng bị Git ignore, 10:11:21–10:11:24 UTC; exit0. Catalog từ chính Windows engine có Microsoft David Desktop và Microsoft Zira Desktop, culture en-US. Dùng David để đọc:

`Steam carries heat to a separate condenser. The cylinder stays hot.`

WAV PCM mono 48kHz dài 5.323021s; narration 5323ms, hai cue nối tiếp 0–3119–5323ms. PCM decode có peak27444/RMS2796.075, có speech activity. Text gốc, cue text và input source hash giữ nguyên; request giống nhau dùng lại cache. Voice ID không tồn tại bị chặn trước narration. Không có ASR hoặc đánh giá nghe bởi con người trong scope này.

Audio SHA256: `affb2fce51c5d49b5e14c4ca7c3cf378cd1376268c785177a15e5c219f503fd9`. Project chứng minh: `temp/multilingual-acceptance/run-001/english`.

## Coverage và giới hạn

Ca mới kiểm tra chia tiếng Nhật không khoảng trắng, Unicode/Korean/EN/VI nguyên văn, precedence locale/preset/project, language ASR bằng mock, Azure SSML/voice/HTTP bằng fixture, HTTP custom/OpenAI-compatible/OmniVoice bằng stub local PCM, cache script/SRT và failure gate. Audio stub không chứng minh ngôn ngữ hoặc chất lượng phát âm. SRT giữ cue/clock trong test; đổi model/options/voice/language/mapping tạo request mới.

**Chưa chạy:** live Azure/JA/KO/OmniVoice hoặc API riêng của người dùng, cài đặt model/giọng, ASR Việt thật trong scope mới, film matrix/ngữ nghĩa đa ngôn ngữ, phát âm và thẩm mỹ. [Matrix trước](2026-10-02-input-matrix-scope.md) vẫn FAIL yêu cầu actors, WAV words và embedded subtitle whitespace; không được dùng kết quả TTS để đóng những lỗi đó.

## Vòng kiểm tra sau sửa

Report terminal: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/independent-multilingual-followup.md`. Evidence: `multilingual-followup-evidence-20261002-132658`.

| Lệnh | Kết quả | Thời gian UTC |
|---|---|---|
| `node --import tsx --test --test-concurrency=1 tests/multilingual.test.ts` | 40/40 PASS | 13:29:07–13:29:19 |
| `node --import tsx --test --test-concurrency=1 tests/server.test.ts tests/explainer.test.ts tests/pipeline.test.ts tests/creative-settings.test.ts tests/setup-revision.test.ts` | 33/33 PASS | 13:29:30–13:29:57 |
| `npm.cmd run test:typecheck` | exit0 | 13:30:34–13:30:40 |

Không skip/cancel/retry. Giữ nguyên byte 39 ca đầu, chỉ thêm ca API project chặn `command`/`command_args` với HTTP422 và giữ nguyên input/config/state. Hash test mới: `5f319073ba9499331ae033a35efe1a37e84f9bdf7e6ac083a8f91d2cb6d31b79`; bỏ duy nhất ca bổ sung khôi phục đúng hash cũ `bb2ba4a48d8bb308d36ac0205aa72fe8c2ef0e9713a873f44fce3f14b88022c9`.

Source-before 13:28:29 UTC, source-after 13:30:54 UTC: 174 TS/TSX cùng digest `d32ef7fe16c27c86400056697e4d1f0cdbd7c32b639946e7a9f0e23357af108b`; PS/config không đổi, chỉ có Markdown parent cập nhật. 43 process test có identity PID+creation đều terminal, không kill. Vòng kiểm tra này gồm 73 ca được chọn, không phải một lần full suite 443/443. EN real proof của vòng đầu vẫn dùng source synthesis/parser không đổi; không gọi đó là một lượt chạy live mới.
