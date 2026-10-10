# Preview của chính cảnh gốc — source0.102

`forest-tribe-0.102-original-source-preview`. Đã viết đường xuất **HTML5/GSAP chưa duyệt từ project thật**, dùng chung cinematic emitter. Đây là công cụ cho model test kiểm tra diễn viên/đạo cụ/camera của câu chuyện đã nhập. **Chưa chạy exporter, validator, callbacks, playback, renderer, audio/video hoặc nghiệm thu toàn factory.**

## Đã triển khai trong source

- `renderSourceCinematicPreview` có entry riêng; `renderCinematic` sản xuất không có switch bỏ chặn. Cả hai dùng cùng emitter thân, mặt, áo, palm slots, object glyph, source world/ownership, camera, near/far/foreground và GSAP. Production entry vẫn gọi validator sản xuất mặc định.
- Preview cần toàn storyboard/narration/beats/character-bible/host/config gốc, đúng shot duy nhất và **mọi** source audit check passed. Không làm đoạn cắt giả thành nguồn đầy đủ, bỏ sibling, dời target, clamp release, đổi clock/pose/lời kể hoặc sửa source để dựng được. Rig/sprite hoặc artwork chưa có contract vẫn báo lỗi; nguồn giáo chưa được cấp production contract vẫn bị chặn.
- Nạp nguyên `speech-activity.json`, kiểm clock và hash audio gốc nếu `audio-rms`. Preview **không chứa audio**, không gọi TTS/ASR/voice fit và không phải phoneme lip-sync. `segment-draft` chỉ giữ activity của nháp đã có, không tự tạo lời/giọng.
- Exporter chỉ đọc project; tạo thư mục UUID mới dưới `runtime/prehistoric-life/source-previews` của checkout đang chạy source. Không ghi project/scenes/locks/cache/config của nguồn. Snapshot có narration được chọn, toàn source bytes/absence receipts, effective config và canonical host; re-read ở cuối phát hiện đổi source/sibling/giọng/cast/camera. Đây là optimistic freshness, không phải OS snapshot.
- Staging giữ raw rig bytes/SHA và ảnh môi trường gốc PNG/JPEG/WebP; không download, resize, re-encode, gọi provider hoặc lấy derivative chưa có receipt. Nguồn hình động/format khác cần contract riêng và báo lỗi. Required assets phải hiện có/approved/hash đúng; approval asset không cấp approval cho diễn viên/video. Rig/project assets/audio/GSAP và bytes output được re-check.
- HTML có meta/root scope `original-source-preview-v1` và nhãn **UNAPPROVED SOURCE PREVIEW — AUDIO NOT INCLUDED** ngoài moving camera. Validator diagnostic giữ mọi CSP/resource/script/CSS/clock/dimension/byte-cap rule. Scene security5 chặn preview vào production kể cả khi loader bỏ notes; cache sản xuất đổi theo security version. Không có `--render`, `--serve`, `--tts` hoặc `--approve`.
- Báo cáo luôn `canPublish=false`, `approved=false`, `productionReady=false`, `productionRig=null`, `availableBanks=[]`, `motionVerified=false`, `productionApproval=false`, `audioIncluded=false`. `needs-source-prop-binding`, pre-model/TTS gates và mọi chặn trước final/DONE giữ nguyên.

Code: `library/shots/cinematic.ts`, `packages/scenes/source-preview-scope.ts`, `source-preview-project.ts`, `security.ts`, `packages/director/source-production-audit.ts`, `scripts/source-preview.ts`. Chín callbacks `tests/original-source-preview.test.ts` **DECLARED / NOT RUN**. Ca positive cần đường dẫn project/shot thật từ model test; không được tính SKIP là export PASS. Chưa có ca project thật export/playback PASS.

## Môi trường và lệnh dành riêng cho model test

