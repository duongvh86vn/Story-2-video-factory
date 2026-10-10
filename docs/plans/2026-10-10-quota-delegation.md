# Phân công theo cấu hình 9router của người dùng

**Điều chỉnh mới nhất:** ưu tiên tái sử dụng asset, dừng tạo ảnh lặp. Built-in đã dùng một lần theo yêu cầu khi Gemini sai nét; không có lượt ảnh nào sau yêu cầu dừng. [Guard CLI và bộ ảnh hiện có](../topics/ART-REUSE.md). Chỉ đề xuất ảnh mới khi chỉ rõ phần thiếu; thay câu chuyện/pose/version không tự gọi image model. Phân vai coder/tester bên dưới giữ nguyên.

Áp dụng theo yêu cầu giảm quota phiên chính ngày 10/10/2026. Một task hẹp có contract và file sở hữu rõ; chỉ gọi vai trò cần thiết, không gọi toàn bộ nhóm mỗi vòng. Parent giữ tích hợp và kiểm tra đề xuất. Không dùng Fusion, không tự retry. Runtime tiếp tục do model test của người dùng thực hiện.

| Combo / route | Công việc |
| --- | --- |
| `Project-manager` | Chia việc và ưu tiên khi cần; DeepSeek Flash theo fallback đã cấu hình |
| `coder` | Viết module độc lập, đề xuất patch và khai báo test; GPT Luna trước, DeepSeek fallback |
| `tester` | Rà soát source và chuẩn bị ca test; GPT Luna. Lời nhận xét không phải kết quả chạy test |
| `business-analyst`, `planner` | Phân tích yêu cầu hoặc kế hoạch khi có bài toán tương ứng; GPT Sol |
| `architect` | Bài toán kiến trúc cần chuyên gia; GPT Astra |
| `debugger` | Lỗi khó đã có bằng chứng cần phân tích; GPT Sol |
| `ag/gemini-3.1-flash-image` | Ưu tiên sinh/sửa ảnh, pose và asset từ ảnh mẫu qua adapter ảnh riêng |
| Phiên chính | Tích hợp, giữ identity/contract/gates, kiểm tra patch và quyết định kỹ thuật |

## Route ảnh đã kiểm tra

GET `http://127.0.0.1:20128/v1/models/image` trả HTTP 200 và liệt kê `ag/gemini-3.1-flash-image` cùng `gemini/gemini-3.1-flash-image-preview`. Discovery không chứng minh một lượt sinh ảnh thành công hoặc tài khoản upstream còn quota.

`packages/models/nine-router-image.ts` đã có `generateNineRouterReferenceImage()` gọi `/v1/images/generations`, nhận một reference board inline và trả bytes ảnh. Luồng tham chiếu hiện hỗ trợ prefix `ag/` và `cx/`; không tự thay bằng `gemini/` vì adapter Gemini đã được ghi nhận bỏ ảnh tham chiếu. `scripts/prehistoric-pose-art.ts` mặc định dùng `ag/gemini-3.1-flash-image`. Không chạy script hoặc sinh ảnh mới trong lượt kiểm tra này.

Khi cần asset, dùng ảnh gốc của người dùng để giữ mặt, tóc, trang phục, màu sắc; chỉ sinh phần còn thiếu, tránh sinh lại toàn bộ atlas. Ghi prompt, source/hash, model và kết quả từng lượt; giữ cache hợp lệ, đọc lại ảnh trước khi đăng ký. Asset sinh ra vẫn cần đối chiếu identity, khớp/pose và chuyển động thật; không tự coi là đã nghiệm thu.

## Hai task source đã thực sự giao

- `coder-occlusion-tests` → combo `coder`, response model `gpt-6-luna`: đề xuất hai khai báo test trong `tests/native-head-occlusion.test.ts`, đã được parent đọc và tích hợp. Provider báo 9.904 input + 1.061 output = 10.965 token. Callback chưa chạy.
- `tester-occlusion-review` → combo `tester`, response model `gpt-6-luna`: review tĩnh mặt bị che và paint; provider báo 10.027 input + 373 output = 10.400 token. Ba nhận xét không được coi là lỗi đã xác nhận: code đã đối chiếu eye/brow visibility theo slot, bắt buộc contour nằm trong protectedContours, kiểm lid matrix; hàm matrix error chỉ đo transform như tài liệu của nó, không kiểm toàn bộ opacity.

Packet/proposal nằm trong `runtime/dev-agents/source109-visibility/`, không tự áp dụng source hoặc thực thi code model. Tổng báo cáo hai request: 21.365 token 9router, không quy đổi thành phần trăm tiết kiệm hoặc chi phí. Đề xuất của model được kiểm tra trước tích hợp; không mở thêm vòng gọi chỉ để xác nhận các finding đã bác bỏ bằng source.


## Source0.110: lượt ảnh và tách nền thực tế

Một request `ag/gemini-3.1-flash-image` đã thành công, JPEG gốc được giữ nguyên và alpha được tạo riêng bằng BiRefNet CPU. Không có usage ảnh trả về. Ba task source dùng combo coder/tester, response đều GPT Luna: 3.549 + 4.091 + 2.979 = 10.619 token provider báo. Không retry/Fusion; parent sửa và tích hợp đề xuất. [Công cụ, artifact, môi trường và việc còn thiếu](../topics/GEMINI-PROFILE-ART.md). Phần discovery/chưa generation phía trên mô tả riêng lượt0.109.
