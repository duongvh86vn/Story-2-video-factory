# Source0.62 — thứ tự vẽ đầu, tóc và thân

08/10/2026. Phần mới là **source triển khai, chưa nghiệm thu hình/video**. Đích cuối vẫn là câu chuyện bất kỳ → kịch bản, kịch bản nguyên văn hoặc WAV gốc → hai diễn viên trong câu chuyện → video có giọng/phụ đề/QC. Không thay đích này bằng một tracer hoặc câu chuyện cố định.

## Thay đổi trong renderer chung

Trước đây, toàn bộ PNG đầu độc lập nằm trong `head`, sau ngực và cả hai tay. Đuôi tóc dài vì thế có thể đè lên trang phục/tay mặc dù nó nằm sau cơ thể. Lựa chọn mới `face=source-layers` dùng **bốn definition riêng**, giữ nguyên cả mười definition trước và mọi PNG:

- Lila trái/phải: region của đuôi tóc nguồn nằm trong `head-back`, trước chân, quần áo, ngực và cả hai tay. Mặt, tóc mái, nút buộc và cổ vẫn ở lớp đầu phía trước. Mask foreground chỉ bỏ nội thất region đã đăng ký.
- Karo trái/phải: đăng ký rõ `rear=[]`. Toàn bộ đầu/râu vẫn phía trước; không tự suy ra một lớp tóc sau không có trong nguồn.
- Cả hai lớp Lila dùng **cùng một transform `head`**, cùng uniform scale/neck-axis/source coordinates và cùng original cell clock. Thay cell là `tl.set` đồng thời, không crossfade hai gương mặt hoặc reset tóc tại camera cut.
- Tay chạm cằm vẫn ở foreground slot phía trên đầu. Miệng, mắt, brow, nguồn narration/speaker và original reactions của source0.61 không đổi.

`native-head-paint-1` khai báo exact PNG SHA/canvas, `rear[].region` và `frontCut` trong tọa độ PNG. Region vẽ phía sau, `frontCut` là phần bị bỏ ở phía trước, nằm hoàn toàn trong region. Overlap 0–2 pixel mỗi cạnh được tác giả khai báo để giảm rãnh clip; phải có ít nhất một cạnh overlap. Các region không chạm nhau, không chạm mặt/ROI lấy màu/landmark/neck seam. Contract chỉ cho complete explicit bank5; không gắn mask vào bank1–4 hoặc mượn layer của actor khác.

Hai vùng Lila được khai báo thủ công sau khi xem raw PNG:

| Góc | Region sau `(x,y,w,h)` | Front cut `(x,y,w,h)` |
|---|---|---|
| Lila trái | `660,815,508,532` | `662,817,506,530` |
| Lila phải | `0,750,585,597` | `0,752,583,595` |

Đây là **tọa độ chưa validate**, không phải art đã duyệt. Mask không cắt bỏ cổ, không tạo head turn, không tạo tóc trễ/quán tính/mesh secondary motion. Neck seam metadata cũ không được dùng làm silhouette clip. Hình ghép thật cần chứng minh tóc/nút buộc/alpha/viền còn đẹp và layer đúng ở cả hai hướng, khi ngồi, bước đi, vươn tay, nghĩ và đổi camera. Nếu region chữ nhật cắt sai sợi tóc hoặc seam lộ, phải sửa nguồn/partition; không dùng blur, fade toàn mặt hoặc lấy default mặt trước để che lỗi.

## Code và môi trường

| Vai trò | File |
|---|---|
| Contract/geometry/SVG mask | `packages/animation/native-head-paint.ts`, `native-head-bank.ts` |
| Hai lớp cùng cell/source | `packages/animation/body-head-bank.ts` |
| Thứ tự vẽ/timeline/refinement/report | `packages/animation/rig.ts`, `compiler.ts` |
| Đúng catalog/Studio binding | `packages/topics/head-face-candidates.ts`, `head-face-source.ts`, `head-face-workbench.ts`, `apps/server/index.ts` |
| Canonical hai diễn viên, camera cuts | `packages/topics/native-dialogue-candidates.ts`, `benchmarks/native-seat-tracer.ts`, `scripts/native-seat-tracer.ts` |
| Bốn definition mới | `library/topics/prehistoric-life/head-face-registrations/{lila,karo}-{left,right}-layers-v1.json` |
| Test khai báo | `tests/native-head-paint.test.ts` |

