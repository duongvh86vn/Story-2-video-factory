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

- [x] Author semantic standing/seated UV correspondences for both actors × both fixed native views. Source-only0.41: exact original image/atlas hashes,50-point common contour, pinned waist/upper torso and48/222/48/226 independently oriented texture pieces. Static alpha/geometry authoring rejects singular/flipped UVs; analytic area minimum is positive for neutral interpolation only. Actual support/cloth/body motion, seam/hem/cuffs and identity remain NOT RUN/unaccepted.
- [x] Source selection `bodySeat=registered-seated-v1` requires native locomotion; renderer/profile/compiler use existing physical support transfer/fixed source bones and matching facing in one complete shot. Separate head/eyes/mouth/hair selections remain; default/unselected art and turns/new grips retain guards. No sourceBody support ownership through camera cuts yet.
- [x] Author12 declarations in `tests/native-seat.test.ts` for contract/gates/registration/alias/UV/surface/interpolation/SVG/resources/namespace/fixed limbs/contact/seek/blockers/camera/workbench/security/cap. **All callbacks/fixtures NOT RUN**; final canonical subtitle/camera/primary swap tracer remains Task3/4. Left meshes222/226 may be costly or exceed existing2MB cap; user model must measure, implementation must optimize if needed rather than raise the cap. No motion/art/video acceptance.

Task2 source/artifact published `09a09f9d38021d01ba73b873ec2a253d15faea18`,36 owned paths, exact GitHub SHA matchb185b9 exit0. Fresh build/typecheck/schema/static inventories and diff checks exit0. Two bounded read-only source reviews found six actionable issues, addressed; no third independent verdict/runtime/media acceptance. No image edits/calls in Task2. Detailed handles and test/server instructions are in the native-seating handoff/record.

### Task 3: Original support clock through camera cuts

**Files:** Modify observed `packages/animation/schemas.ts`, `view-source-body.ts`, `view-acting-clock.ts`, `support.ts`, `compiler.ts`, `scene.ts`, `packages/actors/model.ts`, `packages/actors/view-acting-clock.ts`, `packages/director/camera.ts`, `library/shots/cinematic.ts`; proposed `tests/native-source-seat.test.ts`.

**Interfaces:** Extend complete `BodySourceSchema` with bounded supports; `sourceBodyPlan()` owns those support definitions. Sample body, occupancy, seat weights/contact, diagnostic/report/camera and shared scene seats using the same original relative time. Every explicit continuous camera slice repeats identical full source tracks.

- [x] Source-only0.42: bounded original supports/known IDs and ownership; sourceBodyPlan retains full definitions. Compiler uses original relative support time; stage occupancy projects/clips approach/hold/rise into the shot, same seat world geometry and exclusive actor use. Full identical run coverage/local conflict/facing/1500ms/fixed reach/hidden actor guards remain. Body/cloth/hair share original history; runtime continuity is NOT RUN/unaccepted.
- [x] Declare7 callbacks in `tests/native-source-seat.test.ts`: whole-run vs slices across preparation/held/rise/later walk for2 actors×2views×3scales; sibling/source/support changes; exclusive occupancy/geometry; camera/report/review/baked seeds; missing/hidden/cut/context/repair; single-actor large seat framing; canonical objectless two-actor/camp/5 camera slices with primary and cue ownership changes, assets/security/2MB/subtitle bounds. **Every fixture/callback/sampler/renderer NOT RUN here**. Real voice/frame/video/resume and budget/seek cost remain acceptance work for user's model.

Task3 source candidate uses seat surface2/support clock1/body compiler31, optional supports additive to body1 (old supported project contracts remain). Scene fallback, stage direction gate, camera support envelopes and all exported source schemas updated. Runtime acceptance and full factory are still pending; use the0.42 record/handoff for actual source review/check/publication evidence.

### Task 4: Canonical authoring and handoff

**Files:** Modify observed `packages/director/acting-brief.ts`, `packages/topics/body-workbench.ts`, `packages/topics/prehistoric-life.ts`, `apps/server/index.ts`, schema JSONs, `scripts/prehistoric-pack.ts` and topic MDs; proposed `docs/topics/NATIVE-SEATING-HANDOFF.md` and source-review record.

**Interfaces:** API/CLI/cast consume the shared optional appearance field and sourceBody supports. Diagnostic Studio exposes explicit seat selection and preserves it in links. Model brief describes physical seat/contact/ownership and actual unsupported angles instead of inventing motion.

- [x] Source delivery0.42: exact registered material/geometry/support fingerprints integrated in existing source/cache/repair/manifest and exported schemas. Final build/typecheck/static checks exit0 and28 owned paths published `90879b5d9bfb36451dfafe454818346a2742e04a`, exact GitHub match511309/834e7a exit0. Canonical scene/security/camera/role tracer declared; **actual frames/video/audio/resume, left mesh cost and scene cap NOT RUN/unaccepted**. These checks prove only source/static artifacts.
- [x] Two bounded read-only reviews by Schrodinger, then closed; camera fit/optional supporting array/top-level camera fixture addressed, stage relocation acknowledged. No third verdict or runtime PASS. No9router calls in this turn. Handoff/record have environment/test/server commands and full-product obligations; checked code remains unaccepted for production/video.

Plan tasks1–4 have source/artifact delivery, not acceptance of their motion or the full factory. Reusable tracer media export plus actual user-model tests and all acceptance requirements below remain open; **do not mark the full goal complete**.

## Acceptance still required

User's model must inspect actual normal-speed video and original references, not only compiler frames or artwork. Three complete inputs, EN primary/VI/JA/KO/external TTS, actual audio/subtitle/content/QC, accepted full turns/props/world, resume/rebuild and source fidelity remain requirements of the full product. Neither this plan nor an atlas proves them. No new product preference is unresolved; original identity, arbitrary-story scope, test delegation and final gates are already authorized.
