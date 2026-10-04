# Renderer migration — independent result, acceptance still open

Source `9b94593432eecb7afdb341d70190cacd1354d8b2`, archived baseline `1d2f915e70d5504d0b2a20c4f3b5c0984dfd3e4a`. Independent model ran actual baseline production to SCENES_READY, then current public resume on the same project. No fabricated fingerprints, renderer tags or counters. Existing real English Windows David audio/cache was reused; TTS endpoint remained closed. Dependencies were shared, not freshly installed.

Original result: **7 PASS / 3 FAIL**. Unlocked resume detected visual change and rebuilt scene identity; narration, audio, inactive SRT sidecar, speech activity, voice cache and configuration bytes stayed unchanged. Actual selected-shot CLI rebuild passed. This fixture uses offline planning and does not demonstrate new projection artwork or full-film quality.

**Lock gate FAIL:** a genuine old scene with storyboard/shot/actor locks still returned SCENES_READY with its old scene input hash. Locks and scene bytes were retained, but no explicit conflict was returned. This is a stale-scene metadata acceptance; locked DONE/final delivery was not exercised. A current-renderer identity preflight must reject the conflict before changing approved artifacts, without automatically unlocking or rewriting the scene.

Host byte preservation and composite locked preservation also failed. Read-only diagnosis found identical git blob and `host-svg-2.2.7` compiler, but archived MD has LF while checkout has one CRLF, and profile source paths differ between runtime roots. Host fingerprint intentionally hashes source bytes. These differences confound a strict renderer-only host migration claim; they do not establish a semantic host change. Original failures remain unchanged. Follow-up must use genuinely identical profile bytes/provenance from its initial baseline production.

Evidence: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/renderer-migration-9b94593-20261004/run-20261004T021833Z/REPORT.md`, raw `results.json`, receipts and immutable baseline. Audit child exited1; build exited0. All83 sampled owned process identities were terminal; source hashes unchanged. Freeze released02:32:39UTC; report persisted02:33:27UTC before original02:33:33 deadline. No new runtime job after cutoff.

Not run here: full MP4/playback/listening/QC, native story quality, active SRT/WAV acceptance, Studio rebuild API, locked DONE and actor-only isolated matrix. New code and old technical DONE/QC cannot close these acceptance items.

## Follow-up implementation

After both real source9b steam producers terminated, a read-only identity preflight was added to the pipeline before state/host-approval reset, and to `buildScenes` before any batch publication. It handles global scene/storyboard locks, shot aliases and `shot.locked`; a missing/unvalidated record or partial approved bundle blocks. Exact compatible locks still work. No renderer/QC threshold, audio hash, approved scene or old failed evidence is rewritten. Build/typecheck completed after the final patch; independent runtime is tracked separately at `locked-scene-preflight-followup-20261004`, not counted as the original audit passing. See [operator guidance](../LOCKED-SCENE-RESUME.md).
