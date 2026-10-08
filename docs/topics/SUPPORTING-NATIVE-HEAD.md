# Đầu riêng cho diễn viên phụ — source0.59

08/10/2026. Nam phụ giữ bản v2 **đầu trọc, không râu/ria/mai**; nữ phụ toàn thân giữ nguyên v1. Trang phục trong rig dùng đúng asset Karo/Lila. Đây là phần triển khai tiếp bộ diễn viên cho câu chuyện bất kỳ, chưa nghiệm thu video hay mở sản xuất.

## Nguồn và lựa chọn explicit

| Mẫu | Ảnh toàn thân đang chọn | Đầu hướng bạn diễn ứng viên | Thân/trang phục |
|---|---|---|---|
| `prehistoric-male-bald` | `supporting-actors/male-bald-v2.png` | `head-cells/prehistoric-male-bald-head-left-v1.png` | Karo, góc trái |
| `prehistoric-female-haired` | `supporting-actors/female-haired-v1.png` | `head-cells/prehistoric-female-haired-head-right-v1.png` | Lila, góc phải |

Các đường dẫn bảng tương đối với `library/topics/prehistoric-life`. Hai đầu mới dùng built-in imagegen với ảnh toàn thân đúng mẫu làm tham chiếu, lưu raw PNG và prompt/provenance cạnh ảnh; không sửa/crop/recolor/mirror/warp bằng code. Nam trái1199×1312, SHA `8308c768b762c00b8d9aba4a1ed37f225c1c4b507591e51823778cca5091b674`; nữ phải1419×1109, SHA `7ab9bcd21fa122a711af6797c81f7d127b369de0588ea37306e53898eeeb7a58`. Raw PNG có alpha, không chạm mép canvas. Không có bằng chứng rằng AI giữ mọi chi tiết hoặc vẽ perspective độc lập; `independentRedrawProven=false`, `yawDeg=null`.

`packages/topics/supporting-face-candidates.ts` chỉ là catalog authoring. Hai JSON trong `head-face-registrations/supporting-{male-left,female-right}-face-v1.json` có tọa độ cổ/cằm/mắt/vùng miệng/da/protected ink đặt thủ công trên **chính đầu mới**. Chưa chạy geometry, chưa đo yaw hoặc kiểm seam. Không gọi các tọa độ này là hiệu chuẩn đã đạt.

## Code dùng chung với hệ thống

- `native-head-identity.ts` tách ID mẫu ngoại hình khỏi ID người trong truyện. Bank4 bắt buộc dùng primary/SHA của quần chúng và đúng body template; principal giữ phiên bản1–3, không thêm field/default vào canonical registration cũ.
- Host/Actor/storyboard/API/CLI schema nhận bank4 explicit. Resource reader/catalog loader kiểm prefix, raw SHA/dimensions/primary, body compatibility, đường dẫn giới hạn và không symlink. Nam có râu v1 bị giữ ở lịch sử, không thể đổi tên thành nguồn mới.
- `supportingNativeTopicAppearance` và `applyTopicCast` giữ bank/view/bodyMotion/bodySeat đã chọn hợp lệ; không âm thầm trả về đầu legacy. `characterVariant`, supportingModel, bank và bodyView phải được khai báo đúng, không suy đoán hướng/đầu. Name/role/sourceRefs/speaker assignments không đổi; nhiều người chung mẫu vẫn có ID/clock/mask riêng.
- Mặt dùng engine native face hiện hành, với vùng speech/eye/blink của riêng quần chúng. Không gán mắt/miệng/tóc/expressions/sourceColour của Lila/Karo. Body/cuffs/cloth/limbs dùng asset body template tương ứng, không lấy quần áo vẽ lại trong PNG generated.
- `sourceHead.ownerId` là **ID người trong truyện**, còn `bank.actor` là ID mẫu. Complete source head, speech và acting clock vẫn bắt buộc; camera cut không tự khởi động lại face/hand phase. Chỉ mở gaze khi có bank riêng đủ capability; legacy quần chúng vẫn chặn gaze/turn. Body turns, opposite facing, headTurns tự đoán, đổi cell khi think-contact và route thiếu source tiếp tục bị chặn.
- Workbench mặt hiện hành nhận thêm hai mẫu; dùng cùng `performanceScene`/renderer/GSAP, không có renderer mới. Khi chọn góc chưa có bản vẽ, báo `needs-head-face-candidate`, không mirror hoặc mượn mặt principal. Cache/revision/resource binding bao gồm identity/bank/source. Gallery vẫn chọn nam toàn thân v2/nữ v1.

