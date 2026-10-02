# Bản thiết kế ô tô có vai diễn

Bản dựng parent chỉnh tay, không phải model tự hoàn thành: `temp/art-direction-v22/car-actor-adaptation-stick-man-1790948624744`. Source tại lúc dựng là commit689722e, director21/performance7/artwork4. Giữ riêng project người dùng và các lần thất bại trước.

Voice Việt từ script nguyên văn, audio hash `a6d6032ee62a8b1ccc9f67bffd52d255739191819b91c2c78d3b8336758d795b`. Có bảy shot: người quan sát ở đầu, Karl Benz ở đoạn được narration nêu tên, năm cảnh cơ cấu/so sánh không đặt người dẫn đứng cạnh bảng. Trang phục, xưởng và biểu cảm là minh họa; role của Karl Benz là excerpt thật từ cue, không thêm lời thoại hoặc thí nghiệm lịch sử.

Hai lượt trước dừng ở scene validation: dấu hỏi tối trên nền xưởng, rồi nhãn Karl Benz tối. Parent đổi màu dấu hỏi và thêm plaque tên. Clip đầu qua gate nhưng khi xem PNG thấy plaque che mặt và chữ năm kéo dẹt; đã giữ `output/final.first-layout.mp4` và `input/art-direction.first-layout.json`, sửa plaque lên trên mặt và dùng viewBox đúng tỉ lệ cho thẻ năm, dựng lại cùng project. Đây là kiểm tra thiết kế bằng hình thật; gate kỹ thuật không tự phát hiện mọi vấn đề thẩm mỹ.

Kết quả production: `DONE`, QC pass=true/issues=[], H2641280×720,30fps,42.666667s; AAC48kHz stereo42.657s, một track subtitle. File hiện hành `output/final.mp4`. Narration giữ hash qua chỉnh bố cục. Cảnh vẫn có bản note/sơ đồ và năm cảnh cơ cấu; chưa coi đây là phim diễn xuất sinh động đủ kỳ vọng hoặc nghiệm thu cả hai bài/hai kiểu tạo hình. Chưa có model độc lập chứng nhận full clip và chưa là bằng chứng autonomous generation.

Clip này dùng mux subtitle cũ ở thời điểm dựng. `literal-tx3g-1` bổ sung sau đó đã được kiểm tra riêng26/26 ca FFmpeg thật; không tính clip này thành proof cho cơ chế ấy.
