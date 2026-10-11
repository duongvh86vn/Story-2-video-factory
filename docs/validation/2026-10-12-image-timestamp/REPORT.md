# Kiểm tra ảnh → clip theo timestamp, 12/10/2026

## Kết quả và giới hạn

Đã đọc đầy đủ 24 cảnh của export `flow_doodle/3bec044e0bb441d49c6277acd74ac763`, đối chiếu SRT/job/timeline và hash 24 ảnh gốc +24 ảnh Full HD. Timeline gốc 30 fps, kết thúc129260 ms. Hai gap 28520–29300 và56660–57340 ms được giữ trong manifest. Ảnh gốc, SRT và metadata nguồn không bị sửa.

Ba clip mẫu 1920×1080, 60/1 fps, im lặng; không chèn chú thích mới:

| Ảnh | Timestamp gốc, ms | Frame60fps | Số frame | Chuyển động |
|---|---|---|---|---|
| 0002 | 5760–9600 | 346–576 | 230 | Bánh quay, tái sử dụng layer cũ |
| 0006 | 29300–33220 | 1758–1993 | 235 | Đầu gật nhẹ; tay/body vẫn ảnh gốc |
| 0013 | 57340–64840 | 3440–3890 | 450 | Bốn bánh răng, tái sử dụng layer cũ |

Biên60fps được làm tròn từ clock tuyệt đối, sai số mẫu tối đa6.667ms; giới hạn lý thuyết8.333ms mỗi biên. Giữ gap khi ghép. Không tuyên bố thời lượng MP4 bằng timestamp millisecond tuyệt đối.

Các MP4: ffprobe đúng kích thước/rate/số frame; decode FFmpeg exit0, random seek PNG exact, browser errors0. Kiểm tra pose0006: 92544 pixel thay đổi trong hộp đầu `[95,275]–[495,728]`, 0 pixel thay đổi ngoài hộp. Head part là crop ảnh nguồn xoay quanh cổ, không phải tái sinh mặt/diễn xuất/lip-sync. Mỹ thuật và mép mask chưa được người dùng duyệt.

Artifact local dưới `runtime/image-motion/timestamp-flow-60-v1`: clips0006/0013, manifest import, source-image-check, log build/test và probe PNG. Clip0002 đã xuất lại bằng cache contract cuối tại `runtime/image-motion/timestamp-flow-60-v2/clip-0002-ccf25b0bdac3ec01`. Các artifact media không được đưa vào Git. Recipe0006 có trong `docs/topics/motion-recipes/flow-doodle-0006-head.json`.

CLI source-part chạy cả với matte đã có và tự tạo matte polygon, cho cùng layerCacheKey `0d78db9efb909c2fd275b4284e469c2cfbd4f4b074bf4783ddfd9e53c5730e9c`. CLI xuất0002 chạy lại báo `cached:true`, giữ nguyên hash MP4 `334a5626ad5554312521793730af53dfb8ae1ac28451bf2b069895ed697bd867` và không render lại.

## Verification đã chạy

- `node --import tsx --test tests/image-motion-timestamp.test.ts`: 4pass, 0fail. Kiểm rounding tích lũy, retime/copy-safe, receipt cache sai, ảnh/SRT/hash/job/gap.
- Regression `image-motion`, `image-motion-editor`, `image-motion-character`, `image-motion-arms-api`: 17pass, 0fail.
- `npm run build`: core TypeScript + Studio TypeScript + Vite exit0 sau source cuối.
- `npm run test:typecheck`: exit1, còn đúng2 lỗi TS18048 cũ ở untracked `tests/native-support-gait-continuity.test.ts:13`. Không sửa file đó và không tuyên bố toàn repo PASS.
- Render local0002/0006/0013 exit0; source/source-fullhd bytes được kiểm lại khớp 48 hash ban đầu.

## Review qua9router và phân công

Một lượt `tester` → response model `gpt-6-luna`, source-only, 4875prompt +579completion =5454tokens. Không gửi ảnh, không gọi TTS, không sửa code tự động. Finding về thiếu kiểm source frame bị bác bỏ vì `validateClipClock` đã so từng biên với rounding trước import. Duplicate scene vốn bị count/coverage chặn, đã thêm Map/unique guard rõ ràng hơn. Đã thêm kiểm realpath/output-path và identity/media receipt khi reuse cache. Test mới kiểm receipt không đạt bị từ chối; CLI cache contract cuối đã chạy thực tế.

Lượt `coder` narration trước khi người dùng đổi trọng tâm dùng12364tokens, đề xuất đang dừng cùng phần narration chưa bàn giao. Tổng hai lượt9router ghi nhận cho chặng đang làm:17818tokens. Render/cắt layer/hash/cache chạy local, không có image-generation hoặc TTS API trong chặng timestamp.

## Chưa hoàn thành

21ảnh còn lại cần recipe/chuyển động; tay0006 chưa cử động. Chưa có xuất hàng loạt/UI timestamp, xử lý resume của attempt thất bại, ghép voice/full timeline, approval mỹ thuật, review/repair/final/QC. Các report vẫn productionReadyfalse/qualityAcceptedfalse; không tạo final/DONE. Kết quảV1 không dùng cho nghiệm thu mới.

Tiến độ triển khai toàn scope ước tính46% (mốc trước45%). Đây là ước lượng code/công cụ, không phải phần trăm chất lượng video hay nghiệm thu. Mẫu chuyển động thực tế:3/24ảnh; chưa nghiệm thu mẫu nào.
