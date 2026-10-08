# Native head turns — source0.48, 08/10/2026

Mục tiêu sản phẩm vẫn là câu chuyện/kịch bản/WAV bất kỳ → hai diễn viên đúng mẫu, diễn mượt trong bối cảnh màu sống động → video có giọng/phụ đề/QC. Không thay bằng người dẫn cố định hoặc bài máy móc. Không có image-to-video API trên máy; dùng authored raster/native SVG + HTML5/GSAP. Toàn runtime/test/render do model của người dùng.

## Source0.48 — từng ảnh nguồn riêng

- Bank2 cho phép mỗi cell dùng một PNG cụ thể và pixel density cố định. Renderer, physical eye/chin, camera envelope và staging đọc cùng sourceId/scale/bytes/hash; bank1 giữ contract/hash cũ. Không dùng scale theo frame để che hình sai.
- Có hai nguồn Lila front/near-right mới, mỗi PNG1024×1536, prompt/provenance/alpha nguyên bản. Requested0°/8° không là yaw đo được; chưa có registration, mask hay sourceHead thực nào. 5 atlas cũ vẫn held. API ảnh/inventory chỉ đọc, không duyệt hoặc bật rig.
- Source kiểm actor/hash/path/nguồn thừa/trùng/unknown, mọi crop theo đúng canvas; tối đa24 source/40Mpx tổng, cap scene2MB giữ nguyên. Renderer/compiler được version lại để invalidate phần hình, narration contract không đổi.
- 26 callback mới chỉ **khai báo, NOT RUN** (15 multi-source contract +7 static materials +4 renderer/resource). Source review/build/typecheck không là nghiệm thu hình hay motion.
- [Nguồn, bằng chứng và phần còn thiếu](../topics/reviews/native-head-cells-source-record-v1.md). **Full speaking actors/video và toàn factory chưa hoàn thành.**

## Source0.46 — clock/renderer cho nguồn sẽ đăng ký

Source0.47 art follow-up: primary-only Lila V3 vẫn lật phía tóc9→10/góc gần trùng/tóc ngắn, chưa có yaw/seam/correspondence; held theo file/hash.5 atlases80cells không bank nào được bật. Không lặp yêu cầu atlas16ô rồi suy ra nó thành motion source. Task artwork tiếp theo phải author/đối chiếu từng góc và correspondence quanh front trước khi assemble/register; vẫn hoàn thành đủ hướng/face/whole-body, không thu hẹp thành hình đầu nghỉ. [Record](../topics/reviews/native-head-turn-v3-art-record.md).

- Thêm `appearance.bodyHeadBank` và `performance.sourceHead`: fingerprint toàn bộ geometry/routes/nguồn, owner, run toàn vẹn lặp lại trên mọi camera slice. Clock5 và actor-target source2 phân biệt cache cũ; root/view/cast/scale giữ nguyên.
- Renderer cell nguyên nét dùng một PNG + SVG use/crop/uniform neck-axis transform; GSAP đổi cell discrete. Camera lấy bao hình nguồn; mắt/cằm theo đúng cell/neck/head physical clock, không lấy ROI fixed-view.
- Resource staging giữ bytes/SHA; kiểm primary source, path/link/size và PNG framing/RGBA/dimensions mỗi lượt, kể cả embedded image. Profile/plan/clock/schema/brief/manifest cùng contract. Schema hash không kéo Node API vào Studio.
- Chặn held V1/V2 theo file **và hash**; bank giả, route nhảy ô/góc hoặc thiếu source/context. Chặn fixed mouth/eyes/expressions/hair overlays, supplied voice activity, observer gaze/emotion chưa đăng ký. Cell change trong chin contact hoặc gaze theo mắt bạn diễn phải có continuous correspondence; hiện báo `needs-head-turn-interaction`.
- **Không có bank thực nào đã đăng ký/được duyệt.** Renderer contract rest-face là phần nền tảng; chưa đáp ứng speaking/listening/emotions/body turns/video. Seam polygon là metadata; painter seam masks chưa triển khai. Không đổi nghĩa hoàn thành thành phim im lặng.
- 17 callback mới khai báo (11 clock +5 bank +1 hash), NOT RUN. Build/typecheck/schema/static manifest là kiểm source, không nghiệm thu motion.

## Lịch sử source0.45

- Author4 atlas raw RGBA bất biến cùng exact prompt/source hashes. Static inspection thất bại continuity; V1/V2 đều held, không register rig.
- Static measurement actual1254px, floor-partition4×4, alpha/pixel/bounds/edge; strict material/prompt/draft schemas.
- Bàn đo source-pixel landmarks với check/download/import; check read-only/source-bound; thiếu tọa độ/góc không giả từ prompt.
- Topic/manifest inventory và API; native turn guard giữ fail với đường dẫn công cụ.
- 12 test callbacks mới khai báo; chưa chạy. Build/typecheck/schema/static inventory là source checks riêng.
- Bounded static-art/source agent consultation, không runtime review.

## Tiếp tục đúng thứ tự

1. Đối chiếu từng PNG quanh front: giữ đúng mặt/nét/tóc buộc dài của Lila, râu Karo, colour/skull/neck frame và che khuất theo góc thật. Hai PNG mới vẫn chưa đạt registration; không lấy 0°/8° trong prompt thành yaw thật. Làm tiếp Karo và đủ các hướng thực, không lặp atlas16ô hoặc chấp nhận hình nghỉ làm sản phẩm.
2. Source correspondence/cell masks/capabilities: neck/skull/face/chin/eyes/nose/mouth/brow, body compatibility và painter layers. Bản draft landmark hiện tại chưa là registration.
3. Điền source bank phù hợp và original run-owned sourceHead bằng các geometry/yaw thật đã đo. Contract0.46/0.48 đã có route/phase/cast/profile/clock/camera, chưa có bank thực; native headTurns tự do vẫn bị chặn. Không tự sinh registration từ prompt hoặc inventory.
4. Attach head cell, native gaze physical target/observer/chin, per-cell speech/blink/emotion/hair, source publication/resource/cache/repair/cap. Thiếu source/capability chặn final.
5. Body turn/profile/rear, grasp/carry/handoff/contact, world artwork day/sunset/night và full script/WAV/story/TTS EN/VI/JA/KO/resume/final QC.
6. Model người dùng kiểm runtime và normal-speed video theo exact source, feedback sửa thật. Không dùng V1 tests hoặc static inventory để tuyên bố nghiệm thu mới.

Chi tiết artwork lỗi, source file, môi trường/server và lệnh NOT RUN: [NATIVE-HEAD-TURN-HANDOFF.md](../topics/NATIVE-HEAD-TURN-HANDOFF.md). productionReady=false/productionRig=null; mục tiêu chưa hoàn thành.
