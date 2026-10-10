# Tái sử dụng bộ nhân vật — source0.112

Mỗi câu chuyện dùng lại bộ nhân vật, góc nhìn, lớp mặt, thân và đạo cụ đã có. Thay câu chuyện, pose, thời điểm, camera hoặc số phiên bản không phải lý do tạo lại ảnh. Người dùng đã yêu cầu dừng việc sinh ảnh lặp; lượt này không gọi thêm ảnh sau yêu cầu đó.

Tool pose trước đây gọi API ngay khi chạy với actor/action/version. Đã sửa cả tool pose và tool đầu: mặc định chỉ đọc danh mục local; muốn tạo mới phải có cả `--generate` và `--new-art-reason` mô tả phần thiếu/lỗi cụ thể. Danh mục không cần key, không đọc `.env`, không gọi discovery/generation, không tạo reservation hoặc sửa ảnh. `--discover` riêng vẫn là yêu cầu kiểm model có chủ đích.

## Bộ ảnh hiện có và cách dùng

`packages/topics/art-reuse.ts` liệt kê primary và ảnh có sẵn trong `head-cells`, `head-face-plates`, `head-source-studies`, `body-views`, `pose-studies`, theo actor và SHA. Mask/reference board bị loại khỏi danh mục nhân vật. Đường dẫn/SHA được dùng lại trực tiếp; các file trùng SHA không phải nhân vật mới. Đây là danh mục authoring, không tự đăng ký hoặc duyệt candidate vào production. Snapshot raw/hash đã lưu tại `library/topics/prehistoric-life/art-reuse-inventory-v1.json`: 31 ảnh Lira và 25 ảnh Karo, gồm primary/pose/view/layer/study; không phải 56 ảnh đã nghiệm thu. Snapshot chỉ gồm file Git hiện có và asset mới thuộc lượt này, chưa phải output chạy CLI mới.

```powershell
# Chỉ đọc kho local; không sinh ảnh. Lệnh CLI mới chưa chạy runtime trong lượt này.
node --import tsx scripts/art-reuse-catalog.ts --actor lila
node --import tsx scripts/art-reuse-catalog.ts --actor karo

# Hai lệnh này hiện cũng chỉ liệt kê, kể cả khi đổi vN:
node --import tsx scripts/native-head-reference-art.ts --actor lila --view right --version v3
node --import tsx scripts/prehistoric-pose-art.ts --actor karo --action jump --version v5
```

Khi làm chuyển động: dùng lại rig, xương/targets, đường nét mềm, lớp tóc/vải và mặt thuộc đúng nguồn. Thay pose bằng trajectory/acting; thay góc máy bằng camera. Góc đầu thật còn thiếu phải báo thiếu, không mirror hoặc warp mặt để giả view. Biểu cảm/miệng dùng lớp own-source đã đăng ký; không sinh lại toàn thân cho từng câu thoại. Giữ cả identity, trang phục và màu chuẩn xuyên câu chuyện.

Nếu thật sự cần asset mới, trước hết nêu file đã xem, phần không thể dùng và phần còn thiếu; chỉ sinh đúng phần đó sau yêu cầu cụ thể. CLI yêu cầu lý do và lưu quyết định authoring: tool đầu ghi `<stem>-reuse.json` riêng để giữ contract generation receipt1; tool pose ghi trong receipt hiện có. Không có vòng tự retry, đổi model hoặc tự tăng vN để gọi lại. Hành vi này áp dụng cả việc agent gọi công cụ ảnh trực tiếp; guard CLI không thể tự chặn công cụ ngoài repo.

## Các ảnh đã tạo trong lượt này

Trước yêu cầu dừng sinh lặp, có một ảnh Gemini2 và một ảnh built-in theo yêu cầu đổi công cụ của người dùng:

| Nguồn | Tệp | Kết quả quan sát |
| --- | --- | --- |
| Gemini qua 9router | `head-source-studies/lila-profile-right-v2.jpg` | Tóc/cằm quá góc cạnh, giữ lại, không chọn cho rig |
| BiRefNet CPU local | `head-source-studies/lila-profile-right-v2-matte-v1.png` + mask/receipt | Alpha riêng, RGB giữ nguyên; không sửa được lệch identity |
| Built-in imagegen | `head-cells/lila-head-profile-right-v1.png` + prompt/material | Cằm mềm/màu ấm hơn; tóc còn gọn và mắt/mũi khác primary, chưa duyệt |

PNG built-in được lưu nguyên bytes, có alpha thật, 1312×1199, 1.079.842 pixel alpha=0, không có alpha≥8 chạm cạnh; khoảng trống nhỏ nhất 4,4204%, chưa đạt yêu cầu 15%. Prompt đầy đủ và đường dẫn original nằm trong `lila-head-profile-right-v1-prompt.json`. Không gọi model mới để sửa ngay: giữ candidate này cùng bộ cũ để tiếp tục chọn/tích hợp. Requested yaw chỉ là ý định, chưa đo góc. Chưa có own neck/body/face3/bank7 hoặc kiểm motion cho ảnh mới.

## Kiểm tra và bàn giao

Build/typecheck và inventory tĩnh được ghi trong [source record](reviews/art-reuse-source-record-v1.json). Không chạy CLI mới, unit/integration/runtime/browser/TTS/ASR/video. Model test cần kiểm default không đụng network/key/output, `--generate` thiếu lý do dừng trước API/reservation, ghi đúng lý do, không ghi đè phiên bản cũ, catalog SHA/duplicate/symlink và chọn lại asset qua nhiều câu chuyện. Kiểm visual/rig/acting và toàn story/script/WAV→final/QC vẫn còn mở; kết quả source không chứng minh video đã đạt.
