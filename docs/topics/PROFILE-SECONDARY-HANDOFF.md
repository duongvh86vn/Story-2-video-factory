# Tóc/râu của góc nghiêng riêng — source0.98

`forest-tribe-0.98-own-profile-secondary`. Phần code giúp tóc và phần râu dưới có độ trễ theo đầu/thân của chính Lila/Karo ở left/right. **Chưa nghiệm thu hình, chuyển động, audio, video hoặc toàn factory.** Story/topic bất kỳ → screenplay, exact script/dialogue hoặc original WAV → diễn viên trong câu chuyện → world/actions/director/camera → review/repair/final/QC vẫn là mục tiêu đầy đủ.

## Phần triển khai

- Chọn tường minh `appearance.bodySecondary=registered-profile-secondary-v1`. Bốn binding PNG/SHA/canvas độc lập, tám vùng: crest/tail của Lila và crest/beard của Karo. Không lấy ROI, landmark, artwork hoặc yaw của góc khác. Tọa độ vùng/tie chỉ là authoring cues thủ công, chưa phải segmentation/anatomy được duyệt. Front/rear/detailed3/4 không dùng mode này; legacy `registered-secondary-v1` vẫn dùng source3/4 cũ.
- `registeredSecondaryBodyView` chọn own source cho SVG, validation, sampling, interpolation và camera bounds. Shared secondary kernel giữ nguyên:24 pieces/actor, attachment row và hai side seams pinned, gain/displacement bound, minimum positive area0.4. Causal history đi theo đầu gắn ở cổ/torso của rig nguồn; không thêm pose tilt hoặc motion giả để kích tóc.
- Static và moving source cùng dùng mask eyes/mouth/brows của own profile. Nét thay thế nằm ngoài source mesh; không dựng lại khuôn mặt hoặc để nét gốc hiện dưới overlay. Mode secondary-only giữ original happy expression clock; combined face/body/secondary giữ phase khi camera cut hoặc đổi primary/supporting. Clock12 làm rõ cache contract. Secondary không tự cấp quyền sourceBody/seat/tools/head turns; sourceBody chỉ dùng own locomotion đã chọn và source guards có sẵn.
- Schema, API mode list, workbench, exact report selection, actor clock, manifest/code hashes đều có selection mới. Source ảnh nguyên byte; own fixed body geometry, legacy cloth/face/secondary data, shared cloth/body/secondary temporal kernels giữ nguyên. Không bật bank hoặc duyệt production.
- Tám callback mới tại `tests/native-profile-secondary.test.ts` **DECLARED / NOT RUN**. Không chạy fixture/schema instances/geometry/sampler/compiler/camera evaluator/browser/server/TTS/ASR/render/MP4 trong implementation.

Code nằm ở `packages/animation/body-view-profile-secondary-binding.ts`, `body-view-secondary.ts`, `body-view-art.ts`, `body-view-basic-capabilities.ts`, `compiler.ts`, `view-acting-clock.ts`; `packages/actors/view-acting-clock.ts`; `packages/director/camera.ts`; `packages/host/schemas.ts`; `packages/topics/body-workbench.ts`; `scripts/prehistoric-pack.ts`.

## Môi trường và lệnh giao model test

Windows, Node≥22.13.0, dependencies từ lockfile. D checkout/server8850 được giữ nguyên; test ở C worktree/cổng riêng. Ghi full SHA, input, flags, commands, stderr và artifacts. Không đưa key vào report hoặc Git.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-profile-secondary.test.ts tests/native-secondary.test.ts tests/native-profile-locomotion.test.ts tests/native-basic-expressions.test.ts tests/native-basic-speech.test.ts tests/native-basic-eyes.test.ts
$env:STUDIO_HOST='127.0.0.1'
$env:STUDIO_PORT='8851'
npm run studio
```

Mở `http://127.0.0.1:8851`; Ctrl+C terminal đó để dừng. Nếu8851 bận, chọn cổng trống và ghi report. Workbench là pose diagnostic/segment-draft, chưa có giọng thật. Các URL sau dành cho model test, implementation chưa mở:

