# Mặt Lila/Karo theo nguồn riêng — source0.51, 08/10/2026

Mục tiêu vẫn là câu chuyện/kịch bản/WAV bất kỳ → hai diễn viên đúng mẫu, diễn mượt → video có giọng/phụ đề/QC. EN chính, VI/JA/KO, TTS local/HTTP/command và resume/locks không thay đổi. Đây là phần nối mặt theo source, **chưa phải video hoặc factory được nghiệm thu**.

## Source đã viết

- `native-head-face.ts`: mouth/eyes dùng tọa độ tuyệt đối của đúng PNG; strict source SHA/canvas/crop, polygon đơn và vùng edit lồi để chặn toàn bộ hull Bezier/transform. Mặt/mũi/tóc không bị warp. Mắt lấy glyph raster từ chính source, chỉ dịch/blink glyph; mí riêng, vùng màu mẫu riêng. Đường miệng/răng/lưỡi dùng cùng hàm tạo control points để kiểm cả hai đầu aperture0–1 và giới hạn nét.
- `native-head-bank-3`: mỗi cell bắt buộc có face registration đầy đủ và cả speech/directionalEyes. Bank1/2 tiếp tục false face capabilities và giữ canonical bytes; cấm nhét field face hoặc yaw null vào legacy. Một cell với yaw null có thể giữ góc nguồn, routes=[]; nhiều cell phải có góc numeric và route nhỏ như trước. **Một cell không phải quay đầu mượt.**
- Source plate Karo chỉ cấp patch miệng trong vùng khai báo, không được làm whole-face cell. Source/header/hash/resource/primary checks hiện hành áp dụng cả plate. Geometry/fingerprint khác kéo cache/source publication đổi; body compiler35/head SVG19.
- Compiler nối face state vào original head/acting/speech clock và refine mắt/path. Chỉ animation2.2.13/14/15; thiếu owned speech clock/owner sai phải chặn. Blink không reset qua cut. Gaze dùng physical eye anchor, reject target sau body view; thay cell trong chin-contact/observer gaze vẫn chặn. RMS là speech activity, **phonemeLipSync=false**.
- Khi aperture0, Karo chỉ giữ closed-mouth plate; group nét miệng sinh thêm có opacity0. Lila aperture0 giữ nụ cười V2 nguyên bản. Local patch dùng SVG alpha filter để paint alpha252 không làm lộ mắt/miệng cũ bên dưới; raw PNG không bị sửa. Patch boundary/độ mượt còn cần review ảnh ghép và video.
- Các capability này là contract nguồn và code path, không là chứng nhận identity/audio/gaze/diễn xuất. Expressions/secondary vẫn false; không dùng fixed-view overlays trên head cell khác.

## Nguồn và bản tọa độ

- Lila V2: `library/topics/prehistoric-life/head-cells/lila-head-source-angle-v2.png`, SHA05b555d2…; Karo V2: SHA d4b417a1…. Giữ nguyên raw PNG/source0.50.
- Karo closed rest: `library/topics/prehistoric-life/head-face-plates/karo-head-rest-source-angle-v1.png`, **1201×1309**, SHA `4df2e11ca43fb18bb5ff64b93222d1fe92da302d26509327afe647a6817173eb`. Built-in imagegen, exact prompt/provenance/alpha/pixel hash cạnh ảnh; original generated_images retained, raw copy matched. Edit target là Karo V2; primary kế thừa qua provenance, không gửi lại primary trong lượt edit.
- Hai definition JSON: `library/topics/prehistoric-life/head-face-registrations/lila-source-face-v1.json` và `karo-source-face-v1.json`. Parent chọn điểm/mask/neck/skull/scale từ quan sát chính V2; đo một số strip bằng raw pixels. **Chưa thực thi geometry schema hoặc editor/compositor với definition này.** Đây là engineering candidate có thể sai và cần model test sửa/ghi kết quả; không là registration được nghiệm thu.
- 5 strip được kiểm raw pixel: không có pixel tối theo ngưỡng RGB sum<160; alpha min251–253. Lila strip mắt phải bản đầu có3pixel đen, đã chọn lại vùng877,550,45×8 có0pixel tối. Không suy ra seam/colour match từ số đếm.
- Cả hai definition dùng body view three-quarter-right hiện hành. **Chưa có đầu nhìn trái/nghiêng/lưng mới, chưa đủ hai người quay vào nhau.** Không mirror hoặc đoán yaw0 để lấp chỗ trống.

