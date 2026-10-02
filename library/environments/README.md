# Nền minh họa V2.2

Hai ảnh PNG được tạo bằng built-in imagegen và đã được chọn cho bộ nền minh họa. `catalog.json` khóa phiên bản và SHA-256. Đây là bối cảnh hư cấu; không phải hình ảnh chứng minh địa điểm, niên đại hoặc thiết kế máy lịch sử. Nhân vật và vật thể giải thích được dựng riêng bằng SVG/JavaScript.

- `workshop-v1.png`: kế thừa concept ở [design/stickman/proposals/README.md](../../design/stickman/proposals/README.md). Nền xưởng ấm, vùng diễn xuất phía trước thoáng.
- `road-v1.png`: tạo mới 2026-10-01; nền đường và xưởng xa, tông nắng vàng, vùng phía trước trống, không nhân vật hoặc xe.

Prompt dùng cho road-v1: “Use case: illustration-story. A wide 16:9 warm painterly storybook road environment, golden afternoon light, trees at the far edges, distant small workshops without signs, atmospheric depth and tactile brushwork. Fictional setting, no named historical place or year. Open level foreground for an animated stick character and separate explanatory vehicle models, ground anchor around 76% of the frame. No characters, humans, vehicles, machines, foreground props, text, labels, logo, watermark or panel borders.”

Ảnh là lớp môi trường; không gộp nhân vật vào nền. Vật thể và quan hệ có nguồn vẫn phải qua validator. Thiếu hoặc đổi hash ảnh đã chọn phải báo lỗi trước khi dựng final.
