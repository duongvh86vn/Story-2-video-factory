# Quay đầu Lila/Karo — source0.45 và phần còn thiếu

Cập nhật 08/10/2026. Máy không có dịch vụ image-to-video; tiếp tục SVG/HTML5/GSAP. Lila và Karo là diễn viên trong câu chuyện người dùng đưa, không phải người dẫn cố định. Ba input vẫn là kịch bản nguyên văn → TTS/clock audio thật, WAV giữ audio/clock và câu chuyện → kịch bản; SRT là luồng tương thích. EN là chính, VI/JA/KO và TTS local/HTTP/command vẫn thuộc phạm vi nghiệm thu.

**Chưa có quay đầu native hoạt động trong scene.** Source0.45 tạo vật liệu và công cụ đăng ký ảnh, không phải cải tiến video đã nghiệm thu. Bốn atlas đều bị giữ lại để sửa; `productionReady=false`, `productionRig=null`, `registered=false`. Bàn đo không bật rig, không tự gán yaw từ prompt, không gọi model/TTS, không dựng video.

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
