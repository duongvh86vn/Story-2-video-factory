# Động cơ hơi nước và bình ngưng riêng

Đây là dữ liệu nghiệm thu V2.1, chưa phải video đã nghiệm thu. `input/script.txt` là lời kể nguyên văn; `source.md` chỉ bổ trợ. Cấu hình mặc định dùng robot và luồng script. Kịch bản hình ảnh/diễn xuất V2.2 ở [§10 đặc tả mới](../../STICKMAN-STORY-DIRECTION.md#10-kịch-bản-diễn-xuất-mẫu-hơi-nước); renderer mới chưa triển khai, config hiện tại vẫn dùng rig/recipe V2.1.

Để thử người que, đổi `host.profile` thành `library/characters/STICK-MAN.md`. Chọn giọng tiếng Việt trước khi chạy. Mẫu `fixtures/narration.srt` có clock do người viết fixture đặt (10 giây/cue), không phải clock của script hoặc WAV đã đo. Khi thử SRT, sao chép mẫu này vào input/narration.srt và chọn input.mode=srt. Khi thử WAV/WAV+SRT, model test phải chuẩn bị audio thật và SRT khớp audio đó.

Nguồn lịch sử: [Động cơ hơi nước và bình ngưng riêng](https://blog.sciencemuseum.org.uk/james-watt-and-the-separate-condenser/). Hình cơ khí/so sánh trong lời kể được ghi rõ là mô hình khái niệm; không suy diễn thành thông số hay bản vẽ lịch sử.
