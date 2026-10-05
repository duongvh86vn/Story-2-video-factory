# Thiết kế video theo câu chuyện

Factory là sản phẩm nhận chủ đề/câu chuyện hoặc lời kể hoàn chỉnh, tự lập
kịch bản khi cần, phân vai và dựng video. Người que/robot là diễn viên trong
thế giới câu chuyện. Nhà sáng tạo, người chờ xe, bạn bè hoặc người quan sát
chỉ xuất hiện khi nội dung có căn cứ; máy móc là một nhóm ví dụ.

## Nội dung quyết định cách dựng

Nhánh idea tạo lời kể từ đề bài; script đọc nguyên văn; WAV giữ giọng và dùng
ASR; SRT giữ cue/clock và fit TTS; WAV+SRT kiểm alignment. Tất cả dùng chung
clock narration đo thật, rồi story/beat/sceneIntent, cast, artDirection, stage,
performance, camera, scene, draft/review/repair/final/QC. Không gán thời lượng
ước lượng cho script rồi ép giọng để hợp một demo.

Một cảnh có thể kể bằng diễn viên, môi trường, đạo cụ, cutaway hoặc sơ đồ
nguyên lý nếu nội dung cần. Tám recipe là ý đồ ngữ nghĩa, không phải tám
layout bắt buộc. Cảnh không có đối tượng không phải tạo máy hay thẻ câu giả.
Camera, bảng màu, costume, kích thước diễn viên và nhịp cắt theo câu chuyện;
không ép một người dẫn, palette, tỉ lệ hiện diện hay chuỗi biểu cảm chung.

## Từ dàn cảnh tới chuyển động

Model tạo ngôn ngữ hình ảnh trong artDirection: brief/palette/layers/models,
identity cast và kế hoạch hình. Kiểm bố cục ở lúc hành động rõ nhất trước khi
đánh giá chuyển động: nét mặt, tay và đạo cụ cần đọc được; vùng phụ đề được
chừa. Foreground thuộc đúng đối tượng tạo che khuất có nghĩa trong thế giới
chung. Artwork và nguồn không bị thay bằng một mẫu demo viết tay.

Diễn xuất theo động tác nguồn: chuẩn bị/chuyển động/phản ứng khi có ý nghĩa,
ánh nhìn vào đối tượng hoặc người đang tương tác, nhịp giữ đủ để người xem
hiểu. Walking, posture, gaze, reaction và contact phải là hành động thật trên
rig. Camera hoặc chữ chuyển động không chứng minh nhân vật đã làm việc được
kể. Khoảng đứng yên có chủ đích được phép; giữ nguyên QC đã cấu hình và báo
FAIL nếu phim không đạt. Không đổi mục đích của động tác để vượt gate.

Compiler dùng clock cố định, SVG rig, CSS và GSAP timeline paused để preview/
render/tua ngược cùng một kết quả. Source, identity, độ dài xương, ownership,
reach/contact, caption, camera và security được kiểm bằng contract hiện hành.
Không thêm callbacks/wall-clock/network vào scene chỉ vì ví dụ plugin có dùng.
Miệng theo speech activity là mức đồng bộ thực tế; không gọi đó là phoneme
lip-sync hoặc giọng riêng từng vai.

## Vai trò HyperFrames và Remotion

Đã đọc skill cài đặt HyperFrames0.1.2 (authoring/GSAP/house-style/motion) và
Remotion4.0.530 (best-practices/router/app guidance). Chúng cung cấp hướng dẫn
cho code, timeline, preview, render và đánh giá layout. Những mẫu palette,
entrance hoặc tỷ lệ nhịp trong skill là gợi ý khi hợp câu chuyện; yêu cầu
của người dùng về tự do thiết kế được ưu tiên. Không áp luật mọi element đều
phải bay vào hoặc mọi cut phải crossfade lên phim diễn xuất.

Renderer sản xuất hiện là HyperFrames0.8.96, như package lock và engine yêu
cầu. Remotion chưa là backend có thể chọn trong Factory; cài plugin không
tự tích hợp React Player/renderer hoặc nâng package. Nếu tích hợp backend đó,
nó phải dùng cùng narration/cast/clock/locks/cache và gate final, có adapter
và proof riêng. Không công bố hỗ trợ backend chưa triển khai.

