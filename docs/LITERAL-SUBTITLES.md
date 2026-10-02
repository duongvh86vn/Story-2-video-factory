# Phụ đề nguyên văn trong MP4

`literal-tx3g-1` tạo một track timed text riêng rồi stream-copy vào MP4. Nội dung narration không đi qua parser ASS của FFmpeg khi tạo track soft subtitle. Placeholder ASCII cung cấp container và clock; sau khi kiểm tra offset, kích thước, nội dung mẫu và millisecond clock, chương trình thay bằng UTF-8 có cùng số bytes. Audio/video không được sửa bytes bằng cơ chế này. Placeholder dài có các dòng ngắn; LF được tính sẵn vào số bytes dành cho payload, không đặt LF cuối text. Toàn bộ placeholder được kiểm tra trước khi thay, không điều chỉnh text hoặc clock của narration.

Giới hạn: một cue có 1–65535 bytes UTF-8, không NUL. Không tự cắt, trim hoặc sửa nội dung để vừa giới hạn. Mẫu sai kích thước, offset, text hoặc clock chặn hoàn thành media. `soft` và `both` dùng track này; SRT xuất riêng vẫn lấy trực tiếp canonical narration. Locale `en-US`, `ja-JP`, `ko-KR` được ghi thành `eng`, `jpn`, `kor` trong track. Burned captions và cách trình bày của player là hai phần cần đánh giá riêng.

FFmpeg có thể biến đổi text khi **trích xuất lại** track, dù bytes đã lưu nguyên văn. Vì vậy không dùng một lượt SRT extraction làm bằng chứng rằng stored samples thiếu ký tự, cũng không gọi kiểm tra stored samples là PASS cho yêu cầu extracted-text. Validator nội bộ đọc trực tiếp sample; model test dùng FFprobe offsets, file reads và timestamp theo time base để xác minh độc lập.

Media version tham gia fingerprint tổng, không tham gia fingerprint narration. Resume project cũ sẽ dựng lại phần phụ thuộc trong khi giữ audio/clock hợp lệ. Sau mux, chương trình kiểm tra lại samples trong MP4 trước khi ghi media report và tiến tới QC/DONE.

## Phạm vi bằng chứng

Diagnostic trước sửa: SRT → mov_text chỉ giữ text chính xác 1/12 fixture, clock 12/12; ASS/WebVTT không giải quyết đầy đủ. Các báo cáo lỗi cũ được giữ.

Candidate đầu: **16/17** test mới PASS, **13/13** media/captions/pipeline liên quan PASS. Lỗi còn lại là cue đúng 65535 bytes thất bại ở encoder cài trên máy. Lượt sửa dùng style padding: **17/19** PASS, hai mẫu 65534/65535 bytes vẫn dư 15 bytes và bị chặn; giữ nguyên assertions. Kiểm tra [SRT demuxer của đúng FFmpeg snapshot](https://github.com/FFmpeg/FFmpeg/blob/9970dc32bf/libavformat/srtdec.c) cho thấy buffer dòng 4096 bytes và LF được thêm sau mỗi chunk; [hàm đọc dòng](https://github.com/FFmpeg/FFmpeg/blob/9970dc32bf/libavformat/subtitles.c) giải thích vì sao dòng placeholder quá dài bị tách. Bản sửa hiện dùng các dòng ngắn có LF được tính sẵn; build qua, follow-up độc lập **26/26 PASS** và test:typecheck0. Giữ nguyên19 assertions, thêm7 ca quanh line/chunk boundaries; không giảm input hoặc đổi ngưỡng. [Phạm vi](validation/2026-10-02-literal-subtitles.md).

Các ca đã qua độc lập ở candidate đầu gồm whitespace đầu/cuối, nhiều dòng, braces, backslashes, markup, emoji và JA/KO/VI; clock millisecond; sáu mux soft/both; video/audio decode và packet integrity; tamper/clock mismatch; chặn NUL/oversized; resume giữ narration. Chúng không chứng minh chất lượng giọng, nội dung ASR, thiết kế phim hoặc video actors đã nghiệm thu toàn bộ.

Lệnh nghiệm thu cho model test:

```powershell
node --import tsx --test --test-concurrency=1 tests/literal-subtitles.test.ts
npm.cmd run test:typecheck
```

Đây là test có FFmpeg thật, không thuộc công việc test runtime của parent. Không sửa assertions hoặc xóa lịch sử lỗi để công bố PASS.
