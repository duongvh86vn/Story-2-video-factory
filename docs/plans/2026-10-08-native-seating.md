# Native seated acting Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let native Lila/Karo sit on a physical support, listen/talk, rise and continue moving without losing their costume, contact or original action clock.

**Architecture:** Bind separately authored seated folds to each native actor/view and the existing primary identity. Standing and seated textures share one opaque semantic surface; folds blend inside its contour, not two exterior silhouettes. Complete sourceBody support/posture tracks keep the physical clock through canonical camera and actor-role changes.

**Tech Stack:** TypeScript/Zod, SVG affine texture meshes, existing support/IK/source clocks, HTML5/GSAP; built-in imagegen for bitmap fold materials.

## Global Constraints

From `docs/topics/CUOC-SONG-THOI-TIEN-SU.md`: "Xương có chiều dài ổn định"; "Chân trụ bám nền và bước chân có điểm đặt rõ"; "Màu da/tóc/trang phục có màu gốc ổn định"; "Hai tay phân công rõ nếu dùng hai tay". Keep the original warm-skin Lila/Karo primary references, single Lila skirt and two outlined Karo shorts legs. Actors perform the user's events; no fixed host or food/hunting/mechanism plot.

User's test delegation overrides skill red/green execution steps: author meaningful declarations but **do not execute** tests, callbacks, fixtures, samplers, renderer/browser/API pipelines or media. Build/typecheck/schema export and static asset hash/metadata/inspection are permitted. Never infer runtime PASS. `productionReady=false`/`productionRig=null` and art/identity/voice/target/sync/final gates remain until real acceptance.

Previous turn was progress:0.39 source `91207f9bc0c5bd53d951ab9a98d6988f1d0bd27f`, docs `6767b1287dea6a27e8258e5ab61b2eb71cb4a282`, both exact remote matches.23 new callbacks remain NOT RUN. Full factory goal remains active and unfinished. Durable criteria/evidence live outside Git at `C:/Users/Duongvh-pc/.codex/tmp/story-factory-native-seat-state.json`.

Task1 source/artifact snapshot published as `42f409c9136a43fc891a90df2f9469118c020470`,21 owned files; push7ceae1 exit0 and exact local/remote verificationd69679 exit0. Source build/types/schema/static inventories passed;8 callbacks and independent visual/runtime review remain NOT RUN. Tasks2–4 remain open; no native seated scene or factory completion implied.

---

### Task 1: Native fold materials and immutable registration

**Files:** Create `library/topics/prehistoric-life/native-seat-v1/lila-seated-folds-v1.png`, `karo-seated-folds-v1.png` and their prompt/metadata sidecars; proposed `packages/topics/native-seat-art.ts`, `scripts/native-seat-inventory.ts`, `tests/native-seat-art.test.ts`; modify observed `scripts/prehistoric-pack.ts` and topic manifest metadata.

**Interfaces:** Consumes primary full references, each actor's two registered native standing PNGs, and legacy seated fold image as construction reference. Produces exact file/hash/width/height/alpha and two independent view tiles, statuses candidate/unregistered/unapproved, no production rig.

- [x] Generate one transparent two-view atlas per actor with built-in imagegen, saving prompt and source image hashes. Left tile faces screen right; right tile faces screen left. No body/head/arms/legs/background/text or belt redesign. Lila is one continuous skirt; Karo has two distinct cuff openings. No code mirrors an atlas or re-edits originals. Parent inspected actual outputs; independent colour/perspective/identity review remains pending, no correction call or approval.
- [x] Register static tile bounds against actual alpha>=8 pixels; preserve alpha and bytes. Both atlases have clear margins. Most painted pixels are alpha250–254, so the planned shared garment surface must remain opaque beneath texture. File presence and measured tile bounds are not pose/UV registration or approval.
- [x] Author8 metadata declarations for independent actor/view ownership, exact hashes, alpha, reject/eligibility state and inventory failure on altered files. Runtime command for user's model: `node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-seat-art.test.ts`; expected all declared metadata/inventory cases pass on delivered SHA; **all8 NOT RUN here**. Static metadata inventory itself ran under the permitted source/artifact scope.

### Task 2: Registered continuous cloth surface

**Files:** Proposed `packages/animation/body-view-seat.ts`, `library/topics/prehistoric-life/native-seat-v1/correspondence-v1.json`, `tests/native-seat.test.ts`; modify observed `body-view-art.ts`, `forest-body-art.ts`, `forest-head-art.ts`, `compiler.ts`, `packages/host/schemas.ts`.

