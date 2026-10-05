# Kế hoạch tool tổng quát theo nội dung

Yêu cầu hiện hành: đưa một câu chuyện hoặc chủ đề vào để ra kịch bản và video, người que là diễn viên. Các ví dụ kỹ thuật không định hình toàn sản phẩm.

## Triển khai

- [x] Nghiệm thu indication/speech31:102/102 PASS, whole test:typecheck qua. Regression100PASS/23FAIL cleanup; retained23/23 không xóa FAIL mặc định.
- [x] Genuine native resume31 quaANALYZED: labels/point/speech do model thật,9artifact và journalprefix giữ nguyên. Sau đó STORYBOARDED provider timeout180s, không có phim.
- [x] Native timeout15phút trả8-shot thật nhưng domainFAIL; ceiling30/history giữ nguyên,24call hoàn tất. Default fixture cleanup23/23, whole npm test963PASS/3SKIP/0FAIL và typecheck qua; chưa nghiệm thu phim.
- [x] Precision representation exact1e-6 hoặc canonical anchor làm tròn3 chữ số:225/225 scoped, default224PASS/1SKIP và regression cũ155/155/typecheck qua. Old2e-6 assertion giữ nguyên; dung sai0.001px đã bỏ và rawFAIL giữ.
- [x] Prop-origin serialization ULP-only:149/149 scoped, default148PASS/1SKIP, regression289PASS/1SKIP/typecheck qua; genuine native thư viện đã tớiDRAFT_RENDERED/REVIEWED/REPAIRED.
- [x] Native xuất phim27.067s qua FINAL_RENDERED nhưng QC FAIL cảnh tĩnh; sampled pixels yếu identity/bàn chồng nét. RawFAIL giữ; không DONE/qualityPASS.
- [x] Typed actor-freeze repair source/protocol:41/41 +512PASS/2SKIP regression/typecheck; source/cast/motion protection, cache/timeline atomic, public override giữ config/budget; build qua.
- [x] Lượt actor repair thật giữ nguyên project/cấu hình/journal:28 call/0 pending, FAIL target trong react; không có phim mới, review/scene budget2/2. Giữ dữ liệu bị từ chối và phim QC-failed.
- [x] Dynamic provider schema loại target khỏi react mới, giữ gesture được bảo vệ; prompt tách idle/hand/clock. Independent50/50, default49PASS/1SKIP, regression706PASS/2SKIP và typecheck qua (snapshot trước sửa màu).
- [x] JSON/Zod/adapter parity màu hoa/thường không coercion:11/11, uppercase acting50/50, default49PASS/1SKIP, typecheck qua; observedregression180PASS/1SKIP có bảy browser observations ngoài phạm vi worker. Build/schema đồng bộ, không nghiệm thu phim.
- [ ] Genuine render/QC/xem nghe lại phim thư viện; cải thiện identity/bố cục và nghiệm thu nhiều chủ đề/input/ngôn ngữ/backend.

- [x] Source31/explanation6 thêm indication/speech và coverage đúng target/cue/actor, mô tả nhãn source excerpt; build/typecheck/schema qua, không nới validator.
- [x] Source31 đã qua102/102; genuine resume quaANALYZED và phim native đã được xuất ở checkpoint sau. Lỗi Library table ban đầu và mọi raw failure vẫn giữ nguyên; phim hiện tại QC FAIL.

