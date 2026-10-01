# Kế hoạch V2.2 — người que dẫn dắt câu chuyện

2026-10-01. Đợt hiện tại viết lại kịch bản hình ảnh và kế hoạch; chưa triển khai animation V2.2. [Đặc tả diễn xuất](STICKMAN-STORY-DIRECTION.md) là tài liệu chính, [BUILD-SPEC.md](BUILD-SPEC.md) giữ contract chung. Kế hoạch V2.1 cũ nằm trong docs/archive/V2-IMPLEMENTATION-PLAN.v2.1.md.

Mục tiêu: script/WAV/SRT → chọn người que hoặc robot → video có nhân vật chính sống trong bối cảnh, có biểu cảm, di chuyển, thao tác và dẫn người xem qua câu chuyện. Lời kể nguyên văn và clock audio tiếp tục là nguồn quyết định. Không kéo giọng, thêm thoại hoặc đổi cue để đủ animation.

## Phần nền tái sử dụng

Giữ ingest ba nguồn, TTS/ASR/alignment, measured audio clock, speech activity, host identity/approval, source refs, tám ý đồ giải thích, HyperFrames/GSAP/FFmpeg, Studio/API/CLI, cache/resume/locks và final gates. V2.1 hiện có rig/IK tay/recipe sơ đồ; cần thay cách dàn dựng và thêm hệ diễn xuất, không cần làm lại narration.

Các thử nghiệm local V2.1 chưa chứng minh toàn bộ sản phẩm đạt: một clip giọng Việt ngắn qua technical QC; bài hơi nước đầy đủ còn báo freeze; các tests bổ sung còn trên working tree. Xem IMPLEMENTATION-STATUS.md. Commit tài liệu mới không có nghĩa những sửa runtime trước đó đã được bàn giao.

## Các giai đoạn và sản phẩm cần giao

| Bước | Công việc | Artifact/điều kiện kết thúc | Trạng thái |
|---|---|---|---|
| A0 | Viết lại vai trò nhân vật, tạo hình/acting, storyboard hơi nước/ô tô, contract và nghiệm thu | Các MD thống nhất; hai storyboard có nguồn; phân biệt hiện có và dự kiến | Đã soạn trong đợt này |
| A1 | Mở rộng rig/face; clip bước vào, đi/dừng/quay, nhìn/chỉ, đổi mood, cầm/đặt/thao tác | Bộ preview MP4 30fps và pose sheet cho người que; version/hash; chưa nối planner | Chưa triển khai |
| A2 | Compiler phân track, pose blend, IK/foot plant, contact, prop attachment và camera space | Schema/validators; seek 0/tiến/lùi/batch tương đương; không tranh quyền bone hoặc nhảy đồ vật | Chưa triển khai |
| A3 | Director chuyển narration thành story/stage/performance/camera plans | Beat có mục đích, nguồn, cảm xúc, target và continuity; không mặc định grid icon | Chưa triển khai |
| A4 | Stage/layers/props/cutaways, environment assets và scene emitter | HTML5/CSS/SVG/JS thật trong pipeline; asset/clip thiếu có lỗi rõ; giữ CSP | Chưa triển khai |
| A5 | Hai đoạn mẫu có giọng: hơi nước và ô tô | Video đúng nội dung, bước chân/mặt/contact/continuity đọc được; có clip evidence | Chưa triển khai |
| A6 | Studio/API/CLI, caches, locks/resume, rebuild shot, exports/reports và robot | Ba cột lời kể/diễn xuất/clip; đổi hình giữ audio; custom hash approval; cùng contract | Chưa triển khai |
| A7 | Nghiệm thu ba luồng + WAV/SRT aligned, hai nhân vật/hai bài và media QC | Matrix PASS/FAIL/NOT RUN theo commit thật, xem/nghe clip/final và evidence | Chưa nghiệm thu |

A1 ưu tiên chất lượng chuyển động nền trước khi nối toàn bộ pipeline. Một nền đẹp, một pose sheet hoặc MP4 có giọng không đóng được A1/A5/A7. Nếu clip khó không vừa narration window, chọn hành động đơn giản hơn nhưng giữ ý; không cắt lời hoặc tăng tốc ngoài contract.

## A1 — bộ preview để xác nhận hướng hoạt hình

