# Ánh nhìn theo diễn viên đang chuyển động

Source0.44 bổ sung gaze theo ID diễn viên vào renderer SVG/HTML5/GSAP hiện có. Máy người dùng không có API image-to-video. Không cần API đó để chạy ca này. Source chưa được nghiệm thu bằng test, browser, audio hoặc video; `productionReady=false`, `productionRig=null` vẫn giữ. Đây là phần của tool nhận truyện bất kỳ, không đặt cốt truyện hoặc người dẫn cố định.

Source đã push GitHub nhánh `codex/prehistoric-life`: `0632c91366259306627bf1f0a84fc719b3d91aec`,34 owned paths; full SHA local/remote khớp. Fresh build/typecheck/schema/static pack và bounded source re-review đã qua;13 callback mới/old regressions/tracer/video vẫn NOT RUN. Source delivery không hoàn thành mục tiêu sản phẩm.

## Contract đã triển khai

Trong `performance.gazes`, chọn đúng một nguồn:

```json
{"startMs":0,"endMs":900,"actorTarget":{"id":"karo","anchor":"eyes"}}
```

Hoặc dùng tọa độ cố định `target:{"x":800,"y":300}` như trước. Không được có cả hai, không dùng fallback hay tự suy ra người nói. Target phải là diễn viên hiện diện, cùng world, có native body/eyes/expressions đã đăng ký và đủ clock cho toàn gaze. Self target, actor mất/ẩn, stage/view/identity thay đổi, source thiếu hoặc khác projection đều bị chặn. Gaze sau lưng góc mặt đã chọn vẫn báo `needs-view-gaze`; không xoắn mặt hoặc giả quay đầu bằng pupils.

`actorViewActingClock` gắn `actorTargets` vào render context riêng, không sửa lời kể/activity/performance đã lưu. Descriptor giữ profile, root/stage/scale, full body/expression run và hash/fingerprint; không giữ gaze/arm/prop của target. Hai người có thể nhìn nhau mà không gọi đệ quy. Geometry mắt dùng cùng neck/head projection với render, ở thời gian gốc của bạn diễn, gồm seat/rise/walk/breath. Lunge một shot giữ ready/contact/recover/end của thrust dưới `lungeClock` và dùng body-only evaluator; không gọi IK tay/giáo. Lunge xuyên cut vẫn chưa hỗ trợ.

Descriptor lấy cùng original run entry qua mọi slice, ID actor nguyên vẹn tối đa96 ký tự, fps metadata cố định60 vì eye-anchor sampler không dùng render fps. Source/expressions/identity/geometry của bạn diễn làm đổi publication binding và cache. Clock version4, actor gaze source1, body compiler32; schema `view-gaze-target` và schema shot/storyboard/clock cùng contract. Compiler và camera nhận mốc physical target; eye-matrix baking vẫn dùng sai số native đã có. Không nâng scene cap2MB.

Scene mới/cache/manual edit giữ snapshot board/narration/binding đã dùng tạo candidate; repair cũng giữ binding **trước render**, không rebind lại live source ở cuối. Publish đọc lại canonical shot/board/narration trước staging, trước ghi và sau ghi. Source đổi làm rollback scene/report. Rollback chỉ phục hồi bytes do transaction vừa ghi và chưa bị người khác sửa; giữ separate edit, journal `rollback-conflict` chặn resume và yêu cầu xử lý conflict. Đây là optimistic check trên filesystem, không phải khóa toàn hệ thống hoặc chứng minh xử lý đồng thời đã PASS.

Repair candidate được `ShotSchema.parse` chuẩn hóa trước render/binding/publication để thứ tự field không gây false mismatch. Lỗi publish lưu receipt riêng `work/artwork-transactions/<uuid>/publication-failure-<uuid>.json`; không ghi đè attempt file đã được rollback bảo vệ. Candidate đã validate vẫn có thể replay theo source binding hiện tại.

## Model test chạy

