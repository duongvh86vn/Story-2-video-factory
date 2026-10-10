# Diễn viên góc nghiêng cầm/mang/đặt/thả vật — source0.101

`forest-tribe-0.101-own-profile-manipulation`. Đã nối code thao tác vật với bốn PNG riêng Lila/Karo ×left/right. **Chưa nghiệm thu tạo hình, khớp, grip, chuyển động, audio, video hoặc toàn factory.** Đây là phần dùng lại cho diễn viên trong nhiều câu chuyện, không giới hạn chủ đề máy móc hoặc biến nhân vật thành host cố định.

## Contract và thay đổi

- Chọn tường minh `appearance.bodyManipulation=registered-profile-manipulation-v1`, đúng `bodyView=left/right`, actor/artwork/file/SHA/canvas. Không lấy tọa độ góc3/4 hoặc mirror mặt/áo. Canonical bone/cuff/palm/mitten/sole của chính người đó giữ nguyên. Default rigid không tự bật thao tác; mode legacy `registered-manipulation-v1` vẫn chỉ góc3/4.
- `inspect/operate/pick-place/carry/drop` dùng đúng vai và rest directions của own source. Nhánh tiếp xúc nhận `restPole` từ compiler: Karo ở góc nghiêng có chiều khuỷu nghỉ khác mặc định theo tay; không đảo pole theo target hoặc từng frame. Caller legacy không có restPole giữ mặc định cũ. Công thức C2 approach/recovery, fixed lengths, reach/shape/contact/corridor guards giữ nguyên; không clamp, kéo xương hay dời target để che lỗi.
- Thao tác vật là single-person ownership. Carry đi cần chọn riêng `registered-profile-locomotion-v1`, cùng hướng left/right và đủ thời gian nhấc/hạ. Camera slice phải lặp nguyên `sourceManipulation` và `sourceBody` của cùng diễn viên, cùng toàn clock gốc; props/contact/body local rỗng. Release trước shot vẫn dùng actual original release palm. Sửa sibling/source/clock phải chặn hoặc đổi publication/cache binding.
- Một palm slot sau glyph thật, wrist/grip cứng và layer theo contract hiện có. Vật tròn trên workbench là marker geometry. Cảnh sản xuất cần object/action/target/source binding thật, giữ `needs-source-prop-binding`; marker không thay đồ vật của truyện. Chưa cấp giáo, handoff/shared/sequential ownership, ghế ở góc nghiêng, head-bank, mẫu supportingModel hoặc continuous turn. Vai primary/supporting trong storyboard là khác với supportingModel.
- Schema, topic/cast API, workbench, director brief, report/cache/manifest nhận exact mode. Clock15, body registration14, native contact3, forest compiler41. Các source ảnh, face/cloth/secondary data và own fixed body geometry giữ nguyên. Hair/voice/face capabilities vẫn cần chọn riêng.
- Sửa riêng fixture/URL source0.100 từ `mood=laughing` (không có trong contract) sang `excited`. Không thêm alias, đổi timing hoặc bỏ assertions; fixture cũ cũng chưa chạy.

Code chính: `packages/animation/body-view-profile-manipulation-binding.ts`, `native-contact-arm.ts`, `body-view-art.ts`, `body-view-basic-capabilities.ts`, `compiler.ts`; `packages/actors/view-acting-clock.ts`; schema/workbench/brief và pack. Mười một callbacks mới `tests/native-profile-manipulation.test.ts` **DECLARED / NOT RUN**. Các ca khai báo giữ nguồn/khớp/palm, bản gốc qua cut/release/đổi vai, blocking conditions và production gates; typecheck không chứng minh chúng PASS.

Một lượt combo9router `tester` review source-only (HTTP200→gpt-6-luna) phát hiện original stationary contact bị buộc chọn locomotion. Parent đối chiếu compiler/sourceBody và sửa: exact own-profile contact cùng clock thân rỗng được dùng khi đứng yên; thêm walk/jump/posture/support/entryPosture phải có own locomotion. Clock gốc không bị bỏ. Đây là review source, không PASS runtime/art hoặc nghiệm thu source cuối từ reviewer.

## Server và kiểm thử — dành cho model của người dùng

Giữ nguyên D checkout/server8850. Windows, Node≥22.13.0 (source dùng24.19.0), dependencies theo lockfile. Ghi full SHA/cổng/commands/input/artifacts. Không commit API key. Implementation không chạy server/browser/API pipeline/TTS/ASR/test fixture/sampler/render/media.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-profile-manipulation.test.ts tests/native-manipulation.test.ts tests/native-source-manipulation.test.ts tests/native-profile-locomotion.test.ts tests/native-front-secondary.test.ts
$env:STUDIO_HOST='127.0.0.1'
$env:STUDIO_PORT='8851'
npm run studio
```

Mở `http://127.0.0.1:8851`; Ctrl+C terminal đó để dừng. Nếu8851 bận, chọn cổng trống và ghi lại. Preview silent/segment-draft không có giọng thật, không gọi phoneme lip-sync. Combo9router `tester` đã trả HTTP200/gpt-6-luna trong kiểm tra kết nối; chưa kiểm thử dự án/video.

