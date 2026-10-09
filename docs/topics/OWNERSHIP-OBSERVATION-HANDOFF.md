# Camera, tương tác và continuity của vật chung — source0.77

Cập nhật source0.78: [camera repair theo đúng revision](CAMERA-REVISION-HANDOFF.md). Đã tách binding trước/sau sửa camera; scene/review cũ vẫn mất hiệu lực. Combo 9router `tester` gọi được và trả `gpt-6-luna`; chỉ kiểm kết nối. Runtime/video và full-product acceptance vẫn chờ model người dùng. Các mốc bên dưới là lịch sử bàn giao.

Mục tiêu sản phẩm vẫn là câu chuyện → kịch bản, kịch bản nguyên văn hoặc WAV → video có diễn viên trong câu chuyện. Source0.77 nối tiếp [renderer0.76](OWNERSHIP-RENDER-HANDOFF.md). Không đổi ảnh, mặt, tóc, trang phục hoặc màu gốc; nam phụ trọc/không râu và nữ phụ giữ nguyên.

**Đã viết và kiểm tra source; chưa nghiệm thu runtime/video.** Camera, model entry/exit, interaction và acting coverage đã có nhánh đọc một canonical entity. `needs-source-prop-binding` và topic productionReady=false vẫn chặn production. Không có API full-scene study hoặc cờ bỏ validator. Build/typecheck không chứng minh người que đã mượt hoặc ba input đã xuất final thành công.

## Phần đã triển khai

- `ownership-bake-query.ts`: đọc đúng piecewise-linear center và mọi palm đã bake. Query tại boundary dùng phase gốc, không nội suy người cầm; random/reverse seek không đổi quyền sở hữu. Mỗi lần đọc kiểm lại version, source shape, endpoint, thứ tự, đầy đủ boundary, mọi palm và active/authority metadata. Reject ngoài clock/nonfinite/accessor/missing key; trả bản sao, không clamp hoặc sửa dữ liệu. Bounds lấy extrema toàn bộ center đã giữ, không lấy prop của người đầu tiên.
- `ownership-scene.ts`: ràng buộc bake với exact shot, complete board, narration, paint và source clock; không cache theo object có thể bị sửa. Camera của diễn viên phụ dùng original world, không coi projection chỉ có một người là nguồn đầy đủ.
- `camera.ts` và `cast-camera.ts`: nhiều grip alias của cùng một vật lấy một envelope canonical. Cận cảnh tiếp xúc đo vật và grip offset chuyển động; face close không che thao tác source. Giữ các kiểm tra local contact, crop, nhãn, subtitle và chân/đầu/tay cũ. Camera repair preflight và review nhận narration thật. Source defect vẫn là camera-source; đổi góc không sửa được nguồn/contact sai.
- `props.ts` và `validateModelContinuity`: entry/exit đọc canonical center. Khi cùng vật còn trong original ownership, cờ actor continuity=`cut` không cho phép vật teleport. Những nơi gọi trong creative, storyboard, explainer và API đã truyền narration, không chọn fallback binding đầu tiên.
- `ownership-interactions.ts`: khớp người/source/gesture/prop/hand/target/cue và artwork anchor của chính grip ấy. Giữ active intervals và transition IDs gốc; original contact/release nằm trong cue thật. Không lấy canonical initial part center làm điểm tiếp xúc của người nhận sau khi vật đã di chuyển.
- `source-interactions.ts`: so bàn tay vật lý gốc với canonical drawn center + gripOffset, kiểm lại contact ban đầu độc lập bằng nguồn hình học. Renderer truyền đúng bake của nó. Review tự tính lại nguồn, không nhận một báo cáo chỉnh sửa là sự thật; evidence times gồm cả boundary đổi authority khi hai tay vẫn cùng cầm. Metadata vẫn contactVerified=false, motionVerified=false.
- `story-coverage.ts`: manipulation có ownership phải có positive overlap với active grip interval của người ấy trong sourced narration window; đoạn chỉ với tay trước khi cầm không được tính là đã carry. Giữ semantic operation, câu nguồn, cue và target bắt buộc.
- `compileSourceOwnership`: contact/release và entry/end/recovery của original gesture trở thành điểm bắt buộc khi observation không có actor compiler frames. Renderer vẫn cung cấp thêm toàn bộ breakpoints thực của các actor.

Phiên bản source: `forest-tribe-0.77-ownership-observation`, renderer=`canonical-ownership-render-2`, interaction=`source-interaction-3`, cast-camera=`cast-camera-2`, source-prop cache=`source-prop-binding-3`. Version authorities được chia sẻ, không copy literal giữa renderer và query. Manifest/acting brief ghi candidate và code hashes hiện tại.

## Giới hạn và việc cần làm tiếp

