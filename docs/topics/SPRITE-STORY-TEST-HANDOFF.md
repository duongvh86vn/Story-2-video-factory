# Bàn giao test — Sprite actors gắn với câu chuyện

## Trạng thái và phạm vi

Source: stage compositor/Shot binding tại `8b4b930`, renderer canonical opt-in tại `5e396a7`, sửa resource review/contact ownership/contact camera tại `d1fb7e4`. Runtime **NOT RUN**, gồm assertions, GSAP VM, browser, render, audio, MP4 và nghiệm thu hình. Không có asset Lila/Karo chuyển động mới được tự duyệt. `productionReady=false`, `speechSync=none`, topic production gate giữ nguyên.

`cinematic.spriteStage` chọn branch canonical riêng: PNG được xác minh và stage nguyên bytes, world art/model/foreground/camera dùng timeline chung. Geometry có `kind: sprite-actors`; không giả rig hash, bone metrics hoặc miệng. Shot không có field vẫn dùng branch cũ nếu không explicit chọn sprite. Source catalog/Studio đã bổ sung ở `d974dbd`, xem [bàn giao thư viện](SPRITE-CATALOG-TEST-HANDOFF.md); bộ diễn xuất được nghiệm thu và video hoàn chỉnh vẫn còn thiếu.

## Môi trường

- Checkout source nhánh `codex/prehistoric-life` tại `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`.
- Node theo `package.json` (>=22.13), npm lockfile hiện có; GSAP, Zod, TypeScript đã khai báo trong dự án.
- Không cần key model/TTS/9router cho các ca pure/GSAP VM dưới đây. Không dùng server 8850 hoặc project người dùng làm fixture.
- Motion thật nhập bằng bridge CLI/API trước, với registration anchor/landmark đo theo pixel; load bằng `loadActorMotion` để kiểm bytes/fingerprint. Compositor nhận descriptor trong RAM; riêng thao tác compile không chứng minh file PNG còn nguyên.

## Lệnh dành cho model test (chưa chạy)

```powershell
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/sprite-story-stage.test.ts tests/sprite-story-binding.test.ts
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/sprite-motion-player.test.ts
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/cinematic-sprites.test.ts tests/async-planning-normalize.test.ts
```

File stage có 12 ca, binding có 8 ca được khai báo. Ca cuối stage sử dụng GSAP thật trên opacity/AttrPlugin targets trong VM để kiểm seek hai chiều, cả X/Y/rotation/scale và active frame; không chứng nhận browser paint hoặc anatomy. Regression player cần chạy vì clock được chuyển sang helper chung và phần preflight event được tách tên. Có ca IDs dễ gây trùng selector và nested performance ID sai.

Canonical scene có 11 ca và async normalization có 2 ca khai báo ở `5e396a7`; chưa thực chạy. Chúng kiểm branch/legacy, world/camera, cast/clock, sourcedAction, landmarks, contact trước response, speech/props/continuity blockers, snapshot ownership, immutable PNG và lock, final/QC gate, cùng việc await domain validation trước receipt. Fixture ảnh vuông chỉ kiểm contract, không thay asset Lila/Karo hoặc nghiệm thu anatomy.

Tại `d1fb7e4`, thêm ba ca: allowlist sheet ứng viên đúng bytes và từ chối staged corruption; two-hand contact không được gộp hai diễn viên; contact camera giữ object/label/response khi crop hoặc push-in. `36e2172` thêm assertion đích `relationTo` bị crop vào ca camera đó. `d974dbd` thêm ca explicit renderer không fallback: tổng hiện tại **15 ca canonical scene + 2 ca async normalization**, tất cả NOT RUN. Source review renderer trước mốc catalog PASS sau sửa; xem [accumulator](reviews/canonical-sprite-source-review-v1.md). Không suy diễn verdict cũ cho source mới.

Build, `npm run test:typecheck`, schema export và diff check đã qua trên source này. Kiểm kiểu không thực thi callback hoặc assertion.

## Cần xác nhận khi chạy

