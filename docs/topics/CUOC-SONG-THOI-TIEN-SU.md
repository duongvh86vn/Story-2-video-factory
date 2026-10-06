# Cuộc sống thời tiền sử — bộ chủ đề Lila & Karo

**Phiên bản:** 0.6 · **Ngày:** 07/10/2026

**Trạng thái:** Đang triển khai; bộ SVG vẽ lại đã bị người dùng loại. Đầu và thân từ tài sản bám ảnh tham chiếu đã vào renderer ở mức ứng viên; fidelity, màu cảnh và chuyển động còn chưa nghiệm thu.

**Mục tiêu sử dụng:** Xây một bộ chủ đề đủ tốt để người dùng chỉ cần đưa câu chuyện vào; hệ thống chuyển thành video có hai diễn viên người que Lila và Karo đóng vai trong câu chuyện đó.

Tài liệu này tập trung riêng vào **Cuộc sống thời tiền sử**. Ảnh dưới đây là nguồn tham chiếu tạo hình. Câu chuyện cụ thể sẽ do người dùng cung cấp sau. Các ví dụ chủ đề trước đây không quyết định nội dung của bộ này.

![Ảnh chuẩn tạo hình Lila và Karo — The Forest Tribe](assets/prehistoric-character-sheet.png)

### Bộ ảnh rõ nét và thứ tự sử dụng

Hai ảnh cận dưới đây là **chuẩn tạo hình chính hiện tại**. Giữ nguyên file nguồn để đối chiếu, không ghi đè bằng ảnh AI đã chỉnh. Các bản tách nền và bản tách lớp là tài sản phái sinh, phải có phiên bản và trạng thái riêng.

| Nguồn | Dùng để |
|---|---|
| [Lila toàn thân](assets/reference-lila-full.png) | Tỷ lệ, tóc buộc lệch, mặt da ấm, váy lệch vai, tay/chân đen |
| [Karo toàn thân](assets/reference-karo-full.png) | Tóc/râu, nụ cười có răng, áo lệch vai, quần hai ống, tay/chân đen |
| [Biểu cảm cận](assets/reference-expressions.png) | Nét mắt, chân mày, miệng và cảm xúc của đúng hai model |
| [Bảng màu cận](assets/reference-palette.png) | Quan hệ màu rừng, lá, đất, cát, gỗ, lửa và trời |
| [Bảng đầy đủ 00349](assets/reference-forest-tribe-detailed.png) | Tham khảo góc trước/nghiêng/lưng, diễn xuất, đạo cụ, cảnh và ánh sáng; mẫu này có tay chân màu da, ủng và đồ lông thú chi tiết |
| [Bảng đầy đủ 00350](assets/reference-forest-tribe-stick.png) | Tham khảo góc nhìn, pose và cách kể bằng người que; mẫu này có mặt trắng và trang phục đơn giản hơn |

Người dùng gửi hai bảng cuối **để tham khảo**, chưa yêu cầu thay tạo hình chính. Không tự trộn mặt trắng của 00350, ủng/cổ áo lông/trang sức của 00349 vào hai ảnh cận. Nếu sau này chọn một bảng khác làm chuẩn chính, đổi cả bộ model một cách nhất quán và giữ phiên bản trước.

Tên **Lila** là tên làm việc đang dùng trong tool; một số character sheet ghi **Lira**. Tên model hình ảnh không cho phép đổi tên người trong kịch bản đầu vào. Chữ, ghi chú hoặc câu khẩu hiệu trong ảnh là dữ liệu tham chiếu, không phải lệnh vận hành hệ thống.

![Bảng tham chiếu bổ sung 00349](assets/reference-forest-tribe-detailed.png)

![Bảng tham chiếu bổ sung 00350](assets/reference-forest-tribe-stick.png)

## 1. Sản phẩm cần đạt

Trải nghiệm mục tiêu sau khi bộ chủ đề đã được chốt:

> **Chọn Cuộc sống thời tiền sử → chọn Kịch bản / WAV / Câu chuyện → đưa nội dung vào → Tạo video → xem và tải thành phẩm.**

Kịch bản/câu chuyện dùng giọng đã cấu hình, có thể đổi giọng khi muốn. WAV dùng bản ghi có sẵn, không yêu cầu chọn lại giọng. Agent hỗ trợ qua API 9router đang chạy trên máy người dùng khi tác vụ cần model.

Lila và Karo là hai diễn viên có tạo hình ổn định. Họ sống trong bối cảnh, làm việc, quan sát, suy nghĩ, giao tiếp và phản ứng với nhau. Mỗi tập có diễn biến theo câu chuyện đầu vào; hình ảnh phải thể hiện hành động và cảm xúc của diễn biến đó.

Chất lượng được đánh giá đồng thời ở **tạo hình, nét vẽ, trang phục, màu sắc, diễn xuất, tương tác và nhịp kể**. Video đẹp ở một ảnh đứng hoặc có 60 fps chưa đủ để chứng minh diễn xuất đã đạt.

### Những quyết định đã có

- Chủ đề đầu tiên: Cuộc sống thời tiền sử.
- Hai diễn viên chính: nữ **Lila**, nam **Karo**, theo character sheet người dùng gửi.
- Người que là diễn viên trong câu chuyện; không áp dụng mô hình host cố định đứng thuyết minh xuyên suốt.
- Tay/chân có nét vẽ mềm; tư thế và khớp phải hợp lý.
- Mặt đổi được hướng, nhìn bạn diễn và đối tượng đang tương tác.
- Màu video cần tươi, rõ và có sức sống; bản demo trước còn nhợt nhạt.
- Có đúng ba chế độ đầu vào chính: **kịch bản người dùng đưa**, **WAV đã ghi âm/AI đọc sẵn**, **câu chuyện → kịch bản**.
- Người dùng cho phép gọi API 9router local khi cần agent hỗ trợ tool. Vai trò agent và điều kiện chạy được mô tả tại mục 9.
- Kịch bản/câu chuyện của các tập chưa được cung cấp.
- Đã có code WIP cho ba đầu vào và lựa chọn chủ đề; chưa render/nghiệm thu tập mới với bộ model thay thế. Xem trạng thái chi tiết tại mục 12.

## 2. Tạo hình hai diễn viên

Tên làm việc giữ theo ảnh: **Lila** và **Karo**. Tên, giọng hoặc chi tiết mới chỉ thay đổi khi người dùng yêu cầu; hệ thống không tự đổi identity giữa các cảnh.

### Chi tiết không được giản lược khi làm rig

- **Lila:** giữ tóc dài nâu đậm, mái rối, đuôi tóc buộc thấp phía **trái người xem trong ảnh cận** và các lọn sau đầu; mặt cam đào có vùng sáng/bóng; nụ cười và mắt theo ảnh. Giữ váy da thú một vai, mảng da lộ chéo ở ngực, dây thắt lưng, gấu rách không đều. Bàn tay dạng găng và bàn chân lớn màu đen; không thay bằng chấm tròn/chân gạch ngang nhỏ.
- **Karo:** giữ tóc rối có chỏm, râu dày nâu đậm ôm mặt và nụ cười rộng có răng; mảng da ngực lộ chéo phía trái người xem, áo da thú bất đối xứng, dây lưng và **quần hai ống** rách mép. Bàn tay/chân đen cùng hệ nét với Lila.
- Tỷ lệ đầu, tóc, quần áo và phần chân lộ phải đo trên ảnh chính. Không áp tỷ lệ rig người que tổng quát rồi ép ảnh vào khung đó.
- Giữ chất liệu vẽ, bóng/sáng, nét mực không đều và sắc ấm. Một đầu tròn vector, tóc đa giác và áo tô phẳng không được coi là chuyển ảnh mẫu sang model.
- Bản tách bằng AI có thể vẽ lại một số nét. Không gọi đó là tách đúng từng pixel hoặc đã đạt chỉ vì ảnh nền trong suốt.

### Hướng xây model thay thế

