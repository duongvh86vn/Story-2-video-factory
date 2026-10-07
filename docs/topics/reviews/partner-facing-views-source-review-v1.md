# Partner-facing view candidates — source review accumulator

Date 08/10/2026. Base `2a7bd5ead00d66dff78789745506257a4ee96991`, source `a63259ce731afbf34630d93b58f6469a33b02371`, 17 files. [Plan](../../plans/2026-10-08-partner-facing-views.md), [handoff/authoring evidence](../PARTNER-FACING-VIEWS-HANDOFF.md).

Read-only Hilbert `01a11712-4d23-7202-800c-1918d2b3d2ba` reviewed the exact 17-file foundation, then two-file addition through `f88ae6e427fac1ed60c9014274af6c3b390209b4` (18 unique files): native view/asset/near-far identity, canonical dimensions, fixed facing/knee direction, right compatibility, profile/cache/schema/workbenches, unsupported raw-sampler motion/speech/turn/left tools/lunge and nine initial NOT RUN declarations. No edits/tests/assertions/fixtures/body evaluator/GSAP/browser/provider/API/production/audio/render/video, protected D/secrets or unrelated WIP. Initial verdict **HOLD: three P2 findings, no P1**; additive topic metadata introduces no extra finding. Final focused verdict **PASS in reviewed source scope**, all four P2s retained/resolved below; no outstanding P1/P2.

The controller's fresh core/full build/test:typecheck/schema export exit0 before source commit. Initial test:typecheck caught literal widening in two declarations; annotated plans then typecheck exit0. Whitespace check exit0. These checks are source/types/bundle/schema only. Ten callbacks remain NOT RUN; artwork identity/masks/anchors, pose/motion, exact clock playback, audio/video and full product acceptance are outside this review. Topic/production gates remain closed. Existing findings in other accumulators are not erased by this review.

## Verified findings and fixes

| Severity | Trigger and impact | Source fix |
|---|---|---|
| P2 | Fixed-view explicit gaze passes guard, but replacing the authored face state discards attention changes (`compiler.ts:82/791` at f88ae6e). | `004cd8b`: shared fixed-view guard rejects explicit gazes until registered; NOT RUN cases cover validation/sampler/anchors. |
| P2 | Public `bodyPoseAnchors` enters unsupported fixed-view crouch/left-lunge body state, allowing targets to be authored against a rejected stance (`compiler.ts:392`). No compiled-scene bypass demonstrated. | `004cd8b`: lunge-view and fixed-view guards run before anchor evaluation; NOT RUN rejection cases added. |
| P2 | Registered chin uses happy tilt3° while the authored head renders with lean only, displacing think grip from actual face (`compiler.ts:585–586/635`). | `004cd8b`: both entry reference and current chin use actual rendered headAngle. Other routing retains its existing formula. Tenth NOT RUN callback compares grip against native chin transformed by actual head SVG attachment across actor/view/hand/scale/held clocks. |

Controller source inspection also found the headView negative declaration expected the later body-registration error, while head validation rejects it earlier with needs-head-view. `f88ae6e` accepts the appropriate error from either entry point; no callbacks executed to find/fix it. That follow-up adds topic metadata0.29 without changing readiness/narrative version1.

Exact fix SHA `004cd8be6c3eb0f4449ef5a27959fcf0cc4816cd`, three files: compiler, body compiler version19/cache and test declarations. Fresh full build/test:typecheck exit0 before fix commit, fresh schema export exit0. Focused re-review is limited to resolving the three findings and newly introduced issues. A later PASS must retain this table, not erase prior HOLD or imply artwork/motion/runtime/full-goal acceptance.

Focused reviewer result on `f88ae6e..004cd8b`: all three original P2s resolved, no additional implementation issue. **HOLD for one new P2 in the NOT RUN chin declaration:** 800ms lies inside gesture approach300–900ms, so exact chin equality at that time rejects intended approach. Read source `articulatedGestureWindow`: reach at900, recovery at3200 for this calibration. Final declaration fix `674ac04032f66d3b9104f6f6c47f89eadf7f8a4b` compares1000/1600/2600 within hold and documents why. Fresh test:typecheck exit0; no implementation changes or runtime execution for this correction.

Final focused review `004cd8b..674ac04`: **PASS**, comparison clocks all inside900–3200 hold; all four P2s resolved in source, no outstanding P1/P2 in exact reviewed scope. No editing/runtime or expanded acceptance. Static figure/mask issues remain unapproved and ten callbacks remain NOT RUN. The reviewer is closed after this result.

## Controller checks and limits

| Command | Verified result | Source scope |
|---|---|---|
| `npm run build:core` | Exit0 | Foundation registration before a63259c |
| `npm run build` | Exit0 | Foundation, metadata follow-up and implementation fix004cd8b; core/Studio types/Vite |
| `npm run test:typecheck` | Exit0 after correcting initial widening | Foundation, metadata follow-up, implementation fix and final declaration674ac04; no callbacks |
| `npm run schemas` | Exit0 | Foundation new left enum, fresh export at004cd8b; later674ac04 changes no schema/source implementation |
| `git diff --check` | Exit0 | Whitespace only |

These are not tests of native pixels/motion/turns, random seeking, geometry/contact, GSAP/scene/resource playback, TTS/ASR/audio/video, full three-input product or production receipts. No runtime callback, body evaluator or renderer was executed by controller/reviewer. Source review does not certify a finished rig; the topic stays productionReady=false and productionRig=null.
