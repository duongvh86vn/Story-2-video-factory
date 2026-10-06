# Bàn giao source WIP — Cuộc sống thời tiền sử

Ngày 07/10/2026. Nhánh `codex/prehistoric-life`; chưa nghiệm thu chủ đề. Đặc tả chính: [CUOC-SONG-THOI-TIEN-SU.md](CUOC-SONG-THOI-TIEN-SU.md).

## Đã có trong source

- Mode `story` thật qua config, ingest, API upload/editor, CLI, script authoring và pipeline; `script`/`wav` cùng contract hiện có. Nội dung là dữ liệu, không thực thi lệnh từ tài liệu.
- Lựa chọn chủ đề tiền sử với hai model Lila/Karo đóng vai trong câu chuyện. Giữ tên/vai có nguồn, không đổi câu chuyện thành bài máy móc hoặc buộc cả hai nói giọng narrator.
- Mặc định các role model qua 9router `http://127.0.0.1:20128/v1`; key qua `MODEL_GATEWAY_KEY`, không commit `.env`. Coder tư vấn và vision đọc ảnh Karo đã gọi thật; review atlas trả chưa đạt, evidence ở `docs/topics/reviews/`. Đây là kiểm ảnh tĩnh; runtime cần evidence riêng.
- Cache authoring tách khỏi phiên bản model hình ảnh để thay artwork không viết lại lời kể đã chấp nhận.
- Bốn ảnh cận và hai sheet 6688×3760 lưu bền vững. Cận da ấm là tạo hình chính; hai sheet mới là tham khảo, không tự pha mặt trắng/ủng/áo lông vào model chính.
- PNG tách nền, atlas ứng viên, phép đo alpha, manifest hash/trạng thái, bản ráp nghỉ SVG. Sau review, bản ráp dùng mask trên cutout toàn thân để giữ màu/contour tốt hơn atlas; chưa tái dựng phần che khuất. Atlas và bản ráp đều chưa được chấp nhận; chưa phải animation rig.
- Trang `/api/topics/prehistoric-life/compare`, `?variant=assembly`, API topic/readiness; launcher `scripts/start-studio.ps1`.
- Lớp đầu `forest-head-1`: sáu PNG alpha chính diện/ba phần tư trái/phải, glyph source qua mask, eye/brow/mouth evaluator và renderer dùng chung; preview `/api/topics/prehistoric-life/heads`. Quay qua hình trước theo yaw, vẫn là ba artwork rời. Pose `head-turn` ở trang body cho kiểm điểm giữa tại 900 ms; chưa phải xoay đầu liên tục.
- Miệng Karo giận không còn ghép crop răng cười/râu lệch màu; actor nói buồn/giận dùng miệng căng, ngạc nhiên/lo sợ dùng miệng tròn theo speech activity. Khẩu hình tròn Karo rộng và có viền môi ấm. Lila đã có clip da mặt/độ mở an toàn, chân mày cả hai được thu mask để bỏ mảnh tóc thừa. Review v4 và review ba góc đầu v2 PASS trong phạm vi ảnh tĩnh; không phải nghiệm thu motion/body/episode. Prompt hai PNG front và đường dẫn output ở `rig-v1/front-prompts.json`, tạo bằng image_gen tích hợp.
- `forest-body-1` là candidate của topic: cutout/mask áo, bàn tay/chân; metrics riêng từng vai/tay/chân, hông tại belt, nối đầu/cổ, bàn tay xoay theo cẳng tay. Xương ẩn, mực C1 mềm hơn, mask gấu tránh chân cũ. Preview `/api/topics/prehistoric-life/body` dùng cùng evaluator. Nhịp thở nhỏ, blink lệch và đuôi tóc Lila trễ 120ms đã có code; chưa nghiệm thu motion.
- Sửa mất viền áo/quần Karo: nới mask thân, giữ nét đen gốc quanh gấu bằng luminance mask với margin 8 đơn vị nguồn; không tô lại PNG. Đã kiểm ảnh pose đứng/bước 440 ms, evidence `reviews/karo-garment-outline-{rest,walk}-v1.jpg`. Model test cần kiểm tiếp viền toàn chu kỳ và ở tỷ lệ xuất video.
- Mốc 0.8: `forest-source-body-motion-2` / `forest-source-body-svg-2` dùng geometry chung cho từng hông/chân/ankle, panel trang phục gắn hông và theo đùi 100ms. Source ngồi/đứng tối thiểu 1500ms, có hai step thu/mở chân, pelvis nằm trên support, tay nghỉ trên đùi và cẳng tay không bị áo che. `neck-art` crop da ấm từ cutout gốc, không dùng chấm xương để nối râu/ngực. Preview có `sit-left/right` 5000ms; chưa nghiệm thu video hoặc nếp vải.
- Stage PNG local/hash cho scene, fingerprint pack trong cache/resume, namespace cả ID/clip/filter/use cho hai actor. Contract scene thêm passive image/use/color matrix và baked curve finite; không cho animation thay href hoặc resource ngoài allowlist.
- `tests/forest-head.test.ts` và `tests/forest-body.test.ts` đã chuẩn bị, chưa chạy; chỉ build/typecheck và inspection tĩnh được thực hiện ở đợt này.

