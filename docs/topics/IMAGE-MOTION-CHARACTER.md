# Tay mới cho nhân vật từ ảnh gốc

Ngày 11/10/2026. Có editor thay tay trong project ảnh, CLI chuẩn bị và xuất clip thử. Chưa nối bộ layer này vào video câu chuyện. Trạng thái `productionReady:false`, `qualityAccepted:false`.

## Thao tác trong Studio

Trên máy hiện tại, mở PowerShell và chạy trong worktree chứa code mới; giữ terminal mở trong lúc dùng:

```powershell
Set-Location 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
node --import tsx scripts/image-motion-editor.ts
```

Mở `http://127.0.0.1:8858/api/projects/image-motion-prep/image-motion/editor`, rồi bấm **Thay tay cho nhân vật**. Trang thay tay cũng có tại `/api/projects/image-motion-prep/image-motion/arms/editor`. Cổng8858 dùng project ảnh độc lập; cổng8850 của Studio sản xuất vẫn giữ riêng. Muốn chọn project/cổng khác, dùng `--name ten-project --port 8859`.

1. Tải PNG/JPG nhân vật. Nếu có nền rừng/đồ vật phức tạp, tải thêm ảnh cùng kích thước đã xóa tay và phục hồi phần nền/tóc/thân phía sau. Sau đó chọn lại ảnh nhân vật làm **Ảnh nguồn**.
2. Bấm **Thêm tay**. Chọn **Khoanh tay cũ**, bấm các điểm quanh tay cần xóa rồi **Hoàn tất vùng**. Khoanh sát tay, tránh tóc và trang phục cần giữ. Có thể nhập tọa độ x,y trong ô đa giác.
3. Chọn lần lượt **Vai / Khuỷu tay / Cổ tay** rồi bấm lên ảnh. Có các ô số để chỉnh chính xác bằng bàn phím. Điểm vai cần tiếp xúc phần thân hoặc gốc tay còn khuất dưới áo/tóc.
4. Chỉnh độ rộng nét, kích thước bàn tay và hai góc chuyển động. Góc cẳng tay tương đối với cánh tay trên; giới hạn góc không tự bảo đảm tư thế đẹp. Giảm góc nếu tay bị cắt ở mép ảnh.
5. Chọn **Nền giấy hoặc kem đơn giản**, hoặc **Ảnh nền sạch** và chọn ảnh đã tải. Ảnh nền sạch chỉ lấp vùng xóa; không đổi màu toàn cảnh. Nếu cần giữ tóc/áo nằm trước tay mới, chọn **Khoanh áo/tóc che tay**, khoanh và hoàn tất đa giác che khuất; tối đa hai vùng mỗi tay.
6. Bấm **Chuẩn bị và lưu tay**, rồi **Xem tay mới / Phát**. Tua bản thử6 giây và đối chiếu bằng **Ảnh gốc**. **Tải lại** khôi phục cấu hình đã lưu; thêm/bỏ tay cho phép tối đa4 tay trên một ảnh.

Đây là công cụ khoanh vùng thủ công, chưa tự nhận diện và tách tay. Định nghĩa, nguồn và layer được lưu trong project; sửa góc dùng lại layer phù hợp. Bản gốc PNG/JPG giữ nguyên bytes, bao gồm ảnh gốc trước khi chuẩn hóa kích thước/orientation preview. Sửa chưa lưu khóa bản xem trước để tránh nhầm cấu hình cũ; save đang chạy khóa các thao tác khác. Nguồn sai hash, revision cũ, project bận, điểm ngoài ảnh hoặc thiếu nền cần thiết sẽ chặn lưu.

Nền giấy nội suy vẫn có thể lộ mép hoặc lệch sắc độ. Ảnh phẳng không cung cấp phần tóc/thân bị tay che: cần ảnh nền sạch hoặc vùng che khuất do người dùng chuẩn bị. Một bàn tay mới đẹp và một điểm gắn vai tự nhiên vẫn cần xem bằng mắt. Chưa có export final/narration hoặc duyệt asset sản xuất trên trang này.

Bản Lila được chuẩn bị tại project `arm-editor-lila-03`: `/api/projects/arm-editor-lila-03/image-motion/arms/editor`. Clip chẩn đoán tương ứng là `runtime/image-motion/character-candidates/lila-editor-v3/demo.mp4`, im lặng6 giây60fps430×766. Mẫu này dùng lại nguồn hiện có, không sinh ảnh mới. Kiểm tra vùng mặt trên năm frame trả zero pixel thay đổi; không coi đó là nghiệm thu tất cả mép tóc/áo.

## Kết quả hiện có

Lila và Karo dùng ảnh RGB gốc trong `docs/topics/assets/reference-*-full.png`. Tay phía bên phải ảnh được xóa theo vùng đánh dấu rồi thay bằng hai đoạn nét đen đầu tròn; bàn tay được vẽ mới. Tay còn lại giữ nguyên. Với góc nhìn chính diện, tay bên phải ảnh là tay trái của nhân vật.

Một cử chỉ: nghỉ → chuẩn bị → đưa tay ra → giữ → thu tay → nghỉ. Độ dài hai đoạn không thay; ma trận parent/child giữ khuỷu nối với cánh tay, không uốn hình tay thành một cung cố định. Tư thế nghỉ đã thay tay; không hiện lại tay cũ khi tua về đầu/cuối.

