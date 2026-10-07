# Bàn giao test — Sprite actors gắn với câu chuyện

## Trạng thái và phạm vi

Source mới: stage compositor và adapter `Shot → actor fragment`. Runtime **NOT RUN**, gồm assertions, GSAP VM, browser, render, audio, MP4 và nghiệm thu hình. Không có asset Lila/Karo chuyển động mới được tự duyệt. `productionReady=false`, `speechSync=none`, topic production gate giữ nguyên.

Fragment dùng artwork nguyên trong PNG đã nhập: không dựng lại mắt/mũi/miệng bằng bone, không mirror view và không cắt once clip cho vừa audio. Đây chưa phải renderer scene canonical hoặc video hoàn chỉnh. Có thể dùng module trong test; chưa có nút Studio chọn sprite actors cho production.

## Môi trường

- Checkout source nhánh `codex/prehistoric-life` tại `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`.
- Node theo `package.json` (>=22.13), npm lockfile hiện có; GSAP, Zod, TypeScript đã khai báo trong dự án.
- Không cần key model/TTS/9router cho các ca pure/GSAP VM dưới đây. Không dùng server 8850 hoặc project người dùng làm fixture.
- Motion thật nhập bằng bridge CLI/API trước, với registration anchor/landmark đo theo pixel; load bằng `loadActorMotion` để kiểm bytes/fingerprint. Compositor nhận descriptor trong RAM; riêng thao tác compile không chứng minh file PNG còn nguyên.

## Lệnh dành cho model test (chưa chạy)

```powershell
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/sprite-story-stage.test.ts tests/sprite-story-binding.test.ts
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/sprite-motion-player.test.ts
```

File stage có 12 ca, binding có 8 ca được khai báo. Ca cuối stage sử dụng GSAP thật trên opacity/AttrPlugin targets trong VM để kiểm seek hai chiều, cả X/Y/rotation/scale và active frame; không chứng nhận browser paint hoặc anatomy. Regression player cần chạy vì clock được chuyển sang helper chung và phần preflight event được tách tên. Có ca IDs dễ gây trùng selector và nested performance ID sai.

## Cần xác nhận khi chạy

1. Clip hiện đúng khoảng `[start,end)`, native hold không tràn vào clip tiếp theo; gap và scene end ẩn. Hai actor không dùng nhầm frame, asset hoặc selector của nhau.
2. Root dịch/chuyển/rotate/scale/ease khớp sampler khi seek hai chiều, ở clock lẻ và biên lượng tử hóa. AttrPlugin nội suy các thành phần thay đổi ở precision 4 decimals; endpoint/static giữ nguyên. Không mirror; không sinh artwork giả trong gap.
3. Landmark tiếp xúc được đo sau placement và root, target thuộc scene thật, missing/hidden/out-of-tolerance phải lỗi. Đây chỉ là kiểm các điểm đã khai, chưa phải contact liên tục/foot planting.
4. Tổng event cap không truncate, compiler chỉ sinh literal GSAP trong validator hiện có. Caller sở hữu một paused timeline và pad đến đủ duration.
5. Shot binding giữ id/clock/dimensions/cast/source refs. Ref ngoài shot, thêm narrator, thay actor hoặc target tưởng tượng phải lỗi. Sourced dialogue phải báo `needs-sprite-speech`, không giả lip-sync.

## Công việc sản phẩm còn thiếu

- Renderer canonical với sprite actors, camera/captions/art planes/prop semantics và geometry report phù hợp; không giữ rig simulator giả phía dưới.
- Stage PNG nguyên bytes, descriptor/version identity vào lock/resume/rebuild/final export; chọn asset từ catalog đã nghiệm thu trong pipeline story, không hardcode motion ID.
- Art chuyển động Lila/Karo theo ảnh gốc, đa hướng/biểu cảm/poses, outline quần áo và màu đủ đậm; nghiệm thu anatomy/face registration/fluidity bằng hình và video thật.
- Mouth/voice, gaze, contact liên tục/foot support; kiểm WAV gốc và các input script/story ở EN/VI/JA/KO.
- Chưa có ca browser/scene pipeline/MP4 mới; không lấy ca VM hoặc kết quả V1 làm nghiệm thu sản phẩm.

Ghi kết quả vào một MD có commit kiểm thử, lệnh, exit code, assertion failure và bằng chứng hình/video. Chỉ nói PASS trong phạm vi đã thực chạy; ghi NOT RUN cho phần chưa chạy.
