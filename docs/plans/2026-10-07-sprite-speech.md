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

Task 3 remains required: original actor-owned cue/variant bindings and visible coverage in stage/story, canonical staging/allowlist/render/review/cache/locks and Director/catalog/Studio. Existing speech/final gates were not removed. No actual mouth or motion artwork accepted; the full script/WAV/story video goal remains active. [Handoff](../topics/SPRITE-SPEECH-TEST-HANDOFF.md) and [accumulator](../topics/reviews/sprite-speech-source-review-v1.md) preserve scope and remaining work.
