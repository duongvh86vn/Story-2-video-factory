# Kế hoạch tool tổng quát theo nội dung

Yêu cầu hiện hành: đưa một câu chuyện hoặc chủ đề vào để ra kịch bản và video, người que là diễn viên. Các ví dụ kỹ thuật không định hình toàn sản phẩm.

## Triển khai

- [x] Nhánh idea riêng, giữ bản gốc và nguồn; không giả làm SRT hoặc viết lại complete script.
- [x] Writer qua model router/journal/budget hiện có; mock writer dừng needs-script.
- [x] Kịch bản cache riêng, nguồn/title/kind/warnings; ngôn ngữ độc lập UI; clock từ TTS thật.
- [x] Studio/editor/upload/API/CLI: xem kịch bản trước TTS hoặc chạy video tự động; sửa bản sinh thành nguồn script rõ ràng.
- [x] Scene intent và cast theo tình huống, bỏ researcher/sentence-card mặc định; cảnh diễn viên không cần đạo cụ giả.
- [x] Không đổi thao tác thất bại thành chỉ/trình bày; trả lỗi layout/capability để sửa đúng ý đồ.
- [x] Build/test:typecheck và export schema đồng bộ source24.
- [ ] Runtime độc lập trên snapshot24 bàn giao; source23 authoring23/23 và lock15/15 qua, generic scene và related regression FAIL, bản sửa24 chưa chạy lại do usage limit. [Raw scope](../validation/2026-10-04-general-story-tool.md).
- [ ] Xem/nghe phim tổng quát để chứng nhận chuyển động, biểu cảm, kể chuyện và chất lượng hình ảnh.

## Nghiệm thu độc lập

Kiểm nhánh idea và ba nhánh narration; nguồn/ngôn ngữ/model/giọng/cast sửa được và resume giữ cache hợp lệ. Dùng ít nhất một truyện hư cấu, một tình huống đời thường, một chủ đề lịch sử và một bài kiến thức tự nhiên. Cảnh có nhiều vai, phản ứng không đạo cụ, tương tác với đối tượng thường và cutaway khi nội dung cần. Giữ gate source/text/clock/contact/identity/camera/security/locks và final voice/QC. Test runtime do model khác thực hiện theo yêu cầu người dùng.

Video máy hơi nước/ô tô đã có chỉ là fixture có provenance; native FAIL/PARTIAL và raw failures giữ nguyên. Không đổi demo authored thành bằng chứng tool tự sinh mọi chủ đề. Không gọi build, stub TTS, một lời gọi writer hoặc QC kỹ thuật là nghiệm thu sản phẩm.
