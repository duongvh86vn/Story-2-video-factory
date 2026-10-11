# Luồng ảnh gốc → chuyển động → video

Ngày: 11/10/2026. Trạng thái: **người dùng đã cho phép demo bằng bộ ảnh flow_doodle cũ; slice chuyển động vật thể đã xuất, toàn bộ luồng ảnh chưa triển khai hoặc nghiệm thu**.

## 1. Yêu cầu hiện hành

Người dùng cung cấp **một ảnh PNG/JPG hoàn chỉnh**. Tool hỗ trợ tách phần cần chuyển động, giữ thiết kế, nét vẽ, trang phục, khuôn mặt và màu sắc của ảnh. Chuyển động phục vụ câu chuyện: đưa tay ra, lửa bập bùng, di chuyển, hoặc động cơ/bánh răng quay. Không bắt mọi cảnh phải có nhiều chuyển động.

Người dùng đã bác bỏ chất lượng rig hiện tại: tay luôn cong, cử chỉ cứng, chất lượng hình không đạt. Các test toán học hoặc render thành công không thay thế đánh giá đó. Không tiếp tục coi rig Lila/Karo hiện tại là nguồn hình mặc định của luồng đề xuất.

Mục tiêu tool vẫn là đưa nội dung vào để ra video. Hai nhân vật thời tiền sử là diễn viên trong câu chuyện; hệ thống cũng phải dùng được cho vật thể, máy móc và các chủ đề khác. Ví dụ bánh răng chỉ là một ca sử dụng.

## 2. So sánh các hướng

| Hướng | Lợi ích | Giới hạn | Đề xuất |
| --- | --- | --- | --- |
| Tiếp tục rig tự dựng toàn thân | Có thể lập trình nhiều hành động | Đã không đạt mỹ thuật; sửa giải phẫu không bảo đảm diễn xuất đẹp | Giữ source/evidence cũ để tham khảo, không làm nền tảng mặc định mới |
| Tách layer từ ảnh người dùng, animate bằng HTML5 | Người dùng kiểm soát hình; chuyển động và thời gian chỉnh được; tái sử dụng asset | Phải xử lý phần bị che, điểm xoay và mép cắt; chạy cần thêm pose | **Hướng ưu tiên** |
| Dịch vụ AI image-to-video | Có thể tạo chuyển động phức tạp từ ảnh | Chưa có API trên máy; chi phí, sai identity và khả năng điều khiển cần kiểm chứng | Adapter tùy chọn về sau; không phải điều kiện để dùng tool |

## 3. Luồng sản phẩm

1. **Nhập nội dung và ảnh**: chọn kịch bản, WAV hoặc câu chuyện/chủ đề; thêm ảnh gốc cho từng cảnh hoặc dùng lại một ảnh.
2. **Phân vùng**: đánh dấu đối tượng cần động; tool tạo mask/layer ứng viên. Có công cụ chọn vùng, sửa mask và đặt điểm xoay. Trường hợp chưa có model phân đoạn local vẫn phải thao tác được bằng vùng chọn, không được giả vờ đã tách tự động chính xác.
3. **Chuẩn bị bề mặt**: tạo layer alpha, xử lý nền tại vị trí cũ và phần bị che cần lộ ra. Hiển thị riêng phần được giữ từ ảnh và phần đã bổ sung.
4. **Chọn chuyển động**: chọn preset và target, điều chỉnh biên độ, tốc độ, thời điểm và quan hệ trước/sau. Không bắt nhân vật chạy hoặc nói bằng miệng trong mọi cảnh.
5. **Preview ngắn**: xem vài giây ở tốc độ thật, dừng/tua và đối chiếu ảnh gốc. Duyệt asset/layer một lần; thay lời kể có thể dùng lại bộ ảnh/layer hợp lệ.
6. **Dựng theo nội dung**: dùng clock narration thật; ghép các cảnh, giọng, phụ đề và chuyển cảnh. Nhân vật diễn hành động của câu chuyện; không tự thêm người dẫn đứng trước khán giả.
7. **Xuất video và QC**: MP4, SRT, thumbnail, storyboard, manifest ảnh/layer/motion và báo cáo. Thiếu asset hoặc giọng cần thiết phải ghi rõ trạng thái, không xuất final đạt yêu cầu hoặc báo DONE.

