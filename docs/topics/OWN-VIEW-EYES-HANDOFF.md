# Mắt riêng chính diện/nghiêng — source0.94

`forest-tribe-0.94-own-front-profile-eyes`. Tool vẫn phải nhận câu chuyện/chủ đề → kịch bản, script/thoại theo vai hoặc WAV gốc → diễn viên trong câu chuyện → video có giọng, phụ đề và QC. Source này thêm ánh nhìn cho các rig mới; **chưa chứng minh tạo hình đẹp, diễn xuất mượt, chuyển đầu/thân liên tục hoặc toàn tool đã dùng được**.

## Phần đã viết

- Lựa chọn riêng `appearance.bodyEyes=registered-basic-eyes-v1`, chỉ cho Lila/Karo ở `front`, `left`, `right`. Sáu registration có file/SHA/canvas, vùng mắt và vùng da riêng. Chính diện có hai mắt; profile chỉ có đúng một mắt nhìn thấy. Không mirror, mượn tọa độ/texture của góc3/4, suy yaw hoặc tạo mắt ở góc lưng. Mặc định `native` giữ nguyên ảnh nguồn.
- Cùng painter, chớp mắt và kiểm sai số nội suy hiện có, với slot màn hình tường minh. Vùng mắt có glyph lấy từ chính PNG, vùng da cạnh mắt và nét mi khép do tác giả đặt. Vì strip nguồn có alpha chưa hoàn toàn đục, mask mới xóa đúng vùng mắt trên base head theo cùng opacity của replacement; tránh chỉ chồng strip lên nét mắt đen cũ. Rest giữ mask/replacement opacity0; chỉ own basic eyes có mask này, legacy3/4 giữ painter cũ. Chỉ glyph nhỏ dịch/khép; đầu, mũi, tóc, lông mày, áo và cổ không bị kéo theo. Đây là ứng viên ghép hình, không bảo đảm seam/texture hoặc nhận dạng đã đạt.
- Điểm neo mắt vật lý là trung bình của các mắt **thực sự nhìn thấy**, trước khi dịch pupil/chớp. Profile không đọc mắt thứ hai hoặc lấy midpoint của góc khác. `front` nhận target cả hai bên; target rõ phía sau profile bị chặn và vẫn cần head turn riêng. Đây là hướng dịch glyph giới hạn, không phải bằng chứng ánh nhìn quang học.
- Actor gaze target nhận own basic eyes mà không buộc mượn expression overlay3/4. Actor clock giữ happy pose trong original run để dựng điểm neo và hướng nhìn xuyên camera/role swap. `native-view-acting-clock-8` và `native-actor-gaze-source-4` làm rõ thay đổi contract/cache. Người dùng vẫn phải test camera/cut/seek thật.
- Schema, raw profile accessor, direct eye accessor và workbench kiểm đúng selection/view. Các capability speech/emotions/locomotion/seat/secondary/manipulation/tools/quần chúng/head bank/continuous turn của basic rig vẫn chưa mở. Production gate giữ nguyên.

Source chính: `packages/animation/body-view-basic-eyes-registration.ts`, `body-view-eyes.ts`, `body-view-basic-capabilities.ts`, `compiler.ts`, `view-gaze-target.ts`, `view-acting-clock.ts`; `packages/actors/view-acting-clock.ts`; `packages/host/schemas.ts`; `packages/topics/body-workbench.ts`. Manifest ghi own registration và code hashes. Bốn legacy3/4 eye registrations, nguồn body/head/mouth và dữ liệu rig0.93 giữ nguyên.

## Phần chưa chắc của tạo hình

Vùng ink được đọc thô trong ROI do tác giả chọn (`RGB<50`, alpha>128). Đây chỉ là pixel inventory, không đo giải phẫu, yaw, optical gaze hoặc quyền sở hữu layer. Bounds/ellipse/skin-strip/lid/shift vẫn là xấp xỉ authoring. Có thể còn cắt nét mắt, kéo màu da, ghost/double ink hoặc seam dưới subpixel/camera scale. Cả tám strip mới đều có pixel chưa hoàn toàn đục theo raw inventory; Karo front cũng chưa có pixel alpha255. Mask xóa nguồn không chứng nhận replacement đã kín/đúng màu hoặc không còn seam; không tự sửa alpha hoặc đổi màu để che vấn đề.

Vùng da nhỏ lấy ngay trên cùng ảnh có thể chứa texture/độ sáng khác với vị trí mắt. Phải so PNG gốc, rig cận mặt/toàn thân và video tốc độ thật trên nền sáng lẫn nền cảnh. Không dùng số lượng pixel, hash hoặc source review để tự duyệt hình. Biểu cảm happy và miệng Karo trong nguồn vẫn cố định; **không gọi mắt chớp là thoại/lip-sync**, không gửi TTS rồi xuất final từ rig thiếu speech.

Combo `tester` trả HTTP200/model `gpt-6-luna` cho review snapshot source. Một nhận xét cho rằng `characterVariant` nằm ngoài `appearance` trái với schema hiện có; không áp dụng. Nhận xét về selection predicate được làm rõ bằng comment và test boundary; không coi predicate là authorization. Parent tìm và nối thêm expression clock cho basic rigs sau snapshot. Reviewer không thấy toàn source cuối và không nghiệm thu runtime/art. [Authoring và giới hạn](reviews/own-view-eyes-authoring-v1.json), [review/disposition](reviews/own-view-eyes-agent-advice-v1.json).

