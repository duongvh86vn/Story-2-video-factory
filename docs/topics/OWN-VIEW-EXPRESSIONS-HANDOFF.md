# Biểu cảm riêng chính diện/nghiêng — source0.96

`forest-tribe-0.96-own-front-profile-expressions`. Source này nối phản ứng nét mặt vào Lila/Karo ở góc chính diện và hai góc nghiêng. Mục tiêu đầy đủ vẫn là story/topic → screenplay, script/dialogue nguyên văn hoặc WAV gốc → diễn viên trong câu chuyện → video có giọng, phụ đề, director/camera, review/repair và QC. **Chưa nghiệm thu tạo hình, audio, chuyển động, video hoặc toàn factory.**

## Code đã viết

- `appearance.bodyExpressions=registered-basic-expressions-v1` yêu cầu đúng `front/left/right`, `registered-basic-eyes-v1`, `registered-basic-mouth-v1` và own actor/source. Sáu bộ file/SHA/canvas có tám chân mày: hai ở chính diện, một nhìn thấy ở mỗi profile. Không dựng chân mày ẩn, suy yaw, mirror/warp mặt hoặc mượn ROI của góc3/4. Mặc định vẫn là ảnh native happy; chọn expressions mới mở mood khác.
- Lớp biểu cảm điều khiển chân mày nguồn, mí trên mắt nguồn và contour môi riêng của view theo 16 mood hiện có. Mood chuyển bằng expression clock gốc; camera slice/đổi primary–supporting không được khởi động lại phase. Chuyển động chân mày giới hạn Y−18..14 source-pixel, rotation−24..24°; eye closure tối đa0.8. Đây là điều khiển authoring, không chứng minh giải phẫu hoặc diễn xuất.
- Mask chân mày, mắt, miệng độc lập, chỉ xóa nét trên base source. Skin-strip repair và glyph replacement nằm ngoài các source mask. Khi expressions được chọn, source mouth erase luôn bật, mouth layer cũ tắt; contour khép vui/buồn/lo lắng… thay nguồn kể cả Lila đang nghe. Aperture mở theo activity thuộc cue của chính actor; im lặng vẫn khép. Không gọi đây là phoneme lip-sync hoặc đầy đủ diễn cười/ngạc nhiên.
- Mode expressions sở hữu chân mày thường trực, kể cả neutral pose; mode native mới giữ ảnh nguyên bản. Một review source qua combo9router `tester`/`gpt-6-luna` HTTP200 chỉ ra raw actor lookup: đã thêm guard chỉ nhận `lila/karo` trước khi index và declaration cho actor sai. Gợi ý bật/tắt brow replacement tại neutral không áp dụng vì trái contract thường trực. Reviewer chưa đủ context clock/namespace và chưa duyệt source cuối, hình hoặc runtime.
- Schema/raw accessor/workbench/API nhận mode mới và chặn dependency sai, rear, sourceColour, head-bank, supporting-model hoặc detailed motion chưa đăng ký. Compiler report ghi chính xác selection. Fingerprint/profile/manifest cùng contract mới; clock `native-view-acting-clock-10` làm cache cũ mất hiệu lực. Dữ liệu legacy3/4 và own fixed body geometry giữ nguyên.
- Thêm `tests/native-basic-expressions.test.ts`: tám callback **DECLARED / NOT RUN**, gồm source binding, boundary, mask/namespace, mood/bounds, seek thuần, speaker ownership, clock qua camera/role swap và report. Implementation không chạy callback/fixture/schema instance/geometry/compiler evaluator/renderer/browser/server/audio/video.

Code chính: `packages/animation/body-view-basic-expression-registration.ts`, `body-view-expressions.ts`, `body-view-art.ts`, `body-view-mouth.ts`, `body-view-basic-capabilities.ts`, `compiler.ts`, `view-acting-clock.ts`; `packages/host/schemas.ts`; `packages/topics/body-workbench.ts`; `scripts/prehistoric-pack.ts`. Actor expression/speech clocks hiện có được dùng chung.

## Rủi ro cần kiểm trên hình và video

Clip/bounds/center/strip là cue thủ công theo từng PNG, chưa được duyệt hoặc đo anatomy/optical alignment. Raw ROI chỉ đếm pixel theo threshold `RGB<50` và alpha>128; tám strip có0 dark pixel nhưng alpha chưa hoàn toàn đục. Hash/header/ROI đúng không chứng nhận skin repair đẹp.

Kiểm mask không cắt tóc/mũi/mắt, nét đen không bị sót hoặc nhân đôi, strip không tạo mảng da phẳng/hở alpha/lệch màu trong râu, chân mày không chạm tóc/mắt ở mood cực trị. Kiểm môi khép không thấy răng/lưỡi, aperture không bị clip và khuôn mặt không trôi khi camera scale/seek. So own PNG và ảnh reference gốc trên nền sáng và bối cảnh tươi màu, cận mặt/toàn thân, tốc độ thật. Góc mặt cố định và nét SVG chưa chứng minh nhân vật mượt.

