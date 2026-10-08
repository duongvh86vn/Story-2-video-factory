# Giữ nguồn diễn viên qua storyboard — source0.60

08/10/2026. Mục tiêu vẫn là Cuộc sống thời tiền sử: **câu chuyện→kịch bản / kịch bản nguyên văn / WAV giữ giọng và clock → diễn viên trong sự kiện → video có audio/subtitle/QC**. Đây là sửa một lỗi nối luồng production, chưa là nghiệm thu tạo hình hay xuất video.

## Lỗi được xác định từ source

`createCreativeStoryboard` gọi `applyTopicCast` trên các shot chưa khóa trước khi `bindActorShot` xây profile/rig. Trước0.60, principal Lila/Karo luôn bị gán lại `topicAppearance(id)` với `forest-body-1`: đầu source bank, bodyView, speech/eyes/emotion, locomotion/seating và secondary đã chọn bị mất. Sau đó performer/profileHash/rig được tạo từ rig legacy, khiến nguồn storyboard và source head/body clocks không còn đúng lựa chọn. Quần chúng bank4 đã có nhánh giữ riêng từ0.59.

Ví dụ Lila có `forest-body-view-1`, `three-quarter-left`, bank3 và original sourceHead: trước sửa, appearance bị trả về `forest-body-1` nhưng sourceHead vẫn còn trong performance.0.60 giữ source appearance hợp lệ để renderer/binding nhận đúng bộ nguồn; không xóa sourceHead nhằm làm legacy pass. Bằng chứng ở source/caller, không phải kết quả pipeline runtime.

## Triển khai

- `packages/topics/cast-appearance.ts` dùng chung cho principal và quần chúng. Giữ đúng fields đã chọn hợp lệ: bodyView/bodyHeadBank/bodySpeech/bodyEyes/bodyExpressions/bodyMotion/bodySeat/bodySecondary/sourceColour. Palette/tỷ lệ/costume mặc định của topic được giữ; không tự chọn góc hoặc bank mới.
- Hai đường mặt là lựa chọn khác nhau: fixed-body face flags dùng ROI/tóc của **chính bản vẽ thân đó**; bank3/4 dùng face registrations/capabilities trên **đầu độc lập của nó**. Không trộn các overlay fixed view vào một bank có speech/eyes; khả năng nói không chứng minh ROI cũ đúng với đầu mới. BodyMotion/bodySeat có thể dùng với cả hai đường hợp lệ.
- Host schema/held-source/resource/cell/clock/identity/turn/contact/final guards giữ nguyên. Đầu principal vẫn các version1–3, quần chúng riêng version4. Model/body mismatched, đăng ký chưa đủ, head-only artwork hoặc overlay sai nguồn báo lỗi; không im lặng chuyển về mặt cũ.
- `applyTopicCast` kiểm toàn bộ cast của các shot được truyền vào trước, rồi mới thay kind/appearance và bỏ costume vẽ riêng. Nếu một người/shot lỗi, các người/shot trước đó chưa bị sửa. Name/role/sourceRefs/speaker assignments và tất cả performance/source clock không bị viết lại. Creative caller tiếp tục loại shot đã khóa khỏi normalization.
- `supportingNativeTopicAppearance` dùng cùng helper; không thay raw nam trọc không râu/nữ tóc hoặc nguồn costume. Native flags chỉ được giữ khi validation đúng, không nới approval.
- `creativeActingBrief` mô tả declared capabilities đúng với source đã cung cấp. Version1–2 không speech/directional eyes; version3 principal/version4 own supporting có thể dùng bounded activity-mouth/eye/blink theo đăng ký và original speaker/acting clocks. Seed-profile được phân biệt với locked-story-actor. Không gọi đây là phoneme sync, head/body turn, emotion/hair đầy đủ hoặc nguồn production đã duyệt.
- Topic version và manifest có normalization version2/fields/face paths/code hashes để visual source/cache không coi thay đổi này là source cũ. Narrative contract vẫn `prehistoric-story-contract-1`; không thay kịch bản hoặc audio để né nguồn hình thiếu. Resume/voice reuse cần được model test xác nhận thực.

