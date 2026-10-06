# Test follow-up — 2026-10-06

This run checked the current worktree based on `443220f6a6fe5516647b9df707d79a5c50d0318f`. It is implementation evidence, not visual acceptance of a complete generated film.

## Results

- Full `npm test`: **1,477 passed, 0 failed, 8 skipped** out of 1,485 reported tests. Runtime: 562 seconds. The run supplied isolated scene-label and scene-migration evidence roots and used the archived `a321201a53a8c52909872776d23e447fe79cbe34` source snapshot.
- After the full run, three baseline/browser checks were run with that same archived snapshot: **6 passed, 0 failed, 0 skipped**. These covered the unchanged default renderer, cache/lock identity with optional foreground art, and headless-Chrome layer order, motion clock, and prop contact for both stick-man and mini-robot rigs.
- After the final storyboard-hash normalization edits, focused actor, cinematic Studio, and stage tests passed **76/76**. `npm run typecheck`, `npm run test:typecheck`, and `npm run build` also passed.
- `git diff --check` passed.

The code fix makes actor-cast, actor-timeline, cinematic plans, performance reports, and environment provenance hash the same Zod-normalized storyboard that downstream resume and freshness checks read. Studio fixtures now build accepted scenes through the real scene builder before declaring `SCENES_READY`; stale-scene protections remain enabled.

## Evidence and remaining gaps

Raw logs are retained outside the repository at `C:\Users\Duongvh-pc\codex-test-evidence\goal-objective-followup-20261006\`:

- `full-suite/npm-test.log` — complete suite output and final summary.
- `post-hash-fix-targeted.log` — 76 focused regression tests after final source changes.
- `foreground-baseline-targeted.log` — six baseline/browser checks.
- `foreground-browser/` — isolated fixtures and browser evidence from the scoped run.

Five optional checks remain skipped because they require historical external artifacts that are not part of this checkout: a retained native repair response (`ACTING_REPAIR_RETAINED_ATTEMPT`), two retained native candidate files (`CINEMATIC_PROP_ORIGIN_CANDIDATE` and `CINEMATIC_TARGET_CANDIDATE`), and frozen legacy12 snapshots for both rigs (`STORY_EMOTIONS_LEGACY12_EVIDENCE`).

This test run did not call a live writing model or live TTS provider and did not generate, watch, or listen to a full story video. Story/acting quality, real service compatibility, and full end-to-end video acceptance therefore remain unverified and should be reported separately by the designated model test.