## Môi trường và lệnh giao model test

Giữ checkout D và server8850. Chạy bản C riêng bằng Windows PowerShell, Node≥22.13.0, dependencies từ lockfile; source đã dùng Node24.19.0. Trước khi test ghi full SHA và cổng thực tế; không tự bật production flags hoặc sửa khóa đã duyệt.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-basic-expressions.test.ts tests/native-basic-speech.test.ts tests/native-basic-eyes.test.ts tests/native-expressions.test.ts
$env:STUDIO_HOST='127.0.0.1'
$env:STUDIO_PORT='8851'
npm run studio
```

Implementation chưa chạy các lệnh test/server này. Mở `http://127.0.0.1:8851`; Ctrl+C terminal đó để dừng. Nếu8851 bận, chọn cổng trống và ghi vào report. Xem rig không cần model/TTS. Test toàn tuyến mới dùng backend thật; key giữ trong file/env, không commit hoặc đưa vào report.

URL diagnostic để model test mở:

- `/api/topics/prehistoric-life/body?view=front&action=rest&timeMs=900&mood=sad&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&expressions=registered-basic-expressions-v1`
- `/api/topics/prehistoric-life/body?view=left&action=think&timeMs=1800&mood=concerned&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&expressions=registered-basic-expressions-v1`
- `/api/topics/prehistoric-life/body?view=right&action=point&timeMs=2200&mood=excited&look=ahead&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&expressions=registered-basic-expressions-v1`

Preview chỉ dùng `segment-draft` có nhãn. Kiểm Lila/Karo × front/left/right ×16mood, rest/point/think, times đầu/cuối/transitions/random/reverse. Missing dependencies, false/null/unknown options, rear hoặc selection khác view/source phải lỗi tại schema/raw/API/compiler. Kiểm old3/4 và default/native vẫn giữ behavior cũ.

Với WAV/TTS thật, tách cue theo từng vai. Người nghe phản ứng nhưng aperture khép; voiceover không làm cả hai nói. Giữ original emotion/activity clock qua camera cut và role swap, không reset attack/release. Sửa mood/view phải đổi visual/cache/review binding mà giữ nguyên narration/audio/text/clock. Ghi SHA, command/exit/PASS/FAIL/NOT RUN, actor/view/mood/time, ảnh/video lỗi và phạm vi; không dùng testV1/source0.95 để nghiệm thu0.96.

## Công việc đầy đủ còn chờ

Own face/head views, continuous head/body turns, per-view soft limbs/locomotion/seat/cloth/hair/tools/grasp/contact, run/jump/hunt/spear và supporting cast đủ góc vẫn cần hoàn thiện và review. Nam phụ trọc/không râu, nữ có tóc và costume đúng hai vai chính; bối cảnh day/sunset/night tươi/sâu; hai diễn viên nhìn bạn diễn và phản ứng, director/camera kể chuyện đa dạng.

Toàn story/topic bất kỳ, exact script/dialogue, WAV gốc (+legacy SRT), EN chính/VI/JA/KO/local-external HTTP/command TTS, narration/subtitle/duration/QC, cache/resume/approved locks/rebuild shot/review/repair và final MP4/SRT/thumbnail/storyboard/profile/timeline/manifest/reports phải kiểm toàn tuyến. Một demo đứng nói không hoàn thành factory.

Giữ `productionReady=false`, `productionRig=null`, `availableBanks=[]`, art/motion/production approvals=false, pre-model/TTS gate và `needs-source-prop-binding`. Không xuất final/DONE từ source chưa duyệt. [Đặc tả đầy đủ](CUOC-SONG-THOI-TIEN-SU.md).

Raw/source records: `reviews/own-view-expressions-static-record-v1.json`, `reviews/own-view-expressions-source-record-v1.json`. Git/GitHub full SHA xác nhận ngoài repo để tránh self-reference. Chỉ source check được phép trong lượt triển khai này.

## Kết quả source cuối

Build, test:typecheck, schema definition export, source asset inventory và raw static inventory exit0. 307 raster nguyên byte (144PNG/163JPEG,101JPEG tênPNG),18 head definitions và27 head metadata giữ nguyên. Legacy brow/mouth/eye data, own body geometry, actor clock và mouth shape/envelope/sample giữ nguyên. Sáu own expression sources bind PNG/SHA/canvas; tám brow strip có0 dark pixel nhưng alpha chưa hoàn toàn đục. Manifest166 mapped code hashes/46 scalar entries đối chiếu source cuối. Tám callback mới chưa chạy. Freeze/stage29 đường dẫn riêng,52 untracked khác giữ nguyên. Chưa nghiệm thu runtime/audio/render/video hoặc toàn factory.
