# Lila/Karo — ánh nhìn và nhịp thở qua cắt cảnh

Tài liệu này giữ evidence lịch sử 0.33. Source hiện hành 0.34 nâng context lên v2 và bổ sung original point/think command; [contract/test/server hiện hành](NATIVE-SOURCE-GESTURE-HANDOFF.md). Không dùng context v1 đã cache thay cho v2, không suy ra runtime/visual acceptance.

Mốc source0.33, 08/10/2026; base `08712b172a1c5a00d73e7052a36ef1cb0dd54e4f`, branch `codex/prehistoric-life`. Không có API image-to-video vẫn tiếp tục dùng SVG/HTML5/GSAP. Đây là source candidate, chưa nghiệm thu chuyển động hoặc video.

Source checks: full build, test:typecheck, schema export và whitespace exit0; bounded independent source/declaration review PASS. Source checkpoint `da07b1ed800f3767584492711d902a2c001db339` đã push, local/remote SHA khớp. Chín callback mới chưa chạy; không có runtime/visual approval ở mốc này.

## Thay đổi

`ViewActingClock` là context của renderer, tách khỏi clock audio/speech và khỏi performance/artifact giọng đã lưu. Nó chứa actor, exact span của shot, giới hạn một run liên tục, source identity và track gaze có timestamp nguồn. Chỉ native body view đã chọn registered mouth/eyes dùng context này. Không tự đổi ảnh/màu/mắt, không mirror, không duyệt rig.

Hai shot chỉ nối attention/breath khi shot sau khai báo `actorScene.continuity='continuous'`, clock liền nhau và cast/view/stage/root/scale/profile đồng nhất. Đổi primary/supporting vẫn có thể giữ actor, geometry và clock. Run không kéo qua actor vắng mặt hoặc scene cut. Continuous không khớp báo `needs-view-acting-phase`; không tự sửa tác giả.

Gaze có target giống hệt và ranh giới sát nhau trong run được hợp nhất. Cùng cue đang nhìn qua camera cut dùng cùng ramp nguồn140ms, kể cả frame cuối shot trước. Khoảng trống hoặc target khác giữ các interval riêng. Không suy target từ lời kể hoặc từ speaker. Pupil direction vẫn lấy từ tâm mắt native trong hệ tọa độ đầu; guard target phía sau vẫn giữ.

Nhịp thở là lean nhỏ hiện có, period4300ms, amplitude0.55°, phase Karo1100ms. Nó dùng source absolute time và envelope200ms ở đầu/cuối **run**, thay vì đầu/cuối mỗi shot. Không đổi chiều dài xương, sole/grip hay nguyên tắc IK. Blink có thể nhận offset acting khi không có speech context; nếu cả hai clock có mặt phải cùng actor/span. Mouth tiếp tục dùng speech clock/activity nguồn riêng.

Canonical primary/supporting, arm reference, recursive drop sampler và interaction geometry truyền cùng context. Compiler grid có gaze/run ramp và blink source events; refinement/namespace/resource checks giữ nguyên. Body compiler23; report `viewActingPhase` chứa hashes, run clocks và `wholeBodyActionContinuous=false`, `opticalGazeVerified=false`, `approved=false`.

`rigSpeechInputIdentity` đã thêm context attention/breath. Cache/source comparison/repair binding hiện có nhận source run identity; acceptance tính lại từ board thực được nhận, thay current shot bằng candidate, chặn khi attention/cast/geometry/clock ở cảnh liền kề thay đổi. Narration/audio ownership nguyên cue vẫn giữ; source hash không chứng minh waveform hay diễn xuất.

## Giới hạn

Đây là continuity của **explicit pupil gaze và nhịp thở native**, không phải handoff toàn bộ diễn xuất. Gesture target còn local; gesture/spear/locomotion/posture/expression/cloth/hair/head-turn tracks chưa hợp nhất theo nguồn. Target khác vẫn có ramp riêng về neutral; chưa có choreography chuyển ánh nhìn trực tiếp giữa nhiều đối tượng. Không tự thêm head turn hoặc full expressions. Native views vẫn chỉ happy/fixed view và động tác đã đăng ký; neutral mouth Karo, eye skin seams và identity/tỷ lệ còn chờ.

