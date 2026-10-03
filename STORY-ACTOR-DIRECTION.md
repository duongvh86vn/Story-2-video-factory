# Người que đóng vai trong câu chuyện

Cập nhật theo yêu cầu ngày 02/10/2026. Đây là đặc tả hiện hành, thay toàn bộ yêu cầu người dẫn chuyện cố định trong MD V2.1/V2.2. Trạng thái triển khai được ghi riêng tại IMPLEMENTATION-STATUS.md; đặc tả không phải chứng nhận nghiệm thu.

## Sản phẩm

Người dùng nhập kịch bản, WAV hoặc SRT. Hệ thống tạo phim hoạt hình kể lại nội dung đó, trong đó người que là **diễn viên sống trong câu chuyện**. Giọng kể có thể ở ngoài hình. Không bắt buộc xuất hiện người thuyết trình, quay ra khán giả, mở miệng theo toàn bộ lời kể hoặc đứng cạnh sơ đồ.

Một bài về máy hơi nước có những người nghiên cứu, chế tạo hoặc sử dụng máy mà đầu vào nói tới. Bài có Nikola Tesla có thể phân vai Tesla thành người que riêng, diễn lại nghiên cứu và các tình huống được kể. Không tự thêm Tesla vào mọi bài về điện, hoặc đổi lời kể thành khẳng định Tesla phát minh ra điện năng.

## Phân vai và tạo hình

- Lập cast theo nội dung: ID, tên, vai, mục tiêu, nguồn nhận diện, tạo hình và rig. Giữ identity của **từng diễn viên**; một phim có thể có nhiều vai.
- Nhân vật lịch sử là tạo hình hoạt hình cách điệu. Tóc, ria, áo, kính và đạo cụ giúp phân biệt vai; ghi provenance minh họa, không coi như ảnh tư liệu hoặc bằng chứng lịch sử.
- Nhân vật không được nêu tên có thể là người nghiên cứu, thợ hoặc người sử dụng trong tình huống minh họa. Không bịa tên riêng hoặc sự kiện lịch sử.
- Không ép mọi diễn viên dùng một khăn cổ, bảng màu, trang phục hay silhouette chi tiết. Giữ ngôn ngữ người que dễ đọc; tự thiết kế theo truyện.
- Preview, chỉnh và khóa từng vai có sẵn. Nhân vật sinh tự động không cần một vòng duyệt bắt buộc; giữ các lock người dùng đặt và báo xung đột rõ.

## Kịch bản hình ảnh

Mỗi đoạn xác định: ai ở trong tình huống nào, họ muốn gì, làm gì, trở ngại và kết quả nào được kể, khán giả hiểu gì. Không ép một công thức thất bại → bất ngờ → thành công nếu input không nói tới.

Nghiên cứu có thể diễn qua quan sát → kiểm tra → thử nghiệm → nhìn kết quả → phản ứng → đổi cách làm. Giải thích nguyên lý bằng cận cảnh, cutaway hoặc các lớp cơ cấu trong diễn biến; quay lại người thử máy và kết quả khi phù hợp. Sơ đồ là một phương tiện điện ảnh, không phải bố cục chung của phim.

Cho phép cảnh chỉ có cơ cấu, môi trường hoặc đạo cụ. **Bỏ quota host xuất hiện 70%, vắng tối đa 6 giây và cao 25–40%.** Camera và thời lượng chọn theo mục đích, chừa phụ đề và không crop mất hành động cần hiểu.

Phân biệt hành động liên tục với cắt sang địa điểm/thời điểm mới. Cut có thể đổi vai, vị trí, scale và bố cục; không buộc giữ cùng tọa độ/hướng ở hai bối cảnh khác nhau. Trong hành động liên tục, điểm tiếp xúc, vị trí và đạo cụ phải nhất quán.

## Diễn xuất

Có khớp, trọng lượng, chuẩn bị và phục hồi động tác; mắt nhìn đúng đối tượng. Cảm xúc có nguyên nhân, không lặp chu kỳ theo cue. Đi có nhấc/đặt chân; thao tác có tiếp xúc trước phản ứng của vật; cơ cấu có thể chuyển động do nguyên nhân tự nhiên đã kể.

