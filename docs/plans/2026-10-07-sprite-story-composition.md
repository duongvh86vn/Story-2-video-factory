# Sprite actors trong cảnh kể chuyện

## Goal

Cho phép nhiều diễn viên dùng nguyên artwork trong atlas/strip đã nhập, cùng clock với cảnh, thay vì biến dạng lại mặt và tay chân bằng rig. Đây là bước source tiếp theo của tool ba input; chưa phải nghiệm thu video hay mở khóa production chủ đề tiền sử.

## Architecture

Một compositor thuần nhận stage plan, các motion bất biến và target đã được caller xác minh. Mỗi clip có wrapper riêng, root trajectory riêng và khoảng hiện trái đóng/phải mở. Root dùng translate/rotate/uniform scale dương; không mirror hoặc morph artwork. Một adapter ràng buộc stage vào Shot/actorScene/sourceRefs thật, để không dùng một preview không có câu chuyện làm bằng chứng sản phẩm.

## Tech Stack

TypeScript, Zod, literal paused GSAP timeline hiện có, SVG image crops. Không thêm thư viện hoặc thay validator.

## Global Constraints

- Runtime test, assertions, GSAP/browser execution, render/MP4/TTS/ASR giao model khác. Chỉ chuẩn bị test và chạy build/typecheck/schema export/source review.
- Candidate import không trở thành approved vì có hash hoặc compile được. Giữ `productionReady=false`, `speechSync=none`, không giả chỉ số bone/face/lip-sync.
- Không thay nội dung/clock của script, WAV hoặc narration. Lila/Karo là diễn viên; module dùng actor ID bất kỳ, không hardcode demo săn hoặc máy móc.
- Root trajectory, sampling, clip visibility và contact dùng clock GSAP 0.0001 ms. Không cắt động tác once; không dùng negative scale/mirror.
- Target được caller cung cấp từ scene thật; không coi tọa độ do model tự khai trong clip là bằng chứng tiếp xúc. Chỉ kiểm điểm tại clock đã khai, không gọi đó là kiểm toàn chuyển động hoặc foot planting.
- Không xuất final qua module candidate này. Pipeline production giữ gate hiện có cho đến khi art, speech, camera, contact và runtime có bằng chứng.
- Không sửa WIP tại D:/github/Story-2-video-factory2.1, không xóa scratch đã bị policy chặn.

## Task 1 — Stage contract và compositor

Files: `packages/motion/stage-schemas.ts`, `packages/motion/stage.ts`, `packages/motion/clock.ts`; refactor clock import và named event preflight trong `packages/motion/player.ts`; `tests/sprite-story-stage.test.ts`.

Interfaces:

```ts
compileSpriteStage(plan: SpriteStage, motions: ReadonlyMap<string, ActorMotion>, targets?: ReadonlyMap<string, MotionPoint>): SpriteStageCompilation
sampleSpriteStage(plan: SpriteStage, motions: ReadonlyMap<string, ActorMotion>, timeMs: number): SpriteActorSample[]
spriteMotionKey(id: string, fingerprint: string): string
```

Stage: id/duration/stage dimensions, 1–8 actor tracks, tối đa 64 clips toàn stage và 256 root keyframes. Clip giữ SpriteClip fields, thêm motionId/fingerprint/sourceRefs/root keyframes. Root first/last clock phải bằng clip start/end, keys tăng strict trên clock renderer, interpolation `none` hoặc `sine.inOut` (ease của key đích). Không chồng clips cùng actor trên clock renderer; clip IDs unique toàn stage; compositionId phải là stage id; actor motion phải khớp actor ID và fingerprint.

Pure sampler trả logical frame, motion identity, transform, frame rectangle world bounds và measured landmarks của clip đang hiện. Transform root ngoài placement. Candidate wrapper chỉ hiện `[start,end)` kể cả native motion có end=hold/first; gaps ẩn. Không suy luận gaze từ landmark tay hoặc tự đưa pose mới vào khoảng trống.

Root sampling phải dùng precision của AttrPlugin trong GSAP đã cài: các thành phần transform đang nội suy được làm tròn 4 chữ số thập phân; endpoint/static components giữ giá trị đã khai. Không dùng một sampler precision cao hơn transform thực để báo contact sai. Đây là kiểm từ source thư viện, runtime parity vẫn giao model test.

Compiler chỉ xuất SVG fragment và literal `tl.set/to` fragment, không sở hữu clock/timeline khác. Tổng tối đa 12000 calls, cap player 6000 giữ nguyên. Report gồm các actor/clip/fingerprint/source reference, số event và contact điểm (errorPx); chưa chứng nhận anatomy/fluidity/speech. Thiếu target/landmark, hidden contact, error lớn hoặc effect trước contact phải lỗi. Target ID không được suy thành một tọa độ default.

