# Native view eye controls Implementation Plan

**Goal:** Give Lila/Karo's registered partner-facing views bounded pupil look and soft blink without moving/replacing their nose, mouth, hair, face outline, colours or costume. This is the next acting layer; full expressions/neutral mouths/continuous whole-body acting and three-input video acceptance remain part of the active product goal.

**Architecture:** Manually register each original PNG eye in native coordinates/hash/dimensions. Reuse the original raster glyph under a small eye clip; restore only its former bounded footprint with native skin samples and add an authored closed lid. Optional appearance.bodyEyes='registered-eyes-v1' selects the candidate, default native image remains intact. Compiler supplies head-local look direction and deterministic blink using source time where a source clock exists. Same schema/rig/compiler/canonical scene/cache/security and workbench paths; no preview-only replacement.

**Constraints:** Test runtime belongs to user's model: no callbacks/evaluator/GSAP/browser/API/audio/video by controller. Static SVG document assets/native PNG pixel measurements, source reads, build/typecheck/schema export are allowed. PNG bytes, rig physical proportions and speech/source clock stay unchanged; source identity is unapproved. No opposite-view mirror or whole-face warp. Preserve script verbatim/WAV original audio+clock/story→faithful script→video, SRT, EN primary/VI/JA/KO/external-local TTS and actors inside arbitrary stories. productionReady=false/productionRig=null/final gates remain.

## Native registration and asset authoring

**Files:** proposed packages/animation/body-view-eyes.ts; scripts/prehistoric-view-eyes-art.mjs; library/topics/prehistoric-life/body-views/eyes-registration-v1.json; docs/topics/reviews/native-view-eyes-art-v1.svg/png.

- [x] Measure native eye ink bounds/skin samples and bind exact source hashes/dimensions. Author four static comparisons to inspect source/blink/look and skin seams. These are document artwork, not animation frames or art approval.
- [x] Implement pure glyph/lid shape authoring, bounded head-local look, strict source/URL/profile binding and explicit candidate metadata. Native eye glyph and surface patch stay inside registered ROI; nose/brow/hair/face outline unaffected.

## Product source integration

**Files:** observed packages/host/schemas.ts, animation/body-view-art.ts/compiler.ts/forest-body-art.ts; actors/speech-clock.ts; library/shots/cinematic.ts; topics/body-workbench.ts; apps/server/index.ts; schema exports/topic docs.

- [x] Add optional eye appearance selection to shared host/actor contract. Default views stay unchanged; only selected eyes permit gaze, happy expression/fixed-view/locomotion guards retained. No claim of complete expression set.
- [x] Attach eye layers inside the existing uniform native head transform. Compiler uses inverse head rotation for look direction and original source offset for blink; context validates owner/span/projection even for a silent eye actor. Canonical source context/cache/repair binding covers selected eye actors as well as mouth actors.
- [x] Keep eye state/refinement/event grid/namespacing/security/report/source-comparison consistent. Bump relevant fingerprints; reports describe bounded directional pupil look with no head turning or exact optical/phoneme inference.
- [x] Add workbench/API explicit eyes selection plus gaze choice and labelled synthetic/inspection state. Links retain selections; source/default incompatible modes fail clearly. This page is not an episode/player or speaker verification.

## Verification and publication

**Files:** proposed tests/native-view-eyes.test.ts; docs/topics/NATIVE-VIEW-EYES-HANDOFF.md; reviews/native-view-eyes-source-review-v1.md.

- [x] Declare NOT RUN coverage for native bytes/ROI/resource binding/default gates, bounds/closed lid/random seeks, head-local gaze/source cut phase, compiler/refinement/report/namespace/security, silent/paired actor contexts/cache/repair binding, workbench/API/schema and unchanged production gates.
- [x] Run build/typecheck/schema export/whitespace source checks only; obtain bounded read-only source review and keep findings/fixes. No runtime or subjective approval claims.
- [x] Publish only owned source/docs/art/measurement files to authorized branch. Record exact SHA/evidence, test/server commands, and full-product work still remaining. Source/art checkpoint `e01bfdb112eab53344cd64a4bf83ea9f32e61131` pushed to origin/codex/prehistoric-life; remote hash matched. All ten new callbacks remain NOT RUN; the full product goal is active.
