---
profile_id: mini-robot-01
profile_version: 1
character_kind: mini-robot
role: explainer-host
display_name: Ro-bi
render_strategy: reusable-svg-rig
---

# Robot mini dẫn chuyện

Frontmatter/rig hiện là mẫu V2.1. Vai trò mục tiêu V2.2 áp dụng cùng [đặc tả diễn xuất](../../STICKMAN-STORY-DIRECTION.md) với người que; gait/face/props/tracks mới chưa được compiler triển khai.

## Vai trò

Robot mini là nhân vật chính dẫn người xem qua bối cảnh và nội dung script/WAV/SRT: bước vào, quan sát, suy nghĩ, thử thao tác, phản ứng và dẫn sang ý sau. Robot có thể tham gia tình huống minh họa; không tự nhận là nhà phát minh hoặc nhân vật lịch sử. Không cố định robot cạnh một grid icon suốt bài.

Ngôn ngữ cơ thể thân thiện, rõ ý, giống một trợ giảng. Sự hài hước chỉ nằm ở biểu cảm và chuyển động; không tự thêm lời thoại hoặc sự kiện ngoài narration.

## Nhận dạng cố định

| Bộ phận | Thiết kế bắt buộc |
|---|---|
| Đầu | Hộp bo tròn, rộng hơn thân một chút; một antenna ngắn ở chính giữa |
| Mặt | Màn hình xanh đen `#142A36`, hai mắt LED màu xanh ngọc `#27D8C5`, một miệng LED đơn giản |
| Thân | Vỏ trắng kem `#F5F3EC`, các mép viền xanh đen, một huy hiệu tròn màu vàng `#F6BD4F` ở giữa ngực |
| Tay | Hai tay có khớp vai/khuỷu, bàn tay kiểu găng đơn giản, mỗi tay một bàn tay |
| Chân | Hai chân ngắn và hai bàn chân rộng để tạo cảm giác chắc chắn |
| Tỷ lệ | Tổng chiều cao quy ước 100 đơn vị: đầu khoảng 32, thân 30, vùng chân 25, phần nối/antenna còn lại |
| Đường nét | Vector 2D rõ, viền dày đồng nhất, không texture ảnh thật |

Giữ nguyên hình đầu, tỷ lệ, màu vỏ, mặt LED, antenna và huy hiệu qua tất cả shot/tập. Không thêm tay/chân, không đổi thành robot người lớn, không đổi sang khuôn mặt người. Props cầm tay là vật riêng; không trở thành bộ phận cơ thể.

## Biến đổi được phép

- Vị trí, tỷ lệ hiển thị đồng nhất, hướng nhìn, xoay thân nhẹ, gập khớp và pose.
- Mắt bình thường, suy nghĩ, ngạc nhiên, vui; miệng đóng/mở ở vài mức đơn giản.
- Cầm con trỏ hoặc một chi tiết của mô hình được narration nhắc tới.
- Hướng nhìn và tay chỉ luôn khớp với vật được giải thích.
- Trang phục/màu nhận dạng chỉ đổi khi người dùng sửa và duyệt hồ sơ; không do planner tự đổi.

## Các bộ phận rig

Rig phải có part ID ổn định:

```text
host-root
head
antenna
face-screen
eye-left
eye-right
mouth
body
badge
arm-left-upper
arm-left-lower
hand-left
arm-right-upper
arm-right-lower
hand-right
leg-left
foot-left
leg-right
foot-right
```

Các bộ phận cánh tay/chân dùng điểm xoay ở khớp, không kéo giãn hình học để giả chuyển động. Root transform di chuyển cả nhân vật; transform khớp điều khiển pose. Giữ hướng trái/phải theo rig, tránh đổi part ID khi mirror.

## Pose và hành động chuẩn

