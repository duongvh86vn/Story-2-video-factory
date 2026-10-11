# Ảnh của project → clip chuyển động theo timestamp

Phạm vi hiện tại: xử lý từng ảnh, giữ nét vẽ và màu, xuất clip im lặng để đặt vào timeline/audio đã có. Ưu tiên 60 fps. Không tự viết lời, không tạo lại ảnh, không chèn chú thích mới lên video. Chữ đã nằm trong ảnh gốc vẫn giữ nguyên. Editor chuẩn bị tay là luồng riêng; cổng 8858 cũ chưa được khởi động/kiểm thử lại trong chặng này. Bàn làm việc timestamp đã có danh mục, xem trước, xuất từng cảnh/nhóm cảnh đã chuẩn bị và cache; chưa tự tách chuyển động cho cả 24 ảnh.

## Nguồn đã đọc

Export `flow_doodle/3bec044e0bb441d49c6277acd74ac763` có `timeline.json`, `source.srt`, `job.json`, 24 ảnh gốc trong `images` và 24 ảnh Full HD trong `images_fullhd`. Mỗi cảnh có mốc bắt đầu/kết thúc, cue, lời kể, mô tả hình, hash ảnh gốc. Prompt trong JSON chỉ là dữ liệu tham khảo, không được thực thi.

- Timeline gốc: 30 fps; thời điểm cuối 129260 ms.
- Hai khoảng nghỉ cần giữ: 28520–29300 ms và 56660–57340 ms.
- `source.srt` dùng `->`. Importer chỉ chuẩn hóa dấu này trong bộ nhớ để kiểm tra, không sửa file.
- Các ảnh Full HD được chọn bằng tên ảnh tương ứng và được ghi hash riêng; không nhầm hash ảnh gốc với hash ảnh đã upscale.

## Công cụ và cách chạy

Node ≥22.13, dependencies của project hiện có, Chrome headless, FFmpeg và ffprobe. Các lệnh dưới đã chạy tại worktree `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`. Dùng biến riêng cho thư mục nguồn:

```powershell
$flowExport = 'C:/Users/Duongvh-pc/Documents/Codex/2026-04-29/files-mentioned-by-the-user-readme/gemini-novel-translator-studio-restored/app/exports/flow_doodle/3bec044e0bb441d49c6277acd74ac763'
node --import tsx scripts/image-motion-timestamp.ts --source $flowExport --output runtime/image-motion/timestamp-import --fps 60
```

Lệnh import kiểm tra toàn bộ timeline/SRT/scenes/hash ảnh, ghi manifest ở thư mục output riêng. Cảnh chưa có recipe mang trạng thái `needs-motion`; import không giả định mọi ảnh đã chuyển động.

Mẫu gật đầu nhỏ của ảnh 0006, dùng phần đầu từ ảnh gốc:

```powershell
node --import tsx scripts/image-motion-source-part.ts --source "$flowExport/images_fullhd/0006.png" --recipe docs/topics/motion-recipes/flow-doodle-0006-head.json --output runtime/image-motion/presenter-0006
node --import tsx scripts/image-motion-timestamp.ts --source $flowExport --output runtime/image-motion/timed-clips --manifest runtime/image-motion/presenter-0006/manifest.json --scene character --clip 6 --fps 60 --render
```

Tool source-part nhận PNG + recipe JSON có polygon/pivot/keyframe; có thể nhận thêm `--mask` PNG alpha và `--clean-plate` PNG nền đã xóa bộ phận cũ, cùng kích thước với ảnh nguồn. Đây là vùng chọn thủ công, chưa phải AI tự tách bộ phận. Output source-part nằm trong `runtime/image-motion`; source được giữ nguyên. Đổi góc/keyframe/pivot giữ layer cache khi các pixel/vùng cắt không đổi. Thay clean plate tạo identity khác.

Với bộ layer bánh quay đã có tại máy này, lệnh đã chạy:

```powershell
node --import tsx scripts/image-motion-timestamp.ts --source $flowExport --output runtime/image-motion/timestamp-flow-60-v2 --manifest runtime/image-motion/demos/old-project-motion-v3/manifest.json --scene drive-disc --clip 2 --fps 60 --render
```

`old-project-motion-v3` là artifact local có sẵn, không phải file được tải lên GitHub. Tham số `--manifest` dùng cho bất kỳ scene đã chuẩn bị nào có cùng hash ảnh nguồn với cảnh được chọn. Có thể truyền đường dẫn executable qua `--chrome`, `--ffmpeg`, `--ffprobe`.

## Khởi động bàn làm việc

