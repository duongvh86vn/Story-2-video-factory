# Bố trí đối thoại và cử chỉ người nghe — source0.57

Source0.58 đổi riêng nam phụ sang ảnh không râu v2, nữ phụ giữ nguyên; xem [diễn viên phụ](SUPPORTING-ACTORS.md). Hai principal head/body và source dialogue timings trong tài liệu0.57 này không đổi. Kết quả kiểm dưới là lịch sử0.57, không thay nghiệm thu bản mới.

Chuyển tiếp từ [source0.56](NATIVE-HEAD-DIALOGUE.md), cùng renderer/cast/body/head/speech/source-clock của factory. Đây là source diagnostic, **chưa có nghiệm thu runtime, anatomy hoặc độ mượt**. Full tool vẫn phải nhận story/script/WAV bất kỳ và ra video có giọng/subtitle/QC; các preset dưới không phải kịch bản hay bố cục mặc định của sản phẩm.

## Hai bố trí độc lập

`--native-heads --staging lila-left|lila-right`. Tên flag nói về **vị trí trên màn hình**, không phải bên tay hoặc hướng mặt:

| Staging | Lila | Karo |
|---|---|---|
| `lila-left` | x380, body/head3/4 phải | x850, body/head3/4 trái |
| `lila-right` | x850, body/head3/4 trái | x380, body/head3/4 phải |

Cả hai giữ nguyên actor ID/tên/vai/cue ownership, chọn ảnh và registration riêng đã có. Không mirror PNG, đổi tên người hay hoán đổi tọa độ mặt. Mỗi layout có cùng hai ghế, original body/head run0–7200ms, năm camera slice và primary/supporting swap. Gaze nhắm physical eyes của đúng bạn diễn. Single cell yaw null vẫn chưa là continuous turn; art/masks/seams/độ tự nhiên chưa duyệt.

`createNativeHeadSeatTracer(repo,{staging,acting})` dùng strict `NativeDialogueSelectionSchema`. CLI chỉ cho hai field này khi có `--native-heads`; giá trị lạ hoặc thiếu flag phải lỗi trước khi export. Default không flag vẫn legacy tracer2; `--native-heads` không field giữ `lila-left/rest` như0.56. Native-head report version2 có `dialogueSelection`, head/definition/body/source hashes và publication binding riêng.

## Cử chỉ có clock gốc

`--acting rest|listening-think`. Mặc định `rest` giữ cue diagnostic cũ. `listening-think` có hai cue diagnostic explicit khác, **không sửa lời người dùng**:

1. 0–3000ms: “Lila and Karo sit down together. Lila talks while Karo listens and thinks.”
2. 3000–7200ms: “Karo replies while Lila considers his words. They stand and walk together.”

| Người nghe | Bắt đầu | Chạm cằm | Thu tay | Kết thúc |
|---|---:|---:|---:|---:|
| Karo nghe Lila | 1000 | 1700 | 2500 | 2900ms |
| Lila nghe Karo | 3200 | 3700 | 4200 | 4500ms |

Tay lấy từ `registeredBodyView(...).nearHand`: góc phải là rig-left, góc trái là rig-right. Đây là ánh xạ đã khai báo của rig, không suy ra giải phẫu từ trái/phải màn hình. Cằm lấy từ head cell của chính diễn viên; body/neck/gaze/hand giữ history gốc khi ngồi/rising hoặc đổi primary. Không kéo dài xương hoặc nới guard để ép tay chạm.

Core helper `projectViewSourceGestures` chia full source command thành các mảnh chính xác qua shot. Mỗi mảnh giữ source ID/hand/action/target/pole/start/reach/recover/end; thời gian local chỉ là giao của source và shot. Thiếu/đổi/nhân đôi mảnh làm original run validation lỗi. Target/span được clone; sửa shot không được sửa nguồn hoặc shot khác.

`GestureSourceSpan` giữ event explicit ở mili giây nguyên. Ramp mặc định hiện có có thể ra số lẻ; helper giữ đúng default bằng cách bỏ field explicit tương ứng, không làm tròn. Source event lẻ không biểu diễn được theo contract thì báo lỗi, kể cả shot không cắt qua cử chỉ đó. Helper này dùng lại được ngoài ca diagnostic; timing/target cho tập thật phải theo nội dung tập, không copy bảng trên.

## Môi trường và lệnh model test

