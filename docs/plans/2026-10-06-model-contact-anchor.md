# Model Contact Anchor Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho director mô tả điểm chạm đúng trên artwork của từng đồ vật, để diễn viên chạm thanh ghế, tay nắm, mép sách hoặc đạo cụ theo thiết kế.

**Architecture:** Khuyến nghị thêm `artDirection.models[].handleAnchor?: {x,y}` theo normalized coordinates0–1 của part viewport. `partAnchor` là authority duy nhất đổi điểm này ra stage pixels cho validator, controller và renderer. Absent field giữ nguyên fallback hiện hành; feature có cache identity chỉ trên shot chọn field mới.

**Tech Stack:** TypeScript/Zod, SVG/HTML/CSS/JavaScript, compiled rig/IK, HyperFrames, source/compiled unit and temporal integration checks.

## Global Constraints

- “Cho phép tự thiết kế silhouette, tóc, trang phục, màu, ánh sáng, chiều sâu, SVG, nhịp cảnh và bố cục. Giữ identity từng vai cùng các khóa đã duyệt.”
- “Tay nối vai–khuỷu–cổ tay, giữ chiều dài xương.”
- “Thao tác tiếp cận và contact trước phản ứng của vật.”
- “gesture.target/destination là điểm nắm, prop.origin/destination là tâm vật.”
- Không đổi narration, actor identity, clocks, bone length/tolerance, ownership, force/budget/locks hoặc accepted legacy caches. Không tự sửa raw native candidate.
- Parent triển khai/build; model độc lập test. Phim/test matrix toàn sản phẩm còn mở.

---

### Task 1: Điểm chạm riêng dùng chung hình học

**Files (đã đọc):**
- `packages/director/art-direction-schemas.ts`: typed optional handleAnchor; một schema finite/bounds/strict.
- `packages/host/controller.ts`: `partAnchor` dùng custom handle khi có; center/label giữ semantics hiện hành.
- `packages/director/art-direction.ts`: exported opt-in `MODEL_CONTACT_ANCHOR_VERSION`.
- `packages/scenes/index.ts`: conditional scene identity khi model có handleAnchor, không tăng toàn renderer.
- Proposed independent fixture: external `model-contact-anchor.test.ts`; existing transport/precision/art/lock tests giữ nguyên.

**Interfaces:**
- New optional model field `handleAnchor:{x:number,y:number}`, normalized part viewport, (0,0)=top-left/(1,1)=bottom-right. Cho phép điểm biên; không NaN/Infinity/extra fields/out-of-viewport. Đây là khuyến nghị contract hình học cho tính năng mới, không giới hạn bố cục hay style.
- Existing `partAnchor(shot, partId, 'center'|'handle'|'label', width, height): Anchor` giữ chữ ký. Custom handle world X=`width*(part.x+(anchor.x-.5)*part.width)`, Y=`height*(part.y+(anchor.y-.5)*part.height)`.
- Model viewport là bounding rectangle đang render, gồm aspect policy. Điểm khai báo không tự chứng minh chạm pixel artwork; review thật kiểm tính trực quan. Binding vẫn phải khớp gripOffset/scale/source/action/hand/contact và một owner.

- [ ] **Step 1: Relevant red** — independent fixture source/compiled cho ghế/top rail và prop/top grip, cả hai rig, primary/supporting fixed contact. Baseline phải chỉ ra current schema chưa nhận field hoặc shared target vẫn dùng fallback. Không dùng fixture này như phim model tự sinh.
- [ ] **Step 2: Minimum implementation** — schema field optional/strict; resolve custom handle qua đúng model.partId, validate bằng cùng schema; chỉ branch handle đổi. Giữ exact fallback formula cho absent field và không default thêm field. Renderer/controller callers hiện cùng dùng partAnchor nên không thêm constant/.35 authority thứ hai. Unknown part/model/source/projection và duplicates qua gate hiện hành; không bind model mới không có nguồn.
- [ ] **Step 3: Cache/locks** — scene identity thêm opt-in marker chỉ khi handleAnchor hiện diện; old shot scene keys/bytes giữ nguyên. Thay anchor làm scene stale và lock conflict theo contract hiện có; giữ audio/script/cast/budgets. Không đổi producer version toàn cục hoặc giả revalidation.
- [ ] **Step 4: Focused green** — identical test command/assertions; finite/boundary/invalid values, width/height/scale, normalized-stretch/model-viewport, controlMode none/renderer, origin/grip/placed center, wrong hand/source/clock/target/ownership, unreachable contact và event-before-contact vẫn reject. Default legacy source/compiled target + scene key parity.
- [ ] **Step 5: Affected integration** — independent public cinematic validation and actual temporal HTML/GSAP/browser evidence trên authored fixtures; compare target/rendered hand/model under camera and seek/reverse. Parent chạy build/typecheck, không browser/media tests. Source hash and all raw failures preserved.
- [ ] **Step 6: Publish** — sau report/release + fresh parent closeout, commit riêng `Add sourced artwork contact anchors`, schemas/docs/GitHub cùng snapshot. Native story continuation chỉ theo grant mới trong remaining/approved budget.

