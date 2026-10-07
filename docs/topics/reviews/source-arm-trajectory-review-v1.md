# Source expressive arm trajectories — review accumulator

Date 08/10/2026. Base `ad544f7fd1a8b0da1bbc3ffd3d7f7be9c93ddace`, foundation `e609097caf9df34afae6ccd5974ad29075e2a794`, fixes `718b53c5b3b3023cc9984187ede2bdb1e52eecb1` and `31297be1c5e9874c173cc84ede2c406e62b11379`. [Plan](../../plans/2026-10-07-source-arm-trajectories.md), [behavior/commands/handoff](../SOURCE-ARM-TRAJECTORIES.md).

Read-only reviewer Hilbert `01a11712-4d23-7202-800c-1918d2b3d2ba`. Scope: FK/angles/bounds/clocks, current-source/noncontact gating, scaled aim/reach, run entry/exit, legacy/contact contracts, compiler knot refinement and body/version/cache identity, plus NOT RUN declarations. No editing, body evaluator/test/fixtures/assertions/GSAP/browser/provider/production/audio/render or protected D/secrets. Artwork/anatomy/runtime/full-video acceptance is excluded.

## Original review: changes requested

Range `ad544f7..e609097`, two P2 findings:

1. Compiler default pole used the current run direction, which disagreed with actual entry flexion and changed on run exit. A rightward run overlapped a default react, producing an unwanted branch reversal/extension and possible elbow/cuff/ink jump during full grip ownership. Fix `718b53c` derives a stable pole from the signed flexion of the actual gesture-entry chain, retaining explicit overrides and deterministic random-access evaluation. Adds run-direction/hand/run-exit declaration.
2. Helper recomputed the shortest shoulder arc every frame. Near the antipode, rest90° and active−90°±epsilon at half weight could select opposite 0°/180° shoulder paths, physically jumping the joint. Fix `718b53c` retains an entry-owned angular reference, chooses the positive180° tie and rejects moving-keypose drift outside a90° corridor. Adds antipode/corridor declaration; it does not assert moving-body C2 acceptance.

## First focused re-review: changes requested

Range `e609097..718b53c`: antipodal finding resolved at source level; run-pole finding partially resolved. One remaining P2 at compiler.ts:697: implicit `think` synthesized `elbowPole='rest'` before reaching the new helper. Reachable right-hand think during fully activated rightward run still selected positive pole over the negative entry flexion, causing an unrequested branch reversal. Existing react declaration did not cover this exception.

Fix `31297be`: expressive aim, interpolation and reference helper receive the original gesture; synthesized `sourceGesture` remains confined to legacy `armPose`. Descriptor v3 accurately records entry-owned defaults and changes the existing body-pack fingerprint. Adds a ninth NOT RUN declaration for both source actors, entry grip/flex equality, implicit think versus explicit rest/reach and ownership through run exit.

## Final focused source verdict

Exact range `718b53c..31297be`: **PASS, no actionable findings**. Reviewer confirms all three P2 findings resolved at source level; no new integration/cache/contact/legacy regressions in this diff. Diff whitespace clean. The final verdict supplements the earlier scoped reviews; it does not replace their findings or approve unrelated historical code.

Reviewer performed no runtime execution or file edits. Controller core build/test:typecheck exit0 after the final source fix. Controller then completed fresh full checks on source `31297be`:

| Check | Result | Scope |
|---|---|---|
| `npm run build` | Exit0 | TypeScript core, Studio typecheck, Vite client build |
| `npm run test:typecheck` | Exit0 | Type declarations only; no callbacks/assertions executed |
| `npm run schemas` | Exit0 | Schema export; no regenerated tracked schema changes |
| `git diff --check` | Exit0 | Whitespace only |

The first typecheck for the ninth declaration reported TS7022 on an unannotated expected-pole local. An explicit `number` annotation fixed it before commit `31297be`; the subsequent core/typecheck and fresh full checks above succeeded. Do not represent that compiler diagnostic as a runtime test failure or the final typecheck as assertion PASS.

## Controller verification and remaining acceptance

Foundation full build/test:typecheck/schema export exit0 on `e609097`; diff clean. **Nine new trajectory declarations NOT RUN**; prior four measurement, three anchor and42speech declarations still NOT RUN. No body/speech/performance runtime or new rendered body/video acceptance executed. Static source-RGB authoring figures are separate artwork studies, not frames produced by this compiler. These checks do not prove C2 behavior in moving-body scenes, target reach in all stories, anatomy/artwork or full product completeness.

Keep topic `productionReady=false`, `productionRig=null`. Runtime/art/acting/contact/voice and full three-input video acceptance remain delegated to the user's test model.
