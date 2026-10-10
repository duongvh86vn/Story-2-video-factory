# Đi/chạy/nhảy/cúi của góc lưng riêng — source0.99

`forest-tribe-0.99-own-rear-locomotion`. Code nối bốn góc lưng Lila/Karo để đi/chạy/nhảy/cúi bằng chính artwork và vạt áo của từng góc. **Chưa nghiệm thu tạo hình, anatomy, chuyển động, audio, video hoặc toàn factory.** Mục tiêu đầy đủ: story/topic bất kỳ → faithful screenplay; exact script/dialogue hoặc original WAV (+legacySRT) → diễn viên trong câu chuyện → world/actions/director/camera → review/repair/final/QC. EN chính, VI/JA/KO và external/local HTTP/command TTS cùng cache/resume/locks/rebuild vẫn thuộc mục tiêu.

## Phần code đã nối

- Chọn `appearance.bodyMotion=registered-rear-locomotion-v1` chỉ cho `back-left/back-right` của đúng Lila/Karo. Bốn binding PNG/SHA/canvas/cage độc lập; tọa độ belt/hem/split lấy từ chính ảnh và raw source cues, chưa là anatomy/fabric được đo hoặc duyệt. Không mượn profile/detailed3/4 garment, mặt, ROI, head landmarks hoặc mirror/warp; không coi tên góc là measured yaw.
- `registeredLocomotionBodyView` chọn own source cho garment SVG, validation, physical sampling, lag90ms và baked interpolation. Shared native garment/body/walk/run/airborne/arm kernels, same-person canonical bone/mitten/sole và own fixed source geometry giữ nguyên. Upper garment và belt row giữ nguồn;12 mesh pieces cho lower cage, positive area governor0.25 chưa chứng minh quần/váy đẹp hoặc không xuyên lớp.
- Hướng di chuyển theo góc: `walk-left/run-left` ở back-left; `walk/run` ở back-right; jump/crouch tại chỗ. Opposite/backward gait bị chặn. Head/tóc rigid theo đúng góc nguồn. Không bật eyes/mouth/emotion/secondary, chin-contact think, seat, prop/tool/manipulation/head-bank/mẫu `supportingModel` hoặc continuous turns. Đổi vai primary/supporting trong cảnh vẫn dùng đúng Lila/Karo và original body clock; không đồng nghĩa chọn mẫu diễn viên phụ.
- Complete `sourceBody` giữ original walk/run/jump/posture clock qua explicit continuous camera cut và primary/supporting swap cùng identity/view/root/stage/scale. Local physical tracks trống khi source owns; thay source/sibling hoặc thiếu clock phải mất binding. Rear giữ original happy expression clock, không sinh khuôn mặt ẩn. Source gesture spans vẫn cần own face/head capability riêng nên rear không được cấp quyền đó.
- Clock13/schema/API/workbench/exact report/cache/manifest/acting brief cho director và camera cập nhật. Backend sản xuất vẫn có pre-model/TTS và needs-source-prop-binding gates; all approvals=false, productionReady=false, productionRig=null, availableBanks=[].
- Tám callback `tests/native-rear-locomotion.test.ts` **DECLARED / NOT RUN**. Implementation chỉ build/typecheck/schema definition/raw inventory; không chạy fixture/schema instances/geometry/samplers/compiler/camera evaluator/browser/server/TTS/ASR/render/media.

Code: `packages/animation/body-view-rear-cloth-binding.ts`, `body-view-cloth.ts`, `body-view-art.ts`, `body-view-basic-capabilities.ts`, `compiler.ts`, `view-acting-clock.ts`; `packages/actors/view-acting-clock.ts`; `packages/director/acting-brief.ts`; `packages/host/schemas.ts`; `packages/topics/body-workbench.ts`; `scripts/prehistoric-pack.ts`.

## Môi trường và lệnh giao model test

Windows, Node≥22.13.0, dependencies từ lockfile. Giữ nguyên D checkout/server8850, dùng C worktree và cổng riêng. Ghi exact full SHA/input/options/commands/stderr/artifacts; không đưa API key vào report hoặc Git.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-rear-locomotion.test.ts tests/native-profile-secondary.test.ts tests/native-secondary.test.ts tests/native-profile-locomotion.test.ts tests/native-oblique-body.test.ts tests/native-locomotion.test.ts
$env:STUDIO_HOST='127.0.0.1'
$env:STUDIO_PORT='8851'
npm run studio
```

Mở `http://127.0.0.1:8851`; Ctrl+C đúng terminal đó để dừng. Nếu8851 bận, chọn cổng trống và ghi report. Implementation chưa mở các URL sau:

- `/api/topics/prehistoric-life/body?view=back-left&action=walk-left&timeMs=900&mood=happy&motion=registered-rear-locomotion-v1`
- `/api/topics/prehistoric-life/body?view=back-right&action=run&timeMs=1200&mood=happy&motion=registered-rear-locomotion-v1`
- `/api/topics/prehistoric-life/body?view=back-right&action=jump&timeMs=1100&mood=happy&motion=registered-rear-locomotion-v1`

Workbench là diagnostic pose, chưa có giọng thật, chưa phải phim hoàn chỉnh hoặc bằng chứng đã chạy.

## Nghiệm thu còn thiếu

Kiểm4rear sources × rest/point/walk/run/jump/crouch, rigid và selected. Giữ source face/hair/neck/costume/nét/màu, Lila một váy liền và Karo hai vạt/ống có viền. Không chấp nhận clamp/teleport/đổi bone length để che reach, hoặc mất outline/đường lưới/nứt pinned belt. Source pelvic/hip/depth cues hiện vẫn xấp xỉ; đặc biệt Karo belt/crotch/hips phải so reference và video ở cận/toàn thân. Alpha/hash/area/typecheck không duyệt anatomy hoặc garment.

Kiểm grounded stance soles, chuyển trọng tâm, two arms giữ phía/cách gập, chạy có flight, nhảy chuẩn bị/đạp/tiếp đất/settle; gaze/face không bị giả vẽ lên phần khuất. Actual60fps ở tốc độ thường, random/reverse seek, frame0 và cuối run, cut giữa bước/bay và đổi primary/supporting. Cùng source run thì camera slice giữ body/feet/cloth phase; không reset body tại đầu mỗi shot. Camera giữ toàn bộ hành động/tóc/vạt/landing envelope và vùng subtitle.

Sai mode/view/hash/canvas/actor, default rigid motion, opposite gait, front/profile/detailed fallback, rear face/chin/source gesture/secondary/seat/tool/supporting/head-bank và continuous turns phải báo lỗi rõ. Legacy3/4/profile/secondary/default vẫn giữ đúng capability. Source/sibling edits mất publication/repair binding; audio không đổi khi chỉ thay hình.

Ghi PASS/FAIL/NOT RUN, exact SHA, input, view/action/time/options và screenshots/videos/stderr. Source review qua9router không chạy test và không nghiệm thu pose/phim. V1/source0.98 không nghiệm thu0.99.

## Mục tiêu đầy đủ còn mở

Own front locomotion, per-view seat/cloth/secondary/tools/grasp/handoff/contact, expressive acting và genuine continuous head/body turns vẫn cần triển khai/review. Nam phụ trọc/không tóc/không râu, nữ có tóc/costume đúng vai chính; vivid layered day/sunset/night và reusable director/camera/world phải phục vụ câu chuyện mới.

Full arbitrary-story/script/dialogue/WAV/legacySRT, EN/VI/JA/KO/external-local TTS, audio/subtitle/current source receipts, resume/locks/rebuild/review/repair, final MP4/SRT/thumbnail/storyboard/profile/timeline/manifest/QC vẫn cần toàn tuyến. Không mở production hoặc báo DONE từ source checks hoặc một cảnh đi quay lưng.

## Kết quả source cuối

Build, test:typecheck, schema definition export, source asset inventory và raw static inventory exit0. 307 raster nguyên byte (144PNG/163JPEG,101JPEG tênPNG),18 head definitions và27 head metadata giữ nguyên. Legacy cloth/face/secondary data, own fixed body geometry và shared cloth/physical/secondary/temporal kernels giữ nguyên. Bốn own rear cloth sources bind đúng PNG/SHA/canvas; lower cage chứa raw contour/ink padding. Đây là manual source cues, chưa duyệt pelvis/hips, fabric seams hoặc anatomy. Manifest173 mapped code hashes/46 scalar entries đối chiếu source cuối. Tám callback mới chưa chạy. Freeze/stage29 đường dẫn riêng,52 untracked khác giữ nguyên. Combo tester đã trả HTTP200→gpt-6-luna cho bounded source advice; không chạy test hoặc duyệt source cuối/tạo hình/video. Parent đã kiểm tra và làm rõ guard rear sourceSpan; lời nhận xét về thiếu context không đúng snapshot. Chưa nghiệm thu runtime/audio/render/video hoặc toàn factory.