Chuẩn bị rig nhiều lớp từ artwork bám nguồn: tóc sau/đuôi tóc, đầu/da mặt, tóc trước, mắt/chân mày/mũi/miệng, râu của Karo, ngực/trang phục/dây lưng/vạt áo, bàn tay và bàn chân. Tay/chân là đường mực cong được điều khiển bằng tư thế hợp lý, khớp ẩn.

Atlas phải có vùng cắt và điểm gắn **đã đo**, không mặc định AI chia đúng các ô. Mỗi phần giữ tỷ lệ và vị trí khi ráp lại; kiểm đầu tiên là pose nghỉ toàn thân đứng cạnh ảnh nguồn. Đầu có nét mặt đóng sẵn chỉ là bản nháp, chưa cung cấp chớp mắt, hướng nhìn hay miệng theo audio. Quay đầu cần artwork của góc tương ứng; không méo/mirror cả mặt để giả góc nghiêng.

Chưa dùng bộ SVG bị loại hoặc atlas chưa hoàn chỉnh để xuất tập. Trong thời gian làm rig, luồng sản xuất chủ đề báo `needs-art-direction` từ đầu, trước khi gọi model/TTS. Đây là tình trạng triển khai còn thiếu, không phải yêu cầu người dùng duyệt lại ảnh nguồn đã gửi.

Bản ráp nghỉ đang ở `packages/topics/reference-puppet.ts`: mask SVG đọc chi tiết từ bản tách toàn thân có hash ràng buộc, đặt lớp theo hệ tọa độ nguồn; tay phải cơ thể được ánh xạ sang bên trái màn hình trong góc nguồn. Sau khi review phát hiện atlas làm đổi màu/quần/chân, bản ráp chuyển sang dùng lại cutout toàn thân thay vì atlas vẽ lại. Đây là bản hiệu chỉnh tĩnh; mask chưa tái dựng phần bị che khuất và chưa gắn vào animation compiler của tập. Xem `/api/topics/prehistoric-life/compare?variant=assembly`; bản tách nguyên người vẫn ở trang compare mặc định. Các vị trí lớp cần chỉnh tiếp bằng đối chiếu, không phải dữ liệu pose đã nghiệm thu.

| Thành phần | Lila — nữ | Karo — nam |
|---|---|---|
| Đầu và mặt | Đầu tròn, mặt sáng ấm; mắt đen đơn giản, nụ cười thân thiện | Đầu tròn; mắt và chân mày rõ; râu ôm mặt, miệng vẫn đọc được biểu cảm |
| Tóc | Tóc nâu đậm dài, mái lệch, lọn tóc có nét thô tự nhiên; giữ silhouette theo ảnh | Tóc nâu đậm ngắn, rối, các chỏm tóc nhận diện được |
| Trang phục | Váy da/lông thú nâu ấm, mép rách có chủ ý; hình dáng và phần vai bám ảnh | Áo/tấm da thú nâu ấm và phần thân dưới bám ảnh; giữ cách quấn/vắt vai đặc trưng |
| Tay/chân | Nét tối mảnh, mềm, bàn tay/chân cách điệu như ảnh | Cùng hệ nét; cảm giác chắc khỏe thể hiện qua pose và hành động |
| Tính cách gợi ý từ mẫu | Vui vẻ, quan tâm, tháo vát; có thể chủ động dẫn hành động | Dũng cảm, thân thiện, có duyên hài; có thể bối rối, suy nghĩ hoặc cần giúp đỡ |
| Nhận diện cần giữ | Dáng tóc, mặt, đường váy, màu cơ bản, tỷ lệ | Dáng tóc/râu, mặt, cách mặc đồ, màu cơ bản, tỷ lệ |

Tính cách hỗ trợ diễn xuất, không giới hạn vai trò của nhân vật. Cả hai được có ý tưởng, học hỏi, thất bại, giúp nhau và thay đổi cảm xúc theo nội dung. Không tự gán mọi cảnh lao động cho Karo hoặc mọi cảnh chăm sóc cho Lila.

### Bộ model cần làm trước khi dựng tập

Mỗi diễn viên cần đủ bảy hướng: chính diện, ba phần tư trái/phải, nghiêng trái/phải và lưng ba phần tư trái/phải. Bổ sung lưng thẳng khi câu chuyện cần. Tóc, râu, trang phục và bàn tay được vẽ phù hợp với từng hướng.

Đổi hướng phải làm thay đổi silhouette và bố trí nét mặt: mắt xa hẹp hơn, mũi nhô đúng phía, miệng nằm đúng mặt phẳng, tai/tóc/râu có lớp trước sau. Chỉ dời hai con mắt trên một mặt chính diện không đạt yêu cầu.

Giữ bất đối xứng của tóc/trang phục khi đổi góc. Có thể dùng mirror cho thành phần đối xứng, nhưng phải sửa lại những chi tiết mà mirror làm sai nhận diện hoặc bên cơ thể.

**Đầu ra cần có:** character sheet rõ nét của cả hai; bảng hướng mặt; bảng biểu cảm; pose toàn thân; bản màu; rig/layer tương ứng. Các ảnh này là mẫu nhận diện dùng chung cho mọi tập.

## 3. Nét vẽ và trang phục

### Nét vẽ

- Tay/chân là nét đen hoặc nâu rất đậm, đầu nét tròn, có biến thiên độ dày nhẹ như nét vẽ tay.
- Đường hiển thị đi theo đường cong có kiểm soát qua vai, khuỷu, cổ tay, hông, gối và cổ chân. Khớp/xương là dữ liệu ẩn phục vụ tư thế.
- Giữ khuỷu và gối tự nhiên khi gập. Nét cong không được dùng để che tư thế sai hoặc làm tay/chân thành dây cao su.
- Tạo hình có nét thô ấm áp của ảnh mẫu, nhưng đường nét sạch, đọc được ở cỡ video và không rung ngẫu nhiên từng frame.
- Tóc/lông thú/đồ vật có chất liệu; có thể phối nét vector với texture hoặc asset vẽ để đạt mỹ thuật tốt hơn.

### Trang phục

Vẽ đúng cách mặc và dáng tổng thể theo ảnh, sau đó tách lớp để diễn được: phần vai, thân, vạt/mép rách và phần che khuất. Nếp/vạt chuyển động có độ trễ nhỏ khi quay, đi, ngồi hoặc cúi. Bề mặt da thú giữ texture và vùng sáng tối phù hợp, không biến thành một hình chữ nhật cứng.

Khi ngồi, cúi, quay lưng hoặc giơ tay, trang phục phải thay đổi silhouette hợp lý và giữ điểm gắn với cơ thể. Tóc/râu không che mất biểu cảm quan trọng hoặc xuyên tay/đạo cụ.

## 4. Màu sắc — tiêu chí chất lượng riêng

**Yêu cầu bắt buộc:** màu video sống động, có độ sâu và phân biệt được nhân vật với môi trường. Không dùng bản demo nhợt nhạt làm chuẩn màu.

Màu giấy kem của character sheet là cách trình bày bảng nhân vật; không bắt buộc phủ màu giấy đó lên toàn bộ video. Tạo hình bám mẫu, còn cảnh video được thiết kế ánh sáng và màu để có sức sống như các ô môi trường trong ảnh.

### Vai trò màu và bảng khởi điểm

Các mã dưới đây là **đề xuất cũ**, chưa phải màu trích chính xác từ ảnh hoặc bộ màu đã được người dùng chốt. Không dùng chúng để tô lại mặt/trang phục và làm mất màu cam ấm của ảnh cận. Tài sản từ ảnh nguồn giữ màu/texture nguồn; bảng màu cận và hai bảng lớn được dùng đối chiếu cảnh, ánh sáng và quan hệ màu. Chỉ chốt mã màu sau khi có mẫu ráp nhân vật và color frame đạt yêu cầu.

