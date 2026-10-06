# Bàn giao cho model test do chủ dự án chọn — 06/10/2026

Chủ dự án trả lời: **“Tôi giao model test khác”**. Model triển khai không chạy runtime test và không tự tạo model test thay thế. Nhiệm vụ là kiểm tool **chủ đề/câu chuyện → kịch bản → video**, với người que hoặc mini-robot đóng vai trong câu chuyện; thiết kế, bối cảnh và diễn xuất theo từng nội dung. Video hoàn chỉnh và toàn sản phẩm chưa nghiệm thu.

## Source cần dùng

- Repo: `https://github.com/duongvh86vn/Story-2-video-factory`, branch `codex/stickman-acting-v22`.
- Code đã build và được kiểm cục bộ: `443220f6a6fe5516647b9df707d79a5c50d0318f`. Commit bàn giao tiếp theo chỉ cập nhật tài liệu, không đổi code hoặc dist.
- Worktree đang triển khai: `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`. Checkout `D:/github/Story-2-video-factory2.1` còn main và thay đổi riêng; không chạy tại D rồi coi là kết quả của branch mới.
- Studio cổng8850 được khôi phục lúc07:15UTC ngày06/10 trên HEAD `bcbc400` (code/build443220f); HTTP200,68project names/state hashes và lock có sẵn giữ nguyên. Đây là kiểm vận hành, chưa phải browser/pipeline test. [Receipt và giới hạn](validation/2026-10-06-studio-ready-for-test.md). Kiểm lại process/job trước khi thao tác; không dừng chỉ theo PID lịch sử.
- Parent đã chạy build, biên dịch test và export schema thành công. Không cần chạy lại vì commit bàn giao chỉ đổi MD.

## Kết quả có thật

| Phạm vi trên code443220f | PASS | FAIL | SKIP | Exit | Giới hạn |
| --- | ---: | ---: | ---: | ---: | --- |
| Fixture source-context bất biến + bốn suite cũ | 494 | 0 | 2 | 0 | Source và compiled; 16 lỗi placement trên bản trước đã qua |
| Contact fixture sau một lần sửa setup/entrypoint + sáu suite cũ | 229 | 0 | 1 | 0 | Cả hai rig; schema, target, grip, ownership, clock và negative gates |
| Sáu assertion custom-handle GSAP/outbound bổ sung | 0 | — | — | 1 | **Chưa đăng ký assertion**: fixture TS bị nhận là CJS, lỗi top-level await |

Không cộng các đợt thành một tổng test sản phẩm. Raw contact lần đầu209PASS/21FAIL/1SKIP được giữ nguyên; các lỗi đã phân loại nằm trong báo cáo, không sửa predicate/tolerance để lấy PASS. Generic GSAP seek/reverse đã qua nhưng không chứng minh custom handle chạm đúng pixel dưới camera.

Raw evidence cục bộ: `C:/Users/Duongvh-pc/codex-test-evidence/sourced-world-contact-local-20261006T060000Z`. Đọc `REPORT.md`, `commands.json`, `contact-fixture-correction.json`, `artifacts.json` và thư mục `protocol`. Không sửa hoặc chạy lại helper/supervisor đã hết hạn tại root này.

