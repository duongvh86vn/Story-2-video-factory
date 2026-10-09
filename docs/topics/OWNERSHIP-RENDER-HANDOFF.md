# Một đồ vật chung và bàn tay đúng nguồn — source0.76

Cập nhật source0.77: [camera/tương tác/continuity của vật chung](OWNERSHIP-OBSERVATION-HANDOFF.md). Nhánh observation đã viết; production và nghiệm thu art/motion/video vẫn chờ. Phần source0.76 trở về trước dưới đây là lịch sử bàn giao.

Mục tiêu vẫn là ba input câu chuyện → kịch bản, kịch bản nguyên văn và WAV → video diễn viên trong câu chuyện. Source0.76 viết tiếp renderer của [ownership0.75](SHARED-OWNERSHIP-HANDOFF.md); không giới hạn nội dung vào máy móc hoặc một cảnh đưa giỏ mẫu.

**Đã viết source, chưa chạy runtime:** nhánh một canonical entity, adaptive bake, paint theo grip gốc, label/shadow/foreground/relation/effect dùng center chung, candidate report và cache version. Production renderer vẫn đi qua validator trước nhánh ấy; `needs-source-prop-binding` tiếp tục chặn. Chưa có full-scene study API hoặc phép xuất final cho ownership. Các helper có thể được model test gọi riêng; chưa coi chúng là nghiệm thu video.

## Contract và source

- `cinematic.sourceOwnership` giữ contract1 đã có, explicit người/source/gesture/prop/tay và original world/held/shared timeline.
- `cinematic.ownershipPaint` dùng contract `ownership-paint-1`, mỗi source có một plan. `entityPlane` là `behind-actors` hoặc `in-front-of-actors`. Mỗi grip phải có `depth=before-entity/after-entity` và `anchor={x,y}` theo viewport artwork chuẩn hóa 0–1. Anchor được đối chiếu với stage gripOffset; center action không được khai off-center anchor. Không suy ra depth hoặc điểm cầm từ tay trái/phải, near/far, primary hay camera.
- `packages/director/ownership-bake.ts` dùng global clock và fps grid bắt đầu từ source.startMs; giữ original boundary và actor compiler breakpoints. So center và **mọi palm**, kể cả inactive, với resolver gốc tại .17/.5/.83 của interval, chia midpoint tới sai số đo ≤0.2px. Active grip/authority là dữ liệu discrete, không tween. Capped depth12 và tổng 12.000 resolved times gồm probe; không trả partial hoặc hạ ngưỡng khi hết cap.
- `packages/director/ownership-compile.ts` giữ in-memory canonical board/narration snapshot, kiểm nguồn/depth/anchor và tất cả boundary gốc trước bake, dùng own body/head/manipulation frames. Original world reveal/transform/flow history không thêm geometry track lên vật đang được cầm. Candidate này chưa nhận mixed local/unregistered props; không bỏ các hành động ấy để né lỗi.
- `library/shots/ownership-layer.ts` vẽ canonical glyph đúng kích thước world, không nhân actor scale vào vật. Palm `<use>` tham chiếu hand definition nguồn của đúng người, giữ actual actor timeline transforms. Props và prop-palm slot cũ chỉ giữ placeholder trống để timeline không có target thiếu; không nhân bản artwork. Free-hand/front/back painters và original hand definitions giữ nguyên. Painter opacity đổi đúng boundary, không fade sớm hoặc restart contact tại cut.
- `library/shots/cinematic.ts` đã nối compile/layer và template pre/post actor; midground label/shadow/energy dùng cùng center. Foreground xuất đúng một lần cùng center. `cinematic-models.ts` và `source-world-timeline.ts` chọn canonical glyph cho relation/world channels. Alias trong report được ghi rõ chỉ là physical grip, không là entity đang vẽ.
- `packages/scenes/index.ts` thêm cache renderer version chỉ cho sourceOwnership. Input identity vẫn giữ whole canonical shot/source/sibling/asset metadata và publication guard. JSON schema xuất thêm ownership-paint; Zod/context mới kiểm các quan hệ giữa field, không phải shape JSON riêng.

SVG ID cho entity/palm dùng hash đầy đủ của tuple để không va chạm do ghép source/grip ID bằng dấu gạch. Alias prop ID phải rõ ràng trên toàn cast. Candidate output vẫn `motionVerified=false`, `productionApproval=false`; metadata hoặc shader code không duyệt nét, giải phẫu, nguồn hình hoặc diễn xuất.

## Những gì còn thiếu