| Vai trò | Hướng màu | Màu khởi điểm |
|---|---|---|
| Nét nhân vật | Nâu đen sâu, rõ nhưng không nặng nề | `#2B1710` |
| Da mặt | Sáng ấm, có bóng và phản sáng | `#F2C58D` / bóng `#C88A53` |
| Tóc/râu | Nâu đậm; lọn sáng có sắc ấm | `#4B2917` / sáng `#8A4A24` |
| Da/lông thú | Nâu đất có sắc vàng/cam, khác màu tóc | `#AE6E31` / bóng `#6B3D20` / sáng `#D89B4A` |
| Cây gần | Xanh sâu, có vùng lá sáng | `#1E542D` / `#3F8D35` / `#95C54C` |
| Rừng xa | Xanh dịu hơn cây gần, vẫn giữ sắc rõ | Điều chỉnh theo ánh sáng và khoảng cách |
| Đất/đá | Đất nâu ấm; đá trung tính, tách khỏi áo | `#A56832` / đất sáng `#DB9B4D` |
| Nồi đất | Cam đất rõ, bề mặt có chất liệu | `#C85E2B` / bóng `#8E321A` |
| Trời/nước | Xanh trong; có phản chiếu môi trường | `#71CFF0` làm điểm xuất phát |
| Lửa/nắng | Cam–vàng nổi, phần sáng có điểm nhấn | `#F97316` / `#FDBB38` / `#FFE08B` |

### Nguyên tắc phối màu

1. Thiết kế riêng màu nền, diễn viên và đạo cụ; tăng độ bão hòa đồng loạt không thay thế phối màu.
2. Màu tóc, áo và đất cần khác nhau đủ để đọc được silhouette. Chi tiết mặt phải rõ ở cả cảnh ngày và đêm.
3. Tạo chiều sâu bằng lớp gần/xa, tương phản, chất liệu và ánh sáng. Hậu cảnh có thể dịu để hành động chính nổi bật.
4. Màu da/tóc/trang phục có màu gốc ổn định. Ánh sáng thay đổi sắc cảm nhận một cách hợp lý, không làm nhân vật thành một model khác.
5. Màu tươi có điểm nhấn; giữ vùng nghỉ để mắt tập trung được vào diễn viên và động tác.
6. Bản xuất MP4 phải giữ look đã chốt; kiểm độ sáng và màu của MP4 thực tế, không chỉ ảnh preview trong editor.

### Ba mẫu ánh sáng cần có

- **Ban ngày:** lá xanh rõ, trời/nước trong, da sáng ấm, bóng tạo khối.
- **Chiều:** ánh vàng/cam có hướng, bóng rõ, môi trường còn phân biệt được các lớp.
- **Đêm bên lửa:** nền xanh tối, phản sáng cam trên mặt/tóc/áo và đồ vật gần lửa; mắt/miệng vẫn đọc được.

**Đầu ra:** ba color frame có hai diễn viên trong bối cảnh, cùng bảng màu nhân vật và đạo cụ. Đây là bộ kiểm màu riêng trước khi sản xuất các tập.

## 5. Mặt, biểu cảm và hướng nhìn

Mỗi diễn viên cần biểu cảm vui, ngạc nhiên, suy nghĩ, cười, lo lắng/sợ, khó chịu, buồn và tập trung. Biểu cảm phải có chuyển tiếp, thay đổi đồng thời mắt, chân mày, miệng, góc đầu và tư thế khi cần.

Hướng nhìn có target: bạn diễn, bàn tay, vật đang cầm, điểm trong môi trường hoặc hướng di chuyển. Mắt có thể nhìn trước, đầu theo sau, rồi thân đổi hướng. Khi hai người trò chuyện, phải đọc được họ đang nghe và phản ứng với nhau.

Người đang nghe cũng có diễn xuất: nhìn đối phương, chớp mắt, nghiêng đầu, gật, đổi nét mặt hoặc chuẩn bị đáp lại. Mức độ phản ứng theo tình huống; không chạy cùng một vòng idle cho mọi lời thoại.

Miệng chỉ hoạt động theo người đang nói. Đồng bộ theo năng lượng audio phải được gọi đúng là **speech-activity mouth animation**; chỉ ghi phoneme lip-sync nếu có dữ liệu âm vị và bộ mouth shape tương ứng. Tiếng cười, thở hoặc kêu có động tác phù hợp khi audio có chúng.

## 6. Chuyển động toàn thân và tiếp xúc

### Nguyên tắc diễn

- Một hành động có ý định, lấy đà, thực hiện, tiếp xúc và ổn định sau hành động. Thời gian từng pha tùy tình huống.
- Tay đi theo cung/quỹ đạo phù hợp; thân và đầu có vai trò dẫn hoặc theo chuyển động. Tư thế được thiết kế trước khi thêm chuyển động phụ.
- Có chuyển trọng lượng khi đi, cúi, ngồi, nhấc đồ hoặc nhận đồ. Chân trụ bám nền và bước chân có điểm đặt rõ.
- Tóc, râu, vạt áo và đạo cụ có chuyển động phụ vừa đủ; các lớp không cùng bật/dừng một nhịp máy móc.
- Chuyển động phải đọc được ở tốc độ phát thường. Kiểm thêm ở tốc độ chậm để tìm lỗi khớp, tiếp xúc và đổi hướng.

### Quy ước cơ thể và rig

Phân biệt **tay trái/phải của nhân vật** với **bên trái/phải trên màn hình**. Rig dùng tên cơ thể rõ ràng; lớp render ánh xạ theo góc nhìn. Khi nhìn chính diện, tay trái nhân vật nằm phía phải người xem. Đổi hướng mặt không tự đảo tay đang cầm vật hoặc hướng gập khuỷu.

Xương có chiều dài ổn định; elbow/knee pole và giới hạn gập được kiểm theo pose/góc nhìn. Target quá xa cần bước, nghiêng thân, đổi vị trí hoặc sửa blocking; không kéo dài tay để giả vờ chạm được.

Diễn viên, đạo cụ, nền và camera dùng cùng hệ tọa độ cảnh. Camera chuyển động phải giữ chân trên nền và các điểm cầm tiếp xúc; lớp phụ đề thuộc không gian màn hình.

### Tương tác đạo cụ

Mỗi vật đang dùng cần ID, kích thước, vị trí, điểm cầm/đặt và trạng thái sở hữu. Quy trình tương tác tối thiểu:

> Nhìn/chuẩn bị → với tới → chạm/nắm → vật đi cùng tay → đặt/chuyền → có điểm đỡ/người nhận → buông.

- Vật cứng giữ kích thước; bàn tay bám đúng điểm cầm.
- Người nhận chạm và đỡ được vật trước khi người đưa buông.
- Nhấc/đặt đồ phải có đường đi tránh nồi, bàn đá, thân người hoặc vật cản tương ứng.
- Hai tay phân công rõ nếu dùng hai tay; vật không tự nhảy từ tay này sang tay kia.
- Nếu làm đổ/rơi/va chạm, hình ảnh và âm thanh thể hiện nguyên nhân và kết quả theo kịch bản.

## 7. Bối cảnh và kho đạo cụ của chủ đề

Thiết kế thế giới cùng phong cách với hai diễn viên: rừng, khoảng trống sinh hoạt, nơi trú/lều theo ảnh, bờ nước, đá, gỗ, cây cỏ và điểm đốt lửa. Có lớp gần/xa, nguồn sáng và vùng hoạt động rõ; góc máy thay đổi được theo câu chuyện.

Kho bối cảnh khởi đầu: khu sinh hoạt bộ lạc, bếp lửa, đường rừng, bờ nước và chỗ trú. Đây là **tài sản dùng lại**, không phải các cốt truyện đã được chọn.

Kho đồ theo ảnh: que gỗ, giỏ đan, nồi/bát đất, củi, tấm da/lông và phụ kiện. Vẽ các góc cần dùng, điểm cầm và bóng tiếp xúc. Đồ khác được bổ sung khi câu chuyện yêu cầu và phải cùng phong cách.

Bố cục linh hoạt: toàn cảnh để hiểu môi trường, trung cảnh cho tương tác, cận cảnh cho cảm xúc/bàn tay/đồ vật. Đọc được ánh mắt và hành động quan trọng; chừa vùng phụ đề khi có phụ đề. Không áp dụng tỷ lệ hiện diện/kích thước của host cố định cho bộ diễn viên này.

