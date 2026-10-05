# Review khung hình bằng Codex CLI

## Phạm vi và trạng thái

Source ngày 2026-10-05 bổ sung adapter gửi ảnh qua Codex CLI khi role review
được cấu hình vision. Pipeline vẫn là tool tổng quát: nội dung → kịch bản →
giọng → phân vai/dàn cảnh → video → review/repair → QC. Review xem tạo hình,
bố cục, diễn xuất tại các khung được lấy mẫu; không ép nhân vật thành người dẫn,
mascot, cùng costume, hoặc chọn chủ đề máy móc cho mọi câu chuyện.

Build/typecheck của bản vá transport đã qua (exit0, receipt32a57f). Bản đầy đủ
có prompt review cũng qua npm run build:launch043113, completion2251f1, exit0. Test độc lập/runtime/native
cho tính năng mới **PENDING**. Không dùng kết quả test125+5 của source d7a
hoặc phim đã chạy trước bản vá để tuyên bố tính năng mới đã nghiệm thu.
Ca trạm xe buýt đã có MP4 nhưng QC FAIL; kết quả đó giữ nguyên.

## Cấu hình tùy chọn

Ghép các trường sau vào project.yaml hiện có; giữ các role và cấu hình khác.
Không tự thay cấu hình project hoặc tài khoản của người dùng:

```yaml
models:
  visual_review:
    provider: codex-cli
    model: default
    vision: true
    timeout_ms: 120000
```

CLI native phải đã cài, đăng nhập và hỗ trợ --image; trên Windows adapter tìm
codex.exe của bản npm hoặc dùng executable được cấu hình. Không dùng wrapper
.cmd/.bat/.ps1. Model/tài khoản phải nhận ảnh thực tế; model từ chối hoặc CLI cũ
phải báo lỗi, không giả thành review đạt. Có thể dùng vision API đã có thay CLI.

Muốn chặn sản xuất khi không có vision model, đặt
workflow.allow_rule_based_review: false. Mặc định rule review vẫn được giữ;
review.mode và warnings phải phân biệt rule-based với combined. Việc có
combined review không tự chứng minh chất lượng toàn phim.

[Tài liệu chính thức về --image](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
và exec --help của CLI đã cài xác nhận khả năng đính kèm ảnh vào prompt ban đầu.
Điều đó chưa xác minh runtime của adapter này hoặc quyền nhận ảnh của model.

## Luồng ảnh và ràng buộc

- Pipeline gửi global/per-shot contact sheets, ảnh tham chiếu từng vai và action
  sheets tại các mốc contact/event khi có. Các ảnh nằm trong project, preview
  manifest vẫn kiểm hash và clock trước review. Review không được tự nhận xét
  shot ngoài batch.
- Router đọc ảnh trước khi reserve lượt gọi. Request identity và artifact của
  lượt gọi ghi đường dẫn, MIME, hash của đúng bytes ảnh; không ghi base64 ảnh vào
  journal. Adapter đọc lại và đối chiếu hash trước gửi. Ảnh bị đổi ở giữa phải
  báo images_changed; không gửi ảnh mới dưới identity của ảnh cũ.
- Giới hạn chung cho vision:1–64 ảnh, từng file1byte–20MiB, tổng tối đa128MiB;
  đọc tuần tự và kiểm kích thước trước/sau đọc. MIMEPNG/JPEG/WebP/GIF và realpath
  phải hợp lệ, không thoát project. File thiếu/empty/ngoài project/quá giới hạn
  bị từ chối trước reserve nếu phát hiện ở bước capture đầu. Lỗi/race sau reserve
  vẫn được ghi như một attempt; không xóa lịch sử hoặc hoàn budget bằng tay.
- CLI gửi bản chụp bytes vào các file tạm riêng qua --image theo đúng thứ tự.
  Workspace model vẫn trống/read-only; vẫn tắt shell, tool, app, MCP, browser,
  image generation và plugin. Ảnh/văn bản đính kèm là dữ liệu, không là chỉ dẫn.
- Cleanup chỉ unlink file do chính invocation tạo, kể cả file ghi dở, rồi rmdir
  thư mục rỗng. Không xóa ảnh gốc hoặc file lạ; không recursive delete. Lỗi tạo
  attachment phải báo images trước khi launch provider. Security/schema/usage/
  timeout/failure capture, pending journal, call/retry/review/QC budgets vẫn giữ.
- Prompt review dùng từng actor đã duyệt làm chuẩn identity. Nó kiểm khả năng
  đọc pose/mặt/gaze, target/contact và trọng tâm cảnh theo ý đồ. Không dùng rig
  nền để bắt các vai giống hệt nhau, không đặt quota tạo hình/phối màu/góc máy.

Ảnh tĩnh không đủ kết luận chuyển động mượt, lời nói đồng bộ hoặc cảm xúc của
cả video. Nghiệm thu cuối phải xem/nghe phim ở tốc độ thường; FAIL không DONE.

## Bàn giao model test

Parent không chạy test/runtime/provider. Model test dùng đúng branch/worktree,
ghi sourceSHA, lệnh, exit, hash, process/PID birth và cleanup; giữ mọi FAIL.
Không đổi assertion cũ để ép PASS. Không tiếp tục ca exhausted/pending bằng
xóa budget/journal hoặc đổi tài khoản/model để né hạn mức.

1. Chạy regression tests/codex-cli.test.ts, tests/models.test.ts, routing/journal
   và preview/review liên quan; toàn bộ test:typecheck. Giữ proof d7a riêng.
2. Fake runner:vision true nhận đúng MIME/bytes/thứ tự --image, stdin/context có
   evidence hash, empty cwd và toàn bộ restriction cũ; vision false không launch.
   Provider vẫn không được gọi tool. Text/structured không có --image và giữ usage.
3. Negative:0/65ảnh, file thiếu/empty/ngoài root/junction/unsupported MIME,
   >20MiB, tổng>128MiB, expected-hash count sai và bytes/MIME đổi giữa capture
   và send đều fail, không native provider. Kiểm journal ghi đúng ranh giới reserve.
4. Router:requestHash khác khi bytes/MIME đổi; retry/fallback giữ cùng binding,
   reject ảnh đổi thay vì gửi dưới request cũ; artifact không có base64 hoặc key.
5. Cleanup khi thành công, provider error, timeout, JSON/schema error, staging
   partial-write/open failure. Chỉ xóa file invocation sở hữu; giữ file lạ/ảnh gốc.
   Budget/usage và lỗi account/configuration không được reset hoặc retry ngầm.
6. Review actorScene dùng đúng từng vai, không đòi chung mascot/costume; lỗi crop/
   contact/source/identity thực vẫn chặn. Không kết luận mượt/lip-sync từ ảnh tĩnh.
7. Native vision chỉ khi có phạm vi và quyền chạy dịch vụ rõ ràng, hạn mức khả dụng,
   deadline/cleanup; ghi image request/response và xem video thực riêng. Lượt này
   không chạy native mới và không bật vision cho ca trạm xe buýt đã có.
