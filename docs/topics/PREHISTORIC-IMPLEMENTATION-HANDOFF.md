# Bàn giao source WIP — Cuộc sống thời tiền sử

Ngày 06/10/2026. Nhánh `codex/prehistoric-life`; chưa nghiệm thu chủ đề. Đặc tả chính: [CUOC-SONG-THOI-TIEN-SU.md](CUOC-SONG-THOI-TIEN-SU.md).

## Đã có trong source

- Mode `story` thật qua config, ingest, API upload/editor, CLI, script authoring và pipeline; `script`/`wav` cùng contract hiện có. Nội dung là dữ liệu, không thực thi lệnh từ tài liệu.
- Lựa chọn chủ đề tiền sử với hai model Lila/Karo đóng vai trong câu chuyện. Giữ tên/vai có nguồn, không đổi câu chuyện thành bài máy móc hoặc buộc cả hai nói giọng narrator.
- Mặc định các role model qua 9router `http://127.0.0.1:20128/v1`; key qua `MODEL_GATEWAY_KEY`, không commit `.env`. Coder tư vấn và vision đọc ảnh Karo đã gọi thật; review atlas trả chưa đạt, evidence ở `docs/topics/reviews/`. Đây là kiểm ảnh tĩnh; runtime cần evidence riêng.
- Cache authoring tách khỏi phiên bản model hình ảnh để thay artwork không viết lại lời kể đã chấp nhận.
- Bốn ảnh cận và hai sheet 6688×3760 lưu bền vững. Cận da ấm là tạo hình chính; hai sheet mới là tham khảo, không tự pha mặt trắng/ủng/áo lông vào model chính.
- PNG tách nền, atlas ứng viên, phép đo alpha, manifest hash/trạng thái, bản ráp nghỉ SVG. Sau review, bản ráp dùng mask trên cutout toàn thân để giữ màu/contour tốt hơn atlas; chưa tái dựng phần che khuất. Atlas và bản ráp đều chưa được chấp nhận; chưa phải animation rig.
- Trang `/api/topics/prehistoric-life/compare`, `?variant=assembly`, API topic/readiness; launcher `scripts/start-studio.ps1`.

## Điều kiện hiện đang chặn

`productionReady=false` và guard `requireTopicProductionReady()` chặn pipeline topic **trước model/TTS**. Bộ vector cũ bị người dùng loại; chưa có replacement rig đủ góc, nét mặt, tóc/áo và diễn xuất. Không gỡ guard để cho pipeline chạy bằng bộ đã bị loại. Generic project không chọn topic vẫn dùng pipeline hiện có.

`packages/animation/forest-tribe-art.ts`, các preview vector và plate rừng tô phẳng là thử nghiệm bị loại/chưa đạt; không lấy các file ấy làm chuẩn nghiệm thu. `reference-puppet.ts` hiện là hiệu chỉnh pose nghỉ tĩnh; animation compiler chưa dùng atlas mới.

## Việc triển khai tiếp theo

1. Chỉnh bản ráp toàn thân bằng ảnh nguồn: đầu/cổ/áo nối đúng, tỷ lệ đầu–thân–chân và bàn tay/chân sát mẫu. Không đổi texture và sắc cam da sang màu nhợt.
2. Tách phần trước/sau của tóc, râu, nét mặt, dây lưng và vạt áo; đo pivot/crop/occlusion, giữ hash của nguồn. Atlas hiện chứa cả mặt đóng sẵn nên chưa thể làm gaze/lip activity đúng.
3. Làm góc trước/ba phần tư/nghiêng/lưng, trang phục và silhouette tương ứng. Không dời mắt/mirror cả đầu rồi gọi multi-view.
4. Đưa lớp vào rig dùng chung, sửa metrics theo tỷ lệ đo từ mẫu. Tay trái/phải là phía cơ thể; nối xương ẩn và nét cong, giữ độ dài/reach. Chân trụ, hướng khuỷu/gối, grip và điểm đỡ phải ổn định.
5. Timeline seek được theo thời gian tuyệt đối: mắt dẫn đầu/thân; chuyển trọng lượng, tóc/vạt theo sau; chớp mắt/miệng đúng speaker và audio. Không kéo dãn đầu/áo nguyên tấm để giả diễn xuất.
6. Làm màu cảnh ngày/chiều/đêm với texture và chiều sâu theo sheet. Plate vector hiện có chưa đạt mỹ thuật.
7. Tích hợp rig replacement vào cast/story-to-performance và scene renderer, kèm cache/lock/resume. Chỉ đổi readiness khi bộ rig có đủ khả năng thật.
8. Bàn giao model test chạy ba mode, EN/VI/JA/KO và TTS external/local; kiểm thực tế video, audio/subtitle, nguồn, gaze, tiếp xúc và rebuild/resume. Không dùng test V1 hoặc ảnh tĩnh để báo đã nghiệm thu.

## Kiểm tra đã thực hiện / chưa thực hiện

`npm run build` (bao gồm typecheck core và Studio) và `npm run test:typecheck` đã pass trong đợt triển khai này. Chỉnh source tiếp phải chạy lại các kiểm tra. Không chạy npm test hoặc ca runtime tạo tập ở đợt chỉnh hình này. Theo yêu cầu người dùng, runtime/nghiệm thu giao model khác.

Để model test nhận đúng môi trường, dùng launcher và đường dẫn worktree trong mục 10 của đặc tả chính. Dữ liệu server 8850 đang tách tại `runtime/prehistoric-life/projects`; không ghi đè project cũ trong checkout D:. Câu chuyện tập đầu chờ người dùng; không tự chọn demo thức ăn thành nội dung sản phẩm.
