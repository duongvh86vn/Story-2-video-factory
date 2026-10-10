# Tóc/râu chính diện từ đúng nguồn — source0.100

`forest-tribe-0.100-own-front-secondary`. Nối chuyển động phụ cho hai ảnh chính diện Lila/Karo để diễn xuất bớt cứng. **Chưa nghiệm thu tạo hình, đường cắt, khớp, chuyển động, audio/video hoặc toàn factory.** Mục tiêu giữ nguyên: arbitrary story/topic → faithful screenplay; exact script/dialogue hoặc original WAV (+legacySRT) → diễn viên trong câu chuyện → world/actions/director/camera → review/repair/final/QC. EN chính, VI/JA/KO, external/local HTTP/command TTS, cache/resume/locks/rebuild vẫn phải hoàn thành.

## Code đã nối

- `appearance.bodySecondary=registered-front-secondary-v1` chỉ cho own front của Lila/Karo, đúng PNG/SHA/canvas. Bốn vùng crest/tail/lower beard có UV riêng, không mượn profile3/4/rear hoặc xoay/mirror/warp mặt. Landmarks/nét/da/trang phục/màu và ảnh gốc giữ nguyên.
- Karo lower-beard rectangle có pixel cổ; own `sourceClip` là đường cắt thủ công. Phần xóa trong ảnh tĩnh và clip của các mảnh chuyển động dùng cùng contour, trước khi áp dụng headClip và texture deformation. Vùng cổ ngoài contour giữ tĩnh. Raw warm-pixel heuristic từ ảnh giúp đặt đường cắt, không chứng minh segmentation/identity/anatomy hoặc seam đẹp.
- Static/moving source dùng chung own eye/mouth/brow erase masks. Các lớp replacement mặt ở ngoài mesh tóc/râu, cùng uniform neck attachment. Không vẽ lại mặt hoặc tự chọn overlay nếu người dùng chưa chọn.
- Shared mesh/state/bounds/temporal/interpolation kernel giữ nguyên; optional sourceClip chỉ thay vùng chọn UV cho nguồn có khai báo. Legacy3/4/profile không khai báo contour giữ cùng source/rect/output contract. Các mép bên và hàng gắn tóc/râu được ghim; camera dùng conservative deformed vertex bounds. Positive-area/bound/typecheck chưa duyệt đường viền.
- Original expression/secondary clock qua explicit continuous camera cut và primary/supporting swap. Secondary riêng giữ original happy clock, không cấp expression artwork/giọng/phoneme. Front secondary không cấp locomotion, sourceBody/source gesture ownership, ghế, tools, head-bank, mẫu supportingModel hoặc continuous turns.
- Clock14/schema/API/workbench/director/exact report/cache/manifest có cùng selection/source. Tám callback `tests/native-front-secondary.test.ts` **DECLARED / NOT RUN**. Implementation không chạy test, fixture/schema instances, geometry/pose/sampler/compiler/camera evaluator, browser/server/API pipeline/TTS/ASR/render/media.
- Pre-model/TTS và `needs-source-prop-binding` giữ nguyên. All approvals=false, productionReady=false, productionRig=null, availableBanks=[].

Code chính: `packages/animation/body-view-front-secondary-binding.ts`, `body-view-secondary.ts`, `body-view-art.ts`, `body-view-basic-capabilities.ts`, `body-view-front-registration.ts`; `packages/actors/view-acting-clock.ts`; `packages/director/acting-brief.ts`; `packages/host/schemas.ts`; `packages/topics/body-workbench.ts`; `scripts/prehistoric-pack.ts`.

## Môi trường và lệnh giao model test

Windows, Node≥22.13, dependency lockfile. D checkout/server8850 được giữ riêng; model test dùng C worktree/cổng khác. Ghi exact full SHA, input/options/commands/stderr/artifacts và PASS/FAIL/NOT RUN; không ghi key vào report/Git.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-front-secondary.test.ts tests/native-profile-secondary.test.ts tests/native-secondary.test.ts tests/native-basic-expressions.test.ts tests/native-basic-speech.test.ts tests/native-basic-eyes.test.ts tests/native-rear-locomotion.test.ts
$env:STUDIO_HOST='127.0.0.1'
$env:STUDIO_PORT='8851'
npm run studio
```

Mở `http://127.0.0.1:8851`; Ctrl+C đúng terminal đó để dừng. Nếu cổng bận, chọn cổng khác và ghi report. URLs diagnostic chưa được implementation mở:

