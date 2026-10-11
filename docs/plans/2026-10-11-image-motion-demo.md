# Original image motion demo Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a silent 10-second local MP4 using two original images from the user's old flow_doodle export.

**Architecture:** Keep the source folder read-only. Copy selected images byte-for-byte into a unique output folder; register one opaque wheel surface and isolated gear cutouts, then evaluate Canvas transforms at absolute frame times. Render the same viewer through an isolated local Chrome and stream PNG frames into FFmpeg.

**Tech Stack:** TypeScript, Canvas HTML5/JavaScript, Sharp, locally installed Puppeteer/Chrome, FFmpeg/FFprobe.

## Global Constraints

- Preserve source drawing, colors, faces and costumes. Reuse derived layers across frames; no model, image-generation or TTS calls.
- Demo first, then reconnect story/script/WAV. Do not claim this slice completes the factory.
- Write code only in the attached C worktree. Do not touch the D checkout or Studio at port 8850.
- Decisions for this demo: 1920×1080, 60 fps, two five-second scenes, silent audio; fresh output directory, no overwrite. Invalid assets or failed browser/encoder stop the command with a nonzero exit and retain diagnostic output.
- Manual registered regions are an engineering choice for this small demo, not an automatic semantic segmentation claim. Hidden anatomy/background remains outside this deliverable.

### Task 1: Deterministic source-region compositor

**Files:** proposed `packages/image-motion/scene.ts`, `tests/image-motion.test.ts`.

**Interfaces:** consumes `ImageMotionDemo` (scenes, clock, original/background images, surface/cutout rotation regions); produces `createImageMotionHtml(demo): string`, browser `ready` and `renderFrame(timeMs)`.

- [x] Add real-browser test with a known red spoke. At 250 ms of a one-second clockwise rotation it must be below the pivot; unrelated pixels must be unchanged.
- [x] Run `node --import tsx --test tests/image-motion.test.ts` against a static baseline; record the failed pixel assertion.
- [x] Draw source backgrounds and masked surfaces/cutouts, computing rotation directly from time. Normalize ellipse coordinates so a wheel remains in its original plane. Frame zero must reproduce the original.
- [x] Rerun the same test; also check reverse/random seek and rejection of non-finite times or remote assets.

### Task 2: Reusable layer preparation and local demo export

**Files:** proposed `packages/image-motion/prepare.ts`, `packages/image-motion/export.ts`, `scripts/image-motion-demo.ts`, `docs/topics/IMAGE-MOTION-DEMO.md`.

**Interfaces:** consumes full-HD `0002.png` and `0013.png` from the supplied folder, installed Chrome/FFmpeg; produces original copies, gear alpha cutouts, one prepared background, `manifest.json`, `index.html`, ten-second MP4, sampled PNG frames, QC JSON and report.

- [x] Prepare once: chroma-separate isolated gears in manually bounded regions; fill exposed original footprints using neighboring source background samples and record that repair. Do not animate occluded/meshed gears without their layers.
- [x] Use one opaque drive-disc region in 0002 and four isolated gears in 0013. Preserve all other source content. These are illustration motions, not a validated simulation of the historical mechanism.
- [x] Export exactly 600 frames via a bounded local server/browser and FFmpeg pipe. Save selected frames only; close owned browser/server/encoder on success or failure.
- [x] Inspect sampled frames for clipping, old gear ghosts, missing teeth and moving background; verify lossless compositor pixels outside all allowed regions. Probe/decode MP4 for 1080p/60fps/10s/600 frames and report silence explicitly. Normal-speed visual acceptance remains with the user.
- [x] Run build/typecheck and the focused browser test. Record any pre-existing test limitations separately.
- [x] Commit only demo-owned files and evidence, push the authorized GitHub branch, and report total implementation progress separately from visual acceptance. Git identity and remote confirmation are recorded in the handoff/private execution state.

## Unresolved product decisions

None for the authorized local demo. The user will judge the clip before generalizing this approach to character arms, fire, automatic masks and the complete content-to-video flow.
