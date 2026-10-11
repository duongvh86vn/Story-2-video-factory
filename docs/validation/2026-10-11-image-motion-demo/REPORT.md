# Kết quả demo ảnh gốc → chuyển động

Ngày 11/10/2026. **Demo vật thể đã xuất; chưa nghiệm thu chất lượng video toàn hệ thống.**

Người dùng cho phép dùng bộ ảnh cũ `flow_doodle/3bec044e0bb441d49c6277acd74ac763`. Bản giao: `runtime/image-motion/demos/old-project-motion-v3/demo.mp4` trong worktree C; file video ở local, không được Git theo dõi. Lệnh chạy lại và môi trường ở `docs/topics/IMAGE-MOTION-DEMO.md`.

## Những gì có trong clip

- Hai ảnh nguồn 0002/0013 được sao chép nguyên byte, cùng SHA-256 sau khi render.
- Bánh đà: xoay phần bề mặt trong ellipse đăng ký thủ công. Vành ngoài, xích, khung, bánh đường và chữ đứng yên.
- Bốn bánh răng rời: cắt alpha một lần bằng key nền trong các vùng đã đo; xoay quanh tâm, tái sử dụng cutout. Vùng nền lộ ra tại vị trí cũ được vá bằng màu lấy từ nền lân cận; không có ảnh sinh mới.
- Không đổi mặt/nét vẽ/trang phục, không zoom cả ảnh để giả chuyển động. Không nối TTS hoặc lời kể vào clip này.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| Browser red → green: marker quay đúng pivot, vùng ngoài giữ nguyên, random/reverse seek | PASS | Fixture kiểm tra compositor, không nghiệm thu diễn xuất người |
| Ghost red → green: xóa viền anti-alias tại vị trí bánh răng cũ | PASS | Nền đơn giản trong vùng được chọn; không tách vật thể phức tạp tùy ý |
| Focused tests | 2 PASS, 0 FAIL, exit 0 | Không chạy toàn bộ suite rig/pipeline |
| `npm run build` | PASS, exit 0 | Chạy trên working tree còn các thay đổi rig cũ ngoài commit demo |
| `npm run test:typecheck` | FAIL, exit 2 | Hai TS18048 ở test rig chưa commit `native-support-gait-continuity.test.ts:13`; không đổi test/rig đó trong slice này |
| Media probe | 1920×1080, H.264/yuv420p, 60/1 fps, 600 frame, 10.000 s, 1,790,434 byte | Không có audio, đúng phạm vi demo im lặng |
| Decode toàn clip bằng FFmpeg | PASS, 0 lỗi giải mã | Không thay thế duyệt độ đẹp/mượt |
| 10 mốc PNG Canvas | 0 pixel đổi ngoài vùng chuyển động cho phép ở mọi mốc; frame đầu mỗi cảnh khớp ảnh gốc | Vùng cho phép gồm fringe 2 px; không áp dụng byte-exact cho MP4 có nén |
| Tua 6250 → 9800 → 100 → 6250 ms | PNG trùng byte | Một chuỗi kiểm tra thực tế, không tuyên bố mọi cấu hình chưa thử |
| File input trước/sau | Hai bản gốc/copy/hash trùng | Chỉ hai ảnh đã dùng |

Evidence: `qc-report.json`, `manifest.json`, `source-hashes.json`, `focused-green.txt`, `build.txt`, `test-typecheck.txt`, `browser-red.txt`, `ghost-red.txt`. Bản log text trong Git chuyển CRLF → LF và bỏ khoảng trắng ở dòng trống; log gốc giữ tại `runtime/image-motion/evidence/`. Hai frame đã xem: `drive-disc-0600.png` và `gears-6250.png`; các frame còn lại ở output local.

Lần v1 dừng ở 4800 ms vì phép kiểm tra yêu cầu hình khác ảnh gốc ngay tại thời điểm đã quay đủ hai vòng. Chọn mốc probe không trùng chu kỳ để kiểm tra motion; không đổi chuyển động để né lỗi. Lần v2 xuất được nhưng quan sát còn viền mờ tại vị trí bánh răng cũ. Lần v3 sửa đầy đủ footprint cùng fringe 2 px, test ghost xanh và clip được render lại. Những bản trước được giữ local để chẩn đoán; bản giao là v3.

## Việc còn thiếu

1. Người dùng xem MP4 ở tốc độ thật và đánh giá chất lượng hình/chuyển động. Chưa so sánh định lượng hoặc xác nhận đạt video Facebook tham khảo.
2. Mask editor/pivot/repair trong Studio; tách tự động có sửa tay; xử lý nền và phần bị che trên ảnh người.
3. Demo tay thẳng, lửa, chuyển động nhân vật từ ảnh khác. Bánh răng quay không chứng minh tay/chạy/biểu cảm đã đạt.
4. Nối renderer ảnh vào câu chuyện → kịch bản, kịch bản nguyên văn, WAV; audio clock, phụ đề, voice EN/VI/JA/KO, local/external TTS, cache/resume/final/QC.
5. Kiểm tra bảo mật/asset allowlist/locks của luồng sản xuất. Demo độc lập không nới validator scene hiện có.

**Tiến độ ước tính toàn dự án vẫn khoảng 40%, +0 điểm nghiệm thu trong commit demo.** Có thêm một slice chạy thật, nhưng chưa hoàn thành factory hoặc được người dùng duyệt mỹ thuật. Không dùng test V1/clip rig cũ để tuyên bố luồng mới DONE.