## Điều kiện hiện đang chặn

`productionReady=false` và guard `requireTopicProductionReady()` chặn pipeline topic **trước model/TTS**. Bộ vector cũ bị người dùng loại; chưa có replacement rig đủ góc, nét mặt, tóc/áo và diễn xuất. Không gỡ guard để cho pipeline chạy bằng bộ đã bị loại. Generic project không chọn topic vẫn dùng pipeline hiện có.

`packages/animation/forest-tribe-art.ts`, các preview vector và plate rừng tô phẳng là thử nghiệm bị loại/chưa đạt; không lấy các file ấy làm chuẩn nghiệm thu. `reference-puppet.ts` là hiệu chỉnh pose nghỉ tĩnh. Renderer mới dùng texture đầu/glyph và cutout thân; chưa dùng atlas. Source ngồi/đứng đã có candidate qua common compiler, nhưng quay thân vẫn trả `needs-body-view` trước khi biên dịch. Giữ guard topic vì bộ góc, nếp vải, cảnh và diễn xuất còn thiếu.

Key trong `.env` checkout D: đã dùng được qua 9router. Giữ lịch sử v1/v2 và 401. Hai lượt sửa miệng mới có journal riêng giới hạn 2: v3 FAIL ở Lila/chân mày, v4 PASS cho hai góc cũ. Review ba góc đầu có journal riêng giới hạn 2, hai lượt thực tế đều PASS (lượt sau thêm ảnh miệng lo sợ); evidence mới `reviews/front-head-static-review-v2.json` giữ fingerprint pack. Không reset journal cũ hoặc suy ra body/tóc/turn/runtime đã đạt từ review đầu. Tổng các nhóm review đầu đến mốc này: 7 lượt gọi, trong đó 1 lỗi auth ở nhóm đầu.

Journal source-seat riêng đã dùng đủ 2 lượt: `source-seat-static-review-v1.json` FAIL khe cổ Karo; v2 FAIL vai và các flap trang phục ngồi của cả hai. Đã dùng crop cổ da nguồn và, sau v2, mở mask da vai/hiệu chỉnh tay Karo (source rig-left y252, hai đoạn 131 đơn vị nguồn). `source-seat-right-v3.jpg` là tự inspection bản sửa mới, chưa có PASS model. Hai bộ ảnh v1/v2 giữ đúng ảnh đã gửi. Ưu tiên tiếp theo là vẽ/tách garment ngồi có nếp và vùng bị che, gắn vào cùng clock/hip/thigh, không tiếp tục gọi các flap xoay là drape hoàn chỉnh. Không reset journal hoặc gỡ guard.

## Việc triển khai tiếp theo

