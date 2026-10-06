# Thiết kế mở cho video kể chuyện

> Contract hiện hành ngày 02/10/2026: [STORY-ACTOR-DIRECTION.md](STORY-ACTOR-DIRECTION.md). Người que là diễn viên đóng vai trong câu chuyện; bỏ yêu cầu một người dẫn cố định, quota xuất hiện và kích thước bắt buộc. Ba luồng nguyên văn giữ nguyên. Source2.2.21 đang triển khai/nghiệm thu; evidence presenter cũ không chứng minh chế độ mới đạt.

## Quyền thiết kế

Model hoặc người dựng chọn bảng màu, bối cảnh, minh họa, ánh sáng vector, typography, nhiều lớp không gian, chuyển động cơ cấu, biểu cảm, nhịp hành động và camera. Xưởng/đường, tiêu đề và glyph mặc định là nguyên liệu ban đầu. `artDirection.useEnvironment=false` và `showHeading=false` bỏ chúng.

Đầu vào không chỉ định phong cách không tự được gán lời nhắc “Clear 2D vector explainer”. Style dữ liệu để trống cho model tự chọn; preset renderer vẫn phục vụ bản phác thảo. Phong cách do người dùng cung cấp trong tài liệu bổ trợ được giữ.

Nhân vật dẫn người xem qua những ý được kể: phát hiện, quan sát, khám phá, thử mô hình, phản ứng và dẫn sang ý tiếp. Model tự chọn cách reveal, chuyển cảnh và diễn xuất. Cảnh liên tục cần có dàn cảnh phát triển; một nhân vật đứng cạnh sơ đồ suốt bài chưa đáp ứng mục tiêu chất lượng. Không đặt quota số cảnh, màu sắc hoặc một vòng cảm xúc bắt buộc.

Tám recipe là tám ý đồ giải thích, không phải tám bố cục bắt buộc hoặc thứ tự kể cố định. Framing chuẩn hướng dẫn bản phác thảo theo quy tắc; thiết kế riêng có `camera.designIntent` chọn framing và qua kiểm tra visibility thực tế.

Hành động có thời gian chuẩn bị, giữ pose, phục hồi. `react` thể hiện phản ứng; `lead-next` dẫn sự chú ý sang ý tiếp. Host không cần chỉ mọi danh từ hoặc diễn một chu kỳ cảm xúc lặp lại. Cơ cấu có nguồn có thể tự chuyển động theo lời kể; phản ứng do host tác động cần contact trước đó.

Lời kể/audio/clock, identity của từng vai, quan hệ có nguồn, target/gaze/contact và khớp vẫn phải đúng. Các điều kiện này giúp video rõ và đáng tin, không ép phong cách hình ảnh. SVG thụ động hỗ trợ geometry/text/gradient/mask/clip/SVG lồng; cấm script, handlers và tải tài nguyên ngoài. Layers dùng stage pixels và local shot clock. Custom model dùng fragment 100×100 tâm (0,0), hoặc SVG đầy đủ trong hộp có tâm tương ứng. Motion target phải chứa hình vẽ trong cây hiển thị. Kiểm tra cấu trúc không chứng minh chất lượng pixel thật.

Custom model chọn `labelMode: renderer | artwork | none`; `artwork` dùng nhãn trong thiết kế riêng, `none` không thêm nhãn mặc định. `motionOrigin: {x,y}` đặt tâm chuyển động trong tọa độ SVG của nhóm `.motion`; nếu bỏ trống, fragment dùng (0,0), SVG đầy đủ dùng tâm viewBox. Không dùng tọa độ stage làm tâm quay trong glyph. Object cùng loại/nhãn/cấu hình có thể giữ ID xuyên cue và gom nguồn đúng đối tượng; flow mới phải có nguồn khẳng định từ chính cue đang kể và nằm trong clock cue đó.

## Cấu hình

Studio → **Nội dung, diễn viên và giọng kể** có ý tưởng hình ảnh tự do và model thiết kế cảnh. API settings nhận `presentation.design_brief` và `models.storyboard`; đổi chúng dựng lại hình, giữ narration còn hợp lệ. Form không nhận executable/key trực tiếp; key dùng biến môi trường, CLI executable riêng đặt trong YAML của máy/dự án.

