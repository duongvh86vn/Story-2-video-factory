# Người que đóng vai trong câu chuyện

Cập nhật theo yêu cầu ngày 02/10/2026. Đây là đặc tả hiện hành, thay toàn bộ yêu cầu người dẫn chuyện cố định trong MD V2.1/V2.2. Trạng thái triển khai được ghi riêng tại IMPLEMENTATION-STATUS.md; đặc tả không phải chứng nhận nghiệm thu.

## Sản phẩm

Người dùng nhập chủ đề/ý tưởng/câu chuyện thô để tạo kịch bản, hoặc đưa kịch bản hoàn chỉnh/WAV/SRT để giữ lời kể. Hệ thống tạo phim theo nội dung đó, trong đó người que là **diễn viên sống trong câu chuyện**. Giọng kể có thể ở ngoài hình. Bối cảnh, vai, hành động và biểu cảm theo từng truyện, không bắt buộc người thuyết trình hoặc đứng cạnh sơ đồ.

Máy hơi nước, ô tô và Tesla chỉ là ví dụ, không xác định miền nội dung hay template sản phẩm. Truyện về bạn bè có các vai bạn bè; truyện hành trình có các vai và địa điểm được kể; kiến thức tự nhiên có đối tượng/cảnh giải thích phù hợp. Người lịch sử phải có nguồn nhận diện; nhân vật hư cấu giữ vai hư cấu, không tự thêm tên lịch sử vào chủ đề khác.

## Phân vai và tạo hình

- Lập cast theo nội dung: ID, tên, vai, mục tiêu, nguồn nhận diện, tạo hình và rig. Giữ identity của **từng diễn viên**; một phim có thể có nhiều vai.
- Nhân vật lịch sử là tạo hình hoạt hình cách điệu. Tóc, ria, áo, kính và đạo cụ giúp phân biệt vai; ghi provenance minh họa, không coi như ảnh tư liệu hoặc bằng chứng lịch sử.
- Nhân vật không được nêu tên có vai minh họa thích hợp với tình huống cụ thể; không mặc định tất cả thành người nghiên cứu/thợ. Nhân vật hư cấu có thể có tên trong kịch bản đã chọn. Không bịa tên riêng hoặc sự kiện lịch sử.
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

Animation2.2.8 bổ sung `entryPosture` và `postures`: đứng, cúi/hạ người và nghiêng thân, chỉnh intensity và góc nghiêng theo tình huống. Clip blend tối thiểu280ms, giữ tư thế tới clip tiếp theo; chân giữ điểm đặt và chiều dài xương giữ nguyên. Quay về đứng trước khi đi. `idle` cho phép chân/thân diễn mà không ép đưa tay hoặc bịa mục tiêu chỉ. Continuous phải giữ tư thế cuối qua `entryPosture`; đổi tình huống dùng cut. Source8 chưa có support ngồi; source10 bên dưới bổ sung contract đó. Quỳ gối, thao tác khuấy và đi khi đang ngồi vẫn chưa được hỗ trợ.

Animation2.2.9 bổ sung hai kênh tay độc lập. Action và gesture dùng cùng `hand: left|right`; bỏ trường này giữ mặc định rig-right của project cũ. Hai tay được chồng clock, một tay không được có hai gesture đồng thời. ID gesture duy nhất trong cả hai kênh; `idle` không hand giữ cả hai tay nghỉ, idle có hand chỉ giữ tay đó. Point liên tục qua cue được ghép riêng theo tay, không bị action của tay kia làm ngắt. Đây là phía trái/phải trong rig, chưa phải ánh xạ giải phẫu sau xoay người/camera.

Event cần đủ tiếp xúc có `contactActorId` và `contactHands`; nếu yêu cầu hai tay thì phải là hai tay của cùng một diễn viên, đúng vật/clock và chạm trước phản ứng. Chữ năm trên giấy, nút máy hay thao tác quan sát không được biến thành một claim lịch sử mới. Custom model có thể đặt `controlMode: none` để không dựng tay quay điều khiển khi đồ vật không cần. Preview ghi tay và target; compiler report ghi sai số tiếp xúc riêng từng tay. Bản7/8 không có hand data tiếp tục đọc được; hand data mới yêu cầu version9. [Phạm vi source và nghiệm thu](docs/validation/2026-10-03-bilateral-acting.md).

Gesture có `elbowPole=rest|reach`: giữ nhánh khuỷu nghỉ mở ra ngoài khi nắm vật dưới vai, hoặc dùng nhánh với tay đã có. Một clip giữ một pole; không đảo khớp trong lúc nắm. Mặc định giữ behavior cũ. Source mới chưa có runtime test độc lập; cần kiểm cả silhouette cánh tay và khung hình thật như [báo cáo](docs/validation/2026-10-03-body-acting.md).

Animation2.2.10/director2.2.22 thêm tư thế `seated` với ghế được dựng trong cùng world. `performance.supports` định nghĩa ID, seat top/pelvis anchor, width, facing và backHeight tùy chọn; tư thế tham chiếu `supportId`. Mông đặt trên ghế, feet giữ mặt sàn và xương giữ chiều dài; đổi knee pole qua điểm duỗi chân. Ngồi xuống/đứng lên ít nhất700ms; đổi lean trên cùng ghế ít nhất280ms. Diễn viên có thể nhìn, biểu cảm và thao tác bằng tay khi ngồi. Ghế không được có hai owner cùng lúc; toàn cast dùng cùng stage/ground và continuous giữ geometry support. Đứng trước khi đi, quay thân hoặc đổi ghế. Đây là tùy chọn diễn xuất theo tình huống, không ép mọi cảnh dùng ghế. [Phạm vi source10 và test còn chờ](docs/validation/2026-10-03-supported-seating.md).