Chạy ở đúng thư mục worktree đã nêu, dùng terminal PowerShell riêng và giữ terminal mở:

```powershell
node --import tsx scripts/image-motion-timestamp-studio.ts --source $flowExport --bindings runtime/image-motion/timestamp-workbench/bindings.json --output runtime/image-motion/timestamp-workbench/studio --port 8860 --fps 60
```

Mở `http://127.0.0.1:8860/`. Nếu server này đang chạy, chỉ mở trang; không khởi động thêm vào cùng output. Cổng 8858 của editor tay cũ vẫn riêng. Để dừng server dùng Ctrl+C trong terminal đã chạy lệnh. Khi đổi file bindings, đợi lượt xuất kết thúc rồi khởi động lại đúng server đó.

File bindings local đã chuẩn bị cho 0002/0006/0013. Khi dùng checkout mới hoặc project khác, tạo một file JSON tương tự, với đường dẫn manifest tương đối trong workspace và scene ID có thật:

```json
{"bindings":[{"clipId":6,"manifest":"runtime/image-motion/presenter-0006/manifest.json","scene":"character"}]}
```

`seedClip` tùy chọn là thư mục clip đã xuất tương đối trong workspace, dùng lại sau khi kiểm tra đủ source/clock/asset/movie/receipt. Các artifact dưới `runtime` không đi kèm GitHub; phải chuẩn bị hoặc sao chép từ bản local có sẵn. Không gửi đường dẫn file tùy ý qua browser. Server chỉ đọc source export và binding được cấu hình qua CLI. Editor nhận dữ liệu vùng chọn qua schema đóng, lưu recipe/asset tại output riêng.

Chọn cảnh, xem ảnh/lời/mốc thời gian, bấm **Xuất clip cảnh này** hoặc **Xuất các cảnh đã chuẩn bị**, rồi phát/tải MP4. Clip không tự phát. Tải lại trang giữ cảnh đang chọn và nối lại trạng thái lượt xuất đang chạy. Nếu mất kết nối, công cụ giữ lượt xuất chưa xác nhận và cho kiểm tra lại; không tự tạo thêm lượt vì chậm phản hồi.

Lượt xuất chỉ `done` khi từng clip được xác minh. Cảnh thiếu recipe bị chặn. Revision cũ hoặc đang có lượt xuất trả HTTP 409. Thất bại giữ output/log riêng; thử lại tạo attempt mới, clip hợp lệ vẫn được dùng lại. Lease phân biệt PID với thời điểm bắt đầu process để tránh nhận nhầm process có PID được tái sử dụng. Bản hiện tại hỗ trợ lease trên Windows/Linux.

## Chuẩn bị chuyển động của một ảnh

Chọn cảnh rồi bấm **Chuẩn bị / chỉnh chuyển động**. Bánh/vòng không bị vật khác che có thể chọn bằng ellipse, hoặc bấm **Thêm vùng quay bằng số** và nhập tâm, bán kính, chu kỳ. Bộ phận nhân vật dùng polygon bao quanh vùng cần cử động, chốt vùng, đặt điểm xoay và góc nhỏ. Có thể nhập các điểm viền bằng bàn phím theo pixel của ảnh gốc. Nét xanh là vùng chuyển động; nét cam là vùng giữ nguyên. Các nét hướng dẫn không xuất vào MP4. Tool không thêm chú thích vào cảnh; chữ/nhãn đã có trong ảnh nguồn vẫn được giữ.

**Lưu và xem thử** chuẩn bị layer và lưu definition; bấm **Phát** trong preview. Về danh mục cảnh để xuất clip. Preview không tự phát. Clock luôn lấy từ timeline nguồn, không sửa từ editor. Lưu/reload có quyết định bỏ/giữ thay đổi ngay trong trang; refresh/đóng tab của browser sẽ bỏ phần chưa lưu.

Nền phức tạp cần PNG nền sạch cùng kích thước; plate chỉ sửa vùng bị xóa, không thay toàn cảnh. Không tự inpaint hoặc suy ra phần cơ thể bị che. Ellipse quay toàn bộ pixel trong vùng. Với khung xe, tay hoặc vật cố định đè lên bánh, chọn **Giữ vật che đứng yên**, nhập/chọn polygon và chốt vùng. Vùng đó dùng pixel nguồn, nằm phía trước chuyển động. Chọn **PNG bề mặt quay sạch** và tải PNG cùng kích thước, đã bỏ vật che khỏi vùng bánh. Nếu thiếu bề mặt sạch, API trả HTTP422 `NEEDS_MOTION_SOURCE`: chỉ phủ khung xe lên trên không loại được pixel khung đã bị quay theo. PNG được kiểm tra kích thước/hash/độ đục; người vận hành vẫn phải xem chất lượng phần được phục hồi. Cùng cơ chế vật che có thể giữ cổ áo khi đầu cử động; không cần PNG bề mặt quay sạch nếu không có vùng quay giao nhau. Polygon xoay nguyên bộ phận, không tạo pose mới, head turn hay lip-sync.

