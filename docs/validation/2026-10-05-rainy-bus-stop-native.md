# Kết quả native: truyện tại trạm xe buýt

**FAIL / time bound; chưa có video.** Đây là một kịch bản đời thường tiếng Anh
để kiểm tool tổng quát, không phải mẫu máy móc hoặc storyboard viết tay.
Người dùng đã duyệt đúng một lần chạy thật.

## Kết quả đã quan sát

- Public CLI make duy nhất trên source0ba63bb; script/config giữ đúng hash.
- Zira Windows Speech:27.906521s WAV probe/decodePASS,7cue/clock27907ms,
  script words/order nguyên văn. Nghe tốc độ bình thườngNOTRUN.
- ANALYZED được chấp nhận. Storyboard1 dùng SVG pattern chưa hỗ trợ và
  crop shelter/rain; storyboard2 còn crop rain và rút thiếu câu sceneIntent.
- Lượt sửa tự động cuối còn đang chờ khi watchdog ngắt08:13:21.884UTC;
  PID23696 thoát cưỡng bức(-1), engine finally chưa chạy.
- Không acceptedstoryboard/scenes/draft/final; frame/cast/acting/subtitle/
  filmQC/xem-nghe toàn phimNOTRUN.
- Có 9 lượt gọi provider/schema thành công, nhưng không có nghĩa cả 9 kết
  quả đều đạt validator nội dung; 1 lượt bị ngắt còn pending. Đã ghi nhận
  169.793 input tokens và 31.462 output tokens. Usage của lượt bị ngắt và
  chi phí thực tế chưa đo được; estimated cost bằng 0 không chứng minh miễn phí.
- Budget30calls/2reviews giữ nguyên, review0/scene{}; không reset/force/
 clone/accountswitch/relaunch hoặc sửa artifacts để pass.

## Release và giới hạn

Formal release08:17:36.344UTC; báo cáo xong08:19:38UTC trước deadline08:21:06.
Không còn knownowned process/listener. Physical lock có deadowner23696 và
request pending được giữ nguyên; không xóa lock hoặc journal thủ công.

Scope07:45:06UTC/cutoff08:14:06UTC/deadline08:21:06UTC. Watchdog dừng sớm
so với deadline tổng; đây là time bound của phiên kiểm chứng, không phải
source/model timeout đã đo thành công. Lệnh orderlyteardown chỉ chạy sau
watchdog08:13:31 và không có target để dừng.

Driver PID/kernelbirth/argv và tree có census; supervisor kernelbirth/argv
chưa ghi riêng. Poll1giây có thể bỏ sót child ngắn; một số argv không có.
Browser precontent interception chưa có, và không browser nào được tới.
Không có tool hỗ trợ normal-speedwatch/listen. Các lỗi consoleprojection
và maxResponseBytes(requestsize) trước đó giữ đúng lịch sử trong report.

Raw evidence ngoài repo:

- C:/Users/Duongvh-pc/codex-test-evidence/rainy-bus-stop-prep-20261005T072006Z/runtime-20261005T074506Z/REPORT.md
- C:/Users/Duongvh-pc/codex-test-evidence/rainy-bus-stop-prep-20261005T072006Z/runtime-20261005T074506Z/formal-release-report.json
- C:/Users/Duongvh-pc/codex-test-evidence/rainy-bus-stop-prep-20261005T072006Z/runtime-20261005T074506Z/native-creative-domain-rejected-01.json
- C:/Users/Duongvh-pc/codex-test-evidence/rainy-bus-stop-prep-20261005T072006Z/runtime-20261005T074506Z/native-creative-domain-rejected-02.json
- C:/Users/Duongvh-pc/codex-test-evidence/rainy-bus-stop-prep-20261005T072006Z/runtime-20261005T074506Z/terminal-model-calls.jsonl
- C:/Users/Duongvh-pc/codex-test-evidence/rainy-bus-stop-prep-20261005T072006Z/runtime-20261005T074506Z/terminal-project-state.json
- C:/Users/Duongvh-pc/codex-test-evidence/rainy-bus-stop-prep-20261005T072006Z/runtime-20261005T074506Z/watchdog-fired.json
- C:/Users/Duongvh-pc/codex-test-evidence/rainy-bus-stop-prep-20261005T072006Z/runtime-20261005T074506Z/speech-text-clock-proof.json

