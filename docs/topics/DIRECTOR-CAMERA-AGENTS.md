# Đạo diễn và camera — source0.76

Cập nhật source0.80: [renderer/camera/relation dùng chung bake đã kiểm](OWNERSHIP-CONSUMERS-HANDOFF.md). Đã chặn bake hỏng, paint bị sửa và relation khác revision; năm regression callbacks mới chưa chạy. Hình, chuyển động, production và toàn ba luồng vẫn chưa nghiệm thu. Các mốc bên dưới là lịch sử.

Cập nhật source0.79: [đúng người, đúng vật và entity motion](ENTITY-MOTION-HANDOFF.md). Prop IDs theo từng diễn viên; relation/flow dùng canonical entity, không chọn theo tên prop của người đầu tiên. Đã sửa thêm explicit legacy primary binding. Source vẫn chưa nghiệm thu native art/motion/video và toàn luồng. Các mốc dưới đây là lịch sử.

Cập nhật source0.78: [camera repair theo đúng revision](CAMERA-REVISION-HANDOFF.md). Đã tách binding trước/sau sửa camera; scene/review cũ vẫn mất hiệu lực. Combo 9router `tester` gọi được và trả `gpt-6-luna`; chỉ kiểm kết nối. Runtime/video và full-product acceptance vẫn chờ model người dùng. Các mốc bên dưới là lịch sử bàn giao.

Cập nhật source0.77: [camera/tương tác/continuity của vật chung](OWNERSHIP-OBSERVATION-HANDOFF.md). Nhánh observation đã viết; production và nghiệm thu art/motion/video vẫn chờ. Phần source0.76 trở về trước dưới đây là lịch sử bàn giao.

Cập nhật0.76: [ownership renderer candidate](OWNERSHIP-RENDER-HANDOFF.md). Một geometry/paint authority, explicit own depth/anchor và original fps/actor breakpoints. Camera envelope/interaction/coverage/continuity integration còn thiếu; không gỡ guard và chưa test phim.

Mốc0.75: [ownership candidate](SHARED-OWNERSHIP-HANDOFF.md). Một canonical entity, own actor/hand/source clock và explicit shared authority; camera/renderer/coverage integration còn thiếu, không bỏ guard production. Agent 9router đã trả schema/projection, chưa test hình học hay video.

Mốc0.74: [review đúng revision và final](CURRENT-REVIEW-FINAL-HANDOFF.md). Receipt chưa là nghiệm thu hình hoặc chuyển động.

Mốc0.73: [camera cho toàn cast và vòng sửa](CAST-CAMERA-REPAIR-HANDOFF.md). Chẩn đoán đo từng người từ original clock của chính họ; source geometry kiểm độc lập với framing. High camera-layout trở về role camera, camera-source chặn trước mọi call sửa; candidate giữ nguồn/diễn xuất/lock và actor asset bytes. Canonical camera/board/plan/report publish cùng transaction, rồi rebuild/draft/review mới. Chưa nghiệm thu runtime hoặc video.

Mục tiêu là video sinh động của câu chuyện người dùng đưa vào. Nhân vật đóng vai trong câu chuyện; đạo diễn và camera không biến họ thành người dẫn chuyên giải thích. Bộ tiền sử dùng Lila, Karo và quần chúng đúng tạo hình, trang phục, nét vẽ và màu của nguồn đã chọn. Chủ đề máy móc/món ăn trong fixture không giới hạn tool.

## Hai vai trò trong pipeline

| Vai trò | Quyền và nhiệm vụ |
|---|---|
| Đạo diễn — `models.storyboard` | Phân cảnh, chọn nhân vật có nguồn, bố trí thế giới, hành động, biểu cảm, nhịp kể và điểm cắt. Storyboard phải có camera hợp lệ trước khi chuyển tiếp. |
| Camera — `models.camera` | Đọc storyboard đầy đủ, chọn cỡ cảnh, chủ thể và chuyển động máy cho từng shot chưa khóa. Chỉ thay camera và metadata camera tương ứng. |
| Review hình/video | Đánh giá sản phẩm thật, phát hiện sai nét/mặt/khớp, crop, contact, diễn xuất, màu, nhịp và đồng bộ. Lý do của agent không thay thế review này. |

