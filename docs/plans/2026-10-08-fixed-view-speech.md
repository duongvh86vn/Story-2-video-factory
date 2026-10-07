# Fixed-view actor speech Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lila/Karo can perform supplied dialogue in their independently authored left/right views using a registered mouth layer driven by the original audio activity.

**Architecture:** Keep native PNGs and whole head registration unchanged; author mouth-only SVG artwork in each PNG's native coordinates, selected by exact actor/view/source hash. An explicit optional bodySpeech profile field activates the candidate; legacy silent views keep their current guard. The shared sampler supplies pure random-access audio envelope and mouth paths to the existing GSAP compiler/canonical renderer, retaining actor-owned cue activity.

**Tech Stack:** TypeScript, native SVG/HTML5, GSAP, existing Sharp for read-only pixel measurements and static document figures, Zod and project build/schema tools.

## Global Constraints

- Characters are actors inside any user story. Preserve script words, WAV narration/clock, faithful story→script, legacy SRT and EN/VI/JA/KO/external-local TTS scope.
- Native image bytes, eyes, nose, hair, beard outline and all geometry outside a bounded mouth region stay unchanged. Do not mirror direction or scale the whole face to animate speech. Registration and mouth art remain engineering candidates, not approval.
- productionReady=false, productionRig=null and all final identity/voice/target/sync gates stay closed. Continuous turns/gaze/locomotion and unsupported expressions/tools stay blocked.
- Controller authors assets/code and runs build/typecheck/schema export plus read-only source review. Runtime callbacks/body evaluator/GSAP/browser/API/audio/render/MP4 remain delegated to the user's model; red/green runtime steps below are NOT RUN by controller under that instruction.

## Settled decisions and recommendations

Explicit optional `appearance.bodySpeech='registered-mouth-v1'` is the recommended candidate selection, valid only for forest-body-view-1 with actor/view. It does not select a provider or mark artwork approved. Missing option preserves rejection of authored-view activity; unsupported combinations throw a needs-view-voice-animation error. Mouth follows existing audio-activity or labelled segment-draft, never phonemes; audio/cue clocks are unchanged. At a zero/gap/boundary level the original native happy image is visible exactly. Mouth authoring uses per-view corners/ROI measured from the actual image; Lila gets a mouth-only skin-strip restoration and aperture, Karo retains his native outer lip/beard while internal teeth/tongue move. These are candidate artistic choices to be reviewed through static figures and delegated video, not requirements imposed on future artwork.

## Task 1: Native mouth artwork and pure audio envelope

**Files:** Create proposed packages/animation/body-view-mouth.ts, scripts/prehistoric-view-mouth-art.mjs, library/topics/prehistoric-life/body-views/mouth-registration-v1.json and static figures under docs/topics/reviews/. Test proposed tests/fixed-view-speech.test.ts.

**Interfaces:** Consumes appearance actor/bodyView/bodySpeech and exact PNG hash, SpeechActivity plus millisecond clock. Produces bodyViewMouthSvg(profile,{sha256,width,height,url}), sampleBodyViewMouth(profile,activity,timeMs), bodyViewMouthDescription and hasBodyViewSpeech(profile). Returns mouth paths/opacity with no whole-head or eye/nose transforms.

- [x] Add NOT RUN declarations for four view mappings, exact native ROI/resource/namespace, silent/gap/zero/left-closed-right-open boundaries, attack/release within source activity, adjacent activity and random seek, invalid/unsupported profile/hash.
- [x] Author manual regions from original native PNG row/colour readings; save evidence with hashes. No raster editing. Create static native-SVG rest/partial/open document figures with pure mouth geometry inputs, no activity/body evaluator or movie.
- [x] Implement bounded attack/release envelope in positive activity only; interpolate adjacent sample levels without bridging a source gap or zero-level interval. No timers, accumulated playback state, changed cue clocks or fabricated phoneme IDs.
- [x] Implement stable-topology two-cubic paths in the canonical validator's supported syntax. Clip all visible morph artwork to the native mouth ROI; restore native image when activity is absent/zero. Runtime validator assertions remain NOT RUN.

