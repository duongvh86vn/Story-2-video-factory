# Bối cảnh đi theo camera của diễn viên

Lớp background SVG có thể khai báo coordinateSpace: world để mặt đất, đường,
tường và bối cảnh cùng chịu camera với diễn viên và đồ vật. Nền đứng ngoài camera
và diễn viên đứng trong camera có thể lệch tọa độ khi zoom/pan. Đây là lựa chọn
tạo hình cho mọi câu chuyện; không bắt buộc sàn, kiểu nền, bảng màu hay chủ đề.

## Contract

| Plane | Tọa độ |
| --- | --- |
| background, bỏ coordinateSpace | frame, giữ cách dựng cũ |
| background, coordinateSpace: frame | đứng cố định trong khung |
| background, coordinateSpace: world | trong camera hiện có, sau lớp nền frame và trước midground/diễn viên |
| midground / foreground | world như trước |
| overlay | frame như trước |

coordinateSpace chỉ là enum frame/world tùy chọn trên background. Khai báo trên
plane khác bị từ chối để tránh trường bị bỏ qua. Bỏ trường không thêm default
vào JSON. SVG vẫn dùng stage pixels và keyframe dùng clock local của shot.
Transform keyframe của layer nằm bên trong camera; không thêm một camera hay
clock khác. World background chịu cùng clip/subtitle viewport như diễn viên;
frame background giữ bố cục cũ. Không suy diễn floor SVG thành collision plane.
Designer vẫn phải đặt đường chân/mặt đất và đối tượng hợp lý trong stage trước
khi chiếu camera. Không thay đổi bone, contact, source, actor identity hoặc QC.

Ví dụ dữ liệu contract (không phải artifact của pipeline native):

```json
{"id":"street-floor","plane":"background","coordinateSpace":"world","role":"decoration","svg":"<rect x=\"0\" y=\"560\" width=\"1280\" height=\"160\" fill=\"#536372\"/>","keyframes":[{"atMs":0,"x":0,"y":0,"scale":1,"rotation":0,"opacity":1}]}
```

## Cache và khóa

Chỉ shot dùng world background có artworkWorldBackgroundRenderer=world-background-1
trong scene input hash. Cảnh bỏ trường giữ nhánh legacy, phiên bản renderer cũ
không đổi. Đổi trường/geometry/ease vẫn đổi input của shot; scene lock có conflict
phải từ chối publish. Không retag hoặc tự sửa scene đã duyệt. Generation-only
guidance giải thích stage/frame/world; system/context và accepted creative cache
không đổi nên cảnh cũ không bị redesign khi resume. Narration/audio không đổi.

## Trạng thái nghiệm thu

Source/build của lựa chọn mới đã được triển khai; npm.cmd run build exit0.
Parent chỉ sửa source và kiểm tra biên dịch. Runtime/security/parity/cache/
world-camera composition mới giao model test, chưa suy ra từ build.

Source7f trước patch có hồi quy195PASS1SKIP, original supplement7PASS, router/
staging2PASS; hai replay fixture FAIL được giữ nguyên. Follow-up fixture provenance
chạy lại cùng assertions và xác minh riêng; xem báo cáo độc lập, không cộng lẫn
các lần chạy thành một tally. Các bằng chứng7f không tự nghiệm thu bản mới.

Phim native trạm xe buýt trước đây vẫn QC FAIL freeze0–4033.333ms. Dữ liệu cũ
có floor y560 ngoài camera, actor ground chiếu thành491.2: đây là bằng chứng
khác hệ tọa độ, không đủ kết luận toàn phim đẹp, đã sửa freeze hoặc nghe đúng.
Không sửa phim cũ, journal, pending, account, config hay budget để lấy PASS.

## Bộ kiểm giao model khác

1. Hai rig: frame/world backdrop cùng xuất hiện đúng độ sâu; world floor/props
   nằm trong chính camera-rig/clip của actor, frame và overlay ở ngoài.
2. Camera locked/push/pull/pan: vị trí sàn và chân cùng phép chiếu tại đầu/giữa/
   cuối; keyframe layer phối hợp camera đúng, seek thẳng/ngược/lặp nhất quán.
   Source/DOM/ma trận synthetic không phải bằng chứng video tự sinh.
3. Bỏ coordinateSpace: actual prepatch7f vs current JSON, scene bytes và scene
   input hash parity, không chỉ hai lần chạy current. Explicit frame vẫn đúng
   vị trí cũ. Kiểm invalidate, locked conflict, resume và không sửa voice.
4. Sai enum/null/unknown key, coordinateSpace ở plane khác, clock/source/SVG
   executable/remote và camera/contact negatives vẫn reject.
5. Giữ hồi quy artwork/acting/foreground/creative/cache/review/QC và test:typecheck.
   Không sửa test hoặc threshold để ép PASS. Xem/nghe native full film riêng,
   giữ hạn mức và các fail cũ; full product acceptance vẫn mở.