## Bằng chứng cần có

Model test độc lập kiểm protocol, timeline, actual frames/seek và phim tự sinh
từ đầu vào khác nhau. AUTHORED fixture chứng minh renderer, không chứng minh
model tự kể chuyện tốt. Technical QC chứng minh các phép đo, không chứng
minh thẩm mỹ hoặc nội dung. Nghiệm thu cần xem/nghe thực tế và đối chiếu lời
kể với hành động/biểu cảm/đạo cụ/camera; phần chưa quan sát phải ghi NOTRUN.

Xem [công cụ tổng quát](GENERAL-STORY-TOOL.md),
[TTS bên ngoài](EXTERNAL-TTS.md),
[bàn giao test](../TEST-HANDOFF.md). Luồng trạm xe buýt đang chuẩn bị để
kiểm kịch bản tiếng Anh; chưa thay thế matrix idea/WAV/SRT, hai rig,
EN/VI/JA/KO hoặc backend local/API. Phim thư viện QCFAIL cũ và mọi journal
được giữ nguyên.


<!-- NATIVE-RAINY-BUS-DIAGNOSTICS-20261005 -->
### Ca truyện đời thường và thông tin sửa dàn cảnh

Ca rainy-bus-stop-native đã chạy đúng một public make trên source0ba63bb.
Windows Speech Zira tạo audio27.906521s,7cue/clock27907ms và giữ nguyên
lời kể. Pipeline dừng ANALYZED: hai thiết kế bị từ chối bởi SVG/camera/source
gates; watchdog ngắt yêu cầu cuối08:13:21UTC. Không có storyboard được
chấp nhận, scene, draft hoặc video. Frame/acting/filmQC/xem-nghe toàn phim
NOTRUN.9call hoàn tất ở provider/schema,1call interrupted còn pending;
169793input/31462outputtokens đã ghi, usage của call ngắt và actualUSD chưa
đo được. Không gọi provider success là domain/filmPASS. Budget30call/2review,
review0 và scene{} giữ nguyên; dead-owner lock/journal được bảo tồn.

Release08:17:36UTC/report08:19:38UTC trước deadline08:21:06; không còn known
ownedprocess/listener. Giới hạn census/watchdog và raw failures nằm tại
docs/validation/2026-10-05-rainy-bus-stop-native.md. Full tool/matrix chưa
nghiệm thu; source mới không biến ca FAIL này thành phim đạt.

Source follow-up thêm danh sách SVG hiện được renderer hỗ trợ vào prompt
generation, diagnostic crop bằng projected envelope/viewport và lỗi câu
nguồn có shotID/received/currentcue. Giữ nguyên predicate/tolerance/tag
whitelist, câu nguồn, normalizer, identity, approved caches/locks và budget.
Không áp palette/bối cảnh hoặc template máy móc. Fullbuild0b446e+7897a9PASS;
kiểm độc lập source mới đang chạy trong scope riêng không gọi native/TTS.
README bắt đầu bằng project trống và nội dung người dùng; ví dụ hơi nước
chỉ còn là lựa chọn phụ. Bàn giao phiên bản: docs/GENERAL-TOOL-HANDOFF.md.


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


<!-- STORY-DESIGN-GUIDANCE-FOLLOWUP-20261005 -->
### Dàn cảnh và tạo hình theo nội dung: bản sửa tiếp

Director nhận brief thiết kế phim ở đầu generation prompt và danh sách actor/shot
locks thực sự đã duyệt. Preview/immutable của rig nền không khóa mọi vai thành
một mascot giống nhau. Tạo hình, costume, góc máy, chiều sâu và nhịp diễn chọn
theo câu chuyện; không áp palette, chủ đề, tỉ lệ actor, quota góc máy hay mẫu
layout cố định. Lời kể, nguồn, identity và lock đã duyệt vẫn giữ nguyên.

Guidance chỉ dùng khi sinh/sửa thiết kế; cache đã chấp nhận không bị redesign
tự động. Đây chưa là bằng chứng chất lượng hình mới. Build/typecheck đã qua;
kiểm runtime/lock/cache/director và video mới vẫn PENDING do tester hết hạn mức.
[Ca đã chạy và bộ kiểm tiếp](docs/validation/2026-10-05-rainy-bus-stop-continuation.md).
