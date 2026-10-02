# Open Art Direction Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the cinematic director and scene artist freedom to design each story, while judging the delivered video by clarity, acting and visual quality.

**Architecture:** Narration and sourced explanation remain the authority for content and clock. The rule director supplies an editable starting point; a real storyboard model can replace its composition, performance, camera and artwork. Authored SVG layers and timed transforms extend the renderer without imposing a visual preset.

**Tech Stack:** TypeScript, SVG/HTML/CSS, GSAP, HyperFrames, FFmpeg, existing model adapters and Vietnamese voice adapters.

## Global Constraints

- User priority: “hãy mở rộng hết cỡ khả năng thiết kế , đừng bó buộc , tôi cần chất lượng video , chứ ko ép thiết kế”.
- Keep narration verbatim, WAV audio and SRT clock; one recognizable selected host explains the story.
- Existing rigs/clips are reusable ingredients. Eight explanation methods describe intent; they are not eight mandatory scene designs.
- Art direction, palette, scenery, typography, artwork and action sequences can vary per story/shot. Existing host-size and framing ranges are starting guidance; authored compositions use actual visibility/readability checks.
- Clock, source evidence, identity, attachments and deterministic rendering remain reliable. Documents are data. Artwork cannot execute code or fetch resources.
- Preserve the user's original projects and approved locks. Rebuild changed visual artifacts while keeping valid narration/audio.
- Offline drafts must be identified honestly. No claim that a mock adapter demonstrates a real model's design capability, or that technical QC proves aesthetic acceptance.

---

### Task 1: Authored visual composition and actual cue emotion

**Files:** Create `packages/director/art-direction.ts`, `packages/director/emotion.ts`; modify `packages/director/schemas.ts`, `packages/director/index.ts`, `library/shots/cinematic.ts`, `packages/director/camera.ts`; test `tests/cinematic-acting.test.ts`, `tests/art-direction.test.ts`.

**Interfaces:** Consumes canonical `Shot`, `HostProfile`, immutable narration anchors; produces `ArtDirection` with arbitrary descriptive brief, palette, sourced custom model artwork and SVG layers with local timed transforms. Renderer consumes the same canonical artifact for preview and final.

- [ ] Record current emotion/depth regression failures; add custom artwork/security/seek checks before source edits.
- [x] Infer fallback mood from the current anchored cue, replacing the fixed 45-percent curiosity schedule. Real/authored plans can choose expression timing themselves.
- [x] Compose actual background/midground/foreground planes and model shadows. Authored layers may replace the canned stage and labels without replacing host identity.
- [x] Validate markup, references and clock at authoring/render entry; reject executable/unapproved resources. Preserve expressive geometry, gradients, masks and scoped deterministic GSAP transforms.
- [x] Verify focused tests and build/typecheck; do not interpret these as aesthetic acceptance. Source18 independent75/75, test:typecheck and production build pass in their stated scopes.

### Task 2: Let the storyboard model direct narrated cinematic shots

**Files:** Create `packages/director/creative.ts`, `library/prompts/creative-director.md`; modify `packages/storyboard/director.ts`, `packages/stage/index.ts`; test `tests/creative-director.test.ts`.

**Interfaces:** `createCreativeStoryboard(root, config, router, context, seed, locks): Promise<Storyboard>` consumes story/narration/beats/host/rig plus a complete seed; produces a validated authored storyboard, persisted prompt/output/provenance and cache.

- [x] Reproduce the current model bypass with a real-router test double; assert custom composition reaches the production render path.
- [x] Use `planWithValidation` and the configured storyboard role. Supply source and clock separately from inspiration; invite distinct layouts/actions/cameras/artwork, no imposed art style or compulsory recipe sequence.
- [x] Preserve locks and narration/source identity. Validate performance/contact/continuity and actual scene security. Invalid model output is repaired within existing budgets; a real failure does not silently switch to mock.
- [x] Mock remains an explicitly labelled offline seed. Authored assets/artwork can be used by an agent without pretending that an API was called.
- [x] Include creative provenance and model settings in cache inputs; custom scenery avoids compulsory workshop/road plates. Rejected candidate replay also checks primary/fallback settings binding.