## 4. Ba input được giữ

| Input | Quy tắc |
| --- | --- |
| Kịch bản người dùng đưa | Giữ nguyên lời kể/đối thoại; TTS theo giọng và ngôn ngữ chọn; đo audio thật để tạo timeline |
| WAV ghi âm hoặc AI đọc sẵn | Giữ nguyên WAV; transcript/timestamp phục vụ dựng theo giọng; không thay lời kể bằng bản viết lại |
| Câu chuyện/chủ đề → kịch bản | Tạo kịch bản trước, cho người dùng xem/sửa; sau khi chọn bản dùng mới tạo narration và video |

Giữ SRT và WAV+SRT như các chế độ tương thích hiện có, với quy tắc cue/clock/fit và báo mismatch. EN là nhu cầu chính; VI/JA/KO, TTS local/external và cấu hình giọng tiếp tục thuộc phạm vi sản phẩm. Luồng mới thay cách dựng hình, không bỏ narration, subtitle, cache, resume hoặc QC.

## 5. Bộ chuyển động đầu tiên

| Đối tượng | Chuyển động | Điều kiện đẹp và đúng |
| --- | --- | --- |
| Tay | Xoay quanh vai; đưa ra, hạ xuống; gập khuỷu khi cần | Cho phép tay **duỗi thẳng**; không ép nét thành `(` / `)`; vai/bàn tay liền, không cong/vẹo để che lỗi |
| Nhân vật | Dịch chuyển một khoảng; nghiêng/đổi trọng lượng nhỏ có chủ đích | Ghi rõ là dịch chuyển nếu chưa có chu kỳ bước; không gọi trượt cả ảnh là đi/chạy |
| Lửa | Biến thiên hình/ngọn, độ sáng và tia nhỏ, theo loop cố định | Chân lửa gắn vào bếp; nền và nhân vật không rung theo; màu gốc được giữ |
| Bánh răng/trục | Xoay quanh tâm đã đặt | Giữ hình/răng cứng; bánh ăn khớp quay theo quan hệ kích thước/hướng, không quay các phần nối cố định |
| Bánh xe | Quay; kết hợp dịch chuyển khi xe đi | Điểm xoay tại tâm; tốc độ quay khớp khoảng di chuyển khi đã định bán kính |
| Tóc/lá/khói | Dao động hoặc flow nhẹ trong vùng được chọn | Chỉ dùng khi phù hợp cảnh; không phủ hiệu ứng lên mọi vật để che sự bất động |
| Chạy | Chu kỳ pose/cutout dành riêng cho nhân vật | **Giai đoạn sau**; phải duyệt bước/chân chạm đất/identity. Nếu một ảnh không đủ, yêu cầu pose bổ sung hoặc duyệt phần ảnh mới cần tạo |

Mặc định dùng ít chuyển động có ý nghĩa. Nhịp động có chuẩn bị, thực hiện, dừng/giữ và hồi phục; không để mọi layer chạy cùng một sóng sin. Chuyển động thẳng như bánh răng quay đều không cần ease-in/out ở mỗi vòng.

Miệng và biểu cảm chỉ được thêm khi có lớp/glyph phù hợp ảnh nguồn. Không tự thay khuôn mặt đẹp của ảnh bằng bộ mắt/mũi/miệng rig cũ. Animation theo speech activity phải được mô tả đúng mức độ; không gọi là phoneme lip-sync.

## 6. Xử lý một ảnh phẳng

