# Đối chiếu mặt trên thân — source0.55

**Bổ sung source0.59 — 08/10/2026:** catalog/workbench4 nhận thêm quần chúng nam trọc không râu góc trái và nữ tóc ngang vai góc phải với own-model bank4, dùng body costume Karo/Lila. URL/default principal và renderer giữ cùng contract, không tự gán đầu mới cho production. Mẫu thiếu góc báo lỗi. [Nguồn, môi trường và lệnh kiểm cho model test](SUPPORTING-NATIVE-HEAD.md). Manual geometry, artwork và video NOT RUN/chưa nghiệm thu; giữ readiness false. Các mô tả source0.55–0.56 bên dưới là lịch sử principal.

Source0.56 tách loader exact source thành `packages/topics/head-face-source.ts` dùng chung cho workbench và [ca hai diễn viên native-head](NATIVE-HEAD-DIALOGUE.md). Public import cũ `headFaceCandidate` và URL/default/revision giữ nguyên; không thêm approval hoặc production selection.

Trang dành cho người dùng/model test kiểm mặt source0.51, Lila trái0.54 và Karo trái0.55 trên đúng thân native. Dàn diễn viên chính và quần chúng0.52 vẫn giữ nguyên. Mục tiêu cuối vẫn là story/script/WAV bất kỳ → diễn xuất đúng nội dung → video có giọng và QC; trang này không thay video nghiệm thu.

## Phạm vi triển khai

- Catalog cố định bốn definition: `lila-source-face-v1.json` / `karo-source-face-v1.json` cho góc phải, `lila-left-face-v1.json` / `karo-left-face-v1.json` cho góc trái. Kiểm schema, fingerprint và byte/hash nguồn; không nhận path hay bank tùy ý từ HTTP. Mỗi pair có head filename explicit, phải trùng definition và link PNG trên UI. Không tự chọn góc khác khi thiếu/lỗi.
- `view=three-quarter-left|three-quarter-right` chọn đúng cả đầu và body; default phải giữ URL0.53. URL resource mới có đoạn literal `/views/:view/` để không lẫn route legacy với đường dẫn PNG nhiều cấp. Mỗi definition phải khai báo chính xác một body view tương ứng và đúng source hash. Động tác point/gaze có target theo hướng chọn; không lật PNG hoặc nhập ROI của góc khác.
- Ghép source head, closed rest patch Karo, thân/quần áo, miệng và mắt bằng `performanceScene`/compiler/SVG hiện hành. Không viết renderer hoặc easing thứ hai cho preview.
- Có rest/point/think, hướng mắt trong góc đã đăng ký, full clock0–4000ms và camera slice2000–4000ms dùng cùng original acting/head/gesture/speech clock. Tua dùng GSAP timeline đã compile.
- Preflight binding/report trước khi nạp iframe; HTML/JS/CSS/PNG/vendor có revision từ profile/plan/original clock/resource SHA và GSAP byte SHA. Mỗi request kiểm source/vendor lại trước khi dùng cache tối đa4 scene text (mỗi scene≤2MB, vendor≤512KiB). Thay source/dependency giữa các request phải chặn, không trộn asset cũ/mới. Không cache image hoặc frame array.
- Speech activity là tín hiệu chẩn đoán cố định, **không có audio**, không gọi model/TTS/ASR, không ghi project/lock/approval. Không gọi đây là phoneme lip-sync.
- Lỗi geometry/source/compile phải hiện là lỗi, không đổi sang đầu cũ hoặc ảnh thay thế. Hai definition trái thủ công chưa thực thi geometry, chưa duyệt hair/neck/body seam. Karo rest trái V1 bị hold và chặn theo SHA; V2 chỉ là miếng ghép miệng, giữ chòm râu từ head gốc. Chưa có profile/rear hay quần chúng directional face; một cell yaw null không phải continuous turn. [Lila0.54](LEFT-DIALOGUE-HEAD.md), [Karo và đối thoại0.55](OPPOSING-DIALOGUE-HEADS.md).

## Môi trường và bàn giao

Node≥22.13; dependency GSAP hiện có; chạy source mới ở C worktree. CheckoutD và server8850 không tự nhận source này.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/head-face-studio-projects'
npm run studio
```

Mở `http://127.0.0.1:8861/api/topics/prehistoric-life/head-faces`. Ctrl+C dừng server trong terminal đó. Model triển khai không chạy server, compiler, sampler, browser hay test callback; chỉ kiểm build/typecheck/source theo phân công của người dùng.

Chọn Lila trái: `http://127.0.0.1:8861/api/topics/prehistoric-life/head-faces?actor=lila&view=three-quarter-left&action=point&look=ahead`. So với Karo phải ở trang riêng; chưa có scene hai actor cùng lúc trong workbench này. Kiểm cặp đối thoại trong pipeline/tracer sau khi geometry riêng hợp lệ.

