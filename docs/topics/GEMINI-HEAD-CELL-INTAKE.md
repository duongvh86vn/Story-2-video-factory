# Nhập head-cell từ Gemini/matte — source0.111

Đã triển khai đường nhập ảnh Gemini vào bộ head-cell để tiếp tục đo và đăng ký nhân vật. `native-head-cell-prompt-2` giữ provider `9router-gemini`, model thật, generation receipt và matte receipt tùy chọn. Prompt1/built-in và các material PNG hiện có giữ nguyên. Đây là source đã triển khai; CLI nhập và sáu ca test mới **NOT RUN**.

## Chuỗi nguồn và điều kiện nhập

- Đọc riêng các đường dẫn thuộc actor/side/version cho phép, bằng file handle, giới hạn bytes và từ chối symlink/thay đổi file/path trong lúc mở.
- Kiểm primary PNG/SHA, prompt nguyên văn, actor/side và requested yaw với generation receipt. Góc yêu cầu vẫn là ý định; `yawMeasured` luôn false.
- Nguồn PNG có alpha thật có thể dùng trực tiếp. JPEG/WebP cần matte receipt hợp lệ; không đổi đuôi file hoặc gán alpha giả.
- Matte phải đúng model/revision/dependency của tool cục bộ, đúng generation receipt/image SHA và đúng output/mask SHA. Giải mã ảnh để so RGB nguồn với cutout, kiểm intensity xám của mask bằng alpha output, dimensions/histogram/counts/bounds bằng receipt. Không dùng kênh alpha luôn opaque của mask để so.
- PNG được sao chép nguyên bytes. Prompt/material vẫn unreviewed, không registered/approved/production/motion. Study đang `held` chỉ có thể nhập làm candidate chưa duyệt; không trở thành rig hợp lệ nhờ kiểm provenance.
- Head-cell hiện có được đọc lại theo provider thật. Nguồn/receipt/mask bị đổi sẽ làm mất hiệu lực binding; không dùng nhãn built-in để che nguồn Gemini.

Module mới: `packages/topics/head-profile-provenance.ts`; tích hợp `head-cell-art.ts`, inventory CLI, JSON schema và manifest code hashes. Import CLI không gọi model, TTS, matting hoặc renderer. Một task qua combo `coder` đề xuất module; parent sửa các lỗi receipt dependency/histogram/yaw, đọc JPEG và so mask. Một task `tester` rà source; parent bổ sung bounds và opened-handle checks cho reader cũ. Hai request provider báo 19.843 token, response đều GPT Luna; không retry/Fusion, không gọi thêm Gemini.

## Lệnh cho người dùng/model test

Môi trường: Node≥22.13, npm/dependencies của repo. Import không cần API key, Internet hoặc runtime matting đã cài; nó chỉ đọc những artifact đã có. Chạy tại checkout mới đúng source SHA. Không đổi checkout D hoặc khởi động trùng server8850 đang chạy.

Ví dụ nhập study đã có vào một **candidate chưa duyệt**. Lệnh sau được chuẩn bị, **chưa chạy**:

```powershell
node --import tsx scripts/head-cell-import.ts --generation lila-profile-right-v1 --matte v1 --version v1 --import
```

Đầu ra: `head-cells/lila-head-profile-right-v1.png`, prompt2 JSON, material1 JSON và inventory cập nhật. Bỏ `--matte` chỉ khi generation trả đúng PNG có alpha thật. Filename đã có/reserved bị từ chối; nếu lỗi, kiểm partial output và receipt trước khi chọn phiên bản mới. Không tự retry, không ghi đè nguồn cũ. Default inventory CLI cũng hiểu prompt2:

```powershell
node --import tsx scripts/head-cell-inventory.ts
```

Lệnh inventory này chưa chạy trong lượt triển khai. Static `prehistoric-pack.ts` được phép chạy và chỉ kiểm những source đã đăng ký trong inventory cũ; chưa có prompt2 material thật để kiểm end to end.

Model test chạy callback sau; agent triển khai chỉ typecheck, không chạy test:

```powershell
node --experimental-test-module-mocks --import tsx --test tests/head-profile-provenance.test.ts tests/head-cell-art.test.ts tests/head-cell-landmarks.test.ts tests/head-cell-workbench.test.ts
```

Sáu ca mới: JPEG→matte→PNG giữ bytes/false flags; legacy và path/provider/extra-field/bounds; prompt/null yaw/cross-actor; receipt/primary mutation; cập nhật lại SHA vẫn không che được RGB đổi; cập nhật SHA mask vẫn không che được alpha khác. Cần kiểm thêm CLI import thực tế, đồng thời hai request import cùng phiên bản, lỗi giữa chừng, symlink trên Windows, byte-identical copy và inventory/workbench. SKIP không là PASS; ghi full SHA, môi trường, lệnh/kết quả và artifact thật.

## Phần chưa hoàn thành

Candidate Lira nguồn0.110 vẫn lệch mặt/tóc và khoảng trống dưới 4%, chưa nhập vào head-cell hoặc duyệt identity/edge. Cần sửa đúng mẫu gốc, rồi đo own landmark/cổ/thân/face3/bank7 và kiểm expression/gaze/turn/seek/video tốc độ bình thường. Provenance không chứng minh chất lượng tạo hình hoặc độ mượt.

Mục tiêu vẫn là story/topic→kịch bản trung thành, script nguyên văn hoặc WAV gốc→audio clock→Lira/Karo và quần chúng diễn trong chuyện→world/director/camera→review/repair→final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC. EN chính, VI/JA/KO, external/local TTS, cache/resume/locks/rebuild và nghiệm thu cả ba luồng còn mở. Không có video final mới hoặc QA ledger được chấp nhận từ thay đổi này.

Source checks: `npm run build`, `npm run test:typecheck`, `node node_modules/typescript/bin/tsc -p tsconfig.art-tools.json`, definition export `npm run schemas`, static inventory `node --import tsx scripts/prehistoric-pack.ts`. Xem [source record](reviews/gemini-head-cell-intake-source-record-v1.json) để phân biệt lệnh đã chạy và hướng dẫn chưa chạy.
