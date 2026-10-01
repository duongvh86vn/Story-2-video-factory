# Bản đồ triển khai V2.1

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

Bản đồ này là bằng chứng vị trí source, không là bằng chứng chạy thành công. Build/typecheck và schema export được thực hiện; runtime do model khác kiểm tra theo TEST-HANDOFF.md. Các schema bổ sung không thay validation nguồn/clock/geometry/locks khi chạy pipeline.
