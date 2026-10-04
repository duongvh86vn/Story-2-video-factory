# Kết quả phim thực tế và ba luồng — 04/10/2026

Source đã publish `1d2f915e70d5504d0b2a20c4f3b5c0984dfd3e4a`. [Nhánh sửa artwork/QC](2026-10-04-qc-artwork-repair.md) đã qua các kiểm tra độc lập đã ghi; parent không chạy runtime tests. Kết quả bên dưới bổ sung bằng chứng sản xuất và nghiệm thu, không đóng mục tiêu đầy đủ.

## Phim native ô tô: technical PASS, visual FAIL

Genuine producer71165 normal-resume project cũ, terminal exit0 lúc20:38:41UTC03/10, stateDONE và QC pass. Một artist call thực tế96.527s sửa `s04.comparison`, rồi pipeline dựng lại draft/review/final/QC. MP4 H2641280×72030fps,42.666667s; audio AAC48kHz stereo42.657s và subtitle stream. Final SHA256 `5b5c695e1a522956a6b8482c84adf9d3b0a748c9b4998ac5327ad066aa38a47a`.

Independent whole-story decoded-frame review: **FAIL thị giác/nội dung theo mục tiêu diễn xuất**. Freeze đã sửa bằng nhấn mạnh hai nhóm xe/thành phần đúng nguồn, giữ camera/choreography/clock/static flags; không dùng jitter hoặc whitelist. Tuy nhiên nhãn năm1886, qualifier cơ chế và recap bị ép dẹt; nhãn đè đầu Benz; diễn xuất phần lớn quan sát, chưa đủ nghiên cứu/chế tạo/thao tác. Cần sửa typography/layout và mở rộng hành động có nguồn; không coi QC pass là hoàn thành chất lượng.

Review bao phủ cả5 shots và các movement windows bằng hình decode thực, không xem toàn bộ30fps hoặc nghe audio. Bốn file narration/voiced/report/activity giữ byte so với launch; hash WAV hiện tại đối chiếu voice report đúng, nhưng không có full prelaunch WAV/cache inventory để tuyên bố toàn bộ cache trước/sau giữ byte. Một native call mới được append; pending lịch sử `25e0944f-6ab7-47c7-a230-3ee3e947c965` vẫn UNKNOWN. Phim lỗi9478… và journal prefix giữ nguyên.