1. Camera report trong renderer dùng exact compiled bake. Preflight/review camera chưa có speech/actor compiler nên tự compile physical candidate với các điểm source bắt buộc. Cần model test so envelope preflight với renderer có thêm actor breakpoints, bao gồm extrema giữa điểm; không coi sampled gap 0.2px là bảo đảm toán học. Chưa có nghiệm thu hoặc tối ưu repeated source/actor queries.
2. Kiểm actual SVG/GSAP palm, model center, foreground, shadow, relation/effect, painter depth và báo cáo recompute trên cảnh thật. Cần cùng contact/action boundary giữ dữ liệu bằng nhau khi renderer có thêm breakpoints. Chưa có kết quả chứng minh điều này.
3. Hoàn tất audit production source đầy đủ, camera-only repair/publication/locks, review/final/QC và approval art/motion thực. Guard production phải giữ tới khi có bằng chứng tích hợp đủ; không gỡ riêng guard để làm test xanh. Không thay carry/handoff bằng chỉ tay hoặc narration.
4. Candidate hiện chỉ generic non-rotating pick-place/carry với explicit shared overlap, hai người khác nhau. Giáo xoay, thả rơi/airborne, mixed local bindings và đổi depth trong một action cần physical/art contract đầy đủ; chưa hỗ trợ và không được im lặng đổi câu chuyện.
5. Nghiệm thu nét/mặt/mắt/tóc/viền/trang phục, chân/tay mềm hợp lý, nhìn bạn diễn, màu sống động, bối cảnh nhiều lớp ngày/hoàng hôn/đêm và diễn xuất ở tốc độ thường. Sau đó nghiệm thu story/script/WAV, EN chính và VI/JA/KO, external/local TTS, ASR, legacy SRT fit, resume/rebuild/locks, MP4/audio/subtitle/thumbnail/QC. Toàn mục tiêu vẫn chưa hoàn thành.

## Agent và bằng chứng source

Một task độc lập `ownership-query-v1` qua 9router local, model yêu cầu `cx/gpt-6.1-sol`, reasoning yêu cầu xhigh, deadline600s. Backend trả `gpt-6.1-sol`, usage 9.464 prompt +12.440 completion =21.904 tokens. Requested max output5500 không được backend cưỡng chế; reasoning thực chưa được xác nhận độc lập. Không retry, không thực thi code do model trả.

Agent đề xuất một file query, parent kiểm ba source/text hashes đã đóng băng, tích hợp và thay literal renderer version bằng authority dùng chung. Parent tự viết integration và test declarations; agent không review toàn diff. Nguyên packet/inputs/proposal ở [record agent](reviews/ownership-observation-agent-record-v1.json), không chứa key/env. Kiểm tra source và kiểm kê bytes ở [source record](reviews/ownership-observation-source-record-v1.json) và [static record](reviews/ownership-observation-static-record-v1.json).

## Test bàn giao cho model của người dùng

Implementation **không chạy** callbacks, fixtures, pose/geometry samplers, renderer, server/browser, production API pipeline, TTS/ASR/audio/video. File mới có 8 callbacks **DECLARED / NOT RUN**, synthetic query/bounds/revision/entry-exit/evidence-times contracts; không là native handoff hoặc film acceptance. Hai file ownership cũ có 20 callbacks vẫn chưa chạy ở phía implementation.

Môi trường source: `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`, Node24.19.0 (tối thiểu22.13), dependencies đã cài. Checkout D và server8850 giữ nguyên. Lệnh bên dưới chỉ cho model/người test:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-ownership.test.ts tests/ownership-render.test.ts tests/ownership-observation.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source077-test-projects'
npm run studio
```

Mở `http://127.0.0.1:8861/`. Không coi Studio chạy là production ownership đã được mở. Để kiểm helper thực, dùng complete canonical board/narration/own registrations, explicit grip/paint và actual actor compiler breakpoints. Không giả approval/geometry hoặc xóa source fields.

Các ca native bắt buộc: world→Lila cầm→Lila/Karo cùng cầm→đổi authority→Karo cầm→đặt xuống; camera cắt trong mọi phase; đổi primary/supporting và speaker; hai tay offset khác nhau; medium/ensemble/contact-close; face-close che thao tác phải bị từ chối. Kiểm forward/reverse/random seek, original contact không restart, vật không nhân đôi và không teleport kể cả continuity=`cut`. Thay narration/source/paint/camera phải reject supplied bake cũ. Approach-only không đạt carry coverage. Sửa report interaction phải bị recompute từ chối. Clip/label/hand/subtitle lỗi phải vào đúng camera-layout hoặc camera-source; camera repair không được restage nguồn. Ghi SHA đầy đủ, frame/video thực, lỗi còn thiếu vào MD, không dùng kết quả test V1 cũ.
