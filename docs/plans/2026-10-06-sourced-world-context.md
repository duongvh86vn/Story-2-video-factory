# Sourced World Context Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giữ chủ thể đã được xác minh khi kiểm quan hệ đồ vật trong cảnh diễn viên, nếu baseline độc lập xác nhận bị mất ngữ cảnh.

**Architecture:** Public `validateAuthoredVisualSources` tiếp tục dùng `validateExplanation` và mọi gate nguồn hiện hành. Beat world ghép nhận sceneIntent thực của shot; cùng một beat được dùng cho quan hệ tĩnh và timed flow. Không thêm bộ suy đoán tên riêng hay nới predicate.

**Tech Stack:** TypeScript, Zod, Node test runner, source/compiled public validators.

## Global Constraints

- “Nhân vật là diễn viên tham gia câu chuyện.”
- “Khi đã chọn script hoàn chỉnh, các bước sau không tự viết lại, dịch hoặc thêm thoại.”
- “Tên, vai, identity và statement phải khớp narration; statement giữ nguyên câu, gồm phủ định.”
- Parent triển khai/build/typecheck; model khác chạy test. Không chỉnh case gốc, input/audio/clock/cast/locks, journal/budget hoặc raw FAIL.
- 28/30 call đã dùng; local checks không cấp quyền gọi model. Full C1–C6/phim vẫn mở.

---

### Task 1: Khôi phục ngữ cảnh nguồn qua cổng world validation

**Files:**
- Modify: `packages/explainer/visual-sources.ts` (đã đọc: composed beat và timed transfer checks).
- Test: existing `tests/creative-world.test.ts`, `tests/explanation-english.test.ts` giữ nguyên; fixtures bổ sung ngoài repo do tester sở hữu.
- Proposed delivery doc: `docs/validation/2026-10-06-sourced-world-context.md` sau formal release.

**Interfaces:**
- Consumes: `validateAuthoredVisualSources(shot: Shot, canonical: ExplanationBeat[], narration: Narration, hostId: string): void`.
- Produces: chữ ký trên giữ nguyên; `validateExplanation(plan, story, narration, beats, hostId)` nhận `shot.cinematic.sceneIntent` trong composed ExplanationBeat khi có.

- [x] **Step 1: Independent baseline** — dùng exact raw garden.finishing/canonical narration/explanation; đối chiếu direct explanation với composed-world. Kiểm tên riêng có nguồn EN/VI, negation/modal/conditional/imperative, source/name/role giả, ordered endpoints, static/flow/clock, legacy object-only. Không mặc định parent đúng.
- [x] **Step 2: Verify relevant failure** — tester lưu focused command/fixtures bất biến, numeric exit và failure lines. Existing relevant command từ C: `node --import tsx --test tests/creative-world.test.ts tests/explanation-english.test.ts tests/cinematic-prop-origin-precision.test.ts`. Nếu không tái hiện missing-context, dừng patch này và báo inconclusive/wrong diagnosis.
- [x] **Step 3: Minimum patch** — sau baseline formal release + fresh parent closeout, dựng một `ExplanationBeat` dùng fields hiện hành và `...(shot.cinematic?.sceneIntent ? {sceneIntent: shot.cinematic.sceneIntent} : {})`. Call hiện hành cho static world dùng beat đó; timed transfer dùng `{...composedBeat, relations:[relation]}`. Giữ exact source validation, role/name/statement validation, target set, quote, current cue và clock. Không lấy participants từ tên đoán hoặc actor costume.
- [ ] **Step 4: Focused green** — tester chạy lại **identical behavioral test files/data/assertions**; root guard/supervisor/cutoff phải mới để không ghi vào old evidence trên source và compiled. Expected: positive nguồn hợp lệ không bị lỗi relation do mất tên; negatives vẫn reject; raw candidate đầy đủ vẫn có thể fail physics.
- [ ] **Step 5: Build/affected checks** — parent `npm run build`/`npm run typecheck`; tester relevant existing command phía trên. Preserve accepted caches/audio/clock and original project169 files/counters28/28/0.
- [ ] **Step 6: Publish** — sau green formal release + parent closeout, commit riêng `Fix sourced actor context in composed-world validation`, update GitHub branch và current docs, giữ mọi FAIL lịch sử. Không merge main như sản phẩm đã nghiệm thu.

**Observable decisions:** không đổi exit status/error policy của pipeline; không overwrite nguồn/artifacts; không tự promote whole storyboard; default legacy world giữ hành vi. Không có quyết định sản phẩm cần người dùng trả lời cho bản sửa này.

Kế hoạch đang ở D/temp vì C source398/dist423 đóng băng trong baseline lease. File đích sau release là `docs/plans/2026-10-06-sourced-world-context.md`. Thực hiện inline trong parent; cùng agent độc lập hiện có làm test theo yêu cầu người dùng.

## Checkpoint 2026-10-06
Independent baseline attempt2 cd586b exit1:478PASS/16FAIL/2SKIP (existing422PASS/0FAIL/2SKIP, supplement56PASS/16FAIL). Fixtures SHA256 FB1C1C9693EEDBD4498C6B640528E554CEB5C9659B109BFF77C22B0BAFD51915;16 failures are named sourced placement positives on source+compiled, direct controls and negatives pass. Raw baseline root C:/Users/Duongvh-pc/codex-test-evidence/sourced-world-baseline-20261006T033837Z retained unchanged.
Tester systemError usage limit interrupted formal report/release. Parent5f34c9 exit0 fresh read-only closure2026-10-06T05:47:22.4120077Z:33 known identities terminal, source398/dist423/case169 exact, original28/28/0 remains. Parent closure releases source for implementation; it is not the missing independent report or GREEN verification. Minimum context-forwarding patch is implemented; post-patch tests remain pending with SAME tester. No provider/media/native grant.

Build8ba915→568d4b và combined0a45e3→8a0017 exit0; test:typecheckfb5184 exit0; schemaebdfa1 exit0. GREEN step4 còn chờ. Publishing branch dạng implementation checkpoint không đóng Step6 acceptance hoặc main/product release.
