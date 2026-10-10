# Đi/chạy/nhảy/cúi theo góc nghiêng riêng — source0.97

`forest-tribe-0.97-own-profile-locomotion`. Lila và Karo ở `left/right` đã có đường code đi/chạy/nhảy/cúi cùng mắt, thoại và biểu cảm own source. **Chưa nghiệm thu tạo hình, khớp, chuyển động, audio, video hoặc toàn factory.** Mục tiêu vẫn là bất kỳ story/topic → screenplay, exact script/dialogue hoặc original WAV → các diễn viên trong câu chuyện → world/actions/director/camera → review/repair/final/QC.

## Phần code mới

- `appearance.bodyMotion=registered-profile-locomotion-v1` là lựa chọn tường minh cho bốn source: Lila/Karo ×left/right. Mỗi cage vạt áo bind đúng file/SHA/canvas, left/right/waist/bottom/split riêng từ PNG. Không mượn cage của góc3/4 hoặc mirror costume/mặt. Same-person canonical bone/mitten/sole và own shoulder/hip/rest-arm registrations được giữ.
- `registeredLocomotionBodyView` chọn đúng own source cho cloth SVG, validation, sampling và baked interpolation. Các consumer seat/secondary/manipulation vẫn dùng detailed3/4 guard riêng; không tự cấp các capability này. Cloth chung có upper material nguyên bản,12mesh pieces, belt row pinned, follow90ms/0.7gain/18°bound và positive-area governor. Source PNG không sửa byte/alpha. Authoring cage chưa chứng minh viền áo hoặc quần đẹp.
- Đi/chạy phải theo đúng hướng view: `walk-left/run-left` cho left, `walk/run` cho right. Nhảy/cúi tại chỗ và point/think dùng body/arm kernel hiện có. Default rigid vẫn chặn motion. Front/rear, backward/opposite gait, seat, tool/grasp/manipulation, hair/beard follow, supporting/head-bank và continuous turns không được mode này cấp phép.
- `sourceBody` của own motion giữ toàn bộ original walk/run/jump/posture qua camera cut và đổi primary/supporting. Source point/think span chỉ dùng contract đã kiểm riêng; source head/spear/manipulation/prop ownership vẫn chặn. Missing/sibling revision/local conflicts phải lỗi. Cloth lag clamp tại đầu original run, không tại đầu mỗi shot. Motion-only actor cũng giữ original happy expression clock.
- Schema/raw/API/workbench/report/cache/manifest nhận selection mới. Clock `native-view-acting-clock-11`; report ghi exact mode. Legacy3/4 registration/cloth/kernel, own fixed geometry, source gait/airborne/arm algorithms giữ nguyên. Tám test callbacks mới `tests/native-profile-locomotion.test.ts` **DECLARED / NOT RUN**.

Code: `packages/animation/body-view-profile-cloth-binding.ts`, `body-view-cloth.ts`, `body-view-art.ts`, `body-view-basic-capabilities.ts`, `compiler.ts`, `view-acting-clock.ts`; `packages/actors/view-acting-clock.ts`; `packages/host/schemas.ts`; `packages/topics/body-workbench.ts`; `scripts/prehistoric-pack.ts`.

Một request review source-only gửi combo9router `debugger` với effort `xhigh` đã client-timeout90s, chưa nhận reply/model/usage. Local process terminal; provider work không biết, không có job handle và không retry. Đây không phải review PASS hoặc bằng chứng reviewer đã dừng. Parent vẫn tự triển khai và kiểm source trong phạm vi được phép.

## Những gì phải kiểm thực tế

Cage/hip/shoulder/depth/rest-arm là manual/model-assisted source cues, không đo anatomy/yaw. Quần Karo phải còn đủ hai vạt/ống và viền đen; váy Lila có một silhouette liền. Kiểm pinned belt không nứt, không hở đường raster giữa12pieces, không mất viền khi vạt xoay, không kéo tóc/tay/da vào garment hoặc che sai lớp. Raw hashes/ROI/typecheck không duyệt artwork.

Kiểm walk/run contact trước khi dịch thân, chiều khuỷu/gối đúng, chân không dài/ngắn/trượt/cắt nền, hai tay không đảo hoặc gấp sai, bone lengths giữ nguyên và soft ink liền. Nhảy có chuẩn bị/đạp đất/bay/tiếp đất/settle; cúi có chuyển trọng tâm. Không chấp nhận clamp/teleport để che khớp không với tới. So source/reference gốc với full-size/cận mặt/toàn thân và real60fps ở tốc độ thật.

