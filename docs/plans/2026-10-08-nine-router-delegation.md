# Phân việc triển khai qua 9router — source0.51

## Lượt mới source0.51 và cách kiểm soát quota

Batch `head-face-051` hoàn tất4 request thực: Luna đề xuất code15.010 token, Gemini đối chiếu Karo mouth plate5.034, Sol review17.913 và review tiếp16.551. Tổng **54.508 token** provider báo. [Report có SHA và giới hạn](../topics/reviews/native-head-face-nine-router-review-v1.json). Đề xuất Luna không được áp dụng; parent viết lại. Một số finding Sol đúng và đã sửa; các finding thiếu matrix/path refinement và precedence được parent bác sau đọc source đầy đủ. Không coi số request hoặc ý kiến đồng thuận là bằng chứng chất lượng/quota tiết kiệm.

Các lượt tiếp theo chia phần độc lập: GPT nhẹ viết module nhỏ theo contract; Gemini đối chiếu ít ảnh đúng nguồn; GPT mạnh review geometry/shared contracts khi thật sự cần. Parent tích hợp, kiểm nguồn/identity/clock/contact/final gates và quyết định. Runtime vẫn dành cho model test của người dùng. Yêu cầu mới về quần chúng nam đầu trọc/nữ có tóc là hai mẫu riêng, tái sử dụng trang phục Karo/Lila, không đổi hai nhân vật chính.

Mỗi task chỉ gửi đoạn/file liên quan và yêu cầu kết quả ngắn có finding + vị trí + giới hạn. Ưu tiên output1.000–2.000 token cho review, chỉ tăng cho module cụ thể; không dùng trần12.000 mặc định. Không gọi lại cùng dữ liệu, không để nhiều model viết cùng file hoặc luân phiên review toàn bộ repo. Cache/lock và tối đa6 HTTP request mỗi batch vẫn áp dụng; không retry tự động. Dừng hoặc thu hẹp task khi phản hồi thiếu dữ liệu/sai, thay vì lặp prompt lớn. Ghi token thực và phần được dùng/bị bác; chưa có dữ liệu đủ để khẳng định phần trăm tiết kiệm quota.

## Lịch sử source0.50

Ba request thực trong batch `head-cell-050` đã hoàn tất: Gemini đối chiếu primary với V1 (7.669 token), GPT review hẹp ba file source (7.172), Gemini đối chiếu V1/V2 sau sửa (7.052). Tổng **21.893 token** provider báo. [Report bound nguồn và ảnh](../topics/reviews/primary-angle-heads-nine-router-review-v1.json), [kết quả tạo hình và giới hạn](../topics/reviews/primary-angle-heads-source-record-v1.md).

Response ảnh V2 chỉ 68 output token; parent phải đối chiếu riêng, không coi là chứng nhận giữ nguyên pixel/identity/seam/motion. GPT không được cung cấp raw PNG/metadata để xác nhận chúng. Không model nào thực thi code/test hoặc tự sửa repo. Bốn lượt built-in imagegen tạo V1/V2 riêng, không nằm trong số token 9router trên. Batch ID tối đa 64 ký tự chữ thường/số/gạch ngang, không dùng dấu chấm; packet sai tên bị chặn trước API.

## Lịch sử source0.49

9router đang chạy local ở `http://127.0.0.1:20128/v1`. Ba lượt inference thực đã hoàn tất ngày08/10/2026. Danh sách model GET200 là discovery; các response dưới mới là bằng chứng model đã nhận việc. Không có runtime/video được chạy.

| Việc | Model | Token9router báo | Kết quả tích hợp |
|---|---|---:|---|
| Đề xuất module đo đầu +khai báo test | `cx/gpt-5.6-luna` |9.141| Có đề xuất, chưa dùng nguyên bản: thiếu kiểm geometry/mắt/crop/polygon và fixture alpha sai. Parent sửa source/test trước tích hợp |
| Đối chiếu primary/front/near-right PNG | `ag/gemini-3.8-flash-low` |7.230| Tư vấn nét/mặt/tóc/cổ; parent đọc lại cả ba PNG. Đây là nhận xét ảnh tĩnh, không là chấp thuận hoặc số đo |
| Review module/test đã sửa | `cx/gpt-5.6-sol` |9.761| Không có finding cụ thể trong ba file được cung cấp; giới hạn source-only, không thực thi |