```yaml
presentation:
  mode: story-cinematic
  character_mode: actors
  design_brief: "Diễn viên đóng vai trong tình huống được kể, nhịp diễn rõ và cơ chế dễ đọc. Tự chọn ngôn ngữ hình ảnh phù hợp."
models:
  storyboard:
    provider: codex-cli
    model: default
    timeout_ms: 900000
    # command: C:/path/to/native/codex.exe
```

Codex CLI dùng executable native, workspace rỗng, ephemeral, read-only, bỏ user config cho lời gọi này và tắt shell/apps/plugins/hooks/browser/code host. Không thay đăng nhập hay trích xuất OAuth. Application kiểm tra JSON/source/clock/geometry/security, từ chối tool operation/failed turn. Adapter không đo giá dollar; usage chịu giới hạn tài khoản. Zero tracked cost không có nghĩa miễn phí. [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [CLI reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli).

Claude CLI dùng `provider: claude-cli`, model tài khoản hỗ trợ, print/JSON, tools rỗng, safe mode và prompt/schema qua stdin. YAML có thể đặt `max_call_cost_usd`. Managed policy vẫn có thể áp dụng; không coi flags là bảo đảm tuyệt đối không có hooks quản trị. [Claude CLI reference](https://code.claude.com/docs/en/cli-reference).

## Nguồn thiết kế và nghiệm thu

`creative-direction-report.json` ghi `model`/`authored`/`offline`, cấu hình và hash. Sửa tay canonical storyboard làm nguồn shot thành authored. Model lỗi không âm thầm thành mock. Offline là seed theo quy tắc; authored là thiết kế riêng; model là lời gọi thật. Giữ riêng evidence ba loại.

Cache và bản model bị validator từ chối được gắn nội dung, prompt và cấu hình model/provider. Chỉ tái kiểm tra candidate có binding phù hợp; candidate cũ thiếu binding không được nhận lại rồi gán cho dịch vụ mới.

Contract gửi model yêu cầu đủ mục tiêu giải thích, nguồn, cue IDs, cast diễn viên và kế hoạch cinematic. Khi nhiều cảnh sai, pipeline gửi các lỗi độc lập cùng một lượt feedback. Resume giữ bản thiết kế rejected mới nhất còn khớp dữ liệu/cấu hình và yêu cầu model sửa theo lỗi hiện tại; bản đó vẫn phải qua đầy đủ validators trước khi dùng. Đây là cơ chế tiếp tục công việc sáng tạo, không phải bỏ kiểm tra hoặc chuyển sang mẫu ngoại tuyến.

Build/typecheck và QC không chứng minh video hấp dẫn. Cần xem/nghe video thật, biểu cảm/chuyển động/quan hệ, contact/cut/nhãn và cuối cue. Ba luồng, hai bài đầy đủ/hai host, edits/resume và GitHub vẫn theo [TEST-HANDOFF.md](TEST-HANDOFF.md); một demo hoặc một model call không đóng những yêu cầu đó.

## Điểm chạm artwork — triển khai06/10, test sau sửa còn chờ

artDirection.models[].handleAnchor:{x,y} chọn handle trong rendered part viewport, finite0–1. Shared partAnchor đổi sang stage pixels cho target/controller/rendered control; center/label và absent-field legacy giữ nguyên. Custom point không chứng minh pixel-hit hoặc tự theo mesh SVG. Props vẫn giữ center/gripOffset/performer scale, một owner, nguồn/reach/bone/contact/clock; contactRequired event phải sau contact và nằm trong cửa sổ action. Opt-in marker chỉ stale visual scenes chọn field, không narration. Source/build/typecheck/schema đã có; independent schema/contact/source/cache/lock/seek/browser/film cònNOTRUN. [Contract](docs/ARTWORK-CONTACT-ANCHORS.md), [bàn giao kiểm tra](docs/validation/2026-10-06-sourced-world-contact.md).
