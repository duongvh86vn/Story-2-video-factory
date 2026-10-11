# Demo chuyển động từ ảnh gốc

Bản ngày 11/10/2026: **demo đã xuất và Studio đã có trang chuẩn bị ảnh. Chưa nối pipeline narration, chưa nghiệm thu chuyển động nhân vật.** Người dùng đã chọn tiếp tục hướng giữ ảnh gốc; phản hồi tiếp theo yêu cầu chuyển động người tự nhiên hơn demo xoay vùng.

Người dùng cung cấp bộ `flow_doodle/3bec044e0bb441d49c6277acd74ac763`. Recipe này dùng `images_fullhd/0002.png` và `0013.png`, đúng 1920×1080. Nó dành cho bộ ảnh đó; chưa tự tìm bánh răng/tay trên một ảnh bất kỳ.

Video 10 giây, im lặng, 60 fps:

- Giây 0–5: xoay bề mặt bánh đà trong ảnh 0002, giữ khung xe, xích, bánh đường, chữ và nền.
- Giây 5–10: xoay bốn bánh răng rời trong ảnh 0013. Bộ bánh răng ăn khớp và đai truyền ở giữa vẫn là hình tĩnh; đây chưa phải mô phỏng cơ học đầy đủ.

Không vẽ lại nhân vật, thay mặt, trang phục hoặc màu tổng thể. Không gọi model, image-generation hay TTS. Hai ảnh được sao chép nguyên byte. Bốn cutout alpha và nền sửa được tạo **một lần** rồi tái sử dụng trong 600 frame. Nền bị bánh răng che được vá bằng RGB lấy ở vùng nền lân cận của chính ảnh; việc này được ghi trong manifest, không phải suy luận nền/giải phẫu bị khuất.

## Chạy lại trên Windows

Cần Node.js ≥22.13, dependencies của repo (Sharp và Puppeteer đi cùng renderer), Chrome/Chrome Headless Shell đã cài, FFmpeg và FFprobe. Lệnh dưới chạy tại root repo; `--output` phải là thư mục mới, thư mục cha đã có. Không chạy `npm ci` vào worktree đang dùng junction node_modules.

```powershell
node --import tsx scripts/image-motion-demo.ts --source "C:/Users/Duongvh-pc/Documents/Codex/2026-04-29/files-mentioned-by-the-user-readme/gemini-novel-translator-studio-restored/app/exports/flow_doodle/3bec044e0bb441d49c6277acd74ac763"
```

Nếu vị trí công cụ khác mặc định, thêm:

```powershell
--chrome "C:/path/to/chrome.exe" --ffmpeg "C:/path/to/ffmpeg.exe" --ffprobe "C:/path/to/ffprobe.exe"
```

Mỗi lần chạy tạo thư mục mới tại `runtime/image-motion/demos/original-<timestamp>`. Không ghi đè ảnh đầu vào hoặc output cũ. Không dùng server Studio ở cổng 8850; command mở server localhost ở cổng trống, đóng server/browser khi kết thúc. Không cần API key. Nếu command thất bại, giữ thư mục chẩn đoán và trả exit khác 0.

Output: `demo.mp4`, `index.html`, `manifest.json`, `assets/`, `frames/`, `qc-report.json`; nếu lỗi export có `failure.json`. HTML có Phát/Dừng/Tua/Về đầu; phục vụ thư mục này bằng static server cục bộ khi muốn chỉnh/xem browser. MP4 xem trực tiếp được, không cần khởi động server.

```powershell
node --import tsx --test tests/image-motion.test.ts
npm run build
npm run test:typecheck
```

Kiểm tra pixel áp dụng cho PNG Canvas trước encode. MP4 H.264/yuv420p có nén/chuyển màu nên không cam kết pixel MP4 trùng byte với PNG. Render/QC thành công không thay thế người dùng duyệt độ đẹp/mượt.

## Phần còn thiếu để dùng cho câu chuyện

- Đã có upload PNG/JPG, chọn ellipse/tâm xoay, tốc độ/hướng, preview 5 giây và lưu vùng theo project. Chưa có mask theo đường viền, layer nhân vật hoặc sửa nền trong editor.
- Tách tự động các phần phức tạp; vùng bị che cần layer/patch được duyệt. Đưa tay/chạy không thể suy ra đủ chỉ từ demo bánh răng.
- Preset tay thẳng, lửa, khói và tương tác; preview theo từng ảnh trước khi dựng cả video.
- Nối lại input kịch bản nguyên văn, WAV nguyên giọng và câu chuyện → kịch bản; narration thật, phụ đề, chuyển cảnh, TTS EN/VI/JA/KO, cache/resume và final/QC.
- Bảo vệ asset/manifest/lock của luồng sản xuất. Module demo dùng JavaScript cố định riêng, không nới scene-security hiện có hoặc chạy code model trả về.

Báo cáo và evidence: `docs/validation/2026-10-11-image-motion-demo/REPORT.md`. Bộ test V1 và các clip rig trước không chứng minh luồng ảnh mới đã hoàn thành.

## Mở trang chuẩn bị ảnh

Chạy tại root repo có dependencies đã cài:

```powershell
node --import tsx scripts/image-motion-editor.ts
```

Mở `http://127.0.0.1:8858/`, chọn project `image-motion-prep`, bấm **Ảnh và vùng chuyển động**. Hoặc mở trực tiếp `http://127.0.0.1:8858/api/projects/image-motion-prep/image-motion/editor`. Server này dùng project riêng tại `runtime/image-motion/studio-projects`, không dùng project của Studio8850. Dừng bằng Ctrl+C; chạy lại cùng lệnh để mở các ảnh/vùng đã lưu. Cổng đang bị chiếm sẽ báo lỗi, không tự dừng server khác.

Có thể đổi `--port`, `--projects`, `--name` hoặc thêm `--source "C:/duong-dan/anh.png"`. `--source` nhập một ảnh qua cùng API kiểm tra upload. Trong editor, tải ảnh → kéo một vùng ellipse → sửa tâm/bán kính/tốc độ → Phát → **Lưu vùng chuyển động**. Các ô số cho phép chỉnh bằng bàn phím. Thay đổi chưa lưu có cảnh báo trước khi bỏ. Không chạy production, model hoặc TTS khi thao tác trang này.

Ảnh gốc lưu nguyên byte; preview có thể chuẩn hóa EXIF/thu nhỏ tới3840×2160. Vùng được đo theo pixel preview. Giới hạn16 MB/ảnh,64 ảnh/project và16 vùng/ảnh. Tải lại cùng nội dung dùng ảnh và vùng đã lưu. Lưu xung đột revision hoặc khi production đang chạy bị từ chối.

**Khả năng hiện tại là xoay bề mặt ellipse**, không phải tách tay/lửa tự động. Không dùng chế độ này để cố xoay một vùng gồm cả tay lẫn nền rồi gọi đó là diễn hoạt nhân vật. Kế hoạch nhân vật riêng: `docs/plans/2026-10-11-image-motion-character-actions.md`.

Kiểm chứng editor: `docs/validation/2026-10-11-image-motion-editor/REPORT.md`.