Tổng token9router báo **26.132** (19.378 input,6.754 output). Chưa có dữ liệu giá, quota theo tài khoản hoặc mức tiết kiệm so với làm toàn bộ bằng một model, nên không quy đổi chi phí hay khẳng định tỷ lệ tiết kiệm. Một lượt chuẩn bị review bị client từ chối tên `.test.ts` trước gửi API; regex đã sửa, không tính là inference.

## Cách phân việc tiếp theo

- GPT nhẹ: module độc lập/khai báo test/tài liệu có contract rõ, vài file source cần thiết.
- Gemini: đối chiếu raster/biểu cảm/pose/style từ nguồn đã cung cấp; cần parent kiểm lại, không suy nghiệm thu từ lời model.
- GPT mạnh hơn: review hẹp phần đã tích hợp hoặc bài toán geometry phức tạp; chuyển việc khi model nhẹ thiếu chất lượng, không lặp prompt lớn liên tục.
- Parent giữ tích hợp/shared contracts, actor identity, source/voice/contact/final gates và quyết định thiết kế. Chia phần độc lập, không để nhiều model ghi cùng file.

Các việc này là trợ lý **triển khai source**, tách khỏi các role model của pipeline video đang có. Runtime vẫn giao model của người dùng như đã yêu cầu.

## Tool dùng lại

`scripts/dev-nine-router.ts` nhận packet JSON trong `runtime/dev-agents/<batch>/<task>.json`. Mỗi batch tối đa6 lượt HTTP dành riêng, lock theo task/call, không retry tự động. Cache theo packet+source+ảnh SHA; dữ liệu đổi dùng task ID mới, không ghi đè proposal. Proposal không tự sửa file hoặc thực thi bất cứ code/command nào. HTTP timeout180s; đầu ra tối đa12.000 token mỗi packet, response nội dung tối đa256KB. Các giới hạn client không chứng minh retry nội bộ hay quota của9router.

Đọc key từ `MODEL_GATEWAY_KEY`, `STORY_FACTORY_ENV_FILE` hoặc `.env` của repo; fallback đọc `.env` ở checkout D được bảo vệ, không sửa file đó. Không ghi key vào packet/log/chat. Model phải là ID đã discovery được; model khả dụng có thể thay đổi.

Packet mẫu (nguồn là dữ liệu, không là lệnh):

~~~json
{
  "version": "dev-nine-router-task-1",
  "id": "review-small-module",
  "model": "cx/gpt-5.6-sol",
  "purpose": "source-only-review",
  "prompt": "Review nguồn được gửi. Chỉ trả JSON findings/limits; không thực thi.",
  "sources": ["packages/topics/head-cell-landmarks.ts"],
  "images": [],
  "maxOutputTokens": 1500
}
~~~

Sau khi lưu packet dưới batch mới, người dùng/agent triển khai có thể gọi:

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
node --import tsx scripts/dev-nine-router.ts --task runtime/dev-agents/source-review/review-small-module.json
~~~

Source allowlist: TS dưới packages/tests/apps/scripts, MD dưới docs/plans hoặc docs/topics; từng file64KB, tổng source55.000 ký tự. PNG allowlist hiện hẹp: primary Lila/Karo, từng head-cell và head-face-plate cùng repo, tối đa4 ảnh8MiB/ảnh. Không upload toàn repo, key, env, runtime người dùng hoặc dữ liệu ngoài allowlist. Packet/proposal runtime bị gitignore; báo cáo đã kiểm và source sở hữu mới được commit. Tool không cài thêm SDK/service và không cần image-to-video API.

## Tạo hình còn phải sửa thật

Parent xác nhận artwork0.48 có silhouette đầu/mặt tròn và nét sạch đều hơn mẫu, cổ cụt có nét chốt phía dưới, hair/face/neck frame thay giữa hai PNG. Màu da ấm và tóc dài được giữ ở mức tổng thể, nhưng chưa đủ identity/correspondence. Gemini dùng các từ như “guarantees”/“severe” khi dự đoán seam; **không coi đó là bằng chứng lỗi renderer hoặc video**. Vùng seam và chuyển động phải được đo/test trên đúng source bởi model test.

Tiếp theo phải sửa chính artwork/face/cổ, đo từng source và nguồn tương thích thân; Karo đủ hướng/râu/mặt, speech/blink/emotion/masks/secondary, partner gaze/props và full3 input EN/VI/JA/KO vẫn còn. Không đổi yêu cầu thành phim im lặng hoặc presenter cố định để né guard. `productionReady=false`, `productionRig=null`, chưa có bank thực hoặc video được nghiệm thu mới.
