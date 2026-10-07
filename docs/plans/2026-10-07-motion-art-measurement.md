# Explicit atlas measurement for actual Lila/Karo authoring

Implemented source `8998b397fa73efa2f830f78053b200376f506d3e`, fixes `7f7b28b588974b0b9329dfc6237e488c45e467e2` and `9cc8b6384180a7a00d0362e0d8796046d918a6b8`; base `6cc980b612c413b11bc369f89e23fbabe77a489a`. [Actual art/evidence](../topics/MOTION-ART-STUDIES.md), [measurement contract and commands](../topics/MOTION-ART-MEASUREMENT.md), [source review](../topics/reviews/motion-art-measurement-source-review-v1.md).

## Problem and intended behavior

Actual AI sheets have nonuniform origin, cell size and artwork drift. A requested 4×4 layout is not a measured native registration. Authors need explicit version-bound pixel windows and readable static worksheets without rewriting PNGs, inferring anatomy, publishing production assets or running the video pipeline.

## Source delivered

- Strict layout schema binds exact sheet hash; unique explicit frame/region IDs, positive integer native rectangles, frame-local ROI, bounded 64M cumulative sampling and exact RGBA decode.
- Alpha occupancy report preserves repeated positions and local coordinates; reports edge touches and selected ROI occupancy, never anatomy/contact/approval.
- Bounded immutable raw-PNG/JSON/paged-SVG outputs in separate authoring paths. All production directories denied case-insensitively; root ancestry and source paths validated with existing motion file guards.
- Lightweight offline CLI plus additive shared command in main CLI; schema export. Worksheets retain native frame coordinate windows, fixed local PNG URL and explicit per-frame clip paths; no JS, provider calls, clocks or coordinator/catalog mutation.
- Four meaningful test declarations prepared, NOT RUN: native/ROI alpha semantics, bounds/budget rejection, paged local clipped inert SVG, and PNG/hash/output immutability/publication guards.

## Review, checks and actual authoring

Initial review found two P2 issues: missing work/previews/logs guards and a declaration that wrongly rejects the SVG namespace. Fixed in `7f7b28b`; re-review PASS. Controller's first document raster revealed PNG spill outside nested SVG windows; fixed native clips in `9cc8b63`; re-review PASS. Exact scopes and limitations remain in the review accumulator.

Fresh full build, test:typecheck/schema export exit 0 on `9cc8b63`; diff clean. Controller generated Lila v3/Karo v2 actual PNG edits, measured explicit manual layouts at alpha128, corrected a Karo boundary, and produced static worksheet figures. One successful additional Gemini/9router static-art-advice call remains critical of limb/cloth/rest consistency. Two wrapper preparation failures occurred before provider dispatch. No production test or art approval was produced.

## Remaining full-product work

Repair source-faithful curves/proportions/clothing; exact landmark/anchor and authored clock registration; actual motion/mouth/action/view inventory; gaze/expressions/props/contact/handoff; approval receipts and final readiness; then delegate full script/WAV/story video tests in EN/VI/JA/KO. User confirms no image-to-video API. Continue HTML5/SVG/GSAP/art tools; never use an alpha measurement as automatic approval or replace acting with a slideshow. Keep the usable-tool goal active and current candidate final gates intact.