Tham khảo chuyển động từ [video người dùng cung cấp](https://www.facebook.com/reel/3650632571755231): quan sát được hai diễn viên quanh nồi/lửa, tư thế ngồi, thao tác và nét mặt/động tác hướng về nhau. Chỉ dùng làm yêu cầu chất lượng; không sao chép artwork hoặc suy ra công cụ tạo video. Kịch bản hình cần diễn viên, đồ vật và không gian cùng tham gia diễn biến; một bảng thông tin có nhân vật đứng cạnh chưa đạt mục tiêu đó.

## Ba luồng đầu vào và nguồn

Script giữ lời nguyên văn, TTS đo thời lượng thực; WAV giữ audio, ASR tạo transcript/clock; SRT giữ cue text/clock, TTS fit 0.85–1.20 giữ cao độ. WAV+SRT giữ audio và cue, kiểm tra mismatch. Thiếu TTS/fit lỗi không final đạt hoặc DONE.

Nếu đầu vào có hoàn cảnh, nghiên cứu và nguyên lý thì thể hiện chúng; nếu thiếu, không bịa như sự thật. Các hành động lịch sử và cơ chế phải có nguồn. Tạo hình/không gian minh họa được sáng tạo và ghi đúng provenance. Tài liệu là dữ liệu, không thực thi hướng dẫn. Chỉ chạy HTML/CSS/JavaScript được compiler kiểm tra; không thực thi code tùy ý của model.

## Pipeline

Narration → phân tích câu chuyện → cast và tạo hình → kịch bản tình huống/diễn xuất → storyboard → assets/rig → scenes → draft → review/repair → final → QC.

Xuất actor-cast, actor-timeline và tạo hình từng vai. Cache giọng độc lập với cast; sửa diễn viên chỉ dựng lại hình. Các video presenter cũ được giữ như dữ liệu cũ, không dùng chứng minh chất lượng chế độ diễn viên.

Source hiện tại hỗ trợ primary actor nhấc/đặt hoặc nhấc–mang–đặt mô hình có nguồn bằng một trong hai tay trong một shot. Đây là thao tác minh họa nguyên lý, không biến thành claim nhân vật lịch sử đã thực hiện hành động cụ thể đó. Prop phải có artwork authored/model, source của đúng vật thể, contact/release và vùng sân khấu hợp lệ. `gesture.target/destination` là điểm nắm trong world; `prop.origin/destination` là tâm vật. Điểm nắm bằng tâm vật cộng `gripOffset * performance.scale`; không dùng hai destination như cùng một tọa độ khi offset khác0. Carry cần250ms nhấc,250ms hạ, ít nhất120ms phục hồi và đoạn đi đứng trong khoảng giữa; có thể ghép beat liên tiếp giữ nguyên clock để đủ nhịp diễn. Nhãn, hiệu ứng nhiệt, emphasis và đầu đường quan hệ đi theo clock prop; giá đỡ ở hai đầu giữ cố định. Camera kiểm cả vùng di chuyển. Fingerprint `bound-model-motion-2.2.1` chỉ làm mới hình, không đổi fingerprint narration.

Một prop chỉ có một chủ tay, một model không bind thành hai prop. Chuyển vật giữa diễn viên, supporting actor mang vật, nhấc/đặt cùng một vật nhiều lần, mang chưa buông/đang mang lúc vào shot hoặc mang xuyên cut chưa hỗ trợ trong production; báo lỗi rõ. Hai tay chạm một vật đứng yên được phép; cùng điều khiển một vật đang di chuyển cần contract riêng, không giả bằng hai target cố định. Runtime và GSAP của tích hợp carry mới chưa được model độc lập nghiệm thu; [phạm vi bàn giao](docs/validation/2026-10-03-bound-model-motion.md).

## Nghiệm thu

Theo [review phim thực tế 03/10](docs/validation/2026-10-03-film-quality.md), phải nhìn được việc chuẩn bị, nắm/thao tác, kết quả và phục hồi ở kích thước xem bình thường. Tay tiếp xúc đúng hình học nhưng bị vật che, hoặc vật chỉ dịch vài pixel, chưa chứng minh hành động rõ. Chữ giải thích phải đọc được sau transform/camera: đặt chú thích ở stage pixels khi bounds mô hình quá bẹt, thay vì kéo nén chữ cùng glyph. Khi phù hợp với nội dung, quay lại diễn viên quan sát/phản ứng sau cutaway; không áp quota xuất hiện. Một finding phải đối chiếu khung hình gốc trước khi sửa renderer.

Model test độc lập kiểm tra ba luồng/gates, phân vai có nguồn, tạo hình khác nhau giữa vai, identity từng vai, cảnh cơ cấu không cần presenter, voiceover không làm miệng tất cả nhân vật nói, continuity/cut, cache/resume/locks và final thực tế.

Chất lượng cần xem video: có diễn biến, hành động và cảm xúc rõ, nguyên lý trực quan, chiều sâu và nhịp phù hợp. Build, test và QC kỹ thuật không thay tiêu chí này.
