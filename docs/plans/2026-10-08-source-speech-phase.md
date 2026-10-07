# Actor source speech phase Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A speaking actor retains the original activity envelope through camera/shot cuts and consecutive owned cues while other actors and true silence stay inactive.

**Architecture:** Keep persisted SpeechActivity/narration untouched. Add an explicit render-local source clock (owned source activity window retaining original timestamps and neighboring centers, complete-track hash, shot offset/span, owner and cue IDs), validate that it projects exactly to the existing local activity, and sample mouth shapes at source time. Derive full cue ownership from the supplied storyboard for canonical generation/cache/revalidation; standalone renderers without a board retain only explicitly supplied shot cues and label that scope. Bind repair publication to effective source identity and recheck disk board/narration before committing.

**Tech Stack:** TypeScript, Zod, existing SVG/GSAP compiler, scene identity/locks and schema exporter. No audio, browser or renderer execution by controller.

## Global Constraints

Characters are actors in arbitrary supplied stories. Preserve all words/order, WAV audio/clock, story→faithful script→video, legacy SRT, EN primary/VI/JA/KO and external-local TTS. Native source images/rig dimensions remain unchanged. Keep productionReady=false, productionRig=null and source/identity/voice/target/sync gates. One complete cue has one declared actor owner; never infer mixed-speaker word timing. Runtime tests/body evaluator/GSAP/browser/API/audio/MP4 are delegated to the user's model.

### Task 1: Explicit source-clock contract and ownership construction

**Files:** Proposed packages/animation/speech-clock.ts, packages/actors/speech-clock.ts, tests/source-speech-phase.test.ts; observed packages/actors/model.ts supplies actorSpeech unchanged.

**Interfaces:** SpeechSourceClock stores version, ownerId, scope (storyboard-cues/shot-cues/narration), cueIds, startMs/endMs and original owned SpeechActivity. actorShotSpeech produces the existing local activity plus source clock; narrationCueOwners builds one owner per cue across a board, with the current shot replacing its matching entry.

- [x] Declare NOT RUN cases for exact local projection/audio metadata, source boundaries vs clipped boundaries, complete ownership union/dedup/primary-supporting switches, conflicts and absent narration/unknown cues.
- [x] Add strict context schema and projection validation: positive ordered intervals, integer span/offset, matching method/window/hash, exact local projection and owner/span. Reject malformed or stale context; never modify persisted ActivitySchema or accept context as proof audio was verified.
- [x] Build actor-owned source windows from explicit cue IDs before clipping to shot. Full board joins only the same actor's cues; gaps/zero remain. Caller absence of board uses only current shot declarations and reports shot-cues scope, not complete ownership.

### Task 2: Compiler and canonical renderer

**Files:** Modify observed body-view-mouth.ts, compiler.ts, scene.ts, forest-body-art.ts, library/shots/cinematic.ts. Same proposed tests.

**Interfaces:** Optional sourceClock fifth parameter of samplePerformance; optional fifth parameter after namespace for compilePerformance; optional seventh parameter of performanceScene. Optional tenth parameter of renderCinematic supplies Storyboard. Existing callers without it retain their interface.

- [x] Sample the mouth on sourceClock.activity at timeMs+startMs; compile validates exact local projection and owner/span first. At a shot endpoint still sample actual source activity, avoiding a forced closing frame if this actor continues into the next shot.
- [x] Include source activity centers and attack/release/boundary events projected into the local sample/refinement grid; validate interpolation with the same context. Mouth remains audio-activity animation, never phonemes.
- [x] Use clock construction for both primary and supporting selected mouth profiles; retain all other renderer paths when bodySpeech absent and keep geometry-only sampling consistent. Report source phase version/hash/scope/offset and candidate status; bump mouth/body motion fingerprints for cache correctness.

### Task 3: Source identity, rebuild and handoff

**Files:** Modify observed packages/scenes/index.ts, packages/director/artwork-repair.ts and topic metadata/docs. Proposed docs/topics/SOURCE-SPEECH-PHASE-HANDOFF.md and review record.

**Interfaces:** Canonical scene calls receive the complete current board; saved canonical verification reads work/storyboard.json only for selected mouth actors. inputIdentity includes the relevant full cue ownership and narration/source-clock protocol; locked scenes reject stale inputs. Repair candidates replace current shot in the context without mutating another shot.

- [x] Carry the board through build/repair generation, source comparison and performance report publication. Use the same board/overridden current shot for all representations, no separate preview-only behavior.
- [x] Declare NOT RUN integration checks for whole-vs-split source mouth state, exact cut endpoint, speaker handoff and silence, canonical paired scene/report/resource/namespace, neighbor cue ownership/narration edits/cache/locks. Preserve old silent-candidate and legacy behavior cases.
- [x] Run build/core, test:typecheck, schemas and whitespace checks; expected exit0 supports source/types only. Delegate command: node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-speech-phase.test.ts tests/fixed-view-speech.test.ts; record actual NOT RUN/PASS/FAIL by that model.
- [x] Obtain bounded read-only source review, retain findings/fixes, publish explicit owned files to authorized branch. Record source limitations, test commands and server8851 startup.

## Decisions and completion limits

Recommended render-local context avoids widening persisted audio input and requires exact projection rather than trusting a flag. Full board is necessary to know neighboring cue owners; unknown owner cannot be inferred. Schema/context validates provenance consistency, not waveform authenticity or artistic acceptance. Cross-shot whole-body/head/cloth/expression continuity and native artwork/three-input video acceptance remain required under the full objective after this feature.

**Execution record:** source foundation `d8ce672d3fdbc8470ffc6779d4d8b92b847ade35` pushed/remote matched. Final full build, test:typecheck, schema export and whitespace checks exit0; source review PASS after three retained P2 fixes. All14 new callbacks NOT RUN; checked boxes mean authoring/source implementation and checks, not runtime/art/product acceptance. [Handoff](../topics/SOURCE-SPEECH-PHASE-HANDOFF.md), [review/fixes](../topics/reviews/source-speech-phase-source-review-v1.md). Full goal remains active.
