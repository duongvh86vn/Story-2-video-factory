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
