# Bàn giao tool theo nội dung

Mục tiêu sản phẩm là **chủ đề/câu chuyện → kịch bản → video**, với người que
hoặc robot đóng vai trong câu chuyện. Nhà máy, máy hơi nước và ô tô là dữ liệu
ví dụ. Một phim mẫu đẹp cũng không chứng minh mọi đầu vào đã được nghiệm thu.

## Luồng sử dụng hiện hành

1. Tạo project trống, mở **Nội dung, diễn viên và giọng kể**.
2. Chọn **Chủ đề / Câu chuyện** nếu cần viết lời kể, hoặc **Kịch bản** nếu đã có
   lời kể hoàn chỉnh. WAV và SRT là hai nguồn narration khác được giữ riêng.
3. Chọn ngôn ngữ, kiểu tạo hình người que/robot, model viết/thiết kế và giọng.
4. Bấm **Tạo video**. Có thể xem/sửa kịch bản trước TTS khi dùng nhánh chủ đề.

Nội dung quyết định các vai, hành động, biểu cảm, đồ vật, môi trường và camera.
Cảnh có thể chỉ có diễn viên hoặc môi trường; không cần tạo đối tượng máy móc
để có target. Giọng ngoài hình không bắt diễn viên nói toàn bộ lời kể.

## Đã triển khai và phần cần nghiệm thu

| Phần | Đã có trong source | Giới hạn bằng chứng hiện tại |
|---|---|---|
| Chủ đề/câu chuyện | Writer riêng; kịch bản có nguồn, cache và editor | Truyện thư viện có writer/TTS/phim thật nhưng phim bị QC chặn; chưa đạt chất lượng |
| Kịch bản hoàn chỉnh | Đọc nguyên văn, clock từ audio thực | Ca trạm xe buýt có audio thật nhưng dừng ANALYZED; không có phim |
| WAV/SRT/WAV+SRT | Nguồn và clock riêng, kiểm mismatch/fit/voice | Không suy ra toàn bộ matrix video từ các kiểm tra audio hoặc protocol; alignment cần backend |
| Diễn viên | Cast theo nguồn, identity, hai tay, tư thế, gaze, 16 biểu cảm | Test rig/clock không chứng minh đạo diễn và hình ảnh tự sinh tốt |
| Thiết kế | Artwork/camera/set theo truyện, cảnh không có đồ vật, foreground cùng đối tượng | Cần xem phim thực để đánh giá silhouette, tương tác, biểu cảm, bố cục và nhịp kể |
| Giọng | EN/VI/JA/KO; Windows, HTTP, compatible, OmniVoice, command | Windows EN và bridge local có audio thật; live backend người dùng/OmniVoice/JA/KO chưa được xác nhận |
| Preview/resume | Giữ audio khi đổi hình; stale scene chặn preview/download; locks và lịch sử giữ nguyên | Phần hash gate không được coi là chứng minh an toàn với mọi coordinated tampering |
| Renderer | HyperFrames/HTML/CSS/SVG/JavaScript theo clock cố định | Plugin Remotion đã tham khảo; Remotion chưa là backend chọn được |

Checkpoint của ca native trước bản sửa: `0ba63bb0e60b930bfceff766720f44f7b8bc43b4`, branch
`codex/stickman-acting-v22`, đã cập nhật repository người dùng chỉ định.
Build/typecheck và các kiểm tra nguồn/cache có bằng chứng độc lập riêng.
Không gọi các kết quả đó là nghiệm thu chất lượng video.

## Ca kiểm chứng: FAIL, chưa có video

Lời kể tiếng Anh gồm Maya chờ xe trong mưa, Noah đến trú mưa, họ nhận thấy
và mỉm cười với nhau. Đây là kịch bản đầu vào để pipeline tự phân vai và dựng
hình, không phải storyboard hoặc artwork viết tay để giả thành kết quả tự sinh.

Người dùng đã cho phép một lần chạy thực bằng model test độc lập: truyền
kịch bản tới tài khoản đang đăng nhập, Windows Speech và render/QC; giới hạn
30 lượt gọi model và 2 vòng review. Lượt launch trước bị approval review từ
chối và không thực thi; receipt cũ giữ nguyên. Báo cáo ghi rõ điểm dừng và phần NOTRUN.

## Điều kiện kết luận hoàn thành

Cần phim tự sinh đạt nội dung và chất lượng với chuyện đời thường, hư cấu,
lịch sử và kiến thức tự nhiên; kiểm các nguồn narration, hai kiểu tạo hình,
ngôn ngữ/provider khả dụng, sửa nội dung/giọng/cast và resume. Xem/nghe toàn
phim là nghiệm thu riêng. Phim QC FAIL, fixture authored, ảnh chụp hoặc trạng
thái DONE kỹ thuật không thay thế các điều kiện này.

Báo cáo thực tế: [native trạm xe buýt](validation/2026-10-05-rainy-bus-stop-native.md).
Có 9 lượt gọi hoàn tất và 1 lượt bị ngắt còn pending; hai storyboard bị
validator từ chối, chưa có storyboard được chấp nhận hoặc MP4.

## Dùng đúng phiên bản

Studio tại http://127.0.0.1:8850/ đang chạy từ worktree
`C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`.
Source được cập nhật GitHub ở nhánh `codex/stickman-acting-v22`; main chưa
được merge. Thư mục D:/github/Story-2-video-factory2.1 còn main cũ và thay
đổi local riêng, được giữ nguyên. Model test phải dùng đúng worktree/branch
và báo sourceSHA; không chạy npm từ folder cũ rồi suy ra kết quả bản mới.

Source sửa diagnostic/guidance sau nativeFAIL đã build; independent source
checks riêng đã PASS (xem release bên dưới). Chưa chạy thêm một native invocation.


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


<!-- CODEX-IMAGE-REVIEW-20261005 -->
### Review ảnh tùy chọn qua Codex CLI

Role visual_review với provider=codex-cli và vision=true có thể gửi contact/
action/reference sheets bằng --image. Request được gắn hash đúng bytes/MIME;
giới hạn64ảnh/20MiB mỗi ảnh/128MiB tổng. Workspace vẫn read-only, tool disabled;
không tự đổi model/account/configuration hoặc xóa budget. Review dùng identity
của từng vai đã duyệt, không khóa mọi diễn viên vào mascot của rig nền.

Bản vá đã build/typecheck; test độc lập và native vision mới PENDING. Phim trạm
xe buýt đã render trước đó vẫn QC FAIL. Ảnh tĩnh chưa chứng minh chuyển động
mượt hoặc audio sync. [Cấu hình, giới hạn và bộ kiểm tiếp](CODEX-IMAGE-REVIEW.md).
