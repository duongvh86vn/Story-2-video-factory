# Hai hướng đối thoại Lila/Karo — source0.55

Mục tiêu đầy đủ vẫn là câu chuyện/kịch bản/WAV bất kỳ → diễn viên trong câu chuyện → video có giọng/phụ đề/QC, EN chính và VI/JA/KO, TTS ngoài/local, resume và lock. Bản này bổ sung hướng trái Karo để kiểm cả hai cách bố trí đối thoại; chưa phải bộ tạo hình/diễn xuất hoặc factory được nghiệm thu.

## Nguồn và giới hạn

| Tài sản mới | SHA256 | Sử dụng |
|---|---|---|
| karo-head-left-dialogue-v1.png | 2d0adfba965b08425d8c0312d674a997f8a7fa60b90d1532b4f62b58a0ac7410 | Đầu nguồn riêng,1312×1199; prompt yêu cầu hướng trái khoảng−35°, không phải góc đo |
| karo-head-rest-left-dialogue-v1.png | 1f84f61a4bf5e69c45903626df91517091013f16aa3bbc5bec52aa14609227b2 | HELD: imagegen dời chòm râu lên vùng miệng, gây hai chòm râu khi ghép; không được đăng ký kể cả đổi tên |
| karo-head-rest-left-dialogue-v2.png | 1d439730677e66f9017f2763768470ffa61125f597bf1b496804406ae94b4b95 | Chỉ làm local mouth patch; bỏ chòm râu thừa, không dùng thay cả đầu |

Ba PNG giữ nguyên byte, alpha và original trong generated_images; lưu prompt/provenance/metadata riêng. Không crop/lật/retouch PNG bằng code. Yêu cầu redraw độc lập trong prompt không chứng minh được kết quả không mirror hoặc correspondence giải phẫu từ ảnh2D.

`karo-left-face-v1.json` là definition bank3 thủ công: source và rest V2 cùng1312×1199, pixelScale0.124, rest scale1/offset0; body trái SHA bfcffe1fac13281de68ca11910407bb22fde02f8f5f5d867054713399166fdf4. Cổ/cằm/skull/seam/masks/glyph/mouth curve/strip là giả thuyết authoring, **chưa thực thi schema geometry hoặc compiler**. Một cell yawDeg=null/routes=[]; speech/directionalEyes là capability của painter source, không là nghiệm thu video; expressions/secondary=false.

Vùng miệng thủ công nằm khoảng x330–680,y710–898. Chòm râu gốc phía dưới910 giữ từ ảnh đầu gốc; raw V2 không có chòm râu đó vì chỉ được ghép vùng miệng. Mắt/nose/tóc/ear/outer beard và toàn bộ head transform vẫn từ ảnh đầu. Không đổi cả khuôn mặt thành plate, không feather/mirror/warp hoặc mượn ROI bên phải để giấu lỗi.

## Review ảnh tĩnh qua9router

Một request Gemini:5.873 input+235 output=6.108 token provider báo, output cap1.000, ba PNG, không retry. [Raw packet SHA, reference SHA và assessment](reviews/karo-left-dialogue-art-review-v1.json).

Reviewer thấy hướng trái và thay đổi màu/nét vùng râu-miệng, đồng thời chỉ ra một vệt sáng ở biên má/râu. Vệt sáng còn trong raw source, ở ngoài vùng miệng đề xuất; cần so primary và hình ghép thực. Nhãn trái/phải của tai trong response không được dùng làm phép đo giải phẫu. Không xem lời khuyên “feather” là code phải áp dụng: painter hiện dùng patch đục bounded để tránh lộ miệng cũ, seam và silhouette vẫn cần kiểm thực. Không có PASS art/geometry/anatomy/motion.

## Nối vào tool và phần kiểm tiếp

Catalog workbench3 có bốn pair Lila/Karo × phải/trái, mỗi pair khai báo definition và head filename riêng. Loader/static inventory bắt đúng cả actor/id/view/body hash/head filename; UI hiển thị đúng source của Karo trái, không trỏ nhầm ảnh Lila. Legacy URL0.53 mặc định phải, route explicit `/views/:view/` và revision/source/vendor/clock guards tiếp tục giữ.

Model test dùng [môi trường/lệnh server8861](HEAD-FACE-WORKBENCH.md). Mở:

- `http://127.0.0.1:8861/api/topics/prehistoric-life/head-faces?actor=karo&view=three-quarter-left&action=point&look=ahead`
- Lila phải + Karo trái và Karo phải + Lila trái cần kiểm trong cảnh hai người; trang hiện hành vẫn chỉ có một actor mỗi lần.

Trước tiên chạy schema/geometry của bốn definition. Sau đó kiểm eye/mouth/closed-rest silence, chỉ một chòm râu, pale notch, ghép cổ/thân/tỷ lệ/màu, think chin contact, gaze và point đúng target ở cả hai bên. So full0–4000 và slice2000–4000 tại cùng absolute time, seek đảo/ngẫu nhiên và video60fps/normal speed. Kiểm URL source/plate byte, tamper/revision/cache, held V1 alias bị chặn và scene≤2MB. Ghi exact full GitSHA, PASS/FAIL/NOT RUN và artifact bằng chứng.

6 callback workbench được mở rộng cho bốn pair; callback held-hash hiện có thêm SHA plate V1. Tất cả **NOT RUN**. Model triển khai không chạy fixture/schema geometry/compiler/sampler/server/browser/API pipeline/TTS/ASR/audio/video.

`productionReady=false`, `productionRig=null`, `availableBanks=[]`. Nhiều góc/profile/rear/quay liên tục, biểu cảm, tóc/râu/vải, locomotion/props/contact, bối cảnh màu tươi, quần chúng và full arbitrary-input factory vẫn còn việc triển khai/nghiệm thu. Không mở final/DONE từ bốn definition hoặc build pass.

## Kiểm source0.55 ngày08/10/2026

- `npm run build`: PASS, core/Studio typecheck và Vite41 module565ms.
- `npm run test:typecheck`: PASS sau mở rộng callback, chỉ typecheck; không chạy callback hoặc fixture.
- `npm run schemas`: PASS, schema export không có tracked diff.
- `node --import tsx scripts/head-cell-inventory.ts`: static PNG inventory PASS,8material, yawMeasured/registered/productionReady/motionVerified=false.
- `node --import tsx scripts/prehistoric-pack.ts`: static inventory PASS,6reference/12candidate/6head/2garment/7rejected; manifest có8head-cell material/4face definition, workbench3.
- Static byte/hash:8head+3mouth-plate PNG khớp original;21file head lịch sử và3definition cũ giữ nguyên so với0.54;6reference/2supporting PNG/source/code hashes khớp. Held V1 không được chọn và SHA có trong source guard; đây không phải negative test đã chạy. Ba reference review0.55 và bốn binding source review lịch sử0.54 đã đối chiếu đúng version, không gán review cũ cho source mới.

Source checks không chứng minh face geometry hợp lệ, runtime route/GSAP/renderer hoạt động hoặc video đẹp/mượt. Dùng exact full SHA từ `git rev-parse HEAD` ở checkoutC/branch `codex/prehistoric-life` khi báo kết quả.

Bước tích hợp tiếp cần kiểm hai người trong cùng canonical scene/tracer bằng renderer hiện hành, với original clock, target mắt bạn diễn, speaker ownership và camera cut/role swap. Không dùng hai trang đơn lẻ làm bằng chứng cho tương tác. Sau đó tiếp tục expressions/props/world và ba input tới final; toàn mục11 của đặc tả vẫn là điều kiện hoàn thành.