- `/api/topics/prehistoric-life/body?view=left&action=operate&hand=left&timeMs=1800&mood=happy&manipulation=registered-profile-manipulation-v1`
- `/api/topics/prehistoric-life/body?view=right&action=pick-place&hand=right&timeMs=1500&mood=happy&manipulation=registered-profile-manipulation-v1`
- `/api/topics/prehistoric-life/body?view=left&action=carry&hand=right&timeMs=1800&mood=happy&manipulation=registered-profile-manipulation-v1&motion=registered-profile-locomotion-v1`
- `/api/topics/prehistoric-life/body?view=right&action=drop&hand=left&timeMs=3000&mood=happy&manipulation=registered-profile-manipulation-v1`

Kiểm cả Lila/Karo ×left/right ×hai tay ở approach/contact/hold/carry/release/recovery/flight/landing. Quay cận khớp và toàn thân; giữ mặt/tóc/đai/vạt/viền áo, sole contact và đúng near/far layer. Kiểm Karo không gập sai khuỷu, hai tay không đảo hoặc giao nhau vô lý; fixed lengths và contact phải đúng. Raw rest directions/manual registration chưa chứng minh anatomy. Với target không với tới hoặc khuỷu quá gập phải lỗi, không sửa lời kể/target để cố PASS.

Chạy camera cuts trước/sau contact/release, original carry path, random/reverse seeks, primary–supporting swaps và sibling edits. Dùng SVG/object thật có nguồn để kiểm glyph/palm/occlusion/world reaction; cần real60fps video ở tốc độ thường so reference. Ghi PASS/FAIL/NOT RUN, full SHA/actor/view/action/hand/time/input/output/stderr/video. V1/source0.100 hoặc connectivity200 không nghiệm thu0.101.

## Mục tiêu đầy đủ còn mở

Factory phải nhận story/topic bất kỳ → screenplay trung thành, exact script/dialogue theo vai hoặc original WAV (+legacy SRT), tạo narration/timeline/world/actions/director/camera/review/repair/final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC. EN chính, VI/JA/KO, external/local HTTP/command TTS, cache/resume/approved locks/rebuild và ba luồng cần nghiệm thu toàn tuyến.

Front motion/rear secondary, own seat/tools/handoff/contact, run/jump/hunt/spear và genuine continuous head/body turns vẫn còn việc. Nhân vật phải nhìn/nghe/phản ứng với bạn diễn, màu vivid day/sunset/night, khớp mềm hợp lý; nam phụ trọc/không tóc/không râu và nữ phụ có tóc với costume đúng nguồn. Một marker preview hoặc source build không hoàn thành video factory.

Giữ art/motion/production approvals=false, `productionReady=false`, `productionRig=null`, `availableBanks=[]`, pre-model/TTS gate và `needs-source-prop-binding`. Không final/DONE/full-goal-complete từ source checks. [Đặc tả đầy đủ](CUOC-SONG-THOI-TIEN-SU.md).

Records: `reviews/profile-manipulation-static-record-v1.json`, `reviews/profile-manipulation-source-record-v1.json`. Source checks ghi trong record; Git/GitHub SHA được đối chiếu ngoài repo để tránh tự tham chiếu commit.

## Kết quả source cuối

Build, test:typecheck, schema definition export, allowed pack và raw static inventory exit0. 307 raster nguyên byte (144PNG/163JPEG,101JPEG tênPNG),18 head definitions/27 head metadata giữ nguyên. Bốn own profile sources bind PNG/SHA/canvas/own geometry; canonical hand source và C2/solve/reach/corridor/contact/physical body source không đổi. Chỉ lựa chọn authored rest branch và stationary source guard thay đổi có chủ đích. Legacy cloth/face/secondary data giữ nguyên; manual coordinates chưa duyệt anatomy/grip/viền/layer. Manifest177 mapped source hashes/46 scalar entries đối chiếu source cuối; handoff=false không bị documentation path ghi đè. 11 callback mới chưa chạy; prior front mood correction giữ mọi timing/assertion. Freeze/stage32 đường dẫn riêng,52 untracked khác giữ nguyên. Tester source-only advice HTTP200→gpt-6-luna, stationary-clock finding được parent xác minh/sửa, chưa có reviewer nghiệm thu final source. Chưa nghiệm thu runtime/audio/render/video hoặc toàn factory.
