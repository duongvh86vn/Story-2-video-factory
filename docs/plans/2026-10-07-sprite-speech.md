# Sprite speech — preserve source face pixels and use the narration clock

**Goal:** Let story actors speak with registered mouth artwork and the real narration activity, without moving inferred eye/nose glyphs or changing their original identity. This is part of the script / WAV / story→script product, not a fixed presenter feature.

**Architecture:** A candidate speech variant is an immutable alternate PNG for one exact native motion version. It shares the entire frame layout, anchors, view and timing. Every frame has an explicit mouth rectangle; decoded pixels outside it must match the native frame, and registered eyes/nose must lie outside. Frame artwork is switched between rest/open on the existing paused GSAP timeline, using source cue ownership and speech activity. This is binary activity synchronization, not phoneme lip-sync or accepted acting.

**Tech stack:** Existing TypeScript/Zod/Sharp, immutable local PNG storage, narration/speech activity contracts and literal GSAP compiler. No new dependency or provider generation call is necessary for this source implementation.

## Constraints

- Original Lila/Karo face/hair/costume/ink and saturated colour remain authoritative. Regions and landmarks are author registrations, not automatic anatomy proof. Review remains necessary.
- No source PNG modification, no inferred crop, mirroring, time fitting, mouth glyph drawing or narration rewrite. Imported variants are separate candidate versions.
- No runtime assertions, fixtures, browser/API/CLI/render/MP4/model/TTS/ASR tests in implementation. Prepare tests and commands; build/typecheck/schema export/source inspection are allowed. User delegates runtime acceptance to another model.
- Keep `productionReady=false`/`productionRig=null` and current candidate final gates. Do not unlock final because import, pixel equality or build passes.
- Work only in the managed worktree. Do not edit the protected D: checkout or unrelated art.
- Review service was unavailable during catalog phase. Do not repeat its calls without new evidence; record pending independent review in candidate handoff, never a clean verdict.

## Task 1 — registered immutable speech artwork

- Extract the existing bounded file/PNG/immutable-write helpers without changing motion behavior or fingerprints.
- Add `actor-speech-registration-1` / `actor-speech-1` schemas and importer/loader/list. Bind variant to exact native motion/version/actor/view/reference hash and preserve PNG bytes. JSON <=2 MiB, PNG <=16 MiB/64 Mpx, <=512 frames; cap frame comparisons.
- Check mouth rectangle inside the registered face and containing mouth centre; protect visible eye/brow/nose landmarks. Require actual variant differences in each frame, with unchanged RGBA outside each mouth region. Reject back views without visible face registration. These are technical checks, not art acceptance.
- Prepare meaningful corruption/identity/region/pixel/path/immutability cases and export schemas. No test callbacks executed.

## Task 2 — common speech clock and compiler

- Build an owned, bounded schedule from original narration cues plus global speech activity, clipped to the actor slot. Unknown/duplicate cues, invalid activity clock or absent RMS hash fail. Silence closes mouth; neighbouring positive windows merge; no source cue rewrite or invented duration.
- Sample arbitrary seek deterministically on the shared 0.0001 ms clock. Report `audio-activity` or `segment-draft`, never phoneme sync; segment drafts remain visibly labelled.
- Extend the player with an optional verified speech context: both full-frame artworks share one native pose clock/anchor. Literal opacity sets select rest/open inside the active frame, with event cap included. Existing callers/output remain unchanged without context.
- Prepare seek/native-boundary/silence/cue/rate/legacy/security cases, NOT RUN.

## Task 3 — stage/story/canonical integration

- Actor-owned speech bindings reference exact variant/version and original cue IDs. Stage and story validation require correct cast, cue ownership, source refs, visible slot coverage and matching native motion. Add actual speech coverage instead of relabelling a body gesture as dialogue.
- Verified sources, staging/allowlist, canonical renderer, review/source comparison and input identity must consume the same variants/activity. Retain art, props, continuous-contact/handoff and final acceptance blockers.
- Catalog/Director must see verified available speech versions; Studio/API/CLI must expose import/list/preview and explicit linkage. Unsupported/missing speech stays a blocker, with no rig fallback.

