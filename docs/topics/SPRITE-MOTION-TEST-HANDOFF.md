# Bàn giao test sprite motion

Source import/compile/CLI/API đã triển khai theo [kế hoạch và bằng chứng source](SPRITE-MOTION-IMPLEMENTATION.md); code snapshot `3ee1801` đã qua build/typecheck. Runtime assertions, browser playback và video **chưa chạy**. Build/typecheck không thay các kiểm tra dưới đây. Model được người dùng giao test ghi commit chính xác và kết quả thực tế, không dùng TEST-RESULTS V1 để nghiệm thu.

**Bổ sung hiện hành `5b283ad`:** importer nhận optional `anchors[]` đủ mọi playback position, frame-local và trong bounds; absent giữ shared anchor/legacy hash behavior. Ba ca mới trong `sprite-motion-import.test.ts` NOT RUN: repeated rect/world landmark khác anchor; complete/bounded atlas+strip; invalid registration không publish và thay anchor tạo immutable version. Existing corruption case thêm anchor tampering. Full build/test:typecheck/schema export exit 0, review source không có findings trong phạm vi mới. [Plan/review](reviews/sprite-frame-anchor-source-review-v1.md). Ba [atlas artwork](MOTION-ART-STUDIES.md) là candidate chưa đăng ký, không dùng làm fixture đã duyệt. Speech source đã nối canonical/Director/Studio ở mốc trước, [42 ca speech vẫn NOT RUN](SPRITE-SPEECH-TEST-HANDOFF.md).

## Môi trường

Yêu cầu Node ≥22.13 theo package.json; máy triển khai hiện dùng Node 24.19.0 và npm 11.6.1. Dùng dependency trong package-lock của dự án, gồm GSAP và Sharp; source adapter không cần cài sprite-gen, Python, RIFE hoặc tài khoản Grok. Test API dùng server riêng trong callback, không thao tác project đang mở ở cổng 8850. Các fixture tạm không phải asset sản xuất.

Chạy trên branch `codex/prehistoric-life` tại worktree trong lệnh bên dưới và ghi SHA chính xác vào kết quả. Checkout `D:/github/Story-2-video-factory2.1` đang có thay đổi riêng; Studio đang chạy từ worktree được chỉ định. Nếu model test dùng clone khác, checkout cùng commit bàn giao trước khi chạy.

## Phạm vi không gọi dịch vụ AI

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
# Chỉ model được giao test chạy các callback dưới đây:
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 `
  tests/sprite-motion-import.test.ts `
  tests/sprite-motion-player.test.ts `
  tests/sprite-motion-api.test.ts
```

Test tạm tự tạo trong callback, không phải model Lila/Karo đã duyệt. Lượt này không cần key/model/TTS/ffmpeg. Nếu một file chưa có hoặc source chưa xong, báo chưa đủ điều kiện thay vì sửa lệnh rồi tuyên bố toàn bộ pass.

## Kiểm tra hành vi cần có

1. Atlas giữ rect lặp, thứ tự phát và duration của từng instance; fps chỉ fallback khi durations_ms không có. Tọa độ landmark atlas được đổi đúng về frame. Landmark thiếu và timing không hợp lệ phải lỗi.
2. Strip đọc sibling PNG và delay_ms; anchor đăng ký rõ. Một cú đâm nguồn có loop=true nhưng đăng ký once phải chỉ diễn một lần. End hold/first/hide và rate không đổi native metadata.
3. Nhập lặp cùng source/registration trả cùng version; thay registration tạo version mới; sửa PNG/manifest bị phát hiện. Metadata-directory/registration-directory junction, path escape, payload lớn hoặc descriptor expansion phải bị chặn trước xuất file lỗi.
4. Tại clock ranh giới và seek ngẫu nhiên tiến/lùi, visibility/frame của GSAP phải khớp sampler trên clock chung `Math.round(seconds * 10000000) / 10000000` (0.0001 ms). Native duration vẫn giữ số thập phân; kiểm cả clock raw trước/trong/sau ô làm tròn, không đòi hai frame khác nhau ở hai thời điểm mà GSAP ánh xạ về cùng clock. Không mất pose, không hai cơ thể cùng hiện, không future tl.set hiện trước lúc bắt đầu. Chuyển frame dựa trên thời gian tích lũy, không cộng clock theo timer riêng.
5. World landmark đúng sau anchor, scale và rotation; rect lặp không làm trộn landmark hoặc anchor giữa hai instance. Explicit `anchors[]` phải đủ đúng số playback positions cho atlas và strip; empty/thiếu/thừa/nonfinite/vượt bounds phải lỗi trước publish. Nhập/sửa anchor giữ PNG bytes, tạo version mới, giữ manifest cũ; tamper frame anchor phải bị load integrity chặn. Không mirror model để giả view.
6. API/CLI trả candidate, không đổi audio/storyboard hoặc mark approved. Sheet route chỉ trả file theo đúng id+fingerprint+hash, không đọc đường dẫn tùy ý. Project busy/nguồn lỗi phải báo rõ.
7. Preview có play/pause/reset/seek và nhãn chưa duyệt; scene compiler vẫn đi qua subset GSAP hiện tại. Workbench controls không được nhét vào scene.js sản xuất hoặc làm lỏng validator.

