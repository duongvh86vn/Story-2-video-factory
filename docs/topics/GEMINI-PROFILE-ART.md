# Ảnh tham chiếu Gemini và tách nền cục bộ — source0.110

Đã gọi thành công một lượt `ag/gemini-3.1-flash-image` qua 9router, dùng nguyên ảnh Lira gốc. Đã tách nền bằng model chạy CPU cục bộ và lưu PNG có alpha thật; RGB sau giải mã giữ nguyên. Đây là công cụ chuẩn bị asset, chưa đưa ảnh mới vào rig hoặc pipeline sản xuất.

## Kết quả thực tế

| Tệp trong `library/topics/prehistoric-life/head-source-studies/` | Vai trò | Trạng thái |
| --- | --- | --- |
| `lila-profile-right-v1.jpg` | Bytes gốc Gemini, 1024×1024 | JPEG có nền caro vẽ trong RGB, không có alpha |
| `lila-profile-right-v1.json` | Prompt đầy đủ, primary SHA, model, số đo | `held`; requested yaw là ý định, chưa đo góc |
| `lila-profile-right-v1-matte-v1.png` | RGB gốc + alpha suy ra cục bộ | Candidate, chưa duyệt identity/biên |
| `lila-profile-right-v1-matte-v1-mask.png` | Mask alpha riêng | Lưu để đối chiếu với nguồn |
| `lila-profile-right-v1-matte-v1.json` | Nguồn/receipt SHA, model/revision, RGB/hash/alpha | Không đăng ký, không production/motion approval |

Cutout có 762.172 pixel alpha=0, 284.234 pixel alpha≥8 và không có pixel alpha≥8 chạm cạnh canvas. Bounds là `(243,85,549,898)`; khoảng trống dưới chỉ 41px, chưa đạt yêu cầu 10% ở mọi phía. Quan sát ảnh thấy khuôn mặt tròn hơn, tóc mượt/ít rối hơn và đuôi tóc ngắn hơn mẫu gốc. Tách nền không sửa được khác biệt identity này. Chưa kiểm cạnh trên nền sáng/tối/màu ở renderer; không dùng kết quả để tuyên bố nhân vật hoặc video đã đạt.

## Môi trường và lệnh sử dụng

Node≥22.13; dependencies gốc của repo đã cài, 9router ở `http://127.0.0.1:20128/v1`, `MODEL_GATEWAY_KEY` cấu hình trong môi trường hoặc `.env`. Có thể chỉ định `--env <đường-dẫn>`; không đưa key vào chat hoặc Git. Chạy lệnh tại gốc checkout được phép sửa.

Thiết lập dependency tách nền riêng, không cài vào `node_modules` dùng chung với Studio:

```powershell
node scripts/setup-asset-tools.mjs
```

Script dùng lockfile trong `config/asset-tools/`, cài `@huggingface/transformers` 4.3.1 vào `runtime/asset-tools/`. Model CPU fp32 là [BiRefNet_lite-ONNX](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX), MIT, revision `de15b22ba131738a16dff04aab8bdf8dc32e3ac1`; cache nằm trong `runtime/asset-tools/models/`. Lần đầu cần Internet tải weights khoảng 224 MB. Không gửi ảnh lên dịch vụ tách nền, không dùng Python/Forge. `runtime/` được Git bỏ qua; setup script mới chỉ được kiểm syntax, chưa chạy lại bằng `npm ci` trong lượt này. Dependency thực tế đã được cài riêng bằng npm install cùng package/lock, và inference thực tế thành công.

Ví dụ tạo một ảnh mới; lệnh gọi API và có thể dùng quota. Chỉ chạy khi cần asset mới, không chạy lại chỉ để kiểm tra kết nối:

```powershell
node --import tsx scripts/native-head-reference-art.ts --actor lila --view right --version v2 --generate
```

`actor` nhận `lila | karo`, `view` nhận `left | right`, phiên bản `vN`. Mỗi lần gọi gửi một primary PNG nguyên bytes và một prompt, không retry/fallback. Script kiểm SHA gốc, giữ đúng định dạng và bytes trả về, đo alpha thật; không đổi đuôi JPEG thành PNG để giả transparency. Tệp đã tồn tại/reserved bị từ chối; cần đọc receipt trước khi quyết định tạo phiên bản mới. Request lỗi có thể đã tiêu thụ quota upstream.

Tách nền từ receipt ảnh đã có; lệnh chạy inference asset cục bộ:

```powershell
node scripts/native-profile-matte.mjs --input lila-profile-right-v1 --version v2 --generate
```

Ví dụ trên là phiên bản mới, **chưa chạy**. Bản `matte-v1` đã chạy, không chạy đè. Tool giữ nguyên RGB, lưu mask và cutout riêng, ràng buộc SHA nguồn/receipt, kiểm lại RGB sau encode PNG. Alpha và bounds không tự cấp acceptance. Nếu thất bại, giữ receipt/partial output và điều tra trước; không tự lặp request hoặc inference.

## Việc còn lại để dùng trong video

1. Sửa artwork theo đúng primary face/hair/costume/palette, kiểm đủ khoảng trống và biên tóc; giữ từng nguồn/phiên bản riêng. Không warp hoặc mirror mặt chính diện để gọi đó là góc mới.
2. Mở rộng provenance intake cho nguồn Gemini + matte. Head-cell intake hiện có chỉ nhận provenance built-in; không đổi nhãn nguồn để vượt contract.
3. Đăng ký landmark/crop/neck/body/own eye/brow/mouth từ chính ảnh đã duyệt, rồi dùng face3/bank7 ở góc có mắt bị che. Chưa có đăng ký này cho candidate mới.
4. Model test kiểm ảnh trên nền sáng/tối/màu, tóc/viền/cổ, expression/gaze/turn, seek và clip tốc độ bình thường. Sau đó mới nghiệm thu story/script/WAV→audio clock→hai diễn viên→director/camera→review/repair→final/QC, EN/VI/JA/KO/external-local TTS và resume.

Source checks không gọi Gemini hoặc matting:

```powershell
npm run build
npm run test:typecheck
node node_modules/typescript/bin/tsc -p tsconfig.art-tools.json
node --check scripts/native-profile-matte.mjs
node --check scripts/setup-asset-tools.mjs
```

Không chạy unit/integration/runtime/video trong lượt triển khai này. Khi model test cần Studio:

```powershell
$env:STUDIO_PORT='8850'
npm run studio
```

Kiểm cổng trước khi khởi động; server D/8850 hiện có được giữ nguyên. Báo cáo cần full source SHA, môi trường, lệnh/kết quả thật, đường dẫn artifact và lỗi còn thiếu. Test V1 không nghiệm thu thay đổi mới.

## Phân công và quota

Ba request source nhỏ thực sự giao qua combo: `coder` đề xuất tool ảnh (3.549 token), `tester` review source (4.091), `coder` đề xuất matte (2.979); response đều `gpt-6-luna`. Parent đọc và sửa đề xuất trước tích hợp. Tổng token provider báo 10.619; một request Gemini riêng không có usage trả về. Không gọi cả nhóm hoặc Fusion, không tự retry. Xem [phân công](../plans/2026-10-10-quota-delegation.md) và [source record](reviews/gemini-profile-art-source-record-v1.json).
