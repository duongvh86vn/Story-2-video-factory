# Quay đầu Lila/Karo — source0.47 và phần còn thiếu

Mốc0.47 bổ sung [Lila V3/prompt/metadata và static findings](reviews/native-head-turn-v3-art-record.md), vẫn **held/unregistered**. Hiện5 atlas/80 ô; Lila V1–V3 và Karo V1–V2 bị chặn theo file/hash, kể cả rename. No available banks; productionReady=false/productionRig=null. Không có video mới hoặc runtime acceptance. Phần0.46 dưới là lịch sử contract/renderer; V3 Lila mới không đủ điều kiện để chọn contract đó.

Cập nhật 08/10/2026. Máy không có dịch vụ image-to-video; tiếp tục SVG/HTML5/GSAP. Lila và Karo là diễn viên trong câu chuyện người dùng đưa, không phải người dẫn cố định. Ba input vẫn là kịch bản nguyên văn → TTS/clock audio thật, WAV giữ audio/clock và câu chuyện → kịch bản; SRT là luồng tương thích. EN là chính, VI/JA/KO và TTS local/HTTP/command vẫn thuộc phạm vi nghiệm thu.

**Chưa có bộ quay đầu native dùng được trong video.** Source0.46 bổ sung clock và renderer contract cho hình V3+ sẽ đăng ký; chưa có bank thực được chọn. Bốn atlas V1/V2 vẫn held, bị chặn cả theo tên file và SHA dù đổi tên; `productionReady=false`, `productionRig=null`. Bàn đo/draft không bật rig hay tự gán yaw, không gọi model/TTS hoặc dựng video.

## Phần source0.46 mới

Source commit `db78d4883f41f30b8d0ab350e33c8a91f889c7e3` đã push GitHub nhánh `codex/prehistoric-life`; full SHA local/remote khớp,37 owned paths. Build/typecheck/schema/static manifest qua; runtime17 callbacks và video vẫn NOT RUN.

`NativeHeadBankSchema` mô tả source PNG/primary/body hash, scale chung, crop/neck axis/skull/chin/eyeTarget/yaw/seam/restMood của từng cell và route rõ ràng. Geometry được khai báo/đo thủ công; fingerprint bao trọn bank, không là chứng nhận identity hoặc đọc draft landmarks tự động. `appearance.bodyHeadBank` phải đúng actor/body source; `performance.sourceHead` phải dùng cùng fingerprint/actor và complete run. Không có script hoặc model tự chuyển draft thành bank.

`native-head-source-1` lưu start/end global cùng sample time relative. Mọi shot trong run continuous lặp cùng toàn bộ source; clock5 giữ offset/run/source và expressions; bank/actor/track đổi làm scene identity khác. Original-history chin lookup trước camera slice vẫn dùng đúng cell nguồn. Crop/neck-axis SVG transform đồng nhất với physical eye/chin/camera bounds; ảnh chỉ stage một lần theo hash, mỗi cell dùng SVG reference và discrete visibility, không face warp/mirror/crossfade. Body source/view vẫn phải tương thích; head bank không tự tạo body turn.

Khả năng bank hiện chỉ là **hình đầu nghỉ và physical anchors**. Cả speech/directionalEyes/expressions/secondary đều false; supplied speech activity, observer gaze, nét cảm xúc không có artwork và overlay fixed-view đều bị chặn. Màu/nét/identity còn cần sửa ở artwork V3+. Seam polygon mới là metadata; painter seam masks/occlusion chưa triển khai. Chặn đổi cell giữa gesture think/chạm cằm hoặc lúc observer đang theo mắt bạn diễn (`needs-head-turn-interaction`) cho đến khi có continuous correspondence. Không đổi chuyện có thoại thành im lặng để né lỗi.

