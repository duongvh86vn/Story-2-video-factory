# Chuyển động chính diện từ đúng nguồn — source0.103

`forest-tribe-0.103-own-front-motion` nối Lila/Karo chính diện vào chuyển động thân và trang phục chung. Chọn `appearance.bodyMotion=registered-front-motion-v1` cùng own `bodyView=front`. **Code mới chưa được nghiệm thu tạo hình, khớp, viền, diễn xuất hoặc video.** Model test của người dùng thực thi các lệnh ở dưới; implementation chỉ kiểm source/build/types/định nghĩa schema/raw inventory.

## Hành vi đã viết

- Bước ngang có `walks[].gait=sidestep`, clock dương và `fromX != toX`. Chuyển theo +X: chân rig-right dẫn; chuyển theo −X: rig-left dẫn. Mỗi cặp có bước mở rồi khép, hai landing dùng cùng root clock cuối cặp và own stance offsets. Cặp cuối đặt cả hai chân về đúng root cuối. Guard giữ thứ tự hai chân; không sửa root, clamp stride hoặc teleport để che nguồn không hợp lệ.
- Đây là bước ngang trong hình chính diện. `walk/run`, chuyển theo chiều sâu hoặc quay người không được suy ra từ drawing này. Đi/chạy hướng tiến tiếp tục dùng artwork góc nghiêng/3/4 và gait đã có của góc đó.
- Nhảy, đứng/cúi/nghiêng và point/think/react dùng body kernel hiện có, fixed bone/hip/mitten/sole và nét ink mềm chung. Hai own front PNG có lower garment cages riêng; upper clothing/belt giữ nguồn, lower material dùng pinned row và12 mesh pieces chung. Cages là tọa độ authoring thủ công, chưa phải anatomy/fabric được đo hoặc duyệt. Không mượn mặt/ROI/vạt/landmark của góc khác, mirror hoặc suy yaw.
- Mắt, miệng, biểu cảm và tóc/râu vẫn là lựa chọn own front riêng. Mouth activity chỉ theo clock của lời diễn viên, không phải phoneme lip-sync. Karo giữ cổ/râu, Lila giữ tóc/đuôi tóc và một váy liền; đẹp, đúng anatomy và không seam vẫn cần so ảnh/video.
- Complete `sourceBody` giữ walk/jump/posture clock gốc qua explicit continuous camera slices và đổi primary/supporting. Identity/view/root/stage/scale phải cùng nguồn; không còn local body tracks cạnh tranh với source. Source/sibling bị sửa hoặc thiếu clock phải làm mất publication/repair binding. Đổi vai Lila/Karo trong cảnh không cấp mẫu `supportingModel` geometry.
- Schema, workbench/API, director acting brief, compiler42, clock16, report/cache/manifest đã nối cùng selection. Không cấp seat/prop/tool/handoff/head bank/supportingModel hoặc continuous turns cho mode này. Source preview0.102 vẫn lấy project/cảnh gốc và dùng shared emitter. Pre-model/TTS và `needs-source-prop-binding` giữ nguyên; approvals=false, productionReady=false, productionRig=null, availableBanks=[].

Nguồn giữ nguyên byte: `lila-front-v1.png`939×1675 và `karo-front-v1.png`1024×1536 trong `library/topics/prehistoric-life/body-views`. Binding có exact SHA/canvas. Các ảnh/header/hash không chứng minh hình hoặc chuyển động đạt yêu cầu.

Code chính: `packages/animation/body-view-front-motion-binding.ts`, `body-view-cloth.ts`, `body-view-art.ts`, `body-view-basic-capabilities.ts`, `body-view-front-registration.ts`, `compiler.ts`, `schemas.ts`, `view-acting-clock.ts`; `packages/host/schemas.ts`; `packages/topics/body-workbench.ts`; `packages/director/acting-brief.ts`; `scripts/prehistoric-pack.ts`. Chín callback ở `tests/native-front-motion.test.ts` **DECLARED / NOT RUN**.

## Môi trường và lệnh giao model test

Windows, Node≥22.13.0 và dependencies theo lockfile. Giữ nguyên checkout D và server8850 của người dùng. Model test dùng C worktree/cổng riêng; ghi full SHA, input/options, commands, stderr và artifacts. Không đưa API key vào chat/report/Git.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-front-motion.test.ts tests/native-front-secondary.test.ts tests/native-profile-locomotion.test.ts tests/native-rear-locomotion.test.ts tests/native-locomotion.test.ts tests/original-source-preview.test.ts
$env:STUDIO_HOST='127.0.0.1'
$env:STUDIO_PORT='8851'
npm run studio
```

Mở `http://127.0.0.1:8851`; Ctrl+C đúng terminal này để dừng. Nếu8851 bận, chọn cổng khác và ghi report. Implementation chưa mở các URL này:

