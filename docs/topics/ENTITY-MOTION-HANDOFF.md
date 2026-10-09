# Đúng người, đúng vật và đúng chuyển động — source0.79

Tiếp tục sản phẩm câu chuyện → kịch bản, kịch bản nguyên văn hoặc WAV → video có diễn viên thực hiện câu chuyện. Source0.79 nối tiếp [camera revision0.78](CAMERA-REVISION-HANDOFF.md), xử lý giới hạn alias mà agent đã nêu: hai người dùng cùng tên prop cục bộ không được làm renderer lấy nhầm chuyển động của nhau. Đây là thay đổi source, chưa có video nghiệm thu.

## Đã viết

- `prop-owner.ts`: identity của alias là tuple `[actualPersonId, localPropId]`. Mỗi prop của người thật trong cast cần đúng một binding; không tạo primary vô hình. Duplicate prop trong cùng người, alias bị bind hai lần, prop bỏ sót và namespace SVG đụng nhau vẫn bị từ chối. Supporting owner vẫn phải khai báo rõ; omission chỉ giữ primary/presenter thực hiện có. Explicit ownerId trỏ đúng legacy primary cũng được nhận như omission; tên người khác vẫn bị từ chối.
- `props.ts`, `source-prop-binding.ts`, `ownership-compile.ts`: dùng cùng kiểm tra coverage theo người/prop. Hai người có thể cùng dùng localPropId=`basket` cho hai vật khác nhau hoặc cho grip alias riêng trong canonical shared ownership. Một alias không được thuộc hai canonical entities. Giữ source/cue/hand/stage/clock/art/target validators và original production guard.
- `prop-motion.ts`: `compiledModelFrames` nhận danh sách rõ partId/ownerId/propId và frames của chính người ấy. Dữ liệu chung trả `centers[canonicalPartId]`, dùng union keyframes thực của mọi owner. Không dùng Map keyed bare propId nên không âm thầm ghi đè người trước. Không resample body/face/physics hoặc thêm một motion clock. Clock thiếu/khác/không tăng, center thiếu/không hữu hạn hoặc hai owner cùng khai một local entity phải báo lỗi.
- `cinematic.ts`: cả primary và supporting đi qua converter entity khi có binding. Label, foreground, shadow và effect vẫn theo compiled motion của đúng owner. Foreground report ghi actorId/propId cho local entity; canonical shared entity ghi ownershipSourceId, không nhận người đầu tiên làm owner duy nhất.
- `cinematic-models.ts`: relation/flow đọc center theo canonical partId. Bound relation thiếu frame channels, thiếu entity, sai clock hoặc center hỏng bị chặn; không vẽ relation tĩnh thay cho chuyển động thiếu. Source-world flow dùng cùng center đã vẽ tại thời gian của nó.
- `ownership-layer.ts`: canonical shared bake tạo đúng một center channel mỗi entity; các grip alias không nhân đôi center hoặc ghi đè vật khác. Cắt camera/đổi primary không chọn alias đầu tiên để làm nguồn thế giới.
- Prompt đạo diễn và acting brief ghi rõ local prop IDs và actual owner identity; không ép người dùng đổi tên vật dụng chỉ để né map collision.

Ví dụ: Lila cầm giỏ quả, Karo cầm giỏ củi; cả hai performance có thể dùng prop tên `basket`. Binding xác định người và entity khác nhau; đường nối/flow dùng entity của giỏ quả và entity của giỏ củi. Nếu hai người cùng cầm **một** giỏ, phải có canonical ownership timeline/paint/grip gốc của cả hai, không tạo hai giỏ rồi giả vờ là một.

Version: topic=`forest-tribe-0.79-entity-motion`, producer=`story-direction-2.2.42`, actor ownership=`actor-prop-ownership-2`, bound model=`bound-model-motion-2.2.5`, model glyph=`cinematic-models-2.2.6`, source prop cache=`source-prop-binding-4`, ownership renderer=`canonical-ownership-render-3`. Schema definition export và manifest phải khớp code cuối; source cache/scene cũ không được retag thành bản mới.

## Giới hạn giữ nguyên

`productionReady=false`, `productionRig=null`, mọi `availableBanks=[]`, art/motion/production approval=false và `needs-source-prop-binding` vẫn giữ. Ownership/native source chưa mở production. Không đổi nét, mặt, mắt, tóc, trang phục, màu hoặc ảnh gốc; nam phụ trọc/không râu, nữ phụ không đổi. Namespace SVG ghép tên có thể còn đụng nhau với những tuple đặc biệt; guard báo lỗi rõ thay vì chọn nhầm người.

