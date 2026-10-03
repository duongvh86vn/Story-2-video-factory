# CLI capture repair and current acceptance — 04/10/2026

Two genuine diagnostic defects were found on code6c1de03 / HEAD38c756d. A valid quota event followed by malformed JSONL bypassed classification and invoked the configured fallback. A truncated capture discarded the same fatal category. Original failing assertions and raw results remain unchanged in the independent audit evidence.

`packages/models/codex-cli.ts` now routes both failure boundaries through the existing restricted diagnostic writer before returning an error. Recognized account/configuration categories and the local diagnostics-storage gate remain recovery-required. Unknown malformed/truncated output still rejects with the previous error code, message and retryability; generated content is never accepted from an incomplete capture. Successful startup diagnostics remain nonfatal.

## Independent verification

Tested source SHA256 `05b73511b757d8e9b279756704696b99268f6ad3472421b2e81eb14bd4d2c427`; imported compiled adapter SHA256 `1cddf7d24b5c96974c34c6d871c0736125ece9eb94c6843df1744a5f1bc16358`. Parent build and whole test:typecheck ended exit0; parent ran no runtime tests.

Independent byte-identical rerun used fresh fixture/journal/counter directories and preserved the complete old audit tree:

| Scope | Actual result |
|---|---|
| Original capture-edge assertions | 3/3 PASS; original run retained 1/3 PASS, 2 FAIL |
| Original diagnostics assertions | 14/14 PASS |
| Untouched Codex/Claude/model/retry/pipeline regression | 48/48 PASS, executed once |
| Separately added boundary coverage | 13/13 PASS |

Supplemental coverage includes a real fake executable exceeding the production8MiB capture limit: recognized quota stops fallback and ordinary resume; explicit recovery retains the journal prefix and retry marker. It also covers all four fatal categories at both new boundaries, unknown rejection, generated-prose immunity, private capture data and real journal-path obstruction. Original scripts/executable are byte-identical to their copies; all worker jobs have terminal receipts. These counts are scoped and do not certify the whole product.

Evidence: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/diagnostics-draft30-38c756d-20261003T112312Z/REPORT.md` and `capture-boundary-rerun-38c756d-20261003T184658Z/REPORT.md`. The latter retains command/PID/creation-time/exit records, script-copy proof, compiled-import proof and before/after hashes. The independent model also added portable `tests/codex-diagnostics-captures.test.ts`: 5/5 PASS and whole test:typecheck exit0, each executed once. It uses genuine public adapter/router/journal behavior with constructor-injected captures, no hardcoded roots or real provider; production and old assertions remained unchanged. Separate report: `portable-capture-tests-38c756d-20261003T185958Z/REPORT.md`. Its five cases are not another whole-product suite or a repetition of the actual8MiB subprocess proof.

## Draft30 evidence

The unchanged6c1de03 initializer now has independent real evidence: CLI and API creation resolve cinematic/actors with draft30fps, inherit960×540/quality=draft, retain old15fps behavior and honor explicit24fps overrides. The public renderer produced one second with all30 PTS at `i/30` and30 different decoded frame hashes, without conversion or frame duplication. A whole new story through DRAFT_RENDERED, API-created media, speech and arbitrary-input quality were not tested by that measurement composition.

## Whole-film quality remains open

Independent review of the four immutable authored films covered all30 shots through inspected context images, dense movement windows and both sides of cuts. Every movie decoded through its end. It did not inspect every extracted frame, watch full30fps playback or hear the narration.

- Steam stickman/robot: PARTIAL. At13.5s the condenser label intersects the bench. At21.1s the robot obscures1769 on the patent; the factory beat still needs clearer physical consequence.
- Car stickman/robot: FAIL against requested acting/story quality. The final reading scene holds a presenter pointing at text cards for about2.8s. Replace it with physical inspection of a concrete sourced artifact and a visible result; retain the narration's historical caveats. Robot roles also need clearer visual distinction.

Raw review evidence and exact four media hashes are in `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/full-film-quality-38c756d-20261003/REPORT.md`. Both audit time bounds were missed and are reported; the interrupted quota turn is retained. The withdrawn Benz-reset finding remains withdrawn. No authored film is relabeled native or fully accepted.

## Native production state

Small default CLI readiness passed once in9.346s at11:25UTC03/10, with actual exit0 and unchanged account/model. Later steam generation returned structured responses but ended exit1 on a measured usage-limit error at11:50UTC; no accepted storyboard/final resulted. Car returned one structured response, then its original tool handle disappeared and the factory-lock owner PID18128 was absent on revalidation. Its pending model record and unknown billing remain intact; no terminal exit is invented. Earlier six600s timeouts retain UNKNOWN cause.

With app availability changed, the existing car project continued through ordinary bounded resume, preserving pending history and attempt/call limits. It did not reset a retry cycle or manually edit the journal. The original reservation was handled by the production lock mechanism only after its owner and descendants were confirmed absent. A new native attempt2 completed in595,848ms and the pipeline rendered MP4. Producer session52391 ended exit1 at19:21:26UTC03/10 in FINAL_RENDERED: technical QC reports unexpected frozen frames at23,900–29,066.667ms. The factory lock was released; there is no DONE or accepted final. Preserve that MP4/report and repair motivated motion; do not label the interval planned-static or weaken QC to pass. Receipt: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/native-car-bounded-resume-20261004/`. This is genuine production, not a runtime test. Readiness, router success and rendered media do not prove complete acceptance.

Full native films, visual repairs, full playback/listening, current input/edit/lock matrix, Vietnamese WAV fidelity and real local voices when configured remain open in [the completion audit](2026-10-03-completion-audit.md).