Tester cũ hết quota trước khi ghi `completion.json`. Writer report exit0 nhưng có lỗi PowerShell bare `true`, nên `case-counter-receipt.json` cũng thiếu. Parent kiểm lại703 artifact hashes,403 source/423 dist/169 case files và74 danh tính process đã kết thúc; original journal vẫn28started/28completed/0pending. Proof riêng: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/contact-parent-postwriter-closeout-20261006.json`. Đây là closure chỉ đọc của parent; không thay attestation thiếu của tester. Bốn lần đọc lịch sử thiếu receipt process trước nội dung cũng được giữ là khoảng trống thủ tục.

## Thứ tự test tiếp

### 1. Hoàn tất phần local chưa chạy

Bundle đã chuẩn bị, **chưa chạy**:

`C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/next-model-test-bundle-20261006`

Bundle có `package.json` với `type=module`, `protocol/supplemental.test.ts` và bốn JSON `contact-corrected/*-primary-fixed.json`. Chỉ thay một literal output-root của fixture cũ và thêm metadata ESM; assertions không đổi. `preparation.json` giữ SHA gốc/mới và hashes của các JSON.

Tạo root chạy mới do tester sở hữu, copy bundle và đổi **đúng một** literal `root` trong fixture tới `<root-mới>/protocol`. Giữ các JSON ở thư mục anh em `contact-corrected`. Không ghi kết quả test vào bundle chuẩn bị hoặc root thất bại cũ. Tạo guard/supervisor mới có thời hạn, chặn provider/TTS/network/browser/media trong bước local, ghi command đầy đủ, exit thực và log lỗi. Không dùng việc chờ hết timeout như chứng cứ process đã kết thúc.

Lệnh test bên trong supervisor/guard mới, chạy từ C worktree:

```powershell
& 'C:/Program Files/nodejs/node.exe' --experimental-test-module-mocks --import '<file-URL-của-guard-mới>' --import 'file:///D:/github/Story-2-video-factory2.1/node_modules/tsx/dist/loader.mjs' --test --test-concurrency=1 '<root-mới>/protocol/supplemental.test.ts'
```

Sáu assertion cần chứng minh: source và compiled × hai rig có HTML/control đúng target và GSAP seek/đảo chiều/nội suy quanh contact; hai assertion capture request thật tại router stub chứng minh prompt có `contactGeometry`, `handleAnchor`, `gripOffset`. Đây là capture cục bộ, không gọi dịch vụ model thật. Nếu sau sửa ESM có assertion FAIL, giữ raw, xác định fixture hay production; không làm lỏng assertion hoặc báo PASS vì fixture đã tải được.

Bổ sung kiểm còn thiếu riêng: opt-in scene inputHash và invalidation khi thêm/đổi handle; shot không có field giữ legacy scene key/bytes so với cùng dữ liệu của commit trước `1af19a6`; narration/audio không đổi, accepted cache giữ nguyên và locked scene xung đột rõ khi visual input đổi. Existing lock tests đã PASS nhưng chưa thay thế phép đối chiếu cụ thể này. Không sửa scene.json/hash để ép cache được nhận.

### 2. Tiếp tục ca sinh nhật gốc tới bản nháp

Project được duyệt:

`C:/Users/Duongvh-pc/codex-test-evidence/birthday-garden-native-20261005T140000Z/projects/birthday-garden-native`

Riley và Sam, sinh nhật trong vườn, mini-robot, English Zira; audio51.421s/12cues, bảy accepted planning receipts và explanation10beats. Người dùng đã cho phép ca này và tài khoản hiện tại. Giới hạn **30 model calls /2 review /2 scene repair**, đã dùng28calls, còn2; không có pending call hoặc factory lock tại checkpoint.

Candidate cuối chưa được chấp nhận: hai chair anchors nhận(570,420) thay vì(538.5,490); Sam pick ngoài tầm8.41px; candle event bắt đầu38425ms bằng lúc contact38425ms, cần xảy ra sau contact. Đây là lỗi definition trước render; chưa phải bằng chứng hình ảnh.

Sau khi local gaps được giải quyết và source không đổi, kiểm hashes/counters/cache trước một lần public resume có watchdog và root evidence mới:

```powershell
& 'C:/Program Files/nodejs/node.exe' 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/dist/apps/cli/index.js' resume 'C:/Users/Duongvh-pc/codex-test-evidence/birthday-garden-native-20261005T140000Z/projects/birthday-garden-native' --until DRAFT_RENDERED
```

Dùng account/config đã duyệt; ghi request/response/journal/token và mọi lỗi. Giữ input/audio/clock/cast/locks/budget/history; không force/reset, clone ca đã hết ngân sách, retry lỗi model ngầm hoặc tự viết/chỉnh một storyboard được gọi là thành phẩm AI. Nếu xuất hiện gọi TTS/writer lại hoặc cache/audio drift ngoài dự kiến, dừng và báo bằng chứng. Chỉ dùng tối đa2calls còn lại; lệnh này có thể dừng ở budget hoặc validation thay vì ra draft.

Nếu có draft thật, xem/nghe toàn phim và kiểm diễn xuất, biểu cảm, khớp tay/chân, điểm chạm, camera, chiều sâu, subtitle và giọng. Lưu findings gắn timecode/frame. Theo candidate13shot hiện tại, review ảnh thật cần4batches trong cấu hình đang giữ, vượt2calls còn lại ngay cả trước sửa storyboard. Không đổi batching/caps để lách giới hạn; bàn giao draft và số lượt còn thiếu trước khi xin thêm ngân sách nếu cần. Draft hoặc trạng thái DONE kỹ thuật không phải nghiệm thu chất lượng.

### 3. Nghiệm thu tool tổng quát

Các ca mới ngoài ca đã duyệt phải được chủ dự án giao riêng. Matrix còn mở: đời thường/hư cấu/lịch sử/kiến thức tự nhiên; cả hai rig; idea/script/WAV/SRT/WAV+SRT; EN/VI/JA/KO; TTS khả dụng Windows/HTTP/local/compatible/OmniVoice/command; sửa nội dung, đổi giọng/cast, resume/rebuild/locks và export/QC. Kiểm giọng thực sự hỗ trợ từng ngôn ngữ, không chỉ dropdown/schema.

Script hoàn chỉnh đọc nguyên văn; idea mới qua writer. WAV giữ giọng, SRT giữ text/clock, mismatch hoặc thiếu/TTS lỗi/fit lỗi phải chặn final đúng contract. Diễn viên có hành động, mục đích và phản ứng theo câu chuyện; không ép presenter hoặc máy móc làm chủ đề mặc định.

## Báo cáo cần trả về

Ghi source SHA và build, input/config, command/exit, PASS/FAIL/SKIP/NOTRUN theo từng phạm vi; raw failures, request/artifact provenance, budget trước/sau và process/resource closure. Video phải có link/path thực cùng findings toàn phim. Trả lỗi production cụ thể cho model triển khai; không chỉnh luật nguồn/hình học/clock hoặc xóa lịch sử để test qua. Các thiếu sót của tester trước không được ghi lại thành bằng chứng đã hoàn tất.

## Prompt có thể gửi cho model test

> Đọc docs/NEXT-MODEL-TEST-HANDOFF.md trên branch codex/stickman-acting-v22 và dùng worktree C ghi trong tài liệu. Bạn phụ trách test, model triển khai không chạy runtime. Làm phần local chưa chạy trước, giữ assertions và raw failures; sau đó tiếp tục đúng project sinh nhật gốc tới DRAFT_RENDERED trong2calls còn lại/30,2review,2scene repair bằng account đã được duyệt. Không reset/force/clone, không sửa input/audio/clock hoặc viết phim thủ công. Báo cáo riêng kết quả local, video thật nếu tạo được và các phần NOTRUN; không tuyên bố tool/video đã nghiệm thu khi chưa xem/nghe và review đầy đủ.