Node >=22.13, npm/GSAP/Sharp/tsx theo lockfile. Máy source dùng Node24.19.0; ffmpeg/ffprobe `C:/ffmpeg/bin`. Render cần HyperFrames/browser của dự án. Kiểm tra mới này không cần gọi model/TTS. Test voice/audio thật vẫn cần input và provider đúng ngôn ngữ. Key nằm trong môi trường hoặc `.env`, không chép vào báo cáo/chat.

**Runtime chỉ do model test của người dùng chạy. Model triển khai không chạy test/geometry/builder/compiler/sampler/server/browser/render/API pipeline/TTS/ASR/media hoặc tracer `--help`.** Model triển khai chỉ build/typecheck/export schemas và kiểm bytes/manifest. Source C là checkout làm việc; server8850 tại D không tự nhận source này. Không copy đè D hoặc projects của người dùng.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/source-paint-test-projects'
npm run studio
```

Mở `http://127.0.0.1:8861/api/topics/prehistoric-life/head-faces?actor=lila&view=three-quarter-left&face=source-layers&mood=concerned&action=think&look=ahead`. Chạy cả hai góc, Lila/Karo, các mood, whole/second-half. Path riêng `/source-layers/<mood>/` và revision phải khác mode `expressions`. Missing quần chúng phải báo chưa có source, không fallback. Ctrl+C dừng server trong terminal đó.

```powershell
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-head-paint.test.ts tests/native-source-emotions.test.ts tests/native-head-face.test.ts tests/head-face-workbench.test.ts tests/native-head-bank.test.ts tests/native-head-bank-sources.test.ts tests/native-seat-tracer.test.ts tests/supporting-native-head.test.ts tests/topic-cast-source.test.ts
npm run tracer:native-seat -- --native-heads --face source-layers --acting emotional-reactions --staging lila-left --validate --frames --render
npm run tracer:native-seat -- --native-heads --face source-layers --acting emotional-reactions --staging lila-right --validate --frames --render
```

Tracer vẫn là silent draft trừ khi được cung cấp WAV đúng nội dung/clock. Không bỏ validation, tăng cap2MB, xóa actor/gesture/gaze hoặc đổi câu chuyện để vượt lỗi. Ca canonical sử dụng `renderCinematic` và pipeline master hiện có; standalone head preview không thay nghiệm thu video thật.

## Bằng chứng và phần còn thiếu

Bảy test callbacks mới **khai báo, NOT RUN**: exact source/legacy; hostile source/region/neck/crop/overlap; painter order và namespace refs; whole/slice/reverse seek/hand/face equivalence; compiler rear/head clock; hai staging qua năm canonical shots và byte cap; Studio route/revision/missing source. Build/typecheck không chứng minh các callback hay geometry đã pass.

Model test cần ghi full Git SHA, source hashes, command/exit, PASS/FAIL/NOT RUN, ảnh ghép trên thân và video tốc độ thật. Kiểm màu tươi/viền nguyên vẹn, đuôi tóc thực sự sau tay/ngực, không mất/nối gãy sợi tóc, không double alpha tại overlap, không reset ở cut, không làm lệch mắt/mũi/miệng hoặc bàn tay chạm cằm. Kiểm cả source layers và các mode cũ, cả vai primary/supporting của cùng story actor. [Review source-only 9router](reviews/native-head-paint-source-review-v1.json), [frozen input](reviews/native-head-paint-review-inputs-v1.md), [raw region counts](reviews/native-head-paint-raw-regions-v1.json) và [source record](reviews/native-head-paint-source-record-v1.json) không là bằng chứng hình ảnh. Raw RGBA của hai vùng Lila có 0 pixel theo heuristic màu da được ghi rõ trong record; phép đếm này không chứng minh partition/alpha/seam/identity. Review không đề xuất defect được xác nhận trong wiring factory hiện tại; các suy đoán về clock/nguồn/slot đã đối chiếu với code và không tự áp dụng.

Chưa xong: tạo hình faithful/profile/rear/full continuous head/body turns; cổ ghép kín khi nghiêng; tóc/vải có quán tính; tay/chân/grounded feet mềm và hợp lý; tool/prop/handoff/contact/shared ownership; môi trường day/sunset/night và màu vivid; quần chúng own views/emotions; input bất kỳ story/script/WAV, giữ text/audio/clock; EN chính, VI/JA/KO, external/local TTS/ASR; resume/rebuild/locks, video final có giọng/phụ đề và QC. Kết quả TEST-RESULTS V1 không chứng minh source0.62 hoặc full factory.

Giữ `productionReady=false`, `productionRig=null`, `availableBanks=[]`. Goal đầy đủ vẫn đang triển khai; không mở production chỉ để một tracer chạy được.
