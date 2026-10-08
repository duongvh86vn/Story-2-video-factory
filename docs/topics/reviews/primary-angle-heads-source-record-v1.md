# Đầu Lila/Karo giữ góc mẫu — source0.50, 08/10/2026

Mục tiêu vẫn là **câu chuyện/kịch bản/WAV bất kỳ → hai diễn viên kể và diễn đúng nội dung → video có giọng, màu sống động, phụ đề và QC**. EN là chính; VI/JA/KO, TTS external/local và resume/locks còn trong phạm vi. Bản này sửa nguồn mặt/tóc/râu; chưa là video được nghiệm thu, bank hoặc rig sản xuất.

## Ảnh đã làm

Dùng **built-in imagegen**, không qua CLI/API ảnh khác. V1 tách đầu ở góc của primary, không ép chính diện; V2 sửa riêng lọn tóc đỉnh Lila và cổ thừa dưới râu Karo. Giữ cả V1/V2 và original generated_images; PNG trong repo là copy byte-identical của output từng lượt, **không phải pixel-identical với ảnh gốc hoặc V1**. Không raster crop/resize/paint lại bằng Python/Sharp.

| PNG trong library/topics/prehistoric-life/head-cells | Kích thước thật | SHA256 |
|---|---:|---|
| lila-head-source-angle-v1.png |1167×1348|a98424e76e08daa67561d9ccc8fa8a2685c3dd3b1e66c4d35e9b5105b7fc5986|
| lila-head-source-angle-v2.png |1167×1347|05b555d23110f2837888d49647038d779fd6e398c9dd31af2853dbd5479eb298|
| karo-head-source-angle-v1.png |1202×1309|7aaaf2ddc6c1019b5b8428cf50f1bd0255f6a6cbfaf561c510bbc0006a22eb6d|
| karo-head-source-angle-v2.png |1201×1309|d4b417a194098670cc20beab4ef8a8488094fcb32ac29dd1725e933d90e17a23|

Prompt/thứ tự primary/edit ref/generatedOriginal/rawSHA/alpha histogram/pixelSHA/visibleBounds nằm trong từng `*-prompt.json` và `*.json` cạnh PNG. Cả bốn đều có alpha0 và edgePixels0; có một số alpha255 khác hai PNG0.48. Prompt yêu cầu margin10%, thực tế một số phía nhỏ hơn, ví dụ LilaV2 top19px; không gọi margin đạt10%. Alpha/bounds không chứng minh anatomy/identity/seam hoặc video.

Primary Lila `85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce`, Karo `7106afd9697f5b4be341c46a357fe45981f29bb4b0e58dd136528e6c1e600aa2`; supplemental trắng mặt không thay thế primary. V2 có đúng primary và V1 edit ref cùng actor; reader chặn raw/ref/prompt thay đổi.

Parent đã xem cả output/V1/V2 và primary. Nhận xét ảnh tĩnh: giữ góc nhìn, mặt ấm, eye/nose/smile; Lila giữ tóc dài và Karo giữ beard/tooth aperture tốt hơn bản ép front0.48. V2 đã bỏ crown whip/neck nub theo quan sát. Tỷ lệ tóc/nét/mặt và seam vẫn cần đối chiếu; V2 thay nhiều pixel và canvas1px, **không tái dùng tọa độ V1 hoặc gọi edit chỉ đổi đúng vùng**.

## Review9router

[Report raw bound input/output](primary-angle-heads-nine-router-review-v1.json):

- Gemini `ag/gemini-3.8-flash-low` so primary với V1, phát hiện crown whip/neck nub và vài lệch beard/mouth/ear;7.669 token.
- GPT `cx/gpt-5.6-sol` source-only3file schema/authoring/tests không có finding cụ thể;7.172 token. Không được cung cấp PNG/JSON raw metadata để tự xác nhận giá trị thực.
- Gemini đối chiếu V1/V2, trả response rất ngắn68 output token, chỉ nói targetedChangeObserved=true;7.052 tổng token. Parent có đối chiếu riêng. Response này **không đủ** chứng minh feature giữ nguyên, registration, seam, motion hoặc video.

Ba request thực,21.893 token provider báo. Một packet folder chứa dấu chấm bị client path guard từ chối trước API; batch thực `head-cell-050`. Không retry tự động, không gọi tools/model pipeline/test/render/video. Bản sửa description/UI/callback additions sau lượt GPT review chỉ được parent source review, chưa independent review toàn bộ cuối cùng.

## Source thay đổi

`requestedYawDeg` bắt buộc nhưng nhận số hữu hạn hoặc **null**. Null nghĩa giữ góc original, không request số độ; không tự điền0, không mặc định hoặc ghi yawMeasured=true. Hai material0.48 giữ raw record nguyên byte.

`scripts/head-cell-inventory.ts` đọc mọi PNG canonical thay vì chỉ2file Lila. Existing record chỉ kiểm không ghi lại; new record kiểm PNG copy nguyên byte từ đúng generated_images, bounded path/không symlink/kích thước, primary/edit sources rồi write wx. API repo không cần và không đọc generatedOriginal bên ngoài repo. Hiện6 individual materials,5 held atlases; **availableBanks=0, productionReady=false, productionRig=null**.

