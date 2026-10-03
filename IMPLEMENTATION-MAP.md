# Bản đồ code narration và diễn xuất V2.2

> Contract hiện hành ngày 02/10/2026: [STORY-ACTOR-DIRECTION.md](STORY-ACTOR-DIRECTION.md). Người que là diễn viên đóng vai trong câu chuyện; bỏ yêu cầu một người dẫn cố định, quota xuất hiện và kích thước bắt buộc. Ba luồng nguyên văn giữ nguyên. Source2.2.21 đang triển khai/nghiệm thu; evidence presenter cũ không chứng minh chế độ mới đạt.


Bảng đầu là narration/product chung; các module cinematic đã được triển khai ở bảng sau. Bản đồ source không thay nghiệm thu runtime, xem IMPLEMENTATION-STATUS.md.

Thiết kế mở nguồn nền2.2.18; cast2.2.19: `packages/director/creative.ts` gọi storyboard model, gắn cache/candidate binding và giữ locks; `art-direction-schemas.ts`/`art-direction.ts` giữ artwork, labels, pivot và passive SVG. `packages/explainer/visual-sources.ts` giữ nguồn cùng đối tượng xuyên cue và kiểm tra flow ở cue hiện tại. `packages/models/codex-cli.ts`/`claude-cli.ts` là provider native; `library/prompts/creative-director.md` hướng dẫn kể chuyện và tự chọn dàn cảnh. Studio settings/derived reports dùng cùng artifact với renderer.

| Yêu cầu | Source chính |
|---|---|
| Cast nhiều vai, nguồn identity, speech riêng, cut/continuous | packages/actors/schemas.ts, model.ts; packages/director/index.ts |
| Contract input/voice/host/state | packages/core/config.ts, schemas.ts; library/schemas/ |
| Script normalize/chunks/source refs, selected mode | packages/ingest/script.ts |
| WAV/SRT/ASR/alignment | packages/ingest/index.ts, audio.ts, srt.ts; scripts/asr.py |
| Refresh supplemental story, giữ audio | packages/ingest/narrated-story.ts |
| TTS script đo clock; SRT fit, cache, voice gate | packages/voice/index.ts, schemas.ts; scripts/windows-tts.ps1 |
| Rig MD nền/hash/pose/preview | packages/host/profile.ts, rig.ts, index.ts |
| IK target/contact, gaze/mouth/temporal geometry | packages/host/controller.ts |
| Goal/entities/evidence/relationships | packages/explainer/plan.ts, schemas.ts; packages/story/ |
| Comparison English/VI, thermal subject, semantic diagnostic | packages/explainer/configurations.ts, thermal.ts, visual-sources.ts; packages/director/creative.ts |
| Tám recipe/diagram component/layout | packages/explainer/recipes.ts; library/shots/explainer.ts |
| Storyboard/cue anchors/locks/validation | packages/explainer/storyboard.ts; packages/storyboard/ |
| Scene compilation/source integrity/fallback/master | packages/scenes/index.ts, security.ts |
| Review snapshots/action sheets/vision/hash | packages/review/index.ts |
| Mix audio/captions/MP4/QC | packages/audio/index.ts, packages/captions/, packages/qc/index.ts |
| Cache/resume/wait/gates/exports/report | packages/orchestrator/pipeline.ts, settings.ts, state-machine.ts |
| API input editor/upload/voice default/host approval | apps/server/index.ts, artifacts.ts, contracts.ts, jobs.ts |
| Studio ba input tab + host/voice + Create video | apps/studio/src/main.ts, api.ts, style.css, i18n.ts |
| CLI dùng cùng contracts | apps/cli/index.ts |
| Hai bài mẫu và SRT authored clocks | examples/steam-explainer/, examples/car-explainer/ |

Bản đồ này chứng minh vị trí source, không chứng minh toàn bộ chạy thành công. Build/typecheck/schema export đã qua ở lần bàn giao V2.1; một số thử nghiệm local sau đó được ghi trong IMPLEMENTATION-STATUS.md. Các schema không thay validation nguồn/clock/geometry/locks khi chạy pipeline.

## V2.2 — module cinematic hiện có

| Phần mới | Vị trí triển khai | Contract và kiểm tra |
|---|---|---|
| Face/gait/action clips | packages/host/ và packages/animation/ | Animation library, rig compatibility, clip preview/version/hash |
| Track compiler/foot plant/blend/attachments | packages/animation/; packages/scenes/security.ts | Performance plan, ownership, stance/contact, deterministic seek |
| Story director | packages/director/; packages/explainer/ | Story direction, source refs, emotional arc, continuity |
| Staging/props/depth/assets | packages/stage/; asset resolver; shot templates | Stage plan, ground/grip anchors, provenance, missing assets |
| Camera và scene emitter | packages/director/camera.ts; packages/scenes/; library/shots/cinematic.ts | Camera plan/safe regions; HTML5/CSS/SVG/JS tracks |
| Acting review và motion QC | packages/review/, packages/qc/ | Preview clip/temporal strips, performance report, ROI verification |
| Studio/API/CLI/resume | Các app/orchestrator hiện có | Cinematic selection, clip editor, new states/artifact producers |

Preview qua production compiler/HyperFrames ở scripts/animation-preview.ts và cinematic-preview.ts; Studio dùng cùng scene/preview bridge. Các capability tương lai vẫn phải có schema/compiler/validator/API trước khi dùng. Chi tiết ở STICKMAN-STORY-DIRECTION.md và V2-IMPLEMENTATION-PLAN.md.
