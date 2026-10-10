# Pose cổ tay chống cằm — source0.116

11/10/2026. Tiến độ toàn dự án **khoảng40%, +0 điểm phần trăm**. Chưa nghiệm thu chuyển động/video. Goal vẫn là câu chuyện → kịch bản / kịch bản nguyên văn / WAV giữ giọng → Lila/Karo và diễn viên phụ đóng câu chuyện → video có giọng, phụ đề và QC. Đây là sửa một động tác trong tool chung.

## Thay đổi

Rig trước gộp cẳng tay và đoạn cổ tay → lòng bàn tay thành một đoạn thẳng. Palm phải chạm cằm khiến một số pose gập khuỷu151–158°, vượt giới hạn ứng viên145°. Chỉ đổi hướng khuỷu không sửa được khoảng cách này.

`gesture.wristCurlDeg` khai báo độ gập cổ tay0–70°, chỉ cho `think` trên source body hiện hành có hand attachment. Solver giữ ba chiều dài: bắp tay, cẳng tay đến cuff, cuff đến palm. Palm chạm đúng landmark cằm; không dịch cằm/vai, co xương hoặc tăng giới hạn khuỷu. Cổ tay dùng cùng clock và easing quintic, trở về0° ở đầu/cuối. Lệnh cũ thiếu trường này giữ contract cổ tay thẳng và vẫn có thể bị từ chối.

Preset workbench khai báo70°. Ca native-head khai báo Lila70°/Karo60°, giữ đúng near hand của từng view. Projection/hash bảo vệ trường này qua các slice. Creative brief/schema mô tả cách dùng; reaction repair không được tự thêm nó. Metadata hành động của ca chẩn đoán được sửa từ `idle` sang `think` trên đúng khoảng, giữ nguyên validator cảnh.

Body compiler46, source gesture2, tracer6, topic `forest-tribe-0.116-chin-wrist`. Manifest thêm hash solver và dependency vật lý. Không sinh ảnh hoặc gọi model/TTS; tái sử dụng artwork hiện có.

## Kết quả

[Receipts và nguồn kiểm](../validation/2026-10-11-prehistoric-source116/results.json). Các lượt lỗi trước sửa được giữ riêng.

- **17/17 PASS**: wrist-contact, arm-trajectory, source-gesture-project. **2/2 hand/think PASS**. Kiểm ba chiều dài, cuff trên artwork nối với xương, khuỷu≤145°, random seek, lệnh cũ không được tự sửa và xung đột giữa các slice.
- **Listener cuối PASS** cả hai bố cục: validator cảnh, palm→landmark cằm hiện hành, cuff/palm, hand/source clock và so với toàn run qua cắt/tua.
- Bộ native-head trước sửa metadata chẩn đoán: **5 PASS / 1 FAIL**, lỗi cap. Chưa kết luận mọi shot hợp lệ. Native-source-gesture: **10 PASS / 3 FAIL**, ba ca canonical/normalization/replay dừng ở `Host action interval must be positive` trong fixture. Chưa sửa ba ca hoặc chạy lại toàn regression56.
- Build gồm core/Studio typecheck và Vite **exit0**; test:typecheck **exit0**; static pack **exit0**.
- Render source900–2400ms Lila-left dừng ở `Scene exceeds max_scene_bytes`: HTML216.937 + CSS401 + JS2.073.617 = **2.290.955 byte**, cap2.000.000. **Không có MP4 mới, final hoặc DONE.**
- HyperFrames lint/check và bốn snapshot chạy riêng để xem **cảnh bị từ chối vì dung lượng**. Production validation vẫn FAIL; không gọi renderDraft/renderFinal trong lượt xem này. Ảnh static không chứng minh độ mượt.

Ảnh tại global1700ms cho thấy bàn tay Karo ở vùng cằm nhưng khó đọc dưới râu. Bối cảnh còn là hình khối của ca chẩn đoán, chưa đạt nét, chiều sâu và bố cục tư liệu người dùng. Chưa so sánh video mới với mẫu Facebook.

## Công việc còn thiếu

1. Giảm dữ liệu/bake trung thực dưới cap cho đủ các shot, đo RAM/thời gian khởi tạo. Giữ chất lượng, source clock và guard. Kiểm giá trị/thứ tự lệnh, ảnh cùng thời điểm và tua ngược.
2. Render đủ entry/hold/recovery ở cả hai bố cục. Review cận tay, cuff, nét khuỷu và silhouette bàn tay dưới râu; re-author pose/art nếu khó đọc. Chưa duyệt70°/60° thành mẫu thẩm mỹ chuẩn.
3. Sửa fixture canonical cho đúng khoảng hành động, rồi kiểm normalization/replay/cache; không nới schema để nhận interval sai.
4. Dựng câu chuyện thật với forest/camp có màu, chiều sâu, camera và tương tác. Kiểm chuyển động liên tục, listener, ánh mắt, biểu cảm; so với tư liệu mẫu. Không dùng ảnh QA để chốt mỹ thuật.
5. Kiểm cả ba input, EN/VI/JA/KO, local/external TTS, resume/cache/lock/rebuild, subtitle/audio/duration và final/QC. Test V1 hoặc clip im lặng không chứng minh hoàn thành.

## Môi trường và lệnh

Node24.19.0, HyperFrames0.8.96, Chrome headless154, FFmpeg `C:/ffmpeg/bin`. Không cần API/model/TTS cho các ca dưới. Chạy trong worktree C; giữ server8850/checkout D của người dùng. Không `npm ci` khi node_modules là junction sang D.

```powershell
Set-Location 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
node --import tsx --test tests/forest-wrist-contact.test.ts tests/forest-arm-trajectory.test.ts tests/native-source-gesture-project.test.ts
node --import tsx --test --test-name-pattern='listener chin gestures' tests/native-head-seat-tracer.test.ts
node --import tsx --test tests/native-source-gesture.test.ts
npm run build
npm run test:typecheck
npm run tracer:native-seat -- --native-heads --staging lila-left --acting listening-think --validate --frames --render
```

Tracer cuối vẫn có thể dừng ở cap; chưa phải lệnh tạo video đạt yêu cầu. Đổi `--staging lila-right` để kiểm bố cục còn lại. Harness trong validation dùng đường dẫn máy hiện tại; điều chỉnh nếu chuyển checkout. Không suy kết quả các ca chưa chạy từ các ca đã PASS.
