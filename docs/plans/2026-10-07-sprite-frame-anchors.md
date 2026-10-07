# Explicit per-position sprite anchors for authored motion

Source `5b283ad0cc1b900f6f1593de1ccf28081b9e0c79`, base `c36f0d7d66019c3c2d25bf530123425b580c726f`. [Actual candidate art/evidence](../topics/MOTION-ART-STUDIES.md), [source review](../topics/reviews/sprite-frame-anchor-source-review-v1.md).

## Problem and intended behavior

Generated atlases contain variable frame origins, unequal cell dimensions and planted-foot drift. Native descriptors/player already support an anchor on each frame, but importer copied one shared registration anchor to every position. Authors need explicit measured frame anchors without changing PNG bytes or inferring ground contact from alpha bounds. This can correct placement/crop origin; it cannot repair internal limb, clothing or identity drift.

## Source tasks implemented

- Add optional complete `anchors[]` (1–512 finite points) in `actor-motion-registration-1`. Keep shared `anchor` required and absence without default, preserving old normalized registration/hash behavior.
- Require exact playback-position count for both atlas and strip before publication; use the corresponding anchor and retain frame-local bounds checks in the native descriptor. Repeated rectangles may have different registered anchors/landmarks; do not merge their source semantics.
- Let existing descriptor/hash/version/player/camera/contact consumers use exact native per-frame anchors. Preserve raw PNG/immutable paths, source provenance, candidate gates, timing and speech binding to exact native version.
- Add three meaningful declarations (NOT RUN): repeated-position world landmark placement/legacy fallback; bounded/complete atlas and strip registration; invalid registration no publication plus immutable version change. Existing corruption declaration now includes frame anchor tampering.
- Export registration schema; full build/test:typecheck/schemas exit 0; diff check clean. Independent source-only review completed, no actionable findings in `c36f0d7..5b283ad`. No runtime tests, fixtures, audio, render or video acceptance executed.

## Product work still required

Repair source-faithful artwork and measure real per-frame rectangles/anchors/landmarks. Do not promote static estimates or metadata to anatomy approval. Create native mouth variants and action/view inventory, gaze/expressions/props/contact/handoff and acceptance receipts; then delegate full script/WAV/story video acceptance in EN/VI/JA/KO. Keep the full usable-tool goal and candidate final gate intact.
