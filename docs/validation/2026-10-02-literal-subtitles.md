# Phạm vi kiểm tra literal subtitles

Candidate `literal-tx3g-1` sau commit689722e, được parent triển khai và model Descartes kiểm tra độc lập. Contract: [LITERAL-SUBTITLES.md](../LITERAL-SUBTITLES.md). Parent chạy build; test runtime thuộc model độc lập theo yêu cầu người dùng.

## Lịch sử còn nguyên

- Matrix actors trước đó vẫn **FAIL**: presenter thay cho actors, ASR Việt sai và text khi extract mất whitespace. Không dùng kết quả media kỹ thuật làm PASS actors.
- Diagnostic 12 fixtures: SRT→mov_text chỉ 1/12 text exact; clock12/12. ASS/WebVTT không giải quyết toàn bộ. Giữ raw evidence trước sửa.
- Candidate đầu **16/17** test mới, FAIL cue65535 bytes; media/captions/pipeline liên quan **13/13 PASS**. Typecheck được sửa annotation test rồi PASS, không đổi assertions. Lượt typecheck muộn có thiếu identity capture, được ghi trong báo cáo.
- Style-padding follow-up **17/19**, FAIL hai cue65534/65535 bytes; typecheck0, assertions17 gốc nguyên vẹn. 38 identity quan sát terminal, không kill process khác. Report hoàn thành quá bound23 giây, không tuyên bố đúng hạn.

Báo cáo độc lập đầy đủ và log lưu ngoài repo ở `.codex/task-state/story-video-v22`: `independent-literal-subtitles.md`, `independent-literal-subtitles-followup.md` và các thư mục evidence có timestamp. Không chép fixture MP4/audio, đường dẫn project người dùng hoặc report đang chạy thành release evidence.

## Candidate hiện tại

Bỏ style-padding; dùng placeholder ASCII theo dòng ngắn, tính LF vào kích thước mẫu, kiểm tra toàn bộ bytes và ms clock, rồi thay payload có cùng chiều dài bằng UTF-8 canonical. Giữ audio/video bằng mux, xác minh lại samples sau mux. Bản sửa đã build qua; follow-up độc lập **26/26 PASS**, gồm19 assertions giữ nguyên và7 ca1000/1001/4094/4095/4096/8191/8192 bytes. Hai mẫu65534/65535 giữ toàn bộ UTF-8 và clock;65536 bị chặn.

Runtime chạy một lượt14:34:04.856–14:34:28.846 UTC, exit0; test:typecheck14:34:33.787–14:34:41.276, exit0. Source-before14:33:51.485/source-after14:34:57.961, zero drift trong292 files (176TS).44 identity quan sát terminal, no kills; watchdog có thể bỏ lỡ process cực ngắn, được phân biệt với process-close handles. Report14:38:06 trước hard bound14:40:33. Không chạy full suite hoặc lặp lại contracts13 ca trong follow-up cuối. Test SHA `8744897a0161ec567a0e45200d00c0cd02d61459ce6a8e1e8f35910eef3cf85e`; literal.ts SHA `a7dba154139b2aae5beddb8a77b2b9ae9cac96860855b3211ad79d48ed126293`.

Báo cáo `independent-literal-subtitles-linebound.md`, evidence `literal-subtitles-linebound-evidence-20261002-143233`; fixtures giữ ở ignored `temp/literal-subtitles/run-003`. Byte counts của samples cũ xác nhận15 bytes dư là LF, không phải ký tự x bị nhân đôi. Trích đoạn nguồn FFmpeg chỉ được đọc, không thực thi.

Điểm đã chứng minh ở hai lượt trước, không mở rộng sang phạm vi khác: stored UTF-8 và clock của12 literals thông thường; actual soft/both cho EN/JA/KO locale tags; SRT/source/audio giữ nguyên; H264/AAC decode; isolated stream-copy packet hashes; tamper và clock mismatch bị chặn; NUL/oversized và stale fingerprint gates. Đây là fixtures FFmpeg thật, không phải giọng JA/KO thật hoặc nghiệm thu toàn phim.

**FFmpeg-extracted SRT vẫn biến đổi leading whitespace.** Validator dùng bytes trong stored sample; SRT xuất riêng từ narration giữ text. Stored-text preservation và extracted-text preservation là hai phép kiểm tra khác nhau; không đổi tiêu chí extraction cũ thành PASS.