Nguồn stage phải đúng SHA/PNG framing/RGBA/dimensions, primary hash và real bounded paths, không symlink; embedded renderer cũng đọc lại nguồn thay vì reuse stale cache. Đây chưa là chứng minh pixel correspondence/seam/motion. Full-face masks, speech/blink/emotion/hair, continuous contact/gaze, body turn/profile/rear, props/world/three inputs/voices/resume/final QC vẫn phải hoàn thành.

17 callback mới **NOT RUN**:11 original clock,5 synthetic bank và1 JSON-SHA compatibility. Synthetic bank không có ảnh V3 thật, không được dùng như rig/approval. Model test chạy sau theo exact SHA:

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-head-track.test.ts tests/native-head-bank.test.ts tests/json-sha256.test.ts tests/partner-facing-views.test.ts tests/fixed-view-speech.test.ts tests/actor-gaze.test.ts
~~~

Kiểm stale owner/window/run/context, random/reverse seek, same cell ở camera cut, held/hash giả/route lỗi, bank voice/face capability/contact/gaze reject và ảnh/resource stale. Sau khi có source art thật, model test phải kiểm renderer/scene resource/cache/repair/locks/cap2MB và video60fps; mọi thứ vẫn NOT RUN. Build/schema/static manifest qua không chứng minh video mượt. [Source record0.46](reviews/native-head-source-record-v1.md).

## Lịch sử authoring0.45

Source commit `6e196f7ab73de111f9d0865e3fdc1346f4378f18` đã push GitHub nhánh `codex/prehistoric-life`,34 owned paths; full SHA local/remote khớp. Build/typecheck/schema/static inventory đã qua; bounded source review đóng các lỗi trong phạm vi kiểm.14 callbacks/browser/server/motion/video vẫn NOT RUN. [Evidence thực tế](reviews/native-head-turn-source-record-v1.md).

## Đã triển khai trong source

- Bốn PNG bất biến: Lila/Karo V1 và V2, mỗi ảnh16 ô. Bản gốc generated_images được giữ; prompt, thứ tự input, SHA256 nguồn/đích và phạm vi sửa được lưu riêng.
- Ảnh thật là **1254×1254 RGBA**, không phải2048 được yêu cầu. Công cụ chia theo cạnh pixel nguyên: cột/hàng313,314,313,314; không resize ảnh. Đếm alpha, pixel hash, bounds mực và mực chạm mép cho từng ô. Đây là vùng chia atlas và phép đo pixel, chưa là crop đầu/landmark/yaw đã được duyệt.
- Các schema material/prompt/draft tách riêng. Điểm cổ/trục cổ/cằm/mũi/miệng/mắt/viền mặt đều dùng **tọa độ pixel nguồn tuyệt đối**. Mắt theo screen-left/right; bên tóc buộc theo cơ thể khai báo riêng. Một mắt khuất phải ghi nguyên nhân, không đặt mắt giả.
- Studio có bàn đo tại `/api/topics/prehistoric-life/head-turn-art`: chọn atlas/ô, bấm ghi điểm, nhập góc thực và nhận xét, kiểm tra hoặc tải/nạp JSON draft. Bản đo chỉ ở browser/download, không ghi vào rig hoặc thư viện.
- Check API chỉ đọc material/hash nguồn và trả lỗi/các điểm thiếu. Chặn stale hash/material/actor/canvas, điểm lấn ô, tráo mắt, trục cổ ngược, mắt/mũi/miệng ngoài viền mặt, yaw trùng/nhảy quá9°. `landmarksComplete` chỉ nói các điều kiện draft đã đủ; không là approval, mask registration hoặc motion acceptance.
- Check request khai báo cả nguồn đang hiển thị và draft. Browser/API chặn import khác actor/file/hash/fingerprint/canvas. Download xuất snapshot được kiểm, giữ các chỉnh sửa đang làm; import bị hủy nếu có edit hoặc import mới trong lúc chờ response. Các điều kiện này mới có trong source, chưa browser test.
- API ảnh kiểm SHA, RGBA/metadata/cell/provenance/reference hiện hành trước khi trả bytes; không follow linked file/folder. Topic/manifest có mục nativeHeadTurnStudies. JSON schema đã được thêm.
- Compiler giữ chặn head turn native; khi đến guard trả `needs-head-turn-registration` và đường dẫn bàn đo. Body/view cố định, asset/head/eye/mouth hiện hành không tự đổi; các guard reference-head/source-body sớm hơn vẫn áp dụng.

