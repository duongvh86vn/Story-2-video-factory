# Canonical sprite scene — source review accumulator

## Scope

Base: `a3f2269fbdfde1f64e6a262e1b7621f0f69a4602`. Implementation: `5e396a71ae7de04ceab5587e99c56653ebb13c8c`.

Requirements: [canonical sprite scene plan](../../plans/2026-10-07-canonical-sprite-scenes.md). Read-only reviewer dispatched with exact range; no runtime/assertions/fixtures/browser/render/MP4/model/audio calls authorized in this review.

Source milestone covers opt-in canonical branch, world art/camera and tagged geometry, immutable PNG staging/context, lock/source identity, async normalization receipts and candidate final/QC/download gates. It does not cover accepted actor artwork/motion, automated catalog selection, speech or continuous prop/contact handoff.

## Verification by controller

`npm run build`, `npm run test:typecheck`, `npm run schemas`, `git diff --check`: exit 0 on the implementation snapshot. Test typecheck initially found a missing fixture closing brace; corrected before snapshot. Runtime tests **NOT RUN**; 11 canonical and 2 async tests are declarations only.

## Findings

Independent source review initially returned **HOLD**, no Critical and three Important findings. Controller verified each against source and corrected them. Final focused source re-review at `36e2172e4130649c3917bc18d7e8bd4b81489321` returned **PASS for this source milestone**, with no residual Important/Critical finding. Production acceptance is not asserted.

| Severity | Evidence on `5e396a7` | Defect and impact | Correction |
|---|---|---|---|
| Important | `packages/review/index.ts:148` | Resource allowlist contained only approved manifest assets; valid imported sprite sheets were rejected by draft scene contract review. | Add verified immutable sprite context and require staged PNG hash before allowing its local resource; do not mark candidate approved. Prepared regression includes staged corruption. |
| Important | `packages/motion/scene-validation.ts:24` | Contacts pooled across actors could satisfy two required hands using Lila left plus Karo right. | All required hands must belong to one eligible actor; explicit contactActorId still restricts ownership. Prepared split-owner/explicit-owner case. |
| Important | `packages/motion/camera.ts:75,89` | Contact close tested only the hand at one instant and skipped manipulated object/label visibility. | Check contact parts and sourced response parts/labels across all declared camera samples. Prepared positive, object crop, later push-in label crop and response crop cases. |

Initial 13 test declarations remain NOT RUN; three regression declarations were added, giving 14 canonical scene and 2 async normalization cases. This accumulator keeps the original verified issues after correction; an eventual clean re-review does not erase them.

Focused source review of `5e396a7..d1fb7e4`: Important #1 and #2 resolved. #3 partially resolved: `packages/motion/camera.ts:59,78` still omitted event `relationTo`, so a contacted flow's destination/label could be cropped. Controller verified the response endpoint against `cinematicRelations` and added it to required bounds checks, plus a cropped destination assertion to the existing camera regression declaration. Fresh source checks and final focused re-review are pending; this is the residual portion of original #3, not an erased or newly unrelated finding.

Final disposition: `d1fb7e4` resolves #1 and #2; `36e2172` completes #3 including the `relationTo` endpoint. Reviewer verified `camera.ts:61` includes that destination in sampled object/label checks and the prepared regression at `tests/cinematic-sprites.test.ts:143`. All three original Important findings are resolved **in source**. The prior pending sentence above records the intermediate review stage; the final disposition governs this checkpoint.

Fresh controller commands after the final code changes: build and test:typecheck exit 0, schema export exit 0, diff check clean. Independent review did not rerun these commands. No assertions, fixtures, GSAP/browser/render/video/TTS/ASR or model calls were run. Runtime handoff remains [NOT RUN](../SPRITE-STORY-TEST-HANDOFF.md).
