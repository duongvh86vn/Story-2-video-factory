# Mặt nghiêng và chi tiết bị che — source0.109

Nguồn trước yêu cầu hai mắt và hai lông mày có vùng sửa, kể cả khi một bên thực sự bị che ở góc nghiêng. `native-head-face-3` cho phép khai báo bên bị che từ chính artwork; `native-head-bank-7` mang contract này qua host/schema/compiler/painter. Đây là phần triển khai source, chưa có cell face3 được đăng ký hoặc chuyển đầu thật được nghiệm thu.

## Contract đã triển khai

- Hai slot `screen-left` và `screen-right` luôn được khai báo theo tọa độ ảnh, không đổi theo thứ tự các chi tiết còn nhìn thấy. Slot bị che có `visibility: occluded`, `reason: head-profile | hair` và polygon `contour`; không có center, glyph, erase strip hoặc lid bịa thêm.
- Eye/brow cùng slot phải thống nhất visibility, reason và contour. Contour phải trùng chính xác một protected contour trong own source/crop. Mặt nói/nhìn cần ít nhất một mắt thực sự nhìn thấy. Ảnh nhìn từ sau không được giả làm mặt nói/nhìn.
- Chỉ slot nhìn thấy mới tạo SVG glyph, skin repair, lid, brow và state/matrix channel. Dấu tilt của lông mày vẫn theo tên slot. Vùng sửa và erase strip không được lấy pixel ở phần bị che; painter giữ contour đó cùng lớp source được bảo vệ.
- Bank7 kế thừa own-source emotions, paint2 và rear follow của bank6, yêu cầu face3 đầy đủ và eyeTarget đúng tâm mắt nhìn thấy hoặc trung bình hai mắt nhìn thấy. Bank1–6 và face1–2 giữ contract cũ; không âm thầm nâng cấp dữ liệu cũ.
- Compiler báo đúng face3. Schema xuất và manifest mô tả version hỗ trợ; catalogue vẫn không có bank được duyệt, không tự chọn bank7. Các production/voice/contact/final gates giữ nguyên.

## Artwork hiện có và còn thiếu

Lila `lila-head-turn-v4.png` và Karo `karo-head-turn-v3.png` đã lưu nguyên bytes, kèm prompt, primary reference SHA và số đo RGBA/grid/cell. Cả hai thực tế 1254×1254, không đạt kích thước 2048 được yêu cầu trong prompt. Tất cả 16 ô Lila và 12 ô Karo có alpha≥8 chạm cạnh ô; tóc/đuôi tóc/râu và các góc cuối còn đổi hoặc lặp. Chúng được giữ làm nghiên cứu, hash bị chặn khỏi bank; không lấy requested yaw làm số đo, không crop/mirror/warp ảnh để tuyên bố góc mới.

Chưa có landmark/own source face3/đầu–cổ–thân tương thích được duyệt. Sáu test mới dùng dữ liệu protocol cô lập, có ghi rõ ảnh hai mắt sao chép không chứng minh occlusion quang học, không ghi thành actor hoặc hồ sơ QA.

Theo [phân công quota](../plans/2026-10-10-quota-delegation.md), lần cần sinh/sửa asset tiếp theo ưu tiên `ag/gemini-3.1-flash-image` qua adapter reference image hiện có. Discovery HTTP200 chưa chứng minh generation hoặc quota upstream. Bản0.109 không gọi thêm lượt sinh ảnh qua Gemini, không tự đăng ký những ảnh đang giữ lại.

## Bàn giao kiểm tra cho model test

Môi trường: checkout nhánh `codex/prehistoric-life`, Node≥22.13, npm/dependencies của dự án; cấu hình key trong `.env` hoặc môi trường, không ghi key vào báo cáo. Checkout D và server8850 đang dùng được giữ nguyên bởi agent triển khai.

Source checks được phép cho agent triển khai:

```powershell
npm run build
npm run test:typecheck
npm run schemas
node --import tsx scripts/prehistoric-pack.ts
```

Chỉ model test/người dùng chạy callback sau; đây là hướng dẫn, **chưa chạy**:

```powershell
node --experimental-test-module-mocks --import tsx --test tests/native-head-occlusion.test.ts tests/native-head-face.test.ts tests/native-source-emotions.test.ts
```

Kiểm legacy round-trip; không sinh hidden glyph/lid/brow/state; từ chối hidden geometry/contour ngoại lai/both-hidden/legacy occlusion; anchor bank7; erase strip chạm contour; tilt bên còn lại. Tiếp đó cần own asset và kiểm pixel/source/body/neck/gaze/paint, speech/blink/emotion, seek xuôi/ngược/ngẫu nhiên và video thật theo tốc độ bình thường. Không thể nghiệm thu motion bằng các callback protocol này.

Khởi động Studio để model test dùng khi sẵn sàng:

```powershell
$env:STUDIO_PORT='8850'
npm run studio
```

Không khởi động server trùng cổng đang chạy. Báo cáo phải ghi full source SHA, môi trường, lệnh/kết quả thật, nguồn đầu vào/asset và vấn đề còn thiếu; kết quả V1 không áp dụng cho luồng mới.

## Mục tiêu sản phẩm vẫn còn mở

Story/topic→kịch bản trung thành, script/dialogue nguyên văn và WAV gốc→audio clock thật→Lira/Karo diễn trong câu chuyện→world/director/camera→review/repair→final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC. Tạo hình sát ảnh, màu đậm, tay chân mềm hợp lý, gaze/props/contact, quần chúng nam trọc không râu và nữ có tóc, EN chính/VI/JA/KO/local-external TTS, resume/cache/locks/rebuild và nghiệm thu video hiện tại vẫn cần hoàn tất. Không có ledger QA được chấp nhận hoặc video final mới từ phần thay đổi này.
