# Bound model motion — 03/10/2026

Source fingerprint: `bound-model-motion-2.2.1`; animation remains `performance-2.2.9`, director `story-direction-2.2.21`. This is a common-pipeline integration of an existing animation clip, not a claim that the whole product or autonomous direction is accepted.

## Source changes

- A primary story actor may use one released `carry` or `pick-place` with a sourced model binding and one selected hand. Carry has approach/contact,250ms lift, standing locomotion,250ms lowering, release and recovery on the existing narration clock.
- Gesture destination is the hand grip; prop destination is the object center. The validator applies `gripOffset * performance.scale`, checks final model bounds and the primary action/hand/clock owner. Another fixed target on that model must finish before pickup; tracking points, joint movement, repeated pickup, supporting attachments, entering/unreleased production carry and handoff remain unsupported.
- Support stands stay at the original/final model bottoms. Labels, emphasis and energy follow the adaptive compiled prop frames. Thermal graphics live inside the prop. The ground shadow follows horizontal movement and cancels the object's vertical movement.
- Relationship endpoints follow compiled prop centers. A moving quadratic relation uses16 unit path segments with numeric translate/rotate/scale transforms; a directed arrow and flow packet share the clock. Static relations retain their previous path/calls. Scene JS permissions have not been broadened to arbitrary attributes, path mutation or model code.
- Camera validation checks the model/label motion envelope. Contact close maps each gesture to its action by ID through the same per-hand action groups, rather than array position.
- Project and bound-scene visual hashes include the new fingerprint. Narration/audio hash inputs are unchanged. Actual migration of existing audio/cache/locks still requires an independent run on the retained corrected fixture.

## Build evidence and limits

Core and Studio build/typecheck passed after one failed build caused by importing `rigHand` from the wrong module. The import was corrected to core identifiers. Schema generation and `git diff --check` also exited0. Runtime tests are delegated to another model at the user's request; new carry integration, GSAP seek/reverse behavior and full regression are **NOT RUN** independently. Earlier animation-only carry and bilateral audits cannot certify this batch.

## Authored production

A separate steam film for each actor kind was produced through the real common pipeline. Cues5–7 are combined into a7.262s workshop shot without retiming narration or subtitles. Existing narration/audio is reused. Watt carries an illustrative condenser to a separate support, releases it, and observes the hot/cold duties and steam transfer. The source explicitly describes the action as an illustration of separation of functions, not an asserted historical experiment.

Both jobs terminated with exit0/DONE and producer QC true: H.2641280×720/30fps,37.166667s, AAC narration37.154s and one stored subtitle stream. These are pipeline production results, not independent runtime or aesthetic acceptance.

| Authored project under `temp/art-direction-v22` | Final MP4 SHA256 | Carry compiler measurements |
|---|---|---|
| `actor-steam-stick-man-transport-1791006178190` | `1e6c2bbd3e2b800462c59e3992e8f066206faf8b3703980e2923d7196db2fa65` | 298frames; max contact0; max interpolation gap0.19124167054162136px |
| `actor-steam-mini-robot-transport-1791006465392` | `70b3f77559726ae58584352fe5a1eff0d510100dd3e22a1a2ee281f0c2a4480f` | 308frames; max contact0; max interpolation gap0.18355312482766165px |

The stick-man renderer loaded before the final fixed-target/primary-owner validation guard was added. Its output must not be relabeled as a run of that validator revision. The robot loaded the complete source batch; source file fingerprints, helper/provenance and raw producer logs are retained in local task evidence. Parent observed production frames13.878s and16.578s for stick-man and13.878s and17.577s for robot: visible grip/carry, released hand and supported prop; robot duty labels are readable. Parent also opened final playback in Studio. Selected frames and playback availability do not establish full-motion/film-quality acceptance. Neither film represents autonomous model direction or a live external TTS run.

## Independent handoff

Use both actor kinds and both hands, nonzero gripOffset, actual Scene JS/GSAP, real rendering and final stored narration/clock. Preserve failure outputs and source/artifact fingerprints. Check lift/walk/lower/release contact, identity, moving label/thermal/emphasis/ground shadow/relations, per-hand close framing and playback after random/reverse seeks. Reject stale post-pickup targets, incorrect center/grip destinations, multiple owners, joint movement, unsupported handoff/entry/exit and camera cropping. Resume the existing corrected migration fixture with its original configuration, audio/cache and approved locks; do not fabricate hashes or force-unlock it. Full-film design and live local TTS still need separate acceptance.