Luồng chung: **câu chuyện → kịch bản** hoặc **kịch bản/WAV gốc → narration/timeline → phân tích → đạo diễn → camera → assets/scenes → draft → review/repair → final/QC**. EN chính và VI/JA/KO, TTS ngoài/local, resume/locks vẫn thuộc sản phẩm. Camera không viết lại lời kể, đổi tay, target, source clock, actor identity, artwork, floor hoặc bố trí đồ vật. Đổi góc không được che lỗi anatomy hoặc thay cho diễn xuất còn thiếu.

Camera cân nhắc không gian trước cận cảnh, quan hệ người nói/người nghe, trục đối thoại, hướng màn hình, điểm nhìn, anticipation/contact/reaction/recovery và vùng phụ đề. Không có quota cỡ cảnh, tần suất zoom, palette hoặc số lần xuất hiện bắt buộc. Giữ một khung hình có chủ đích là lựa chọn hợp lệ. Nếu cần đổi điểm cắt, vai primary hoặc pose/artwork để có shot khác, đó là sửa storyboard bởi đạo diễn; camera không tự sửa lén.

## Khả năng source hiện có

- Có role camera riêng trong router/journal; dùng cùng ngân sách `workflow.max_model_calls`, cost và retry đã cấu hình. Không có ngân sách vô hạn riêng cho camera.
- `presentation.camera_agent` mặc định `true`. `models.camera` không khai báo hoặc `null` thì nhận bản sao settings của đạo diễn, vẫn thực hiện một task camera riêng; có thể chọn provider/model/endpoint khác.
- Studio có khu vực **Agent đạo diễn** và **Agent camera**, bật/tắt, dùng chung model hoặc cấu hình riêng. API settings nhận `models.camera`, `presentation.camera_agent`; detail trả `cameraModel`. CLI đọc cùng project contract.
- Strict schema `camera-direction-1` yêu cầu mỗi shot chưa khóa đúng một lần, lý do cụ thể và continuity. Unknown/duplicate/locked shot hoặc field ngoài contract bị chặn.
- Candidate qua lại toàn bộ canonical validator với **complete storyboard/worldShot** và clock của đúng person/owner. Một kiểm tra độc lập chặn normalizer thay các field ngoài camera hoặc sửa shot đã khóa.
- Cache/reuse cần exact request, settings, binding, schema, successful journal/model artifact và accepted domain receipt, rồi kiểm lại domain hiện hành. Aggregate/receipt bị sửa không tự là approval. Prompt camera tham gia pipeline fingerprint; đổi model/toggle camera làm phần hình phải dựng lại, không đổi audio khi nội dung/giọng vẫn hợp lệ.
- Lỗi camera provider/budget không bị bắt thành lỗi đạo diễn rồi gọi lại đạo diễn. Storyboard checkpoint của đạo diễn được giữ. Lỗi camera chặn acceptance; không âm thầm báo video hoàn thành.
- `work/camera-direction-report.json` ghi status, hash storyboard/narration/beats/locks, cấu hình route, direction và thực tế có gọi provider hay reuse. Report xuất cùng cinematic artifacts. Sau authored edit/runtime repair, report ghi canonical-revised và giữ agent rationale cũ như lịch sử, không relabel thành agent đã duyệt bản mới. Authored cameras, offline/disabled hoặc toàn bộ shot khóa giữ nguyên camera và ghi rõ không gọi model.

## Giới hạn phải giữ rõ

Renderer hiện là affine **2D eye-level**. Hỗ trợ wide/medium/close, ensemble/face/contact/object trong contract hiện có và locked/push-in/pull-out/pan-left/pan-right. Pan/zoom 2D không tạo góc overhead, orbit, high/low 3D hoặc một góc mặt/đầu chưa có nguồn. Không mirror/warp nhân vật để giả góc đối diện. Cận cảnh phải thỏa kiểm tra toàn cast đang hiện, target/contact/flight/landing, labels và subtitle-safe area; camera không xóa bạn diễn khỏi shot để vượt kiểm tra.