Formal receiptSHA256:b6e7b8e7eaab15d1c7d0f4c1efa2263fdc66d94eb1b79a3b8a201344bce159bd. Source/runtime/script/config
frozen không đổi. Báo cáo tự sinh chưa phải nghiệm thu toàn sản phẩm.

## Source follow-up

Danh sách tag generation lấy trực tiếp từ validator hiện hành, trả bản copy.
Không thêm pattern/filter hoặc nới security. Diagnosticcrop ghi bounds
projected ở hai đầu camera/đường locomotion cùng requiredviewport. Các số
diag làm tròn3 chữ số chỉ để đọc; phép kiểm gốc và tolerance giữ nguyên.
Lỗi sceneIntent có giá trị nhận, cueID/text tham chiếu hiện tại, flagtruncated
cho text dài và shotID để director biết chính xác chỗ cần sửa.

System/context/schema/generationidentity giữ nguyên; guidance chỉ nằm trong
promptgeneration để giữ validcache và matchingrejecteddesign có thể được
gửi nguyên vẹn cho model sửa. Không sửa response native cũ hoặc chấp nhận
candidate bằng tay. Build0b446e+7897a9PASS; kiểm tra source bổ sung đã PASS (release bên dưới).
Nghiệm thu chất lượng phim và input/language/backend/two-rig matrix OPEN.


<!-- NATIVE-WATCHDOG-INTERPRETATION-20261005 -->
### Giới hạn của lần kiểm chứng bị ngắt

Đọc supervisor gốc xác nhận stopAt là min(launch +25 phút, cutoff khởi tạo
job −45 giây). Cutoff là08:14:06UTC, nên watchdog đặt08:13:21UTC; deadline
kết phiên là08:21:06UTC. Như vậy job đang chạy bị dừng sớm7phút45giây so
với deadline. Lượt ba không có response và không thể chấm là domain reject
hoặc timeout900s của provider. Hai domain rejection đầu vẫn là lỗi thực.

Kiểm chứng tiếp phải phân biệt cutoff không bắt đầu job mới với deadline
dành cho job đang chạy và thời gian cleanup. Không sửa supervisor/receipt
hoặc journal cũ để viết lại kết quả; không có relaunch trong lượt này.
Source guidance/diagnostic mới chưa chứng minh có phim đạt chất lượng.


<!-- DESIGN-DIAGNOSTICS-SOURCE-RELEASE-20261005 -->
### Kiểm source độc lập đã bàn giao

Release08:45:40UTC trước deadline08:48:31UTC:125/125 existing tests và
5/5 supplemental tests PASS; whole-test typecheckPASS. Năm sourcehash và
66existingtestfiles không đổi.23 observed processbirths đều terminal,
không còn listener thuộc phiên test. Newtest source-protocol-diagnostics
được bàn giao với SHA8E9C7FFCC017D65E4BAD6405ABFF16FC74F88458144EFA8AF53AB0D93A0D038A.

SVG/source/crop negatives vẫn bị từ chối. Promptgeneration và matching
repair có capability list; JSON rejected được gửi nguyên vẹn, receipt cũ
không sửa. Accepted cache roundtrip giữ storyboard/artwork/scene bytes
và không gọi model lại. Chưa chạy riêng renderer trước patch để so byte;
không gọi đó là proof pre-patch parity. Native replay/film/broad suite NOTRUN.
Raw harness/fixture failures và typecheckFAIL ban đầu được giữ trong
C:/Users/Duongvh-pc/codex-test-evidence/source-protocol-20261005T083200Z/REPORT.md.

Build0b446e+7897a9 đã qua trước test, source sau release không đổi. Đây là
nghiệm thu source/protocol riêng, không biến native rainy case time-bound
FAIL hoặc phim thư viện QCFAIL thành video đạt. Full product/matrix OPEN.
