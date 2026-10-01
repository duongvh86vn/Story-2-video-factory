# Bản đồ code V2.1 và phần cần triển khai V2.2

Bảng đầu là source hiện có. Các module V2.2 ở cuối là đề xuất, chưa có implementation; sửa đặc tả/host MD không tự thêm animation.

| Yêu cầu | Source chính |
|---|---|
| Contract input/voice/host/state | packages/core/config.ts, schemas.ts; library/schemas/ |
| Script normalize/chunks/source refs, selected mode | packages/ingest/script.ts |
| WAV/SRT/ASR/alignment | packages/ingest/index.ts, audio.ts, srt.ts; scripts/asr.py |
| Refresh supplemental story, giữ audio | packages/ingest/narrated-story.ts |
| TTS script đo clock; SRT fit, cache, voice gate | packages/voice/index.ts, schemas.ts; scripts/windows-tts.ps1 |
| Host MD/rig/hash/pose/preview | packages/host/profile.ts, rig.ts, index.ts |
| IK target/contact, gaze/mouth/temporal geometry | packages/host/controller.ts |
| Goal/entities/evidence/relationships | packages/explainer/plan.ts, schemas.ts; packages/story/ |
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

## V2.2 — vị trí đề xuất, chưa triển khai

| Phần mới | Vị trí cần tạo/mở rộng | Contract dự kiến |
|---|---|---|
| Face/gait/action clips | packages/host/ và packages/animation/ | Animation library, rig compatibility, clip preview/version/hash |
| Track compiler/foot plant/blend/attachments | packages/animation/; packages/scenes/security.ts | Performance plan, ownership, stance/contact, deterministic seek |
| Story director | packages/director/; packages/explainer/ | Story direction, source refs, emotional arc, continuity |
| Staging/props/depth/assets | packages/stage/; asset resolver; shot templates | Stage plan, ground/grip anchors, provenance, missing assets |
| Camera và scene emitter | packages/scenes/; library/shots/ | Camera plan/safe regions; HTML5/CSS/SVG/JS tracks |
| Acting review và motion QC | packages/review/, packages/qc/ | Preview clip/temporal strips, performance report, ROI verification |
| Studio/API/CLI/resume | Các app/orchestrator hiện có | Cinematic selection, clip editor, new states/artifact producers |

Tên package mới là đề xuất, có thể gom theo kiến trúc repo. Chi tiết ở STICKMAN-STORY-DIRECTION.md và V2-IMPLEMENTATION-PLAN.md. Không đưa field/action tương lai vào config V2.1 khi schema chưa hỗ trợ.