Ảnh hoàn chỉnh không chứa các pixel nền bị nhân vật che, cũng không chứa mặt sau/cánh tay ở tư thế khác. Mask chỉ tách phần nhìn thấy; không tự tạo những phần thiếu này.

Mỗi đối tượng chuyển động có: mask, layer alpha, điểm xoay, vùng chuyển động cho phép, thứ tự trước/sau, phần giữ từ ảnh gốc và các patch được bổ sung. Các vùng ngoài phạm vi được chọn phải giữ nguyên màu/nét/texture.

Trước khi animate, tool phải xóa vật thể khỏi vị trí cũ trên nền sạch. Bổ sung nền hoặc phần bị che bằng nguồn người dùng cung cấp, patch từ ảnh phù hợp, hoặc dịch vụ tạo ảnh được cho phép. Preview phải chỉ rõ phần bổ sung; không âm thầm sinh lại cả ảnh. Thiếu nguồn và chưa có cách hoàn thiện đẹp thì báo `needs-layer`/`needs-background`, vẫn cho người dùng sửa mask/chọn chuyển động nhỏ hơn.

Không dùng AI generation cho từng frame. Một lần tách/duyệt tạo bộ layer dùng lại. Cache theo hash ảnh, mask, patch, pivot và phiên bản preset. Sửa motion/giọng không sinh lại ảnh; sửa mask chỉ rebuild layer và cảnh liên quan.

## 7. Kiến trúc dự kiến

Tái sử dụng ingest/narration/TTS, subtitle, quản lý project, render và export hiện có khi phù hợp. Thêm renderer ảnh/layer riêng, không bắt ảnh phẳng đi qua rig giải phẫu và các head/body registration cũ.

Các thành phần đề xuất, **chưa tồn tại dưới dạng tính năng hoàn chỉnh**:

- `image-intake`: đọc PNG/JPG, orientation/alpha/dimensions, lưu nguyên bản và hash; không thực thi hướng dẫn chứa trong metadata/nội dung ảnh.
- `layer-preparation`: mask editor, extraction, background/occlusion patches, preview và manifest nguồn.
- `motion-plan`: target layer, pivot, keyframe/preset, amplitude, phase, timing, contact và dependency; trạng thái capability rõ ràng.
- `image-scene-renderer`: composite layer bằng Canvas/SVG, timeline đánh giá theo thời gian tuyệt đối, dừng/tua luôn khôi phục cùng trạng thái. Hiệu ứng dùng seed cố định; không lấy clock thực hoặc random mỗi lần render.
- `image-motion-studio`: xem ảnh/layer, chọn vùng/pivot/preset và preview; người dùng không phải sửa file JSON để dùng cơ bản.

Canvas có thể vẽ ảnh và xoay quanh tâm được chọn bằng transform/translate; đây là primitive triển khai, không tự giải quyết tách layer hoặc chất lượng diễn xuất. Tham khảo [MDN drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage), [MDN rotate](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate).

Schema/resource allowlist/render security phải mở rộng theo asset ảnh/layer đã kiểm, giữ giới hạn cảnh và không cho model trả JavaScript tùy ý chạy. Bản final vẫn bị chặn nếu thiếu voice, background cần thiết, asset/layer chưa duyệt hoặc motion/QC thất bại.

## 8. Triển khai theo thứ tự

