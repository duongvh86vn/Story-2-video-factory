# Source0.64 — đạo cụ thuộc từng diễn viên

09/10/2026. Luồng storyboard/Studio API/renderer chung nhận chủ sở hữu đạo cụ là **ID người trong câu chuyện**. Hai người có thể đồng thời nhấc/mang/đặt **hai vật khác nhau**, với giọng/kịch bản/clock đã chốt. Đây là source engineering, chưa chạy runtime/geometry/render/video; không phải nghiệm thu tool hoặc tạo hình tiền sử.

## Contract và phần đã viết

- `cinematic.propBindings[].ownerId` là person ID hiện diện trong `actorScene`, không phải model/rig ID. Chủ sở hữu quần chúng/supporting phải được chỉ rõ. Bỏ trường này giữ contract primary/presenter cũ; không đoán người cầm từ tên vật hoặc gesture.
- Prop đặt trong `performance.props` của đúng người. Gesture, actions, tay, gripOffset, scale, nguồn, contact/release và đặt vật thuộc người đó. Mọi prop ID phải duy nhất trong toàn cast; một entity gắn đúng một prop/một tay.
- Kiểm toàn bộ binding một lần trên thế giới chung rồi kiểm performance/actions của từng diễn viên. Khi kiểm người phụ, giữ context scene gốc cho camera và model motion; không cho họ làm vật của người khác quay về vị trí ban đầu.
- Không tự vẽ bàn/giá máy dưới mọi vật được mang trong story. Bối cảnh authored cung cấp đá/bàn/nền và điểm đỡ thật theo nguồn; legacy presenter giữ support stands cũ.
- Canonical `renderCinematic` biên dịch từng diễn viên như trước. Vật riêng của người phụ có namespace riêng, vẽ ở world space với scale của đúng người. Texture không nhân đôi; nhãn/focus/shadow/foreground/thermal/event selectors đọc frames của đúng chủ sở hữu.
- Quan hệ giữa hai vật dùng hợp các adaptive keyframe times của tất cả chủ sở hữu. Tâm vật được nội suy từ các keyframe tuyến tính mà GSAP thực sự vẽ, không sinh lại bone/face clock. Missing center hoặc khác clock báo lỗi.
- Camera kiểm envelope của người cầm thật, gồm lịch sử original run nếu đã có context. Model exit là object center của đúng người, không phải hand grip. Báo cáo ghi actorId/ownerScale/hand/gesture/contact/release.
- API/editor dùng cùng contract và source guards. Producer `story-direction-2.2.32`, bound motion `2.2.3`, model renderer `2.2.2` làm các scene/cache cũ cần refresh. Inspection vẫn đọc producer cũ và báo migration/locks; không tự mở khóa hoặc sửa clock. Narration/audio cache không dùng các revision hình này làm key giọng.

Ví dụ cấu trúc (ID/nguồn/toạ độ/clock phải lấy từ project thật):

```json
{"propId":"basket-prop","partId":"basket","ownerId":"lila-person","role":"illustrative-model","sourceRefs":[{"kind":"narration","segmentId":"cue","quote":"Lila carries the basket."}]}
```

Hai người độc lập mang vật khác nhau được author trong cùng scene; không phải đổi người phụ thành lead để kích hoạt vật của họ. Đây không phải template bắt buộc mọi tập có giỏ/bát hoặc máy móc.

## Giới hạn và việc còn thiếu

- Mỗi vật hiện có một completed in-shot pickup/carry/drop. **Chuyền cùng vật giữa hai người, cùng giữ một vật và mang vật qua camera cut còn thiếu** cơ chế ownership/contact/source clock liên tục; các guard cũ vẫn chặn. Không đổi nghĩa câu chuyện để né việc này.
- Native head/body tiền sử hiện còn thiếu registered grasp/carry/drop/tool poses. Contract ownership này không cấp thêm pose hoặc biến rig khác thành Lila/Karo đã đạt chuẩn. Chọn native artwork thiếu capability vẫn báo needs-view-motion; topic productionReady=false, productionRig=null, availableBanks=[].
- Still needed: faithful views/turns/face/neck/hair/costume, soft limbs/planted feet, contact/handoff, vivid day/sunset/night, supporting own views/emotions. Nam phụ giữ đầu trọc/không râu, nữ phụ giữ mẫu hiện có.
- Toàn mục tiêu vẫn là arbitrary story → script / exact script / original WAV (+legacy SRT) → narration → sourced actors/acting/world → review/repair → final MP4/audio/subtitle/QC, EN chính + VI/JA/KO/external-local TTS, resume/rebuild/locks. Source/check dưới đây không chứng nhận chất lượng phim hoặc các luồng/ngôn ngữ này.

## Source, môi trường và model test

Source ở `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`, branch `codex/prehistoric-life`. D checkout được giữ nguyên. Node>=22.13, dependencies từ package-lock. FFmpeg/ffprobe và Chromium/HyperFrames cần cho media acceptance; kiểm geometry protocol không gọi voice/provider/browser/video. Runtime tiếp tục do model của người dùng chạy.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
# Chỉ npm ci khi checkout này chưa có node_modules.
npm run build
npm run test:typecheck
# Các lệnh sau dành cho model TEST, parent chưa chạy:
node --import tsx --test --test-concurrency=1 tests/actor-owned-props.test.ts tests/cinematic-props.test.ts tests/cinematic-prop-origin-precision.test.ts tests/story-prop-controls.test.ts
# Server riêng; launcher không dừng hoặc ghi đè server/project 8850:
./scripts/start-studio.ps1 -Port 8861 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/tmp/actor-prop-owners-test-projects'
```

11 callback mới khai báo/typechecked, **0 executed**: hai renderer kinds; explicit/no-guess/duplicate ownership và compound SVG namespace collision; nguồn/tay/contact/scale/clock/stage/joint rejection; supporting-only cast; model exits/cross-cut guard; merged relation clocks/missing centers; supporting motion camera envelope; producer migration/locks; supporting released carry/lift/walk/lowering. Đây là protocol/geometry fixtures, không audio/art/final acceptance.

Model test cần kiểm actual scene GSAP random/reverse seek và normal-speed media, object size/grip/ground/foreground/shadow/labels/effects/relations/camera, immutable script/WAV/voice/cue/source, lead swap/actor identity/resume/cache/locks, wrong owner hoặc thiếu pose không tạo final/DONE. Report phải ghi full SHA, command/exit, artifacts/source hashes, PASS/FAIL/NOT RUN theo đúng phạm vi; không dùng V1 TEST-RESULTS để đóng mốc mới.

Bằng chứng source: [record](reviews/actor-prop-owners-source-record-v1.json), [review source 9router](reviews/actor-prop-owners-source-review-v1.json). Test/runtime/render/video vẫn NOT RUN ở phía triển khai.