### Task 3: Production editing, visibility and documentation

**Files:** Modify `apps/server/cinematic.ts`, `apps/studio/src/cinematic.ts`, `packages/director/index.ts`, `IMPLEMENTATION-STATUS.md`, `STICKMAN-STORY-DIRECTION.md`, `TEST-HANDOFF.md`, `V2-IMPLEMENTATION-PLAN.md`; test API round-trip and invalid plan rejection.

**Interfaces:** Canonical storyboard JSON is the editing contract. Studio shows design brief/provenance/custom artwork and expression/action clock; stage/direction exports retain these authored choices.

- [x] Permit authored framing through actual viewport/target checks; retain stricter defaults for untouched offline seeds. No fixed mood schedule or compulsory visual preset.
- [x] Expose what was authored, model-generated or offline. Keep old media/version migration explicit, and hold locked obsolete plans for migration.
- [ ] Update specs to distinguish creative freedom from delivered capability, technical checks from visual acceptance, and implemented work from remaining release gates.

### Task 4: Voiced visual pilot and handoff evidence

**Files:** Create a controlled authored pilot under ignored `temp/`; preserve evidence outside the repository; use existing pipeline/preview/UI.

**Interfaces:** Authored storyboard + Vietnamese narration → production scenes → voiced MP4 and timed review frames.

- [ ] Design a steam mechanism excerpt with distinct framing, textured stage, readable mechanism illustration and motivated host reactions. Keep supplied narration and actual audio clock.
- [ ] Render at 30fps through the production renderer. View actual scenes and video, including transition and contact moments. Check for readable expressions, meaningful model motion and captions.
- [ ] Fix observed visual problems; report what was actually viewed and any missing real-model/visual review evidence.
- [ ] Run affected integration checks. The wider project still requires current input matrix, two stories/two hosts, release checks and authorized GitHub handoff; do not close those on one pilot.

## Product decisions

The user has approved the previously proposed character-plus-motion-graphics direction and explicitly delegated aesthetic choices. No new style-selection gate is required. A real provider/model is deployment configuration; when none is configured, delivery must identify the offline/authored origin instead of claiming autonomous model production.

## Production adapter follow-through (2026-10-01)

The machine has Claude Code 2.1.198 with an authenticated first-party account. Add a `claude-cli` model adapter so the configured cinematic role can design real output without a separate API key. Use print/JSON mode, no built-in tools, safe mode, no arbitrary shell, prompt via stdin and local schema validation. Bound timeout/output/process-tree cleanup and journal usage/errors. A CLI failure must not silently become an offline final. This is an application provider, not a new user-owned chat or unrestricted subprocess coding agent.

- [ ] Add provider/process/schema fixtures, record real failures before implementing.
- [x] Implement the adapter with explicit executable/model settings, no credential export or raw diagnostics in UI. Both Claude and Codex native adapters exist; Codex authenticated real probe/model production succeeded, Claude probe failed for insufficient credit.
- [ ] Exercise a bounded real creative call, render its storyboard through the same pipeline and review the actual video.
- [ ] Expose configuration and creative origin in Studio and docs; keep authored/offline/real evidence distinct.

## Current evidence and remaining work (2026-10-02)

Source18 corrects two independently reproduced source17 semantic defects and local motion pivots/label ownership.75/75 independent scoped tests and test:typecheck pass; production build passes. A previous real Codex source17 model pilot produced a voiced21.333s final, but parent visual observation found duplicate labels, a disappearing rotated wheel and static staging. A controlled source18 renderer proof imports that design as authored input (explicit provenance), changes label ownership and rebuilds through DONE/QC; actual geometry/quality review is still being recorded. Current real native model full steam/stickman and car/robot designs are in progress. These results do not close full story/host/input/edit acceptance, deployment or GitHub delivery.
