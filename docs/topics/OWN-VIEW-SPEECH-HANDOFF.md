# Thoại riêng chính diện/nghiêng — source0.95

`forest-tribe-0.95-own-front-profile-speech`. Mục tiêu vẫn là câu chuyện/chủ đề → kịch bản, script/thoại nguyên văn theo vai hoặc WAV gốc → diễn viên trong câu chuyện → video có giọng, phụ đề, review/repair và QC. Source này nối thoại vào các rig front/profile mới. **Chưa có nghiệm thu hình ghép, audio, chuyển động, video hoặc toàn factory.**

## Code đã viết

- Lựa chọn `appearance.bodySpeech=registered-basic-mouth-v1` chỉ dùng Lila/Karo ở `front`, `left`, `right`. Sáu registration có file/SHA/canvas, clip, đường môi và strip da riêng. Không mượn ROI/tile/landmark của góc3/4, mirror mặt, suy yaw hoặc tạo miệng ở góc lưng. `silent` vẫn giữ ảnh nguyên bản; mặc định không âm thầm bật miệng.
- Miệng mở từ speech activity bằng envelope/clock hiện có. Lila trả smile nguồn khi im lặng; Karo dùng ứng viên contour khép thường trực để nghe bạn diễn. Chỉ lớp miệng thay đổi, đầu/mũi/mắt/tóc/râu/neck không bị warp. Miệng Karo khép là **xấp xỉ SVG và strip nguồn**, chưa phải tile neutral được duyệt.
- Mask miệng xóa đúng clip trên base source, cùng opacity với lớp replacement. Mask mắt gắn vào image và mask miệng bọc image; replacement nằm ngoài cả hai mask. Namespace theo từng diễn viên. Không sửa byte/alpha của ảnh. Rest Lila có opacity0; rest Karo opacity1 với aperture0. Răng/lưỡi nằm trong clip aperture, curved-teeth thickness0 khi amount0. Cần kiểm seam, alpha và răng thực tế khi render.
- Schema/raw accessor/workbench kiểm đúng selection/view/source. Cache profile và mouth fingerprint chứa selection/registration; `native-view-acting-clock-9` giữ original happy expression clock kể cả speech được chọn còn eyes chưa chọn. Actor cue ownership và source speech clock hiện có vẫn là nguồn thời gian. Không reset attack/release tại camera cut hoặc gán audio của vai khác.
- Workbench/API có mode mới, kết hợp được với `registered-basic-eyes-v1`. Preview dùng **segment-draft có nhãn**, không gọi model/TTS hoặc có voice thật. Speech theo activity không phải phoneme lip-sync.

Source chính: `packages/animation/body-view-basic-mouth-registration.ts`, `body-view-mouth.ts`, `body-view-basic-capabilities.ts`, `body-view-art.ts`, `view-acting-clock.ts`; `packages/actors/view-acting-clock.ts`; `packages/host/schemas.ts`; `packages/topics/body-workbench.ts`. Actor speech clock/compiler/envelope cũ được dùng chung. Legacy3/4 mouth/rest/eye registrations và own front/profile/rear body geometry giữ nguyên.

## Rủi ro còn phải kiểm

Bounds/clip/top/depth/lift/strip là authoring thủ công theo đúng PNG, không đo giải phẫu hoặc optical alignment. Raw ROI chỉ kiểm `RGB<50`, alpha>128. Ba strip đầu chứa nét đen đã thu hẹp; sáu strip cuối có0 dark pixel theo threshold nhưng đều chưa hoàn toàn đục. Mean alpha khoảng252.6–253.6 không chứng nhận chất lượng ghép. Skin strip nhỏ có thể lệch màu/texture/độ sáng, rìa mask có thể cắt môi/cằm, Karo có thể thành vùng da phẳng trong râu, aperture có thể bị clip hoặc miệng còn hằn.

Phải so PNG gốc với rest/speech/gap trên nền sáng và nền cảnh, cận mặt/toàn thân ở tốc độ thật. Kiểm môi/râu/mũi và mắt không trôi qua camera scale/seek, không hở viền hoặc double ink. Không gọi việc hash/ROI/typecheck đúng là duyệt tạo hình hoặc chuyển động.

Một review source qua combo `tester`/`gpt-6-luna` HTTP200 đã hoàn tất, không có tools/tests. Ba findings không áp dụng: replacement và erase opacity đã cùng biến trong `sampleBodyViewMouth`; basic secondary bị capability guard chặn nên không có đường kết hợp hợp lệ bị bỏ mask; curved teeth có độ dày0 và aperture clip khi amount0. Reviewer ghi thiếu context clock/namespace; không coi đây là PASS hoặc nghiệm thu. Snapshot/hash và disposition ghi trong source record; chưa có review hình/audio/video.

## Giao model test

