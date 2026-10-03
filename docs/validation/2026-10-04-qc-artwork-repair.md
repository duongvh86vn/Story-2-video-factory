# Sửa artwork từ lỗi đứng hình QC — 04/10/2026

Phim native ô tô thực tế đã render nhưng QC chặn đoạn23,900–29,066.667ms trong cảnh so sánh. MP4, storyboard và báo cáo lỗi được giữ nguyên trong evidence trước sửa; kết quả này vẫn FAIL, không phải video đã nghiệm thu.

## Thay đổi source

- `repairScenes` giữ yêu cầu sửa do review gửi vào dù cảnh hiện tại vượt qua kiểm tra browser. Browser validation kiểm cấu trúc/runtime; nó không xóa finding chuyển động của review hoặc QC.
- Các khóa storyboard/scenes/shot/scene và `shot.locked` được xét đầy đủ; một alias `false` không vô hiệu hóa khóa `true` khác.
- Pipeline tự động chỉ đưa các lỗi nghiêm trọng `frozen-frames` có clock hữu hạn, nằm trọn trong cảnh cinematic có artwork và không khóa đến artist thật. Lỗi giọng, nguồn, video đen, lỗi không biết, thiếu clock, timeline gap/overlap và provider mock tiếp tục chặn final.
- Artist chỉ sửa artwork của cảnh hiện có. Giữ lời kể, clock, cast, target/contact, camera và asset reference; yêu cầu chuyển động giải thích có nguồn. Không thêm người dẫn cố định, rung cả ảnh, blink trang trí, sửa ngưỡng QC hoặc whitelist cảnh đứng hình.
- Trước khi gọi artist, lưu bản phim lỗi, QC, storyboard và báo cáo vào `work/qc-artwork-repair-history/<uuid>/`, ghi SHA256 trong `work/qc-artwork-repairs.json`, rồi tính và lưu lượt sửa. Ledger giữ budget cùng input/assets qua resume và reconciliation; scene/model/cost budgets hiện có vẫn áp dụng.
- Artwork đạt domain/browser validation vẫn phải dựng lại draft, review, final và QC. Pipeline quay về `SCENES_READY`; job QC cũ ghi lỗi, không được ghi `QC_PASSED` hoặc `DONE` từ kết quả sửa artwork.

## Kiểm chứng hiện tại

Parent chỉ chạy build và typecheck: build session57543 exit0; whole test:typecheck exit0 trước khi model test thêm các case mới. Logs: `temp/art-direction-v22/build-qc-artwork-20261004.log` và `typecheck-qc-artwork-20261004.log`. Parent không chạy runtime tests.

Lượt độc lập đầu tiên giữ hai lỗi thật: mapper/ledger10/11, FAIL khi lỗi I/O bị hiểu nhầm là chưa có ledger; public artwork35/42, FAIL ở bảy kiểu khóa vì hàm repair trả về thành công dù không sửa. Related45/52 lặp lại cùng bảy lỗi khóa, không phải bảy finding mới. Assertions và raw FAIL giữ nguyên. Sau đó source đã sửa strict ledger-read, chỉ coi ENOENT thật là chưa có file; batch repair kiểm toàn bộ ID/khóa/budget trước khi gọi artist hoặc tính budget của cảnh đầu.

Public pipeline với các boundary media/browser/provider/QC được điều khiển đã qua ba scenario success/provider-failure/locked (4/4 tính cả test cha). Hai lần lỗi setup fixture trước đó và typecheck exit2 được giữ riêng; sửa đúng input `serializeSrt` và đường dẫn SRT cấu hình, không đổi assertions về state/budget/identity. Đây là control-flow integration, không phải render/native/media acceptance. Whole test:typecheck sau sửa fixture exit0.

Evidence đầu lượt: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/qc-artwork-ledger-tests-20261004/run-20261003T200631Z/REPORT.md` và `qc-artwork-public-tests-20261004/`. Genuine native repair/render mới và chất lượng phim sửa hiện chưa có; không dùng build hoặc scoped fixtures để đóng nghiệm thu toàn sản phẩm.

## Kiểm tra sau hai sửa lỗi thật

Parent build session95201 exit0 và whole test:typecheck exit0; không chạy runtime tests. Hai worker giữ source frozen và dùng fixture/evidence mới:

| Phạm vi | Kết quả thật |
|---|---|
| Mapper/ledger giữ nguyên byte | 11/11 PASS |
| Public artwork giữ nguyên42 assertions | 42/42 PASS |
| Public pipeline giữ nguyên byte | 4/4 PASS, gồm3 scenario và test cha |
| Batch mới: shot sau khóa/unknown/exhausted | 3/3 PASS, zero earlier artist call/budget charge |
| EACCES / dangling ledger bổ sung | PASS riêng từng case; raw fixture failure Windows giữ lại |
| Whole test:typecheck cuối hai worker | exit0 |

Supplemental dangling đầu tiên giả định Windows `fs.access` phải lỗi với dangling junction và FAIL ở setup. Test mới được sửa để chấp nhận behavior native, vẫn bắt public iteration/reservation/finish reject và giữ nguyên bytes/link/budget. Rerun riêng case sửa PASS; không tuyên bố combined13-case run cuối. Original11 và các assertion lỗi thật không đổi.

Evidence: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/qc-artwork-ledger-fixed-20261004/run-20261003T202530Z/REPORT.md` và `qc-artwork-public-fixed-20261004/REPORT.md`. Tất cả jobs có terminal receipts, source hashes không đổi; freeze đã release trong time bounds.

Genuine producer native car session71165 bắt đầu20:33UTC03/10 bằng normal resume cùng project cũ, không force/explicit retry hoặc chỉnh journal. Đã giữ snapshot phim lỗi và reserve lượt1 cho `s04.comparison` trước artist call. Tại checkpoint này producer còn chạy; không có terminal/QC mới hoặc nghiệm thu toàn phim. Evidence `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/native-car-qc-repair-20261004/`.

External/local TTS tiếp tục theo [contract đã triển khai](../EXTERNAL-TTS.md): custom HTTP JSON/direct WAV, compatible `/v1/audio/speech`, OmniVoice/VoiceStudio local và command adapter, cùng lựa chọn EN/VI/JA/KO. Backend local thực tế của người dùng và live JA/KO vẫn chưa kiểm chứng. Pipeline không cài backend/model hoặc đoán API polling thay người dùng.