Windows, Node≥22.13.0, `npm ci` theo lockfile, Hyperframes đã pin `0.8.96`, GSAP local. Giữ D checkout/server8850; dùng source C worktree. Không ghi key vào báo cáo. Project phải có artifacts từ câu chuyện của người dùng và timeline thực tế; nếu thiếu thì báo thiếu, không bootstrap demo máy móc hay sửa cue để cố PASS.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
# Thay hai giá trị bằng project/cảnh gốc thực tế; không phải fixture benchmark.
$qaProject='D:\github\Story-2-video-factory2.1\projects\REPLACE_PROJECT'
$qaShot='REPLACE_ORIGINAL_SHOT_ID'
$env:FACTORY_SOURCE_PREVIEW_QA_PROJECT=$qaProject
$env:FACTORY_SOURCE_PREVIEW_QA_SHOT=$qaShot
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/original-source-preview.test.ts tests/original-source-audit.test.ts tests/native-profile-manipulation.test.ts
npm run source:preview -- --project $qaProject --shot $qaShot
```

Exporter in JSON có `outputRoot`/`preview-report.json` khi thành công. Chỉ tiếp tục nếu report `status=exported`, full SHA đúng source đang test và không tracked-source dirty. Nếu lỗi thì giữ stderr và nguồn; không đưa folder `failed` vào review/final. Export thành công cũng **chưa** là playback/art/motion PASS.

```powershell
# Dán outputRoot vừa nhận, sau đó mở preview server riêng.
$qaPreviewRoot='REPLACE_RETURNED_ABSOLUTE_OUTPUT_ROOT'
Set-Location -LiteralPath $qaPreviewRoot
node 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1\node_modules\hyperframes\bin\hyperframes.mjs' preview --foreground --port 8852
```

Lệnh preview được đối chiếu README/package của dependency cài trên máy; **chưa chạy**. Mở URL do Hyperframes in ra, chọn `index.html`, play/seek trong Studio. Nếu8852 bận, chọn cổng trống và ghi lại; Ctrl+C terminal đó để dừng. Không dùng kết quả nháp im lặng làm final có audio.

Artifact: `index.html`, `style.css`, `scene.js`, local GSAP/rig/background; `source-snapshot.json` (không config/key), `emission-report.json`, `preview-report.json` có source/scene/resource/activity/audio receipts và các trạng thái NOT RUN. Không tạo MP4/SRT/thumbnail/final hoặc ghi DONE.

## Nghiệm thu tiếp theo và phần còn thiếu

1. Dùng ít nhất một project/câu chuyện thật có Lila/Karo, object SVG của truyện và original sourceManipulation/sourceBody/world. Tạo clock/cast/targets/source refs đúng trước preview. Mọi audit failure phải hiện rõ, không bỏ validator để lấy hình.
2. Xem cả hai tay/các góc own profile và3/4, cận mặt/khớp/viền áo/palm; so original references về tạo hình/màu/biểu cảm. Kiểm actor nhìn bạn diễn, object nằm ở đúng grip, chỉ một glyph/palm slot, reaction sau actual contact, landing/release đúng nguồn. Report geometry không thay chứng cứ ảnh/video.
3. Xuất từng original shot trước/sau contact/release, cuts và primary/supporting swaps; play ở tốc độ thường, random/reverse seeks. So trạng thái cùng original global time với nguồn và các sibling, không reset animation tại cut. Kiểm camera mọi người/đạo cụ, occlusion/foreground/world depth, scene cap.
4. Đổi storyboard sibling/narration/activity/voice/cast/host/asset/GSAP khi export phải lỗi hoặc đổi receipt; project/locks/audio/scenes nguồn phải giữ bytes. Preview bị chặn ở validator/publication sản xuất kể cả notes rỗng. Ghi full SHA, input/source/shot/clock, commands/exit/stderr/receipts và PASS/FAIL/NOT RUN.
5. Còn phải nối/kiểm chứng toàn story/topic→faithful screenplay, exact script/dialogue hoặc original WAV (+legacy SRT), giọng EN chính/VI/JA/KO và external/local TTS, review/repair, resume/locks/rebuild, final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC. Continuous own head/body turns, các tool/seat/handoff/view còn thiếu và visual/motion quality vẫn mở. Không lấy V1, connectivity200, source build hoặc preview geometry làm nghiệm thu toàn hệ thống.

Một lượt9router `tester` source-only trả HTTP200→gpt-6-luna. Góp ý đọc body bằng reader head có điều kiện và thiếu context; parent xác minh `readReferenceHeadAsset` đọc raw file/hash chung, và canonical staging dùng cùng reader với cả `referenceHeadAssets`/`referenceBodyAssets`, nên chưa có căn cứ đổi reader. Reviewer không thực thi, không nghiệm thu source cuối/hình/chuyển động. Build đầu phát hiện hai biến trùng tên; đã sửa tên mode tách khỏi CSS selector scope. Source checks cuối được ghi ở `reviews/original-source-preview-source-record-v1.json`.
