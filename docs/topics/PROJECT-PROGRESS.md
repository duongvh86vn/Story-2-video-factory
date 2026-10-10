# Mốc tiến độ dự án

**Lượt source115 — 11/10/2026: khoảng40%, +0 điểm phần trăm.** Gỡ chặn xuất một cảnh0,9s bằng đóng gói lossless, có clip60fps và phép so sánh tua DOM/PNG trung thực. Chưa sửa anatomy/diễn xuất, chưa có câu chuyện đủ dài hoặc ba input đến final/QC; chưa đủ căn cứ cộng điểm. [Báo cáo](../../TEST-RESULTS-PREHISTORIC.md), [việc còn thiếu](SCENE-BAKE-COMPACTION.md).

Mốc đầu được báo theo yêu cầu người dùng từ source0.113: **khoảng 40% toàn dự án**, là ước lượng triển khai có độ bất định lớn. Đây không phải tỷ lệ test PASS, chất lượng hình đạt 40%, hoặc 40% yêu cầu đã nghiệm thu. Chưa có baseline số hiện hành trước mốc này nên chưa tính mức tăng so với commit trước. Đánh giá 25–30% của người dùng về demo cũ không được dùng làm baseline của toàn dự án hiện tại.

Ước lượng dựa trên phạm vi [đặc tả chủ đề](CUOC-SONG-THOI-TIEN-SU.md), source và artifact hiện có, giảm mạnh phần điểm của khả năng chưa được kiểm chứng trong thành phẩm. Bảng dưới dùng trọng số công việc, không dùng số commit, dòng code hay số ảnh. Điểm chỉ giúp giải thích mốc khoảng 40%; không có độ chính xác đến từng điểm phần trăm.

| Nhóm yêu cầu | Trọng số | Điểm ước lượng hiện tại | Bằng chứng/việc còn thiếu |
| --- | ---: | ---: | --- |
| Ba input, kịch bản trung thực, clock thật | 15 | 8 | Có parser, authoring, narration và orchestration; thiếu chạy cả ba luồng trên SHA mới |
| Identity, nét, trang phục và các góc | 20 | 5 | Có ảnh gốc/cutout/own registrations; đầu mới còn giữ lại, chuyển góc và identity chưa được nghiệm thu |
| Toàn thân, mặt, listener, tương tác và chuyển động | 25 | 7 | Có kernel, nguồn clock, mặt/khớp/seat/contact/cut; regression cục bộ đã phát hiện lỗi, chưa có phim đạt yêu cầu |
| Thế giới, màu, ánh sáng và đạo diễn/camera | 10 | 4 | Có source bối cảnh/palette/camera; thiếu review phim day/sunset/night và câu chuyện thật |
| Giọng EN/VI/JA/KO và local/external TTS | 10 | 5 | Có adapters/language/per-speaker config; thiếu matrix giọng và audio hiện hành |
| Studio, resume/cache/lock/rebuild | 10 | 5 | Có API/UI/contracts/cache; thiếu nghiệm thu thao tác và thay input/voice/model xuyên run |
| Xuất final/QC, hướng dẫn, build và GitHub | 10 | 4 | Build/typecheck/source được giao; chưa có final mới và QA ledger đạt |
| **Tổng** | **100** | **38 ≈ 40%** | **Sản phẩm chưa hoàn thành** |

Mỗi commit lên GitHub cần báo link/SHA, tổng tiến độ ước tính, thay đổi điểm phần trăm so với mốc đã báo và việc còn thiếu. Commit chỉ tài liệu/đóng gói không tự cộng điểm. Thay đổi source0.113 là sửa kernel tay nghỉ; chưa tự cộng phần trăm nghiệm thu do sáu callback mới và video chưa chạy. Source review của combo tester chỉ là nhận xét tĩnh.

Chưa có báo cáo QA hiện hành chứng minh hoàn thành sáu nhóm tiêu chí của goal. Không suy ra tỷ lệ đã nghiệm thu từ số test cũ, `productionReady=false`, manifest hoặc việc không tìm thấy lỗi. Khi có kết quả thực tế, cập nhật lại ước lượng và phần còn thiếu; không duy trì một con số cho đẹp.

Source0.114 sửa 13 registration và lỗi kiểm hình học ghế/chân với source head, tái sử dụng nguyên artwork; chưa cộng điểm từ schema/test hẹp. Tiến độ bàn giao vẫn **khoảng 40%, +0 điểm phần trăm** so với mốc đã báo. Kết quả runtime và chẩn đoán được lưu tại `TEST-RESULTS-PREHISTORIC.md`; các lỗi pose/cảnh và nghiệm thu video còn mở.
