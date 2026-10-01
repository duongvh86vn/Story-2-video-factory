---
profile_id: stick-man-01
profile_version: 1
character_kind: stick-man
role: explainer-host
display_name: Nguoi-que
render_strategy: reusable-svg-rig
---

# Người que dẫn chuyện

Hồ sơ tạo hình người que và mục tiêu diễn xuất V2.2. Frontmatter vẫn là contract rig V2.1 hiện có; sửa mô tả này không tự bổ sung animation vào compiler. Đặc tả chung nằm trong [STICKMAN-STORY-DIRECTION.md](../../STICKMAN-STORY-DIRECTION.md).

## Vai trò

Nhân vật chính cố định cho video giải thích phát minh, quá trình phát triển, cơ chế và sự kiện. Người que bước vào bối cảnh, quan sát vấn đề, suy nghĩ, thử thao tác, phản ứng rồi dẫn người xem sang cảnh tiếp theo. Có thể cùng người xem đi qua xưởng, đường hoặc các không gian minh họa; không bị giữ ở một góc cạnh sơ đồ. Không tự đóng vai nhà phát minh hoặc tuyên bố hành động minh họa là sự kiện lịch sử.

## Nhận dạng cố định

| Bộ phận | Thiết kế bắt buộc |
|---|---|
| Đầu | Hình tròn nền trắng kem `#F5F3EC`, viền xanh đen `#172B36` |
| Mặt | Mắt/đồng tử, mí, mày và miệng đơn giản nhưng đọc được cảm xúc; giữ cấu trúc mặt qua cảnh |
| Thân | Một nét thân chính, hai tay và hai chân có khớp rõ |
| Bàn tay/chân | Hình đơn giản hoặc đầu nét bo tròn; không thêm ngón tay chi tiết |
| Nhận diện | Một khăn cổ nhỏ màu xanh ngọc `#27D8C5` cố định |
| Tỷ lệ | Tổng chiều cao 100 đơn vị: đầu khoảng 22, thân 34, chân 38, cổ/phần nối còn lại |
| Viền | Độ dày tương đương 2–3% chiều cao nhân vật; đầu nét bo tròn |
| Phong cách | Vector 2D, gọn, sạch; silhouette thống nhất |

Giữ đầu tròn, độ dày nét, chiều dài tay/chân, màu, khăn cổ và cấu trúc mặt qua mọi shot. Không biến thành người thật, emoji hoặc một stick figure khác. Nếu có nhân vật minh họa phụ, phải có ID và vai trò khác, không được thay thế host.

Trang phục theo bối cảnh là layer riêng được duyệt; giữ dấu nhận diện chính. Không bắt mọi video mặc áo da thú/cầm lao vì mẫu tham khảo nói về tiền sử. Màu scarf là nhận diện của mẫu hiện có, có thể đổi qua profile/approval, không do planner tự đổi theo shot.

## Biến đổi được phép

- Đi lại, đổi pose, xoay đầu, hướng nhìn và biểu cảm đơn giản.
- Gập vai/khuỷu/hông/gối và di chuyển root; không kéo dài tay tùy ý.
- Cầm con trỏ, một mẫu vật hoặc một bộ phận của mô hình được narration mô tả.
- Mirror pose nếu giữ chính xác target, silhouette và nhận diện.
- Hình đầu/tỷ lệ/khăn chỉ thay khi người dùng sửa và duyệt hồ sơ.

## Rig hiện có và phần cần mở rộng

V2.1 hiện dùng các IDs sau; pelvis/chest/neck, brows/lids/pupils và mouth shapes cần bổ sung trong compiler/schema V2.2, chưa có chỉ nhờ thêm tên vào MD.

```text
host-root
head
eye-left
eye-right
mouth
neck-scarf
body
arm-left-upper
arm-left-lower
hand-left
arm-right-upper
arm-right-lower
hand-right
leg-left-upper
leg-left-lower
foot-left
leg-right-upper
leg-right-lower
foot-right
```

Các nét tay/chân phải xoay quanh khớp, không chỉ trượt cả sticker trên màn hình. Root và part transforms phải seek được theo master clock.

## Action IDs V2.1 hiện có

| Action ID | Chuyển động | Dùng khi |
|---|---|---|
| `idle` | Đứng cân bằng, chớp mắt tiết chế | Khoảng nghỉ |
| `greet` | Vẫy tay một lần | Mở video |
| `explain` | Một tay mở về phía minh họa | Giải thích |
| `point` | Tay/con trỏ hướng đúng part hoặc mốc | Nhắc tới đối tượng cụ thể |
| `operate-model` | Tiếp xúc handle/part rồi thao tác | Cơ chế hoặc quy trình |
| `walk-to-marker` | Đi đến mốc đã có trên timeline | Chuyển sang một giai đoạn |
| `compare` | Chỉ lần lượt hai phần | So sánh cải tiến |
| `think` | Tay gần cằm, đầu nghiêng | Nêu vấn đề/câu hỏi |
| `react` | Mắt/miệng/pose thay đổi nhỏ | Kết quả hoặc chuyển ý |
| `summarize` | Hướng về người xem và các ý tổng kết | Kết video/chapter |

