# Tay mới cho nhân vật từ ảnh gốc

Ngày 11/10/2026. Có CLI chuẩn bị và xuất clip thử; chưa có nút thay tay trong editor Studio, chưa nối video câu chuyện. Trạng thái `productionReady:false`, `qualityAccepted:false`.

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

Server nhập ảnh độc lập vẫn chạy bằng:

```powershell
node --import tsx scripts/image-motion-editor.ts
```

Mở `http://127.0.0.1:8858/`. Editor này hiện chỉ nhập ảnh và chọn bề mặt xoay; không nhầm nó với editor tay/layer chưa triển khai. Studio8850 và các project sản xuất đang có được giữ riêng.

## Contract và tái sử dụng

`prepareCharacterSource` nhận ảnh PNG, matte PNG cùng kích thước và `CharacterSourceRecipe`. Mỗi part có polygon vùng nguồn, image/id, parent, pivot, clock và tùy chọn `replacement`:

```json
{"type":"ink-arm","from":{"x":286,"y":293},"to":{"x":344,"y":390},"width":13}
```

Forearm là con của upper-arm, bắt đầu đúng tại điểm cuối của upper-arm; có thể thêm `hand:{width:44,height:60,thumbSide:"left"}`. Chỉ có primitive số cố định; không thực thi SVG/JS do model đưa vào. Frames phải bắt đầu ở góc0 và phủ đủ clock. `parts` là thứ tự vẽ từ sau ra trước; lớp quần áo tĩnh che đúng gốc tay.

Cache key gồm hash nguồn/matte, hình học và thiết lập phục hồi nền; sửa timing dùng lại asset. Sửa hình tay làm thay key. Hash từng PNG được kiểm trước khi reuse; cache sai bị chặn. Việc giữ nguyên bytes nguồn không đồng nghĩa mọi phần crop/patch đã được duyệt.

## Kiểm tra và phần còn chờ

```powershell
node --import tsx --test tests/image-motion-character.test.ts tests/image-motion.test.ts tests/image-motion-editor.test.ts
npm run build
npm run test:typecheck
```

Báo cáo có output thật tại `../validation/2026-10-11-image-motion-character/REPORT.md`. Chưa nghiệm thu diễn xuất toàn thân, quay đầu/nhìn bạn diễn/lip-sync; chưa có editor phân vùng tay cho ảnh bất kỳ, shot/narration clock hoặc luồng final/resume/QC của renderer này. Kịch bản, WAV, câu chuyện→kịch bản, SRT tương thích và TTS EN/VI/JA/KO vẫn thuộc phạm vi toàn dự án.
