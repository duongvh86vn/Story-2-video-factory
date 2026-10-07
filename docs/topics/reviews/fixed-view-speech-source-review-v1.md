# Fixed-view mouth — bounded source review record

Historical0.30 record. The required source-phase follow-up is now implemented at0.31, with separate [review/fixes](source-speech-phase-source-review-v1.md) and [NOT RUN handoff](../SOURCE-SPEECH-PHASE-HANDOFF.md). Earlier PASS/findings and runtime status below remain preserved; implementation does not imply phase/audio/acting acceptance.

Base `cb13bcb0c33738f0a66f1f2b48443395278e6d82`, 08/10/2026. Scope: new mouth module, appearance schema, native head attachment, compiler envelope/paths/report/gates, body/head versions/fingerprints, workbench/server mouth selection and canonical per-actor activity routing. No production rig approval or full-product completion.

Foundation source published as `6b3cf00179878c45e137af7ba300b6ba4c78708b`; remote SHA matched. Controller source reading records one pending behavior limitation outside the initial per-shot scope: activity is clipped to the shot before envelope evaluation, so a continuing sentence restarts attack/release at scene boundaries. This must be handled with preserved source/owned phase and delegated coverage; source PASS below is not continuous-speech acceptance.

## Independent review

Reviewer Hilbert (`01a11712-4d23-7202-800c-1918d2b3d2ba`) returned **PASS, no actionable P1/P2 found** on the uncommitted subset. Read-only source; no commands, callbacks, body evaluator, browser/API, audio or renderer executed by reviewer.

Evidence retained: default speech rejection; explicit actor/view/current compiler selection; native hash/resource/local use binding; namespace and workbench clip preservation; source-window gap/zero envelope; paths participate in refinement; primary/supporting filters in cinematic.ts42/60; body/head20/13 fingerprint propagation; approval/productionfalse and audio-unverified report. The four findings from [partner-view review](partner-facing-views-source-review-v1.md) remain resolved, not discarded by this PASS.

No newly verified source findings. After review, controller clarified report clock wording to say supplied shot-local windows with actor ownership validated upstream, updated topic/workbench descriptions and tightened direct sampler method/window/integer interval guards. These additive checks preserve valid narration/animation behavior; fractional sampling clocks remain supported. A focused follow-up source review is recorded below.

Focused follow-up at `6b3cf00` returned **HOLD, one P2**: the new canonical test replaces performance root/facing and camera but retains the fixture's old continuity and shot.camera/host actions. Source read confirmed director/index.ts228/233 rejects it before mouth assertions. The test now synchronizes entry/exit/facing/carriedProps, both camera representations and idle actions of both actors to the new scene; no production renderer change. NOT RUN status stays explicit; focused re-review result follows after confirmation. No additional source P1/P2 in stricter guards or report text. The pending shot-envelope phase limitation is retained separately from per-shot source PASS.

First fixture P2 resolved by `6433243`, fresh test:typecheck exit0. Focused review retained that resolution and found a second adjacent P2: ground/root650 puts the feet below camera safe bottom576 (camera.ts196), rejecting the fixture before mouth assertions. Both authored test roots/ground now540, retaining camera scale/anchor and all production constraints. No runtime assertion/evaluator was executed; this is coherent fixture authoring from the source formula. Re-review result recorded after confirmation.

Focused re-review returned **PASS**: feet at540 project to511.2 and retain safe padding under576; metadata/action/camera fix remains resolved. Both P2s are kept above. Controller additionally shifted inherited visualization event clocks by the same shot offset: cinematic.ts110 subtracts shot.startMs, so inherited absolute event windows must move with the test shot. This changes fixture authoring only, never production narration/clock.

Final two-line clock follow-up returned **PASS**, preserving prior PASS and both resolved P2s. `d6bc260c9b104cdcaad0999695166db70cbfa599` contains camera-safe roots and event-clock fix; final test:typecheck exit0, whitespace exit0, push/remote SHA matched. No new runtime or approval evidence. Next required behavior work is preserved source-envelope phase across shots, followed by remaining native acting/art and full-input acceptance.

## Controller evidence

- Core build exit0.
- First test:typecheck exit1: one negative test plan widened compilerVersion to string; changed annotation to PerformancePlan.
- Repeat test:typecheck exit0. No callback was executed.
- Full build exit0 (TypeScript core, Studio typecheck, Vite bundle).
- Schema export exit0. HostProfile/Shot/Storyboard exports include the explicit mouth choice in host or nested cast appearance; ActorDefinition reuses the host appearance schema.
- Follow-up core build and test:typecheck exit0 after the additive direct-clock guard and descriptive report/context changes. No callbacks executed.
- Native PNG reads/hash/dimensions and static SVG asset authoring completed; final figure inspected. Mouth SVG/PNG is a document asset, not a body pose or video render.
- Whitespace check exit0; final publication SHA to be recorded in handoff after source commit.

11 new runtime callbacks **NOT RUN**. No fresh audio, MP4, animation/pose playback, API or model acceptance was executed. Artistic fit, phoneme timing, dialogue sync, continuous motion and full three-input readiness remain unapproved. `productionReady=false`, `productionRig=null`.
