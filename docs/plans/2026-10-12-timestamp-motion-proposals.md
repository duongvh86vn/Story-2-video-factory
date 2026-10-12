# Đề xuất chuyển động có căn cứ từ ảnh

CLI đề xuất dùng ModelAdapter, cache/source/clock receipt; backend/editor hiện có vẫn dùng numeric definition sau khi người vận hành xem. Không nối model trực tiếp vào renderer. Chọn CLI trước để xác minh vision/geometry/cost; endpoint UI có thể gọi cùng hàm sau đó. Không thay schema cũ hoặc các artifacts đã xuất.

Đã triển khai schema từ coder9router, CLI local20128, explicit budgets/cache/reservations và10 test mới. Vision thật15/18 nêu thiếu clean texture và chuyển động lắp ghép; re-run0 call. Chưa có candidate nguồn thật được duyệt hoặc nút AI trong Studio. UI recipe1 hiện có đã save/play/seek/export-cache/download qua CUA; chọn vùng mới vẫn chưa xác nhận. Tester tìm usage cũ và có regression red→green. Không ghép narration/final hoặc đóng mục tiêu; bước tiếp là bổ sung tịnh tiến/tiếp xúc theo nhu cầu source18, asset texture source15 và nối receipt UI.

Contract prompt:

```json
{
  "outcome": "Produce a reusable, image-grounded motion proposal for one timestamped source image, validated as numeric data without executing model code.",
  "success_criteria": [
    "Proposal is bound to exact source image SHA256, dimensions, cue text and clock.",
    "Candidate geometry validates in normalized0–1000 space and maps to source pixels.",
    "Occluded objects lacking hidden artwork are reported needs-artwork, without invented clean plate IDs.",
    "Repeated identical request reuses a verified immutable receipt and makes no extra model call."
  ],
  "boundaries": [
    "Keep original full image, colors, face and text; no redraw, new labels, generated animation code or rewritten narration.",
    "Current renderer only supports elliptical rotation and rigid part pivot; no claim of generated running, head turns or lip-sync.",
    "Do not auto-apply or claim visual acceptance."
  ],
  "permissions": [
    "Read selected local source image and cue data.",
    "Send one selected image and cue to the configured9router model only when proposal CLI is invoked.",
    "Write proposal/reference/receipt into an isolated local output cache."
  ],
  "tools": [
    "Bounded9router Chat Completions adapter",
    "Existing timestamp geometry validator and source clock importer",
    "Sharp for a diagnostic vision preview only"
  ],
  "evidence": [
    "Schema/geometry/source/cache/one-call tests",
    "Real source-image proposal and fixed renderer preview before applying candidate",
    "Build/typecheck and report distinguishing proposal from approved motion"
  ],
  "stop_conditions": [
    "Return verified cache hit without network.",
    "Stop on missing credentials, unsupported vision, HTTP/quota failure, stale source, invalid geometry or prior unconfirmed request.",
    "Stop after explicit max-calls budget; no automatic retry."
  ]
}
```