## Giao model test

Implementation chỉ kiểm build/typecheck/schema definition và raw source inventory. Tám callback ở `tests/native-basic-eyes.test.ts` **DECLARED / NOT RUN**. Hai test helper legacy chỉ thêm kiểm tra mắt thứ hai tồn tại để giữ fixture3/4; không thay kỳ vọng hoặc chạy callback. Ca hai diễn viên mới là unit fixture kiểm clock; không thay canonical sit/hold/rise/walk, video mẫu hoặc nghiệm thu toàn factory.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-basic-eyes.test.ts tests/native-view-eyes.test.ts tests/actor-gaze.test.ts tests/native-front-body.test.ts tests/native-oblique-body.test.ts tests/partner-facing-views.test.ts tests/native-head-bank.test.ts tests/native-seat.test.ts tests/native-secondary.test.ts
$env:STUDIO_PORT='8851'
$env:STUDIO_PROJECTS_ROOT='C:\Users\Duongvh-pc\.codex\tmp\story-factory-own-eyes-test-projects'
$env:STORY_FACTORY_ENV_FILE='D:\github\Story-2-video-factory2.1\.env'
npm run studio
```

Windows, Node≥22.13.0 và npm dependencies từ lockfile; môi trường source hiện dùng Node24.19.0. Mở `http://127.0.0.1:8851`, Ctrl+C ở terminal đó để dừng. Giữ checkout D, project8850 và server8850. Xem rig không cần model/TTS; key giữ trong môi trường/file cấu hình, không commit. Nếu port8851 đã có tiến trình khác, chọn cổng trống và ghi lại trong report.

Ví dụ đường dẫn để model test mở, không phải render đã được implementation chạy:

- `/api/topics/prehistoric-life/body?view=front&action=rest&eyes=registered-basic-eyes-v1&look=ahead&timeMs=2770&mood=happy`
- `/api/topics/prehistoric-life/body?view=left&action=rest&eyes=registered-basic-eyes-v1&look=up&timeMs=1771&mood=happy`
- `/api/topics/prehistoric-life/body?view=right&action=rest&eyes=registered-basic-eyes-v1&look=down&timeMs=2180&mood=happy`

Kiểm cả Lila/Karo, front/left/right, một/hai mắt, mắt nghỉ/chớp/nhìn trên/dưới/ngang, target hợp lệ và target sau gáy phải lỗi. So eye origin với head transform thật; không dùng root/chest hoặc pupil đã dịch làm target của bạn diễn. Kiểm source clock qua cut/role swap/random/reverse seek; identity/source hashes, mi/nose/hair seam và không tạo mắt ẩn. Negative cases: eyes selection khác view, giả SHA/canvas, false/null options, rear eyes, speech/motion/emotion/turn chưa đăng ký, gaze target thiếu actor/clock. Ghi full SHA, command/exit/PASS/FAIL/NOT RUN, actor/view/action/time và ảnh/video lỗi.

## Mục tiêu còn phải hoàn thiện

Own per-view speech/emotions/acting/locomotion/seat/cloth/hair/manipulation và giải phẫu/masks/identity theo render thật; continuous head/body turn không face warp/đổi ảnh từng nấc; run/jump/hunt/spear/grasp/contact, quần chúng nam trọc không râu và nữ có tóc. Bối cảnh day/sunset/night tươi, sâu, có phản ứng; đạo diễn/camera và nhiều vai. Toàn ba input bất kỳ, WAV/legacy SRT, EN chính/VI/JA/KO, local/external HTTP/command TTS, narration/audio/subtitle/QC, cache/resume/locks/rebuild/review/repair và final outputs vẫn cần kiểm toàn tuyến.

Giữ `productionReady=false`, `productionRig=null`, `availableBanks=[]`, art/motion/production approvals=false, pre-model/TTS gate và `needs-source-prop-binding`. Không final/DONE từ source này. V1 và source0.93 không nghiệm thu0.94. [Đặc tả đầy đủ](CUOC-SONG-THOI-TIEN-SU.md).

## Hồ sơ source

`reviews/own-view-eyes-source-record-v1.json` và `reviews/own-view-eyes-static-record-v1.json` ghi kiểm source cuối. Git/GitHub full SHA xác nhận ngoài repo để tránh tự tham chiếu. Chưa có runtime/render/video acceptance cho0.94.

### Kết quả kiểm source đã ghi

Build, test:typecheck, schema definition export, source asset inventory và raw static inventory exit0. 307 raster giữ nguyên byte (144 PNG/163 JPEG;101 JPEG tên PNG),18 head definitions và27 head metadata giữ nguyên. Sáu eye sources/8 glyphs bind đúng PNG/SHA/canvas; toàn bộ8 strip có pixel chưa hoàn toàn đục,0 dark pixel theo threshold trong ROI chọn. Source-eye erasure là ứng viên sửa alpha ghost, chưa render/duyệt. Legacy3/4 eye data và dữ liệu front/profile/rear rig0.93 giữ nguyên. Manifest có161 mapped source hashes/46 scalar code entries đã đối chiếu. Tám callback mới DECLARED/NOT RUN; hai helper test legacy chỉ thêm second-eye assertion. 35 đường dẫn freeze/stage riêng,52 untracked khác giữ nguyên. Git/GitHub full SHA ghi ngoài repo. Chưa có render/test/video hoặc nghiệm thu độ mượt0.94.
