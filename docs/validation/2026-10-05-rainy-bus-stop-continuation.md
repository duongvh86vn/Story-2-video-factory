# Ca trạm xe buýt: đã có phim, QC chưa đạt

Đây là **lần tiếp tục cùng ca được người dùng cho phép**, bằng public CLI
`resume` trên source `d7a5a3a7e45f77fb4431a89c5ce2895b8bfe8a44`.
Không tạo project khác, reset ngân sách, đổi tài khoản hoặc viết storyboard tay.

## Kết quả đã ghi

- Khởi chạy 09:05:55 UTC ngày 05/10/2026. Thiết kế 4 cảnh được validator chấp
  nhận ở lượt trả lời đầu; đã có scenes, draft, review và MP4 cuối.
- Tester ghi probe/decode/subtitle/frame commands đều exit 0: H.264 1280×720,
  30 fps, AAC 48 kHz, track phụ đề mov_text; duration 27,933333 giây.
- QC FAIL: khoảng hình đứng 0–4.033,333 ms. Không có QC_PASSED hoặc DONE.
- Hai response sửa cảnh được provider/schema chấp nhận, nhưng bị validator
  nội dung từ chối. Lỗi cuối: khi kiểm riêng ch001.s001 của Maya, code lại
  đòi Noah ở beat ch002.b001 của cảnh khác. Chưa có bản phim sau sửa được chấp nhận.
- Driver thoát bình thường exit 1 lúc 09:20:29,998 UTC; supervisor terminal
  09:20:31 UTC. Watchdog không kích hoạt. Coordinator tự giải phóng lock.
- Journal cũ giữ nguyên byte prefix. Tổng cộng 13 lượt bắt đầu, 12 hoàn tất;
  1 pending là lượt đã bị watchdog ngắt trong phiên cũ. Không tự chuyển nó
  thành thành công/thất bại. Config/script giữ nguyên SHA đã cấp.
- Usage của các lượt hoàn tất: 268.155 input tokens và 48.003 output tokens.
  Actual USD và usage của lượt pending chưa đo được.

## Giới hạn bàn giao

Model test hết hạn mức trước khi hoàn tất báo cáo và formal release. Tài
liệu này do parent tổng hợp bằng cách **đọc artifact/receipt sẵn có**, không
thay cho báo cáo nghiệm thu độc lập. Không chạy lại native hoặc media test.

Supervisor có census PID/birth/argv trước khi nạp ứng dụng. Census định kỳ
có thể bỏ sót child sống ngắn; provider/Chrome không được chặn trước khi nhận
content. Parent xác minh 164 process identities đã quan sát đều không còn
cùng PID/birth lúc 09:29:35 UTC; media release census của tester cũng rỗng.
Đây là bằng chứng cho các process đã biết, không chứng minh mọi child từng
được tạo đều có trong census. Lần đọc CIM trước bị AccessDenied đã được giữ
lại; kết quả null của lần đó không phải resource proof.

Ảnh contact sheet cho thấy môi trường còn sơ sài, hai vai gần như cùng mẫu
và mặt nhỏ. Đây là quan sát ảnh tĩnh, chưa chứng minh chất lượng chuyển động
hoặc phát âm. Xem/nghe toàn phim ở tốc độ bình thường: **NOTRUN**.

## Source sửa tiếp, chưa test runtime

Kiểm riêng candidate sửa cảnh dùng `fragment:true` đã có của validator;
storyboard ghép vẫn kiểm toàn bộ cast/coverage trước khi commit artifact.
Không nới nguồn, identity, contact, hình học, security hoặc QC.

Response sửa đã hoàn tất nhưng bị domain reject có thể được kiểm lại khi
request và binding khớp nguyên vẹn. Receipt cũ không đổi; receipt mới dẫn về
file/hash gốc. Candidate vẫn phải qua runtime và kiểm storyboard tổng.
Không sử dụng response pending hoặc chấp nhận bằng tay để vượt gate.

Build source mới đã qua. Runtime regression và render lại **PENDING** do
model test không khả dụng. Kết quả 125+5 test trước chỉ áp dụng source d7a5a3a,
không được dùng để tuyên bố patch mới hoặc phim đã nghiệm thu.

## Bộ kiểm tiếp giao model test

1. Hai beat/cast khác nhau: sửa scene đầu không đòi actor ở scene sau; ghép
   toàn board vẫn từ chối nếu bỏ actor hoặc action có nguồn.
2. Replay completed-domain-rejection khớp request/binding sau sửa validator
   không gọi model lại; request/binding lệch hoặc nguồn/camera/contact sai
   vẫn từ chối. Giữ receipt cũ nguyên byte và runtime gate vẫn bắt buộc.
3. Cache đã qua runtime/commit-failed tiếp tục hoạt động; lỗi local persistence
   không phát sinh lượt provider thứ hai trong cùng lời gọi sửa.
4. Không sửa các test hiện có, threshold, journal, pending hoặc budget. Nếu
   chạy tiếp chính ca này, giữ cumulative 30 calls / 2 reviews và review/scene
   budget đã dùng; không clone/reset/force hay đổi tài khoản để tránh giới hạn.
5. Kiểm video thực: thao tác, nét mặt, cast, clock, phụ đề, audio, freeze/QC;
   xem/nghe toàn phim là nghiệm thu riêng, không suy ra từ probe/ảnh.

## Bằng chứng giữ ngoài repo

Root: `C:/Users/Duongvh-pc/codex-test-evidence/rainy-bus-stop-prep-20261005T072006Z/continuation-20261005T085801Z`.
Các file: production-start.json, driver-terminal.json, supervisor-terminal.json,
media-command-receipts.json, media-release-census.json, old-prefix-model-calls.jsonl,
initial-native-previews/contact-sheet-global.jpg, qc-failure-01/final.mp4,
qc-failure-01/qc-report.json, decoded-native-frames/.

MP4 SHA256: ACAA1F24F57DC2F7F597FA3ED3EEE44B7B3775CAF2EAD5ABA555C45EA917DBFC.
Formal report/release của tester: **chưa có**. Phạm vi toàn sản phẩm vẫn mở.
