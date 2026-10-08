# Native head-turn source record — 08/10/2026

Scope: source0.45 authoring and landmark tools, not turn animation integration. Exact source/publication SHA is added after commit below. Implementation runtime remains delegated to the user's model.

## Original artwork

Four built-in imagegen calls used explicit local images (inspected before editing), transparent_background=true, exact prompts saved beside each material. Generated originals kept unchanged under C:/Users/Duongvh-pc/.codex/generated_images/01a0f194-5a26-7743-b0e6-bdc3cca6d17f; versioned copies preserve raw bytes.

| Owned file | SHA256 |
|---|---|
| lila-head-turn-v1.png | fe9181633b8bdbb28c334d62a9c81d33c35cf9624ae35849c11850445b1d0b87 |
| lila-head-turn-v2.png | 1893e4c02fa8f3cd089436536d33e85d6ad3656643b7674f844f3a8e707220e0 |
| karo-head-turn-v1.png | 965d9fb0f4e800144612bb4e3cd6ec6b482dad483c894980aea6fc61bbb4aaaf |
| karo-head-turn-v2.png | 035b9d42e3825b311b25b155ddfd646416f806b2ab9f28086aa706eb16295a4f |

Primary refs are the user's warm-skin full closeups. Actual image metadata:1254×1254 RGBA, not the requested2048 or displayed1280-ish preview. Alpha margin/pixel hashes measured from raw RGBA, never resized. Original division-by-four assumption caused first static inventory failure8b4cf0; corrected integer edges0,313,627,940,1254. Final inventory handle944bb1 below. V2 changed pixel hashes in all16 cells of each actor; this does not quantify identity drift or motion. Karo V2 cells13/14 have10/8 edge ink pixels(alpha≥8). Both V1/V2 held because of unresolved perspective/hair/beard/neck geometry; no art approval.

## Independent source/art consultation

Agent Confucius01a11a25-dec6-7752-9e71-c1a725bb871d, read-only, closed after follow-up. It inspected V1 and four native body PNGs, finding Lila9→10 ponytail switch/shorter silhouette, Karo8→9 large angle change, both clustered/nonmonotonic angles and missing neck seam. V2 parent inspection remains held; no independent V2 art acceptance claimed.

Source review found P1 import accepted a different displayed actor and three P2: download race discarded edits, writer persisted before checking provenance and findings lacked version ownership. Corrections: displayed-source wrapper on client/server; snapshot download/live-edit and import revisions; shared source precondition before persistence; version-specific findings. Follow-up: “All four findings are closed by source inspection. No remaining P1/P2 findings in these corrections.” Review remains bounded, not whole-product certification. No code/run/browser/test/API/pose/render/media performed by agent.

## Source verification actually executed

- npm run build:4b75d3/session24743, completion8734d9, exit0; Vite32 modules,469ms. This includes core and Studio TypeScript.
- npm run test:typecheck:843b39/session16659, completion8715e7, exit0, tsc -p tsconfig.tests.json. Scripts/head-turn-inventory included explicitly. NO callbacks. Earlier TS7056 inferred schemaLibrary declaration length failed1c5e55; explicit Record<string,z.ZodTypeAny> corrected, final fresh typecheck passed.
- npm run schemas:011293 exit0;4 head-turn schema JSON files.
- node --import tsx scripts/head-turn-inventory.ts:944bb1 exit0, output:
  {"materials":4,"cells":64,"alpha":"measured-original-RGBA","yawMeasured":false,"registered":false,"productionReady":false,"motionVerified":false}
- node --import tsx scripts/prehistoric-pack.ts:4373cd exit0; nativeHeadTurnStudies inventory added separately from legacy12 candidates.
- e97138: source whitespace + static manifest/code SHA checks exit0; all4 head-turn code hashes match, topic0.45,4 materials, productionReady=false, productionRig=null.
- Static repair metadata0e0b8e: all16 pixel cell hashes changed per actor; Karo2 edge counts10/8.

No test callbacks, source/body compiler/evaluator/sampler, browser/server/API pipeline, audio/TTS/ASR, video render or new MP4 were executed. The14 declared callbacks and browser/source failure checks remain NOT RUN. No continuous head-clock schema/selection/renderer registration exists yet. This source checkpoint does not fulfill the full3-input production/video goal.

## Publication

Source commit `6e196f7ab73de111f9d0865e3fdc1346f4378f18`,34 owned paths, aaeb61; push c88b2f exit0 to GitHub branch codex/prehistoric-life. Full SHA local/remote exact verification succeeded; tracked/staged source clean. Source0.45 includes all code/assets/schema described above; this publication follow-up edits documentation only. Unrelated untracked files and protected D:/github checkout retained. See NATIVE-HEAD-TURN-HANDOFF.md for startup on8861, test commands and remaining implementation. Full product goal remains active/unfinished.
