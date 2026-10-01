# Người que dẫn dắt câu chuyện — kịch bản hình ảnh và diễn xuất V2.2

Ngày: 2026-10-01. **Đây là đặc tả cần triển khai, chưa phải mô tả một renderer đã hoàn thành.** Các contract narration của V2.1 tiếp tục được giữ. Hướng dẫn mới này thay yêu cầu mặc định “host đứng cạnh sơ đồ” bằng một nhân vật chính có diễn xuất trong bối cảnh.

## 1. Sản phẩm cần tạo

Người dùng đưa một bài kể/giải thích bằng kịch bản, WAV hoặc SRT. Một người que cố định đưa người xem đi qua bài đó: xuất hiện trong cảnh, quan sát vấn đề, suy nghĩ, di chuyển, thao tác, phản ứng với kết quả và dẫn sang ý tiếp theo. Robot mini là lựa chọn nhân vật khác dùng cùng hệ diễn xuất.

Nhân vật chính có thể ở trong xưởng, trên đường, cạnh một mô hình hoặc trong không gian minh họa phù hợp với lời kể. Nhân vật không bị cố định ở một góc và không bị giới hạn ở việc giơ tay chỉ một lưới icon.

**Có hai lớp kịch bản riêng:**

| Lớp | Nguồn quyết định | Quyền của hệ thống |
|---|---|---|
| Lời kể | Kịch bản nguyên văn, transcript WAV hoặc cue SRT đã chọn | Chuẩn hóa định dạng/clock theo contract; không thêm, bỏ hoặc viết lại lời |
| Hình ảnh và diễn xuất | Ý nghĩa lời kể, source refs, hồ sơ nhân vật và đặc tả này | Dàn cảnh, lựa chọn động tác/biểu cảm/camera, tạo minh họa có nguồn |

“Viết lại kịch bản” trong đợt này nghĩa là viết lại **kịch bản hình ảnh và diễn xuất**, không tự sửa kịch bản lời kể của người dùng. Nếu input không có câu hỏi hoặc lời kết, không thêm chúng vào audio để ép câu chuyện vào một công thức.

## 2. Cách dùng hai video tham khảo