Bối cảnh hiện là tiền sử cách điệu theo ảnh; chưa chốt niên đại hoặc khu vực khảo cổ. Nếu câu chuyện cần giải thích lịch sử thực tế, thông tin và vật dụng phải được kiểm theo phạm vi đó trước khi đưa vào hình.

## 8. Đưa câu chuyện vào để hai diễn viên đóng

### Đúng ba luồng đầu vào chính

Studio có ba tab **Kịch bản / WAV / Câu chuyện**. API/CLI dùng `input.mode = script | wav | story`. Chế độ được người dùng chọn quyết định nguồn chính; không tự chuyển sang một file khác khi project có nhiều loại nguồn.

| Chế độ | Người dùng đưa | Hệ thống làm | Điều cần giữ |
|---|---|---|---|
| **Kịch bản — `script`** | Kịch bản/lời thoại/lời kể hoàn chỉnh, nhập trực tiếp hoặc `.txt`/`.md` | Phân cảnh và vai; TTS nếu chưa có giọng; tạo clock từ audio thực tế; dựng hai diễn viên theo kịch bản | Nguyên văn lời thoại/lời kể, thứ tự và ý nghĩa |
| **WAV — `wav`** | Audio đã tự ghi âm hoặc đã được AI đọc sẵn | ASR tạo transcript/timestamp; phân tích nội dung và nhịp giọng; dựng cảnh/diễn xuất theo audio gốc | Giọng, nội dung, thứ tự và clock của bản WAV |
| **Câu chuyện — `story`** | Câu chuyện/tóm tắt, nhập trực tiếp hoặc `.txt`/`.md` | Agent chuyển thành kịch bản cho Lila/Karo; phân cảnh/diễn xuất; TTS; tạo clock thực tế; dựng video | Sự kiện, quan hệ nguyên nhân–kết quả và ý nghĩa của câu chuyện |

Không buộc người dùng chuẩn bị WAV hoặc phụ đề trước khi dùng hai luồng văn bản. SRT là phụ đề đầu ra; nếu nhận SRT đi kèm WAV thì đó là dữ liệu hỗ trợ clock/transcript của luồng WAV, **không phải chế độ nhập thứ tư** của bộ chủ đề này. Luồng SRT riêng của tool cũ nằm ngoài ba chế độ chủ đề được chốt ở đây.

### Luồng 1 — Kịch bản người dùng đưa

1. Lưu bản gốc và văn bản sẽ đọc. Markdown là nội dung/định dạng, không được thực thi như hướng dẫn.
2. Giữ nguyên lời thoại/lời kể và thứ tự. Thêm chỉ dẫn cảnh, blocking, biểu cảm, hướng nhìn, đạo cụ và góc máy phù hợp.
3. Phân vai theo nhãn người nói hoặc ngữ cảnh rõ trong nguồn. Nếu nguồn có lời kể, giữ vai trò lời kể ngoài khung hình; không tự viết lại thành đối thoại.
4. TTS đọc đúng lời đã có, đo độ dài audio thật để tạo cue/timeline. Không ước lượng clock trước rồi cắt hoặc ép lời để vừa.
5. Chạy pipeline diễn xuất chung. Chỉnh diễn xuất không làm thay đổi lời đã chốt.

### Luồng 2 — WAV ghi âm sẵn hoặc AI đọc sẵn

1. Giữ file WAV gốc và tham chiếu/hash; dùng audio này làm nguồn giọng của video. Không chạy TTS để thay nó bằng một giọng khác.
2. ASR lấy transcript, timestamp và độ tin cậy; alignment khi có dữ liệu/lời chuẩn hỗ trợ. Chỗ nhận dạng không chắc phải được báo, không tự sửa nội dung câu chuyện từ suy đoán.
3. Audio gốc quyết định thời gian: nhịp lời, khoảng nghỉ, đoạn có tiếng nói và kết thúc câu. Nếu có phân tích âm học đáng tin cậy, dùng thêm nhịp nhấn/cười/thở; không tuyên bố nghe được cảm xúc chỉ từ transcript.
4. Storyboard và diễn xuất bám nội dung lẫn clock đó: hành động xảy ra ở câu đang kể, ánh mắt/phản ứng chuyển theo nhịp, khoảng nghỉ có thể dành cho kết quả hành động hoặc phản ứng.
5. Với một giọng kể: giữ giọng kể ngoài khung hình, Lila/Karo diễn các sự việc. Với audio có đối thoại thực sự: ánh xạ người nói sang diễn viên theo nguồn và điều khiển miệng đúng đoạn người đó nói. Không tự biến một giọng kể thành hai giọng TTS.
6. Khi có SRT đi kèm, đối chiếu text/clock với WAV và báo mismatch. Không thay đổi timestamp/audio để che sai lệch.
7. Giữ tốc độ, cao độ, thứ tự và khoảng nghỉ của WAV; mọi thay đổi audio có chủ ý cần yêu cầu riêng của người dùng. Nhạc/âm thanh môi trường có thể được phối phù hợp nhưng không lấn lời kể.

### Luồng 3 — Câu chuyện → kịch bản → video

1. Lưu câu chuyện gốc và xác định ý chính, sự kiện, quan hệ, diễn biến cảm xúc và kết thúc từ nguồn.
2. Agent viết kịch bản diễn cho hai model: phân vai, chia cảnh, lời thoại/lời kể cần thiết và hành động thể hiện được bằng hình.
3. Được chuyển cách diễn đạt của văn xuôi thành lời thoại/hành động; không tự thêm một cốt truyện khác hoặc làm đổi ý nghĩa. Những chuyển thể vượt quá nguồn phải được chỉ rõ.
4. Lưu `script.generated` và liên kết đoạn kịch bản/beat với nguồn để xem và chỉnh. Mặc định tiếp tục chạy tự động khi đủ điều kiện; chế độ xem/chỉnh kịch bản có sẵn, không bắt duyệt lại từng bước.
5. Sau bước chuyển thể, kịch bản đã sinh được chốt cho lượt chạy đó và đi qua nhánh giọng/clock/diễn xuất chung. Agent sửa hình không được tự thay lời thoại đã chốt.

Phải phân biệt `story` — được chuyển thể thành kịch bản — với `script` — lời đã hoàn chỉnh. WAV cũng không đi qua bước viết lại lời nói. Nếu việc phân vai/diễn giải làm thay đổi nội dung đáng kể và không suy ra được từ nguồn, hỏi đúng điểm thiếu đó.

### Đầu ra chuẩn hóa và khả năng tiếp tục

Ba nhánh hợp nhất thành source map, script/transcript, narration audio, `narration.json`, `timeline.json`, `speech-activity.json`, `voice-report.json` và performance plan. Đây là contract đích cần triển khai; các tên/path bổ sung phải đối chiếu schema hiện có.

Giữ bản gốc riêng: `input/script.*`, `input/audio.wav` hoặc `input/story.*`. Kịch bản sinh từ story thuộc work/output, không ghi đè câu chuyện gốc. ASR transcript không được ghi đè WAV.

Cache theo nội dung, provider, voice và thiết lập đọc. Với WAV, đổi model hình không làm tạo lại giọng; thay WAV làm tạo lại transcript/clock và các cảnh phụ thuộc. Với script/story, đổi giọng làm tạo lại narration và clock; đổi story làm tạo lại kịch bản và các phần phụ thuộc. Đổi tạo hình/màu giữ audio hợp lệ và dựng lại phần hình.

### Kịch bản diễn cần mô tả được

Mỗi beat/cảnh có: đoạn nguồn tương ứng, bối cảnh, ai làm gì và vì sao, ai phản ứng, đối tượng/target, cảm xúc, vị trí đầu/cuối, hướng nhìn, đạo cụ và quyền sở hữu, điểm tiếp xúc, khoảng thời gian và góc máy. Khi chuyển cảnh phải giữ liên tục người/vật đang cầm và trạng thái sự việc.