Production vẫn chặn `needs-art-direction` trước model/TTS đối với topic chưa đủ bộ nguồn: `productionReady=false`, `productionRig=null`, `availableBanks=[]`. Không bật production chỉ vì normalization đã được sửa.

## Review source qua9router

Một request GPT Luna, chỉ bốn nguồn text/đoạn source giới hạn; provider báo7.348 input +1.115 output =8.463 token, output cap1.800, không retry hoặc gửi PNG/toàn repo. Finding đề nghị cho fixed face/hair flags đi cùng independent head bank bị **từ chối** vì khác nguồn/ROI; schema không bị nới. Parent làm rõ hai đường chọn nguồn và khai báo regression tương ứng. [Packet, snapshot nguyên văn, response và đánh giá](reviews/topic-cast-source-review-v1.json). Source advice không chứng minh geometry/anatomy/motion/video, không suy ra phần trăm quota tiết kiệm.

## Bàn giao model test của người dùng

Implementation agent **không chạy** các lệnh runtime dưới đây. Node>=22.13, dependencies theo lockfile; C worktree là source hiện hành. CheckoutD và server8850 không tự nhận source, không sửa/copy/reset/merge D. Lấy exactSHA trước khi test:

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/topic-cast-source.test.ts tests/supporting-native-head.test.ts tests/prehistoric-supporting.test.ts tests/native-head-bank.test.ts tests/native-head-bank-sources.test.ts tests/native-head-face.test.ts tests/creative-director.test.ts tests/story-actors.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/supporting-cast-studio-projects'
npm run studio
~~~

**Chín callback mới NOT RUN** trong `tests/topic-cast-source.test.ts`: fixed native controls trên hai principal/view; bank3 qua normalization→actual actor profile/rig binding với speaker/source clocks nguyên; atomic failure cả trong/qua shot; nguồn thiếu/sai hoặc trộn face paths bị chặn; riêng supporting bank4/person ID; legacy/RGB/disabled topic/narrative contract; actor locks; brief source capabilities; synthetic principal bank1–2 canonical round-trip. Synthetic metadata fixture chỉ chứng minh contract nếu đạt, không chứng minh artwork tồn tại hoặc đẹp.

Mở các workbench đã có tại server8861 để so native head/body/camera; không tạo renderer mới. Kiểm qua **factory renderer** và real narration khi model test đủ điều kiện: source selections và profile/rig/resources đúng người, khung camera/gaze/contact không reset ở cut, speaking owners đúng, cache/resume không lấy rig legacy, locked shots/cast bất biến. Lỗi geometry, seam, source capability hoặc cảnh>2MB vẫn phải báo và chặn; không đổi narration/voice/pose obligation để đạt một ca hẹp. Ctrl+C dừng server của model test.

Ghi exactSHA, log, PASS/FAIL/NOT RUN, profile/rig/resource hashes, snapshot/video tốc độ thường và bằng chứng input/clock. Kết quả V1 tháng10/2026 trong D `TEST-RESULTS.md` vẫn là bản cũ ngày01/10, chưa có bằng chứng0.59/0.60.

## Phần còn thiếu

Các nguồn mặt/cổ/mắt/miệng, soft limbs/cloth, nhiều hướng và continuous turn, partner/object gaze, props/contact, layered vivid environments cần geometry và normal-speed video acceptance thực. Story/script/WAV, EN chính/VI/JA/KO, external/local TTS, resume/locks/rebuild và final audio/subtitle/duration/layout/QC phải được nghiệm thu toàn luồng. Code correction/source checks không hoàn thành các yêu cầu đó. [Kiểm source riêng và artifact binding](reviews/topic-cast-source-record-v1.json).

## Kiểm source phiên bản này

Build PASS (42 module,529ms), test:typecheck PASS sau khi sửa fixture Narration, schema export PASS không có diff sáu schema liên quan, static pack PASS.18 manifest code hash và6 source snapshot review khớp;29 file artwork/registration/primary/model catalog và schema guards giữ nguyên byte so với0.59. Chín callback chỉ được khai báo/typecheck; geometry/rig/renderer/server/browser/voice/video/full pipeline NOT RUN. Lấy Git SHA hiện hành sau khi nhận source; không suy ra nghiệm thu từ các kiểm này.
