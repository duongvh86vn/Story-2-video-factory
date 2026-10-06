# Studio sẵn sàng cho model test — checkpoint 06/10/2026

Studio tại `http://127.0.0.1:8850/` được khôi phục bằng build/code443220f trên worktree `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`. HEAD tại startup là bcbc400, chỉ đổi tài liệu so với code đã build/kiểm cục bộ. Bản cập nhật tài liệu tiếp theo không đổi code hoặc dist đang chạy.

## Bằng chứng vận hành

Parent238f63 lúc07:12:44UTC xác nhận processStudio8480/birth02:45:51.951377Z không còn và port8850 không có listener. Poll session75894 trả `Unknown process id`; không coi observation timeout là terminal, không restart một handle đang sống và không dừng process nào.

Preflightc310c1 exit0 lúc07:14:11.3276669UTC kiểm lại non-MD source/423compiled hashes khớp code443220f,68project names/current state hashes và một lock hiện có. Không dùng hash cũ để ghi đè thay đổi của người dùng. Startup74d029 trả live session62431 và thông báo ready.

Parent60ffa9 exit0 lúc07:15:58.0564164UTC xác nhận listener127.0.0.1:8850 có đúng child của launcher đã ghi receipt, kernel identity đầy đủ:

- PID14868, parent31896, birth `2026-10-06T07:14:45.7922990+00:00`.
- Executable `C:\Program Files\nodejs\node.exe`; argv `"C:\Program Files\nodejs\node.exe" dist/apps/server/index.js`.
- Source tại startup `bcbc400e175d31fa0cf14486f9fc11bb732c9e0f`; code baseline `443220f6a6fe5516647b9df707d79a5c50d0318f`.
- GET `/` trảHTTP200; GET `/api/projects` trả cùng68names; state hashes và lock hash trước/sau không đổi.

Proof ngoài repo: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/studio-bcbc400-after-20261006.json`, cùng before/launcher/health-reader receipts tại thư mục đó. Đây là kiểm readiness/preservation của dịch vụ, **không** phải unit/browser/input/model/TTS/render/media/vision test. Parent không gọi runPipeline hoặc production endpoint.

## Project báo busy

Một project cũ `native-car-mini-robot-source22-1791014715714` báo busy trong API snapshot. Parent giữ nguyên `.factory.lock`, SHA256 `E07E2670DA656B2C3DA72A5D0E44C1553E3EBBDE4BB5E9CCA9C88B9E08B41CFB`; không nhận quyền sở hữu, kill, xóa lock hoặc resume ca này. Lock legacy không chứa kernel birth. Read-only censusc6af9f sau đó không thấy PID31464 ghi trong lock; không suy từ đó rằng được phép khôi phục ca hoặc budget. Trạng thái busy còn cần model test đánh giá riêng, không giả đã sửa.

Server process/session và busy snapshot là bằng chứng đúng thời điểm ghi. Model test phải kiểm lại identity/jobs/port nếu cần restart hoặc sử dụng UI; không kill theo PID lịch sử. Birthday native project là ca ngoài root68project của Studio và tiếp tục qua đúng public CLI/path trong [handoff](../NEXT-MODEL-TEST-HANDOFF.md), không clone/import một ca mới để reset giới hạn.

## Phạm vi chưa đạt

User giao model khác thực hiện test. Source-context/contact đã có scoped GREEN; custom-handle temporal/outbound/cache parity/browser và phim còn chờ. Full movie quality, cả hai rig, input/language/TTS/edit-resume-lock/export matrix chưa nghiệm thu. Khôi phục Studio không tạo thêm video hoặc thu hẹp mục tiêu thành service startup.
