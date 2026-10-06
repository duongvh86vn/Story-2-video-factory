# Forest Tribe reference workbench — chưa phải bộ sản xuất

`productionReady=false` trong manifest và code topic. Ảnh gốc ở `docs/topics/assets/`; hai ảnh cận da ấm là chuẩn chính. Hai sheet lớn là tham chiếu bổ sung.

- `*-cutout-v1.png`: ứng viên imagegen tách nền; không đảm bảo đúng từng pixel, chưa được người dùng nghiệm thu.
- `*-parts-candidate-v1.png`: atlas nháp. Karo có review ảnh tĩnh chưa đạt; không dùng để sản xuất.
- `parts-prompts-v1.json`: prompt thực tế đã gọi imagegen để làm atlas.
- `parts-measurements-v1.json`, `source-ink-measurements-v1.json`: phép đo đọc ảnh; chưa phải geometry của rig được nghiệm thu.
- `colors-*.png`, `*-views.png`, `*-expressions.png`, **`lila-profile.json` và `karo-profile.json`**: thử nghiệm vector bị loại; giữ làm hồ sơ, không load làm model chính.

`packages/topics/reference-puppet.ts` ráp pose nghỉ bằng mask SVG từ cutout để giữ màu/chi tiết tốt hơn atlas. Các phần bị che khuất chưa tái dựng, mặt vẫn đóng sẵn và không có diễn xuất đa hướng. Xem `/api/topics/prehistoric-life/compare?variant=assembly`; không gọi bản này là rig hoàn thành hoặc video đạt.

`rig-v1/` chứa sáu texture đầu alpha chính diện/ba phần tư trái/phải và prompt thực tế (`head-prompts.json`, `front-prompts.json`, image_gen tích hợp). `forest-head-art.ts` ghép glyph từ ảnh cận, dùng parent anchor cố định; `/api/topics/prehistoric-life/heads` là calibration đầu. Topic chọn `forest-body-1`: `forest-body-art.ts` ghép áo/bàn tay/chân qua mask của cutout, dùng metrics theo ảnh và hông tại thắt lưng; xương ẩn, nét cong và bàn tay xoay theo cẳng tay. Xem `/api/topics/prehistoric-life/body`.

Nhịp thở nhỏ, blink lệch và mask đuôi tóc Lila theo sau 120ms đã có code. Mốc 0.8 thêm panel trang phục theo từng hông/đùi 100ms, neck crop da nguồn và ngồi/đứng có step thu/mở chân, xương riêng và tay nghỉ trên đùi. Preview `sit-left/right` dùng chu kỳ 5000ms. Nếp ngồi, góc thân và chuyển động vẫn candidate; không coi panel xoay là đã dựng đủ vải. Ba view đầu vẫn đổi bằng thay hình, chưa có xoay liên tục, side/rear body hoặc đủ lớp mái/râu. Đã sửa miệng Karo, containment miệng Lila và glyph chân mày; giữ miệng căng/tròn theo cảm xúc khi nói. Review ba góc đầu v2 PASS ảnh tĩnh với fingerprint pack, không suy ra body/video đã đạt. Manifest giữ candidate/productionReady=false. Tests head/body đã chuẩn bị và typecheck, runtime giao model test chạy.

Review static source-seat v1/v2 đều FAIL: cổ/vai Karo và silhouette vạt áo/quần ngồi. Cổ đã có patch nguồn, vai đã sửa sau v2 nhưng chưa review lại. Garment cần artwork nếp gấp thay cho các flap xoay chồng; giữ evidence FAIL trong `docs/topics/reviews/` và không bật sản xuất.
