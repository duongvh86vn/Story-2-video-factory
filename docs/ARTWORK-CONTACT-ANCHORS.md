# Điểm chạm trên artwork

Director có thể thiết kế ghế, sách, túi, công cụ hay đồ vật theo câu chuyện và chọn điểm tay chạm trên hình đó. Trường tùy chọn `artDirection.models[].handleAnchor` khai báo điểm chạm trong viewport của part:

```json
{"partId":"chair","handleAnchor":{"x":0.5,"y":0}}
```

Đây là phần bổ sung vào model có SVG và nguồn hợp lệ, không phải một model hoàn chỉnh hoặc bằng chứng cho câu chuyện cụ thể. `(0,0)` là góc trên trái, `(1,1)` là góc dưới phải. Ví dụ trên chọn giữa mép trên của viewport; artist phải đặt thanh ghế thật ở vị trí tương ứng. Các số phải finite trong0–1, không nhận trường thừa. `motionOrigin` vẫn là tọa độ SVG, khác `handleAnchor`.

Action dùng `target.anchor: handle` để chọn điểm này. `center` và `label` giữ nghĩa cũ. Không khai báo trường mới thì handle vẫn ở15% chiều rộng,50% chiều cao viewport như trước. Một model hiện có một custom handle; trường này không phải track chuyển động của mesh hoặc một tập điểm nắm tự suy đoán.

Authority chung là `partAnchor`:

```text
H.x = stage.width  × (part.x + (handleAnchor.x − 0.5) × part.width)
H.y = stage.height × (part.y + (handleAnchor.y − 0.5) × part.height)
```

Part position/dimensions là normalized stage fractions. Target của gesture, controller tay và control mặc định trong renderer dùng cùng điểmH. Với `model-viewport`, SVG có thể có khoảng trống do aspect policy: điểm khai báo thuộc toàn viewport, không trực tiếp thuộc viewBox. Với `normalized-stretch`, nó vẫn thuộc viewport part sau scale. `controlMode: none` không thêm nút máy vào đồ vật truyện.

Đạo cụ chuyển động vẫn cần binding nguồn, một owner và grip đúng scale. Tâm đầuO là `(part.x × stage.width, part.y × stage.height)`. `gripOffset = (H − O) / performance.scale`; gesture.target phải khớpH. Tâm đích bằng `gesture.destination − gripOffset × performance.scale`. Không đổi tâm vật thành điểm nắm, không kéo dài tay để với tới. Supporting actors vẫn chỉ contact vật đứng yên trong contract hiện hành; moving prop thuộc primary actor.

Event `contactRequired` phải bắt đầu **sau** contact: `contactMs < event.startMs`; equality không đạt. Action của đúng actor/hand/part phải kéo dài ít nhất tới `event.endMs`. Các mốc action/event là global milliseconds; performance clip là shot-local. Không đổi cue/nguồn để che lỗi clock. Diagnostic mới in các cửa sổ contact cùng expected/received origin để model tự sửa bố trí.

Custom model vẫn đi qua schema, SVG sanitizer, source identity/projection và duplicate checks. Field mới không chứng minh tay chạm pixel thật, cũng không tự theo chuyển động của một fragment SVG. Phải kiểm target/contact dưới camera và xem diễn xuất thật. Chỉ shot có field mới nhận marker `sourced-model-contact-anchor-1` trong scene fingerprint; legacy không bị thêm marker. Narration/audio/cast/lock contract vẫn giữ.

Triển khai source/schema/build đã có; test runtime/contact/cache/lock/browser/film của tính năng này **NOTRUN**, chờ model độc lập. [Phạm vi và bàn giao](validation/2026-10-06-sourced-world-contact.md), [kế hoạch](plans/2026-10-06-model-contact-anchor.md).