Pose phải hỗ trợ nội dung đang kể; không chạy/vẫy tay ngẫu nhiên. `walk-to-marker` của V2.1 chỉ dùng khi khung hình có timeline/mốc và đủ thời gian. V2.2 cần locomotion chung trong stage, không giới hạn mọi bước đi vào rail/timeline.

## Diễn xuất V2.2 cần triển khai

- Enter/walk/stop/turn/exit: bước chân tương ứng quãng đường, chân trụ giữ mặt đất, root/chest/head/tay phối hợp, dừng có chuyển trọng tâm.
- Observe/inspect/think/discover: mắt nhìn trước, đầu/thân theo target; tò mò → tập trung → hiểu ra có nguyên nhân trong lời kể.
- Reach/pick-up/hold/place/push/pull/turn-handle: tay tiếp cận grip, contact/attach/release đúng, thân tham gia lực và đồ vật phản ứng sau nguyên nhân.
- Address-viewer/invite-follow/lead-to-next-scene: hướng người xem vào chi tiết, quay và đưa sang cảnh mới; entry/exit pose và đạo cụ liên tục.
- Moods neutral, curious, thinking, concerned, effort, surprised, understanding và confident: mày/mắt/miệng/head có track riêng; speech activity không xóa mood.

Mỗi action có chuẩn bị → hành động chính → settle/recovery, easing và transition. Không reset idle sau mọi cue, không chỉ trượt toàn sticker hoặc lặp một gesture suốt video. Giữ bone lengths, foot plant và prop world position khi seek. Tham số thời gian/clip ở đặc tả chung cần được kiểm tra bằng video, không coi pose sheet là nghiệm thu.

## Đồng bộ giọng và cử chỉ

Script thuần dùng TTS nguyên văn, clock theo audio đo thực tế. WAV người dùng cung cấp là giọng của người que; không tự thay giọng. SRT-only dùng TTS đã cấu hình, đúng nguyên văn và clock. Miệng mở trong speech activity, đóng ở khoảng nghỉ. Nếu chỉ có segment timing, ghi rõ đồng bộ mức đoạn; không khẳng định phoneme lip-sync.

Chỉ và nhìn cùng một mục tiêu. Thao tác phải có tiếp xúc trước khi mô hình phản ứng; không làm đồ vật tự bật/tắt vì một gesture trang trí không có liên hệ nội dung.

## Bố cục

- Wide thường cao 25–40%, medium 40–65%; close mặt/tay có chủ đích. Giữ >=70% thời gian có lời kể, absence <=6 giây.
- Nét nhân vật phải đủ tương phản trên nền, đặc biệt khi dùng schematic trắng.
- Chừa vùng phụ đề; không để thân/tay che nhãn bộ phận.
- Camera theo nhân vật hoặc target; cận cơ chế có thể vắng nhân vật ngắn rồi quay lại. Inset hiện chưa được renderer V2.1 hỗ trợ.
- Host phải còn nhìn rõ mặt và hướng chỉ, không dùng hình tí hon như watermark.

## Ví dụ sử dụng

Với phát triển ô tô, người que đi vào cảnh đường, quan sát xe, kiểm tra bộ phận và dẫn sang các phương án cải tiến đã kể. Xe lịch sử có nguồn, mô hình truyền động tách riêng; không tự tạo chuyện người que chế tạo xe.

Với hơi nước, người que vào xưởng minh họa, nhận ra vấn đề nóng/lạnh, suy nghĩ và thao tác mô hình để thấy vai trò bình ngưng. Nhân vật vừa dẫn chuyện vừa tham gia minh họa, không phải bằng chứng về một nhân vật lịch sử. Hai storyboard đầy đủ ở §10–11 đặc tả chung.

## Điều kiện duyệt nhân vật

Preview sheet giữ các view/pose chuẩn; V2.2 cần thêm clips 30fps đi/dừng/quay, biểu cảm trong khi nói, contact, cầm/đặt và chuyển cảnh. Xem tốc độ 1× và seek/reverse. Giữ một profile version/rig hash xuyên video; không sinh nhân vật mới ở từng scene. Rig thiếu khớp, foot plant hoặc không chỉ/cầm đúng target chưa đạt diễn xuất.


## Mẫu chuẩn và tùy chỉnh V2.1

Chọn mẫu chuẩn này cho phép pipeline tự chạy tiếp. MD riêng tại input/host.md phải duyệt preview một lần theo rig hash; sửa appearance/hash cần duyệt lại. Khung rig được hỗ trợ là vector 2D, màu/tỷ lệ/nét theo schema; hướng trái/phải là hướng trình bày sơ đồ, không phải asset 3D. Không coi build qua là đã nghiệm thu thiết kế/diễn xuất.
