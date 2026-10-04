# Nối biểu cảm giữa các đoạn — source29

Trạng thái PROGRESS; runtime và chất lượng phim chưa nghiệm thu. Phạm vi vẫn là câu chuyện/chủ đề → kịch bản → diễn viên trong câu chuyện → video. Các kết quả source27 và28 giữ nguyên phạm vi snapshot riêng.

## Nguyên nhân từ source

`moodAt` của animation2.2.11 nhân fade-in với fade-out cho từng clip độc lập. Tại cuối một clip và đầu clip kế tiếp, weight về0 ngay cả khi hai clip cùng mood và không có khoảng trống. Vì weight điều khiển mày, mí, miệng và độ nghiêng đầu/thân, biểu cảm bị trả về neutral ở mỗi ranh giới. Đây là kết luận từ đọc công thức, không phải runtime reproduction.

## Thay đổi animation2.2.12/director2.2.29

- Gộp các khoảng liền nhau cùng mood khi lấy mẫu, giữ nguyên dữ liệu và clock đã nhập. Không làm mất nguồn, không viết lại narration hoặc tăng thời lượng clip.
- Hai phản ứng khác nhau nhưng liền clock chuyển trực tiếp từ pose trước sang pose mới sau khi cue mới bắt đầu. Không diễn trước phản ứng của cue tương lai.
- Khoảng trống thực và cuối chuỗi vẫn hồi về neutral. Blend tối đa140ms, rút xuống nửa độ dài clip ngắn; clip ngắn vẫn có mốc bake kết thúc blend.
- Evaluator lấy mẫu thuần theo thời gian, không tích lũy trạng thái qua frame. Bake bổ sung mốc blend bên cạnh mốc cue/contact/gesture hiện có. Mắt/mày/miệng/đầu/thân dùng cùng pose blend; speech activity vẫn có clock riêng.
- Giữ evaluator cũ cho plans2.2.7–2.2.11. Hai tay/ghế và16 mood của2.2.11 vẫn được nhận đúng version. Không sửa approved rig/profile artwork, không retag locked plans; fingerprint hình đổi, narration/voice độc lập.

## Evidence

Parent `npm run build` session44882/chunk507b9c exit0; `npm run test:typecheck` chunk3ab33b exit0. Schema export/source hashes và receipt được lưu ngoài repo cùng source29. Parent không chạy runtime.

Hai worker độc lập vẫn terminal với usage limit khi kiểm tra lại lúc07:15UTC. Không có lượt runtime mới hoặc native phim mới. Kết quả27/27 +210/210 của source27 và build của28 không dùng làm chứng nhận29.

## Nghiệm thu giao model khác

1. Cả hai rig: clip happy hoặc sad liền nhau cùng mood giữ pose/mouth qua boundary; so toàn face/head/chest state, không chỉ tên mood. Thử dữ liệu biểu cảm có thứ tự array đảo nhưng clock hợp lệ.
2. Happy→sad/angry→afraid liền nhau: pose bên trái và bên phải boundary liên tục; pose mới chưa xuất hiện trước cue; đạt đích trong cửa sổ blend. Không có khoảng neutral giả ở giữa.
3. Gaps thực và clip cuối trở về neutral đúng clock; clip rất ngắn (1ms,50ms,200ms) có state và bake anchors hữu hạn, không NaN hoặc jump ở boundary.
4. Dùng GSAP/DOM hoặc browser thực để kiểm seek tiến/lùi ngẫu nhiên và AttrPlugin mouth reflection, gồm mẫu giữa bake frames. Kiểm speech/silence, primary/supporting actors, camera/contact, fixed bones và foot plant; rule hash/shape check không thay nghiệm thu pixel/chuyển động.
5. Plan2.2.11 nguyên byte giữ evaluator cũ,16 mood và frown; plan2.2.10 với ghế/hai tay vẫn valid. Preview upgrade không gọi lại custom profile provider; rig/profile/voice bytes và approved locks giữ đúng contract.
6. Tiếp tục public runPipeline FINAL checkpoint/draft retention theo [bàn giao28](2026-10-04-story-emotions.md), rồi phim tự sinh nhiều thể loại và toàn input/language/backend matrix. Xem/nghe toàn phim tốc độ thường; không coi clip benchmark hay authored storyboard là phim native đã đạt.

**NOT RUN:** toàn bộ runtime kể trên, public FINAL fixture, native/full-film/playback/listening. Mã và build/typecheck không chứng minh phim mượt hoặc diễn đúng mọi tình huống.
