# Camera cho toàn cast và vòng sửa — source0.73

Đây là phần triển khai tiếp cho tool đưa câu chuyện/kịch bản/WAV vào và dựng diễn viên trong chính câu chuyện. Đạo diễn chọn tình huống, hành động, nhịp và điểm cắt; camera chọn cách nhìn tình huống ấy. Mục tiêu vẫn là hình, diễn xuất và video có chất lượng theo mẫu người dùng. Source0.73 chưa chứng minh phim đã mượt hoặc bộ tiền sử đã dùng được đến final.

## Thay đổi source

- Đạo diễn và review có chung chẩn đoán camera cho **mọi người đang hiện**, gồm primary và supporting. Mỗi người dùng profile, performance và original clock của chính mình trong complete storyboard/worldShot. Đổi primary không đổi người sở hữu hành động. Floor/stage phải cùng không gian vật lý.
- Report giữ actor ID và lỗi của từng người; một lỗi không xóa chẩn đoán của người còn lại. Scene không có người giữ row world/object-only với ID null, không tự thêm presenter. Các report là geometry diagnostics, không là nghiệm thu hình hoặc motion.
- Lỗi framing được gắn `camera-layout`; lỗi nguồn/body/world/clock được gắn `camera-source`. Chỉ lỗi framing có quyền gửi tới agent camera. Thiếu nguồn hoặc sai floor không được che bằng crop/zoom.
- Vòng REPAIRED gửi high camera-layout tới `models.camera`, với phản hồi review và toàn storyboard. Chỉ shot có lỗi chưa khóa được chỉnh camera; các camera khác, cut, thoại, actor, pose, source, grip, world và artwork giữ nguyên. Nếu cùng batch có camera-source, hoặc shot high đã khóa/không tồn tại, dừng trước khi gọi camera.
- Candidate phải qua validator storyboard/explainer, toàn cast và source publication binding. Thay đổi camera được lưu cùng storyboard và các plan/report trong transaction có recovery; kiểm source, narration, settings, locks và bytes actor assets trước/sau publication. Actor rig/profile/ảnh hiện có được giữ, không gọi lại asset builder để sửa camera.
- Camera report của repair ghi `runtimeValidation=pending`, `renderReviewRequired=true`; sau đó pipeline dựng lại các shot camera đã đổi, sửa các lỗi khác, render draft và review mới. Không xóa lỗi trong review cũ rồi tự báo PASS/DONE. Repair dùng chung review iteration, model call/cost/retry budget; không mở ngân sách vô hạn.

Các đường chính: `packages/director/cast-camera.ts`, `camera-repair.ts`, `camera-direction.ts`, `packages/review/index.ts`, `packages/orchestrator/pipeline.ts`. [Vai trò, Studio/API và cấu hình](DIRECTOR-CAMERA-AGENTS.md). Nam quần chúng đầu trọc/không râu, nữ phụ và mọi PNG/nét vẽ/trang phục/màu không sửa trong đợt này.

## Trạng thái và phần còn thiếu

`forest-tribe-0.73-cast-camera-audit`, `story-direction-2.2.41`, `cast-camera-1`, `camera-repair-1`, schema camera-direction-1. Build/typecheck/schema/static inventory được ghi riêng trong `reviews/cast-camera-source-record-v1.json`. Test callbacks mới **DECLARED ONLY / NOT RUN**: sáu cast-camera và ba camera-direction bổ sung; không chạy fixture, geometry, server, browser, renderer, TTS/ASR/audio/video hoặc full pipeline.

`productionReady=false`, `productionRig=null`, `availableBanks=[]`, art/motion/visual approval false và guard needs-source-prop-binding giữ nguyên. Chưa nghiệm thu toàn câu chuyện→script / exact script / original WAV → giọng/timeline → đạo diễn/camera → diễn viên/scenes → review/repair → final/audio/subtitle/QC. EN chính, VI/JA/KO, external/local TTS, resume/rebuild/locks vẫn là mục tiêu đầy đủ. Segment/RMS mouth animation không là phoneme lip-sync.