- `/api/topics/prehistoric-life/body?view=front&action=sidestep&timeMs=900&mood=happy&motion=registered-front-motion-v1`
- `/api/topics/prehistoric-life/body?view=front&action=sidestep-left&timeMs=1600&mood=happy&motion=registered-front-motion-v1`
- `/api/topics/prehistoric-life/body?view=front&action=jump&timeMs=1100&mood=happy&motion=registered-front-motion-v1`
- `/api/topics/prehistoric-life/body?view=front&action=crouch&timeMs=1100&mood=happy&motion=registered-front-motion-v1&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&expressions=registered-basic-expressions-v1&secondary=registered-front-secondary-v1`

Workbench chỉ là bàn kiểm pose. Để kiểm câu chuyện thật, dùng [preview project/cảnh gốc](ORIGINAL-SOURCE-PREVIEW-HANDOFF.md), giữ narration/storyboard/actor/sourceBody clock/target/camera gốc; đừng thay bằng demo do implementation tạo. Callback project thật của preview cần project/shot do QA cung cấp; SKIP không là PASS. Preview im lặng/chưa duyệt không thay final MP4 có giọng và QC.

## Nghiệm thu còn thiếu

Kiểm cả hai diễn viên × rest/point/think/react/sidestep hai hướng/jump/crouch, rigid và selected. So nguồn ở cận mặt và toàn thân: mặt/mắt/mũi/miệng, cổ/tóc/râu, màu ấm/đậm, đường nét, Lila một váy liền và Karo hai vạt/ống có viền. Đặc biệt belt/hem/split/crotch và vị trí hip/cuff phải đúng khi bước/cúi/tiếp đất. Pinned row/mesh area/hash không thay kiểm anatomy hoặc painter seams.

Chân dẫn theo hướng, chân sau khép theo; không bắt chéo, trượt sole khi stance, đổi bone lengths, gập khuỷu/gối trái tự nhiên sai hoặc root teleport. Kiểm chuyển trọng tâm, arm balance, chuẩn bị nhảy–đạp–bay–tiếp đất–settle, cloth/hair follow, frame đầu/cuối và 60fps ở tốc độ thường. Random/reverse seek và cut giữa bước/nhảy/đổi primary/supporting phải giữ nguyên body/feet/cloth/face/hair phase. Camera/subtitle layout phải giữ toàn envelope hành động và màu cảnh.

Sai actor/mode/view/SHA/canvas, gait mặc định/forward run/depth, source thiếu/local/sibling đổi, mượn góc khác, front tool/seat/handoff/head bank/supportingModel/turn phải fail rõ. Legacy forward walk/run và rear/profile/3/4 source không bị cấp sidestep hoặc đổi nhịp. Nội dung/giọng đổi thì narration/cache dựng lại; đổi diễn viên giữ audio hợp lệ và dựng lại hình.

Ghi PASS/FAIL/NOT RUN, exact SHA và artifact tương ứng; model source review không chạy test hoặc duyệt motion. Test V1 và bản source trước không nghiệm thu0.103.

## Mục tiêu đầy đủ còn mở

Ba input chính: nguyên kịch bản/dialogue; WAV có lời kể gốc; chuyện/chủ đề bất kỳ → kịch bản faithful. Legacy SRT vẫn giữ cue/clock. Nhân vật diễn trong câu chuyện, có nam phụ đầu trọc/không tóc/không râu và nữ phụ có tóc dùng đúng costume vai chính. Vivid world/ngày/hoàng hôn/đêm, đạo diễn/camera, đối thoại/eye contact, tools/grasp/carry/handoff/contact và genuine head/body turns phải phục vụ câu chuyện mới.

EN chính, VI/JA/KO, external/local HTTP/command TTS, exact narration/audio/subtitle clocks, resume/locks/rebuild/review/repair và final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC vẫn cần kiểm toàn tuyến. Không báo DONE hoặc mở production từ bước ngang/source checks.

## Kết quả source cuối

Build, test:typecheck, definition export, static pack và raw source inventory exit0. 307 raster nguyên byte (144PNG/163JPEG,101JPEG tênPNG),18 head definitions/27 metadata và tất cả callback cũ giữ nguyên. 59 shared functions và inline legacy gait/IK/arm/support/cloth được đối chiếu source; own front fixed body/face/masks không đổi. Hai cage bind đúng own PNG/SHA/canvas, không duyệt anatomy/fabric. Manifest 186 mapped source hashes/46 scalar entries đối chiếu source cuối. Combo tester HTTP200→gpt-6-luna cho bounded source advice, không chạy test hoặc duyệt hình/phim. Chín callback mới DECLARED / NOT RUN;31 owned paths,52 untracked khác được giữ để freeze/stage riêng. Chưa có runtime/audio/render/video hoặc toàn factory acceptance.