Implementation agents không gọi builder/parser geometry/callback/compiler/sampler/renderer/server/browser/voice/media; **mọi lệnh dưới NOT RUN**. Model test của người dùng chạy. Môi trường Windows/Node>=22.13, dependency khóa/Chromium/HyperFrames0.8.96, GSAP local và FFmpeg/FFprobe như [NATIVE-SEAT-TRACER.md](NATIVE-SEAT-TRACER.md).

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
git status --short
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-source-gesture-project.test.ts tests/native-source-gesture.test.ts tests/native-head-seat-tracer.test.ts tests/native-seat-tracer.test.ts tests/native-head-face.test.ts tests/actor-gaze.test.ts tests/native-source-seat.test.ts tests/prehistoric-supporting.test.ts
npm run tracer:native-seat -- --native-heads --staging lila-left --acting listening-think --validate --frames --render
npm run tracer:native-seat -- --native-heads --staging lila-right --acting listening-think --validate --frames --render
```

Mỗi tracer tạo root mới, giữ diagnostic draft/SRT/report; không ghi project hoặc final. `--frames` bổ sung ảnh tại start/reach/recover/end của original hand commands và trước/sau1ms, cạnh mốc body/camera sẵn có. Chỉ thời điểm seek snapshot được làm tròn mili giây; source command không bị sửa. Không WAV thì không audio, activity rỗng, miệng không giả nói. Khi cấp WAV diagnostic đúng nội dung của acting đã chọn và7.2s, thêm `--wav` cùng đường dẫn tuyệt đối của file thực. Không trim/stretch/TTS tự động hoặc dùng WAV của cue cũ để tuyên bố aligned; content/speaker alignment vẫn phải kiểm riêng. RMS/segment activity không là phoneme sync.

Không cần server để xuất tracer. Studio/gallery riêng nếu cần:

```powershell
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/dialogue-acting-studio-projects'
npm run studio
```

Giữ terminal; Ctrl+C dừng server này. Gallery quần chúng: `http://127.0.0.1:8861/api/topics/prehistoric-life/supporting-actors`; workbench mặt đơn `/api/topics/prehistoric-life/head-faces`. Player hai người xuất qua tracer, chưa có tab riêng trong Studio. Server8850/checkoutD không tự nhận sourceC; không copy/reset/merge D.

## Điều cần kiểm và phần còn thiếu

- Ghi exact SHA/diff/env/command/raw log/exit/root và PASS/FAIL/NOT RUN; xem video60fps tốc độ thường, so với primary và mẫu người dùng, không dùng báo cáoV1.
- Cả hai bố trí giữ đầu/tóc/râu/trang phục/scale/neck seam/màu; Lila một váy, Karo hai cuff có viền. Không đổi identity khi đảo vị trí hoặc swap primary.
- Người nghe nhìn bạn diễn, cằm/tay tiếp xúc hợp lý xuyên sit/rise/camera; cổ tay/khuỷu/shoulder không bật, đảo hoặc xuyên mặt/râu. Cử chỉ này chưa chứng minh toàn bộ acting vocabulary.
- Compare evaluator whole-run với slices tại cut/approach/contact/recovery/end và random/reverse seek, cả body/head/hands/cloth/gaze/mouth/blink. Source/span/target/speaker thay đổi phải invalidate publication.
- Kiểm scene≤2MB, compile/seek/memory, resource/namespace, subtitles/audio/duration. Lỗi thật phải sửa source, không nâng cap/tolerance hoặc thay ảnh tĩnh.

Thêm bốn callback projector và hai callback paired staging/acting; mở rộng parser assertions. Tất cả **NOT RUN**. Whole-run control trong callback chỉ đối chiếu evaluator, không phải engine/render thứ hai hay video acceptance.

Hai quần chúng nam đầu trọc/nữ có tóc giữ own head/source/ID/role/thoại và asset trang phục Karo/Lila. Cử chỉ/head bank của hai nhân vật chính không tự cấp directional views/face/turns cho quần chúng. [Phạm vi quần chúng](SUPPORTING-ACTORS.md).

Vẫn thiếu geometry/art/anatomy/optical gaze/normal-speed motion acceptance, đủ bảy view/continuous turns/emotions/hair/props/contact và world ngày/chiều/đêm có màu đúng. Production toàn chủ đề vẫn false/null/no available bank. Arbitrary story/script/WAV, EN chính/VI/JA/KO, TTS ngoài/local, resume/locks/finalaudio/subtitle/QC chưa hoàn thành; không báo DONE từ build hoặc tracer.

## Kiểm source khi bàn giao — 08/10/2026

`npm run build` PASS (41 module Studio, Vite515ms); `npm run test:typecheck` PASS; `npm run schemas` PASS, không đổi schema đã lưu. Đây là compile/typecheck/export, **không chạy callback test hoặc geometry**. Static pack ghi version `forest-tribe-0.57-dialogue-acting`, sáu reference, mười hai candidate, sáu head candidate, hai garment candidate, bảy artifact bị reject và productionReady=false. Hash catalog/projector/builder/exporter được gắn vào manifest; ảnh/definition và hai mẫu quần chúng giữ nguyên.

Kiểm raw bytes/JSON riêng xác nhận14 code hash,18 asset/definition vẫn trùng bản đã lưu Git và năm review snapshot đúng SHA. Không import/evaluate project schema, geometry hoặc renderer trong kiểm tra này. Các trường productionReady=false, productionRig=null và availableBanks=[] giữ nguyên.

Một lượt review source qua9router bằng Gemini, tổng18.017 token (17.610 input/407 output), cap output1200, không retry. Hai đề xuất chưa được chứng minh: validator đã kiểm full track/khả năng biểu diễn event trước khi bỏ qua empty slice; actor definition đã có appearance đúng view và `bindActorShot` lấy rig/profile của primary thực tế. Không áp code từ model tự động. [Packet, SHA đầu vào, năm snapshot byte gốc và adjudication](reviews/dialogue-acting-source-review-v1.json) giữ lại để đối chiếu. Đây là review source, không duyệt art/anatomy/chuyển động.

Sáu callback mới, regression, builder/geometry/sampler/renderer, browser/server, WAV/TTS/ASR và video đều **NOT RUN** trong lượt triển khai này. Model test của người dùng thực hiện các lệnh và trả evidence ở mục trên; build, inventory hoặc review model không thay nghiệm thu runtime.