**Interfaces:** Consumes native standing registration, Task1 tiles and original physical seat/body state. Produces `appearance.bodySeat='registered-seated-v1'`, `nativeSeatSvg(profile,source,imageUrl)` and `nativeSeatState(profile,source,{progress,thighAngles})` with common contour/material transforms and interpolation/bounds evidence.

- [ ] Author semantic standing/seated UV correspondences for both actors × both fixed native views. Bind each original image hash and seat atlas hash; pin the waist and upper torso. Surface contour follows actual support transfer. Reuse finite affine/positive-area geometry, retain a bounded common material blend and one exterior ink owner. Missing/singular/inverted mappings must fail `needs-view-seat`; no rigid whole-dress rotation, transparent exterior crossfade or borrowed mirror pose.
- [ ] Select seat only with registered native locomotion; preserve source head/eyes/mouth/hair and unselected artwork. Native seat follows the actual support facing, bones/sole offsets and garment scale. Keep native turns/new tool grips separately unsupported.
- [ ] Declare rest/transition/held/rise/walk, both view/actor, pinned belt/cuff/skirt, fixed limbs/contact, random/reverse seek, matrix/contour interpolation, namespace/resource/security/2MB cap and camera/subtitle cases. User model runs `tests/native-seat.test.ts` after source delivery; no implementation execution or motion approval.

### Task 3: Original support clock through camera cuts

**Files:** Modify observed `packages/animation/schemas.ts`, `view-source-body.ts`, `view-acting-clock.ts`, `support.ts`, `compiler.ts`, `scene.ts`, `packages/actors/model.ts`, `packages/actors/view-acting-clock.ts`, `packages/director/camera.ts`, `library/shots/cinematic.ts`; proposed `tests/native-source-seat.test.ts`.

**Interfaces:** Extend complete `BodySourceSchema` with bounded supports; `sourceBodyPlan()` owns those support definitions. Sample body, occupancy, seat weights/contact, diagnostic/report/camera and shared scene seats using the same original relative time. Every explicit continuous camera slice repeats identical full source tracks.

- [ ] Reject duplicate/missing supports, geometry/facing changes, seated-without-support, local/source conflicts and incomplete source coverage. Preserve existing1500ms source sit/rise transition and fixed reach guards. Reserve occupancy during approach/hold/rise and reject overlapping different actors on the same seat. Continuous camera and primary/supporting swaps do not reset foot preparation, hip contact, pose, cloth or hair lag.
- [ ] Declare whole-run vs camera slices equivalence across preparation/held/rise/later walk, both actors/views and scale, sibling/source/support edit invalidation, same seat vs conflicting geometry and occupancy, camera/world/subtitle bounds, scene assets and cache/repair bindings. User model executes original body/secondary/seat suites together; **NOT RUN here**.

### Task 4: Canonical authoring and handoff

**Files:** Modify observed `packages/director/acting-brief.ts`, `packages/topics/body-workbench.ts`, `packages/topics/prehistoric-life.ts`, `apps/server/index.ts`, schema JSONs, `scripts/prehistoric-pack.ts` and topic MDs; proposed `docs/topics/NATIVE-SEATING-HANDOFF.md` and source-review record.

**Interfaces:** API/CLI/cast consume the shared optional appearance field and sourceBody supports. Diagnostic Studio exposes explicit seat selection and preserves it in links. Model brief describes physical seat/contact/ownership and actual unsupported angles instead of inventing motion.

- [ ] Integrate exact registered pose hashes/fingerprints into source/cache/repair/manifest; default/approved assets remain explicit. Task1 adds material-only manifest/context/schema records; profile/renderer/body/source-clock integration remains Task2/3. Export schemas; run `npm run build`, `npm run test:typecheck`, `npm run schemas`, metadata inventory and `git diff --check`; these prove only source/static artifacts.
- [ ] Seek bounded read-only source advice under existing9router authorization if available; record unavailable/quota/timeout as no verdict, never PASS. Publish only owned paths to `codex/prehistoric-life`, verify exact GitHub SHA, deliver test/server/environment commands and all remaining full-product obligations.

## Acceptance still required

User's model must inspect actual normal-speed video and original references, not only compiler frames or artwork. Three complete inputs, EN primary/VI/JA/KO/external TTS, actual audio/subtitle/content/QC, accepted full turns/props/world, resume/rebuild and source fidelity remain requirements of the full product. Neither this plan nor an atlas proves them. No new product preference is unresolved; original identity, arbitrary-story scope, test delegation and final gates are already authorized.