Tests chuẩn bị: nhiều actors, clip boundary/gap/overlap, once full duration, root rotation/scale/ease, backward seek parity, contact qua 2 transforms, effect clock, missing/corrupt identity, caps và validator literal subset. Assertions chỉ nằm trong callbacks.

## Task 2 — Ràng buộc vào Shot và bàn giao

Files: `packages/motion/story-stage.ts`, `tests/sprite-story-binding.test.ts`, `library/schemas/index.ts`, generated `sprite-stage.schema.json`, `docs/topics/SPRITE-MOTION-IMPLEMENTATION.md`, `docs/topics/SPRITE-STORY-TEST-HANDOFF.md`.

Interface `compileSpriteStoryActors(shot: Shot, plan: SpriteStage, motions: ReadonlyMap<string, ActorMotion>, targets: ReadonlyMap<string, MotionPoint>)` nhận Shot cinematic có actorScene và sourceRefs. Stage id/duration/dimensions phải đúng Shot/performance. Cast phải khớp chính xác primary/supporting, không thay người dẫn hay thêm nhân vật. SourceRefs của clips/contact phải là references đã có trong Shot; không tạo lời thoại mới. Cast có speakingSegmentIds thì chặn với `needs-sprite-speech` đến khi có mouth/voice synchronization được triển khai, tránh báo audio activity cho baked sprite không có mouth layer. Contact target IDs phải tồn tại trong visualization thật; tọa độ target phải do caller resolve. Report giữ shot source identity và nói rõ chỉ là actor fragment, chưa phải toàn scene/camera/QC.

Xuất stage schema để model/test dùng cùng contract. Bàn giao lệnh test (không chạy), môi trường và phạm vi thiếu. Kiểm build/typecheck/schema export, review source độc lập trước push branch hiện có.

## Phần sản phẩm tiếp tục sau compositor

1. Nối fragment vào renderer canonical `library/shots/cinematic.ts`, thay riêng actor layer bằng sprite; giữ art planes, objects, camera và captions. Không chạy rig sampler giả bên dưới sprite hoặc xuất rig geometry giả.
2. Stage motion PNG nguyên bytes, hash descriptor/renderer vào inputIdentity, lock/resume/rebuild/final exports. Gắn plan vào storyboard và chọn clip từ catalog có acceptance thật, không nhập IDs tưởng tượng từ model.
3. Tạo/nhập chuyển động Lila/Karo giữ đúng artwork từ ảnh người dùng, đủ view/pose/expressions và contact registrations. 9router có route video trong source nhưng account/provider sinh video chưa được xác nhận; không coi route tồn tại là dịch vụ dùng được.
4. Mouth/voice cho dialogue thật, gaze/face registration, foot support, camera/framing và prop contact theo toàn khoảng hoạt động; nghiệm thu riêng từng phần.
5. Model khác chạy ba luồng thật, rebuild/resume/đổi voice và kiểm video mẫu. Chỉ sau evidence đó mới quyết định release topic, giữ nguyên final gates trong lúc chờ.

## Validation commands (source only)

`npm run build`, `npm run test:typecheck`, `npm run schemas`, `git diff --check`. Không chạy `npm test` hoặc dùng render như một cách vòng qua quyền test đã giao.

## Status

Tasks 1–2 đã có source tại `3a403a8`, fix review tại `8b4b930`. Trên source fix, controller chạy `npm run build`, `npm run test:typecheck`, `npm run schemas`: exit 0; diff check không báo lỗi. Review độc lập xác nhận source milestone ready sau sửa ba Important và hai Minor; [accumulator](../topics/reviews/sprite-story-source-review-v1.md) giữ đầy đủ finding/ruling. Runtime **NOT RUN**; chưa mở production topic hoặc claim đạt video mẫu.

Các điểm tích hợp tiếp đã xác định từ source hiện có:

- `packages/scenes/index.ts`: canonical source comparison (line 50), publication geometry/report (line 185), trusted render và artwork repair (line 233/263) đều gọi renderer đồng bộ. Motion descriptor/PNG phải được load/verify trước khi gọi, không đọc file/network trong compiler.
- `packages/director/creative.ts` và `artwork-repair.ts` cũng render source trước asset staging; context sprite phải được đưa vào rõ ràng hoặc chặn thiếu asset, không âm thầm fallback rig.
- `packages/review/index.ts` hiện đọc `HostGeometry`, so hostHeightRatio với rigMetrics và cần bằng chứng trước/trong/sau contact. Sprite cần geometry/report có discriminator và đo từ artwork/frame registration, không nhét kết quả giả vào schema rig cũ.
- Scene cache/lock phải xác minh cả descriptor và PNG đã staged; sampler trả frame rectangle gồm cả margin alpha, nên rectangle đó chỉ là bound bảo thủ và chưa đủ dùng cho face focus hay chân đặt đất.