## Artwork thực tế chưa đạt

Chỉ số ô **1-based, row-major**,1–4 hàng đầu,13–16 hàng cuối. Góc thực chưa đo; +45…−45 chỉ là yêu cầu trong prompt.

| Bộ | Lỗi nhìn thấy trên ảnh tĩnh | Xử lý tiếp |
|---|---|---|
| Lila8→9→10 | Tóc buộc/fringe đổi phía màn hình đột ngột; V2 chưa khắc phục | Vẽ các góc nhỏ quanh chính diện với cùng phía tóc theo cơ thể, có che khuất dần |
| Lila1/16 | Đuôi tóc gọn/ngắn hơn silhouette dài của mẫu chính/native body | Giữ tóc dài, tỷ lệ sọ và cổ riêng; không lấy cả bbox tóc làm head scale |
| Karo8→9 | Mũi/tai/fringe/râu đổi cùng lúc sang góc trái mạnh | Vẽ góc trung gian thật, không flip/mirror hoặc kéo mặt |
| Hai bộ, nhiều ô | Nhóm góc gần giống nhau và13→14 có thể quay lại phía chính diện | Đo/đối chiếu yaw thực; vẽ lại góc trùng hoặc sai thứ tự |
| Karo V2 ô13/14 | Mực tóc chạm cạnh ô,10/8 pixel alpha≥8 trên mép | Nới margin bằng artwork phiên bản mới; không âm thầm cắt mực |
| Hai bản V2 | Pixel hash của **cả16 ô** đổi, dù yêu cầu sửa9–12 | Không coi các hàng khác là byte-identical hoặc giữ nguyên identity; review lại toàn bộ |
| Hai bộ | Stub cổ/râu không chứng minh đường ráp cổ/shoulder của native body | Đo pivot, trục, overlap contour và quyền sở hữu mực ở seam |

Agent Confucius đã đọc source và đối chiếu V1 với bốn body PNG native, xác nhận các gap/tóc/cổ/góc trùng. Đó là static consultation, không phải model đã duyệt motion/video. Parent kiểm V2 và metadata; V2 chưa được coi đạt.

## Công việc để nối chuyển động thật

