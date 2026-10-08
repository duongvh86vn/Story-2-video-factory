# Hai diễn viên đối thoại với đầu nguồn riêng — source0.56

Đây là đường kiểm chứng source, chưa phải video được nghiệm thu. Tool vẫn phục vụ câu chuyện/kịch bản/WAV bất kỳ. Hai mẫu quần chúng nam đầu trọc/nữ có tóc và trang phục Karo/Lila giữ theo [SUPPORTING-ACTORS.md](SUPPORTING-ACTORS.md).

## Đã viết source

- `createNativeHeadSeatTracer(repo)` chọn explicit Lila3/4 phải và Karo3/4 trái từ catalog bank3 của workbench. Loader nguồn dùng chung: exact definition/head filename/body view/hash, bounded resource reads, không nhận bank/path/URL từ model. Lỗi nguồn phải dừng, không dùng đầu cũ thay thế.
- Cùng canonical7.2s, năm camera slice, hai ghế và body/source clock hiện có. Mỗi actor lặp nguyên `sourceHead`0–7200ms riêng qua mọi shot; giữ `sourceBody` ngồi–đứng–đi, ID/sourceRefs/cue ownership. Gaze nhắm `actorTarget` mắt bạn diễn qua physical neck/head/body/source context.
- Bỏ bốn overlay đăng ký trên đầu cũ: `bodySpeech`, `bodyEyes`, `bodyExpressions`, `bodySecondary`. Giữ native body/cloth/seat/locomotion. Bank3 cung cấp local miệng/mắt/blink; chưa có emotion/secondary tóc của đầu mới. Không mirror/suy ra yaw/crossfade cả mặt/mượn ROI; một cell yaw null chưa là quay đầu liên tục.
- Exporter dùng chính `renderCinematic` và compiler/SVG/GSAP của factory. `--native-heads` bật đường mới; không flag vẫn tracer2/overlay fixed-view cũ. Report có scope/version riêng và `headSelection` với actor/view/definition SHA/bank fingerprint/source SHA. Giữ scene cap2MB và publication/resource guards.

Cue diagnostic vẫn là **SRT im lặng**, không giả làm script/TTS. Không WAV thì activity rỗng và không có chuyển động miệng nói giả lập. `--wav` nhận WAV thật7.2s, giữ bytes, đo activity và lọc theo actor-owned cue. Nội dung/speaker/waveform/clock/kiểu miệng cần model test kiểm; RMS/segment activity không là phoneme lip-sync.

`productionAcceptance=false`, `motionAccepted=false`, `phonemeLipSync=false`, `finalExportAllowed=false`, `productionReady=false`, `productionRig=null`, `availableBanks=[]`. Không gọi model/TTS/ASR, không sửa project/server hiện có. [Môi trường Chromium/HyperFrames/FFmpeg và artifact](NATIVE-SEAT-TRACER.md).

## Model test chạy, implementation agents không chạy

Builder/geometry/callback/tracer/browser/render/media đều **NOT RUN**. Các lệnh sau chỉ là hướng dẫn dành cho model test của người dùng:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
git status --short
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-head-seat-tracer.test.ts tests/native-seat-tracer.test.ts tests/head-face-workbench.test.ts tests/native-head-face.test.ts tests/actor-gaze.test.ts tests/native-source-seat.test.ts tests/prehistoric-supporting.test.ts
npm run tracer:native-seat -- --native-heads --validate --frames --render
```

Lệnh cuối xuất draft im lặng. Khi có WAV diagnostic đúng hai cue và7.2s, model test thêm `--wav` cùng đường dẫn tuyệt đối của file thực. Không bịa file, tự TTS, trim/stretch hoặc đổi cue để vượt gate. Factory/input thật cần nghiệm thu riêng; tracer không thay ba input của sản phẩm.

Không cần server để xuất tracer. Studio/gallery/face workbench riêng nếu cần:

```powershell
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/head-dialogue-studio-projects'
npm run studio
```

Giữ terminal; Ctrl+C dừng server này. Gallery quần chúng: `http://127.0.0.1:8861/api/topics/prehistoric-life/supporting-actors`. Trang mặt đơn: `/api/topics/prehistoric-life/head-faces`. Studio chưa có player hai người mới; cảnh hai người xuất qua tracer. Server8850/checkoutD không tự nhận source ởC; không copy/reset/merge D.