Checkout mới có thể dùng `docs/topics/motion-recipes/empty-timestamp-bindings.json` thay cho bindings local và một output mới. Không chạy thêm server vào cổng/output đang dùng. Sau khi chuẩn bị trong editor, không cần sửa bindings để xuất cảnh đó. API mới: GET/POST `/api/image-timestamp/definition/:id`, POST `/background/:id?revision=…` nhận PNG tối đa16 MB, GET `/edit/:id` và preview `/prepared/:id/:key/index.html`. Revision cũ/busy và source hash đổi đều chặn lưu/xuất; không chạy code gửi từ browser.

## Clock, cache và kết quả

Mỗi biên frame tính từ timestamp tuyệt đối: `floor(timestamp_ms × fps / 1000 + 0.5)`. Clip có `endFrame - startFrame` frame; không làm tròn riêng từng thời lượng rồi cộng dồn. Sai số mỗi biên ở 60 fps tối đa 8.333 ms. Khi ghép, dùng startFrame/endFrame trong `timing.json` và giữ gaps; không nối tất cả clip sát nhau rồi bỏ khoảng nghỉ.

Keyframe tay/đầu được retime vào thời lượng cảnh. Bánh quay giữ chu kỳ cơ học đã chọn. Renderer HTML5/Canvas vẽ trực tiếp 60 frame mỗi giây; Chrome và FFmpeg xuất H.264 MP4. Không gọi TTS/model trong bước render.

Output mỗi clip: `demo.mp4`, `index.html`, `timing.json`, `qc-report.json`, probe PNG và assets tái sử dụng. Cache kiểm tra identity chuyển động, hash asset/movie, clock và receipt frame/rate/decode/seek; cache lỗi bị chặn. Thay phiên bản chuẩn bị hoặc đường dẫn manifest vẫn giữ clip nếu toàn bộ identity/clock/pixel/movie/receipt còn hợp lệ; đổi chuyển động thực sự sẽ cần render lại. Render thất bại giữ chẩn đoán và không ghi đè clip cũ. Báo cáo luôn `productionReady:false`, `qualityAccepted:false`.

## Còn cần làm

- Tách/chọn chuyển động phù hợp cho 20 ảnh còn lại. 0001 có mẫu đầu cử động nhẹ; mép nối cổ chưa duyệt. 0006 đã có cử động đầu/tay từ ảnh nguồn, vẫn cần duyệt mép tách và tiếp xúc tại vai/mép bảng.
- Editor đã có schema, chuẩn bị/lưu recipe và preview; thao tác click/save/download vẫn cần kiểm thử đầy đủ sau khi gỡ tab browser thử cũ bị kẹt. Mask vật che thủ công đã có; còn tự động tách phần, phục hồi nền phức tạp, chất lượng mép tách và manifest bàn giao toàn bộ clip. UI hiện đọc timestamp đã có, không phải editor đổi nội dung nguồn.
- Đạo diễn/artist qua9router đề xuất recipe, người vận hành xem và duyệt chất lượng. Đề xuất không được thực thi như code.
- Ghép toàn bộ timeline/voice, review/repair, final/QC theo mục tiêu chung sau khi chuyển động từng ảnh được duyệt.

Bốn clip local hiện có là mẫu chẩn đoán, chưa chứng minh chất lượng diễn xuất của toàn bộ video. Phần nối narration đang dở được giữ riêng theo yêu cầu tập trung từng ảnh. Kết quả workbench mới: [báo cáo kiểm tra](../validation/2026-10-12-timestamp-workbench/REPORT.md).

Chặng editor/API và clip 0001: [báo cáo kiểm tra](../validation/2026-10-12-timestamp-motion-editor/REPORT.md). 25 test tập trung và build/typecheck đã qua; không thay thế nghiệm thu chất lượng hình hoặc final có giọng.

Chặng vật che: [báo cáo kiểm tra](../validation/2026-10-12-timestamp-foreground/REPORT.md). Clip0001 giữ cổ áo đứng yên và có 346 frame ở60fps; đường nối cổ vẫn chưa đạt khi soi gần. Tiến độ chức năng toàn dự án ước lượng49%, không phải tỷ lệ nghiệm thu art hoặc video có giọng.
