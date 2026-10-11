# Character source layers and replacement arms — 11 October 2026

## Delivered slice

The human asked to remove the old arm and install better arm artwork. The new source-preparation contract supports a closed numeric `ink-arm` replacement; raw source bytes remain separate and immutable. Rest posters also contain the replacement, preventing the old arm from popping back at frame zero/recovery. The Canvas painter supports hierarchical parts, absolute keyframe seeking and quintic easing. A local standalone exporter follows each manifest's real dimensions/clock and marks its result as a silent candidate.

Both real Lila/Karo reference PNGs were reused. Their image-right arms use two straight rounded strokes and a new mitten-style hand. The opposite arm, source head and legs are fixed. This is a single gesture study, not full acting, head turning or final production. Candidate matte/manual polygons are used; no automatic semantic arm segmentation is claimed. Source RGB is preserved rather than regenerating a character every frame.

## Verification

- `node --import tsx --test tests/image-motion-character.test.ts tests/image-motion.test.ts tests/image-motion-editor.test.ts`: **12 passed,0 failed**, `focused.txt`. Real browser tests check connected elbow, cleared old location, deterministic seeks, return to rest and static clothing RGB; preparation tests check original bytes, layer reuse on timing changes, invalid disconnected replacement segments and corrupt cache refusal. Existing image-intake/editor/surface tests remain passing.
- `npm run build`: **exit0**, core and Studio TypeScript plus Vite; `build.txt`.
- `npm run test:typecheck`: final output in `typecheck.txt`. The old untracked `tests/native-support-gait-continuity.test.ts:13` still has two TS18048 errors (`a.paths`, `b.paths`). This is **not** an all-repo test typecheck PASS. The two uploader ElementHandle typing errors exposed in the previous editor test were fixed with an input-specific selector; its real browser case was rerun and passed, `editor-upload.txt`.
- CLI render on both actors: **exit0**, H.264 yuv420p,640×800,60 fps,360 frames,6 seconds, no audio; ffprobe/count_frames and full FFmpeg decode passed. Each exporter reported zero browser/decode errors and exact repeated random-seek PNG. Copies of `qc-report.json` are attached; local movies are under `runtime/image-motion/character-candidates/{lila,karo}-new-arm-v4/demo.mp4` and are not committed.
- Real source study at0/1600/2500/4200/6000 ms: source-face RGB and sampled clothing RGB changed **0 pixels** for both actors; ending rest raw pixels equal starting rest. Boxes: Lila face(237,94)–(379,238), clothing(200,405)–(267,440); Karo face(160,94)–(316,248), clothing(178,305)–(244,360). These checks do not cover the entire silhouette. `source-inspection.txt`, per-actor inspection JSON and contact sheets record this bounded evidence.

After preparing both default v4 outputs, reproduce the source comparison with `node --import tsx docs/validation/2026-10-11-image-motion-character/inspect-source.ts`. It uses the existing local Chrome path and writes diagnostic frames/checks under runtime; it does not call a model or TTS provider. It asserts exact source-face and sampled clothing RGBA, plus the rest comparison. Contact sheets are resized for viewing, not used as pixel-exact evidence.

The first replacement test failed because the old arm remained in the rest poster; `replacement-red.txt`. Earlier articulated browser rendering failed before the part painter was implemented; `renderer-red.txt`. Earlier source preparation emitted no parts; `preparation-red.txt`. The initial exporter emitted no frame count; `export-red.txt`. Those missing behaviors were implemented and checked in the final focused suite.

Actual art inspection also caught repair bands and fractional static-clothing color drift. The v3 Karo study changed505 sampled clothing pixels during motion while the face stayed exact; `clothing-color-red.txt`. Paper-only harmonic background repair reduced the horizontal bands. Static source occlusion now preserves baked RGB without adding another fractional candidate alpha. v4 measurements returned zero changed clothing pixels, and a real browser regression fixture checks this behavior. This is not evidence of a perfect clean plate on a textured scene.

## Reuse and quota

One bounded source-code proposal was requested from the user's 9router `coder` combo. It returned `gpt-6-luna`:7626 prompt +2276 completion =9902 tokens. It proposed the exporter and did not execute tests or review human motion quality. The proposal was inspected and applied with local corrections for browser typings, nullable pipes, JPEG MIME, encoder/EPIPE/backpressure cleanup and the probe-array type.

No image-generation, paid TTS or image-to-video call was used in this slice. Existing candidate matte SVGs were rasterized into a mask cache; original PNGs were reused. Timing-only reuse is checked by the cache test, including unchanged cached-file mtime/hashes. Revisions preserve earlier local outputs; new artistic/code changes can invalidate derived assets, but ordinary timing changes do not regenerate source pixels.

## Known limits and next work

Artistic acceptance is pending. The shoulder edge, static occlusion, hand proportion and rhythm require human viewing at actual speed. Head/body/legs do not yet participate in the gesture. The opposite arm partly overlaps hair and needs its own occlusion preparation before replacement. Portrait paper backgrounds and fragments at the source-sheet crop edge remain; these are diagnostics rather than finished story scenes.

The Studio editor still handles surface rotation only. General polygon/layer/arm authoring, clean-plate upload, asset/pose approval locks, shot/narration binding and final video production through this renderer remain to implement. Full scope remains script/WAV/story→script, SRT compatibility, actual-audio timing, EN/VI/JA/KO/local/external TTS, actors within their stories, subtitles/artifacts, resume/cache/rebuild and final QC. V1 tests do not accept this new flow.

Estimated whole-project implementation coverage for this commit: **about42%**, up from about40%. This is a rough scope estimate, not an artistic quality score or acceptance percentage. `productionReady:false`, `qualityAccepted:false`; the overarching goal remains active. Unrelated unfinished rig files, checkout D, user Studio8850 and existing production locks were not changed.

Instructions: `../../topics/IMAGE-MOTION-CHARACTER.md`; revised plan: `../../plans/2026-10-11-image-motion-character-actions.md`. Source/asset hashes are in `source-hashes.json`. No credentials, browser profiles or runtime projects are included.