Chưa nghiệm thu actual native shared geometry, renderer/GSAP, preflight camera envelope so với renderer có actual actor breakpoints, contact/report equivalence, seek và role swap. Giáo xoay, airborne drop, mixed local/ownership bindings, thay depth trong action và native tool poses còn cần contract và acceptance đầy đủ. Đổi key dữ liệu không chứng minh tay chân đã mượt, mặt đúng mẫu hoặc video đạt kỳ vọng.

## Agent và bằng chứng

Một task source-only độc lập qua 9router cho GPT‑6.1 Sol/xhigh rà năm module alias/binding/motion đã đóng băng. Parent tự xử lý renderer/relation/ownership layer, prompt và test declarations. Phạm vi, response thật, token usage, frozen hashes và đánh giá từng finding nằm trong [agent record](reviews/entity-motion-agent-record-v1.json). Agent phát hiện nhánh legacy primary không nhận explicit ownerId dù tên đúng người; parent đã sửa và thêm regression declarations. Parent cũng đổi type input converter thành đúng time/props channels, không giả FrameState có body/face. Hai thay đổi sau review được ghi riêng; agent không review lại chúng. Agent không chạy code hoặc test; review năm module không là whole-diff/film acceptance. Combo `tester` đã kiểm kết nối ở0.78, chưa chạy test dự án trong lượt implementation này.

[Source record](reviews/entity-motion-source-record-v1.json) và [static record](reviews/entity-motion-static-record-v1.json) phân biệt build/typecheck/schema/static bytes với runtime. Test declarations mới và cập nhật đều **NOT RUN** ở phía implementation.

## Bàn giao model test

Môi trường C worktree dưới đây, Node24.19.0 (tối thiểu22.13), dependencies hiện có. Checkout D và server8850 giữ nguyên. Các lệnh dưới đây chỉ bàn giao cho model/người test; implementation không gọi callbacks/fixtures/geometry/renderer/server/browser/production API/TTS/ASR/audio/video.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/model-motion.test.ts tests/actor-owned-props.test.ts tests/cinematic-props.test.ts tests/source-prop-binding.test.ts tests/source-ownership.test.ts tests/ownership-render.test.ts tests/ownership-observation.test.ts tests/source-world.test.ts tests/source-interactions.test.ts tests/cast-camera.test.ts tests/camera-repair-source.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source079-test-projects'
npm run studio
```

Ghi full SHA và raw results, không dùng TEST-RESULTS V1 làm bằng chứng cho source0.79:

1. Hai local actors có cùng local propId nhưng khác root/scale/timing; mỗi glyph/label/foreground/shadow/effect/flow/relation/camera/report theo đúng người, không mất hoặc nhân đôi vật. Thử cả người que và robot. Negative: duplicate trong một người, binding thiếu/trùng/sai owner hoặc SVG collision phải fail.
2. Original source manipulation qua camera cuts và primary/supporting swaps vẫn giữ đúng prop/source/action/hand/cue/clock. Hai actor có cùng local propId không bị từ chối chỉ do tên trùng; chỉnh nguồn của một người phải invalidates affected scenes/review.
3. Một canonical shared entity dùng alias tên trùng ở hai người vẫn có một center/glyph và các own palms đúng. Thử held→shared→đổi authority→held→world, random/reverse seeks và offset khác nhau. Không bỏ production guard để giả acceptance; candidate helper cần canonical source/own registrations thật.
4. Relation clock có union các actor breakpoints và source world event times. Kiểm endpoints/flow ở giữa keyframes, không chỉ đầu/cuối. Missing/extra entity center, wrong clock, inherited/missing prop hoặc NaN phải fail; không fallback static/first-owner/clamp.
5. Schema migration/cache/resume/locks, camera repair/fresh review/final/QC phải dùng revision mới và giữ audio hợp lệ. Kiểm lại arbitrary story/script/WAV, EN chính/VI/JA/KO, external/local TTS và final MP4/audio/subtitle/thumbnail/QC.

Toàn sản phẩm và chất lượng nét/diễn xuất/màu/video vẫn chưa nghiệm thu. Việc tiếp theo là integrated source production audit cùng native art/motion và full-input/voice/resume/final acceptance; không thu hẹp mục tiêu thành helper hoặc build xanh.
