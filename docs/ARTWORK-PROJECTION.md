# SVG trong cảnh: hình học và chữ

Model SVG mặc định dùng `projection: normalized-stretch` (hoặc bỏ trường này). Renderer chuẩn hóa viewport về100×100 rồi scale độc lập sang width/height của part. Hình cơ cấu và contact đã dựng theo kiểu này giữ nguyên; font nằm trong model cũng bị scale hai trục.

Nếu một hình SVG hoàn chỉnh đã có `viewBox` riêng, có thể chọn `projection: model-viewport`. Renderer đặt viewport SVG trực tiếp vào bounds của part, giữ `viewBox` và `preserveAspectRatio` đã vẽ, không đi qua viewport vuông trung gian. Ví dụ một part563.2×115.2 pixels và viewBox560×115 cho chữ gần kích thước thiết kế, thay vì ép font dẹt theo chiều cao. Fragments vẫn dùng normalized coordinates.

```json
{
  "partId": "milestone.label",
  "projection": "model-viewport",
  "svg": "<svg viewBox=\"-280 -57.5 560 115\"><text x=\"0\" y=\"0\" text-anchor=\"middle\" font-size=\"56\">1886</text></svg>",
  "sourceRefs": [{"kind": "narration", "segmentId": "cue", "quote": "1886"}],
  "labelMode": "artwork"
}
```

Đây là ví dụ contract; part/cue/quote phải tồn tại trong nguồn thật. Không dùng ví dụ như bằng chứng lịch sử. Mode mới yêu cầu đúng một complete SVG root, bốn số viewBox finite với extents dương và part dimensions hợp lệ. Passive SVG sanitizer, namespacing, nguồn và motion geometry checks vẫn áp dụng.

Khi aspect của viewBox khác part, chính sách SVG có thể thêm khoảng trống. Artist cần bố trí lại hình tiếp xúc và kiểm tra target/gaze/motionOrigin; renderer không âm thầm sửa anchor, choreography hoặc nội dung để vừa hình. `motionOrigin` tiếp tục là tọa độ local SVG. Không tự đổi mọi model cũ sang mode mới hoặc tách text nodes bằng heuristic.

Những nhãn giải thích có thể đặt trong `artDirection.layers` dùng stage pixels và `role: explanation` với nguồn thật. Midground đi cùng world camera; overlay giữ vị trí màn hình. Chọn plane theo mục đích, giữ vùng nhãn sạch khỏi actor/đồ vật/phụ đề và đồng bộ reveal với narration/contact.

Artwork renderer version `passive-svg-2.2.5` thuộc scene và cinematic input fingerprint. Thay đổi phần hình làm stale visuals; narration fingerprint không phụ thuộc version này. Giữ lock conflicts và voice/cache còn hợp lệ. Source/build không chứng minh typography/acting đã được nghiệm thu trên các phim cũ; những finding native và authored đã ghi vẫn giữ cho artifact gốc.

[Kiểm tra độc lập](validation/2026-10-04-artwork-projection.md) ghi từng snapshot, browser evidence, grammar repair, sai số số học và các phần còn NOTRUN; không cộng các scoped runs thành nghiệm thu toàn phim.