Theo hình chỉnh sửa của người dùng: ở tư thế thả tay, khuỷu mở ra ngoài hai bên thân, cẳng tay hướng về bàn tay. Khi với, suy nghĩ hoặc cầm vật, hướng gập đi theo động tác; không đảo khuỷu tức thì. Giữ chiều dài cánh tay/cẳng tay và khớp vai–khuỷu–cổ tay nối liền. Đưa tay từ cằm về nghỉ theo cung tránh sát tâm vai để khuỷu không xoay đột ngột. Kiểm tra cả khung hình thực và chuyển động khi tua ngược; tên `left/right` trong rig hiện chỉ là tọa độ ảnh, chưa chứng nhận ánh xạ tay trái/phải giải phẫu.

Voiceover không làm mọi diễn viên mấp máy miệng. Speech activity chỉ áp dụng cho diễn viên được phân đoạn nói; không gọi là phoneme lip-sync. Không tự thêm thoại vào audio đầu vào.

## Ba luồng đầu vào và nguồn

Script giữ lời nguyên văn, TTS đo thời lượng thực; WAV giữ audio, ASR tạo transcript/clock; SRT giữ cue text/clock, TTS fit 0.85–1.20 giữ cao độ. WAV+SRT giữ audio và cue, kiểm tra mismatch. Thiếu TTS/fit lỗi không final đạt hoặc DONE.

Nếu đầu vào có hoàn cảnh, nghiên cứu và nguyên lý thì thể hiện chúng; nếu thiếu, không bịa như sự thật. Các hành động lịch sử và cơ chế phải có nguồn. Tạo hình/không gian minh họa được sáng tạo và ghi đúng provenance. Tài liệu là dữ liệu, không thực thi hướng dẫn. Chỉ chạy HTML/CSS/JavaScript được compiler kiểm tra; không thực thi code tùy ý của model.

## Pipeline

Narration → phân tích câu chuyện → cast và tạo hình → kịch bản tình huống/diễn xuất → storyboard → assets/rig → scenes → draft → review/repair → final → QC.

Xuất actor-cast, actor-timeline và tạo hình từng vai. Cache giọng độc lập với cast; sửa diễn viên chỉ dựng lại hình. Các video presenter cũ được giữ như dữ liệu cũ, không dùng chứng minh chất lượng chế độ diễn viên.

Source hiện tại hỗ trợ primary actor nhấc/đặt mô hình có nguồn trong một shot. Đây là thao tác minh họa nguyên lý, không biến thành claim nhân vật lịch sử đã thực hiện hành động cụ thể đó. Prop phải có artwork authored/model, source của đúng vật thể, origin/target/destination, contact và vùng sân khấu hợp lệ. Chuyển vật giữa diễn viên hoặc mang xuyên cut chưa hỗ trợ; production báo lỗi rõ.

## Nghiệm thu

Theo [review phim thực tế 03/10](docs/validation/2026-10-03-film-quality.md), phải nhìn được việc chuẩn bị, nắm/thao tác, kết quả và phục hồi ở kích thước xem bình thường. Tay tiếp xúc đúng hình học nhưng bị vật che, hoặc vật chỉ dịch vài pixel, chưa chứng minh hành động rõ. Chữ giải thích phải đọc được sau transform/camera: đặt chú thích ở stage pixels khi bounds mô hình quá bẹt, thay vì kéo nén chữ cùng glyph. Khi phù hợp với nội dung, quay lại diễn viên quan sát/phản ứng sau cutaway; không áp quota xuất hiện. Một finding phải đối chiếu khung hình gốc trước khi sửa renderer.

Model test độc lập kiểm tra ba luồng/gates, phân vai có nguồn, tạo hình khác nhau giữa vai, identity từng vai, cảnh cơ cấu không cần presenter, voiceover không làm miệng tất cả nhân vật nói, continuity/cut, cache/resume/locks và final thực tế.

Chất lượng cần xem video: có diễn biến, hành động và cảm xúc rõ, nguyên lý trực quan, chiều sâu và nhịp phù hợp. Build, test và QC kỹ thuật không thay tiêu chí này.