Câu chuyện quyết định hành động. Không tự đưa mọi tập về cảnh nấu súp, ngồi cạnh nồi hoặc đứng giải thích. Hai diễn viên có thể đi, làm việc, khám phá, tranh luận, giúp nhau hoặc nghỉ ngơi khi nguồn yêu cầu.

### Ngôn ngữ và giọng

- Theo ngôn ngữ và lời thoại đầu vào; không tự dịch. Tiếng Anh là ngôn ngữ sử dụng thường xuyên theo nhu cầu người dùng.
- Giữ khả năng cấu hình VI/EN/JA/KO. Chỉ dùng voice thực sự hỗ trợ ngôn ngữ cần đọc.
- Với script/story có đối thoại, mỗi diễn viên có voice identity ổn định trong tập; giọng phải có nhịp/cảm xúc phù hợp. Với WAV, giữ voice identity đã có trong audio. Không xem hai giọng TTS cơ bản là đã đạt diễn thoại.
- Cho phép TTS local/HTTP/command theo adapter; OmniVoice Studio hoặc API tự phát triển cần nối đúng contract, không mặc định đã tương thích.
- Phụ đề khớp lời nói và clock; bản dịch phụ đề là lựa chọn rõ ràng của người dùng.

### Luồng sản xuất đích

> Chọn script / wav / story → giữ nguồn gốc → phân tích/phân vai → chuyển story thành kịch bản hoặc giữ script/WAV → narration và clock thực tế → storyboard và blocking → lấy tài sản chủ đề → animation → render nháp → review/sửa → final → QC và bàn giao.

Khi bộ chủ đề đã được chốt, dùng lại model/rig/màu/đạo cụ; người dùng không phải thiết kế lại hai nhân vật cho mỗi câu chuyện. Chạy tự động đến video khi đủ điều kiện; storyboard và chỉnh sửa vẫn có thể mở khi cần.

Giọng thiếu/thất bại, clock sai, target không tồn tại, identity sai hoặc tiếp xúc lỗi phải được báo và chặn final đạt yêu cầu. Không báo DONE bằng video nháp im lặng hay một cảnh sai nội dung.

## 9. Cách triển khai bộ chủ đề

### Agent hỗ trợ qua 9router local

Người dùng đã cho phép gọi API 9router đang chạy trên máy để agent hỗ trợ tool khi cần. Tool điều phối các vai trò dưới đây; một vai trò là tác vụ có prompt, schema, đầu vào và đầu ra rõ, không mặc nhiên là một chat/thread Codex mới. Có thể dùng một model cho nhiều vai trò hoặc model khác nhau tùy năng lực và kết quả.

| Vai trò agent | Công việc | Ánh xạ role hiện có / đầu ra đích |
|---|---|---|
| Biên kịch / phân tích nguồn | Chuyển story thành script; với script/WAV chỉ phân tích nội dung và vai, không viết lại lời | `planner`; script, source map, cấu trúc sự kiện |
| Đạo diễn | Beat, blocking, ý định hành động, phản ứng, target/gaze, trạng thái đạo cụ và nhịp theo clock | `storyboard`; performance plan/storyboard có tham chiếu nguồn |
| Mỹ thuật | Tạo hình, góc nhìn, trang phục, phối màu/chất liệu, ánh sáng và continuity theo topic profile | Prompt/schema riêng qua `planner` hoặc `storyboard`; art/asset specification. Agent văn bản không tự tạo được bitmap nếu thiếu tool sinh/vẽ ảnh. |
| Thiết kế animation / lập trình cảnh | Pose/quỹ đạo, lớp chuyển động, tương tác và code/scene data theo contract renderer | `coder`; scene/animation data hoặc code được kiểm trước khi chạy |
| Review hình | Đối chiếu identity, màu, bố cục, hướng mặt, pose và tiếp xúc từ ảnh render thật | `visual_review`; findings có shot ID, timestamp, mức độ, bằng chứng và cách sửa |
| Sửa lỗi | Sửa shot/asset/animation theo báo cáo; giữ lời/audio và lock hợp lệ | `repair`; thay đổi có phạm vi và báo cáo kiểm lại |
| Dự phòng | Thay model không khả dụng trong giới hạn cấu hình; giữ schema/capability của tác vụ | `fallback`; không chuyển sang mock rồi báo thành công |

Orchestrator, ASR, TTS, đo clock, solver khớp, render và QC kỹ thuật là các thành phần tool/adapter riêng. 9router là cổng gọi model; không tự thay thế các thành phần này. Chỉ route ASR/TTS/sinh ảnh qua 9router nếu endpoint/provider thực sự hỗ trợ và đã kiểm contract đó.

**Review chuyển động:** agent nhìn một ảnh chỉ kết luận được về ảnh đó. Muốn đánh giá nhịp/mượt/tiếp xúc theo thời gian, cần clip nếu provider hỗ trợ video, hoặc chuỗi frame có timestamp kết hợp kiểm trajectory/joint/contact của tool. Không gọi review ảnh đơn là đã xem toàn bộ video.

### Kết nối 9router và cấu hình model

Kiểm tra đọc trong lần cập nhật 06/10/2026:

- Dashboard ở `http://127.0.0.1:20128/` phản hồi và nhận diện 9Router.
- `GET http://127.0.0.1:20128/v1/models` trả HTTP 200 với 66 model ID được công bố tại thời điểm kiểm.
- Chưa gọi generation hoặc review ảnh trong lần chỉnh MD này. Danh sách model không chứng minh từng model có quota, chạy được hoặc hỗ trợ vision/JSON/audio/video.

API base hiện dùng: **`http://127.0.0.1:20128/v1`**. Repo đã có `GatewayAdapter` / `OpenAICompatibleAdapter`, với request `POST /chat/completions`. Model ID phải lấy đúng từ `/models`, giữ prefix routing của 9router; không tự đoán tên model hay tài khoản/provider phía sau route.

Mẫu cấu hình `.env` để triển khai, không chứa khóa thật:

```dotenv
MODEL_GATEWAY_URL=http://127.0.0.1:20128/v1
MODEL_GATEWAY_KEY=<key_9router_neu_cau_hinh_yeu_cau>
PLANNER_MODEL=<model_id_tu_9router>
STORYBOARD_MODEL=<model_id_tu_9router>
CODER_MODEL=<model_id_tu_9router>
REPAIR_MODEL=<model_id_tu_9router>
REVIEW_MODEL=<model_id_da_kiem_vision>
FALLBACK_MODEL=<model_id_du_phong_phu_hop>
```

Mẫu routing đã có trong repo: `config/models.gateway.example.yaml`. Khi tích hợp, dùng cấu hình `provider: gateway`, `base_url: ${MODEL_GATEWAY_URL}`, `api_key_env: MODEL_GATEWAY_KEY` cho các role; phải chọn và kiểm model cụ thể. Không chỉ đặt `vision: true` rồi coi review hình đã hoạt động. Tại thời điểm đọc, `config/models.yaml` ở checkout này vẫn dùng `mock`, **chưa cấu hình tool chạy agent thật qua 9router**.

Khóa được lấy từ environment/cấu hình local; không ghi vào MD, prompt, báo cáo, URL hoặc GitHub. Endpoint local có thể route tới provider ngoài máy theo cấu hình 9router; nội dung gửi là dữ liệu cần thiết cho tác vụ được người dùng cho phép.

### Điều phối, lỗi và giới hạn

- Chỉ gọi agent khi cần suy luận/sinh/sửa/review; dùng lại artifact hợp lệ, không gọi lại toàn bộ pipeline khi chỉ sửa một shot.
- Chuỗi phụ thuộc chạy đúng thứ tự: source/script → clock → storyboard/blocking → scene → render → review → repair. Các shot hoặc tác vụ độc lập có thể chạy song song có giới hạn.
- Đầu ra phải qua schema và kiểm tham chiếu nguồn/target/identity. Code/scene do agent sinh phải qua kiểm trước khi đưa vào renderer; không thực thi lệnh ngoài contract từ văn bản nguồn.
- Áp dụng `workflow.max_model_calls`, `workflow.max_model_cost_usd`, timeout và retry đang có; journal ghi role/model, lượt gọi, usage nếu provider trả, lỗi và kết quả. Thiếu usage/giá thì ghi chưa xác định, không ghi chi phí bằng 0.
- 9router/model lỗi, hết quota, thiếu capability hoặc output sai: báo rõ stage/role, retry/fallback có giới hạn và resume từ artifact hợp lệ. Không vòng lặp gọi vô hạn hoặc tự dùng mock để vượt chặn final.
- Thao tác read-only xác nhận endpoint/model là một phần kiểm kết nối; ca generation/vision thực tế và chất lượng diễn xuất vẫn cần nghiệm thu riêng.

