# Coverage diễn viên và hành động — source25–27

Mục tiêu: tool câu chuyện/chủ đề → kịch bản → video, người que là diễn viên. Trạng thái PROGRESS, toàn sản phẩm chưa nghiệm thu; runtime giao model khác.

## Lý do sửa

Rà source24 phát hiện review chưa lấy mẫu posture/gaze; canonical participant có thể biến mất khi creative model chỉ trả cutaway; câu action có nguồn chưa buộc có performance tương ứng; writer thật + scene model mock còn có thể đi tới final. Đây là findings từ đọc source, không phải phim lỗi đã được tái hiện. Rà soát và bản bổ sung muộn37s được giữ nguyên ngoài repo.

## Source25

- `sceneIntent.acting` khai báo participantId, kind, statement, sourceRefs và targetIds khi thao tác. Real actors planner phải có sceneIntent, expectation cho mỗi vai và target cụ thể; unsupported báo needs-motion. Schema để optional nhằm đọc dữ liệu cũ/seed, không coi mock là sản xuất đã nghiệm thu.
- Coverage qua toàn beat giữ canonical actor identity/role và hành động có track thực; cutaway/ghép cảnh/hold được phép. Manipulation phải khớp target, action/gesture/contact và cue nguồn; geometry/clock/ownership vẫn có validators riêng. Single-shot diagnostic dùng fragment=true, toàn board và final vẫn kiểm đầy đủ.
- Primary/supporting posture/gaze có temporal samples trước/trong/sau; hold có evidence start/mid/end. Review kiểm mẫu và sheet từng shot, kể cả không có contact.
- Final actors chặn artDirection thiếu/offline bằng waitingFor=art-direction; draft giữ được. Model/authored direction hợp lệ vẫn có đường final. Studio có nút cấu hình cảnh.
- Director2.2.25/explanation2.2.3 đổi fingerprint hình. Giữ narration/voice cache; không retag hoặc mở khóa cảnh đã duyệt.

Semantic kind là diễn giải của model từ toàn câu; gate không chứng minh phân loại đúng, độ tự nhiên của diễn xuất hoặc sự thật lịch sử. Không áp quota xuất hiện/chuyển động hoặc buộc câu chuyện thành máy móc.

## Evidence

Parent build51105 và whole test:typecheck94667 exit0; schemas export37dc3a exit0. Parent không chạy runtime. Source manifest frozen tại `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/story-acting-coverage-20261004/`.

Snapshot trước25: baseline archive9b94593 tái hiện sáu propFixture FAIL; sửa setup owner với assertions cũ nguyên byte và thêm bảy negative owners. Actor-studio53/53; tám-file regression193/193; whole typecheck0 trên source24 + artwork6. Đây không phải kết quả runtime cho25. Raw root `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/general-prop-fixture-followup-20261004/run-20261004T050132Z/`.

Runtime25 đang giao cùng model độc lập: coverage/cutaway/hold/source/negation/target/motion, public temporal preview/review với stub screenshot có hash thật, final gate và regressions nếu trong giới hạn. Kết quả phải có source/test hashes, exact command/exit, raw failures, process receipts và NOT RUN rõ ràng. Không gọi synthetic DOM/PCM/stub engine là browser, giọng thật hoặc nghiệm thu phim.

## Kết quả và bản bàn giao27

Source25: regression210/210 PASS;18 cases mới đã quan sát PASS nhưng public FINAL fixture bị reconcile về bước trước và vô tình chạy browser. Owned process đã dừng, raw FAIL giữ nguyên; report/release trễ35s. Không dùng lượt này để chứng nhận final gate. Bản đầy đủ của fixture giữ trong [draft FINAL](pending/story-acting-public-final-26-20261004.md), không nằm trong executable suite.

Source26:22/22 focused và whole typecheck exit0. Sửa clock dựa trên đúng cue chứa statement, semantic planning dùng model storyboard đã cấu hình khi planner mock; final chặn canonical acting thiếu. Rà source còn tìm actor thêm mới chưa được classify và excerpt có thể bỏ chủ ngữ/phủ định.

Source27/explanation2.2.5 đóng hai đường trên: so statement với câu nguyên gốc trong Narration (supplement nguyên gốc được kiểm ở upstream); coverage cũng kiểm nguyên cue. Trích ngắn vẫn dùng được cho tên/entity label. Mỗi primary/supporting actor phải khớp canonical identity/role và acting đã chấp nhận ở beat liên quan trước final. Cutaway không có diễn viên và hold vẫn hợp lệ. Không tự chép lời khai của creative model thành canonical plan.

Independent final source27: **27/27 focused PASS**, **210/210 unchanged regression PASS**, **whole test:typecheck exit0**. Parent build20479 và schemas7f6ef0 exit0, không chạy runtime.15 frozen production hashes khớp trước/sau;22 assertions trước giữ nguyên, thêm5 cases; không nới validators. Owned jobs terminal và listener0, release05:59:46UTC trong deadline06:02:20. Các suite có ca trùng, không cộng thành nghiệm thu toàn bộ repo.

Raw root `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/story-acting-final27-20261004/run-20261004T055420Z/`: REPORT.md, exact argv/stdout/stderr/exits, source/test manifests và ownership receipts. Final test SHA256 `91D00D27832E4691CDFCE50A06471044878AD7FA9269156C99FE2B1C417F5C21`.

**NOT RUN:** public runPipeline FINAL checkpoint/draft retention, real browser/full films, native model/speech/ASR/user backend. Public helper/schema không chứng minh public pipeline đi đến final; ảnh tổng hợp kiểm protocol/hash, không kiểm nét diễn. Giữ các raw FAIL/NOT RUN của25/26 và bàn giao phần này riêng.

## Còn chờ

Phim tự sinh từ nội dung đời thường, hư cấu, lịch sử và kiến thức tự nhiên; xem/nghe toàn phim tốc độ thường với chuyển động/biểu cảm/hình ảnh rõ. Ba nguồn narration và chỉnh sửa/resume/locks/rebuild, ASR/alignment, giọng EN/VI/JA/KO và backend TTS local thật vẫn theo TEST-HANDOFF. Video máy hơi nước/ô tô chỉ là ví dụ cũ; giữ nguyên FAIL/PARTIAL và request/billing pending, không chạy demo mới để thay acceptance tool.
