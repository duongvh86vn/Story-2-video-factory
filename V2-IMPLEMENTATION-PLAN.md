# Kế hoạch V2.2 — diễn viên trong câu chuyện

Ngày02/10/2026. [STORY-ACTOR-DIRECTION.md](STORY-ACTOR-DIRECTION.md) là đặc tả hiện hành. Người que đóng vai trong câu chuyện, có thể là người lịch sử được narration/source nêu tên. Bỏ người dẫn cố định và quota. Ba luồng script/WAV/SRT cùng WAV+SRT vẫn giữ nguyên văn và clock.

Kế hoạch tác vụ, files/contracts/checks và checkbox triển khai tại [docs/plans/2026-10-02-story-actors.md](docs/plans/2026-10-02-story-actors.md). Kế hoạch thiết kế mở01/10 giữ nền artwork/provider/security; những đoạn về presenter đã bị thay thế. Evidence cũ giữ ở IMPLEMENTATION-STATUS và TEST-RESULTS; không đổi thành nghiệm thu actors.

| Phần | Trạng thái source2.2.21 | Điều còn phải xác minh |
|---|---|---|
| Narration | Ba luồng, TTS actual clock, SRT fit, ASR/alignment, cache và final gates đã có | Hồi quy trên source bàn giao; chất lượng ASR Việt |
| Cast | Vai/nguồn/identity/costume, cast/timeline/preview đã có | Nhiều vai nguồn đúng, tạo hình và editor/locks đầy đủ |
| Acting | Nhiều performance, voiceover/speech riêng, supporting contact, cut/continuous | Browser/video, đạo cụ/handoff, nhịp và biểu cảm tự nhiên |
| Design | Model director, SVG/layers/camera/artwork có provenance | Full bài do model thiết kế; không đứng cạnh bảng suốt bài |
| Studio/API/CLI | Actors mặc định project mới; tương thích project cũ; artifact contract | Cast controls, edits/cache/resume/locks; phiên Studio mới |
| Acceptance | Build scoped đã qua; model test actors độc lập đang kiểm tra | Hai bài/hai kiểu tạo hình, ba luồng, final QC và xem/nghe thực tế |
| Delivery | Actors/runtime, multilingual/external TTS và literal subtitle đã push nhánh; ingest metadata đang follow-up | Source/docs/evidence cuối và GitHub đúng commit; không merge main như release đã nghiệm thu |

Pipeline: narration → phân tích → cast/tình huống → storyboard/stage/performance/camera → assets → scenes → draft → review/repair → final → QC. Giọng/audio không phụ thuộc cast; đổi hình không dựng lại narration còn hợp lệ. Mọi lỗi nguồn/clock/identity/target/voice/security phải chặn final.

Các video presenter source18 và animation benchmark chứng minh phạm vi được nêu trong evidence; không chứng minh phim nhiều diễn viên hay chất lượng mục tiêu mới. Model test độc lập chạy runtime; người triển khai kiểm tra build/typecheck và xem bản dựng để sửa thiết kế.
