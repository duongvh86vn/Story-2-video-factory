# Các mốc và mô hình giải thích ô tô

Đây là input mẫu cho [chế độ diễn viên V2.2](../../STORY-ACTOR-DIRECTION.md), chưa phải một video đã được nghiệm thu toàn sản phẩm. `input/script.txt` là lời kể nguyên văn; `source.md` chỉ bổ trợ. Cấu hình chọn script, người que, story-cinematic và actors. Benz cùng các vai minh họa tham gia câu chuyện; không buộc một mascot đứng giảng suốt video.

Để thử robot, đổi `host.profile` thành `library/characters/MINI-ROBOT.md`. Chọn giọng tiếng Việt và provider storyboard thật trước khi chạy; mock chỉ tạo seed. Model chọn tạo hình, tình huống sử dụng/chế tạo, cận cảnh cơ cấu và nhịp cắt phù hợp với narration; không thêm thoại hoặc tự bịa sự kiện.

Mẫu `fixtures/narration.srt` có clock do người viết fixture đặt (10 giây/cue), không phải clock của script hoặc WAV đã đo. Khi thử SRT, sao chép mẫu này vào input/narration.srt và chọn input.mode=srt. Khi thử WAV/WAV+SRT, model test phải chuẩn bị audio thật và SRT khớp audio đó.

Nguồn lịch sử: [Các mốc và mô hình giải thích ô tô](https://group.mercedes-benz.com/company/tradition/company-history/1885-1886.html). Hình cơ khí/so sánh trong lời kể được ghi rõ là mô hình khái niệm; không suy diễn thành thông số hay bản vẽ lịch sử.
