# Động cơ hơi nước và bình ngưng riêng

Đây là input mẫu cho [chế độ diễn viên V2.2](../../STORY-ACTOR-DIRECTION.md), chưa phải một video đã được nghiệm thu toàn sản phẩm. `input/script.txt` là lời kể nguyên văn; `source.md` chỉ bổ trợ. Cấu hình chọn script, người que, story-cinematic và actors. Watt là vai trong truyện, không phải người dẫn bắt buộc của mọi video.

Để thử robot, đổi `host.profile` thành `library/characters/MINI-ROBOT.md`. Chọn giọng tiếng Việt và provider storyboard thật trước khi chạy; mock chỉ tạo seed. Model thiết kế các vai, không gian và diễn xuất từ nội dung cùng design_brief. Bản authored đã dựng minh họa cách tạo xưởng/đạo cụ riêng ở [báo cáo source21](../../docs/validation/2026-10-02-story-actors.md); không dùng bản đó để chứng nhận model tự chủ.

Mẫu `fixtures/narration.srt` có clock do người viết fixture đặt (10 giây/cue), không phải clock của script hoặc WAV đã đo. Khi thử SRT, sao chép mẫu này vào input/narration.srt và chọn input.mode=srt. Khi thử WAV/WAV+SRT, model test phải chuẩn bị audio thật và SRT khớp audio đó.

Nguồn lịch sử: [Động cơ hơi nước và bình ngưng riêng](https://blog.sciencemuseum.org.uk/james-watt-and-the-separate-condenser/). Hình cơ khí/so sánh trong lời kể được ghi rõ là mô hình khái niệm; không suy diễn thành thông số hay bản vẽ lịch sử.
