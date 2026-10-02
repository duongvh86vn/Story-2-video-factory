# Bản thiết kế ô tô có vai diễn

Bản dựng parent chỉnh tay, không phải model tự hoàn thành: `temp/art-direction-v22/car-actor-adaptation-stick-man-1790948624744`. Source tại lúc dựng là commit689722e, director21/performance7/artwork4. Giữ riêng project người dùng và các lần thất bại trước.

Voice Việt từ script nguyên văn, audio hash `a6d6032ee62a8b1ccc9f67bffd52d255739191819b91c2c78d3b8336758d795b`. Có bảy shot: người quan sát ở đầu, Karl Benz ở đoạn được narration nêu tên, năm cảnh cơ cấu/so sánh không đặt người dẫn đứng cạnh bảng. Trang phục, xưởng và biểu cảm là minh họa; role của Karl Benz là excerpt thật từ cue, không thêm lời thoại hoặc thí nghiệm lịch sử.

Hai lượt trước dừng ở scene validation: dấu hỏi tối trên nền xưởng, rồi nhãn Karl Benz tối. Parent đổi màu dấu hỏi và thêm plaque tên. Clip đầu qua gate nhưng khi xem PNG thấy plaque che mặt và chữ năm kéo dẹt; đã giữ `output/final.first-layout.mp4` và `input/art-direction.first-layout.json`, sửa plaque lên trên mặt và dùng viewBox đúng tỉ lệ cho thẻ năm, dựng lại cùng project. Đây là kiểm tra thiết kế bằng hình thật; gate kỹ thuật không tự phát hiện mọi vấn đề thẩm mỹ.

Kết quả production: `DONE`, QC pass=true/issues=[], H2641280×720,30fps,42.666667s; AAC48kHz stereo42.657s, một track subtitle. File hiện hành `output/final.mp4`. Narration giữ hash qua chỉnh bố cục. Cảnh vẫn có bản note/sơ đồ và năm cảnh cơ cấu; chưa coi đây là phim diễn xuất sinh động đủ kỳ vọng hoặc nghiệm thu cả hai bài/hai kiểu tạo hình. Chưa có model độc lập chứng nhận full clip và chưa là bằng chứng autonomous generation.

Clip này dùng mux subtitle cũ ở thời điểm dựng. `literal-tx3g-1` bổ sung sau đó đã được kiểm tra riêng26/26 ca FFmpeg thật; không tính clip này thành proof cho cơ chế ấy.

## Bản mô hình xe và chuyển nhịp diễn

Project mới riêng `temp/art-direction-v22/car-vehicle-acting-1790954277608`, dựng cùng nguyên văn script/hash `6e5e19f71581315108709f0b0ef0b71bb9928602272ddec5c03f9357c56fb82a` và audio hash ở trên. Parent vẽ SVG xe ba bánh/động cơ sau/khung xe/ghế ngồi theo những nét tổng quát đối chiếu [Mercedes-Benz](https://group.mercedes-benz.com/company/tradition/company-history/1885-1886.html); đây là minh họa, không phải phục dựng kỹ thuật chính xác. Thay note rỗng bằng mô hình xe; Benz bước ngắn, quan sát/suy nghĩ rồi chỉ mốc năm. Giọng ngoài hình, không thêm thoại hoặc sự kiện thử xe lịch sử.

Lượt riêng trước đó `car-vehicle-acting-1790953926941` dừng ASSETS_READY vì font32 làm full cue script-0006 không vừa vùng phụ đề. Giữ lỗi và nguyên text/clock; lượt mới trả font24, không cắt cue hoặc nới gate. Kết quả DONE/QC=true, H2641280×720/30fps42.666667s, AAC48kHz stereo42.657s, một subtitle track; movie SHA256 `8f5bf863186359476d61420a9afa5682b7d7d4d8b4cfe14bce09c6ffb6d54408`, art-direction hash `8b90f2e659032470425c830bf095c5c37c0f04baea26c8664b1acd7dcd853641`. Source031325f với diff metadata/actor harness trước sửa authoredStyle; literal-tx3g-1 được pipeline sử dụng, không phải một audit độc lập mới cho clip.

Parent xem PNG5s/6.2s từ MP4 và frame6.2s trong Studio: mặt/tên/mốc năm đọc được, cử chỉ khác nhau và thấy mô hình xe. Trình phát load đúng42.666667s. Chưa có chứng nhận xem/nghe toàn phim độc lập; nhịp kể toàn bài, autonomous generation và hai bài/hai kiểu tạo hình vẫn mở. Các lần dựng và video cũ giữ riêng, không ghi đè project người dùng.
