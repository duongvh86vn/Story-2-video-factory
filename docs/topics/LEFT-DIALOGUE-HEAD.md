# Đầu Lila hướng trái cho cảnh đối thoại — source0.54

Mục tiêu vẫn là story/script/WAV → diễn viên đúng mẫu → video có giọng/phụ đề/QC, EN chính và VI/JA/KO/TTS ngoài-local. Đây là bước bổ sung hướng đối diện; chưa phải đủ continuous turn hoặc video được nghiệm thu.

## Artwork và registration đề xuất

- `lila-head-left-dialogue-v1.png`: một đầu riêng hướng trái, tạo bằng built-in imagegen từ đầu sourceV2 và primary Lila, giữ nguyên raw PNG/original generated_images. Không lật/crop/retouch PNG bằng code.
- Prompt yêu cầu khoảng−35°, **không phải góc đo được**. Material `yawMeasured=false`; cell `yawDeg=null`, một cell/routes=[]; không được dùng làm route quay đầu.
- Definition `lila-left-face-v1.json` chỉ ghép body `three-quarter-left` nguồn SHAef90f678…; tọa độ được author trên chính PNG mới, không mirror hoặc tái dùng eye/mouth ROI bên phải. PixelScale0.1516 và cổ/cằm/skull/seam/mask là giả thuyết thủ công cần kiểm thực.
- Miệng/mắt dùng painter bank3 hiện hành; happy giữ mặt nguồn khi im lặng. Skin-strip, glyph/lid, protection nose và source-clock activity là candidate, không phải phoneme lip-sync hoặc verified gaze.
- Cặp cần kiểm tiếp: Karo nguồn bên phải ở bên trái khung, Lila nguồn trái ở bên phải khung, hướng mắt về nhau. Karo đầu trái mới chưa có definition; không tự mượn Lila hoặc mirror Karo để lấp chỗ thiếu.

## Review tĩnh và giới hạn

Gemini qua9router nhìn ba PNG: ghi nhận hướng trái theo phối cảnh và các nét mắt/da/miệng/nét mực cùng phong cách; đuôi tóc/tie hiện sang bên phải ảnh. **Phía anatomical của đuôi tóc không được chứng minh bởi các ảnh2D**, nên không tự kết luận giữ đúng attachment hoặc tự đổi nó theo suy đoán. Cần kiểm artwork quanh đầu/neck/hair qua nhiều góc, silhouette ở body và video thật trước khi duyệt. Model không thể chứng nhận independent redraw/no mirror hoặc exact yaw chỉ từ ảnh. Không mở readiness từ lời nhận xét đó. [Raw packet SHA, ba reference SHA và đánh giá](reviews/left-dialogue-head-static-review-v1.json). Provider báo5.831 input+168 output=5.999 token, một request không retry.

Raw pixel inspection chỉ đếm ink/alpha trong ROI: mắt trái ảnh dark bbox288,453→320,514; phải448,473→489,538; miệng332,592→510,653; ba strip được chọn có0dark pixel ở ngưỡngRGBsum<160. Đây không là proof seam/mask/anatomy. Head-face geometry/schema/compiler/sampler/browser/video đều **NOT RUN** bởi model triển khai.

## Điểm tích hợp / nghiệm thu tiếp

Workbench mặt trên thân có lựa chọn body view explicit; default/right và URL0.53 giữ tương thích, left chọn đúng definition/body source. Source/hash/revision/clock/approval guards tiếp tục giữ. API không nhận path/bank tùy ý; KaroLeft bị chặn rõ.

Resource mới dùng `/head-face-preview/:actor/views/:view/:action/:look/:slice/*`; literal `views` tránh bắt nhầm đường dẫn PNG nhiều cấp của URL0.53. Catalog chỉ có LilaRight/KaroRight/LilaLeft. Không có registration KaroLeft hoặc continuous route ngầm. Revision gồm cả SHA byte GSAP đã đọc (giới hạn512KiB); vendor đổi phải lấy binding mới, không dùng scene text cache mang revision cũ.

GPT Luna review bốn nguồn text qua9router, không thực thi code. Finding thiếu GSAP hash được xác nhận từ source và sửa thủ công; test assertion kiểm vendor/source được khai báo. [Packet và assessment](reviews/left-dialogue-view-source-review-v1.json). Provider báo9.191 input+1.212 output=10.403 token; requested output cap1.200, actual usage giữ đúng số provider báo, không retry. Tổng hai lượt9router trong phần0.54 là16.402 token; không tính token/chi phí imagegen và không tuyên bố tiết kiệm đã đo được. Reviewed source trước sửa được giữ riêng; không gọi report đó là review final byte hoặc runtime PASS.

Model test dùng C worktree và server8861 theo [hướng dẫn](HEAD-FACE-WORKBENCH.md), mở `/api/topics/prehistoric-life/head-faces?actor=lila&view=three-quarter-left`. Kiểm geometry thực trước; đối chiếu primary, raw source, head/body/neck/hair seam và màu; full/cut/random/reverse clock, speech silence/activity và gaze cùng hướng trái. Kiểm cặp hai actor tại normal speed, không chỉ ảnh riêng. Ghi exact GitSHA/PASS/FAIL/NOT RUN và evidence. Lỗi không được sửa bằng mirror/warp/nhập ROI bên phải/nới tolerance/ẩn capability.

`productionReady=false`, `productionRig=null`, `availableBanks=[]`. Expressions, tóc/cloth, partner views của cả hai actor/crowd, profile/rear, continuous correspondence, props/contact, world màu tươi, fullfactory/resume/audio/finalQC vẫn chưa hoàn thành và cần nghiệm thu.

## Kiểm source0.54 ngày08/10/2026

- `npm run build`: PASS, core/Studio typecheck và Vite41 module561ms sau sửa source cuối.
- `npm run test:typecheck`: PASS sau thêm narrowing cho union gaze trong test. Lượt đầu TS2339 ở `target.x` đã được sửa; không chạy callback để kiểm.
- `npm run schemas`: PASS; schema export không có tracked diff.
- `node --import tsx scripts/prehistoric-pack.ts`: static inventory PASS,6reference/12candidate/6head/2garment/7rejected;7head-cell material và3face definition trong manifest. Không gọi face geometry/schema/compiler.
- Đối chiếu byte/hash tĩnh:7head PNG khớp original generated_images;18file head cũ và2face definition phải giữ nguyên so với0.53;6reference,2supporting PNG, bank/supporting/workbench/catalog code hash và4final source hash trong review khớp. Nguồn PNG mới SHA `0b95893960a2910fa0331db66431bfb828681d3a1b6ce03d9ba901e7d9e2b3a6`,1168×1347.
- 6callback workbench được khai báo, **NOT RUN**. Geometry, compiler/sampler, server/browser/API, TTS/ASR/audio/video60fps và fullfactory **NOT RUN** bởi model triển khai.

Các kết quả này chỉ chứng minh source build được và nguồn authoring không bị thay; không chứng minh registration hợp lệ khi chạy hoặc video đẹp/mượt. Lấy exact full SHA từ `git rev-parse HEAD` ở checkoutC/branch `codex/prehistoric-life` khi gửi báo cáo; không dùng V1 hoặc server8850/checkoutD làm nghiệm thu bản này.
