# Diễn xuất cảm xúc theo câu chuyện — source28

Trạng thái PROGRESS, chưa nghiệm thu phim. Mục tiêu vẫn là tool tổng quát câu chuyện/chủ đề → kịch bản → diễn viên → video. Runtime giao model khác theo yêu cầu người dùng.

## Giới hạn được tìm thấy từ source

Animation2.2.10 chỉ có tám mood thiên về quan sát/giải thích. Camera cận mặt chỉ cho curious/thinking/surprised/understanding, kể cả khi diễn viên cần thể hiện buồn, vui hoặc giận. Đây là giới hạn contract tìm thấy bằng đọc source, không phải lỗi đã tái hiện trong phim mới.

## Triển khai

- Animation2.2.11 thêm happy, sad, angry, afraid, excited, disappointed, relieved, tired cho cả hai rig. Không áp trình tự cảm xúc bắt buộc hoặc tự suy diễn động cơ/lời thoại.
- Dùng mắt, mí, mày, đầu/thân và đường miệng đã có. Miệng buồn/giận/thất vọng phản chiếu đường cong quanh tâm miệng bằng SVG transform có số hữu hạn; không đổi artwork/bones/rig identity hoặc thêm mã tùy ý.
- Actor face close chấp nhận mọi phản ứng khác neutral; presenter cũ giữ điều kiện khám phá. Contact close/medium, framing, subtitle clearance và identity/source validators vẫn giữ.
- Preview diễn viên có đủ 16 mood, dùng cùng evaluator với renderer. Cache preview được cập nhật riêng; profile/rig đã hợp lệ được giữ, không gọi lại model biên dịch custom MD chỉ vì preview mới.
- Plan2.2.7–2.2.10 vẫn đọc được; hai tay và ghế của2.2.10 vẫn hợp lệ. Mood mới yêu cầu compiler2.2.11. Director2.2.28 đổi fingerprint hình, narration/voice fingerprint không đổi; không retag hay mở khóa plan đã duyệt.

## Evidence và giới hạn

Parent `npm run build` exit0 (session22643/chunk1311f8), `npm run test:typecheck` exit0 (chunk9d5c24), không chạy runtime. Schema export được ghi cùng receipt source28 ngoài repo. Bộ focused27/27 và regression210/210 của source27 vẫn là evidence lịch sử, không chứng minh thay đổi28.

Lượt public FINAL mới bắt đầu chuẩn bị lúc06:12:33UTC trên a0e2437; cả hai worker sau đó terminal với lỗi usage limit. Root `story-acting-public-final-a0e2437-20261004/run-20261004T061233Z` chỉ có receipt/source notes/argv/supervisor, không có executable test mới hoặc runtime output/exit receipt. Không có kết quả PASS mới, không dùng hết deadline làm bằng chứng test đã chạy. Parent quan sát không có owned Node test process trong inventory; không dừng process của project khác. Không đổi account/model, reset journal/budget hoặc chạy browser/media để thay thế.

**NOT RUN source28:** renderer GSAP/frame/seek thực, morphology miệng và góc mày trong browser, hình preview thật, actor close-up, legacy rig/cache/resume/locked migration, public FINAL checkpoint/draft retention, native model/full-film/listening. Build/typecheck không chứng minh cảm xúc dễ đọc hoặc phim tự nhiên.

## Bàn giao runtime

1. Giữ assertions cũ; thêm cả hai rig cho 16 mood. Kiểm mouth curve hướng xuống và tâm miệng không trôi, mày/mí/mắt phân biệt sad/angry/afraid/happy; không chỉ assert tên enum.
2. Thực thi GSAP của renderer trong DOM hoặc browser và seek tiến/lùi, so transform/opacity với sample frame. Kiểm boundary, silence và audio activity; voiceover actors mặc định không nói. SVG security vẫn từ chối executable/resource/attribute payload.
3. Kiểm actor face close sad/happy/angry/afraid pass khi geometry hợp lệ; neutral/contact-hidden/cropped face vẫn fail. Presenter cũ giữ điều kiện khám phá.
4. Giữ raw source27 rig assets và cached custom profile để chứng minh rig/profile/pose/audio bytes không đổi, preview mới có16 mood và không gọi lại provider. Plan2.2.10 với ghế/hai tay còn valid; mood mới trên compiler cũ phải bị chặn. Locked producer cũ conflict rõ, không retag.
5. Hoàn thiện fixture public runPipeline FINAL với mọi stageOutputs/hash hiện hành và checkpoint REPAIRED, fail-closed renderer/provider/browser boundaries. Giữ draft khi art direction/motion/voice bị chặn; model/authored hợp lệ đến controlled final producer. Bản draft fixture cũ trong pending giữ nguyên lịch sử.
6. Sau protocol, dựng và xem/nghe phim tự sinh nội dung đời thường/hư cấu có nhiều vai, phản ứng và vật dụng thường. Dùng model/backend đã cấu hình, journal/budget hiện có; không viết tay phim thay native generation. Máy hơi nước/ô tô chỉ là fixture regression. Full input/language/backend matrix còn theo TEST-HANDOFF.
