# Lila/Karo — thân, bước chân và vạt áo native

Mốc source0.37, 08/10/2026; base `0f30da0aec9c7c65dab6a31700aac95b41765406`, branch `codex/prehistoric-life`. Đây là phần tiếp của tool kể chuyện bất kỳ, không phải tập phim đã nghiệm thu. Source SHA/checks/review/publication ghi trong [record](reviews/native-locomotion-source-review-v1.md).

Full build, fresh test:typecheck, schema export và bounded source review đã qua;30 callback mới vẫn NOT RUN. Hai P2 source đã sửa và lỗi schema export trên Windows được giữ trong record; exporter hiện bỏ ghi chỉ khi byte được sinh mới bằng chính xác file hiện có, không bỏ lỗi hoặc dùng contract cũ. Các check này không chứng minh chất lượng video.

## Phần đã có source

Lựa chọn `appearance.bodyMotion='registered-locomotion-v1'` cho hai actor × hai view native độc lập. Schema host/cast/Shot/Storyboard/API/CLI dùng cùng field. Mặc định bỏ field vẫn giữ áo rigid và chặn locomotion native; không tự chuyển profile hoặc duyệt artwork. Chọn đúng chiều travel: `walk`/`run` với `three-quarter-right`, `walk-left`/`run-left` với `three-quarter-left`. Có jump, stand/crouch/lean và point/think/react; không mirror ảnh để tạo hướng đối diện.

Ví dụ appearance để ghép vào contract đầy đủ, không phải project hoàn chỉnh:

```json
{
  "characterVariant": "karo",
  "artworkVersion": "forest-body-view-1",
  "bodyView": "three-quarter-left",
  "bodyMotion": "registered-locomotion-v1",
  "bodySpeech": "registered-rest-mouth-v1",
  "bodyEyes": "registered-eyes-v1",
  "bodyExpressions": "registered-expressions-v1"
}
```

Mouth/eyes/expressions giữ dependency và source clock riêng. Chỉ bodyMotion có thể dùng cho actor im lặng mà không chọn các lớp mặt. Nói mà thiếu mouth candidate vẫn bị chặn. Voice/activity không suy từ primary/supporting; không có phoneme lip-sync mới.

`body-view-cloth.ts` đăng ký cage đai/vạt theo exact PNG hash/kích thước cho mỗi view; `view-cloth-geometry.ts` làm toán tam giác thuần. Phần thân trên giữ texture native. Đai là một hàng cố định, vạt dưới dùng12 tam giác chung đỉnh, hòa ảnh hưởng hai đùi, trễ90ms, gain0.7 và clamp18°. Governor giải điểm giao đầu của đa thức diện tích để giữ ít nhất25% diện tích trung tính; target có đảo thì phải giới hạn trước, mapping cuối vẫn từ chối đảo. Đây là giới hạn hình học, không là mô phỏng vải hay chứng nhận giải phẫu.

Nét đen và màu quần áo lấy từ cùng PNG/mask; không sửa PNG nguồn, vẽ lại mặt hay đổi trang phục. Mesh clip chồng mép theo pháp tuyến cạnh3 native px để giảm khe raster; các đỉnh texture được kiểm khi compiler chia frame, cùng limit0.2px hiện có. Matrix/clip/mask/use vẫn qua namespace/resource/security/cap hiện có. Body compiler27, body SVG14; head15 giữ nguyên. Metadata inventory cập nhật fingerprint/code hashes, không phải rig được duyệt.

Chân dùng các chain XYZ cố định, sole/ankle nguồn, lịch chân trụ/flight hiện có và nét hai cubic mềm. Candidate giảm phần gập ngang nhìn thấy bằng plane weight0.6; không kéo dài xương. Tay dùng trajectory/compiler chung. Cần kiểm cả cấu trúc lẫn độ đọc ở cỡ video; tên pose hoặc invariant hình học không bảo đảm dáng đẹp.

## Clock, continuity và giới hạn

Toàn walk/run/jump/posture và recovery phải nằm trong một shot. Binder chặn native motion trong run khai báo continuous qua camera cut, thay vì khởi động lại chân và giả là liền mạch. Static continuous run vẫn giữ breath/expression/gaze/source speech và lag vạt trên clock gốc, kể cả phần lag trước đầu shot. Đây chưa là source locomotion clock.

Motion-only actor cũng tham gia source/cache/repair/publication binding qua cùng canonical renderer. Sửa profile hoặc track phải invalidate hình; audio/narration không tự đổi. Cast roles/names/source refs và mọi final/source/identity/voice/target/sync gate vẫn giữ.

Chưa hỗ trợ native seated garment, continuous body/head turn, backward gait, hoặc grasp/carry/tool mới. Right-view spear/lunge candidate cũ giữ phạm vi riêng; không dùng mesh để suy thêm grip/contact. Tóc/râu vẫn đi cứng theo đầu. Karo rest-mouth skin/viền vẫn cần sửa mỹ thuật. Cảnh/nền, body silhouette/foot/mitten/texture, seam và pose dynamic vẫn chưa được duyệt.

