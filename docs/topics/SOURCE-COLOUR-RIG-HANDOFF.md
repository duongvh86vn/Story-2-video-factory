# Candidate source-colour rig — bàn giao model test

Ngày 08/10/2026. Base `fca55fdb57d9aa5d08506156e200c75a905e78db`, source `31070ccab1bc600c485bed9f53733f68bbd0fb3e`. Đây là source candidate layer integration, chưa là video đạt mẫu hoặc rig được duyệt. [Plan](../plans/2026-10-08-source-colour-rig.md), [artwork/figures và giới hạn](SOURCE-RGB-MASTERS.md), [review source](reviews/source-colour-rig-review-v1.md).

## Thay đổi có thể kiểm

- `HostProfile.appearance.sourceColour` là optional literal `original-rgb-v2`, chỉ hợp lệ khi `artworkVersion=forest-body-1` và có `characterVariant=lila|karo`. Không truyền giữ cutout hiện có. Cả schema và resource selector chặn kết hợp authored quarter-view/head-only/generic hoặc thiếu actor; không dùng frontal RGB để giả view.
- `source-colour-art.ts` giữ nguyên bytes RGB của hai ảnh cận gốc, dùng cutout AI như matte riêng trong source units430×766/377×716. Hai bounded matrix loại bớt nền giấy, vùng interior mặt giữ highlights/răng. Đây là heuristic chưa duyệt; không giữ hoàn hảo các tóc/biên hoặc tự tạo vùng bị che.
- Candidate head/body layers dùng cùng định nghĩa màu: đầu, cổ, thân áo/vạt, mitten và foot. Không tự thay bone lengths, joint targets, cuff/palm/sole, narration clock, speech activity, script/WAV hoặc native motion. Các clip/anchor hiện có vẫn là candidate đã suy luận từ cutout; full nguyên màu không làm registration đó thành đúng.
- Stage exact RGB+matte vào `assets/rigs/<sha>.png` và giữ seated reconstruction cũ thành resource candidate riêng. Namespace toàn bộ local filter/mask/use/clip theo actor. Body/head renderer12, cutout-head2 và colour fingerprint làm cache hình thay đổi; audio không là output của helper này.
- Studio body inspection có field/query `colour=cutout|original-rgb-v2`, giữ query qua pose links/form. Góc 3/4/lunge cần bỏ chọn màu nguồn vì dùng artwork riêng; kết hợp đó phải bị chặn rõ. Default project/topic/production art selection không đổi từ việc thêm option kiểm hình.

## Kiểm được và chưa kiểm

Fresh core/full build/test:typecheck/schema export exit0 trên source `31070cc`. Review source độc lập PASS, không có actionable findings trong exact range; [phạm vi và bằng chứng](reviews/source-colour-rig-review-v1.md). Ba JSON schema host-profile/shot/storyboard thêm optional literal; runtime superRefine vẫn là validator cho source-body/actor-only selection. Sáu callbacks ở `tests/source-colour-rig.test.ts` **NOT RUN**: lựa chọn hợp lệ/legacy/unsupported, hash-bound assets/fingerprint, bounded SVG/local refs/namespaces, metrics/clock/random seek equality, canonical scene resources/security và workbench selection/links/error cards.

Controller chỉ author SVG, raster tài liệu tĩnh bằng Sharp và xem figure; không chạy assertions/fixtures/body evaluator/GSAP/browser/provider/API/CLI sản xuất/audio/TTS/ASR/render/MP4. 9 arm trajectory,4measurement,3anchor,42speech declarations trước vẫn NOT RUN. Không dùng TEST-RESULTS V1 hoặc source review để suy ra các ca mới PASS.

## Lệnh cho model được giao test

Node≥22.13 theo package.json, dependency/package-lock hiện có gồm GSAP/Sharp/TypeScript. Không cần thêm Python/RIFE/Grok hoặc API image-to-video cho sáu ca này.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-colour-rig.test.ts
```

Ghi exact commit và từng PASS/FAIL/NOT RUN. Sau đó kiểm renderer/GSAP với cả diễn viên, mọi động tác/thời điểm/scale, chiều dài và màu/viền áo; hai actor cùng frame không lấy nhầm filter/mask của nhau; cache/resume và scene staging không thiếu/mix resource. Kiểm riêng seated reconstruction, overlay blink/mouth, ánh mắt/view và props vì chúng chưa được artwork acceptance. Nếu thấy lỗi, ghi pose/time/actor/hand/view/colour, screenshot và log; không tự approve để bỏ gate.

## Server riêng cho model test

Launcher được đọc từ source, chưa khởi động ở checkpoint này. Dùng cổng/project root riêng để không thao tác instance8850 hoặc checkout D đang có WIP khác:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
powershell -ExecutionPolicy Bypass -File scripts/start-studio.ps1 `
  -Port 8851 -EnvFile 'D:/github/Story-2-video-factory2.1/.env' `
  -ProjectsRoot 'projects-source-colour-test'
```

Giữ terminal; Ctrl+C dừng instance này. EnvFile chỉ tham chiếu file key riêng, không in/gửi/commit nội dung. Trang inspection dự kiến sau khi chạy đúng source:

```text
http://127.0.0.1:8851/api/topics/prehistoric-life/body?action=rest&timeMs=800&mood=happy&view=source&colour=original-rgb-v2
```

Đổi colour sang `cutout` để đối chiếu, rồi point/think/walk/run/jump và seated theo duration/action của workbench. Đây là pose ở một clock, không phải video preview hoặc proof smoothness. Server8850 đang mở chưa được restart/test bởi controller ở mốc này.

## Để hoàn thành toàn tool

Chưa duyệt silhouette/matte/layers/anchors/source identity, partner-facing views/turns, expression/mouth art, mềm mại/clearance/contact/handoff, world colour/art và receipts. Mixed-speaker cue còn cần exact subcue/word timing; không chia clock giả. Pipeline ba input kịch bản nguyên văn / WAV giữ audio-clock / câu chuyện→kịch bản trung thành→video, EN chính và VI/JA/KO, TTS local/HTTP/command còn phải kiểm toàn luồng bằng model được giao test. Giữ topic `productionReady=false`, `productionRig=null`, thiếu giọng/fit/identity/target/sync chặn final. Không đổi mục tiêu tool thành một helper màu hoặc một video săn minh họa.