Implementation chỉ chạy build/typecheck/schema definition và raw asset/source inventory. Tám callback mới `tests/native-basic-speech.test.ts` **DECLARED / NOT RUN**. Các fixture/sampler/compiler/schema instances trong callback chưa thực thi. Ca clock/cut hai diễn viên không thay canonical sit/hold/rise/walk hoặc nghiệm thu full factory.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-basic-speech.test.ts tests/native-basic-eyes.test.ts tests/fixed-view-speech.test.ts tests/native-rest-mouth.test.ts tests/source-speech-phase.test.ts tests/actor-gaze.test.ts tests/native-front-body.test.ts tests/native-oblique-body.test.ts
$env:STUDIO_PORT='8851'
$env:STUDIO_PROJECTS_ROOT='C:\Users\Duongvh-pc\.codex\tmp\story-factory-own-speech-test-projects'
$env:STORY_FACTORY_ENV_FILE='D:\github\Story-2-video-factory2.1\.env'
npm run studio
```

Windows, Node≥22.13.0, dependencies từ lockfile; source hiện kiểm bằng Node24.19.0. Mở `http://127.0.0.1:8851`, Ctrl+C terminal đó để dừng. Giữ checkout D/project/server8850. Nếu8851 đang dùng, chọn cổng trống và ghi trong report. Xem rig không cần gọi model/TTS; test toàn tuyến mới cần voice/backend thật. Key giữ trong file/env, không commit hoặc đưa vào report.

Đường dẫn cho model test mở (implementation chưa mở/chạy):

- `/api/topics/prehistoric-life/body?view=front&action=rest&timeMs=900&mood=happy&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&look=rest`
- `/api/topics/prehistoric-life/body?view=left&action=rest&timeMs=0&mood=happy&mouth=registered-basic-mouth-v1`
- `/api/topics/prehistoric-life/body?view=right&action=point&timeMs=2200&mood=happy&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&look=ahead`

Kiểm cả Lila/Karo × front/left/right, silence/gap/level0/positive activity, cả mouth-only và mouth+eyes. Kiểm default silent chặn voice, legacy selection trên basic và basic selection trên3/4/rear phải lỗi. Sai hash/canvas, false/null feature options và unsupported motion/turn/emotions/seat/props phải lỗi. Schema, raw accessor, API và compiler cùng boundary.

Với WAV thật hoặc TTS thật: chỉ cue do actor sở hữu mở khẩu hình, người nghe giữ miệng khép, voiceover không làm cả hai nói. Câu ngang camera cut giữ envelope và source clock; role swap/camera/random/reverse seek không reset phase. Audio/text/duration/hash không thay bởi đổi view/eyes. Ghi full SHA, command/exit/PASS/FAIL/NOT RUN, input/actor/view/time, ảnh và video lỗi.

## Phần còn thiếu của mục tiêu đầy đủ

Own per-view emotions/body/face/cloth/hair/locomotion/seat/manipulation và giải phẫu/grasp/contact cần triển khai và render review. Còn thiếu continuous head/body turn thực, run/jump/hunt/spear mượt, quần chúng nam trọc không râu và nữ có tóc ở đủ góc, bối cảnh day/sunset/night tươi/sâu/phản ứng, đạo diễn/camera và nhiều vai.

Toàn ba input bất kỳ (story/topic, exact script/dialogue, original WAV; legacy SRT), EN chính/VI/JA/KO/local-external HTTP/command TTS, narration/audio/subtitle/QC, cache/resume/locks/rebuild/review/repair và final MP4/SRT/thumbnail/storyboard/profile/timeline/manifest/reports vẫn phải kiểm toàn tuyến. Không thu hẹp thành video máy móc hoặc demo chỉ nói đứng yên.

Giữ `productionReady=false`, `productionRig=null`, `availableBanks=[]`, art/motion/production approvals=false, pre-model/TTS gate và `needs-source-prop-binding`. Không xuất final/DONE từ source chưa được duyệt. V1/source0.94 không nghiệm thu0.95. [Đặc tả đầy đủ](CUOC-SONG-THOI-TIEN-SU.md).

Source/raw/check records: `reviews/own-view-speech-static-record-v1.json`, `reviews/own-view-speech-source-record-v1.json`. Git/GitHub full SHA được xác nhận ngoài repo để tránh self-reference. Chưa có runtime/render/video acceptance.

## Kết quả source cuối

Build, test:typecheck, schema definition export, source asset inventory và raw static inventory đều exit0. 307 raster nguyên byte (144PNG/163JPEG,101JPEG tênPNG),18 head definitions và27 head metadata giữ nguyên. Legacy mouth/eye data và own fixed body geometry giữ nguyên. Sáu own mouth sources bind PNG/SHA/canvas; sáu strip có0 dark pixel nhưng alpha chưa hoàn toàn đục. Manifest163 mapped code hashes/46 scalar entries đối chiếu source cuối. Tám callback mới chưa chạy. Freeze/stage28 đường dẫn riêng,52 untracked khác giữ nguyên. Chưa có runtime/audio/render/video acceptance; full factory chưa hoàn thành.