Source agent chưa chứng minh chất lượng phim tốt hơn. `visualAcceptance=false`, `motionVerified=false`, `productionApproval=false`. Bộ tiền sử vẫn `productionReady=false`, `productionRig=null`, toàn bộ `availableBanks=[]`; guard `needs-source-prop-binding` giữ nguyên. Chuyền/chung vật, toàn production integration, own pose/head/hair/garment/world và full story/script/WAV/voice/resume/finalQC còn cần hoàn thiện/nghiệm thu. Segment/RMS animation không là phoneme lip-sync.

## Cấu hình và môi trường cho model test

Source mới ở C worktree; D checkout và server8850 không tự nhận source mới. Node≥22.13, dependencies lockfile; full pipeline cần FFmpeg/FFprobe, ASR/TTS và model route đang hoạt động. API key chỉ đặt trong env/file cấu hình riêng. Ví dụ cấu hình riêng trong `project.yaml` (thay ID bằng model có quyền gọi thực):

~~~yaml
presentation:
  mode: story-cinematic
  character_mode: actors
  camera_agent: true
models:
  camera:
    provider: gateway
    model: YOUR_CAMERA_MODEL_ID
    base_url: http://127.0.0.1:20128/v1
    api_key_env: MODEL_GATEWAY_KEY
~~~

`models.storyboard` là đạo diễn hiện có. Dùng `models.camera: null` để quay về kế thừa settings đạo diễn. Model xuất hiện trong `/v1/models` không chứng minh generation/quota/vision; source review cũng không chứng minh model đạo diễn/camera đã chạy production.

**Các lệnh runtime dưới đây chỉ bàn giao, implementation agent chưa chạy:**

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/cast-camera.test.ts tests/camera-direction.test.ts tests/source-grip-world.test.ts tests/source-fixed-operation.test.ts tests/source-interactions.test.ts tests/source-prop-binding.test.ts tests/source-world.test.ts tests/cinematic-studio.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source073-test-projects'
npm run studio
~~~

Nếu thiếu dependencies, model test dùng `npm ci` tại C worktree. Mở `http://127.0.0.1:8861/` sau khi terminal báo listen; nếu cổng bận chọn cổng khác, không dừng server người dùng.

## Nghiệm thu còn cần

Source0.72 có mười camera callbacks và bảy grip-world callbacks **DECLARED / NOT RUN**. Source0.73 thêm sáu cast-camera và ba camera-direction callbacks, cũng **DECLARED / NOT RUN**. Model test ghi full SHA, command/exit/output, pass/fail/skip và đường dẫn artifact thật. Cần kiểm:

1. Script, WAV và story-to-script dùng cùng pipeline; model nhận nguyên narration/clock và complete board, không thêm thoại/vai/hành động ngoài nguồn.
2. Đạo diễn và camera gọi đúng role/model, tổng calls/cost nằm trong giới hạn; explicit camera settings, kế thừa/reset và toggle qua Studio/API/CLI đúng.
3. Lock giữ nguyên; camera không đổi source body/manipulation/head/world, cut/identity/ownership/art hoặc floor. Missing native capability/voice/target vẫn chặn final.
4. Domain/provider/quota lỗi giữ director checkpoint; resume không gọi lại director chỉ vì lỗi camera. Exact accepted-request reuse có provider proof; sửa sibling/source/prompt/settings không tái dùng receipt cũ.
5. Report hiện hành gắn đúng hash; sau edit report cũ báo stale, export không trình bày camera rationale như approval.
6. Film thật normal speed/60fps: hướng màn hình/eyeline, contact không bị crop/che, người nghe có reaction đúng clock, máy chuyển mượt không gây chóng mặt, viền/màu/mặt/khớp và phụ đề rõ. Source geometry và ảnh tĩnh không chứng minh độ mượt.

Source0.73 build/typecheck/schema/static inventory ghi tại `reviews/cast-camera-source-record-v1.json`; source0.72 giữ lịch sử ở `reviews/grip-camera-source-record-v1.json`. Kết quả V1 không nghiệm thu luồng mới. Việc thêm camera là một phần triển khai tool, chưa là tuyên bố video đạt mẫu của người dùng.

Source0.74 giữ toàn bộ camera/source/art/voice guards và thêm revision evidence cho preview/review/final/QC/download. [Source record](reviews/release-evidence-source-record-v1.json) ghi rõ checks và runtime NOT RUN.
