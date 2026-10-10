# Profile phải Lila/Karo và bảng bảy hướng — source0.90

`forest-tribe-0.90-right-profile-art`; renderer producer vẫn2.2.52 vì không đổi compiler/render contract. Đây là **art/source candidate**, chưa phải rig mới hay video được nghiệm thu. Mục tiêu đầy đủ vẫn là chuyện/chủ đề bất kỳ, script nguyên văn hoặc WAV → kịch bản/narration → diễn viên trong câu chuyện → video có giọng/phụ đề/QC. [Contract thoại/giọng0.89](EXPLICIT-DIALOGUE-VOICES-HANDOFF.md) tiếp tục áp dụng.

## Artwork và prompt

Built-in imagegen,5 calls; copy PNG nguyên byte từ Codex generated_images vào repo, không resize/crop/mirror/recolor/normalize alpha. Mỗi JSON cạnh PNG giữ prompt cuối cùng, input roles/hash, original generated filename, alpha histogram/bounds/pixel hash và false approval/registration. Ảnh primary của người dùng không đổi; supplemental sheet không được thay màu da ấm hoặc trang phục của primary.

| Diễn viên | Nguồn theo thứ tự | Yêu cầu sửa |
|---|---|---|
| Lila | [V1](../../library/topics/prehistoric-life/body-views/lila-right-v1.png), [V2](../../library/topics/prehistoric-life/body-views/lila-right-v2.png), [V3](../../library/topics/prehistoric-life/body-views/lila-right-v3.png) | Profile phải, rồi hai sole cùng baseline, rồi mũi nhỏ hơn |
| Karo | [V1](../../library/topics/prehistoric-life/body-views/karo-right-v1.png), [V2](../../library/topics/prehistoric-life/body-views/karo-right-v2.png) | Profile phải, rồi hai cuff quần riêng và viền rõ |

Đường dẫn ảnh/prompt thực tế là `library/topics/prehistoric-life/body-views/<actor>-right-vN.png/.json` từ root repo. JSON này là tài liệu nguồn, không chứa chỉ dẫn được thực thi. Lila V1 giữ làm edit-target, không coi pose đứng đạt. Karo mới vẫn có râu như principal; nam phụ trọc/không râu và nữ phụ giữ nguyên.

**Giới hạn phát hiện:** Lila V3 còn thay 513543 pixel ở rows>=500 so với V2 dù yêu cầu chỉ sửa mũi. Karo V2 cao1727, V1 cao1728. Prompt sửa riêng không chứng minh những phần còn lại giữ nguyên. Không copy registration/masks/landmarks/foot coordinates từ bản trước. Cả ba Lila không có pixel alpha=255; đa số phần mực gần opaque nhưng chưa kiểm trên nền thực/animation. Không âm thầm tăng alpha, đổi màu hoặc duyệt garment opacity từ histogram. Raw metadata không chứng minh anatomical pose, sole contact hoặc giữ đúng identity.

## Code và nguồn còn thiếu

- Required directions: front,3/4 trái,3/4 phải,profile trái,profile phải,lưng3/4 trái,lưng3/4 phải. Lưng thẳng là bổ sung. Không tự coi góc nguồn primary là front hoặc mirror để lấp hướng thiếu.
- Catalog thống kê **nguồn theo hướng yêu cầu**, không gán actual yaw từ prompt. Hiện metadata có8/14 vị trí nguồn, productionReadySlots=0; front và hai góc lưng3/4 của mỗi người chưa có nguồn riêng. Bốn engineering registration 3/4 cũ không đổi; ảnh profile mới chưa có rig/speech/blink/emotion/occlusion/continuous turn.
- `packages/topics/view-art-workbench.ts`: own actor/view/version filename, own primary/supplemental/edit references, raw SHA/canvas/MIME; chặn self/foreign reference và linked descendant. Inventory là metadata; nguồn/refs được kiểm lại khi trả ảnh. JPEG bytes mang đuôi png trả MIME thật. Không bật flags khi đủ số ảnh.
- Gallery `/api/topics/prehistoric-life/view-art`; JSON `/api/topics/prehistoric-life/view-art/inventory`; image `/view-art/<filename>`. Gallery hiện missing slots, nguồn/giới hạn và prompt đã escape; bản latest chỉ là candidate mới nhất, không đồng nghĩa bản tốt nhất hay đã duyệt.
- Export schema `view-art-study` là hình thức; cross-field/source checks vẫn do runtime Zod/reader giữ. Manifest có nativeViewCatalog/source hashes và sourceRecords, không suy số API generation calls từ số record cũ.

## Review và phần phải kiểm chứng