## Nhập bundle thật sau khi source CLI/API đã bàn giao

Chuẩn bị metadata atlas hoặc strip, PNG và registration JSON. Atlas PNG phải nằm trong thư mục metadata; strip dùng PNG sibling. Registration ghi `version: actor-motion-registration-1`, `id`, `actorId`, `state`, `view`, `referenceHash` thực của ảnh gốc, `anchor` chung theo pixel frame, và `playback` gồm mode/end. Nếu origin khác nhau, bổ sung `anchors` với point đã đo cho từng playback position, kể cả rect lặp; không infer mặt đất từ alpha bounding box. Điểm neo chỉ căn placement, không sửa chân trượt/tỷ lệ/identity bên trong ảnh. Nếu cần contact với giáo hoặc đạo cụ, đăng ký landmark cho đủ mọi frame; importer không đoán điểm tiếp xúc. Hash chỉ ghi nguồn, không duyệt tạo hình.

Các lệnh dưới đây dành cho model test; thay đường dẫn và ID/version bằng giá trị thật:

```powershell
$motionProject = 'DUONG_DAN_PROJECT_CO_PROJECT_YAML'
$motionMetadata = 'input/motions/walk/atlas.json'
$motionRegistration = 'input/motions/walk/registration.json'
npm run cli -- motion-import "$motionProject" "$motionMetadata" --registration "$motionRegistration"
npm run cli -- motion-list "$motionProject"
npm run cli -- motion-preview "$motionProject" ID FINGERPRINT --port 8850
```

CLI preview in URL để mở trong Studio đang chạy; không tự render video. API import chỉ nhận hai path nằm trong project. Preview/sheet nhận ID+fingerprint đã lưu. API import trả candidate và không đổi storyboard, narration hoặc trạng thái duyệt. Sau khi chạy, báo đúng asset version/hash và frame lỗi thay vì chỉ ghi “chạy được”.

## Đánh giá art và diễn xuất

Sau khi có asset Lila/Karo theo ảnh gốc, model test xem **toàn chuỗi**, từng frame và nhiều góc/scale: tay/gối không đảo, chiều dài chi/tóc/áo không nhảy, cổ tay không gãy, hai grip/tip giáo nhất quán, chân không trượt, mặt/mắt/mũi/miệng giữ đúng model, màu ấm và viền áo rõ. Một PNG đẹp hoặc alpha hợp lệ không chứng minh các điều này.

Cần kiểm chuyển động vào–ra, hướng nhìn bạn diễn, phản ứng, biểu cảm và speech track trước khi đưa vào tập. Compiler full-body frame không tự có phoneme lip-sync hoặc sửa anatomy. Giữ topic production guard cho đến khi có evidence tương ứng.

Director/catalog/Studio và actorScene/canonical source đã được nối ở các mốc sau snapshot import đầu tiên; đó chưa là runtime acceptance. Còn actual approved action/view art, gaze/expressions, props/contact/handoff/receipts và video ba input có giọng. Import/preview hoặc một sheet đẹp không đồng nghĩa với Tạo video từ truyện đã hoàn thành hoặc đạt video mẫu.

## Báo cáo trả lại

Ghi commit, môi trường, lệnh/exit code, test nào PASS/FAIL/NOT RUN và lỗi có thể tái hiện. Với browser/video, ghi asset version/hash, clock/frame và file bằng chứng; phân biệt geometry, runtime và đánh giá bằng mắt. Không sửa source trong nhiệm vụ chỉ-test; chuyển lỗi cụ thể về người triển khai. Không ghi key hoặc nội dung .env.
