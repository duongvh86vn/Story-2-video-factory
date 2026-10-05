# Nhịp chuyển động artwork

Artwork có thể chọn ease cho từng đoạn giữa hai keyframe, thay vì renderer ép
tất cả tăng rồi giảm tốc. Tạo hình và nhịp theo câu chuyện; easing bổ trợ diễn
xuất và cơ chế có nguồn, không thay thế hành động của người que/robot.

## Contract

Trường ease tùy chọn nằm ở keyframe **đích**, áp dụng cho đoạn từ keyframe
trước đến đích trong clock local của shot. Bốn giá trị được allowlist:

| ease | Nhịp |
| --- | --- |
| none | Tốc độ đều |
| sine.in | Tăng tốc từ trạng thái nghỉ |
| sine.out | Giảm tốc khi đến đích |
| sine.inOut | Tăng rồi giảm tốc |

Bỏ ease giữ sine.inOut như trước. Không thêm default vào JSON cũ. Keyframe
đầu là pose t=0, không có đoạn vào nên ease tại đó không tác động chuyển động.
Tất cả atMs vẫn tăng và nằm trong shot; không sửa cue/narration hoặc audio.
Không có repeat/loop/callback/script/wall-clock field mới. Các đường cong
được chọn không vượt endpoints; không mở thêm SVG executable hoặc remote asset.

Ví dụ contract, không phải artifact do model/native pipeline sinh:

```json
[
  {"atMs":0,"x":0,"y":0,"scale":1,"rotation":0,"opacity":1},
  {"atMs":1200,"x":60,"y":0,"scale":1,"rotation":0,"opacity":1,"ease":"none"}
]
```

GSAP timeline vẫn paused/random-access như renderer hiện có. Mỗi tween nhận
đúng duration và start local, chỉ thay ease theo enum đã parse. Không tự thêm
chuyển động vào mọi actor, không đổi semantic gesture/contact hoặc cho phép
trôi cả cảnh để vượt QC. Director generation nhận lựa chọn mới để thiết kế
nhịp chuyển động có nghĩa. Không áp quota, template hay chủ đề mặc định.

## Cache, lock và bằng chứng

Shot khai báo ease mới có artworkEasingRenderer=typed-art-easing-1 trong scene
input identity. Shot không khai báo giữ đường legacy. Approved locks vẫn so
artifact/input hash, không retag hoặc chấp nhận scene cũ cho input đã đổi.
Request context/system/cache identity của creative generation không đổi;
accepted board không bị redesign chỉ vì bổ sung guidance ở generation prompt.

Source được đối chiếu với GSAP đã cài:gsap-core.js đăng ký none và các curve
sine.*. Build/typecheck đầy đủ đã qua:launch4fd8e0/session16219,
completionb42000/exit0. Đây là proof biên dịch, chưa là proof runtime/seek/
cache parity hoặc video đẹp. Parent không chạy test/render/provider.

Phim trạm xe buýt đã có trước bản vá vẫn QC FAIL freeze0–4033.333ms. Đọc board
và scene.js thấy pose/gaze/neutral giữ gần nguyên đầu cảnh và rain tween
9307ms với sine.inOut. Điều này xác nhận giới hạn nhịp renderer, **không đủ
chứng minh nguyên nhân chính của freeze**. Không sửa phim, narration, cảnh,
journal, config, threshold QC hoặc budget của ca đó trong lượt triển khai này.
Không thể tuyên bố đã sửa freeze/mượt từ diff hoặc build.

## Bộ kiểm giao model khác — PENDING

Giữ sourceSHA, lệnh/exit, artifact hash, các FAIL và process/cleanup evidence;
không sửa assertions cũ để ép PASS. Regression liên quan gồm art-direction,
creative-director, artwork-repair, projection, scene cache/locks và toàn bộ
test:typecheck. Kiểm riêng source hiện tại; không tái sử dụng125+5 của d7a.

1. Parse/roundtrip bốn enum; thiếu ease giữ shape cũ. String sai, null,
   callback-like strings, unknown keys, clock đảo/vượt shot và source/security
   negatives vẫn reject. Destination ease chỉ điều khiển interval tương ứng.
2. Với fake/real paused GSAP theo phạm vi test được giao, lấy thời điểm0,
   25/50/75/100% interval. none phải tốc độ đều; sine.* đúng nhịp theo code
   GSAP đang cài, x/y/rotation/scale/opacity đúng endpoint và không overshoot.
   Seek ngược/lặp lại/seek thẳng trả cùng hình trong tolerance đã công bố.
3. So source/schema JSON, emitted scene bytes và scene input hash **thực tế**
   giữa bản trước patch và bản mới cho shot không ease. Không chỉ so hai lần
   chạy bản mới. Fixture authored chỉ chứng minh renderer, không là phim tự sinh.
4. Đổi ease/clock/geometry invalidate shot liên quan, locked conflict không
   publish; narration/audio và approved actor identity nguyên vẹn. Resume của
   accepted board không gọi model/redesign vì guidance, repair giữ gates.
5. Model có thể chọn motion liên tục theo nguồn, giữ diễn xuất/target/contact
   thật. Native run phải có phạm vi, quyền dùng dịch vụ, hạn mức và deadline
   khả dụng; không clone/reset/đổi account/model để né quota. Xem/nghe video
   bình thường và chạy QC như đã cấu hình; freeze FAIL vẫn chặn DONE.