- `/api/topics/prehistoric-life/body?view=front&action=point&timeMs=1771&mood=happy&secondary=registered-front-secondary-v1`
- `/api/topics/prehistoric-life/body?view=front&action=think&timeMs=1771&mood=excited&secondary=registered-front-secondary-v1&eyes=registered-basic-eyes-v1&mouth=registered-basic-mouth-v1&expressions=registered-basic-expressions-v1`

Workbench là diagnostic, không phải phim hoàn chỉnh hoặc bằng chứng có giọng.

## Cần nghiệm thu thật

So hai ảnh own front và ảnh mẫu warm-skin gốc: khuôn mặt, mắt/mũi/miệng, tóc dài/tie Lila, beard/neck Karo, trang phục/viền/màu không trôi. Với rigid và selected secondary, rest/point/think, fixed-happy và own eyes/mouth/expressions, kiểm source mask không xuất hiện mặt gốc lần hai hoặc làm lệch mắt/mồm. Karo contour là xấp xỉ thủ công: kiểm cả skin leak, mất sợi/outline, pinned seam bị nứt hoặc double layer; raw histogram không duyệt các việc này.

Video60fps ở tốc độ thường: anticipation/settle, tóc/râu theo movement/expressions không rung giả, random/reverse seek và cut giữa laughing hold/recovery. Primary/supporting swap phải giữ phase cùng actor/view/root/stage/scale; đổi sibling/selection/source/expression phải mất publication binding. Camera không cắt tóc/tail/beard/gesture/subtitle; không reset ở cut. Secondary riêng không tự có sourceBody, mặt/giọng hoặc tool contact.

Sai actor/view/hash/canvas/mode và các yêu cầu chưa có phải báo lỗi rõ; không dùng profile/detailed/rear fallback. So legacy3/4/profile SVG, sampler/interpolation/camera, nguyên binding/data và raw rasters. Source review9router không chạy test hoặc duyệt hình/phim; V1/source0.99 không nghiệm thu0.100.

## Mục tiêu đầy đủ còn mở

Own front locomotion; rear secondary; per-view ghế/vạt/cầm–mang–trao vật/tiếp xúc; expressive acting và genuine continuous head/body turns vẫn cần triển khai/review. Người que là diễn viên của câu chuyện, không quay lại fixed narrator/diagram-only. Nam phụ trọc/không tóc/không râu, nữ có tóc/costume đúng vai chính; vivid world/day/sunset/night/director/camera phải dùng lại được cho câu chuyện mới.

Full story/script/dialogue/WAV/legacySRT, EN/VI/JA/KO/external-local TTS, source/audio/subtitle receipts, resume/locks/rebuild/review/repair, final MP4/SRT/thumbnail/storyboard/profile/timeline/manifest/QC chưa nghiệm thu toàn tuyến. Không bật production hoặc báo DONE từ build/typecheck/raw inventory hoặc vài vùng tóc chuyển động.

## Kết quả source cuối

Build, test:typecheck, schema definition export, source asset inventory và raw static inventory exit0. 307 raster nguyên byte (144PNG/163JPEG,101JPEG tênPNG),18 head definitions và27 head metadata giữ nguyên. Legacy cloth/face/secondary data và own fixed body geometry giữ nguyên; shared mesh/state/bounds/physical/temporal source không đổi. Optional own UV contour là thay đổi source selection; legacy rect SVG definitions giữ nguyên. Hai own front sources/bốn vùng bind PNG/SHA/canvas; lower beard Karo dùng cùng contour xóa tĩnh và cắt mảnh chuyển động. Raw warm-pixel heuristic zero trong final ROI không duyệt neck/segmentation/seam/anatomy. Manifest174 mapped code hashes/46 scalar entries đối chiếu source cuối. Tám callback mới chưa chạy. Freeze/stage28 đường dẫn riêng,52 untracked khác giữ nguyên. Tester bounded source advice HTTP200→gpt-6-luna; headClip concern đã được parent đối chiếu full SVG emission, chưa thiết lập lỗi; advice snapshot thiếu full emission/validation context. Không có nghiệm thu runtime/audio/render/video hoặc toàn factory.

**Đính chính source0.101:** fixture và URL mood dùng `excited`, đúng `Moods` contract; `laughing` là nhãn tạo hình tham khảo, không là enum runtime. Giữ timing/clock/assertions và NOT RUN, không thêm alias hoặc viết lại narration để né test.
