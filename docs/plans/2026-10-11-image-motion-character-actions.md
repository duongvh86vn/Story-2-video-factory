# Nhân vật từ ảnh gốc: hành động trước, pipeline sau

## Yêu cầu mới và giới hạn hiện tại

Người dùng thấy ellipse rotation cứng và hỏi nhân vật có diễn tả hành động không. Câu trả lời hiện tại: **chưa**. Hướng ảnh gốc vẫn giữ, nhưng người cần layer và nhịp diễn; không áp preset bánh răng cho tay hoặc khuôn mặt.

Demo kế tiếp dùng lại nguồn Lila/Karo đã có, giữ nét, màu, mặt và trang phục. Chưa được dùng các asset sinh lại chưa duyệt làm bằng chứng rằng đã giữ chính xác mẫu gốc. Không sinh ảnh từng frame; không giả phoneme lip-sync.

## Một hành động nhỏ để kiểm chứng

Đưa một tay ra như đang nói với người bên cạnh → giữ → thu tay. Phối hợp nghiêng đầu nhẹ, chuyển trọng tâm nhỏ và nhịp nghỉ. Không xoay cả cảnh hoặc lặp một sine chung cho mọi bộ phận. Chân đứng yên có điểm tựa; cánh tay được phép thẳng. Chỉ có hai khúc cơ thể tại vai/khuỷu với hai chiều gấp hợp lý; không thêm khúc gấp để nối sai điểm.

Nhìn bạn diễn phải có góc mặt/pose phù hợp nguồn; di chuyển hai con mắt trên mặt nhìn thẳng không được gọi là quay đầu tự nhiên. Nếu thiếu ảnh góc nghiêng, báo `needs-pose`; trước tiên dùng chuyển động đầu nhỏ trong góc ảnh hiện có. Không tự vẽ lại mắt/mũi/miệng gốc.

## Công việc triển khai, chưa hoàn thành

1. Contract layer alpha + crop nguồn + mask + pivot + parent + thứ tự trước/sau + clean plate và provenance. Mọi sửa crop/mask thay cache của layer liên quan; sửa timing không tạo lại ảnh.
2. Chuẩn bị riêng upper-arm/forearm/hand/head/body khi cần. Mask theo đường viền, không ellipse crop cả nền. Thử nguồn có sẵn; kiểm RGB/biên alpha với ảnh thật. Thiếu nền sau tay phải báo `needs-background`, không để tay cũ nằm dưới tay mới. Phần bị che không có trong một ảnh: cần patch nguồn, layer bổ sung hoặc pose được duyệt.
3. Renderer keyframe theo thời gian tuyệt đối, hierarchy giữ vai/khuỷu gắn liên tục; anticipation → action → hold → recovery, ease chuyển tốc độ liên tục. Biên độ và vùng di chuyển giới hạn theo asset, không bẻ hình vượt khả năng nguồn.
4. Preview đứng yên và5–10 giây chuyển động; dùng nguồn thật và góc cận tay/mặt. Kiểm seek/export cùng frame, không mờ/halo/đúp tay, không thay tỷ lệ và màu tổng thể. Giữ các layer để tái sử dụng.
5. Người dùng kiểm chất lượng động tác trước khi lấy làm preset nhân vật. Sau đó mới nối clock narration và video chung. Chạy/nhảy/quay người cần bộ pose và nghiệm thu riêng, chưa hứa dựng đủ từ một ảnh đứng.

## Môi trường và nguồn

Tái sử dụng Node/Sharp/Chrome/Canvas/FFmpeg trong repo. Không bắt buộc API image-to-video. Nguồn tham khảo có sẵn: `docs/topics/assets/reference-lila-full.png`, `reference-karo-full.png`; các cutout cũ là ứng viên, không mặc nhiên được duyệt. API editor hiện tại chỉ hỗ trợ vùng xoay; các command chuẩn bị/preview nhân vật sẽ được bổ sung khi có code chạy thật, không đưa CLI giả vào hướng dẫn.

## Tiêu chí để nối pipeline

Động tác ở tốc độ thật đủ tự nhiên theo đánh giá người dùng; khuỷu không bật/đảo phía, tay không tách vai và không duỗi quá chiều dài nguồn; nền sạch sau chuyển động; đầu/ánh nhìn có nguồn phù hợp; nét mặt không méo. Test kỹ thuật không thay đánh giá hình. Full factory vẫn còn story/script/WAV/SRT, TTS EN/VI/JA/KO, narration/subtitles, cảnh, final/QC/cache/resume và artifact bàn giao.