## Cần ghi bằng chứng

- Exact full SHA/diff, version Node/HyperFrames/GSAP/Chromium/FFmpeg, command/exit/raw log/root artifact, PASS/FAIL/NOT RUN; không dùng kết quảV1.
- Cả hai người cùng scene: đúng đầu/thân/cổ/tỷ lệ/màu/tóc/râu; Karo hai cuff có viền và Lila một váy. Không duplicate clip ID, ghost hoặc thay glyph giữa hai người.
- Gaze trỏ đúng mắt bạn diễn khi ngồi–đứng–đi, nhìn tự nhiên trên video tốc độ thường. Numeric projection chưa là optical acceptance.
- Đổi người nói3000ms; đổi primary/supporting theo camera không đổi quyền nói. Silence khép miệng, không double ink/chòm râu quanh Karo rest patch.
- Tại cuts900/2400/3800/4800ms, body/head/mouth/blink/contact/feet/cloth phase không reset. Kiểm forward/reverse/random seek và video60fps đầy đủ.
- Scene≤2MB, compile/seek/memory thực. Lỗi definition/geometry/cost phải sửa source, không tăng cap/tolerance hoặc chuyển slideshow.

Bốn callback mới trong `tests/native-head-seat-tracer.test.ts`: source/ownership/body run; speech/rendered eye targets/cut/reverse seek; factory resources/namespace/cap; invalid head/target/speaker publication. Tất cả NOT RUN. Hai assertion parser thêm vào callback cũ cũng chưa chạy. Typecheck chỉ kiểm TypeScript.

## Chưa hoàn thành

Geometry/head seam/identity/gaze/motion và normal-speed video mới chưa được nghiệm thu. Bố trí đảo Lila trái/Karo phải, gestures/emotions/turns/hair/props/contact và quần chúng nhiều hướng chưa được ca này chứng minh. Không gắn bank/ROI của hai người chính vào đầu quần chúng để vượt registration thiếu.

Sau kiểm chứng/sửa source mới đủ điều kiện mở production rig. Full arbitrary story/script/WAV → narration → cast/acting/world → voice/subtitle/final/QC, EN chính/VI/JA/KO, external/local TTS, resume/rebuild/locks vẫn chờ nghiệm thu. Không báo DONE vì build hoặc diagnostic xuất xong.

Một lượt GPT Luna qua9router source-only, text-only, cap1400, không retry:12.484 input +946 output =13.430 token provider báo. Parent xét từng finding với reader/resource/model source, không tự áp code hoặc coi model advice là runtime PASS. [Packet/hash/response và xử lý](reviews/native-head-seat-source-review-v1.json).

Kiểm source cuối08/10/2026: `npm run build` PASS (41 module,565ms); `npm run test:typecheck` PASS sau khi sửa hai lỗi narrowing report union; `npm run schemas` PASS, không đổi schema artifact; static `prehistoric-pack.ts` PASS (6 reference/12 candidate/6 head/2 garment/7 rejected). Raw source/primary/body/supporting/definition cũ không đổi;5 hash builder/exporter/workbench/catalog/loader và4 hash code quần chúng khớp manifest,4 callback mới chỉ được đếm như text, review bindings/runtime flags khớp, `git diff --check` PASS. Không gọi parser/geometry/builder/compiler/sampler/renderer/test callback/browser/API pipeline hoặc media. Runtime/video0.56 vẫn NOT RUN.
