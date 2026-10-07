# Source-body articulated expressive arm trajectories

Base `ad544f7fd1a8b0da1bbc3ffd3d7f7be9c93ddace`. Full product remains story/script/WAV to video with Lila/Karo as actors, soft ink limbs, faithful warm original art and acting; no image-to-video API available. This step repairs a specific source arm motion defect and does not make artwork/runtime approved.

## Source defect and intended change

Existing chains already keep physical lengths, but default expressive gestures switch from the anatomical rest IK pole to its opposite via an 80ms extension transit. A target may be mathematically reachable while the resulting motion looks abrupt or deformed. Cartesian target mixing can also close the arm near the shoulder; the unscaled default reaction offset is particularly unsuitable for different source arm lengths/scales. Whole-body AI atlas edits still drift in limb/cloth/rest shapes.

## Implementation tasks

- Add pure bounded `arm-trajectory.ts`: convert source chain directions to shoulder and signed elbow angles; shortest shoulder arc, signed elbow interpolation, quintic entry/exit and fixed-length forward kinematics. Explicit opposite pole crosses zero flexion rather than flipping a bent chain. C2 is a statement about fixed keyposes, not the whole moving-body performance.
- Apply to current source-body expressive gestures (2.2.13/14/15) only. Default preserves rest pole; run entry uses its actual existing arm chain and direction unless explicit pole chosen. Source no-target reactions/indications use physical arm reach; explicit targets/chin are retained and unreachable keyposes report needs-arm-keypose.
- Preserve original gesture interval and explicit contact/release timing. Creative default approach up to600ms/35%, recovery up to400ms/25%; seed these knots in the existing compiler refinement. No change to narration, native sprite or speech clock.
- Contact/operate/pick/carry/drop/spear retain existing exact contact solvers. Generic and older source plans retain their previous numeric goal/IK path. Existing cuff/palm/mitten transforms and soft ink rendering remain; no PNG mutation or angular elbow style.
- Bump forest source body compiler16→17 and include trajectory description in pack fingerprint. Include both source body families in scene identity so candidate quarter-view scenes cannot reuse stale body-motion caches. Keep production/topic/candidate final guards closed.
- Prepare meaningful delegated tests, source review, full build/typecheck and schema export; do not run test callbacks, fixtures, body evaluator, GSAP, browser, production API/CLI/provider/audio/video for acceptance.

## Review fixes on 08/10/2026

Foundation `e609097`, fixes `718b53c` and `31297be`. Review found current run-direction pole mismatch/run-exit reselection, per-frame shortest shoulder arc reversal at the antipode, and the implicit think rest override bypassing entry-owned selection. Preserve this initial plan as history: final default pole comes from actual signed entry-chain flexion, not the current direction. The shoulder arc is captured deterministically at original gesture start, positive180° tie retained and moving-keypose drift bounded to±90°. Implicit think now passes its original gesture through the current expressive branch; synthesized rest remains legacy-only. Explicit poles, contact/legacy routing, source interval and physical bone lengths remain.

Independent focused source review PASS after the three P2 fixes; [findings and exact ranges](../topics/reviews/source-arm-trajectory-review-v1.md). Nine runtime declarations remain NOT RUN. Descriptor v3 participates in the existing body-motion fingerprint; source body compiler17 still identifies this work. [Current implementation/commands](../topics/SOURCE-ARM-TRAJECTORIES.md). Static [original-RGB masters](../topics/SOURCE-RGB-MASTERS.md) are separate unregistered matte studies, not compiler output or artwork acceptance.

## Runtime and product work still pending

Model test must inspect every relevant clock and scale for source pose reach, C2-relative-keypose behavior versus moving body, old generic/source compatibility, run/gesture entry/exit, hand/contact seams, compiler interpolation, cache/resume and actual video. Human-visible anatomy/clearance and original identity/colour remain separate from length math. Need action/view/gaze/expression/mouth/props/handoff/receipts and full three-input usable tool; current alpha sheets are unregistered candidates, not substitutes for these requirements.