1. **Slice ảnh → video đầu tiên**: demo độc lập 10 giây/60 fps đã xuất từ ảnh 0002/0013 trong bộ flow_doodle người dùng cung cấp. Mask/pivot đăng ký thủ công; bốn bánh răng tách alpha và nền vá từ ảnh nguồn được tái sử dụng. **Còn thiếu editor/tách vùng trong Studio và nghiệm thu hình của người dùng**. Xem `docs/topics/IMAGE-MOTION-DEMO.md` và báo cáo tại `docs/validation/2026-10-11-image-motion-demo/REPORT.md` trước khi mở rộng chuyển động người.
2. **Tay đưa ra**: ảnh nhân vật gốc, vùng tay và vai; source layer/patch đẹp; có pose tay thẳng, không bóng ma, không gãy/chệch vai. So sánh ảnh tĩnh và clip tốc độ thật.
3. **Ghép ba input**: narration thật, nhiều cảnh/ảnh, timeline, phụ đề; tiếp tục cache/resume/giọng hiện có. Kịch bản đi qua renderer ảnh/layer mới.
4. **Di chuyển và tương tác**: dùng target/contact có nguồn; dịch chuyển đơn giản được ghi đúng khả năng. Chạy/nhảy chỉ sau khi chu kỳ pose đủ tốt, không trở thành điều kiện bắt buộc để dùng tool cơ bản.
5. **Nghiệm thu và GitHub**: build/typecheck, test local đúng phiên bản, video thực tế, báo cáo còn thiếu và commit kèm tiến độ. Test V1 hay rig cũ không chứng minh luồng mới đã đạt.

9router có thể hỗ trợ đề xuất vùng/pivot, kịch bản và motion plan có cấu trúc, kiểm/review ảnh khi được gọi trong phạm vi đã cho phép. Coder/tester/đạo diễn tách nhiệm vụ; không gửi toàn repo cho mỗi lượt. Plan JSON phải qua validation; AI không thay thế việc xem video và không tự phê duyệt mỹ thuật. Không cần API image-to-video để hoàn thành slice đầu.

## 9. Nghiệm thu

- Ảnh gốc được lưu nguyên bản; màu, mặt, tóc, trang phục và nét ngoài vùng chuyển động được giữ.
- Không còn vật thể cũ dưới lớp động; không thấy lỗ nền, halo hoặc mép cắt lộ rõ ở tốc độ thật.
- Tay có thể thẳng, đường tay/điểm vai/bàn tay tự nhiên; không forced arc để giấu khớp.
- Lửa và bánh răng là chuyển động cục bộ thật; không thay bằng zoom/rung toàn ảnh.
- Những capability chưa có, như chạy từ một ảnh không đủ pose, báo rõ và có cách bổ sung; không xuất bản demo thay thế rồi gọi là đã làm được.
- Cùng thời điểm cho cùng trạng thái khi phát, seek và export; file MP4 được probe/decode và xem ở tốc độ bình thường.
- Kịch bản/WAV/chủ đề tạo đúng lời, giọng, clock, phụ đề và các cảnh thuộc nội dung; final/QC không bỏ các gate.
- **Người dùng chấp nhận chất lượng hình và chuyển động của slice đầu** trước khi lấy nó làm mẫu cho toàn bộ tool.

## 10. Trạng thái khi viết đề xuất

Chưa code luồng mới; không có demo ảnh/layer mới được duyệt. Không sinh ảnh hoặc gọi model/TTS trả phí trong lượt thiết kế này. Source118 của rig cũ và các logs được giữ ở worktree, chưa commit; các test PASS không vượt qua đánh giá chất lượng xấu của người dùng. Dừng tiến trình render chẩn đoán cũ đang chạy sau khi người dùng đổi hướng, không sửa checkout D hoặc server8850.

Không cộng tiến độ dự án vì chỉ mới chốt đầu vào ảnh phẳng và đề xuất thiết kế. Mốc ước lượng trước vẫn khoảng40%, có độ bất định lớn và **không phải chất lượng video đã đạt40%**.

## 11. Rà soát tài nguyên thực tế trước khi triển khai

Kiểm tra chỉ đọc ngày11/10/2026, không chạy inference, download, tách/sửa ảnh hoặc render mới:

| Nguồn | Kết quả hiện tại | Cách dùng trong luồng đề xuất |
| --- | --- | --- |
| `C:/AI - tao anh/SD force/webui/outputs/extras-images/00349.png` | PNG RGB6688×3760; SHA256 `732efaceb02f186e3c5467b7bc61bd13309290a095ff305842bc59bdf4fc2dc2` | Sheet tham chiếu nhân vật/bối cảnh; không tự coi toàn sheet nhiều ô là một cảnh phim |
| `C:/AI - tao anh/SD force/webui/outputs/extras-images/00350.png` | PNG RGB6688×3760; SHA256 `6d867ea606ac35dd08c12caaaf38da01feb8340cb3899ffa0949eb2343473164` | Sheet tham chiếu phiên bản người que; không tự thay phiên bản da ấm bằng mặt trắng |
| BiRefNet local | Có `model.onnx`, config và preprocessor tại `runtime/asset-tools/models/onnx-community/BiRefNet_lite-ONNX/de15b22ba131738a16dff04aab8bdf8dc32e3ac1`; dependency Transformers4.3.1 có trên máy | Có thể thử làm adapter mask ứng viên; **chưa kiểm inference cho ảnh đầu vào mới**, chưa chứng minh phân đoạn từng chi hoặc clean plate |
| `scripts/native-profile-matte.mjs` | Script hiện có nhận bộ tên/profile cụ thể và sinh alpha cho asset nghiên cứu đầu | Không phải tool layer tổng quát; không chạy nguyên script này để giả lập khả năng upload ảnh bất kỳ |
| `apps/cli/art-tools.ts` | CLI đo artwork/motion cục bộ | Chưa có intake/edit layer cho luồng đề xuất; cần mở rộng giao diện riêng |
| Chrome154 headless và `C:/ffmpeg/bin/ffmpeg.exe`, `ffprobe.exe` | Đường dẫn có thật | Tái sử dụng để capture/export/probe sau khi renderer mới được triển khai |
| `library/environments/prehistoric-camp-v1.png` | Nền hình khối đơn giản, không phải ảnh scene người dùng mới đưa | Không tự lấy làm chuẩn mỹ thuật của demo mới; chỉ giữ artifact cũ |

Tách nền toàn đối tượng khác với tách tay, chân, mặt, lửa trong một scene. Adapter phải ghi loại mask thật sự tạo được và cho sửa vùng chọn; thiếu semantic part mask không được ghi là đã tự động tách đủ layer.

Đầu vào scene dùng cho demo sẽ do người dùng chọn. Có thể dùng ảnh hoàn chỉnh mới hoặc một vùng cảnh được chọn từ nguồn hiện có; giữ nguồn/crop/hash rõ ràng. Sheet nhiều ô không được dùng như nền toàn màn hình rồi gọi là đã kiểm chứng input scene.

### Môi trường làm việc và thứ tự kiểm

Worktree triển khai độc lập: `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`. Checkout D và Studio8850 của người dùng giữ nguyên. Worktree có `node_modules` dùng chung; không chạy `npm ci` để tránh thay dependency chung ngoài phạm vi.

Sau khi chốt thiết kế, kiểm từng chặng: ảnh gốc/hash → mask/clean plate → composite rest → motion preview → MP4/probe/decode → narration/subtitle → resume/QC. Chặng sau chỉ mở rộng khi chặng trước đã có ảnh/video thực tế đáp ứng tiêu chí, không dùng test rig cũ thay cho evidence.

Các lệnh hiện có dưới đây chỉ kiểm build/typecheck; **không bật một chức năng ảnh/layer chưa được code**:

```powershell
Set-Location 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
npm run build
npm run test:typecheck
```

Các lệnh nhập ảnh, sửa mask/pivot và render demo sẽ được bổ sung cùng tính năng thật và ghi lại lệnh đã chạy/exit code. Không đưa CLI giả vào hướng dẫn sử dụng. Tại thời điểm rà soát, test:typecheck của thay đổi source118 rig cũ còn lỗi TS18048 trong test mới; đó là vấn đề chưa sửa, không phải build PASS cho luồng đề xuất.
