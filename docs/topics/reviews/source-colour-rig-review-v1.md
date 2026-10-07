# Original RGB candidate rig — source review accumulator

Date 08/10/2026. Base `fca55fdb57d9aa5d08506156e200c75a905e78db`, source `31070ccab1bc600c485bed9f53733f68bbd0fb3e`. [Plan](../../plans/2026-10-08-source-colour-rig.md), [handoff](../SOURCE-COLOUR-RIG-HANDOFF.md), [static artwork](../SOURCE-RGB-MASTERS.md).

Read-only reviewer Hilbert `01a11712-4d23-7202-800c-1918d2b3d2ba` reviewed the exact nine-file range. Scope: explicit source-body/actor-only profile selection, hash-bound RGB/matte resources, bounded passive SVG/local refs/namespaces, head/body integration, cache identity, legacy/authored-view routing, workbench/API and six NOT RUN declarations. Excludes artwork/anatomy/runtime/video/full-goal acceptance. No editing, test/assertion/fixture/body evaluator/GSAP/browser/provider/API/production/audio/render, protected D/secrets or unrelated leftovers. **Scoped source verdict: PASS, no actionable findings.**

Controller core build/test:typecheck exit0 before commit. Read-source inspection caught a draft matrix coefficient outside the renderer's bound≤10; source was changed to two matrices with absolute coefficients≤8 before commit. Draft static v2 is superseded by bounded v3; do not use the uncommitted draft as canonical-scene evidence. No runtime callbacks or canonical renderer were executed to make this discovery.

Six new declarations remain **NOT RUN**; previous9arm/4measurement/3anchor/42speech declarations remain NOT RUN. Static SVG authoring figures use the pure colour helper but no body evaluator/timeline/pose/video pipeline. Figure quality remains unaccepted, visible fringes/outline alignment and legacy layer registration remain pending.

Record verified findings with severity/trigger/impact, exact fix commits, focused re-review and fresh build/schema evidence here. A later no-additional-findings verdict must not erase previous issues or become artwork/production approval. Full topic/production gates remain closed.

## Verified source review result

Reviewer confirms profile restriction (`packages/host/schemas.ts:16`), image-URL/bounded-matrix/local-reference contract (`packages/animation/source-colour-art.ts:35`), exact RGB/matte resources plus head/body fingerprint changes (`packages/animation/forest-body-art.ts:106`), and authored-view/lunge rejection with form/pose-link selection (`packages/topics/body-workbench.ts:27`). Default rendering, anchors, metrics, clocks and provisional overlays retain their existing paths. Protected-face polygons/matte alignment are unaccepted artwork assumptions.

Prior arm/source findings remain preserved in their accumulators; this no-new-findings result does not erase them or broaden their approval scope. Reviewer's whitespace check clean. No runtime execution, edits or protected D/secrets access. Reviewer did not independently rerun controller checks.

## Fresh controller checks on source31070cc

| Command | Result | Scope |
|---|---|---|
| `npm run build:core` | Exit0 | Core TypeScript |
| `npm run build` | Exit0 | Core TypeScript, Studio typecheck and Vite bundle |
| `npm run test:typecheck` | Exit0 | Declaration types; no callbacks/assertions executed |
| `npm run schemas` | Exit0 | Adds optional sourceColour literal to host-profile/shot/storyboard JSON schema |
| `git diff --check` | Exit0 | Whitespace only |

No source changes after the reviewed commit; schema export and disjoint docs/static authoring publication follow. These checks do not certify schema refinements through runtime, scene rendering/seek, geometry equality, original-image matte fidelity, audio or completed product. Six new declarations and previous9arm/4measurement/3anchor/42speech declarations remain NOT RUN.
