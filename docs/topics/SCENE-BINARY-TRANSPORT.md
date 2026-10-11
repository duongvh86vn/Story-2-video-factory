# Cảnh nén nhị phân và kết quả render — source117

11/10/2026. Goal vẫn là story/script/WAV → diễn viên trong câu chuyện → video có giọng/final/QC. Tiến độ **khoảng40%, +0 điểm phần trăm**; chưa nghiệm thu chất lượng. Không gọi model/TTS trả phí, sinh ảnh, đổi server8850 hoặc checkout D.

## Đã thay đổi

Transport2 lưu dữ liệu literal bằng varint an toàn, double IEEE-754 và chuỗi UTF-8; các vector số nguyên lưu riêng. Chuỗi transform/path giữ đủ bảy chữ số thập phân đã có trong source; lưu chênh lệch bậc hai chỉ trên dữ liệu số khôi phục được nguyên văn. Khôi phục cả giá trị và thứ tự GSAP ban đầu, không giảm frame, mesh, pose hoặc artwork. Đây là giảm dung lượng file, không giảm số tween.

Security7 chỉ nhận đúng byte decoder cố định, inflate có giới hạn64MiB, đọc binary giới hạn byte/collection/node/depth/varint/UTF-8 và kiểm lại các lệnh theo guard GSAP cũ. Transport1 JSON vẫn được đọc và kiểm để giữ scene/cache cũ; không tự đổi byte scene đã lưu. Decoder không thực thi code trong payload. Test malformed/noncanonical/truncated, Unicode VI/JA/KO, callback, resource/target, template/overflow và old transport vẫn được giữ.

Trong artwork repair, UUID không thể hiện thứ tự hoàn thành. Trước đây một rejection cũ có tên xếp sau có thể được replay trước bản đã qua runtime validation, tạo thêm receipt. Nay kiểm mọi bản có **binding đúng + runtimeValidation=passed** trước, revalidate như cũ, rồi mới thử rejection đúng binding/request. Không cho scene sai hoặc binding cũ đi qua. Test buộc rejection cũ xếp trước và kiểm không gọi lại provider; provider trong ca này là mock cục bộ.

Fixture source-gesture sửa cả endpoint khi kéo start cảnh về0 và bind lại cast sau schema parse theo luồng authoring. Giữ interval/profile/source guards của production. Bộ13 ca trước3FAIL, sau sửa fixture2FAIL, sửa thứ tự replay xong13PASS; giữ log các lượt trước.

## Bằng chứng và giới hạn

[Receipts, source hashes và lệnh](../validation/2026-10-11-prehistoric-source117/results.json).

- Cảnh source900–2400ms Lila-left được tái sử dụng từ source0.116, body compiler46/art/clock giữ nguyên. Tổng file **2.290.955 →1.825.476 byte**, dưới cap2.000.000. **58.603 lệnh**, hash giá trị/thứ tự khớp tuyệt đối. Scene validation, HyperFrames lint/check PASS.
- **10/10** transport/binary/path guard, **13/13** source-gesture và **60/60** artwork-repair/QC tests PASS. Build core/Studio/Vite, test:typecheck và static pack exit0. Ca sửa/review dùng mock/router cục bộ, không phải AI sản xuất hoặc nghiệm thu phim. Toàn regression56 source114 chưa chạy lại.
- Bốn snapshot tại local0/300/800/1499ms có PNG hash bằng bản0.116. MP4 chẩn đoán **1,5 giây H.2641280×72060fps90frames**, không audio; probe/decode exit0. Clip nằm tại `runtime/prehistoric-life/qa/source117-binary/left-shot-1/work/draft.mp4`.
- Chrome seek0→800→1499→300→0→1499→800ms: **7/7 DOM khớp, 6/7 PNG khớp** giữa hai transport. Lần cuối khác34pixel, sai lệch channel tối đa23. Bản gốc cũng khác75pixel khi quay về0 và46pixel khi quay về1499. **Chưa xác định nguyên nhân; test ảnh tuyệt đối FAIL.** Không được dùng DOM hash để gọi ảnh/video deterministic hoặc đã mượt.
- Load khoảng4,65s mỗi bản; metrics một lần sau seeks ghi heap120,9MB cũ/141,1MB mới. Hai page cùng process theo thứ tự; chưa phải benchmark RAM độc lập. Không tuyên bố giảm RAM/khởi tạo. Payload nhỏ hơn không đảm bảo phim dài nhẹ hơn.
- Ca đầy đủ7,2s qua cảnh0 (1.086.049 byte) và1 (1.825.476 byte), dừng cảnh2 ở local819.9463ms với `needs-animation... face error1.33`. **Không có phim7,2s mới.** Pure sampler diagnosis cho thấy phần lỗi là matrix trang phục ngồi của Karo; head error0, scalar face không lỗi tại các probe. Chưa sửa nguyên nhân cloth hoặc nới ngưỡng0,2px.
- Không có audio mới, test so sánh phim với Facebook, final hoặc DONE. Test/case/render rộng hơn phải dùng đúng phạm vi trong receipts; test V1/source114–116 vẫn là lịch sử.

## Việc cần làm tiếp

1. Rà lại area governor của native seat và biến dạng trang phục tại global3219.9463ms: tìm discontinuity hoặc nhánh đổi, giữ diện tích dương≥25%, nguồn texture/cuff và clock. Không tăng depth/ngưỡng để giấu lỗi; sửa nguồn hình học rồi render cả hai bố cục đủ entry/hold/recovery.
2. Điều tra sai khác34–75pixel khi random seek, so transform/clip/filter/raster state và load/paint ổn định. Giữ log FAIL cho đến khi có bằng chứng; không loại bỏ phép kiểm ảnh hoặc đổi tolerance để tự gọi PASS.
3. Đo compile/initialization/memory bằng ca đủ dài và process độc lập. Cap cho các shot chưa render vẫn chưa được chứng minh.
4. Review silhouette bàn tay dưới râu, nét, màu/trang phục, biểu cảm, gaze/camera; thay bối cảnh hình khối chẩn đoán bằng stage/cảnh phù hợp câu chuyện thật. Source-specific pose/code không thay mục tiêu tool tổng quát.
5. Hoàn tất cả ba input, giọng EN/VI/JA/KO và local/external TTS, resume/cache/locks/rebuild, subtitles/audio/duration và final/QC. Art/motion/production gates vẫn chưa được nghiệm thu.

## Môi trường và lệnh

Node24.19.0, HyperFrames0.8.96, Chrome154, FFmpeg `C:/ffmpeg/bin`. Runtime cục bộ không gọi API/model/TTS. Không `npm ci` trong worktree có node_modules junction sang D.

```powershell
Set-Location 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
node --import tsx --test tests/packed-binary.test.ts tests/packed-timeline.test.ts tests/scene-baked-path.test.ts
node --import tsx --test tests/native-source-gesture.test.ts
node --import tsx --test tests/artwork-repair.test.ts tests/qc-artwork-repair.test.ts
npm run build
npm run test:typecheck
npm run tracer:native-seat -- --native-heads --staging lila-left --acting listening-think --validate --frames --render
```

Lệnh cuối còn lỗi cloth và chưa xuất phim đầy đủ. Dùng `--staging lila-right` cho bố cục còn lại sau sửa. Harness dùng snapshot/source đã lưu dưới runtime và đường dẫn máy; receipts ghi rõ đầu vào và các lượt không có run-start hash, không gán chúng cho checkout sạch.