1. Clip hiện đúng khoảng `[start,end)`, native hold không tràn vào clip tiếp theo; gap và scene end ẩn. Hai actor không dùng nhầm frame, asset hoặc selector của nhau.
2. Root dịch/chuyển/rotate/scale/ease khớp sampler khi seek hai chiều, ở clock lẻ và biên lượng tử hóa. AttrPlugin nội suy các thành phần thay đổi ở precision 4 decimals; endpoint/static giữ nguyên. Không mirror; không sinh artwork giả trong gap.
3. Landmark tiếp xúc được đo sau placement và root, target thuộc scene thật, missing/hidden/out-of-tolerance phải lỗi. Đây chỉ là kiểm các điểm đã khai, chưa phải contact liên tục/foot planting.
4. Tổng event cap không truncate, compiler chỉ sinh literal GSAP trong validator hiện có. Caller sở hữu một paused timeline và pad đến đủ duration.
5. Shot binding giữ id/clock/dimensions/cast/source refs. Ref ngoài shot, thêm narrator, thay actor hoặc target tưởng tượng phải lỗi. Sourced dialogue phải báo `needs-sprite-speech`, không giả lip-sync.
6. Camera sprite kiểm các clock output/native frame/key/contact, bounds và landmarks theo scope trong report; chưa phải chứng minh contact/visibility liên tục. Đối chiếu browser seek với sampler, gồm pan/push-in và frame biên. PNG staging không re-encode; sửa PNG/descriptor hoặc file staged phải làm input outdated hoặc chặn locked scene.
7. Draft có sprite candidate không được render final, QC PASS, export/DONE hoặc tải final dù review ảnh pass. Thực chạy cả pipeline resume và route download, không chỉ engine gate. Giữ artifacts/locks/audio hợp lệ; test sửa stage, đổi motion fingerprint và rebuild shot.
8. Await validator bất đồng bộ trước khi ghi accepted receipt/result hash; rejected descriptor phải đi vào domain repair. Kiểm thêm cache reuse cùng input và invalidation khi asset context thay đổi.

## Công việc sản phẩm còn thiếu

- Runtime renderer canonical/camera/staging và lock/resume chưa kiểm; acceptance receipt/final export cho asset được duyệt chưa triển khai. Catalog selection/Studio có source ở `d974dbd`, UI/pipeline runtime chưa kiểm.
- Speech/head/expression tracks, props/handoff/contact liên tục chưa hỗ trợ trong branch sprite; hiện báo blocker thay vì dùng rig giả. `sourcedAction` và motion state chỉ là khai báo ràng buộc nguồn, không chứng minh frame đang thực hiện đúng hành động.
- Art chuyển động Lila/Karo theo ảnh gốc, đa hướng/biểu cảm/poses, outline quần áo và màu đủ đậm; nghiệm thu anatomy/face registration/fluidity bằng hình và video thật.
- Mouth/voice, gaze, contact liên tục/foot support; kiểm WAV gốc và các input script/story ở EN/VI/JA/KO.
- Chưa có ca browser/scene pipeline/MP4 mới; không lấy ca VM hoặc kết quả V1 làm nghiệm thu sản phẩm.

Ghi kết quả vào một MD có commit kiểm thử, lệnh, exit code, assertion failure và bằng chứng hình/video. Chỉ nói PASS trong phạm vi đã thực chạy; ghi NOT RUN cho phần chưa chạy.

## Bộ hình/chuyển động phải nghiệm thu tiếp

Khi có motion thật từ sprite-gen hoặc provider khác, nhập asset ứng viên với registration đã đo. Không dùng fixture vuông hoặc source hash để duyệt art. Giữ hai ảnh cận Lila/Karo của người dùng làm chuẩn; các character sheet bổ sung là tham khảo, không tự thay mặt/tóc/trang phục.

| Mẫu cần xem | Bằng chứng phải lưu | Tiêu chí hình/diễn xuất |
|---|---|---|
| Pose nghỉ front/3-4/side trái và phải | Cặp source/asset cùng tỷ lệ, nền sáng và tối | Mắt/mũi/miệng đúng mặt; tóc/râu/viền áo và màu ấm; bất đối xứng không đổi bên |
| Nghe/nói/phản ứng với bạn diễn | Clip hai diễn viên nhìn nhau, seek và frame-by-frame | Đầu/mắt hướng đúng người; không nhìn khán giả suốt cảnh, không trượt mặt hoặc ghost body |
| Đi/chạy/nhảy | Chu kỳ đầy đủ và transition vào/ra, contact sheet, video | Tay/chân mềm, gối/khuỷu không đảo phía; chân trụ và tiếp đất hợp lý; seam không giật |
| Hai tay cầm/nhắm/đâm giáo | Cả rest/anticipation/contact/recovery, grip và tip mỗi frame | Giáo đủ dài và cứng; cả hai bàn tay bám cán đúng, không xoắn cổ tay/khuỷu; hành động một lần không tự lặp |
| Nhặt/cầm/đặt/chia thức ăn | Đạo cụ và bàn tay trong cùng clip, before/after response | Chạm trước khi vật phản ứng; tránh xuyên thân, rơi khỏi tay hoặc đổi người nắm vô cớ |
| Cảnh có lời EN/VI/JA/KO | WAV/TTS, subtitle clock và video thành phẩm | Nội dung theo input; không gọi mouth theo đoạn là phoneme lip-sync; giọng và phụ đề khớp clock |

Branch sprite hiện chặn speech, rig props, continuous handoff và final; những hàng tương ứng là **công việc sản phẩm cần thực hiện**, chưa phải chức năng sẵn sàng để test PASS. Model test chỉ báo kết quả thực chạy và phần thiếu cho người dùng/model triển khai, không tự nới gate để có video.