## Artwork document tĩnh

`scripts/native-cloth-art.ts` chỉ đọc hash/kích thước PNG gốc và tạo SVG với góc đùi tác giả đặt trực tiếp:0, cùng chiều±14°, ngược chiều±14°. Mỗi actor/view có6 ô gồm native garment đối chiếu; tổng24 ô. Không có sampling thời gian, actor pose, compiler, audio, browser hoặc pipeline trong tool này.

- [Lila phải](reviews/native-cloth-art-lila-three-quarter-right-v1.png)
- [Lila trái](reviews/native-cloth-art-lila-three-quarter-left-v1.png)
- [Karo phải](reviews/native-cloth-art-karo-three-quarter-right-v1.png)
- [Karo trái](reviews/native-cloth-art-karo-three-quarter-left-v1.png)
- [Nguồn, controls và giới hạn](reviews/native-cloth-art-v1.json)

Bảng đầu lộ các đường sáng theo tam giác do expansion theo centroid không đủ ở cạnh dài; đã đổi sang offset pháp tuyến3px và xuất lại. Tác giả đã xem bốn bảng sau sửa; đây chỉ là bằng chứng chỉnh texture tĩnh, chưa artwork hoặc motion acceptance.

## Test độc lập —30 callback mới NOT RUN

20 declarations toán trong `tests/view-cloth-geometry.test.ts`;10 declarations integration trong `tests/native-locomotion.test.ts`. Các ca kiểm registration/schema/default, đai/diện tích, XYZ/chân trụ, flight/landing, random seek, activity, posture, rejection, hai actor/đổi primary/cut/static lag, canonical source/cache/security/cap, preview/model brief/final gate. Fixture stage kỹ thuật không quyết định tool thành phim máy móc. Không có ca callback nào được controller/helper agent chạy.

Model test chạy tại worktree riêng, ghi full SHA và raw PASS/FAIL/NOT RUN:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/view-cloth-geometry.test.ts tests/native-locomotion.test.ts tests/native-expressions.test.ts tests/native-rest-mouth.test.ts tests/native-source-gesture.test.ts tests/continuous-view-attention.test.ts tests/source-speech-phase.test.ts tests/forest-walk.test.ts tests/forest-action-poses.test.ts tests/artwork-repair.test.ts
```

Kiểm60fps/playback/random/reverse seek cả bốn actor/view, tỷ lệ .75/1/1.25 và crop thật, mọi contact/takeoff/landing/gesture/voice boundary. Chân trụ không trượt, gối không gãy, hai đùi không xuyên váy/quần, vạt không hở đai hoặc lộ chân cũ, Karo có đủ hai viền ống, mask/ink không seam/chồng. Mắt nhìn partner đúng, expression/mouth ownership giữ khi đổi primary; silence không nói. Đo compile time, memory, scene bytes, số call/frame và FPS; không nới cap2MB hay guard để che lỗi. Kiểm canonical hai actor với ảnh thật, cache/resume/rebuild/repair/sibling edit và source binding. Full ba input + voice/backend/ngôn ngữ + audio/video/QC vẫn cần test riêng sau khi art/motion đủ điều kiện.

## Chạy Studio để kiểm

Môi trường hiện có: Windows, Node>=22.13 (controller dùng24.19), npm dependencies đã cài; TypeScript/Zod/GSAP/HyperFrames/SVG/Sharp. Không cần API image-to-video. 9router và external/local TTS vẫn theo cấu hình riêng; mốc này không gọi model/TTS/ASR. Controller không khởi động/restart server8850/8851 hoặc mở browser.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/projects-native-locomotion-test'
```

Giữ terminal mở, Ctrl+C để dừng; launcher báo cổng bận và không dừng server khác. URL diagnostic:

`http://127.0.0.1:8851/api/topics/prehistoric-life/body?action=walk-left&view=three-quarter-left&timeMs=1050&mood=happy&motion=registered-locomotion-v1&mouth=registered-rest-mouth-v1&eyes=registered-eyes-v1&expressions=registered-expressions-v1`

Trang pose dùng common renderer và tín hiệu segment-draft có nhãn; không phải phim/audio thật. Đổi action/run-left/jump/crouch và timeMs; chọn góc đúng chiều. Form và navigation giữ motion selection. Production topic vẫn báo needs-art-direction, không DONE/final từ candidate.

## Toàn mục tiêu còn mở

productionReady=false/productionRig=null. Tiếp tục duyệt/sửa native mặt/skin/identity/pose/cloth/limbs, source locomotion/turns/inbetweens, tóc/râu, grasp/contact/props, vivid layered environments; rồi nghiệm thu script nguyên văn→voice/clock/video, WAV giữ audio-clock→ASR/video, câu chuyện→kịch bản trung thành→video, legacy SRT, EN chính/VI/JA/KO và TTS local/ngoài. Hai model là diễn viên trong truyện do người dùng gửi; không buộc plot săn, thức ăn, máy móc hoặc người dẫn. Build/source/artwork document này không chứng minh video ngang mẫu hay factory hoàn thành.
