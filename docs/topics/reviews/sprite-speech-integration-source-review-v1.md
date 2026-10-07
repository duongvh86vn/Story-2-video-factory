# Sprite speech canonical integration — source review accumulator

Range `97a7c13a677f7f94d13144ecd0a3dacbc3445b65..3d9aab1532afd4ba44c63f1e471cfa6ce8558dc6`; correction `818b03683c51586a6061277a1811aef4cc628904`. [Plan](../../plans/2026-10-07-sprite-speech.md), [runtime handoff](../SPRITE-SPEECH-TEST-HANDOFF.md), [previous foundation findings](sprite-speech-source-review-v1.md).

## Scope and checks

Actor-owned exact mouth variant/cue bindings, unique ownership and full visible cue coverage; original narration/activity clock in stage sampler/compiler and canonical renderer; verified loaders/byte staging/allowlists/source comparison/geometry/cache/locks; catalog/Director selection, Studio import/linkage and CLI/API diagnostic rest/open preview. No-speech output is intended to remain unchanged. Candidate final gates remain closed.

Fresh `npm run build` (core, Studio TypeScript, Vite), `npm run test:typecheck`, `npm run schemas` exit 0; `git diff --check` clean. Initial typecheck failed with TS2339 in two new test declarations accessing a union report; explicit narrowing corrected the declarations before the successful check. No production source changed after the latest full build.

Initial range: **41 declarations NOT RUN**, 17 added. After correction `818b036`: **42 NOT RUN**, importer 10, clock/player 10, API 5, stage 11, integration 6. Fresh full build/test:typecheck exit 0 and diff check clean after the fix; schemas unchanged. No assertion, fixture, test callback, GSAP VM, browser/API/CLI, model, TTS/ASR, render or MP4 acceptance was executed by the implementer. Build/schema success is not runtime evidence.

Actual artwork, anatomy/fluidity, acoustic speaker identification, mixed-speaker word/subcue timing, props/handoff and end-to-end final video acceptance are outside this source milestone and remain required product work. Diagnostic preview switches rest/open without audio; structural Director validation uses a labelled draft activity context and does not generate voice evidence.

## Independent review

Read-only reviewer `01a116cf-19eb-73b0-8fc8-24ef472b15f8` received the exact range, authorized source-only scope and runtime exclusions. Initial verdict: with fixes — one Important, zero Critical. No additional Critical/Important surfaced in the reviewed cue ownership/coverage/clock/loading/staging/source/cache/catalog/Studio source paths; this is not an exhaustive runtime guarantee. Reviewer did not rerun controller checks. Focused re-review of `3d9aab1..818b036` completed: original Important resolved; no new Critical, Important or Minor findings in the fix. This scoped source gate does not certify earlier pending catalog review, actual artwork, runtime or the full product.

## Independent finding and correction

- **Important — valid large-loop mouth preview exceeds budget:** `packages/motion/workbench.ts:25` made two diagnostic cycles for a loop with 512 distinct 100 ms frames. Source accounting: 2558 native calls plus 4098 mouth calls = 6656, exceeding the 6000-call compiler limit at `packages/motion/player.ts:139`. Native preview worked, but Studio/API mouth preview and CLI preflight failed for valid artwork. Fix `818b036` selects one mouth cycle, keeps native-only two cycles and the compiler cap, and updates intervals/labels/diagnostic limit accordingly. One NOT RUN regression covers the original 512-frame trigger plus hold/first/hide at rates 0.5/1/2; the one-cycle hold example has 3584 source-accounted calls. Focused re-review confirms resolution; other terminal policies need at most 3586 calls for this example, below the unchanged cap. No runtime execution was used to establish these counts.

Retain every finding and its original trigger even after re-review. Source gate is not art/anatomy/voice/video acceptance.

## Controller corrections before source commit

- The canonical geometry/source checks now receive the actual stored activity and verified speech variants when dialogue is bound; no-speech geometry can still use its previous empty draft context.
- Alternate PNG bytes are staged under their content hash and included in resource/source/cache checks; the importer and diagnostic preview do not re-encode them.
- Diagnostic no-speech HTML retained its original newline layout after an initially introduced unconditional newline was removed. Byte equality is a prepared regression, not an executed result.
- New cinematic fixture reuse moved the existing fixture into a helper without executing it. Stage fixture binding refreshes role-dependent identity metadata. Fixtures describe technical contracts only and are not Lila/Karo artwork evidence.
