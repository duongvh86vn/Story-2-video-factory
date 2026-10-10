# Registration mặt — source0.114

Nguồn ảnh và glyph giữ nguyên. Thay đổi này sửa vùng xử lý và dải lấy màu của chính ảnh đang chọn; không tạo ảnh mới, đổi identity hoặc phê duyệt diễn hoạt. Catalog workbench8 chọn 13 file `*-v2.json`; các file V1 được giữ nguyên để truy nguyên. Năm registration còn lại không đổi.

| Góc riêng của diễn viên | Lỗi dữ liệu V1 | Sửa trong V2 |
| --- | --- | --- |
| Lila, three-quarter-right | Góc dưới vùng mắt phải chạm vùng bảo vệ mũi; hull lông mày trái vượt mép dưới | Thu vùng mắt về x867–927/y451–525, vẫn chứa glyph/lid/shift; hạ mép dưới vùng lông mày 4 pixel |
| Lila, three-quarter-left | Hull xoay/dịch của lông mày phải vượt mép trên | Nâng mép trên vùng xử lý 5 pixel; giữ mép dưới |
| Karo, three-quarter-right | Dải lấy màu lông mày phải nằm trong vùng sửa của chính nó | Chuyển dải từ y510 sang y516, giữ x/kích thước |
| Karo, three-quarter-left | Glyph/hull lông mày phải vượt mép dưới | Hạ mép dưới 10 pixel; thu mép trên vùng mắt phải từ y504 sang y509 để hai vùng tách nhau, vẫn chứa toàn bộ chuyển động mắt |

Các tọa độ là pixel của ảnh nguồn từng góc, không phải vị trí trong video. Giữ nguyên tâm/glyph mắt, mũi được bảo vệ, miệng, neck/chin, biên độ shift/rotation/brow, nguồn body, paint/follow và các cờ chưa duyệt. Không dùng tọa độ của góc đối diện hoặc mirror ảnh.

`tests/native-head-registration.test.ts` kiểm toàn bộ 18 lựa chọn hiện hành bằng schema hình học thật, hash ảnh thật, trạng thái chưa duyệt; kiểm V1 lỗi vẫn bị từ chối và các trường tạo hình/chuyển động không bị đổi cùng vùng sửa. Các test cũ dùng catalog hiện hành thay vì buộc đường dẫn V1 đã lỗi. Guard overlap, protected paint và full motion hull không đổi.

Hai lượt chẩn đoán sau sửa registration đi qua canonical/cast nhưng gặp `needs-head-source-phase` tại structural seat check. Body compiler45 sửa đúng call-site kiểm template ghế/chân, không chọn hoặc dựng head cell ở phép kiểm này. Ba test tập trung PASS, gồm bốn actor/view pair, support sai vẫn bị từ chối và cả render/physical sampler/compiler thiếu clock đầu vẫn báo lỗi.

Hai lượt chạy lại đã tới kiểm cảnh, nhưng cảnh 0–900ms có 16,481,788 và 19,844,820 byte, vượt cap 2,000,000; filter alpha và một giá trị tween chưa khớp validator. Chưa có MP4/frames. Bộ regression 56 ca hiện 40 PASS / 16 FAIL; bộ mặt trước sửa support 33 PASS / 7 FAIL. Pose chống cằm và các lỗi cảnh còn phải sửa. Kết quả đầy đủ, command, source và receipts ghi tại `TEST-RESULTS-PREHISTORIC.md`.

`approved=false`, `motionVerified=false`, `productionAcceptance=false`, `finalExportAllowed=false`. Chỉ sau khi xuất và xem video mới có bằng chứng về độ mượt, nét/màu, hướng nhìn, khớp và tương tác. Sửa registration không phải nghiệm thu ba luồng sản phẩm.