Studio single-PNG workbench hiển thị rõ null/góc chưa đo; Karo đã có nguồn và không còn nhãn thiếu Karo. Default/fixed source head trong video không tự thay. Thuật toán facial/pose, audio contract và pipeline voices không được đổi thành phim im lặng.

## Bản đo sơ bộ để làm rig tiếp

[LilaV2 manual draft](lila-source-angle-v2-landmarks-draft.json) và [KaroV2 manual draft](karo-source-angle-v2-landmarks-draft.json) có crop toàn canvas được chọn thủ công và điểm mắt/mũi/miệng/cằm **ước lượng từ quan sát PNG**. Chúng bound đúng sourceSHA/canvas/material fingerprint, chưa có neck/skull/face contour/seam/masks/yaw/pixelScale/ponytail side. review=unreviewed và mọi gatefalse. Chưa chạy editor/API/schema geometry check đối với những draft này; không là calibration được chấp nhận.

Model test mở đúng PNGV2 rồi import draft tương ứng tại `/api/topics/prehistoric-life/head-cells?file=lila-head-source-angle-v2.png` hoặc KaroV2. Kiểm/sửa các điểm lệch tại ảnh pixel thật trước khi đo nốt. Đặc biệt cổ Karo phải được gắn theo native body seam, không đoán một socket từ nub cũ đã xóa. Tuyệt đối không lấy mặt/ROI của primary full-body hoặc V1 đặt lên headV2.

## Việc tiếp theo còn thiếu

1. Điều chỉnh/đo chính xác mặt/cổ/sọ/mask/brow/hair và vùng bảo vệ từng V2; chốt body view/hash/neck/overlap/painter order tương thích. Nếu không khớp primary phải sửa artwork thật.
2. Author các góc lân cận từ từng V2 và cả hướng nhìn bạn diễn/left/right/profile/rear, cùng face proportions/hairside/beard; không flip/mirror/wholefacewarp/crossfade2face để giả turn. Góc request hoặc nhìn gần giống nhau không là góc đã đo.
3. Source bank + per-cell speaking/listening/blink/gaze/emotion/secondary/painter seam đúng source geometry và original run clock. Existingbank restcapabilitiesfalse vẫn chặn speech, không lách guard bằng bỏ thoại.
4. Cử động thân/chân/tay, sit/rise/run/jump/hunt/props/grasp/carry/handoff/contact/gaze theo câu chuyện; màu world day/sunset/night sống động.
5. Full3input và legacySRT/ENVIJAKO/external-localvoice/resume/locks/finalMP4/subtitle/thumbnail/storyboard/asset-manifest/productionQC; đúng source failure gates.
6. Model của người dùng kiểm runtime và video60fps/normal-speed theo exactSHA. TEST-RESULTS.md ở D sửa01/10/2026 là V1, chưa chứng minh source0.50.

## Kiểm tra source đã chạy

- `npm run build`: exit0, Vite 39 modules, 490ms.
- `npm run test:typecheck`: exit0; chỉ TypeScript, không thực thi test callback.
- `npm run schemas`: exit0; schema angle nhận số hoặc null nhưng vẫn required.
- Static inventory và pack: exit0, 6 individual materials, 6 references/12 candidates/6 head candidates/2 garment candidates/7 rejected, productionReady=false.
- So sánh raw SHA/bytes: cả 4 PNG bằng generated originals; 6 file PNG/prompt/metadata cũ giữ nguyên byte; 2 draft đúng material fingerprint; 5 bank code hash khớp manifest. availableBanks=0, productionReady=false/productionRig=null. Một lần so Git raw PNG gặp giới hạn buffer của child process; chạy lại với giới hạn 40MiB đã qua. Không gọi code geometry/renderer hoặc callback trong phép đối chiếu này.
- `git diff --check`: qua. Toàn runtime/browser/video dưới đây vẫn NOT RUN; source checks không chứng minh final video.

## Model test thực hiện — NOT RUN

Các phép parent hiện được phép: build/typecheck/schema export/staticPNG metadata/inventory/source review. Mọi callback/browser/server/API/compiler/sampler/TTS/ASR/render/video vẫn giao model khác.

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/head-cell-art.test.ts tests/head-cell-landmarks.test.ts tests/head-cell-workbench.test.ts tests/native-head-bank-sources.test.ts tests/native-head-bank.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/head-turn-studio-projects'
npm run studio
~~~

Server sourceC; không copy/reset/merge vào checkoutD đang bảo vệ. Port8850 đang mở không là bằng chứng dùng source mới; default8787, có thể dùng8861 riêng. Ctrl+C terminal đó để dừng. Trang đo không cần FFmpeg/9router/voice/image-to-video. Media acceptance riêng theo NATIVE-SEAT-TRACER.md.

5 callback0.50 chỉ khai báo, **NOT RUN**: raw/source-angle/null mismatch/V2 editbinding +pageunknownangle/partialdraft; callback0.48/0.49 cũng chưa thực thi. Browser375×812/760×900/1280×800, pixelmarkers/import/download/source mismatches/CSP/no-store/immutability; đối chiếu tạo hình riêng, không suy độ mượt. Ghi TEST-RESULTS exactSHA/commands/versions/PASSFAILNOTRUN/log/screenshot; static inventory không chứng minh full factory.