1. Chỉnh bản ráp toàn thân bằng ảnh nguồn: đầu/cổ/áo nối đúng, tỷ lệ đầu–thân–chân và bàn tay/chân sát mẫu. Không đổi texture và sắc cam da sang màu nhợt.
2. Tách phần trước/sau của tóc, râu, dây lưng và vạt áo; đo pivot/crop/occlusion, giữ hash nguồn. Head/glyph đã có bản ghép ứng viên; tiếp tục kiểm tỷ lệ/biểu cảm/miệng và sửa fidelity, không coi atlas đóng sẵn là rig.
3. Tiếp tục góc nghiêng/lưng và thêm frame giữa ba góc đầu đang có; làm góc thân/trang phục/silhouette tương ứng. Không dời mắt/mirror cả đầu rồi gọi multi-view hoặc coi ba drawing là chuyển đầu đã mượt.
4. Tiếp tục hiệu chỉnh metrics/biên mask, anatomy và reach của rig source đã tích hợp. Giữ tay/chân theo phía cơ thể; nghiệm thu chuyển ngồi mới, làm body view và ownership/grip đúng. Legacy rig-left ánh xạ anatomical right trong góc nguồn; không swap tên tay khi head view đổi. Không dùng panel xoay thay cho nếp vải/side-body artwork hoàn chỉnh.
5. Timeline seek được theo thời gian tuyệt đối: mắt dẫn đầu/thân; chuyển trọng lượng, tóc/vạt theo sau; chớp mắt/miệng đúng speaker và audio. Không kéo dãn đầu/áo nguyên tấm để giả diễn xuất.
6. Làm màu cảnh ngày/chiều/đêm với texture và chiều sâu theo sheet. Plate vector hiện có chưa đạt mỹ thuật.
7. Hoàn thiện story-to-performance cho bộ source; staging và cache/lock đã có code cho head/body nhưng còn phải kiểm thật. Thay renderer/face/body motion đã phát hành phải tăng version tương ứng. Chỉ đổi readiness khi bộ rig có đủ khả năng thật.
8. Bàn giao model test chạy ba mode, EN/VI/JA/KO và TTS external/local; kiểm thực tế video, audio/subtitle, nguồn, gaze, tiếp xúc và rebuild/resume. Không dùng test V1 hoặc ảnh tĩnh để báo đã nghiệm thu.

## Kiểm tra đã thực hiện / chưa thực hiện

`npm run build` (bao gồm typecheck core và Studio) và `npm run test:typecheck` đã pass trong đợt triển khai này. Chỉnh source tiếp phải chạy lại các kiểm tra. Không chạy npm test hoặc ca runtime tạo tập ở đợt chỉnh hình này. Theo yêu cầu người dùng, runtime/nghiệm thu giao model khác.

Để model test nhận đúng môi trường, dùng launcher và đường dẫn worktree trong mục 10 của đặc tả chính. Dữ liệu server 8850 đang tách tại `runtime/prehistoric-life/projects`; không ghi đè project cũ trong checkout D:. Câu chuyện tập đầu chờ người dùng; không tự chọn demo thức ăn thành nội dung sản phẩm.

Ca bổ sung để giao model test: `node --experimental-test-module-mocks --import tsx --test tests/forest-head.test.ts tests/forest-body.test.ts`. Sau đó cần render hai actor thật qua scene staging, seek theo thứ tự ngẫu nhiên ở cue/turn/audio boundaries, kiểm miệng căng/tròn còn giữ cảm xúc khi nói và im lặng, chuyển ba góc qua front, ID/use/filter/mask riêng, hash PNG thiếu/sửa và scene lock/resume. Chạy cơ chế/carry/contact với kích thước source và cả hai bàn tay, kiểm tóc/râu/áo không seam, bàn tay xoay đúng và không có chân cũ từ cutout. Unit/static inspection không thay cho ca ba đầu vào hoặc video nghiệm thu.

Ca source seat mới đã chuẩn bị trong `forest-body.test.ts` cho Lila/Karo × left/right: kiểm xương riêng, đế–cổ chân, gắn panel/hông, ownership chân trụ, random seek và stance khôi phục; compile + staged scene contract. Chạy video 60fps và seek đảo/ngẫu nhiên tại step boundaries, điểm body bắt đầu/kết thúc, 1800/3000/4500ms và speech/gesture boundaries. Kiểm head/chest/neck không khe nền, vạt không xuyên chân/support, chỉ đổi chân trụ khi thật nhấc chân. Kiểm tiếp source carry/operate khi ngồi và jump/walk trước/sau support không hoạt động. Đây là ca test bàn giao, model triển khai chưa chạy.