### Task 2: Guidance và diagnostic để model tự sửa đúng contact

**Files:**
- `packages/director/acting-brief.ts`: generation-only anchor/scale/clock contract.
- `packages/director/props.ts`: diagnostic nêu model/prop/origin/expected stage center/delta; giữ EPS predicate.
- `packages/explainer/storyboard.ts`: contact-driven event diagnostic nêu event type/target, global window và eligible actor/hand contact/action windows; giữ strict contactMs<event.startMs và covering action.endMs>=event.endMs.
- Proposed docs: `docs/plans/2026-10-06-model-contact-anchor.md`, relevant actor/design/production specs.

- [ ] **Step 1: Capture failures** — dùng raw native03: chairs expected(538.5,490) vs(570,420); Sam reach8.41px; candle reveal start38425 equals Sam contact38425 (must be strictly later). Không suy lỗi hiển thị từ definition chưa render.
- [ ] **Step 2: Generation contract** — chỉ instructions sau cache checks: free artwork/contact location, same shared resolve formula, grip=origin+gripOffset*scale, prop.center normalized-derived exact; posture/turn/walk must be reachable at every compiler sample around contact; event strictly after contact and within owner's action window. Không inject choreography/colors/cuts/machine topic.
- [ ] **Step 3: Diagnostics** — giữ predicates/tolerances, prefix tương thích và exact raw previous JSON; bổ sung received/expected fields cụ thể. Không sửa source quote/clock hoặc round-normalize invalid physics.
- [ ] **Step 4: Verify/publish** — independent outbound/rejected replay/accepted cache/negative checks + build/typecheck, ghi phạm vi và NOTRUN. Không gọi diagnostics PASS là film acceptance.

**Observable decisions:** optional additive field, legacy fallback giữ nguyên, malformed declared field fail rõ trước render; no automatic overwrite/anchor guessing/pixel hit claim. Chọn một custom handle theo model trong contract hiện hành; nhiều điểm/animated mesh/handoff là tính năng khác, không giả đã hỗ trợ. Những lựa chọn này là khuyến nghị triển khai theo scope thiết kế mở, không cần quyết định UI hay content mới từ người dùng.

File đang ở D/temp để không mutate C trong source-context baseline lease. Thực hiện inline; test thuộc agent độc lập. Task contact-anchor không cần chờ kết luận source-context để có giá trị, nhưng source edits phải tuần tự qua freeze/release.

## Implementation checkpoint2026-10-06
Optional handleAnchor, shared partAnchor resolution, opt-in scene identity, generation-only guidance and diagnostic fields are implemented. No physics/source/clock predicate or tolerance was relaxed. Existing cached narration/design request identity is preserved; only an opted-in scene includes the contact-anchor renderer marker. A handleAnchor is a declared viewport contact, not pixel-hit proof. Legacy renderer controls already use partAnchor; no second coordinate authority is introduced.
Independent relevant red/green, two-rig/contact/grip/security/cache/lock/temporal/browser checks remain NOTRUN because the SAME tester reached usage limit. The code/schema/readout changes are not a visual-quality claim or native-story acceptance. Parent build/typecheck is separate. Source-context16 independent RED remains pending identical-command GREEN. No new native/provider/TTS/render grant.
