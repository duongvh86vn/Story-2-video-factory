# Image preparation editor — 11 October 2026

## Outcome and boundary

Project PNG/JPG intake, original-byte storage, ellipse/pivot/speed editor, local preview, save/reopen and Studio entry are implemented. Original0002.png from the human-supplied old project opened at1920×1080 in the real editor; a real Chrome browser opened that editor through the new Studio button. Server8858 has its own runtime project root. User Studio8850 and checkout D were not changed.

**This is surface rotation preparation, not a character animator or a final story video pipeline.** Human selected the original-image direction, then reported it looked stiff and asked for human actions. Character layers, action timing and actual visual approval take priority next; see `../../plans/2026-10-11-image-motion-character-actions.md`.

## Verification actually run

- `node --import tsx --test tests/image-motion-editor.test.ts tests/image-motion.test.ts`: **6 passed,0 failed**, `focused-editor-final.txt`. Real multipart upload, original bytes, duplicate reuse, saved regions, stale revision, incomplete publication retry, corrupt source/busy rejection; real browser upload/drag/numeric controls/save/reload/absolute seek. Browser also holds a real save request in flight to verify controls cannot edit/switch while it completes, and checks interrupted drag discard warning and duplicate upload selection.
- `npm run build`: **exit0**, core TypeScript, Studio noEmit and Vite69 modules, `build-editor-final.txt`.
- `npm run test:typecheck`: **exit2**. Two TS18048 errors in pre-existing untracked `tests/native-support-gait-continuity.test.ts:13` (`a.paths`, `b.paths`). No test-source type error in the editor files was reported. This is not an all-repo typecheck PASS.
- `node --import tsx --test tests/server.test.ts tests/sprite-motion-catalog-api.test.ts`: **11 passed,1 failed**. Existing `preview blocks junction escape... ranges` expects206 for a fabricated final.mp4 but receives409. The download evidence gate is unchanged by this patch; baseline runtime was not rerun, so the failure remains reported rather than marked resolved. The six sprite-catalog API tests passed. No final-evidence gate was weakened to make this fixture pass.
- `node --import tsx scripts/image-motion-editor.ts --source <human-source>/images_fullhd/0002.png`, followed by reopening the same project with the script without `--source`: server bound8858, original reused and saved drive-disc region retained. `studio-entry.json` records the actual Studio-button browser check and source ID.

Red evidence: absent route404 vs201; absent file control; save-in-flight source switch enabled; duplicate upload reopened last catalog item instead of the uploaded source. Fixed the actual save/duplicate failures and reran the focused suite. The earlier save harness attempt had a request interception listener cleanup error, and a later run was cancelled because its drag coordinates were measured before page scrolling; neither is claimed as passing evidence. The harness now scrolls before measuring and has bounded timeouts.

## UI verification

Intent: original image is the main workspace, controls remain readable, no decorative/autoplay motion, numeric controls supplement pointer selection. Screenshots `editor-1280.png`, `editor-800.png`, `editor-375.png` use a synthetic100×80 test image, not human artistic acceptance. Actual human source: `user-source-editor.png`. The375px screenshot was inspected: controls stack, labels/buttons are readable, there is no horizontal overflow. Automated overflow checks passed at all three widths. Reduced-motion context starts paused.

Measured contrast: body/page13.34:1, labels/white10.31:1, primary button6.70:1, border/white4.83:1. Visible focus styling is present; exhaustive keyboard/screen-reader audit was not performed. Tests exercised field input/change events, not every physical keyboard navigation path. Loading/saving disable mutable controls; errors/revision conflicts are shown in a status area.

## Bounded 9router review

One static source-only `tester` call returned model `gpt-6-luna`,10166 prompt +329 completion tokens. Proposal is copied as `tester-review-proposal.json`; it examined the earlier version, before the save/duplicate corrections. It did not execute the tool or inspect human video quality.

The three alleged defects were not supported as phrased: pointer-up already marked dirty; pointer coordinates already clamped both endpoints; immutable upload already reused matching orphan files. Separate tests verify edge bounds and orphan retry. An adjacent interrupted-pointer move case was strengthened and verified. Independently reproduced the real in-flight save and duplicate-selection bugs and fixed them. No extra automatic model retries or image/TTS calls were made for these runtime checks.

## Remaining before use

Mask/layer/clean-plate preparation, original character gestures/expressions and human motion approval; narration-clock/shot binding; story→script, original script/WAV/SRT paths through this renderer; actual voice/subtitles/final QC/cache/resume/locks. Current catalog reports `productionReady:false` and does not reset production state or silently replace the existing renderer. Whole project remains incomplete. Progress estimate stays about40%; this measures rough implementation coverage, not40% artistic quality or final acceptance.

Source file hashes are in `source-hashes.json`. Generated videos, runtime project state, browser profiles and credentials are not committed.