- [Mẫu 1 — Stickman Thời Tiền Sử](https://www.youtube.com/shorts/YQTuA9F7XNE): tham khảo người que trong môi trường có chiều sâu, sự liên hệ giữa tay/đồ vật, các cảnh rộng và cảnh cận cảnh.
- [Mẫu 2 — Người Cổ Đại Thực Sự Làm Gì Suốt Cả Ngày?](https://www.youtube.com/watch?v=CEWInYakipQ): tham khảo nhân vật trong tình huống, cách gương mặt và tư thế thể hiện trạng thái, cách tình huống dẫn sang phần giải thích.
- Ảnh do chủ dự án cung cấp là tham chiếu tạo hình: đầu tròn sáng, nét tay/chân đơn giản, mặt dễ đọc, nhân vật gắn với bối cảnh và đạo cụ.

Đã mở hai video bằng trình duyệt và quan sát các đoạn chọn lọc; mẫu 2 có transcript tiếng Việt tự động. Không coi transcript tự động là nguồn kiểm chứng lịch sử. Không tuyên bố đã phân tích từng frame của toàn bộ video 20 phút. Không suy ra công cụ sản xuất của tác giả từ hình ảnh.

Chỉ tham khảo ngôn ngữ kể chuyện/diễn xuất. Các đoạn ảnh tư liệu, ảnh tĩnh hoặc pan/zoom nguyên một tranh **không phải chuẩn nghiệm thu chuyển động nhân vật**. Nền vẽ có thể là ảnh; nhân vật, đạo cụ tương tác, mặt và camera phải là những lớp độc lập.

## 3. Nhân vật chính và tính liên tục

Một video dùng một `leadCharacterId`, một profile đã duyệt và một rig version. Người que là người dẫn chuyện và người tham gia **minh họa**: có thể thử vận hành một mô hình hoặc bước qua các bối cảnh để giải thích. Không tự biến thành James Watt, Karl Benz hoặc tuyên bố những hành động minh họa là sự kiện lịch sử.

Giữ silhouette, hình đầu, nét, tỷ lệ, cấu trúc mặt và dấu nhận diện qua cảnh. Trang phục/đạo cụ theo bối cảnh là lớp riêng đã duyệt; không sinh lại đầu/mặt ở mỗi shot. Không bắt mọi đề tài dùng áo da thú hoặc cầm lao chỉ vì video tham khảo nói về tiền sử.

Nhân vật phụ chỉ xuất hiện khi narration có cơ sở và storyboard cần đến; có ID riêng, không thay người dẫn chuyện. Mặc định vẫn là một nhân vật chính, không bắt buộc có diễn viên phụ.

## 4. Cấu trúc kể chuyện bằng hành động

Mỗi beat cần trả lời: **nhân vật đang muốn làm gì, tác động vào đâu, điều gì thay đổi và người xem hiểu thêm điều gì?**

| Chức năng trong câu chuyện | Diễn xuất gợi ý | Kết quả cần nhìn thấy |
|---|---|---|
| Đưa người xem vào tình huống | Bước vào cảnh, nhìn quanh, nhận ra một đồ vật/vấn đề | Nhân vật và bối cảnh liên quan đến lời kể |
| Thể hiện khó khăn | Dừng lại, chuyển trọng tâm, nghiêng đầu, nhìn lại đối tượng | Người xem hiểu vấn đề trước khi có lời giải |
| Tìm hiểu | Quan sát gần, cúi xuống, kiểm tra hai phía, nhìn về khán giả | Sự tò mò có target rõ |
| Minh họa cách hoạt động | Tiến đến, chuẩn bị tay, tiếp xúc, thao tác | Đồ vật phản ứng sau thao tác hoặc theo nguyên nhân đã kể |
| Nhận ra kết quả | Theo dõi phản ứng, mắt/mày/miệng đổi, cơ thể thả lỏng | Cảm xúc nối với kết quả cụ thể |
| Đưa sang ý tiếp theo | Quay người, cất/đặt đạo cụ, đi theo hướng chuyển cảnh | Mạch dẫn dắt tiếp tục, không reset về pose mặc định |
| Chốt một ý đã kể | Hướng về người xem, nhấn một chi tiết, gật nhẹ rồi ổn định | Giúp hiểu ý chính, không thêm lời kết mới |

Đây là các chức năng để chọn theo nội dung, không phải bảy động tác bắt buộc cho mọi câu. Một đoạn ngắn có thể chỉ cần quan sát → chỉ đúng chi tiết → phản ứng. Một đoạn dài có thể đi qua nhiều hành động.

Beat hình ảnh không đồng nhất với cue TTS/SRT. Có thể gom các cue liên quan vào một hành động dài hoặc chia một cue thành nhiều shot nếu có clock hợp lệ. Không cắt cảnh và đổi pose tại mọi dấu chấm chỉ vì TTS chia chunk.

## 5. Bố cục có nhân vật sống trong cảnh

Mỗi scene có nền xa, lớp giữa, mặt đất, nhân vật, đạo cụ, hiệu ứng và vùng subtitle. Các lớp có depth/z-order, light direction, occlusion và ground anchors thống nhất.

| Kiểu cảnh | Nhân vật và đối tượng | Camera |
|---|---|---|
| Cảnh dẫn chuyện | Nhân vật chủ động bước vào bối cảnh và giới thiệu đối tượng qua hành động | Wide → medium, chuyển nhẹ có mục đích |
| Cảnh thao tác | Bàn tay và handle nằm cùng mặt phẳng, chân có điểm tựa | Medium hoặc close vào hành động |
| Cảnh phát hiện | Nhìn đối tượng rồi nhìn người xem, tư thế mở ra | Close mặt, sau đó trả lại cảnh |
| Cảnh giải thích cơ chế | Một mô hình lớn trong không gian của nhân vật; cutaway khi cần | Theo chi tiết được kể, không pan toàn cảnh liên tục |
| Cảnh chuyển giai đoạn | Cùng nhân vật đi qua một lối/mốc hoặc đưa đạo cụ sang cảnh mới | Follow hoặc match cut có continuity |
| Cảnh so sánh | Nhân vật đi/nhìn giữa hai phương án; thể hiện điểm khác cụ thể | Framing hai phía hoặc hai shot tương ứng |

Nhân vật thường cao 25–40% khung ở wide, 40–65% ở medium; close được cắt một phần thân có chủ đích để đọc mặt/tay. Quy tắc 25–40% không được dùng để cấm mọi close-up. Không crop nhầm mặt/tay/đạo cụ, không đè lên chữ.

Giữ nhân vật hiện ít nhất 70% thời gian có lời kể, trừ lựa chọn được người dùng duyệt rõ. Cảnh cận đồ vật không có host thường tối đa 6 giây liên tục và phải quay lại nhân vật. Quy tắc này áp dụng cả khi cảnh đồ vật là hoạt hình.

Sơ đồ kỹ thuật vẫn dùng khi giúp hiểu cơ chế; nó là một cảnh giải thích trong câu chuyện. Mặc định mới là `story-cinematic`, lựa chọn `diagram` phải thể hiện rõ trong Studio. Không âm thầm fallback toàn video về diagram khi thiếu assets.

## 6. Rig người que và các lớp biểu cảm

Rig cần body root/pelvis, spine/chest, neck, head, vai, tay trên, cẳng tay, bàn tay, hông, đùi, cẳng chân và bàn chân. Pivots và parent transforms phải khớp đúng đường nét. Chiều dài xương giữ cố định.

Mặt có các lớp độc lập: hướng mắt, đồng tử, mí, lông mày, miệng và head tilt. Cần có mouth shapes đóng, nói, cười, tròn ngạc nhiên; không chỉ scale một oval xuyên mọi cảm xúc. Các shape được vẽ trong cùng rig để giữ identity. Có thể crossfade shape hoặc dùng morph được compiler hỗ trợ; không để planner xuất path/code tùy ý.

| Trạng thái | Mặt | Cơ thể | Hướng chú ý |
|---|---|---|---|
| Neutral/attentive | Mắt ổn định, miệng nghỉ | Trọng lượng cân bằng, thở nhẹ | Người xem hoặc đối tượng hiện tại |
| Curious | Mày nâng nhẹ, đầu nghiêng | Nghiêng thân về phía cần tìm hiểu | Target trong scene |
| Thinking | Mày khép nhẹ, mắt chuyển có chủ ý | Chống cằm/chuyển trọng tâm một lần | Target rồi người xem |
| Concerned | Mày chếch, miệng nhỏ | Vai/chest hạ nhẹ, dừng động tác | Vấn đề đang xảy ra |
| Effort | Mày tập trung, mắt giữ target | Thân/ngực tham gia vào thao tác | Điểm tiếp xúc |
| Surprised | Mắt mở, mày nâng, miệng tròn | Lùi/giật nhỏ rồi ổn định | Kết quả vừa xuất hiện |
| Understanding | Mày thả lỏng, cười nhẹ | Mở thân, gật một lần | Target rồi khán giả |
| Confident/explaining | Mặt thân thiện, nói rõ | Cử chỉ có nhịp, giữ điểm đứng | Luân phiên khán giả/target |

Biểu cảm phải có nguyên nhân trong beat. Chuyển biểu cảm khoảng 120–250 ms, blink khoảng 100–160 ms; đây là tham số khởi đầu cần nghiệm thu, không phải số đo lấy từ hai video mẫu. Tránh mắt/miệng nhảy pose ở biên cue. Không cho blink che mất khoảnh khắc phát hiện quan trọng.

## 7. Chuyển động mềm có trọng lượng

Một action gồm **chuẩn bị → hành động chính → phản ứng/ổn định**. Anticipation khoảng 100–220 ms, settle khoảng 150–350 ms là mặc định thiết kế; compiler phải co/giản trong cửa sổ narration, không kéo dài audio để đủ diễn xuất.

- Tay chỉ: mắt nhìn trước, head/chest quay nhỏ, vai dẫn tay, khuỷu mở, cổ tay ổn định; sau khi chỉ, giữ đủ thời gian để đọc target.
- Đi: root di chuyển theo quãng đường, chân luân phiên nâng/đặt, pelvis lên/xuống nhẹ, tay đánh đối pha, đầu có follow-through. Foot plant giữ chân trụ tại mặt đất trong stance phase.
- Dừng: giảm tốc, chuyển trọng tâm, chân còn lại về điểm đứng rồi thân ổn định. Không tween cả sticker ngang màn hình trên hai chân bất động.
- Cúi/quan sát: gập hông/gối nhẹ, chest và head theo target; chân vẫn có điểm tựa. Không chỉ scale nhân vật nhỏ đi.
- Cầm/đặt: mở tay → đến grip anchor → attach đồ vật → di chuyển → release vào destination anchor. Parent/space conversion phải giữ đồ vật tại cùng world position ở frame attach/release.
- Đẩy/kéo/xoay: có contact và force direction, thân tham gia, điểm tay nằm tại handle trong thao tác. Kết quả không xuất hiện trước nguyên nhân.
- Chuyển ý: gesture có recovery đi vào action tiếp theo hoặc một pose nghỉ có chủ đích; không trở về idle sau mọi câu.

Easing mặc định `sine.inOut`/`power2.inOut` cho cơ thể, `power2.out` cho ổn định. Dùng overshoot nhỏ có giới hạn khi phản ứng cần nó; không dùng bounce trên mọi đồ vật. Secondary motion hỗ trợ diễn xuất, không phải rung/lắc liên tục để qua QC.

Foot sliding được đo bằng chuyển động world-space của chân trụ, không bằng tên action `walk`. Animation report phải lưu stance intervals và contact errors. Dùng threshold theo tỷ lệ khung, ví dụ độ lệch lớn nhất khỏi ground anchor <=0.3% chiều cao khung trong một stance ở bản mẫu, không cộng dồn một lượng drift được phép ở mỗi frame. Cần hiệu chỉnh bằng xem clip, không tự coi threshold là chứng minh thẩm mỹ.

## 8. Bộ action cần triển khai

Các tên sau là **contract dự kiến V2.2**, chưa phải các enum hiện có:

| Nhóm | Actions | Các dữ liệu bắt buộc |
|---|---|---|
| Di chuyển | enter, walk, turn, stop, exit | Path, ground anchors, facing, stance phases |
| Kể chuyện | address-viewer, invite-follow, emphasize, summarize | Narration anchors, gaze, gesture/recovery |
| Quan sát | notice, look-at, inspect, think | Target, pose, mood, look transition |
| Thao tác | reach, pick-up, hold, place, push, pull, turn-handle | Target/grip/destination, contact/attach/release |
| Phản ứng | react, discover, agree, hesitate | Cause/event reference, mood arc, settle |
| Chuyển cảnh | lead-to-next-scene | Scene link, direction, end/start pose continuity |

10 action IDs hiện có của V2.1 sẽ có adapter sang clips V2.2 khi tương đương. `point` vẫn trỏ đúng đích; `operate-model` vẫn giữ contact-before-reaction. Không đổi enum hiện tại chỉ bằng sửa MD rồi tuyên bố compiler đã hỗ trợ.

## 9. Tám recipe vẫn giữ, đổi cách dàn dựng

| Recipe/ý đồ | Cách người que dẫn chuyện mới |
|---|---|
| Mở câu hỏi | Bước vào tình huống, nhận ra vấn đề, nhìn khán giả; chỉ dùng lời hỏi nếu narration có |
| Cơ chế | Tới mô hình, kiểm tra, thao tác một handle, theo dõi phản ứng; cận cảnh cơ cấu khi cần |
| Quy trình | Thực hiện từng bước trên đạo cụ hoặc đi theo chuỗi việc; giữ tiến độ và trạng thái đồ vật |
| Tiến trình phát triển | Đi xuyên các bối cảnh/mốc có nguồn, mỗi chặng có thay đổi cụ thể |
| So sánh | Quan sát/thử hai phương án, cơ thể và biểu cảm làm rõ sự khác nhau đã được kể |
| Tách bộ phận | Nhân vật kiểm tra mô hình; layer cutaway/exploded view có chú thích minh họa |
| Chuỗi sự kiện | Nhân vật theo dõi sự kiện và dẫn sang hệ quả; nhân quả có evidence |
| Tổng kết | Quay về người xem, nhấn lại đối tượng/ý đã có, kết thúc tư thế và bối cảnh nhất quán |

Một shot cần một hành động giải thích chính và một đường cảm xúc rõ. Các action phụ phải hỗ trợ hành động chính. Không chạy nhiều cử chỉ cạnh tranh chỉ để tăng số lượng chuyển động.

## 10. Kịch bản diễn xuất mẫu: hơi nước

Nguồn lời kể: [examples/steam-explainer/input/script.txt](examples/steam-explainer/input/script.txt). **Đọc nguyên văn file này.** Bảng dưới chỉ là dàn dựng, không cung cấp audio thay thế. Các mốc được resolve từ narration đã đo; chưa ấn định một video 30/60 giây giả định.

| Beat gắn lời kể | Bối cảnh và hành động chính | Biểu cảm | Camera và chuyển tiếp |
|---|---|---|---|
| Câu mở về cải tiến hơi nước | Người que bước vào xưởng minh họa, dừng cạnh mô hình, nhìn hơi nước rồi mời người xem cùng quan sát | Curious → attentive | Wide establish → medium; chân trụ ổn định |
| Xi-lanh cần nóng nhưng bị làm nguội mỗi chu kỳ | Nhân vật kiểm tra hai trạng thái trên cùng mô hình; nhìn lại xi-lanh, chuyển trọng tâm khi thấy vấn đề | Focused → concerned | Theo hướng nhìn đến trạng thái nóng/lạnh; đổi màu là minh họa, không tự thêm cơ chế chưa có trong lời |
| Làm nóng/lạnh liên tục gây lãng phí | Nhân vật chỉ hai trạng thái vừa thấy, lắc đầu nhẹ rồi quay về khán giả | Concerned → thinking | Medium vào mặt/tay; không thêm số liệu tiêu hao |
| Watt tách việc làm lạnh sang bình ngưng riêng | Người que mở không gian bên cạnh xi-lanh, trình bày hai bộ phận độc lập; không tự nhận là Watt | Thinking → understanding | Match framing từ mô hình cũ sang mô hình có hai bộ phận |
| Hơi nước đến bình ngưng, xi-lanh giữ nóng | Tay đi đến control anchor của mô hình; sau thao tác minh họa, dòng hơi và trạng thái hai bộ phận hiện đúng quan hệ có nguồn | Focused → discovery | Cận tay/contact rồi cận hai bộ phận; không mô tả gesture như nguyên nhân lịch sử của phát minh |
| Mốc 1769 và so sánh cách làm | Nhân vật đi đến mốc đã kể, nhìn lần lượt hai mô hình; chuyển biểu cảm khi thấy điểm khác nhau | Confident/explaining | Wide hai phương án → medium chỉ đúng khác biệt; không tự thêm mốc |
| Ứng dụng và ý tổng kết | Nhân vật dẫn sang bối cảnh nhà xưởng khái niệm, quay về người xem và nhấn lại hai nhiệm vụ | Understanding → calm | Kết thúc ở một tư thế sống; bối cảnh không được gán là nhà máy lịch sử cụ thể |

Không cần “đẩy pít-tông” trong bài mẫu này nếu input không kể quan hệ đó. Dàn dựng một hành động thú vị không cho phép thêm nội dung cơ chế vào lời kể hay hình ảnh khẳng định sự thật.

## 11. Kịch bản diễn xuất mẫu: phát triển ô tô

Nguồn lời kể: [examples/car-explainer/input/script.txt](examples/car-explainer/input/script.txt). Hình xe lịch sử cần asset có nguồn; mô hình generic phải ghi `conceptual`, không mặc nhiên là Benz Patent Motor Car.

| Beat gắn lời kể | Bối cảnh và hành động chính | Biểu cảm | Continuity |
|---|---|---|---|
| Câu mở và Karl Benz | Người que bước trên đường minh họa, nhận ra chiếc xe/mốc tương ứng | Curious | Cùng hướng đi đưa đến cảnh kế tiếp |
| Mốc 1886, xe ba bánh, động cơ phía sau | Nhân vật đi quanh phía được thể hiện, cúi xem động cơ rồi chỉ bánh/thân xe đúng vị trí | Inspecting → explaining | Không thay bản xe lịch sử bằng generic sedan bốn bánh; thiếu asset đúng thì chặn claim hoặc dùng card thông tin có nguồn |
| Mô hình động cơ truyền chuyển động đến bánh xe | Nhân vật tiếp cận mô hình riêng, chạm control; sau contact, mô hình cho thấy động cơ/bánh xe và mũi tên đúng quan hệ | Focused → understanding | Phân biệt rõ mô hình truyền động với bản vẽ xe lịch sử |
| So sánh động cơ đốt trong và xe điện | Đi từ phương án A sang B, nhìn lại A rồi chỉ nguồn năng lượng tương ứng ở B | Considering → discovery | Không dựng arrow thời gian khẳng định xe điện xuất hiện sau xe xăng |
| Pin cấp năng lượng cho động cơ điện | Cận bàn tay ở mô hình pin/động cơ, hiệu ứng nguồn năng lượng theo narration | Confident | Đồ vật và target còn cùng identity/position trước và sau cut |
| Tổng kết nhiều hướng cải tiến | Nhân vật dẫn người xem nhìn các nhánh đã kể, quay về khán giả rồi ổn định | Calm/understanding | Giữ sơ đồ nhiều hướng; không tự biến thành tiến hóa thẳng một chiều |

## 12. Pipeline mới dùng chung ba nguồn

```text
script → TTS nguyên văn → đo audio ─┐
WAV → giữ audio → ASR clock ──────┼→ canonical narration + timeline
SRT → giữ cue → TTS fit ──────────┘      + speech activity
WAV+SRT → giữ cả hai + kiểm tra khớp ────┘

→ phân tích nội dung có nguồn
→ story direction: vai trò/beat/cảm xúc/mạch dẫn
→ stage plan: bối cảnh/đạo cụ/vị trí/mặt đất/occlusion
→ performance plan: action/face/gaze/contact/continuity
→ camera + subtitle plan
→ storyboard có các kế hoạch trên
→ assets + rig/animation clips đã duyệt
→ compile HTML5/CSS/SVG/JavaScript theo master clock
→ preview MP4 + chuỗi frame quanh action
→ review kỹ thuật + review diễn xuất → repair → final → QC
```

TTS/ASR/alignment/final blockers của V2.1 vẫn giữ. Kế hoạch diễn xuất không sở hữu clock narration. Thiếu asset hoặc clip diễn xuất cần thiết thì báo `needs-asset`/`needs-animation`; các trạng thái này là contract dự kiến, cần bổ sung vào schema/API/CLI trước khi dùng. Không tạo nháp cứng rồi gọi nó là final cinematic.

## 13. HTML5/CSS/JavaScript và animation compiler

JavaScript là ngôn ngữ chạy trong trình duyệt ở kế hoạch này; không yêu cầu Java/JVM. Giữ HyperFrames/GSAP hiện có để xuất frame và FFmpeg để mux/QC. Định hướng là hoạt hình 2D/2.5D với rig SVG, không yêu cầu đổi sang AI video hoặc render 3D để có diễn xuất mềm.

| Thành phần | Trách nhiệm |
|---|---|
| HTML5 | Scene containers, assets, stage layers, semantic IDs và canvas kích thước cố định |
| CSS | Appearance, layout, shadow, depth styling; không làm clock animation độc lập |
| SVG | Nhân vật phân khớp, face groups, props/cutaways và anchors |
| JavaScript/GSAP | Compiled tracks, easing, blend/pose, body/gaze/face/contact theo master time |
| HyperFrames | Seek/capture frame và render preview/final theo FPS yêu cầu |
| FFmpeg | Audio assembly, captions, mux, export và media QC |

Rig/clip definitions là dữ liệu đã validate. Planner trả về mục tiêu, tham chiếu action và anchors; compiler giải timeline, IK, ownership và emit JS trong allowlist. Không nhận JavaScript tự do từ script/MD/model. Tính hình học dùng cùng space: model/local → parent → world → camera; contact cần kiểm tra trong world space.

Mỗi trạng thái frame phải suy ra từ `masterTimeMs`: seek tiến/lùi, render frame 0 độc lập, render theo batch và render cả video phải giống nhau. Không `setInterval`, CSS animation vô hạn, wall clock, random hoặc delta integration phụ thuộc frame trước. Nếu dùng gait/IK runtime, solver cần là hàm xác định theo time; ưu tiên bake keyframes ở compile time vào các lệnh GSAP hợp lệ của scene security.

Không bắt body, face và tay cùng thay đổi một lúc ở mọi cue. Blend theo các track riêng: locomotion, posture, gesture, gaze, expression, speech mouth, prop attachment, camera và effects. Các track có ownership/priority để một bone không bị hai clips ghi đè không kiểm soát. Speech chỉ điều khiển miệng nói, không xóa mood hoặc jaw pose nền.

Ground contact và attachment clips phải seek được từ dữ liệu trạng thái, không chỉ nhờ callback đã chạy lúc play. Dùng precomputed world transforms/attachment intervals khi emitter hiện tại không cho callback. Nếu cần property mới, mở rộng validator có giới hạn và kiểm tra runtime trước; không bỏ CSP/allowlist để có hiệu ứng.

Default final 30fps; preview diễn xuất tối thiểu 30fps, có thể chọn 60fps khi runtime hỗ trợ và đã đo. Draft 15fps V2.1 có thể kiểm tra bố cục nhưng không đủ để nghiệm thu độ mượt. FPS cao không chữa foot sliding hoặc pose snapping.

Cơ sở kỹ thuật: GSAP timeline có thể seek tới time/label, còn callback có thể bị suppress khi seek; vì vậy attachment/contact không được chỉ phụ thuộc callback lúc play. [GSAP Timeline](https://gsap.com/docs/v3/GSAP/Timeline/), [GSAP seek](https://www.gsap.com/docs/v3/GSAP/Tween/seek%28%29/). SVG transform tác động lên element và các phần tử con; compiler cần quản lý parent/local/world thống nhất. [MDN SVG transform](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/transform). Các yêu cầu bake/ownership/foot plant ở trên là quyết định thiết kế của dự án, không phải lời hứa tự có của thư viện.

## 14. Contract và artifacts dự kiến

Các trường sau bổ sung vào schema mới; **chưa được phép copy như cấu hình chạy được vào V2.1**:

| Artifact | Dữ liệu cốt lõi |
|---|---|
| story-direction.json | leadCharacterId, beat goals, source refs, emotional arc, scene links |
| stage-plan.json | Environment/prop IDs, depth, ground/grip anchors, provenance, scene continuity |
| performance-plan.json | Track clips, intervals, narration anchors, pose/face/gaze, path, stance/contact/attachment |
| camera-plan.json | Framing, subject/target, move start/end, safe regions, cut continuity |
| animation-library.json | Rig compatibility, action/face clip version, constraints và approved preview hash |
| performance-report.json | Compiler version, selected clips, missing assets/clips, contacts, foot drift, coverage, seek evidence |
| previews/performance/ | Voiced preview clip, timed frame strips và before/contact/after evidence |

Shot cần `sceneGoal`, `leadAction`, `emotionalState`, `stageId`, `propTargets`, `cameraPlan`, `entryPose`, `exitPose`, `continuityFrom` và source refs. Existing `visualization`/relations vẫn giữ cho phần giải thích. Không xóa evidence để dùng một sân khấu đẹp.

Studio hiển thị: **Lời kể | Dàn cảnh và diễn xuất | Preview clip**; mỗi shot xem được action, mood, target và phần chuyển sang shot sau. Người dùng chọn style/khung hình ở mức video; vẫn sửa từng shot, khóa profile/shot và rebuild được. CLI/API cùng contract, không có một renderer mẫu chỉ chạy ngoài pipeline.

Cache tách narration, rig/clip, stage/asset, performance, camera và rendered shots. Đổi style/action/mood/host không tạo lại audio khi text/voice/clock còn hợp lệ. Đổi lời kể/voice re-resolve anchors; lock bị xung đột phải báo, không giữ một action trỏ sai câu.

## 15. Nghiệm thu diễn xuất thay cho chỉ duyệt ảnh

Một bộ preview bắt buộc chứa các đoạn thực sự chạy: bước vào/dừng/quay, chuyển cảm xúc, nói trong mood, nhìn/chỉ một target, nhặt/đặt đạo cụ, contact rồi phản ứng, chuyển giữa hai scene. Xem ở tốc độ 1×, slow motion và seek tiến/lùi. Pose sheet chỉ chứng minh tạo hình, không chứng minh chuyển động.

| Nhóm | Điều kiện đạt |
|---|---|
| Main character | Có identity và vai trò dẫn chuyện liên tục, không bị thay bằng nền/portrait/slideshow |
| Acting | Mỗi beat có mục đích và phản ứng dễ hiểu; không chỉ vẫy tay/tween root |
| Walk/stop | Bước chân tương ứng quãng đường, có stance/contact, không lướt hoặc bật lại idle |
| Face/gaze | Mày/mắt/miệng/head hỗ trợ ý, target nhìn đúng; không đổi face ngẫu nhiên |
| Hand/prop | Contact/attach/release đúng, không xuyên vật; reaction sau nguyên nhân |
| Continuity | Tư thế, hướng đi, tay cầm đồ vật, world transforms nhất quán quanh cut |
| Clock | Không đổi narration/cue text/clock vì muốn đủ thời gian cho action |
| Determinism | Frame 0, random seek/reverse, batch render và sequential render cho kết quả tương đương trong tolerance encoder |
| Smoothness | Không pose snap/frame jump tại biên clip; không cần chuyển động giả để qua freeze detector |
| Visibility | Nhân vật đọc được biểu cảm và bàn tay, subtitles đủ chữ, không che target; close-up có chủ đích |
| Explainability | Người xem hiểu hơi nước/ô tô qua hành động và mô hình; không thêm claim sai để có câu chuyện hấp dẫn |

QC cần phân biệt toàn khung ít thay đổi với vùng nhân vật đang diễn xuất; xác minh motion trên ROI liên quan nếu global freeze detector báo nghi vấn. Không tắt freeze gate hoặc whitelist mọi shot. Nếu head/mouth chuyển động nhưng body/prop không thực hiện action đã hứa, scene vẫn chưa đạt acting review.

## 16. Thứ tự triển khai

| Bước | Công việc | Điều kiện chuyển bước |
|---|---|---|
| A0 | Chốt đặc tả này, hồ sơ người que và storyboard hai bài mẫu | Lời kể giữ nguyên; yêu cầu nguồn/nhân vật/chuyển động nhất quán |
| A1 | Rig/face/locomotion/contact và clip library; preview riêng | Các động tác nền đã xem dạng video 30fps, seek được |
| A2 | Animation compiler/tracks/IK/foot plant/blend/attachments | Clips không tranh ownership; contact/ground/seek evidence qua |
| A3 | Director sinh story/stage/performance/camera plans có nguồn | Đủ narrative continuity; không sinh generic icon grid cho toàn bài |
| A4 | Stage/assets/props/layering + renderer, schema/security validators | Thiếu asset/clip báo rõ; template thực sự được dùng trong pipeline |
| A5 | Preview hơi nước 15–30 giây và preview ô tô 15–30 giây theo nội dung phù hợp | Nhìn/nghe/đọc chuyển động đúng target, expression và content; không kéo audio để đủ độ dài mẫu |
| A6 | Studio/API/CLI/cache/resume/locks/shot rebuild/exports | Cùng contract; đổi hình giữ audio; chặn final sai |
| A7 | Nghiệm thu script/WAV/SRT/aligned + hai nhân vật/hai bài + final QC | Evidence riêng trên commit thực, không dùng V1/V2.1 để chứng minh V2.2 |

Nếu lượng lời của một mẫu không đủ 15–30 giây, chọn thêm các cue liên quan của bài hoặc ghi duration thật, không padding lời/hình để đạt số giây. Tạo hình hoặc nền đẹp riêng lẻ không đóng được A1–A7.

## 17. Khoảng cách so với mã hiện tại

V2.1 đã có narration, rig cơ bản, target/IK tay, audio-activity mouth, 8 recipe sơ đồ, HyperFrames/FFmpeg, Studio và resume. Các chuyển động hiện vẫn thiên về đổi pose/point trong một layout sơ đồ. Chưa có hệ walking/foot plant, face acting, prop attachments, multi-track blending hoặc nhân vật xuyên stage đáp ứng đặc tả này.

Đợt thử local đã có Piper tiếng Việt và một clip script ngắn qua technical QC; 10 ca V2.1 bổ sung qua trên working tree. Bài hơi nước đầy đủ vẫn bị báo freeze. Các bằng chứng đó không phải nghiệm thu style mới và không chứng minh cả ba luồng/diễn xuất đã hoàn thành.

Nền xưởng được tạo bằng imagegen trong phiên trước là **concept draft**, đã lưu tại [design/stickman/proposals/workshop-background-v1.png](design/stickman/proposals/workshop-background-v1.png), kèm [prompt/provenance](design/stickman/proposals/README.md). Đây chưa phải scene/animation đã duyệt và chưa dùng để tuyên bố final cinematic. Đợt hiện tại chỉ viết lại đặc tả/kế hoạch theo yêu cầu mới. Không đổi code runtime hoặc sinh video mới trong đợt lập kịch bản này.
