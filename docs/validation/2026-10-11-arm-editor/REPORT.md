# Project arm editor — 11 October 2026

Implemented manual replacement-arm authoring on uploaded PNG/JPG sources. The separate page is `/api/projects/:name/image-motion/arms/editor`, linked from the surface-rotation editor. A user can mark the old arm, place shoulder/elbow/wrist, adjust ink width/hand size/angles, supply static occlusion polygons or a matching clean plate, save, compare the source, play/seek and reopen the saved definition. Up to four arms are supported.

This is a usable authoring slice, not production acceptance. `productionReady:false`, `qualityAccepted:false`. No automatic semantic arm segmentation, hidden-body reconstruction, full-body acting, narration-clock binding or final story export is claimed. Input/source bytes remain intact; derived previews and layers are versioned and checked by hash. An optional clean plate only replaces the erased region. Missing usable paper or transparent replacement pixels stop preparation without saving an arm definition.

## Verification

Executed in the isolated `stickman-acting-v22` worktree with Node24.19, Sharp, puppeteer-core and provisioned Chrome154. Local FFmpeg/ffprobe at `C:/ffmpeg/bin` exported the diagnostic clip; no paid image/TTS/video pipeline was invoked.

| Check | Result and evidence |
| --- | --- |
| Focused image/arm suites | 17 tests, 17 passed, zero failed: `focused.txt` |
| Build | Exit0: core TypeScript, Studio TypeScript and Vite; `build.txt` |
| Whole test typecheck | Exit1: two existing TS18048 errors in untracked `tests/native-support-gait-continuity.test.ts:13`; `typecheck.txt`. No remaining type error in this slice. |
| Real browser authoring | Upload, polygon clicks/finish, numeric joints, invalid draft, save lock, source comparison, deterministic seek, reload/clean-plate restore, reduced-motion paused and no page errors. Included in focused suite. |
| Responsive UI | 375/800/1280px screenshots, no horizontal overflow, inspected. These use a synthetic fixture to check controls; not character-art acceptance. |
| Actual Lila source | Face-region RGBA unchanged at0/1300/2500/4300/6000ms; `actual-source.json`. Source SHA256 `85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce`. Bounded face check does not accept every cut edge. |
| Diagnostic MP4 | Silent6s,430×766,60fps,360frames; decoded without errors; random seek PNG exact; `lila-qc.json`. First/end pose hashes match. |
| API failures/cache | Stale revision, busy project, invalid geometry/extra code fields, missing paper/plate, transparent plate, corrupt source/asset are rejected. Repeated definition reuses the derived key; lower-level timing-only reuse remains covered by character tests. |

Actual source project: `arm-editor-lila-03`, served locally on8858. Clip: `runtime/image-motion/character-candidates/lila-editor-v3/demo.mp4`. Project/catalog/media remain local and ignored by Git. Instructions and restart commands: `../../topics/IMAGE-MOTION-CHARACTER.md`.

The initial API test failed with404 before the arms endpoint existed (`api-red.txt`). The first browser run caught an invalid regular-expression escape in generated JavaScript (`browser-red.txt`). The corrected focused suites exercise the implemented behavior rather than relying on the delegated proposal.

Art inspection caught a broad erased strip near hair and an out-of-frame hand in the first general-editor sample. The Lila03 sample uses a tighter lower-arm region, source occlusion, a shoulder point meeting the remaining source outline and smaller motion extent. Compare `lila-rest.png` and `lila-gesture.png`; all candidates reused the same source bytes. A small region near hair/shoulder and the stylized hand still require human review. No claim that this matches the Facebook sample or achieves natural acting.

## Delegation and scope

One bounded9router `coder` request returned `gpt-6-luna`, with8389 prompt +6954 completion =15343 tokens. It proposed the arm-editor page only. The orchestrator implemented the backend/schema/clean-plate preparation, inspected and corrected the UI proposal, ran local verification and documented results. See `delegation.json`; it did not perform runtime or artistic review. No retry, image generation or paid TTS call in this slice.

Old rig modifications, reference artwork, checkoutD, user Studio8850 and existing production projects were preserved. Only image-motion implementation/docs/test/evidence changes are included in this delivery. The isolated8858 server was restarted to load the new editor; the prior project/catalog remains available.

Estimated whole-project implementation coverage: **about45%**, previously about42%. This is a rough scope estimate, not video quality or acceptance. Full scope remains script/WAV/story→script, SRT compatibility, EN/VI/JA/KO/local/external TTS, measured-audio timing, actors in stories, subtitles, final MP4/artifacts, resume/cache/rebuild and QC. Prepared image/layer binding to shots, approval locks, narration clock and final production through this renderer remain to implement and accept. This delivery handles the requested arm editor; the complete factory is not marked complete.

Code hashes and source/asset identities are in `source-hashes.json`. Git commit/remote verification is reported at handoff. No credentials or browser profiles are included.