- `/api/topics/prehistoric-life/body?view=left&action=walk-left&timeMs=900&mood=happy&motion=registered-profile-locomotion-v1&secondary=registered-profile-secondary-v1&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&expressions=registered-basic-expressions-v1`
- `/api/topics/prehistoric-life/body?view=right&action=run&timeMs=1200&mood=happy&motion=registered-profile-locomotion-v1&secondary=registered-profile-secondary-v1&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&expressions=registered-basic-expressions-v1`
- `/api/topics/prehistoric-life/body?view=right&action=jump&timeMs=1100&mood=surprised&motion=registered-profile-locomotion-v1&secondary=registered-profile-secondary-v1&mouth=registered-basic-mouth-v1&eyes=registered-basic-eyes-v1&expressions=registered-basic-expressions-v1`
- `/api/topics/prehistoric-life/body?view=left&action=think&timeMs=1771&mood=happy&secondary=registered-profile-secondary-v1`

## Nghiệm thu còn thiếu

Kiểm4own profiles × rest/point/think/walk/run/jump/crouch; rigid, secondary-only và combined. Vùng/tie/neck/eyes/mouth/brows/nose phải giữ identity, không kéo da hoặc râu môi vào mesh. So PNG nguồn với cận mặt và toàn thân; tránh hở raster, đường tam giác, đứt viền, lộ mắt/miệng gốc hoặc mất tóc. Pinned side seams có thể làm biến dạng không đẹp dù area dương; raw bounds/hash/typecheck không chứng minh silhouette.

Kiểm actual60fps ở tốc độ thật, cuối/đầu camera cut giữa bước/bay/đổi vai, random/reverse seek, frame0 và settle cuối run. Camera phải giữ tip tóc/râu, target và vùng subtitle; không crop hoặc phóng quá mức. Causal history không reset tại đầu shot. Theo cùng clock gốc thì body/contact/sole/face state phải bằng rigid khi bỏ các secondary transforms. Người nghe không mở miệng theo bạn diễn.

Sai actor/view/mode/hash/canvas, sourceBody thiếu/đổi/đụng local tracks, head-bank/supporting/seat/tools/turns chưa đăng ký phải lỗi rõ; legacy3/4 và default không bị mở quyền. Ghi PASS/FAIL/NOT RUN cùng SHA và video/screenshot/stderr. V1/source0.97 không nghiệm thu0.98. Combo `tester` đã ping HTTP200→`gpt-6-luna`, `TESTER_OK`; đây chỉ là connectivity, không phải kết quả test.

## Mục tiêu đầy đủ còn mở

Own front/rear locomotion/seat/secondary/tool/grasp/contact, genuine continuous head/body turns, anatomy mềm hợp lý, foot/seat/hand contact và hướng nhìn bạn diễn còn cần làm/review. Supporting nam trọc/không tóc/không râu, nữ có tóc/costume cùng vai chính; vivid layered day/sunset/night và reusable director/camera phải kể được nhiều câu chuyện, không chỉ demo máy móc.

Toàn story/topic → faithful screenplay, exact script/dialogue theo vai, original WAV (+legacySRT), EN chính/VI/JA/KO/local-external HTTP/command TTS, narration/audio/subtitle/QC, cache/resume/approved locks/rebuild/review/repair và final MP4/SRT/thumbnail/storyboard/profile/timeline/manifest/reports vẫn cần nghiệm thu toàn tuyến. Tất cả art/motion/production approvals=false, productionReady=false, productionRig=null, availableBanks=[]; pre-model/TTS và needs-source-prop-binding giữ nguyên. Không báo DONE từ source checks.

## Kết quả source cuối

Build, test:typecheck, schema definition export, source asset inventory và raw static inventory exit0. 307 raster nguyên byte (144PNG/163JPEG,101JPEG tênPNG),18 head definitions và27 head metadata giữ nguyên. Legacy cloth/face/secondary data, own fixed body geometry và shared physical body/secondary mesh/temporal kernels giữ nguyên. Bốn own secondary sources/tám vùng bind PNG/SHA/canvas riêng, tránh raw ROI mắt/miệng/chân mày/cổ/tie; vùng tách và seam chưa được duyệt. Manifest172 mapped code hashes/46 scalar entries đối chiếu source cuối. Tám callback mới chưa chạy. Freeze/stage29 đường dẫn riêng,52 untracked khác giữ nguyên. Combo tester ping HTTP200→gpt-6-luna/TESTER_OK, không chạy test. Chưa nghiệm thu runtime/audio/render/video hoặc toàn factory.