Chọn Karo trái: `http://127.0.0.1:8861/api/topics/prehistoric-life/head-faces?actor=karo&view=three-quarter-left&action=point&look=ahead`; so với Lila phải. Cả hai cách bố trí đều cần kiểm source/head/body/speech/target thực, không lấy một góc làm bằng chứng cho góc còn lại.

Model test cần kiểm schema geometry trước; full/slice tại cùng absolute time phải có face/path/hand giống nhau, kể cả seek đảo/ngẫu nhiên và ở speech/blink/gesture boundaries. Kiểm cả hai actor: identity/hair/beard, neck/body scale, mask/strip/răng/lưỡi, không double ink/ghost/seam, source nguồn không đổi. Kiểm HTTP MIME/CSP/không cache, nguồn sửa/path lạ bị chặn và giới hạn scene2MB. Ghi exact SHA, command, PASS/FAIL/NOT RUN, log, ảnh ghép và video60fps/normal speed; không lấy gallery hoặc build làm bằng chứng motion.

6 callback trong `tests/head-face-workbench.test.ts` đã khai báo, **NOT RUN**: so evaluator full/slice và seek đảo/ngẫu nhiên ở speech/gesture boundaries cho bốn actor/view pair; source/revision/file/scene generator; actor/path/source/body-view tamper; API MIME/CSP/binding/readiness flags; left head/body/rest/revision không mượn actor/view khác; route explicit/legacy PNG nhiều cấp và link Karo trái đúng ảnh. Callback held-hash trong `native-head-bank-sources.test.ts` thêm plate V1, cũng NOT RUN. Dành cho model test:

```powershell
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/head-face-workbench.test.ts tests/native-head-face.test.ts tests/native-head-bank-sources.test.ts tests/prehistoric-supporting.test.ts
```

## Review source0.53 qua9router (lịch sử)

Một request GPT Luna,7.704 input +1.016 output = **8.720 token** provider báo; output cap1.500,4 nguồn text, không gửi ảnh/toàn repo, không retry hay chạy code. [Packet hash, nguồn, response và đánh giá](reviews/head-face-workbench-nine-router-review-v1.json).

Hai finding inline-script/unescaped selection không là lỗi đã chứng minh: code gửi review đã xóa inline initializer, và selection là enum/number strict. Finding opaque iframe/CSP chưa được chứng minh: thuật toán header CSP lấy self-origin từ response URL origin ([CSP3 §2.2.2](https://www.w3.org/TR/CSP/#parse-response-csp)), còn sandbox tạo opaque document origin ([HTML sandbox](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox)). Đây là đối chiếu đặc tả/source, **không là xác nhận browser chạy đúng**. Không thêm allow-same-origin hay nới CSP theo suy đoán của reviewer. Model test vẫn phải kiểm network, console, ảnh, script, bridge và timeline thực.

`productionReady=false`, `productionRig=null`, `availableBanks=[]` giữ nguyên. Đủ views, expressions, tóc/cloth/props/contact, world day/sunset/night, ba input, EN/VI/JA/KO/TTS local-external/resume/final còn phải hoàn thành và nghiệm thu. Runtime của phần mới: **NOT RUN**.

## Kiểm source0.53 ngày08/10/2026 (lịch sử)

- `npm run build`: PASS, core/Studio typecheck và Vite41 module557ms.
- `npm run test:typecheck`: PASS; chỉ typecheck, không gọi callback.
- `npm run schemas`: PASS; các contract JSON không đổi trong bản này.
- `node --import tsx scripts/prehistoric-pack.ts`: static inventory PASS,6 reference/12 candidate/6 head/2 garment/7 rejected, productionReadyfalse. Không chạy schema geometry definition hoặc compiler.
- Raw4head V1/V2 và2quần chúng khớp original;6 file lịch sử/4source chính/2face definition giữ nguyên. Manifest6bank code hash/4supporting code hash/new workbench code hash khớp.4input review đối chiếu raw SHA; excerpt giao Git đã chuẩn hóa CRLF→LF, giữ raw input riêng và ghi cả reviewed/delivered SHA trong report.
- Checker cũ0.52 ban đầu từ chối đúng version0.53 mới; đổi literal expected version trong checker rồi PASS, không bỏ invariant/source guard trong sản phẩm.

Các kiểm trên không chứng minh renderer chạy được, face registration hợp lệ khi thực thi, browser tải được asset hay video đẹp/mượt. Source test mới và video vẫn **NOT RUN**. Chỉ dùng exact SHA từ checkoutC/GitHub branch `codex/prehistoric-life` để ghi báo cáo; không dùng test V1/checkoutD/server8850 để chứng nhận bản này.
