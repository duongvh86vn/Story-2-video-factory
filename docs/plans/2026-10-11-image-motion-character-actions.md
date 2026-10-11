# Nhân vật từ ảnh gốc: hành động trước, pipeline sau

## Yêu cầu mới và giới hạn hiện tại

Người dùng thấy ellipse rotation cứng và hỏi nhân vật có diễn tả hành động không, sau đó yêu cầu **xóa tay cũ và lắp tay mới**. Đã có renderer phân cấp và bản thử một cử chỉ tay; editor Studio hiện vẫn chỉ chọn vùng xoay. Hướng ảnh gốc giữ nguyên, riêng cánh tay được phép thay bằng nét mới. Chưa có diễn hoạt toàn thân hoặc nghiệm thu mỹ thuật.

Demo kế tiếp dùng lại nguồn Lila/Karo đã có, giữ nét, màu, mặt và trang phục. Chưa được dùng các asset sinh lại chưa duyệt làm bằng chứng rằng đã giữ chính xác mẫu gốc. Không sinh ảnh từng frame; không giả phoneme lip-sync.

## Một hành động nhỏ để kiểm chứng

Đưa một tay ra như đang nói với người bên cạnh → giữ → thu tay. Phối hợp nghiêng đầu nhẹ, chuyển trọng tâm nhỏ và nhịp nghỉ. Không xoay cả cảnh hoặc lặp một sine chung cho mọi bộ phận. Chân đứng yên có điểm tựa; cánh tay được phép thẳng. Chỉ có hai khúc cơ thể tại vai/khuỷu với hai chiều gấp hợp lý; không thêm khúc gấp để nối sai điểm.

Nhìn bạn diễn phải có góc mặt/pose phù hợp nguồn; di chuyển hai con mắt trên mặt nhìn thẳng không được gọi là quay đầu tự nhiên. Nếu thiếu ảnh góc nghiêng, báo `needs-pose`; trước tiên dùng chuyển động đầu nhỏ trong góc ảnh hiện có. Không tự vẽ lại mắt/mũi/miệng gốc.

## Phần đã triển khai ngày 11/10

- [x] Layer nguồn có polygon, alpha, pivot, parent và draw order; lưu nguyên bytes ảnh gốc. Cache kiểm hash; sửa timing dùng lại PNG, sửa hình tay thay cache.
- [x] Renderer Canvas dùng clock tuyệt đối, keyframe với quintic easing và ma trận parent→child; khuỷu đi theo vai, seek không tích lũy biến dạng.
- [x] Thay tay phía bên phải ảnh của Lila/Karo bằng hai nét thẳng đầu tròn và bàn tay mới. Mặt/hair/trang phục lấy từ nguồn; tay phía còn lại giữ gốc. Đây là tay trái giải phẫu nếu nhân vật nhìn thẳng khán giả.
- [x] Xóa vùng tay cũ theo polygon; phục hồi nền giấy đơn giản bằng nội suy hai chiều; lớp quần áo ở phía trước tay mới. Tư thế nghỉ cũng dùng tay mới, không bật về ảnh cũ.
- [x] CLI chuẩn bị source/layer và xuất clip im lặng 6 giây, 60 fps, 640×800. Hai bản `lila-new-arm-v4` và `karo-new-arm-v4` đã xuất và decode kiểm tra. Kết quả kỹ thuật có trong `../validation/2026-10-11-image-motion-character/REPORT.md`.
- [ ] Duyệt mỹ thuật tay/vai/bàn tay và nhịp động tác ở tốc độ thật. Không coi test kỹ thuật là bằng chứng đã đạt video mẫu.

Lệnh chạy thật và môi trường: `../topics/IMAGE-MOTION-CHARACTER.md`. Các bản thử dùng lại nguồn/candidate matte hiện có; không gọi sinh ảnh từng frame.

## Công việc còn lại

1. Editor polygon/mask/layer/điểm vai–khuỷu–cổ tay để người dùng áp dụng cho ảnh mới; hiện các mốc được tác giả đặt trong recipe CLI. Thêm clean-plate upload và lock/phê duyệt/provenance gắn với project.
2. Chuẩn bị tay đối diện, đầu và thân khi cần. Tay bị tóc che cần mask occlusion riêng; không xóa cả tóc để thay tay. Thiếu nền sau tay phải báo `needs-background`; nội suy nền giấy hiện tại không giải quyết cảnh rừng có texture hoặc phần thân bị che.
3. Phối hợp chuyển trọng tâm, đầu, ánh nhìn và biểu cảm từ asset phù hợp; một động tác tay hiện có chưa đủ thành diễn xuất. Thêm motion presets sau khi người dùng chấp nhận chất lượng; hạn chế theo khả năng nguồn.
4. Preview đứng yên và5–10 giây chuyển động cho từng asset mới; kiểm mép cắt/vai/halo/nền và sắc độ. Mặt và hai vùng quần áo được đo pixel-exact trên bản thử không chứng minh toàn bộ biên tóc/quần áo của mọi input đã chính xác.
5. Người dùng kiểm chất lượng động tác trước khi lấy làm preset nhân vật. Sau đó mới nối clock narration và video chung. Chạy/nhảy/quay người cần bộ pose và nghiệm thu riêng, chưa hứa dựng đủ từ một ảnh đứng.

## Môi trường và nguồn

Tái sử dụng Node/Sharp/Chrome/Canvas/FFmpeg trong repo. Không bắt buộc API image-to-video. Nguồn tham khảo có sẵn: `docs/topics/assets/reference-lila-full.png`, `reference-karo-full.png`; các cutout cũ là ứng viên, không mặc nhiên được duyệt. API editor hiện tại chỉ hỗ trợ vùng xoay; các command chuẩn bị/preview nhân vật sẽ được bổ sung khi có code chạy thật, không đưa CLI giả vào hướng dẫn.

## Tiêu chí để nối pipeline

Động tác ở tốc độ thật đủ tự nhiên theo đánh giá người dùng; khuỷu không bật/đảo phía, tay không tách vai và không duỗi quá chiều dài nguồn; nền sạch sau chuyển động; đầu/ánh nhìn có nguồn phù hợp; nét mặt không méo. Test kỹ thuật không thay đánh giá hình. Full factory vẫn còn story/script/WAV/SRT, TTS EN/VI/JA/KO, narration/subtitles, cảnh, final/QC/cache/resume và artifact bàn giao.