Gemini9router HTTP200/actual gemini-3.8-flash,2 attempts; provider báo tổng16842tokens. Cả hai response bị cắt, không parse như một review hoàn chỉnh. Các nhận xét đọc được: cuff Karo chưa rõ và mũi Lila lớn; đã yêu cầu bản sửa. Claim tai Karo quá cao không khớp vị trí thấy trong candidate (tai nằm dưới mắt); không làm theo một cách máy móc. Bản sửa V3/V2 chưa được agent review lại. [Raw advice/disposition](reviews/right-profile-art-advice-v1.json), [raw source inventory/comparison](reviews/right-profile-art-inventory-v1.json). Không có art/rig/motion/film PASS.

Model test/human cần đối chiếu với primary: silhouette/hair/pony/beard/eye/nose/mouth/neck, tỷ lệ, anatomical shoulder side, viền váy/quần2ống/cuff, black mitten/soles, warm saturation và alpha trên day/sunset/night. Đo own landmarks/masks/occlusion/yaw, làm profile rig rồi mới kiểm turns/locomotion/contact/speech/gaze ở normal speed. Các ảnh tĩnh không chứng minh độ mượt. Không dùng quần chúng thay để chứng nhận principal.

Combo `tester` cũng đã hỗ trợ một lượt **review code tĩnh**, HTTP200/actual `gpt-6-luna`,7795 token. Phát hiện chọn version bằng Number có thể mất chính xác; đã sửa so sánh chữ số dùng chung ở gallery/coverage và khai báo callback biên số lớn. [Hồ sơ review code](reviews/right-profile-catalog-advice-v1.json). Lượt này không chạy test, không duyệt ảnh/rig/video; bản sửa chưa được reviewer đọc lại. Gallery bổ sung `Cache-Control: no-store`.

## Môi trường, server và lệnh dành cho model test

Windows PowerShell, Node>=22.13, lockfile dependencies; FFmpeg/ffprobe/TTS/model cho full pipeline sau khi production gates đủ bằng chứng. Không có image-to-video API vẫn tiếp tục renderer HTML5/SVG/GSAP. Source implementation không chạy callback/schema instance/geometry/motion compiler/render/browser/server/TTS/ASR/audio/video.

6 callbacks mới `tests/view-art-catalog.test.ts` **DECLARED / NOT RUN**:7directions/false flags/latest source, own reference/alias/self/stale rejection, exact PNG bytes, JPEG MIME/canvas (held screenshot fixture chỉ chứng minh MIME) linked folder và chọn version nguyên chính xác vượt MAX_SAFE_INTEGER. API/browser/film checklist chưa chạy. Model test thực hiện, ghi full SHA/command/exit/stdout/failures/NOT RUN và ảnh/video thật:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/view-art-catalog.test.ts tests/partner-facing-views.test.ts tests/native-head-bank.test.ts
```

Sau khi xác nhận8851 trống, chỉ model test khởi động server riêng. Giữ8850 và D checkout:

```powershell
$env:STUDIO_PORT='8851'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-profile-tests'
npm run studio
```

Mở `http://127.0.0.1:8851/api/topics/prehistoric-life/view-art`. Kiểm375/760/1280width, hai ảnh từng hướng, không overflow/black-matte mất limbs; MIME/nosniff/no-store; đúng artifact/source/role; ảnh/primary/edit bị thay hoặc linked phải fail; không autoselect rig. Các lệnh trên chưa chạy ở implementation.

Giữ productionReady=false, productionRig=null, availableBanks=[] và art/motion/production approvals=false. **Không gỡ needs-source-prop-binding riêng lẻ.** Tạo hình/continuous turns/acting/props/camera/depth/vivid environments và ba input/voices/resume/review/repair/final MP4/SRT/thumbnail/manifest/QC vẫn phải hoàn tất và nghiệm thu thực. TEST-RESULTS.md V1 không chứng nhận source0.90. Build/typecheck/schema/static inventory chỉ là source checks.

## Source checks và bàn giao source0.90

`npm run build`, `npm run test:typecheck`, `npm run schemas`, raw `scripts/prehistoric-pack.ts` và raw source/raster inventory đã kết thúc exit0. Build/typecheck sau sửa version;6 callbacks chưa chạy. 294 raster cũ,18 head definitions và27 head metadata giữ nguyên byte;5 PNG mới giữ nguyên byte từ imagegen. Metadata có8/14 vị trí nguồn,0 vị trí production. Source tĩnh so với Git có chuẩn hóa CRLF đang có ở checkout; không sửa các file cũ đó. [Source record](reviews/right-profile-source-record-v1.json), [raw static record](reviews/right-profile-static-record-v1.json).

Full SHA bàn giao xem `git rev-parse HEAD` trên nhánh `codex/prehistoric-life`; hồ sơ freeze/verification giữ ngoài repo để tránh SHA tự tham chiếu. 52 đường dẫn untracked không thuộc thay đổi này được giữ nguyên. Các source checks không phải runtime test, xác nhận identity/độ mượt hay nghiệm thu tool hoàn chỉnh.