## Hỗ trợ qua9router

Luna đề xuất module nhưng có type/geometry/render gaps; không tự áp dụng, parent viết lại. Gemini so KaroV2/rest thấy râu/lip/texture đổi và cảnh báo hard patch seam. GPT Sol review source hẹp tìm zero-aperture stroke/controls/rectangle-edge/partial-bank gaps; parent sửa. Các finding sau về thiếu matrix-error/path-error và precedence không phải lỗi đã chứng minh: excerpt bỏ đoạn source hiện có, và ternary có precedence thấp hơn ||. Parent đối chiếu code, thêm ngoặc cho rõ và bổ sung test đường miệng giữa frame (NOT RUN). [Báo cáo bound SHA input/output và giới hạn](reviews/native-head-face-nine-router-review-v1.json): 4 request thực, **54.508 token** provider báo; không quy đổi quota/chi phí. Không model nào chạy test/renderer/voice/video.

## Kiểm runtime — dành cho model của người dùng, NOT RUN

Kiểm source cuối lượt08/10/2026: `npm run build` PASS (40 module,552ms); `npm run test:typecheck` PASS; `npm run schemas` PASS. Static pack PASS:6 reference,12 candidate,6 head candidate,2 garment candidate,7 rejected. Đối chiếu raw bytes/prompt/original của4 head V1/V2,6 file lịch sử và6 code hash manifest PASS; availableBanks0/productionReadyfalse/productionRignull. Các lệnh này không thực thi geometry definition, compiler/sampler hoặc test callback, không chứng minh video mượt.

8 callback mới trong `tests/native-head-face.test.ts`: raw sources/definition geometry, nguồn sai/đổi mắt/protected paint, aperture/shift/strip/retrace bounds, Karo plate binding, SVG/state selector correspondence, original owned voice/cut/random seeks, unavailable turn/emotion/backward gaze reject, compile paths/matrices. Các callback cũ vẫn phải regression. Typecheck không thay thế thực thi.

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-head-face.test.ts tests/native-head-bank-sources.test.ts tests/native-head-bank.test.ts tests/native-head-track.test.ts tests/fixed-view-speech.test.ts tests/actor-gaze.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/head-turn-studio-projects'
npm run studio
~~~

Server mặc định8787; dùng8861 riêng, Ctrl+C dừng terminal đó. CheckoutD được bảo vệ; không copy/reset/merge. Tab8850 hiện có không chứng minh sourceC mới. Studio mặc định chưa tự chọn definition mới; test fixture load definition qua `nativeHeadBank`, nối đúng profile/complete head source/owned speech clock, mọi flagfalse. Trang head-cells vẫn là editor0.50; không gọi đó là preview pipeline mới.

Model test phải kiểm **geometry thực trước**, sau đó static composite + video60fps/normal-speed: miệng Karo khép ở silence, không double ink; mouth aperture/răng/lưỡi không bị clipping; blink/glyph không trôi/ghost, skin-strip không seam; cổ/râu/tóc/thân khớp và tóc không bị cắt. Kiểm seek ngược/random/camera slices, owned voice/no fallback, source changes/cache/resource/repair/publication/scene2MB. Ghi exactSHA, commands, versions, PASS/FAIL/NOT RUN, log và ảnh/video; TEST-RESULTS V1 ở D không chứng minh phần này.

## Phần còn thiếu để hoàn thành toàn tool

Chốt/sửa geometry/painter seam/body compatibility trên hình ghép thật; đủ hướng partner-facing/profile/rear và continuous correspondence; expressions/hair/whole-body/props/contact; màu world day/sunset/night. Sau đó full arbitrary story/script/WAV và legacySRT, EN/VI/JA/KO/external-localTTS/resume/locks/finalMP4/subtitle/thumbnail/storyboard/assets/productionQC. Không đổi thoại thành im lặng, không bỏ mặt/pose khó để né guard. availableBanks vẫn[], productionReady=false/productionRig=null; chưa có final mới được duyệt.

Yêu cầu bổ sung mới: hai model quần chúng nam đầu trọc và nữ có tóc, quần áo tương ứng Karo/Lila; ID diễn viên và vai nguồn riêng. Đây là phần triển khai tiếp theo, không coi head source0.51 là đã cung cấp hai model đó.