Lệnh dưới **NOT RUN bởi implementation**, dành cho model test của người dùng. Dùng checkout nhánh đã publish, ghi SHA/diff trước khi chạy:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
git status --short
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/actor-gaze.test.ts tests/native-view-eyes.test.ts tests/continuous-view-attention.test.ts tests/native-source-seat.test.ts tests/native-seat-tracer.test.ts tests/scene-baked-path.test.ts tests/source-speech-phase.test.ts tests/artwork-repair.test.ts
npm run tracer:native-seat -- --validate --frames --render
```

Windows, Node>=22.13, dependencies từ `npm ci`, Chromium cho HyperFrames0.8.96; FFmpeg/FFprobe trong PATH hoặc `FFMPEG_PATH`/`FFPROBE_PATH` cho render. Không cần Studio,9router,TTS,ASR hoặc service tạo video. [Hướng dẫn tracer](NATIVE-SEAT-TRACER.md) có WAV tùy chọn đúng7200ms, artifact/log/cap và server8851 riêng. Tracer2 dùng cùng canonical7.2s/5 camera slice/hai ghế/hai actor; cả hai nhìn vào mắt người kia khi ngồi, đứng và đi. Mặc định silent draft; không final/DONE.

Mười một callback mới cần bằng chứng thực thi: union/projection; mutual-reference geometry từ SVG độc lập và seek đảo/ngẫu nhiên; original phase/cut/đổi primary; metadata fps/ID không phá source; self/unknown/hidden/world/eye/expression/source rejection; missing/tampered descriptor và fixed-point/behind-view regression; partner edit invalidates publication; lunge owned clock; ID96 và report unapproved. Những trường hợp này được nhóm trong11 callback, không phải11 check đã PASS.

Ba callback publication trong nhóm đó kiểm disk source stale bị từ chối trước journal/accepted writes; source đổi sau ghi rollback cả scene/report và giữ board mới; separate edit ngay trên file transaction không bị rollback ghi đè, journal báo conflict và resume bị chặn. Chạy thêm regression normal/cache/manual-edit/artwork repair trong hai file cuối ở lệnh trên; chưa có integration/browser concurrency PASS.

Có thêm2 callback mới trong `tests/artwork-repair.test.ts`: appended optional performance field được chuẩn hóa rồi publish hợp lệ; concurrent attempt-file edit vẫn giữ qua outer catch, lỗi có receipt riêng và resume báo conflict. Tổng13 callback mới đều NOT RUN. Setup lunge dùng `registered-rest-mouth-v1` đúng điều kiện của registered expressions.

Ghi raw output/exit code/SHA/diff, môi trường, root tracer, ảnh/video đúng source hash và PASS/FAIL/NOT RUN cho từng điều kiện. Đọc `viewActingPhase.actorTargets` và `bodyEyes.targetSources`: target IDs/span/hash, `motionVerified=false`, `opticalGazeVerified=false`. So eye target với registered midpoint đi qua **actual SVG head transform**, không so hai bản sao cùng helper rồi suy ra đúng. Render bình thường, reverse/random seek, camera endpoints, frame cost/memory và cap2MB vẫn phải đo thật.

## Nghiệm thu hình ảnh và phần còn thiếu

Xem MP460fps ở tốc độ thật: pupils nhìn bạn diễn, mắt/mũi/miệng giữ vị trí và nét nguồn, không trôi mặt, không rung/reset ở cut, ngồi–đứng–đi có cơ thể/tóc/vải phản ứng tự nhiên. So với ảnh warm-skin Lila/Karo và video mẫu người dùng, chú ý màu, tóc/râu, nét mềm của tay/chân, viền quần áo Karo và hai cuff, váy Lila liền, chân trụ và hip contact. Report/source checks không chứng minh optical gaze hoặc chất lượng diễn xuất.

Vẫn cần nghệ thuật/identity được duyệt, accepted view/continuous head/body turns, action/grasp/carry/handoff/contact, layered world ngày/hoàng hôn/đêm và sửa lỗi runtime thật. Toàn sản phẩm còn script nguyên văn→audio clock thật; WAV giữ giọng/ASR; truyện→kịch bản giữ nguồn; EN chính/VI/JA/KO/external-local TTS; legacy SRT fit, mixed speaker ownership, resume/locks/rebuild, review/repair/final audio/subtitle/QC. Không lấy ca tracer hoặc test V1 để tuyên bố các luồng này hoàn thành.

Source review đã khép3 lỗi core ban đầu, publication guard và3 lỗi repair/declaration ở lượt sau. Fresh build/typecheck/static pack thành công; source review không tìm finding mới trong bounded scope. [Record source/checks](reviews/actor-gaze-source-record-v1.md) giữ bằng chứng riêng với runtime; cả13 callback mới và video vẫn NOT RUN.