| Action ID | Chuyển động | Dùng khi |
|---|---|---|
| `idle` | Thở/rung nhẹ và chớp mắt tiết chế | Chờ trong khoảng nghỉ |
| `greet` | Vẫy tay một lần, hướng mắt về người xem | Mở video hoặc mở chapter cần chào |
| `explain` | Một tay mở, thân nghiêng nhẹ về vùng minh họa | Giải thích khái niệm |
| `point` | Tay/con trỏ hướng đúng anchor của part | Nhắc tên bộ phận, mốc thời gian hoặc bước quy trình |
| `operate-model` | Tay tiếp xúc đúng handle/nút/chi tiết trước khi mô hình chạy | Narration mô tả thao tác hoặc quan hệ cơ học |
| `compare` | Chỉ lần lượt hai phía, không che nhãn | So sánh trước/sau hoặc hai phương án |
| `think` | Tay gần cằm, mắt suy nghĩ | Narration nêu vấn đề/câu hỏi |
| `react` | Thay đổi mắt và tư thế nhỏ | Narration nêu kết quả hoặc chuyển ý |
| `summarize` | Quay về người xem, chỉ các ý đã có trong nguồn | Tổng kết |

Không dùng một vòng vẫy tay/talking-mouth lặp suốt video để thay cho diễn xuất có ý nghĩa. `idle` và chớp mắt không được tính là hành động giải thích.

## Đồng bộ giọng và cử chỉ

Script thuần dùng TTS nguyên văn, clock theo audio đo thực tế. WAV người dùng cung cấp là giọng kể của robot; không tự sửa hoặc thay giọng đó. Với SRT-only, giọng do TTS được cấu hình tạo ra phải dùng đúng cue text và clock theo đặc tả gốc.

Miệng mở theo speech activity đã đo từ audio, đóng trong khoảng nghỉ; mức độ chính xác được ghi rõ. Chỉ có segment timing thì dùng animation nói ở mức đoạn, không tuyên bố phoneme lip-sync. Chỉ vào một part khi narration đang nói về part đó; thả tay/đổi mục tiêu khi chuyển ý.

## Bố cục

- V2.2: wide cao 25–40%, medium 40–65%, close mặt/tay có chủ đích; >=70% thời gian lời kể và absence <=6 giây.
- Camera theo nhân vật/target; cận đối tượng có thể vắng robot ngắn rồi quay lại. Inset chưa có trong renderer V2.1.
- Chừa vùng phụ đề ở dưới; tay, đầu và caption không đè lên nhau.
- Không đặt robot như logo nhỏ bất động; silhouette, mặt và hướng tay cần đọc được ở 1080p.
- Hướng chỉ lưu bằng tham chiếu target/anchor của hình minh họa để vẫn đúng sau khi layout đổi.

## Ví dụ sử dụng

Trong video hơi nước, robot bước vào xưởng minh họa, tìm hiểu vấn đề, thao tác mô hình và phản ứng với kết quả đúng narration. Các cảnh sơ đồ hỗ trợ hiểu cơ chế. Robot không giả làm người phát minh ra máy hơi nước.

Trong video phát triển ô tô, robot đi dọc timeline của các mốc có trong narration, chỉ từng mẫu xe hoặc phần cải tiến và thực hiện động tác so sánh. Không tự thêm hãng xe, năm phát minh hay thông số.

## Điều kiện duyệt nhân vật

Preview sheet phải có chính diện, hướng trái/phải, idle, explain, point, operate-model, compare và summarize. Người dùng có thể sửa hồ sơ rồi duyệt một lần. Hash hồ sơ/rig phải được lưu; shot dùng cùng một profile version và rig hash. Nếu rig sai tỷ lệ, thiếu khớp hoặc không thể chỉ đúng target, không được coi là nhân vật đã dựng xong.

V2.2 cần thêm video preview 30fps đi/dừng/quay, face/mood trong lúc nói, contact/cầm/đặt và continuity giữa scene. Robot dùng nhịp chuyển trọng tâm phù hợp chân ngắn; không sao chép quãng bước của người que rồi gây trượt chân. Các yêu cầu này cần code và nghiệm thu, chưa được đáp ứng chỉ bằng sửa hồ sơ.


## Mẫu chuẩn và tùy chỉnh V2.1

Chọn mẫu chuẩn này cho phép pipeline tự chạy tiếp. MD riêng tại input/host.md phải duyệt preview một lần theo rig hash; sửa appearance/hash cần duyệt lại. Khung rig được hỗ trợ là vector 2D, màu/tỷ lệ/nét theo schema; hướng trái/phải là hướng trình bày sơ đồ, không phải asset 3D. Không coi build qua là đã nghiệm thu thiết kế/diễn xuất.
