# Kế hoạch tool tổng quát theo nội dung

Yêu cầu hiện hành: đưa một câu chuyện hoặc chủ đề vào để ra kịch bản và video, người que là diễn viên. Các ví dụ kỹ thuật không định hình toàn sản phẩm.

## Triển khai

- [x] Nhánh idea riêng, giữ bản gốc và nguồn; không giả làm SRT hoặc viết lại complete script.
- [x] Writer qua model router/journal/budget hiện có; mock writer dừng needs-script.
- [x] Kịch bản cache riêng, nguồn/title/kind/warnings; ngôn ngữ độc lập UI; clock từ TTS thật.
- [x] Studio/editor/upload/API/CLI: xem kịch bản trước TTS hoặc chạy video tự động; sửa bản sinh thành nguồn script rõ ràng.
- [x] Scene intent và cast theo tình huống, bỏ researcher/sentence-card mặc định; cảnh diễn viên không cần đạo cụ giả.
- [x] Không đổi thao tác thất bại thành chỉ/trình bày; trả lỗi layout/capability để sửa đúng ý đồ.
- [x] Đạo cụ generic trong actor scene không tự có nút máy; controlMode=none bỏ cả knob và marker, renderer override chủ động (artwork2.2.6, source).
- [x] Kiểm renderer đạo cụ đời thường bằng secured HTML/GSAP: 7/7 PASS, giữ geometry/report/clock; đây là protocol, chưa phải browser/phim.
- [x] Build/test:typecheck và export schema đồng bộ source24.
- [x] Runtime độc lập trên source24 + artwork2.2.6: authoring23/23, locked15/15, general-story-scenes36/36 PASS. [Raw scope và giới hạn](../validation/2026-10-04-general-story-tool.md).
- [x] Baseline archive9b94593 tái hiện sáu propFixture FAIL; sửa setup owner, giữ assertions cũ và thêm bảy owner negatives; actor53/53, tám-file193/193 PASS trên24.
- [x] Source25 thêm acting/source/target theo vai, coverage qua beat, posture/gaze temporal review và offline final gate; build/test:typecheck/schema qua.
- [x] Runtime closure source27: focused27/27, regression210/210, whole test:typecheck qua; source/clock/canonical cast gaps đóng bằng protocol checks. [Scope và raw failures](../validation/2026-10-04-story-acting-coverage.md).
- [ ] Public pipeline FINAL checkpoint/draft retention và phim/model/backend thật; helper/stub screenshot không thay acceptance.
- [ ] Xem/nghe phim tổng quát để chứng nhận chuyển động, biểu cảm, kể chuyện và chất lượng hình ảnh.

## Nghiệm thu độc lập

Kiểm nhánh idea và ba nhánh narration; nguồn/ngôn ngữ/model/giọng/cast sửa được và resume giữ cache hợp lệ. Dùng ít nhất một truyện hư cấu, một tình huống đời thường, một chủ đề lịch sử và một bài kiến thức tự nhiên. Cảnh có nhiều vai, phản ứng không đạo cụ, tương tác với đối tượng thường và cutaway khi nội dung cần. Giữ gate source/text/clock/contact/identity/camera/security/locks và final voice/QC. Test runtime do model khác thực hiện theo yêu cầu người dùng.

Video máy hơi nước/ô tô đã có chỉ là fixture có provenance; native FAIL/PARTIAL và raw failures giữ nguyên. Không đổi demo authored thành bằng chứng tool tự sinh mọi chủ đề. Không gọi build, stub TTS, một lời gọi writer hoặc QC kỹ thuật là nghiệm thu sản phẩm.
