# Native source hand gestures — bounded source review

Base `8cc3a033e6ccf2b8c3691b11c1a5513bc3c1d8de`, 08/10/2026. Scope: optional original gesture spans, physical-hand/target/window identity, run coverage, original time/entry branch and painter slot in the canonical compiler/renderer, honest keypose evidence, cache/repair binding. No artwork/anatomy/clip/video acceptance.

## Independent review

Read-only source/declaration review by Hilbert `01a11712-4d23-7202-800c-1918d2b3d2ba`. First result **HOLD: two P2**, retained below. Follow-up result **bounded source PASS**: both original P2 resolved; no new verified P1/P2. Earlier findings/resolutions remain in0.31/0.32/0.33 records.

1. **P2 — complete board missing in creative validation/artwork repair.** Original creative.ts:111/artwork-repair.ts:44 called renderCinematic without board. A valid sourceSpan was rejected by the complete-context guard before normalization/repair/replay could succeed. Fix: creative passes the fully normalized board; repair accepts optional board or reads canonical disk for selected native clocks, substitutes the candidate into it and passes it to the same renderer on initial validation and both replay paths. Scenes passes its phaseBoard; attempt.binding includes sourcePhase for the complete original run/ownership/narration. No per-shot approximation or stale receipt reuse.
2. **P2 — stale canonical declaration model continuity.** Original native-source-gesture.test.ts:147 moved its target part but line153 retained the old continuity.models, so strict director validation rejected it before intended source-gesture assertions. Fix: rebuild models from modelExitParts after target movement and actor binding. Both canonical/deeper validation declarations use that corrected helper.

Further source follow-through: both creative/repair resource checks now whitelist the exact registered local cast PNGs, with existing sprite sheets. Scene staging retains real bytes/hash checks. Creative all-actor continuity remains strict through validateActorCast when primary/supporting roles change. Two new callbacks declare the actual normalization/repair/replay boundaries, invalid moved actor and changed nonlocal source receipt; no callback/helper has been executed.

Follow-up verified source paths: creative.ts:114 has complete board; artwork-repair.ts:53 validates replay/initial candidate with source context; native-source-gesture.test.ts:166 rebuilds model continuity. Reviewer confirmed registered cast resource scope, retained staging hash checks, sibling source-phase binding, all-cast continuity through role swaps, and two added declarations structurally reaching their intended boundaries. Reads only; all **13 callbacks NOT RUN**, no runtime/artwork/production acceptance.

## Actual controller evidence

- Core build after initial source integration exit0; further core builds after interaction/schema/prompt and strict lookup/report changes exit0.
- First test:typecheck exit1: declaration-only optional-number mutations, unsupported part.handleAnchor, missing action.target.modelId and geometry union narrowing. Fixed the fixture to actual contracts; fresh test:typecheck exit0. All thirteen callbacks NOT RUN.
- Schema export exit0: shared Shot/Storyboard sourceSpan, view-acting-clock v2 and new gesture-source-span; persisted voice activity/source speech clock and original audio unchanged.
- Lần export lại sau fix exit1 do filesystem UNKNOWN/open shot.schema.json; kiểm tra file vẫn tồn tại, Archive, rồi retry export exit0. Không thay schema contract để né lỗi I/O.
- After both P2 fixes, resource policy and deeper declarations: full npm run build exit0 (core/studio TypeScript and Vite); fresh npm run test:typecheck exit0; schema retry exit0; whitespace/staged whitespace exit0. Bounded source follow-up PASS.
- No image generation, bitmap edits, sampled pose frames, evaluator/GSAP/browser/API/model/voice/audio/pipeline/render/MP4 executed. Original PNG hashes/bytes unchanged by this source work. No fake physical contact: source reach/recover describes arm keypose motion only.

productionReady=false/productionRig=null and final source/identity/voice/target/sync gates remain. [Full commands/environment/remaining product scope](../NATIVE-SOURCE-GESTURE-HANDOFF.md).

## Published source checkpoint

`44b221f0dc3d41853678efdb5c46bdcacae41faf` — `Preserve native actor hand gestures across continuous shots`, branch `codex/prehistoric-life`, pushed to the authorized Story-2-video-factory repository. Actual git rev-parse HEAD and git ls-remote branch SHA matched; tracked changes clean after push. Owned26 files only, no .env/PNG/SVG or unrelated WIP staged. This checkpoint is source/build/review evidence only. This later record update contains documentation only; no additional runtime claim.
