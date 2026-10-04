# TTS local bên ngoài — kiểm tra public pipeline 04/10/2026

Adapter và Studio/API/CLI đã triển khai cho API HTTP JSON riêng, compatible speech endpoint, OmniVoice/VoiceStudio và command. Lượt kiểm tra này dùng source `1d2f915e70d5504d0b2a20c4f3b5c0984dfd3e4a`, giữ nguyên voice/config/server/settings modules; không chứng nhận dịch vụ chưa được cấu hình của người dùng. Parent không chạy runtime tests.

Independent worker chạy trong project riêng qua public Studio/API và compiled CLI. HTTP adapter thuộc auditor nhận request từ Factory và gọi hai giọng Windows English cài sẵn David/Zira để trả **WAV có lời đọc thật**, không phải PCM stub. Adapter này đã tắt sau kiểm tra; các audit project giữ endpoint tạm để lưu provenance, không phải cấu hình mặc định cho người dùng.

## Phạm vi đã kiểm chứng

**15 runtime checks PASS, không assertion FAIL**; gồm:

- CLI configure xuất hiện đúng trong settings Studio; custom field mapping, locale `en-US`, model/voice/options và nguyên văn narration được gửi đúng.
- WAV đầu tiên đo thực3.183917s, cue0–3184ms và35 speech activity intervals; pipeline thực tới `SCENES_READY`.
- Ordinary resume giữ bytes narration/timeline/audio/report/raw/cache và không gọi lại TTS.
- Đổi host bằng settings API chỉ dựng lại phần hình; audio/cache và HTTP count giữ nguyên.
- Đổi giọng và sửa script đưa project về `NEW`; mỗi thay đổi tạo đúng một request mới, giữ lời đọc theo nội dung đã chọn.
- Compatible base `/v1` gọi `/v1/audio/speech` với `input`, `model`, `voice`, WAV format và speed1, tạo speech thật tới `TIMED`.
- Public request đến `DONE` với HTTP503 hoặc thiếu TTS dừng ở `INGESTED`, chờ giọng; không timeline chính thức/final/DONE.
- SRT100ms giữ nguyên text/clock; audio3.1839s không vừa, báo `fit-failed`, không cắt lời hoặc tạo audio được chấp nhận. Đây là probe tới `TIMED`, chưa chạy full-DONE cho ca SRT này.

Có đúng6 HTTP requests:5 speech responses thật và1 HTTP503. Không ASR/native/paid provider, cài backend/model hoặc sửa user project. Creative roles của audit là mock/offline; scene validation và voice chạy code production thật. Không dựng full MP4 trong lượt này, không suy ra chất lượng hình/giọng hay final đa ngôn ngữ từ `SCENES_READY`.

## Cấu hình bàn giao

[API local riêng](../../config/voice.local-api.example.yaml) và [OmniVoice/VoiceStudio](../../config/voice.omnivoice.example.yaml) qua **10/10 schema/loadConfig checks**: hai schema và EN/VI/JA/KO kế thừa đúng provider/endpoint/model/voice. Checker chỉ đọc, không ghi global preset và không gọi endpoint. Tên endpoint/model/voice trong file là ví dụ cần thay theo dịch vụ thực.

[Hướng dẫn kết nối](../EXTERNAL-TTS.md) mô tả direct-WAV contract, field mapping, key environment, timeout, preset, script actual clock và SRT fit. Router VoiceStudio được đối chiếu lại ngày04/10; không đồng nghĩa đã chạy live dịch vụ đó.

## Evidence và giới hạn

Receipt01:31:28UTC, deadline01:46:28UTC; owned audit root33880 terminalexit0 lúc01:40:04.140UTC, example checker36648 terminal0 lúc01:40:05.369UTC. Freeze released01:43:28.465UTC; owned process và5 API project idle, adapter port không còn listener.28 scoped source/config/compiled hashes giữ nguyên. Source projection nghệ thuật thay đổi sau đó là một nhánh riêng, không retag bằng chứng này.

Report và raw requests/WAVs/expected errors/hash/commands/terminal receipts:
`C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/external-local-tts-public-1d2f915-20261004/run-20261004T013128Z/REPORT.md`.

**NOT RUN:** backend riêng của user, live OmniVoice/VoiceStudio, speech VI/JA/KO, actual listening/pronunciation, browser form clicks, full SRT final và full video-quality acceptance. Các lỗi ASR Việt/full-film trước đó vẫn giữ riêng. Source/build và scoped protocol checks không đóng mục tiêu toàn sản phẩm.
