# Lila/Karo — tóc và râu theo chuyển động

Ứng viên source0.39,08/10/2026, base `d609a6b615694f644782e3820d323d1764cdd716`, nhánh `codex/prehistoric-life`. [Record kiểm tra/review/publication](reviews/native-secondary-source-review-v1.md). Chưa có ảnh diễn xuất hoặc video0.39 được nghiệm thu.23 callback mới (12 temporal +11 geometry/integration) **NOT RUN**; test runtime tiếp tục giao model của người dùng.

## Phần đã viết

Trước đây tóc/râu native đi cứng theo đầu. Optional `appearance.bodySecondary='registered-secondary-v1'` bổ sung vùng tóc chỏm/đuôi tóc Lila hoặc chỏm tóc/râu dưới Karo. Có đăng ký riêng cho hai actor × hai góc3/4, ràng buộc exact PNG hash/kích thước; không mirror hoặc vẽ lại ảnh. Mặt, mắt, mũi, miệng và dây buộc tóc giữ lớp tĩnh. Bỏ field tiếp tục dùng artwork rigid; chọn tóc/râu không tự chọn mắt/miệng/biểu cảm hoặc body locomotion.

```json
{
  "characterVariant": "lila",
  "artworkVersion": "forest-body-view-1",
  "bodyView": "three-quarter-right",
  "bodySecondary": "registered-secondary-v1"
}
```

Đây chỉ là phần appearance để ghép vào profile đầy đủ. Actor nói vẫn cần mouth candidate và ownership/audio activity hiện có; actor đi/chạy/nhảy vẫn cần bodyMotion và đúng sourceBody khi cắt camera giữa động tác. Tóc/râu không thay thế diễn xuất, xoay thân, ngồi, cầm đồ hoặc hành động có nguồn.

`view-secondary-motion.ts` là filter truy cập ngẫu nhiên không giữ trạng thái: đọc head world pose tại0/40/80/120/160ms trước thời điểm hiện tại, trọng số1/4/6/4/1 chia16. Mỗi thời điểm clamp vào original actor run; đọc một lần cho mỗi tap khác nhau. Trung bình chênh lệch previous−current được xoay vào hệ đầu, đổi world/native scale, giới hạn radial tanh32native px và góc8°. Cửa sổ160ms có mean delay80ms; đây không là mô phỏng tóc vật lý hoặc dự đoán tốc độ từ narration.

Compiler lấy head anchor/lean từ cùng body/expression/breath evaluator. Context canonical dùng clock run nguyên bản, kể cả history trước camera slice. SourceBody đầy đủ cung cấp original gait/jump/posture; expression track và breath cũng giữ run phase. Không tự suy nối qua cut. Actor im lặng chỉ chọn tóc/râu cũng tham gia binder/source/cache/repair publication identity. Chỉnh sibling/cast/profile/track phải làm binding cũ không còn hợp lệ.

Lunge cục bộ chỉ dùng trong một shot. Nếu khai báo camera run continuous có lunge và chọn tóc/râu, binder chặn `needs-view-secondary-phase`: chưa có full original body/tool track cho động tác này nên không được lấy lịch sử từ shot mới. Test riêng giữ single-shot và cut tách biệt hợp lệ. Vùng râu dưới đã thu hẹp tránh cả điểm cổ; thêm kiểm tra vùng cổ48×48px vào khai báo ROI. Đây là kiểm tra source, chưa chứng minh các lớp ảnh kín và đúng nét khi phát.

`body-view-secondary.ts` chia texture nguồn thành24 tam giác, hai vùng/actor. Hàng gắn và hai mép bên cố định; đỉnh dùng chung, vùng mặt giữ tĩnh. Region displacement bị giới hạn riêng, area governor giữ≥40% diện tích ban đầu. Triangle clips chồng2native px và region/headClip nằm trong UV trước biến đổi; phần tóc di chuyển không bị cắt lại bởi silhouette tĩnh cũ. Những region/cage này do tác giả đặt trên PNG hiện hành, **chưa là layer separation hoặc tạo hình được duyệt**; chưa có hidden artwork/collision.

Camera đo cả các đỉnh texture đang biến đổi; compiler kiểm sai số matrix trên native vertices với limit0.2px sau scale. Key events có thêm causal delays; renderer/namespace/resource/security và scene-byte cap giữ nguyên. Body compiler29, body SVG15, head SVG16; selection/registration/temporal fingerprints và code hashes nằm trong manifest. Report luôn ghi approved=false/motionVerified=false/audioVerified=false.

