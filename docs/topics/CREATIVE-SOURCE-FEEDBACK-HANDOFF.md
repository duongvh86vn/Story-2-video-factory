# Báo lỗi đạo cụ và cảnh cho lượt sửa của agent

Source: `forest-tribe-0.108-creative-source-feedback`, nhánh `codex/prehistoric-life`.

Trong luồng model → storyboard, việc tính `continuity.models` trước đây có thể ném lỗi ngay bên ngoài bộ gom lỗi. Một đề xuất có giáo theo clock gốc vì thế dừng trước khi agent nhận lỗi của những cảnh tiếp theo. Source này đưa tính toán vào cùng bộ gom lỗi. Các cảnh có source gốc dùng vị trí cuối cảnh từ đúng actor/model/binding và toàn storyboard/narration hiện hành; cảnh thường giữ API cũ.

Luồng hoàn tất chuẩn hóa cast/profile/model/clock của mọi cảnh trước, sau đó mới tính vị trí model cuối cảnh. Nhờ vậy truy vấn toàn lịch sử không đọc profile cũ ở một góc máy chưa được chuẩn hóa, kể cả khi vai chính/phụ đổi giữa các cảnh. Cảnh khóa không được tính lại metadata.

Sau khi tính metadata, luồng đọc thêm chẩn đoán candidate cho toàn board, từng cảnh và ranh giới giữa các cảnh. Fragment giữ nguyên board gốc; không dùng lịch sử rút ngắn, owner thay thế hay clock giả. Lỗi candidate và lỗi production đều vào feedback mà `planWithValidation` đã lưu và chuyển cho lượt sửa tiếp theo. Lỗi tính vị trí giữ metadata cũ và vẫn đánh dấu đề xuất bị từ chối; không tự thay đạo cụ, rút giáo hoặc đổi lời kể để chạy tiếp.

Các validator production, renderer/security, cast khóa, source refs, audio, review, final/QC và giới hạn retry vẫn bắt buộc. Candidate thành công không tạo cache production hay báo cáo accepted. Mẫu có sourceSpear/sourceOwnership/sourceManipulation còn chờ tích hợp/nghiệm thu sẽ tiếp tục bị chặn. Thay đổi này cải thiện thông tin sửa cảnh, chưa sửa tạo hình hoặc chứng minh tay chân/biểu cảm/chuyển động mượt.

## Kiểm chứng và phạm vi

Ba callback mới tại `tests/creative-source-feedback.test.ts` được viết, **DECLARED / NOT RUN**:

1. Một nguồn chuyển động thiếu slice cùng lỗi SVG ở cảnh khác phải cùng có trong feedback và receipt `domain-rejected`; response nguyên gốc được giữ, chỉ một lượt gọi model, không có accepted cache.
2. Board giáo nguồn gốc vẫn gặp guard production và không có accepted cache/report, kể cả khi chẩn đoán candidate được bổ sung.
3. Profile hash seed khác nhau giữa các góc quay được bind đúng cho toàn board trước khi đọc lịch sử, không tạo lỗi continuous cast/view/geometry giả; source proposal giữ nguyên và vẫn bị guard production từ chối.

Đây là ca báo lỗi cho đề xuất cố ý không hợp lệ, không phải tập phim hoặc artwork đã nghiệm thu. Test hiện có về source body, citations, source boundary, ordinary creative repair/cache phải chạy kèm để kiểm regression. 9router `tester` đã trả HTTP200/`gpt-6-luna`, chỉ đọc source; không tìm finding cụ thể nhưng thiếu schema, `creativeFixture` và normalization trong snapshot, nên không xác nhận callback có thể chạy tới assertion. Các segment fixture dùng cùng ID `cue`; parent đã đọc lại source liên quan nhưng chưa execute. Snapshot có trước sửa cuối của parent tách chuẩn hóa toàn board khỏi tính boundary; không là review của source cuối.

Người dùng xác nhận **chưa** có báo cáo Lila/Karo mới. `TEST-RESULTS.md` V1 không nghiệm thu source này. Không có QA ledger hoặc video hiện hành được chấp nhận. Build/typecheck và kiểm file/hash chỉ chứng minh source.

## Lệnh dành cho model test

Môi trường: Windows/PowerShell, Node>=22.13, dependencies trong C worktree. Implementation không chạy các lệnh runtime dưới đây. Không ghi đè D checkout hoặc server8850.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/creative-source-feedback.test.ts tests/creative-director.test.ts tests/creative-citations.test.ts tests/source-protocol-diagnostics.test.ts tests/native-source-body.test.ts tests/source-model-boundaries.test.ts
```

Ghi full SHA, lệnh, exit, lỗi nguyên văn và PASS/FAIL/SKIP/NOT RUN riêng. Callback thất bại ở schema/citation/fixture phải báo đúng điểm đó, không được bỏ assertion để lấy PASS. Để test Studio từ đúng source, dùng project và cổng riêng:

```powershell
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source108-test-projects'
npm run studio
```

Chọn cổng trống nếu8861 đang dùng. Runtime video cần Hyperframes/Chromium, FFmpeg/FFprobe và provider TTS/ASR theo input. Không dùng lệnh tạo video để thay thế việc có ledger QA tạo hình/chuyển động thật đúng source và code fingerprint mới.

## Phần còn lại của sản phẩm

Vẫn cần artwork/registration và QA cho quay đầu/thân thật, mặt nhìn bạn diễn, tay/khớp/đạo cụ/cloth/feet/contact, quần chúng và cảnh ngày/chiều/đêm đậm màu. Cần tích hợp source production đầy đủ sau bằng chứng phù hợp, cùng ba input story→screenplay, script nguyên văn, WAV nguyên giọng; EN/VI/JA/KO/external-local TTS, resume/cache/locks/rebuild, review/repair và final MP4/SRT/thumbnail/storyboard/profile/timeline/manifest/QC. Những mục này chưa được đánh dấu hoàn thành.