## Task 4 — handoff and full product continuation

- Fresh build/typecheck/schema export/diff checks and bounded source review when available; preserve findings and review limits.
- Publish candidate working branch with exact commit/test commands and explicit NOT RUN/pending status. No merge or production acceptance inferred.
- Complete actual source-faithful motion/face views, speech artwork, props/contact/handoff and art/motion receipts; then delegate end-to-end script/WAV/story video acceptance in EN/VI/JA/KO. The goal remains the usable full tool, not this source milestone.

## Source checkpoint `a6b62fa`

Tasks 1–2 written and checked by build/typecheck/schema export only. CLI `speech-import`/`speech-list` and strict API import/list/verified sheet have source; no Studio speech form/preview yet. 22 declarations prepared, NOT RUN. The existing native player branch without speech context remains; immutable file helpers were extracted without intended behavior/fingerprint changes, with regression commands delegated. Independent bounded review dispatched, verdict pending.

Review returned two Important issues: coordinator dependency in local import and skipped compound facial landmark names. Fixed at `59af28e`, now 24 declarations NOT RUN. Fresh build/typecheck/schema export exit 0; focused re-review confirmed both resolved and no new Critical/Important in the fixes. Preserve first verdict/findings in the accumulator; no runtime acceptance inferred.

At this foundation checkpoint, Task 3 was still required. The next checkpoint below records its source implementation; the foundation review does not extend to that newer code. [Handoff](../topics/SPRITE-SPEECH-TEST-HANDOFF.md) and [foundation accumulator](../topics/reviews/sprite-speech-source-review-v1.md) preserve the original scope and findings.

## Canonical source checkpoint `3d9aab1`

Task 3 now has source: exact native-linked mouth variants and original cue IDs in stage clips, unique actor ownership, original quote evidence, and complete visible coverage of each actor-owned clipped cue. Adjacent motion clips can cover one original cue; native once/hide cannot leave a gap, even during silence. The compiler builds schedules from original narration and speech activity on the shared timeline. Models do not supply replacement audio clocks or mouth schedules.

Canonical rendering, verified source loading/staging, resource allowlists, source comparison, geometry provenance, cache/lock inputs, catalog/Director and Studio selection consume the same versions. Studio has separate import and library forms plus a rest/open diagnostic preview; CLI/API expose the same verified variant. The diagnostic preview has no audio and is not evidence of voice synchronization. No-speech paths retain their existing contract and intended output; regression remains delegated.

Fresh `npm run build`, `npm run test:typecheck`, `npm run schemas` exit 0; `git diff --check` clean. An initial test:typecheck failed on union report access in new declarations and was corrected with type narrowing before the successful check. Initial integration had 41 declarations NOT RUN (17 added). Independent read-only review of `97a7c13..3d9aab1` found one Important diagnostic-preview budget issue: a valid 512-frame looping motion with mouth artwork exceeded the compiler cap when previewed for two cycles.

Fix `818b036` makes mouth diagnostics one native cycle (loops capped at 120 seconds), preserving native-only two-cycle output and the 6000-event compiler cap. Added one boundary declaration, now **42 NOT RUN:** importer 10, clock/player 10, API 5, stage 11, integration 6. Fresh full build/test:typecheck exit 0 and diff check clean after the fix; schemas did not change. No callbacks, fixtures or runtime tests ran. Focused re-review confirms the original Important resolved and no new Critical/Important/Minor in the fix; the [integration accumulator](../topics/reviews/sprite-speech-integration-source-review-v1.md) retains the initial finding and source-only scope.

Task 4 remains product work: actual source-faithful Lila/Karo views, motion and mouth artwork; gaze/expressions, grips/props/contact/handoff; approval receipts; and full script/WAV/story video acceptance with real voices in EN/VI/JA/KO. One original cue currently has one declared actor owner. Multiple dialogue turns inside one cue require exact subcue/word timing and ownership before support; do not silently rewrite narration or invent timestamps. Keep candidate final gates, `productionReady=false` and `productionRig=null`. This source milestone is not a completed or accepted video pipeline.
