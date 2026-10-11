# Demo chuyển động từ ảnh gốc

Bản ngày 11/10/2026: **demo độc lập đã xuất, chưa nghiệm thu mỹ thuật hoặc nối vào Studio/pipeline narration**.

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

- Upload ảnh, mask editor, đặt pivot và sửa nền ngay trong Studio.
- Tách tự động các phần phức tạp; vùng bị che cần layer/patch được duyệt. Đưa tay/chạy không thể suy ra đủ chỉ từ demo bánh răng.
- Preset tay thẳng, lửa, khói và tương tác; preview theo từng ảnh trước khi dựng cả video.
- Nối lại input kịch bản nguyên văn, WAV nguyên giọng và câu chuyện → kịch bản; narration thật, phụ đề, chuyển cảnh, TTS EN/VI/JA/KO, cache/resume và final/QC.
- Bảo vệ asset/manifest/lock của luồng sản xuất. Module demo dùng JavaScript cố định riêng, không nới scene-security hiện có hoặc chạy code model trả về.

Báo cáo và evidence: `docs/validation/2026-10-11-image-motion-demo/REPORT.md`. Bộ test V1 và các clip rig trước không chứng minh luồng ảnh mới đã hoàn thành.