- [x] Source30: Studio không chọn sẵn ví dụ máy hơi nước, mở form nội dung khi tạo project; bộ raw input tổng quát, không có storyboard authored.
- [x] Public runPipeline FINAL checkpoint source29:10/10 PASS, draft/repair-budget giữ nguyên, stale final không được nhận. Producer media bị chặn có chủ đích; chưa chứng minh video.
- [x] Runtime29:26PASS/4FAIL focused số giữa frame,169/169 regression; giữ raw. Source30/animation13 sửa face refinement/độ chính xác clock, giữ12 và các version cũ. Build/typecheck/schema qua.
- [x] [Follow-up30](../validation/2026-10-04-general-story-followup.md): unchanged runtime assertions và luồng nhập tổng quát đã kiểm tra; native thư viện có writer/dàn cảnh/phim thật, nhưng QC FAIL và chưa nghiệm thu chất lượng.

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
- [x] Source28/animation2.2.11 mở rộng16 mood và actor reaction close-ups, giữ artwork/rig và voice identity; build và test:typecheck qua.
- [x] Source29/animation2.2.12 nối mood liền nhau, blend trực tiếp phản ứng mới và bake mốc clip ngắn; giữ evaluator cũ và clock. Build/typecheck qua, chưa runtime.
- [ ] [Nghiệm thu biểu cảm liên tục](../validation/2026-10-04-emotion-continuity.md), gồm cả hai rig, GSAP/seek/boundaries/contact/speech/legacy.
- [ ] Runtime source28: miệng/mày/mắt thật trong GSAP/browser, preview/camera/cache/legacy/locks và toàn phim. [Bàn giao và usage-limit của lượt FINAL](../validation/2026-10-04-story-emotions.md).
- [ ] Public pipeline FINAL checkpoint/draft retention và phim/model/backend thật; helper/stub screenshot không thay acceptance.
- [ ] Xem/nghe phim tổng quát để chứng nhận chuyển động, biểu cảm, kể chuyện và chất lượng hình ảnh.

- [ ] Nhận diện tạo hình trùng giữa các vai do seed/model sao chép; hướng dẫn phân biệt vai nhưng cho phép giống nhau có chủ đích, không ép palette/trang phục.
- [ ] Thiết kế depth ownership cho model đồ vật để đồ nội thất có thể che đúng thân/chân diễn viên; giữ source/target/contact. Audit source chưa chứng minh nguyên nhân bàn chồng nét.

## Nghiệm thu độc lập

Kiểm nhánh idea và ba nhánh narration; nguồn/ngôn ngữ/model/giọng/cast sửa được và resume giữ cache hợp lệ. Dùng ít nhất một truyện hư cấu, một tình huống đời thường, một chủ đề lịch sử và một bài kiến thức tự nhiên. Cảnh có nhiều vai, phản ứng không đạo cụ, tương tác với đối tượng thường và cutaway khi nội dung cần. Giữ gate source/text/clock/contact/identity/camera/security/locks và final voice/QC. Test runtime do model khác thực hiện theo yêu cầu người dùng.

Video máy hơi nước/ô tô đã có chỉ là fixture có provenance; native FAIL/PARTIAL và raw failures giữ nguyên. Không đổi demo authored thành bằng chứng tool tự sinh mọi chủ đề. Không gọi build, stub TTS, một lời gọi writer hoặc QC kỹ thuật là nghiệm thu sản phẩm.

<!-- CAST-MODEL-DEPTH-SOURCE-20261005 -->
## Checkpoint source05/10 — bổ sung cho checklist trước

- [x] Source advisory cho co-present rendered-input trùng; medium, không tự sửa tạo hình hoặc cấm giống có chủ đích.
- [x] Source foregroundSvg cùng sourced model/shared projection/clock/props/events và cache opt-in.
- [x] Fullbuild49223 và export schema0992a8 exit0.
- [ ] Kiểm độc lập cast/depth/security/default cache/actual frames/locks, đúng scope/deadline/ownership.
- [ ] Nghiệm thu video model thật đa chủ đề/đầu vào/ngôn ngữ/backend; toàn phim và âm thanh. Phim thư viện cũ QCFAIL không đổi.

Source và giới hạn: ../validation/2026-10-05-cast-and-model-depth.md.
<!-- CAST-DEPTH-SCOPED-PASS-20261005 -->
### Cập nhật cast/depth05/10

Đã bổ sung advisory tạo hình cùng cảnh và mảnh foreground cùng sourced model;
không áp palette/wardrobe/người dẫn/chủ đề bắt buộc.32/32focused và563PASS/2SKIP
relevant regression/whole-test typecheck đã qua trên source đã sửa. Default cache
và khóa cũ được giữ; prop hai rig/eventclock/tua ngược kiểm bằng AUTHORED browser
fixtures. Nghiệm thu tự viết/phân vai/dàn cảnh/phim đa chủ đề và livevoices còn mở,
không lấy phim QCFAIL cũ làm thành phẩm. Chi tiết ở validation/2026-10-05-cast-and-model-depth.md
(đường dẫn từ root: docs/validation/2026-10-05-cast-and-model-depth.md).
