# Tay nghỉ khi ngồi và đứng dậy — source0.113

Đã thay nội suy đường thẳng của bàn tay bằng nội suy góc vai/khuỷu cho chuyển tiếp tay nghỉ đứng → đặt lên đùi → đứng. Hai vị trí bàn tay có thể cùng với tới được nhưng đường thẳng giữa chúng đi qua vùng quá gần vai; IK khi đó co khuỷu sâu hoặc phải báo không với tới. Đây là một lỗi hình học có thể xảy ra, chưa phải kết luận mọi lỗi tay trong phim đã được sửa.

`packages/animation/seated-rest-arm.ts` dùng cùng chiều dài xương, đoạn cổ tay–điểm cầm và elbow pole của chính diễn viên. Giữ nguyên hai endpoint, dùng signed elbow angle và cung vai tối đa 90°. Góc số được mở liên tục trên nhánh của pose đứng, tránh nhảy 360° khi atan2 đổi dấu. Endpoint không với tới hoặc cung chưa hỗ trợ phải được sửa blocking/pose; không dời target để che lỗi. Weight đã lấy từ chuyển trọng lượng ngồi gốc, không ease thêm lần nữa.

`compiler.ts` dùng cùng helper cho frame hiện tại và reference tại đầu gesture. Tay nghỉ không có gesture dùng chain ngồi trực tiếp; gesture biểu cảm dùng chain ấy làm pose nghỉ. Gesture/tiếp xúc/giáo vẫn sở hữu target của chúng. Clock `sourceBody`, camera cut, người nói, WAV và narration không bị viết lại. Chỉ nhánh compiler hiện hành có weight ngồi dương dùng thay đổi này; nhánh legacy và seat không hoạt động giữ đường cũ. Body compiler tăng 43 → 44 và fingerprint có mô tả helper để hình ảnh phụ thuộc được dựng lại.

Không tạo ảnh mới; toàn bộ PNG/JPG/WebP, mặt, tóc, trang phục và màu hiện có được tái sử dụng. Không cấp thêm góc đầu, quyền production hoặc xác nhận giải phẫu. Cần xem va chạm tay với thân/váy/quần/đạo cụ, tốc độ và silhouette thật ở cả Lila/Karo, cả hai hướng, lúc ngồi xuống/đứng dậy và lúc gesture bắt đầu giữa chuyển động.

## Model test thực hiện

Các lệnh bên dưới là bàn giao, **chưa chạy** bởi agent triển khai. Có năm callback mới trong `tests/seated-rest-arm.test.ts` và một callback mới trong `tests/native-source-seat.test.ts`. Các callback cũ cũng cần chạy hồi quy; số khai báo không phải số test PASS.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/seated-rest-arm.test.ts tests/native-source-seat.test.ts tests/forest-arm-trajectory.test.ts tests/native-source-gesture.test.ts tests/native-source-gesture-project.test.ts tests/native-manipulation.test.ts tests/native-head-seat-tracer.test.ts

# Hai bố trí độc lập; mặc định không có audio và chỉ là phim chẩn đoán.
npm run tracer:native-seat -- --native-heads --staging lila-left --acting emotional-reactions --face source-motion --validate --frames --render
npm run tracer:native-seat -- --native-heads --staging lila-right --acting emotional-reactions --face source-motion --validate --frames --render
```

Tracer xuất thư mục UUID mới; không thay project cũ. Có thể thêm `--wav 'đường dẫn WAV chẩn đoán của bạn'` nếu thực sự khớp clock; giữ nguyên file nguồn. Tracer cố định 7,2 giây chỉ kiểm kernel/acting/scene, không thay test câu chuyện của sản phẩm và không được đổi nhãn thành final đã nghiệm thu.

Nếu cần Studio riêng, Node ≥22.13 và dependencies của checkout phải sẵn. Build/typecheck dùng Node v24.19.0 trong lượt source này. Không cài `npm ci` vào junction `node_modules` đang trỏ checkout D.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8861 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/source113-test-projects'
```

Giữ terminal mở, truy cập `http://127.0.0.1:8861/`; Ctrl+C dừng đúng server này. Chỉ định `-EnvFile` khi cần đọc cấu hình model/TTS ở một file local thực sự tồn tại; không gửi key vào chat. Server8850 và checkout D không tự nhận source C. Agent triển khai chưa khởi động server, gọi API pipeline hoặc chạy video.

Ghi SHA đầy đủ, command/exit code, log lỗi nguyên trạng, video/frames/probe và nhận xét ở tốc độ thường. Kiểm riêng tiếp xúc cuff/palm, góc số qua ±180°, random/reverse seek, hai phía camera cut và gesture bắt đầu khi đang chuyển trọng lượng. Không dùng build, source review hoặc frame đứng để kết luận phim mượt.

## Phạm vi còn thiếu của sản phẩm

Toàn luồng câu chuyện/chủ đề → kịch bản; kịch bản nguyên văn hoặc WAV gốc → clock audio thật → diễn viên trong cảnh → review/repair → final MP4/audio/phụ đề/QC vẫn chưa nghiệm thu trên source hiện tại. Identity/góc quay đầu/mặt, anatomy/diễn xuất/tương tác, màu và bối cảnh, EN chính + VI/JA/KO/local-external TTS, cache/resume/locks/rebuild đều cần báo cáo hiện hành. V1 không chứng minh các phần này đạt. Production guard và hồ sơ QA thật vẫn bắt buộc; không tạo ledger duyệt giả để chạy xuyên guard.

Build/types/static inventory được ghi tại [source record](reviews/seated-rest-arm-source-record-v1.json). [Tiến độ dự án](PROJECT-PROGRESS.md) phân biệt ước lượng triển khai và nghiệm thu.
