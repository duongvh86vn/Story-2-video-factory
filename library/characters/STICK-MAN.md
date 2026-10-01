---
profile_id: stick-man-01
profile_version: 1
character_kind: stick-man
role: explainer-host
display_name: Nguoi-que
render_strategy: reusable-svg-rig
---

# Người que dẫn chuyện

Hồ sơ nhân vật mục tiêu của đặc tả V2. “Người que” ở đây là stick figure có rig và biểu cảm, có thể kể chuyện bằng giọng trong WAV/SRT và tương tác với hình minh họa. File này mô tả thiết kế; chưa phải asset hay tính năng runtime đã triển khai.

## Vai trò

Người dẫn chuyện cố định cho video giải thích phát minh, quá trình phát triển, cơ chế hoạt động và sự kiện. Nhân vật đứng cạnh mô hình, chỉ chi tiết, thao tác với mô hình, so sánh và tổng kết. Không tự đóng vai nhà phát minh hoặc nhân vật lịch sử được narration nhắc tới.

## Nhận dạng cố định

| Bộ phận | Thiết kế bắt buộc |
|---|---|
| Đầu | Hình tròn nền trắng kem `#F5F3EC`, viền xanh đen `#172B36` |
| Mặt | Hai mắt chấm/oval nhỏ và một miệng nét đơn giản, đủ nhìn được khi nhân vật ở cạnh sơ đồ |
| Thân | Một nét thân chính, hai tay và hai chân có khớp rõ |
| Bàn tay/chân | Hình đơn giản hoặc đầu nét bo tròn; không thêm ngón tay chi tiết |
| Nhận diện | Một khăn cổ nhỏ màu xanh ngọc `#27D8C5` cố định |
| Tỷ lệ | Tổng chiều cao 100 đơn vị: đầu khoảng 22, thân 34, chân 38, cổ/phần nối còn lại |
| Viền | Độ dày tương đương 2–3% chiều cao nhân vật; đầu nét bo tròn |
| Phong cách | Vector 2D, gọn, sạch; silhouette thống nhất |

Giữ đầu tròn, độ dày nét, chiều dài tay/chân, màu, khăn cổ và cấu trúc mặt qua mọi shot. Không biến thành người thật, emoji hoặc một stick figure khác. Nếu có nhân vật minh họa phụ, phải có ID và vai trò khác, không được thay thế host.

## Biến đổi được phép

- Đi lại, đổi pose, xoay đầu, hướng nhìn và biểu cảm đơn giản.
- Gập vai/khuỷu/hông/gối và di chuyển root; không kéo dài tay tùy ý.
- Cầm con trỏ, một mẫu vật hoặc một bộ phận của mô hình được narration mô tả.
- Mirror pose nếu giữ chính xác target, silhouette và nhận diện.
- Hình đầu/tỷ lệ/khăn chỉ thay khi người dùng sửa và duyệt hồ sơ.

## Các bộ phận rig

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

## Pose và hành động chuẩn

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

Pose phải hỗ trợ nội dung đang kể; không chạy/vẫy tay ngẫu nhiên. `walk-to-marker` chỉ dùng khi khung hình thật sự có timeline/mốc và có đủ thời gian.

## Đồng bộ giọng và cử chỉ

WAV người dùng cung cấp là giọng của người que; không tự thay giọng. SRT-only dùng TTS đã cấu hình, đúng nguyên văn và clock. Miệng mở trong speech activity, đóng ở khoảng nghỉ. Nếu chỉ có segment timing, ghi rõ đồng bộ mức đoạn; không khẳng định phoneme lip-sync.

Chỉ và nhìn cùng một mục tiêu. Thao tác phải có tiếp xúc trước khi mô hình phản ứng; không làm đồ vật tự bật/tắt vì một gesture trang trí không có liên hệ nội dung.

## Bố cục

- Host thường cao 25–40% khung hình, đứng trên đường nền hoặc cạnh bàn/mô hình.
- Nét nhân vật phải đủ tương phản trên nền, đặc biệt khi dùng schematic trắng.
- Chừa vùng phụ đề; không để thân/tay che nhãn bộ phận.
- Zoom cơ chế thì thu host vào ô nhỏ hoặc cho vắng mặt ngắn theo storyboard.
- Host phải còn nhìn rõ mặt và hướng chỉ, không dùng hình tí hon như watermark.

## Ví dụ sử dụng

Với câu chuyện phát triển ô tô, người que đi giữa các mốc có trong narration, so sánh hai hình xe hoặc chỉ phần cải tiến. Nếu narration chỉ kể tiến trình, không tự chuyển thành câu chuyện hư cấu về một người chế tạo xe.

Với câu chuyện cơ chế hơi nước, người que đứng cạnh sơ đồ và chỉ trình tự/cơ cấu. Người que là người giải thích ngoài câu chuyện, không phải bằng chứng về một nhân vật lịch sử.

## Điều kiện duyệt nhân vật

Preview sheet phải có chính diện, trái/phải, explain, point, operate-model, walk-to-marker, compare và summarize. Giữ một profile version/rig hash xuyên tập. Duyệt một lần rồi tái sử dụng; không sinh một người que mới ở từng scene. Nếu tay/chân không gập được hoặc không thể chỉ đúng target, rig chưa đạt.