Việc tiếp theo cần làm/nghiệm thu:

1. Audit toàn contract source production tích hợp để xác định phần đã nối thật và phần còn chặn. Không gỡ guard ở riêng một dòng rồi gọi đó là hoàn thành.
2. Hoàn thiện ownership chung/chuyền vật và tiếp diễn theo person/original clock qua cut; renderer, coverage, camera, source cache/publication/review/QC phải cùng một nguồn thực.
3. Chốt artwork/pose/head/hair/garment/views/world của mỗi mẫu và kiểm trên video tốc độ thường: nét/mặt/mắt/cổ, viền Karo, màu sống động, chân trụ, tay/contact, partner gaze, anticipation/reaction/recovery. Không warp/mirror mặt hoặc mượn nguồn của nhân vật khác.
4. Model test của người dùng chạy test hiện hành và một câu chuyện do người dùng chọn, ghi SHA, command/exit/output và artifact thật. Source/static hoặc test V1 không là nghiệm thu phim mới.
5. Kiểm cả ba input, các giọng/language/external TTS, thiếu/failed voice, mismatch, resume, đổi content/voice/cast/host, rebuild shot, locks và final QC. Kết quả thiếu phải ghi rõ trước khi sử dụng production.

## Môi trường và lệnh bàn giao

Source C worktree; server8850/D checkout không tự đổi theo source mới. Node≥22.13, dependencies lockfile. Full pipeline cần FFmpeg/FFprobe, model route, ASR/TTS và giọng đúng ngôn ngữ. Key chỉ ở env/file riêng; không đưa vào report/chat. Camera dùng 9router như các role hiện có và có thể kế thừa model đạo diễn.

**Các lệnh dưới đây chỉ để model test chạy, implementation agent chưa chạy:**

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/cast-camera.test.ts tests/camera-direction.test.ts tests/source-grip-world.test.ts tests/source-fixed-operation.test.ts tests/source-interactions.test.ts tests/source-prop-binding.test.ts tests/source-world.test.ts tests/cinematic-studio.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source073-test-projects'
npm run studio
~~~

Nếu thiếu dependencies dùng npm ci tại C worktree. Mở http://127.0.0.1:8861/ sau log listen; cổng bận chọn cổng khác, giữ server của người dùng.

## Ca test bắt buộc cho camera repair

- Hai bạn diễn đổi vai primary/supporting qua cut, dùng stage/scale và original source khác nhau: crop/gaze/contact của từng người phải được đo từ chính người ấy. Supporting-only và object-only không invent presenter.
- Sai floor/missing source/motion envelope trả camera-source, giữ original board, không gọi model camera để che lỗi. Hai người cùng crop phải có hai diagnostics.
- Camera-only feedback chỉnh đúng shot, các camera khác và mọi thoại/source/pose/owner/art/world giữ hash. Locked batch/unknown shot/unsupported sprite camera không tiêu call sửa camera.
- Candidate không đổi camera hoặc không qua domain phải báo unresolved, không tự ghi PASS. Authored/disabled/offline cần sửa authored camera hoặc cấu hình agent; không silently skip repair.
- Sửa sibling/source/narration/settings/locks hoặc actor asset trong lúc model đang chờ phải chặn publication. Killed/interrupted transaction, rollback conflict và resume phải giữ separate edits và không lấy nửa report/storyboard làm accepted.
- Camera/plan/actor-cast/host-timeline cùng canonical hash; bytes art/rig/profile giữ nguyên. Scene rebuild lỗi không làm report thành rendered/approved; resume phải phát hiện scene cũ.
- Mixed camera/artwork feedback dựng camera và artwork theo quyền riêng, sau đó render/review mới. Global review/call/cost/retry budgets vẫn có hiệu lực.
- Video thật mới chứng minh camera mượt, eyeline/contact rõ, nhịp tự nhiên và subtitle-safe. Bổ sung test integration cho transaction/asset preservation và mixed feedback trước nghiệm thu; các test source0.73 không tự bao phủ mọi runtime integration.
