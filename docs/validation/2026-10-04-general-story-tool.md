# Tool tổng quát — source và kiểm tra ngày 04/10/2026

Trạng thái **PROGRESS**, mục tiêu sản phẩm chưa hoàn thành. Chủ đề/câu chuyện → viết kịch bản → narration → phân vai → video; người que là diễn viên. Máy hơi nước/ô tô chỉ là fixture. Runtime do model độc lập thực hiện; người triển khai chỉ build/typecheck, đọc evidence và sửa source.

## Snapshot và thay đổi

Base Git `9b94593432eecb7afdb341d70190cacd1354d8b2`, worktree `codex/stickman-acting-v22`. Nhánh idea dùng model router/journal/budget hiện có, cache theo nguồn/ngôn ngữ/model/brief; full script bypass writer. Studio, API, CLI có editor/upload, xem kịch bản trước TTS, promote thành nguồn script, provenance và download freshness. Clock dùng audio đo thật.

Director23/explanation2.2.2 thêm sourced sceneIntent, vai fictional, cảnh chỉ có diễn viên và bỏ researcher/sentence-card mặc định khi có cast nguồn. Không âm thầm đổi operation thất bại thành chỉ tay. Sau runtime FAIL dưới đây, director24 sửa camera seed đo cả cast, giữ choreography đối tượng khi caller chưa gắn cast và bỏ property sceneIntent=undefined khỏi serialization. Lượt độc lập trên24 được ghi riêng phía dưới; raw FAIL của23 giữ nguyên.

## Evidence đã đọc trực tiếp

Raw evidence ngoài repo giữ nguyên. Lượt source23 bị usage limit trước báo cáo cuối; parent đọc log, command arguments, exit receipts và test bytes. Cùng worker đã chạy được lượt source24 sau đó; không đổi tài khoản/provider/model để vượt hạn mức.

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

Authoring test bytes SHA256 `D548F859DD8D7E7103EB1E81DF93DA34AA54E2C8DBC265C66D41C709C38D41F4` unchanged during stable run. Lock test SHA256 `3F03F4F79CFDBA20149EB3CF96556E4AADB928096D07F877595D76FA6BBF8909`. Final generic test SHA256 `E7EC3056CECA6C42929331B0522377DE02C54420471181B101331A215403E75B`; intermediate copies retained. The source23 result remained failing; the unchanged final generic file subsequently passed all36 cases on24.

Evidence roots under `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/`:

- `topic-authoring-20261004/run-20261004T035621Z/`: original report/import failures/core scope.
- `topic-authoring-20261004/follow-up-stable-20261004T042200Z/`: exact args, stdout/stderr, exits, PID/creation samples, retained HTTP/CLI/project fixtures.
- `general-scene-runtime-20261004-042158/`: both raw failing runs, corrected diagram check, scoped compile exits and test copies.
- `generic-scene-implementation-20261004/`: production diff/hashes and compile results before runtime.
- `general-story-parent-20261004/`: parent build/schema/source hashes, quota interruption and operational Studio receipts. One PowerShell receipt metadata construction error (`runtime=false`) was corrected separately; it is not a build or runtime test failure.

Source23 tests called deterministic local HTTP writers and synthetic PCM TTS, no paid/native generation. They prove adapter/control/cache/clock behavior, not writing quality, translation, real speech, factual accuracy or full films. Those limits also apply to the source24 protocol checks below.

## Handoff on source24

Current protocol rerun results are below. Preserve failures; do not weaken source/contact/camera assertions. Six prop fixture failures still need a baseline/fixture follow-up. The camera seed uses complete cast bounds; authored/model camera plans still use validation and cannot silently bypass cropping errors.

Then test real model output for everyday, fiction, history and natural knowledge through Studio → final. Review complete films at normal speed with audio: purposeful acting, expressions, readable objects, continuous movement, subtitle/audio fidelity and story clarity. Test input/edit/resume/rebuild/lock cases and real EN/VI/JA/KO/local TTS independently. No new machine demo, source shape check, green build, technical QC or historical V1 result substitutes for this acceptance.

Studio8850 was restarted from compiled source24 after checking own PID/creation/listener and zero busy projects; all existing projects remain. HTTP200/listener/project inventory are operational evidence only, not browser or visual acceptance.

## Follow-up: ordinary props, artwork2.2.6

After published `4f5a480`, source inspection found renderer controls still defaulted to mechanical knobs for generic story props. Even explicit controlMode=none removed the animated knob but retained a fallback `.handle` circle. Source now defaults object/stage/marker props to no renderer controls when actorScene is present; explicit renderer/none remains authoritative. The renderer uses that decision for both knob and marker. Geometry, contact anchors, narrative events and speech clocks are unchanged in this patch. Mechanical parts and legacy presenter defaults retain their compatibility behavior; bound props remain without synthetic controls.

`passive-svg-2.2.6` participates in existing visual fingerprints, retaining narration caching and reporting conflicts with approved locked scenes instead of retagging old scenes. Parent `npm.cmd run build` (session21192, exit0) and `npm.cmd run test:typecheck` (session27667, exit0) observed terminal; no parent runtime tests. No schema shape changed.

Required independent checks: secured renderer HTML contains neither factory knob nor fallback handle for default ordinary actor props or explicit none; explicit renderer and mechanical/presenter defaults retain appropriate controls; compiled target/contact/clock stays exact. Run current actor/generic/creative/source/input/lock regressions with their original assertions. The older transport test checks absence of a synthetic knob for a bound prop only; it does not prove the unbound ordinary-prop case or absent fallback marker.

### Independent rerun on24 + artwork2.2.6

Frozen source: HEAD `4f5a480ebb8732cbc7f13488989e5eac160e4baa` plus the captured renderer/prompt delta; source hashes unchanged throughout. Receipt04:48:24UTC, runtime cutoff04:56:24, report deadline04:58:24.

| Command scope | Actual result | Limit |
|---|---|---|
| Seven unchanged suites: topic-authoring, locked-scene-migration, general-story-scenes, story-actors, actor-studio, creative-director, creative-settings | 179 tests;173 PASS/6 FAIL;exit1 | Topic23, locked15, general36 all PASS; six failures are in old propFixture |
| New story-prop-controls | 7 PASS/0 FAIL;exit0 | Secured HTML/JS and real GSAP in synthetic DOM; no browser layout/film acceptance |
| Whole test:typecheck after new test | exit0 | Compile only |

The old propFixture overwrites gestures without replacing host.actions with the matching single owner. Source-read of prior blobs found the same validation and omission; baseline runtime diagnosis is pending. Production ownership validation and existing assertions were not weakened. Initial new-fixture attempts0/7 and2/7 PASS and initial typecheck exit2 are retained; only its setup/scoping was corrected.

**Procedural FAIL:** the final control job started after the runtime cutoff; report metadata saved04:58:49.578UTC,25.578seconds late. Root jobs actually terminated by04:57:06.925. This is a separate scheduling failure and is not hidden by behavioral PASS. Worker released source freeze with no live owned processes/listeners. No paid/native/backend/browser/full-film checks ran.

Raw root: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/general-story-controls-4f5a480-20261004/run-20261004T044824Z/`, including REPORT.md, source/test manifests, exact argv, stdout/stderr, all exits and release.json. New test final SHA256 `E94E3C693C536CB9657590D41CCA512AF0C5EDC3DE8F91CB04F3DF081C43EE5E`.