## Task 2: Explicit profile and canonical rig/compiler integration

**Files:** Modify observed packages/host/schemas.ts, packages/animation/body-view-art.ts, packages/animation/compiler.ts, packages/animation/forest-body-art.ts and packages/topics/prehistoric-life.ts. Same proposed test file.

**Interfaces:** Optional appearance bodySpeech activates registered mouth layer; FrameState.paths carries mouth geometry, face carries bounded mouth layer opacity. Existing actorSpeech slices original owned narration; existing compilePerformance emits literal GSAP calls and stages the same hash-bound PNG assets. Report adds candidate mouth version/fingerprint and synchronization level with phonemeLipSync=false.

- [x] Preserve old profile/view/render/audio behavior when selection absent. Enforce current compiler13/14/15 for the opted-in mouth candidate; other fixed-view restrictions remain intact.
- [x] Include mouth registration/version in head/body fingerprint and bump renderer/compiler versions where behavior changes; narration context remains version1. Do not change the static library manifest snapshot into an acceptance report.
- [x] Add audio envelope/opacity boundaries to compiler sample/refinement as needed. Mouth-layer opacity fades continuously inside activity and is zero in source gaps; coordinate morphs use existing paths interpolation validation, no callbacks/timer or leaking closure into the next cue.
- [x] Add NOT RUN declarations for opted-in activity, legacy rejection, supporting/primary cue ownership, fixed view/face invariants, canonical resources/seek/boundary behavior, cache/report metadata and no production gate opening.

## Task 3: Workbench, review and handoff

**Files:** Modify observed packages/topics/body-workbench.ts and server body query/form caller. Create proposed docs/topics/FIXED-VIEW-SPEECH-HANDOFF.md and reviews/fixed-view-speech-source-review-v1.md; update topic MD current checkpoint while preserving history.

**Interfaces:** Explicit workbench mouth choice shows the registered layer; a labelled synthetic activity preview may be selected by the test model, never described as real voice/audio proof. Source registration and rest/open document figures remain available without running production.

- [x] Expose mouth selection in workbench/profile hash and preserve it in links. Show missing/unsupported view/colour/gaze/voice combinations clearly; do not silently substitute source/right artwork.
- [x] Run npm run build, npm run test:typecheck, npm run schemas and git diff --check; expected exit0 verifies source/types/schema only. Runtime model command: node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/fixed-view-speech.test.ts; expected cases defined above, actual PASS/FAIL/NOT RUN must be recorded by that model.
- [x] Commit independently reviewable source, obtain bounded read-only review, fix verified findings and repeat only affected source checks/re-review. Publish exact commits/figures/remaining limitations and server8851 startup to GitHub branch.

## Checkpoint evidence

Source `6b3cf00` and test fixture fixes `6433243`/`d6bc260` are pushed/remote-verified; fresh test:typecheck exit0, eleven callbacks remain NOT RUN. Core/full build and schema export exit0. Initial read-only source review PASS; additive reviews found two P2 fixture-metadata/camera mismatches, both corrected and retained as resolved; final focused re-reviews PASS. Checked boxes record source/asset/declaration implementation and source commands only, never art/audio/motion/video acceptance. Exact findings/evidence and server8851 commands are in FIXED-VIEW-SPEECH-HANDOFF.md.

## Remaining decisions and full completion

Art/pose/expression/native mouth acceptance and real-video sync/smoothness remain unresolved until concrete review/test evidence. Source reading also identifies shot-local clipping as a mouth phase limitation: the envelope currently restarts at a clipped shot boundary; preserve original owned activity phase across shots in a follow-up before speech/motion acceptance. No additional product preference is required to implement this explicit candidate. This feature alone does not finish continuous turning/locomotion, cloth/hair follow, props/contact/handoff, world art or the complete three-input video pipeline; keep the full objective active.
