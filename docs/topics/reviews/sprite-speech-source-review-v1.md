# Sprite speech foundation — source review accumulator

Range `e2b040e94546aa56cc2732dd0431f7f0345af02f..a6b62fa7dda49c139ff6868fb3f6bf2dc960a7f4`. [Plan](../../plans/2026-10-07-sprite-speech.md), [runtime handoff](../SPRITE-SPEECH-TEST-HANDOFF.md).

Controller source checks: fresh `npm run build`, `npm run test:typecheck`, `npm run schemas` exit 0; `git diff --check` clean. Initial declarations: importer 9, clock/player 10, API 3 = **22 NOT RUN**. After fixes at `59af28e`: importer 10, clock/player 10, API 4 = **24 NOT RUN**; all source checks repeated, exit 0. No art/runtime/browser/model/TTS/ASR/video acceptance inferred.

Independent read-only reviewer `01a116a8-d9cf-77c2-b2e5-c72bf89b5204` reviewed this feature with exact commits, Tasks 1–2/CLI/API scope and no runtime calls. First verdict: changes required, two Important findings, no Critical identified. Focused re-review of `a6b62fa..59af28e` completed: both Important findings resolved; no new Critical/Important source findings in the fixes. The scoped source verdict adequately addresses the reported triggers, not runtime acceptance. Task 3 canonical/story integration remains pending; existing dialogue/final gates are intentionally unchanged.

## Independent findings and corrections

- **Important — local import loads production coordinator:** `apps/server/index.ts` speech import used the generic `mutate` wrapper, which loaded the coordinator even though the importer did not use it. A missing production module could prevent local artwork import. Fix `59af28e` factors `mutateLocal` with the same reservation, root, layout and idle guards; production mutations still load their coordinator explicitly. A new declaration injects a loader that fails if called while no coordinator is injected, checking successful import plus path/busy guards. NOT RUN.
- **Important — compound facial landmark names skipped:** `speech-schemas.ts` recognized only a single alphabetic eye/brow suffix. Valid names such as `eye_right_inner` and `brow_left_outer` could fall inside the mouth region without protection. Fix `59af28e` recognizes exact names and all permitted underscore suffixes for eye/nose/brow/eyebrow families. A new declaration covers compound/numeric names and visible compound-only eyes. NOT RUN.

## Controller corrections during source implementation

- Mouth sampler initially added an outer clip-end hide even for native hold/first, diverging from the low-level player. Removed that condition before source commit: visibility follows the native sampler; speech schedule closes outside its slot. The future stage owns slot visibility. A declared test covers hold after end and hide mismatch, NOT RUN.
- Report initially labelled global `activityHash` as `scheduleHash`. Corrected to full parsed schedule hash, with separate activity/narration/audio provenance. Hashes do not prove that audio bytes or artwork are accepted. Tests for provenance/untouched source were prepared, NOT RUN.
- Clock fixture hash assertion now uses parsed narration contract; JSON key ordering of a manually constructed fixture is not raw-file evidence. No fixture was executed to obtain this correction.

Retain subsequent reviewer findings, severity, original trigger, correction commit and focused re-review disposition here. A later clean verdict must not erase earlier issues. This foundation does not prove working multi-actor speech or the full usable tool.
