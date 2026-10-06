# Forest Tribe reference workbench — chưa phải bộ sản xuất

`productionReady=false` trong manifest và code topic. Ảnh gốc ở `docs/topics/assets/`; hai ảnh cận da ấm là chuẩn chính. Hai sheet lớn là tham chiếu bổ sung.

- `*-cutout-v1.png`: ứng viên imagegen tách nền; không đảm bảo đúng từng pixel, chưa được người dùng nghiệm thu.
- `*-parts-candidate-v1.png`: atlas nháp. Karo có review ảnh tĩnh chưa đạt; không dùng để sản xuất.
- `parts-prompts-v1.json`: prompt thực tế đã gọi imagegen để làm atlas.
- `parts-measurements-v1.json`, `source-ink-measurements-v1.json`: phép đo đọc ảnh; chưa phải geometry của rig được nghiệm thu.
- `colors-*.png`, `*-views.png`, `*-expressions.png`, **`lila-profile.json` và `karo-profile.json`**: thử nghiệm vector bị loại; giữ làm hồ sơ, không load làm model chính.

`packages/topics/reference-puppet.ts` ráp pose nghỉ bằng mask SVG từ cutout để giữ màu/chi tiết tốt hơn atlas. Các phần bị che khuất chưa tái dựng, mặt vẫn đóng sẵn và không có diễn xuất đa hướng. Xem `/api/topics/prehistoric-life/compare?variant=assembly`; không gọi bản này là rig hoàn thành hoặc video đạt.
