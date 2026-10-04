# Tool tổng quát — source và kiểm tra ngày 04/10/2026

Trạng thái **PROGRESS**, mục tiêu sản phẩm chưa hoàn thành. Chủ đề/câu chuyện → viết kịch bản → narration → phân vai → video; người que là diễn viên. Máy hơi nước/ô tô chỉ là fixture. Runtime do model độc lập thực hiện; người triển khai chỉ build/typecheck, đọc evidence và sửa source.

## Snapshot và thay đổi

Base Git `9b94593432eecb7afdb341d70190cacd1354d8b2`, worktree `codex/stickman-acting-v22`. Nhánh idea dùng model router/journal/budget hiện có, cache theo nguồn/ngôn ngữ/model/brief; full script bypass writer. Studio, API, CLI có editor/upload, xem kịch bản trước TTS, promote thành nguồn script, provenance và download freshness. Clock dùng audio đo thật.

Director23/explanation2.2.2 thêm sourced sceneIntent, vai fictional, cảnh chỉ có diễn viên và bỏ researcher/sentence-card mặc định khi có cast nguồn. Không âm thầm đổi operation thất bại thành chỉ tay. Sau runtime FAIL dưới đây, director24 sửa camera seed đo cả cast, giữ choreography đối tượng khi caller chưa gắn cast và bỏ property sceneIntent=undefined khỏi serialization. Các sửa24 **chưa được runtime kiểm tra lại**; không gọi là đã khắc phục hoàn toàn.

## Evidence đã đọc trực tiếp

Raw evidence ngoài repo giữ nguyên. Hai worker bị usage limit trước khi viết báo cáo cuối; parent đọc log, command arguments, exit receipts và test bytes, không suy ra kết quả từ trạng thái worker.

| Snapshot / command | Kết quả thực | Phạm vi |
|---|---|---|
| Authoring ban đầu, focused import | exit1, 0 PASS / 1 FAIL | `.extend is not a function` sau schema chuyển sang ZodEffects; không test body nào chạy |
| Authoring ban đầu, isolated imports | exit1, 12 PASS / 10 FAIL | Effects import chặn API/CLI; giữ raw failure |
| Core follow-up ban đầu | exit0, 1 PASS | cache/public runPipeline, không thay API/CLI acceptance |
| Stable source23, `node --import tsx --test --test-concurrency=1 tests/topic-authoring.test.ts` | exit0, 23 PASS / 0 FAIL | public API, source CLI, cache, input selection, revisions/busy/mixed upload, freshness, synthetic PCM clock |
| Stable source23, `node --import tsx --test --test-concurrency=1 tests/locked-scene-migration.test.ts` | exit0, 15 PASS / 0 FAIL | batch preflight, lock aliases/partial records, initial public build; browser scene validation mocked |
| Source23, story-actors/actor-studio/creative-director/creative-settings | exit1, 63 PASS / 42 FAIL | 40 failures model reaction/contact in old setup; 2 serialization comparisons differ by optional undefined property |
| Generic scene run1 | exit1, 5 PASS / 29 FAIL | immediate fixture direction camera failure prevented many later assertions |
| Generic scene run2 | exit1, 28 PASS / 8 FAIL | 7 actual two-actor camera failures; 1 test setup selected diagram while asserting cinematic presenter rejection |
| Corrected diagram setup, same rejection assertion | exit0, 1 PASS | final test selects cinematic presenter; does not resolve the 7 camera failures |
| Final parent source24 `npm.cmd run build` | exit0 | core TypeScript, Studio typecheck and Vite; runtime NOT RUN |
| Final parent source24 `npm.cmd run test:typecheck` | exit0 | test sources compile; runtime NOT RUN |
| Final parent source24 `npm.cmd run schemas` | exit0 | generated JSON schema shape; source validators remain authoritative |

Authoring test bytes SHA256 `D548F859DD8D7E7103EB1E81DF93DA34AA54E2C8DBC265C66D41C709C38D41F4` unchanged during stable run. Lock test SHA256 `3F03F4F79CFDBA20149EB3CF96556E4AADB928096D07F877595D76FA6BBF8909`. Final generic test SHA256 `E7EC3056CECA6C42929331B0522377DE02C54420471181B101331A215403E75B`; intermediate copies retained. The final generic file was typechecked, but its full runtime command has not passed.

Evidence roots under `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/`:

- `topic-authoring-20261004/run-20261004T035621Z/`: original report/import failures/core scope.
- `topic-authoring-20261004/follow-up-stable-20261004T042200Z/`: exact args, stdout/stderr, exits, PID/creation samples, retained HTTP/CLI/project fixtures.
- `general-scene-runtime-20261004-042158/`: both raw failing runs, corrected diagram check, scoped compile exits and test copies.
- `generic-scene-implementation-20261004/`: production diff/hashes and compile results before runtime.
- `general-story-parent-20261004/`: parent build/schema/source hashes, quota interruption and operational Studio receipts. One PowerShell receipt metadata construction error (`runtime=false`) was corrected separately; it is not a build or runtime test failure.

Source23 tests called deterministic local HTTP writers and synthetic PCM TTS, no paid/native generation. They prove adapter/control/cache/clock behavior, not writing quality, translation, real speech, factual accuracy or full films. Source24 changes visual routing/version; all affected runtime evidence remains pending on24.

## Handoff on source24

Run unchanged topic-authoring and lock suites again on the published fingerprint, then the full generic-story file and four related suites. Preserve failures; do not weaken source/contact/camera assertions. Verify two actors fit both rigs through public createStoryboard and secured renderer, full script clock/text stays unchanged, and old caller-supplied cast retains actual contact order. The camera seed uses complete cast bounds; authored/model camera plans still use validation and cannot silently bypass cropping errors.

Then test real model output for everyday, fiction, history and natural knowledge through Studio → final. Review complete films at normal speed with audio: purposeful acting, expressions, readable objects, continuous movement, subtitle/audio fidelity and story clarity. Test input/edit/resume/rebuild/lock cases and real EN/VI/JA/KO/local TTS independently. No new machine demo, source shape check, green build, technical QC or historical V1 result substitutes for this acceptance.

Studio8850 was restarted from compiled source24 after checking own PID/creation/listener and zero busy projects; all existing projects remain. HTTP200/listener/project inventory are operational evidence only, not browser or visual acceptance.