Kiểm hai vai đi/nghe/nói/phản ứng cùng clock gốc, random/reverse seek, camera cut giữa bước/bay, primary–supporting swap và đổi camera scale. Gesture target có nguồn; người nghe không mở miệng theo audio của bạn diễn. Những ca này chưa được implementation chạy.

## Server và test dành cho model của người dùng

Giữ D checkout/server8850. Windows, Node≥22.13.0 (source dùng24.19.0), dependencies từ lockfile; ghi full SHA/cổng/commands/artifacts. Implementation không chạy runtime, fixture hoặc render.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-profile-locomotion.test.ts tests/native-locomotion.test.ts tests/native-basic-expressions.test.ts tests/native-basic-speech.test.ts tests/native-basic-eyes.test.ts
$env:STUDIO_HOST='127.0.0.1'
$env:STUDIO_PORT='8851'
npm run studio
```

Mở `http://127.0.0.1:8851`, Ctrl+C terminal đó để dừng. Nếu8851 bận, chọn cổng trống và ghi report. Không copy/commit API key. Workbench không cần model/TTS; preview chỉ `segment-draft` có nhãn.

- `/api/topics/prehistoric-life/body?view=left&action=walk-left&timeMs=900&mood=happy&motion=registered-profile-locomotion-v1&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&expressions=registered-basic-expressions-v1`
- `/api/topics/prehistoric-life/body?view=right&action=run&timeMs=1200&mood=happy&motion=registered-profile-locomotion-v1&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&expressions=registered-basic-expressions-v1`
- `/api/topics/prehistoric-life/body?view=right&action=jump&timeMs=1100&mood=excited&motion=registered-profile-locomotion-v1&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&expressions=registered-basic-expressions-v1`

Kiểm4own profiles ×walk/run/jump/crouch, rest/point/think, face-only/motion-only/combined. Boundary sai view/mode/hash/canvas/actor và unregistered features phải lỗi; legacy3/4/default/basic behavior không đổi. Giữ original source clock trong ca hai diễn viên có camera cut thật; callback hoặc ảnh đứng không chứng minh phim mượt. Ghi PASS/FAIL/NOT RUN, SHA/input/view/action/time, screenshot/video và stderr. V1/source0.96 không nghiệm thu0.97.

## Mục tiêu đầy đủ còn mở

Front/rear motion, own seat/cloth/hair/tools/grasp/handoff/contact, run/jump/hunt/spear diễn đúng và genuine continuous head/body turns còn cần triển khai/review. Supporting nam trọc/không tóc/không râu, nữ có tóc và costume đúng vai chính; vivid layered day/sunset/night; director/camera và world reactions phải kể được nhiều câu chuyện.

Toàn story/topic bất kỳ, exact script/dialogue theo vai, original WAV (+legacy SRT), EN chính/VI/JA/KO/local-external HTTP/command TTS, narration/audio/subtitle/QC, cache/resume/approved locks/rebuild/review/repair và final MP4/SRT/thumbnail/storyboard/profile/timeline/manifest/reports vẫn cần nghiệm thu toàn tuyến. Một demo người que đi không hoàn thành factory.

Giữ mọi art/motion/production approvals=false, `productionReady=false`, `productionRig=null`, `availableBanks=[]`, pre-model/TTS gate và `needs-source-prop-binding`. Không final/DONE từ source chưa được duyệt. [Đặc tả đầy đủ](CUOC-SONG-THOI-TIEN-SU.md).

Records: `reviews/profile-locomotion-static-record-v1.json`, `reviews/profile-locomotion-source-record-v1.json`. Git/GitHub SHA xác nhận ngoài repo; source checks không phải runtime/film acceptance.

## Kết quả source cuối

Build, test:typecheck, schema definition export, source asset inventory và raw static inventory exit0. 307 raster nguyên byte (144PNG/163JPEG,101JPEG tênPNG),18 head definitions và27 head metadata giữ nguyên. Legacy cloth/face data, own fixed body geometry, source gait/airborne/arm/voice kernels và shared cloth/physical body source giữ nguyên. Bốn own profile cloth sources bind PNG/SHA/canvas/cage riêng; coordinates và seams vẫn chưa được duyệt. Manifest170 mapped code hashes/46 scalar entries đối chiếu source cuối. Tám callback mới chưa chạy. Freeze/stage28 đường dẫn riêng,52 untracked khác giữ nguyên. Chưa nghiệm thu runtime/audio/render/video hoặc toàn factory.
