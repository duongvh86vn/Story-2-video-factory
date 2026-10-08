# Native head turns — source0.45, 08/10/2026

Mục tiêu sản phẩm vẫn là câu chuyện/kịch bản/WAV bất kỳ → hai diễn viên đúng mẫu, diễn mượt trong bối cảnh màu sống động → video có giọng/phụ đề/QC. Không thay bằng người dẫn cố định hoặc bài máy móc. Không có image-to-video API trên máy; dùng authored raster/native SVG + HTML5/GSAP. Toàn runtime/test/render do model của người dùng.

## Đã làm trong source0.45

- Author4 atlas raw RGBA bất biến cùng exact prompt/source hashes. Static inspection thất bại continuity; V1/V2 đều held, không register rig.
- Static measurement actual1254px, floor-partition4×4, alpha/pixel/bounds/edge; strict material/prompt/draft schemas.
- Bàn đo source-pixel landmarks với check/download/import; check read-only/source-bound; thiếu tọa độ/góc không giả từ prompt.
- Topic/manifest inventory và API; native turn guard giữ fail với đường dẫn công cụ.
- 12 test callbacks mới khai báo; chưa chạy. Build/typecheck/schema/static inventory là source checks riêng.
- Bounded static-art/source agent consultation, không runtime review.

## Tiếp tục đúng thứ tự

1. Artwork V3 sửa Lila ponytail silhouette/side occlusion và Karo near-front jump; giữ skull scale/colour/seams; có đủ góc thực riêng biệt. Cần source review, không coi imagegen yêu cầu được tuân thủ.
2. Source correspondence/cell masks/capabilities: neck/skull/face/chin/eyes/nose/mouth/brow, body compatibility và painter layers. Bản draft landmark hiện tại chưa là registration.
3. Original run-owned head source track và deterministic route/timing/holds, cast/profile/clock/camera continuity. Current compiler chưa hỗ trợ native headTurns.
4. Attach head cell, native gaze physical target/observer/chin, per-cell speech/blink/emotion/hair, source publication/resource/cache/repair/cap. Thiếu source/capability chặn final.
5. Body turn/profile/rear, grasp/carry/handoff/contact, world artwork day/sunset/night và full script/WAV/story/TTS EN/VI/JA/KO/resume/final QC.
6. Model người dùng kiểm runtime và normal-speed video theo exact source, feedback sửa thật. Không dùng V1 tests hoặc static inventory để tuyên bố nghiệm thu mới.

Chi tiết artwork lỗi, source file, môi trường/server và lệnh NOT RUN: [NATIVE-HEAD-TURN-HANDOFF.md](../topics/NATIVE-HEAD-TURN-HANDOFF.md). productionReady=false/productionRig=null; mục tiêu chưa hoàn thành.