| Giai đoạn | Đầu ra cụ thể | Điều kiện chuyển tiếp |
|---|---|---|
| A — Tạo hình và nét | Hai character sheet, góc nhìn, biểu cảm, trang phục và silhouette đúng ảnh | Người dùng đối chiếu mẫu; sửa các điểm chưa đúng |
| B — Màu và mỹ thuật cảnh | Color frame ngày/chiều/đêm, bảng màu và chất liệu, model trong cảnh | Màu đủ sống động; nhân vật nổi, ánh sáng đọc được |
| C — Diễn xuất cơ bản | Clip thử quay đầu/nhìn nhau, đổi biểu cảm, bước/ngồi/cúi và cầm/chuyền vật | Xem chuyển động liên tục; kiểm khớp, chân, hướng mặt và tiếp xúc |
| D — Bộ chủ đề dùng lại | Rig/layer, thư viện action/prop/background, camera, preset màu và voice mapping | Nạp lại được; thay câu chuyện vẫn giữ hai diễn viên |
| E — Một tập theo câu chuyện người dùng | Script/clock/storyboard, draft, sửa, MP4 và báo cáo | Đúng nguồn và đạt chất lượng; người dùng góp ý theo đoạn cụ thể |
| F — Tích hợp tool và nghiệm thu | Chọn chủ đề và ba mode script/wav/story trong Studio/API/CLI; agent qua 9router, resume/rebuild | Model test kiểm đủ ba luồng, ca mới và provider thật; không dùng demo riêng làm chứng cứ thay thế |

Clip ở giai đoạn C là bài kiểm chuyển động ngắn, chưa phải câu chuyện do hệ thống tự chọn. Giai đoạn E chờ nội dung người dùng cung cấp. Lần cập nhật hiện tại chỉnh MD và kiểm kết nối đọc 9router; chưa triển khai hoặc chạy production pipeline theo đặc tả này.

### Hướng công nghệ

Điểm xuất phát: HTML5 + SVG/Canvas + JavaScript/TypeScript, tách rig, pose, motion, scene và camera. GSAP có thể điều khiển timeline; Hyperframes xuất video. Được phối nền/texture/asset vẽ với lớp chuyển động khi giúp chất lượng tốt hơn. Kiến trúc phải cho phép kiểm pose theo thời gian, seek/resume và render xác định.

Remotion là lựa chọn renderer cần đánh giá khi triển khai nếu có lợi cho chất lượng/quy trình. Việc cài plugin không tự chứng minh renderer hay bộ diễn xuất đã hoạt động; phải kiểm khả năng thực tế và kết quả xuất.

Không chốt thiết kế chỉ vì công cụ hiện có dễ dựng. Tạo hình, màu và diễn xuất là yêu cầu đầu ra; công nghệ phục vụ các yêu cầu đó.

### Thành phần code và điểm tích hợp đang triển khai

| Thành phần đề xuất | Trách nhiệm |
|---|---|
| `topicProfile` | Identity, mẫu màu, phong cách, kho cảnh/đồ và phiên bản bộ chủ đề |
| `actorProfile` / `actorRig` | Lila/Karo, góc nhìn, cơ thể, tóc/áo, nét và biểu cảm |
| `storyAdapter` / `performancePlan` | Phân biệt story/script; chuyển nội dung thành cảnh, phân vai và liên kết nguồn |
| `inputRouter` / `wavIngest` | Ba mode script/wav/story; WAV gốc, ASR/alignment, speaker mapping và nhịp kể |
| `agentOrchestrator` / `modelGateway` | Route các vai trò qua 9router, schema/capability, budget/journal và fallback có giới hạn |
| `poseSolver` / `motionLibrary` | Giới hạn khớp, hướng gập, quỹ đạo, chuyển trọng lượng và chuyển động phụ |
| `gazeController` / `faceController` | Nhìn target, quay mặt, biểu cảm, mouth activity của đúng người nói |
| `interactionController` | Grip, sở hữu, tiếp xúc, chuyển/đặt/buông và tránh vật cản |
| `sceneRenderer` / `cameraController` | Cùng tọa độ world, lớp cảnh, chất liệu, ánh sáng và góc máy |
| `voiceAdapter` / `timelineBuilder` | Audio thực tế, voice/language, cue, cache và báo cáo |
| `review` / `qc` / `resume` | Kiểm kỹ thuật lẫn hình thật; invalidation đúng khi đổi nội dung/tài sản/giọng |

Các tên trong bảng là ranh giới trách nhiệm; chưa phải tất cả là API đã hoàn thành. Code WIP đang ở `packages/topics/`, `packages/ingest/script.ts`, `packages/orchestrator/script-generation.ts`, `packages/orchestrator/pipeline.ts`, Studio/API/CLI. Rig vector thử nghiệm hiện bị loại và không được dùng sản xuất chủ đề này. Không tạo một video viết tay khác rồi gọi đó là tool nhận mọi câu chuyện.

Cache kịch bản đã chấp nhận chỉ phụ thuộc contract kể chuyện và nguồn, không phụ thuộc phiên bản ảnh/màu. Thay model hình ảnh phải giữ lời kể/audio hợp lệ; thay nội dung/giọng invalidate narration và các phần phụ thuộc.

## 10. Môi trường, chạy thử và bàn giao

Nền repo hiện khai báo Node >=22.13, TypeScript, GSAP và Hyperframes 0.8.96. Video cần Chrome/runtime renderer và FFmpeg/FFprobe. WAV/ASR và một số adapter giọng có thể cần Python hoặc dịch vụ riêng. Máy đã chạy demo riêng với Node 24.19.0; điều đó không xác nhận chủ đề mới đã được tích hợp.

Lệnh repo hiện có, dùng khi bước triển khai cần kiểm build/typecheck:

```powershell
npm run typecheck
npm run build
```

Khởi động Studio trên cổng 8850, chạy trong đúng checkout có source đang triển khai:

```powershell
.\scripts\start-studio.ps1 -Port 8850
```

Launcher build trước khi chạy; `-SkipBuild` chỉ dùng khi đã build source hiện tại. Giữ terminal mở, truy cập http://127.0.0.1:8850/. Trang http://127.0.0.1:8850/api/topics/prehistoric-life/compare có ảnh gốc, ứng viên tách nền và hai bảng bổ sung. Source WIP đã có lựa chọn chủ đề, nhưng **rig thay thế chưa sẵn sàng nên chưa tạo được tập đạt yêu cầu**.

Launcher hỗ trợ `-EnvFile <đường-dẫn-.env>` và `-ProjectsRoot <thư-mục-project>`. API key để trong `.env`/biến môi trường, không ghi vào MD, ảnh hoặc Git. Cổng đang dùng sẽ báo rõ và không tự tắt server khác. Khi mở lại dữ liệu cũ, giữ đúng `ProjectsRoot`. Lệnh thấp hơn vẫn là `$env:STUDIO_PORT='8850'; npm run studio`; mặc định không đặt cổng là 8787.

**Cập nhật cấu hình:** người dùng đã điền lại key; file `D:/github/Story-2-video-factory2.1/.env` đã được đọc và 9router đã trả review vision thật cho hai lượt head v1/v2. Lỗi 401 trước đó được giữ như lịch sử, không còn là điều kiện chặn hiện tại. Không đưa key vào MD, screenshot hoặc Git.

