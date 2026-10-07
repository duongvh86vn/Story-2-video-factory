# Source speech phase — bounded source review record

Base `616aac5171420ed15602f89d4500a2bb8fe635ed`, 08/10/2026; current source0.31/body compiler21/mouth protocol2. Scope: new render-local clock/projection/windowing, whole-cue ownership union, compiler endpoint/refinement, canonical primary/supporting/report paths, cache/source-comparison/locks and repair acceptance. Native artwork/source PNGs and persisted ActivitySchema unchanged. Full product goal remains active; productionfalse/rig null.

## Findings retained

Reviewer Hilbert `01a11712-4d23-7202-800c-1918d2b3d2ba`, read-only source, no callbacks/evaluator/browser/API/model/audio/video. Prior0.30 reviews/resolved findings remain in their historical [record](fixed-view-speech-source-review-v1.md).

1. **Initial HOLD, one P2 — nonlocal repair ownership race.** Rendering/cache/report used `options.board`, while `persistCinematicArtworkRepair` reread disk and checked only the repaired shot. A sibling owner edit could publish source from an old envelope with a new board and validated record. Confirmed by source. Added effective ownership/narration binding passed from canonical compile to acceptance; compare after substituting candidate, before validation/staging. Added final disk-board hash/current narration check before publication. Existing scene/metadata transaction retained. Reviewer focused follow-up confirmed **resolved at source level**, no new production P1/P2 in that fix. Runtime concurrent edit/rollback/resume evidence remains NOT RUN.
2. **Focused HOLD, P2 — stale canonical fixture shot ID.** New fixture IDs left `cinematic.shotId='ch1.s001'`, rejected by director validation before mouth assertions. Both canonical and disk fixtures now set `c.shotId=s.id`; profile/performance binding still uses bindActorShot. Camera-safe roots540, matching camera/action/continuity metadata retained.
3. **Same focused HOLD, P2 — disk regression false rejection.** Handwritten narration vs schema-parsed narration changed property insertion order; plain JSON.stringify hash rejected without a sibling edit. Normalize test narration with NarrationSchema. Disk regression now writes/reads the unchanged board/narration through actual schemas, verifies matching binding as positive control, then edits the sibling and asserts rejection/bundle preservation. Public rigSpeechInputIdentity also canonicalizes narration via NarrationSchema before hashing; cue/word order and actual content/clock edits are preserved.

Final focused source re-review returned **PASS — all three P2s resolved at source level, no new P1/P2 in this follow-up**. Publication binding/rechecks, both shot IDs and schema-normalized narration/read-back positive control were checked by source reads. All14 callbacks remain NOT RUN. No finding is erased by this PASS; source review is not clock/audio/art/acting acceptance.

## Controller checks

- Core build exit0 before the publication binding addition; not claimed as final verification.
- First `test:typecheck` exit1: optional mouth opacity and rig/sprite union actor report narrowing in new declarations. Corrected explicit known mouth values and report discrimination; subsequent typechecks exit0. No assertions ran.
- Schema export exit0: new `speech-source-clock.schema.json`; persisted `speech-activity.schema.json` unchanged. Schema is shape documentation; dynamic ordered intervals/projection/owner/span guards remain runtime authority.
- Full build exit0 after publication guard/14 declarations; Node TypeScript core, Studio typecheck and Vite bundle (32 modules). Follow-up full build and test:typecheck after narration/fixture fixes and topic0.31: both exit0. Vite32 modules,563ms, JS174.53kB/gzip52.43kB; this is the Studio bundle, not scene code-size/playback performance.
- `git diff --check` exit0 before final document/source publication; CRLF-to-LF informational warnings only. Repeat at final publication.

**14 new callbacks NOT RUN** in `tests/source-speech-phase.test.ts`. Other legacy/fixed-view suites remain at their previous recorded status. Controller/reviewer did not run tests, render/play a body frame, browser/GSAP, pipeline, voice, API or MP4. Resource/namespace/halo/seek/cut/speaker regression declarations are authored evidence of coverage intent, not proof of runtime behavior. Hash/context cannot prove waveform ownership or lip-sync. Full test commands/environment/server/remaining product scope: [handoff](../SOURCE-SPEECH-PHASE-HANDOFF.md).