1. **Artwork V3:** sửa các lỗi trên; đối chiếu ảnh primary màu da ấm, tóc/râu/nụ cười/nét đen. Vẽ các góc cùng tỷ lệ sọ, ánh sáng và attachment; giữ V1/V2 để so sánh. Cần head crop/neck seam riêng, không chỉ16 ảnh trông gần nhau. Màu đầy đặn và đậm như mẫu, không làm nhợt.
2. **Đăng ký nguồn:** từng cell có neck pivot/axis/overlap, skull scale, face/chin/nose, eye correspondence/visibility/glyph/lid/edit masks, baked mouth state/rest patch/aperture/contour/brow và vùng bảo vệ. Liên kết chính xác body view/hash tương thích. Không tái dùng ROI mắt/miệng/hair từ full-body PNG. Không suy anatomyside bằng vị trí trái/phải màn hình.
3. **Original head clock:** bổ sung complete run-owned source track, initial/held end state, route cell rõ ràng và timing. Mỗi camera slice/đổi primary giữ cùng track/fingerprint và phase; seek ngược/ngẫu nhiên chọn cùng cell. Current sourceBody chưa chứa head track. Không đổi actor profile/bodyView theo từng cell.
4. **Compiler/head attachment:** chọn nguồn đầu bằng uniform transform vào neck frame; giữ face nguyên nét, không toàn-face warp/mirror, không crossfade hai khuôn mặt để giả turn. Turn không được dùng asset held. Body rotate riêng cần silhouette/costume/limb views tương thích; head bank không tự giải quyết body turn.
5. **Gaze/expression/interaction:** tính mắt/cằm từ cell đang chọn + original physical neck/head transform; không dùng eye midpoint fixed-view cũ, không feedback ánh nhìn giữa hai actor. Think/chạm cằm dùng chin mới. Speech, blink, expression và secondary chỉ chạy khi đúng cell có masks/capability; thiếu phải chặn, không ghép nét mặt sai vị trí. Tóc/tai/râu/cổ/torso/tay phải có painter order và overlap rõ.
6. **Scene/source/cache/repair:** khai báo asset bytes/hash/masks/head-track trong cast/profile/clock/source/resource manifest, camera bounds và publication snapshots. Sửa source/route/clock/masks phải invalidate, không reuse scene stale. Giữ cap scene2MB; không nâng cap để chứa atlas trùng. Rig/head/body changes không tạo lại audio khi narration không đổi.
7. **Video nghiệm thu:** model test kiểm normal-speed60fps có partner-facing turn, biểu cảm, speaking/listening, walk/run/jump/sit và prop/contact; không chỉ chụp mốc. Tiếp đó kiểm arbitrary stories, full3 input, voices, resume/locks và final audio/subtitle/content QC. Hai bài máy móc chỉ là ví dụ cũ, không thành preset nội dung.

## Môi trường và khởi động server

Lệnh dưới dành cho người dùng/model test, **implementation chưa chạy server/browser**. Node≥22.13 (máy hiện24.19), dependencies npm đã có. Bàn đo không cần FFmpeg, voice, API9router hoặc API image-to-video. Renderer/video nghiệm thu riêng cần HyperFrames/Playwright Chromium/FFmpeg theo NATIVE-SEAT-TRACER.md.

Chạy đúng C worktree. Checkout D đang được bảo vệ; không copy/reset/merge vào đó. Server8850 đang mở không được coi là chạy source mới. Có thể dùng instance riêng8861:

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/head-turn-studio-projects'
npm run studio
~~~

Mở `http://127.0.0.1:8861/api/topics/prehistoric-life/head-turn-art`; Ctrl+C dừng instance trong terminal đó. Server mặc định8787 nếu không đặt STUDIO_PORT. Nếu chọn8850, người dùng phải dùng đúng terminal/instance đang có hoặc tự dừng trước; implementation không dừng process.

## Model test chạy — NOT RUN

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
git status --short
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-head-turn-art.test.ts tests/partner-facing-views.test.ts tests/fixed-view-speech.test.ts tests/actor-gaze.test.ts
~~~

14 callback mới được khai báo, chưa thực thi. Model test kiểm thêm browser: marker đúng pixel ở313/314 boundaries và đổi ô; download là JSON hợp lệ rồi import round-trip; wrong actor/hash/source rejected; quoted notes không chèn HTML; stale PNG/reference/malformed/path/symlink/oversized JSON không được phục vụ; API không sửa file/production gates. Kiểm HTTP failure/status và CSP, route MIME/nosniff. Không gọi TTS hoặc renderer để kiểm bàn đo.

Ghi vào TEST-RESULTS với exact SHA, command/environment, PASS/FAIL/NOT RUN, lỗi cụ thể, screenshot/log nguyên bản. Bàn đo/schema qua không chứng minh head turn/character anatomy/video mượt. Chưa có video mới từ source0.45.

Các phép implementation được phép: build/typecheck/schema export/static PNG metadata/inventory. Các callback, compiler/pose sampler, browser/API pipeline, TTS/ASR/audio/render/video tiếp tục do model của người dùng chạy.