Workbench body mặc định vẫn là local pose inspection; không có board thì nó không minh họa continuity qua cut. Không dùng ảnh tài liệu0.32 hoặc source review làm video acceptance. `productionReady=false`, `productionRig=null`; final source/identity/voice/target/sync gates giữ nguyên.

## Source và test bàn giao

Code: `packages/animation/view-acting-clock.ts`, `packages/actors/view-acting-clock.ts`, compiler/scene, cinematic renderer và actors/speech-clock. JSON schema `library/schemas/view-acting-clock.schema.json` là contract context; không thêm field vào persisted activity/performance. [Kế hoạch](../plans/2026-10-08-continuous-view-attention.md), [record source review](reviews/continuous-view-attention-source-review-v1.md).

**9 callbacks mới NOT RUN**, `tests/continuous-view-attention.test.ts`:

1. Normalization/projection: target/order/adjacency/gap/overlap, giữ input.
2. Strict context, exact actor/span/gaze projection và clock riêng với activity.
3. Hai actor × hai view: đúng source phase tại cut, whole-clip equivalence, random seek.
4. Cut/gap/target-change không kéo nhầm cue.
5. Continuous clock/cast/view/root/stage/scale/profile/nonlocal-track mismatch chặn.
6. Cache/repair identity theo sibling gaze/run và current candidate thay board entry.
7. Profile/source/speech clock mismatch, opt-in và production gates.
8. Compiler event/refinement/matrix/report/resource/namespace.
9. Canonical hai actor đổi primary/supporting, one-cue owner, schema round-trip và unique resource IDs.

Fixture source ownership0.31 được bổ sung performance/span phù hợp để kiểm dependency mới; **14 callback cũ vẫn NOT RUN**, không phải kết quả test mới. Controller chỉ đọc source, build/typecheck/schema export/whitespace; không chạy callback, evaluator, GSAP, browser/API, pipeline, model/voice/audio hoặc MP4.

Cho model test chạy trên SHA được ghi ở record:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/continuous-view-attention.test.ts tests/native-view-eyes.test.ts tests/source-speech-phase.test.ts tests/fixed-view-speech.test.ts tests/partner-facing-views.test.ts tests/artwork-repair.test.ts
```

Ghi SHA/PASS/FAIL/NOT RUN/output/evidence. Kiểm actual GSAP seek/playback hai góc và đổi primary/supporting qua nhiều cuts; xem mắt/đầu/chest/sole quanh cut và run boundaries, gaze sai hemisphere, skin ROI/eye-nose contact; đo scene size, compile time/fps. Kiểm cache/resume/locked shot và repair bị đổi sibling gaze/cast/span ngay trước acceptance. Audio-RMS thật, speaker ownership, voice/input edits và final MP4 cần nghiệm thu riêng.

## Môi trường và server

Node≥22.13, npm/package-lock, TypeScript/Vite/Sharp/GSAP đã có. Controller không start8851 hoặc restart8850. Nếu model test cần Studio riêng:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
powershell -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'projects-continuous-view-attention-test'
```

Giữ terminal, Ctrl+C dừng server đó. Mở `http://127.0.0.1:8851/`; body eyes inspection xem [handoff0.32](NATIVE-VIEW-EYES-HANDOFF.md), bản đó không phải multi-shot playback. Dùng project riêng, không ghi đè các project8850. 9router/TTS dùng config/env đã thiết lập; không gửi/in/commit key. Endpoint/provider/audio runtime chưa kiểm ở mốc source này.

## Toàn sản phẩm còn tiếp tục

Giữ script nguyên văn→TTS/clock thật, WAV giữ giọng/audio-clock→ASR, câu chuyện→kịch bản bám nội dung→voice/video và legacy SRT; EN chính/VI/JA/KO, local/HTTP/command TTS. Lila/Karo là diễn viên trong câu chuyện bất kỳ của người dùng. Còn identity/native neutral/full expressions/brows, body/head turn/whole-body action handoff, walk/run/jump/seating/cloth/hair/prop contact, môi trường giàu màu và runtime/visual acceptance của cả ba input. Mục tiêu đầy đủ vẫn active.
