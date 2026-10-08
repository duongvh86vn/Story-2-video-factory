# Lila/Karo — biểu cảm trong câu chuyện

Mốc tiếp theo0.37 có [native locomotion/cloth candidate](NATIVE-LOCOMOTION-HANDOFF.md). Phạm vi và18 test NOT RUN của0.36 dưới đây được giữ làm lịch sử; không dùng source mới làm kết quả test cho snapshot cũ.

Mốc source0.36, 08/10/2026. Source `b759b572d5c87c21f26af6993078f089ad0cea63`, base `354e628064e41c469467cbd222ccc6b372feca41`, branch `codex/prehistoric-life`. Đã push GitHub và kiểm local/remote cùng SHA; đây là tiến triển source của tool chung, chưa hoàn thành mục tiêu video sản xuất. Verdict và bằng chứng ghi trong [record](reviews/native-expressions-source-review-v1.md).

Full build, test:typecheck, schema export, whitespace và bounded source review đã qua; initial HOLD4P2s và các sửa được giữ trong record. Cả18 callback mới và các regression cũ liên quan chưa chạy. Không có chứng nhận mỹ thuật/chuyển động/audio/video hoặc ba input từ các check này.

## Chức năng mới

`appearance.bodyExpressions='registered-expressions-v1'` cho phép16 mood của contract hiện có trên cả Lila/Karo ở hai view 3/4 native độc lập. Chân mày dùng mực của PNG gốc trong region đã đo; mắt giữ glyph native, thêm độ khép mí; miệng có contour trung tính/cười/buồn/giận và aperture theo activity. Không scale/shear cả mặt, không đổi mũi/đầu/tóc/trang phục hoặc mirror một view thành view kia.

Lựa chọn này yêu cầu đủ:

```json
{
  "characterVariant": "karo",
  "artworkVersion": "forest-body-view-1",
  "bodyView": "three-quarter-left",
  "bodySpeech": "registered-rest-mouth-v1",
  "bodyEyes": "registered-eyes-v1",
  "bodyExpressions": "registered-expressions-v1"
}
```

Đây là appearance để ghép vào contract đầy đủ, không phải project hoàn chỉnh. Không có lựa chọn expression mới thì giữ hành vi cũ: view native chỉ nhận happy; script/WAV/story không tự bị sửa để tránh cảm xúc. Chọn expression không tự duyệt rig hay mở final.

Các mood: neutral, curious, thinking, concerned, effort, surprised, understanding, confident, happy, sad, angry, afraid, excited, disappointed, relieved, tired. Đây là control artwork theo các mood sẵn có, không chứng minh16 cảm xúc đều đọc rõ trên video. Laugh/body action, head/body turns, vải/tóc/chân tay không được suy ra từ lớp mặt này. Mắt không mở lớn vượt glyph nguồn. Silence/level0 giữ contour khép kể cả surprise; aperture nói chỉ từ activity đã sở hữu đúng cue, không suy phoneme hoặc giọng từ primary/supporting.

## Clock, cache và repair

Board binder lấy expressions của mỗi actor trong toàn run đã khai báo `continuous`, khi cast/view/profile/root/scale/stage/clock không đổi. Nó cộng shot.startMs, gộp cùng mood sát nhau và giữ ranh giới giữa mood khác nhau hoặc khoảng trống. Compiler dùng track gốc và ramp140ms hiện có, không bắt đầu lại cảm xúc ở camera cut. Khởi đầu/khôi phục biểu cảm vẫn nằm trong window thật; không kéo dài lời kể.

Optional expressions trên view-acting-clock2 chỉ dùng khi đã chọn candidate; clock cũ không có field vẫn giữ gaze/gesture/breath behavior. Nếu candidate mới nhận context thiếu track hoặc local projection khác nguồn thì chặn. Source identity/canonical/cache/publication binding chứa cả expressions của sibling; thay mood ngoài shot hiện hành cũng phải invalidate artifact đã phụ thuộc vào nó. Head renderer15/body compiler26 và expression fingerprint bao gồm measured ink regions/pose controls. Giữ source speech ownership/audio clock và source gesture clock riêng.

## Artwork và hạn chế thật

Không tạo hoặc sửa PNG nguồn ở mốc này. Karo dùng lại đúng hai tile resting-mouth0.35 đã đăng ký; Lila dùng native cheek strip. New expression layer lấy vùng da sạch để che đường miệng cũ, rồi vẽ contour, teeth/tongue nằm trong clip. Các image vẫn qua exact registered asset/hash/resolver và staging hiện có.

