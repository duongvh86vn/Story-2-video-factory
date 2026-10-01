# Specification → implementation

`BUILD-SPEC.md` hiện là đặc tả V2 ngày 2026-10-01: robot mini/người que dẫn chuyện giải thích từ WAV/SRT. Các yêu cầu mới chưa được coi là đã triển khai. Bản đồ này phân biệt phần cần sửa cho V2 với nền tảng V1 đã có; không phải kết quả runtime acceptance.

## Đặc tả V2 và khoảng cách hiện tại

| Yêu cầu V2 | Nền tảng hiện có | Phần cần bổ sung/sửa |
|---|---|---|
| §1–3: narration là đầu vào chính; source MD tùy chọn; final có voice | `packages/ingest`, `scripts/asr.py`, `packages/audio` | Bỏ yêu cầu source MD bắt buộc; canonical story từ narration; voice resolver/TTS và needs-voice |
| §4: host từ MD, rig/pose/hash/duyệt | `library/characters/MINI-ROBOT.md`, `library/characters/STICK-MAN.md`; character/assets/locks V1 | Host profile schema/compiler; rig SVG có khớp; preview sheet; tách host khỏi subject actors |
| §5–8: giải thích, host actions và target anchors | `packages/story`, `packages/storyboard`, `packages/core/schemas.ts` | Explanation goals/entities/relations; host timeline; visualization model; gesture/contact/gaze target validators |
| §9–10: recipe host và fallback giữ ý nghĩa | `library/shots`, `packages/scenes`, `packages/render` | Recipe explainer, host controller, builder/controller cho part diagrams; fallback không bỏ host |
| §11–12: artifacts/config V2 | `packages/core/config.ts`, state store/hash | Schema mới; host/voice/interaction artifacts và invalidation; không âm thầm bỏ option chưa hỗ trợ |
| §13: Studio chọn/duyệt host và voice | `apps/server`, `apps/studio` | Chọn profile MD, preview rig, voice status, storyboard lời kể/hình/hành động |
| §14–15: nghiệm thu explanation/host/sync và hai bài thực tế | `packages/review`, `packages/qc`, test hồi quy V1 | Review semantic/temporal cho interaction; voice gate; acceptance hơi nước/ô tô với cả hai host |
| §16–17: rollout P0–P5 | Nền tảng bên dưới có thể tái sử dụng | Triển khai và nghiệm thu riêng theo V2; test V1 không xác nhận trải nghiệm mới |

## Bản đồ triển khai V1 để tái sử dụng

Các số mục trong bảng dưới trỏ tới [đặc tả V1 lưu trữ](docs/archive/STORY-TO-VIDEO-FACTORY.v1.md), không trỏ tới số mục của `BUILD-SPEC.md` V2.

| Yêu cầu trong đặc tả | File/module hiện thực |
|---|---|
| §0–7, 20, 99–103: model-agnostic compiler, structured outputs, configuration | `packages/core`, `packages/models`, `config`, `apps/cli` |
| §8–19, 57–67, 83–85, 118, 130, 152, 161–164: HyperFrames upstream, engine interface, FFmpeg | `packages/render`, `packages/scenes`, `package.json` |
| §21–28, 81, 136–137, 186: MD/SRT/WAV, immutable clock, ASR/alignment | `packages/ingest`, `scripts/asr.py`, `packages/captions` |
| §29–38, 109–111, 115–117, 138–139: story/chapter/beat/shot constraints | `packages/story`, `packages/storyboard`, `packages/core/schemas.ts` |
| §39–43, 72, 106–107, 134, 145, 175–179: locked character/pose/version and series | `packages/story/characters.ts`, `packages/assets`, `packages/orchestrator`, `series`, Studio editors |
| §44–48, 74–75, 149–150, 180–182: asset priority/hash/provenance, factual boundaries, optional providers/research | `packages/assets`, `packages/orchestrator/research.ts`, model prompts and story validators |
| §49–56, 133, 141: JSON/Markdown storyboard, recipe-first eight visuals and six styles | `packages/storyboard`, `library/shots`, `library/styles`, `library/components`, `library/transitions` |
| §58–67, 86–87, 93–98, 112–114, 124–128: bounded model/code repair, scene cache, runtime isolation | `packages/scenes`, `packages/models/registry.ts`, `packages/render/process.ts`, pipeline |
| §68–73, 82, 97, 144: five snapshots, contact sheets, rule/vision review and high-only repair | `packages/review`, `packages/scenes/index.ts` (`repairScenes`), `packages/orchestrator/pipeline.ts` |
| §76–81, 146: voice/music/SFX, ducking, normalization and caption modes | `packages/audio`, `packages/captions`, FFmpeg adapter |
| §88–92, 101, 124–125, 158–160: persisted states, resume, SQLite, log/cost/production reports | `packages/orchestrator`, `packages/models/journal.ts`, `project-state.json` at runtime |
| §104–107, 148: project status, preview/timeline/editor/manual overrides, locks and approval | `apps/server`, `apps/studio`, CLI edit/lock/approve |
| §119–123, 147: ffprobe/audio/black/freeze QC | `packages/qc` |
| §129, 132, 159, 165: Windows setup, configurable V1 bounds, project YAML, ignore outputs | `README.md`, `config`, `examples`, `.gitignore` |
| §135–147, 189–195, 199–201: complete core phases and demo fixture | Modules above, `examples/invention-demo`, `TEST-HANDOFF.md` |
| §153–155: opt-in measurements, roles and fallback routing | `benchmarks/run.ts`, `packages/models/registry.ts`; measurements require execution by tester |
| §170–174, 196–205: repeatable projects, acceptance/quality/performance goals | Pipeline and sample source; numeric acceptance targets delegated to tester |
| §206–207: upstream integration and deterministic/resumable invariants | Pinned renderer dependency, schemas, validators, pipeline and docs |

V1 implement HyperFrames theo §10 của bản lưu trữ; không viết đồng thời Remotion/Motion Canvas/Manim/Blender. Những engine và AI-video vendor được ghi là optional/later trong §17–18, 150–151, 184 của V1 là extension contracts; không tuyên bố đã có vendor integration hoặc metrics khi chưa chạy. Remote asset providers chỉ nhận nguồn/license do người dùng cấu hình; không tự scrape kho ảnh.

Kết quả đã chạy cho V1 xem `TEST-RESULTS.md`; checklist và phần nghiệm thu V2 được bàn giao trong `TEST-HANDOFF.md`.