Không tự gắn các candidate vào câu chuyện sản xuất. `productionReady=false`, `productionRig=null`, `availableBanks=[]`, `approved=false`, `motionVerified=false`. Nụ cười/miệng theo activity chưa phải phoneme lip-sync.

## Môi trường và lệnh bàn giao model test

**Chỉ model test của người dùng chạy phần sau.** Implementation agent không chạy callback, schema geometry, fixture, sampler, renderer, server/browser hoặc video. Source nằm tại C worktree; checkoutD và server8850 không tự nhận bản này. Node>=22.13, dependencies theo lockfile (TypeScript/tsx, Sharp, GSAP, Fastify/Vite); chưa cần model/TTS cho workbench im lặng. Không chèn key vào báo cáo.

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/supporting-native-head.test.ts tests/prehistoric-supporting.test.ts tests/native-head-bank.test.ts tests/native-head-face.test.ts tests/head-face-workbench.test.ts tests/native-head-seat-tracer.test.ts tests/story-actors.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/supporting-cast-studio-projects'
npm run studio
~~~

Mở gallery `http://127.0.0.1:8861/api/topics/prehistoric-life/supporting-actors`. Các chọn mặt explicit:

- `/api/topics/prehistoric-life/head-faces?actor=prehistoric-male-bald&view=three-quarter-left&action=point&look=ahead`
- `/api/topics/prehistoric-life/head-faces?actor=prehistoric-female-haired&view=three-quarter-right&action=think&look=ahead`

Workbench là chẩn đoán im lặng với activity `segment-draft`, không có giọng thật. So whole/second-half ở cùng original time, rest/point/think, ahead/up/down, forward/random/reverse seeks; geometry/capability lỗi phải báo và chặn. Ctrl+C dừng server. Không copy/reset/merge hoặc sửa checkoutD để chạy ca này.

**Bảy callback mới NOT RUN** trong `tests/supporting-native-head.test.ts`: own model/body/resources; nguồn ngoại lai/version/râu cũ/fingerprint/overlay bị từ chối; normalization giữ native appearance và người/thoại riêng; original mouth/eye/hand clocks qua cut; thiếu góc và revision sai; raw path/SHA/symlink; principal bank3 không được relabel thành bank4. Các test principal1–2 hiện hành phải tiếp tục đạt. Build/typecheck không thay kết quả này.

Model test cần thêm scene nhiều người trong **factory renderer**: Lila + Karo + hai nam trọc ID khác nhau + một nữ phụ. Kiểm costume/cuffs/skirt, scale/neck/hair/skin seam, mắt/mũi/miệng không lệch, source owner đúng người, chỉ speaker thật nói, occlusion/mask không lẫn qua camera primary swap. Ghi video tốc độ thường, audio thật khi có nguồn phù hợp, snapshot full/slice bằng same source clock, giới hạn scene2MB, exact Git SHA/PASS/FAIL/NOT RUN/log/ảnh/video. Không bỏ guard/tăng tolerance/scene cap để biến ca lỗi thành đạt.

## Phần còn cần làm

Geometry và artwork có thể cần sửa sau test; đủ góc đối diện/profile/rear, chuyển góc liên tục, cảm xúc và secondary hair riêng, acting/props/contact/đám đông và màu/viền trang phục cần nghiệm thu thực. Phản hồi nữ “khá ok” không chứng nhận head mới hoặc chuyển động. Source review9router chỉ góp ý code, không là test hình hoặc motion. [Packet, nguồn, response và đánh giá finding](reviews/supporting-head-identity-review-v1.json).

Full arbitrary story→script / script nguyên văn / WAV giữ audio-clock (+SRT), EN chính/VI/JA/KO, TTS ngoài/local, resume/locks/shot rebuild và finalMP4/audio/subtitle/QC tiếp tục thuộc mục tiêu chung. Kết quả V1 hoặc ảnh đề xuất không chứng minh ba luồng này hoàn tất.

## Kiểm source của phiên bản này

Build PASS (42 module,541ms), test:typecheck PASS, schema export PASS và static pack PASS. Kiểm raw SHA/RGBA/alpha/prompt/reference/original của hai đầu mới;17 file principal/definitions/nữ/nam toàn thân và nam có râu lịch sử giữ nguyên byte so với source0.58;15 code hash trong manifest và6 snapshot nguồn review khớp. [Bằng chứng và source binding](reviews/supporting-native-head-source-record-v1.json). Đây là kiểm source/artifact; bảy callback, schema geometry, server/browser, scene/pose/speech/gaze và video vẫn NOT RUN.

Git SHA thực tế lấy bằng git rev-parse HEAD sau khi nhận source. Không dùng kết quả V1 hoặc commit0.58 làm nghiệm thu0.59.