1. **Vào cảnh → đi → dừng → quay**: root có quãng đường; stance giữ chân trụ, chuyển trọng tâm, không lướt.
2. **Quan sát → suy nghĩ → nhận ra**: gaze dẫn head/body; mày/mắt/miệng có chuyển trạng thái và nguyên nhân.
3. **Nói trong một mood**: mouth activity theo audio; không xóa biểu cảm nền hoặc mở miệng lúc nghỉ.
4. **Chỉ/tiếp xúc/thao tác**: target thật; hand contact trước prop reaction, giữ chiều dài xương.
5. **Nhặt → giữ → đặt**: grip/destination anchors và attachment intervals, không bật vị trí khi seek.
6. **Dẫn sang scene khác**: exit/entry pose, hướng đi, đạo cụ và ánh sáng có continuity.

Mỗi preview có narration window/clip IDs/rig hash, timed strips quanh điểm khó và clip chạy 1×. Không bắt nhân vật vẫy tay/thở liên tục để tránh freeze. Tham số định lượng ban đầu cần hiệu chỉnh qua xem clip, không phải số đo từ YouTube.

## A2–A4 — cấu trúc triển khai

| Phần | Vị trí đề xuất, chưa tồn tại như module V2.2 | Phần hiện có cần nối |
|---|---|---|
| Animation data/schema/compiler | packages/animation/ | packages/host/rig.ts, controller.ts; scene security |
| Narrative director | packages/director/ | packages/explainer/plan.ts, storyboard.ts; packages/story/ |
| Stage/asset resolver | packages/stage/ | Asset manifest/resolver; library/shots/explainer.ts |
| Performance/camera review | packages/review/ | Timed snapshots, vision contract, artifact hashes |
| Pipeline/state/UI | Các package/app hiện có | Orchestrator, server, CLI, Studio; resume/checkpoints |

Tên folder là đề xuất, có thể gom vào package hiện có nếu phù hợp. Cần versioned schemas cho story-direction, stage-plan, performance-plan, camera-plan, animation-library và performance-report. API chỉ nhận enum/clip/anchor dữ liệu đã validate; model/MD không cung cấp JS tùy ý.

Giữ GSAP paused master timeline; bake tracks/IK/attachment states trước khi emit. Layout CSS, SVG transform và camera có hệ tọa độ rõ. Một bone/property có ownership tại mỗi interval; mọi action có entry/exit pose và transitions. Planner không sở hữu narration clock.

## A5 — hai đoạn mẫu trong luồng thật

- **Hơi nước:** vào xưởng → nhận ra nóng/lạnh ở xi-lanh → suy nghĩ → thấy bình ngưng riêng → thao tác mô hình → phản ứng → dẫn sang ứng dụng. Không tự thêm pít-tông vào bài nếu input không kể.
- **Ô tô:** đi vào bối cảnh đường → quan sát xe ba bánh/động cơ sau có nguồn → mô hình truyền động → so sánh hai nguồn năng lượng → tổng kết nhiều hướng phát triển. Generic sedan không thay asset lịch sử; không khẳng định xe điện ra đời sau xe xăng.

Mục tiêu mỗi đoạn khoảng 15–30 giây nếu đủ các cue liên quan; lưu duration đo thật. Không sửa lời kể hoặc padding vô nghĩa để đạt số giây. Sau clip benchmark, dùng chính renderer/pipeline đó cho bài đầy đủ; demo ngoài sản phẩm chưa chứng minh tính năng đã tích hợp.

## A6–A7 — sản phẩm và điều kiện final

Studio cần hiển thị **Lời kể | Dàn cảnh và diễn xuất | Preview clip**, action/mood/target/camera/continuity và thiếu asset/clip. story-cinematic là mặc định mục tiêu mới; diagram là lựa chọn rõ ràng. Các field này chưa chạy được với config V2.1.

Đổi host, mood/action hoặc style giữ narration/audio còn hợp lệ. Đổi lời/voice re-resolve timing/anchors; không tự bỏ lock. Resume kiểm tra hash/producer của clips/stage/plans/scenes/evidence. CLI/API chạy cùng pipeline và chặn final khi giọng, source, identity, target/contact hoặc đồng bộ không hợp lệ.

Nghiệm thu A7 theo [TEST-HANDOFF.md](TEST-HANDOFF.md): ba luồng, failure gates, nguyên văn/clock, robot và người que trên hai bài, bước chân/biểu cảm/đạo cụ/cut, seek/reverse, edits/resume/rebuild và final QC. Ghi kết quả mới riêng theo commit; V1/V2.1 results không thay evidence V2.2.
