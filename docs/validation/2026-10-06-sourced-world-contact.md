# Sourced actor context và artwork contact — đạt kiểm tra cục bộ, chưa nghiệm thu phim

Code được kiểm: `443220f6a6fe5516647b9df707d79a5c50d0318f`, branch `codex/stickman-acting-v22`. Source giữ sceneIntent thật trong composed-world relation validation, dùng chung ExplanationBeat cho static/timed flow. Các gate nguồn/tên/vai/statement/current cue/clock không được nới. Optional `handleAnchor` đi qua cùng resolver `partAnchor`; grip/event diagnostics giữ predicate và tolerance. [Contract](../ARTWORK-CONTACT-ANCHORS.md).

## Kết quả sau sửa

Evidence độc lập: `C:/Users/Duongvh-pc/codex-test-evidence/sourced-world-contact-local-20261006T060000Z`.

| Đợt | PASS | FAIL | SKIP | Child exit | Kết thúc UTC |
| --- | ---: | ---: | ---: | ---: | --- |
| Baseline fixture bất biến + bốn suite cũ | 494 | 0 | 2 | 0 | 06:03:17.298 |
| Contact fixture lần đầu + sáu suite cũ | 209 | 21 | 1 | 1 | 06:06:54.774 |
| Contact sau một lần sửa fixture/entrypoint | 229 | 0 | 1 | 0 | 06:11:33.302 |
| Protocol custom-handle/GSAP/outbound bổ sung | 0 | 1 lỗi setup | 0 | 1 | 06:16:13.765 |

Đợt baseline có72 supplemental và422PASS/2SKIP trong tests cũ. Đợt corrected contact có148 supplemental và81PASS/1SKIP trong tests cũ. Không cộng các đợt thành tổng nghiệm thu sản phẩm.

Baseline giữ nguyên source/compiled behavior fixture, dữ liệu và assertions; SHA256 `FB1C1C9693EEDBD4498C6B640528E554CEB5C9659B109BFF77C22B0BAFD51915`. Bốn suite không đổi: creative-world, explanation-english, cinematic-target-precision, cinematic-prop-origin-precision.16valid named-placement failures trên code trước đã qua; negative nguồn/tên/vai/quote/clock vẫn reject. Đây là bằng chứng sửa mất context, không chứng nhận physics của raw native candidate.

21fail lần contact đầu đã được phân loại và giữ nguyên raw: bốn oracle literal floating arithmetic; bốn supporting performance.id không đúng shot.id; bốn fixture ghi đè action object bằng role string; tám kiểm event gọi sai public gate; một browser skip pattern sai, bị guard chặn trước khi executable chạy. Một lần sửa setup/entrypoint giữ strict assertions và các điều kiện production. Event negatives dùng public validateExplainerStoryboard, chứng minh positive trước rồi khớp diagnostic contact-before-event cụ thể. Không đổi predicate/tolerance để lấy PASS.

Corrected contact đã qua source+compiled finite/bounds/strict schema, fallback target arithmetic, primary/supporting fixed contact cả hai rig, primary moving props ởscale0.8/1/1.2, grip/placed center, source/identity/hand/clock/ownership/origin/reach và event-before/equal negatives. Existing art-direction, artwork-projection (browser test bỏ qua rõ ràng), story-prop-controls, acting-transport, locked-scene-migration, creative-director giữ nguyên. Generic GSAP seek/reverse qua trên synthetic DOM; chưa chứng minh pixel contact dưới camera của field mới.

Protocol fixture có sáu intended assertions nhưng không đăng ký được vì external TS nhận là CJS, top-level await thất bại. **Custom-handle-specific HTML/GSAP seek/reverse và outbound contactGeometry request capture còn NOTRUN**. Specific opt-in scene-key/legacy-byte cache parity cũng chưa kiểm. Tải fixture thành công không phải assertion PASS. [Bundle ESM chưa chạy và thứ tự tiếp](../NEXT-MODEL-TEST-HANDOFF.md).

## Formal evidence và giới hạn thủ tục

- `REPORT.md`: SHA256 `6D7E392505DA4920F755C398E14CF74D10739DACD50407E916EB7D4A5CD3C9D0`.
- `release.json`: SHA256 `7764800A71CD6C5D74EF5A73ED0963F93C1DC1DC472661A283729E937FC21FC1`, result PARTIAL.
- `artifacts.json`:703entries, SHA256 `4F64DE8D0B3A12550993A706D565A3207B7190EF59FA7EDE554AFEA4CD156A7D`.
- Writer tool3172 exit0 nhưng có nonterminating PowerShell bare `true` error. `case-counter-receipt.json` không được viết; không suy metadata đạt chỉ từ numeric exit.
- Tester turn01a10fcd kết thúc bằng usage-limit systemError trước `completion.json`. Attestation này còn thiếu. Bốn lần đọc context lịch sử không có pre-content kernel receipts; không tái tạo chứng cứ.

Parent958a32 exit0,07:01:38.1579318UTC chỉ đọc lại703manifest hashes, source403/dist423/case169 hash/name sets và74known full kernel identities; tất cả terminal,0live/uncertain, source sạch HEAD443. Original journal28started/28completed/0pending,remaining2/30 và không factory lock. Proof ngoài raw test root: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/contact-parent-postwriter-closeout-20261006.json`, SHA256 `ED2ECD3E83E66593751526DB9944A0CC8FEC1014859ED23D94D90C4929486E18`. Source freeze được giải phóng bằng fresh parent closure; không gọi đây là tester completion hoặc runtime test. Không sửa raw history.

## Bằng chứng trước sửa và build

Baseline trước sửa tại `sourced-world-baseline-20261006T033837Z`:478PASS/16FAIL/2SKIP exit1,16fail là sourced named-placement positives; direct verified-context controls/negatives qua. Tester01a10f4a hếtquota trước formal REPORT/release/completion. Parent5f34c9,05:47:22.4120077UTC xác nhận source398/dist423/case169 exact,33known resources terminal và giữ khoảng trống report. Những số RED này thuộc code1af19a6, không được đổi thành PASS sau này.

Parent đã chạy context-only build8ba915→568d4b và combined build0a45e3→8a0017 exit0 (core/Studio TypeScript và Vite); test:typecheckfb5184 exit0 chỉ biên dịch tests; npm run schemas ebdfa1 exit0. First compiled-schema import89e2f6 exit1 vì module không nằm trong dist, được giữ. Generated snapshots còn đồng bộ các Zod movement/operation/jump/drop/performance14 đã có trước, không tự thêm runtime capability.

## Tiếp tục

Chủ dự án giao model test khác. Parent chuẩn bị fixture ESM với assertions nguyên vẹn nhưng chưa chạy, không spawn/message model thay thế và không chạy provider/TTS/browser/media tests. [Bàn giao cụ thể](../NEXT-MODEL-TEST-HANDOFF.md) gồm local gaps, original project và public resume --until DRAFT_RENDERED trong ngân sách đã duyệt. [Native ca gốc đã đóngFAIL](2026-10-06-native-ensemble-closeout.md).

Full phim, diễn xuất thật, source correctness, C1–C6 và matrix thể loại/hai rig/idea-script-WAV-SRT-WAV+SRT/EN-VI-JA-KO/external TTS/edit-resume-lock-export còn mở. Source hiện hành không biến tool thành template sinh nhật hoặc máy móc. Build/schema/local PASS không chứng nhận video mượt hoặc sản phẩm hoàn thành.