`scripts/native-brow-registration.ts` chỉ đọc pixel PNG native, đo connected component mực trong ROI/seed riêng, nới2px cho antialias và sinh SVG region cùng JSON hash. Không phải nhận dạng pose hoặc evaluator. Chú ý Lila trái hiện dùng **v2**, không v1; calibration thử đầu dùng seed cao quá đã chọn fringe. Đã đo lại đúng source v2, dịch brow/strip/ROI về source hiện hành. Không đổi file nguồn để làm khớp metadata.

Static authoring cũng lộ full-width Karo tile row lấy cả râu/nét cũ và kéo thành bars; đã đổi sang vùng da môi giữa tile. Đây là lỗi artwork đã phát hiện khi tác giả xem document, không là kết quả runtime. **Màu da vùng miệng Karo còn phẳng, seam/viền brow và nét mặt cần review mỹ thuật ở cỡ video.** Không gọi source hashes hoặc typecheck là identity approval.

- [Ink measurements](reviews/native-brow-registration-v1.json)
- [Lila phải — hình tĩnh](reviews/native-expression-art-lila-three-quarter-right-v1.png)
- [Lila trái — hình tĩnh](reviews/native-expression-art-lila-three-quarter-left-v1.png)
- [Karo phải — hình tĩnh](reviews/native-expression-art-karo-three-quarter-right-v1.png)
- [Karo trái — hình tĩnh](reviews/native-expression-art-karo-three-quarter-left-v1.png)
- [Manifest/controls/limitations](reviews/native-expression-art-v1.json)

Mỗi document có ảnh native đối chiếu,16 contour khép và6 shape aperture .65 được tác giả đặt trực tiếp; không phải frame sampled từ animation hoặc audio. PNG metadata/shape documents không là motion/render/pipeline acceptance.

## Bàn giao test — NOT RUN

18 callbacks mới chưa chạy: `tests/view-expression-track.test.ts` có11 ca schema/normalization/nonmutation/overlap/gap/half-open projection; `tests/native-expressions.test.ts` có7 ca explicit selection/default guards, resources/namespace, all moods/closed silence, actual activity/random seek, canonical two-actor role swap/source sibling binding, scene/report/security/production gates và workbench. Fixtures dùng stage kỹ thuật để kiểm contract, không quyết định nội dung tool thành máy móc hoặc một câu chuyện cố định.

Model test chạy trên source SHA được ghi trong record, tại worktree riêng:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/view-expression-track.test.ts tests/native-expressions.test.ts tests/native-rest-mouth.test.ts tests/native-source-gesture.test.ts tests/continuous-view-attention.test.ts tests/native-view-eyes.test.ts tests/source-speech-phase.test.ts tests/artwork-repair.test.ts
```

Ghi SHA, actual command/PASS/FAIL/NOT RUN và evidence. Kiểm playback/random seek/chuyển mood/gap/camera cut/đổi primary, mouth activity của người đang nói và người nghe, ánh nhìn, brow direction/duplicate ink/hair-edge/màu da/râu/viền ở tỷ lệ video. Đo compile time/scene byte size/frames/FPS cùng resource/security, cache/resume/repair/sibling edit. Không dùng segment-draft để tuyên bố audio thật hoặc phoneme sync.

## Khởi động Studio để model test kiểm

Node>=22.13; dependencies đã cài trong worktree này. Controller không mở/khởi động/restart server8850/8851 hoặc browser trong mốc này. Model test có thể chọn cổng riêng8851:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/projects-native-expressions-test'
```

Nếu cổng bận, launcher báo rõ và không dừng server khác. Giữ terminal mở; Ctrl+C để dừng. Preview riêng:

`http://127.0.0.1:8851/api/topics/prehistoric-life/body?action=rest&view=three-quarter-left&timeMs=1000&mood=angry&mouth=registered-rest-mouth-v1&eyes=registered-eyes-v1&expressions=registered-expressions-v1`

Đây là diagnostic pose bằng common renderer, tín hiệu giả lập có nhãn. Không phải phim đã nghiệm thu. Dùng cùng endpoint đổi view/mood; tool không âm thầm chọn overlays khi thiếu dependency.

## Mục tiêu còn lại

productionReady=false/productionRig=null, mọi final source/identity/voice/target/sync gate giữ nguyên. Tiếp tục mỹ thuật mặt/skin/mask, body/head turns/inbetweens, soft limbs/walk/run/jump/seating, vải/tóc, grasp/contact/props và vivid layered environments, rồi nghiệm thu script nguyên văn→voice/timeline/video, WAV giữ audio-clock→ASR/video, câu chuyện→kịch bản trung thành→video, legacy SRT, EN chính/VI/JA/KO và TTS local/ngoài. Lila/Karo là diễn viên trong truyện người dùng gửi; không buộc thành presenter hay plot ví dụ. Build/source checkpoint này không hoàn thành factory hoặc chứng minh video mượt ngang mẫu.