1. Nối camera envelope, interaction record, action coverage và model entry/exit continuity vào canonical ownership bake. Các validator hiện còn một owner/binding; camera hiện từ chối duplicate bindings. Không gỡ guard production hoặc đổi sourced action thành chỉ tay để đi vòng.
2. Hoàn tất shared source semantic audit, camera repair/publication/cache/review/final/QC đồng bộ; kiểm renderer bằng canonical board và real registrations. Không thêm cờ skipValidation hay xóa source fields. Nhánh renderer đã viết vẫn không reachable trong production trước audit/acceptance.
3. Kiểm bàn tay/wardrobe/face/hair/feet, grip/target và depth thực trong toàn interval. Palm trước/sau entity theo plan là staging 2D, chưa là hình học ngón tay/quấn grip 3D hoặc automatic collision/occlusion proof. Đổi depth giữa hành động cần authored transition contract tiếp theo; không tự đoán hoặc nhảy painter.
4. Kiểm actual actor baked palm và canonical center **khi phát SVG/GSAP**, cùng C2 limb motion, original cut/role swap, forward/reverse/random seek và video 60fps tốc độ thường. Gap ba probe là sampled candidate evidence, không là bảo đảm toán học mọi thời điểm. Refine/cap và repeated context/physical queries còn cần profiling runtime trên cảnh thật.
5. Giữ đủ nét/mặt/tóc/trang phục/màu và environment day/sunset/night; nam phụ trọc không râu, nữ không đổi. Toàn ảnh gốc không được thay bằng fixture synthetic. Nghiệm thu ba input, EN chính/VI/JA/KO/external-local TTS, original WAV/legacy SRT, resume/locks/rebuild và final audio/subtitle/QC vẫn thiếu.

## Agent đã hỗ trợ

Một task `ownership-baker-v1` gửi qua local 9router tới `cx/gpt-6.1-sol`, requested xhigh, deadline600s. Backend ghi `gpt-6.1-sol`. Agent trả một module bake; parent tích hợp và tự viết compile/depth/layer/renderer/cache/report/tests. Ba input source/hash được đóng băng trước khi parent sửa, nguyên proposal ở [ownership-render-agent-record-v1.json](reviews/ownership-render-agent-record-v1.json).

Usage backend: 9.118 prompt +14.588 completion =23.706 token. Requested max output6500 không là trần đã cưỡng chế; requested xhigh không là chứng nhận độc lập reasoning backend. Agent không có quyền chạy code/test hoặc sửa repo trực tiếp, không review toàn integration sau đó. Không có key/env trong record.

## Môi trường và test bàn giao

Checkout triển khai `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`; Node đang24.19.0, tối thiểu22.13 cho module mocks. Dependencies đã cài hoặc người test chạy `npm ci` khi thiếu. Full factory cần FFmpeg/FFprobe, model/ASR/TTS; source-only callbacks này không gọi provider hoặc media.

**Các lệnh sau dành cho model/người test, implementation không chạy:**

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-ownership.test.ts tests/ownership-render.test.ts
```

File mới ownership-render có 10 callbacks **DECLARED / NOT RUN**. Chỉ kiểm bake contract/interpolation bằng synthetic data, strict depth/anchor shape, namespace, alias suppression và canonical relation centers. Không có native actor builder, actual geometry, scene renderer, browser, API production pipeline, TTS/ASR/audio/video đã chạy. File0.75 vẫn có10 callbacks chưa chạy ở phía implementation.

Để kiểm helper thực, model test phải dựng complete canonical board/narration/own registrations và depth plan; lấy **breakpoints thực của từng actor compiler** theo global ms. Gọi `compileSourceOwnership`, `renderOwnershipLayer(shot, compiled, modelThermal)`, `suppressOwnershipCopies`, `ownershipRelationFrames`; không fake sample/contact/approval để làm fixture xanh. Source primitive renderer chưa có workbench/API full scene riêng. `renderCinematic` vẫn phải trả blocker hiện hành cho sourceOwnership; việc ấy không được ghi là handoff production PASS.

Người test mở Studio riêng nếu cần đọc/chỉnh project mà không đụng D/server8850:

```powershell
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source076-test-projects'
npm run studio
```

Mở `http://127.0.0.1:8861/`. Source C không tự cập nhật D/server8850. Topic productionReady=false, productionRig=null, availableBanks[] và art/motion approval false. Khởi động Studio hoặc build/typecheck PASS không là phim đã đạt mục tiêu.

Kết quả source chính xác ở [ownership-render-source-record-v1.json](reviews/ownership-render-source-record-v1.json); raw inventory ở [ownership-render-static-record-v1.json](reviews/ownership-render-static-record-v1.json). Ghi SHA, lỗi/ca thiếu, frame/video thực và log vào MD để giao mục tiêu chính. Test V1 cũ không nghiệm thu bản này; receipt/current-review source0.74 vẫn bắt buộc.
