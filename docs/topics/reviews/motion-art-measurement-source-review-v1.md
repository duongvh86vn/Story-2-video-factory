# Motion artwork measurement — source review accumulator

Base `6cc980b612c413b11bc369f89e23fbabe77a489a`. Initial source `8998b397fa73efa2f830f78053b200376f506d3e`; fix `7f7b28b588974b0b9329dfc6237e488c45e467e2`; clipping fix `9cc8b6384180a7a00d0362e0d8796046d918a6b8`. [Plan](../../plans/2026-10-07-motion-art-measurement.md), [actual authoring evidence](../MOTION-ART-MEASUREMENT.md), [runtime handoff](../SPRITE-MOTION-TEST-HANDOFF.md).

Independent read-only reviewer Hilbert `01a11712-4d23-7202-800c-1918d2b3d2ba` reviewed explicit/hash-bound frame windows, strict bounded RGBA/ROI sampling, ancestry/path guards, immutable raw PNG/report/local inert paged SVG, lightweight runner/main CLI compatibility and NOT RUN declarations. It did not run tests/fixtures/browser/provider/rendering/production, touch protected D: or independently rerun controller checks. Artwork quality, timing, calibration, final gates and full-product acceptance are excluded.

## Initial verdict — changes requested, two P2 findings

1. **P2, output-directory guard incomplete**, measure.ts:76 at `8998b39`. Trigger `previews/measurement`, `Previews/measurement`, `work/measurement`: production also uses work/previews/logs, and previews PNG/JSON enter artifact hashes. Fix all three case-normalized guards and rejection declarations. Addressed `7f7b28b`.
2. **P2, worksheet assertion rejects valid SVG**, sprite-motion-measure.test.ts:42 at `8998b39`. Forbidden `https?:` regex necessarily matches SVG namespace. Fix checks of resource-bearing markup/CSS while permitting namespace. Addressed `7f7b28b`, with fixed local source resource count and inert markup checks.

Reviewer `8998b39..7f7b28b`: **scoped source PASS; both P2 resolved, no new actionable findings**. All nine forbidden production directories now covered; SVG namespace permitted, 17 resource attributes require source.png.

## Controller authoring finding and subsequent review

Static document raster of actual first worksheets showed neighboring raw-PNG rows outside selected nested viewBox. This is a worksheet clipping defect, not proof that native artwork lost feet. Added explicit unique userSpaceOnUse native clip `(0,0,w,h)` around PNG/boxes and overflow hidden. Prepared NOT RUN checks of 17 unique clip IDs, native rectangles and local fragment url references. Fix `9cc8b63`.

Reviewer `7f7b28b..9cc8b63`: **scoped source PASS; no actionable findings**. Unique IDs across pages, correct native clip bounds/enclosure; prior fixes remain. Rasterized appearance not independently verified. Historical worksheet v1 remains superseded; actual v2 figures inspected only as static authoring documents by controller.

## Checks and limits

Fresh controller `npm run build`, `npm run test:typecheck`, `npm run schemas` exit 0 on `9cc8b63`; diff check clean. **4 new measurement, 3 anchor and 42 speech declarations remain NOT RUN**. No test callbacks/assertions/fixtures, GSAP playback, browser, production API/CLI/model acceptance, TTS/ASR or MP4 acceptance executed. Actual imagegen edits, alpha authoring command execution, worksheet document rasterization and one Gemini static-art-advice call are explicitly separate from runtime tests. These activities do not approve anatomy, motion or video and do not complete the whole tool goal.