Diagnostic `/api/topics/prehistoric-life/body` có lựa chọn **Tóc/râu**, query `secondary=registered-secondary-v1`; form/pose links giữ lựa chọn. Đây là trang xem một pose tĩnh theo thời điểm, không chứng minh playback hoặc video đã đạt. API/CLI/cast dùng cùng appearance schema; schema JSON được export từ Zod.

## Bàn giao model test

Windows, Node>=22.13 (implementation dùng24.19), dependencies npm đã cài; TypeScript/Zod/GSAP/HyperFrames/SVG/Sharp. Không cần dịch vụ image-to-video. Implementation không chạy TTS/ASR, test runtime hoặc khởi động/restart server8850/8851. Có một yêu cầu tư vấn source qua9router, hết thời gian chờ120s và không nhận verdict; agent review độc lập cũng hết quota. Không dùng hai lượt này làm bằng chứng PASS. Các nguồn script/WAV/story và ngôn ngữ/voice giữ contract hiện có.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/view-secondary-motion.test.ts tests/native-secondary.test.ts tests/view-source-body.test.ts tests/native-source-body.test.ts tests/native-locomotion.test.ts tests/native-source-gesture.test.ts tests/continuous-view-attention.test.ts tests/native-expressions.test.ts tests/source-speech-phase.test.ts tests/artwork-repair.test.ts
```

12 temporal declarations kiểm causal taps, mean lag, scale/rotation, clamp đầu run, shortest angle, radial limit, finite guards, scratch-object snapshot và random/reverse seeks.11 geometry/integration declarations kiểm đăng ký/ROI/cổ, pinned/shared vertices/area/displacement, matrix/bounds, cùng body/face state, whole vs sliced walk/jump và expression qua cả actor/view/scale, silent-only clock/cache, lunge continuity guard, compiler/camera/security/cap, canonical hai actor đổi primary, và diagnostic/brief/final gate. Tất cả callback và fixture/helper bên trong **chưa chạy** bởi implementation agents. Không dùng source review, typecheck hoặc test phiên bản cũ để suy PASS.

Model test ghi raw PASS/FAIL/NOT RUN và full SHA. Kiểm canonical project đủ camera slices; phát60fps/reverse/random seek, cả actor/view và scale .75/1/1.25. Tóc/râu phải mềm nhưng không lỏng khỏi đầu, không rung/reset qua cut, không méo mặt/mắt/mũi/miệng/dây buộc, không lộ khe hoặc duplicate texture. Kiểm head/cloth/body cùng phase và nguyên speech ownership. Thử run/jump/landing, mood changes, camera push/pull/primary swap; giữ khớp chân/tay và source action clock.

Đo compile time/RAM/scene bytes/GSAP calls/FPS.24 triangle targets mới có thể làm scene nặng; **chưa đo runtime**. Nếu vượt cap hoặc playback chậm, ghi FAIL và tối ưu compiler/track emission; không tăng cap hoặc bỏ guard để đạt PASS. Kiểm tài nguyên exact hash/namespace, sửa sibling/profile/content/voice và cache/resume/rebuild/repair. Không gọi script fixture thành nội dung bắt buộc của tool.

Model test khởi động Studio riêng:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/projects-native-secondary-test'
```

Giữ terminal mở; Ctrl+C dừng. Launcher báo nếu cổng bận, không dừng server khác. URL diagnostic mẫu:

`http://127.0.0.1:8851/api/topics/prehistoric-life/body?action=walk&view=three-quarter-right&timeMs=1050&mood=happy&motion=registered-locomotion-v1&secondary=registered-secondary-v1`

Đổi sang `walk-left`/`three-quarter-left` cho chiều trái. Muốn xem mặt/giọng giả lập thêm mouth/eyes/expressions đúng dependency; segment-draft không có audio thật và không là phoneme lip-sync.

## Toàn sản phẩm còn mở

productionReady=false/productionRig=null; không xuất final hoặc DONE từ candidate. Original identity/skin/miệng Karo/texture/seams/pose/soft limbs, full views/turns/inbetweens/seating, grasp/carry/tools/contact, vivid layered environments và toàn diễn xuất còn cần hoàn thiện/duyệt/test. Tool phải xử lý đủ script nguyên văn→voice/clock/video, WAV giữ audio-clock→ASR/video, câu chuyện→kịch bản trung thành→video, legacy SRT, EN chính/VI/JA/KO và TTS ngoài/local. Lila/Karo diễn câu chuyện bất kỳ người dùng đưa, không buộc host, plot thức ăn/săn/máy móc. Không có image-to-video API vẫn tiếp tục HTML5/SVG/GSAP. Source0.39 không chứng minh video ngang mẫu hay toàn mục tiêu đã hoàn thành.
