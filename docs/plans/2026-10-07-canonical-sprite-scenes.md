# Sprite actors trong renderer canonical

## Goal

Nối compositor tại `8b4b930` vào cảnh kể chuyện thật, giữ bối cảnh/art planes, model objects, camera, captions và scene identity. Không dựng rig giả dưới sprite. Đây là phần triển khai của tool ba input; toàn bộ production/art/runtime nghiệm thu vẫn còn bắt buộc.

## Architecture

`cinematic.spriteStage` là opt-in plan có clock/cast/source được ràng buộc. Renderer canonical dispatch rõ sang sprite branch với descriptor context do scene loader xác minh. Geometry có discriminator riêng; không giả profile/rig hashes hoặc bone metrics. Candidate vẫn được dùng để dựng draft/kiểm source; final bị chặn ở cả engine/pipeline/QC đến khi có contract acceptance thật.

## Tech Stack

TypeScript/Zod, SVG/GSAP literal clock hiện có, immutable motion loader, HyperFrames scene bundle. Không thêm dependency hoặc nới scene security.

## Global Constraints

- Test runtime/assertions/browser/fixtures/render/video/TTS/ASR giao model khác. Build/typecheck/schema export và review source được phép.
- Giữ ảnh/màu/nét vẽ source nguyên bytes; không mirror, không sửa cue/narration hoặc tự viết dialogue. Baked sprite có sourced dialogue phải báo `needs-sprite-speech`.
- Sprite plan phải khớp shot/cast/refs/dimensions/clock. Thiếu descriptor/assets/context, contact sai hoặc feature chưa được thực hiện phải lỗi rõ, không fallback rig.
- Chưa mở topic `productionReady=false` hoặc claim đạt mẫu. Renderer candidate không làm candidate thành approved.
- Không sửa checkout WIP D:/github/Story-2-video-factory2.1; không xóa scratch bị policy chặn.

## Task 1 — Renderer branch

Files: `packages/director/schemas.ts`, `packages/motion/player.ts`, `stage.ts`, `camera.ts`, `scene.ts`, `library/shots/cinematic.ts`.

- Thêm optional spriteStage; không đổi DIRECTION_VERSION hoặc source bytes của legacy shots không có field.
- Có sampler closure parse một lần cho camera, không parse hàng trăm frames lại mỗi lần query.
- `renderCinematic` giữ overload cũ cho 7 args, thêm 8th motion map cho scene context; có spriteStage nhưng thiếu map thì lỗi. Branch mới dựng đầy đủ SceneFiles và tagged sprite geometry/report.
- Dùng artLayers/customModelArt/cinematicRelations/cameraTimeline hiện có cho world. Không hardcode tiền sử hoặc cơ chế máy. Prop binding bằng rig chưa hỗ trợ phải chặn `needs-sprite-props`, không lấy rig frames làm geometry thật.
- Sprite camera kiểm frame bounds và registered face/contact points theo clock được khai, report nói rõ sampling/bounds scope. Face close cần measured landmarks, không coi cả canvas alpha margin là mặt.
- Contact-driven world event phải có sprite contact đúng actor/hand/part và xảy ra trước effect; không tự suy target từ model-generated coordinates. Resolve static model handle từ canonical partAnchor.

## Task 2 — Loader, staging, integrity và gate

Files: `packages/motion/scene-source.ts`, `packages/scenes/index.ts`, `packages/director/index.ts`, `packages/explainer/storyboard.ts`, `packages/review/index.ts`, `packages/render/hyperframes.ts`, `packages/qc/index.ts` và pipeline khi cần.

- Load exact id/fingerprint từ project immutable store, verify descriptor/PNG; stage PNG nguyên bytes, dùng bounded reread + hash trên Buffer sẽ ghi, không unchecked stream hoặc re-encode.
- Input identity gồm stage/compiler version/descriptor hashes; locked và outdated scene checks xác minh sprite sheets đã staged. Canonical source comparison và geometry publication dùng cùng descriptor context. Không mất artifact valid hoặc lock.
- Story/source/model/camera validations vẫn giữ. Sprite branch không gọi rig physics hoặc dùng rig metrics cho geometry/QC; review hiểu tagged geometry và lấy contact evidence thật.
- Candidate sprite không được tạo final hoặc QC PASS, kể cả gọi engine trực tiếp. Download/DONE giữ gate hiện có, không đánh dấu delivered vì draft compile được.

## Task 3 — Test declarations và docs

Files: `tests/cinematic-sprites.test.ts`, `docs/topics/SPRITE-STORY-TEST-HANDOFF.md`, generated schemas và progress MD.

Chuẩn bị tests source/renderer/loader/final gate: opt-in legacy compatibility, no hidden rig, multi actor/world/camera, missing context, identity/clock/contact/speech/props rejection, PNG staging/hash tamper, resume/lock identity, final candidate rejection. Không thực chạy. Chạy build/test:typecheck/schema export/diff check; source review độc lập, sửa Important/Critical, push nhánh đã được user ủy quyền.

## Product work còn tiếp tục

Chọn motion từ catalog được duyệt trong director/Studio; quản lý receipt acceptance và export; tạo art Lila/Karo chuyển động đủ views/poses/expression; mouth/voice và props thật; visual/runtime test ba input đến video và QC. Không thu hẹp mục tiêu thành renderer draft khi các phần đó chưa đạt.