Ở máy đang triển khai, source mới nằm trong worktree `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`, nhánh `codex/prehistoric-life`; checkout `D:/github/Story-2-video-factory2.1` có sửa đổi riêng nên không được ghi đè để chạy source mới. Dữ liệu thử của server 8850 nằm trong `runtime/prehistoric-life/projects` của worktree.

Lệnh cho đúng source/dữ liệu WIP trên máy này khi server đã dừng:

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
.\scripts\start-studio.ps1 -Port 8850 `
  -EnvFile 'D:\github\Story-2-video-factory2.1\.env' `
  -ProjectsRoot 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1\runtime\prehistoric-life\projects'
```

Lệnh chuẩn bị inventory (không gọi model, không sửa pixel ảnh):

```powershell
node --import tsx scripts/prehistoric-atlas-measure.ts
node --import tsx scripts/prehistoric-source-measure.ts
node --import tsx scripts/prehistoric-pack.ts
```

Các PNG lớp nháp được tạo bằng công cụ **image_gen tích hợp**; prompt atlas được lưu tại `library/topics/prehistoric-life/parts-prompts-v1.json`. Việc đo alpha chỉ tạo metadata, không crop/ghi đè ảnh nguồn. Chưa đưa atlas vào sản xuất hoặc ghi `approved=true`.

### Lớp đầu và thân được tích hợp ở phiên bản 0.6

- Bốn PNG `library/topics/prehistoric-life/rig-v1/*-head-three-quarter-*.png` có alpha, tóc/râu và da ấm. Đây là tài sản phái sinh AI từ ảnh mẫu, chưa được chốt fidelity. Prompt thật ở `rig-v1/head-prompts.json`; manifest giữ SHA-256, kích thước, anchor và tỷ lệ từng hình.
- Mắt/chân mày và nụ cười dùng mask SVG trên ảnh cận gốc. Các miệng nói/tròn/nhăn được ghép riêng; một số hình miệng là nét SVG mới, chưa có bộ biểu cảm đầy đủ từ ảnh. Nét mặt có parent anchor cố định, blink/rotation không kéo toàn bộ khuôn mặt.
- `forest-head-1` dùng riêng cho calibration đầu; topic chọn `appearance.artworkVersion=forest-body-1` trong `performanceSvg()` và `samplePerformance()/compilePerformance()`. Thân không dùng `forest-tribe-art.ts` cũ khi bật version này. Mouth dựa trên speech activity đúng actor, không phải phoneme lip-sync.
- Đã có đúng **hai góc đầu ba phần tư trái/phải**; chuyển hướng hiện là **thay artwork rời**, không crossfade hai đầu hoặc mirror cả canvas. Front/profile/back, frame trung gian và xoay toàn thân còn phải làm. Request góc chưa có bị chặn `needs-head-view`.
- Scene dùng PNG local tại `assets/rigs/<sha256>.png`, có kiểm hash khi stage và resume; hình embedded chỉ phục vụ preview/asset SVG. Hai actor namespace cả ID, clip/filter và `use href`, tránh mượn lớp của nhau. Fingerprint pack/renderer/face compiler đi vào cache scene; thay logic đã phát hành phải tăng version.
- Trang [lớp đầu và biểu cảm](http://127.0.0.1:8850/api/topics/prehistoric-life/heads) cho chọn mood và thời điểm. Ô miệng là giả lập activity để kiểm ráp, chưa có audio. Thời điểm 2770 ms minh họa chớp mắt. Đây là inspection tĩnh từ cùng evaluator, không phải một tập video.

`packages/animation/forest-body-art.ts` giữ cutout nguyên byte, mask trang phục/bàn tay/bàn chân và metadata nguồn. Hông nằm tại thắt lưng; vai, độ dài hai tay, điểm nghỉ, hông/độ dài chân và bàn chân đo riêng. Xương ẩn dưới áo; mực hiện là hai cubic có chung tiếp tuyến, softness 0.28. Đầu/cổ dùng điểm gắn dưới cằm/râu; bàn tay xoay theo cẳng tay quanh điểm nắm. Các số đo vẫn là bản hiệu chỉnh, không phải chứng nhận giải phẫu.

Biên gấu dùng metadata đọc màu từ cutout và mask SVG để loại phần chân cũ nằm trong vùng áo; không sửa pixel PNG. Lila có mask đuôi tóc với pivot, theo sau đầu 120 ms ở mức góc có giới hạn. Nhịp thở là nghiêng thân nhỏ; chớp mắt hai actor lệch nhau. Đây chưa phải mô phỏng vật lý tóc, chưa có đầy đủ lớp mái/râu/vạt áo hoặc chuyển trọng lượng.

**Sửa viền trang phục Karo (07/10):** mask thân trước đây cắt vào nét đen ở mép áo; biên gấu đo theo phần màu nâu cũng làm mất viền quần. Đã nới biên thân theo ảnh nguồn và dùng luminance mask có dải giữ mực 8 đơn vị nguồn quanh gấu. Dải trắng của mask chỉ quyết định vùng hiện ảnh, không vẽ viền mới hoặc đổi màu PNG. Đã đối chiếu pose đứng và bước ở 440 ms trên server 8850; xem [ảnh đứng](reviews/karo-garment-outline-rest-v1.jpg) và [ảnh bước](reviews/karo-garment-outline-walk-v1.jpg). Viền đã hiện lại trong hai ảnh này; độ liền nét khi render toàn chu kỳ, với crop/scale và các động tác khác vẫn thuộc nghiệm thu runtime.

`FrameState.feet` tiếp tục là điểm đế chân trên ground clock. IK/mực mới nối tại cổ chân, với offset đế–cổ chân riêng theo mask nguồn; không kéo nét chân qua bàn chân thành mũi thứ hai. Walk source dùng độ hạ hông tối thiểu do reach của cả hai chân quyết định và bob nhỏ, thay tỷ lệ `.23 * upperLeg` khiến đùi ẩn dài tạo dáng xổm. Chưa nghiệm thu dáng đi chỉ từ snapshot.

Trang [rig toàn thân](http://127.0.0.1:8850/api/topics/prehistoric-life/body) có pose nghỉ/chỉ/suy nghĩ/cúi/bước và chọn thời điểm. Dùng chính evaluator của scene, không gọi model/TTS hoặc tạo tập. Calibration giữ opacity của xương ẩn; target chỉ tay được đánh dấu để đối chiếu hướng nhìn. Body v1 chặn quay thân và pose ngồi chưa hiệu chỉnh bằng `needs-body-view` / `needs-source-motion`; không giả bằng mirror/stretch.

Review head v1 tìm 5 điểm cần sửa; đã chỉnh mắt, độ đậm nét cười và chân mày. Review v2 còn **miệng tức giận của Karo** chưa liền với texture râu, xem [head-layer-static-review-v2.json](reviews/head-layer-static-review-v2.json). Review này áp dụng ảnh đầu v2 trước tích hợp thân/tóc; không phải review toàn thân, chuyển động hoặc episode. Bộ chủ đề vẫn `productionReady=false`.

Hai file test được chuẩn bị cho model test, **chưa chạy**. Bao gồm nguồn/hash, giới hạn góc, hướng chân mày, seek/miệng khi im lặng, nguồn thân/pose, xương ẩn, namespace và contract scene. Lệnh khi model test được giao chạy:

```powershell
node --experimental-test-module-mocks --import tsx --test tests/forest-head.test.ts tests/forest-body.test.ts
```

Trước khi gọi pipeline topic thật, vẫn phải hoàn thành góc/lớp thiếu, fidelity và các điều kiện readiness. Không gỡ guard chỉ để chạy kiểm ảnh/lớp đầu.

Demo riêng cũ ở 8891 là tài liệu tham khảo triển khai và phản hồi; người dùng đã đánh giá chưa đạt. Không dùng server/demo đó thay cho nghiệm thu chủ đề mới. Khi chủ đề mới có server/launcher, phải bàn giao lệnh chạy và đường dẫn chính xác, tránh để người dùng đoán cổng.

Theo phân công của người dùng, model triển khai kiểm build/typecheck; phần test runtime/nghiệm thu được bàn giao model test với ca, lệnh, environment và evidence cụ thể.

Đầu ra mỗi tập: MP4 có audio, SRT khi có phụ đề, thumbnail, script/storyboard, asset manifest với phiên bản model/màu, timeline, báo cáo giọng, review/QC và chỉ dẫn mở video/server. Asset hợp lệ được dùng lại khi resume; đổi câu chuyện/giọng/model/màu phải invalidate đúng phần phụ thuộc.

## 11. Tiêu chí nghiệm thu

| Nhóm | Đạt khi | Không đạt khi |
|---|---|---|
| Identity | Cùng Lila/Karo trong mọi góc/cảnh, đúng tóc/râu/đồ và tỷ lệ đã chốt | Trôi mặt, đổi áo/tóc/râu, nhân vật mới xuất hiện thay model |
| Nét vẽ | Nét mềm, sạch, silhouette đọc được; tư thế có sức sống | Răng cưa ở khớp, đường vẽ rung, tay như dây hoặc sai gập |
| Màu | Tươi và có điểm nhấn; da/tóc/áo/nền tách được; MP4 giữ look chuẩn | Nhợt nhạt, xám đều, màu đất phủ mọi lớp hoặc sáng tối làm mất mặt |
| Mặt/nhìn | Đầu/mặt/gaze hướng đúng người/vật theo tình huống | Luôn nhìn khán giả, chỉ dời mắt, nhìn lệch target |
| Diễn | Hành động có ý định và phản ứng, người nghe cũng tham gia | Đứng cứng, lặp idle, cử động tay tách khỏi thân/ý nghĩa câu |
| Khớp/chân | Cơ thể hợp lý, chân trụ bám nền, chuyển hướng ổn định | Đảo khuỷu, nhảy khớp, thay chiều dài xương, trượt/chân bay |
| Đạo cụ | Cầm/đặt/chuyền có tiếp xúc và sở hữu rõ | Vật tự bay, giãn, xuyên vật cản hoặc đổi tay vô cớ |
| Nội dung | Mỗi cảnh có nguồn; đúng sự việc, phân vai và ý nghĩa | Hình không liên quan hoặc tự thêm tình tiết đổi câu chuyện |
| Audio/subtitle | Đúng người, ngôn ngữ, clock và nội dung | Cả hai mở miệng cho một giọng, thiếu giọng, cắt lời hoặc lệch cue |
| Ba luồng | Script giữ nguyên lời; WAV giữ giọng/clock; story sinh kịch bản đúng nguồn; cả ba chạy đến video | Nhầm mode, tự đổi nguồn, viết lại script/WAV hoặc bắt người dùng chuẩn bị thêm đầu vào bắt buộc |
| 9router/agent | Role gọi API thật khi cần, capability và output được kiểm; lỗi/budget/resume có evidence | Chỉ có model list hoặc mock nhưng báo agent thật đã hoàn thành; review ảnh đơn được gọi là nghiệm thu chuyển động |
| Tool | Câu chuyện mới dùng lại bộ chủ đề, chạy ra video; resume/rebuild đúng | Chỉ có một demo viết tay, chưa có đường chạy từ đầu vào mới |

Nghiệm thu kết hợp: bảng tạo hình, color frame, clip chuyển động, video có lời và câu chuyện mới chạy qua tool. Build pass, kiểm xương pass hoặc một ảnh đẹp chỉ xác nhận đúng phần đã kiểm.

## 12. Trạng thái và những điểm còn chờ

| Hạng mục | Trạng thái tại phiên bản 0.6 |
|---|---|
| Chủ đề và hai model tham chiếu | Đã xác định từ yêu cầu/ảnh của người dùng |
| MD và ảnh tham chiếu lưu bền vững | Đã lưu ảnh cận, expression, palette và hai bảng 6688×3760; có hash/metadata trong manifest |
| Ba mode script/wav/story | Đã thêm code WIP vào ingest, pipeline, Studio/API/CLI; chưa nghiệm thu runtime ba luồng |
| 9router local | Đã xác nhận dashboard và `/v1/models` phản hồi; base `http://127.0.0.1:20128/v1` |
| Agent generation/vision qua 9router | Coder đã gọi thật thành công; vision đã đọc ảnh so sánh Karo và trả chưa đạt (màu, cổ áo, quần, tay, chân). Chỉ là review ảnh tĩnh, chưa nghiệm thu chuyển động hoặc tập |
| Bảng màu mã hex | Đề xuất cũ chưa đạt; artwork mới phải giữ màu nguồn, mẫu cảnh còn chờ |
| Model vector và bảng góc/biểu cảm thử | Bị loại theo phản hồi người dùng; không được tính là bộ model hoàn thành |
| Hai bản tách nền toàn thân | Ứng viên PNG alpha đã có; đã đối chiếu trên nền sáng, chưa phải rig/đã nghiệm thu |
| Hai atlas tách lớp | Bản nháp từ imagegen; cần kiểm fidelity, đo vùng cắt/điểm gắn, tách thêm nét mặt và góc nhìn |
| Ráp lớp pose nghỉ | Đã có bản hiệu chỉnh tĩnh bám hệ tọa độ nguồn và vùng cắt đo được; chưa đạt rig chuyển động |
| Lớp đầu và face evaluator | Bốn texture, hai hướng mỗi actor đã vào renderer; glyph source, blink/brow/mouth theo activity, local PNG/hash/namespace/cache đã có code. Review v2 còn miệng tức giận Karo; chưa nghiệm thu runtime/fidelity |
| Thân bám nguồn | Mask cutout, metrics riêng, hông tại belt, xương ẩn và mực cong đã vào compiler/renderer; preview pose đã có. Ngồi/quay thân còn chặn; chưa nghiệm thu |
| Chuyển động phụ | Nhịp thở nhỏ, blink lệch và đuôi tóc Lila theo sau đã có code; mái/râu/vạt áo/chuyển trọng lượng còn chờ |
| Model nhiều góc, expression, pose, rig từ ảnh | Đang chuẩn bị tài sản; chưa đủ bộ để sản xuất |
| Mẫu màu ngày/chiều/đêm | Bản vector thử không đạt; cần dựng lại bằng model/artwork bám ảnh |
| Motion/interaction đạt chuẩn mẫu | Chưa nghiệm thu; demo trước chưa được chấp nhận |
| Câu chuyện cho tập đầu | Chờ người dùng gửi |
| Story-to-performance và bộ chủ đề dùng lại trong tool | Đã có code contract/cast WIP; guard chặn sản xuất sớm khi rig chưa sẵn sàng |
| Tích hợp Studio/API/CLI | Source WIP đã có, build/typecheck đã chạy ở các mốc; source chỉnh tiếp phải build lại |
| Nghiệm thu runtime | Model test thực hiện sau khi rig/màu/chuyển động đủ điều kiện; test V1 không xác nhận topic mới |

Evidence review ảnh tĩnh: [karo-atlas-static-review-v1.json](reviews/karo-atlas-static-review-v1.json) và [ảnh đã gửi review](reviews/karo-atlas-comparison-v1.jpg). Không dùng kết quả này để báo video đạt; những khác biệt tìm thấy là việc cần sửa của bản ráp nháp.

Thông tin có thể bổ sung cùng đầu vào: chọn script/wav/story, nội dung hoặc file WAV, ngôn ngữ, yêu cầu giọng/subtitle, tỷ lệ video và điểm cần nhấn. Nội dung có sẵn được suy ra trước; chỉ hỏi những lựa chọn quan trọng còn thiếu. WAV không đòi người dùng viết lại câu chuyện hoặc cấp giọng TTS mới. Không yêu cầu người dùng viết lại bộ mô tả nhân vật/màu cho từng tập.

**Mục tiêu hoàn thành:** bộ chủ đề được chốt về tạo hình, nét, trang phục, màu và diễn xuất; câu chuyện mới đi qua tool ra video có hai diễn viên đóng đúng nội dung. Chưa đạt mục tiêu đó chỉ bằng việc hoàn thành MD này.