Mặt/tóc/trang phục dùng nguồn cũ, không sinh lại ảnh hoặc đổi màu tổng thể. So sánh vùng mặt và vùng giữa áo/váy với ảnh gốc trên năm frame đều bằng pixel. Đây là kiểm tra có vùng giới hạn, không phải nghiệm thu mọi mép cắt. Khớp vai và hình bàn tay vẫn cần đánh giá mỹ thuật ở tốc độ thật.

Nền giấy đơn giản được phục hồi từ màu giấy xung quanh. Cảnh có texture, phần tóc/thân bị che và góc mặt khác cần clean plate/occlusion/pose phù hợp; không thể suy ra chính xác từ một ảnh phẳng. Bộ matte alpha cũ là ứng viên, không phải thuật toán phân đoạn semantic tự động.

## Môi trường

- Node >=22.13, dependencies của repo; đã chạy với Node24.19, Sharp, puppeteer-core qua HyperFrames và Chrome headless có sẵn.
- Chrome headless/Chrome có đường dẫn executable; FFmpeg và ffprobe có libx264.
- Trên máy hiện tại: FFmpeg/ffprobe trong `C:/ffmpeg/bin`; script dùng Chrome đã provision ở cache Puppeteer. Máy khác dùng `--chrome`, `--ffmpeg`, `--ffprobe` hoặc biến `IMAGE_MOTION_CHROME`.
- Không cần API sinh video/sinh ảnh, key TTS hoặc key model để chạy bản thử này.

## Lệnh chạy trong checkout có code mới

```powershell
node --import tsx scripts/image-motion-character.ts --actor lila --output runtime/image-motion/character-candidates/lila-review-01 --render
node --import tsx scripts/image-motion-character.ts --actor karo --output runtime/image-motion/character-candidates/karo-review-01 --render
```

`--render` tạo MP4 im lặng 640×800, 60 fps, 6 giây. Bỏ `--render` để chỉ chuẩn bị layer/manifest/viewer. Mỗi lần sửa nội dung hoặc cần xuất lại video hãy chọn một output mới; tool từ chối ghi đè video/manifest khác. Nguồn và layer tương ứng được dùng lại từ cache, không gọi sinh ảnh lại.

Đầu ra gồm `index.html`, `manifest.json`, `assets/source-original.png` giữ nguyên bytes, `assets/original.png` là poster đã thay tay, `background.png`, các layer PNG, `demo.mp4`, probe frames và `qc-report.json`. Mở MP4 bằng trình xem video; viewer HTML cần phục vụ qua HTTP để nạp asset. CLI exporter tự mở server localhost riêng trong lúc render rồi đóng nó.

Các bản đã xuất trên máy nằm trong `runtime/image-motion/character-candidates/lila-new-arm-v4` và `karo-new-arm-v4`. Runtime/media không đưa lên Git; source/lệnh và evidence kiểm tra được commit.

Editor xoay bề mặt và editor thay tay dùng chung catalog ảnh nhưng lưu cấu hình riêng. Các bản CLI v4 bên trên là evidence lịch sử; output mặc định mới là `lila-new-arm-v5`/`karo-new-arm-v5` do version chuẩn bị layer đã thay đổi.

## Contract và tái sử dụng

`prepareCharacterSource` nhận ảnh PNG, matte PNG cùng kích thước và `CharacterSourceRecipe`. Mỗi part có polygon vùng nguồn, image/id, parent, pivot, clock và tùy chọn `replacement`:

```json
{"type":"ink-arm","from":{"x":286,"y":293},"to":{"x":344,"y":390},"width":13}
```

Forearm là con của upper-arm, bắt đầu đúng tại điểm cuối của upper-arm; có thể thêm `hand:{width:44,height:60,thumbSide:"left"}`. Chỉ có primitive số cố định; không thực thi SVG/JS do model đưa vào. Frames phải bắt đầu ở góc0 và phủ đủ clock. `parts` là thứ tự vẽ từ sau ra trước; lớp quần áo tĩnh che đúng gốc tay.

Cache key gồm hash nguồn/matte, ảnh nền sạch nếu có, version chuẩn bị, hình học và thiết lập phục hồi nền; sửa timing dùng lại asset. Sửa hình tay làm thay key. Hash từng PNG được kiểm trước khi reuse; cache sai bị chặn. API lưu revision và motion key riêng, trả scene dữ liệu và URL asset cùng origin. Việc giữ nguyên bytes nguồn không đồng nghĩa mọi phần crop/patch đã được duyệt.

## Kiểm tra và phần còn chờ

```powershell
node --import tsx --test tests/image-motion-arms-api.test.ts tests/image-motion-character.test.ts tests/image-motion.test.ts tests/image-motion-editor.test.ts
npm run build
npm run test:typecheck
```

Báo cáo editor mới tại `../validation/2026-10-11-arm-editor/REPORT.md`; báo cáo CLI trước đó giữ tại `../validation/2026-10-11-image-motion-character/REPORT.md`. Chưa nghiệm thu diễn xuất toàn thân, quay đầu/nhìn bạn diễn/lip-sync; chưa có shot/narration clock hoặc luồng final/resume/QC của renderer này. Kịch bản, WAV, câu chuyện→kịch bản, SRT tương thích và TTS EN/VI/JA/KO vẫn thuộc phạm vi toàn dự án.