Evidence: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/native-car-qc-repair-20261004/` và `native-car-quality-1d2f915-20261004/REPORT.md`. Auditor giữ1604 hashes không đổi. Report persist trễ38s so với deadline; các job kết thúc trước deadline, lỗi thời hạn và helper setup/Unicode đều giữ raw.

## Phim authored ô tô: cảnh đọc sổ

Producer73879, source1d2f915, terminal0/DONE/QC, final SHA256 `319143dad92dbc01b01290cd5780a20cdeb3d69d5d1f92f3b4296a787ef113d2`. Cảnh kết thay thẻ chữ bằng cuốn sổ minh họa: cúi/tiếp xúc trang trước annotation, giữ contact, rồi recovery/react. Observer có áo xanh phân biệt với Benz; script/narration/voice report giữ byte so với phim authored trước.

Independent review cả7 shots: **PARTIAL**. Mechanic và logbook có contact/acting rõ hơn, nhưng cuốn sổ nổi trên bàn; Benz vẫn có đoạn giữ point lâu. Bản này và finding cũ được giữ nguyên.

Bản authored V2 sau finding thật đã tách room/background với desk/midground cùng world-camera, điều chỉnh giấy/bàn và tính lại target/gaze. Producer66665 terminal0 lúc01:08:40UTC04/10, DONE/QC pass; final SHA256 `6cc0334fd190505bd85b49f7b5a559cfb703b3564ddced9001846229f0bee1d4`. Đây là dàn cảnh authored mới, không retag native. Root `temp/art-direction-v22/film-review-v2-car-stick-man-1791075829449`; clip trước không bị ghi đè.

Independent V2 review đã kết thúc trong deadline01:24:15UTC: **PARTIAL toàn phim; support/contact/recovery PASS trong mẫu đã xem**. Auditor xem overview cả7 shots,6 cuts và59 frames36.8–42.6s: sách tiếp xúc bàn, tay chạm trang trước chú giải và hồi phục tư thế. Còn chữ chồng đường viền sách tại38.2,39.4,40.6s; cần tách nhãn khỏi viền và giữ bố cục trong camera move. Không xem toàn bộ30fps hoặc nghe audio. Script/narration/report/master/mix/SRT và50 files voice/cache trùng hai authored phim trước; AAC packet payloads cũng trùng.2664 hashes nguồn/media được giữ nguyên. Report `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/grounded-book-v2-quality-1d2f915-20261004/REPORT.md`; owned jobs exit0 và freeze released. Không dùng kết quả này để thay nativeFAIL hoặc chứng nhận arbitrary inputs/robot/full-film listening.

## Public Studio/API và input: PARTIAL

Independent worker tạo4 project riêng trên Studio source1d2f915, dùng Windows Speech Microsoft David Desktop thật và ASR thật. Factory source không đổi; không provider trả phí hoặc cài backend/model. Các role thiết kế offline/mock được ghi riêng, không gọi native-quality acceptance.

| Phạm vi | Bằng chứng thực tế |
|---|---|
| Script EN | Hai câu nguyên văn; measured3184+3739=6923ms, narration/audio/report thực; DONE/QC pass, MP4 H264/AAC30fps và decode đầy đủ |
| Ordinary script resume | Audio, narration, timeline và cue cache hashes giữ byte |
| SRT | TIMED; cue text/clock giữ nguyên, TTS fit thật; chưa dựng full final riêng |
| WAV | TIMED; audio gốc giữ byte, ASR16 từ khớp mẫu sau normalization; chưa dựng full final riêng |
| WAV+SRT | Attempt exit3/INGESTED vì thiếu WhisperX; giữ bytes input, genuine alignment/mismatch NOTRUN |
| Busy settings | API409PROJECT_BUSY đúng |
| Edit/host/voice/locks/missing-TTS/fit-failure/backend-language matrix | Các ca còn lại NOTRUN trong lượt này |

Raw deadline20 phút và worker usage interruption được giữ; không gọi cả matrixPASS. Ba phase sở hữu đã terminal0 vào21:00:54UTC03/10, bốn project idle. Sau khi app báo ordinary usage available, cùng worker chỉ hoàn tất report/ownership, không chạy lại runtime; source freeze release01:05:18UTC04/10. Report: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/public-input-matrix-1d2f915-20261004/run-20261003T205122Z/FINAL-PARTIAL-REPORT-20261004T010131Z.md`.

Mẫu EN16 từ không thay kết quả WAV tiếng ViệtFAIL trước đây hoặc xác minh mọi audio/ngôn ngữ. WAV+SRT cần backend alignment thực hoặc một phương pháp kiểm audio/text/clock được triển khai và nghiệm thu thật; không mock timestamps, viết lại lời hay đổi threshold để vượt gate.

## TTS bên ngoài và phần còn mở

[Contract TTS bên ngoài](../EXTERNAL-TTS.md) đã triển khai: custom HTTP JSON/direct WAV, compatible `/v1/audio/speech`, OmniVoice/VoiceStudio local, command adapter và cấu hình EN/VI/JA/KO. User tự cung cấp endpoint/model/voice của backend; Factory không đoán polling API hoặc cài backend hộ. Live API của user, live OmniVoice và JA/KO vẫn NOTRUN.

Follow-up độc lập [public local-TTS](2026-10-04-external-local-tts.md) đã kiểm15 runtime checks với HTTP bridge trả speech Windows English thật và10 schema/preset checks. Host-only edit giữ audio/cache; sửa giọng/script tạo request mới; resume giữ bytes/count; thiếu TTS/HTTP503 chặn publicDONE. SRT fit negative thực báo lỗi nguyên text/clock. Đây là scope bridge/public contracts, không thay full inputs/ASR Việt/native/full-film acceptance.

Tiếp tục native typography/acting, cả hai bài/cả hai rig, các finding hơi nước, full input/edit/resume/lock matrix, WAV Việt và full-rate watching/listening. Không mark goal complete từ những scoped checks hoặc stateDONE này.
